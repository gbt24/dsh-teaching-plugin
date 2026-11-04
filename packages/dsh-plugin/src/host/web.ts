/**
 * Optional web capability bridge.
 *
 * The teaching plugin prefers local course material. When the student explicitly
 * asks to verify or look something up, and the Harness composition has mounted
 * `ctx.web` with a usable provider, the Host performs one bounded search. A
 * missing or failing web capability is reported as a capability gap, never
 * hidden and never fabricated.
 */
import type { AppError, Result } from '@deepseek-teaching/core'

/** One external search hit ready for citation. */
export interface WebSearchHit {
  readonly title: string
  readonly url: string
  readonly snippet: string
}

/** Structural view of the Harness `ctx.web` service (only what we call). */
interface HarnessWebService {
  search(
    request: { readonly query: string; readonly maxResults?: number },
    signal?: AbortSignal,
  ): Promise<{
    readonly content?: string
    readonly sources: readonly { readonly url: string; readonly title?: string; readonly snippet?: string }[]
    readonly truncated: boolean
  }>
}

/** Bridge over the optional web service. */
export interface WebBridge {
  /** Whether a web capability is mounted at all (provider usability is checked at call time). */
  available(): boolean
  /** One bounded search; returns a clear capability error instead of inventing results. */
  search(query: string, options?: { readonly maxResults?: number; readonly signal?: AbortSignal }): Promise<Result<WebSearchHit[]>>
}

/** Build the bridge from a Cordis-like context. */
export function createWebBridge(ctx: { get(name: string): unknown }): WebBridge {
  return {
    available: () => ctx.get('web') !== undefined,
    async search(query, options) {
      const service = ctx.get('web') as HarnessWebService | undefined
      if (service === undefined) {
        return fail('capability-missing', '当前 Harness 配置没有启用联网能力，无法查证外部资料')
      }
      const trimmed = query.trim()
      if (trimmed === '') return fail('invalid-input', '联网查询内容为空')
      try {
        const result = await service.search({ query: trimmed, maxResults: options?.maxResults ?? 5 }, options?.signal)
        const sources = result.sources
          .filter(source => typeof source.url === 'string' && source.url.length > 0)
          .slice(0, options?.maxResults ?? 5)
          .map(source => ({
            title: source.title ?? new URL(source.url).hostname,
            url: source.url,
            snippet: (source.snippet ?? '').slice(0, 600),
          }))
        return { ok: true, value: sources }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause)
        const code = typeof cause === 'object' && cause !== null && typeof (cause as { code?: unknown }).code === 'string'
          ? String((cause as { code: string }).code)
          : ''
        if (/cancel|abort/i.test(message) || /CANCEL|ABORT/i.test(code)) {
          return fail('cancelled', '联网查询已取消')
        }
        if (/unavailable|no provider|not configured/i.test(message) || /UNAVAILABLE|MISSING/i.test(code)) {
          return fail('capability-missing', '联网能力不可用：没有可用的搜索提供方')
        }
        return fail('network', '联网查询失败，本地资料内容不受影响', { message: message.slice(0, 300) })
      }
    },
  }
}

/** Build a failure Result. */
function fail<T = never>(code: AppError['code'], message: string, details?: Record<string, unknown>): Result<T> {
  return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } }
}

/** Whether a student message explicitly asks for an external lookup. */
export function wantsWebLookup(text: string): boolean {
  return /联网|上网|网上|搜索一下|查一下|查证|核实|最新(的)?(资料|进展|消息)|外部资料|网页|official docs|search the web|look up online/i.test(text)
}

/** Turn a raw query into a search-friendly one (strip common command words). */
export function toSearchQuery(text: string): string {
  return text
    .replace(/请?你?(帮我)?(联网|上网|搜索一下|查一下|查证|核实|在网上找|帮我找)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}
