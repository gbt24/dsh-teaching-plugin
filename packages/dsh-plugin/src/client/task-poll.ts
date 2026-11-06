/**
 * Small polling helper for Host long tasks (`tasks.get`). Used by the planning
 * wizard and the materials panel; keeps one timeout/interval policy.
 */
import type { TaskSnapshot } from '@deepseek-teaching/core/contracts'
import { apiGet, describeError } from './api.ts'

export interface WaitForTaskOptions {
  readonly timeoutMs?: number
  readonly intervalMs?: number
  readonly onProgress?: (snapshot: TaskSnapshot) => void
}

/** Resolve with the settled snapshot, or throw with a student-readable message. */
export async function waitForTask(taskId: string, options: WaitForTaskOptions = {}): Promise<TaskSnapshot> {
  const timeoutMs = options.timeoutMs ?? 180_000
  const intervalMs = options.intervalMs ?? 700
  const startedAt = Date.now()
  for (;;) {
    let snapshot: TaskSnapshot
    try {
      const response = await apiGet('tasks.get', { taskId })
      snapshot = response.task
    } catch (error) {
      throw new Error(`无法读取任务状态：${describeError(error)}`)
    }
    options.onProgress?.(snapshot)
    if (snapshot.status === 'completed' || snapshot.status === 'partial'
      || snapshot.status === 'failed' || snapshot.status === 'cancelled') {
      return snapshot
    }
    if (Date.now() - startedAt > timeoutMs) throw new Error('任务超时：请稍后在任务条中查看结果，或重试。')
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
}
