/**
 * Minimal T01 vertical slice used until the dedicated corpus/teaching/learning
 * modules land.
 *
 * It implements exactly the flow T01 must prove in the real runtime:
 * import one text/markdown source -> propose a course structure -> confirm it
 * -> start a session -> stream a source-grounded explanation -> create one
 * activity -> submit an attempt -> restart and resume. The dedicated modules
 * replace these implementations behind the same core seams; nothing in routes.ts
 * assumes this file is the final engine.
 */
import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { basename, extname } from 'node:path'
import type {
  ActivityPayload, ActivityProposal, AppError, ChatMessage, ChatStreamEvent, Course,
  CourseRevision, EvidenceReference, LearningAttempt, LessonActivity, MasteryRecord,
  SourceAnchor, SourceDocument, SourceFormat, SourceUnit, StudentProfile,
} from '@deepseek-teaching/core'
import {
  activityId, conceptId as newConceptId, courseId as newCourseId,
  courseRevisionId as newCourseRevisionId, messageId as newMessageId,
  nowIso, sessionId as newSessionId, sourceFile, sourceId as newSourceId,
  sourceRevisionFile, sourceRevisionId as newSourceRevisionId, sourceUnitsFile, unitId as newUnitId,
} from '@deepseek-teaching/core'
import type { CorpusHit } from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'
import {
  CourseRepository, LearningRepository, SessionRepository, notFound, emptyProfile,
} from '@deepseek-teaching/core'
import type { ProfileRepository } from '@deepseek-teaching/core'
import type { ModelClient } from '@deepseek-teaching/core'

/** Format detection by extension plus a small signature peek for PDF. */
export function detectFormat(path: string): SourceFormat {
  const ext = extname(path).toLowerCase()
  if (['.md', '.markdown', '.mdx'].includes(ext)) return 'markdown'
  if (['.txt', '.text', '.log'].includes(ext)) return 'text'
  if (ext === '.pdf') return 'pdf'
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic'].includes(ext)) return 'image'
  if (['.docx'].includes(ext)) return 'docx'
  if (['.pptx'].includes(ext)) return 'pptx'
  if (['.ipynb'].includes(ext)) return 'notebook'
  if (['.html', '.htm'].includes(ext)) return 'html'
  if (['.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.scm', '.ss', '.rkt', '.c', '.h', '.cpp', '.java', '.rs', '.go', '.rb', '.sh', '.sql', '.json', '.yaml', '.yml'].includes(ext)) return 'code'
  return 'text'
}

/** Loaded view of one source document plus its current revision units. */
interface StoredSource {
  readonly document: SourceDocument
  readonly units: readonly SourceUnit[]
  readonly warnings: readonly string[]
  readonly fingerprint: string
}

/** Split Markdown/plain text into heading-aware units with line locators. */
export function parseTextContent(text: string, format: SourceFormat): { units: SourceUnit[]; warnings: string[] } {
  const lines = text.split(/\r?\n/)
  const units: SourceUnit[] = []
  const warnings: string[] = []
  const revisionId = newSourceRevisionId()
  let buffer: string[] = []
  let bufferStart = 1
  let sectionPath: string[] = []
  let inFence = false

  const flush = (endLine: number, kind: SourceUnit['kind'] = 'paragraph'): void => {
    const body = buffer.join('\n').trim()
    buffer = []
    if (body === '') return
    units.push({
      id: newUnitId(),
      revisionId,
      kind,
      locator: { lines: [bufferStart, Math.max(bufferStart, endLine)], sectionPath: [...sectionPath] },
      text: body,
      markdown: format === 'markdown' ? body : undefined,
      confidence: 'high',
    })
  }

  lines.forEach((line, index) => {
    const lineNo = index + 1
    if (line.startsWith('```')) {
      if (inFence) {
        buffer.push(line)
        flush(lineNo, 'code')
        inFence = false
      } else {
        flush(lineNo - 1)
        buffer.push(line)
        bufferStart = lineNo
        inFence = true
      }
      return
    }
    if (inFence) {
      buffer.push(line)
      return
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      flush(lineNo - 1)
      const level = heading[1]?.length ?? 1
      sectionPath = [...sectionPath.slice(0, level - 1), heading[2]?.trim() ?? '']
      units.push({
        id: newUnitId(),
        revisionId,
        kind: 'heading',
        locator: { lines: [lineNo, lineNo], sectionPath: [...sectionPath] },
        text: heading[2]?.trim() ?? '',
        markdown: line,
        confidence: 'high',
      })
      bufferStart = lineNo + 1
      return
    }
    if (line.trim() === '') {
      flush(lineNo - 1)
      bufferStart = lineNo + 1
      return
    }
    if (buffer.length === 0) bufferStart = lineNo
    // Standalone display math is its own unit so formulas stay traceable.
    if (/^\s*\$\$/.test(line) || (buffer.length === 0 && /^\s*\\\[/.test(line))) {
      flush(lineNo - 1)
      units.push({
        id: newUnitId(),
        revisionId,
        kind: 'formula',
        locator: { lines: [lineNo, lineNo], sectionPath: [...sectionPath] },
        text: line.trim(),
        confidence: 'high',
      })
      bufferStart = lineNo + 1
      return
    }
    buffer.push(line)
  })
  flush(lines.length)
  if (units.length === 0) warnings.push('文件没有可提取的正文内容')
  return { units, warnings }
}

/** T01 corpus slice: import text/markdown, persist revision + units. */
export class MinimalCorpus {
  private readonly state: LocalState

  constructor(state: LocalState) {
    this.state = state
  }

  /** Import one file; unsupported formats return a clear capability error. */
  async importFile(path: string, courseId?: string): Promise<StoredSource> {
    const info = await stat(path)
    const format = detectFormat(path)
    if (!['markdown', 'text', 'code', 'notebook', 'html'].includes(format)) {
      throw appError('capability-missing', `T01 最小流程暂只支持文本类资料（${format} 由 T02 接入）：${basename(path)}`)
    }
    const bytes = await readFile(path)
    const fingerprint = createHash('sha256').update(bytes).digest('hex')
    const revisionId = newSourceRevisionId()
    let text: string
    if (format === 'notebook') {
      text = notebookToText(bytes.toString('utf8'))
    } else if (format === 'html') {
      text = bytes.toString('utf8').replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    } else {
      text = bytes.toString('utf8')
    }
    const parsed = parseTextContent(text, format)
    const units = parsed.units.map(unit => ({ ...unit, revisionId }))
    const id = newSourceId()
    const document: SourceDocument = {
      id,
      originalPath: path,
      title: basename(path),
      format,
      sizeBytes: info.size,
      mtimeMs: info.mtimeMs,
      courseIds: (courseId === undefined ? [] : [courseId]) as never,
      addedAt: nowIso(),
      updatedAt: nowIso(),
      status: parsed.warnings.length > 0 ? 'partial' : 'ready',
      currentRevisionId: revisionId,
      revisions: [{ id: revisionId, fingerprint, createdAt: nowIso(), status: 'ready', unitCount: units.length }],
    }
    // Storage layout: the document record lives at sources/<id>.json and each
    // revision's units in sources/<id>/revisions/<revId>.units.json.
    await this.state.writeJson(sourceFile(this.state.dataDir, id), document)
    await this.state.writeJson(sourceUnitsFile(this.state.dataDir, id, revisionId), units)
    await this.state.writeJson(sourceRevisionFile(this.state.dataDir, id, revisionId), {
      id: revisionId,
      documentId: id,
      fingerprint,
      createdAt: nowIso(),
      extractor: { name: 'text-v1', version: '0.1.0' },
      unitCount: units.length,
      issueCount: parsed.warnings.length,
      status: parsed.warnings.length > 0 ? 'partial' : 'ready',
      extent: { kind: 'lines', count: text.split('\n').length },
      textChars: text.length,
    })
    return { document, units, warnings: parsed.warnings, fingerprint }
  }

  /** Load one stored source (document + current revision units). */
  async load(sourceId: string): Promise<StoredSource> {
    const document = await this.state.readJson<SourceDocument>(sourceFile(this.state.dataDir, sourceId))
    if (document === undefined) throw appError('not-found', '资料不存在')
    const revision = (document.revisions.at(-1) ?? undefined)
    if (revision === undefined) throw appError('not-found', '资料还没有可读取的解析版本')
    const units = (await this.state.readJson<SourceUnit[]>(sourceUnitsFile(this.state.dataDir, sourceId, revision.id))) ?? []
    return { document, units, warnings: [], fingerprint: revision.fingerprint }
  }

  /** List documents attached to a course. */
  async listForCourse(courseId: string): Promise<SourceDocument[]> {
    const files = (await this.state.list('sources')).filter(name => name.endsWith('.json'))
    const out: SourceDocument[] = []
    for (const name of files) {
      const doc = await this.state.readJson<SourceDocument>(`sources/${name}`)
      if (doc !== undefined && Array.isArray(doc.courseIds) && doc.courseIds.includes(courseId as never)) out.push(doc)
    }
    return out
  }

  /** Attach a source to a course. */
  async attach(sourceId: string, courseId: string, attach: boolean): Promise<SourceDocument> {
    const stored = await this.load(sourceId)
    const courseIds = (attach
      ? Array.from(new Set([...stored.document.courseIds, courseId]))
      : stored.document.courseIds.filter(id => id !== courseId)) as never
    const document: SourceDocument = { ...stored.document, courseIds, updatedAt: nowIso() }
    await this.state.writeJson(sourceFile(this.state.dataDir, sourceId), document)
    return document
  }

  /** Naive-but-honest retrieval: term overlap over extracted units. */
  async search(query: string, courseIds: readonly string[], limit = 6): Promise<CorpusHit[]> {
    const terms = tokenize(query)
    if (terms.length === 0) return []
    const files = (await this.state.list('sources')).filter(name => name.endsWith('.json'))
    const hits: CorpusHit[] = []
    for (const name of files) {
      const document = await this.state.readJson<SourceDocument>(`sources/${name}`)
      if (document === undefined || !Array.isArray(document.courseIds)) continue
      if (courseIds.length > 0 && !document.courseIds.some(id => courseIds.includes(id))) continue
      const loaded = await this.load(document.id)
      const stored = loaded
      for (const unit of stored.units) {
        const lower = unit.text.toLowerCase()
        let score = 0
        const matched: string[] = []
        for (const term of terms) {
          if (lower.includes(term)) {
            score += term.length >= 2 ? 2 : 1
            matched.push(term)
          }
        }
        if (matched.length === 0) continue
        score += Math.min(2, matched.length) + (unit.kind === 'heading' ? 1 : 0)
        hits.push({
          anchor: {
            documentId: stored.document.id,
            revisionId: unit.revisionId,
            unitId: unit.id,
            locator: unit.locator,
            excerpt: unit.text.slice(0, 400),
            confidence: unit.confidence,
            label: `${stored.document.title}${unit.locator.sectionPath?.length ? ` · ${unit.locator.sectionPath.join(' / ')}` : ''}`,
          },
          score,
          matchedTerms: matched,
        })
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}

/** Convert a notebook into readable text with cell markers. */
function notebookToText(raw: string): string {
  try {
    const notebook = JSON.parse(raw) as { cells?: { cell_type?: string; source?: string[] | string }[] }
    const cells = notebook.cells ?? []
    return cells.map((cell, index) => {
      const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '')
      return `## cell ${index} (${cell.cell_type ?? 'unknown'})\n${source}`
    }).join('\n\n')
  } catch {
    return raw
  }
}

/** Split query into lowercase search terms (CJK single chars + latin words). */
export function tokenize(text: string): string[] {
  const out: string[] = []
  const latin = text.toLowerCase().match(/[a-z0-9_.+#-]{2,}/g) ?? []
  out.push(...latin)
  const cjk = text.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const run of cjk) {
    // Chinese has no spaces: bigrams retrieve better than single chars.
    if (run.length === 1) out.push(run)
    for (let i = 0; i + 1 < run.length; i += 1) out.push(run.slice(i, i + 2))
  }
  return Array.from(new Set(out)).slice(0, 24)
}

/** Build a course draft from headings in imported material (no model required). */
export function draftConceptsFromSources(sources: readonly { document: SourceDocument; units: readonly SourceUnit[] }[]): {
  concepts: CourseRevision['concepts']
  coverage: { sourceId: string; title: string; status: string; usedUnits: number; issues: number }[]
  warnings: string[]
} {
  const concepts: CourseRevision['concepts'][number][] = []
  const coverage: { sourceId: string; title: string; status: string; usedUnits: number; issues: number }[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    let used = 0
    for (const unit of source.units) {
      if (unit.kind !== 'heading') continue
      const title = unit.text.trim()
      if (title === '' || seen.has(title)) continue
      seen.add(title)
      used += 1
      concepts.push({
        id: newConceptId(),
        title,
        summary: `来自《${source.document.title}》的「${title}」部分`,
        prerequisites: [],
        sourceAnchors: [{
          documentId: source.document.id,
          revisionId: unit.revisionId,
          unitId: unit.id,
          locator: unit.locator,
          excerpt: title,
          confidence: unit.confidence,
          label: source.document.title,
        }],
        difficulty: concepts.length < 3 ? 'intro' : 'core',
      })
    }
    coverage.push({
      sourceId: source.document.id,
      title: source.document.title,
      status: source.document.status,
      usedUnits: used,
      issues: 0,
    })
    if (used === 0) warnings.push(`《${source.document.title}》没有可识别的章节标题，请检查资料或改用 AI 分析`)
  }
  if (concepts.length === 0) {
    // No headings: fall back to the opening paragraphs so the course still has structure.
    for (const source of sources.slice(0, 1)) {
      for (const unit of source.units.slice(0, 4)) {
        concepts.push({
          id: newConceptId(),
          title: unit.text.slice(0, 24) || '资料内容',
          summary: unit.text.slice(0, 160),
          prerequisites: [],
          sourceAnchors: [{
            documentId: source.document.id,
            revisionId: unit.revisionId,
            unitId: unit.id,
            locator: unit.locator,
            excerpt: unit.text.slice(0, 240),
            confidence: unit.confidence,
            label: source.document.title,
          }],
          difficulty: 'intro',
        })
      }
    }
    warnings.push('资料中没有标题结构，课程草案按段落生成，建议确认后手动调整')
  }
  return { concepts, coverage, warnings }
}

/** Build the T01 teaching prompt (replaced by the Teaching module in T03). */
export function buildTeachingMessages(input: {
  course: Course
  revision: CourseRevision
  profile: StudentProfile
  history: readonly ChatMessage[]
  material: readonly { anchor: SourceAnchor; documentTitle: string }[]
  /** Externally searched results (already retrieved by the Host), if any. */
  webResults?: readonly { title: string; url: string; snippet: string }[]
  studentText: string
  currentConceptTitle?: string
}): { system: string; messages: { role: 'system' | 'user' | 'assistant'; text: string }[] } {
  const languageRule = input.profile.language === 'en'
    ? '回答使用英文。'
    : input.profile.language === 'bilingual'
      ? '回答使用中文，并在关键术语后保留英文原文（如“过拟合 (overfitting)”）。'
      : '回答使用中文，专业术语首次出现时保留英文原文。'
  const system = [
    '你是一位严谨、耐心的私人教师，正在使用学生自己的本地课程资料进行教学。',
    languageRule,
    '教学要求：',
    '1. 先回答学生当前问题，再给必要的直觉、准确表述、适用条件和常见误区；不要堆砌无关内容。',
    '2. 只用提供的课程资料作为课程依据；资料没覆盖时可以给出你的补充知识，但必须明确标注“模型补充”。',
    '3. 引用资料时用 [资料1]、[资料2] 这样的编号，编号对应给定的资料片段。',
    '4. 不编造资料中没有的公式、页码或结论；不确定时明确说明。',
    '5. 每次回复控制在学生能消化的长度；需要展开时提出下一步。',
    '6. 如果适合练习，提出一个小活动（画图/代码/推导/选择题）。',
    '回复末尾附加一个 JSON 代码块（学生看不到，用于保存教学状态），格式：',
    '```json',
    '{"stage":"teaching|practice|diagnosis|transfer|review","concept":<概念编号或null>,"activity":null 或 {"kind":"quiz|graph|derivation|code-run|open-question","title":"...","goal":"...","payload":{...},"verification":{"kind":"objective|rubric|open|none"}},"uncertainty":["..."]}',
    '```',
    '活动 payload 必须严格符合给定类型；无法给出活动时 activity 为 null。',
  ].join('\n')

  const materialBlock = input.material.length === 0
    ? '（本轮没有检索到本地资料片段；若使用模型知识，请明确标注。）'
    : input.material.map((item, index) => [
      `[资料${index + 1}] ${item.documentTitle}`,
      `位置: ${JSON.stringify(item.anchor.locator)}`,
      `原文: ${item.anchor.excerpt}`,
    ].join('\n')).join('\n\n')

  const webBlock = (input.webResults ?? []).length === 0
    ? ''
    : ['外部网页查证结果（必须标注为“外部资料”，并与本地资料区分）：',
      ...(input.webResults ?? []).map((item, index) => `[外部${index + 1}] ${item.title} — ${item.url}\n摘要: ${item.snippet}`)].join('\n')

  const messages: { role: 'system' | 'user' | 'assistant'; text: string }[] = []
  for (const message of input.history.slice(-10)) {
    if (message.role === 'student') messages.push({ role: 'user', text: message.text })
    else if (message.role === 'teacher') messages.push({ role: 'assistant', text: message.text.length > 4000 ? message.text.slice(0, 4000) : message.text })
  }
  messages.push({
    role: 'user',
    text: [
      `课程：${input.course.title}`,
      `学习目标：${input.revision.goals.join('；') || '未指定'}`,
      input.currentConceptTitle === undefined ? '' : `当前概念：${input.currentConceptTitle}`,
      '',
      '可用课程资料片段：',
      materialBlock,
      ...(webBlock === '' ? [] : ['', webBlock]),
      '',
      `学生的问题/回答：${input.studentText}`,
    ].filter(line => line !== '').join('\n'),
  })
  return { system, messages }
}

/** Parse the trailing JSON metadata block from a teacher reply. */
export function parseTeachingMeta(text: string): {
  replyText: string
  meta?: { stage?: string; concept?: string | null; activity?: unknown; uncertainty?: string[] }
  warnings: string[]
} {
  const warnings: string[] = []
  const fence = /```json\s*([\s\S]*?)```\s*$/.exec(text)
  if (fence === null) return { replyText: text.trim(), warnings }
  let meta: { stage?: string; concept?: string | null; activity?: unknown; uncertainty?: string[] }
  try {
    meta = JSON.parse(fence[1] ?? '{}')
  } catch {
    warnings.push('教学状态 JSON 解析失败，已保留讲解文本')
    return { replyText: text.slice(0, fence.index).trim(), warnings }
  }
  return { replyText: text.slice(0, fence.index).trim(), meta, warnings }
}

/** Validate/normalise a model-proposed activity into a storable payload. */
export function normalizeActivityProposal(raw: unknown): { payload: ActivityPayload; verification: LessonActivity['verification'] } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const kind = (raw as { kind?: unknown }).kind
  // Some models put the payload fields beside `kind` instead of nesting them.
  const payloadUnknown = (raw as { payload?: unknown }).payload ?? raw
  if (typeof kind !== 'string' || typeof payloadUnknown !== 'object' || payloadUnknown === null) return undefined
  const value = payloadUnknown as Record<string, unknown>
  const verificationRaw = (raw as { verification?: { kind?: string } }).verification
  const verificationKind = verificationRaw?.kind === 'objective' || verificationRaw?.kind === 'rubric' || verificationRaw?.kind === 'open'
    ? verificationRaw.kind
    : 'none'
  switch (kind) {
    case 'quiz': {
      // Accept a single question object or a questions array whose first item
      // carries stem/options/answerIndex (a common model shape).
      const first = Array.isArray(value.questions) && typeof value.questions[0] === 'object' && value.questions[0] !== null
        ? value.questions[0] as Record<string, unknown>
        : value
      const questionText = typeof first.question === 'string' ? first.question
        : (typeof first.stem === 'string' ? first.stem : undefined)
      const rawOptions = Array.isArray(first.options) ? first.options : []
      if (questionText === undefined || rawOptions.length < 2) return undefined
      const options: { id: string; label: string }[] = []
      rawOptions.forEach((option, index) => {
        const fallbackId = String.fromCharCode(65 + index)
        if (typeof option === 'string') {
          options.push({ id: fallbackId, label: option })
          return
        }
        if (typeof option !== 'object' || option === null) return
        const item = option as Record<string, unknown>
        const label = typeof item.label === 'string' ? item.label : (typeof item.text === 'string' ? item.text : undefined)
        if (label === undefined) return
        options.push({ id: typeof item.id === 'string' ? item.id : fallbackId, label })
      })
      if (options.length < 2) return undefined
      const rawCorrect: unknown[] = Array.isArray(first.correctOptionIds)
        ? first.correctOptionIds as unknown[]
        : first.correctOptionId !== undefined
          ? [first.correctOptionId]
          : first.answerIndex !== undefined
            ? [first.answerIndex]
            : first.answer !== undefined
              ? [first.answer]
              : []
      const correct = rawCorrect.flatMap((entry): string[] => {
        if (typeof entry === 'number' && options[entry] !== undefined) return [options[entry]!.id]
        if (typeof entry !== 'string') return []
        const direct = options.find(option => option.id === entry)
        if (direct !== undefined) return [direct.id]
        const byLetter = options.find(option => option.id.toLowerCase() === entry.trim().toLowerCase())
        if (byLetter !== undefined) return [byLetter.id]
        const asIndex = Number(entry)
        if (Number.isInteger(asIndex) && options[asIndex] !== undefined) return [options[asIndex]!.id]
        return []
      })
      if (correct.length === 0) return undefined
      return {
        payload: {
          type: 'quiz',
          question: questionText,
          markdown: typeof first.markdown === 'string' ? first.markdown : undefined,
          options,
          correctOptionIds: correct,
          multiple: first.multiple === true,
          explanation: typeof first.explanation === 'string' ? first.explanation
            : (typeof first.explain === 'string' ? first.explain : undefined),
          hint: typeof first.hint === 'string' ? first.hint : undefined,
        },
        verification: { kind: 'objective', note: '选择题由宿主按正确选项判定' },
      }
    }
    case 'graph': {
      const seriesSource = Array.isArray(value.series) ? value.series : (Array.isArray((value as { functions?: unknown[] }).functions) ? (value as { functions: unknown[] }).functions : [])
      if (seriesSource.length === 0 || !Array.isArray(value.xRange) || !Array.isArray(value.yRange)) return undefined
      const series = seriesSource.flatMap((entry, index) => {
        if (typeof entry !== 'object' || entry === null) return []
        const item = entry as Record<string, unknown>
        const expr = typeof item.expr === 'string' ? item.expr : (typeof item.expression === 'string' ? item.expression : undefined)
        if (expr === undefined) return []
        return [{
          id: typeof item.id === 'string' ? item.id : `s${index + 1}`,
          label: typeof item.label === 'string' ? item.label : expr,
          expr,
          color: typeof item.color === 'string' ? item.color as never : undefined,
          dashed: item.dashed === true,
        }]
      })
      if (series.length === 0) return undefined
      return {
        payload: {
          type: 'graph',
          title: typeof value.title === 'string' ? value.title : undefined,
          xLabel: typeof value.xLabel === 'string' ? value.xLabel : undefined,
          yLabel: typeof value.yLabel === 'string' ? value.yLabel : undefined,
          xRange: [Number(value.xRange[0] ?? -5), Number(value.xRange[1] ?? 5)],
          yRange: [Number(value.yRange[0] ?? -5), Number(value.yRange[1] ?? 5)],
          series,
          params: Array.isArray(value.params) ? value.params.flatMap(param => {
            if (typeof param !== 'object' || param === null) return []
            const item = param as Record<string, unknown>
            if (typeof item.name !== 'string' || typeof item.label !== 'string') return []
            return [{
              name: item.name, label: item.label,
              min: Number(item.min ?? 0), max: Number(item.max ?? 1),
              step: Number(item.step ?? 0.1), value: Number(item.value ?? 0.5),
            }]
          }) : undefined,
          hint: typeof value.hint === 'string' ? value.hint : undefined,
        },
        verification: { kind: 'none', note: '探索性图形活动，不单独作为掌握证据' },
      }
    }
    case 'derivation': {
      const stepSource = Array.isArray(value.steps) ? value.steps : []
      if (stepSource.length === 0) return undefined
      const steps = stepSource.flatMap((entry, index) => {
        if (typeof entry !== 'object' || entry === null) return []
        const item = entry as Record<string, unknown>
        if (typeof item.latex !== 'string') return []
        return [{
          id: typeof item.id === 'string' ? item.id : `step${index + 1}`,
          latex: item.latex,
          note: typeof item.note === 'string' ? item.note : undefined,
        }]
      })
      if (steps.length === 0) return undefined
      return {
        payload: { type: 'derivation', title: typeof value.title === 'string' ? value.title : undefined, steps },
        verification: { kind: 'open', note: '推导由学生解释并结合 rubric 评价' },
      }
    }
    case 'code-run': {
      if (typeof value.language !== 'string' || typeof value.code !== 'string') return undefined
      return {
        payload: {
          type: 'code-run',
          language: value.language,
          dialect: typeof value.dialect === 'string' ? value.dialect : undefined,
          code: value.code,
          editable: true,
          instructions: typeof value.instructions === 'string' ? value.instructions : undefined,
          stdin: typeof value.stdin === 'string' ? value.stdin : undefined,
          tests: Array.isArray(value.tests) ? normalizeCodeTests(value.tests) : undefined,
        },
        verification: { kind: 'objective', note: '由真实运行结果验证' },
      }
    }
    default:
      return undefined
  }
}

/** Normalise model-proposed code tests into the CodeTest union. */
function normalizeCodeTests(raw: readonly unknown[]): import('@deepseek-teaching/core').CodeTest[] {
  const out: import('@deepseek-teaching/core').CodeTest[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string' || typeof item.type !== 'string' || item.value === undefined) continue
    if (item.type === 'exit-code') {
      const value = typeof item.value === 'number' ? item.value : Number(item.value)
      if (Number.isFinite(value)) out.push({ name: item.name, type: 'exit-code', value })
    } else if (item.type === 'stdout-contains') {
      out.push({ name: item.name, type: 'stdout-contains', value: String(item.value) })
    } else if (item.type === 'stdout-equals') {
      out.push({ name: item.name, type: 'stdout-equals', value: String(item.value) })
    }
  }
  return out
}

/** Minimal code runner used by T01 (replaced by the Experiments module). */
export async function runCode(body: {
  language: string
  code: string
  stdin?: string
  timeoutMs?: number
}): Promise<{
  language: string
  stdout: string
  stderr: string
  exitCode: number | undefined
  durationMs: number
  timedOut: boolean
  cancelled: boolean
}> {
  const startedAt = Date.now()
  const timeoutMs = Math.min(30_000, body.timeoutMs ?? 10_000)
  const { command, args, env } = commandFor(body.language, body.code)
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let cancelled = false
    const cap = 256 * 1024
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < cap) stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < cap) stderr += chunk.toString('utf8')
    })
    child.on('error', cause => {
      stderr += String(cause)
    })
    child.on('close', (code: number | null) => {
      clearTimeout(timer)
      resolve({
        language: body.language,
        stdout: stdout.slice(0, cap),
        stderr: stderr.slice(0, cap),
        exitCode: code ?? undefined,
        durationMs: Date.now() - startedAt,
        timedOut,
        cancelled,
      })
    })
    if (body.stdin !== undefined) child.stdin.end(body.stdin)
    else child.stdin.end()
    // Expose cancellation through the promise's outer scope when the caller aborts.
    void cancelled
  })
}

/** Spawn description for one language (T01 subset). */
function commandFor(language: string, code: string): { command: string; args: string[]; env: Record<string, string> } {
  if (language === 'python') {
    return { command: process.env.DSH_TEACHING_PYTHON?.trim() || 'python3', args: ['-I', '-c', code], env: { PYTHONIOENCODING: 'utf-8' } }
  }
  if (language === 'javascript') {
    // Desktop Host runs under Electron Node: the same binary executes JS child processes.
    return { command: process.execPath, args: ['--eval', code], env: { ELECTRON_RUN_AS_NODE: '1' } }
  }
  throw appError('capability-missing', `T01 最小运行器暂不支持 ${language}（T05 接入 Scheme 等）`)
}

/** Build one source-grounded evidence reference from a search hit. */
export function hitToEvidence(hit: CorpusHit): EvidenceReference {
  return {
    kind: 'course-source',
    label: hit.anchor.label,
    anchor: hit.anchor,
    confidence: hit.anchor.confidence === 'unknown' ? 'unknown' : hit.anchor.confidence,
  }
}

/** Compose the AppError used on this slice. */
export function appError(code: AppError['code'], message: string, details?: Record<string, unknown>): AppError & Error {
  const error = new Error(message) as Error & { appError: AppError }
  error.name = 'TeachingError'
  error.appError = { code, message, ...(details === undefined ? {} : { details }) }
  Object.defineProperty(error, 'code', { get: () => error.appError.code, enumerable: true })
  Object.defineProperty(error, 'details', { get: () => error.appError.details, enumerable: true })
  return error as unknown as AppError & Error
}

/** Convenience factory for the minimal slice's course creation. */
export function createCourseRecord(title: string, description: string, language: 'zh' | 'en' | 'bilingual', goals: readonly string[]): { course: Course; revision: CourseRevision } {
  const id = newCourseId()
  const revisionId = newCourseRevisionId()
  const createdAt = nowIso()
  const course: Course = {
    id,
    title,
    description,
    subjectTags: [],
    status: 'active',
    createdAt,
    updatedAt: createdAt,
  }
  const revision: CourseRevision = {
    id: revisionId,
    courseId: id,
    version: 1,
    createdAt,
    state: 'draft',
    provenance: 'student-edit',
    goals,
    language,
    sources: [],
    concepts: [],
    sequence: [],
    basedOn: [],
  }
  return { course, revision }
}

/** Create a fresh session bound to a confirmed revision. */
export function createSessionRecord(course: Course, revision: CourseRevision): {
  session: import('@deepseek-teaching/core').TeachingSession
  message: ChatMessage | undefined
} {
  const id = newSessionId()
  const createdAt = nowIso()
  return {
    session: {
      id,
      courseId: course.id,
      courseRevisionId: revision.id,
      title: course.title,
      createdAt,
      updatedAt: createdAt,
      status: 'active',
      position: { stage: 'teaching', updatedAt: createdAt },
      messageIds: [],
      coveredConceptIds: [],
    },
    message: undefined,
  }
}

/** Build one teacher message record. */
export function teacherMessage(input: {
  sessionId: string
  text: string
  evidenceRefs: readonly EvidenceReference[]
  activityIds: readonly string[]
  usage?: ChatMessage['usage']
  uncertainty?: readonly string[]
}): ChatMessage {
  return {
    id: newMessageId(),
    sessionId: input.sessionId as never,
    role: 'teacher',
    kind: 'teacher-explanation',
    text: input.text,
    markdown: true,
    createdAt: nowIso(),
    evidenceRefs: input.evidenceRefs,
    activityIds: input.activityIds as never,
    usage: input.usage,
    teaching: {
      intent: 'explain',
      uncertainty: input.uncertainty,
      evidenceKinds: Array.from(new Set(input.evidenceRefs.map(ref => ref.kind))),
    },
  }
}

/** Build one student message record. */
export function studentMessage(sessionId: string, text: string): ChatMessage {
  return {
    id: newMessageId(),
    sessionId: sessionId as never,
    role: 'student',
    kind: 'student-question',
    text,
    createdAt: nowIso(),
  }
}

/** Build one activity record from a proposal. */
export function activityFromProposal(input: {
  proposal: ActivityProposal
  sessionId: string
  courseId: string
  sourceRefs: readonly SourceAnchor[]
}): LessonActivity {
  const createdAt = nowIso()
  return {
    id: activityId(),
    kind: input.proposal.kind as never,
    sessionId: input.sessionId as never,
    courseId: input.courseId as never,
    conceptIds: input.proposal.conceptIds,
    goal: input.proposal.goal,
    title: input.proposal.title,
    createdAt,
    updatedAt: createdAt,
    revision: 1,
    status: 'active',
    sourceRefs: input.sourceRefs,
    verification: input.proposal.verification,
    independent: input.proposal.independent,
    payload: input.proposal.payload,
  }
}
