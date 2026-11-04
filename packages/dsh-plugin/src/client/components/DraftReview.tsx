/**
 * Course-structure draft review, shared by the first-run wizard and the
 * workspace "structure pending" card. It shows the proposed concepts/order and
 * the review warnings, and offers confirm / regenerate / ad-hoc start.
 */
import React from 'react'
import type { CourseDraftView } from '@deepseek-teaching/core/contracts'
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

/** Draft preview with the three valid next actions. */
export function DraftReview(props: DraftReviewProps): React.ReactElement {
  const { draft } = props
  const revision = draft.revision
  return (
    <div className="ai-draft-review">
      <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>课程结构草案（v{revision.version}）</h3>
      <div className="ai-muted">
        来源覆盖：{draft.coverage.length} 份资料 · 概念 {revision.concepts.length} 个
        · 学习顺序 {revision.sequence.length} 步
      </div>
      {draft.warnings.length > 0 && (
        <ul className="ai-warning-list">
          {draft.warnings.map(warning => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      <ol className="ai-checklist">
        {revision.sequence.map((conceptId) => {
          const concept = revision.concepts.find(item => item.id === conceptId)
          return concept === undefined ? null : (
            <li key={concept.id}>
              <strong>{concept.title}</strong>
              {concept.summary !== '' ? ` — ${concept.summary}` : ''}
              {concept.sourceAnchors.length === 0 ? '（仅模型知识，无资料依据）' : ''}
            </li>
          )
        })}
      </ol>
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
