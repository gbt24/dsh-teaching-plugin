/**
 * Left navigation of the teaching workspace: courses, concept progress,
 * sessions and evidence-based review suggestions. All data comes from the Host
 * (CourseDetail / SessionView / ReviewItem); this component only presents it.
 */
import React from 'react'
import type {
  Concept, CourseDetail, CourseSummary, MasteryRecord, ReviewItem, SessionSummary, SessionView,
} from '@deepseek-teaching/core/contracts'
import type { CourseProgress } from '../state.ts'
import {
  MASTERY_LABELS, REVIEW_REASON_LABELS, STAGE_LABELS, formatDay, truncate,
} from '../helpers.ts'

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
  readonly onConceptClick: (concept: Concept) => void
  readonly onReviewConcept: (item: ReviewItem) => void
  readonly onOpenSource: (documentId: string) => void
  /** Open the course-creation wizard (also used to add a second course). */
  readonly onNewCourse: () => void
  /** Request deletion of one course (the workspace shows the confirmation). */
  readonly onDeleteCourse: (courseId: string, title: string) => void
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

export function Sidebar(props: SidebarProps): React.ReactElement {
  const detail = props.courseDetail
  const concepts = orderedConcepts(detail)
  const masteryByConcept = new Map(props.mastery.map(record => [record.conceptId, record]))
  const currentConceptId = props.session?.session.position.conceptId
  const activeCourseId = detail?.course.id ?? props.courses[0]?.course.id
  const language = detail?.activeRevision?.language ?? detail?.draftRevision?.language ?? 'zh'
  const goal = detail?.activeRevision?.goals[0] ?? detail?.draftRevision?.goals[0]
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
          </div>
        )}
      </div>

      <div className="ai-sidebar-section">
        <h3 className="ai-sidebar-heading">
          概念进度（{props.progress.covered}/{props.progress.total}）
        </h3>
        {concepts.length === 0 && (
          <div className="ai-muted">
            {detail === undefined ? '尚未选择课程' : '课程结构尚未确认，确认后显示概念'}
          </div>
        )}
        {concepts.map(concept => {
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
        })}
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
          <button
            key={summary.id}
            type="button"
            className="ai-session-row"
            data-active={summary.id === props.session?.session.id}
            onClick={() => props.onSelectSession(summary.id)}
            aria-label={`打开会话 ${summary.title}`}
          >
            <span className="ai-session-title">{summary.title}</span>
            <span className="ai-badge">{STAGE_LABELS[summary.stage]}</span>
          </button>
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
          <h3 className="ai-sidebar-heading">资料</h3>
          {detail.sources.length === 0 && <div className="ai-muted">尚未导入资料</div>}
          {detail.sources.slice(0, 6).map(source => (
            <button
              key={source.id}
              type="button"
              className="ai-link-button"
              style={{ display: 'block' }}
              onClick={() => props.onOpenSource(source.id)}
              title={source.originalPath}
            >
              {source.missing === true ? '⚠ ' : ''}{truncate(source.title, 22)}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
