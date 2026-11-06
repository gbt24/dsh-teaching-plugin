/**
 * Turn already-fetched web content into first-class corpus sources.
 *
 * The Host fetches through `ctx.web.fetch`; the corpus service owns parsing,
 * URL/content-hash deduplication and persistence. Web pages never execute.
 */
import type { Result, SourceDocument } from '@deepseek-teaching/core'
import type { CorpusServiceApi } from '@deepseek-teaching/core/corpus'
import type { WebImportRequest } from '@deepseek-teaching/core/corpus'

export type { WebImportRequest }

/** Import one fetched page into the corpus for a course. */
export async function importWebPage(
  corpus: CorpusServiceApi,
  input: WebImportRequest,
): Promise<Result<{ document: SourceDocument; duplicate: boolean }>> {
  const result = await corpus.importWebPage(input)
  if (!result.ok) return result
  return { ok: true, value: { document: result.value.document, duplicate: false } }
}
