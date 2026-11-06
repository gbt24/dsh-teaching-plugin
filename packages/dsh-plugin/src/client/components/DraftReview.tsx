/**
 * Course-structure draft review, shared by the first-run wizard and the
 * workspace "structure pending" card. It shows the proposed chapters/concepts,
 * how the structure was produced (knowledge-base read vs LLM-wiki generation vs
 * AI draft), the review warnings and the valid next actions.
 *
 * Phase 2: the student can rename/remove/reorder concepts, rename chapters,
 * edit chapter summaries and add new concepts; confirming applies those edits
 * through `courseDraft.confirm`. Leaving the editor with unsaved changes asks
 * for explicit discard (inline, no window.confirm).
 * Chapters are optional: revisions created before the v2 structure keep the flat
 * ordered list view.
 */
import React, { useEffect, useRef, useState } from 'react'
import type { CourseChapter, CourseDraftView, CourseRevision } from '@deepseek-teaching/core/contracts'
import { Spinner } from './Banner.tsx'
import {
  addedConceptCount, buildDraftEdits, canMoveConcept, keptConceptIds,
  moveConcept, orderedConceptIds, previewStructure, totalConceptCount,
  type AddedConceptDraft, type DraftConfirmEdits, type DraftEditState,
} from '../draft-edits.ts'
import { integrationSummaryText } from '../source-helpers.ts'

export interface DraftReviewProps {
  readonly draft: CourseDraftView
  /** A request is in flight (confirm/regenerate/adhoc). */
  readonly busy: boolean
  /** Explicit failure from the last action; shown without blocking retry. */
  readonly error?: string
  /** Confirm the draft; when the student edited the structure, `edits` carries the changes. */
  readonly onConfirm: (edits?: DraftConfirmEdits) => void | Promise<void>
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

/** One concept line in the read-only chapter or flat fallback list. */
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

/** Chapter overview (read mode): title, role, summary, count and source anchors. */
function ChapterHead(props: {
  readonly chapter: CourseChapter
  readonly conceptCount: number
}): React.ReactElement {
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

/** Chapter header in edit mode: editable title and summary plus role/count. */
function ChapterEditHead(props: {
  readonly chapter: CourseChapter
  readonly title: string
  readonly summary: string
  readonly conceptCount: number
  readonly busy: boolean
  readonly onChangeTitle: (title: string) => void
  readonly onChangeSummary: (summary: string) => void
}): React.ReactElement {
  const { chapter } = props
  return (
    <div className="ai-chapter-head">
      <div className="ai-row" style={{ alignItems: 'center', gap: 8 }}>
        <input
          className="ai-edit-title ai-edit-chapter-title"
          value={props.title}
          disabled={props.busy}
          aria-label={`编辑章节标题 ${chapter.title}`}
          onChange={event => props.onChangeTitle(event.target.value)}
        />
        {chapter.role !== undefined && chapter.role !== 'chapter' && (
          <span className="ai-badge" data-chapter-role={chapter.role}>{CHAPTER_ROLE_LABELS[chapter.role]}</span>
        )}
        <span className="ai-muted">概念 {props.conceptCount} 个</span>
      </div>
      <input
        className="ai-edit-title ai-edit-chapter-summary"
        value={props.summary}
        disabled={props.busy}
        placeholder="章节摘要（可选，一句话）"
        aria-label={`编辑章节摘要 ${chapter.title}`}
        onChange={event => props.onChangeSummary(event.target.value)}
      />
      {chapter.sourceAnchors !== undefined && chapter.sourceAnchors.length > 0 && (
        <div className="ai-muted ai-chapter-anchors">
          章节来源：{chapter.sourceAnchors.slice(0, 4).map(anchor => anchor.label).join('；')}
          {chapter.sourceAnchors.length > 4 ? ` 等 ${chapter.sourceAnchors.length} 处` : ''}
        </div>
      )}
    </div>
  )
}

/** One editable existing concept row (title input + move/remove actions). */
function ConceptEditRow(props: {
  readonly revision: CourseRevision
  readonly concept: CourseRevision['concepts'][number]
  readonly state: DraftEditState
  readonly busy: boolean
  readonly onChangeTitle: (conceptId: string, title: string) => void
  readonly onMove: (conceptId: string, direction: 'up' | 'down') => void
  readonly onRemove: (conceptId: string) => void
}): React.ReactElement {
  const { concept, revision, state } = props
  const id = concept.id as string
  const currentTitle = state.titles[id] ?? concept.title
  return (
    <div className="ai-edit-row">
      <div className="ai-edit-main">
        <input
          className="ai-edit-title"
          value={currentTitle}
          disabled={props.busy}
          aria-label={`编辑概念标题 ${concept.title}`}
          onChange={event => props.onChangeTitle(id, event.target.value)}
        />
        {concept.summary !== '' && <div className="ai-muted ai-edit-summary">{concept.summary}</div>}
      </div>
      <div className="ai-row">
        <button
          type="button"
          className="ai-small-button"
          disabled={props.busy || !canMoveConcept(revision, state, id, 'up')}
          onClick={() => props.onMove(id, 'up')}
          aria-label={`上移概念 ${currentTitle}`}
          title="上移"
        >
          ↑
        </button>
        <button
          type="button"
          className="ai-small-button"
          disabled={props.busy || !canMoveConcept(revision, state, id, 'down')}
          onClick={() => props.onMove(id, 'down')}
          aria-label={`下移概念 ${currentTitle}`}
          title="下移"
        >
          ↓
        </button>
        <button
          type="button"
          className="ai-danger-button"
          disabled={props.busy}
          onClick={() => props.onRemove(id)}
          aria-label={`删除概念 ${currentTitle}`}
          title="删除"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** One student-authored concept row (no source anchors yet). */
function AddedConceptRow(props: {
  readonly added: AddedConceptDraft
  readonly busy: boolean
  readonly onChangeTitle: (key: string, title: string) => void
  readonly onChangeSummary: (key: string, summary: string) => void
  readonly onRemove: (key: string) => void
}): React.ReactElement {
  const { added } = props
  return (
    <div className="ai-edit-row ai-edit-row-added">
      <div className="ai-edit-main">
        <div className="ai-row" style={{ alignItems: 'center', gap: 6 }}>
          <span className="ai-badge" data-added="true">新增</span>
          <input
            className="ai-edit-title"
            value={added.title}
            disabled={props.busy}
            placeholder="新概念标题（必填）"
            aria-label="新增概念标题"
            onChange={event => props.onChangeTitle(added.key, event.target.value)}
          />
        </div>
        <input
          className="ai-edit-title ai-edit-optional"
          value={added.summary ?? ''}
          disabled={props.busy}
          placeholder="一句话摘要（可选）"
          aria-label="新增概念摘要"
          onChange={event => props.onChangeSummary(added.key, event.target.value)}
        />
        <div className="ai-muted ai-edit-hint">新增概念暂无资料锚点；教学时会标注为模型知识补充。</div>
      </div>
      <div className="ai-row">
        <button
          type="button"
          className="ai-danger-button"
          disabled={props.busy}
          onClick={() => props.onRemove(added.key)}
          aria-label={`删除新增概念 ${added.title === '' ? '未命名' : added.title}`}
          title="删除新增概念"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** The empty edit state derived from the current revision. */
function originalEditState(revision: CourseRevision): {
  readonly order: readonly string[]
  readonly titles: Record<string, string>
  readonly removed: readonly string[]
  readonly chapterTitles: Record<string, string>
  readonly chapterSummaries: Record<string, string>
  readonly addedConcepts: readonly AddedConceptDraft[]
} {
  return {
    order: orderedConceptIds(revision),
    titles: {},
    removed: [],
    chapterTitles: {},
    chapterSummaries: {},
    addedConcepts: [],
  }
}

/** Draft preview with the valid next actions and structure editing. */
export function DraftReview(props: DraftReviewProps): React.ReactElement {
  const { draft } = props
  const revision = draft.revision
  const conceptCount = revision.concepts.length
  const origin = draft.origin
  const structureNotes = draft.structureNotes ?? []

  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<readonly string[]>(() => orderedConceptIds(revision))
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [removed, setRemoved] = useState<readonly string[]>([])
  const [chapterTitles, setChapterTitles] = useState<Record<string, string>>({})
  const [chapterSummaries, setChapterSummaries] = useState<Record<string, string>>({})
  const [addedConcepts, setAddedConcepts] = useState<readonly AddedConceptDraft[]>([])
  const [pendingDiscard, setPendingDiscard] = useState<{
    readonly label: string
    readonly run: () => void
  } | undefined>(undefined)
  const nextAddedKey = useRef(1)

  // A different draft revision (regenerated draft) restarts any pending edit.
  useEffect(() => {
    setEditing(false)
    setOrder(orderedConceptIds(revision))
    setTitles({})
    setRemoved([])
    setChapterTitles({})
    setChapterSummaries({})
    setAddedConcepts([])
    setPendingDiscard(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision.id, revision.version])

  const editState: DraftEditState = {
    order,
    titles,
    removed,
    chapterTitles,
    chapterSummaries,
    addedConcepts,
  }
  const kept = keptConceptIds(revision, editState)
  const addedCount = addedConceptCount(editState)
  const totalCount = totalConceptCount(revision, editState)
  const edits = buildDraftEdits(revision, editState)
  const dirty = edits !== undefined
  const preview = previewStructure(revision, editState)
  const chapters = revision.chapters ?? []
  const canConfirm = !props.busy && totalCount > 0

  /** Restore all editor state to the untouched draft. */
  const resetChanges = (): void => {
    const original = originalEditState(revision)
    setOrder(original.order)
    setTitles(original.titles)
    setRemoved(original.removed)
    setChapterTitles(original.chapterTitles)
    setChapterSummaries(original.chapterSummaries)
    setAddedConcepts(original.addedConcepts)
    setPendingDiscard(undefined)
  }
  const beginEditing = (): void => {
    resetChanges()
    setEditing(true)
  }
  const cancelEditing = (): void => {
    resetChanges()
    setEditing(false)
  }
  const changeTitle = (conceptId: string, title: string): void => {
    setTitles(previous => ({ ...previous, [conceptId]: title }))
  }
  const removeConcept = (conceptId: string): void => {
    setRemoved(previous => previous.includes(conceptId) ? previous : [...previous, conceptId])
  }
  const move = (conceptId: string, direction: 'up' | 'down'): void => {
    setOrder(moveConcept(revision, editState, conceptId, direction))
  }
  const changeChapterTitle = (chapterId: string, title: string): void => {
    setChapterTitles(previous => ({ ...previous, [chapterId]: title }))
  }
  const changeChapterSummary = (chapterId: string, summary: string): void => {
    setChapterSummaries(previous => ({ ...previous, [chapterId]: summary }))
  }
  const addConcept = (chapterId?: string): void => {
    const key = `added-${nextAddedKey.current}`
    nextAddedKey.current += 1
    setAddedConcepts(previous => [...previous, {
      key,
      title: '',
      ...(chapterId !== undefined ? { chapterId } : {}),
    }])
  }
  const changeAddedTitle = (key: string, title: string): void => {
    setAddedConcepts(previous => previous.map(item => item.key === key ? { ...item, title } : item))
  }
  const changeAddedSummary = (key: string, summary: string): void => {
    setAddedConcepts(previous => previous.map(item => item.key === key ? { ...item, summary } : item))
  }
  const removeAdded = (key: string): void => {
    setAddedConcepts(previous => previous.filter(item => item.key !== key))
  }

  /** Run a leave action, asking first when the editor has unsaved changes. */
  const requestLeave = (label: string, run: () => void): void => {
    if (editing && dirty) {
      setPendingDiscard({ label, run })
      return
    }
    run()
  }
  const discardAndContinue = (): void => {
    const action = pendingDiscard
    if (action === undefined) return
    resetChanges()
    setEditing(false)
    action.run()
  }
  const confirm = (): void => {
    void props.onConfirm(editing ? buildDraftEdits(revision, editState) : undefined)
  }

  // Browser-level guard while the editor holds unsaved changes.
  useEffect(() => {
    if (!editing || !dirty) return
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
    const handler = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editing, dirty])

  /** Concepts of one editor section in the current (edited) order. */
  const sectionConcepts = (ids: readonly string[]): readonly CourseRevision['concepts'][number][] =>
    order
      .filter(id => ids.includes(id) && kept.includes(id))
      .map(id => conceptById.get(id))
      .filter((concept): concept is CourseRevision['concepts'][number] => concept !== undefined)

  const conceptById = new Map(revision.concepts.map(concept => [concept.id as string, concept]))

  /** Existing + added rows of one chapter/ungrouped section in edit mode. */
  const renderEditableSection = (
    conceptIds: readonly string[],
    added: readonly AddedConceptDraft[],
    chapterId: string | undefined,
  ): React.ReactElement => (
    <div className="ai-edit-rows">
      {sectionConcepts(conceptIds).map(concept => (
        <ConceptEditRow
          key={concept.id}
          revision={revision}
          concept={concept}
          state={editState}
          busy={props.busy}
          onChangeTitle={changeTitle}
          onMove={move}
          onRemove={removeConcept}
        />
      ))}
      {added.map(item => (
        <AddedConceptRow
          key={item.key}
          added={item}
          busy={props.busy}
          onChangeTitle={changeAddedTitle}
          onChangeSummary={changeAddedSummary}
          onRemove={removeAdded}
        />
      ))}
      <button
        type="button"
        className="ai-small-button ai-add-concept"
        disabled={props.busy}
        onClick={() => addConcept(chapterId)}
        aria-label={chapterId === undefined ? '添加概念（未分组）' : `添加概念到章节 ${chapterId}`}
      >
        ＋ 添加概念
      </button>
    </div>
  )

  return (
    <div className="ai-draft-review">
      <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>课程结构草案（v{revision.version}）{editing ? ' · 编辑中' : ''}</h3>
      {draft.integration !== undefined && (
        <div className="ai-banner ai-integration-banner" data-kind="info" role="status" style={{ margin: '6px 0', borderRadius: 8 }}>
          <div>
            <div>{integrationSummaryText(draft.integration)}</div>
            {draft.integration.warnings.length > 0 && (
              <ul className="ai-warning-list">
                {draft.integration.warnings.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            <div className="ai-muted" style={{ marginTop: 2 }}>
              这是新资料整合后的增量结构；旧概念被保留，确认前可继续编辑。
            </div>
          </div>
        </div>
      )}
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
        来源覆盖：{draft.coverage.length} 份资料 · 概念 {editing ? totalCount : conceptCount} 个
        · 学习顺序 {editing ? totalCount : revision.sequence.length} 步
        {chapters.length > 0 ? ` · 章节 ${chapters.length} 个` : ''}
        {editing && addedCount > 0 ? ` · 新增 ${addedCount} 个` : ''}
        {editing && removed.length > 0 ? ` · 已移除 ${removed.length} 个` : ''}
      </div>
      {!editing && conceptCount > 0 && (
        <div className="ai-row" style={{ margin: '6px 0 2px' }}>
          <button
            type="button"
            className="ai-small-button"
            disabled={props.busy}
            onClick={beginEditing}
            aria-label="编辑课程结构"
          >
            编辑结构
          </button>
          <span className="ai-muted">可改名、删除、调整顺序、改章节标题/摘要或添加概念；确认时一并应用。</span>
        </div>
      )}
      {editing && (
        <>
          <div className="ai-row" style={{ margin: '6px 0 2px' }}>
            <button
              type="button"
              className="ai-small-button"
              disabled={props.busy}
              onClick={() => requestLeave('取消编辑', cancelEditing)}
            >
              取消编辑
            </button>
            <button type="button" className="ai-small-button" disabled={props.busy} onClick={resetChanges}>
              重置修改
            </button>
            <span className="ai-muted">修改在点击「确认结构并开始学习」时提交；不会改动原始资料。</span>
          </div>
          <div className="ai-muted ai-edit-hint" style={{ margin: '2px 0 0' }}>
            新增概念暂无资料锚点，教学时会标注为模型知识补充。
          </div>
        </>
      )}
      {pendingDiscard !== undefined && (
        <div className="ai-banner ai-unsaved-guard" data-kind="warning" role="alert" style={{ margin: '8px 0', borderRadius: 8 }}>
          <span>
            有未保存的结构修改：{pendingDiscard.label}将丢弃这些修改。
          </span>
          <span className="ai-row" style={{ marginLeft: 'auto' }}>
            <button type="button" className="ai-small-button" disabled={props.busy} onClick={discardAndContinue}>
              放弃修改并继续
            </button>
            <button type="button" className="ai-small-button" disabled={props.busy} onClick={() => setPendingDiscard(undefined)}>
              继续编辑
            </button>
          </span>
        </div>
      )}
      {draft.warnings.length > 0 && (
        <ul className="ai-warning-list">
          {draft.warnings.map(warning => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      {chapters.length > 0 ? (
        <div className="ai-chapter-list">
          {preview.chapters.map(group => (
            <section className="ai-chapter" key={group.chapter.id} aria-label={`章节 ${group.chapter.title}`}>
              {editing ? (
                <ChapterEditHead
                  chapter={group.chapter}
                  title={chapterTitles[group.chapter.id] ?? group.chapter.title}
                  summary={chapterSummaries[group.chapter.id] ?? group.chapter.summary ?? ''}
                  conceptCount={group.concepts.length + group.added.length}
                  busy={props.busy}
                  onChangeTitle={title => changeChapterTitle(group.chapter.id, title)}
                  onChangeSummary={summary => changeChapterSummary(group.chapter.id, summary)}
                />
              ) : (
                <ChapterHead chapter={group.chapter} conceptCount={group.concepts.length} />
              )}
              {editing ? (
                renderEditableSection(
                  group.chapter.conceptIds.map(id => id as string),
                  group.added,
                  group.chapter.id,
                )
              ) : group.concepts.length === 0 ? (
                <div className="ai-muted">（该章节暂时没有可展示的概念）</div>
              ) : (
                <ol className="ai-checklist ai-chapter-concepts">
                  {group.concepts.map(concept => <ConceptItem key={concept.id} concept={concept} />)}
                </ol>
              )}
            </section>
          ))}
          {(editing || preview.ungroupedConcepts.length + preview.ungroupedAdded.length > 0) && (
            <section className="ai-chapter" aria-label="未分组概念">
              <div className="ai-chapter-head">
                <div className="ai-row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="ai-chapter-title">未分组概念</span>
                  <span className="ai-muted">
                    概念 {preview.ungroupedConcepts.length + preview.ungroupedAdded.length} 个
                  </span>
                </div>
                <div className="ai-chapter-summary">
                  {editing
                    ? '这些概念不归属任何章节（新增不选章节时也放在这里）。'
                    : '这些概念未归入任何章节，仍会按学习顺序出现。'}
                </div>
              </div>
              {editing ? (
                renderEditableSection(
                  preview.ungroupedConcepts.map(concept => concept.id as string),
                  preview.ungroupedAdded,
                  undefined,
                )
              ) : (
                <ol className="ai-checklist ai-chapter-concepts">
                  {preview.ungroupedConcepts.map(concept => <ConceptItem key={concept.id} concept={concept} />)}
                </ol>
              )}
            </section>
          )}
        </div>
      ) : editing ? (
        renderEditableSection(preview.ungroupedConcepts.map(concept => concept.id as string), preview.ungroupedAdded, undefined)
      ) : (
        <ol className="ai-checklist">
          {revision.sequence.map((conceptId) => {
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
      {editing && totalCount === 0 && (
        <div className="ai-banner" data-kind="warning" role="status" style={{ margin: '8px 0', borderRadius: 8 }}>
          <span>至少保留或新增一个概念才能确认结构。请「取消编辑」「重置修改」，或直接重新生成草案。</span>
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
          disabled={!canConfirm}
          onClick={confirm}
          title={editing ? '提交修改并确认课程结构' : undefined}
        >
          确认结构并开始学习
        </button>
        <button
          type="button"
          className="ai-small-button"
          disabled={props.busy}
          onClick={() => requestLeave('重新生成草案', () => void props.onRegenerate())}
        >
          重新生成草案
        </button>
        <button
          type="button"
          className="ai-small-button"
          disabled={props.busy}
          onClick={() => requestLeave('先随便问问', () => void props.onAdhoc())}
        >
          先随便问问（随问随学）
        </button>
        {props.onBack !== undefined && (
          <button
            type="button"
            className="ai-link-button"
            disabled={props.busy}
            onClick={() => requestLeave('返回补充资料', () => props.onBack?.())}
          >
            返回补充资料
          </button>
        )}
      </div>
      {conceptCount === 0 && (
        <div className="ai-muted" style={{ marginTop: 6 }}>
          草案还没有概念：请先导入可读资料后重新生成，或直接「先随便问问」用最小结构开始。
        </div>
      )}
    </div>
  )
}
