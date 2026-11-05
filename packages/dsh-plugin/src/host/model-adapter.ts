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
    /** Public service method: full model metadata incl. inputModalities. */
    resolveModelInfo?(provider: string, model: string): Promise<Record<string, unknown> | undefined>
    /** Adapter-side method name exposed by some runtime builds. */
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
  /** Plugin-level override; absent follows the host deployment default. */
  readonly selectionOverride?: () => { provider: string; model: string; reasoningEffort?: string } | undefined
  /** Console-like logger for diagnostics (never logs prompts by default). */
  readonly log?: (message: string, fields?: Record<string, unknown>) => void
}

/** Convert a ModelRequest into the Harness GenerateOptions shape. */
function toGenerateOptions(
  request: ModelRequest,
  selection: { provider: string; model: string; reasoningEffort?: string },
  routingSessionId: string,
): Record<string, unknown> {
  // Auxiliary structured calls must not inherit a "max reasoning" deployment
  // default: reasoning tokens would starve the JSON output and truncate it.
  const auxPurpose = request.purpose !== undefined && request.purpose !== 'chat'
  const reasoningEffort = auxPurpose ? undefined : selection.reasoningEffort
  // Hand-built assistant messages must carry the durable-message source fields:
  // the Harness runtime reads `message.source.replayState` for assistant roles.
  const messages = request.messages.map((message, index) => message.role === 'assistant'
    ? {
        id: `teaching-assistant-${index}`,
        role: 'assistant',
        content: [{ type: 'text', text: message.text }],
        source: { kind: 'model', provider: selection.provider, model: selection.model },
      }
    : {
        role: message.role,
        content: [{ type: 'text', text: message.text }],
      })
  const options: Record<string, unknown> = {
    provider: selection.provider,
    model: selection.model,
    messages,
    sessionId: routingSessionId,
  }
  if (request.system !== undefined) options.system = request.system
  if (request.maxTokens !== undefined) options.maxTokens = request.maxTokens
  if (request.temperature !== undefined) options.temperature = request.temperature
  if (reasoningEffort !== undefined) options.reasoningEffort = reasoningEffort
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
  private cachedInfoKey?: string

  constructor(host: HarnessModelHost, options: HarnessModelAdapterOptions) {
    this.host = host
    this.options = options
  }

  /** Effective selection: plugin override when configured, else the host default. */
  private effectiveSelection(): { provider: string; model: string; reasoningEffort?: string } {
    return this.options.selectionOverride?.() ?? this.host.agentDefaultModel.currentSelection()
  }

  /** Invalidate cached capability info after a model/effort change. */
  invalidateInfo(): void {
    this.cachedInfo = undefined
    this.cachedInfoKey = undefined
  }

  /** Read the deployment default selection; falls back to an explicit error state. */
  async info(): Promise<ModelInfo> {
    const selection = this.effectiveSelection()
    const key = `${selection.provider}/${selection.model}`
    if (this.cachedInfo !== undefined && this.cachedInfoKey === key) return this.cachedInfo
    let imageInput: ModelInfo['imageInput'] = 'unknown'
    let contextWindow: number | undefined
    try {
      // The public service method is resolveModelInfo; resolveModel is the
      // adapter-side name and exists only on some runtime builds. Call through
      // the service object so `this` stays bound.
      const llm = this.host.llm
      const model = llm.resolveModelInfo !== undefined
        ? await llm.resolveModelInfo(selection.provider, selection.model)
        : await llm.resolveModel?.(selection.provider, selection.model)
      const modalities = model?.inputModalities as readonly string[] | undefined
      if (Array.isArray(modalities)) imageInput = modalities.includes('image') ? 'yes' : 'no'
      const context = model?.context as { contextWindow?: unknown } | undefined
      const window = model?.contextWindow ?? context?.contextWindow
      if (typeof window === 'number') contextWindow = window
    } catch (cause) {
      // Capability probing is best-effort; unknown stays unknown but the reason
      // is logged so a deployment can see why image support was not resolved.
      this.options.log?.('model capability probe failed', { message: cause instanceof Error ? cause.message : String(cause) })
    }
    this.cachedInfo = {
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
      imageInput,
      ...(contextWindow === undefined ? {} : { contextWindow }),
    }
    this.cachedInfoKey = key
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
        const selection = this.effectiveSelection()
        const options = toGenerateOptions(effective, selection, this.options.routingSessionId)
        if (attempt > 1) delete options.reasoningEffort
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
              sessionId: request.sessionId,
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
        sessionId: request.sessionId,
        purpose: request.purpose,
        provider: info.provider,
        model: info.model,
        durationMs,
        usageUnknown: true,
        ok: terminal?.ok === true,
      }
      this.options.onUsage?.(usageEntry)

      if (terminal?.ok === true && text === '' && attempt < MAX_ATTEMPTS) {
        // Some providers spend the whole output budget on reasoning for a
        // max-effort call and return no visible text. Retry once without the
        // forced reasoning effort so the student still gets an answer.
        this.options.log?.('empty visible text; retrying without forced reasoning effort', { attempt })
        continue
      }
      if (terminal?.ok === true) {
        if (request.purpose === 'chat' && text.includes('<<<TEACHING_META>>>')) {
          this.options.log?.('chat raw tail', { chars: text.length, tail: text.slice(-200) })
          if (process.env.DSH_TEACHING_DEBUG_CHAT === '1') {
            try {
              const { writeFileSync } = process.getBuiltinModule('node:fs') as typeof import('node:fs')
              const { tmpdir } = process.getBuiltinModule('node:os') as typeof import('node:os')
              const { join } = process.getBuiltinModule('node:path') as typeof import('node:path')
              writeFileSync(join(tmpdir(), `teaching-chat-${Date.now()}.txt`), text, 'utf8')
            } catch {
              // Debug capture is best-effort only.
            }
          }
        }
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
