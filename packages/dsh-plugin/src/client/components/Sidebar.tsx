/**
 * Left navigation of the teaching workspace: courses, concept progress,
 * sessions and evidence-based review suggestions. All data comes from the Host
 * (CourseDetail / SessionView / ReviewItem); this component only presents it.
 */
import React, { useEffect, useState } from 'react'
import type {
  Concept, CourseDetail, CourseDraftView, CourseSummary, MasteryRecord, ReviewItem, SessionSummary,
  SessionView,
} from '@deepseek-teaching/core/contracts'
import type { CourseProgress } from '../state.ts'
import {
  MASTERY_LABELS, REVIEW_REASON_LABELS, STAGE_LABELS, formatDay, truncate,
} from '../helpers.ts'
import {
  chapterCoverage, defaultOpenChapterId, groupConceptsByChapters,
} from '../draft-edits.ts'
import { MaterialsPanel } from './MaterialsPanel.tsx'

export interface SidebarProps {
  readonly courses: readonly CourseSummary[]
  readonly courseDetail?: CourseDetail
  readonly sessions: readonly SessionSummary[]
  readonly session?: SessionView
  readonly mastery: readonly MasteryRecord[]
  readonly review: readonly ReviewItem[]
  readonly progress: CourseProgress
  readonly busy: boolean
  readonly onSelectCourse: (courseId: string) => void
  readonly onSelectSession: (sessionId: string) => void
  readonly onNewSession: () => void
  /** Request deletion of one learning session (workspace shows confirmation). */
  readonly onDeleteSession?: (session: SessionSummary) => void
  readonly onConceptClick: (concept: Concept) => void
  readonly onReviewConcept: (item: ReviewItem) => void
  readonly onOpenSource: (documentId: string) => void
  /** Open the course-creation wizard (also used to add a second course). */
  readonly onNewCourse: () => void
  /** Request deletion of one course (the workspace shows the confirmation). */
  readonly onDeleteCourse: (courseId: string, title: string) => void
  /** Open the learning-goals editor for the active course. */
  readonly onEditGoals?: () => void
  /** Local material import through the workspace (keeps its notify/task UI). */
  readonly onImportLocalPaths?: (courseId: string, paths: readonly string[]) => Promise<{ readonly ok: boolean; readonly error?: string }>
  readonly onPickDirectory?: () => Promise<string | null>
  /** Refresh the course/source list after adding materials. */
  readonly onMaterialsChanged?: () => void | Promise<void>
  /** Refreshed draft after incremental integration; open the draft review. */
  readonly onDraftReady?: (draft: CourseDraftView) => void
  /** Switch to the full source list tab. */
  readonly onShowAllSources?: () => void
}

/** Ordered concepts of the active (or draft) course revision. */
export function orderedConcepts(detail: CourseDetail | undefined): readonly Concept[] {
  const revision = detail?.activeRevision ?? detail?.draftRevision
  if (revision === undefined) return []
  const byId = new Map(revision.concepts.map(concept => [concept.id, concept]))
  const ordered: Concept[] = []
  for (const conceptId of revision.sequence) {
    const concept = byId.get(conceptId)
    if (concept !== undefined) {
      ordered.push(concept)
      byId.delete(conceptId)
    }
  }
  ordered.push(...byId.values())
  return ordered
}

const SIDEBAR_CHAPTER_ROLE_LABELS: Readonly<Record<'chapter' | 'appendix' | 'tool', string>> = {
  chapter: '',
  appendix: '附录',
  tool: '跨章工具',
}

export function Sidebar(props: SidebarProps): React.ReactElement {
  const detail = props.courseDetail
  const concepts = orderedConcepts(detail)
  const masteryByConcept = new Map(props.mastery.map(record => [record.conceptId, record]))
  const currentConceptId = props.session?.session.position.conceptId
  const revision = detail?.activeRevision ?? detail?.draftRevision
  const structure = revision === undefined ? undefined : groupConceptsByChapters(revision)
  const hasChapters = structure?.hasChapters === true
  /** Concept ids the student has seen: mastery beyond `unseen` or session coverage. */
  const seenConceptIds = new Set<string>()
  for (const conceptId of props.session?.session.coveredConceptIds ?? []) seenConceptIds.add(conceptId as string)
  for (const record of props.mastery) {
    if (record.level !== 'unseen') seenConceptIds.add(record.conceptId as string)
  }
  const [openChapterIds, setOpenChapterIds] = useState<ReadonlySet<string>>(new Set())
  // Opening chapters follow the revision (first chapter / current concept's chapter),
  // while a student's manual open/close stays untouched otherwise.
  useEffect(() => {
    if (!hasChapters || revision === undefined) {
      setOpenChapterIds(new Set())
      return
    }
    const target = defaultOpenChapterId(revision, currentConceptId as string | undefined)
    setOpenChapterIds(new Set(target === undefined ? [] : [target]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision?.id, currentConceptId])
  const activeCourseId = detail?.course.id ?? props.courses[0]?.course.id
  const language = detail?.activeRevision?.language ?? detail?.draftRevision?.language ?? 'zh'
  const goal = detail?.activeRevision?.goals[0] ?? detail?.draftRevision?.goals[0]
  /** One concept row (shared by the flat list and the chapter groups). */
  const renderConceptRow = (concept: Concept): React.ReactElement => {
    const record = masteryByConcept.get(concept.id)
    const level = record?.level ?? 'unseen'
    const current = concept.id === currentConceptId
    return (
      <button
        key={concept.id}
        type="button"
        className="ai-concept-row"
        data-current={current}
        onClick={() => props.onConceptClick(concept)}
        title={concept.summary}
        aria-label={`学习概念 ${concept.title}`}
        disabled={props.busy}
      >
        <span className="ai-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {concept.title}
        </span>
        <span className="ai-badge" data-level={level}>{MASTERY_LABELS[level]}</span>
      </button>
    )
  }
  return (
    <nav className="ai-teaching-sidebar" aria-label="课程导航">
      <div className="ai-sidebar-section">
        <div className="ai-sidebar-heading-row">
          <h3 className="ai-sidebar-heading">课程</h3>
          <button
            type="button"
            className="ai-small-button"
            onClick={() => props.onNewCourse()}
            disabled={props.busy}
            aria-label="新建课程"
            title="新建课程"
          >
            ＋ 新建课程
          </button>
        </div>
        {props.courses.length === 0 && <div className="ai-muted">还没有课程</div>}
        {props.courses.map(summary => (
          <div className="ai-course-row" key={summary.course.id}>
            <button
              type="button"
              className="ai-course-button"
              data-active={summary.course.id === activeCourseId}
              onClick={() => props.onSelectCourse(summary.course.id)}
              aria-label={`切换到课程 ${summary.course.title}`}
            >
              <span className="ai-course-title">{summary.course.title}</span>
              <span className="ai-course-meta">
                {summary.sourceCount} 份资料 · {summary.conceptCount} 个概念
                {summary.lastSessionAt !== undefined ? ` · ${formatDay(summary.lastSessionAt)}` : ''}
              </span>
              {summary.course.id === activeCourseId && (
                <span className="ai-progress" aria-label={`学习进度 ${props.progress.percent}%`}>
                  <span style={{ width: `${props.progress.percent}%` }} />
                </span>
              )}
            </button>
            <button
              type="button"
              className="ai-course-delete"
              title={`删除课程 ${summary.course.title}`}
              aria-label={`删除课程 ${summary.course.title}`}
              disabled={props.busy}
              onClick={() => props.onDeleteCourse(summary.course.id, summary.course.title)}
            >
              🗑
            </button>
          </div>
        ))}
        {detail !== undefined && (
          <div className="ai-muted" style={{ marginTop: 4 }}>
            {language === 'en' ? 'English' : language === 'bilingual' ? '中英双语' : '中文'}
            {goal !== undefined ? ` · 目标：${truncate(goal, 24)}` : ''}
            {props.onEditGoals !== undefined && (
              <button
                type="button"
                className="ai-link-button"
                style={{ marginLeft: 6 }}
                onClick={() => props.onEditGoals?.()}
                aria-label="编辑学习目标"
                title="编辑学习目标与基础"
              >
                ✏️ 编辑目标
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ai-sidebar-section">
        <div className="ai-sidebar-heading-row">
          <h3 className="ai-sidebar-heading">
            概念进度（{props.progress.covered}/{props.progress.total}）
          </h3>
          {hasChapters && structure !== undefined && (
            <span className="ai-row">
              <button
                type="button"
                className="ai-link-button"
                onClick={() => setOpenChapterIds(new Set(structure.chapters.map(group => group.chapter.id)))}
              >
                展开全部
              </button>
              <button type="button" className="ai-link-button" onClick={() => setOpenChapterIds(new Set())}>
                收起全部
              </button>
            </span>
          )}
        </div>
        {concepts.length === 0 && (
          <div className="ai-muted">
            {detail === undefined ? '尚未选择课程' : '课程结构尚未确认，确认后显示概念'}
          </div>
        )}
        {hasChapters && structure !== undefined ? (
          <div className="ai-sidebar-chapters">
            {structure.chapters.map(group => {
              const open = openChapterIds.has(group.chapter.id)
              const coverage = chapterCoverage(group.concepts, seenConceptIds)
              const showRole = group.chapter.role !== undefined && group.chapter.role !== 'chapter'
              return (
                <div className="ai-chapter-group" key={group.chapter.id}>
                  <button
                    type="button"
                    className="ai-chapter-toggle"
                    aria-expanded={open}
                    aria-label={`章节 ${group.chapter.title}`}
                    onClick={() => setOpenChapterIds((previous) => {
                      const next = new Set(previous)
                      if (next.has(group.chapter.id)) next.delete(group.chapter.id)
                      else next.add(group.chapter.id)
                      return next
                    })}
                  >
                    <span className="ai-collapsible-arrow" aria-hidden="true">{open ? '▾' : '▸'}</span>
                    <span className="ai-chapter-title">{group.chapter.title}</span>
                    {showRole && (
                      <span className="ai-badge" data-chapter-role={group.chapter.role}>
                        {SIDEBAR_CHAPTER_ROLE_LABELS[group.chapter.role as 'appendix' | 'tool']}
                      </span>
                    )}
                    <span className="ai-chapter-progress">已接触 {coverage.covered}/{coverage.total}</span>
                  </button>
                  {open && (
                    group.concepts.length === 0
                      ? <div className="ai-muted ai-chapter-empty">（本章暂无概念）</div>
                      : <div className="ai-chapter-concept-rows">{group.concepts.map(concept => renderConceptRow(concept))}</div>
                  )}
                </div>
              )
            })}
            {structure.ungrouped.length > 0 && (
              <div className="ai-chapter-group">
                <div className="ai-chapter-toggle ai-chapter-toggle-static">
                  <span className="ai-collapsible-arrow" aria-hidden="true">·</span>
                  <span className="ai-chapter-title">未分组概念</span>
                  <span className="ai-chapter-progress">
                    {structure.ungrouped.length} 个 · 已接触 {chapterCoverage(structure.ungrouped, seenConceptIds).covered}
                  </span>
                </div>
                <div className="ai-chapter-concept-rows">
                  {structure.ungrouped.map(concept => renderConceptRow(concept))}
                </div>
              </div>
            )}
          </div>
        ) : (
          concepts.map(concept => renderConceptRow(concept))
        )}
        {props.session !== undefined && (
          <div className="ai-muted" style={{ marginTop: 4 }}>
            当前阶段：{STAGE_LABELS[props.session.session.position.stage]}
          </div>
        )}
      </div>

      <div className="ai-sidebar-section">
        <h3 className="ai-sidebar-heading">学习会话</h3>
        {props.sessions.length === 0 && <div className="ai-muted">新建会话开始学习</div>}
        {props.sessions.slice(0, 8).map(summary => (
          <div
            key={summary.id}
            className="ai-session-row"
            data-active={summary.id === props.session?.session.id}
          >
            <button
              type="button"
              className="ai-session-main"
              onClick={() => props.onSelectSession(summary.id)}
              aria-label={`打开会话 ${summary.title}`}
            >
              <span className="ai-session-title">{summary.title}</span>
              <span className="ai-badge">{STAGE_LABELS[summary.stage]}</span>
            </button>
            {props.onDeleteSession !== undefined && (
              <button
                type="button"
                className="ai-session-delete"
                aria-label={`删除会话 ${summary.title}`}
                title="删除这个学习会话"
                disabled={props.busy}
                onClick={() => props.onDeleteSession?.(summary)}
              >
                删除
              </button>
            )}
          </div>
        ))}
        <button type="button" className="ai-link-button" onClick={props.onNewSession} disabled={props.busy}>
          + 新建学习会话
        </button>
      </div>

      <div className="ai-sidebar-section">
        <h3 className="ai-sidebar-heading">复习建议</h3>
        {props.review.length === 0 && <div className="ai-muted">暂无到期复习</div>}
        {props.review.slice(0, 5).map(item => {
          const concept = concepts.find(candidate => candidate.id === item.conceptId)
          const mastery = masteryByConcept.get(item.conceptId)
          return (
            <div className="ai-review-item" key={item.conceptId}>
              <div>{concept?.title ?? '概念'}</div>
              <div className="ai-review-reason">
                {REVIEW_REASON_LABELS[item.reason]} · 间隔 {item.intervalDays} 天
                {mastery !== undefined ? ` · ${MASTERY_LABELS[mastery.level]}` : ''}
              </div>
              <button
                type="button"
                className="ai-link-button"
                onClick={() => props.onReviewConcept(item)}
                disabled={props.busy}
              >
                开始复习
              </button>
            </div>
          )
        })}
      </div>

      {detail !== undefined && (
        <div className="ai-sidebar-section">
          <MaterialsPanel
            courseId={detail.course.id as string}
            sources={detail.sources}
            busy={props.busy}
            onOpenSource={documentId => props.onOpenSource(documentId)}
            {...(props.onImportLocalPaths !== undefined ? { onImportLocalPaths: props.onImportLocalPaths } : {})}
            {...(props.onPickDirectory !== undefined ? { onPickDirectory: props.onPickDirectory } : {})}
            {...(props.onMaterialsChanged !== undefined ? { onMaterialsChanged: props.onMaterialsChanged } : {})}
            {...(props.onDraftReady !== undefined ? { onDraftReady: props.onDraftReady } : {})}
            {...(props.onShowAllSources !== undefined ? { onShowAllSources: props.onShowAllSources } : {})}
          />
        </div>
      )}
    </nav>
  )
}
