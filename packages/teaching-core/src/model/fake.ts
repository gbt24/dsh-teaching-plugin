/**
 * Scripted model client for unit tests and offline development.
 *
 * Tests declare exact replies (text or JSON) per call and can assert on the
 * captured requests. It never touches the network and never fabricates a
 * provider; the real adapter lives in the Host package.
 */
import type {
  ModelClient, ModelCompletion, ModelInfo, ModelRequest, ModelStreamEvent, UsageEntry,
} from './types.ts'
import { nowIso } from '../contracts/ids.ts'

/** One scripted response. */
export type ScriptedReply =
  | { readonly kind: 'text'; readonly text: string; readonly inputTokens?: number; readonly outputTokens?: number }
  | { readonly kind: 'json'; readonly value: unknown; readonly text?: string }
  | { readonly kind: 'error'; readonly code: string; readonly message: string }
  | { readonly kind: 'abort' }

/** Model client whose replies are pre-declared in order. */
export class ScriptedModelClient implements ModelClient {
  /** Every request received, for assertions. */
  readonly calls: ModelRequest[] = []
  /** Usage entries recorded (mirrors the host adapter behaviour). */
  readonly usage: UsageEntry[] = []
  private readonly replies: ScriptedReply[]
  private readonly modelInfo: ModelInfo

  constructor(replies: readonly ScriptedReply[], info: Partial<ModelInfo> = {}) {
    this.replies = [...replies]
    this.modelInfo = { provider: 'test', model: 'test-model', imageInput: 'no', ...info }
  }

  async info(): Promise<ModelInfo> {
    return this.modelInfo
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    this.calls.push(request)
    const reply = this.replies.shift()
    if (reply === undefined) {
      yield { type: 'error', error: { code: 'script-exhausted', message: '没有更多脚本化回复' } }
      return
    }
    if (reply.kind === 'abort' || signal?.aborted === true) {
      yield { type: 'error', error: { code: 'cancelled', message: '已取消' } }
      return
    }
    if (reply.kind === 'error') {
      yield { type: 'error', error: { code: reply.code, message: reply.message } }
      return
    }
    const text = reply.kind === 'text' ? reply.text : (reply.text ?? JSON.stringify(reply.value))
    const usage = {
      provider: this.modelInfo.provider,
      model: this.modelInfo.model,
      durationMs: 1,
      inputTokens: reply.kind === 'text' ? reply.inputTokens : undefined,
      outputTokens: reply.kind === 'text' ? reply.outputTokens : undefined,
      usageUnknown: reply.kind === 'text' && reply.inputTokens === undefined,
    }
    // Stream in small chunks so consumers exercise incremental handling.
    for (let i = 0; i < text.length; i += 24) {
      yield { type: 'text', text: text.slice(i, i + 24) }
    }
    yield { type: 'usage', usage }
    yield { type: 'done', text, usage }
    this.usage.push({
      at: nowIso(), purpose: request.purpose, provider: usage.provider, model: usage.model,
      durationMs: 1, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      usageUnknown: usage.usageUnknown, ok: true,
    })
  }

  async complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelCompletion> {
    const chunks: ModelStreamEvent[] = []
    for await (const event of this.stream(request, signal)) chunks.push(event)
    const error = chunks.find(event => event.type === 'error')
    if (error !== undefined && error.type === 'error') {
      throw Object.assign(new Error(error.error.message), { code: error.error.code })
    }
    const done = chunks.find(event => event.type === 'done')
    const text = done !== undefined && done.type === 'done' ? done.text : ''
    const usage = done !== undefined && done.type === 'done'
      ? done.usage
      : { provider: this.modelInfo.provider, model: this.modelInfo.model, durationMs: 0, usageUnknown: true }
    if (request.json === undefined) return { text, usage }
    try {
      return { text, usage, json: JSON.parse(extractJson(text)) }
    } catch (cause) {
      return { text, usage, parseError: cause instanceof Error ? cause.message : String(cause) }
    }
  }
}

/** Extract a JSON object/array from model output that may include prose/fences. */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const candidate = fenced?.[1] ?? text
  const first = Math.min(...['{', '['].map(char => {
    const index = candidate.indexOf(char)
    return index === -1 ? Number.POSITIVE_INFINITY : index
  }))
  if (!Number.isFinite(first)) return candidate.trim()
  const lastObject = candidate.lastIndexOf('}')
  const lastArray = candidate.lastIndexOf(']')
  const last = Math.max(lastObject, lastArray)
  return candidate.slice(first, last === -1 ? undefined : last + 1)
}
