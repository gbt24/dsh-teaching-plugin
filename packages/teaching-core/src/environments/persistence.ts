/**
 * Durable storage for environment records under the plugin data directory.
 *
 * Layout (all inside the Host-provided `dataDir`):
 *
 *   environments/
 *     state.json                 versioned record snapshot (atomic replace)
 *     managed/<language>-<id>/   plugin-owned extended environment directories
 *     tmp/run-<id>/              short-lived run directories
 *
 * A partially written or newer-schema state file is quarantined
 * (`state.corrupt-*.json`) instead of being silently overwritten, so a
 * preparation failure or a downgrade never erases an explanation for previous
 * work. Writes are serialized and land via write-temp-then-rename.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { EnvironmentRecord } from '../contracts/experiment.ts'
import { isSafeId, nowIso } from '../contracts/ids.ts'

/** Schema version of `state.json`. Bump when the record layout changes. */
export const ENVIRONMENT_STATE_SCHEMA_VERSION = 1

interface EnvironmentStateFile {
  readonly schemaVersion: number
  readonly updatedAt: string
  readonly records: readonly EnvironmentRecord[]
}

const VALID_STATUS = new Set<EnvironmentRecord['status']>([
  'ready', 'missing', 'preparing', 'failed', 'needs-approval',
])

const VALID_KINDS = new Set<EnvironmentRecord['kind']>(['system', 'managed', 'virtualenv', 'simulated'])

/** Minimal structural validation for records read from disk. */
function isEnvironmentRecord(value: unknown): value is EnvironmentRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<EnvironmentRecord>
  const execution = record.execution as Partial<EnvironmentRecord['execution']> | undefined
  const isolation = record.isolation as Partial<EnvironmentRecord['isolation']> | undefined
  return typeof record.id === 'string' && isSafeId(record.id)
    && typeof record.language === 'string' && record.language.trim() !== ''
    && typeof record.status === 'string' && VALID_STATUS.has(record.status as EnvironmentRecord['status'])
    && typeof record.kind === 'string' && VALID_KINDS.has(record.kind as EnvironmentRecord['kind'])
    && typeof record.createdAt === 'string' && typeof record.updatedAt === 'string'
    && typeof isolation === 'object' && isolation !== null
    && typeof execution === 'object' && execution !== null
    && typeof execution.timeoutMs === 'number'
}

/** Data-directory layout plus atomic record persistence. */
export class EnvironmentStore {
  private readonly dataDir: string
  private readonly logger: ((event: string, details?: Record<string, unknown>) => void) | undefined
  private writeChain: Promise<void> = Promise.resolve()
  private writeCounter = 0

  constructor(dataDir: string, logger?: (event: string, details?: Record<string, unknown>) => void) {
    this.dataDir = dataDir
    this.logger = logger
  }

  /** Root for environment metadata and managed directories. */
  get environmentsRoot(): string {
    return join(this.dataDir, 'environments')
  }

  /** Versioned record snapshot. */
  get statePath(): string {
    return join(this.environmentsRoot, 'state.json')
  }

  /** Plugin-owned extended environment directories. */
  get managedRoot(): string {
    return join(this.environmentsRoot, 'managed')
  }

  /** Short-lived run directories (cleared by `cleanupStale`). */
  get tmpRoot(): string {
    return join(this.environmentsRoot, 'tmp')
  }

  /** Create the root directories; safe to call repeatedly. */
  async ensureLayout(): Promise<void> {
    await mkdir(this.managedRoot, { recursive: true })
    await mkdir(this.tmpRoot, { recursive: true })
  }

  /** Load persisted records; corrupt/newer files are quarantined, never deleted. */
  async load(): Promise<readonly EnvironmentRecord[]> {
    let raw: string
    try {
      raw = await readFile(this.statePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger?.('environments.state-read-failed', { message: (error as Error).message })
      }
      return []
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      await this.quarantine('corrupt', `JSON 解析失败：${(error as Error).message}`)
      return []
    }
    const file = parsed as Partial<EnvironmentStateFile>
    if (typeof file !== 'object' || file === null || file.schemaVersion !== ENVIRONMENT_STATE_SCHEMA_VERSION) {
      await this.quarantine('unsupported', `schemaVersion=${String(file?.schemaVersion)}`)
      return []
    }
    if (!Array.isArray(file.records)) {
      await this.quarantine('corrupt', 'records 不是数组')
      return []
    }
    const records = file.records.filter(isEnvironmentRecord)
    if (records.length !== file.records.length) {
      this.logger?.('environments.state-records-skipped', { skipped: file.records.length - records.length })
    }
    return records
  }

  /** Persist records atomically; serialized so concurrent saves cannot interleave. */
  save(records: readonly EnvironmentRecord[]): Promise<void> {
    const payload: EnvironmentStateFile = {
      schemaVersion: ENVIRONMENT_STATE_SCHEMA_VERSION,
      updatedAt: nowIso(),
      records,
    }
    const run = async (): Promise<void> => {
      await mkdir(this.environmentsRoot, { recursive: true })
      this.writeCounter += 1
      const tmpPath = join(
        this.environmentsRoot,
        `.state-${process.pid}-${String(this.writeCounter)}.tmp`,
      )
      await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      await rename(tmpPath, this.statePath)
    }
    const next = this.writeChain.then(run, run)
    this.writeChain = next.catch(() => undefined)
    return next
  }

  /** Wait for pending writes (tests and graceful shutdown). */
  async flush(): Promise<void> {
    await this.writeChain
  }

  /** Move an unreadable state file aside so it can be inspected later. */
  private async quarantine(kind: 'corrupt' | 'unsupported', detail: string): Promise<void> {
    if (!existsSync(this.statePath)) return
    const stamp = nowIso().replace(/[:.]/gu, '-')
    const target = join(this.environmentsRoot, `state.${kind}-${stamp}.json`)
    try {
      await rename(this.statePath, target)
      this.logger?.('environments.state-quarantined', { kind, target, detail })
    } catch (error) {
      this.logger?.('environments.state-quarantine-failed', { message: (error as Error).message, detail })
    }
  }
}
