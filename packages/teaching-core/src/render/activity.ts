/**
 * Activity payload validation and the single `mountActivity` seam.
 *
 * `mountActivity(container, payloadOrActivity, options)` is the stable renderer
 * interface used by the Harness workspace today and by the standalone offline
 * export (T07) later. It dispatches to the per-kind renderers, wraps them with
 * the activity header (title/goal/verification/source chips) and returns the
 * student-editable state collected from the sub-renderers.
 */
import type {
  ActivityPayload, ActivityState, ActivityVerification, DerivationPayload, ExplanationPayload,
  ExperimentNotePayload, FigurePayload, GraphPayload, LessonActivity, OpenQuestionPayload,
  ProofTaskPayload, QuizPayload, ReadingTaskPayload, RubricCriterion,
} from '../contracts/activity.ts'
import type { ActivityId } from '../contracts/ids.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import type { SourceAnchor } from '../contracts/source.ts'
import { mountCodeRun } from './code-run.ts'
import { mountDerivation } from './derivation.ts'
import { createElement, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { compileExpression } from './expr.ts'
import { mountFigure } from './figure.ts'
import { mountGraph } from './graph.ts'
import { mountQuiz } from './quiz.ts'
import {
  appendAnchors, mountExplanation, mountExperimentNote, mountOpenQuestion, mountProofTask,
  mountReadingTask,
} from './tasks.ts'

/** Student-editable state collected from one mounted activity. */
export interface MountedActivityState {
  readonly params?: Readonly<Record<string, number>>
  readonly code?: string
  readonly revealedStepIds?: readonly string[]
}

/** Help exposure reported upward for attempt accounting (never stored client-side). */
export interface HelpExposureInfo {
  readonly level: 0 | 1 | 2 | 3 | 'full-answer'
  readonly hintsSeen?: readonly string[]
  readonly answer?: string
}

/** One answer submission from a quiz or prose task. */
export interface AnswerSubmission {
  readonly answerText: string
  readonly selectedOptionIds?: readonly string[]
}

/** Callbacks the Harness workspace (or an offline page) supplies. */
export interface ActivityCallbacks {
  /** Persist student-editable state (`activity.state` route). */
  readonly onStateChange?: (patch: MountedActivityState) => void
  /** Run code through the Host (`activity.run`/`experiments.run`). */
  readonly onRunCode?: (request: {
    readonly code: string
    readonly language: string
    readonly dialect?: string
    readonly stdin?: string
  }) => Promise<import('./code-run.ts').CodeRunResultView> | import('./code-run.ts').CodeRunResultView
  /** Stop an in-flight run. */
  readonly onCancelRun?: (runId: string | undefined) => void | Promise<void>
  /** Quiz submitted; the client records the attempt through the Host. */
  readonly onQuizSubmit?: (selectedOptionIds: readonly string[]) => void | Promise<void>
  /** Prose answer submitted (proof/open/reading). */
  readonly onAnswerSubmit?: (submission: AnswerSubmission) => void | Promise<void>
  /** Hint/full answer exposed; affects independence classification. */
  readonly onHelpExposure?: (help: HelpExposureInfo) => void
  /** Source chip opened; the client switches the source tab. */
  readonly onAnchorClick?: (anchor: SourceAnchor) => void
}

/** Options for {@link mountActivity}. */
export interface MountActivityOptions extends RenderEnvironment {
  /** Restored activity state from the Host. */
  readonly state?: ActivityState
  readonly callbacks?: ActivityCallbacks
  /** Offline export: native code execution is disabled and says so. */
  readonly offline?: boolean
  readonly requestFrame?: (callback: (timeMs: number) => void) => number
  readonly cancelFrame?: (handle: number) => void
}

/** Activity description accepted by {@link mountActivity}. */
export interface MountActivityInput {
  readonly payload: ActivityPayload
  readonly id?: ActivityId
  readonly revision?: number
  readonly title?: string
  readonly goal?: string
  readonly sourceRefs?: readonly SourceAnchor[]
  readonly verification?: ActivityVerification
}

/** Handle returned by {@link mountActivity}. */
export interface MountedActivity {
  readonly element: HTMLElement
  /** Student-editable state for `activity.state` persistence. */
  getState(): MountedActivityState
  dispose(): void
}

const VERIFICATION_LABELS: Readonly<Record<ActivityVerification['kind'], string>> = {
  none: '无客观校验',
  objective: '客观校验（真实运行/测试）',
  rubric: '按评分标准评价',
  open: '开放评价（保留不确定性）',
}

/** Coerce an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function validationError(message: string): Result<never> {
  return err('invalid-input', `活动数据无效：${message}`)
}

function validateGraph(payload: Record<string, unknown>): Result<GraphPayload> {
  const xRange = payload.xRange
  const yRange = payload.yRange
  if (!Array.isArray(xRange) || xRange.length !== 2 || !xRange.every(isFiniteNumber)) return validationError('graph.xRange 必须是两个数字')
  if (!Array.isArray(yRange) || yRange.length !== 2 || !yRange.every(isFiniteNumber)) return validationError('graph.yRange 必须是两个数字')
  if ((xRange[0] as number) === (xRange[1] as number)) return validationError('graph.xRange 不能为零宽')
  if ((yRange[0] as number) === (yRange[1] as number)) return validationError('graph.yRange 不能为零高')
  if (!Array.isArray(payload.series) || payload.series.length === 0) return validationError('graph.series 不能为空')
  const params = Array.isArray(payload.params) ? payload.params : []
  const paramNames = new Set<string>()
  for (const param of params) {
    const record = asRecord(param)
    if (record === undefined || !isString(record.name) || !isString(record.label)
      || !isFiniteNumber(record.min) || !isFiniteNumber(record.max) || !isFiniteNumber(record.step)
      || !isFiniteNumber(record.value)) return validationError('graph.params 项需要 name/label/min/max/step/value')
    if (record.min > record.max) return validationError(`参数 ${record.name} 的 min 大于 max`)
    if (record.step <= 0) return validationError(`参数 ${record.name} 的 step 必须为正数`)
    paramNames.add(record.name)
  }
  for (const series of payload.series) {
    const record = asRecord(series)
    if (record === undefined || !isString(record.id) || !isString(record.label) || !isString(record.expr)) {
      return validationError('graph.series 项需要 id/label/expr')
    }
    try {
      compileExpression(record.expr, { variables: ['x', ...paramNames] })
    } catch (error) {
      return validationError(`函数「${record.label}」表达式无法解析：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const animation = asRecord(payload.animation)
  if (animation !== undefined) {
    if (!isString(animation.param) || !isFiniteNumber(animation.from) || !isFiniteNumber(animation.to)
      || !isFiniteNumber(animation.durationMs) || animation.durationMs <= 0) {
      return validationError('graph.animation 需要 param/from/to/正数 durationMs')
    }
    if (!paramNames.has(animation.param) && animation.param !== 'x') {
      return validationError(`graph.animation.param「${animation.param}」不在 params 中`)
    }
  }
  return ok(payload as unknown as GraphPayload)
}

function validateFigure(payload: Record<string, unknown>): Result<FigurePayload> {
  const variants = ['bar-chart', 'scatter', 'concept-map', 'flow', 'table']
  if (!isString(payload.variant) || !variants.includes(payload.variant)) return validationError('figure.variant 不受支持')
  if (payload.data !== undefined) {
    if (!Array.isArray(payload.data)) return validationError('figure.data 必须是数组')
    for (const point of payload.data) {
      const record = asRecord(point)
      if (record === undefined || !isString(record.label) || !isFiniteNumber(record.y)) return validationError('figure.data 项需要 label/y')
      if (record.x !== undefined && !isFiniteNumber(record.x)) return validationError('figure.data.x 必须是数字')
    }
  }
  if (payload.nodes !== undefined) {
    if (!Array.isArray(payload.nodes)) return validationError('figure.nodes 必须是数组')
    const ids = new Set<string>()
    for (const node of payload.nodes) {
      const record = asRecord(node)
      if (record === undefined || !isString(record.id) || !isString(record.label)) return validationError('figure.nodes 项需要 id/label')
      if (ids.has(record.id)) return validationError(`figure.nodes 重复 id：${record.id}`)
      ids.add(record.id)
    }
    if (payload.edges !== undefined) {
      if (!Array.isArray(payload.edges)) return validationError('figure.edges 必须是数组')
      for (const edge of payload.edges) {
        const record = asRecord(edge)
        if (record === undefined || !isString(record.from) || !isString(record.to)) return validationError('figure.edges 项需要 from/to')
        if (!ids.has(record.from) || !ids.has(record.to)) return validationError('figure.edges 引用了不存在的节点')
      }
    }
  }
  return ok(payload as unknown as FigurePayload)
}

function validateDerivation(payload: Record<string, unknown>): Result<DerivationPayload> {
  if (!Array.isArray(payload.steps) || payload.steps.length === 0) return validationError('derivation.steps 不能为空')
  const ids = new Set<string>()
  for (const step of payload.steps) {
    const record = asRecord(step)
    if (record === undefined || !isString(record.id) || !isString(record.latex)) return validationError('derivation.steps 项需要 id/latex')
    if (ids.has(record.id)) return validationError(`derivation.steps 重复 id：${record.id}`)
    if (record.dependsOn !== undefined && !isStringArray(record.dependsOn)) return validationError('derivation.steps.dependsOn 必须是字符串数组')
    ids.add(record.id)
  }
  for (const step of payload.steps) {
    for (const dependency of (asRecord(step)?.dependsOn ?? []) as string[]) {
      if (!ids.has(dependency)) return validationError(`derivation 步骤依赖不存在：${dependency}`)
    }
  }
  return ok(payload as unknown as DerivationPayload)
}

function validateCodeRun(payload: Record<string, unknown>): Result<import('../contracts/activity.ts').CodeRunPayload> {
  if (!isString(payload.language)) return validationError('code-run.language 必须是字符串')
  if (typeof payload.code !== 'string') return validationError('code-run.code 必须是字符串')
  if (typeof payload.editable !== 'boolean') return validationError('code-run.editable 必须是布尔值')
  if (payload.tests !== undefined) {
    if (!Array.isArray(payload.tests)) return validationError('code-run.tests 必须是数组')
    for (const test of payload.tests) {
      const record = asRecord(test)
      if (record === undefined || !isString(record.name) || !isString(record.type)) return validationError('code-run.tests 项需要 name/type')
      if (!['stdout-contains', 'stdout-equals', 'exit-code'].includes(record.type)) return validationError('code-run.tests.type 不受支持')
    }
  }
  return ok(payload as unknown as import('../contracts/activity.ts').CodeRunPayload)
}

function validateQuiz(payload: Record<string, unknown>): Result<QuizPayload> {
  if (!isString(payload.question)) return validationError('quiz.question 必须是字符串')
  if (!Array.isArray(payload.options) || payload.options.length === 0) return validationError('quiz.options 不能为空')
  const ids = new Set<string>()
  for (const option of payload.options) {
    const record = asRecord(option)
    if (record === undefined || !isString(record.id) || !isString(record.label)) return validationError('quiz.options 项需要 id/label')
    if (ids.has(record.id)) return validationError(`quiz.options 重复 id：${record.id}`)
    ids.add(record.id)
  }
  if (!isStringArray(payload.correctOptionIds)) return validationError('quiz.correctOptionIds 必须是字符串数组')
  for (const id of payload.correctOptionIds) {
    if (!ids.has(id)) return validationError(`quiz.correctOptionIds 引用了不存在的选项：${id}`)
  }
  if (payload.multiple !== undefined && typeof payload.multiple !== 'boolean') return validationError('quiz.multiple 必须是布尔值')
  return ok(payload as unknown as QuizPayload)
}

function validateRubric(rubric: unknown): Result<RubricCriterion[]> {
  if (!Array.isArray(rubric) || rubric.length === 0) return validationError('rubric 不能为空')
  for (const criterion of rubric) {
    const record = asRecord(criterion)
    if (record === undefined || !isString(record.id) || !isString(record.label) || !isFiniteNumber(record.weight)) {
      return validationError('rubric 项需要 id/label/weight')
    }
  }
  return ok(rubric as unknown as RubricCriterion[])
}

function validateReadingTask(payload: Record<string, unknown>): Result<ReadingTaskPayload> {
  if (!isString(payload.instructions)) return validationError('reading-task.instructions 必须是字符串')
  if (!Array.isArray(payload.anchors)) return validationError('reading-task.anchors 必须是数组')
  for (const anchor of payload.anchors) {
    const record = asRecord(anchor)
    if (record === undefined || !isString(record.label) || !isString(record.excerpt)) return validationError('reading-task.anchors 项需要 label/excerpt')
  }
  if (!isStringArray(payload.questions)) return validationError('reading-task.questions 必须是字符串数组')
  return ok(payload as unknown as ReadingTaskPayload)
}

function validateProofTask(payload: Record<string, unknown>): Result<ProofTaskPayload> {
  if (!isString(payload.claim)) return validationError('proof-task.claim 必须是字符串')
  if (!isStringArray(payload.assumptions)) return validationError('proof-task.assumptions 必须是字符串数组')
  const rubric = validateRubric(payload.rubric)
  if (!rubric.ok) return rubric
  return ok(payload as unknown as ProofTaskPayload)
}

function validateOpenQuestion(payload: Record<string, unknown>): Result<OpenQuestionPayload> {
  if (!isString(payload.prompt)) return validationError('open-question.prompt 必须是字符串')
  const rubric = validateRubric(payload.rubric)
  if (!rubric.ok) return rubric
  if (payload.referencePoints !== undefined && !isStringArray(payload.referencePoints)) return validationError('open-question.referencePoints 必须是字符串数组')
  return ok(payload as unknown as OpenQuestionPayload)
}

function validateExplanation(payload: Record<string, unknown>): Result<ExplanationPayload> {
  if (!isString(payload.markdown)) return validationError('explanation.markdown 必须是字符串')
  if (payload.keyPoints !== undefined && !isStringArray(payload.keyPoints)) return validationError('explanation.keyPoints 必须是字符串数组')
  if (payload.caveats !== undefined && !isStringArray(payload.caveats)) return validationError('explanation.caveats 必须是字符串数组')
  return ok(payload as unknown as ExplanationPayload)
}

function validateExperimentNote(payload: Record<string, unknown>): Result<ExperimentNotePayload> {
  if (!isString(payload.title) || !isString(payload.markdown)) return validationError('experiment-note 需要 title/markdown')
  if (payload.limitations !== undefined && !isStringArray(payload.limitations)) return validationError('experiment-note.limitations 必须是字符串数组')
  return ok(payload as unknown as ExperimentNotePayload)
}

/**
 * Validate one declarative activity payload before mounting it.
 *
 * @param input - value received from the Host (model-authored payload).
 * @returns the payload on success, or an `invalid-input` AppError describing the
 *          first concrete problem; the client shows this instead of a blank panel.
 */
export function validateActivityPayload(input: unknown): Result<ActivityPayload> {
  const payload = asRecord(input)
  if (payload === undefined) return validationError('payload 不是对象')
  if (!isString(payload.type)) return validationError('缺少 type 字段')
  switch (payload.type) {
    case 'graph': return validateGraph(payload)
    case 'figure': return validateFigure(payload)
    case 'derivation': return validateDerivation(payload)
    case 'code-run': return validateCodeRun(payload)
    case 'quiz': return validateQuiz(payload)
    case 'reading-task': return validateReadingTask(payload)
    case 'proof-task': return validateProofTask(payload)
    case 'open-question': return validateOpenQuestion(payload)
    case 'explanation': return validateExplanation(payload)
    case 'experiment-note': return validateExperimentNote(payload)
    default: return validationError(`不支持的活动类型「${payload.type}」`)
  }
}

/** True when the input looks like a full `LessonActivity` record. */
function isLessonActivity(input: MountActivityInput | LessonActivity): input is LessonActivity {
  return 'kind' in input && typeof (input as LessonActivity).kind === 'string'
    && 'sessionId' in input && 'revision' in input
}

function toInput(input: MountActivityInput | LessonActivity): MountActivityInput {
  if (!isLessonActivity(input)) return input
  return {
    payload: input.payload,
    id: input.id,
    revision: input.revision,
    title: input.title,
    goal: input.goal,
    sourceRefs: input.sourceRefs,
    verification: input.verification,
  }
}

/**
 * Mount any declarative activity.
 *
 * @param container - wrapper element owned by the caller.
 * @param input - payload (or full activity record) to render.
 * @param options - restored state, Host callbacks, animation clock.
 * @returns handle with the collected student-editable state and `dispose`.
 */
export function mountActivity(
  container: HTMLElement,
  input: MountActivityInput | LessonActivity,
  options: MountActivityOptions = {},
): MountedActivity {
  const document = resolveDocument(options)
  const activity = toInput(input)
  const payload = activity.payload
  const callbacks = options.callbacks ?? {}
  const state: { params?: Record<string, number>; code?: string; revealedStepIds?: string[] } = {}
  const recordState = (patch: MountedActivityState): void => {
    if (patch.params !== undefined) state.params = { ...patch.params }
    if (patch.code !== undefined) state.code = patch.code
    if (patch.revealedStepIds !== undefined) state.revealedStepIds = [...patch.revealedStepIds]
    callbacks.onStateChange?.(patch)
  }

  const wrapper = createElement(document, 'div', {
    className: `teaching-activity teaching-activity-${payload.type}`,
    attrs: {
      'data-activity-id': activity.id ?? '',
      'data-activity-revision': String(activity.revision ?? 0),
    },
    styles: {
      border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))',
      borderRadius: '10px',
      padding: '10px 12px',
      background: 'var(--dsw-alias-bg-base, transparent)',
    },
  })
  const title = activity.title ?? ('title' in payload ? payload.title : undefined) ?? '教学活动'
  wrapper.appendChild(createElement(document, 'div', {
    className: 'teaching-activity-title',
    text: title,
    styles: { fontWeight: '600', fontSize: '14px', marginBottom: '2px' },
  }))
  if (activity.goal !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-activity-goal', text: `目标：${activity.goal}`,
      styles: { fontSize: '12px', opacity: '0.75', marginBottom: '4px' },
    }))
  }
  if (activity.verification !== undefined) {
    const label = VERIFICATION_LABELS[activity.verification.kind] ?? activity.verification.kind
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-activity-verification',
      text: `${label}${activity.verification.note !== undefined ? ` · ${activity.verification.note}` : ''}`,
      styles: { fontSize: '11px', opacity: '0.65', marginBottom: '6px' },
    }))
  }
  if ((activity.sourceRefs ?? []).length > 0) {
    appendAnchors(wrapper, document, activity.sourceRefs ?? [], { document, ...(callbacks.onAnchorClick !== undefined ? { onAnchorClick: callbacks.onAnchorClick } : {}) })
  }

  const content = createElement(document, 'div', { className: 'teaching-activity-body' })
  wrapper.appendChild(content)
  const disposers: (() => void)[] = []

  switch (payload.type) {
    case 'graph': {
      const handle = mountGraph(content, payload, {
        document,
        ...(options.state?.params !== undefined ? { params: options.state.params } : {}),
        onChange: (params) => recordState({ params }),
        ...(options.requestFrame !== undefined ? { requestFrame: options.requestFrame } : {}),
        ...(options.cancelFrame !== undefined ? { cancelFrame: options.cancelFrame } : {}),
      })
      state.params = { ...handle.getParams() }
      disposers.push(() => handle.dispose())
      break
    }
    case 'figure': {
      const handle = mountFigure(content, payload, { document })
      disposers.push(() => handle.dispose())
      break
    }
    case 'derivation': {
      const handle = mountDerivation(content, payload, {
        document,
        ...(options.state?.revealedStepIds !== undefined ? { revealedStepIds: options.state.revealedStepIds } : {}),
        onChange: (revealedStepIds) => recordState({ revealedStepIds }),
      })
      const initialRevealed = handle.getRevealed()
      if (initialRevealed.length > 0) state.revealedStepIds = [...initialRevealed]
      disposers.push(() => handle.dispose())
      break
    }
    case 'code-run': {
      const handle = mountCodeRun(content, payload, {
        document,
        ...(options.state?.code !== undefined ? { code: options.state.code } : {}),
        ...(options.offline === true || callbacks.onRunCode === undefined ? {} : { onRun: callbacks.onRunCode }),
        ...(callbacks.onCancelRun !== undefined ? { onCancel: callbacks.onCancelRun } : {}),
        onChange: (code) => recordState({ code }),
      })
      state.code = handle.getCode()
      disposers.push(() => handle.dispose())
      break
    }
    case 'quiz': {
      const handle = mountQuiz(content, payload, {
        document,
        ...(callbacks.onQuizSubmit !== undefined ? { onSubmit: callbacks.onQuizSubmit } : {}),
        ...(callbacks.onHelpExposure !== undefined
          ? { onHelpExposed: (help: { level: 1 | 'full-answer'; answer: string }) => callbacks.onHelpExposure?.(help) }
          : {}),
      })
      disposers.push(() => handle.dispose())
      break
    }
    case 'explanation': {
      const handle = mountExplanation(content, payload, { document })
      disposers.push(() => handle.dispose())
      break
    }
    case 'reading-task': {
      const handle = mountReadingTask(content, payload, {
        document,
        ...(callbacks.onAnchorClick !== undefined ? { onAnchorClick: callbacks.onAnchorClick } : {}),
      })
      disposers.push(() => handle.dispose())
      break
    }
    case 'proof-task': {
      const handle = mountProofTask(content, payload, {
        document,
        ...(callbacks.onAnswerSubmit !== undefined ? { onSubmitAnswer: (answerText: string) => callbacks.onAnswerSubmit?.({ answerText }) } : {}),
        ...(callbacks.onHelpExposure !== undefined
          ? { onHelpExposed: (help: { level: 1 | 'full-answer'; answer: string }) => callbacks.onHelpExposure?.(help) }
          : {}),
        ...(callbacks.onAnchorClick !== undefined ? { onAnchorClick: callbacks.onAnchorClick } : {}),
      })
      disposers.push(() => handle.dispose())
      break
    }
    case 'open-question': {
      const handle = mountOpenQuestion(content, payload, {
        document,
        ...(callbacks.onAnswerSubmit !== undefined ? { onSubmitAnswer: (answerText: string) => callbacks.onAnswerSubmit?.({ answerText }) } : {}),
        ...(callbacks.onHelpExposure !== undefined
          ? { onHelpExposed: (help: { level: 1 | 'full-answer'; answer: string }) => callbacks.onHelpExposure?.(help) }
          : {}),
      })
      disposers.push(() => handle.dispose())
      break
    }
    case 'experiment-note': {
      const handle = mountExperimentNote(content, payload, { document })
      disposers.push(() => handle.dispose())
      break
    }
  }

  container.appendChild(wrapper)
  return {
    element: wrapper,
    getState: () => ({ ...state }),
    dispose: () => {
      for (const dispose of disposers) dispose()
      disposers.length = 0
      wrapper.remove()
    },
  }
}
