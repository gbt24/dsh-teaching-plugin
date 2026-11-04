import type { AppError } from '../contracts/result.ts'
import { isAbort, isAppError } from '../contracts/result.ts'

/**
 * 语料模块内部错误类型。
 *
 * 这些错误只在模块内部抛出；公开 seam（CorpusService）统一转换为 Result，
 * 预期失败绝不向调用方 throw。
 */

/** 单个文件无法按预期格式解析（损坏、缺结构等）。 */
export class CorpusParseError extends Error {
  readonly causeCode: string

  constructor(message: string, causeCode = 'parse-failed') {
    super(message)
    this.name = 'CorpusParseError'
    this.causeCode = causeCode
  }
}

/** 抽取/导入被取消；name=AbortError 以便 result.ts 的 isAbort 识别。 */
export class CorpusCancelledError extends Error {
  constructor(message = '操作已取消') {
    super(message)
    this.name = 'AbortError'
  }
}

/** 是否为可恢复的解析失败。 */
export function isCorpusParseError(value: unknown): value is CorpusParseError {
  return value instanceof CorpusParseError
}

/** 携带结构化 AppError 的内部失败（公开 seam 会转成 Result）。 */
export class CorpusFailure extends Error {
  readonly appError: AppError

  constructor(appError: AppError) {
    super(appError.message)
    this.name = 'CorpusFailure'
    this.appError = appError
  }
}

/** 把内部异常统一映射为 AppError；保留取消/存储等语义。 */
export function toCorpusAppError(cause: unknown, fallback = '语料操作失败'): AppError {
  if (cause instanceof CorpusFailure) return cause.appError
  if (isAppError(cause)) return cause
  const maybeStore = cause as { appError?: unknown } | undefined
  if (maybeStore !== undefined && isAppError(maybeStore.appError)) return maybeStore.appError
  if (isAbort(cause)) return { code: 'cancelled', message: '操作已取消' }
  return {
    code: 'failed',
    message: fallback,
    details: { message: cause instanceof Error ? cause.message : String(cause) },
    retryable: false,
  }
}
