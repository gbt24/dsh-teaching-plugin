/**
 * Workspace fallback when a course has only a draft structure and no confirmed
 * revision: the student must be able to generate/review/confirm the structure or
 * start ad-hoc (随问随学) instead of hitting a dead end.
 */
import React from 'react'
import type { CourseDetail, CourseDraftView } from '@deepseek-teaching/core/contracts'
import { DraftReview } from './DraftReview.tsx'
import { Spinner } from './Banner.tsx'

export interface CourseSetupCardProps {
  readonly detail: CourseDetail
  /** `loading` while fetching the draft; `draft` when it is shown. */
  readonly phase: 'ready' | 'loading' | 'draft' | 'error'
  readonly draft?: CourseDraftView
  readonly error?: string
  readonly busy: boolean
  readonly hasDraftConcepts: boolean
  /** Generate (or regenerate) a draft through a Host task. */
  readonly onGenerate: () => void
  /** Fetch an existing draft and show it for confirmation. */
  readonly onLoadDraft: () => void
  readonly onConfirm: (revisionId: string) => void
  readonly onAdhoc: () => void
}

/**
 * Persistent "course structure pending" card.
 *
 * @param props - course detail, current draft state and the three possible next
 *                actions (generate, review+confirm, ad-hoc start).
 */
export function CourseSetupCard(props: CourseSetupCardProps): React.ReactElement {
  const { detail } = props
  const goals = detail.activeRevision?.goals ?? detail.draftRevision?.goals ?? []
  const busy = props.busy || props.phase === 'loading'
  return (
    <div className="ai-course-setup" role="region" aria-label="课程结构待确认">
      <div className="ai-course-setup-card">
        <div className="ai-row" style={{ alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{detail.course.title}</h2>
          <span className="ai-badge">课程结构待确认</span>
        </div>
        {goals.length > 0 && (
          <div className="ai-muted" style={{ marginTop: 4 }}>学习目标：{goals.join('；')}</div>
        )}
        <p className="ai-muted" style={{ margin: '8px 0 10px' }}>
          这门课程还没有确认的课程结构，系统学习与练习需要先确认概念与学习顺序；
          也可以直接「先随便问问」用最小结构开始，之后再补全。
        </p>
        {props.error !== undefined && (
          <div className="ai-banner" data-kind="error" role="alert" style={{ marginBottom: 10, borderRadius: 8 }}>
            <span>{props.error}</span>
          </div>
        )}
        {props.phase === 'loading' && <Spinner label="正在生成/读取课程结构…（知识库结构直读较快；LLM-wiki 生成可能需要几十秒）" />}
        {props.phase === 'draft' && props.draft !== undefined && (
          <DraftReview
            draft={props.draft}
            busy={props.busy}
            error={props.error}
            onConfirm={() => props.onConfirm(props.draft?.revision.id ?? '')}
            onRegenerate={props.onGenerate}
            onAdhoc={props.onAdhoc}
          />
        )}
        {props.phase !== 'draft' && (
          <>
            {props.phase !== 'loading' && props.hasDraftConcepts && (
              <div className="ai-row" style={{ marginBottom: 8 }}>
                <button type="button" className="ai-primary-button" disabled={busy} onClick={props.onLoadDraft}>
                  查看并确认草案
                </button>
                <button type="button" className="ai-small-button" disabled={busy} onClick={props.onGenerate}>
                  重新生成草案
                </button>
              </div>
            )}
            {props.phase !== 'loading' && !props.hasDraftConcepts && (
              <div className="ai-row" style={{ marginBottom: 8 }}>
                <button type="button" className="ai-primary-button" disabled={busy} onClick={props.onGenerate}>
                  生成课程草案
                </button>
              </div>
            )}
            <div className="ai-row">
              <button type="button" className="ai-small-button" disabled={busy} onClick={props.onAdhoc}>
                先随便问问（随问随学）
              </button>
              {props.phase === 'error' && (
                <button type="button" className="ai-small-button" disabled={busy} onClick={props.onLoadDraft}>
                  重试读取草案
                </button>
              )}
            </div>
            {props.phase === 'error' && (
              <div className="ai-muted" style={{ marginTop: 6 }}>
                草案生成/读取失败时会显示上方错误原因；可重试，或直接先用「先随便问问」继续。
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
