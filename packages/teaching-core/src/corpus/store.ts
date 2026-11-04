/**
 * 语料存储层：把解析结果持久化为不可变修订，并维护可重建的文档目录缓存。
 *
 * 单文件独立 JSON（每修订一个 meta + 一个 units 文件），避免一次性载入全库；
 * 目录缓存（cache/corpus-catalog.json）只是加速，正确性以 sources/*.json 为准：
 * 每次使用都与磁盘上的文件清单/文件 mtime 对账，缓存丢失或损坏会自动重建。
 */
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceDocument, SourceIssue, SourceRevision, SourceRevisionMeta, SourceUnit } from '../contracts/source.ts'
import { nowIso } from '../contracts/ids.ts'
import type { LocalState } from '../storage/local-state.ts'
import type { CourseRepository } from '../storage/repositories.ts'
import type { CorpusLimits } from './limits.ts'
import type { ParseAsset } from './budget.ts'
import { toStoreRelative, type SourcePaths } from './paths.ts'
import { writeAssetAtomic } from './paths.ts'

/** 修订内容文件的结构（units 与 issues 分开存，便于只翻页读单元）。 */
export interface RevisionPayload {
  readonly units: readonly SourceUnit[]
  readonly issues: readonly SourceIssue[]
}

/** 目录缓存中的一个文档条目。 */
export interface CatalogEntry {
  readonly documentId: string
  readonly originalPath: string
  readonly title: string
  readonly format: SourceDocument['format']
  readonly courseIds: readonly string[]
  readonly status: SourceDocument['status']
  readonly currentRevisionId?: string
  readonly mtimeMs?: number
  readonly sizeBytes?: number
  readonly fingerprint?: string
  /** sources/<id>.json 的 mtime，用于对账时判断是否需要重读。 */
  readonly fileMtimeMs: number
  readonly updatedAt: string
}

/** 可重建的文档目录缓存。 */
export interface CorpusCatalog {
  readonly version: 1
  readonly updatedAt: string
  readonly documents: Readonly<Record<string, CatalogEntry>>
}

/** 表结构的版本，未来迁移用。 */
const CATALOG_VERSION = 1

/**
 * 基本结构校验：兼容 Host 历史/临时实现可能留下的其它 JSON 记录。
 * 无效记录不进入目录缓存（不会让整个目录读取失败），也不参与检索。
 */
function isSourceDocumentRecord(value: unknown): value is SourceDocument {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record['id'] === 'string'
    && typeof record['originalPath'] === 'string'
    && typeof record['title'] === 'string'
    && typeof record['format'] === 'string'
    && Array.isArray(record['courseIds'])
}

function emptyCatalog(): CorpusCatalog {
  return { version: CATALOG_VERSION, updatedAt: nowIso(), documents: {} }
}

/** 语料持久化门面。 */
export class CorpusStore {
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly paths: SourcePaths
  readonly limits: CorpusLimits

  private catalogValue?: CorpusCatalog
  private catalogLoading?: Promise<CorpusCatalog>

  constructor(state: LocalState, courses: CourseRepository, paths: SourcePaths, limits: CorpusLimits) {
    this.state = state
    this.courses = courses
    this.paths = paths
    this.limits = limits
  }

  /** 确保根目录与 meta 已建立（幂等）。 */
  async open(): Promise<void> {
    await this.state.open()
  }

  /** 读取（并对账）文档目录缓存。 */
  async catalog(): Promise<CorpusCatalog> {
    if (this.catalogValue !== undefined) return this.catalogValue
    if (this.catalogLoading !== undefined) return await this.catalogLoading
    this.catalogLoading = this.loadCatalog()
    try {
      this.catalogValue = await this.catalogLoading
      return this.catalogValue
    } finally {
      this.catalogLoading = undefined
    }
  }

  private async loadCatalog(): Promise<CorpusCatalog> {
    let stored: CorpusCatalog | undefined
    try {
      stored = await this.state.readJson<CorpusCatalog>(this.paths.catalog)
      if (stored !== undefined && (stored.version !== CATALOG_VERSION || typeof stored.documents !== 'object')) {
        stored = undefined
      }
    } catch {
      // 缓存损坏：直接重建，不影响正确性
      stored = undefined
    }
    const documents: Record<string, CatalogEntry> = {}
    const fileNames = (await this.state.list('sources')).filter(name => name.endsWith('.json') && !name.startsWith('_'))
    let dirty = stored === undefined
    const knownById = stored?.documents ?? {}
    const knownFiles = new Set<string>()
    for (const fileName of fileNames) {
      const relative = `sources/${fileName}`
      const absolute = join(this.state.dataDir, relative)
      let fileMtimeMs = 0
      try {
        fileMtimeMs = (await stat(absolute)).mtimeMs
      } catch {
        continue
      }
      const documentIdFromFile = fileName.slice(0, -'.json'.length)
      const cached = knownById[documentIdFromFile]
      knownFiles.add(documentIdFromFile)
      if (cached !== undefined && cached.fileMtimeMs === fileMtimeMs) {
        documents[documentIdFromFile] = cached
        continue
      }
      const rawDocument = await this.state.readJson<unknown>(relative)
      if (!isSourceDocumentRecord(rawDocument)) {
        // 其它实现/旧格式的记录：跳过而不是让整个目录读取失败
        dirty = true
        continue
      }
      documents[documentIdFromFile] = entryFromDocument(rawDocument, fileMtimeMs)
      dirty = true
    }
    // 缓存里有、磁盘上已不存在的文档记录要移除
    for (const documentId of Object.keys(knownById)) {
      if (!knownFiles.has(documentId)) dirty = true
    }
    if (dirty) {
      for (const fileName of fileNames) {
        const documentIdFromFile = fileName.slice(0, -'.json'.length)
        if (documents[documentIdFromFile] !== undefined) continue
        const rawDocument = await this.state.readJson<unknown>(`sources/${fileName}`)
        if (isSourceDocumentRecord(rawDocument)) documents[documentIdFromFile] = entryFromDocument(rawDocument, 0)
      }
    }
    const catalog: CorpusCatalog = {
      version: CATALOG_VERSION,
      updatedAt: nowIso(),
      documents,
    }
    if (dirty) await this.writeCatalog(catalog)
    return catalog
  }

  private async writeCatalog(catalog: CorpusCatalog): Promise<void> {
    try {
      await this.state.writeJson(this.paths.catalog, catalog)
    } catch {
      // 目录缓存写失败不影响正确性；下次会重建
    }
  }

  /** 更新缓存中的一个文档条目（同时持久化缓存）。 */
  async upsertCatalog(document: SourceDocument): Promise<void> {
    const catalog = await this.catalog()
    const absolute = join(this.state.dataDir, this.paths.document(document.id))
    let fileMtimeMs = 0
    try {
      fileMtimeMs = (await stat(absolute)).mtimeMs
    } catch {
      fileMtimeMs = Date.now()
    }
    const documents: Record<string, CatalogEntry> = { ...catalog.documents, [document.id]: entryFromDocument(document, fileMtimeMs) }
    const next: CorpusCatalog = { ...catalog, updatedAt: nowIso(), documents }
    this.catalogValue = next
    await this.writeCatalog(next)
  }

  /** 读取文档记录。 */
  async readDocument(documentId: string): Promise<SourceDocument | undefined> {
    return await this.state.readJson<SourceDocument>(this.paths.document(documentId))
  }

  /** 持久化文档记录并更新目录缓存。 */
  async saveDocument(document: SourceDocument): Promise<SourceDocument> {
    const saved = await this.courses.saveSource(document)
    await this.upsertCatalog(saved)
    return saved
  }

  /** 列出全部文档（来自目录缓存，含最近一次保存的字段）。 */
  async listDocuments(): Promise<SourceDocument[]> {
    const catalog = await this.catalog()
    const documents: SourceDocument[] = []
    for (const documentId of Object.keys(catalog.documents)) {
      const document = await this.readDocument(documentId)
      if (document !== undefined) documents.push(document)
    }
    return documents
  }

  /** 按原文件绝对路径查找已导入文档。 */
  async findDocumentByPath(absolutePath: string): Promise<SourceDocument | undefined> {
    const catalog = await this.catalog()
    for (const entry of Object.values(catalog.documents)) {
      if (entry.originalPath === absolutePath) {
        const document = await this.readDocument(entry.documentId)
        if (document !== undefined) return document
      }
    }
    return undefined
  }

  /** 课程关联的文档 id 列表（含文档不存在时的容错）。 */
  async documentIdsForCourses(courseIds: readonly string[]): Promise<string[]> {
    if (courseIds.length === 0) return []
    const catalog = await this.catalog()
    const ids: string[] = []
    for (const entry of Object.values(catalog.documents)) {
      if (entry.courseIds.some(courseId => courseIds.includes(courseId))) ids.push(entry.documentId)
    }
    return ids
  }

  /** 写入一个修订的元数据、单元与问题、派生资产。 */
  async writeRevision(input: {
    readonly documentId: string
    readonly revisionId: string
    readonly meta: SourceRevisionMeta
    readonly payload: RevisionPayload
    readonly assets: ReadonlyMap<string, ParseAsset>
  }): Promise<void> {
    const assetsDir = this.paths.assetsDirAbs(input.documentId, input.revisionId)
    for (const [relativePath, asset] of input.assets) {
      if (relativePath.includes('..')) continue
      await writeAssetAtomic(join(assetsDir, relativePath), asset.bytes)
    }
    await this.state.writeJson(
      this.paths.revisionUnits(input.documentId, input.revisionId),
      input.payload,
    )
    await this.state.writeJson(
      this.paths.revisionMeta(input.documentId, input.revisionId),
      input.meta,
    )
  }

  /** 读取修订元数据。 */
  async readRevisionMeta(documentId: string, revisionId: string): Promise<SourceRevisionMeta | undefined> {
    return await this.state.readJson<SourceRevisionMeta>(this.paths.revisionMeta(documentId, revisionId))
  }

  /** 读取修订内容（单元 + 问题）。 */
  async readRevisionPayload(documentId: string, revisionId: string): Promise<RevisionPayload | undefined> {
    const stored = await this.state.readJson<RevisionPayload>(this.paths.revisionUnits(documentId, revisionId))
    if (stored === undefined) return undefined
    if (!Array.isArray(stored.units)) return undefined
    return { units: stored.units, issues: Array.isArray(stored.issues) ? stored.issues : [] }
  }

  /** 读取完整修订（元数据 + 内容）。 */
  async readRevision(documentId: string, revisionId: string): Promise<SourceRevision | undefined> {
    const meta = await this.readRevisionMeta(documentId, revisionId)
    if (meta === undefined) return undefined
    const payload = await this.readRevisionPayload(documentId, revisionId)
    return { ...meta, units: payload?.units ?? [], issues: payload?.issues ?? [] }
  }

  /** 旧修订的资产目录（不删除，保证历史引用可回看）。 */
  assetDirectory(documentId: string, revisionId: string): string {
    return this.paths.assetsDirAbs(documentId, revisionId)
  }

  /** 写入检索索引缓存（可失败，不影响正确性）。 */
  async writeSearchIndex(documentId: string, revisionId: string, value: unknown): Promise<void> {
    try {
      await this.state.writeJson(this.paths.searchIndex(documentId, revisionId), value)
    } catch {
      // 索引是缓存：写失败时下次搜索会重建
    }
  }

  /** 读取检索索引缓存。 */
  async readSearchIndex<T>(documentId: string, revisionId: string): Promise<T | undefined> {
    try {
      return await this.state.readJson<T>(this.paths.searchIndex(documentId, revisionId))
    } catch {
      return undefined
    }
  }

  /** 派生数据临时目录（相对路径）。 */
  get tempDir(): string {
    return toStoreRelative(this.state.dataDir, this.paths.tempDir)
  }
}

/** 由文档记录生成缓存条目。 */
function entryFromDocument(document: SourceDocument, fileMtimeMs: number): CatalogEntry {
  return {
    documentId: document.id,
    originalPath: document.originalPath,
    title: document.title,
    format: document.format,
    courseIds: document.courseIds,
    status: document.status,
    ...(document.currentRevisionId !== undefined ? { currentRevisionId: document.currentRevisionId } : {}),
    ...(document.mtimeMs !== undefined ? { mtimeMs: document.mtimeMs } : {}),
    ...(document.sizeBytes !== undefined ? { sizeBytes: document.sizeBytes } : {}),
    fileMtimeMs,
    updatedAt: document.updatedAt,
  }
}
