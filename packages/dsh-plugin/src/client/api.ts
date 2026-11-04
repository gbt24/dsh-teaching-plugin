/**
 * Typed client for the `/api/teaching/*` exact Fetch routes.
 *
 * Contract: every non-streaming operation returns HTTP 200 with a `Result<T>`
 * envelope (`{ok:true,value}` / `{ok:false,error}`); `chat.send` streams SSE
 * frames of `ChatStreamEvent` (`data: <json>\n\n`). The client holds no
 * authoritative state — every mutation goes through the Host.
 */
import type {
  ApiRequests, ApiResponses, AppError, ChatStreamEvent, Result,
} from '@deepseek-teaching/core/contracts'

/** Path prefix registered by the Host half. */
export const API_PREFIX = '/api/teaching'

type GetOperations = {
  [K in keyof ApiRequests]: ApiRequests[K]['method'] extends 'GET' ? K : never
}[keyof ApiRequests]

type PostOperations = {
  [K in keyof ApiRequests]: ApiRequests[K]['method'] extends 'POST' ? K : never
}[keyof ApiRequests]

/** Structured transport/protocol failure with the Host's `AppError` vocabulary. */
export class ApiFailure extends Error {
  readonly appError: AppError

  constructor(appError: AppError) {
    super(`${appError.code}: ${appError.message}`)
    this.name = 'ApiFailure'
    this.appError = appError
  }
}

/** Build the query string for a GET operation, dropping empty values. */
export function buildQueryString(query: Readonly<Record<string, unknown>> | undefined): string {
  if (query === undefined) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, String(entry))
    } else {
      params.append(key, String(value))
    }
  }
  const text = params.toString()
  return text === '' ? '' : `?${text}`
}

/** Absolute path for one operation plus its query string. */
export function apiUrl(operation: string, query?: Readonly<Record<string, unknown>>): string {
  return `${API_PREFIX}/${operation}${buildQueryString(query)}`
}

/** Auth/session cookies stay on the same origin; no client-side tokens. */
const REQUEST_DEFAULTS: RequestInit = {
  credentials: 'same-origin',
  headers: { accept: 'application/json' },
}

/** Convert an unknown fetch/parse failure into an `AppError`. */
export function toApiFailure(cause: unknown, fallbackMessage = '请求失败'): ApiFailure {
  if (cause instanceof ApiFailure) return cause
  const message = cause instanceof Error ? cause.message : String(cause)
  return new ApiFailure({ code: 'network', message: fallbackMessage, details: { message }, retryable: true })
}

/** Parse a `Result<T>` JSON envelope from a response. */
export async function readResultEnvelope<T>(response: Response): Promise<T> {
  let body: unknown
  const text = await response.text()
  try {
    body = text === '' ? undefined : JSON.parse(text)
  } catch {
    throw new ApiFailure({
      code: 'failed',
      message: `Host 返回了非 JSON 响应（HTTP ${response.status}）`,
      details: { preview: text.slice(0, 300) },
    })
  }
  const envelope = body as Result<T> | undefined
  if (envelope !== undefined && envelope !== null && typeof envelope === 'object' && 'ok' in envelope) {
    if (envelope.ok) return envelope.value
    throw new ApiFailure(envelope.error)
  }
  throw new ApiFailure({
    code: 'failed',
    message: `Host 响应缺少 Result 封套（HTTP ${response.status}）`,
    details: { preview: text.slice(0, 300) },
  })
}

/** GET one operation. */
export async function apiGet<K extends GetOperations>(
  operation: K,
  query?: ApiRequests[K]['query'] & Readonly<Record<string, unknown>>,
): Promise<ApiResponses[K]> {
  let response: Response
  try {
    response = await fetch(apiUrl(operation, query as Readonly<Record<string, unknown>> | undefined), {
      ...REQUEST_DEFAULTS,
      method: 'GET',
    })
  } catch (cause) {
    throw toApiFailure(cause, `无法连接 Host（${operation}）`)
  }
  return await readResultEnvelope<ApiResponses[K]>(response)
}

/** POST one operation with a JSON body. */
export async function apiPost<K extends PostOperations>(
  operation: K,
  body: ApiRequests[K]['body'],
): Promise<ApiResponses[K]> {
  let response: Response
  try {
    response = await fetch(apiUrl(operation), {
      ...REQUEST_DEFAULTS,
      method: 'POST',
      headers: { ...REQUEST_DEFAULTS.headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw toApiFailure(cause, `无法连接 Host（${operation}）`)
  }
  return await readResultEnvelope<ApiResponses[K]>(response)
}

/**
 * Start a streaming chat turn.
 *
 * @returns the raw response whose body is SSE; the caller consumes it with
 *          `consumeChatStreamResponse` and controls cancellation with `signal`.
 */
export async function apiChatSend(
  sessionId: string,
  text: string,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response
  try {
    response = await fetch(apiUrl('chat.send'), {
      ...REQUEST_DEFAULTS,
      method: 'POST',
      headers: { ...REQUEST_DEFAULTS.headers, 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ sessionId, text }),
      ...(signal !== undefined ? { signal } : {}),
    })
  } catch (cause) {
    if (signal?.aborted === true) {
      throw new ApiFailure({ code: 'cancelled', message: '已停止生成' })
    }
    throw toApiFailure(cause, '无法连接 Host（chat.send）')
  }
  return response
}

/** Human-readable message for any thrown error. */
export function describeError(error: unknown): string {
  if (error instanceof ApiFailure) return error.appError.message
  return error instanceof Error ? error.message : String(error)
}

/** Structured `AppError` for any thrown error (used by the workspace banner). */
export function toAppError(error: unknown): AppError {
  if (error instanceof ApiFailure) return error.appError
  return { code: 'failed', message: error instanceof Error ? error.message : String(error) }
}

/** True when the failure means "host unreachable / offline". */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiFailure && error.appError.code === 'network'
}

/** One SSE frame split by blank lines; the rest is kept for the next chunk. */
export interface SseChunkResult {
  readonly frames: readonly string[]
  readonly rest: string
}

/** Split buffered SSE text into complete frames. */
export function splitSseFrames(buffer: string): SseChunkResult {
  const normalised = buffer.replace(/\r\n/gu, '\n')
  const parts = normalised.split('\n\n')
  const rest = parts.pop() ?? ''
  return { frames: parts, rest }
}

/** Decode one SSE frame into chat events (ignores comments/event/id lines). */
export function decodeSseFrame(frame: string): ChatStreamEvent[] {
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).replace(/^ /u, ''))
  }
  if (dataLines.length === 0) return []
  const payload = dataLines.join('\n')
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new ApiFailure({ code: 'failed', message: 'SSE 事件不是合法 JSON', details: { payload: payload.slice(0, 300) } })
  }
  if (!isChatStreamEvent(parsed)) {
    throw new ApiFailure({ code: 'failed', message: 'SSE 事件类型无效', details: { payload: payload.slice(0, 300) } })
  }
  return [parsed]
}

/** Runtime guard for `ChatStreamEvent`; unknown types are rejected explicitly. */
export function isChatStreamEvent(value: unknown): value is ChatStreamEvent {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  if (typeof type !== 'string') return false
  switch (type) {
    case 'start': return typeof (value as { studentMessage?: unknown }).studentMessage === 'object'
    case 'progress': return typeof (value as { label?: unknown }).label === 'string'
    case 'delta': return typeof (value as { text?: unknown }).text === 'string'
    case 'activity': return typeof (value as { activity?: unknown }).activity === 'object'
    case 'evidence': return Array.isArray((value as { refs?: unknown }).refs)
    case 'position': return typeof (value as { stage?: unknown }).stage === 'string'
    case 'done': return typeof (value as { message?: unknown }).message === 'object'
    case 'error': return typeof (value as { error?: unknown }).error === 'object'
    default: return false
  }
}

/** Terminal events end a turn. */
export function isTerminalChatEvent(event: ChatStreamEvent): boolean {
  return event.type === 'done' || event.type === 'error'
}

/** Callbacks used while consuming one streamed turn. */
export interface ChatStreamSink {
  readonly onEvent: (event: ChatStreamEvent) => void
  readonly onProtocolError?: (error: ApiFailure) => void
}

/** Outcome of consuming one SSE response. */
export interface ChatStreamOutcome {
  readonly events: number
  readonly terminal: boolean
}

/**
 * Consume a `chat.send` response body.
 *
 * Frames are decoded incrementally; the stream stops at the terminal
 * `done`/`error` event. A non-SSE response is parsed as a `Result` envelope so a
 * Host-side failure still reaches the UI as an `error` event.
 */
export async function consumeChatStreamResponse(
  response: Response,
  sink: ChatStreamSink,
): Promise<ChatStreamOutcome> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    // Host rejected before streaming: a Result error envelope becomes the
    // terminal error event; a JSON success body is a protocol violation.
    try {
      await readResultEnvelope<never>(response)
    } catch (error) {
      const failure = toApiFailure(error, 'Chat 请求失败')
      sink.onEvent({ type: 'error', error: failure.appError })
      return { events: 1, terminal: true }
    }
    sink.onEvent({ type: 'error', error: { code: 'failed', message: 'Chat 响应既不是事件流也不是错误封套' } })
    return { events: 1, terminal: true }
  }
  if (response.body === null) {
    const failure = new ApiFailure({ code: 'failed', message: 'Chat 响应没有可读数据流' })
    sink.onEvent({ type: 'error', error: failure.appError })
    return { events: 1, terminal: true }
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let events = 0
  let terminal = false
  try {
    while (!terminal) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { frames, rest } = splitSseFrames(buffer)
      buffer = rest
      for (const frame of frames) {
        let decoded: ChatStreamEvent[]
        try {
          decoded = decodeSseFrame(frame)
        } catch (error) {
          const failure = toApiFailure(error, 'SSE 解析失败')
          sink.onProtocolError?.(failure)
          terminal = true
          break
        }
        for (const event of decoded) {
          events += 1
          sink.onEvent(event)
          if (isTerminalChatEvent(event)) {
            terminal = true
            break
          }
        }
        if (terminal) break
      }
    }
    // A final frame may arrive without a trailing blank line.
    if (!terminal && buffer.trim() !== '') {
      for (const event of decodeSseFrame(buffer)) {
        events += 1
        sink.onEvent(event)
        if (isTerminalChatEvent(event)) terminal = true
      }
    }
    if (!terminal) {
      sink.onEvent({
        type: 'error',
        error: { code: 'failed', message: '连接中断：Host 未发送完成事件，本轮回答可能不完整。', retryable: true },
      })
      events += 1
      terminal = true
    }
  } catch (error) {
    const failure = toApiFailure(error, '读取事件流失败')
    sink.onEvent({ type: 'error', error: failure.appError })
    events += 1
    terminal = true
  } finally {
    try {
      await reader.cancel()
    } catch { /* already closed */ }
    reader.releaseLock()
  }
  return { events, terminal }
}
