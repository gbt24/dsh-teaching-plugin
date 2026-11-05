/**
 * Host route contract tests.
 *
 * These drive the exact `/api/teaching/*` handlers through the same registration
 * seam the Cordis runtime uses, with a scripted model instead of the network.
 * They cover the T01 flow end to end (course -> import -> draft -> confirm ->
 * session -> chat SSE -> activity -> attempt) plus the error/conflict paths the
 * client depends on.
 */
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import {
  CourseRepository, LearningRepository, LocalState, ProfileRepository, SessionRepository,
  ScriptedModelClient, conceptId as newConceptId, courseRevisionId as newCourseRevisionId,
} from '@deepseek-teaching/core'
import { createCorpusService } from '@deepseek-teaching/core/corpus'
import { createTeachingService } from '@deepseek-teaching/core/teaching'
import { createLearningService, createModelRubricAssessor, rubricFromActivityPayload } from '@deepseek-teaching/core/learning'
import { createRunnerRegistry } from '@deepseek-teaching/core/experiments'
import { createPortabilityService } from '@deepseek-teaching/core/portability'
import { createEnvironmentManager } from '@deepseek-teaching/core/environments'
import { SettingsStore } from '../../src/host/settings.ts'
import { registerRoutes } from '../../src/host/routes.ts'
import type { RouteServices } from '../../src/host/routes.ts'
import { TaskManager } from '../../src/host/tasks.ts'

const tempDirs: string[] = []

after(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true })
})

interface Harness {
  readonly call: (operation: string, options?: { method?: 'GET' | 'POST'; query?: Record<string, string>; body?: unknown }) => Promise<{ status: number; json?: unknown; response: Response }>
  readonly services: RouteServices
  readonly model: ScriptedModelClient
  readonly dir: string
}

/** Course structure reply the corpus draft call expects. */
const DRAFT_REPLY = JSON.stringify({
  goals: ['理解过拟合与泛化的区别'],
  concepts: [{
    title: '过拟合',
    summary: '模型记住训练数据噪声导致泛化变差的现象',
    prerequisites: [],
    difficulty: 'intro',
    misconceptions: ['训练误差越低越好'],
    checkIdeas: ['比较训练误差与验证误差'],
    anchors: [],
  }],
  sequence: ['过拟合'],
})

/** Teaching reply in the TeachingService wire format (visible text + meta marker). */
const TEACHER_REPLY = [
  '过拟合是模型记住训练数据噪声、导致新数据上表现变差的现象。判断泛化要看验证误差。',
  '',
  '<<<TEACHING_META>>>',
  JSON.stringify({
    intent: 'explain',
    stage: 'practice',
    conceptIds: [],
    evidence: { usedMaterialRefs: [1], usedCrossCourseRefs: [], usedWebRefs: [], usedModelKnowledge: true },
    conflicts: [],
    activity: {
      kind: 'quiz',
      title: '哪个模型更可能泛化？',
      goal: '用训练/验证误差判断过拟合',
      payload: {
        type: 'quiz',
        question: '模型 A 训练误差 0.01、验证误差 0.30；模型 B 为 0.10/0.12。哪个更可能泛化？',
        options: [{ id: 'A', label: '模型 A' }, { id: 'B', label: '模型 B' }],
        correctOptionIds: ['B'],
        explanation: '训练误差低但验证误差高是过拟合信号。',
      },
      verification: { kind: 'objective' },
    },
    nextActions: [],
    uncertainty: ['资料未覆盖泛化差距的正式定义'],
  }),
].join('\n')

/** A quiz activity persisted directly (as the teacher's activity proposal would be). */
function quizActivity(sessionId: string, courseId: string) {
  const createdAt = new Date().toISOString()
  return {
    id: 'act-test-1',
    kind: 'quiz',
    sessionId,
    courseId,
    conceptIds: ['concept-test-1'],
    goal: '用训练/验证误差判断过拟合',
    title: '哪个模型更可能泛化？',
    createdAt,
    updatedAt: createdAt,
    revision: 1,
    status: 'active',
    sourceRefs: [],
    verification: { kind: 'objective' },
    independent: true,
    payload: {
      type: 'quiz',
      question: '模型 A 训练误差 0.01、验证误差 0.30；模型 B 为 0.10/0.12。哪个更可能泛化？',
      options: [{ id: 'A', label: '模型 A' }, { id: 'B', label: '模型 B' }],
      correctOptionIds: ['B'],
      explanation: '训练误差低但验证误差高是过拟合信号。',
    },
  }
}

/** Build the route harness with a scripted model and a temp data dir. */
async function createHarness(replies: ConstructorParameters<typeof ScriptedModelClient>[0]): Promise<Harness> {
  const dir = await mkdtemp(join(tmpdir(), 'teaching-routes-'))
  tempDirs.push(dir)
  const state = new LocalState({ dataDir: dir, pluginVersion: 'test' })
  const sites: { path: string; fetch: (request: Request) => Promise<Response> }[] = []
  const profiles = new ProfileRepository(state)
  const courses = new CourseRepository(state)
  const sessions = new SessionRepository(state)
  const learning = new LearningRepository(state)
  const model = new ScriptedModelClient(replies)
  const settings = new SettingsStore(state)
  const corpus = createCorpusService({ state, courses, learning, model })
  const teaching = createTeachingService()
  const experiments = createRunnerRegistry({ dataDir: dir })
  const environments = createEnvironmentManager({ dataDir: dir, runners: experiments })
  const portability = createPortabilityService({
    state,
    courses,
    sessions,
    learning,
    profiles,
    pluginVersion: '0.1.0-test',
    appVersion: '0.2.1-rc.5',
  })
  const createLearningFor = (activity?: { payload: unknown }): ReturnType<typeof createLearningService> => createLearningService({
    repository: learning,
    resolveRevisionId: async (courseId: string) => {
      const course = await courses.get(courseId)
      return course?.activeRevisionId as never
    },
    rubric: {
      resolve: () => (activity === undefined ? undefined : rubricFromActivityPayload(activity.payload as never)),
      assess: createModelRubricAssessor(model),
    },
  })
  const services: RouteServices = {
    ctx: {
      connection: {
        fetch: {
          register(route) {
            sites.push({ path: route.path, fetch: route.fetch })
            return async () => undefined
          },
        },
      },
    },
    state,
    model,
    web: { available: () => false, search: async () => ({ ok: false, error: { code: 'capability-missing', message: '无联网能力' } }) },
    tasks: new TaskManager(state),
    corpus: corpus as never,
    teaching,
    experiments,
    environments,
    portability,
    createLearningFor: createLearningFor as never,
    takeUsage: () => undefined,
    lastUsage: () => undefined,
    settings,
    defaultModelSelection: () => ({ provider: 'test', model: 'test-model' }),
    invalidateModelInfo: () => undefined,
    modelCatalog: {
      listProviders: async () => [{ id: 'test', name: 'Test' }],
      listModels: async () => [{ provider: 'test', id: 'test-model', name: 'Test Model' }],
      resolveModelInfo: async () => ({ contextWindow: 100_000 }),
    },
    getOcrInfo: async () => ({ available: true, reason: '', languages: ['eng'] }),
    profiles,
    courses,
    sessions,
    learning,
    pluginVersion: '0.1.0-test',
    dataDir: dir,
    logger: () => undefined,
    hostFacts: { platform: 'test', arch: 'test', nodeVersion: '24.0.0' },
    ready: (async () => { await state.open() })(),
  }
  registerRoutes(services)
  async function call(
    operation: string,
    options: { method?: 'GET' | 'POST'; query?: Record<string, string>; body?: unknown } = {},
  ): Promise<{ status: number; json?: unknown; response: Response }> {
    const method = options.method ?? 'POST'
    const site = sites.find(item => item.path === `/api/teaching/${operation}`)
    if (site === undefined) throw new Error(`route not registered: ${operation}`)
    const url = new URL(`http://127.0.0.1/api/teaching/${operation}`)
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)
    const response = await site.fetch(new Request(url, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(options.body ?? {}) } : {}),
    }))
    if (response.headers.get('content-type')?.includes('text/event-stream') === true) {
      // The caller consumes stream bodies; reading here would lock the stream.
      return { status: response.status, response }
    }
    const text = await response.text()
    let json: unknown
    try { json = JSON.parse(text) } catch { json = text }
    return { status: response.status, json, response }
  }
  return { call, services, model: services.model as ScriptedModelClient, dir }
}

/** Unwrap the Result envelope or fail the test with its error. */
function unwrap<T>(json: unknown): T {
  const envelope = json as { ok?: boolean; value?: T; error?: unknown }
  if (envelope.ok !== true) throw new Error(`unexpected failure envelope: ${JSON.stringify(envelope.error)}`)
  return envelope.value as T
}

/** Read an SSE response fully into event objects. */
async function readSse(response: Response): Promise<{ type: string; [key: string]: unknown }[]> {
  const events: { type: string; [key: string]: unknown }[] = []
  const reader = response.body?.getReader()
  assert.ok(reader !== undefined)
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let index
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)
      const line = frame.split('\n').find(item => item.startsWith('data: '))
      if (line !== undefined) events.push(JSON.parse(line.slice(6)) as never)
    }
  }
  return events
}

describe('teaching host routes', () => {
  /** Create a course, import one text source, generate and confirm the draft. */
  async function preparedCourse(harness: Harness): Promise<{ courseId: string; revisionId: string }> {
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '测试课程', goals: ['理解过拟合'] } })
    ).json)
    const courseId = created.course.id
    const fixture = join(harness.dir, 'notes.md')
    await writeFile(fixture, '# 过拟合\n\n## 条件\n\n训练数据含噪声时，容量大的模型容易记住噪声。\n', 'utf8')
    const importHandle = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId, paths: [fixture] } })
    ).json)
    await harness.services.tasks.wait(importHandle.task.id)
    const draftHandle = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId } })
    ).json)
    await harness.services.tasks.wait(draftHandle.task.id)
    const draft = unwrap<{ draft: { revision: { id: string } } }>((
      await harness.call('courseDraft.get', { method: 'GET', query: { courseId } })
    ).json)
    const confirmed = unwrap<{ course: { activeRevisionId: string } }>((
      await harness.call('courseDraft.confirm', { body: { courseId, revisionId: draft.draft.revision.id } })
    ).json)
    return { courseId, revisionId: confirmed.course.activeRevisionId }
  }

  it('runs the T01 flow through the public route contract', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }, { kind: 'text', text: TEACHER_REPLY }])
    const bootstrap = unwrap<{ pluginVersion: string }>((
      await harness.call('bootstrap', { method: 'GET' })
    ).json)
    assert.equal(bootstrap.pluginVersion, '0.1.0-test')

    const { courseId } = await preparedCourse(harness)
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)

    const chatResponse = await harness.call('chat.send', { body: { sessionId: session.session.id, text: '什么是过拟合？' } })
    const events = await readSse(chatResponse.response)
    const types = events.map(event => event.type)
    assert.ok(types.includes('start'))
    assert.ok(types.includes('delta'))
    assert.ok(types.includes('done'))
    const done = events.find(event => event.type === 'done') as unknown as { message: { text: string; evidenceRefs: unknown[]; usage?: unknown } }
    assert.ok(done.message.text.includes('过拟合'))
    assert.ok(done.message.text.includes('TEACHING_META') === false, 'metadata marker must not leak into visible text')
    assert.ok(done.message.evidenceRefs.length > 0, 'course-material evidence must be attached')

    // Persist a teacher activity the same way the teaching turn would, then
    // verify the activity + attempt contracts over the route surface.
    const activity = quizActivity(session.session.id, courseId)
    await harness.services.sessions.saveActivity(activity as never)
    const activityView = unwrap<{ activity: { id: string; revision: number } }>((
      await harness.call('activity.get', { method: 'GET', query: { activityId: activity.id } })
    ).json)
    assert.equal(activityView.activity.id, activity.id)

    const view = unwrap<{ messages: unknown[]; activities: unknown[] }>((
      await harness.call('sessions.get', { method: 'GET', query: { sessionId: session.session.id } })
    ).json)
    assert.equal(view.messages.length, 2)
    assert.ok(view.activities.length >= 1)

    const attempt = unwrap<{
      attempt: { independence: string }
      validation: { kind: string; passed?: boolean }
      mastery: { level: string; basis: string[] }[]
    }>((await harness.call('attempts.submit', {
      body: {
        sessionId: session.session.id,
        activityId: activity.id,
        activityRevision: 1,
        prompt: '选择',
        answerText: '（选择 B）',
        helpLevel: 0,
        answerRevealed: false,
        selectedOptionIds: ['B'],
      },
    })).json)
    assert.equal(attempt.attempt.independence, 'independent')
    assert.equal(attempt.validation.kind, 'quiz')
    assert.equal(attempt.validation.passed, true)
    assert.ok(['practiced', 'checked'].includes(attempt.mastery[0]?.level ?? ''))
    assert.ok(attempt.mastery[0]?.basis.join('').includes('独立'))
  })

  it('does not count an answer-shown attempt as independent mastery', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }])
    const { courseId } = await preparedCourse(harness)
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const activity = quizActivity(session.session.id, courseId)
    await harness.services.sessions.saveActivity(activity as never)
    const attempt = unwrap<{
      attempt: { independence: string }
      mastery: { level: string }[]
      independenceNote?: string
    }>((await harness.call('attempts.submit', {
      body: {
        sessionId: session.session.id,
        activityId: activity.id,
        activityRevision: 1,
        prompt: '选择',
        answerText: '我看了答案选 B',
        helpLevel: 'full-answer',
        answerRevealed: true,
        selectedOptionIds: ['B'],
      },
    })).json)
    assert.equal(attempt.attempt.independence, 'answer-shown')
    assert.notEqual(attempt.mastery[0]?.level, 'checked')
    assert.notEqual(attempt.mastery[0]?.level, 'mastered')
  })

  it('updates course learning goals as a new confirmed revision', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }])
    const { courseId, revisionId } = await preparedCourse(harness)
    const updated = unwrap<{ course: { activeRevisionId: string }; revision: { version: number; goals: string[]; state: string; background?: string } }>((
      await harness.call('courseGoals.update', {
        body: { courseId, goals: ['新目标一', '新目标二'], background: '学过基础统计' },
      })
    ).json)
    assert.equal(updated.revision.state, 'confirmed')
    assert.deepEqual(updated.revision.goals, ['新目标一', '新目标二'])
    assert.equal(updated.revision.background, '学过基础统计')
    assert.notEqual(updated.course.activeRevisionId, revisionId)
    const detail = unwrap<{
      course: { activeRevisionId: string }
      activeRevision: { goals: string[]; version: number }
      revisions: { id: string; state: string }[]
    }>((await harness.call('courses.get', { method: 'GET', query: { courseId } })).json)
    assert.deepEqual(detail.activeRevision.goals, ['新目标一', '新目标二'])
    const previous = detail.revisions.find(item => item.id === revisionId)
    assert.equal(previous?.state, 'superseded')

    const invalid = await harness.call('courseGoals.update', { body: { courseId, goals: [] } })
    assert.equal((invalid.json as { error: { code: string } }).error.code, 'invalid-input')
  })

  it('returns structured errors for invalid input, missing objects and unimplemented capabilities', async () => {
    const harness = await createHarness([])
    const invalid = await harness.call('courses.create', { body: {} })
    assert.equal(invalid.status, 200)
    assert.equal((invalid.json as { ok: boolean }).ok, false)
    assert.equal((invalid.json as { error: { code: string } }).error.code, 'invalid-input')

    const missing = await harness.call('sessions.get', { method: 'GET', query: { sessionId: 'sess-nope' } })
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not-found')

    const noRevision = await harness.call('sessions.create', { body: { courseId: 'course-nope' } })
    assert.equal((noRevision.json as { error: { code: string } }).error.code, 'not-found')

    const badScope = await harness.call('records.delete', { body: { scope: 'nonsense' } })
    assert.equal((badScope.json as { error: { code: string } }).error.code, 'invalid-input')
    const missingArchive = await harness.call('portability.inspect', { body: {} })
    assert.equal((missingArchive.json as { error: { code: string } }).error.code, 'invalid-input')
  })

  it('rejects an activity patch whose expected revision is stale', async () => {
    const harness = await createHarness([])
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '课程' } })
    ).json)
    const activity = quizActivity('sess-direct', created.course.id)
    await harness.services.sessions.saveActivity(activity as never)
    const saved = unwrap<{ activity: { revision: number } }>((await harness.call('activity.patch', {
      body: { activityId: activity.id, expectedRevision: 1, payload: activity.payload },
    })).json)
    assert.equal(saved.activity.revision, 2)
    const stale = await harness.call('activity.patch', {
      body: { activityId: activity.id, expectedRevision: 1, payload: activity.payload },
    })
    assert.equal((stale.json as { error: { code: string } }).error.code, 'conflict')
  })

  it('serves the newest persisted run per activity and scopes runs to the session', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }])
    const { courseId } = await preparedCourse(harness)
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const other = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const first = { ...quizActivity(session.session.id, courseId), id: 'act-run-a' }
    const second = { ...quizActivity(session.session.id, courseId), id: 'act-run-b' }
    await harness.services.sessions.saveActivity(first as never)
    await harness.services.sessions.saveActivity(second as never)
    function runRecord(id: string, sessionId: string, activityId: string, startedAt: string): Record<string, unknown> {
      return {
        id, sessionId, activityId, environmentId: 'env-python', language: 'python',
        code: 'print(1)', startedAt, endedAt: startedAt, status: 'succeeded',
        stdout: '1\n', stderr: '', exitCode: 0, durationMs: 10,
        verification: 'objective', limits: { timeoutMs: 10_000 },
      }
    }
    const runs = [
      runRecord('run-a-1', session.session.id, 'act-run-a', '2026-11-04T08:00:00.000Z'),
      runRecord('run-a-2', session.session.id, 'act-run-a', '2026-11-04T08:05:00.000Z'),
      runRecord('run-b-1', session.session.id, 'act-run-b', '2026-11-04T08:02:00.000Z'),
      runRecord('run-other', other.session.id, 'act-run-a', '2026-11-04T09:00:00.000Z'),
    ]
    for (const run of runs) await harness.services.state.writeJson(`runs/${String(run.id)}.json`, run)
    const latest = unwrap<{ runs: { id: string; activityId: string }[] }>((
      await harness.call('runs.latest', { method: 'GET', query: { sessionId: session.session.id } })
    ).json)
    assert.equal(latest.runs.length, 2)
    assert.equal(latest.runs.find(run => run.activityId === 'act-run-a')?.id, 'run-a-2')
    assert.equal(latest.runs.find(run => run.activityId === 'act-run-b')?.id, 'run-b-1')
    assert.ok(!latest.runs.some(run => run.id === 'run-other'), 'other sessions must not leak runs')
    const missing = await harness.call('runs.latest', { method: 'GET', query: { sessionId: 'sess-nope' } })
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not-found')
  })

  it('deletes one activity with its state and runs, keeping attempts and clearing the position', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }])
    const { courseId } = await preparedCourse(harness)
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const sessionId = session.session.id
    const activity = { ...quizActivity(sessionId, courseId), id: 'act-delete-1' }
    await harness.services.sessions.saveActivity(activity as never)
    await harness.services.sessions.saveActivityState({
      activityId: activity.id, activityRevision: 1, code: 'print(1)', updatedAt: new Date().toISOString(),
    } as never)
    const attempt = await harness.call('attempts.submit', {
      body: {
        sessionId,
        activityId: activity.id,
        activityRevision: 1,
        prompt: '选择',
        answerText: '（选择 B）',
        helpLevel: 0,
        answerRevealed: false,
        selectedOptionIds: ['B'],
      },
    })
    assert.equal((attempt.json as { ok: boolean }).ok, true, 'attempt is recorded before deletion')
    const positioned = await harness.call('sessions.position', { body: { sessionId, activityId: activity.id } })
    assert.equal((positioned.json as { ok: boolean }).ok, true)
    await harness.services.state.writeJson('runs/run-del-1.json', {
      id: 'run-del-1', sessionId, activityId: activity.id, environmentId: 'env-python',
      language: 'python', code: 'print(1)', startedAt: '2026-11-04T08:00:00.000Z',
      status: 'succeeded', stdout: '1\n', stderr: '', exitCode: 0, durationMs: 10,
      verification: 'objective', limits: { timeoutMs: 10_000 },
    })
    const deleted = unwrap<{ activityId: string; removedRuns: number; positionCleared: boolean }>((
      await harness.call('activity.delete', { body: { activityId: activity.id } })
    ).json)
    assert.equal(deleted.activityId, activity.id)
    assert.equal(deleted.removedRuns, 1)
    assert.equal(deleted.positionCleared, true)
    const gone = await harness.call('activity.get', { method: 'GET', query: { activityId: activity.id } })
    assert.equal((gone.json as { error: { code: string } }).error.code, 'not-found')
    const runsAfter = unwrap<{ runs: unknown[] }>((
      await harness.call('runs.latest', { method: 'GET', query: { sessionId } })
    ).json)
    assert.equal(runsAfter.runs.length, 0)
    const view = unwrap<{ session: { position: { activityId?: string } }; activities: unknown[] }>((
      await harness.call('sessions.get', { method: 'GET', query: { sessionId } })
    ).json)
    assert.equal(view.session.position.activityId, undefined)
    assert.equal(view.activities.length, 0)
    const attempts = unwrap<{ attempts: unknown[] }>((
      await harness.call('attempts.list', { method: 'GET', query: { sessionId } })
    ).json)
    assert.equal(attempts.attempts.length, 1, 'learning evidence survives activity deletion')
    const missing = await harness.call('activity.delete', { body: { activityId: 'act-nope' } })
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not-found')
    const staleTarget = { ...quizActivity(sessionId, courseId), id: 'act-delete-2' }
    await harness.services.sessions.saveActivity(staleTarget as never)
    const stale = await harness.call('activity.delete', {
      body: { activityId: staleTarget.id, expectedRevision: 99 },
    })
    assert.equal((stale.json as { error: { code: string } }).error.code, 'conflict')
  })

  it('builds a draft directly from a detected LLM-wiki structure without calling the model', async () => {
    const harness = await createHarness([])
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '知识库测试课程' } })
    ).json)
    const courseId = created.course.id
    const entries = await readdir(join(process.cwd(), 'samples', 'kb'), { recursive: true, withFileTypes: true })
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => join(entry.parentPath, entry.name))
    assert.ok(files.length >= 8)
    const imported = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId, paths: files } })
    ).json)
    await harness.services.tasks.wait(imported.task.id)

    const generated = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId } })
    ).json)
    await harness.services.tasks.wait(generated.task.id)
    const snapshot = await harness.services.tasks.get(generated.task.id)
    assert.equal(snapshot?.status, 'completed')
    const view = unwrap<{
      draft: {
        origin: string
        revision: { chapters?: { title: string; role?: string; conceptIds: string[] }[]; concepts: { id: string }[] }
      }
    }>((await harness.call('courseDraft.get', { method: 'GET', query: { courseId } })).json)
    assert.equal(view.draft.origin, 'kb-structure')
    const chapters = view.draft.revision.chapters ?? []
    assert.ok(chapters.length >= 3, 'expected two chapters plus the cross-chapter tool')
    assert.ok(chapters.some(chapter => chapter.role === 'tool'))
    const conceptIds = new Set(view.draft.revision.concepts.map(concept => concept.id))
    for (const chapter of chapters) {
      for (const conceptId of chapter.conceptIds) assert.ok(conceptIds.has(conceptId), `${conceptId} exists`)
    }
    assert.equal(new Set(chapters.flatMap(chapter => chapter.conceptIds)).size, conceptIds.size, 'every concept is grouped')

    // Explicit kb-structure requires a detected knowledge base.
    const plainCourse = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '普通资料课程' } })
    ).json)
    const plainFile = join(harness.dir, 'plain-only.md')
    await writeFile(plainFile, '# 普通章节\n\n这不是 wiki 结构。\n', 'utf8')
    const plainImport = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId: plainCourse.course.id, paths: [plainFile] } })
    ).json)
    await harness.services.tasks.wait(plainImport.task.id)
    const strict = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId: plainCourse.course.id, strategy: 'kb-structure' } })
    ).json)
    await harness.services.tasks.wait(strict.task.id)
    const strictSnapshot = await harness.services.tasks.get(strict.task.id)
    assert.equal(strictSnapshot?.status, 'failed')
    assert.equal(strictSnapshot?.error?.code, 'capability-missing')
  })

  it('exposes structure origin/chapters in the draft view and keeps them consistent on confirm', async () => {
    const harness = await createHarness([])
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '结构课' } })
    ).json)
    const courseId = created.course.id
    const first = newConceptId()
    const second = newConceptId()
    const revision = {
      id: newCourseRevisionId(),
      courseId,
      version: 2,
      createdAt: new Date().toISOString(),
      state: 'draft',
      provenance: 'kb-structure',
      goals: ['理解结构'],
      language: 'zh',
      sources: [],
      concepts: [
        { id: first, title: '概念 A', summary: 'a', prerequisites: [], sourceAnchors: [] },
        { id: second, title: '概念 B', summary: 'b', prerequisites: [], sourceAnchors: [] },
      ],
      sequence: [first, second],
      chapters: [
        { id: 'chapter-1', title: '第 1 章', summary: '第一章', conceptIds: [first] },
        { id: 'chapter-2', title: '第 2 章', summary: '第二章', conceptIds: [second] },
      ],
      changeSummary: '知识库直读：2 个章节 / 2 个概念',
      basedOn: [],
    }
    await harness.services.courses.saveRevision(revision as never)
    const course = await harness.services.courses.get(courseId)
    assert.ok(course !== undefined)
    await harness.services.courses.save({ ...course, draftRevisionId: revision.id as never })

    const view = unwrap<{
      draft: {
        origin: string
        structureNotes: string[]
        revision: { chapters: { id: string; conceptIds: string[] }[] }
      }
    }>((await harness.call('courseDraft.get', { method: 'GET', query: { courseId } })).json)
    assert.equal(view.draft.origin, 'kb-structure')
    assert.ok(view.draft.structureNotes.length > 0)
    assert.equal(view.draft.revision.chapters.length, 2)

    const confirmed = unwrap<{
      revision: { provenance: string; chapters: { id: string; conceptIds: string[] }[] }
    }>((await harness.call('courseDraft.confirm', {
      body: { courseId, revisionId: revision.id, edits: { removeConceptIds: [second] } },
    })).json)
    assert.equal(confirmed.revision.provenance, 'student-edit')
    assert.equal(confirmed.revision.chapters.length, 1)
    assert.deepEqual(confirmed.revision.chapters[0]?.conceptIds, [first])
  })

  it('lists models, applies a plugin model override and resets to the host default', async () => {
    const harness = await createHarness([])
    const initial = unwrap<{
      followHost: boolean
      current: { provider: string; model: string }
      providers: { id: string; name: string; models: { id: string; name: string }[] }[]
    }>((await harness.call('model.catalog', { method: 'GET' })).json)
    assert.equal(initial.followHost, true)
    assert.equal(initial.current.provider, 'test')
    assert.equal(initial.providers[0]?.models[0]?.id, 'test-model')
    const info = unwrap<{ contextWindow: number }>((
      await harness.call('model.info', { method: 'GET', query: { provider: 'test', model: 'test-model' } })
    ).json)
    assert.equal(info.contextWindow, 100_000)
    const set = unwrap<{ followHost: boolean; selection: { model: string } }>((
      await harness.call('model.set', { body: { provider: 'test', model: 'test-model' } })
    ).json)
    assert.equal(set.followHost, false)
    assert.equal(set.selection.model, 'test-model')
    const overridden = unwrap<{ followHost: boolean; override?: { provider: string; model: string } }>((
      await harness.call('model.catalog', { method: 'GET' })
    ).json)
    assert.equal(overridden.followHost, false)
    assert.equal(overridden.override?.model, 'test-model')
    const reset = unwrap<{ followHost: boolean }>((
      await harness.call('model.set', { body: { followHost: true } })
    ).json)
    assert.equal(reset.followHost, true)
  })

  it('force-compacts older messages, exposes context usage and can reset the checkpoint', async () => {
    const SUMMARY_REPLY = [
      '## Primary Request and Intent',
      '- 学习过拟合',
      '## Course and Sources',
      '- 测试课程',
      '## Key Concepts',
      '- 过拟合',
      '## Next Step',
      '- 继续练习',
    ].join('\n')
    const harness = await createHarness([
      { kind: 'text', text: DRAFT_REPLY },
      { kind: 'text', text: SUMMARY_REPLY },
    ])
    const { courseId } = await preparedCourse(harness)
    const created = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const sessionId = created.session.id
    const session = await harness.services.sessions.get(sessionId)
    assert.ok(session !== undefined)
    const messageIds: string[] = []
    for (let index = 0; index < 10; index += 1) {
      const message = {
        id: `msg-compact-${index}`,
        sessionId,
        role: index % 2 === 0 ? 'student' : 'teacher',
        kind: index % 2 === 0 ? 'student-question' : 'teacher-explanation',
        text: `第 ${index} 条消息：${'过拟合与泛化讨论。'.repeat(20)}`,
        createdAt: new Date(Date.now() + index * 1000).toISOString(),
      }
      await harness.services.sessions.appendMessage(message as never)
      messageIds.push(message.id)
    }
    await harness.services.sessions.save({ ...session, messageIds: messageIds as never, updatedAt: new Date().toISOString() })

    const compressHandle = unwrap<{ task: { id: string } }>((
      await harness.call('context.compress', { body: { sessionId, force: true } })
    ).json)
    await harness.services.tasks.wait(compressHandle.task.id)
    const task = await harness.services.tasks.get(compressHandle.task.id)
    assert.equal(task?.status, 'completed')
    const result = task?.result as { compacted: boolean } | undefined
    assert.equal(result?.compacted, true)
    const view = unwrap<{ session: { context?: { compactedMessageIds: string[]; summary: string; tokensAfterEstimate: number } } }>((
      await harness.call('sessions.get', { method: 'GET', query: { sessionId } })
    ).json)
    assert.equal(view.session.context?.compactedMessageIds.length, 8)
    assert.ok((view.session.context?.summary ?? '').includes('过拟合'))
    const usage = unwrap<{
      source: string
      tokensUsed?: number
      contextWindow?: number
      compressed?: { compactedMessages: number }
    }>((await harness.call('context.usage', { method: 'GET', query: { sessionId } })).json)
    assert.equal(usage.source, 'estimated')
    assert.equal(usage.compressed?.compactedMessages, 8)
    assert.equal(usage.tokensUsed, view.session.context?.tokensAfterEstimate)
    assert.equal(usage.contextWindow, 100_000)
    const reset = unwrap<{ session: { context?: unknown } }>((
      await harness.call('context.reset', { body: { sessionId } })
    ).json)
    assert.equal(reset.session.context, undefined)
  })

  it('applies draft edits (rename/remove/reorder) and rejects an empty structure', async () => {
    const harness = await createHarness([])
    async function draftWith(concepts: { id: ReturnType<typeof newConceptId>; title: string }[], chapters: unknown[]) {
      const created = unwrap<{ course: { id: string } }>((
        await harness.call('courses.create', { body: { title: '编辑测试课程' } })
      ).json)
      const courseId = created.course.id
      const revision = {
        id: newCourseRevisionId(),
        courseId,
        version: 2,
        createdAt: new Date().toISOString(),
        state: 'draft',
        provenance: 'kb-structure',
        goals: ['测试'],
        language: 'zh',
        sources: [],
        concepts: concepts.map(concept => ({
          ...concept, summary: `${concept.title} 摘要`, prerequisites: [], sourceAnchors: [],
        })),
        sequence: concepts.map(concept => concept.id),
        chapters,
        changeSummary: '测试草案',
        basedOn: [],
      }
      await harness.services.courses.saveRevision(revision as never)
      const course = await harness.services.courses.get(courseId)
      await harness.services.courses.save({ ...course!, draftRevisionId: revision.id as never })
      return { courseId, revision }
    }

    const first = newConceptId()
    const second = newConceptId()
    const third = newConceptId()
    const { courseId, revision } = await draftWith(
      [{ id: first, title: '概念 A' }, { id: second, title: '概念 B' }, { id: third, title: '概念 C' }],
      [
        { id: 'chapter-1', title: '第 1 章', conceptIds: [first] },
        { id: 'chapter-2', title: '第 2 章', conceptIds: [second] },
        { id: 'chapter-3', title: '第 3 章', conceptIds: [third] },
      ],
    )
    const edited = unwrap<{
      revision: {
        concepts: { id: string; title: string }[]
        sequence: string[]
        chapters: { id: string; conceptIds: string[] }[]
      }
    }>((await harness.call('courseDraft.confirm', {
      body: {
        courseId,
        revisionId: revision.id,
        edits: {
          removeConceptIds: [second],
          conceptTitles: { [first]: '  概念 A（改）  ' },
          sequence: [third, first],
        },
      },
    })).json)
    assert.deepEqual(edited.revision.concepts.map(concept => concept.title), ['概念 A（改）', '概念 C'])
    assert.deepEqual(edited.revision.sequence, [third, first])
    assert.deepEqual(edited.revision.chapters.map(chapter => chapter.id), ['chapter-1', 'chapter-3'])
    assert.deepEqual(edited.revision.chapters[0]?.conceptIds, [first])

    // Added concepts inherit an existing chapter or stay ungrouped; chapter
    // titles/summaries can be edited in the same confirmation.
    const base = newConceptId()
    const addable = await draftWith([{ id: base, title: '基础概念' }], [
      { id: 'chapter-x', title: '原章节名', summary: '原摘要', conceptIds: [base] },
    ])
    const added = unwrap<{
      revision: {
        concepts: { title: string }[]
        sequence: string[]
        chapters: { id: string; title: string; summary?: string; conceptIds: string[] }[]
      }
    }>((await harness.call('courseDraft.confirm', {
      body: {
        courseId: addable.courseId,
        revisionId: addable.revision.id,
        edits: {
          chapterTitles: { 'chapter-x': '改后的章节名' },
          chapterSummaries: { 'chapter-x': '改后的章节摘要' },
          addConcepts: [
            { title: '章节新增概念', summary: '学生补充', chapterId: 'chapter-x' },
            { title: '独立新增概念' },
            { title: '   ' },
          ],
        },
      },
    })).json)
    assert.deepEqual(added.revision.concepts.map(concept => concept.title), ['基础概念', '章节新增概念', '独立新增概念'])
    assert.equal(added.revision.sequence.length, 3)
    assert.equal(added.revision.chapters.length, 1)
    assert.equal(added.revision.chapters[0]?.title, '改后的章节名')
    assert.equal(added.revision.chapters[0]?.summary, '改后的章节摘要')
    assert.equal(added.revision.chapters[0]?.conceptIds.length, 2)

    // A confirm that removes every concept is rejected instead of creating an unusable course.
    const only = newConceptId()
    const empty = await draftWith([{ id: only, title: '唯一概念' }], [
      { id: 'chapter-1', title: '第 1 章', conceptIds: [only] },
    ])
    const rejected = await harness.call('courseDraft.confirm', {
      body: { courseId: empty.courseId, revisionId: empty.revision.id, edits: { removeConceptIds: [only] } },
    })
    assert.equal((rejected.json as { error: { code: string } }).error.code, 'invalid-input')
  })

  it('rejects positions pointing at activities from another session and clears on null', async () => {
    const harness = await createHarness([{ kind: 'text', text: DRAFT_REPLY }])
    const { courseId } = await preparedCourse(harness)
    const first = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const second = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId } })
    ).json)
    const activity = { ...quizActivity(first.session.id, courseId), id: 'act-position-1' }
    await harness.services.sessions.saveActivity(activity as never)
    const foreign = await harness.call('sessions.position', {
      body: { sessionId: second.session.id, activityId: activity.id },
    })
    assert.equal((foreign.json as { error: { code: string } }).error.code, 'not-found')
    const accepted = unwrap<{ session: { position: { activityId?: string } } }>((
      await harness.call('sessions.position', { body: { sessionId: first.session.id, activityId: activity.id } })
    ).json)
    assert.equal(accepted.session.position.activityId, activity.id)
    const cleared = unwrap<{ session: { position: { activityId?: string } } }>((
      await harness.call('sessions.position', { body: { sessionId: first.session.id, activityId: null } })
    ).json)
    assert.equal(cleared.session.position.activityId, undefined)
  })

})
