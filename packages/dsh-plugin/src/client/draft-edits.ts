/**
 * Pure helpers for editing a course-structure draft (Phase 2) and for previewing
 * the resulting concept order. No React here, so the edit semantics are unit
 * testable and shared by the draft review UI.
 *
 * The Host `courseDraft.confirm` contract accepts partial edits
 * (`goals`, `sequence`, `conceptTitles`, `removeConceptIds`); this module turns
 * the UI state into that payload and leaves untouched fields out.
 */
import type { Concept, ConceptId, CourseChapter, CourseRevision } from '@deepseek-teaching/core/contracts'

/** Edits accepted by `POST /api/teaching/courseDraft.confirm`. */
export interface DraftConfirmEdits {
  readonly goals?: readonly string[]
  readonly sequence?: readonly ConceptId[]
  readonly conceptTitles?: Readonly<Record<string, string>>
  readonly removeConceptIds?: readonly ConceptId[]
}

/** Student-editable state of one draft review. */
export interface DraftEditState {
  /** Concept ids in the displayed order (chapter order → intra-chapter → ungrouped). */
  readonly order: readonly string[]
  /** Student-provided titles (trimmed before comparison); missing = original title. */
  readonly titles: Readonly<Record<string, string>>
  /** Removed concept ids. */
  readonly removed: readonly string[]
  /** Optional goals override (the current UI does not edit goals, but the contract supports it). */
  readonly goals?: readonly string[]
}

/** One chapter with its concepts resolved in display order. */
export interface ChapterConceptGroup {
  readonly chapter: CourseChapter
  readonly concepts: readonly Concept[]
}

/** Chapters plus the concepts that belong to no chapter. */
export interface DraftStructureGroups {
  readonly hasChapters: boolean
  readonly chapters: readonly ChapterConceptGroup[]
  readonly ungrouped: readonly Concept[]
}

/**
 * Group revision concepts by chapter, ordering concepts by `revision.sequence`
 * (chapter-local order is the fallback for ids absent from the sequence).
 * Concepts not covered by any chapter are returned separately so nothing is
 * dropped from the preview.
 */
export function groupConceptsByChapters(revision: CourseRevision): DraftStructureGroups {
  const chapters = revision.chapters ?? []
  const sequenceIndex = new Map<string, number>()
  revision.sequence.forEach((conceptId, index) => sequenceIndex.set(conceptId as string, index))
  const conceptById = new Map(revision.concepts.map(concept => [concept.id as string, concept]))
  const groupedIds = new Set<string>()
  const groups = chapters.map((chapter) => {
    const concepts = chapter.conceptIds
      .map((conceptId, localIndex) => {
        const concept = conceptById.get(conceptId as string)
        if (concept !== undefined) groupedIds.add(conceptId as string)
        return {
          concept,
          order: sequenceIndex.get(conceptId as string) ?? Number.MAX_SAFE_INTEGER + localIndex,
        }
      })
      .filter((entry): entry is { concept: Concept; order: number } => entry.concept !== undefined)
      .sort((a, b) => a.order - b.order)
      .map(entry => entry.concept)
    return { chapter, concepts }
  })
  const ungrouped = revision.sequence
    .map(conceptId => conceptById.get(conceptId as string))
    .filter((concept): concept is Concept => concept !== undefined && !groupedIds.has(concept.id as string))
  // Concepts outside `sequence` are still shown (after the ordered ones).
  for (const concept of revision.concepts) {
    if (!groupedIds.has(concept.id as string) && !ungrouped.some(item => item.id === concept.id)) {
      ungrouped.push(concept)
    }
  }
  return { hasChapters: chapters.length > 0, chapters: groups, ungrouped }
}

/**
 * The full display order of a draft: chapters in array order, concepts inside a
 * chapter in revision sequence order, then ungrouped concepts. Includes
 * concepts missing from `sequence` so an edit never hides them.
 */
export function orderedConceptIds(revision: CourseRevision): readonly string[] {
  const { chapters, ungrouped } = groupConceptsByChapters(revision)
  return [
    ...chapters.flatMap(group => group.concepts.map(concept => concept.id as string)),
    ...ungrouped.map(concept => concept.id as string),
  ]
}

/** Concept ids that are still kept for the given edit state. */
export function keptConceptIds(revision: CourseRevision, state: DraftEditState): readonly string[] {
  const removed = new Set(state.removed)
  const existing = new Set(revision.concepts.map(concept => concept.id as string))
  const ordered = state.order.filter(id => existing.has(id) && !removed.has(id))
  // Safety: concepts present in the revision but missing from `order` stay kept.
  for (const concept of revision.concepts) {
    const id = concept.id as string
    if (!existing.has(id)) continue
    if (removed.has(id) || ordered.includes(id)) continue
    ordered.push(id)
  }
  return ordered
}

/**
 * Move one concept up/down inside its group.
 *
 * - With chapters, a concept moves only within its chapter (or, when it is
 *   ungrouped, within the ungrouped tail — see {@link moveConcept}); a plain
 *   revision moves inside the global order.
 * - At the boundary the order is returned unchanged.
 */
export function moveConcept(
  revision: CourseRevision,
  state: Pick<DraftEditState, 'order' | 'removed'>,
  conceptId: string,
  direction: 'up' | 'down',
): readonly string[] {
  const removed = new Set(state.removed)
  const order = state.order.filter(id => !removed.has(id))
  const chapters = revision.chapters ?? []
  // The segment a concept may move within: its chapter when it belongs to one,
  // otherwise the whole (kept) order for old flat revisions or the ungrouped tail.
  let segmentStart = 0
  let segmentEnd = order.length
  if (chapters.length > 0) {
    const chapter = chapters.find(item => item.conceptIds.some(id => (id as string) === conceptId))
    if (chapter !== undefined) {
      const first = chapter.conceptIds
        .map(id => order.indexOf(id as string))
        .filter(index => index >= 0)
      const last = first.length === 0 ? -1 : Math.max(...first)
      segmentStart = first.length === 0 ? 0 : Math.min(...first)
      segmentEnd = last + 1
      // Expand the segment over contiguous moved concepts belonging to the chapter.
      while (segmentStart > 0 && chapter.conceptIds.some(id => (id as string) === order[segmentStart - 1])) segmentStart -= 1
      while (segmentEnd < order.length && chapter.conceptIds.some(id => (id as string) === order[segmentEnd])) segmentEnd += 1
    } else {
      const ungroupedIds = new Set(
        groupConceptsByChapters(revision).ungrouped.map(concept => concept.id as string),
      )
      const first = order.findIndex(id => ungroupedIds.has(id))
      const last = order.map((id, index) => ungroupedIds.has(id) ? index : -1)
        .filter(index => index >= 0)
        .pop()
      segmentStart = first < 0 ? order.length : first
      segmentEnd = last === undefined ? order.length : last + 1
    }
  }
  const index = order.indexOf(conceptId)
  if (index < segmentStart || index >= segmentEnd) return order
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < segmentStart || target >= segmentEnd) return order
  const next = [...order]
  const current = next[index]
  const swapped = next[target]
  if (current === undefined || swapped === undefined) return order
  next[index] = swapped
  next[target] = current
  return next
}

/** Chapter progress from already-seen concept ids (mastery or covered). */
export function chapterCoverage(
  concepts: readonly Concept[],
  seenConceptIds: ReadonlySet<string> | readonly string[],
): { readonly covered: number; readonly total: number } {
  const isSeen = (id: string): boolean => Array.isArray(seenConceptIds)
    ? (seenConceptIds as readonly string[]).includes(id)
    : (seenConceptIds as ReadonlySet<string>).has(id)
  return {
    covered: concepts.filter(concept => isSeen(concept.id as string)).length,
    total: concepts.length,
  }
}

/** Chapter id that contains a concept, if any. */
export function chapterContainingConcept(revision: CourseRevision, conceptId?: string): string | undefined {
  if (conceptId === undefined) return undefined
  return revision.chapters?.find(chapter => chapter.conceptIds.some(id => (id as string) === conceptId))?.id
}

/** Chapter to open by default: the current concept's chapter, else the first chapter. */
export function defaultOpenChapterId(revision: CourseRevision, currentConceptId?: string): string | undefined {
  return chapterContainingConcept(revision, currentConceptId) ?? revision.chapters?.[0]?.id
}

/** Whether a concept can move one step up/down inside its allowed segment. */
export function canMoveConcept(
  revision: CourseRevision,
  state: Pick<DraftEditState, 'order' | 'removed'>,
  conceptId: string,
  direction: 'up' | 'down',
): boolean {
  const next = moveConcept(revision, state, conceptId, direction)
  const keptBefore = state.order.filter(id => !state.removed.includes(id))
  if (next.length !== keptBefore.length) return true
  return next.some((id, index) => id !== keptBefore[index])
}

/** Titles that actually changed (trimmed, non-empty, different from the original). */
function changedTitles(
  revision: CourseRevision,
  state: DraftEditState,
  keptIds: ReadonlySet<string>,
): Record<string, string> | undefined {
  const changed: Record<string, string> = {}
  for (const concept of revision.concepts) {
    const id = concept.id as string
    if (!keptIds.has(id)) continue
    const raw = state.titles[id]
    if (raw === undefined) continue
    const title = raw.trim()
    if (title === '' || title === concept.title) continue
    changed[id] = title
  }
  return Object.keys(changed).length === 0 ? undefined : changed
}

/**
 * Build the confirm payload from the current edit state.
 *
 * @returns `undefined` when nothing changed (caller should confirm without the
 *          `edits` field); otherwise only the changed fields.
 */
export function buildDraftEdits(revision: CourseRevision, state: DraftEditState): DraftConfirmEdits | undefined {
  const kept = keptConceptIds(revision, state)
  const keptSet = new Set(kept)
  const existingIds = revision.concepts.map(concept => concept.id as string)
  const removedIds = existingIds.filter(id => state.removed.includes(id) && !keptSet.has(id))
  // The displayed baseline already reflects chapter grouping, so an untouched
  // chaptered draft is a no-op even when the raw `sequence` order differs.
  const displayedBaseline = orderedConceptIds(revision).filter(id => keptSet.has(id))
  const reordered = kept.length !== displayedBaseline.length
    || kept.some((id, index) => id !== displayedBaseline[index])
  const structuralChange = removedIds.length > 0 || reordered
  const titles = changedTitles(revision, state, keptSet)
  const goalsChanged = state.goals !== undefined
    && (state.goals.length !== revision.goals.length
      || state.goals.some((goal, index) => goal !== revision.goals[index]))

  if (!structuralChange && titles === undefined && !goalsChanged) return undefined
  return {
    ...(state.goals !== undefined && goalsChanged ? { goals: state.goals } : {}),
    ...(structuralChange ? { sequence: kept.map(id => id as ConceptId) } : {}),
    ...(titles !== undefined ? { conceptTitles: titles } : {}),
    ...(removedIds.length > 0 ? { removeConceptIds: removedIds.map(id => id as ConceptId) } : {}),
  }
}
