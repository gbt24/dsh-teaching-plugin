/**
 * Long-task registry for imports, course drafts, exports and environment
 * preparation.
 *
 * Every task is visible through the same snapshot shape, can be cancelled, and
 * leaves a durable record so a Host restart reports "interrupted" instead of
 * pretending the work finished. The registry owns AbortControllers; feature
 * code only sees a {@link TaskContext}.
 */
import type {
  AppError, CancelTaskResult, TaskHandle, TaskId, TaskSnapshot, TaskStep,
} from '@deepseek-teaching/core'
import { taskFile, taskId as newTaskId, nowIso } from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'

/** Feature callbacks while a task runs. */
export interface TaskContext {
  readonly id: TaskId
  readonly signal: AbortSignal
  /** Replace one step's status/progress/detail. */
  step(id: string, patch: Partial<TaskStep>): void
  /** Append a non-fatal warning. */
  warn(message: string): void
  /** Report overall progress 0..1 when known. */
  progress(value: number | undefined): void
  /** Attach the final structured result before completion. */
  result(value: unknown): void
  /** True when a cancellation was requested; feature code must stop at a safe point. */
  cancelled(): boolean
}

/** Options for starting one task. */
export interface StartTaskOptions {
  readonly kind: string
  readonly label: string
  readonly steps?: readonly { readonly id: string; readonly label: string }[]
  readonly resumable?: boolean
}

interface ActiveTask {
  readonly controller: AbortController
  record: TaskSnapshot
  done: Promise<void>
}

/** Task registry bound to one LocalState. */
export class TaskManager {
  private readonly active = new Map<TaskId, ActiveTask>()
  private readonly logger: (message: string, fields?: Record<string, unknown>) => void

  private readonly state: LocalState

  constructor(state: LocalState, logger?: (message: string, fields?: Record<string, unknown>) => void) {
    this.state = state
    this.logger = logger ?? (() => undefined)
  }

  /** Mark tasks left running by a previous Host process as interrupted. */
  async recoverInterrupted(): Promise<TaskId[]> {
    const files = (await this.state.list('tasks')).filter(name => name.endsWith('.json'))
    const recovered: TaskId[] = []
    for (const name of files) {
      const snapshot = await this.state.readJson<TaskSnapshot>(`tasks/${name}`)
      if (snapshot === undefined) continue
      if (snapshot.status === 'queued' || snapshot.status === 'running') {
        const next: TaskSnapshot = {
          ...snapshot,
          status: 'failed',
          updatedAt: nowIso(),
          finishedAt: nowIso(),
          steps: snapshot.steps.map(step => step.status === 'running'
            ? { ...step, status: 'failed', detail: '宿主重启导致任务中断' }
            : step),
          error: { code: 'failed', message: '宿主重启导致任务中断；已保留部分结果', retryable: true, cause: 'interrupted' },
          resumable: snapshot.resumable ?? true,
        }
        await this.persist(next)
        recovered.push(snapshot.id)
      }
    }
    return recovered
  }

  /** Start one task and return its handle immediately. */
  start<T>(options: StartTaskOptions, run: (context: TaskContext) => Promise<T>): TaskHandle {
    const id = newTaskId()
    const steps: TaskStep[] = (options.steps ?? []).map(step => ({ ...step, status: 'pending' }))
    const startedAt = nowIso()
    const controller = new AbortController()
    const record: ActiveTask = {
      controller,
      record: {
        id,
        kind: options.kind,
        label: options.label,
        status: 'running',
        steps,
        startedAt,
        updatedAt: startedAt,
        resumable: options.resumable ?? true,
        warnings: [],
      },
      done: Promise.resolve(),
    }

    const update = (patch: Partial<TaskSnapshot>): void => {
      record.record = { ...record.record, ...patch, updatedAt: nowIso() }
      void this.persist(record.record)
    }

    const context: TaskContext = {
      id,
      signal: controller.signal,
      step: (stepId, patch) => {
        const stepsNext = record.record.steps.map(step => step.id === stepId ? { ...step, ...patch } : step)
        update({ steps: stepsNext })
      },
      warn: message => {
        update({ warnings: [...(record.record.warnings ?? []), message] })
      },
      progress: value => {
        update({ progress: value })
      },
      result: value => {
        update({ result: value })
      },
      cancelled: () => controller.signal.aborted,
    }

    const done = (async () => {
      try {
        const value = await run(context)
        const finishedAt = nowIso()
        const cancelled = controller.signal.aborted
        record.record = {
          ...record.record,
          status: cancelled ? 'cancelled' : 'completed',
          updatedAt: finishedAt,
          finishedAt,
          ...(value === undefined ? {} : { result: record.record.result ?? value }),
          steps: record.record.steps.map(step => step.status === 'pending' || step.status === 'running'
            ? { ...step, status: cancelled ? 'skipped' : 'done' }
            : step),
        }
        await this.persist(record.record)
      } catch (cause) {
        const finishedAt = nowIso()
        const error = toTaskError(cause, controller.signal.aborted)
        record.record = {
          ...record.record,
          status: controller.signal.aborted ? 'cancelled' : 'failed',
          updatedAt: finishedAt,
          finishedAt,
          error,
          steps: record.record.steps.map(step => step.status === 'running' ? { ...step, status: 'failed' } : step),
        }
        this.logger('task failed', {
          id, kind: options.kind, code: error.code,
          message: cause instanceof Error ? cause.message : String(cause),
          stack: cause instanceof Error ? (cause.stack ?? '').split('\n').slice(0, 6).join(' | ') : undefined,
        })
        await this.persist(record.record)
      } finally {
        this.active.delete(id)
      }
    })()
    record.done = done
    this.active.set(id, record)
    void this.persist(record.record)
    return { id, snapshot: record.record }
  }

  /** Read one task's latest snapshot (active memory first, then disk). */
  async get(id: string): Promise<TaskSnapshot | undefined> {
    const live = this.active.get(id as TaskId)
    if (live !== undefined) return live.record
    return this.state.readJson<TaskSnapshot>(taskFile(this.state.dataDir, id))
  }

  /** List known tasks, newest first. */
  async list(): Promise<TaskSnapshot[]> {
    const byId = new Map<string, TaskSnapshot>()
    const files = (await this.state.list('tasks')).filter(name => name.endsWith('.json'))
    for (const name of files) {
      const snapshot = await this.state.readJson<TaskSnapshot>(`tasks/${name}`)
      if (snapshot !== undefined) byId.set(snapshot.id, snapshot)
    }
    for (const [id, live] of this.active) byId.set(id, live.record)
    return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Request cancellation and return the current snapshot. */
  async cancel(id: string): Promise<CancelTaskResult> {
    const live = this.active.get(id as TaskId)
    if (live === undefined) {
      const snapshot = await this.get(id)
      if (snapshot === undefined) {
        throw Object.assign(new Error('任务不存在'), { code: 'not-found' })
      }
      return { id: id as TaskId, accepted: false, snapshot }
    }
    live.controller.abort()
    live.record = { ...live.record, cancelRequested: true, updatedAt: nowIso() }
    void this.persist(live.record)
    return { id: live.record.id, accepted: true, snapshot: live.record }
  }

  /** Wait for one active task to settle (used by tests and shutdown). */
  async wait(id: string): Promise<void> {
    await this.active.get(id as TaskId)?.done
  }

  /** Cancel every active task (Host disposal). */
  async dispose(): Promise<void> {
    for (const [id, live] of this.active) {
      live.controller.abort()
      live.record = {
        ...live.record,
        status: 'cancelled',
        updatedAt: nowIso(),
        finishedAt: nowIso(),
        steps: live.record.steps.map(step => step.status === 'running' ? { ...step, status: 'skipped' } : step),
      }
      await this.persist(live.record)
      this.active.delete(id)
    }
  }

  private async persist(snapshot: TaskSnapshot): Promise<void> {
    try {
      await this.state.writeJson(taskFile(this.state.dataDir, snapshot.id), snapshot)
    } catch (cause) {
      this.logger('task persist failed', { id: snapshot.id, error: String(cause) })
    }
  }
}

/** Convert a thrown task failure into the AppError vocabulary. */
function toTaskError(cause: unknown, cancelled: boolean): AppError {
  if (cancelled) return { code: 'cancelled', message: '任务已取消' }
  if (typeof cause === 'object' && cause !== null && typeof (cause as AppError).code === 'string') {
    return cause as AppError
  }
  return {
    code: 'failed',
    message: '任务失败',
    details: { message: cause instanceof Error ? cause.message : String(cause) },
  }
}
