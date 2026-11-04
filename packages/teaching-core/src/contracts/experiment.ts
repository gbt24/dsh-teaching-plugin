/**
 * Experiment environments, runs and their isolation/limitation records.
 *
 * Dependency isolation and execution confinement are separate facts: a managed
 * virtual environment does not by itself sandbox the process. Runs always keep
 * the exact code, environment id, limits and observed output so a teaching
 * explanation can be tied to what actually ran.
 */
import type {
  ActivityId, ConceptId, CourseId, EnvironmentId, RunId, SessionId,
} from './ids.ts'

/** Languages the first version ships with first-class adapters for. */
export type BuiltinRunnerLanguage = 'python' | 'javascript' | 'scheme'

/** How an environment was obtained. */
export type EnvironmentKind =
  /** Pre-existing interpreter on the host (e.g. system python3). */
  | 'system'
  /** A course/experiment-scoped directory created and owned by the plugin. */
  | 'managed'
  /** A Python virtual environment. */
  | 'virtualenv'
  /** No real execution; a documented reduced-scale simulation. */
  | 'simulated'

/** Environment availability. */
export type EnvironmentStatus = 'ready' | 'missing' | 'preparing' | 'failed' | 'needs-approval'

/** How dependencies are isolated from the rest of the machine. */
export interface IsolationFacts {
  /** Where dependencies live: none, an isolated env, or the shared host. */
  readonly dependencies: 'none' | 'isolated' | 'shared'
  /** Absolute path of the isolated env when one exists. */
  readonly path?: string
  readonly note?: string
}

/** What the host can actually enforce when running code. */
export interface ExecutionFacts {
  /** Real process execution vs. an in-process interpreter. */
  readonly mode: 'process' | 'in-process'
  /** Command or interpreter used, for the export instructions. */
  readonly executable?: string
  readonly args?: readonly string[]
  /** Default hard timeout in milliseconds. */
  readonly timeoutMs: number
  /** Whether the run can be cancelled. */
  readonly cancellable: boolean
  /** Network reachability is reported, not assumed blocked. */
  readonly network: 'unknown' | 'blocked' | 'reachable'
  /** Statement about resource confinement, e.g. "宿主进程，无额外内存限制". */
  readonly confinement?: string
}

/** One concrete environment record. */
export interface EnvironmentRecord {
  readonly id: EnvironmentId
  readonly language: string
  /** Dialect for Scheme and other multi-dialect languages, e.g. 'sicp'. */
  readonly dialect?: string
  readonly kind: EnvironmentKind
  readonly status: EnvironmentStatus
  /** Version string read from the actual runtime. */
  readonly version?: string
  readonly isolation: IsolationFacts
  readonly execution: ExecutionFacts
  /** System-level change needed/proposed; requires student decision. */
  readonly systemChange?: {
    readonly required: boolean
    readonly description: string
    readonly approvedAt?: string
    readonly approvedBy?: 'student'
  }
  /** Failure record when preparation failed; includes cleanup status. */
  readonly failure?: {
    readonly message: string
    readonly code: string
    readonly cleanup: 'not-needed' | 'cleaned' | 'partial' | 'failed'
    readonly cleanupNote?: string
  }
  /** Course/concept this environment was prepared for, when scoped. */
  readonly courseId?: CourseId
  readonly conceptIds?: readonly ConceptId[]
  readonly createdAt: string
  readonly updatedAt: string
  /** Teaching fallback when real execution is unavailable. */
  readonly fallback?: {
    readonly description: string
    readonly knownDifferences: readonly string[]
  }
}

/** One execution run. */
export interface ExperimentRun {
  readonly id: RunId
  readonly sessionId?: SessionId
  readonly courseId?: CourseId
  readonly activityId?: ActivityId
  readonly activityRevision?: number
  readonly environmentId: EnvironmentId
  readonly language: string
  readonly dialect?: string
  /** Exact code that ran (student-edited or generated). */
  readonly code: string
  readonly stdin?: string
  readonly startedAt: string
  readonly endedAt?: string
  readonly status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed-out'
  readonly stdout: string
  readonly stderr: string
  readonly exitCode?: number
  readonly durationMs?: number
  /** Objective checks executed against the stdout / exit code. */
  readonly checks?: readonly {
    readonly name: string
    readonly type: string
    readonly status: 'pass' | 'fail' | 'not-run'
    readonly detail?: string
  }[]
  /** Whether the result was checked objectively or remains unverified. */
  readonly verification: 'objective' | 'unverified' | 'exploratory'
  readonly limits: {
    readonly timeoutMs: number
    readonly memoryMb?: number
  }
  /** Reduced-scale / simulated notes, when applicable. */
  readonly resourceNote?: string
}

/** Request to run code through an environment. */
export interface RunRequest {
  readonly sessionId?: SessionId
  readonly courseId?: CourseId
  readonly activityId?: ActivityId
  readonly activityRevision?: number
  readonly language: string
  readonly dialect?: string
  readonly code: string
  readonly stdin?: string
  readonly timeoutMs?: number
  /** Objective checks to apply after the run. */
  readonly checks?: readonly {
    readonly name: string
    readonly type: 'stdout-contains' | 'stdout-equals' | 'exit-code'
    readonly value: string | number
  }[]
}

/** Environment capability snapshot shown in the UI. */
export interface EnvironmentDirectory {
  readonly environments: readonly EnvironmentRecord[]
  /** Languages the plugin has adapters for, whether ready or not. */
  readonly supportedLanguages: readonly {
    readonly language: string
    readonly label: string
    readonly status: EnvironmentStatus
    readonly environmentId?: EnvironmentId
    readonly note?: string
  }[]
  /** Layers that are planned or require extra work (transparency). */
  readonly gaps: readonly string[]
}
