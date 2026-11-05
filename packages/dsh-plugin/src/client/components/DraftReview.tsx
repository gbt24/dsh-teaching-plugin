/**
 * Course-structure draft review, shared by the first-run wizard and the
 * workspace "structure pending" card. It shows the proposed chapters/concepts,
 * how the structure was produced (knowledge-base read vs LLM-wiki generation vs
 * AI draft), the review warnings and the three valid next actions.
 *
 * Chapters are optional: revisions created before the v2 structure keep the
 * flat ordered list view. Phase 1 is read-only (no structure editing yet).
 */
import React from 'react'
import type { CourseChapter, CourseDraftView, CourseRevision } from '@deepseek-teaching/core/contracts'
import { Spinner } from './Banner.tsx'

export interface DraftReviewProps {
  readonly draft: CourseDraftView
  /** A request is in flight (confirm/regenerate/adhoc). */
  readonly busy: boolean
  /** Explicit failure from the last action; shown without blocking retry. */
  readonly error?: string
  readonly onConfirm: () => void | Promise<void>
  readonly onRegenerate: () => void | Promise<void>
  readonly onAdhoc: () => void | Promise<void>
  /** Return to the material-import step (wizard only). */
  readonly onBack?: () => void
}

/** Human-readable labels for how the structure was produced. */
const ORIGIN_LABELS: Readonly<Record<NonNullable<CourseDraftView['origin']>, string>> = {
  'kb-structure': '结构来源：知识库（直接读取，未重新生成）',
  'llm-wiki': '结构来源：按 LLM-wiki 规则生成',
  ai: '结构来源：AI 生成',
}

/** Chapter role labels; a plain chapter needs no extra badge. */
const CHAPTER_ROLE_LABELS: Readonly<Record<'chapter' | 'appendix' | 'tool', string>> = {
  chapter: '章节',
  appendix: '附录',
  tool: '跨章工具',
}

/**
 * Group chapter concepts by the revision sequence order.
 *
 * Concepts not listed in `sequence` keep their chapter-local order; concepts
 * that belong to no chapter are returned as "ungrouped" so nothing silently
 * disappears from the review. Old revisions without `chapters` keep the flat
 * `sequence` list (handled by the caller).
 */
function groupChapterConcepts(revision: CourseRevision): {
  readonly groups: readonly {
    readonly chapter: CourseChapter
    readonly concepts: readonly CourseRevision['concepts'][number][]
  }[]
  readonly ungrouped: readonly CourseRevision['concepts'][number][]
} {
  const chapters = revision.chapters ?? []
  const sequenceIndex = new Map<string, number>()
  revision.sequence.forEach((conceptId, index) => sequenceIndex.set(conceptId as string, index))
  const conceptById = new Map(revision.concepts.map(concept => [concept.id as string, concept]))
  const groupedIds = new Set<string>()
  const groups = chapters.map(chapter => {
    const chapterConcepts = chapter.conceptIds
      .map((conceptId, localIndex) => {
        const concept = conceptById.get(conceptId as string)
        if (concept !== undefined) groupedIds.add(conceptId as string)
        return {
          concept,
          order: sequenceIndex.get(conceptId as string) ?? Number.MAX_SAFE_INTEGER + localIndex,
        }
      })
      .filter((entry): entry is { concept: CourseRevision['concepts'][number]; order: number } => entry.concept !== undefined)
      .sort((a, b) => a.order - b.order)
      .map(entry => entry.concept)
    return { chapter, concepts: chapterConcepts }
  })
  const ungrouped = revision.sequence
    .map(conceptId => conceptById.get(conceptId as string))
    .filter((concept): concept is CourseRevision['concepts'][number] =>
      concept !== undefined && !groupedIds.has(concept.id as string))
  return { groups, ungrouped }
}

/** One concept line in the chapter or flat fallback list. */
function ConceptItem(props: { readonly concept: CourseRevision['concepts'][number] }): React.ReactElement {
  const { concept } = props
  return (
    <li>
      <strong>{concept.title}</strong>
      {concept.summary !== '' ? ` — ${concept.summary}` : ''}
      {concept.sourceAnchors.length === 0 ? '（仅模型知识，无资料依据）' : ''}
    </li>
  )
}

/** Chapter overview: title, role, summary, count and source anchors. */
function ChapterHead(props: { readonly chapter: CourseChapter; readonly conceptCount: number }): React.ReactElement {
  const { chapter } = props
  return (
    <div className="ai-chapter-head">
      <div className="ai-row" style={{ alignItems: 'baseline', gap: 8 }}>
        <span className="ai-chapter-title">{chapter.title}</span>
        {chapter.role !== undefined && chapter.role !== 'chapter' && (
          <span className="ai-badge" data-chapter-role={chapter.role}>{CHAPTER_ROLE_LABELS[chapter.role]}</span>
        )}
        <span className="ai-muted">概念 {props.conceptCount} 个</span>
      </div>
      {chapter.summary !== undefined && chapter.summary !== '' && (
        <div className="ai-chapter-summary">{chapter.summary}</div>
      )}
      {chapter.sourceAnchors !== undefined && chapter.sourceAnchors.length > 0 && (
        <div className="ai-muted ai-chapter-anchors">
          章节来源：{chapter.sourceAnchors.slice(0, 4).map(anchor => anchor.label).join('；')}
          {chapter.sourceAnchors.length > 4 ? ` 等 ${chapter.sourceAnchors.length} 处` : ''}
        </div>
      )}
    </div>
  )
}

/** Draft preview with the three valid next actions. */
export function DraftReview(props: DraftReviewProps): React.ReactElement {
  const { draft } = props
  const revision = draft.revision
  const origin = draft.origin
  const structureNotes = draft.structureNotes ?? []
  const chapters = revision.chapters ?? []
  const { groups, ungrouped } = groupChapterConcepts(revision)
  return (
    <div className="ai-draft-review">
      <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>课程结构草案（v{revision.version}）</h3>
      {(origin !== undefined || structureNotes.length > 0) && (
        <div className="ai-draft-origin">
          {origin !== undefined && (
            <span className="ai-badge" data-origin={origin} aria-label={ORIGIN_LABELS[origin]}>
              {ORIGIN_LABELS[origin]}
            </span>
          )}
          {structureNotes.length > 0 && (
            <ul className="ai-structure-notes">
              {structureNotes.map(note => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className="ai-muted">
        来源覆盖：{draft.coverage.length} 份资料 · 概念 {revision.concepts.length} 个
        · 学习顺序 {revision.sequence.length} 步
        {chapters.length > 0 ? ` · 章节 ${chapters.length} 个` : ''}
      </div>
      {draft.warnings.length > 0 && (
        <ul className="ai-warning-list">
          {draft.warnings.map(warning => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      {chapters.length > 0 ? (
        <div className="ai-chapter-list">
          {groups.map(group => (
            <section className="ai-chapter" key={group.chapter.id} aria-label={`章节 ${group.chapter.title}`}>
              <ChapterHead chapter={group.chapter} conceptCount={group.concepts.length} />
              {group.concepts.length === 0 ? (
                <div className="ai-muted">（该章节暂时没有可展示的概念）</div>
              ) : (
                <ol className="ai-checklist ai-chapter-concepts">
                  {group.concepts.map(concept => <ConceptItem key={concept.id} concept={concept} />)}
                </ol>
              )}
            </section>
          ))}
          {ungrouped.length > 0 && (
            <section className="ai-chapter" aria-label="未分组概念">
              <div className="ai-chapter-head">
                <div className="ai-row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="ai-chapter-title">未分组概念</span>
                  <span className="ai-muted">概念 {ungrouped.length} 个</span>
                </div>
                <div className="ai-chapter-summary">这些概念未归入任何章节，仍会按学习顺序出现。</div>
              </div>
              <ol className="ai-checklist ai-chapter-concepts">
                {ungrouped.map(concept => <ConceptItem key={concept.id} concept={concept} />)}
              </ol>
            </section>
          )}
        </div>
      ) : (
        <ol className="ai-checklist">
          {revision.sequence.map(conceptId => {
            const concept = revision.concepts.find(item => item.id === conceptId)
            return concept === undefined ? null : (
              <ConceptItem key={concept.id} concept={concept} />
            )
          })}
        </ol>
      )}
      {draft.coverage.length > 0 && (
        <div className="ai-muted" style={{ marginTop: 6 }}>
          资料：{draft.coverage.map(item => `${item.title}（${item.status}，${item.usedUnits} 单元${item.issues > 0 ? `，${item.issues} 个问题` : ''}）`).join('；')}
        </div>
      )}
      {props.error !== undefined && (
        <div className="ai-banner" data-kind="error" role="alert" style={{ margin: '8px 0', borderRadius: 8 }}>
          <span>{props.error}</span>
        </div>
      )}
      {props.busy && <div style={{ marginTop: 6 }}><Spinner label="正在处理…" /></div>}
      <div className="ai-row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="ai-primary-button"
          disabled={props.busy || revision.concepts.length === 0}
          onClick={() => void props.onConfirm()}
        >
          确认结构并开始学习
        </button>
        <button type="button" className="ai-small-button" disabled={props.busy} onClick={() => void props.onRegenerate()}>
          重新生成草案
        </button>
        <button type="button" className="ai-small-button" disabled={props.busy} onClick={() => void props.onAdhoc()}>
          先随便问问（随问随学）
        </button>
        {props.onBack !== undefined && (
          <button type="button" className="ai-link-button" disabled={props.busy} onClick={props.onBack}>
            返回补充资料
          </button>
        )}
      </div>
      {revision.concepts.length === 0 && (
        <div className="ai-muted" style={{ marginTop: 6 }}>
          草案还没有概念：请先导入可读资料后重新生成，或直接「先随便问问」用最小结构开始。
        </div>
      )}
    </div>
  )
}
