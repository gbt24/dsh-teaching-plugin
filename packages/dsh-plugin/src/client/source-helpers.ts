/**
 * Pure helpers for the sidebar 资料 (materials) panel: source origin labels,
 * web URL parsing and the integration-summary text shown in the draft review.
 */
import type { CourseDraftView, SourceDocument } from '@deepseek-teaching/core/contracts'

/** Badge label for a source: web pages vs local files. */
export function sourceOriginLabel(source: Pick<SourceDocument, 'origin' | 'web'>): '本地' | '网页' {
  return source.origin === 'web' || source.web !== undefined ? '网页' : '本地'
}

/** Secondary line for a source row (web URL or original path). */
export function sourceDisplayLocation(source: Pick<SourceDocument, 'originalPath' | 'web'>): string {
  if (source.web?.url !== undefined && source.web.url !== '') return source.web.url
  return source.originalPath
}

/** Parse a textarea/line list of URLs; invalid entries are reported, not silently dropped. */
export function parseWebUrls(text: string): {
  readonly urls: readonly string[]
  readonly invalid: readonly string[]
} {
  const urls: string[] = []
  const invalid: string[] = []
  for (const raw of text.split(/[\r\n,]+/u)) {
    const candidate = raw.trim()
    if (candidate === '') continue
    let parsed: URL
    try {
      parsed = new URL(candidate)
    } catch {
      invalid.push(candidate)
      continue
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      invalid.push(candidate)
      continue
    }
    if (!urls.includes(parsed.toString())) urls.push(parsed.toString())
  }
  return { urls, invalid }
}

/** Split newline-separated local paths. */
export function parseLocalPaths(text: string): readonly string[] {
  return text.split(/\r?\n/u).map(line => line.trim()).filter(line => line !== '')
}

/** Integration summary sentence for the draft-review banner, if this draft came from an integrate run. */
export function integrationSummaryText(
  integration: NonNullable<CourseDraftView['integration']> | undefined,
): string | undefined {
  if (integration === undefined) return undefined
  const parts = [
    `复用 ${integration.reusedConcepts} 个概念`,
    `新增 ${integration.addedConcepts} 个概念`,
    `保留 ${integration.preservedOldConcepts} 个旧概念`,
    `新增 ${integration.addedAnchors} 处资料锚点`,
  ]
  return `资料整合完成（${integration.mode === 'incremental' ? '增量' : '初始'}）：${parts.join('、')}。`
}
