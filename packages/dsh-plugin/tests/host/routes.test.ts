/**
 * Host route contract tests.
 *
 * These drive the exact `/api/teaching/*` handlers through the same registration
 * seam the Cordis runtime uses, with a scripted model instead of the network.
 * They cover the T01 flow end to end (course -> import -> draft -> confirm ->
 * session -> chat SSE -> activity -> attempt) plus the error/conflict paths the
 * client depends on.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import {
  CourseRepository, LearningRepository, LocalState, ProfileRepository, SessionRepository,
  ScriptedModelClient,
} from '@deepseek-teaching/core'
import { MinimalCorpus } from '../../src/host/minimal.ts'
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

/** A course-draft/teaching reply the scripted model returns. */
const TEACHER_REPLY = [
  '过拟合是模型记住训练数据噪声、导致新数据上表现变差的现象 [资料1]。',
  '判断泛化要看验证误差，而不是训练误差 [资料2]。',
  '（模型补充）训练误差与验证误差的差距称为泛化差距。',
  '',
  '```json',
  JSON.stringify({
    stage: 'practice',
    concept: null,
    activity: {
      kind: 'quiz',
      title: '哪个模型更可能泛化？',
      goal: '用训练/验证误差判断过拟合',
      payload: {
        type: 'quiz',
        question: '模型 A 训练误差 0.01、验证误差 0.30；模型 B 为 0.10/0.12。哪个更可能泛化到新数据？',
        options: [
          { id: 'A', label: '模型 A' },
          { id: 'B', label: '模型 B' },
        ],
        correctOptionIds: ['B'],
        explanation: '训练误差低但验证误差高是过拟合信号。',
      },
      verification: { kind: 'objective' },
    },
    uncertainty: ['资料未覆盖泛化差距的正式定义'],
  }),
  '```',
].join('\n')

/** Build the route harness with a scripted model and a temp data dir. */
async function createHarness(replies: ConstructorParameters<typeof ScriptedModelClient>[0]): Promise<Harness> {
  const dir = await mkdtemp(join(tmpdir(), 'teaching-routes-'))
  tempDirs.push(dir)
  const state = new LocalState({ dataDir: dir, pluginVersion: 'test' })
  const sites: { path: string; fetch: (request: Request) => Promise<Response> }[] = []
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
    model: new ScriptedModelClient(replies),
    tasks: new TaskManager(state),
    corpus: new MinimalCorpus(state),
    profiles: new ProfileRepository(state),
    courses: new CourseRepository(state),
    sessions: new SessionRepository(state),
    learning: new LearningRepository(state),
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
  it('runs the T01 flow through the public route contract', async () => {
    const harness = await createHarness([{ kind: 'text', text: TEACHER_REPLY }])
    const bootstrap = unwrap<{ pluginVersion: string }>((
      await harness.call('bootstrap', { method: 'GET' })
    ).json)
    assert.equal(bootstrap.pluginVersion, '0.1.0-test')

    const created = unwrap<{ course: { id: string }; revision: { id: string } }>((
      await harness.call('courses.create', { body: { title: '测试课程', goals: ['理解过拟合'] } })
    ).json)
    assert.equal(created.course.id.length > 0, true)

    const fixture = join(harness.dir, 'notes.md')
    await writeFile(fixture, '# 过拟合\n\n## 条件\n\n训练数据含噪声时，容量大的模型容易记住噪声。\n', 'utf8')
    const importHandle = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId: created.course.id, paths: [fixture] } })
    ).json)
    const importTask = unwrap<{ task: { status: string } }>((
      await harness.call('tasks.get', { method: 'GET', query: { taskId: importHandle.task.id } })
    ).json)
    // The task may already be completed or still running in this in-process harness.
    assert.ok(['running', 'completed'].includes(importTask.task.status))
    await harness.services.tasks.wait(importHandle.task.id)

    const draftHandle = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId: created.course.id } })
    ).json)
    await harness.services.tasks.wait(draftHandle.task.id)
    const draft = unwrap<{ draft: { revision: { id: string; concepts: unknown[] } } }>((
      await harness.call('courseDraft.get', { method: 'GET', query: { courseId: created.course.id } })
    ).json)
    assert.ok(draft.draft.revision.concepts.length > 0)

    const confirmed = unwrap<{ course: { activeRevisionId: string } }>((
      await harness.call('courseDraft.confirm', { body: { courseId: created.course.id, revisionId: draft.draft.revision.id } })
    ).json)
    assert.equal(confirmed.course.activeRevisionId, draft.draft.revision.id)

    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId: created.course.id } })
    ).json)

    const chatResponse = await harness.call('chat.send', { body: { sessionId: session.session.id, text: '什么是过拟合？' } })
    const events = await readSse(chatResponse.response)
    const types = events.map(event => event.type)
    assert.ok(types.includes('start'))
    assert.ok(types.includes('delta'))
    assert.ok(types.includes('done'))
    const done = events.find(event => event.type === 'done') as unknown as { message: { text: string; evidenceRefs: unknown[] } }
    assert.ok(done.message.text.includes('过拟合'))
    assert.ok(done.message.text.includes('```json') === false, 'metadata block must not leak into visible text')
    assert.ok(done.message.evidenceRefs.length > 0)
    const activityEvent = events.find(event => event.type === 'activity') as unknown as { activity: { id: string; revision: number; payload: { type: string; correctOptionIds: string[] } } }
    assert.equal(activityEvent.activity.payload.type, 'quiz')

    const view = unwrap<{ messages: unknown[]; activities: { id: string }[]; session: { position: { activityId?: string } } }>((
      await harness.call('sessions.get', { method: 'GET', query: { sessionId: session.session.id } })
    ).json)
    assert.equal(view.messages.length, 2)
    assert.equal(view.activities.length, 1)
    assert.equal(view.session.position.activityId, activityEvent.activity.id)

    const attempt = unwrap<{
      attempt: { independence: string }
      validation: { kind: string; passed?: boolean }
      mastery: { level: string; basis: string[] }[]
    }>((await harness.call('attempts.submit', {
      body: {
        sessionId: session.session.id,
        activityId: activityEvent.activity.id,
        activityRevision: activityEvent.activity.revision,
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
    assert.equal(attempt.mastery[0]?.level, 'practiced')
    assert.ok(attempt.mastery[0]?.basis.join('').includes('独立'))
  })

  it('does not count an answer-shown attempt as independent mastery', async () => {
    const harness = await createHarness([{ kind: 'text', text: TEACHER_REPLY }])
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '课程' } })
    ).json)
    const fixture = join(harness.dir, 'n.md')
    await writeFile(fixture, '# 概念\n\n内容。\n', 'utf8')
    const importHandle = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId: created.course.id, paths: [fixture] } })
    ).json)
    await harness.services.tasks.wait(importHandle.task.id)
    const draftHandle = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId: created.course.id } })
    ).json)
    await harness.services.tasks.wait(draftHandle.task.id)
    const draft = unwrap<{ draft: { revision: { id: string } } }>((
      await harness.call('courseDraft.get', { method: 'GET', query: { courseId: created.course.id } })
    ).json)
    await harness.call('courseDraft.confirm', { body: { courseId: created.course.id, revisionId: draft.draft.revision.id } })
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId: created.course.id } })
    ).json)
    const chatResponse = await harness.call('chat.send', { body: { sessionId: session.session.id, text: '讲解一下' } })
    const events = await readSse(chatResponse.response)
    const activity = (events.find(event => event.type === 'activity') as unknown as { activity: { id: string; revision: number } }).activity
    const attempt = unwrap<{
      attempt: { independence: string }
      mastery: { level: string }[]
      independenceNote?: string
    }>((await harness.call('attempts.submit', {
      body: {
        sessionId: session.session.id,
        activityId: activity.id,
        activityRevision: activity.revision,
        prompt: '选择',
        answerText: '我看了答案选 B',
        helpLevel: 'full-answer',
        answerRevealed: true,
        selectedOptionIds: ['B'],
      },
    })).json)
    assert.equal(attempt.attempt.independence, 'answer-shown')
    assert.ok(attempt.independenceNote?.includes('独立') === false || attempt.independenceNote !== undefined)
    assert.notEqual(attempt.mastery[0]?.level, 'checked')
  })

  it('returns structured errors for invalid input, missing objects and stale revisions', async () => {
    const harness = await createHarness([])
    const invalid = await harness.call('courses.create', { body: {} })
    assert.equal(invalid.status, 200)
    assert.equal((invalid.json as { ok: boolean }).ok, false)
    assert.equal((invalid.json as { error: { code: string } }).error.code, 'invalid-input')

    const missing = await harness.call('sessions.get', { method: 'GET', query: { sessionId: 'sess-nope' } })
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not-found')

    const noRevision = await harness.call('sessions.create', { body: { courseId: 'course-nope' } })
    assert.equal((noRevision.json as { error: { code: string } }).error.code, 'not-found')

    const exportAttempt = await harness.call('portability.export', { body: { courseId: 'c' } })
    assert.equal((exportAttempt.json as { error: { code: string } }).error.code, 'capability-missing')
  })

  it('rejects an activity patch whose expected revision is stale', async () => {
    const harness = await createHarness([{ kind: 'text', text: TEACHER_REPLY }])
    const created = unwrap<{ course: { id: string } }>((
      await harness.call('courses.create', { body: { title: '课程' } })
    ).json)
    const fixture = join(harness.dir, 'x.md')
    await writeFile(fixture, '# 概念\n\n内容。\n', 'utf8')
    const importHandle = unwrap<{ task: { id: string } }>((
      await harness.call('sources.import', { body: { courseId: created.course.id, paths: [fixture] } })
    ).json)
    await harness.services.tasks.wait(importHandle.task.id)
    const draftHandle = unwrap<{ task: { id: string } }>((
      await harness.call('courseDraft.generate', { body: { courseId: created.course.id } })
    ).json)
    await harness.services.tasks.wait(draftHandle.task.id)
    const draft = unwrap<{ draft: { revision: { id: string } } }>((
      await harness.call('courseDraft.get', { method: 'GET', query: { courseId: created.course.id } })
    ).json)
    await harness.call('courseDraft.confirm', { body: { courseId: created.course.id, revisionId: draft.draft.revision.id } })
    const session = unwrap<{ session: { id: string } }>((
      await harness.call('sessions.create', { body: { courseId: created.course.id } })
    ).json)
    const chatResponse = await harness.call('chat.send', { body: { sessionId: session.session.id, text: '讲解' } })
    const events = await readSse(chatResponse.response)
    const activity = (events.find(event => event.type === 'activity') as unknown as { activity: { id: string; revision: number; payload: unknown } }).activity

    const saved = unwrap<{ activity: { revision: number } }>((await harness.call('activity.patch', {
      body: { activityId: activity.id, expectedRevision: activity.revision, payload: activity.payload },
    })).json)
    assert.equal(saved.activity.revision, activity.revision + 1)
    const stale = await harness.call('activity.patch', {
      body: { activityId: activity.id, expectedRevision: activity.revision, payload: activity.payload },
    })
    assert.equal((stale.json as { error: { code: string } }).error.code, 'conflict')
  })
})
