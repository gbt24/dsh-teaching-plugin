/**
 * Export, backup, migration and restore contracts.
 *
 * The standalone HTML export and the backup archive are different products:
 * the export is for a human to read/interact offline, while the backup is for
 * restoring local state (including source path references and schema version).
 * Neither one embeds Harness credentials.
 */
import type { ActivityId, BackupId, CourseId, ExportId, SessionId } from './ids.ts'
import type { ActivityPayload } from './activity.ts'
import type { EvidenceReference } from './session.ts'
import type { SourceAnchor } from './source.ts'

/** Format version of the export package. */
export const EXPORT_FORMAT_VERSION = 1

/** Format version of the backup archive. */
export const BACKUP_FORMAT_VERSION = 1

/** One exported teaching session, as embedded in a standalone page. */
export interface ExportedSession {
  readonly sessionId: SessionId
  readonly courseTitle: string
  readonly title: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly messages: readonly {
    readonly role: 'student' | 'teacher' | 'system'
    readonly text: string
    readonly markdown?: boolean
    readonly createdAt: string
    readonly evidenceRefs?: readonly EvidenceReference[]
    readonly activityIds?: readonly ActivityId[]
  }[]
  readonly activities: readonly {
    readonly id: ActivityId
    readonly title: string
    readonly goal: string
    readonly kind: string
    readonly payload: ActivityPayload
    readonly state?: {
      readonly params?: Readonly<Record<string, number>>
      readonly code?: string
      readonly revealedStepIds?: readonly string[]
    }
    readonly sourceAnchors?: readonly SourceAnchor[]
  }[]
  /** Native experiment obligations that a browser cannot run. */
  readonly nativeExperiments?: readonly {
    readonly title: string
    readonly language: string
    readonly dialect?: string
    readonly code: string
    readonly environmentNote: string
    readonly sourceFile: string
  }[]
}

/** Manifest stored beside every exported HTML page. */
export interface ExportManifest {
  readonly id: ExportId
  readonly formatVersion: number
  readonly createdAt: string
  readonly pluginVersion: string
  readonly courses: readonly { readonly courseId: CourseId; readonly title: string; readonly sessionIds: readonly SessionId[] }[]
  readonly files: readonly { readonly path: string; readonly bytes: number; readonly sha256: string }[]
  /** Whether the page needs no network and no Harness: always true for HTML export. */
  readonly offlineCapable: boolean
  /** Separately exported native experiment sources and instructions. */
  readonly nativeSources: readonly {
    readonly language: string
    readonly path: string
    readonly runInstructions: string
  }[]
  /** Known limitations the student should see. */
  readonly limitations: readonly string[]
}

/** One backup record entry. */
export interface BackupEntry {
  readonly path: string
  readonly bytes: number
  readonly sha256: string
  /** Logical category, e.g. 'course', 'source-meta', 'learning', 'settings'. */
  readonly category: string
}

/** Manifest inside a backup archive. */
export interface BackupManifest {
  readonly id: BackupId
  readonly formatVersion: number
  readonly createdAt: string
  readonly pluginVersion: string
  readonly appVersion: string
  readonly schemaVersion: number
  readonly entries: readonly BackupEntry[]
  /** Local source file paths referenced by the data (may be missing on restore). */
  readonly sourcePaths: readonly { readonly sourceId: string; readonly path: string; readonly exists: boolean }[]
  /** Credentials are never included. */
  readonly excludesCredentials: true
  /** Total uncompressed bytes for progress/MB reporting. */
  readonly totalBytes: number
}

/** Result of validating/restoring a backup. */
export interface RestoreReport {
  readonly backupId: BackupId
  readonly restored: readonly string[]
  readonly skipped: readonly string[]
  /** Source files referenced by the backup that no longer exist at the recorded path. */
  readonly missingSources: readonly { readonly sourceId: string; readonly path: string }[]
  /** Whether a repair action (re-locate source paths) is offered. */
  readonly needsPathRemap: boolean
  readonly schemaMigratedFrom?: number
  readonly warnings: readonly string[]
}
