/**
 * Host-owned model selection and context-usage views for the teaching client.
 *
 * The client never calls the LLM service directly; these views let it present
 * the effective selection (host default or plugin override), available
 * reasoning efforts, the model context window and the teaching prompt usage.
 */
import type { SessionId } from './ids.ts'

/** One provider/model/(optional) reasoning effort selection. */
export interface ModelSelectionView {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** One model entry offered by a provider route. */
export interface ModelCatalogModelView {
  readonly id: string
  readonly name: string
  readonly description?: string
}

/** One provider route with its advertised models. */
export interface ModelCatalogProviderView {
  readonly id: string
  readonly name: string
  readonly models: readonly ModelCatalogModelView[]
}

/** Catalog of selectable models plus the effective default/override. */
export interface ModelCatalogView {
  /** True when the plugin follows `agentDefaultModel`. */
  readonly followHost: boolean
  /** Effective selection used for the next teaching/model call. */
  readonly current: ModelSelectionView
  /** Deployment default from `agentDefaultModel`. */
  readonly default: ModelSelectionView
  /** Plugin-level override, when not following the host default. */
  readonly override?: ModelSelectionView
  readonly providers: readonly ModelCatalogProviderView[]
  /** Providers whose model listing failed; they are simply not selectable. */
  readonly failures?: readonly { readonly provider: string; readonly message: string }[]
}

/** Capability metadata for one exact provider/model route. */
export interface ModelInfoView {
  readonly provider: string
  readonly model: string
  readonly name?: string
  readonly contextWindow?: number
  readonly inputModalities?: readonly string[]
  readonly reasoning?: {
    readonly efforts: readonly {
      readonly id: string
      readonly name: string
      readonly description?: string
    }[]
    readonly defaultEffort?: string
  }
}

/** Effective context-window usage for one teaching session. */
export interface ContextUsageView {
  readonly sessionId: SessionId
  /** Tokens in the most recent request prompt (reported) or estimate. */
  readonly tokensUsed?: number
  readonly contextWindow?: number
  /** tokensUsed / contextWindow when both are known. */
  readonly percent?: number
  readonly source: 'reported' | 'estimated' | 'unknown'
  readonly reportedAt?: string
  readonly model: ModelSelectionView
  /** Present when the session has a compacted context checkpoint. */
  readonly compressed?: {
    readonly compactedAt: string
    readonly compactedMessages: number
    readonly tokensBefore: number
    readonly tokensAfterEstimate: number
  }
  readonly note?: string
}
