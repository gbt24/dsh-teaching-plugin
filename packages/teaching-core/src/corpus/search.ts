/**
 * 自建倒排索引与检索。
 *
 * 设计：
 * - 每个文档修订一个独立索引文件（`sources/<id>/search/<revisionId>.json`），
 *   导入时生成、检索时按需加载；索引是可重建缓存，损坏/缺失会从单元重建；
 * - 中文用「单字 + 二元组」、英文用简化词干、公式/代码符号单独成词；
 * - 打分使用 BM25（k1=1.2, b=0.75），返回可解释的 matchedTerms 与真实 SourceAnchor；
 * - 无命中返回 `empty=true`，绝不编造结果。
 */
import type {
  CorpusSearchQuery, CorpusSearchResult,
} from '../contracts/corpus.ts'
import type {
  ExtractionConfidence, SourceAnchor, SourceFormat, SourceLocator, SourceUnit, UnitKind,
} from '../contracts/source.ts'
import type { CorpusLimits } from './limits.ts'
import type { CorpusStore } from './store.ts'
import type { SourceId, SourceRevisionId, UnitId } from '../contracts/ids.ts'
import { excerptAround, locatorDescription, tokenizeForIndex, tokenizeQuery } from './text-utils.ts'

const INDEX_VERSION = 1
const BM25_K1 = 1.2
const BM25_B = 0.75

interface IndexedUnitMeta {
  readonly unitId: string
  readonly kind: UnitKind
  readonly locator: SourceLocator
  readonly confidence: ExtractionConfidence
  readonly excerpt: string
  readonly length: number
}

/** 持久化的倒排索引。 */
export interface StoredSearchIndex {
  readonly version: number
  readonly documentId: string
  readonly revisionId: string
  readonly title: string
  readonly format: SourceFormat
  readonly builtAt: string
  readonly units: readonly IndexedUnitMeta[]
  /** term → [unitIndex, termFrequency][] */
  readonly postings: Readonly<Record<string, readonly (readonly [number, number])[]>>
}

/** 从单元构建索引。 */
export function buildSearchIndex(input: {
  readonly documentId: string
  readonly revisionId: string
  readonly title: string
  readonly format: SourceFormat
  readonly units: readonly SourceUnit[]
  readonly builtAt: string
}): StoredSearchIndex {
  const units: IndexedUnitMeta[] = []
  const postings: Record<string, [number, number][]> = {}
  for (let index = 0; index < input.units.length; index += 1) {
    const unit = input.units[index] as SourceUnit
    units.push({
      unitId: unit.id,
      kind: unit.kind,
      locator: unit.locator,
      confidence: unit.confidence,
      excerpt: excerptAround(unit.text, [], 200),
      length: Math.max(1, unit.text.length),
    })
    const tokens = tokenizeForIndex(unit.text)
    const frequencies = new Map<string, number>()
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
    for (const [term, frequency] of frequencies) {
      const list = postings[term]
      if (list === undefined) postings[term] = [[index, frequency]]
      else list.push([index, frequency])
    }
  }
  return {
    version: INDEX_VERSION,
    documentId: input.documentId,
    revisionId: input.revisionId,
    title: input.title,
    format: input.format,
    builtAt: input.builtAt,
    units,
    postings,
  }
}

/** 有上限的内存 LRU 索引缓存（跨多次检索复用）。 */
export class SearchIndexCache {
  private readonly maxEntries: number
  private readonly entries = new Map<string, StoredSearchIndex>()

  constructor(maxEntries: number) {
    this.maxEntries = Math.max(1, maxEntries)
  }

  get(key: string): StoredSearchIndex | undefined {
    const value = this.entries.get(key)
    if (value === undefined) return undefined
    // LRU：命中后移到末尾
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: string, value: StoredSearchIndex): void {
    this.entries.delete(key)
    this.entries.set(key, value)
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next()
      if (oldest.done === true) break
      this.entries.delete(oldest.value)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

/** 未命中但已扫描文档数（用于观测）。 */
export interface SearchStats {
  readonly scannedDocuments: number
  readonly scannedUnits: number
  readonly skippedDocuments: number
}

/** 检索实现所需的依赖。 */
export interface SearchDeps {
  readonly store: CorpusStore
  readonly limits: CorpusLimits
  readonly cache: SearchIndexCache
}

interface LoadedIndex {
  readonly index: StoredSearchIndex
}

/** 读取或构建一个文档当前修订的索引。 */
async function loadIndex(deps: SearchDeps, documentId: string, revisionId: string): Promise<LoadedIndex | undefined> {
  const cacheKey = `${documentId}:${revisionId}`
  const cached = deps.cache.get(cacheKey)
  if (cached !== undefined) return { index: cached }
  const stored = await deps.store.readSearchIndex<StoredSearchIndex>(documentId, revisionId)
  if (stored !== undefined && stored.version === INDEX_VERSION
    && stored.documentId === documentId && stored.revisionId === revisionId
    && Array.isArray(stored.units) && typeof stored.postings === 'object') {
    deps.cache.set(cacheKey, stored)
    return { index: stored }
  }
  // 缓存缺失/过期：从修订单元重建
  let payload
  try {
    payload = await deps.store.readRevisionPayload(documentId, revisionId)
  } catch {
    return undefined
  }
  if (payload === undefined) return undefined
  const document = await deps.store.readDocument(documentId)
  const meta = await deps.store.readRevisionMeta(documentId, revisionId)
  if (document === undefined || meta === undefined) return undefined
  const built = buildSearchIndex({
    documentId,
    revisionId,
    title: document.title,
    format: document.format,
    units: payload.units,
    builtAt: new Date().toISOString(),
  })
  deps.cache.set(cacheKey, built)
  await deps.store.writeSearchIndex(documentId, revisionId, built)
  return { index: built }
}

/** 执行检索；内部错误尽量降级为空结果，不伪造命中。 */
export async function searchCorpus(
  deps: SearchDeps,
  query: CorpusSearchQuery,
): Promise<{ result: CorpusSearchResult; stats: SearchStats }> {
  const terms = tokenizeQuery(query.query).slice(0, deps.limits.searchMaxQueryTerms)
  const emptyStats: SearchStats = { scannedDocuments: 0, scannedUnits: 0, skippedDocuments: 0 }
  if (terms.length === 0) {
    return { result: { hits: [], empty: true }, stats: emptyStats }
  }
  const catalog = await deps.store.catalog()
  let candidateIds: string[]
  if (query.documentIds !== undefined) {
    candidateIds = query.documentIds.filter(documentId => catalog.documents[documentId] !== undefined)
    if (candidateIds.length === 0) return { result: { hits: [], empty: true }, stats: emptyStats }
  } else {
    const courseIds = [query.courseId, ...(query.alsoCourseIds ?? [])]
      .filter((value): value is NonNullable<typeof value> => value !== undefined)
    if (courseIds.length > 0) {
      candidateIds = await deps.store.documentIdsForCourses(courseIds as readonly string[])
    } else {
      candidateIds = Object.keys(catalog.documents)
    }
  }
  const indexes: LoadedIndex[] = []
  let skipped = 0
  for (const documentId of candidateIds) {
    const entry = catalog.documents[documentId]
    if (entry?.currentRevisionId === undefined) {
      skipped += 1
      continue
    }
    const loaded = await loadIndex(deps, documentId, entry.currentRevisionId)
    if (loaded === undefined) {
      skipped += 1
      continue
    }
    indexes.push(loaded)
  }
  const totalUnits = indexes.reduce((sum, item) => sum + item.index.units.length, 0)
  if (totalUnits === 0) {
    return { result: { hits: [], empty: true }, stats: { scannedDocuments: indexes.length, scannedUnits: 0, skippedDocuments: skipped } }
  }
  let totalLength = 0
  for (const item of indexes) {
    for (const unit of item.index.units) totalLength += unit.length
  }
  const averageLength = Math.max(1, totalLength / totalUnits)
  const kinds = query.kinds !== undefined ? new Set<UnitKind>(query.kinds) : undefined
  interface Accumulated { score: number; matched: string[] }
  const accumulated = new Map<string, Accumulated>()
  for (const token of terms) {
    const lists = indexes.map(item => item.index.postings[token.term] ?? [])
    const documentFrequency = lists.reduce((sum, list) => sum + list.length, 0)
    if (documentFrequency === 0) continue
    const idf = Math.log(1 + (totalUnits - documentFrequency + 0.5) / (documentFrequency + 0.5))
    for (let docIndex = 0; docIndex < indexes.length; docIndex += 1) {
      const index = (indexes[docIndex] as LoadedIndex).index
      const list = lists[docIndex] as readonly (readonly [number, number])[]
      for (const [unitIndex, termFrequency] of list) {
        const unit = index.units[unitIndex]
        if (unit === undefined) continue
        const key = `${docIndex}:${unitIndex}`
        const denominator = termFrequency + BM25_K1 * (1 - BM25_B + BM25_B * (unit.length / averageLength))
        const contribution = idf * (termFrequency * (BM25_K1 + 1)) / denominator
        const existing = accumulated.get(key)
        if (existing === undefined) {
          accumulated.set(key, { score: contribution, matched: [token.display] })
        } else {
          existing.score += contribution
          if (!existing.matched.includes(token.display)) existing.matched.push(token.display)
        }
      }
    }
  }
  const limit = Math.min(
    deps.limits.searchMaxLimit,
    Math.max(1, query.limit ?? deps.limits.searchDefaultLimit),
  )
  const ordered = [...accumulated.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
  const hits: CorpusSearchResult['hits'][number][] = []
  for (const [key, value] of ordered) {
    if (hits.length >= limit) break
    const [docIndexText, unitIndexText] = key.split(':')
    const docIndex = Number(docIndexText)
    const unitIndex = Number(unitIndexText)
    const index = (indexes[docIndex] as LoadedIndex | undefined)?.index
    const unit = index?.units[unitIndex]
    if (index === undefined || unit === undefined) continue
    if (kinds !== undefined && !kinds.has(unit.kind)) continue
    const anchor: SourceAnchor = {
      documentId: index.documentId as SourceId,
      revisionId: index.revisionId as SourceRevisionId,
      unitId: unit.unitId as UnitId,
      locator: unit.locator,
      excerpt: unit.excerpt,
      confidence: unit.confidence,
      label: `${index.title} · ${locatorDescription(unit.locator)}`,
    }
    hits.push({
      anchor,
      documentTitle: index.title,
      score: Math.round(value.score * 1000) / 1000,
      matchedTerms: value.matched.slice(0, 6),
    })
  }
  return {
    result: { hits, empty: hits.length === 0 },
    stats: { scannedDocuments: indexes.length, scannedUnits: totalUnits, skippedDocuments: skipped },
  }
}
