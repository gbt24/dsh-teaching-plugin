/**
 * Conversation panel: persisted student/teacher messages, live streamed text,
 * evidence chips with expandable excerpts, quick teaching-form switches and the
 * composer. Message text goes through the safe Markdown renderer.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ChatMessage, EvidenceReference, LessonActivity, SessionView,
} from '@deepseek-teaching/core/contracts'
import type { ChatStreamState } from '../state.ts'
import { EVIDENCE_KIND_LABELS, STAGE_LABELS, formatTime, truncate } from '../helpers.ts'
import { RenderedMarkdown } from './Markdown.tsx'
import { Banner } from './Banner.tsx'

/** One quick action the student can request during teaching. */
export type QuickAction = 'skip' | 'hint' | 'full-answer' | 'restyle'

const QUICK_ACTION_LABELS: Readonly<Record<QuickAction, string>> = {
  skip: '跳过练习',
  hint: '给提示',
  'full-answer': '看完整答案',
  restyle: '换种讲法',
}

export const QUICK_ACTION_PROMPTS: Readonly<Record<QuickAction, string>> = {
  skip: '请跳过当前练习，直接继续后面的教学。',
  hint: '请给当前练习一点提示，但不要直接给答案。',
  'full-answer': '请看完整答案，并在之后解释它的推理过程。',
  restyle: '请换一种讲法重新解释刚才的内容。',
}

export interface ChatPanelProps {
  readonly courseTitle?: string
  readonly session?: SessionView
  readonly messages: readonly ChatMessage[]
  readonly activities: readonly LessonActivity[]
  readonly chat: ChatStreamState
  readonly busy: boolean
  readonly offline: boolean
  readonly onSend: (text: string) => void
  readonly onStop: () => void
  readonly onQuickAction: (action: QuickAction) => void
  readonly onActivityClick: (activityId: string) => void
  readonly onEvidenceClick: (reference: EvidenceReference) => void
  readonly onRetry: () => void
  readonly onDismissError: () => void
}

/** Evidence chip with an expandable excerpt/URL detail. */
function EvidenceChips(props: {
  readonly refs: readonly EvidenceReference[]
  readonly onEvidenceClick: (reference: EvidenceReference) => void
}): React.ReactElement | null {
  const [expanded, setExpanded] = useState<number | undefined>(undefined)
  if (props.refs.length === 0) return null
  return (
    <div className="ai-evidence-row">
      {props.refs.map((reference, index) => {
        const label = reference.label ?? reference.anchor?.label ?? EVIDENCE_KIND_LABELS[reference.kind]
        return (
          <React.Fragment key={`${reference.kind}-${index}-${label}`}>
            <button
              type="button"
              className="ai-evidence-chip"
              data-kind={reference.kind}
              aria-label={`证据来源 ${label}`}
              onClick={() => setExpanded(expanded === index ? undefined : index)}
              title={reference.note ?? label}
            >
              {EVIDENCE_KIND_LABELS[reference.kind]} · {truncate(label, 34)}
            </button>
            {expanded === index && (
              <div className="ai-evidence-detail">
                {reference.anchor !== undefined && (
                  <>
                    <div>原文位置：{reference.anchor.label}{formatPage(reference.anchor.locator)}</div>
                    <div>原文片段：{truncate(reference.anchor.excerpt, 800)}</div>
                    <div className="ai-muted">抽取置信度：{reference.anchor.confidence}</div>
                    <button type="button" className="ai-link-button" onClick={() => props.onEvidenceClick(reference)}>
                      在“来源”中查看原文
                    </button>
                  </>
                )}
                {reference.url !== undefined && (
                  <div>
                    外部来源：<a href={reference.url} target="_blank" rel="noopener noreferrer">{truncate(reference.url, 80)}</a>
                    {reference.accessedAt !== undefined ? `（访问于 ${reference.accessedAt}）` : ''}
                  </div>
                )}
                {reference.note !== undefined && <div>说明：{reference.note}</div>}
                {reference.premises !== undefined && reference.premises.length > 0 && (
                  <div>前提：{reference.premises.join('；')}</div>
                )}
                {reference.confidence !== undefined && <div className="ai-muted">内容置信度：{reference.confidence}</div>}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function formatPage(locator: { readonly page?: number; readonly slide?: number; readonly lines?: readonly [number, number] }): string {
  if (locator.page !== undefined) return ` · 第 ${locator.page} 页`
  if (locator.slide !== undefined) return ` · 第 ${locator.slide} 张幻灯片`
  if (locator.lines !== undefined) return ` · 第 ${locator.lines[0]}–${locator.lines[1]} 行`
  return ''
}

/** One message bubble. */
function MessageBubble(props: {
  readonly message: ChatMessage
  readonly activities: readonly LessonActivity[]
  readonly onActivityClick: (activityId: string) => void
  readonly onEvidenceClick: (reference: EvidenceReference) => void
}): React.ReactElement {
  const { message } = props
  const roleClass = message.role === 'student' ? 'ai-msg-student' : message.role === 'system' ? 'ai-msg-system' : 'ai-msg-teacher'
  const linkedActivities = (message.activityIds ?? [])
    .map(id => props.activities.find(activity => activity.id === id))
    .filter((activity): activity is LessonActivity => activity !== undefined)
  return (
    <article className={`ai-msg ${roleClass}`} data-role={message.role}>
      {message.role === 'teacher' && message.kind !== 'teacher-explanation' && (
        <div className="ai-muted" style={{ marginBottom: 2 }}>{TEACHER_KIND_LABELS[message.kind] ?? ''}</div>
      )}
      {message.markdown === true
        ? <RenderedMarkdown source={message.text} />
        : <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>}
      {linkedActivities.length > 0 && (
        <div className="ai-evidence-row">
          {linkedActivities.map(activity => (
            <button
              key={activity.id}
              type="button"
              className="ai-evidence-chip"
              onClick={() => props.onActivityClick(activity.id)}
              aria-label={`打开活动 ${activity.title}`}
            >
              活动 · {truncate(activity.title, 30)}
            </button>
          ))}
        </div>
      )}
      {message.evidenceRefs !== undefined && message.evidenceRefs.length > 0 && (
        <EvidenceChips refs={message.evidenceRefs} onEvidenceClick={props.onEvidenceClick} />
      )}
      {message.error !== undefined && (
        <div className="ai-muted" style={{ color: 'var(--dsw-alias-state-error-primary, #b91c1c)' }}>失败：{message.error.message}</div>
      )}
      <div className="ai-msg-meta">
        <span>{formatTime(message.createdAt)}</span>
        {message.usage !== undefined && (
          <span title={message.usage.usageUnknown === true ? '模型未报告用量' : undefined}>
            {message.usage.model}
            {message.usage.durationMs >= 0 ? ` · ${Math.round(message.usage.durationMs / 100) / 10}s` : ''}
            {message.usage.usageUnknown === true ? ' · 用量未知' : ''}
          </span>
        )}
      </div>
    </article>
  )
}

const TEACHER_KIND_LABELS: Readonly<Record<string, string>> = {
  'teacher-diagnosis': '诊断',
  'teacher-hint': '提示',
  'teacher-feedback': '反馈',
  'teacher-question': '提问',
}

/** The conversation panel. */
export function ChatPanel(props: ChatPanelProps): React.ReactElement {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current
    if (element !== null) element.scrollTop = element.scrollHeight
  }, [])
  useEffect(() => {
    scrollToBottom()
  }, [props.messages.length, props.chat.text, scrollToBottom])
  const send = (): void => {
    const text = draft.trim()
    if (text === '' || props.busy) return
    setDraft('')
    props.onSend(text)
  }
  const session = props.session
  return (
    <section className="ai-chat-panel" aria-label="教学对话">
      <div className="ai-chat-scroll" ref={scrollRef}>
        {session === undefined && (
          <div className="ai-empty">选择左侧课程与会话，或新建一个学习会话开始。</div>
        )}
        {props.messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            activities={props.activities}
            onActivityClick={props.onActivityClick}
            onEvidenceClick={props.onEvidenceClick}
          />
        ))}
        {props.chat.text !== '' && (
          <article className="ai-msg ai-msg-teacher" data-streaming="true">
            <RenderedMarkdown source={props.chat.text} />
            <div className="ai-msg-meta"><span className="ai-spinner" aria-label="正在生成" /></div>
          </article>
        )}
        {props.chat.error !== undefined && (
          <Banner
            kind={props.chat.error.retryable === true ? 'warning' : 'error'}
            message={props.chat.error.code === 'cancelled' ? '已停止生成。' : `本轮生成失败：${props.chat.error.message}`}
            details={props.chat.error.code}
            onDismiss={props.onDismissError}
            actions={props.chat.error.retryable === true
              ? <button type="button" className="ai-small-button" onClick={props.onRetry}>重试上一条</button>
              : undefined}
          />
        )}
        {props.session !== undefined && props.session.activities.length === 0 && props.messages.length === 0 && (
          <div className="ai-empty">
            在下方输入你的学习目标或问题开始；也可以直接说“从现在开始系统学习”。
          </div>
        )}
      </div>
      <div className="ai-progress-line">
        {props.busy ? (
          <span className="ai-row"><span className="ai-spinner" />{props.chat.progressLabel ?? (props.chat.status === 'stopping' ? '正在停止…' : '正在生成回答…')}</span>
        ) : (
          <span className="ai-muted">
            {props.session !== undefined ? `阶段：${STAGE_LABELS[props.session.session.position.stage]}` : ''}
          </span>
        )}
        {props.chat.evidence.length > 0 && props.chat.text === '' && (
          <span className="ai-muted">已收集 {props.chat.evidence.length} 条来源</span>
        )}
      </div>
      <div className="ai-quick-actions">
        {(Object.keys(QUICK_ACTION_PROMPTS) as QuickAction[]).map(action => (
          <button
            key={action}
            type="button"
            className="ai-small-button"
            disabled={props.busy || props.session === undefined}
            onClick={() => props.onQuickAction(action)}
            aria-label={`快速操作：${QUICK_ACTION_LABELS[action]}`}
          >
            {QUICK_ACTION_LABELS[action]}
          </button>
        ))}
      </div>
      <div className="ai-composer">
        <textarea
          value={draft}
          aria-label="输入你的问题"
          placeholder={props.offline ? '离线状态：恢复连接后可继续发送' : '输入问题，Enter 发送，Shift+Enter 换行'}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        {props.busy ? (
          <button type="button" className="ai-danger-button" onClick={props.onStop} aria-label="停止生成">停止</button>
        ) : (
          <button type="button" className="ai-primary-button" onClick={send} disabled={draft.trim() === '' || props.offline} aria-label="发送">
            发送
          </button>
        )}
      </div>
    </section>
  )
}
