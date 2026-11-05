/**
 * Build the standalone offline HTML page for one course export.
 *
 * Rendering reuses the real activity renderers through `mountActivity` (with an
 * injected shim `Document`), so the exported page shows exactly what the Harness
 * workspace shows for every declarative activity. The page is then serialized
 * into a single HTML file with:
 * - inline KaTeX layout CSS (font-face rules stripped: no font fetches);
 * - inline Markdown/HTML/SVG produced by the renderers;
 * - an inline interaction runtime (`runtime.ts`) so graphs, derivations, quizzes
 *   and answer tasks keep their browser-side behaviour without the Host;
 * - a visible offline notice and the known limitations.
 *
 * Model-authored prose goes through the safe Markdown renderer; no model HTML
 * is inserted. Links from Markdown stay ordinary `<a href>` user actions, never
 * page resources — the page itself makes no network request.
 */
import type {
  ActivityPayload, ActivityState, DerivationPayload, GraphPayload, LessonActivity, QuizPayload,
} from '../../contracts/activity.ts'
import type { Course, CourseRevision } from '../../contracts/course.ts'
import type { ExperimentRun } from '../../contracts/experiment.ts'
import type { CourseLearningRecord, MasteryRecord } from '../../contracts/learning.ts'
import type { ChatMessage, EvidenceReference, TeachingSession } from '../../contracts/session.ts'
import {
  appendMarkdownBlocks, createElement, mountActivity, mountDerivation, parseMarkdown,
  validateActivityPayload,
} from '../../render/index.ts'
import { KATEX_CSS } from './katex-css.ts'
import {
  asOfflineDocument, asOfflineElement, createOfflineDocument, serializeChildren, serializeNode,
  type OfflineElement,
} from './dom.ts'
import { buildOfflineRuntimeScript } from './runtime.ts'

/** Limits that keep one page bounded; exceeding them truncates and warns. */
export const OFFLINE_LIMITS = {
  maxSessions: 100,
  maxMessagesPerSession: 300,
  maxActivitiesPerSession: 200,
  maxMessageChars: 20_000,
  maxRunOutputChars: 4_000,
  maxCodeChars: 100_000,
  maxEvidenceRefs: 20,
} as const

/** One session's data as loaded by the service. */
export interface PageSessionInput {
  readonly session: TeachingSession
  readonly messages: readonly ChatMessage[]
  readonly activities: readonly LessonActivity[]
  readonly activityStates: ReadonlyMap<string, ActivityState>
  readonly lastRunByActivity: ReadonlyMap<string, ExperimentRun>
}

/** Everything the page builder needs; the service loads it from repositories. */
export interface OfflinePageInput {
  readonly exportId: string
  readonly createdAt: string
  readonly pluginVersion: string
  readonly course: Course
  readonly revision?: CourseRevision
  readonly sessions: readonly PageSessionInput[]
  readonly learning?: CourseLearningRecord
  readonly sourceTitles: ReadonlyMap<string, string>
  readonly includeNotes: boolean
  readonly limitations: readonly string[]
  readonly nativeFiles: readonly string[]
}

/** One activity payload embedded for the inline runtime. */
export interface OfflineActivityEntry {
  readonly activityId: string
  readonly kind: string
  readonly payload: ActivityPayload
  readonly state?: {
    readonly params?: Readonly<Record<string, number>>
    readonly code?: string
    readonly revealedStepIds?: readonly string[]
  }
  readonly layout?: { readonly graph?: GraphLayout }
}

/** Plot geometry recovered from the rendered SVG so the runtime can redraw. */
export interface GraphLayout {
  readonly width: number
  readonly height: number
  readonly padLeft: number
  readonly padRight: number
  readonly padTop: number
  readonly padBottom: number
  readonly xFrom: number
  readonly xTo: number
  readonly yFrom: number
  readonly yTo: number
}

/** Result of building one page. */
export interface OfflinePageResult {
  readonly html: string
  readonly warnings: readonly string[]
  /** Entries embedded in `window.__TEACHING_OFFLINE_DATA__`. */
  readonly activities: readonly OfflineActivityEntry[]
  /** Page-local limitations (fixed notes + dynamic truncation warnings). */
  readonly limitations: readonly string[]
}

/** Evidence kind labels shown on exported chips. */
const EVIDENCE_KIND_LABELS: Readonly<Record<string, string>> = {
  'course-source': '课程资料',
  'other-course': '其他课程',
  'external-web': '外部网页',
  'model-knowledge': '模型补充',
  derivation: '推导',
  experiment: '实验',
}

/** Create one shim element (the renderers accept any Document). */
function el<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  options: import('../../render/dom.ts').ElementOptions = {},
): HTMLElementTagNameMap[K] {
  return createElement(document, tag, options)
}

function serialize(value: unknown): string {
  return serializeNode(value as OfflineElement)
}

function serializeInner(value: unknown): string {
  return serializeChildren(asOfflineElement(value))
}

/** Append a renderer-created node to a shim parent without DOM type friction. */
function appendShim(parent: unknown, child: unknown): void {
  asOfflineElement(parent).appendChild(asOfflineElement(child))
}

/** Serialize a value for an inline `<script>` payload (no `</script>` escape hatch). */
function inlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, '\\u003c')
    .replace(/>/gu, '\\u003e')
    .replace(/&/gu, '\\u0026')
}

/** Normalise a numeric range the same way the graph renderer does. */
function normaliseRange(range: readonly [number, number], fallbackFrom: number, fallbackTo: number): [number, number] {
  const from = Number(range[0])
  const to = Number(range[1])
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return [fallbackFrom, fallbackTo]
  return from < to ? [from, to] : [to, from]
}

/**
 * Recover the plot geometry from the SVG the graph renderer produced.
 *
 * The frame draws five vertical + five horizontal grid lines before the series
 * paths, so the padding is readable without duplicating renderer constants.
 */
export function graphLayoutOf(payload: GraphPayload, wrapper: HTMLElement): GraphLayout | undefined {
  const svg = asOfflineElement(wrapper).getElementsByTagName('svg')[0]
  if (svg === undefined) return undefined
  const viewBox = (svg.getAttribute('viewBox') ?? '').split(/\s+/u).map(Number)
  const width = viewBox[2]
  const height = viewBox[3]
  if (width === undefined || height === undefined || !Number.isFinite(width) || !Number.isFinite(height)) return undefined
  const lines = svg.getElementsByTagName('line')
  const firstVertical = lines[0]
  const firstHorizontal = lines[1]
  const lastVertical = lines[8]
  const lastHorizontal = lines[9]
  if (firstVertical === undefined || firstHorizontal === undefined
    || lastVertical === undefined || lastHorizontal === undefined) return undefined
  // drawFrame() emits, per grid index: a vertical line at x(index) then a
  // horizontal line at y(index), with index 0 = (xFrom, yFrom) and index 4 =
  // (xTo, yTo). So the first horizontal line sits at the bottom edge and the
  // last one at the top edge.
  const padLeft = Number(firstVertical.getAttribute('x1'))
  const padRight = width - Number(lastVertical.getAttribute('x1'))
  const padTop = Number(lastHorizontal.getAttribute('y1'))
  const padBottom = height - Number(firstHorizontal.getAttribute('y1'))
  if (![padLeft, padTop, padRight, padBottom].every(Number.isFinite)) return undefined
  const [xFrom, xTo] = normaliseRange(payload.xRange, -10, 10)
  const [yFrom, yTo] = normaliseRange(payload.yRange, -10, 10)
  return { width, height, padLeft, padRight, padTop, padBottom, xFrom, xTo, yFrom, yTo }
}

/** Render one Markdown source to safe inner HTML (KaTeX math included). */
function markdownHtml(document: Document, source: string): string {
  const container = el(document, 'div')
  appendMarkdownBlocks(container, document, parseMarkdown(source), { document })
  return serializeInner(container)
}

/** Truncate long model text with an explicit visible marker and warning. */
function truncateText(text: string, label: string, warnings: string[], limit = OFFLINE_LIMITS.maxMessageChars): string {
  if (text.length <= limit) return text
  warnings.push(`${label} 超过 ${limit} 字符，导出页已截断（完整内容保留在插件数据中）`)
  return `${text.slice(0, limit)}\n\n…（内容过长，导出时已截断）`
}

/** Build an evidence chip row (never a page resource; sources stay citations). */
function appendEvidenceRow(document: Document, parent: HTMLElement, refs: readonly EvidenceReference[]): void {
  if (refs.length === 0) return
  const row = el(document, 'div', { className: 'tp-evidence-row' })
  for (const ref of refs.slice(0, OFFLINE_LIMITS.maxEvidenceRefs)) {
    const label = ref.label ?? ref.url ?? EVIDENCE_KIND_LABELS[ref.kind] ?? ref.kind
    const titleParts = [
      EVIDENCE_KIND_LABELS[ref.kind] ?? ref.kind,
      ref.anchor?.excerpt,
      ref.note,
      ref.url,
      ref.courseTitle,
    ].filter((part): part is string => typeof part === 'string' && part !== '')
    row.appendChild(el(document, 'span', {
      className: `tp-evidence tp-evidence-${ref.kind}`,
      text: label,
      title: titleParts.join(' · '),
    }))
  }
  if (refs.length > OFFLINE_LIMITS.maxEvidenceRefs) {
    row.appendChild(el(document, 'span', {
      className: 'tp-evidence',
      text: `另有 ${refs.length - OFFLINE_LIMITS.maxEvidenceRefs} 条来源未展开`,
    }))
  }
  parent.appendChild(row)
}

/** Render every derivation step once so hidden steps can be revealed offline. */
function serializeDerivationStepContents(
  document: Document,
  payload: DerivationPayload,
): Map<string, string> {
  const holder = document.createElement('div')
  mountDerivation(holder, payload, {
    document,
    revealedStepIds: payload.steps.map((step) => step.id),
  })
  const items = asOfflineElement(holder).getElementsByClassName('teaching-derivation-step')
  const serialized = new Map<string, string>()
  for (const [index, item] of items.entries()) {
    const step = payload.steps[index]
    if (step === undefined) continue
    const node = item.children[0]
    if (node === undefined) continue
    serialized.set(step.id, serializeInner(node))
  }
  return serialized
}

/** Inject hidden step content into an initially-unrevealed derivation mount. */
function injectDerivationStepContents(
  document: Document,
  wrapper: HTMLElement,
  payload: DerivationPayload,
  serialized: ReadonlyMap<string, string>,
): void {
  const items = asOfflineElement(wrapper).getElementsByClassName('teaching-derivation-step')
  for (const [index, item] of items.entries()) {
    const step = payload.steps[index]
    if (step === undefined || item.getAttribute('data-revealed') === 'true') continue
    const content = serialized.get(step.id)
    if (content === undefined) continue
    const holder = document.createElement('div')
    holder.className = 'teaching-offline-step-content'
    holder.style.display = 'none'
    asOfflineElement(holder).innerHTML = content
    item.appendChild(asOfflineElement(holder))
  }
}

/** Pre-render quiz explanation + hint so the runtime only toggles visibility. */
function injectQuizContent(document: Document, wrapper: HTMLElement, payload: QuizPayload): void {
  const shim = asOfflineElement(wrapper)
  if (payload.explanation !== undefined) {
    const explanation = shim.getElementsByClassName('teaching-quiz-explanation')[0]
    if (explanation !== undefined) {
      explanation.innerHTML = markdownHtml(document, payload.explanation)
      explanation.style.display = 'none'
    }
  }
  const hintBox = shim.getElementsByClassName('teaching-quiz-hint')[0]
  if (hintBox !== undefined && payload.hint !== undefined) {
    hintBox.textContent = `提示：${payload.hint}`
    hintBox.style.display = 'none'
  }
}

/** Pre-render proof/open hint + reference answer for offline reveal. */
function injectAnswerTaskContent(document: Document, wrapper: HTMLElement, payload: ActivityPayload): void {
  const shim = asOfflineElement(wrapper)
  const hintBox = shim.getElementsByClassName('teaching-hint')[0]
  if (hintBox !== undefined) hintBox.style.display = 'none'
  const hint = 'hint' in payload && typeof payload.hint === 'string' ? payload.hint : undefined
  if (hintBox !== undefined && hint !== undefined) hintBox.textContent = `提示：${hint}`
  const referenceBox = shim.getElementsByClassName('teaching-reference')[0]
  if (referenceBox === undefined) return
  let html = ''
  if (payload.type === 'proof-task' && payload.reference !== undefined) {
    html = markdownHtml(document, `**参考答案：** ${payload.reference}`)
  } else if (payload.type === 'open-question' && (payload.referencePoints ?? []).length > 0) {
    const holder = document.createElement('div')
    holder.appendChild(el(document, 'div', {
      text: '参考要点：',
      styles: { fontWeight: '600', fontSize: '12px', marginTop: '4px' },
    }))
    const list = el(document, 'ul', { styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px' } })
    for (const point of payload.referencePoints ?? []) {
      list.appendChild(el(document, 'li', { text: point }))
    }
    holder.appendChild(list)
    html = serializeInner(holder)
  }
  if (html === '') return
  referenceBox.innerHTML = html
  referenceBox.style.display = 'none'
}

/** Show the recorded last run of a code activity (read-only facts). */
function appendLastRunFacts(document: Document, wrapper: HTMLElement, run: ExperimentRun): void {
  const holder = el(document, 'details', { className: 'tp-run-facts' })
  holder.appendChild(el(document, 'summary', { text: `上次运行结果（${run.endedAt ?? run.startedAt}）` }))
  const parts: string[] = [`状态：${run.status}`]
  if (run.exitCode !== undefined) parts.push(`退出码 ${String(run.exitCode)}`)
  if (run.durationMs !== undefined) parts.push(`${run.durationMs}ms`)
  holder.appendChild(el(document, 'div', { text: parts.join(' · ') }))
  if (run.stdout !== '') {
    holder.appendChild(el(document, 'pre', {
      className: 'tp-run-stdout',
      text: run.stdout.length > OFFLINE_LIMITS.maxRunOutputChars
        ? `${run.stdout.slice(0, OFFLINE_LIMITS.maxRunOutputChars)}\n…（输出过长，已截断）`
        : run.stdout,
    }))
  }
  if (run.stderr !== '') {
    holder.appendChild(el(document, 'pre', {
      className: 'tp-run-stderr',
      text: run.stderr.length > 2_000 ? `${run.stderr.slice(0, 2_000)}\n…（输出过长，已截断）` : run.stderr,
    }))
  }
  holder.appendChild(el(document, 'p', {
    className: 'tp-note',
    text: '离线页面不执行代码；源码与环境说明见 native/ 目录。',
  }))
  appendShim(wrapper, holder)
}

/** One rendered activity plus the runtime entry embedded for it. */
interface RenderedActivity {
  readonly entry: OfflineActivityEntry
  readonly html: string
}

/** Mount one activity and post-process the rendered DOM for offline behaviour. */
function renderActivity(
  document: Document,
  activity: LessonActivity,
  state: ActivityState | undefined,
  lastRun: ExperimentRun | undefined,
  warnings: string[],
): RenderedActivity | undefined {
  const validation = validateActivityPayload(activity.payload)
  if (!validation.ok) {
    warnings.push(`活动「${activity.title}」无法离线渲染：${validation.error.message}`)
    return undefined
  }
  const payload = validation.value
  // Keep the page bounded when a model-authored program is enormous; the full
  // source is still written to the native export files.
  const displayPayload = payload.type === 'code-run' && payload.code.length > OFFLINE_LIMITS.maxCodeChars
    ? (() => {
      warnings.push(`活动「${activity.title}」的代码超过 ${OFFLINE_LIMITS.maxCodeChars} 字符，导出页编辑器只显示前 ${OFFLINE_LIMITS.maxCodeChars} 字符（完整源码见 native/ 导出）`)
      return {
        ...payload,
        code: `${payload.code.slice(0, OFFLINE_LIMITS.maxCodeChars)}\n# …（代码过长，页面已截断；完整源码见 native/ 导出）`,
      }
    })()
    : payload
  const displayActivity: LessonActivity = displayPayload === payload ? activity : { ...activity, payload: displayPayload }
  const container = document.createElement('div')
  let wrapper: HTMLElement
  try {
    const mounted = mountActivity(container, displayActivity, {
      document,
      offline: true,
      ...(state !== undefined ? { state } : {}),
    })
    wrapper = mounted.element
  } catch (error) {
    warnings.push(`活动「${activity.title}」渲染失败：${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }

  const entry: {
    activityId: string
    kind: string
    payload: ActivityPayload
    state?: { params?: Readonly<Record<string, number>>; code?: string; revealedStepIds?: readonly string[] }
    layout?: { graph?: GraphLayout }
  } = {
    activityId: activity.id,
    kind: displayPayload.type,
    payload: displayPayload,
    ...(state === undefined
      ? {}
      : {
        state: {
          ...(state.params !== undefined ? { params: state.params } : {}),
          ...(state.code !== undefined ? { code: state.code } : {}),
          ...(state.revealedStepIds !== undefined ? { revealedStepIds: state.revealedStepIds } : {}),
        },
      }),
  }

  if (displayPayload.type === 'graph') {
    const layout = graphLayoutOf(displayPayload, wrapper)
    if (layout === undefined) warnings.push(`活动「${activity.title}」的图形坐标无法恢复，离线滑杆可能不可用`)
    else entry.layout = { graph: layout }
  } else if (displayPayload.type === 'derivation') {
    const serialized = serializeDerivationStepContents(document, displayPayload)
    injectDerivationStepContents(document, wrapper, displayPayload, serialized)
  } else if (displayPayload.type === 'quiz') {
    injectQuizContent(document, wrapper, displayPayload)
  } else if (displayPayload.type === 'proof-task' || displayPayload.type === 'open-question') {
    injectAnswerTaskContent(document, wrapper, displayPayload)
  } else if (displayPayload.type === 'code-run' && lastRun !== undefined) {
    appendLastRunFacts(document, wrapper, lastRun)
  }

  const html = serializeInner(container)
  return { entry, html }
}

/** Graphical activities are rendered inline under their teacher message. */
function isGraphicalActivity(activity: LessonActivity): boolean {
  return activity.kind === 'visual' || activity.kind === 'interactive-graph'
    || activity.kind === 'static-figure' || activity.kind === 'animation'
}

/** Render one activity into an arbitrary container and register its runtime entry. */
function appendActivityInto(
  document: Document,
  container: HTMLElement,
  activity: LessonActivity,
  sessionData: PageSessionInput,
  warnings: string[],
  entries: OfflineActivityEntry[],
  className: string,
): void {
  const state = sessionData.activityStates.get(activity.id)
  const lastRun = sessionData.lastRunByActivity.get(activity.id)
  const rendered = renderActivity(document, activity, state, lastRun, warnings)
  const holder = el(document, 'div', { className })
  if (rendered === undefined) {
    holder.appendChild(el(document, 'div', {
      className: 'tp-note',
      text: `活动「${activity.title}」无法在离线页面中渲染，见导出清单 limitations。`,
    }))
  } else {
    asOfflineElement(holder).innerHTML = rendered.html
    entries.push(rendered.entry)
  }
  container.appendChild(holder)
}

/** Base page CSS: layout + teaching widget polish, no external resources. */
const PAGE_CSS = String.raw`
:root {
  --dsw-border: rgba(15, 23, 42, 0.16);
  --dsw-surface: #ffffff;
  --dsw-surface-raised: rgba(15, 23, 42, 0.045);
  --dsw-text-secondary: #475569;
  color-scheme: light;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0 16px 64px;
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.7;
  color: #1f2937;
  background: #f6f7fb;
}
.tp-page { max-width: 900px; margin: 0 auto; }
header.tp-header {
  background: #ffffff;
  border: 1px solid var(--dsw-border);
  border-radius: 14px;
  padding: 20px 24px;
  margin: 24px 0 20px;
}
.tp-kicker { font-size: 12px; letter-spacing: 0.08em; color: #2563eb; }
header.tp-header h1 { margin: 6px 0 4px; font-size: 26px; line-height: 1.3; }
.tp-meta { margin: 2px 0; font-size: 13px; color: var(--dsw-text-secondary); }
.tp-nav { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 12px; font-size: 13px; }
.tp-nav a { color: #2563eb; text-decoration: none; }
.tp-nav a:hover { text-decoration: underline; }
.tp-offline-notice {
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 14px 18px;
  margin: 0 0 20px;
  font-size: 13px;
}
.tp-offline-notice h2 { margin: 0 0 6px; font-size: 15px; }
.tp-offline-notice ul { margin: 0; padding-left: 20px; }
section.tp-session, section.tp-course, section.tp-learning {
  background: #ffffff;
  border: 1px solid var(--dsw-border);
  border-radius: 14px;
  padding: 20px 24px;
  margin: 0 0 20px;
}
section.tp-session h2, section.tp-course h2, section.tp-learning h2 { margin: 0 0 4px; font-size: 20px; }
.tp-session-meta { margin: 0 0 14px; font-size: 12px; color: var(--dsw-text-secondary); }
.tp-message { border-top: 1px dashed var(--dsw-border); padding: 12px 0 4px; }
.tp-message:first-of-type { border-top: none; }
.tp-message-head { display: flex; gap: 10px; align-items: baseline; font-size: 12px; color: var(--dsw-text-secondary); }
.tp-role { font-weight: 600; }
.tp-role-teacher { color: #1d4ed8; }
.tp-role-student { color: #047857; }
.tp-role-system { color: #6b7280; }
.tp-message-body { margin-top: 4px; }
.tp-plain-text { white-space: pre-wrap; }
.tp-evidence-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.tp-evidence {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-border);
  background: var(--dsw-surface-raised);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tp-evidence-model-knowledge { border-style: dashed; color: #b45309; }
.tp-evidence-external-web { color: #7c3aed; }
.tp-activity { margin: 14px 0; }
.tp-activity .teaching-activity { background: #ffffff; }
.tp-inline-activity { margin: 10px 0; }
.tp-inline-activity .teaching-visual-frame { width: 100%; }
.tp-run-facts { margin-top: 8px; font-size: 12px; }
.tp-run-facts pre { margin: 6px 0; padding: 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.05); font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow: auto; }
.tp-run-stderr { color: #b91c1c; background: rgba(239, 68, 68, 0.08); }
.tp-note { font-size: 12px; color: #b45309; margin: 6px 0 0; }
.tp-mastery-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
.tp-mastery-table th, .tp-mastery-table td { border: 1px solid var(--dsw-border); padding: 6px 8px; text-align: left; vertical-align: top; }
.tp-mastery-table th { background: rgba(15, 23, 42, 0.045); }
.tp-review-list, .tp-notes, .tp-structure { margin: 8px 0 0; padding-left: 20px; font-size: 13px; }
.tp-note-card { border-left: 3px solid #93c5fd; padding: 4px 10px; margin: 8px 0; }
.tp-note-card time { display: block; font-size: 11px; color: var(--dsw-text-secondary); }
.teaching-h1, .teaching-h2, .teaching-h3, .teaching-h4 { margin: 14px 0 6px; line-height: 1.35; }
.teaching-h1 { font-size: 20px; } .teaching-h2 { font-size: 18px; }
.teaching-h3 { font-size: 16px; } .teaching-h4 { font-size: 14px; }
.teaching-p { margin: 6px 0; }
.teaching-list { margin: 6px 0; padding-left: 22px; }
.teaching-quote { margin: 8px 0; padding: 4px 12px; border-left: 3px solid #cbd5e1; color: #475569; }
.teaching-code-block { margin: 8px 0; padding: 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.06); overflow: auto; }
.teaching-code-block code, .teaching-code-inline { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
.teaching-rule { border: 0; border-top: 1px solid var(--dsw-border); margin: 12px 0; }
.teaching-math-block { margin: 8px 0; overflow-x: auto; }
.teaching-math-inline { white-space: nowrap; }
.teaching-link { color: #2563eb; }
.teaching-anchor-excerpt { margin-top: 4px; padding: 6px 8px; border-radius: 8px; background: var(--dsw-surface-raised); font-size: 12px; white-space: pre-wrap; }
.teaching-offline-selfcheck { margin-left: 6px; font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px dashed var(--dsw-border); background: transparent; cursor: pointer; }
.teaching-offline-selfcheck-note { margin-top: 4px; font-size: 11px; color: var(--dsw-text-secondary); }
.teaching-offline-status { margin-top: 6px; font-size: 12px; color: #b45309; }
footer.tp-footer { font-size: 12px; color: var(--dsw-text-secondary); padding: 6px 4px 0; }
@media print {
  body { background: #ffffff; }
  section.tp-session, section.tp-course, section.tp-learning, header.tp-header { break-inside: avoid-page; border-color: #cbd5e1; }
  .tp-offline-notice { background: #ffffff; }
}
`

/** Render one session (messages + activities) into the page. */
function buildSessionSection(
  document: Document,
  sessionData: PageSessionInput,
  warnings: string[],
  limitations: string[],
  entries: OfflineActivityEntry[],
): HTMLElement {
  const session = sessionData.session
  const section = el(document, 'section', {
    className: 'tp-session',
    attrs: { id: `session-${session.id}` },
  })
  section.appendChild(el(document, 'h2', { text: session.title }))
  section.appendChild(el(document, 'p', {
    className: 'tp-session-meta',
    text: `创建于 ${session.createdAt} · 更新于 ${session.updatedAt} · 阶段 ${session.position.stage} · 消息 ${sessionData.messages.length} 条 · 活动 ${sessionData.activities.length} 个`,
  }))

  const messages = sessionData.messages.slice(0, OFFLINE_LIMITS.maxMessagesPerSession)
  if (sessionData.messages.length > OFFLINE_LIMITS.maxMessagesPerSession) {
    const note = `会话「${session.title}」有 ${sessionData.messages.length} 条消息，导出页只包含前 ${OFFLINE_LIMITS.maxMessagesPerSession} 条`
    warnings.push(note)
    limitations.push(note)
  }
  const activitiesById = new Map(sessionData.activities.map(activity => [activity.id as string, activity]))
  const linkedGraphicalIds = new Set<string>()
  for (const message of messages) {
    for (const activityId of message.activityIds ?? []) {
      const activity = activitiesById.get(activityId as string)
      if (activity !== undefined && isGraphicalActivity(activity)) linkedGraphicalIds.add(activity.id as string)
    }
  }
  for (const message of messages) {
    const article = el(document, 'article', {
      className: `tp-message tp-message-${message.role}`,
      attrs: { 'data-message-id': message.id },
    })
    const head = el(document, 'div', { className: 'tp-message-head' })
    head.appendChild(el(document, 'span', {
      className: `tp-role tp-role-${message.role}`,
      text: message.role === 'teacher' ? '老师' : message.role === 'student' ? '学生' : '系统',
    }))
    head.appendChild(el(document, 'time', { text: message.createdAt }))
    head.appendChild(el(document, 'span', { text: message.kind }))
    article.appendChild(head)
    const body = el(document, 'div', { className: 'tp-message-body' })
    const text = truncateText(message.text, `消息 ${message.id}`, warnings)
    if (message.markdown === false) {
      body.appendChild(el(document, 'div', { className: 'tp-plain-text', text }))
    } else {
      const rendered = el(document, 'div', { className: 'tp-markdown' })
      asOfflineElement(rendered).innerHTML = markdownHtml(document, text)
      body.appendChild(rendered)
    }
    if (message.error !== undefined) {
      body.appendChild(el(document, 'p', {
        className: 'tp-note',
        text: `这条消息记录的是失败：${message.error.code} · ${message.error.message}`,
      }))
    }
    // Graphical activities live inside the chat message, mirroring the desktop UI.
    for (const activityId of message.activityIds ?? []) {
      const activity = activitiesById.get(activityId as string)
      if (activity !== undefined && isGraphicalActivity(activity)) {
        appendActivityInto(document, body, activity, sessionData, warnings, entries, 'tp-activity tp-inline-activity')
      }
    }
    appendEvidenceRow(document, body, message.evidenceRefs ?? [])
    article.appendChild(body)
    section.appendChild(article)
  }

  // Linked graphical activities are inline in chat; unlinked/legacy graphical
  // activities stay in the activity section so nothing silently disappears.
  const panelActivities = sessionData.activities.filter(activity =>
    !isGraphicalActivity(activity) || !linkedGraphicalIds.has(activity.id as string))
  if (panelActivities.length > 0) {
    section.appendChild(el(document, 'h3', { text: '教学活动' }))
    const activities = panelActivities.slice(0, OFFLINE_LIMITS.maxActivitiesPerSession)
    if (sessionData.activities.length > OFFLINE_LIMITS.maxActivitiesPerSession) {
      const note = `会话「${session.title}」有 ${sessionData.activities.length} 个活动，导出页只包含前 ${OFFLINE_LIMITS.maxActivitiesPerSession} 个`
      warnings.push(note)
      limitations.push(note)
    }
    for (const activity of activities) {
      appendActivityInto(document, section, activity, sessionData, warnings, entries, 'tp-activity')
    }
  }
  return section
}

/** Render the course overview part of the page. */
function buildCourseSection(document: Document, input: OfflinePageInput, warnings: string[]): HTMLElement {
  const section = el(document, 'section', { className: 'tp-course' })
  section.appendChild(el(document, 'h2', { text: '课程信息' }))
  if (input.course.description !== '') {
    section.appendChild(el(document, 'p', {
      text: truncateText(input.course.description, '课程说明', warnings),
    }))
  }
  if (input.revision === undefined) {
    section.appendChild(el(document, 'p', { text: '该课程还没有确认或生成课程结构。' }))
    return section
  }
  const revision = input.revision
  section.appendChild(el(document, 'p', {
    className: 'tp-session-meta',
    text: `课程结构第 ${revision.version} 版 · ${revision.state === 'confirmed' ? '已确认' : revision.state === 'draft' ? '草案（未确认）' : '已被替代'} · 语言 ${revision.language} · 概念 ${revision.concepts.length} 个`,
  }))
  if (revision.goals.length > 0) {
    section.appendChild(el(document, 'div', { text: '学习目标', styles: { fontWeight: '600', marginTop: '8px' } }))
    const list = el(document, 'ul', { className: 'tp-structure' })
    for (const goal of revision.goals) list.appendChild(el(document, 'li', { text: goal }))
    section.appendChild(list)
  }
  if (revision.concepts.length > 0) {
    section.appendChild(el(document, 'div', { text: '课程结构（学习顺序）', styles: { fontWeight: '600', marginTop: '8px' } }))
    const list = el(document, 'ol', { className: 'tp-structure' })
    const byId = new Map(revision.concepts.map((concept) => [concept.id, concept]))
    for (const conceptId of revision.sequence) {
      const concept = byId.get(conceptId)
      if (concept === undefined) continue
      list.appendChild(el(document, 'li', {
        text: `${concept.title}${concept.difficulty !== undefined ? `（${concept.difficulty}）` : ''}${concept.summary !== '' ? ` — ${concept.summary}` : ''}`,
      }))
    }
    section.appendChild(list)
  }
  if (revision.sources.length > 0) {
    section.appendChild(el(document, 'div', { text: '课程资料', styles: { fontWeight: '600', marginTop: '8px' } }))
    const list = el(document, 'ul', { className: 'tp-structure' })
    for (const source of revision.sources) {
      const title = input.sourceTitles.get(source.sourceId) ?? source.sourceId
      list.appendChild(el(document, 'li', {
        text: `${title}（${source.role}）${source.note !== undefined ? ` — ${source.note}` : ''}`,
      }))
    }
    section.appendChild(list)
    section.appendChild(el(document, 'p', {
      className: 'tp-note',
      text: '原资料文件不随导出打包；来源芯片中的摘录来自导入时的快照。',
    }))
  }
  return section
}

/** Human label for one mastery record. */
function masteryLevelLabel(record: MasteryRecord): string {
  const labels: Record<string, string> = {
    unseen: '未接触', exposed: '接触过', practiced: '练习过', checked: '已检验', mastered: '已掌握',
  }
  return labels[record.level] ?? record.level
}

/** Render the per-course learning record summary. */
function buildLearningSection(
  document: Document,
  input: OfflinePageInput,
  warnings: string[],
): HTMLElement | undefined {
  const learning = input.learning
  if (learning === undefined) return undefined
  const section = el(document, 'section', { className: 'tp-learning' })
  section.appendChild(el(document, 'h2', { text: '学习记录摘要' }))
  section.appendChild(el(document, 'p', {
    className: 'tp-session-meta',
    text: `尝试 ${learning.attempts.length} 次 · 掌握记录 ${learning.mastery.length} 条 · 复习项 ${learning.review.length} 条 · 笔记 ${learning.notes.length} 条`,
  }))
  const conceptTitles = new Map((input.revision?.concepts ?? []).map((concept) => [concept.id, concept.title]))
  if (learning.mastery.length > 0) {
    const table = el(document, 'table', { className: 'tp-mastery-table' })
    const header = el(document, 'tr')
    for (const label of ['概念', '掌握等级', '维度（解释/条件/变式/迁移）', '依据', '需复核/争议']) {
      header.appendChild(el(document, 'th', { text: label }))
    }
    table.appendChild(header)
    for (const record of learning.mastery) {
      const row = el(document, 'tr')
      row.appendChild(el(document, 'td', { text: conceptTitles.get(record.conceptId) ?? record.conceptId }))
      row.appendChild(el(document, 'td', { text: masteryLevelLabel(record) }))
      row.appendChild(el(document, 'td', {
        text: `${record.dimensions.explain}/${record.dimensions.conditions}/${record.dimensions.variants}/${record.dimensions.transfer}`,
      }))
      row.appendChild(el(document, 'td', { text: record.basis.join('；') }))
      const flags: string[] = []
      if (record.needsRecheck === true) flags.push('资料已变化，需复核')
      if (record.disputes.length > 0) flags.push(`争议 ${record.disputes.length} 条`)
      row.appendChild(el(document, 'td', { text: flags.join('；') || '—' }))
      table.appendChild(row)
    }
    section.appendChild(table)
  }
  if (learning.review.length > 0) {
    section.appendChild(el(document, 'div', { text: '复习建议', styles: { fontWeight: '600', marginTop: '12px' } }))
    const list = el(document, 'ul', { className: 'tp-review-list' })
    for (const item of learning.review) {
      list.appendChild(el(document, 'li', {
        text: `${conceptTitles.get(item.conceptId) ?? item.conceptId} · 到期 ${item.dueAt} · ${item.reason} · 间隔 ${item.intervalDays} 天`,
      }))
    }
    section.appendChild(list)
  }
  if (learning.attempts.length > 0) {
    section.appendChild(el(document, 'p', {
      className: 'tp-note',
      text: `尝试记录 ${learning.attempts.length} 条：完整作答与证据可通过「导出学习记录（JSON）」获取，本页只展示掌握摘要。`,
    }))
  }
  if (input.includeNotes && learning.notes.length > 0) {
    section.appendChild(el(document, 'div', { text: '我的笔记', styles: { fontWeight: '600', marginTop: '12px' } }))
    const notes = el(document, 'div', { className: 'tp-notes' })
    for (const note of learning.notes) {
      const card = el(document, 'div', { className: 'tp-note-card' })
      card.appendChild(el(document, 'time', { text: note.updatedAt }))
      const body = el(document, 'div')
      asOfflineElement(body).innerHTML = markdownHtml(document, truncateText(note.markdown, '笔记', warnings))
      card.appendChild(body)
      notes.appendChild(card)
    }
    section.appendChild(notes)
  } else if (learning.notes.length > 0) {
    section.appendChild(el(document, 'p', {
      className: 'tp-note',
      text: `有 ${learning.notes.length} 条笔记未包含在本次导出（导出时选择 includeNotes 可包含）。`,
    }))
  }
  return section
}

/** Fixed offline-notice lines, also recorded in the export manifest. */
export const OFFLINE_NOTICE_LINES: readonly string[] = [
  '本页面是单文件导出：不加载任何外部脚本、样式、字体、图片，也不调用 Harness；断网可打开。',
  '页面内交互（图形参数与动画、推导揭示、quiz 作答、来源摘录展开）都在浏览器内完成，不会写回学习记录。',
  '公式使用内联 KaTeX 布局 CSS；KaTeX 专用字体未内嵌，回退到系统字体，个别字形可能略有差异。',
  'Python/Scheme 等原生实验不在此页面执行：源码与环境说明已导出到 native/ 目录，需要在本机安装对应解释器。',
  'Markdown 中的链接是普通可点击链接，需联网才能打开；页面本身不会自动发起任何网络请求。',
  'quiz 的正确答案与解析内嵌在页面脚本数据中（离线判分需要），打开页面源码即可查看。',
]

/** Build the complete standalone HTML page for one course export. */
export function buildOfflinePage(input: OfflinePageInput): OfflinePageResult {
  const document = createOfflineDocument()
  const shim = asOfflineDocument(document)
  const head = shim.head as unknown as HTMLElement
  const body = shim.body as unknown as HTMLElement
  const warnings: string[] = []
  const dynamicLimitations: string[] = []
  const activities: OfflineActivityEntry[] = []

  const title = `${input.course.title} · 离线教学导出`
  shim.title = title
  shim.documentElement.setAttribute('lang', 'zh-CN')
  head.appendChild(el(document, 'meta', { attrs: { charset: 'utf-8' } }))
  head.appendChild(el(document, 'meta', { attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }))
  head.appendChild(el(document, 'meta', {
    attrs: { name: 'generator', content: `dsh-ai-teaching offline export ${input.pluginVersion}` },
  }))
  head.appendChild(el(document, 'title', { text: title }))
  const style = el(document, 'style')
  style.textContent = `${KATEX_CSS}\n${PAGE_CSS}`
  head.appendChild(style)

  const page = el(document, 'div', { className: 'tp-page' })
  body.appendChild(page)

  // Header (activity/session counts filled in after rendering the sessions).
  const header = el(document, 'header', { className: 'tp-header' })
  header.appendChild(el(document, 'div', { className: 'tp-kicker', text: '离线教学导出 · 无需网络 · 无需 Harness' }))
  header.appendChild(el(document, 'h1', { text: input.course.title }))
  header.appendChild(el(document, 'p', {
    className: 'tp-meta',
    text: `导出时间 ${input.createdAt} · 导出编号 ${input.exportId} · 插件版本 ${input.pluginVersion}`,
  }))
  const countsLine = el(document, 'p', { className: 'tp-meta' })
  header.appendChild(countsLine)
  if (input.nativeFiles.length > 0) {
    header.appendChild(el(document, 'p', {
      className: 'tp-meta',
      text: `原生实验源码：${input.nativeFiles.join('、')}（同目录 native/ 下，附环境与运行说明）`,
    }))
  }
  const nav = el(document, 'nav', { className: 'tp-nav', attrs: { 'aria-label': '会话目录' } })
  for (const sessionData of input.sessions) {
    nav.appendChild(el(document, 'a', {
      text: sessionData.session.title,
      attrs: { href: `#session-${sessionData.session.id}` },
    }))
  }
  header.appendChild(nav)
  page.appendChild(header)

  // Visible offline notice + limitations.
  const notice = el(document, 'section', { className: 'tp-offline-notice' })
  notice.appendChild(el(document, 'h2', { text: '离线说明' }))
  const noticeList = el(document, 'ul')
  // `input.limitations` already contains the fixed notice lines in the service
  // path; dedupe so the visible list never repeats a bullet (screenshot review).
  for (const note of uniqueStrings([...OFFLINE_NOTICE_LINES, ...input.limitations])) {
    noticeList.appendChild(el(document, 'li', { text: note }))
  }
  notice.appendChild(noticeList)
  page.appendChild(notice)

  page.appendChild(buildCourseSection(document, input, warnings))

  for (const sessionData of input.sessions.slice(0, OFFLINE_LIMITS.maxSessions)) {
    page.appendChild(buildSessionSection(document, sessionData, warnings, dynamicLimitations, activities))
  }
  if (input.sessions.length > OFFLINE_LIMITS.maxSessions) {
    const note = `课程有 ${input.sessions.length} 个会话，导出页只包含前 ${OFFLINE_LIMITS.maxSessions} 个`
    warnings.push(note)
    dynamicLimitations.push(note)
  }

  const learningSection = buildLearningSection(document, input, warnings)
  if (learningSection !== undefined) page.appendChild(learningSection)

  const footer = el(document, 'footer', { className: 'tp-footer' })
  footer.appendChild(el(document, 'p', {
    text: '由 DeepSeek Harness「AI 知识库教学」插件导出 · 导出格式版本 1 · 页面自包含，不包含凭据。',
  }))
  page.appendChild(footer)
  countsLine.textContent = `包含 ${input.sessions.length} 个学习会话、${activities.length} 个教学活动`

  // Inline runtime data + interaction script. The boot script assigns the data
  // global before the runtime script executes (scripts run in document order).
  const runtimeData = {
    formatVersion: 1,
    exportId: input.exportId,
    createdAt: input.createdAt,
    pluginVersion: input.pluginVersion,
    activities,
  }
  const dataScript = el(document, 'script', { attrs: { type: 'application/json', id: 'teaching-offline-data' } })
  dataScript.textContent = inlineJson(runtimeData)
  body.appendChild(dataScript)
  const bootScript = el(document, 'script')
  bootScript.textContent = `window.__TEACHING_OFFLINE_DATA__ = ${inlineJson(runtimeData)};`
  body.appendChild(bootScript)
  const runtimeScript = el(document, 'script')
  runtimeScript.textContent = buildOfflineRuntimeScript()
  body.appendChild(runtimeScript)

  const html = `<!doctype html>\n${serialize(shim.documentElement)}`
  return {
    html,
    warnings,
    activities,
    limitations: uniqueStrings([...OFFLINE_NOTICE_LINES, ...input.limitations, ...dynamicLimitations]),
  }
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}
