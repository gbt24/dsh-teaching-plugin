/**
 * Atomic, versioned local JSON store for the teaching plugin.
 *
 * Guarantees:
 * - writes are atomic per file (tmp + rename), so a crash never leaves a
 *   half-written record that parses as valid JSON;
 * - concurrent writes to the same file are serialised (last writer wins, but
 *   no interleaved bytes);
 * - a corrupt record is reported with its path instead of silently replaced;
 * - the schema version is checked on open and mismatches return a `storage`
 *   error so callers can offer migration/backup instead of corrupting data.
 */
import {
  appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize } from 'node:path'
import type { AppError } from '../contracts/result.ts'
import { nowIso } from '../contracts/ids.ts'
import {
  dataDirs, layout, META_FILE, SCHEMA_VERSION,
} from './layout.ts'

/** Metadata header stored in `<dataDir>/meta.json`. */
export interface StoreMeta {
  readonly schemaVersion: number
  readonly createdAt: string
  readonly updatedAt: string
  /** Random per-installation id (not a credential). */
  readonly installationId: string
  readonly pluginVersion?: string
}

/** Options for opening a store. */
export interface LocalStateOptions {
  /** Absolute data directory, e.g. `$DSH_HOME/teaching`. */
  readonly dataDir: string
  /** Allow opening a store with an older schema (caller is responsible for migration). */
  readonly allowOldSchema?: boolean
  /** Plugin version recorded in meta.json. */
  readonly pluginVersion?: string
}

/** A store problem that callers must surface rather than swallow. */
export class StoreError extends Error {
  readonly appError: AppError

  constructor(appError: AppError) {
    super(appError.message)
    this.name = 'StoreError'
    this.appError = appError
  }
}

/** Serialise one path's writes; reads do not wait unless a write is in flight. */
class PathMutex {
  private readonly tails = new Map<string, Promise<unknown>>()

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    const next = previous.then(fn, fn)
    const tracked = next.catch((): undefined => undefined)
    this.tails.set(key, tracked)
    try {
      return await next
    } finally {
      if (this.tails.get(key) === tracked) this.tails.delete(key)
    }
  }
}

/** Resolve and validate a path that must stay inside the data dir. */
function safePath(dataDir: string, relative: string): string {
  if (isAbsolute(relative)) throw new StoreError({ code: 'invalid-input', message: `拒绝绝对路径写入: ${relative}` })
  const full = normalize(join(dataDir, relative))
  const root = normalize(dataDir)
  if (full !== root && !full.startsWith(`${root}/`)) {
    throw new StoreError({ code: 'invalid-input', message: `拒绝越界路径写入: ${relative}` })
  }
  return full
}

/** Central local store facade. */
export class LocalState {
  readonly dataDir: string
  readonly paths: ReturnType<typeof layout>
  private readonly mutex = new PathMutex()
  private readonly options: LocalStateOptions
  private metaCache?: StoreMeta

  constructor(options: LocalStateOptions) {
    this.options = options
    this.dataDir = options.dataDir
    this.paths = layout(options.dataDir)
  }

  /** Create directories and meta.json; validates schema version. */
  async open(): Promise<StoreMeta> {
    if (this.metaCache !== undefined) return this.metaCache
    await mkdir(this.dataDir, { recursive: true })
    for (const dir of dataDirs(this.dataDir)) await mkdir(dir, { recursive: true })
    const metaPath = this.paths.files.meta
    try {
      const raw = await readFile(metaPath, 'utf8')
      const meta = JSON.parse(raw) as StoreMeta
      this.validateMeta(meta)
      this.metaCache = meta
      return meta
    } catch (cause) {
      if (isMissing(cause)) {
        const meta: StoreMeta = {
          schemaVersion: SCHEMA_VERSION,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          installationId: `inst-${Math.random().toString(36).slice(2, 10)}`,
          pluginVersion: this.options.pluginVersion,
        }
        await this.writeAbsolute(metaPath, meta)
        this.metaCache = meta
        return meta
      }
      throw cause
    }
  }

  /** Update meta (e.g. after migration). */
  async updateMeta(patch: Partial<StoreMeta>): Promise<StoreMeta> {
    const meta = { ...(await this.open()), ...patch, updatedAt: nowIso() }
    if (patch.schemaVersion !== undefined && patch.schemaVersion !== SCHEMA_VERSION) {
      throw new StoreError({ code: 'invalid-input', message: 'schemaVersion 只能升级到当前版本' })
    }
    this.validateMeta(meta)
    this.metaCache = meta
    await this.writeAbsolute(this.paths.files.meta, meta)
    return meta
  }

  /** Read one JSON record by relative path; returns undefined when absent. */
  async readJson<T>(relative: string): Promise<T | undefined> {
    const path = safePath(this.dataDir, relative)
    try {
      const raw = await readFile(path, 'utf8')
      if (raw.trim() === '') return undefined
      return JSON.parse(raw) as T
    } catch (cause) {
      if (isMissing(cause)) return undefined
      if (cause instanceof SyntaxError) {
        throw new StoreError({
          code: 'storage',
          message: `本地记录损坏，已保留原文件以便恢复: ${relative}`,
          details: { path: relative, reason: cause.message },
        })
      }
      throw cause
    }
  }

  /** Read multiple records, skipping absent ones. */
  async readMany<T>(relativePaths: readonly string[]): Promise<T[]> {
    const out: T[] = []
    for (const relative of relativePaths) {
      const value = await this.readJson<T>(relative)
      if (value !== undefined) out.push(value)
    }
    return out
  }

  /** Atomically write one JSON record. */
  async writeJson(relative: string, value: unknown): Promise<void> {
    const path = safePath(this.dataDir, relative)
    await this.mutex.run(path, async () => {
      await mkdir(dirname(path), { recursive: true })
      await this.writeAbsolute(path, value)
    })
  }

  /** Delete one file or directory (idempotent). */
  async remove(relative: string): Promise<boolean> {
    const path = safePath(this.dataDir, relative)
    return this.mutex.run(path, async () => {
      try {
        await rm(path, { recursive: true, force: true })
        return true
      } catch (cause) {
        if (isMissing(cause)) return false
        throw cause
      }
    })
  }

  /** List file names in one relative directory (no recursion, sorted). */
  async list(relativeDir: string): Promise<string[]> {
    const path = safePath(this.dataDir, relativeDir)
    try {
      const entries = await readdir(path, { withFileTypes: true })
      return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .sort()
    } catch (cause) {
      if (isMissing(cause)) return []
      throw cause
    }
  }

  /** List subdirectory names in one relative directory. */
  async listDirs(relativeDir: string): Promise<string[]> {
    const path = safePath(this.dataDir, relativeDir)
    try {
      const entries = await readdir(path, { withFileTypes: true })
      return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    } catch (cause) {
      if (isMissing(cause)) return []
      throw cause
    }
  }

  /** Whether a relative file exists. */
  async exists(relative: string): Promise<boolean> {
    try {
      await stat(safePath(this.dataDir, relative))
      return true
    } catch (cause) {
      if (isMissing(cause)) return false
      throw cause
    }
  }

  /** Append one JSON line (usage logs, append-only message streams). */
  async appendJsonl(relative: string, value: unknown): Promise<void> {
    const path = safePath(this.dataDir, relative)
    await this.mutex.run(path, async () => {
      await mkdir(dirname(path), { recursive: true })
      await appendFile(path, `${JSON.stringify(value)}\n`, 'utf8')
    })
  }

  /** Read a JSONL file, skipping a trailing partial line after a crash. */
  async readJsonl<T>(relative: string): Promise<T[]> {
    const path = safePath(this.dataDir, relative)
    let raw: string
    try {
      raw = await readFile(path, 'utf8')
    } catch (cause) {
      if (isMissing(cause)) return []
      throw cause
    }
    const lines = raw.split('\n').filter(line => line.trim() !== '')
    const out: T[] = []
    for (const line of lines) {
      try {
        out.push(JSON.parse(line) as T)
      } catch {
        // A single corrupt line must not hide every other durable record.
        continue
      }
    }
    return out
  }

  /** Absolute path of the data directory (for display only). */
  get root(): string {
    return this.dataDir
  }

  private async writeAbsolute(path: string, value: unknown): Promise<void> {
    const tmp = join(dirname(path), `.${META_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`)
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(tmp, path)
  }

  private validateMeta(meta: StoreMeta): void {
    if (typeof meta.schemaVersion !== 'number' || !Number.isInteger(meta.schemaVersion)) {
      throw new StoreError({ code: 'storage', message: '本地数据目录缺少有效 schemaVersion' })
    }
    if (meta.schemaVersion > SCHEMA_VERSION) {
      throw new StoreError({
        code: 'storage',
        message: `本地数据由更新版本创建（schema ${meta.schemaVersion} > ${SCHEMA_VERSION}），请升级插件或使用备份恢复`,
        details: { schemaVersion: meta.schemaVersion, supported: SCHEMA_VERSION },
      })
    }
    if (meta.schemaVersion < SCHEMA_VERSION && this.options.allowOldSchema !== true) {
      throw new StoreError({
        code: 'storage',
        message: `本地数据 schema ${meta.schemaVersion} 需要迁移到 ${SCHEMA_VERSION}`,
        details: { schemaVersion: meta.schemaVersion, supported: SCHEMA_VERSION },
      })
    }
  }
}

/** Whether an fs error means "does not exist". */
export function isMissing(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null
    && (cause as { code?: unknown }).code === 'ENOENT'
}
