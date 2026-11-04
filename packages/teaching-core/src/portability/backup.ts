/**
 * Backup creation, inspection and restore for the teaching data directory.
 *
 * A backup is a ZIP (fflate, pure JS) containing:
 * - `manifest.json`: format version, schema version, per-file size/sha256,
 *   logical category, recorded original source paths (never the source files
 *   themselves), total size, `excludesCredentials: true`;
 * - every durable data file under `$DSH_HOME/teaching/` except `exports/`,
 *   `backups/`, `cache/`, `tasks/` and (by default) `usage/`.
 *
 * Restore validates the whole archive (zip validity, manifest shape, path
 * safety, schema compatibility, every sha256) and stages the data in a sibling
 * temporary directory before writing anything into the live data directory.
 * Original source files are not restored: their recorded paths are re-checked
 * (and optionally remapped), and missing ones are reported instead of dropped.
 */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type {
  BackupEntry, BackupManifest, RestoreReport,
} from '../contracts/portability.ts'
import { BACKUP_FORMAT_VERSION } from '../contracts/portability.ts'
import type { SourceDocument } from '../contracts/source.ts'
import { backupId as newBackupId, nowIso } from '../contracts/ids.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import { META_FILE, SCHEMA_VERSION } from '../storage/layout.ts'
import type { StoreMeta } from '../storage/local-state.ts'

/** Directories never included in a backup (artifacts, caches and in-flight tasks). */
const ALWAYS_EXCLUDED_DIRS: readonly string[] = ['exports', 'backups', 'cache', 'tasks']

/** Data directories that make a data dir "in use" for the pre-restore backup. */
const DATA_DIRS: readonly string[] = [
  'courses', 'sessions', 'activities', 'learning', 'sources', 'environments', 'runs',
]

/** File name of the manifest inside the archive. */
const MANIFEST_IN_ARCHIVE = 'manifest.json'

/** Parameters for creating one backup archive. */
export interface CreateBackupParams {
  readonly dataDir: string
  readonly outDir: string
  /** Directory (or directories) receiving the `<backupId>.manifest.json` sidecar. */
  readonly sidecarDirs: readonly string[]
  readonly pluginVersion: string
  readonly appVersion: string
  readonly includeUsage: boolean
  readonly signal?: AbortSignal
  readonly now?: () => string
}

/** A validated archive ready to be restored. */
export interface ValidatedArchive {
  readonly manifest: BackupManifest
  readonly files: ReadonlyMap<string, Uint8Array>
  readonly archiveBytes: number
}

/** Parameters for restoring one archive. */
export interface RestoreBackupParams {
  readonly dataDir: string
  readonly archivePath: string
  readonly remapSources?: Readonly<Record<string, string>>
  readonly signal?: AbortSignal
  /** Called with the current data before anything is overwritten. */
  readonly createPreRestoreBackup: () => Promise<Result<{ readonly archivePath: string }>>
}

/** SHA-256 of one byte buffer, lowercase hex. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Whether an error means "does not exist". */
function isMissingError(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && (cause as { code?: unknown }).code === 'ENOENT'
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

/** Logical category recorded per archived file. */
export function categorizePath(path: string): string {
  if (path === META_FILE) return 'meta'
  if (path === 'student-profile.json') return 'profile'
  if (path === 'settings.json') return 'settings'
  if (path.startsWith('courses/')) return path.includes('.revisions/') ? 'course-revision' : 'course'
  if (path.startsWith('sources/')) {
    return /^sources\/[^/]+\.json$/u.test(path) ? 'source' : 'source-derived'
  }
  if (path.startsWith('sessions/')) return path.includes('.messages.') ? 'session-messages' : 'session'
  if (path.startsWith('activities/')) return path.endsWith('.state.json') ? 'activity-state' : 'activity'
  if (path.startsWith('learning/')) return 'learning'
  if (path.startsWith('environments/')) return 'environment'
  if (path.startsWith('runs/')) return 'run'
  if (path.startsWith('usage/')) return 'usage'
  if (path.startsWith('tasks/')) return 'task'
  return 'other'
}

/**
 * List every durable file under the data dir as posix-relative paths.
 *
 * `exports/`, `backups/`, `cache/` and `tasks/` are excluded always; `usage/`
 * only when `includeUsage` is true. Temp files left by a crashed atomic write
 * are skipped.
 */
export async function listBackupFiles(dataDir: string, includeUsage: boolean): Promise<string[]> {
  const excluded = new Set<string>([...ALWAYS_EXCLUDED_DIRS, ...(includeUsage ? [] : ['usage'])])
  const out: string[] = []
  const walk = async (relativeDir: string): Promise<void> => {
    const absoluteDir = relativeDir === '' ? dataDir : join(dataDir, relativeDir.split('/').join(sep))
    let entries
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true })
    } catch (cause) {
      if (isMissingError(cause)) return
      throw cause
    }
    for (const entry of entries) {
      const relativePath = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`
      if (entry.isDirectory()) {
        if (relativeDir === '' && excluded.has(entry.name)) continue
        await walk(relativePath)
        continue
      }
      if (!entry.isFile()) continue
      if (entry.name.endsWith('.tmp')) continue
      out.push(relativePath)
    }
  }
  await walk('')
  return out.sort()
}

/** Read the schema version from `meta.json` (falls back to the current version). */
export async function readSchemaVersion(dataDir: string): Promise<number> {
  try {
    const meta = JSON.parse(await readFile(join(dataDir, META_FILE), 'utf8')) as StoreMeta
    if (typeof meta.schemaVersion === 'number' && Number.isInteger(meta.schemaVersion)) return meta.schemaVersion
  } catch {
    // A data dir that was never opened has no meta; the restore recreates it.
  }
  return SCHEMA_VERSION
}

/** Whether a path exists (any stat error is treated as missing). */
async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** Recorded original source paths with their current existence. */
export async function collectSourcePaths(
  dataDir: string,
): Promise<BackupManifest['sourcePaths']> {
  const sourcesDir = join(dataDir, 'sources')
  let names: string[]
  try {
    names = (await readdir(sourcesDir)).filter(name => name.endsWith('.json')).sort()
  } catch (cause) {
    if (isMissingError(cause)) return []
    throw cause
  }
  const paths: { sourceId: string; path: string; exists: boolean }[] = []
  for (const name of names) {
    try {
      const document = JSON.parse(await readFile(join(sourcesDir, name), 'utf8')) as SourceDocument
      if (typeof document.id !== 'string' || typeof document.originalPath !== 'string') continue
      paths.push({ sourceId: document.id, path: document.originalPath, exists: await pathExists(document.originalPath) })
    } catch {
      // The file is still archived byte-for-byte; only the manifest pointer is skipped.
    }
  }
  return paths.sort((a, b) => a.sourceId.localeCompare(b.sourceId))
}

/** Atomically write one file (tmp + rename) so a crash never leaves a half file. */
export async function writeFileAtomic(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  await writeFile(tmp, data)
  await rename(tmp, path)
}

/**
 * Create one backup archive.
 *
 * @returns the archive path, manifest and written byte count.
 */
export async function createBackupArchive(params: CreateBackupParams): Promise<Result<{
  backupId: string
  archivePath: string
  manifest: BackupManifest
  bytes: number
}>> {
  const { dataDir, outDir, pluginVersion, appVersion, includeUsage } = params
  if (isAborted(params.signal)) return err('cancelled', '备份已取消')
  const backupId = newBackupId()
  const createdAt = params.now?.() ?? nowIso()
  const relativePaths = await listBackupFiles(dataDir, includeUsage)
  if (isAborted(params.signal)) return err('cancelled', '备份已取消')
  const entries: BackupEntry[] = []
  const files: Record<string, Uint8Array> = {}
  let totalBytes = 0
  for (const relativePath of relativePaths) {
    if (isAborted(params.signal)) return err('cancelled', '备份已取消')
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await readFile(join(dataDir, relativePath.split('/').join(sep))))
    } catch (cause) {
      return err('storage', `读取备份数据失败：${relativePath}`, {
        details: { path: relativePath, message: cause instanceof Error ? cause.message : String(cause) },
      })
    }
    entries.push({ path: relativePath, bytes: bytes.byteLength, sha256: sha256Hex(bytes), category: categorizePath(relativePath) })
    files[relativePath] = bytes
    totalBytes += bytes.byteLength
  }
  const manifest: BackupManifest = {
    id: backupId,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt,
    pluginVersion,
    appVersion,
    schemaVersion: await readSchemaVersion(dataDir),
    entries,
    sourcePaths: await collectSourcePaths(dataDir),
    excludesCredentials: true,
    totalBytes,
  }
  if (isAborted(params.signal)) return err('cancelled', '备份已取消')
  const archiveBytes = zipSync(
    { ...files, [MANIFEST_IN_ARCHIVE]: strToU8(JSON.stringify(manifest, null, 2)) },
    { level: 6, mtime: new Date(createdAt) },
  )
  const archivePath = join(outDir, `${backupId}.zip`)
  await writeFileAtomic(archivePath, archiveBytes)
  for (const sidecarDir of params.sidecarDirs) {
    await writeFileAtomic(
      join(sidecarDir, `${backupId}.manifest.json`),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
  }
  return ok({ backupId, archivePath, manifest, bytes: archiveBytes.byteLength })
}

/** Whether an archive path is safe to extract (no traversal, no absolute paths). */
export function isSafeArchivePath(path: string): boolean {
  if (path === '' || path.length > 512) return false
  if (path.startsWith('/') || path.startsWith('\\')) return false
  if (path.includes('\\')) return false
  if (/^[A-Za-z]:/u.test(path)) return false
  if (path.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) return false
  return true
}

/** Validate one manifest object read from an archive. */
function validateManifestShape(value: unknown): value is BackupManifest {
  if (typeof value !== 'object' || value === null) return false
  const manifest = value as Partial<BackupManifest>
  return typeof manifest.id === 'string'
    && typeof manifest.formatVersion === 'number'
    && Number.isInteger(manifest.formatVersion)
    && typeof manifest.createdAt === 'string'
    && typeof manifest.pluginVersion === 'string'
    && typeof manifest.appVersion === 'string'
    && typeof manifest.schemaVersion === 'number'
    && Number.isInteger(manifest.schemaVersion)
    && Array.isArray(manifest.entries)
    && Array.isArray(manifest.sourcePaths)
    && manifest.excludesCredentials === true
    && typeof manifest.totalBytes === 'number'
}

/**
 * Read, validate and verify one backup archive without touching the data dir.
 *
 * Validation is complete before any restore write: zip integrity, manifest
 * shape/version, path safety, schema compatibility and every entry's sha256.
 */
export async function readValidatedArchive(archivePath: string): Promise<Result<ValidatedArchive>> {
  let raw: Buffer
  try {
    raw = await readFile(archivePath)
  } catch (cause) {
    if (isMissingError(cause)) return err('not-found', '备份文件不存在或已被移动', { details: { archivePath } })
    return err('storage', '读取备份文件失败', {
      details: { archivePath, message: cause instanceof Error ? cause.message : String(cause) },
    })
  }
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(raw))
  } catch {
    return err('storage', '备份文件不是有效的 ZIP 归档（可能已损坏或被截断）', { details: { archivePath } })
  }
  const manifestBytes = entries[MANIFEST_IN_ARCHIVE]
  if (manifestBytes === undefined) {
    return err('storage', '备份缺少 manifest.json，无法校验内容', { details: { archivePath } })
  }
  let manifest: BackupManifest
  try {
    manifest = JSON.parse(strFromU8(manifestBytes)) as BackupManifest
  } catch {
    return err('storage', '备份清单 manifest.json 无法解析')
  }
  if (!validateManifestShape(manifest)) {
    return err('storage', '备份清单字段不完整或类型错误')
  }
  if (manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    return err('storage', `备份格式版本 ${manifest.formatVersion} 比当前插件支持的 ${BACKUP_FORMAT_VERSION} 更新，请升级插件后再恢复`, {
      details: { formatVersion: manifest.formatVersion, supported: BACKUP_FORMAT_VERSION },
    })
  }
  if (manifest.formatVersion < 1) {
    return err('storage', `备份格式版本 ${manifest.formatVersion} 无效`)
  }
  if (manifest.schemaVersion > SCHEMA_VERSION) {
    return err('storage', `备份数据 schema ${manifest.schemaVersion} 比当前插件支持的 ${SCHEMA_VERSION} 更新，请升级插件后再恢复`, {
      details: { schemaVersion: manifest.schemaVersion, supported: SCHEMA_VERSION },
    })
  }
  const files = new Map<string, Uint8Array>()
  const listed = new Set<string>()
  for (const entry of manifest.entries) {
    if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number' || typeof entry.sha256 !== 'string') {
      return err('storage', '备份清单条目字段无效')
    }
    if (!isSafeArchivePath(entry.path)) {
      return err('storage', `备份清单包含非法路径：${entry.path}`, { details: { path: entry.path } })
    }
    if (listed.has(entry.path)) return err('storage', `备份清单重复列出文件：${entry.path}`)
    listed.add(entry.path)
    const bytes = entries[entry.path]
    if (bytes === undefined) {
      return err('storage', `备份缺少清单中的文件：${entry.path}`, { details: { path: entry.path } })
    }
    if (bytes.byteLength !== entry.bytes) {
      return err('storage', `备份文件大小校验失败：${entry.path}`, {
        details: { path: entry.path, expected: entry.bytes, actual: bytes.byteLength },
      })
    }
    const actual = sha256Hex(bytes)
    if (actual !== entry.sha256) {
      return err('storage', `备份文件校验失败（sha256 不匹配）：${entry.path}`, {
        details: { path: entry.path, expected: entry.sha256, actual },
      })
    }
    files.set(entry.path, bytes)
  }
  for (const name of Object.keys(entries)) {
    if (name === MANIFEST_IN_ARCHIVE || name.endsWith('/')) continue
    if (!listed.has(name)) {
      return err('storage', `备份包含清单之外的文件：${name}`, { details: { path: name } })
    }
  }
  return ok({ manifest, files, archiveBytes: raw.byteLength })
}

/** Whether the target data dir already has student data worth protecting. */
export async function hasExistingData(dataDir: string): Promise<boolean> {
  if (await pathExists(join(dataDir, META_FILE))) return true
  for (const dir of DATA_DIRS) {
    try {
      const names = await readdir(join(dataDir, dir))
      if (names.length > 0) return true
    } catch (cause) {
      if (!isMissingError(cause)) throw cause
    }
  }
  return false
}

/**
 * Restore one validated archive into `dataDir`.
 *
 * Everything is validated and staged first; the live data directory is only
 * written after the pre-restore backup succeeded (when it had data). Each write
 * is atomic per file, so a failure mid-restore never leaves a corrupt record.
 */
export async function restoreBackupArchive(params: RestoreBackupParams): Promise<Result<RestoreReport>> {
  const { dataDir } = params
  const validated = await readValidatedArchive(params.archivePath)
  if (!validated.ok) return validated
  const { manifest, files } = validated.value
  if (isAborted(params.signal)) return err('cancelled', '恢复已取消')

  if (manifest.schemaVersion < SCHEMA_VERSION) {
    // Only same-version restores ship today; a real migration would run here.
    return err('storage', `备份 schema ${manifest.schemaVersion} 需要迁移到 ${SCHEMA_VERSION}，当前版本还没有该迁移`, {
      details: { schemaVersion: manifest.schemaVersion, supported: SCHEMA_VERSION },
    })
  }

  // 1. Stage the archive beside the data dir (same filesystem for cheap renames).
  await mkdir(dirname(dataDir), { recursive: true })
  const stagingDir = await mkdtemp(join(dirname(dataDir), '.teaching-restore-'))
  const warnings: string[] = []
  const missingSources: { sourceId: string; path: string }[] = []
  let overwritten = 0
  const restored: string[] = []
  try {
    for (const [relativePath, bytes] of files) {
      if (isAborted(params.signal)) return err('cancelled', '恢复已取消')
      const stagedPath = join(stagingDir, relativePath.split('/').join(sep))
      await writeFileAtomic(stagedPath, bytes)
    }

    // 2. Tolerate unparsable records (they are restored byte-for-byte) but warn.
    let unparsable = 0
    for (const [relativePath] of files) {
      if (!relativePath.endsWith('.json')) continue
      try {
        JSON.parse(await readFile(join(stagingDir, relativePath.split('/').join(sep)), 'utf8'))
      } catch {
        unparsable += 1
        warnings.push(`备份中的记录无法解析，已原样恢复：${relativePath}`)
      }
    }

    // 3. Re-locate original source paths (never silently dropped).
    const remap = params.remapSources ?? {}
    const stagedSourcesDir = join(stagingDir, 'sources')
    let sourceNames: string[] = []
    try {
      sourceNames = (await readdir(stagedSourcesDir)).filter(name => name.endsWith('.json')).sort()
    } catch (cause) {
      if (!isMissingError(cause)) throw cause
    }
    for (const name of sourceNames) {
      const path = join(stagedSourcesDir, name)
      let document: SourceDocument
      try {
        document = JSON.parse(await readFile(path, 'utf8')) as SourceDocument
      } catch {
        continue
      }
      if (typeof document.id !== 'string' || typeof document.originalPath !== 'string') continue
      const mapped = remap[document.originalPath]
      const originalPath = mapped ?? document.originalPath
      const exists = await pathExists(originalPath)
      if (!exists) missingSources.push({ sourceId: document.id, path: originalPath })
      const next: SourceDocument = {
        ...document,
        originalPath,
        ...(exists ? {} : { missing: true }),
      }
      if (exists) delete (next as { missing?: boolean }).missing
      await writeFileAtomic(path, `${JSON.stringify(next, null, 2)}\n`)
    }

    // 4. Patch meta last (schema/version facts) so a reader never sees a mixed header.
    const stagedMetaPath = join(stagingDir, META_FILE)
    let meta: StoreMeta
    try {
      meta = JSON.parse(await readFile(stagedMetaPath, 'utf8')) as StoreMeta
    } catch {
      meta = {
        schemaVersion: SCHEMA_VERSION,
        createdAt: manifest.createdAt,
        updatedAt: manifest.createdAt,
        installationId: `inst-${Math.random().toString(36).slice(2, 10)}`,
      }
      warnings.push('备份中没有可用的 meta.json，已按当前版本重建数据目录元信息')
    }
    const patchedMeta: StoreMeta = {
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      pluginVersion: manifest.pluginVersion,
      updatedAt: nowIso(),
    }
    await writeFileAtomic(stagedMetaPath, `${JSON.stringify(patchedMeta, null, 2)}\n`)

    // 5. Protect the current data before the first overwrite.
    if (await hasExistingData(dataDir)) {
      const backup = await params.createPreRestoreBackup()
      if (!backup.ok) {
        return err('storage', '恢复前自动备份当前数据失败，已中止恢复（原数据未改动）', {
          details: { backupError: backup.error.message },
        })
      }
      warnings.push(`恢复前已自动备份当前数据：${backup.value.archivePath}`)
    } else {
      warnings.push('目标数据目录为空（全新安装），未创建恢复前备份')
    }
    if (isAborted(params.signal)) return err('cancelled', '恢复已取消')
    if (unparsable > 0) warnings.push(`共有 ${unparsable} 个记录无法解析，已按备份原样恢复，相关功能可能提示记录损坏`)

    // 6. Write the staged files into the live data dir, meta.json last.
    const ordered = [...files.keys()].sort((a, b) => {
      if (a === META_FILE) return 1
      if (b === META_FILE) return -1
      return a.localeCompare(b)
    })
    try {
      for (const relativePath of ordered) {
        if (isAborted(params.signal)) return err('cancelled', '恢复已取消（已写入部分文件，未写入的记录保持原状）')
        const target = join(dataDir, relativePath.split('/').join(sep))
        if (await pathExists(target)) overwritten += 1
        const stagedPath = join(stagingDir, relativePath.split('/').join(sep))
        await writeFileAtomic(target, await readFile(stagedPath))
        restored.push(relativePath)
      }
    } catch (cause) {
      return err('storage', '恢复写入失败，已写入的文件保持有效；未写入的记录未被改动', {
        details: {
          written: restored.length,
          message: cause instanceof Error ? cause.message : String(cause),
        },
      })
    }

    const reportWarnings = [
      ...warnings,
      ...(overwritten > 0 ? [`覆盖了当前数据目录中 ${overwritten} 个同名文件（其余现有记录保留）`] : []),
      '恢复完成后，运行中的 Host 可能需要重启以重新加载缓存（课程/会话列表、学习记录）。',
    ]
    const report: RestoreReport = {
      backupId: manifest.id,
      restored,
      skipped: [],
      missingSources,
      needsPathRemap: missingSources.length > 0,
      ...(manifest.schemaVersion < SCHEMA_VERSION ? { schemaMigratedFrom: manifest.schemaVersion } : {}),
      warnings: reportWarnings,
    }
    return ok(report)
  } finally {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** Remove one archive file and its sidecars (used by artifact cleanup if added later). */
export async function removeArchiveFile(archivePath: string): Promise<void> {
  await rm(archivePath, { force: true }).catch(() => undefined)
}