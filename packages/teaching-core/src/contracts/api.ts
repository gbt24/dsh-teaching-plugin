/**
 * Client ↔ Host API contract.
 *
 * Every operation is an exact Fetch route under `/api/teaching/<operation>`:
 * a static path per operation (no path-parameter matching), authenticated by
 * the Harness connection layer, with JSON request/response bodies. Streaming
 * operations return Server-Sent Events. The client never reads the local store
 * directly; the Host validates every input and owns all persisted state.
 */
import type {
  Course, CourseDraftView, CourseRevision,
} from './course.ts'
import type {
  ChatMessage, EvidenceReference, LanguagePreference, SessionSummary, StudentProfile,
  TeachingSession,
} from './session.ts'
import type { ActivityPayload, ActivityState, LessonActivity } from './activity.ts'
import type {
  AttemptOutcome, AttemptValidation, CourseLearningRecord, LearningAttempt, MasteryRecord,
  ReviewItem,
} from './learning.ts'
import type { AppError, Result } from './result.ts'
import type { SourceAnchor, SourceDocument, SourceIssue, SourceRevision } from './source.ts'
import type { TaskHandle, TaskSnapshot } from './task.ts'
import type { EnvironmentDirectory, EnvironmentRecord, ExperimentRun, RunRequest } from './experiment.ts'
import type { BackupManifest, ExportedSession, RestoreReport } from './portability.ts'
import type { ActivityId, ConceptId, CourseId, SessionId } from './ids.ts'

/** Model identity and capability facts the client may render. */
export interface ModelCapabilities {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
  /** Whether the configured model accepts image input; never assumed. */
  readonly imageInput: 'yes' | 'no' | 'unknown'
  readonly contextWindow?: number
  readonly note?: string
}

/** Everything the client needs before rendering the first page. */
export interface BootstrapInfo {
  readonly pluginVersion: string
  readonly builtFor: string
  readonly host: {
    readonly profile?: string
    readonly platform: string
    readonly arch: string
    readonly nodeVersion: string
  }
  readonly model: ModelCapabilities
  /** Absolute local data directory (display only; no client file access). */
  readonly dataDir: string
  readonly profile: StudentProfile
  readonly language: LanguagePreference
  readonly features: {
    readonly imageOcr: boolean
    readonly webSearch: boolean
    readonly experiments: boolean
    readonly offlineExport: boolean
  }
  /** Non-fatal capability gaps shown to the student. */
  readonly warnings: readonly string[]
}

/** One row in the course list. */
export interface CourseSummary {
  readonly course: Course
  readonly sourceCount: number
  readonly conceptCount: number
  readonly readySourceCount: number
  readonly lastSessionAt?: string
}

/** Course detail with both draft and active structures. */
export interface CourseDetail {
  readonly course: Course
  readonly revisions: readonly CourseRevision[]
  readonly activeRevision?: CourseRevision
  readonly draftRevision?: CourseRevision
  readonly draft?: CourseDraftView
  readonly sources: readonly SourceDocument[]
  readonly learning: CourseLearningRecord
}

/** One page of source units for the reader view. */
export interface SourceView {
  readonly document: SourceDocument
  readonly revision?: SourceRevision
  readonly issues: readonly SourceIssue[]
  readonly totalUnits: number
}

/** Result of refreshing one document. */
export interface SourceRefreshResult {
  readonly task: TaskHandle
}

/** Session data for restoring the teaching workspace. */
export interface SessionView {
  readonly session: TeachingSession
  readonly messages: readonly ChatMessage[]
  readonly activities: readonly LessonActivity[]
  readonly states: readonly ActivityState[]
  readonly course: Course
  readonly courseRevision: CourseRevision
  readonly mastery: readonly MasteryRecord[]
  readonly review: readonly ReviewItem[]
}

/** Events streamed by `/chat`. */
export type ChatStreamEvent =
  /** The turn was accepted; the student message id is already persisted. */
  | { readonly type: 'start'; readonly studentMessage: ChatMessage }
  /** Progress narration for slower steps (retrieval, model call). */
  | { readonly type: 'progress'; readonly label: string }
  /** Incremental teacher text. */
  | { readonly type: 'delta'; readonly text: string }
  /** A persistent teaching-area activity created/updated by this turn. */
  | { readonly type: 'activity'; readonly activity: LessonActivity }
  /** Evidence attached to the reply so far. */
  | { readonly type: 'evidence'; readonly refs: readonly EvidenceReference[] }
  /** Updated session position/stage. */
  | { readonly type: 'position'; readonly stage: string; readonly conceptId?: ConceptId }
  /** Terminal success event. */
  | { readonly type: 'done'; readonly message: ChatMessage }
  /** Terminal failure event. */
  | { readonly type: 'error'; readonly error: AppError }

/** Request bodies, one entry per operation. */
export interface ApiRequests {
  'bootstrap': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
  'courses.list': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
  'courses.create': {
    readonly method: 'POST'
    readonly body: { readonly title: string; readonly description?: string; readonly goals?: readonly string[]; readonly language?: LanguagePreference }
  }
  'courses.get': { readonly method: 'GET'; readonly query: { readonly courseId: CourseId }; readonly body?: never }
  'courses.update': {
    readonly method: 'POST'
    readonly body: { readonly courseId: CourseId; readonly title?: string; readonly description?: string; readonly status?: Course['status'] }
  }
  'courses.delete': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      /**
       * Also remove this course's imported source *records* (parsed copies and
       * anchors). The student's original files are never touched. Sources
       * shared with another course are only detached from this course.
       */
      readonly deleteSources?: boolean
    }
  }
  'sources.import': {
    readonly method: 'POST'
    readonly body: { readonly courseId?: CourseId; readonly paths: readonly string[] }
  }
  'sources.refresh': { readonly method: 'POST'; readonly body: { readonly documentId: string } }
  'sources.get': {
    readonly method: 'GET'
    readonly query: { readonly documentId: string; readonly offset?: number; readonly limit?: number }
    readonly body?: never
  }
  'courseDraft.generate': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      readonly instruction?: string
      /** `auto` (default) prefers a detected knowledge-base structure. */
      readonly strategy?: 'auto' | 'kb-structure' | 'llm-wiki'
    }
  }
  'courseDraft.get': { readonly method: 'GET'; readonly query: { readonly courseId: CourseId }; readonly body?: never }
  'courseDraft.confirm': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      readonly revisionId: string
      readonly edits?: {
        readonly goals?: readonly string[]
        readonly sequence?: readonly ConceptId[]
        readonly conceptTitles?: Readonly<Record<string, string>>
        readonly removeConceptIds?: readonly ConceptId[]
        /** Rename chapters (keyed by chapter id) before confirming. */
        readonly chapterTitles?: Readonly<Record<string, string>>
        /** Update chapter one-line summaries (keyed by chapter id). */
        readonly chapterSummaries?: Readonly<Record<string, string>>
        /** Add student-authored concepts; they have no source anchors yet. */
        readonly addConcepts?: readonly {
          readonly title: string
          readonly summary?: string
          /** Existing chapter id to place the concept in; omitted = ungrouped. */
          readonly chapterId?: string
        }[]
      }
    }
  }
  'courseGoals.update': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      /** Student-edited learning goals, replacing the previous list. */
      readonly goals: readonly string[]
      /** Optional self-described background used for pacing. */
      readonly background?: string
    }
  }
  'sessions.list': { readonly method: 'GET'; readonly query: { readonly courseId?: CourseId }; readonly body?: never }
  'sessions.create': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      readonly title?: string
      /**
       * `course` (default) needs a confirmed structure. `adhoc` lets the student
       * start asking right away: the Host confirms a minimal revision built
       * from the existing draft (or the course title) before creating the
       * session, so no unreviewed draft is silently treated as a full course.
       */
      readonly mode?: 'course' | 'adhoc'
    }
  }
  'sessions.get': { readonly method: 'GET'; readonly query: { readonly sessionId: SessionId }; readonly body?: never }
  'sessions.position': {
    readonly method: 'POST'
    readonly body: { readonly sessionId: SessionId; readonly stage?: string; readonly conceptId?: ConceptId; readonly activityId?: ActivityId | null; readonly note?: string }
  }
  'chat.send': { readonly method: 'POST'; readonly body: { readonly sessionId: SessionId; readonly text: string } }
  'chat.cancel': { readonly method: 'POST'; readonly body: { readonly sessionId: SessionId } }
  'activity.get': { readonly method: 'GET'; readonly query: { readonly activityId: ActivityId }; readonly body?: never }
  'activity.patch': {
    readonly method: 'POST'
    readonly body: {
      readonly activityId: ActivityId
      readonly expectedRevision: number
      readonly payload: ActivityPayload
      readonly note?: string
    }
  }
  'activity.state': {
    readonly method: 'POST'
    readonly body: {
      readonly activityId: ActivityId
      readonly activityRevision: number
      readonly params?: Readonly<Record<string, number>>
      readonly code?: string
      readonly revealedStepIds?: readonly string[]
      readonly notes?: string
    }
  }
  'activity.run': {
    readonly method: 'POST'
    readonly body: {
      readonly activityId: ActivityId
      /** Optional client-generated run id so the run can be cancelled in flight. */
      readonly clientRunId?: string
      readonly activityRevision?: number
      readonly code?: string
      readonly params?: Readonly<Record<string, number>>
      readonly stdin?: string
    }
  }
  /**
   * Delete one activity record chosen by the student.
   *
   * Removes the activity, its student-editable state and its run records. The
   * learning attempts/mastery evidence and the original course sources are not
   * touched. If the activity was the session's current one, the session
   * position is cleared.
   */
  'activity.delete': {
    readonly method: 'POST'
    readonly body: { readonly activityId: ActivityId; readonly expectedRevision?: number }
  }
  'attempts.submit': {
    readonly method: 'POST'
    readonly body: {
      readonly sessionId: SessionId
      readonly activityId?: ActivityId
      readonly activityRevision?: number
      readonly prompt: string
      readonly answerText: string
      readonly helpLevel: 0 | 1 | 2 | 3 | 'full-answer'
      readonly hintsSeen?: readonly string[]
      readonly answerRevealed: boolean
      readonly selectedOptionIds?: readonly string[]
      readonly selfReport?: 'understood' | 'partly' | 'confused'
      readonly runId?: string
    }
  }
  'attempts.list': { readonly method: 'GET'; readonly query: { readonly sessionId?: SessionId; readonly courseId?: CourseId }; readonly body?: never }
  'mastery.list': { readonly method: 'GET'; readonly query: { readonly courseId: CourseId }; readonly body?: never }
  'mastery.dispute': {
    readonly method: 'POST'
    readonly body: { readonly courseId: CourseId; readonly conceptId: ConceptId; readonly reason: string }
  }
  'mastery.recheck': { readonly method: 'POST'; readonly body: { readonly courseId: CourseId; readonly conceptId: ConceptId } }
  'review.list': { readonly method: 'GET'; readonly query: { readonly courseId: CourseId }; readonly body?: never }
  'profile.get': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
  'profile.set': { readonly method: 'POST'; readonly body: { readonly patch: Partial<StudentProfile> } }
  'environments.list': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
  'environments.prepare': {
    readonly method: 'POST'
    readonly body: { readonly language: string; readonly dialect?: string; readonly courseId?: CourseId; readonly approveSystemChange?: boolean }
  }
  'experiments.run': {
    readonly method: 'POST'
    /**
     * `clientRunId` lets the client address the in-flight run with
     * `experiments.cancel` before the synchronous response settles. The Host
     * uses it as the run identity when it is a safe id; otherwise it generates
     * one.
     */
    readonly body: RunRequest & { readonly clientRunId?: string }
  }
  'experiments.cancel': { readonly method: 'POST'; readonly body: { readonly runId: string } }
  /**
   * Latest run per activity for one session (read-only).
   *
   * The Host persists every run under `runs/`, so the client can restore real
   * output after a page refresh instead of showing "尚未运行".
   */
  'runs.latest': { readonly method: 'GET'; readonly query: { readonly sessionId: SessionId }; readonly body?: never }
  'tasks.get': { readonly method: 'GET'; readonly query: { readonly taskId: string }; readonly body?: never }
  'tasks.cancel': { readonly method: 'POST'; readonly body: { readonly taskId: string } }
  'tasks.list': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
  'portability.export': {
    readonly method: 'POST'
    readonly body: {
      readonly courseId: CourseId
      readonly sessionIds?: readonly SessionId[]
      readonly outDir?: string
      readonly format?: 'html'
      /** Include student notes in the exported page (default false). */
      readonly includeNotes?: boolean
    }
  }
  'portability.backup': { readonly method: 'POST'; readonly body: { readonly outDir?: string } }
  'portability.inspect': { readonly method: 'POST'; readonly body: { readonly archivePath: string } }
  'portability.restore': { readonly method: 'POST'; readonly body: { readonly archivePath: string; readonly remapSources?: Readonly<Record<string, string>> } }
  'records.export': { readonly method: 'POST'; readonly body: { readonly courseId?: CourseId; readonly outDir?: string; readonly format?: 'json' } }
  'records.delete': {
    readonly method: 'POST'
    readonly body: {
      readonly scope: 'session' | 'course' | 'learning' | 'notes' | 'all'
      readonly id?: string
      readonly confirm?: boolean
    }
  }
  'records.reset': { readonly method: 'POST'; readonly body: { readonly scope: 'learning' | 'all'; readonly confirm: boolean } }
  'capabilities.get': { readonly method: 'GET'; readonly query?: Record<string, never>; readonly body?: never }
}

/** Response payloads, one entry per operation. */
export interface ApiResponses {
  'bootstrap': BootstrapInfo
  'courses.list': { readonly courses: readonly CourseSummary[] }
  'courses.create': { readonly course: Course; readonly revision: CourseRevision }
  'courses.get': CourseDetail
  'courses.update': { readonly course: Course }
  'courses.delete': {
    readonly deleted: boolean
    readonly details?: {
      readonly sessions: number
      readonly activities: number
      readonly sourcesDetached: number
      readonly sourcesDeleted: number
    }
  }
  'sources.import': { readonly task: TaskHandle }
  'sources.refresh': { readonly task: TaskHandle }
  'sources.get': SourceView
  'courseDraft.generate': { readonly task: TaskHandle }
  'courseDraft.get': { readonly draft?: CourseDraftView }
  'courseDraft.confirm': { readonly course: Course; readonly revision: CourseRevision }
  'courseGoals.update': { readonly course: Course; readonly revision: CourseRevision }
  'sessions.list': { readonly sessions: readonly SessionSummary[] }
  'sessions.create': { readonly session: TeachingSession }
  'sessions.get': SessionView
  'sessions.position': { readonly session: TeachingSession }
  'chat.send': never
  'chat.cancel': { readonly cancelled: boolean }
  'activity.get': { readonly activity: LessonActivity; readonly state?: ActivityState }
  'activity.patch': { readonly activity: LessonActivity }
  'activity.state': { readonly state: ActivityState }
  'activity.run': { readonly run: ExperimentRun; readonly validation?: AttemptValidation }
  'activity.delete': {
    readonly activityId: ActivityId
    /** Number of run records removed together with the activity. */
    readonly removedRuns: number
    /** True when the deleted activity was the session's current activity. */
    readonly positionCleared: boolean
  }
  'attempts.submit': AttemptOutcome
  'attempts.list': { readonly attempts: readonly LearningAttempt[] }
  'mastery.list': { readonly mastery: readonly MasteryRecord[] }
  'mastery.dispute': { readonly mastery: MasteryRecord }
  'mastery.recheck': { readonly mastery: MasteryRecord }
  'review.list': { readonly review: readonly ReviewItem[] }
  'profile.get': { readonly profile: StudentProfile }
  'profile.set': { readonly profile: StudentProfile }
  'environments.list': EnvironmentDirectory
  'environments.prepare': { readonly task: TaskHandle; readonly environment?: EnvironmentRecord }
  'experiments.run': { readonly run: ExperimentRun }
  'experiments.cancel': { readonly run: ExperimentRun }
  /** One entry per activity, newest run first (at most one per activity). */
  'runs.latest': { readonly runs: readonly ExperimentRun[] }
  'tasks.get': { readonly task: TaskSnapshot }
  'tasks.cancel': { readonly snapshot: TaskSnapshot }
  'tasks.list': { readonly tasks: readonly TaskSnapshot[] }
  'portability.export': { readonly task: TaskHandle }
  'portability.backup': { readonly task: TaskHandle }
  'portability.inspect': { readonly manifest: BackupManifest }
  'portability.restore': { readonly report: RestoreReport }
  'records.export': { readonly task: TaskHandle }
  'records.delete': { readonly deleted: boolean; readonly details?: Readonly<Record<string, number>> }
  'records.reset': { readonly reset: boolean }
  'capabilities.get': { readonly model: ModelCapabilities; readonly environments: EnvironmentDirectory }
}

/** Full route table used by the client request helper and the Host registrations. */
export const API_PREFIX = '/api/teaching'

/** Absolute exact-route path for one operation. */
export function apiPath(operation: keyof ApiRequests): string {
  return `${API_PREFIX}/${operation}`
}

/** Operations that stream SSE instead of returning JSON. */
export const STREAMING_OPERATIONS = ['chat.send'] as const

/** JSON error envelope returned for thrown host failures. */
export interface ApiErrorBody {
  readonly ok: false
  readonly error: AppError
}

/** JSON success envelope. */
export type ApiSuccessBody<T> = Result<T>

/** Exported session shape reused by the portability contract. */
export type { ExportedSession }
