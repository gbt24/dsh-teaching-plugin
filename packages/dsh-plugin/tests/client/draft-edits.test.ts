/**
 * Pure tests for draft editing and chapter grouping helpers (no React).
 *
 * These cover the semantics the Phase 2 draft review relies on: display order,
 * rename/remove/reorder edits, no-op detection, all-removed behaviour and the
 * chapter grouping/progress used by the learning sidebar.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  Concept, CourseChapter, CourseRevision,
} from '@deepseek-teaching/core/contracts'
import {
  buildDraftEdits, canMoveConcept, chapterContainingConcept, chapterCoverage, defaultOpenChapterId,
  groupConceptsByChapters, keptConceptIds, moveConcept, orderedConceptIds,
  type DraftEditState,
} from '../../src/client/draft-edits.ts'

const NOW = '2026-11-05T08:00:00.000Z'

function concept(id: string, title: string, summary = ''): Concept {
  return {
    id: id as never,
    title,
    summary,
    prerequisites: [],
    sourceAnchors: [],
  }
}

function chapter(id: string, title: string, conceptIds: readonly string[], role?: CourseChapter['role']): CourseChapter {
  return {
    id,
    title,
    conceptIds: conceptIds.map(conceptId => conceptId as never),
    ...(role !== undefined ? { role } : {}),
  }
}

function revision(options: {
  readonly concepts: readonly Concept[]
  readonly sequence: readonly string[]
  readonly chapters?: readonly CourseChapter[]
}): CourseRevision {
  return {
    id: 'crev-1' as never,
    courseId: 'course-1' as never,
    version: 2,
    createdAt: NOW,
    state: 'draft',
    provenance: 'kb-structure',
    goals: ['理解递归'],
    language: 'zh',
    sources: [],
    concepts: options.concepts,
    sequence: options.sequence.map(id => id as never),
    ...(options.chapters !== undefined ? { chapters: options.chapters } : {}),
    basedOn: [],
  }
}

/** Two chapters + one ungrouped concept; sequence interleaves chapter order. */
function chapteredRevision(): CourseRevision {
  return revision({
    concepts: [concept('a', 'A'), concept('b', 'B'), concept('c', 'C'), concept('u', 'U')],
    sequence: ['a', 'c', 'b', 'u'],
    chapters: [
      chapter('ch1', '第一章', ['a', 'b']),
      chapter('ch2', '第二章', ['c']),
      chapter('ch-app', '附录', [], 'appendix'),
    ],
  })
}

function editState(overrides: Partial<DraftEditState> = {}): DraftEditState {
  return { order: orderedConceptIds(chapteredRevision()), titles: {}, removed: [], ...overrides }
}

test('orderedConceptIds: chapter order, intra-chapter sequence order, then ungrouped', () => {
  assert.deepEqual(orderedConceptIds(chapteredRevision()), ['a', 'b', 'c', 'u'])
  // Old flat revisions simply follow sequence.
  const flat = revision({ concepts: [concept('x', 'X'), concept('y', 'Y')], sequence: ['y', 'x'] })
  assert.deepEqual(orderedConceptIds(flat), ['y', 'x'])
  // Concepts missing from sequence still appear (after ordered ones).
  const extra = revision({ concepts: [concept('x', 'X'), concept('z', 'Z')], sequence: ['x'] })
  assert.deepEqual(orderedConceptIds(extra), ['x', 'z'])
})

test('groupConceptsByChapters resolves chapter concepts and ungrouped concepts', () => {
  const groups = groupConceptsByChapters(chapteredRevision())
  assert.equal(groups.hasChapters, true)
  assert.deepEqual(groups.chapters.map(group => group.chapter.id), ['ch1', 'ch2', 'ch-app'])
  assert.deepEqual(groups.chapters[0]?.concepts.map(item => item.id), ['a', 'b'])
  assert.deepEqual(groups.chapters[1]?.concepts.map(item => item.id), ['c'])
  assert.equal(groups.chapters[2]?.concepts.length, 0, 'appendix may have no concepts')
  assert.deepEqual(groups.ungrouped.map(item => item.id), ['u'])

  const flat = groupConceptsByChapters(revision({ concepts: [concept('x', 'X')], sequence: ['x'] }))
  assert.equal(flat.hasChapters, false)
  assert.deepEqual(flat.ungrouped.map(item => item.id), ['x'])
})

test('buildDraftEdits returns undefined when nothing changed', () => {
  assert.equal(buildDraftEdits(chapteredRevision(), editState()), undefined)
  // A title that equals the original (or only whitespace) is not an edit.
  assert.equal(buildDraftEdits(chapteredRevision(), editState({ titles: { a: 'A', b: '  ' } })), undefined)
})

test('rename-only edits send conceptTitles and nothing else', () => {
  const edits = buildDraftEdits(chapteredRevision(), editState({ titles: { a: '新的 A', c: '  C 改名 ' } }))
  assert.deepEqual(edits, { conceptTitles: { a: '新的 A', c: 'C 改名' } })
})

test('removing a concept sends removeConceptIds and the kept sequence', () => {
  const edits = buildDraftEdits(chapteredRevision(), editState({ removed: ['b'] }))
  assert.deepEqual(edits?.removeConceptIds, ['b'])
  assert.deepEqual(edits?.sequence, ['a', 'c', 'u'])
  assert.equal(edits?.conceptTitles, undefined)
})

test('reordering inside a chapter sends the changed sequence', () => {
  const state = editState()
  const moved = moveConcept(chapteredRevision(), state, 'a', 'down')
  assert.deepEqual(moved, ['b', 'a', 'c', 'u'])
  const edits = buildDraftEdits(chapteredRevision(), { ...state, order: moved })
  assert.deepEqual(edits?.sequence, ['b', 'a', 'c', 'u'])
  assert.equal(edits?.removeConceptIds, undefined)
})

test('move is constrained to the concept chapter and stops at boundaries', () => {
  const rev = chapteredRevision()
  const state = editState()
  assert.equal(canMoveConcept(rev, state, 'a', 'up'), false, 'first in chapter cannot move up')
  assert.equal(canMoveConcept(rev, state, 'b', 'up'), true)
  // `b` cannot move below its chapter end into the second chapter.
  assert.equal(canMoveConcept(rev, state, 'b', 'down'), false)
  const moved = moveConcept(rev, state, 'b', 'up')
  assert.deepEqual(moved, ['b', 'a', 'c', 'u'])
  // Ungrouped concepts move inside the ungrouped tail only (single item here).
  assert.equal(canMoveConcept(rev, state, 'u', 'up'), false)
  // Flat revisions reorder globally.
  const flat = revision({ concepts: [concept('x', 'X'), concept('y', 'Y')], sequence: ['x', 'y'] })
  assert.equal(canMoveConcept(flat, { order: ['x', 'y'], removed: [] }, 'y', 'up'), true)
  assert.deepEqual(moveConcept(flat, { order: ['x', 'y'], removed: [] }, 'y', 'up'), ['y', 'x'])
})

test('all concepts removed is reported so the UI can block confirmation', () => {
  const state = editState({ removed: ['a', 'b', 'c', 'u'] })
  assert.deepEqual(keptConceptIds(chapteredRevision(), state), [])
  assert.deepEqual(buildDraftEdits(chapteredRevision(), state), {
    removeConceptIds: ['a', 'b', 'c', 'u'],
    sequence: [],
  })
})

test('goals override is sent only when it actually differs', () => {
  const same = buildDraftEdits(chapteredRevision(), editState({ goals: ['理解递归'] }))
  assert.equal(same, undefined)
  assert.deepEqual(buildDraftEdits(chapteredRevision(), editState({ goals: ['新的目标'] })),
    { goals: ['新的目标'] })
})

test('chapter progress and default-open chapter follow mastery/current concept', () => {
  const rev = chapteredRevision()
  assert.deepEqual(chapterCoverage([concept('a', 'A'), concept('b', 'B')], new Set(['a'])), { covered: 1, total: 2 })
  assert.deepEqual(chapterCoverage([], ['x']), { covered: 0, total: 0 })
  assert.equal(chapterContainingConcept(rev, 'b'), 'ch1')
  assert.equal(chapterContainingConcept(rev, 'u'), undefined)
  assert.equal(defaultOpenChapterId(rev, 'c'), 'ch2')
  assert.equal(defaultOpenChapterId(rev, undefined), 'ch1')
  assert.equal(defaultOpenChapterId(revision({ concepts: [concept('x', 'X')], sequence: ['x'] }), 'x'), undefined)
})
