/**
 * Harness model adapter: implements the teaching core's ModelClient on top of
 * the Host's configured provider and credentials.
 *
 * Facts this adapter relies on (verified in T00, Desktop 0.2.1-rc.5):
 * - the deployment default selection comes from `ctx.agentDefaultModel`;
 * - `ctx.llm.stream()` needs a `sessionId` for pi-ai routes (routing metadata);
 * - stream chunks use `.type`; the terminal `finish.reason.kind` reports
 *   success/failure/cancellation; `usage` chunks carry token counts.
 *
 * The adapter never hardcodes a provider, never retries unboundedly, and
 * records one usage entry per logical call (including usage-unknown cases).
 */
import type {
  ModelClient, ModelCompletion, ModelInfo, ModelRequest, ModelStreamEvent, UsageEntry,
} from '@deepseek-teaching/core'
import { extractJson, nowIso } from '@deepseek-teaching/core'

/** Minimal structural type for the Host services this adapter touches. */
export interface HarnessModelHost {
  agentDefaultModel: { currentSelection(): { provider: string; model: string; reasoningEffort?: string } }
  llm: {
    stream(options: Record<string, unknown>): AsyncIterable<Record<string, unknown>>
    resolveModel?(provider: string, model: string): Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined
  }
}

/** Limits applied to every model call; no unbounded retries. */
const DEFAULT_TIMEOUT_MS = 180_000
const MAX_ATTEMPTS = 2

/** Options for the adapter. */
export interface HarnessModelAdapterOptions {
  /** Opaque session id used for provider routing metadata. */
  readonly routingSessionId: string
  /** Per-call timeout override. */
  readonly timeoutMs?: number
  /** Called after every settled call with its usage entry. */
  readonly onUsage?: (entry: UsageEntry) => void
  /** Console-like logger for diagnostics (never logs prompts by default). */
  readonly log?: (message: string, fields?: Record<string, unknown>) => void
}

/** Convert a ModelRequest into the Harness GenerateOptions shape. */
function toGenerateOptions(
  request: ModelRequest,
  selection: { provider: string; model: string; reasoningEffort?: string },
  routingSessionId: string,
): Record<string, unknown> {
  const messages = request.messages.map(message => ({
    role: message.role,
    content: [{ type: 'text', text: message.text }],
  }))
  const options: Record<string, unknown> = {
    provider: selection.provider,
    model: selection.model,
    messages,
    sessionId: routingSessionId,
  }
  if (request.system !== undefined) options.system = request.system
  if (request.maxTokens !== undefined) options.maxTokens = request.maxTokens
  if (request.temperature !== undefined) options.temperature = request.temperature
  if (selection.reasoningEffort !== undefined) options.reasoningEffort = selection.reasoningEffort
  return options
}

/** Append the JSON-output instruction when the caller asks for structure. */
function withJsonInstruction(request: ModelRequest): ModelRequest {
  if (request.json === undefined) return request
  const fields = Object.entries(request.json.fields)
    .map(([key, description]) => `- ${key}: ${description}`)
    .join('\n')
  const instruction = `\n\n请只输出一个 JSON 对象（不要额外文字或 Markdown 围栏），字段如下：\n${fields}`
  return { ...request, messages: [...request.messages, { role: 'user', text: instruction }] }
}

/** Host-backed ModelClient. */
export class HarnessModelAdapter implements ModelClient {
  private readonly options: HarnessModelAdapterOptions
  private readonly host: HarnessModelHost
  private cachedInfo?: ModelInfo

  constructor(host: HarnessModelHost, options: HarnessModelAdapterOptions) {
    this.host = host
    this.options = options
  }

  /** Read the deployment default selection; falls back to an explicit error state. */
  async info(): Promise<ModelInfo> {
    if (this.cachedInfo !== undefined) return this.cachedInfo
    const selection = this.host.agentDefaultModel.currentSelection()
    let imageInput: ModelInfo['imageInput'] = 'unknown'
    let contextWindow: number | undefined
    try {
      const model = await this.host.llm.resolveModel?.(selection.provider, selection.model)
      const modalities = model?.inputModalities as readonly string[] | undefined
      if (Array.isArray(modalities)) imageInput = modalities.includes('image') ? 'yes' : 'no'
      const window = model?.contextWindow
      if (typeof window === 'number') contextWindow = window
    } catch {
      // Capability probing is best-effort; unknown stays unknown.
    }
    this.cachedInfo = {
      provider: selection.provider,
      model: selection.model,
      reasoningEffort: selection.reasoningEffort,
      imageInput,
      contextWindow,
    }
    return this.cachedInfo
  }

  /** Stream one completion with timeout, at most one transient retry, and usage accounting. */
  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const info = await this.info()
    const effective = withJsonInstruction(request)
    let attempt = 0
    let lastError: { code: string; message: string } | undefined
    while (attempt < MAX_ATTEMPTS) {
      attempt += 1
      const startedAt = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      const onAbort = (): void => controller.abort()
      signal?.addEventListener('abort', onAbort, { once: true })
      let text = ''
      let usage: UsageEntry | undefined
      let terminal: { ok: boolean; failure?: { code?: string; message?: string } } | undefined
      try {
        const selection = this.host.agentDefaultModel.currentSelection()
        const options = toGenerateOptions(effective, selection, this.options.routingSessionId)
        options.signal = controller.signal
        for await (const chunk of this.host.llm.stream(options)) {
          const type = chunk.type
          if (type === 'text-delta') {
            const delta = typeof chunk.text === 'string' ? chunk.text : ''
            if (delta.length > 0) {
              text += delta
              yield { type: 'text', text: delta }
            }
            continue
          }
          if (type === 'usage') {
            const raw = chunk.usage as Record<string, unknown> | undefined
            usage = {
              at: nowIso(),
              purpose: request.purpose,
              provider: info.provider,
              model: info.model,
              durationMs: Date.now() - startedAt,
              inputTokens: numberOrUndefined(raw?.inputTokens),
              outputTokens: numberOrUndefined(raw?.outputTokens),
              totalTokens: numberOrUndefined(raw?.totalTokens),
              costUsd: numberOrUndefined(raw?.costUsd),
              usageUnknown: raw === undefined,
              ok: true,
            }
            continue
          }
          if (type === 'finish') {
            const reason = chunk.reason as { kind?: string; failure?: { code?: string; message?: string } } | undefined
            terminal = {
              ok: reason?.kind === 'stop' || reason?.kind === 'tool-calls' || reason?.kind === 'max-tokens',
              failure: reason?.failure,
            }
            break
          }
        }
      } catch (cause) {
        terminal = { ok: false, failure: { message: cause instanceof Error ? cause.message : String(cause) } }
      } finally {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', onAbort)
      }

      const cancelled = signal?.aborted === true
      const durationMs = Date.now() - startedAt
      const usageEntry: UsageEntry = usage ?? {
        at: nowIso(),
        purpose: request.purpose,
        provider: info.provider,
        model: info.model,
        durationMs,
        usageUnknown: true,
        ok: terminal?.ok === true,
      }
      this.options.onUsage?.(usageEntry)

      if (terminal?.ok === true) {
        yield {
          type: 'done',
          text,
          usage: {
            provider: info.provider,
            model: info.model,
            durationMs,
            inputTokens: usageEntry.inputTokens,
            outputTokens: usageEntry.outputTokens,
            totalTokens: usageEntry.totalTokens,
            costUsd: usageEntry.costUsd,
            usageUnknown: usageEntry.usageUnknown,
            retried: attempt - 1,
          },
        }
        return
      }

      if (cancelled) {
        yield { type: 'error', error: { code: 'cancelled', message: '模型调用已取消' } }
        return
      }

      const failure: { code: string; message: string } = {
        code: terminal?.failure?.code ?? 'failed',
        message: terminal?.failure?.message ?? '模型调用失败',
      }
      lastError = failure
      const retryable = /rate|timeout|network|503|502|429|overloaded/i.test(failure.message)
      this.options.log?.('model call failed', { attempt, code: failure.code, retryable })
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        yield { type: 'error', error: failure }
        return
      }
    }
    yield { type: 'error', error: lastError ?? { code: 'failed', message: '模型调用失败' } }
  }

  /** Collect a streaming call; structured requests parse the JSON tail. */
  async complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelCompletion> {
    let text = ''
    let usage: ModelCompletion['usage'] = {
      provider: '', model: '', durationMs: 0, usageUnknown: true,
    }
    let failure: { code: string; message: string } | undefined
    for await (const event of this.stream(request, signal)) {
      if (event.type === 'text') text += event.text
      else if (event.type === 'usage') usage = event.usage
      else if (event.type === 'done') usage = event.usage
      else failure = event.error
    }
    if (failure !== undefined) {
      throw Object.assign(new Error(failure.message), { code: failure.code })
    }
    if (request.json === undefined) return { text, usage }
    try {
      return { text, usage, json: JSON.parse(extractJson(text)) }
    } catch (cause) {
      return { text, usage, rawText: text, parseError: cause instanceof Error ? cause.message : String(cause) }
    }
  }
}

/** Narrow unknown to a finite number or undefined. */
function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
