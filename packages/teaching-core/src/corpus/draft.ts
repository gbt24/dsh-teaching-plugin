/**
 * 课程结构草案 v2：知识库结构直读（确定性）+ LLM-wiki 回退（模型生成虚拟 wiki）。
 *
 * 路由（`CourseDraftInput.strategy`）：
 * - `auto`（默认）：检测到 LLM-wiki 结构 → 确定性构建（不调用模型）；否则按 LLM-wiki 规则生成；
 * - `kb-structure`：要求检测到知识库结构，否则返回 capability-missing；
 * - `llm-wiki`：强制按 LLM-wiki 规则生成虚拟结构（即使资料本身有 wiki 结构）。
 *
 * 共同约束：
 * - 模型只能引用 digest 中真实出现的 documentId/unitId，无效 anchor 一律丢弃并警告（不伪造来源）；
 * - 结构化 JSON 解析失败只做有界修复（不超过 `draftLlmWikiGroupCallsMax` 次调用）；
 * - 只写 `Course.draftRevisionId`，不修改 activeRevisionId（确认由 Host/学生完成）；
 * - 原文件只读，不写用户知识库目录。
 */
import type { CourseDraftInput, CorpusService, CourseDraftStrategy } from '../contracts/corpus.ts'
import type {
  Concept, ConceptDifficulty, CourseChapter, CourseDraftView, CourseRevision, CourseSourceRef,
  SourceRole,
} from '../contracts/course.ts'
import type { SourceAnchor, SourceDocument, SourceRevision, SourceUnit } from '../contracts/source.ts'
import { conceptId as newConceptId, courseRevisionId as newCourseRevisionId, nowIso } from '../contracts/ids.ts'
import type { SourceId } from '../contracts/ids.ts'
import type { ModelClient, ModelRequest } from '../model/types.ts'
import { err, ok, toAppError, type Result } from '../contracts/result.ts'
import type { CourseRepository } from '../storage/repositories.ts'
import type { CorpusLimits } from './limits.ts'
import type { CorpusStore } from './store.ts'
import { isSignalAborted } from './budget.ts'
import { excerptAround, locatorDescription } from './text-utils.ts'
import {
  buildKbStructureFromContext, kbRoleToSourceRole, prepareKbContext,
  type KbContext, type KbPage, type KbSourceRole, type KbStructureBuild, type MaterialDocument,
} from './structure.ts'

/** 草案生成依赖。 */
export interface DraftDeps {
  readonly store: CorpusStore
  readonly courses: CourseRepository
  readonly model?: ModelClient
  readonly limits: CorpusLimits
}

/** 未分配 id 的概念（由持久化层分配）。 */
interface StructureConceptInput {
  readonly title: string
  readonly summary: string
  readonly prerequisites: readonly string[]
  readonly anchors: readonly SourceAnchor[]
  readonly difficulty?: ConceptDifficulty
  readonly misconceptions?: readonly string[]
  readonly checkIdeas?: readonly string[]
}

/** 未分配 id 的章节。 */
interface StructureChapterInput {
  readonly title: string
  readonly summary?: string
  readonly role: 'chapter' | 'appendix' | 'tool'
  readonly conceptTitles: readonly string[]
  readonly anchors?: readonly SourceAnchor[]
}

/** 两种模式共用的一份待持久化结构数据。 */
interface StructureData {
  readonly goals: readonly string[]
  readonly concepts: readonly StructureConceptInput[]
  readonly chapters: readonly StructureChapterInput[]
  readonly sequenceTitles?: readonly string[]
  readonly sources: readonly CourseSourceRef[]
  readonly basedOn: readonly { readonly sourceId: SourceId; readonly revisionId: string }[]
  readonly provenance: 'kb-structure' | 'llm-wiki'
  readonly changeSummary: string
}

const ROLE_BY_FORMAT: Readonly<Record<SourceDocument['format'], SourceRole>> = {
  pdf: 'textbook',
  docx: 'lecture',
  pptx: 'slides',
  markdown: 'lecture',
  text: 'textbook',
  html: 'reference',
  code: 'reference',
  notebook: 'reference',
  image: 'other',
}

/* ------------------------------------------------------------------ 入口 */

/** 生成课程结构草案并按策略路由到知识库直读或 LLM-wiki 回退。 */
export async function proposeCourseRevision(
  deps: DraftDeps,
  input: CourseDraftInput,
  signal?: AbortSignal,
): Promise<Result<CourseRevision>> {
  if (input.courseTitle.trim() === '' || input.goal.trim() === '') {
    return err('invalid-input', '课程草案需要课程标题与学习目标')
  }
  if (isSignalAborted(signal)) return err('cancelled', '课程草案生成已取消')
  const course = await deps.courses.get(input.courseId)
  if (course === undefined) return err('not-found', '课程不存在或已被删除')
  const strategy: CourseDraftStrategy = input.strategy ?? 'auto'

  let prepared: Result<KbContext>
  try {
    prepared = await prepareKbContext(deps, input, signal)
  } catch (cause) {
    return toResultError(cause, '读取课程资料失败，无法生成课程草案')
  }
  if (!prepared.ok) return prepared
  const context = prepared.value
  const detected = context.detection.facts.isKnowledgeBase

  if (strategy !== 'llm-wiki' && detected) {
    const built = await buildKbStructureFromContext(deps, input, context, signal)
    if (built.ok) {
      try {
        const revision = await persistStructureRevision(deps, input, structureDataFromKb(built.value, input, deps.limits))
        return ok(revision)
      } catch (cause) {
        return toResultError(cause, '课程草案保存失败')
      }
    }
    if (strategy === 'kb-structure') return built
    // auto：知识库解析不出概念时回退到 LLM-wiki（有模型才回退）
    if (built.error.code !== 'uncertain' || deps.model === undefined) return built
    const fallback = await runLlmWikiPath(deps, input, context, signal)
    return fallback.ok ? fallback : built
  }
  if (strategy === 'kb-structure') {
    return err(
      'capability-missing',
      `未检测到 LLM-wiki 知识库结构，无法使用 kb-structure 策略：${context.detection.facts.reason}`,
      {
        details: {
          strategy,
          signals: context.detection.facts.signals.map(item => ({ id: item.id, matched: item.matched })),
          pageCount: context.detection.facts.pageCount,
        },
      },
    )
  }

  return await runLlmWikiPath(deps, input, context, signal)
}

/** 由知识库直读结果组装可持久化的结构数据。 */
function structureDataFromKb(
  build: KbStructureBuild,
  input: CourseDraftInput,
  _limits: CorpusLimits,
): StructureData {
  const concepts: StructureConceptInput[] = build.concepts.map(concept => ({
    title: concept.title,
    summary: concept.summary,
    prerequisites: concept.prerequisites,
    anchors: concept.anchors,
    ...(concept.difficulty !== undefined ? { difficulty: concept.difficulty } : {}),
  }))
  const chapters: StructureChapterInput[] = build.chapters.map(chapter => ({
    title: chapter.title,
    ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
    role: chapter.role,
    conceptTitles: chapter.conceptTitles,
    anchors: chapter.anchors,
  }))
  const coveredTitles = new Set(chapters.flatMap(chapter => chapter.conceptTitles))
  const missing = concepts.filter(concept => !coveredTitles.has(concept.title)).map(concept => concept.title)
  if (missing.length > 0) {
    chapters.push({ title: '未分章内容', role: 'appendix', conceptTitles: missing, anchors: [] })
  }
  return {
    goals: buildGoals(input),
    concepts,
    chapters,
    sequenceTitles: build.sequence.length > 0 ? build.sequence : undefined,
    sources: build.sources,
    basedOn: build.basedOn,
    provenance: 'kb-structure',
    changeSummary: describeKbBuild(build),
  }
}

function buildGoals(input: CourseDraftInput): string[] {
  const goal = input.goal.trim().slice(0, 240)
  return goal === '' ? [] : [goal]
}

function describeKbBuild(build: KbStructureBuild): string {
  const facts = build.detection.facts
  const chapterCount = build.chapters.filter(chapter => chapter.role === 'chapter').length
  const toolCount = build.chapters.filter(chapter => chapter.role === 'tool').length
  const anchorCount = build.concepts.reduce((sum, concept) => sum + concept.anchors.length, 0)
  const warningPart = build.warnings.length > 0
    ? `结构警告 ${build.warnings.length} 条（${build.warnings.slice(0, 2).join('；')}）`
    : '未发现结构问题'
  return [
    `知识库结构直读（kb-structure）：${chapterCount} 章 + ${toolCount} 个工具章节 + ${build.concepts.length} 个概念`,
    `${anchorCount} 个原文锚点；读取 ${facts.pageCount} 个页面（index=${facts.hasIndex ? '有' : '无'}、frontmatter=${facts.frontmatterPageCount}、chapter-overview=${facts.chapterOverviewCount}、可解析链接=${facts.resolvableWikilinkCount}）`,
    warningPart,
  ].join('；')
}

/* ------------------------------------------------------------------ LLM-wiki 回退 */

/** digest 中可引用的一个单元。 */
interface DigestUnitRef {
  readonly document: SourceDocument
  readonly revision: SourceRevision
  readonly unit: SourceUnit
}

/** 一组模型调用对应的资料摘要。 */
interface DigestGroup {
  readonly index: number
  readonly total: number
  readonly text: string
  readonly documentIds: readonly string[]
}

/** LLM-wiki 回退的资料摘要（digest）。 */
interface StructureDigest {
  readonly groups: readonly DigestGroup[]
  readonly anchorIndex: ReadonlyMap<string, DigestUnitRef>
  readonly documentCount: number
  readonly digestedDocumentCount: number
  readonly totalChars: number
  readonly warnings: readonly string[]
}

interface StructurePrompt {
  readonly system: string
  readonly messages: readonly { role: 'user' | 'assistant'; text: string }[]
  readonly json: NonNullable<ModelRequest['json']>
}

/** LLM-wiki 回退：生成虚拟 wiki 式章节/概念结构并持久化。 */
async function runLlmWikiPath(
  deps: DraftDeps,
  input: CourseDraftInput,
  context: KbContext,
  signal?: AbortSignal,
): Promise<Result<CourseRevision>> {
  if (deps.model === undefined) {
    return err('capability-missing', '当前没有可用的模型客户端，无法生成课程草案')
  }
  const digest = buildStructureDigest(context, input, deps.limits)
  if (digest.groups.length === 0) {
    return err('invalid-input', '课程没有可用于生成结构的资料摘要')
  }
  const maxCalls = Math.max(1, deps.limits.draftLlmWikiGroupCallsMax)
  let calls = 0
  const results: ValidatedStructure[] = []
  const warnings: string[] = [...digest.warnings]
  const notes: string[] = []
  for (const group of digest.groups) {
    if (isSignalAborted(signal)) return err('cancelled', '课程草案生成已取消')
    if (calls >= maxCalls) {
      warnings.push(`模型调用次数达到上限（${maxCalls}），剩余 ${digest.groups.length - group.index + 1} 组资料未覆盖`)
      break
    }
    calls += 1
    let attempt = await generateGroupStructure(deps, input, context, digest, group, signal)
    if (!attempt.ok && attempt.error.code === 'uncertain' && calls < maxCalls) {
      calls += 1
      attempt = await generateGroupStructure(deps, input, context, digest, group, signal, attempt.error.repair)
    }
    if (!attempt.ok) {
      if (attempt.error.code === 'cancelled') return err('cancelled', '课程草案生成已取消')
      warnings.push(`资料分组 ${group.index}/${group.total} 的结构生成失败：${attempt.error.message}`)
      notes.push(`分组 ${group.index}/${group.total} 未覆盖`)
      continue
    }
    results.push(attempt.value)
  }
  if (results.length === 0) {
    return err('uncertain', '模型未能生成可用的课程结构（JSON 无效或缺少概念），未保存草案；可重试或先用随问随学', {
      details: { calls, groups: digest.groups.length },
      retryable: true,
    })
  }
  const merged = mergeValidatedStructures(results, input, deps.limits, warnings)
  if (merged.concepts.length === 0) {
    return err('uncertain', '模型返回的结构中没有有效概念，未保存草案', { details: { calls } })
  }
  const digestedDocIds = new Set(digest.groups.flatMap(group => [...group.documentIds]))
  const sources: CourseSourceRef[] = context.material.documents
    .filter(material => digestedDocIds.has(material.document.id))
    .map(material => {
      const role: KbSourceRole = context.detection.roleByDocumentId.get(material.document.id) ?? 'unknown'
      return {
        sourceId: material.document.id,
        role: role === 'unknown' ? ROLE_BY_FORMAT[material.document.format] : kbRoleToSourceRole(role),
      }
    })
  const basedOn = context.material.documents
    .filter(material => digestedDocIds.has(material.document.id))
    .map(material => ({ sourceId: material.document.id, revisionId: material.revision.id }))
  const changeSummary = describeLlmWikiResult({
    input,
    digest,
    merged,
    calls,
    warnings,
  })
  const data: StructureData = {
    goals: merged.goals,
    concepts: merged.concepts,
    chapters: merged.chapters,
    sources,
    basedOn,
    provenance: 'llm-wiki',
    changeSummary,
  }
  try {
    return ok(await persistStructureRevision(deps, input, data))
  } catch (cause) {
    return toResultError(cause, '课程草案保存失败')
  }
}

function describeLlmWikiResult(input: {
  readonly input: CourseDraftInput
  readonly digest: StructureDigest
  readonly merged: { readonly concepts: readonly StructureConceptInput[]; readonly chapters: readonly StructureChapterInput[]; readonly notes: readonly string[] }
  readonly calls: number
  readonly warnings: readonly string[]
}): string {
  const chapterCount = input.merged.chapters.filter(chapter => chapter.role === 'chapter').length
  const toolCount = input.merged.chapters.filter(chapter => chapter.role === 'tool').length
  const anchorCount = input.merged.concepts.reduce((sum, concept) => sum + concept.anchors.length, 0)
  const coverage = `${input.digest.digestedDocumentCount}/${input.digest.documentCount} 份资料`
  const parts = [
    `LLM-wiki 回退（llm-wiki）：按 skill 规则从 ${coverage} 生成 ${chapterCount} 章 + ${toolCount} 个工具章节 + ${input.merged.concepts.length} 个概念`,
    `${anchorCount} 个资料锚点；模型调用 ${input.calls} 次`,
  ]
  const noteText = [...input.merged.notes, ...(input.input.instruction === undefined ? [] : [`学生修改要求：${input.input.instruction.trim().slice(0, 80)}`])]
  if (noteText.length > 0) parts.push(`说明：${noteText.slice(0, 2).join('；')}`)
  if (input.warnings.length > 0) parts.push(`警告：${input.warnings.slice(0, 2).join('；')}`)
  return parts.join('；').slice(0, 600)
}

/* ------------------------------------------------------------------ digest */

function normalizeHeadingPath(unit: SourceUnit): string {
  const path = unit.locator.sectionPath
  if (path !== undefined && path.length > 0) return path.join(' > ')
  return unit.text
}

/** 从全部资料生成 LLM-wiki 式 digest：标题树 + 首段 + 可引用单元。 */
function buildStructureDigest(
  context: KbContext,
  _input: CourseDraftInput,
  limits: CorpusLimits,
): StructureDigest {
  const pageByDocumentId = new Map<string, KbPage>()
  for (const page of context.pages) pageByDocumentId.set(page.document.id, page)
  const warnings: string[] = []
  const anchorIndex = new Map<string, DigestUnitRef>()
  const blocks: { readonly documentId: string; readonly text: string }[] = []
  const documentCount = context.material.documents.length
  const docCharLimit = Math.max(300, limits.draftLlmWikiDocChars)
  const headingLimit = Math.max(4, limits.draftLlmWikiHeadingsPerDoc)
  let truncatedDocs = 0
  let skippedDocuments = 0

  for (let index = 0; index < context.material.documents.length; index += 1) {
    const material = context.material.documents[index] as MaterialDocument
    const document = material.document
    const role: KbSourceRole = context.detection.roleByDocumentId.get(document.id) ?? 'unknown'
    // 日志/图片资产不是教学结构来源：跳过以避免占满摘要预算（不计入 digestedDocumentCount）
    if (role === 'log' || role === 'raw-asset' || role === 'visual-asset') {
      skippedDocuments += 1
      continue
    }
    const page = pageByDocumentId.get(document.id)
    const headingUnits = material.units.filter(unit => unit.kind === 'heading')
    const paragraphUnit = material.units.find(unit => unit.kind === 'paragraph')
      ?? material.units.find(unit => unit.kind !== 'heading')
    const specialUnit = material.units.find(unit => unit.kind === 'formula' || unit.kind === 'table'
      || unit.kind === 'code' || unit.kind === 'figure')
    const representative = [headingUnits[0], paragraphUnit, specialUnit]
      .filter((unit): unit is SourceUnit => unit !== undefined)
      .filter((unit, position, all) => all.findIndex(item => item.id === unit.id) === position)
      .slice(0, 4)
    const header = `[D${index + 1}] documentId=${document.id} role=${role} format=${document.format} revision=${material.revision.id} title=《${document.title}》`
    const headingLines: string[] = []
    for (const unit of headingUnits.slice(0, headingLimit)) {
      const path = normalizeHeadingPath(unit)
      if (path !== '') headingLines.push(`  - ${path}`)
    }
    const firstParagraph = page?.firstParagraph
      ?? (paragraphUnit === undefined ? '' : excerptAround(paragraphUnit.text, [], 260))
    const unitLines: string[] = []
    for (const unit of representative) {
      const key = `${document.id}|${unit.id}`
      anchorIndex.set(key, { document, revision: material.revision, unit })
      unitLines.push(`  可引用单元: unitId=${unit.id} (${locatorDescription(unit.locator)}) ${excerptAround(unit.text, [], 160)}`)
    }
    const pieces = [header, ...unitLines]
    if (headingLines.length > 0) pieces.push('  标题树:', ...headingLines)
    if (firstParagraph !== '') pieces.push(`  首段: ${truncateText(firstParagraph, 260)}`)
    let block = pieces.join('\n')
    if (block.length > docCharLimit) {
      block = `${block.slice(0, Math.max(0, docCharLimit - 12)).trimEnd()}\n…（截断）`
      truncatedDocs += 1
    }
    blocks.push({ documentId: document.id, text: block })
  }
  if (truncatedDocs > 0) warnings.push(`${truncatedDocs} 份资料的摘要被截断（单份上限 ${docCharLimit} 字符）`)
  if (skippedDocuments > 0) warnings.push(`${skippedDocuments} 份日志/图片资产资料未纳入结构摘要（不参与概念生成）`)

  const budget = Math.max(2_000, limits.draftLlmWikiBudgetChars)
  const totalChars = blocks.reduce((sum, block) => sum + block.text.length + 1, 0)
  const maxCalls = Math.max(1, limits.draftLlmWikiGroupCallsMax)
  const rawGroups: { index: number; text: string; documentIds: string[] }[] = []
  if (totalChars <= budget || maxCalls === 1) {
    rawGroups.push({ index: 1, text: blocks.map(block => block.text).join('\n'), documentIds: blocks.map(block => block.documentId) })
  } else {
    const needed = Math.ceil(totalChars / budget)
    const groupCount = Math.min(maxCalls, Math.max(1, needed))
    const buckets: { chars: number; blocks: { documentId: string; text: string }[] }[] = Array.from(
      { length: groupCount },
      () => ({ chars: 0, blocks: [] }),
    )
    for (const block of [...blocks].sort((a, b) => b.text.length - a.text.length)) {
      let target = buckets[0] as { chars: number; blocks: { documentId: string; text: string }[] }
      for (const bucket of buckets) {
        if (bucket.chars < target.chars) target = bucket
      }
      target.blocks.push(block)
      target.chars += block.text.length + 1
    }
    for (const bucket of buckets) {
      if (bucket.blocks.length === 0) continue
      let text = ''
      const documentIds: string[] = []
      let droppedHere = 0
      for (const block of bucket.blocks) {
        if (text.length > 0 && text.length + block.text.length > budget) {
          droppedHere += 1
          continue
        }
        if (text.length > 0) text += '\n'
        text += block.text
        documentIds.push(block.documentId)
      }
      if (droppedHere > 0) {
        warnings.push(`资料分组 ${rawGroups.length + 1} 超出摘要预算，${droppedHere} 份资料未覆盖`)
        text += `\n（本组还有 ${droppedHere} 份资料因预算未列出）`
      }
      rawGroups.push({ index: rawGroups.length + 1, text, documentIds })
    }
  }
  const groups: DigestGroup[] = rawGroups.map(group => ({
    index: group.index,
    total: rawGroups.length,
    text: group.text,
    documentIds: group.documentIds,
  }))
  const digestedIds = new Set(groups.flatMap(group => [...group.documentIds]))
  const digestedDocumentCount = digestedIds.size
  if (digestedDocumentCount < documentCount) {
    warnings.push(`digest 覆盖 ${digestedDocumentCount}/${documentCount} 份资料（预算 ${budget} 字符/组，最多 ${maxCalls} 组）`)
  }
  // 只允许引用实际出现在分组中的资料单元
  for (const key of [...anchorIndex.keys()]) {
    const documentId = key.slice(0, key.indexOf('|'))
    if (!digestedIds.has(documentId)) anchorIndex.delete(key)
  }
  return { groups, anchorIndex, documentCount, digestedDocumentCount, totalChars, warnings }
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

/* ------------------------------------------------------------------ 模型调用与校验 */

interface ValidatedConceptDraft {
  readonly title: string
  readonly summary: string
  readonly prerequisites: readonly string[]
  readonly anchors: readonly SourceAnchor[]
  readonly difficulty?: ConceptDifficulty
  readonly misconceptions: readonly string[]
  readonly checkIdeas: readonly string[]
}

interface ValidatedStructure {
  readonly chapters: readonly StructureChapterInput[]
  readonly concepts: readonly ValidatedConceptDraft[]
  readonly goals: readonly string[]
  readonly notes: readonly string[]
  readonly warnings: readonly string[]
}

interface StructureAttemptError {
  readonly code: 'uncertain' | 'cancelled' | 'failed' | 'capability-missing'
  readonly message: string
  readonly repair?: { readonly lastText: string; readonly reason: string }
}

type StructureAttempt = { readonly ok: true; readonly value: ValidatedStructure } | { readonly ok: false; readonly error: StructureAttemptError }

/** 对一组资料调用一次模型并校验结构 JSON。 */
async function generateGroupStructure(
  deps: DraftDeps,
  input: CourseDraftInput,
  context: KbContext,
  digest: StructureDigest,
  group: DigestGroup,
  signal?: AbortSignal,
  repair?: { readonly lastText: string; readonly reason: string },
): Promise<StructureAttempt> {
  if (deps.model === undefined) {
    return { ok: false, error: { code: 'capability-missing', message: '没有可用的模型客户端' } }
  }
  const prompt = buildStructurePrompt(input, context, group, repair)
  const request: ModelRequest = {
    messages: prompt.messages,
    system: prompt.system,
    json: prompt.json,
    purpose: 'course-draft',
    language: input.language,
    maxTokens: 6_000,
    temperature: 0.2,
  }
  let completion
  try {
    completion = await deps.model.complete(request, signal)
  } catch (cause) {
    const mapped = mapModelFailure(cause, signal)
    if (!mapped.ok) {
      const code = mapped.error.code
      const attemptCode: StructureAttemptError['code'] = code === 'cancelled'
        ? 'cancelled'
        : code === 'capability-missing'
          ? 'capability-missing'
          : 'failed'
      return { ok: false, error: { code: attemptCode, message: mapped.error.message } }
    }
  }
  if (isSignalAborted(signal)) return { ok: false, error: { code: 'cancelled', message: '课程草案生成已取消' } }
  const rawText = completion?.text ?? ''
  const candidate = completion?.json !== undefined ? completion.json : tryParseJson(rawText)
  if (candidate === undefined) {
    const reason = completion?.parseError ?? '输出不是合法 JSON'
    return { ok: false, error: { code: 'uncertain', message: reason, repair: { lastText: rawText, reason } } }
  }
  const validated = validateStructureValue(candidate, digest, input, deps.limits)
  if (!validated.ok) {
    return {
      ok: false,
      error: { code: 'uncertain', message: validated.error, repair: { lastText: rawText, reason: validated.error } },
    }
  }
  return { ok: true, value: validated.value }
}

function buildStructurePrompt(
  input: CourseDraftInput,
  context: KbContext,
  group: DigestGroup,
  repair?: { readonly lastText: string; readonly reason: string },
): StructurePrompt {
  const languageHint = input.language === 'en'
    ? '使用英文输出章节与概念标题/摘要'
    : input.language === 'bilingual'
      ? '标题使用中文并保留英文术语，摘要使用中文'
      : '使用中文输出，保留原文英文术语'
  const roleSummary = context.detection.facts.isKnowledgeBase
    ? `资料角色：${context.detection.facts.signals.filter(signal => signal.matched).map(signal => signal.label).join('；')}`
    : '这些资料没有知识库结构（无 SCHEMA/index/frontmatter 结构），请创建虚拟 wiki 结构。'
  const userText = [
    `课程：${input.courseTitle}`,
    `学习目标：${input.goal}`,
    `学生基础：${input.background ?? '未提供'}`,
    `输出语言：${languageHint}`,
    '',
    roleSummary,
    `资料分组：${group.index}/${group.total}`,
    '',
    '以下是资料摘要（documentId / unitId 是真实标识，锚点只能引用这里出现的 id）：',
    group.text,
    '',
    '请按 Karpathy LLM Wiki 方法输出课程结构（只输出 JSON 对象）：',
    '1. sections：按学习顺序分章（每章 title/summary/role=chapter|appendix|tool），每个 chapter 里放 concepts；',
    '2. 概念页面阈值：一个概念/实体在 2+ 份资料出现，或对单份资料的核心内容，才建立概念；passing mention 不建；',
    '3. 每个 concept 必须有：title、一句话 summary、anchors（仅引用上面出现的 documentId+unitId，可 0-4 个）、difficulty=intro|core|advanced，可选 prerequisites（其他概念 title）、misconceptions、checkIdeas；',
    '4. 概念之间要形成可学习的顺序（章节顺序 + prerequisites 表达交叉链接），课程整体 4-15 个章节（资料少时可减少）；',
    '5. 资料不足时在 notes 里说明，不得编造资料中不存在的事实或 documentId/unitId；',
    '6. 只输出 JSON：{"sections":[{"title":"...","summary":"...","role":"chapter","concepts":[...]}],"goals":["..."],"notes":["..."]}。',
    '',
    ...(input.instruction !== undefined && input.instruction.trim() !== ''
      ? [`学生修改要求：${input.instruction.trim().slice(0, 1000)}`, '']
      : []),
  ].join('\n')
  const messages: { role: 'user' | 'assistant'; text: string }[] = [{ role: 'user', text: userText }]
  if (repair !== undefined) {
    messages.push({ role: 'assistant', text: repair.lastText.slice(0, 4_000) })
    messages.push({
      role: 'user',
      text: `上一次输出无法解析为所需 JSON（${repair.reason}）。请只重新输出一次合法的 JSON 对象，不要解释、不要 Markdown 代码围栏，并遵守同样的锚点约束。`,
    })
  }
  return {
    system: '你是严谨的课程结构设计器。遵循 Karpathy LLM Wiki 方法：区分原始资料/概念页/索引；只给达到页面阈值的概念建页；概念之间要有交叉链接与学习顺序；锚点只能引用给定资料摘要中真实出现的 documentId 与 unitId，不确定时宁可不引用。只输出合法 JSON。',
    messages,
    json: {
      name: 'course-structure-wiki',
      description: 'LLM-wiki 式课程结构：章节、概念、一句话摘要、资料锚点',
      fields: {
        sections: '章节数组，每章含 title/summary/role/concepts',
        concepts: '每章内概念数组：title/summary/anchors/prerequisites/difficulty/misconceptions/checkIdeas',
        goals: 'string[] 学习目标',
        notes: 'string[] 资料不足或覆盖说明',
      },
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function asStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed === '') continue
    out.push(trimmed.slice(0, maxLength))
    if (out.length >= maxItems) break
  }
  return out
}

function asDifficulty(value: unknown): ConceptDifficulty | undefined {
  return value === 'intro' || value === 'core' || value === 'advanced' ? value : undefined
}

function chapterRoleOf(rawRole: unknown, title: string): 'chapter' | 'appendix' | 'tool' {
  if (rawRole === 'chapter' || rawRole === 'appendix' || rawRole === 'tool') return rawRole
  if (/工具|tool/i.test(title)) return 'tool'
  if (/附录|appendix|其他|补充/i.test(title)) return 'appendix'
  return 'chapter'
}

function validateAnchors(
  rawAnchors: unknown,
  digest: StructureDigest,
): { anchors: SourceAnchor[]; invalid: number } {
  const anchors: SourceAnchor[] = []
  let invalid = 0
  if (!Array.isArray(rawAnchors)) return { anchors, invalid }
  for (const rawAnchor of rawAnchors.slice(0, 6)) {
    const record = asRecord(rawAnchor)
    if (record === undefined) {
      invalid += 1
      continue
    }
    const documentId = record['documentId']
    const unitId = record['unitId']
    if (typeof documentId !== 'string' || typeof unitId !== 'string') {
      invalid += 1
      continue
    }
    const found = digest.anchorIndex.get(`${documentId}|${unitId}`)
    if (found === undefined) {
      invalid += 1
      continue
    }
    anchors.push({
      documentId: found.document.id,
      revisionId: found.revision.id,
      unitId: found.unit.id,
      locator: found.unit.locator,
      excerpt: excerptAround(found.unit.text, [], 240),
      confidence: found.unit.confidence,
      label: `${found.document.title} · ${locatorDescription(found.unit.locator)}`,
    })
  }
  return { anchors, invalid }
}

interface ValidationFailure {
  readonly ok: false
  readonly error: string
}

interface ValidationSuccess {
  readonly ok: true
  readonly value: ValidatedStructure
}

/** 校验模型输出的结构 JSON（支持新 sections 结构与旧版扁平 concepts 兼容）。 */
function validateStructureValue(
  value: unknown,
  digest: StructureDigest,
  input: CourseDraftInput,
  limits: CorpusLimits,
): ValidationSuccess | ValidationFailure {
  const record = asRecord(value)
  if (record === undefined) return { ok: false, error: '根节点不是 JSON 对象' }
  const maxConcepts = Math.max(1, limits.draftLlmWikiMaxConcepts)
  const warnings: string[] = []
  const notes = asStringArray(record['notes'], 8, 300)
  const goals = asStringArray(record['goals'], 10, 240)
  const concepts: ValidatedConceptDraft[] = []
  interface MutableChapterDraft {
    title: string
    summary?: string
    role: 'chapter' | 'appendix' | 'tool'
    conceptTitles: string[]
  }
  const chapters: MutableChapterDraft[] = []
  const seenTitles = new Set<string>()
  let invalidAnchors = 0
  let truncatedConcepts = 0
  let anchorlessConcepts = 0
  let rawSections: unknown
  if (Array.isArray(record['sections'])) {
    rawSections = record['sections']
  } else if (Array.isArray(record['concepts'])) {
    // 兼容旧版扁平输出：视为单章节结构
    rawSections = [{
      title: `${input.courseTitle} · 资料结构`,
      summary: '模型未返回章节分区，按概念列表生成单章结构',
      role: 'chapter',
      concepts: record['concepts'],
    }]
    warnings.push('模型返回旧版扁平结构（无 sections），已归入单章节')
  } else {
    return { ok: false, error: 'sections 必须是数组（或兼容旧版 concepts 数组）' }
  }
  let sectionCount = 0
  for (const rawSection of (rawSections as unknown[]).slice(0, 40)) {
    sectionCount += 1
    const sectionRecord = asRecord(rawSection)
    if (sectionRecord === undefined) continue
    const sectionTitle = typeof sectionRecord['title'] === 'string'
      ? sectionRecord['title'].trim().slice(0, 120)
      : ''
    const title = sectionTitle === '' ? `第 ${sectionCount} 部分` : sectionTitle
    const chapterConceptTitles: string[] = []
    const rawConcepts = Array.isArray(sectionRecord['concepts']) ? sectionRecord['concepts'] : []
    for (const rawConcept of rawConcepts) {
      if (concepts.length >= maxConcepts) {
        truncatedConcepts += 1
        continue
      }
      const conceptRecord = asRecord(rawConcept)
      if (conceptRecord === undefined) continue
      const conceptTitle = typeof conceptRecord['title'] === 'string' ? conceptRecord['title'].trim().slice(0, 120) : ''
      if (conceptTitle === '' || seenTitles.has(conceptTitle)) continue
      seenTitles.add(conceptTitle)
      const { anchors, invalid } = validateAnchors(conceptRecord['anchors'], digest)
      invalidAnchors += invalid
      if (anchors.length === 0) anchorlessConcepts += 1
      concepts.push({
        title: conceptTitle,
        summary: typeof conceptRecord['summary'] === 'string'
          ? conceptRecord['summary'].trim().slice(0, 1_200)
          : '',
        prerequisites: asStringArray(conceptRecord['prerequisites'], 8, 120)
          .filter(prerequisite => prerequisite !== conceptTitle),
        anchors,
        ...(asDifficulty(conceptRecord['difficulty']) !== undefined
          ? { difficulty: asDifficulty(conceptRecord['difficulty']) }
          : {}),
        misconceptions: asStringArray(conceptRecord['misconceptions'], 5, 240),
        checkIdeas: asStringArray(conceptRecord['checkIdeas'], 5, 240),
      })
      chapterConceptTitles.push(conceptTitle)
    }
    const role = chapterRoleOf(sectionRecord['role'], title)
    chapters.push({
      title,
      ...(typeof sectionRecord['summary'] === 'string' && sectionRecord['summary'].trim() !== ''
        ? { summary: sectionRecord['summary'].trim().slice(0, 400) }
        : {}),
      role,
      conceptTitles: chapterConceptTitles,
    })
  }
  if (concepts.length === 0) return { ok: false, error: 'sections 中没有有效概念（需要含非空 title 的对象）' }
  if (truncatedConcepts > 0) warnings.push(`概念超过上限（${maxConcepts}），已丢弃 ${truncatedConcepts} 个`)
  if (invalidAnchors > 0) {
    warnings.push(`${invalidAnchors} 个模型引用无法对应到资料摘要中的真实单元，已丢弃（不伪造来源定位）`)
  }
  if (anchorlessConcepts > 0 && digest.documentCount > 0) {
    warnings.push(`${anchorlessConcepts} 个概念没有资料锚点，教学时会标注为模型知识`)
  }
  // 章节必须覆盖所有概念：未分配的概念补到最后一章（或新建章节）
  const covered = new Set(chapters.flatMap(chapter => chapter.conceptTitles))
  const missing = concepts.map(concept => concept.title).filter(title => !covered.has(title))
  if (missing.length > 0) {
    const last = chapters[chapters.length - 1]
    if (last === undefined) chapters.push({ title: '课程主线', role: 'chapter', conceptTitles: missing })
    else last.conceptTitles.push(...missing)
    warnings.push(`${missing.length} 个概念未归入模型给出的章节，已附到最后一章`)
  }
  const finalChapters = chapters.filter(chapter => chapter.conceptTitles.length > 0 || chapter.role === 'tool')
  return {
    ok: true,
    value: {
      chapters: finalChapters,
      concepts,
      goals,
      notes,
      warnings,
    },
  }
}

/* ------------------------------------------------------------------ 分组合并 */

interface MergedStructure {
  readonly concepts: readonly StructureConceptInput[]
  readonly chapters: readonly StructureChapterInput[]
  readonly goals: readonly string[]
  readonly notes: readonly string[]
}

function mergeValidatedStructures(
  results: readonly ValidatedStructure[],
  input: CourseDraftInput,
  _limits: CorpusLimits,
  warnings: string[],
): MergedStructure {
  const conceptByTitle = new Map<string, StructureConceptInput>()
  interface MergedChapterDraft {
    title: string
    summary?: string
    role: 'chapter' | 'appendix' | 'tool'
    conceptTitles: string[]
  }
  const chapterByTitle = new Map<string, MergedChapterDraft>()
  const notes: string[] = []
  const goals: string[] = []
  for (const result of results) {
    warnings.push(...result.warnings)
    notes.push(...result.notes)
    for (const goal of result.goals) {
      if (!goals.includes(goal) && goals.length < 10) goals.push(goal)
    }
    for (const concept of result.concepts) {
      if (conceptByTitle.has(concept.title)) {
        warnings.push(`跨分组重复概念《${concept.title}》，保留首次出现的定义`)
        continue
      }
      conceptByTitle.set(concept.title, {
        title: concept.title,
        summary: concept.summary,
        prerequisites: concept.prerequisites,
        anchors: concept.anchors,
        ...(concept.difficulty !== undefined ? { difficulty: concept.difficulty } : {}),
        ...(concept.misconceptions.length > 0 ? { misconceptions: concept.misconceptions } : {}),
        ...(concept.checkIdeas.length > 0 ? { checkIdeas: concept.checkIdeas } : {}),
      })
    }
    for (const chapter of result.chapters) {
      const key = chapter.title.toLowerCase().replace(/\s+/g, ' ').trim()
      const existing = chapterByTitle.get(key)
      if (existing === undefined) {
        chapterByTitle.set(key, {
          title: chapter.title,
          ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
          role: chapter.role,
          conceptTitles: [...chapter.conceptTitles],
        })
        continue
      }
      for (const title of chapter.conceptTitles) {
        if (!existing.conceptTitles.includes(title)) existing.conceptTitles.push(title)
      }
      if (existing.summary === undefined && chapter.summary !== undefined) existing.summary = chapter.summary
    }
  }
  const knownTitles = new Set(conceptByTitle.keys())
  const inputGoal = input.goal.trim().slice(0, 240)
  const mergedGoals = inputGoal === '' ? goals : [inputGoal, ...goals.filter(goal => goal !== inputGoal)]
  const concepts = [...conceptByTitle.values()]
  const chapterEntries = [...chapterByTitle.values()].map(chapter => ({
    ...chapter,
    conceptTitles: chapter.conceptTitles.filter(title => knownTitles.has(title)),
  }))
  const covered = new Set(chapterEntries.flatMap(chapter => chapter.conceptTitles))
  const missing = concepts.map(concept => concept.title).filter(title => !covered.has(title))
  if (missing.length > 0) {
    chapterEntries.push({ title: '其他概念', role: 'appendix', conceptTitles: missing })
  }
  const chapters: StructureChapterInput[] = chapterEntries.map(chapter => ({
    title: chapter.title,
    ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
    role: chapter.role,
    conceptTitles: chapter.conceptTitles,
  }))
  return { concepts, chapters, goals: mergedGoals, notes }
}

/* ------------------------------------------------------------------ 持久化 */

function titleIdMap(concepts: readonly StructureConceptInput[]): Map<string, ReturnType<typeof newConceptId>> {
  const map = new Map<string, ReturnType<typeof newConceptId>>()
  for (const concept of concepts) map.set(concept.title, newConceptId())
  return map
}

/** 把结构数据持久化为不可变 draft 修订（两种模式共用）。 */
async function persistStructureRevision(
  deps: DraftDeps,
  input: CourseDraftInput,
  data: StructureData,
): Promise<CourseRevision> {
  const course = await deps.courses.get(input.courseId)
  if (course === undefined) throw new Error('课程不存在')
  const existing = await deps.courses.listRevisions(input.courseId)
  const version = existing.reduce((max, revision) => Math.max(max, revision.version), 0) + 1
  // 旧草案标记为 superseded（保留历史）
  if (course.draftRevisionId !== undefined) {
    const oldDraft = await deps.courses.getRevision(course.id, course.draftRevisionId)
    if (oldDraft !== undefined && oldDraft.state === 'draft') {
      await deps.courses.saveRevision({ ...oldDraft, state: 'superseded' })
    }
  }
  const idsByTitle = titleIdMap(data.concepts)
  const concepts: Concept[] = data.concepts.map(concept => {
    const id = idsByTitle.get(concept.title)
    if (id === undefined) throw new Error(`概念缺少 id：${concept.title}`)
    const prerequisites = concept.prerequisites
      .map(prerequisite => idsByTitle.get(prerequisite))
      .filter((value): value is ReturnType<typeof newConceptId> => value !== undefined && value !== id)
    return {
      id,
      title: concept.title,
      summary: concept.summary,
      prerequisites: [...new Set(prerequisites)],
      sourceAnchors: concept.anchors,
      ...(concept.difficulty !== undefined ? { difficulty: concept.difficulty } : {}),
      ...(concept.misconceptions !== undefined && concept.misconceptions.length > 0
        ? { misconceptions: concept.misconceptions }
        : {}),
      ...(concept.checkIdeas !== undefined && concept.checkIdeas.length > 0
        ? { checkIdeas: concept.checkIdeas }
        : {}),
    }
  })
  const conceptsById = new Map(concepts.map(concept => [concept.id, concept]))
  const chapters: CourseChapter[] = []
  for (const [chapterIndex, chapter] of data.chapters.entries()) {
    const conceptIds = chapter.conceptTitles
      .map(title => idsByTitle.get(title))
      .filter((id): id is ReturnType<typeof newConceptId> => id !== undefined && conceptsById.has(id))
    chapters.push({
      id: `chapter-${chapterIndex + 1}-${chapter.title.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section'}`,
      title: chapter.title,
      ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
      conceptIds: [...new Set(conceptIds)],
      ...(chapter.anchors !== undefined && chapter.anchors.length > 0 ? { sourceAnchors: chapter.anchors } : {}),
      role: chapter.role,
    })
  }
  const visibleChapters = chapters.filter(chapter => chapter.conceptIds.length > 0)
  // 防御：确实存在章节时，保证每个概念恰好出现在一个章节
  const chapterCovered = new Set(visibleChapters.flatMap(chapter => chapter.conceptIds))
  const uncovered = concepts.filter(concept => !chapterCovered.has(concept.id))
  if (uncovered.length > 0) {
    if (visibleChapters.length === 0) {
      visibleChapters.push({
        id: 'chapter-main',
        title: '课程主线',
        conceptIds: uncovered.map(concept => concept.id),
        role: 'chapter',
      })
    } else {
      const last = visibleChapters[visibleChapters.length - 1] as CourseChapter
      visibleChapters[visibleChapters.length - 1] = {
        ...last,
        conceptIds: [...last.conceptIds, ...uncovered.map(concept => concept.id)],
      }
    }
  }
  const chapterConceptIds = visibleChapters.flatMap(chapter => [...chapter.conceptIds])
  const requestedSequence = data.sequenceTitles !== undefined
    ? data.sequenceTitles
      .map(title => idsByTitle.get(title))
      .filter((id): id is ReturnType<typeof newConceptId> => id !== undefined)
    : []
  const sequence = [...new Set([...requestedSequence, ...chapterConceptIds])]
  const revision: CourseRevision = {
    id: newCourseRevisionId(),
    courseId: course.id,
    version,
    createdAt: nowIso(),
    state: 'draft',
    provenance: data.provenance,
    goals: data.goals.length > 0 ? [...data.goals] : buildGoals(input),
    ...(input.background !== undefined && input.background.trim() !== ''
      ? { background: input.background.trim() }
      : {}),
    language: input.language,
    sources: data.sources,
    concepts,
    sequence,
    ...(visibleChapters.length > 0 ? { chapters: visibleChapters } : {}),
    changeSummary: data.changeSummary,
    basedOn: data.basedOn,
  }
  await deps.courses.saveRevision(revision)
  await deps.courses.save({ ...course, draftRevisionId: revision.id })
  return revision
}

/* ------------------------------------------------------------------ Coverage */

/** CourseDraftView 的 coverage/warnings 数据来源。 */
export interface DraftCoverageData {
  readonly coverage: CourseDraftView['coverage']
  readonly warnings: readonly string[]
}

/** 计算课程草案的覆盖情况与确认前提示。 */
export async function buildDraftCoverage(
  deps: Pick<DraftDeps, 'store' | 'courses'>,
  courseId: string,
  revisionId?: string,
): Promise<Result<DraftCoverageData>> {
  const course = await deps.courses.get(courseId)
  if (course === undefined) return err('not-found', '课程不存在或已被删除')
  const targetRevisionId = revisionId ?? course.draftRevisionId ?? course.activeRevisionId
  if (targetRevisionId === undefined) {
    return err('not-found', '该课程还没有课程结构草案或已确认版本')
  }
  const revision = await deps.courses.getRevision(courseId, targetRevisionId)
  if (revision === undefined) return err('not-found', '课程结构修订不存在')
  const warnings: string[] = []
  const coverage: CourseDraftView['coverage'][number][] = []
  const usedUnitCount = new Map<string, number>()
  for (const concept of revision.concepts) {
    for (const anchor of concept.sourceAnchors) {
      usedUnitCount.set(anchor.documentId, (usedUnitCount.get(anchor.documentId) ?? 0) + 1)
    }
  }
  // 章节锚点（章节概览页）也算作被使用的资料单元
  for (const chapter of revision.chapters ?? []) {
    for (const anchor of chapter.sourceAnchors ?? []) {
      usedUnitCount.set(anchor.documentId, (usedUnitCount.get(anchor.documentId) ?? 0) + 1)
    }
  }
  const sourceIds = [...new Set([
    ...revision.sources.map(source => source.sourceId),
    ...revision.concepts.flatMap(concept => concept.sourceAnchors.map(anchor => anchor.documentId)),
  ])]
  for (const sourceId of sourceIds) {
    const document = await deps.store.readDocument(sourceId)
    if (document === undefined) {
      warnings.push(`资料 ${sourceId} 已被删除，草案中的相关定位可能失效`)
      coverage.push({ sourceId, title: '（资料已删除）', status: 'missing', usedUnits: 0, issues: 1 })
      continue
    }
    const meta = document.currentRevisionId !== undefined
      ? await deps.store.readRevisionMeta(document.id, document.currentRevisionId)
      : undefined
    const usedUnits = usedUnitCount.get(document.id) ?? 0
    coverage.push({
      sourceId: document.id,
      title: document.title,
      status: meta?.status ?? document.status,
      usedUnits,
      issues: meta?.issueCount ?? 0,
    })
    if (meta?.status === 'needs-review') {
      warnings.push(`《${document.title}》有需要核对的抽取问题（${meta.issueCount} 条），相关概念建议学习前核对原文`)
    }
    if (meta?.status === 'failed') {
      warnings.push(`《${document.title}》解析失败，草案可能缺少该资料的内容`)
    }
    const structuralDocument = /(^|\/)(schema|index|log|error-log)(-\d{4})?\.md$/i.test(document.originalPath)
      || /overview/i.test(document.title + document.originalPath)
    if (usedUnits === 0 && !structuralDocument && revision.sources.some(source => source.sourceId === document.id)) {
      warnings.push(`《${document.title}》没有被任何概念引用，可能只是辅助资料`)
    }
  }
  if (sourceIds.length === 0) {
    warnings.push('该课程草案没有引用任何资料，教学时会把概念标注为模型知识')
  }
  const withoutAnchors = revision.concepts.filter(concept => concept.sourceAnchors.length === 0)
  if (withoutAnchors.length > 0) {
    warnings.push(`${withoutAnchors.length} 个概念没有资料定位：${withoutAnchors.slice(0, 5).map(concept => concept.title).join('、')}`)
  }
  if (revision.chapters !== undefined && revision.chapters.length > 0) {
    const chapterConceptIds = new Set(revision.chapters.flatMap(chapter => chapter.conceptIds))
    const chapterless = revision.concepts.filter(concept => !chapterConceptIds.has(concept.id))
    if (chapterless.length > 0) {
      warnings.push(`${chapterless.length} 个概念不属于任何章节，学习中会按平铺顺序展示`)
    }
  }
  if (revision.provenance === 'kb-structure') {
    warnings.push('结构来源：知识库结构直读（kb-structure）；资料或知识库结构变化后建议重新生成')
  } else if (revision.provenance === 'llm-wiki') {
    warnings.push('结构来源：按 LLM-wiki 规则生成的虚拟结构（llm-wiki），未写入学生原始知识库')
  }
  const revisionIds = new Set(revision.basedOn.map(item => item.revisionId))
  let staleAnchors = 0
  for (const concept of revision.concepts) {
    for (const anchor of concept.sourceAnchors) {
      if (!revisionIds.has(anchor.revisionId as string)) staleAnchors += 1
    }
  }
  if (staleAnchors > 0) {
    warnings.push(`${staleAnchors} 个资料定位指向草案基于的旧修订，资料更新后需要重新生成或核对`)
  }
  return ok({ coverage, warnings })
}

/* ------------------------------------------------------------------ 工具 */

/** 从模型文本中提取 JSON（容错 Markdown 围栏与前后说明）。 */
export function tryParseJson(text: string): unknown | undefined {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const candidate = fenced?.[1] ?? text
  const first = ['{', '[']
    .map(char => candidate.indexOf(char))
    .filter(index => index !== -1)
    .sort((a, b) => a - b)[0]
  if (first === undefined) return undefined
  const lastObject = candidate.lastIndexOf('}')
  const lastArray = candidate.lastIndexOf(']')
  const last = Math.max(lastObject, lastArray)
  if (last <= first) return undefined
  try {
    return JSON.parse(candidate.slice(first, last + 1)) as unknown
  } catch {
    return undefined
  }
}

function mapModelFailure(cause: unknown, signal?: AbortSignal): Result<never> {
  if (isSignalAborted(signal)) return err('cancelled', '课程草案生成已取消')
  const code = typeof cause === 'object' && cause !== null
    ? (cause as { code?: unknown }).code
    : undefined
  if (code === 'cancelled') return err('cancelled', '课程草案生成已取消')
  if (code === 'capability-missing') return err('capability-missing', '当前模型不可用，无法生成课程草案')
  const appError = toAppError(cause, '课程草案生成失败')
  return { ok: false, error: { ...appError, message: `课程草案生成失败：${appError.message}` } }
}

function toResultError(cause: unknown, message: string): Result<never> {
  if (cause instanceof Error && cause.name === 'AbortError') return err('cancelled', '操作已取消')
  return err('failed', message, { details: { message: cause instanceof Error ? cause.message : String(cause) } })
}

/** 保留：供 Host 复用的服务类型别名（避免重复导入）。 */
export type CorpusDraftService = Pick<CorpusService, 'proposeCourseStructure'>
