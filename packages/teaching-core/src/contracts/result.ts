/**
 * Uniform result and error vocabulary shared by every module boundary.
 *
 * A module never throws across a public seam for an expected failure: it
 * returns a {@link Result}. Thrown errors remain reserved for programming bugs;
 * the Host bridge maps them to `failed` with a diagnostic.
 */

/** Stable machine-readable error codes; UI and teaching policy switch on these. */
export type AppErrorCode =
  /** Caller sent structurally invalid input. */
  | 'invalid-input'
  /** Referenced object does not exist in the local store. */
  | 'not-found'
  /** A revision/compare-and-set precondition failed; re-read and retry. */
  | 'conflict'
  /** Expected capability or dependency is absent (environment, model ability). */
  | 'capability-missing'
  /** Operation cannot proceed until the student confirms. */
  | 'needs-confirmation'
  /** Caller or host cancelled the operation. */
  | 'cancelled'
  /** Operation failed; see details and the log. */
  | 'failed'
  /** An objective claim could not be verified (not the same as "wrong"). */
  | 'unverified'
  /** A configured resource limit (time, size, calls) was exceeded. */
  | 'limit-exceeded'
  /** Persisted state was written by a newer schema or is corrupt. */
  | 'storage'
  /** Content references a source revision or activity revision that moved. */
  | 'stale-revision'
  /** Network access was needed and failed. */
  | 'network'
  /** External reliability check returned an ambiguous answer. */
  | 'uncertain'

/** One structured, user-presentable failure. */
export interface AppError {
  readonly code: AppErrorCode
  /** Short Chinese message; UI may render verbatim. */
  readonly message: string
  /** Structured diagnostic fields (never credentials). */
  readonly details?: Record<string, unknown>
  /** True when retrying the same call can reasonably succeed. */
  readonly retryable?: boolean
  /** Machine-readable sub-code for diagnostics. */
  readonly cause?: string
}

/** Success or failure, never both. */
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: AppError }

/** Wrap a value as a successful result. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/** Build a failure result. */
export function err<T = never>(
  code: AppErrorCode,
  message: string,
  extra: Omit<AppError, 'code' | 'message'> = {},
): Result<T> {
  return { ok: false, error: { code, message, ...extra } }
}

/** Extract the value or throw; only for call sites that already handled the error. */
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value
}

/** Normalise an unknown thrown value into an AppError (no secrets). */
export function toAppError(cause: unknown, fallbackMessage = '操作失败'): AppError {
  if (isAppError(cause)) return cause
  if (isAbort(cause)) return { code: 'cancelled', message: '操作已取消' }
  const message = cause instanceof Error ? cause.message : String(cause)
  return { code: 'failed', message: fallbackMessage, details: { message }, retryable: false }
}

/** Whether a value already is an AppError. */
export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null
    && typeof (value as { code?: unknown }).code === 'string'
    && typeof (value as { message?: unknown }).message === 'string'
    && ['invalid-input', 'not-found', 'conflict', 'capability-missing', 'needs-confirmation',
      'cancelled', 'failed', 'unverified', 'limit-exceeded', 'storage', 'stale-revision',
      'network', 'uncertain'].includes((value as { code: string }).code)
}

/** Whether an unknown value is a cancellation signal. */
export function isAbort(value: unknown): boolean {
  return (typeof DOMException !== 'undefined' && value instanceof DOMException && value.name === 'AbortError')
    || (value instanceof Error && (value.name === 'AbortError' || value.name === 'AbortSignal'))
}

/** Error type used only where a thrown signal is more convenient internally. */
export class TeachingError extends Error {
  readonly appError: AppError

  constructor(error: AppError) {
    super(`${error.code}: ${error.message}`)
    this.name = 'TeachingError'
    this.appError = error
  }
}
