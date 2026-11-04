/**
 * Child-process execution kernel shared by every language adapter.
 *
 * Responsibilities kept in one place so timeout, cancellation, output limits
 * and process-tree cleanup behave identically for Python, JavaScript and
 * Scheme: spawn (POSIX process group), stream stdout/stderr, enforce a hard
 * wall-clock timeout, kill the whole tree on timeout/cancel, cap captured
 * output, and always settle exactly once.
 */
import { spawn, type ChildProcess } from 'node:child_process'

/** One streamed output chunk. */
export interface ProcessChunk {
  readonly stream: 'stdout' | 'stderr'
  readonly text: string
}

/** How to launch one child process. */
export interface ProcessSpec {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string | undefined>>
  /** Written to stdin then closed. */
  readonly stdin?: string
  readonly timeoutMs: number
  readonly maxOutputBytes: number
  /** Kills the process tree when aborted. */
  readonly signal?: AbortSignal
  readonly onChunk?: (chunk: ProcessChunk) => void
}

/** Observed outcome of one child process. */
export interface ProcessOutcome {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode?: number
  readonly signal?: NodeJS.Signals | null
  readonly timedOut: boolean
  readonly cancelled: boolean
  /** True when stdout or stderr hit the cap and was truncated. */
  readonly truncated: boolean
  readonly durationMs: number
  /** Present when the process could not be spawned at all (e.g. ENOENT). */
  readonly spawnError?: string
}

const TRUNCATION_MARKER = '\n…[输出已截断：超过输出上限]…\n'

/** Append text while respecting the byte cap; returns whether truncated. */
function appendCapped(
  previous: string,
  chunk: string,
  cap: number,
): { text: string; truncated: boolean } {
  if (previous.length >= cap) return { text: previous, truncated: true }
  const remaining = cap - previous.length
  if (chunk.length <= remaining) return { text: previous + chunk, truncated: false }
  return { text: previous + chunk.slice(0, remaining), truncated: true }
}

/**
 * Kill a spawned child and all of its descendants.
 *
 * POSIX children are spawned in their own process group, so the negative pid
 * reaches any grandchildren a script started; a plain `child.kill()` would
 * leave them running past a cancellation.
 */
export function killProcessTree(child: ChildProcess, signal: NodeJS.Signals = 'SIGKILL'): void {
  const pid = child.pid
  if (pid === undefined) {
    try { child.kill(signal) } catch { /* already gone */ }
    return
  }
  if (process.platform !== 'win32') {
    try {
      process.kill(-pid, signal)
      return
    } catch {
      // Fall through to the single-process kill when the group is gone.
    }
  }
  try { child.kill(signal) } catch { /* already gone */ }
}

/** Run one child process and resolve exactly once with its observed outcome. */
export function runProcess(spec: ProcessSpec): Promise<ProcessOutcome> {
  return new Promise<ProcessOutcome>((resolve) => {
    const startedAt = Date.now()
    let stdout = ''
    let stderr = ''
    let truncated = false
    let timedOut = false
    let cancelled = false
    let settled = false
    let spawnError: string | undefined
    let killTimer: NodeJS.Timeout | undefined

    const detachTree = process.platform !== 'win32'
    let child: ChildProcess
    try {
      child = spawn(spec.command, [...spec.args], {
        cwd: spec.cwd,
        env: { ...spec.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: detachTree,
      })
    } catch (error) {
      resolve({
        stdout: '', stderr: '', timedOut: false, cancelled: false, truncated: false,
        durationMs: Date.now() - startedAt, spawnError: (error as Error).message,
      })
      return
    }

    const finish = (outcome: Partial<ProcessOutcome> & Pick<ProcessOutcome, 'exitCode'>): void => {
      if (settled) return
      settled = true
      if (timeoutTimer !== undefined) clearTimeout(timeoutTimer)
      if (abortListener !== undefined && spec.signal !== undefined) {
        spec.signal.removeEventListener('abort', abortListener)
      }
      if (killTimer !== undefined) clearTimeout(killTimer)
      resolve({
        stdout: truncated ? stdout + TRUNCATION_MARKER : stdout,
        stderr: truncated ? stderr + TRUNCATION_MARKER : stderr,
        timedOut, cancelled, truncated, spawnError,
        durationMs: Date.now() - startedAt,
        ...outcome,
      })
    }

    /** Kill the tree, and force-resolve if the process refuses to die. */
    const killNow = (): void => {
      killProcessTree(child)
      if (killTimer === undefined) {
        killTimer = setTimeout(() => {
          if (settled) return
          finish({ exitCode: child.exitCode ?? undefined, signal: null })
        }, 2_000)
        killTimer.unref?.()
      }
    }

    const timeoutTimer: NodeJS.Timeout = setTimeout(() => {
      if (settled) return
      timedOut = true
      killNow()
    }, Math.max(1, spec.timeoutMs))
    timeoutTimer.unref?.()

    let abortListener: (() => void) | undefined
    if (spec.signal !== undefined) {
      abortListener = () => {
        if (settled) return
        cancelled = true
        killNow()
      }
      if (spec.signal.aborted) abortListener()
      else spec.signal.addEventListener('abort', abortListener, { once: true })
    }

    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (data: string) => {
      const next = appendCapped(stdout, data, spec.maxOutputBytes)
      stdout = next.text
      if (next.truncated) truncated = true
      if (!next.truncated || data.length > 0) {
        try { spec.onChunk?.({ stream: 'stdout', text: data }) } catch { /* observer is best-effort */ }
      }
    })
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (data: string) => {
      const next = appendCapped(stderr, data, spec.maxOutputBytes)
      stderr = next.text
      if (next.truncated) truncated = true
      try { spec.onChunk?.({ stream: 'stderr', text: data }) } catch { /* observer is best-effort */ }
    })

    child.once('error', (error) => {
      spawnError = error.message
      // A failed spawn emits 'close' on modern Node; settle defensively anyway.
      if (child.pid === undefined) {
        finish({ exitCode: undefined, signal: null })
      }
    })

    child.once('close', (code, signal) => {
      finish({ exitCode: code ?? undefined, signal })
    })

    if (spec.stdin !== undefined && spec.stdin !== '') {
      try {
        child.stdin?.write(spec.stdin)
        child.stdin?.end()
      } catch { /* child may have exited already; output still captured */ }
    } else {
      try { child.stdin?.end() } catch { /* ignore */ }
    }
    // Ignore EPIPE when the child exits before reading all of stdin.
    child.stdin?.on('error', () => { /* ignore */ })
  })
}
