/**
 * Fixtures for portability tests.
 *
 * Every test creates its own temporary data directory and temporary "student
 * material" directory under the OS temp dir; nothing here touches `~/.dsh` or
 * the repository's sample files.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  ActivityPayload, ActivityState, CodeRunPayload, Course, CourseLearningRecord, CourseRevision,
  EnvironmentRecord, ExperimentRun, LessonActivity, LearningAttempt, MasteryRecord, SourceAnchor,
  SourceDocument, TeachingSession,
} from '../../src/contracts/index.ts'
import {
  activityId, attemptId, courseId, courseRevisionId, environmentId, masteryId, messageId,
  runId, sessionId, sourceId, sourceRevisionId, unitId,
} from '../../src/contracts/index.ts'
import type { PortabilityService } from '../../src/contracts/portability-service.ts'
import { createPortabilityService } from '../../src/portability/index.ts'
import { LocalState } from '../../src/storage/local-state.ts'
import {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
} from '../../src/storage/repositories.ts'

const NOW = '2026-11-04T08:00:00.000Z'

/** One isolated store wired to a fresh portability service. */
export interface TestStore {
  readonly dir: string
  readonly materialDir: string
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly sessions: SessionRepository
  readonly learning: LearningRepository
  readonly profiles: ProfileRepository
  readonly service: PortabilityService
  readonly pluginVersion: string
  readonly appVersion: string
  dispose(): Promise<void>
}

/** Create one isolated store (data dir + service + repositories). */
export async function createTestStore(options?: {
  readonly includeUsageInBackups?: boolean
  readonly pluginVersion?: string
  readonly appVersion?: string
  /** Open the LocalState (creates meta/dirs). Set false to simulate a fresh install dir. */
  readonly open?: boolean
}): Promise<TestStore> {
  const dir = await mkdtemp(join(tmpdir(), 'teaching-portability-data-'))
  const materialDir = await mkdtemp(join(tmpdir(), 'teaching-portability-material-'))
  const state = new LocalState({ dataDir: dir, pluginVersion: options?.pluginVersion ?? '0.1.0-test' })
  if (options?.open !== false) await state.open()
  const courses = new CourseRepository(state)
  const sessions = new SessionRepository(state)
  const learning = new LearningRepository(state)
  const profiles = new ProfileRepository(state)
  const pluginVersion = options?.pluginVersion ?? '0.1.0-test'
  const appVersion = options?.appVersion ?? '0.2.1-rc.5-test'
  const service = createPortabilityService({
    state,
    courses,
    sessions,
    learning,
    profiles,
    pluginVersion,
    appVersion,
    ...(options?.includeUsageInBackups === true ? { includeUsageInBackups: true } : {}),
  })
  return {
    dir,
    materialDir,
    state,
    courses,
    sessions,
    learning,
    profiles,
    service,
    pluginVersion,
    appVersion,
    async dispose() {
      await rm(dir, { recursive: true, force: true })
      await rm(materialDir, { recursive: true, force: true })
    },
  }
}

/** A source anchor pointing at one fixed unit of a source document. */
export function makeAnchor(label = '过拟合.md · 第 1 节'): SourceAnchor {
  return {
    documentId: sourceId(),
    revisionId: sourceRevisionId(),
    unitId: unitId(),
    locator: { lines: [1, 4] },
    excerpt: '过拟合是指模型记住了训练集的噪声，导致泛化变差。',
    confidence: 'high',
    label,
  }
}

const KIND_BY_TYPE: Readonly<Record<ActivityPayload['type'], LessonActivity['kind']>> = {
  explanation: 'explanation',
  figure: 'static-figure',
  graph: 'interactive-graph',
  derivation: 'derivation',
  'code-run': 'code-run',
  quiz: 'quiz',
  'reading-task': 'reading-task',
  'proof-task': 'proof-task',
  'open-question': 'open-question',
  'experiment-note': 'experiment-note',
}

/** Build a complete activity record around one payload. */
export function makeActivity(
  session: Pick<TeachingSession, 'id' | 'courseId'>,
  revisionId: CourseRevision['id'],
  payload: ActivityPayload,
  options?: { readonly title?: string; readonly goal?: string; readonly status?: 'active' | 'archived' },
): LessonActivity {
  return {
    id: activityId(),
    kind: KIND_BY_TYPE[payload.type],
    sessionId: session.id,
    courseId: session.courseId,
    conceptIds: [],
    goal: options?.goal ?? '检验对过拟合的理解',
    title: options?.title ?? `活动：${payload.type}`,
    createdAt: NOW,
    updatedAt: NOW,
    revision: 1,
    status: options?.status ?? 'active',
    sourceRefs: [makeAnchor()],
    verification: { kind: 'objective', note: '测试用客观校验' },
    independent: true,
    payload,
    revisionHistory: [],
  }
}

/** The payloads used across tests, one of every kind. */
export interface SeededTeachingData {
  readonly course: Course
  readonly revision: CourseRevision
  readonly session: TeachingSession
  readonly presentSource: SourceDocument
  readonly missingSource: SourceDocument
  readonly materialFile: string
  readonly missingFile: string
  readonly activities: readonly LessonActivity[]
  readonly graphActivity: LessonActivity
  readonly derivationActivity: LessonActivity
  readonly quizActivity: LessonActivity
  readonly pythonActivity: LessonActivity
  readonly schemeActivity: LessonActivity
  readonly run: ExperimentRun
  readonly environment: EnvironmentRecord
  readonly learning: CourseLearningRecord
}

/** Write a small Markdown student material file and return its path. */
async function writeMaterial(store: TestStore): Promise<string> {
  const path = join(store.materialDir, 'overfitting.md')
  await writeFile(path, '# 过拟合\n\n训练误差低不代表泛化好。\n', 'utf8')
  return path
}

/** Seed one course with every activity kind, a session, learning data and a run. */
export async function seedTeachingData(store: TestStore): Promise<SeededTeachingData> {
  const materialFile = await writeMaterial(store)
  const missingFile = join(store.materialDir, 'moved-away.md')
  const courseIdentifier = courseId()
  const revisionIdentifier = courseRevisionId()
  const presentSourceId = sourceId()
  const missingSourceId = sourceId()

  const presentSource = await store.courses.saveSource({
    id: presentSourceId,
    originalPath: materialFile,
    title: '过拟合.md',
    format: 'markdown',
    courseIds: [courseIdentifier],
    addedAt: NOW,
    updatedAt: NOW,
    status: 'ready',
    currentRevisionId: sourceRevisionId(),
    revisions: [],
    sizeBytes: 60,
    mtimeMs: 1,
  })
  const missingSource = await store.courses.saveSource({
    id: missingSourceId,
    originalPath: missingFile,
    title: '已移动的讲义.pdf',
    format: 'pdf',
    courseIds: [courseIdentifier],
    addedAt: NOW,
    updatedAt: NOW,
    status: 'ready',
    currentRevisionId: sourceRevisionId(),
    revisions: [],
    sizeBytes: 120,
    mtimeMs: 2,
  })

  const anchor = makeAnchor()
  const revision: CourseRevision = {
    id: revisionIdentifier,
    courseId: courseIdentifier,
    version: 1,
    createdAt: NOW,
    state: 'confirmed',
    confirmedAt: NOW,
    provenance: 'ai-draft',
    goals: ['能解释过拟合与泛化的差别'],
    background: '学过线性回归',
    language: 'zh',
    sources: [
      { sourceId: presentSource.id, role: 'textbook' },
      { sourceId: missingSource.id, role: 'lecture' },
    ],
    concepts: [
      {
        id: 'concept-overfit' as never,
        title: '过拟合',
        summary: '模型记住训练集噪声',
        prerequisites: [],
        sourceAnchors: [anchor],
        difficulty: 'core',
      },
      {
        id: 'concept-regularization' as never,
        title: '正则化',
        summary: '限制模型复杂度',
        prerequisites: ['concept-overfit' as never],
        sourceAnchors: [],
      },
    ],
    sequence: ['concept-overfit' as never, 'concept-regularization' as never],
    basedOn: [{ sourceId: presentSource.id, revisionId: 'srev-based' }],
    needsRecheckConceptIds: [],
  }
  await store.courses.saveRevision(revision)
  const course = await store.courses.save({
    id: courseIdentifier,
    title: '机器学习基础',
    description: '用真实课程资料学习过拟合与正则化。',
    subjectTags: ['机器学习'],
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    activeRevisionId: revision.id,
  })

  const session: TeachingSession = {
    id: sessionId(),
    courseId: course.id,
    courseRevisionId: revision.id,
    title: '第一次学习：过拟合',
    createdAt: NOW,
    updatedAt: NOW,
    status: 'active',
    position: { stage: 'practice', conceptId: 'concept-overfit' as never, updatedAt: NOW },
    messageIds: [],
    coveredConceptIds: ['concept-overfit' as never],
  }
  await store.sessions.save(session)

  const teacherText = [
    '## 过拟合的核心',
    '训练误差低不代表泛化好，公式 $E_{out} > E_{in}$ 说明泛化误差可能更大。',
    '',
    '- 训练集表现好',
    '- 验证集表现差',
    '',
    '参考 [课程原文](https://example.com/material)。',
  ].join('\n')
  await store.sessions.appendMessage({
    id: messageId(),
    sessionId: session.id,
    role: 'teacher',
    kind: 'teacher-explanation',
    text: teacherText,
    markdown: true,
    createdAt: NOW,
    evidenceRefs: [{
      kind: 'course-source',
      label: '过拟合.md · 第 1 节',
      anchor,
      confidence: 'high',
    }, {
      kind: 'model-knowledge',
      label: '模型补充：偏差-方差权衡',
      note: '教材未展开',
      confidence: 'medium',
    }],
    activityIds: [],
  })
  await store.sessions.appendMessage({
    id: messageId(),
    sessionId: session.id,
    role: 'student',
    kind: 'student-answer',
    text: '我的理解：模型记住噪声，所以验证集变差。',
    createdAt: NOW,
    evidenceRefs: [],
    activityIds: [],
  })

  const activities: LessonActivity[] = []
  const addActivity = async (payload: ActivityPayload, title?: string): Promise<LessonActivity> => {
    const activity = makeActivity(session, revision.id, payload, title !== undefined ? { title } : {})
    await store.sessions.saveActivity(activity)
    activities.push(activity)
    return activity
  }

  await addActivity({
    type: 'explanation',
    title: '过拟合讲解',
    markdown: '公式 $a^2 + b^2 = c^2$ 与显示公式：\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$',
    keyPoints: ['训练误差低不代表泛化好'],
    caveats: ['不同任务的噪声不同'],
  })

  const graphActivity = await addActivity({
    type: 'graph',
    title: '交互图：参数 a 对曲线的影响',
    xLabel: 'x',
    yLabel: 'y',
    xRange: [-4, 4],
    yRange: [-1, 9],
    series: [{ id: 's1', label: 'a·x²', expr: 'a * x^2', color: 'blue' }],
    params: [{ name: 'a', label: '系数 a', min: 0.2, max: 2, step: 0.1, value: 1 }],
    markers: [{ x: 0, y: 0, label: '顶点' }],
    animation: { param: 'a', from: 0.2, to: 2, durationMs: 1200 },
    hint: '拖动滑杆观察曲线',
  } satisfies ActivityPayload)

  await addActivity({
    type: 'figure',
    title: '柱状图：误差对比',
    variant: 'bar-chart',
    data: [{ label: '训练误差', y: 0.1 }, { label: '验证误差', y: 0.4 }],
    caption: '训练误差低而验证误差高',
  })

  const derivationActivity = await addActivity({
    type: 'derivation',
    title: '推导：偏差-方差分解',
    claim: '期望误差 = 偏差² + 方差 + 噪声',
    steps: [
      { id: 'step-1', latex: 'E[(y - \\hat{f})^2] = E[\\epsilon^2] + (E[\\hat{f}] - f)^2 + Var(\\hat{f})', note: '展开平方' },
      { id: 'step-2', latex: '= \\sigma^2 + Bias^2 + Variance', note: '整理各项' },
    ],
    conclusion: '误差由三部分组成',
  })

  const quizActivity = await addActivity({
    type: 'quiz',
    question: '过拟合最直接的表现是什么？',
    options: [
      { id: 'a', label: '训练误差低、验证误差高' },
      { id: 'b', label: '训练误差高、验证误差低' },
    ],
    correctOptionIds: ['a'],
    explanation: '过拟合记住了训练噪声，泛化变差（$E_{out}$ 升高）。',
    hint: '比较训练集与验证集误差。',
  }, '小测：过拟合表现')

  const pythonActivity = await addActivity({
    type: 'code-run',
    title: 'Python 实验：平方和',
    language: 'python',
    code: 'print(sum(i * i for i in range(5)))',
    editable: true,
    instructions: '运行并解释结果。',
    tests: [{ name: '输出 30', type: 'stdout-contains', value: '30' }],
  })

  const schemeActivity = await addActivity({
    type: 'code-run',
    title: 'SICP 实验：平方',
    language: 'scheme',
    dialect: 'sicp',
    code: '(display (square 4))\n(newline)',
    editable: true,
    requires: ['sicp-prelude'],
  } satisfies CodeRunPayload)

  await addActivity({
    type: 'reading-task',
    instructions: '阅读第 1 节，注意泛化误差。',
    anchors: [anchor],
    questions: ['训练误差与验证误差的区别？'],
    minMinutes: 5,
  }, '阅读任务：第 1 节')

  await addActivity({
    type: 'proof-task',
    claim: '在训练集上最小化误差不保证样本外误差最小',
    assumptions: ['训练集与测试集独立同分布'],
    rubric: [{ id: 'r1', label: '结构完整', weight: 1, observable: '有反例' }],
    hint: '考虑噪声项。',
    reference: '因为训练集含噪声，优化会拟合噪声。',
  }, '证明：样本外误差更高')

  await addActivity({
    type: 'open-question',
    prompt: '用自己的话解释正则化为什么能缓解过拟合。',
    rubric: [{ id: 'r1', label: '条件清楚', weight: 1 }],
    referencePoints: ['限制模型复杂度', '偏差-方差权衡'],
    expectedLanguage: 'zh',
  }, '开放题：为什么正则化有效')

  await addActivity({
    type: 'experiment-note',
    title: '实验记录：学习率对比',
    markdown: '学习率 0.1 时验证误差更低。',
    limitations: ['只在一个小数据集上验证'],
  })

  // Student-editable state for graph/derivation/code activity.
  const graphState: ActivityState = {
    activityId: graphActivity.id,
    activityRevision: 1,
    params: { a: 1.5 },
    updatedAt: NOW,
  }
  await store.sessions.saveActivityState(graphState)
  await store.sessions.saveActivityState({
    activityId: derivationActivity.id,
    activityRevision: 1,
    revealedStepIds: ['step-1'],
    updatedAt: NOW,
  })
  await store.sessions.saveActivityState({
    activityId: pythonActivity.id,
    activityRevision: 1,
    code: 'print(sum(i * i for i in range(5)))',
    updatedAt: NOW,
  })

  // Environment + successful run for the Python activity.
  const environment: EnvironmentRecord = {
    id: environmentId(),
    language: 'python',
    kind: 'system',
    status: 'ready',
    version: '3.15.2',
    isolation: { dependencies: 'shared', note: '使用系统解释器' },
    execution: {
      mode: 'process',
      executable: 'python3',
      args: ['-I'],
      timeoutMs: 10_000,
      cancellable: true,
      network: 'unknown',
      confinement: '宿主进程，无额外内存限制',
    },
    createdAt: NOW,
    updatedAt: NOW,
  }
  await store.state.writeJson(`environments/${environment.id}.json`, environment)
  const run: ExperimentRun = {
    id: runId(),
    sessionId: session.id,
    courseId: course.id,
    activityId: pythonActivity.id,
    activityRevision: 1,
    environmentId: environment.id,
    language: 'python',
    code: 'print(sum(i * i for i in range(5)))',
    startedAt: NOW,
    endedAt: NOW,
    status: 'succeeded',
    stdout: '30\n',
    stderr: '',
    exitCode: 0,
    durationMs: 42,
    verification: 'objective',
    limits: { timeoutMs: 10_000 },
  }
  await store.state.writeJson(`runs/${run.id}.json`, run)

  // Learning record: attempt, mastery, review, notes.
  const attempt: LearningAttempt = {
    id: attemptId(),
    sessionId: session.id,
    courseId: course.id,
    courseRevisionId: revision.id,
    conceptIds: ['concept-overfit' as never],
    activityId: quizActivity.id,
    activityRevision: 1,
    prompt: '过拟合最直接的表现是什么？',
    answerText: '训练误差低、验证误差高',
    selectedOptionIds: ['a'],
    helpExposure: { level: 0 },
    independence: 'independent',
    selfReport: 'understood',
    validation: {
      kind: 'quiz',
      passed: true,
      checks: [{ name: '选择正确', status: 'pass' }],
      evidence: ['选择了 a'],
      assessedBy: 'objective-runner',
      confidence: 'high',
    },
    createdAt: NOW,
  }
  const mastery: MasteryRecord = {
    id: masteryId(),
    courseId: course.id,
    courseRevisionId: revision.id,
    conceptId: 'concept-overfit' as never,
    level: 'practiced',
    dimensions: { explain: 1, conditions: 0, variants: 1, transfer: 0 },
    evidenceAttemptIds: [attempt.id],
    basis: ['独立完成 quiz'],
    uncovered: ['transfer'],
    disputes: [{ id: 'dispute-1', reason: '我认为已经掌握', createdAt: NOW, status: 'open' }],
    updatedAt: NOW,
  }
  const learning: CourseLearningRecord = {
    courseId: course.id,
    courseRevisionId: revision.id,
    attempts: [attempt],
    mastery: [mastery],
    review: [{
      conceptId: 'concept-overfit' as never,
      courseId: course.id,
      dueAt: '2026-11-06T08:00:00.000Z',
      intervalDays: 2,
      reason: 'spaced',
    }],
    notes: [{
      id: 'note-1',
      sessionId: session.id,
      conceptId: 'concept-overfit' as never,
      markdown: '我的笔记：**泛化误差**是关键。',
      createdAt: NOW,
      updatedAt: NOW,
    }],
    updatedAt: NOW,
  }
  await store.learning.save(learning)

  // Settings + profile files exist so the backup covers those categories.
  await store.state.writeJson('settings.json', { language: 'zh', backupReminderDays: 7 })
  await store.profiles.get()
  await store.state.writeJson('usage/model-usage.jsonl', { provider: 'test', model: 'fake', durationMs: 1 })
  await mkdir(store.state.paths.cache, { recursive: true })
  await writeFile(join(store.state.paths.cache, 'index.json'), '{}', 'utf8')

  return {
    course,
    revision,
    session,
    presentSource,
    missingSource,
    materialFile,
    missingFile,
    activities,
    graphActivity,
    derivationActivity,
    quizActivity,
    pythonActivity,
    schemeActivity,
    run,
    environment,
    learning,
  }
}
