/**
 * 增量整合：把「基于新材料生成的草案」与「当前已确认课程结构」对齐（纯函数）。
 *
 * 背景：学生已有 confirmed 课程结构（含概念 id、先修、章节、资料锚点），掌握记录按
 * 概念 id 关联。导入新材料后重新生成草案时，不能因为标题重排/新草案 id 变化而丢失
 * 旧概念的掌握记录：本函数按归一化标题复用旧 id、保留旧锚点，并把旧草案中未出现的
 * 概念（旧-only）继续保留在 sequence/chapters 中（不静默丢弃），同时统计整合结果。
 *
 * 纯函数：不读写存储、不调用模型；Host 负责把返回的 revision 持久化（新版本/草案）。
 */
import type { Concept, CourseChapter, CourseRevision } from '../contracts/course.ts'
import type { ConceptId } from '../contracts/ids.ts'
import { conceptId as newConceptId } from '../contracts/ids.ts'
import type { SourceAnchor } from '../contracts/source.ts'

/** 增量整合统计（Host 映射到 CourseDraftView.integration）。 */
export interface ReconcileStats {
  /** 新草案中按标题匹配、复用旧概念 id 的数量。 */
  readonly reusedConcepts: number
  /** 新草案中新增概念的数量。 */
  readonly addedConcepts: number
  /** 旧结构中未出现在新草案、被保留的概念数量。 */
  readonly preservedOldConcepts: number
  /** 相对旧结构新增的资料锚点数量。 */
  readonly addedAnchors: number
  /** 标题重复/歧义/章节合并等可报告警告。 */
  readonly warnings: readonly string[]
}

/** 增量整合结果。 */
export interface ReconcileResult {
  readonly revision: CourseRevision
  readonly stats: ReconcileStats
}

/**
 * 概念标题归一化：NFKC、去首尾空白、小写、去空白（含全角空格）、去中英文标点。
 * 用于「同一概念不同书写方式」的匹配，不做语义替换。
 */
export function normalizeConceptTitle(title: string): string {
  return title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[（）()【】[\]「」『』《》〈〉〔〕、，,。.；;：:！!？?·•—–\-_/\\|"'“”‘’`~^*+=<>]/g, '')
}

function anchorKey(anchor: SourceAnchor): string {
  return `${anchor.documentId}|${anchor.revisionId}|${anchor.unitId}`
}

function mergeAnchors(
  oldAnchors: readonly SourceAnchor[],
  newAnchors: readonly SourceAnchor[],
): { readonly anchors: readonly SourceAnchor[]; readonly added: number } {
  const seen = new Set(oldAnchors.map(anchorKey))
  const anchors: SourceAnchor[] = [...oldAnchors]
  let added = 0
  for (const anchor of newAnchors) {
    const key = anchorKey(anchor)
    if (seen.has(key)) continue
    seen.add(key)
    anchors.push(anchor)
    added += 1
  }
  return { anchors, added }
}

function uniqueIds(ids: readonly ConceptId[]): ConceptId[] {
  return [...new Set(ids)]
}

/** 可变的合并工作副本（对外仍输出只读 Concept）。 */
interface WorkingConcept {
  id: ConceptId
  title: string
  summary: string
  prerequisites: ConceptId[]
  sourceAnchors: SourceAnchor[]
  difficulty?: Concept['difficulty']
  misconceptions?: readonly string[]
  checkIdeas?: readonly string[]
}

interface ChapterDraft {
  id: string
  title: string
  summary?: string
  role?: CourseChapter['role']
  conceptIds: ConceptId[]
  sourceAnchors?: readonly SourceAnchor[]
}

/** 新旧课程结构增量整合（id/锚点/章节/序列均保持一致性与可追溯）。 */
export function reconcileDraftWithActive(
  active: CourseRevision,
  draft: CourseRevision,
): ReconcileResult {
  const warnings: string[] = []
  if (active.courseId !== draft.courseId) {
    warnings.push(`整合的两个修订属于不同课程（${active.courseId} → ${draft.courseId}），结果仅按内容对齐`)
  }

  // 1) 建立归一化标题索引（检测重复/歧义）
  const activeByTitle = new Map<string, Concept[]>()
  for (const concept of active.concepts) {
    const key = normalizeConceptTitle(concept.title)
    if (key === '') continue
    const list = activeByTitle.get(key)
    if (list === undefined) activeByTitle.set(key, [concept])
    else list.push(concept)
  }
  for (const [key, list] of activeByTitle) {
    if (list.length > 1) {
      warnings.push(`旧结构中有 ${list.length} 个概念标题归一化后相同（${key}），匹配时使用第一个，其余作为旧概念保留`)
    }
  }
  const draftTitleCounts = new Map<string, number>()
  for (const concept of draft.concepts) {
    const key = normalizeConceptTitle(concept.title)
    if (key === '') continue
    draftTitleCounts.set(key, (draftTitleCounts.get(key) ?? 0) + 1)
  }

  const usedActiveIds = new Set<ConceptId>()
  const usedFinalIds = new Set<ConceptId>()
  const draftIdToFinal = new Map<ConceptId, ConceptId>()
  const finalConcepts: WorkingConcept[] = []
  const oldOnlyConcepts: WorkingConcept[] = []
  let reusedConcepts = 0
  let addedConcepts = 0
  let addedAnchors = 0
  const freshId = (): ConceptId => {
    let candidate = newConceptId()
    while (usedFinalIds.has(candidate)) candidate = newConceptId()
    return candidate
  }

  // 2) 按草案顺序合并：命中旧概念 → 复用 id 并合并锚点；否则新增（保留草案 id）
  const reusedActive = new Map<ConceptId, Concept>()
  const finalConceptById = new Map<ConceptId, WorkingConcept>()
  const investigationPrerequisites: { concept: WorkingConcept; draftSource: boolean }[] = []

  for (const draftConcept of draft.concepts) {
    const key = normalizeConceptTitle(draftConcept.title)
    const candidates = key === '' ? undefined : activeByTitle.get(key)
    const candidate = candidates?.find(item => !usedActiveIds.has(item.id))
    if (candidates !== undefined && candidates.length > 1 && candidate !== undefined) {
      warnings.push(`标题《${draftConcept.title}》在旧结构中存在多个候选，按第一个匹配（${candidate.id}）`)
    }
    if (candidate !== undefined && key !== '') {
      // 复用旧 id；旧锚点 + 新锚点合并
      usedActiveIds.add(candidate.id)
      const merged = mergeAnchors(candidate.sourceAnchors, draftConcept.sourceAnchors)
      addedAnchors += merged.added
      const concept: WorkingConcept = {
        id: candidate.id,
        title: draftConcept.title,
        summary: draftConcept.summary.trim() !== '' ? draftConcept.summary : candidate.summary,
        prerequisites: [],
        sourceAnchors: [...merged.anchors],
        ...(draftConcept.difficulty !== undefined
          ? { difficulty: draftConcept.difficulty }
          : candidate.difficulty !== undefined
            ? { difficulty: candidate.difficulty }
            : {}),
        ...(draftConcept.misconceptions !== undefined && draftConcept.misconceptions.length > 0
          ? { misconceptions: draftConcept.misconceptions }
          : candidate.misconceptions !== undefined && candidate.misconceptions.length > 0
            ? { misconceptions: candidate.misconceptions }
            : {}),
        ...(draftConcept.checkIdeas !== undefined && draftConcept.checkIdeas.length > 0
          ? { checkIdeas: draftConcept.checkIdeas }
          : candidate.checkIdeas !== undefined && candidate.checkIdeas.length > 0
            ? { checkIdeas: candidate.checkIdeas }
            : {}),
      }
      reusedActive.set(candidate.id, candidate)
      draftIdToFinal.set(draftConcept.id, concept.id)
      usedFinalIds.add(concept.id)
      finalConcepts.push(concept)
      finalConceptById.set(concept.id, concept)
      investigationPrerequisites.push({ concept, draftSource: true })
      reusedConcepts += 1
      if ((draftTitleCounts.get(key) ?? 0) > 1) {
        warnings.push(`新草案中标题《${draftConcept.title}》重复出现，已按首个匹配旧概念，其余保留为新概念`)
      }
      continue
    }

    // 新增概念：保留草案 id（若 id 冲突则重新生成）
    const hasTitleKey = key !== ''
    const duplicateTitle = hasTitleKey && (draftTitleCounts.get(key) ?? 0) > 1
    if (duplicateTitle) {
      warnings.push(`新草案中标题《${draftConcept.title}》重复出现，已作为独立概念保留（请后续人工合并）`)
    }
    const id = usedFinalIds.has(draftConcept.id) ? freshId() : draftConcept.id
    const concept: WorkingConcept = {
      id,
      title: draftConcept.title,
      summary: draftConcept.summary,
      prerequisites: [],
      sourceAnchors: [...draftConcept.sourceAnchors],
      ...(draftConcept.difficulty !== undefined ? { difficulty: draftConcept.difficulty } : {}),
      ...(draftConcept.misconceptions !== undefined ? { misconceptions: draftConcept.misconceptions } : {}),
      ...(draftConcept.checkIdeas !== undefined ? { checkIdeas: draftConcept.checkIdeas } : {}),
    }
    draftIdToFinal.set(draftConcept.id, id)
    usedFinalIds.add(id)
    finalConcepts.push(concept)
    finalConceptById.set(id, concept)
    investigationPrerequisites.push({ concept, draftSource: true })
    addedAnchors += draftConcept.sourceAnchors.length
    addedConcepts += 1
  }

  // 3) 旧-only 概念：保留 id/内容，追加到末尾（不静默丢弃）
  for (const activeConcept of active.concepts) {
    if (usedActiveIds.has(activeConcept.id)) continue
    const preserved: WorkingConcept = {
      id: activeConcept.id,
      title: activeConcept.title,
      summary: activeConcept.summary,
      prerequisites: [...activeConcept.prerequisites],
      sourceAnchors: [...activeConcept.sourceAnchors],
      ...(activeConcept.difficulty !== undefined ? { difficulty: activeConcept.difficulty } : {}),
      ...(activeConcept.misconceptions !== undefined ? { misconceptions: activeConcept.misconceptions } : {}),
      ...(activeConcept.checkIdeas !== undefined ? { checkIdeas: activeConcept.checkIdeas } : {}),
    }
    oldOnlyConcepts.push(preserved)
    usedFinalIds.add(preserved.id)
    finalConcepts.push(preserved)
    finalConceptById.set(preserved.id, preserved)
    investigationPrerequisites.push({ concept: preserved, draftSource: false })
  }
  const preservedOldConcepts = oldOnlyConcepts.length
  if (preservedOldConcepts > 0) {
    warnings.push(`${preservedOldConcepts} 个旧概念未出现在新草案中，已按原 id 保留并追加到学习顺序/章节，避免丢失掌握记录`)
  }

  // 4) 先修关系 remap：旧先修（active id → final id）+ 新草案先修（draft id → final id）
  const activeIdToFinal = new Map<ConceptId, ConceptId>()
  for (const concept of active.concepts) {
    if (finalConceptById.has(concept.id)) activeIdToFinal.set(concept.id, concept.id)
  }
  const finalIdSet = new Set(finalConcepts.map(concept => concept.id))
  let droppedPrerequisites = 0
  for (const item of investigationPrerequisites) {
    const concept = item.concept
    if (item.draftSource) {
      const draftConcept = draft.concepts.find(source => draftIdToFinal.get(source.id) === concept.id)
      const oldConcept = reusedActive.get(concept.id)
      const mapped: ConceptId[] = []
      if (oldConcept !== undefined) {
        for (const prerequisite of oldConcept.prerequisites) {
          const finalId = activeIdToFinal.get(prerequisite)
          if (finalId !== undefined) mapped.push(finalId)
          else droppedPrerequisites += 1
        }
        // 旧先修若指向旧-only 概念，也保留其最终 id
        for (const prerequisite of oldConcept.prerequisites) {
          if (finalIdSet.has(prerequisite) && !mapped.includes(prerequisite)) mapped.push(prerequisite)
        }
      }
      for (const prerequisite of draftConcept?.prerequisites ?? []) {
        const finalId = draftIdToFinal.get(prerequisite)
        if (finalId !== undefined) mapped.push(finalId)
        else droppedPrerequisites += 1
      }
      concept.prerequisites = uniqueIds(mapped).filter(id => id !== concept.id)
    } else {
      const oldConcept = oldOnlyConcepts.find(item2 => item2.id === concept.id)
      const mapped: ConceptId[] = []
      for (const prerequisite of oldConcept?.prerequisites ?? []) {
        if (finalIdSet.has(prerequisite)) mapped.push(prerequisite)
        else droppedPrerequisites += 1
      }
      concept.prerequisites = uniqueIds(mapped).filter(id => id !== concept.id)
    }
  }
  if (droppedPrerequisites > 0) {
    warnings.push(`${droppedPrerequisites} 个先修引用指向已不存在的概念，已从先修关系中移除（概念本身保留）`)
  }

  // 5) sequence：草案顺序 → 旧-only（按旧 sequence 顺序）→ 其余概念，保证唯一且覆盖全部
  const sequence: ConceptId[] = []
  const sequenceSeen = new Set<ConceptId>()
  const pushSequence = (id: ConceptId | undefined): void => {
    if (id === undefined || sequenceSeen.has(id) || !finalIdSet.has(id)) return
    sequenceSeen.add(id)
    sequence.push(id)
  }
  for (const id of draft.sequence) pushSequence(draftIdToFinal.get(id))
  for (const id of active.sequence) {
    const finalId = activeIdToFinal.get(id)
    if (finalId !== undefined && oldOnlyConcepts.some(concept => concept.id === finalId)) pushSequence(finalId)
  }
  for (const concept of finalConcepts) pushSequence(concept.id)

  // 6) 章节：草案章节 id 重映射 + 旧-only 概念补入对应章节/保留旧章节，确保每个概念恰好一章
  const assigned = new Set<ConceptId>()
  const finalChapters: ChapterDraft[] = []
  const chapterByTitle = new Map<string, ChapterDraft>()
  const usedChapterIds = new Set<string>()
  const uniqueChapterId = (preferred: string): string => {
    if (!usedChapterIds.has(preferred)) {
      usedChapterIds.add(preferred)
      return preferred
    }
    let index = 2
    while (usedChapterIds.has(`${preferred}-${index}`)) index += 1
    const id = `${preferred}-${index}`
    usedChapterIds.add(id)
    return id
  }
  const appendChapterConcept = (chapter: ChapterDraft, id: ConceptId): void => {
    if (assigned.has(id) || !finalIdSet.has(id)) return
    assigned.add(id)
    chapter.conceptIds.push(id)
  }
  if (draft.chapters !== undefined && draft.chapters.length > 0) {
    for (const draftChapter of draft.chapters) {
      const key = normalizeConceptTitle(draftChapter.title)
      const conceptIds = draftChapter.conceptIds
        .map(id => draftIdToFinal.get(id))
        .filter((id): id is ConceptId => id !== undefined)
      const existing = key === '' ? undefined : chapterByTitle.get(key)
      if (existing !== undefined) {
        for (const id of conceptIds) appendChapterConcept(existing, id)
        warnings.push(`新草案中章节《${draftChapter.title}》重复，已合并到第一个同名章节`)
        continue
      }
      const chapter: ChapterDraft = {
        id: uniqueChapterId(draftChapter.id),
        title: draftChapter.title,
        ...(draftChapter.summary !== undefined ? { summary: draftChapter.summary } : {}),
        ...(draftChapter.role !== undefined ? { role: draftChapter.role } : {}),
        ...(draftChapter.sourceAnchors !== undefined ? { sourceAnchors: draftChapter.sourceAnchors } : {}),
        conceptIds: [],
      }
      for (const id of conceptIds) appendChapterConcept(chapter, id)
      finalChapters.push(chapter)
      if (key !== '') chapterByTitle.set(key, chapter)
    }
  }
  // 新草案没有章节但旧结构有：保留旧章节映射（复用概念 id 后仍然连续）
  if ((draft.chapters === undefined || draft.chapters.length === 0)
    && active.chapters !== undefined && active.chapters.length > 0) {
    for (const activeChapter of active.chapters) {
      const conceptIds = activeChapter.conceptIds
        .map(id => activeIdToFinal.get(id))
        .filter((id): id is ConceptId => id !== undefined)
      if (conceptIds.length === 0) continue
      const chapter: ChapterDraft = {
        id: uniqueChapterId(activeChapter.id),
        title: activeChapter.title,
        ...(activeChapter.summary !== undefined ? { summary: activeChapter.summary } : {}),
        ...(activeChapter.role !== undefined ? { role: activeChapter.role } : {}),
        ...(activeChapter.sourceAnchors !== undefined ? { sourceAnchors: activeChapter.sourceAnchors } : {}),
        conceptIds: [],
      }
      for (const id of conceptIds) appendChapterConcept(chapter, id)
      finalChapters.push(chapter)
    }
  }
  // 旧-only 概念：优先并入同名草案章节，否则保留旧章节
  for (const concept of oldOnlyConcepts) {
    if (assigned.has(concept.id)) continue
    const activeChapter = active.chapters?.find(chapter => chapter.conceptIds.includes(concept.id))
    if (activeChapter === undefined) continue
    const key = normalizeConceptTitle(activeChapter.title)
    const existing = key === '' ? undefined : chapterByTitle.get(key)
    if (existing !== undefined) {
      appendChapterConcept(existing, concept.id)
      continue
    }
    const chapter: ChapterDraft = {
      id: uniqueChapterId(activeChapter.id),
      title: activeChapter.title,
      ...(activeChapter.summary !== undefined ? { summary: activeChapter.summary } : {}),
      ...(activeChapter.role !== undefined ? { role: activeChapter.role } : {}),
      ...(activeChapter.sourceAnchors !== undefined ? { sourceAnchors: activeChapter.sourceAnchors } : {}),
      conceptIds: [],
    }
    appendChapterConcept(chapter, concept.id)
    finalChapters.push(chapter)
    if (key !== '') chapterByTitle.set(key, chapter)
  }
  // 仍未归章的概念（新概念未被草案章节覆盖 / 旧概念无章节）→ 附录章节
  const unassigned = finalConcepts.filter(concept => !assigned.has(concept.id)).map(concept => concept.id)
  if (unassigned.length > 0) {
    const appendix: ChapterDraft = {
      id: uniqueChapterId('chapter-preserved'),
      title: '保留内容（未分章）',
      summary: '增量整合时未能对应到章节的概念（含新草案遗漏与旧概念），保留学习记录用',
      role: 'appendix',
      conceptIds: [],
    }
    for (const id of unassigned) appendChapterConcept(appendix, id)
    finalChapters.push(appendix)
    warnings.push(`${unassigned.length} 个概念未归属章节，已放入附录「保留内容（未分章）」`)
  }
  const visibleChapters = finalChapters.filter(chapter => chapter.conceptIds.length > 0)

  // 7) sources/basedOn 取并集（旧资料引用仍可追溯）
  const sources: Array<CourseRevision['sources'][number]> = []
  const sourceSeen = new Set<string>()
  for (const source of [...draft.sources, ...active.sources]) {
    if (sourceSeen.has(source.sourceId)) continue
    sourceSeen.add(source.sourceId)
    sources.push(source)
  }
  const basedOn: { sourceId: CourseRevision['basedOn'][number]['sourceId']; revisionId: string }[] = []
  const basedOnSeen = new Set<string>()
  for (const item of [...draft.basedOn, ...active.basedOn]) {
    const key = `${item.sourceId}|${item.revisionId}`
    if (basedOnSeen.has(key)) continue
    basedOnSeen.add(key)
    basedOn.push({ sourceId: item.sourceId, revisionId: item.revisionId })
  }

  const changeSummary = [
    draft.changeSummary ?? '',
    `增量整合：复用 ${reusedConcepts} 个概念 id、新增 ${addedConcepts} 个概念、保留 ${preservedOldConcepts} 个旧概念、新增 ${addedAnchors} 个资料锚点`,
    warnings.length > 0 ? `整合警告 ${warnings.length} 条` : '',
  ].filter(part => part !== '').join('；').slice(0, 800)

  const outputConcepts: Concept[] = finalConcepts.map(concept => ({
    id: concept.id,
    title: concept.title,
    summary: concept.summary,
    prerequisites: [...concept.prerequisites],
    sourceAnchors: [...concept.sourceAnchors],
    ...(concept.difficulty !== undefined ? { difficulty: concept.difficulty } : {}),
    ...(concept.misconceptions !== undefined && concept.misconceptions.length > 0
      ? { misconceptions: concept.misconceptions }
      : {}),
    ...(concept.checkIdeas !== undefined && concept.checkIdeas.length > 0
      ? { checkIdeas: concept.checkIdeas }
      : {}),
  }))
  const revision: CourseRevision = {
    ...draft,
    concepts: outputConcepts,
    sequence,
    sources,
    ...(basedOn.length > 0 ? { basedOn } : {}),
    ...(visibleChapters.length > 0
      ? {
          chapters: visibleChapters.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
            conceptIds: [...chapter.conceptIds],
            ...(chapter.sourceAnchors !== undefined ? { sourceAnchors: chapter.sourceAnchors } : {}),
            ...(chapter.role !== undefined ? { role: chapter.role } : {}),
          })),
        }
      : {}),
    changeSummary,
  }

  return {
    revision,
    stats: {
      reusedConcepts,
      addedConcepts,
      preservedOldConcepts,
      addedAnchors,
      warnings,
    },
  }
}
