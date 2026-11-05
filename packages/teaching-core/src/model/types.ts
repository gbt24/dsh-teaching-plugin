/**
 * Provider-neutral model seam used by every teaching feature.
 *
 * The Harness Host adapter implements this interface on top of `ctx.llm`, so
 * unit tests can use a scripted fake and the same teaching code runs against
 * the student's configured provider and credentials.
 */
import type { LanguagePreference } from '../contracts/session.ts'
import type { ModelUsageRecord } from '../contracts/session.ts'

/** One message in a model request (simplified view over Harness messages). */
export interface ModelMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly text: string
}

/** Structured output requirement: JSON schema-ish, enforced by prompt + parser. */
export interface ModelJsonRequest {
  readonly name: string
  /** Human description of the expected JSON object. */
  readonly description: string
  /** Field-by-field expectations, kept short to control prompt size. */
  readonly fields: Readonly<Record<string, string>>
}

/** One model call request. */
export interface ModelRequest {
  readonly messages: readonly ModelMessage[]
  /** Optional system prompt (kept separate for adapter mapping). */
  readonly system?: string
  readonly maxTokens?: number
  readonly temperature?: number
  /** Ask for JSON; the adapter/teaching layer extracts and validates it. */
  readonly json?: ModelJsonRequest
  /** Opaque identity for routing metadata (session affinity), if available. */
  readonly sessionId?: string
  /** Coarse purpose label for accounting. */
  readonly purpose?: 'chat' | 'course-draft' | 'diagnosis' | 'evaluation' | 'hint' | 'title' | 'export' | 'compaction' | 'other'
  /** Language of the expected answer. */
  readonly language?: LanguagePreference
}

/** Streaming events surfaced to the client. */
export type ModelStreamEvent =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'usage'; readonly usage: ModelUsageRecord }
  | { readonly type: 'done'; readonly text: string; readonly usage: ModelUsageRecord }
  | { readonly type: 'error'; readonly error: { readonly code: string; readonly message: string } }

/** Model identity + capabilities, resolved from the host configuration. */
export interface ModelInfo {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
  readonly imageInput: 'yes' | 'no' | 'unknown'
  readonly contextWindow?: number
  readonly note?: string
}

/** The model seam every teaching feature depends on. */
export interface ModelClient {
  /** Identity of the currently configured model; never hardcodes a provider. */
  info(): Promise<ModelInfo>
  /**
   * Stream one completion. Implementations must surface a terminal `done` or
   * `error` event; cancellation through `signal` yields a cancellation error.
   */
  stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent>
  /**
   * Collect a streaming completion into text plus usage. Convenience for
   * structured calls; implementation-agnostic.
   */
  complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelCompletion>
}

/** Aggregated completion result. */
export interface ModelCompletion {
  readonly text: string
  readonly usage: ModelUsageRecord
  /** Parsed JSON when `request.json` was supplied and parsing succeeded. */
  readonly json?: unknown
  readonly rawText?: string
  readonly parseError?: string
}

/** Call accounting persisted beside teacher messages and in usage.jsonl. */
export interface UsageEntry {
  readonly at: string
  /** Opaque session identity used for routing; lets the Host attribute usage. */
  readonly sessionId?: string
  readonly purpose: ModelRequest['purpose']
  readonly provider: string
  readonly model: string
  readonly durationMs: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
  readonly costUsd?: number
  readonly usageUnknown: boolean
  readonly ok: boolean
  /** Whether the answer passed host-side structural validation. */
  readonly validated?: boolean
}

/** Guardrails applied by the host adapter; no unbounded retries. */
export interface ModelLimits {
  /** Maximum concurrent model calls across the plugin. */
  readonly maxConcurrent: number
  /** Maximum attempts per logical call (1 retry at most). */
  readonly maxAttempts: number
  /** Per-call wall clock bound; longer calls are cancelled. */
  readonly timeoutMs: number
  /** Total tokens per single call, when the model reports usage. */
  readonly maxOutputTokens: number
}
