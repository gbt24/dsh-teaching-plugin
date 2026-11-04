/**
 * Portability seam: export, backup, inspect, restore and record control.
 *
 * The report/manifest shapes live in `portability.ts`; this interface is what
 * the Host routes call. Implementations must never embed credentials, must
 * checksum every archived entry, and must report missing original sources
 * instead of pretending a restore is complete.
 */
import type { AppError, Result } from './result.ts'
import type {
  BackupManifest, ExportManifest, RestoreReport,
} from './portability.ts'
import type { CourseId, ExportId, SessionId } from './ids.ts'

/** Outcome of creating one backup archive. */
export interface BackupResult {
  readonly backupId: string
  readonly archivePath: string
  readonly manifest: BackupManifest
  /** Bytes written, for progress reporting. */
  readonly bytes: number
}

/** Outcome of exporting teaching content. */
export interface ExportResult {
  readonly exportId: ExportId
  readonly htmlPath: string
  readonly manifestPath: string
  readonly manifest: ExportManifest
  /** Additional native source files written beside the HTML. */
  readonly nativeFiles: readonly string[]
  /** Non-fatal problems (e.g. an activity could not be rendered offline). */
  readonly warnings: readonly string[]
}

/** Request for one export. */
export interface ExportRequest {
  readonly courseId: CourseId
  /** Sessions to include; defaults to every session of the course. */
  readonly sessionIds?: readonly SessionId[]
  /** Output directory; defaults to `$DSH_HOME/teaching/exports/<exportId>/`. */
  readonly outDir?: string
  /** Only `html` ships in v1. */
  readonly format?: 'html'
  /** Include code/notes yet? Kept explicit so the export stays predictable. */
  readonly includeNotes?: boolean
}

/** Scope of a destructive record operation. */
export interface DeleteRecordsRequest {
  readonly scope: 'session' | 'course' | 'learning' | 'notes' | 'all'
  readonly id?: string
  /** Must be true; destructive operations require explicit confirmation. */
  readonly confirm?: boolean
}

/** Result of a destructive record operation. */
export interface DeleteRecordsResult {
  readonly deleted: boolean
  readonly details: Readonly<Record<string, number>>
}

/** The seam used by Host routes. */
export interface PortabilityService {
  /** Create a backup archive of local data (no credentials). */
  createBackup(outDir?: string, signal?: AbortSignal): Promise<Result<BackupResult>>
  /** Read and validate a backup archive without restoring it. */
  inspectBackup(archivePath: string): Promise<Result<BackupManifest>>
  /**
   * Restore a backup archive. `remapSources` maps old original paths to new
   * ones; missing sources are reported, never silently dropped.
   */
  restoreBackup(archivePath: string, options?: {
    readonly remapSources?: Readonly<Record<string, string>>
    readonly signal?: AbortSignal
  }): Promise<Result<RestoreReport>>
  /** Export one course's teaching sessions as a standalone offline HTML page. */
  exportCourse(request: ExportRequest, signal?: AbortSignal): Promise<Result<ExportResult>>
  /** Export records (attempts/mastery/notes) as JSON. */
  exportRecords(input: { readonly courseId?: CourseId; readonly outDir?: string }): Promise<Result<{ readonly path: string; readonly bytes: number }>>
  /** Delete local records by scope, with explicit confirmation. */
  deleteRecords(request: DeleteRecordsRequest): Promise<Result<DeleteRecordsResult>>
  /** Reset learning data (keeps courses/sources). */
  resetRecords(scope: 'learning' | 'all', confirm: boolean): Promise<Result<{ readonly reset: boolean }>>
  /** List existing backups/exports for the UI. */
  listArtifacts(): Promise<{ readonly backups: readonly BackupManifest[]; readonly exports: readonly ExportManifest[] }>
}

/** Error helper used by implementations. */
export type PortabilityFailure = AppError
