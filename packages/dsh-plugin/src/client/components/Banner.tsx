/**
 * Small shared presentational components: banners, task progress and spinners.
 */
import React from 'react'
import type { AppError, TaskSnapshot } from '@deepseek-teaching/core/contracts'
import { TASK_STATUS_LABELS, formatPercent } from '../helpers.ts'

/** Non-fatal banner above the workspace content. */
export function Banner(props: {
  readonly kind: 'info' | 'warning' | 'error'
  readonly message: string
  readonly details?: string
  readonly onDismiss?: () => void
  readonly actions?: React.ReactNode
}): React.ReactElement {
  return (
    <div className="ai-banner" data-kind={props.kind} role={props.kind === 'error' ? 'alert' : 'status'}>
      <span>{props.message}{props.details !== undefined ? `（${props.details}）` : ''}</span>
      {props.actions}
      {props.onDismiss !== undefined && (
        <button type="button" className="ai-banner-close" aria-label="关闭提示" onClick={props.onDismiss}>×</button>
      )}
    </div>
  )
}

/** Banner for an `AppError`; keeps the error code visible for support. */
export function ErrorBanner(props: {
  readonly error: AppError
  readonly onDismiss?: () => void
  readonly onRetry?: () => void
}): React.ReactElement {
  return (
    <Banner
      kind={props.error.code === 'network' ? 'warning' : 'error'}
      message={props.error.message}
      details={props.error.code}
      {...(props.onDismiss !== undefined ? { onDismiss: props.onDismiss } : {})}
      actions={props.onRetry !== undefined
        ? <button type="button" className="ai-small-button" onClick={props.onRetry}>重试</button>
        : undefined}
    />
  )
}

/** Inline spinner with an accessible label. */
export function Spinner({ label }: { readonly label?: string }): React.ReactElement {
  return (
    <span className="ai-row" role="status" aria-label={label ?? '加载中'}>
      <span className="ai-spinner" />
      {label !== undefined && <span className="ai-muted">{label}</span>}
    </span>
  )
}

/** One long-running task with progress and cancellation. */
export function TaskRow(props: {
  readonly snapshot: TaskSnapshot
  readonly onCancel?: (taskId: string) => void
}): React.ReactElement {
  const { snapshot } = props
  const running = snapshot.status === 'running' || snapshot.status === 'queued'
  return (
    <div className="ai-task" role="status">
      <span>{snapshot.label}</span>
      <span className="ai-muted">{TASK_STATUS_LABELS[snapshot.status]}{formatPercent(snapshot.progress) !== '' ? ` ${formatPercent(snapshot.progress)}` : ''}</span>
      <span className="ai-task-progress"><span style={{ width: `${Math.round((snapshot.progress ?? 0) * 100)}%` }} /></span>
      {running && props.onCancel !== undefined && (
        <button type="button" className="ai-small-button" onClick={() => props.onCancel?.(snapshot.id)}>取消</button>
      )}
      {snapshot.status === 'partial' && snapshot.warnings !== undefined && (
        <span className="ai-muted">{snapshot.warnings.length} 个警告</span>
      )}
    </div>
  )
}

/** Render every active task; hides finished ones unless they failed. */
export function TaskProgressBar(props: {
  readonly tasks: readonly TaskSnapshot[]
  readonly onCancel?: (taskId: string) => void
}): React.ReactElement | null {
  const visible = props.tasks.filter(task =>
    task.status === 'queued' || task.status === 'running' || task.status === 'failed' || task.status === 'partial')
  if (visible.length === 0) return null
  return (
    <div>
      {visible.map(task => (
        <TaskRow key={task.id} snapshot={task} {...(props.onCancel !== undefined ? { onCancel: props.onCancel } : {})} />
      ))}
    </div>
  )
}
