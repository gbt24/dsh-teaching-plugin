/**
 * 课程草案生成。
 *
 * 用注入的 ModelClient 从已导入资料产出不可变 CourseRevision（draft 状态）：
 * - 提示中给出带真实 documentId/unitId 的材料摘要；模型必须引用这些 id；
 * - 解析失败/字段缺失时做**一次**修复调用，仍失败返回 `uncertain`，不编造草案；
 * - 模型给出的无效 anchor 一律丢弃（宁缺失、不伪造），并在 changeSummary 中说明；
 * - 只写 draftRevisionId，不碰 activeRevisionId（确认由 Host/学生完成）。
 *
 * 同时提供 CourseDraftView 需要的 coverage/warnings 数据来源（Host 组装视图）。
 */
import type { CourseDraftInput, CorpusService } from '../contracts/corpus.ts'
import type { Concept, CourseRevision, SourceRole } from '../contracts/course.ts'
import type { CourseDraftView } from '../contracts/course.ts'
import type { SourceAnchor, SourceDocument, SourceRevision, SourceUnit } from '../contracts/source.ts'
import {
  conceptId as newConceptId, courseRevisionId as newCourseRevisionId, nowIso,
} from '../contracts/ids.ts'
import type { ModelClient, ModelRequest } from '../model/types.ts'
import { err, ok, toAppError, type Result } from '../contracts/result.ts'
import type { CourseRepository } from '../storage/repositories.ts'
import type { CorpusLimits } from './limits.ts'
import type { CorpusStore } from './store.ts'
import { excerptAround, locatorDescription } from './text-utils.ts'

/** 草案生成依赖。 */
export interface DraftDeps {
  readonly store: CorpusStore
  readonly courses: CourseRepository
  readonly model?: ModelClient
  readonly limits: CorpusLimits
}

/** 一份被读取的资料。 */
interface MaterialDocument {
  readonly document: SourceDocument
  readonly revision: SourceRevision
  readonly units: readonly SourceUnit[]
}

/** 材料摘要与可引用单元集合。 */
interface MaterialDigest {
  readonly documents: readonly MaterialDocument[]
  readonly anchorIndex: ReadonlyMap<string, { document: SourceDocument; revision: SourceRevision; unit: SourceUnit }>
  readonly promptText: string
  readonly warnings: string[]
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

/** 生成课程草案并持久化为 draft 修订。 */
export async function proposeCourseRevision(
  deps: DraftDeps,
  input: CourseDraftInput,
  signal?: AbortSignal,
): Promise<Result<CourseRevision>> {
  if (deps.model === undefined) {
    return err('capability-missing', '当前没有可用的模型客户端，无法生成课程草案')
  }
  if (input.courseTitle.trim() === '' || input.goal.trim() === '') {
    return err('invalid-input', '课程草案需要课程标题与学习目标')
  }
  if (signal?.aborted === true) return err('cancelled', '课程草案生成已取消')
  const course = await deps.courses.get(input.courseId)
  if (course === undefined) return err('not-found', '课程不存在或已被删除')

  let material: MaterialDigest
  try {
    material = await gatherMaterial(deps, input)
  } catch (cause) {
    return toResultError(cause, '读取课程资料失败，无法生成课程草案')
  }
  const requestBase = buildDraftPrompt(deps, input, material)
  const parseFailureLimit = 2
  let lastReason = ''
  let lastText = ''
  for (let attempt = 0; attempt < parseFailureLimit; attempt += 1) {
    if (signal?.aborted === true) return err('cancelled', '课程草案生成已取消')
    const messages = attempt === 0
      ? requestBase.messages
      : [
          ...requestBase.messages,
          { role: 'assistant' as const, text: lastText.slice(0, 4000) },
          {
            role: 'user' as const,
            text: `上一次输出无法解析为所需 JSON（${lastReason}）。请只输出一次合法的 JSON 对象，不要解释，不要 Markdown 代码围栏。`,
          },
        ]
    const request: ModelRequest = {
      messages,
      system: requestBase.system,
      json: requestBase.json,
      purpose: 'course-draft',
      language: input.language,
      maxTokens: 4000,
      temperature: 0.2,
    }
    let completion
    try {
      completion = await deps.model.complete(request, signal)
    } catch (cause) {
      return mapModelFailure(cause, signal)
    }
    if (signal?.aborted === true) return err('cancelled', '课程草案生成已取消')
    lastText = completion.text
    const candidate = completion.json !== undefined ? completion.json : tryParseJson(completion.text)
    if (candidate === undefined) {
      lastReason = completion.parseError ?? '输出不是合法 JSON'
      continue
    }
    const validated = validateDraftValue(candidate, material, deps.limits, input)
    if (!validated.ok) {
      lastReason = validated.error
      continue
    }
    try {
      const revision = await persistDraft(deps, input, material, validated.value, validated.warnings)
      return ok(revision)
    } catch (cause) {
      return toResultError(cause, '课程草案保存失败')
    }
  }
  return err('uncertain', '模型返回的课程结构无法解析或缺少必要字段（已尝试一次修复），未保存草案；可重新生成或先用已读内容随问随学', {
    details: { reason: lastReason },
    retryable: true,
  })
}

/** 读取某课程/指定文档的当前修订作为材料。 */
async function gatherMaterial(deps: DraftDeps, input: CourseDraftInput): Promise<MaterialDigest> {
  const warnings: string[] = []
  let documents: SourceDocument[]
  if (input.documentIds !== undefined && input.documentIds.length > 0) {
    documents = []
    for (const documentId of input.documentIds) {
      const document = await deps.store.readDocument(documentId)
      if (document === undefined) {
        warnings.push(`资料 ${documentId} 不存在，已跳过`)
        continue
      }
      documents.push(document)
    }
  } else {
    const ids = await deps.store.documentIdsForCourses([input.courseId])
    documents = []
    for (const id of ids) {
      const document = await deps.store.readDocument(id)
      if (document !== undefined) documents.push(document)
    }
  }
  const ready: MaterialDocument[] = []
  for (const document of documents) {
    if (document.currentRevisionId === undefined) {
      warnings.push(`《${document.title}》尚未成功解析，未纳入课程草案`)
      continue
    }
    const revision = await deps.store.readRevision(document.id, document.currentRevisionId)
    if (revision === undefined) {
      warnings.push(`《${document.title}》的当前修订缺失，未纳入课程草案`)
      continue
    }
    if (revision.units.length === 0) {
      warnings.push(`《${document.title}》没有可读单元，未纳入课程草案`)
      continue
    }
    ready.push({ document, revision, units: revision.units })
  }
  if (ready.length === 0) {
    warnings.push('该课程还没有可读资料，课程草案将只基于学生目标与模型知识，不包含资料定位')
  }

  const anchorIndex = new Map<string, { document: SourceDocument; revision: SourceRevision; unit: SourceUnit }>()
  const lines: string[] = []
  let budgetChars = deps.limits.draftMaxChars
  let usedDocuments = 0
  for (let index = 0; index < ready.length; index += 1) {
    const material = ready[index] as MaterialDocument
    const label = `D${index + 1}`
    const selected = selectUnits(material.units, deps.limits.draftUnitsPerDoc)
    const header = `[${label}] 《${material.document.title}》 格式=${material.document.format} 状态=${material.revision.status} documentId=${material.document.id}`
    if (budgetChars - header.length < 200) {
      warnings.push(`材料较多，课程草案只使用了前 ${usedDocuments} 份资料的摘要`)
      break
    }
    lines.push(header)
    budgetChars -= header.length
    for (const unit of selected) {
      const locator = locatorDescription(unit.locator)
      const excerpt = excerptAround(unit.text, [], Math.min(320, deps.limits.maxUnitChars))
      const line = `  - unitId=${unit.id} (${unit.kind}${locator !== '原文定位' ? ` ${locator}` : ''}) ${excerpt}`
      if (line.length > budgetChars) break
      lines.push(line)
      budgetChars -= line.length
      anchorIndex.set(`${material.document.id}|${unit.id}`, {
        document: material.document,
        revision: material.revision,
        unit,
      })
    }
    usedDocuments += 1
  }
  if (usedDocuments < ready.length) {
    warnings.push(`课程草案摘要达到长度上限，只使用了 ${usedDocuments}/${ready.length} 份资料`)
  }
  const promptText = lines.length > 0 ? lines.join('\n') : '（暂无可用资料：本课程尚未导入或解析出可读内容）'
  return { documents: ready.slice(0, usedDocuments), anchorIndex, promptText, warnings }
}

/** 每份资料选哪些单元进入提示：标题优先 + 均匀采样 + 公式/图表/代码保底。 */
function selectUnits(units: readonly SourceUnit[], maxUnits: number): SourceUnit[] {
  if (units.length <= maxUnits) return [...units]
  const selected: SourceUnit[] = []
  const seen = new Set<string>()
  const push = (unit: SourceUnit): void => {
    if (selected.length >= maxUnits || seen.has(unit.id)) return
    seen.add(unit.id)
    selected.push(unit)
  }
  // 所有标题（至多 1/3 名额）
  for (const unit of units) {
    if (unit.kind === 'heading' && selected.length < Math.floor(maxUnits / 3)) push(unit)
  }
  // 公式/图表/代码各保底少量
  for (const kind of ['formula', 'figure', 'table', 'code'] as const) {
    let count = 0
    for (const unit of units) {
      if (unit.kind !== kind || count >= Math.max(2, Math.floor(maxUnits / 10))) continue
      push(unit)
      count += 1
    }
  }
  // 其余按均匀间隔采样
  const remaining = maxUnits - selected.length
  const step = Math.max(1, Math.floor(units.length / Math.max(1, remaining)))
  for (let index = 0; index < units.length && selected.length < maxUnits; index += step) {
    push(units[index] as SourceUnit)
  }
  for (const unit of units) {
    if (selected.length >= maxUnits) break
    push(unit)
  }
  return selected.sort((a, b) => units.indexOf(a) - units.indexOf(b))
}

interface DraftPrompt {
  readonly system: string
  readonly messages: readonly { role: 'user'; text: string }[]
  readonly json: NonNullable<ModelRequest['json']>
}

function buildDraftPrompt(deps: DraftDeps, input: CourseDraftInput, material: MaterialDigest): DraftPrompt {
  const languageHint = input.language === 'en'
    ? '使用英文输出概念标题与摘要'
    : input.language === 'bilingual'
      ? '概念标题使用中文并保留英文术语，摘要使用中文'
      : '使用中文输出，保留原文英文术语'
  const userText = [
    `课程：${input.courseTitle}`,
    `学习目标：${input.goal}`,
    `学生基础：${input.background ?? '未提供'}`,
    `输出语言：${languageHint}`,
    '',
    '以下是已导入的资料摘要（每行形如 unitId=... 以及该单元文本）：',
    material.promptText,
    '',
    '要求：',
    '1. concepts 按从基础到进阶组织，数量控制在 4-12 个（资料很少时可以减少）；',
    '2. 每个 concept 的 anchors 只能引用上面出现过的 documentId 与 unitId，不要编造；没有合适资料时 anchors 留空数组；',
    '3. prerequisites 使用其他 concept 的 title；sequence 是概念 title 的学习顺序数组，必须覆盖所有 concept；',
    '4. 只输出 JSON 对象，字段为：goals(string[])、concepts(数组)、sequence(string[])。',
    '',
    'concepts 每项字段：',
    '{"title": string, "summary": string, "prerequisites": string[], "difficulty": "intro"|"core"|"advanced", "misconceptions": string[], "checkIdeas": string[], "anchors": [{"documentId": string, "unitId": string}]}',
  ].join('\n')
  return {
    system: '你是严谨的课程结构分析器。课程结构必须能追溯到给定资料单元；不确定时宁可不引用，绝不编造 documentId/unitId。只输出合法 JSON。',
    messages: [{ role: 'user', text: userText }],
    json: {
      name: 'course-structure',
      description: '课程结构草案：目标、概念列表与学习顺序',
      fields: {
        goals: 'string[] 学习目标',
        concepts: '概念数组，含 title/summary/prerequisites/difficulty/misconceptions/checkIdeas/anchors',
        sequence: 'string[] 概念标题的学习顺序，必须覆盖所有概念',
      },
    },
  }
}

/* ------------------------------------------------------------------ 校验 */

interface ValidatedConcept {
  readonly title: string
  readonly summary: string
  readonly prerequisites: readonly string[]
  readonly difficulty?: 'intro' | 'core' | 'advanced'
  readonly misconceptions: readonly string[]
  readonly checkIdeas: readonly string[]
  readonly anchors: readonly SourceAnchor[]
}

interface ValidatedDraft {
  readonly goals: readonly string[]
  readonly concepts: readonly ValidatedConcept[]
  readonly sequence: readonly string[]
}

interface ValidationSuccess {
  readonly ok: true
  readonly value: ValidatedDraft
  readonly warnings: string[]
}

interface ValidationFailure {
  readonly ok: false
  readonly error: string
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

function validateDraftValue(
  value: unknown,
  material: MaterialDigest,
  limits: CorpusLimits,
  input: CourseDraftInput,
): ValidationSuccess | ValidationFailure {
  const record = asRecord(value)
  if (record === undefined) return { ok: false, error: '根节点不是 JSON 对象' }
  const rawConcepts = record['concepts']
  if (!Array.isArray(rawConcepts) || rawConcepts.length === 0) {
    return { ok: false, error: 'concepts 必须是非空数组' }
  }
  const warnings: string[] = []
  const seenTitles = new Set<string>()
  const concepts: ValidatedConcept[] = []
  let invalidAnchors = 0
  let truncatedConcepts = 0
  for (const rawConcept of rawConcepts) {
    if (concepts.length >= limits.draftMaxConcepts) {
      truncatedConcepts += 1
      continue
    }
    const conceptRecord = asRecord(rawConcept)
    if (conceptRecord === undefined) continue
    const title = typeof conceptRecord['title'] === 'string' ? conceptRecord['title'].trim().slice(0, 120) : ''
    if (title === '' || seenTitles.has(title)) continue
    seenTitles.add(title)
    const summary = typeof conceptRecord['summary'] === 'string'
      ? conceptRecord['summary'].trim().slice(0, 1200)
      : ''
    const difficultyRaw = conceptRecord['difficulty']
    const difficulty = difficultyRaw === 'intro' || difficultyRaw === 'core' || difficultyRaw === 'advanced'
      ? difficultyRaw
      : undefined
    const anchors: SourceAnchor[] = []
    const rawAnchors = conceptRecord['anchors']
    if (Array.isArray(rawAnchors)) {
      for (const rawAnchor of rawAnchors.slice(0, 6)) {
        const anchorRecord = asRecord(rawAnchor)
        if (anchorRecord === undefined) {
          invalidAnchors += 1
          continue
        }
        const documentId = anchorRecord['documentId']
        const unitId = anchorRecord['unitId']
        if (typeof documentId !== 'string' || typeof unitId !== 'string') {
          invalidAnchors += 1
          continue
        }
        const found = material.anchorIndex.get(`${documentId}|${unitId}`)
        if (found === undefined) {
          // 不伪造：模型引用了不存在的资料单元
          invalidAnchors += 1
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
    }
    concepts.push({
      title,
      summary,
      prerequisites: asStringArray(conceptRecord['prerequisites'], 8, 120),
      ...(difficulty !== undefined ? { difficulty } : {}),
      misconceptions: asStringArray(conceptRecord['misconceptions'], 5, 240),
      checkIdeas: asStringArray(conceptRecord['checkIdeas'], 5, 240),
      anchors,
    })
  }
  if (concepts.length === 0) {
    return { ok: false, error: 'concepts 中没有有效概念（需要至少一个含非空 title 的对象）' }
  }
  if (truncatedConcepts > 0) {
    warnings.push(`模型返回的概念超过上限，已保留前 ${limits.draftMaxConcepts} 个（另有 ${truncatedConcepts} 个被丢弃）`)
  }
  if (invalidAnchors > 0) {
    warnings.push(`${invalidAnchors} 个模型引用无法对应到真实资料单元，已丢弃（不伪造来源定位）`)
  }
  const withoutAnchors = concepts.filter(concept => concept.anchors.length === 0)
  if (withoutAnchors.length > 0 && material.documents.length > 0) {
    warnings.push(`${withoutAnchors.length} 个概念没有资料定位，教学时会标注为模型知识：${withoutAnchors.slice(0, 5).map(concept => concept.title).join('、')}`)
  }

  // sequence 校验：title 或数字索引，缺失的按概念顺序补齐
  const titleToOrder = new Map<string, number>()
  concepts.forEach((concept, index) => titleToOrder.set(concept.title, index))
  const sequence: string[] = []
  const sequenceSeen = new Set<string>()
  const rawSequence = record['sequence']
  if (Array.isArray(rawSequence)) {
    for (const item of rawSequence) {
      let title: string | undefined
      if (typeof item === 'string') title = item.trim()
      else if (typeof item === 'number' && Number.isInteger(item)) {
        title = concepts[item]?.title
      }
      if (title === undefined || !titleToOrder.has(title) || sequenceSeen.has(title)) continue
      sequenceSeen.add(title)
      sequence.push(title)
    }
  }
  for (const concept of concepts) {
    if (!sequenceSeen.has(concept.title)) {
      sequenceSeen.add(concept.title)
      sequence.push(concept.title)
    }
  }
  if (!Array.isArray(rawSequence)) warnings.push('模型没有给出有效 sequence，已按概念顺序生成学习顺序')

  const goals = asStringArray(record['goals'], 10, 240)
  if (goals.length === 0) goals.push(input.goal.trim().slice(0, 240))
  else if (input.goal.trim() !== '' && !goals.includes(input.goal.trim())) {
    goals.unshift(input.goal.trim().slice(0, 240))
  }
  return {
    ok: true,
    value: { goals, concepts, sequence },
    warnings,
  }
}

/** 把校验后的草案组装为 CourseRevision 并持久化。 */
async function persistDraft(
  deps: DraftDeps,
  input: CourseDraftInput,
  material: MaterialDigest,
  draft: ValidatedDraft,
  warnings: readonly string[],
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
  const titleToId = new Map<string, ReturnType<typeof newConceptId>>()
  const concepts: Concept[] = draft.concepts.map(concept => {
    const id = newConceptId()
    titleToId.set(concept.title, id)
    return {
      id,
      title: concept.title,
      summary: concept.summary,
      prerequisites: [],
      sourceAnchors: concept.anchors,
      ...(concept.difficulty !== undefined ? { difficulty: concept.difficulty } : {}),
      ...(concept.misconceptions.length > 0 ? { misconceptions: concept.misconceptions } : {}),
      ...(concept.checkIdeas.length > 0 ? { checkIdeas: concept.checkIdeas } : {}),
    }
  })
  // prerequisites 需要 id：按 title→id 映射二次回填
  const conceptsWithPrereqs: Concept[] = concepts.map((concept, index) => {
    const source = draft.concepts[index] as ValidatedConcept
    const prerequisites = source.prerequisites
      .map(title => titleToId.get(title))
      .filter((value): value is ReturnType<typeof newConceptId> => value !== undefined && value !== concept.id)
    const unique = [...new Set(prerequisites)]
    return { ...concept, prerequisites: unique }
  })
  const sequence = draft.sequence
    .map(title => titleToId.get(title))
    .filter((value): value is ReturnType<typeof newConceptId> => value !== undefined)
  for (const concept of conceptsWithPrereqs) {
    if (!sequence.includes(concept.id)) sequence.push(concept.id)
  }
  const basedOn = material.documents
    .filter(materialDocument => materialDocument.document.currentRevisionId !== undefined)
    .map(materialDocument => ({
      sourceId: materialDocument.document.id,
      revisionId: materialDocument.revision.id,
    }))
  const sources = material.documents.map(materialDocument => ({
    sourceId: materialDocument.document.id,
    role: ROLE_BY_FORMAT[materialDocument.document.format],
  }))
  const revision: CourseRevision = {
    id: newCourseRevisionId(),
    courseId: course.id,
    version,
    createdAt: nowIso(),
    state: 'draft',
    provenance: 'ai-draft',
    goals: draft.goals,
    ...(input.background !== undefined && input.background.trim() !== ''
      ? { background: input.background.trim() }
      : {}),
    language: input.language,
    sources,
    concepts: conceptsWithPrereqs,
    sequence,
    changeSummary: describeDraft(material, conceptsWithPrereqs, warnings),
    basedOn,
  }
  await deps.courses.saveRevision(revision)
  await deps.courses.save({ ...course, draftRevisionId: revision.id })
  return revision
}

function describeDraft(
  material: MaterialDigest,
  concepts: readonly Concept[],
  warnings: readonly string[],
): string {
  const anchorCount = concepts.reduce((sum, concept) => sum + concept.sourceAnchors.length, 0)
  const parts = [
    `AI 草案：读取 ${material.documents.length} 份资料，生成 ${concepts.length} 个概念（${anchorCount} 个资料定位）`,
  ]
  if (warnings.length > 0) parts.push(warnings.slice(0, 3).join('；'))
  return parts.join('。')
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
  const sourceIds = [...new Set([
    ...revision.sources.map(source => source.sourceId),
    ...revision.concepts.flatMap(concept => concept.sourceAnchors.map(anchor => anchor.documentId)),
  ])]
  for (const sourceId of sourceIds) {
    const document = await deps.store.readDocument(sourceId)
    if (document === undefined) {
      warnings.push(`资料 ${sourceId} 已被删除，草案中的相关定位可能失效`)
      coverage.push({ sourceId: sourceId as never, title: '（资料已删除）', status: 'missing', usedUnits: 0, issues: 1 })
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
    if (usedUnits === 0 && revision.sources.some(source => source.sourceId === document.id)) {
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
  if (signal?.aborted === true) return err('cancelled', '课程草案生成已取消')
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
