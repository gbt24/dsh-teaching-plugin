/**
 * 教学回合输出解析：切分正文/元数据、清洗模型 JSON、把编号回填成真实证据、
 * 校验并归一化活动提案、把模型错误映射为 AppError。
 *
 * 设计原则：
 * - 模型给的页码/原文一律不可信；证据只能由 Host 提供的真实 anchor 回填。
 * - 解析失败不抛异常穿透，由调用方降级（修复调用或纯文本）。
 * - 活动提案必须符合 activity.ts 的声明式 payload；不合格就丢弃并记录原因。
 */
import type {
  ActivityKind, ActivityPayload, ActivityVerification, DerivationPayload, DerivationStep, FigurePayload,
  GraphPayload, PlotColor, PlotParam, PlotSeries, ProofTaskPayload, QuizPayload,
  ReadingTaskPayload, RubricCriterion, ExplanationPayload, CodeRunPayload, CodeTest,
  ExperimentNotePayload, OpenQuestionPayload, VisualPayload, VisualRenderer, VisualType,
} from '../contracts/activity.ts'
import type { ConceptId } from '../contracts/ids.ts'
import type { AppError, AppErrorCode } from '../contracts/result.ts'
import type { EvidenceReference } from '../contracts/session.ts'
import type { SourceAnchor } from '../contracts/source.ts'
import type { ActivityProposal, TeachingTurnInput } from '../contracts/teaching.ts'
import type {
  CrossCourseRefView, MaterialRefView, ParsedConflict, ParsedEvidenceMeta, ParsedTurnMeta,
  SplitTurnOutput, TeachingPlan, WebRefView,
} from './types.ts'
import { activityKindCompatible } from './strategy.ts'
import { formatLocator } from './format.ts'
import { META_MARKER } from './prompts.ts'

/* ------------------------------------------------------------------ *
 * 通用类型守卫
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, max = 2000): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asStringArray(value: unknown, maxItems = 8, itemMax = 300): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value.slice(0, maxItems)) {
    const text = asString(item, itemMax)
    if (text !== undefined) out.push(text)
  }
  return out
}

function asNumberPair(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const first = asFiniteNumber(value[0])
  const second = asFiniteNumber(value[1])
  return first === undefined || second === undefined ? undefined : [first, second]
}

const INTENTS = new Set(['explain', 'diagnose', 'practice', 'feedback', 'review', 'switch-style', 'answer'])
const STAGES = new Set(['goal-setting', 'diagnosis', 'teaching', 'practice', 'transfer', 'review', 'idle'])
const CONFLICT_KINDS = new Set(['convention', 'substantive', 'unresolved'])

/* ------------------------------------------------------------------ *
 * 资料编号视图
 * ------------------------------------------------------------------ */

/** 从本轮检索结果构造提示词编号（M1…Mn），并限制条数/摘录长度。 */
export function buildMaterialRefs(
  input: TeachingTurnInput,
  maxMaterial: number,
  excerptChars: number,
): MaterialRefView[] {
  return input.material.slice(0, maxMaterial).map((item, index) => ({
    refId: `M${index + 1}`,
    documentTitle: item.documentTitle,
    label: item.anchor.label,
    locator: formatLocator(item.anchor.locator),
    excerpt: item.anchor.excerpt.slice(0, excerptChars),
    confidence: item.anchor.confidence,
    anchor: item.anchor,
  }))
}

/** 跨课程引用编号（C1…Cn）。 */
export function buildCrossCourseRefs(input: TeachingTurnInput, maxCrossCourse: number): CrossCourseRefView[] {
  return input.crossCourse.slice(0, maxCrossCourse).map((item, index) => ({
    refId: `C${index + 1}`,
    courseTitle: item.courseTitle,
    reason: item.reason,
    anchors: item.anchors,
  }))
}

/** 外部检索结果编号（W1…Wn）。 */
export function buildWebRefs(input: TeachingTurnInput, maxWebResults: number): WebRefView[] {
  return (input.webResults ?? []).slice(0, maxWebResults).map((item, index) => ({
    refId: `W${index + 1}`,
    title: item.title,
    url: item.url,
    snippet: item.snippet,
  }))
}

/* ------------------------------------------------------------------ *
 * 正文 / 元数据切分
 * ------------------------------------------------------------------ */

/** 元数据对象里出现任一字段，才认为尾部 JSON 是教学元数据而不是正文里的 JSON。 */
function hasMetaKeys(record: Record<string, unknown>): boolean {
  return ['intent', 'stage', 'conceptIds', 'activity', 'evidence', 'uncertainty',
    'nextActions', 'conflicts', 'requestedForm', 'diagnosis'].some(key => key in record)
}

/** 从尾部找 fenced / bare JSON 元数据块。返回起始下标与 JSON 文本。 */
function findTrailingMetadata(text: string): { readonly start: number; readonly jsonText: string } | undefined {
  const fenced = /```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/i.exec(text)
  if (fenced !== null && fenced[1] !== undefined && fenced.index !== undefined) {
    try {
      const parsed: unknown = JSON.parse(fenced[1])
      if (isRecord(parsed) && hasMetaKeys(parsed)) {
        return { start: fenced.index, jsonText: fenced[1] }
      }
    } catch {
      // 继续尝试裸 JSON。
    }
  }
  const trimmed = text.trimEnd()
  if (!trimmed.endsWith('}')) return undefined
  const start = trimmed.lastIndexOf('{')
  if (start <= 0) return undefined
  const candidate = trimmed.slice(start)
  try {
    const parsed: unknown = JSON.parse(candidate)
    if (isRecord(parsed) && hasMetaKeys(parsed)) return { start, jsonText: candidate }
  } catch {
    return undefined
  }
  return undefined
}

/** 把模型完整输出拆成「学生可见正文」与「元数据文本」。 */
export function splitTurnOutput(fullText: string): SplitTurnOutput {
  // Models sometimes echo the marker with nothing after it (e.g. a trailing
  // duplicate). Pick the earliest marker that actually has metadata behind it,
  // and fall back to the first marker when every occurrence is empty.
  const markerIndexes: number[] = []
  for (let index = fullText.indexOf(META_MARKER); index !== -1; index = fullText.indexOf(META_MARKER, index + 1)) {
    markerIndexes.push(index)
  }
  if (markerIndexes.length > 0) {
    // Segment text between consecutive markers; models occasionally repeat the
    // marker after the JSON (leaving an empty tail). Pick the first segment
    // that starts like JSON and parses, then fall back to the longest one.
    const segments = markerIndexes.map((index, position) => {
      const end = position + 1 < markerIndexes.length ? markerIndexes[position + 1] as number : fullText.length
      return { index, text: fullText.slice(index + META_MARKER.length, end).trim() }
    })
    const parsable = segments.find(segment => {
      if (!segment.text.startsWith('{')) return false
      try { JSON.parse(segment.text); return true } catch { return false }
    })
    const chosen = parsable
      ?? segments.reduce((best, current) => current.text.length > best.text.length ? current : best, segments[0]!)
    return {
      body: fullText.slice(0, chosen.index).trimEnd(),
      metadataText: chosen.text,
      metadataStart: chosen.index,
    }
  }
  const trailing = findTrailingMetadata(fullText)
  if (trailing !== undefined) {
    return {
      body: fullText.slice(0, trailing.start).trimEnd(),
      metadataText: trailing.jsonText,
      metadataStart: trailing.start,
    }
  }
  return { body: fullText.trimEnd() }
}

/* ------------------------------------------------------------------ *
 * 元数据解析
 * ------------------------------------------------------------------ */

function parseEvidence(value: unknown): ParsedEvidenceMeta | undefined {
  if (!isRecord(value)) return undefined
  const derivationsRaw = value.derivations
  const derivations = Array.isArray(derivationsRaw)
    ? derivationsRaw.slice(0, 6).flatMap(item => {
      if (!isRecord(item)) return []
      const label = asString(item.label, 200)
      const premises = asStringArray(item.premises, 6, 80)
      const entry: { label?: string; premises?: readonly string[] } = {}
      if (label !== undefined) entry.label = label
      if (premises !== undefined) entry.premises = premises
      return [entry]
    })
    : undefined
  const evidence: ParsedEvidenceMeta = {
    usedMaterialRefs: asStringArray(value.usedMaterialRefs, 12, 40),
    usedCrossCourseRefs: asStringArray(value.usedCrossCourseRefs, 6, 40),
    usedWebRefs: asStringArray(value.usedWebRefs, 6, 40),
    usedModelKnowledge: asBoolean(value.usedModelKnowledge),
    derivations,
  }
  return evidence
}

function parseConflicts(value: unknown): ParsedConflict[] | undefined {
  if (!Array.isArray(value)) return undefined
  const conflicts: ParsedConflict[] = []
  for (const item of value.slice(0, 5)) {
    if (!isRecord(item)) continue
    const kindRaw = asString(item.kind, 40)
    const summary = asString(item.summary, 600)
    if (kindRaw === undefined || summary === undefined || !CONFLICT_KINDS.has(kindRaw)) continue
    conflicts.push({
      kind: kindRaw as ParsedConflict['kind'],
      summary,
      basisRefs: asStringArray(item.basisRefs, 6, 40),
    })
  }
  return conflicts.length === 0 ? undefined : conflicts
}

function parseNextActions(value: unknown): ParsedTurnMeta['nextActions'] {
  if (!Array.isArray(value)) return undefined
  const actions: { id: string; label: string }[] = []
  for (const item of value.slice(0, 4)) {
    if (!isRecord(item)) continue
    const id = asString(item.id, 60)
    const label = asString(item.label, 80)
    if (id !== undefined && label !== undefined) actions.push({ id, label })
  }
  return actions.length === 0 ? undefined : actions
}

function parseDiagnosis(value: unknown): ParsedTurnMeta['diagnosis'] {
  if (!isRecord(value)) return undefined
  const diagnosis = {
    misconception: asString(value.misconception, 400),
    evidence: asString(value.evidence, 400),
    nextStep: asString(value.nextStep, 400),
  }
  return diagnosis.misconception === undefined && diagnosis.evidence === undefined && diagnosis.nextStep === undefined
    ? undefined
    : diagnosis
}

/** 解析并清洗模型元数据对象；失败时返回 error 而不抛异常。 */
export function parseTurnMetaObject(value: unknown): { readonly meta?: ParsedTurnMeta; readonly error?: string } {
  if (!isRecord(value)) return { error: '元数据不是 JSON 对象' }
  const meta: {
    intent?: ParsedTurnMeta['intent']
    stage?: ParsedTurnMeta['stage']
    conceptIds?: readonly string[]
    requestedForm?: string
    nextActions?: ParsedTurnMeta['nextActions']
    uncertainty?: readonly string[]
    evidence?: ParsedEvidenceMeta
    conflicts?: readonly ParsedConflict[]
    activity?: unknown
    diagnosis?: ParsedTurnMeta['diagnosis']
  } = {}

  const intent = asString(value.intent, 40)
  if (intent !== undefined && INTENTS.has(intent)) meta.intent = intent as ParsedTurnMeta['intent']
  const stage = asString(value.stage, 40)
  if (stage !== undefined && STAGES.has(stage)) meta.stage = stage as ParsedTurnMeta['stage']
  const conceptIds = asStringArray(value.conceptIds, 8, 80)
  if (conceptIds !== undefined) meta.conceptIds = conceptIds
  const requestedForm = asString(value.requestedForm, 80)
  if (requestedForm !== undefined) meta.requestedForm = requestedForm
  const nextActions = parseNextActions(value.nextActions)
  if (nextActions !== undefined) meta.nextActions = nextActions
  const uncertainty = asStringArray(value.uncertainty, 8, 500)
  if (uncertainty !== undefined) meta.uncertainty = uncertainty
  const evidence = parseEvidence(value.evidence)
  if (evidence !== undefined) meta.evidence = evidence
  const conflicts = parseConflicts(value.conflicts)
  if (conflicts !== undefined) meta.conflicts = conflicts
  if (value.activity !== undefined) meta.activity = value.activity
  const diagnosis = parseDiagnosis(value.diagnosis)
  if (diagnosis !== undefined) meta.diagnosis = diagnosis

  if (Object.keys(meta).length === 0) return { error: '元数据为空或字段全部无法识别' }
  return { meta }
}

/** 解析元数据文本；先按 JSON 直接解析，再尝试从文本中截取 JSON。 */
export function parseTurnMetaText(text: string): { readonly meta?: ParsedTurnMeta; readonly error?: string } {
  const direct = tryParseJson(text)
  if (direct.ok) return parseTurnMetaObject(direct.value)
  const extracted = extractJsonCandidate(text)
  if (extracted === undefined) return { error: `元数据不是合法 JSON：${direct.error}` }
  const retried = tryParseJson(extracted)
  if (!retried.ok) return { error: `元数据不是合法 JSON：${retried.error}` }
  return parseTurnMetaObject(retried.value)
}

function tryParseJson(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
  }
}

/** 从可能带解释文字的元数据文本中截取第一个平衡的大括号对象。 */
function extractJsonCandidate(text: string): string | undefined {
  const start = text.indexOf('{')
  if (start === -1) return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (char === undefined) break
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') { inString = true; continue }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return undefined
}

/* ------------------------------------------------------------------ *
 * 证据回填
 * ------------------------------------------------------------------ */

/** 证据回填上下文：只允许引用 Host 传入的真实资料/外部结果。 */
export interface EvidenceBuildContext {
  readonly input: TeachingTurnInput
  readonly materialRefs: readonly MaterialRefView[]
  readonly crossCourseRefs: readonly CrossCourseRefView[]
  readonly webRefs: readonly WebRefView[]
  readonly now: string
}

function evidenceKey(ref: EvidenceReference): string {
  if (ref.anchor !== undefined) return `${ref.kind}:${ref.anchor.documentId}:${ref.anchor.revisionId}:${ref.anchor.unitId}`
  if (ref.url !== undefined) return `${ref.kind}:${ref.url}`
  return `${ref.kind}:${ref.label ?? ''}:${ref.note ?? ''}`
}

/** 把模型声明的编号回填为真实 EvidenceReference；不存在的编号被忽略并告警。 */
export function buildEvidenceReferences(
  meta: ParsedTurnMeta | undefined,
  ctx: EvidenceBuildContext,
): { readonly refs: EvidenceReference[]; readonly warnings: string[] } {
  const refs: EvidenceReference[] = []
  const warnings: string[] = []
  const materialById = new Map(ctx.materialRefs.map(ref => [ref.refId, ref]))
  const crossById = new Map(ctx.crossCourseRefs.map(ref => [ref.refId, ref]))
  const webById = new Map(ctx.webRefs.map(ref => [ref.refId, ref]))

  for (const refId of meta?.evidence?.usedMaterialRefs ?? []) {
    const ref = materialById.get(refId)
    if (ref === undefined) {
      warnings.push(`模型引用了不存在的课程资料编号 ${refId}，已忽略（不伪造来源）。`)
      continue
    }
    refs.push({
      kind: 'course-source',
      anchor: ref.anchor,
      label: `${ref.documentTitle} · ${ref.label}（${ref.locator}）`,
      confidence: ref.anchor.confidence,
    })
  }

  for (const refId of meta?.evidence?.usedCrossCourseRefs ?? []) {
    const ref = crossById.get(refId)
    if (ref === undefined) {
      warnings.push(`模型引用了不存在的跨课程编号 ${refId}，已忽略。`)
      continue
    }
    const anchor = ref.anchors[0]
    refs.push({
      kind: 'other-course',
      courseTitle: ref.courseTitle,
      label: `其他课程《${ref.courseTitle}》 · ${ref.reason}`,
      note: ref.reason,
      confidence: 'unknown',
      ...(anchor === undefined ? {} : { anchor }),
    })
  }

  for (const refId of meta?.evidence?.usedWebRefs ?? []) {
    const ref = webById.get(refId)
    if (ref === undefined) {
      warnings.push(`模型引用了不存在的外部检索编号 ${refId}，已忽略（不伪造来源）。`)
      continue
    }
    refs.push({
      kind: 'external-web',
      url: ref.url,
      label: ref.title,
      accessedAt: ctx.now,
      confidence: 'unknown',
      note: '外部网页，内容未经课程资料核对',
    })
  }

  const labelOf = (refId: string): string => {
    const material = materialById.get(refId)
    if (material !== undefined) return `${material.documentTitle} · ${material.label}`
    const cross = crossById.get(refId)
    if (cross !== undefined) return `其他课程《${cross.courseTitle}》`
    const web = webById.get(refId)
    if (web !== undefined) return web.title
    return refId
  }
  for (const derivation of meta?.evidence?.derivations ?? []) {
    const premises = (derivation.premises ?? []).map(labelOf)
    refs.push({
      kind: 'derivation',
      label: derivation.label ?? '推导',
      ...(premises.length === 0 ? {} : { premises }),
      confidence: 'unknown',
    })
  }

  const usedSourceKinds = new Set(refs.map(ref => ref.kind))
  const usedCourseMaterial = usedSourceKinds.has('course-source')
    || usedSourceKinds.has('other-course')
    || usedSourceKinds.has('external-web')
  if (meta?.evidence?.usedModelKnowledge === true || !usedCourseMaterial) {
    refs.push({
      kind: 'model-knowledge',
      label: '模型知识补充',
      confidence: 'unknown',
      note: ctx.materialRefs.length === 0
        ? '本轮没有可用的课程资料，内容来自模型知识，请对照课程要求核对。'
        : '本轮正文包含课程资料之外的模型知识，已单独标注。',
    })
  }
  if (meta?.evidence === undefined) {
    warnings.push('模型未声明资料使用情况，本轮未记录具体来源引用；如正文提到资料，请对照原文核对。')
  }

  const seen = new Set<string>()
  const unique = refs.filter(ref => {
    const key = evidenceKey(ref)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { refs: unique, warnings }
}

/* ------------------------------------------------------------------ *
 * 活动提案归一化
 * ------------------------------------------------------------------ */

/** 活动归一化上下文。 */
export interface ActivityNormalizeContext {
  readonly input: TeachingTurnInput
  readonly plan: TeachingPlan
  readonly evidenceRefs: readonly EvidenceReference[]
  readonly independent: boolean
  readonly conceptIds: readonly ConceptId[]
}

const KIND_BY_PAYLOAD: Readonly<Record<string, ActivityKind>> = {
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
  visual: 'visual',
}

const KIND_TITLES: Readonly<Record<string, string>> = {
  explanation: '讲解卡',
  'static-figure': '示意图',
  'interactive-graph': '交互图示',
  animation: '动画演示',
  derivation: '推导步骤',
  'code-run': '代码实验',
  quiz: '小测',
  'reading-task': '阅读任务',
  'proof-task': '证明练习',
  'open-question': '开放问题',
  'experiment-note': '实验记录',
  visual: '可视化讲解',
}

const PLOT_COLORS = new Set<PlotColor>(['blue', 'orange', 'green', 'purple', 'red', 'gray'])

/* 可视化活动（visual）的归一化边界：自包含、可沙箱渲染、尺寸有界。 */
const VISUAL_RENDERERS = new Set<VisualRenderer>(['svg', 'html', 'mermaid'])
const VISUAL_TYPES = new Set<VisualType>([
  'diagram', 'flow', 'timeline', 'tree', 'map', 'chart', 'animation', 'interactive', 'other',
])
const VISUAL_SOURCE_MAX = 200_000
const VISUAL_HEIGHT_MIN = 120
const VISUAL_HEIGHT_MAX = 2000
const VISUAL_CONDITIONS_MAX = 8
const VISUAL_CONDITION_CHARS = 300
/** 完整 HTML 文档（不是可嵌入片段）。 */
const FULL_HTML_PATTERN = /^\s*(?:<!doctype\s+html|<html[\s>])/i
/** 外部资源引用（CDN/字体/脚本/图片/网络）；自包含视觉不允许。 */
const EXTERNAL_RESOURCE_PATTERN = /(?:\bsrc|\bhref|\burl)\s*[=:(]\s*['"]?\s*(?:https?:)?\/\//i
const SCRIPT_SRC_PATTERN = /<script[^>]*\bsrc\s*=/i
const EXTERNAL_ONLY_PATTERN = /^\s*https?:\/\/\S+\s*$/i

function buildRubric(value: unknown): RubricCriterion[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const criteria: RubricCriterion[] = []
  for (const item of value.slice(0, 8)) {
    if (!isRecord(item)) return undefined
    const id = asString(item.id, 80)
    const label = asString(item.label, 120)
    if (id === undefined || label === undefined) return undefined
    const weight = asFiniteNumber(item.weight)
    const criterion: RubricCriterion = {
      id,
      label,
      weight: weight === undefined || weight <= 0 ? 1 : weight,
      ...(asString(item.description, 300) === undefined ? {} : { description: asString(item.description, 300) }),
      ...(asString(item.observable, 300) === undefined ? {} : { observable: asString(item.observable, 300) }),
    }
    criteria.push(criterion)
  }
  return criteria
}

function buildQuizPayload(payload: Record<string, unknown>): QuizPayload | string {
  const question = asString(payload.question, 1000)
  if (question === undefined) return 'quiz 缺少 question'
  if (!Array.isArray(payload.options)) return 'quiz 缺少 options'
  const options: { id: string; label: string }[] = []
  for (const item of payload.options.slice(0, 10)) {
    if (!isRecord(item)) return 'quiz options 项必须是对象'
    const id = asString(item.id, 40)
    const label = asString(item.label, 300)
    if (id === undefined || label === undefined) return 'quiz options 需要 id 与 label'
    options.push({ id, label })
  }
  if (options.length < 2) return 'quiz 至少需要两个选项'
  const correctOptionIds = asStringArray(payload.correctOptionIds, 10, 40)
  if (correctOptionIds === undefined || correctOptionIds.length === 0) return 'quiz 缺少 correctOptionIds'
  const optionIds = new Set(options.map(option => option.id))
  if (!correctOptionIds.every(id => optionIds.has(id))) return 'quiz correctOptionIds 必须是 options 子集'
  const result: QuizPayload = {
    type: 'quiz',
    question,
    options,
    correctOptionIds,
    ...(asBoolean(payload.multiple) === undefined ? {} : { multiple: asBoolean(payload.multiple) }),
    ...(asString(payload.explanation, 2000) === undefined ? {} : { explanation: asString(payload.explanation, 2000) }),
    ...(asString(payload.hint, 500) === undefined ? {} : { hint: asString(payload.hint, 500) }),
    ...(asString(payload.markdown, 2000) === undefined ? {} : { markdown: asString(payload.markdown, 2000) }),
  }
  return result
}

function buildGraphPayload(payload: Record<string, unknown>): GraphPayload | string {
  const xRange = asNumberPair(payload.xRange)
  const yRange = asNumberPair(payload.yRange)
  if (xRange === undefined || yRange === undefined) return 'graph 需要 xRange/yRange 两个数字'
  if (!Array.isArray(payload.series) || payload.series.length === 0) return 'graph 需要 series'
  const series: PlotSeries[] = []
  for (const item of payload.series.slice(0, 8)) {
    if (!isRecord(item)) return 'graph series 项必须是对象'
    const id = asString(item.id, 60)
    const label = asString(item.label, 120)
    const expr = asString(item.expr, 300)
    if (id === undefined || label === undefined || expr === undefined) return 'graph series 需要 id/label/expr'
    const color = asString(item.color, 20)
    series.push({
      id,
      label,
      expr,
      ...(color !== undefined && PLOT_COLORS.has(color as PlotColor) ? { color: color as PlotColor } : {}),
      ...(asBoolean(item.dashed) === undefined ? {} : { dashed: asBoolean(item.dashed) }),
    })
  }
  const params: PlotParam[] = []
  if (Array.isArray(payload.params)) {
    for (const item of payload.params.slice(0, 6)) {
      if (!isRecord(item)) continue
      const name = asString(item.name, 60)
      const label = asString(item.label, 120)
      const min = asFiniteNumber(item.min)
      const max = asFiniteNumber(item.max)
      const step = asFiniteNumber(item.step)
      const value = asFiniteNumber(item.value)
      if (name === undefined || label === undefined || min === undefined || max === undefined
        || step === undefined || value === undefined) continue
      params.push({ name, label, min, max, step, value, ...(asString(item.unit, 20) === undefined ? {} : { unit: asString(item.unit, 20) }) })
    }
  }
  const markers = Array.isArray(payload.markers)
    ? payload.markers.slice(0, 8).flatMap(item => {
      if (!isRecord(item)) return []
      const x = asFiniteNumber(item.x)
      const y = asFiniteNumber(item.y)
      if (x === undefined || y === undefined) return []
      return [{ x, y, ...(asString(item.label, 80) === undefined ? {} : { label: asString(item.label, 80) }) }]
    })
    : undefined
  const animationRaw = payload.animation
  let animation: GraphPayload['animation']
  if (isRecord(animationRaw)) {
    const param = asString(animationRaw.param, 60)
    const from = asFiniteNumber(animationRaw.from)
    const to = asFiniteNumber(animationRaw.to)
    const durationMs = asFiniteNumber(animationRaw.durationMs)
    if (param !== undefined && from !== undefined && to !== undefined && durationMs !== undefined && durationMs > 0) {
      animation = { param, from, to, durationMs, ...(asBoolean(animationRaw.loop) === undefined ? {} : { loop: asBoolean(animationRaw.loop) }) }
    }
  }
  return {
    type: 'graph',
    xRange,
    yRange,
    series,
    ...(params.length === 0 ? {} : { params }),
    ...(markers === undefined || markers.length === 0 ? {} : { markers }),
    ...(animation === undefined ? {} : { animation }),
    ...(asString(payload.title, 120) === undefined ? {} : { title: asString(payload.title, 120) }),
    ...(asString(payload.xLabel, 80) === undefined ? {} : { xLabel: asString(payload.xLabel, 80) }),
    ...(asString(payload.yLabel, 80) === undefined ? {} : { yLabel: asString(payload.yLabel, 80) }),
    ...(asString(payload.hint, 300) === undefined ? {} : { hint: asString(payload.hint, 300) }),
  }
}

function buildFigurePayload(payload: Record<string, unknown>): FigurePayload | string {
  const variant = asString(payload.variant, 40)
  const allowed = new Set(['bar-chart', 'scatter', 'concept-map', 'flow', 'table'])
  if (variant === undefined || !allowed.has(variant)) return 'figure variant 不合法'
  const data = Array.isArray(payload.data)
    ? payload.data.slice(0, 20).flatMap(item => {
      if (!isRecord(item)) return []
      const label = asString(item.label, 120)
      const y = asFiniteNumber(item.y)
      if (label === undefined || y === undefined) return []
      return [{
        label, y,
        ...(asFiniteNumber(item.x) === undefined ? {} : { x: asFiniteNumber(item.x) }),
        ...(asString(item.group, 80) === undefined ? {} : { group: asString(item.group, 80) }),
      }]
    })
    : undefined
  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.slice(0, 20).flatMap(item => {
      if (!isRecord(item)) return []
      const id = asString(item.id, 60)
      const label = asString(item.label, 120)
      if (id === undefined || label === undefined) return []
      return [{ id, label, ...(asString(item.detail, 300) === undefined ? {} : { detail: asString(item.detail, 300) }) }]
    })
    : undefined
  const edges = Array.isArray(payload.edges)
    ? payload.edges.slice(0, 30).flatMap(item => {
      if (!isRecord(item)) return []
      const from = asString(item.from, 60)
      const to = asString(item.to, 60)
      if (from === undefined || to === undefined) return []
      return [{ from, to, ...(asString(item.label, 80) === undefined ? {} : { label: asString(item.label, 80) }) }]
    })
    : undefined
  return {
    type: 'figure',
    variant: variant as FigurePayload['variant'],
    ...(data === undefined || data.length === 0 ? {} : { data }),
    ...(nodes === undefined || nodes.length === 0 ? {} : { nodes }),
    ...(edges === undefined || edges.length === 0 ? {} : { edges }),
    ...(asString(payload.title, 120) === undefined ? {} : { title: asString(payload.title, 120) }),
    ...(asString(payload.caption, 300) === undefined ? {} : { caption: asString(payload.caption, 300) }),
    ...(asString(payload.alt, 300) === undefined ? {} : { alt: asString(payload.alt, 300) }),
  }
}

function buildDerivationPayload(payload: Record<string, unknown>): DerivationPayload | string {
  if (!Array.isArray(payload.steps) || payload.steps.length === 0) return 'derivation 需要 steps'
  const steps: DerivationStep[] = []
  for (const item of payload.steps.slice(0, 12)) {
    if (!isRecord(item)) return 'derivation steps 项必须是对象'
    const id = asString(item.id, 60)
    const latex = asString(item.latex, 600)
    if (id === undefined || latex === undefined) return 'derivation step 需要 id/latex'
    steps.push({
      id,
      latex,
      ...(asString(item.note, 300) === undefined ? {} : { note: asString(item.note, 300) }),
      ...(asStringArray(item.dependsOn, 6, 60) === undefined ? {} : { dependsOn: asStringArray(item.dependsOn, 6, 60) }),
    })
  }
  return {
    type: 'derivation',
    steps,
    ...(asString(payload.title, 120) === undefined ? {} : { title: asString(payload.title, 120) }),
    ...(asString(payload.claim, 600) === undefined ? {} : { claim: asString(payload.claim, 600) }),
    ...(asString(payload.conclusion, 600) === undefined ? {} : { conclusion: asString(payload.conclusion, 600) }),
  }
}

function buildCodeTests(value: unknown): CodeTest[] | undefined {
  if (!Array.isArray(value)) return undefined
  const tests: CodeTest[] = []
  for (const item of value.slice(0, 6)) {
    if (!isRecord(item)) continue
    const name = asString(item.name, 120)
    const type = asString(item.type, 40)
    if (name === undefined || type === undefined) continue
    if (type === 'exit-code') {
      const code = asFiniteNumber(item.value)
      if (code !== undefined) tests.push({ name, type, value: code })
    } else if (type === 'stdout-contains' || type === 'stdout-equals') {
      const text = asString(item.value, 1000)
      if (text !== undefined) tests.push({ name, type, value: text })
    }
  }
  return tests.length === 0 ? undefined : tests
}

function buildCodeRunPayload(payload: Record<string, unknown>): CodeRunPayload | string {
  const language = asString(payload.language, 40)
  const code = typeof payload.code === 'string' ? payload.code : undefined
  if (language === undefined) return 'code-run 缺少 language'
  if (code === undefined) return 'code-run 缺少 code'
  return {
    type: 'code-run',
    language,
    code,
    editable: asBoolean(payload.editable) ?? true,
    ...(asString(payload.dialect, 40) === undefined ? {} : { dialect: asString(payload.dialect, 40) }),
    ...(asString(payload.title, 120) === undefined ? {} : { title: asString(payload.title, 120) }),
    ...(asString(payload.starterCode, 4000) === undefined ? {} : { starterCode: asString(payload.starterCode, 4000) }),
    ...(asString(payload.instructions, 1000) === undefined ? {} : { instructions: asString(payload.instructions, 1000) }),
    ...(typeof payload.stdin === 'string' ? { stdin: payload.stdin } : {}),
    ...(buildCodeTests(payload.tests) === undefined ? {} : { tests: buildCodeTests(payload.tests) }),
    ...(asStringArray(payload.requires, 6, 80) === undefined ? {} : { requires: asStringArray(payload.requires, 6, 80) }),
  }
}

function buildProofPayload(payload: Record<string, unknown>): ProofTaskPayload | string {
  const claim = asString(payload.claim, 1000)
  if (claim === undefined) return 'proof-task 缺少 claim'
  const rubric = buildRubric(payload.rubric)
  if (rubric === undefined) return 'proof-task 需要非空 rubric'
  return {
    type: 'proof-task',
    claim,
    assumptions: asStringArray(payload.assumptions, 8, 300) ?? [],
    rubric,
    ...(asString(payload.hint, 500) === undefined ? {} : { hint: asString(payload.hint, 500) }),
    ...(asString(payload.reference, 1000) === undefined ? {} : { reference: asString(payload.reference, 1000) }),
  }
}

function buildOpenQuestionPayload(payload: Record<string, unknown>): OpenQuestionPayload | string {
  const prompt = asString(payload.prompt, 2000)
  if (prompt === undefined) return 'open-question 缺少 prompt'
  const rubric = buildRubric(payload.rubric)
  if (rubric === undefined) return 'open-question 需要非空 rubric'
  const expectedLanguage = asString(payload.expectedLanguage, 20)
  return {
    type: 'open-question',
    prompt,
    rubric,
    ...(asStringArray(payload.referencePoints, 8, 400) === undefined ? {} : { referencePoints: asStringArray(payload.referencePoints, 8, 400) }),
    ...(expectedLanguage === 'zh' || expectedLanguage === 'en' || expectedLanguage === 'bilingual'
      ? { expectedLanguage }
      : {}),
  }
}

function buildReadingPayload(payload: Record<string, unknown>, anchors: readonly SourceAnchor[]): ReadingTaskPayload | string {
  const instructions = asString(payload.instructions, 2000)
  if (instructions === undefined) return 'reading-task 缺少 instructions'
  if (anchors.length === 0) return 'reading-task 没有可定位的课程资料（anchors 为空）'
  const minMinutes = asFiniteNumber(payload.minMinutes)
  return {
    type: 'reading-task',
    instructions,
    anchors: anchors.slice(0, 5),
    questions: asStringArray(payload.questions, 6, 500) ?? [],
    ...(minMinutes === undefined ? {} : { minMinutes }),
  }
}

function buildExplanationPayload(payload: Record<string, unknown>): ExplanationPayload | string {
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : undefined
  if (markdown === undefined || markdown.trim() === '') return 'explanation 缺少 markdown'
  return {
    type: 'explanation',
    markdown,
    ...(asString(payload.title, 120) === undefined ? {} : { title: asString(payload.title, 120) }),
    ...(asStringArray(payload.keyPoints, 8, 300) === undefined ? {} : { keyPoints: asStringArray(payload.keyPoints, 8, 300) }),
    ...(asStringArray(payload.caveats, 8, 300) === undefined ? {} : { caveats: asStringArray(payload.caveats, 8, 300) }),
  }
}

function buildExperimentNotePayload(payload: Record<string, unknown>): ExperimentNotePayload | string {
  const title = asString(payload.title, 120)
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : undefined
  if (title === undefined || markdown === undefined || markdown.trim() === '') return 'experiment-note 需要 title/markdown'
  return {
    type: 'experiment-note',
    title,
    markdown,
    ...(asString(payload.runId, 120) === undefined ? {} : { runId: asString(payload.runId, 120) }),
    ...(asString(payload.environmentId, 120) === undefined ? {} : { environmentId: asString(payload.environmentId, 120) }),
    ...(asStringArray(payload.limitations, 6, 300) === undefined ? {} : { limitations: asStringArray(payload.limitations, 6, 300) }),
  }
}

/**
 * 校验并归一化可视化活动 payload。
 *
 * 安全/质量边界：只接受自包含片段（SVG/HTML fragment/Mermaid），拒绝完整 HTML
 * 文档、外部 CDN/字体/库/网络引用与纯外链；尺寸、条件数量与文本长度有界；
 * 未知字段忽略。不合格返回中文原因，由上层丢弃活动并写入 uncertainty。
 */
function buildVisualPayload(payload: Record<string, unknown>): VisualPayload | string {
  const rendererRaw = asString(payload.renderer, 20)
  if (rendererRaw === undefined) return 'visual 缺少 renderer（svg/html/mermaid）'
  if (!VISUAL_RENDERERS.has(rendererRaw as VisualRenderer)) {
    return `visual renderer「${rendererRaw}」不合法（只支持 svg/html/mermaid）`
  }
  const renderer = rendererRaw as VisualRenderer

  if (typeof payload.source !== 'string') return 'visual 缺少 source（自包含片段）'
  const source = payload.source.trim()
  if (source === '') return 'visual source 不能为空'
  if (source.length > VISUAL_SOURCE_MAX) {
    return `visual source 超过 ${VISUAL_SOURCE_MAX} 字符上限（请精简为教学所需的最小片段）`
  }
  if (EXTERNAL_ONLY_PATTERN.test(source)) {
    return 'visual source 不能是外部链接，必须是可沙箱渲染的自包含片段'
  }
  if (FULL_HTML_PATTERN.test(source) || /<\/html\s*>/i.test(source)) {
    return 'visual source 必须是自包含片段，不能是完整 HTML 文档（不要 doctype/html/head/body 外壳）'
  }
  if (SCRIPT_SRC_PATTERN.test(source) || EXTERNAL_RESOURCE_PATTERN.test(source)) {
    return 'visual source 不能引用外部 CDN/字体/库/网络资源；请内联为自包含片段'
  }

  const visualTypeRaw = asString(payload.visualType, 30)
  if (visualTypeRaw !== undefined && !VISUAL_TYPES.has(visualTypeRaw as VisualType)) {
    return `visual visualType「${visualTypeRaw}」不合法（可用：diagram/flow/timeline/tree/map/chart/animation/interactive/other）`
  }
  const title = asString(payload.title, 120)
  const caption = asString(payload.caption, 300) ?? title
  const observe = asString(payload.observe, 300)
  const formula = asString(payload.formula, 1000)
  const fallbackText = asString(payload.fallbackText, 1000)
  const alt = asString(payload.alt, 300) ?? title ?? caption ?? '教学可视化'
  const conditions = asStringArray(payload.conditions, VISUAL_CONDITIONS_MAX, VISUAL_CONDITION_CHARS)
  const heightRaw = asFiniteNumber(payload.height)
  const height = heightRaw === undefined
    ? undefined
    : Math.min(VISUAL_HEIGHT_MAX, Math.max(VISUAL_HEIGHT_MIN, Math.round(heightRaw)))
  // HTML 片段若包含脚本则默认按交互处理（沙箱策略不同）；显式 interactive 优先。
  const interactive = asBoolean(payload.interactive)
    ?? (renderer === 'html' && /<script[\s>]/i.test(source))

  return {
    type: 'visual',
    renderer,
    source,
    ...(title === undefined ? {} : { title }),
    ...(visualTypeRaw === undefined ? {} : { visualType: visualTypeRaw as VisualType }),
    ...(caption === undefined ? {} : { caption }),
    ...(observe === undefined ? {} : { observe }),
    ...(formula === undefined ? {} : { formula }),
    ...(conditions === undefined ? {} : { conditions }),
    interactive,
    ...(height === undefined ? {} : { height }),
    ...(fallbackText === undefined ? {} : { fallbackText }),
    alt,
  }
}

function verificationFor(kind: ActivityProposal['kind']): ActivityVerification {
  switch (kind) {
    case 'quiz':
      return { kind: 'objective', note: '选择题按预设正确答案核验' }
    case 'code-run':
      return { kind: 'objective', note: '按代码运行结果与测试核验' }
    case 'proof-task':
      return { kind: 'rubric', note: '按 rubric 评价，局限会记录并允许学生异议' }
    case 'open-question':
      return { kind: 'open', note: '按 rubric 评价，保留判断依据与局限' }
    case 'visual':
      return { kind: 'none', note: '可视化用于建立直觉/展示结构，不单独作为掌握证据' }
    default:
      return { kind: 'none', note: '探索/展示型活动，不单独作为掌握证据' }
  }
}

/** 校验并归一化活动提案；不合格时返回 warnings 而不是编造活动。 */
export function normalizeActivityProposal(
  raw: unknown,
  ctx: ActivityNormalizeContext,
): { readonly proposal?: ActivityProposal; readonly warnings: readonly string[] } {
  if (raw === undefined || raw === null) return { warnings: [] }
  if (!isRecord(raw)) return { warnings: ['活动提案不是 JSON 对象，已忽略。'] }
  // Some models emit the payload fields directly on the activity object
  // ({"type":"quiz","question":...}) instead of nesting them under payload.
  const flatType = asString(raw.type, 40)
  const payloadRaw = isRecord(raw.payload)
    ? raw.payload
    : (flatType === undefined ? undefined : raw)
  if (!isRecord(payloadRaw)) return { warnings: ['活动提案缺少 payload，已忽略。'] }
  const payloadType = asString(payloadRaw.type, 40)
  if (payloadType === undefined) return { warnings: ['活动 payload 缺少 type，已忽略。'] }
  const mappedKind = KIND_BY_PAYLOAD[payloadType]
  if (mappedKind === undefined) return { warnings: [`未知活动 payload 类型「${payloadType}」，已忽略。`] }

  const warnings: string[] = []
  const rawKind = asString(raw.kind, 40)
  let kind: ActivityKind = mappedKind
  if (rawKind !== undefined && rawKind !== mappedKind) {
    if (rawKind === 'animation' && payloadType === 'graph' && isRecord(payloadRaw.animation)) kind = 'animation'
    else warnings.push(`活动 kind「${rawKind}」与 payload.type「${payloadType}」不一致，已按 payload 修正为「${mappedKind}」。`)
  }
  if (!activityKindCompatible(ctx.plan, ctx.input.stage, kind)) {
    return { warnings: [`活动类型「${kind}」与本轮任务形态/阶段不匹配，未创建（活动需服务于学习目标）。`] }
  }

  const sourceRefs = collectSourceRefs(ctx)
  let payload: ActivityPayload
  switch (payloadType) {
    case 'quiz': {
      const built = buildQuizPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'graph': {
      const built = buildGraphPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'figure': {
      const built = buildFigurePayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'derivation': {
      const built = buildDerivationPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'code-run': {
      const built = buildCodeRunPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'proof-task': {
      const built = buildProofPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'open-question': {
      const built = buildOpenQuestionPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'reading-task': {
      const built = buildReadingPayload(payloadRaw, sourceRefs)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'explanation': {
      const built = buildExplanationPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'experiment-note': {
      const built = buildExperimentNotePayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    case 'visual': {
      const built = buildVisualPayload(payloadRaw)
      if (typeof built === 'string') return { warnings: [`活动 payload 不合法：${built}`] }
      payload = built
      break
    }
    default:
      return { warnings: [`未知活动 payload 类型「${payloadType}」，已忽略。`] }
  }

  const conceptIds = asStringArray(raw.conceptIds, 8, 80) ?? []
  const allowed = new Set(ctx.conceptIds.map(id => id as string))
  const filteredConceptIds = conceptIds.filter(id => allowed.has(id)) as ConceptId[]
  const currentConceptId = ctx.input.currentConceptId
  const finalConceptIds = filteredConceptIds.length > 0
    ? filteredConceptIds
    : currentConceptId === undefined ? [] : [currentConceptId]
  const title = asString(raw.title, 120) ?? KIND_TITLES[kind] ?? '教学活动'
  const goal = asString(raw.goal, 300)
    ?? (currentConceptId === undefined
      ? (ctx.input.courseRevision.goals[0] ?? '练习当前概念')
      : `练习「${title}」`)
  return {
    proposal: {
      kind,
      title,
      goal,
      payload,
      verification: verificationFor(kind),
      sourceRefs,
      conceptIds: finalConceptIds,
      independent: ctx.independent && asBoolean(raw.independent) !== false,
    },
    warnings,
  }
}

/** 活动的真实来源：优先本轮已回填证据的 anchor，其次当前概念自带的 anchor。 */
function collectSourceRefs(ctx: ActivityNormalizeContext): SourceAnchor[] {
  const anchors: SourceAnchor[] = []
  const seen = new Set<string>()
  const push = (anchor: SourceAnchor): void => {
    const key = `${anchor.documentId}:${anchor.revisionId}:${anchor.unitId}`
    if (seen.has(key)) return
    seen.add(key)
    anchors.push(anchor)
  }
  for (const ref of ctx.evidenceRefs) {
    if (ref.anchor !== undefined && (ref.kind === 'course-source' || ref.kind === 'other-course')) push(ref.anchor)
  }
  const concept = ctx.input.currentConceptId === undefined
    ? undefined
    : ctx.input.courseRevision.concepts.find(item => item.id === ctx.input.currentConceptId)
  for (const anchor of concept?.sourceAnchors ?? []) push(anchor)
  if (anchors.length === 0) {
    for (const item of ctx.input.material) push(item.anchor)
  }
  return anchors.slice(0, 5)
}

/* ------------------------------------------------------------------ *
 * 错误映射
 * ------------------------------------------------------------------ */

const APP_ERROR_CODES = new Set<AppErrorCode>([
  'invalid-input', 'not-found', 'conflict', 'capability-missing', 'needs-confirmation',
  'cancelled', 'failed', 'unverified', 'limit-exceeded', 'storage', 'stale-revision',
  'network', 'uncertain',
])

/** 把模型适配器返回的错误码映射为 AppError；不无限重试，只标注是否可手动重试。 */
export function modelErrorToAppError(code: string | undefined, message: string | undefined): AppError {
  const rawCode = code ?? ''
  const rawMessage = message ?? ''
  if (/cancel|abort/i.test(rawCode) || /已取消|aborted/i.test(rawMessage)) {
    return { code: 'cancelled', message: '本轮教学已取消', cause: rawCode, retryable: false }
  }
  if (APP_ERROR_CODES.has(rawCode as AppErrorCode)) {
    const appCode = rawCode as AppErrorCode
    return {
      code: appCode,
      message: rawMessage === '' ? defaultErrorMessage(appCode) : rawMessage,
      cause: rawCode,
      retryable: appCode === 'network' || appCode === 'failed',
    }
  }
  if (/network|fetch|ECONN|ENOTFOUND|ETIMEDOUT|timeout|socket|offline|dns/i.test(`${rawCode} ${rawMessage}`)) {
    return {
      code: 'network',
      message: rawMessage === '' ? '模型调用网络失败，请检查网络或稍后重试' : rawMessage,
      cause: rawCode,
      retryable: true,
    }
  }
  return {
    code: 'failed',
    message: rawMessage === '' ? '模型调用失败，请重试或检查模型配置' : rawMessage,
    cause: rawCode === '' ? 'model-error' : rawCode,
    retryable: false,
  }
}

function defaultErrorMessage(code: AppErrorCode): string {
  switch (code) {
    case 'cancelled': return '本轮教学已取消'
    case 'network': return '模型调用网络失败，请检查网络或稍后重试'
    case 'limit-exceeded': return '模型调用超出限制，请缩短问题后重试'
    case 'capability-missing': return '当前模型缺少完成本轮教学所需的能力'
    default: return '模型调用失败，请重试或检查模型配置'
  }
}

/** 去重并保序，用于 uncertainty / limitations 合并。 */
export function dedupeStrings(items: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.trim()
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}
