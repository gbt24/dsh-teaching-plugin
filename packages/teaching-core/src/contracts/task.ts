/**
 * Long-running task identity, progress and cancellation.
 *
 * Imports, course drafts, exports and environment preparation all return the
 * same task shape, so the UI can show progress uniformly. A finished task
 * never implies its content was validated or confirmed; those are separate
 * fields on the produced object.
 */
import type { TaskId } from './ids.ts'
import type { AppError } from './result.ts'

/** Task lifecycle. */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled'

/** One visible step of a long task. */
export interface TaskStep {
  readonly id: string
  readonly label: string
  readonly status: 'pending' | 'running' | 'done' | 'skipped' | 'failed'
  /** 0..1 when known; absent means indeterminate. */
  readonly progress?: number
  readonly detail?: string
}

/** Immutable snapshot of a task's state, safe to send to the client. */
export interface TaskSnapshot {
  readonly id: TaskId
  readonly kind: string
  readonly status: TaskStatus
  /** Short human label, e.g. "导入《SICP.pdf》". */
  readonly label: string
  readonly steps: readonly TaskStep[]
  readonly progress?: number
  readonly startedAt: string
  readonly updatedAt: string
  readonly finishedAt?: string
  /** Cancellation request has been received. */
  readonly cancelRequested?: boolean
  /** Structured result when completed; its concrete type depends on kind. */
  readonly result?: unknown
  /** Failure reason when failed/partial. */
  readonly error?: AppError
  /** Non-fatal problems (partial import, uncertain OCR, skipped files). */
  readonly warnings?: readonly string[]
  /**
   * True when a subsequent invocation of the same kind can continue from the
   * persisted partial state instead of starting over.
   */
  readonly resumable?: boolean
}

/** Handle returned when a long task starts. */
export interface TaskHandle {
  readonly id: TaskId
  readonly snapshot: TaskSnapshot
}

/** Cancellation result. */
export interface CancelTaskResult {
  readonly id: TaskId
  readonly accepted: boolean
  readonly snapshot: TaskSnapshot
}
