/**
 * CorpusService 实现：导入、修订持久化、读取、检索、课程草案、变化检测。
 *
 * 公开 seam 只返回 Result，预期失败（格式不支持、文件缺失、取消、模型不可用等）
 * 不向调用方 throw；原文件只读，所有派生产物写入 LocalState 的 dataDir 下。
 */
import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import type { CourseId, SourceId, SourceRevisionId } from '../contracts/ids.ts'
import { sourceId as newSourceId, sourceRevisionId as newSourceRevisionId, nowIso } from '../contracts/ids.ts'
import type { Result } from '../contracts/result.ts'
import { err, isAbort, ok } from '../contracts/result.ts'
import type { CourseRevision } from '../contracts/course.ts'
import type {
  CorpusSearchQuery, CorpusSearchResult, CorpusService, CourseDraftInput, ImportOutcome,
} from '../contracts/corpus.ts'
import type {
  ImportRequest, ParsedSource, SourceAnchor, SourceChange, SourceDocument, SourceIssue, SourceRevision,
  SourceRevisionMeta, SourceUnit,
} from '../contracts/source.ts'
import type { ModelClient } from '../model/types.ts'
import { CourseRepository } from '../storage/repositories.ts'
import type { LearningRepository } from '../storage/repositories.ts'
import type { LocalState } from '../storage/local-state.ts'
import { isSignalAborted, statusForIssues } from './budget.ts'
import type { ParserOutput } from './budget.ts'
import { CorpusCancelledError, isCorpusParseError, toCorpusAppError } from './errors.ts'
import { FINGERPRINT_PREFIX, hashFile, statFile, type FileStatInfo } from './fingerprint.ts'
import { resolveLimits, type CorpusLimits } from './limits.ts'
import type { OcrRuntime } from './ocr.ts'
import { resolveOcrRuntime, type OcrOptions } from './ocr.ts'
import { sourcePaths } from './paths.ts'
import { buildSearchIndex, SearchIndexCache, searchCorpus } from './search.ts'
import { CorpusStore } from './store.ts'
import { proposeCourseRevision, buildDraftCoverage, type DraftCoverageData } from './draft.ts'
import {
  buildEffects, describeDiff, diffUnits, resolveReferences,
} from './change-utils.ts'
import type { ParserOutput as ParsedOutput } from './budget.ts'
import type { ParseContext } from './parsers/context.ts'
import { detectSourceFormat, parseSourceFile } from './parsers/index.ts'
import type { CorpusReferenceHooks, CorpusServiceOptions } from './types.ts'

/** 服务扩展接口：契约方法与 Host 组装视图所需的辅助数据。 */
export interface CorpusServiceApi extends CorpusService {
  /** 当前生效的抽取/检索上限（Host 可用于展示）。 */
  readonly limits: CorpusLimits
  /** 生成 CourseDraftView 的 coverage/warnings（Host 负责组装视图）。 */
  buildCourseDraftCoverage(courseId: string, revisionId?: string): Promise<Result<DraftCoverageData>>
}

/** 解析所需参数。 */
interface ParseBytesInput {
  readonly path: string
  readonly bytes: Uint8Array
  readonly format: ParsedSource['format']
  readonly extension: string
  readonly revisionId: SourceRevisionId
  readonly signal?: AbortSignal
  readonly formatHint?: string
}

function withoutMissing(document: SourceDocument): SourceDocument {
  if (document.missing !== true) return document
  const { missing: _missing, ...rest } = document
  return rest
}

function documentStatusFor(status: SourceRevisionMeta['status']): SourceDocument['status'] {
  return status
}

function revisionEntry(meta: SourceRevisionMeta): SourceDocument['revisions'][number] {
  return {
    id: meta.id,
    fingerprint: meta.fingerprint,
    createdAt: meta.createdAt,
    status: meta.status,
    unitCount: meta.unitCount,
  }
}

function buildRevisionMeta(input: {
  readonly revisionId: SourceRevisionId
  readonly documentId: SourceId
  readonly fingerprint: string
  readonly extractor: { readonly name: string; readonly version: string }
  readonly units: readonly SourceUnit[]
  readonly issues: readonly SourceIssue[]
  readonly status: SourceRevisionMeta['status']
  readonly extent?: SourceRevisionMeta['extent']
}): SourceRevisionMeta {
  let textChars = 0
  for (const unit of input.units) textChars += unit.text.length
  const base: SourceRevisionMeta = {
    id: input.revisionId,
    documentId: input.documentId,
    fingerprint: input.fingerprint,
    createdAt: nowIso(),
    extractor: input.extractor,
    unitCount: input.units.length,
    issueCount: input.issues.length,
    status: input.status,
    textChars,
    ...(input.extent !== undefined ? { extent: input.extent } : {}),
  }
  return base
}

/** 由 createCorpusService 构造的实现。 */
export class CorpusServiceImpl implements CorpusServiceApi {
  readonly limits: CorpusLimits
  private readonly state: LocalState
  private readonly courses: CourseRepository
  private readonly learning?: LearningRepository
  private readonly model?: ModelClient
  private readonly references?: CorpusReferenceHooks
  private readonly ocrOptions?: OcrOptions
  private readonly store: CorpusStore
  private readonly cache: SearchIndexCache
  private ocrPromise?: Promise<OcrRuntime>
  private openPromise?: Promise<void>

  constructor(options: CorpusServiceOptions) {
    this.limits = resolveLimits(options.limits)
    this.state = options.state
    this.courses = options.courses ?? new CourseRepository(options.state)
    this.learning = options.learning
    this.model = options.model
    this.references = options.references
    this.ocrOptions = options.ocr
    this.store = new CorpusStore(options.state, this.courses, sourcePaths(options.state), this.limits)
    this.cache = new SearchIndexCache(this.limits.searchIndexCacheSize)
  }

  private async ensureOpen(): Promise<void> {
    if (this.openPromise === undefined) this.openPromise = this.store.open()
    await this.openPromise
  }

  private async getOcr(): Promise<OcrRuntime> {
    if (this.ocrPromise === undefined) {
      this.ocrPromise = resolveOcrRuntime(this.ocrOptions, this.limits)
    }
    return await this.ocrPromise
  }

  private get referenceDeps(): { readonly courses: CourseRepository; readonly references?: CorpusReferenceHooks } {
    return { courses: this.courses, ...(this.references !== undefined ? { references: this.references } : {}) }
  }

  /* ---------------------------------------------------------------- 导入 */

  async importFile(request: ImportRequest): Promise<Result<SourceDocument>> {
    return await this.guard('导入资料失败', async () => await this.importOne(request, undefined))
  }

  async importFiles(
    courseId: CourseId | undefined,
    requests: readonly ImportRequest[],
    hooks?: {
      readonly onProgress?: (done: number, total: number, current: string) => void
      readonly signal?: AbortSignal
    },
  ): Promise<ImportOutcome> {
    const documents: SourceDocument[] = []
    const failures: ImportOutcome['failures'][number][] = []
    const warnings: string[] = []
    const total = requests.length
    const signal = hooks?.signal
    try {
      await this.ensureOpen()
    } catch (cause) {
      return {
        documents,
        failures: [{ path: '', error: toCorpusAppError(cause, '本地数据目录无法打开') }],
        warnings: ['本地数据目录无法打开，未导入任何资料'],
      }
    }
    let done = 0
    hooks?.onProgress?.(0, total, requests[0]?.path ?? '')
    for (const request of requests) {
      if (isSignalAborted(signal)) break
      const current = request.path
      try {
        const effective: ImportRequest = request.courseId === undefined && courseId !== undefined
          ? { ...request, courseId }
          : request
        const result = await this.importOne(effective, signal)
        if (result.ok) documents.push(result.value)
        else failures.push({ path: current, error: result.error })
      } catch (cause) {
        if (isSignalAborted(signal) || cause instanceof CorpusCancelledError) {
          warnings.push(`导入已取消：当前文件未完成（${current}）`)
          break
        }
        failures.push({ path: current, error: toCorpusAppError(cause, '导入资料失败') })
      }
      done += 1
      hooks?.onProgress?.(done, total, current)
    }
    if (isSignalAborted(signal) && done < total) {
      const remaining = total - done
      warnings.push(`导入已取消：已完成 ${done}/${total}，剩余 ${remaining} 个文件未处理；已完成的资料可正常使用`)
    }
    if (failures.length > 0) {
      warnings.push(`${failures.length} 个文件导入失败，其余文件已处理；失败项可在问题清单中查看原因`)
    }
    return { documents, failures, warnings }
  }

  private async importOne(
    request: ImportRequest,
    signal: AbortSignal | undefined,
  ): Promise<Result<SourceDocument>> {
    const rawPath = typeof request.path === 'string' ? request.path.trim() : ''
    if (rawPath === '') return err('invalid-input', '导入路径为空')
    const absolutePath = resolve(rawPath)
    const info = await statFile(absolutePath)
    if (info === undefined) {
      return err('not-found', `资料文件不存在或不是普通文件：${absolutePath}`)
    }
    if (info.sizeBytes > this.limits.maxFileBytes) {
      return err('limit-exceeded', `文件超过单份上限（${Math.round(info.sizeBytes / 1024 / 1024)}MB > ${Math.round(this.limits.maxFileBytes / 1024 / 1024)}MB），未导入`)
    }
    const detected = detectSourceFormat(absolutePath)
    if (detected === undefined) {
      return err('invalid-input',
        `不支持的资料格式：${extname(absolutePath) || '无扩展名'}（支持 Markdown/文本/PDF/图片/Word/PPT/代码/Notebook/HTML）`,
        { cause: 'unsupported-format', details: { path: absolutePath } })
    }
    if (isSignalAborted(signal)) throw new CorpusCancelledError()
    const fingerprint = await hashFile(absolutePath)
    const existing = await this.store.findDocumentByPath(absolutePath)
    if (existing !== undefined && existing.currentRevisionId !== undefined) {
      const currentMeta = await this.store.readRevisionMeta(existing.id, existing.currentRevisionId)
      if (currentMeta !== undefined && currentMeta.fingerprint === fingerprint) {
        // 幂等：内容未变时不重复创建修订
        return ok(await this.attachCourseIfNeeded(existing, request.courseId))
      }
    }
    const bytes = new Uint8Array(await readFile(absolutePath))
    const revisionId = newSourceRevisionId()
    const parsed = await this.runParser({
      path: absolutePath,
      bytes,
      format: detected.format,
      extension: extname(absolutePath).toLowerCase(),
      revisionId,
      ...(signal !== undefined ? { signal } : {}),
    })
    if (!parsed.ok) return parsed
    const document = await this.persistParsedRevision({
      existing,
      absolutePath,
      format: detected.format,
      title: request.title,
      fingerprint,
      stat: info,
      parsed: parsed.value.parsed,
      assets: parsed.value.assets,
      revisionId,
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
    })
    return ok(document)
  }

  private async attachCourseIfNeeded(
    document: SourceDocument,
    courseId: CourseId | undefined,
  ): Promise<SourceDocument> {
    if (courseId === undefined || document.courseIds.includes(courseId)) return document
    return await this.store.saveDocument({
      ...document,
      courseIds: [...document.courseIds, courseId],
    })
  }

  /** 解析内存字节；把解析失败映射为 Result，不吞掉取消。 */
  private async runParser(input: ParseBytesInput): Promise<Result<ParsedOutput>> {
    const ocr = await this.getOcr()
    const context: ParseContext = {
      path: input.path,
      bytes: input.bytes,
      format: input.format,
      extension: input.extension,
      limits: this.limits,
      revisionId: input.revisionId,
      ocr,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      ...(input.formatHint !== undefined ? { formatHint: input.formatHint } : {}),
    }
    try {
      return ok(await parseSourceFile(context))
    } catch (cause) {
      if (cause instanceof CorpusCancelledError) throw cause
      if (isCorpusParseError(cause)) {
        return err('failed', cause.message, {
          cause: cause.causeCode,
          retryable: false,
          details: { path: input.path },
        })
      }
      return err('failed', `解析资料失败：${cause instanceof Error ? cause.message : String(cause)}`, {
        details: { path: input.path },
      })
    }
  }

  /** 持久化一个解析结果（新文档或既有文档的新修订）。 */
  private async persistParsedRevision(input: {
    readonly existing: SourceDocument | undefined
    readonly absolutePath: string
    readonly format: ParsedSource['format']
    readonly title?: string
    readonly fingerprint: string
    readonly stat: FileStatInfo
    readonly parsed: ParsedSource
    readonly assets: ReadonlyMap<string, { readonly bytes: Uint8Array; readonly ext: string }>
    readonly revisionId: SourceRevisionId
    readonly courseId?: CourseId
  }): Promise<SourceDocument> {
    const documentId = (input.existing?.id ?? newSourceId()) as SourceId
    const status = statusForIssues(input.parsed.issues)
    const meta = buildRevisionMeta({
      revisionId: input.revisionId,
      documentId,
      fingerprint: input.fingerprint,
      extractor: input.parsed.extractor,
      units: input.parsed.units,
      issues: input.parsed.issues,
      status,
      ...(input.parsed.extent !== undefined ? { extent: input.parsed.extent } : {}),
    })
    await this.store.writeRevision({
      documentId,
      revisionId: input.revisionId,
      meta,
      payload: { units: input.parsed.units, issues: input.parsed.issues },
      assets: input.assets,
    })
    const base = input.existing
    const detail = input.parsed.detail ?? base?.detail
    const courseIds: CourseId[] = [...(base?.courseIds ?? [])]
    if (input.courseId !== undefined && !courseIds.includes(input.courseId)) courseIds.push(input.courseId)
    const document: SourceDocument = {
      id: documentId,
      originalPath: input.absolutePath,
      title: input.title ?? base?.title ?? basename(input.absolutePath),
      format: input.format,
      ...(detail !== undefined ? { detail } : {}),
      sizeBytes: input.stat.sizeBytes,
      mtimeMs: input.stat.mtimeMs,
      courseIds,
      addedAt: base?.addedAt ?? nowIso(),
      updatedAt: nowIso(),
      status: documentStatusFor(meta.status),
      currentRevisionId: input.revisionId,
      revisions: [...(base?.revisions ?? []), revisionEntry(meta)],
    }
    const saved = await this.store.saveDocument(document)
    await this.indexRevision(saved, input.revisionId, input.parsed.units)
    return saved
  }

  /** 构建立即可用的检索索引（缓存失败不影响导入正确性）。 */
  private async indexRevision(
    document: SourceDocument,
    revisionId: string,
    units: readonly SourceUnit[],
  ): Promise<void> {
    try {
      const index = buildSearchIndex({
        documentId: document.id,
        revisionId,
        title: document.title,
        format: document.format,
        units,
        builtAt: nowIso(),
      })
      this.cache.set(`${document.id}:${revisionId}`, index)
      await this.store.writeSearchIndex(document.id, revisionId, index)
    } catch {
      // 索引是缓存：失败时 search 会按需重建
    }
  }

  /* ---------------------------------------------------------------- 读取 */

  async getDocument(documentId: SourceId): Promise<Result<SourceDocument>> {
    return await this.guard('读取资料失败', async () => {
      const document = await this.store.readDocument(documentId)
      if (document === undefined) return err('not-found', '资料不存在或已被删除')
      const info = await statFile(document.originalPath)
      return ok(info === undefined ? { ...withoutMissing(document), missing: true } : withoutMissing(document))
    })
  }

  async getRevision(documentId: SourceId, revisionId: SourceRevisionId): Promise<Result<SourceRevision>> {
    return await this.guard('读取资料修订失败', async () => {
      const revision = await this.store.readRevision(documentId, revisionId)
      if (revision === undefined) return err('not-found', '资料修订不存在')
      return ok(revision)
    })
  }

  async readUnits(
    documentId: SourceId,
    offset: number,
    limit: number,
    revisionId?: SourceRevisionId,
  ): Promise<Result<{ units: readonly SourceUnit[]; total: number }>> {
    return await this.guard('读取资料单元失败', async () => {
      const document = await this.store.readDocument(documentId)
      if (document === undefined) return err('not-found', '资料不存在或已被删除')
      const targetRevisionId = revisionId ?? document.currentRevisionId
      if (targetRevisionId === undefined) return err('not-found', '资料还没有可读修订')
      const payload = await this.store.readRevisionPayload(documentId, targetRevisionId)
      if (payload === undefined) return err('storage', '资料单元记录缺失或损坏')
      const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0
      const safeLimit = Number.isFinite(limit) ? Math.min(1000, Math.max(0, Math.floor(limit))) : 0
      return ok({ units: payload.units.slice(safeOffset, safeOffset + safeLimit), total: payload.units.length })
    })
  }

  async resolveAnchor(anchor: SourceAnchor): Promise<Result<SourceUnit>> {
    return await this.guard('解析来源定位失败', async () => {
      const revision = await this.store.readRevisionMeta(anchor.documentId, anchor.revisionId)
      if (revision === undefined) {
        return err('stale-revision', '引用的资料修订已不存在（资料可能已更新），请重新核对原文', {
          details: { documentId: anchor.documentId, revisionId: anchor.revisionId },
        })
      }
      const payload = await this.store.readRevisionPayload(anchor.documentId, anchor.revisionId)
      const unit = payload?.units.find(item => item.id === anchor.unitId)
      if (unit === undefined) {
        return err('not-found', '引用的原文单元不存在（资料可能已更新），请重新核对原文', {
          details: { documentId: anchor.documentId, revisionId: anchor.revisionId, unitId: anchor.unitId },
        })
      }
      return ok(unit)
    })
  }

  async listIssues(documentId: SourceId): Promise<Result<readonly SourceIssue[]>> {
    return await this.guard('读取问题清单失败', async () => {
      const document = await this.store.readDocument(documentId)
      if (document === undefined) return err('not-found', '资料不存在或已被删除')
      if (document.currentRevisionId === undefined) return ok([])
      const payload = await this.store.readRevisionPayload(documentId, document.currentRevisionId)
      return ok(payload?.issues ?? [])
    })
  }

  /* ---------------------------------------------------------------- 检索 */

  async search(query: CorpusSearchQuery): Promise<Result<CorpusSearchResult>> {
    return await this.guard('检索资料失败', async () => {
      if (typeof query.query !== 'string' || query.query.trim() === '') {
        return ok({ hits: [], empty: true })
      }
      const { result } = await searchCorpus(
        { store: this.store, limits: this.limits, cache: this.cache },
        query,
      )
      return ok(result)
    })
  }

  /* ---------------------------------------------------------------- 课程草案 */

  async proposeCourseStructure(input: CourseDraftInput, signal?: AbortSignal): Promise<Result<CourseRevision>> {
    return await this.guard('生成课程草案失败', async () => {
      return await proposeCourseRevision(
        { store: this.store, courses: this.courses, limits: this.limits, ...(this.model !== undefined ? { model: this.model } : {}) },
        input,
        signal,
      )
    })
  }

  async buildCourseDraftCoverage(courseId: string, revisionId?: string): Promise<Result<DraftCoverageData>> {
    return await this.guard('读取课程草案覆盖情况失败', async () => {
      return await buildDraftCoverage(
        { store: this.store, courses: this.courses },
        courseId,
        revisionId,
      )
    })
  }

  /* ---------------------------------------------------------------- 变化检测 */

  async detectChange(documentId: SourceId): Promise<Result<SourceChange>> {
    return await this.guard('检测资料变化失败', async () => {
      const document = await this.store.readDocument(documentId)
      if (document === undefined) return err('not-found', '资料不存在或已被删除')
      return await this.detectFor(document)
    })
  }

  async refreshDocument(documentId: SourceId, signal?: AbortSignal): Promise<Result<SourceChange>> {
    return await this.guard('更新资料失败', async () => await this.refreshInner(documentId, signal))
  }

  private async detectFor(document: SourceDocument): Promise<Result<SourceChange>> {
    const previousMeta = document.currentRevisionId !== undefined
      ? await this.store.readRevisionMeta(document.id, document.currentRevisionId)
      : undefined
    const previousFingerprint = previousMeta?.fingerprint ?? ''
    const info = await statFile(document.originalPath)
    if (info === undefined) {
      const updated = await this.store.saveDocument({ ...withoutMissing(document), missing: true })
      const references = await resolveReferences(this.referenceDeps, document.id, undefined)
      return ok({
        documentId: document.id,
        previousFingerprint,
        currentFingerprint: 'missing',
        changed: true,
        effects: buildEffects({
          references,
          summary: '原文件已不在记录的位置（可能被移动或删除）。旧修订仍可阅读；恢复文件或重新导入后可更新。',
          needsConfirmation: true,
        }),
      })
    }
    if (previousMeta !== undefined
      && document.mtimeMs === info.mtimeMs
      && document.sizeBytes === info.sizeBytes) {
      return ok({
        documentId: document.id,
        previousFingerprint,
        currentFingerprint: previousFingerprint,
        changed: false,
        effects: buildEffects({
          references: { affectedConceptIds: [], affectedActivityIds: [] },
          summary: '文件自上次导入后未变化',
          needsConfirmation: false,
        }),
      })
    }
    const fingerprint = await hashFile(document.originalPath)
    if (previousMeta !== undefined && previousMeta.fingerprint === fingerprint) {
      // 时间戳变化但内容相同：刷新元信息，不算内容变化
      if (document.mtimeMs !== info.mtimeMs || document.sizeBytes !== info.sizeBytes || document.missing === true) {
        await this.store.saveDocument({
          ...withoutMissing(document),
          mtimeMs: info.mtimeMs,
          sizeBytes: info.sizeBytes,
        })
      }
      return ok({
        documentId: document.id,
        previousFingerprint,
        currentFingerprint: fingerprint,
        changed: false,
        effects: buildEffects({
          references: { affectedConceptIds: [], affectedActivityIds: [] },
          summary: '文件内容与上次导入一致（仅元信息变化）',
          needsConfirmation: false,
        }),
      })
    }
    const references = await resolveReferences(this.referenceDeps, document.id, undefined)
    return ok({
      documentId: document.id,
      previousFingerprint,
      currentFingerprint: fingerprint,
      changed: true,
      effects: buildEffects({
        references,
        summary: '原文件内容已变化，需要重新导入以更新抽取内容与引用',
        needsConfirmation: false,
      }),
    })
  }

  private async refreshInner(documentId: SourceId, signal?: AbortSignal): Promise<Result<SourceChange>> {
    const document = await this.store.readDocument(documentId)
    if (document === undefined) return err('not-found', '资料不存在或已被删除')
    if (isSignalAborted(signal)) return err('cancelled', '更新资料已取消')
    const detected = await this.detectFor(document)
    if (!detected.ok) return detected
    const change = detected.value
    if (!change.changed) return ok(change)
    const info = await statFile(document.originalPath)
    if (info === undefined) {
      return err('not-found', '原文件已不在记录的位置，无法重新导入；请恢复文件或重新导入资料')
    }
    if (info.sizeBytes > this.limits.maxFileBytes) {
      return err('limit-exceeded', '原文件超过单份上限，无法重新导入')
    }
    if (change.currentFingerprint === 'missing' || change.currentFingerprint === '') {
      return err('failed', '无法取得原文件内容指纹，更新中止')
    }
    const previousMeta = document.currentRevisionId !== undefined
      ? await this.store.readRevisionMeta(document.id, document.currentRevisionId)
      : undefined
    const previousPayload = document.currentRevisionId !== undefined
      ? await this.store.readRevisionPayload(document.id, document.currentRevisionId)
      : undefined
    const detectedFormat = detectSourceFormat(document.originalPath, document.format) ?? { format: document.format }
    if (isSignalAborted(signal)) return err('cancelled', '更新资料已取消')
    const bytes = new Uint8Array(await readFile(document.originalPath))
    const revisionId = newSourceRevisionId()
    const parsed = await this.runParser({
      path: document.originalPath,
      bytes,
      format: detectedFormat.format,
      extension: extname(document.originalPath).toLowerCase(),
      revisionId,
      ...(signal !== undefined ? { signal } : {}),
    })
    if (!parsed.ok) {
      // 解析失败也记录为 failed 修订（历史保留），让学生看到「资料已损坏/无法读取」
      const message = parsed.error.message
      const failedMeta: SourceRevisionMeta = {
        id: revisionId,
        documentId: document.id,
        fingerprint: change.currentFingerprint,
        createdAt: nowIso(),
        extractor: { name: 'teaching-corpus', version: '1.0.0' },
        unitCount: 0,
        issueCount: 1,
        status: 'failed',
        textChars: 0,
        failure: { message },
      }
      const failedIssue: SourceIssue = {
        code: 'unsupported-content',
        severity: 'error',
        message: `资料更新失败：${message}`,
        reviewRequired: true,
      }
      await this.store.writeRevision({
        documentId: document.id,
        revisionId,
        meta: failedMeta,
        payload: { units: [], issues: [failedIssue] },
        assets: new Map(),
      })
      await this.store.saveDocument({
        ...withoutMissing(document),
        status: 'failed',
        currentRevisionId: revisionId,
        revisions: [...document.revisions, revisionEntry(failedMeta)],
        mtimeMs: info.mtimeMs,
        sizeBytes: info.sizeBytes,
      })
      const references = await resolveReferences(this.referenceDeps, document.id, undefined)
      return ok({
        documentId: document.id,
        previousFingerprint: change.previousFingerprint,
        currentFingerprint: change.currentFingerprint,
        changed: true,
        effects: buildEffects({
          references,
          summary: `资料更新失败：${message}。旧修订保留在历史中，可回看；请修复原文件后重新导入。`,
          needsConfirmation: true,
        }),
      })
    }
    const oldUnits = previousPayload?.units ?? []
    const diff = diffUnits(oldUnits, parsed.value.parsed.units)
    const updated = await this.persistParsedRevision({
      existing: document,
      absolutePath: document.originalPath,
      format: detectedFormat.format,
      fingerprint: change.currentFingerprint,
      stat: info,
      parsed: parsed.value.parsed,
      assets: parsed.value.assets,
      revisionId,
    })
    const references = await resolveReferences(this.referenceDeps, document.id, diff.affectedUnitIds)
    const needsConfirmation = diff.structureChanged
      || diff.changedRatio >= 0.3
      || (oldUnits.length === 0 && diff.added > 0)
    return ok({
      documentId: updated.id,
      previousFingerprint: previousMeta?.fingerprint ?? change.previousFingerprint,
      currentFingerprint: change.currentFingerprint,
      changed: true,
      effects: buildEffects({
        references,
        summary: describeDiff(diff, references.affectedConceptIds.length, references.affectedActivityIds.length),
        needsConfirmation,
      }),
    })
  }

  /* ---------------------------------------------------------------- 其它契约 */

  async parseFile(path: string, formatHint?: string): Promise<Result<ParsedSource>> {
    return await this.guard('解析资料失败', async () => {
      const absolutePath = resolve(path)
      const info = await statFile(absolutePath)
      if (info === undefined) return err('not-found', `资料文件不存在：${absolutePath}`)
      if (info.sizeBytes > this.limits.maxFileBytes) return err('limit-exceeded', '文件超过单份上限')
      const detected = detectSourceFormat(absolutePath, formatHint)
      if (detected === undefined) {
        return err('invalid-input', `不支持的资料格式：${extname(absolutePath) || '无扩展名'}`, {
          cause: 'unsupported-format',
        })
      }
      const bytes = new Uint8Array(await readFile(absolutePath))
      const revisionId = newSourceRevisionId()
      const parsed = await this.runParser({
        path: absolutePath,
        bytes,
        format: detected.format,
        extension: extname(absolutePath).toLowerCase(),
        revisionId,
        ...(formatHint !== undefined ? { formatHint } : {}),
      })
      if (!parsed.ok) return parsed
      // parseFile 不持久化：资产字节不落盘（assetPath 仍保留，供调用方了解结构）
      return ok(parsed.value.parsed)
    })
  }

  async saveRevision(
    document: SourceDocument,
    parsed: ParsedSource,
  ): Promise<Result<{ document: SourceDocument; revision: SourceRevision }>> {
    return await this.guard('保存资料修订失败', async () => {
      if (parsed.units.length === 0 && parsed.issues.length === 0) {
        return err('invalid-input', '解析结果为空，没有可保存的单元')
      }
      const existing = await this.store.readDocument(document.id)
      const info = await statFile(document.originalPath)
      const fingerprint = info !== undefined
        ? await hashFile(document.originalPath)
        : `${FINGERPRINT_PREFIX}parsed-${hashUnits(parsed.units)}`
      const revisionId = newSourceRevisionId()
      const stat: FileStatInfo = info ?? { mtimeMs: 0, sizeBytes: 0 }
      const saved = await this.persistParsedRevision({
        existing: existing ?? { ...document, revisions: [] },
        absolutePath: document.originalPath,
        format: parsed.format,
        title: document.title,
        fingerprint,
        stat,
        parsed,
        assets: new Map(),
        revisionId,
      })
      const revision = await this.store.readRevision(saved.id, revisionId)
      if (revision === undefined) return err('storage', '资料修订写入后无法读回')
      return ok({ document: saved, revision })
    })
  }

  private async guard<T>(
    fallback: string,
    operation: () => Promise<Result<T>>,
  ): Promise<Result<T>> {
    try {
      await this.ensureOpen()
      return await operation()
    } catch (cause) {
      return { ok: false, error: toCorpusAppError(cause, fallback) }
    }
  }
}

/** 由单元内容生成指纹（原文件缺失时 saveRevision 用）。 */
function hashUnits(units: readonly SourceUnit[]): string {
  let text = ''
  for (const unit of units) text += `${unit.kind}\u0000${unit.text}\u0000${JSON.stringify(unit.locator)}\n`
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

/** 供 Host 使用的工厂函数。 */
export function createCorpusService(options: CorpusServiceOptions): CorpusServiceApi {
  return new CorpusServiceImpl(options)
}
