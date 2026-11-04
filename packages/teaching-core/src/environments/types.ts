/**
 * Public types of the T06 environment manager.
 *
 * The manager sits on top of the frozen `RunnerRegistry` (first-version Python /
 * JavaScript / Scheme). It consumes declared course/teaching needs, classifies
 * them against what is really present on the host, prepares additional
 * lightweight environments inside the plugin data directory, and records every
 * fact needed to explain what was actually installed, run, cancelled or left
 * alone.
 *
 * Contract reuse: environment/run records are the frozen shapes from
 * `contracts/experiment.ts`; this module only adds the need/approval/resource
 * vocabulary that the contract did not yet define. Nothing here guesses course
 * content or silently installs anything.
 */
import type {
  EnvironmentDirectory, EnvironmentRecord, ExperimentRun, RunRequest,
} from '../contracts/experiment.ts'
import type {
  ActivityId, ConceptId, CourseId, EnvironmentId, RunId,
} from '../contracts/ids.ts'
import type { Result } from '../contracts/result.ts'
import type { OutputChunk, RunnerRegistry } from '../experiments/index.ts'

/** Where a declared environment requirement came from. */
export type EnvironmentNeedSource = 'course' | 'material' | 'activity' | 'student'

/** Classification of one declared environment need. */
export type EnvironmentNeedStatus =
  /** A real runtime is present (and, when dependencies were declared, satisfiable). */
  | 'available'
  /** The plugin can prepare it without a system-level change (managed dir, venv). */
  | 'missing'
  /** Requires a student decision: system package install or network dependency install. */
  | 'needs-approval'
  /** No adapter and no documented way to obtain it; the plugin does not guess. */
  | 'unsupported'

/** What the caller can do next for one need. */
export type EnvironmentNeedAction = 'use-existing' | 'prepare' | 'request-approval' | 'none'

/** A change outside the plugin data directory that needs the student's decision. */
export type ApprovalKind = 'system-change' | 'network-install' | 'plugin-repair'

/**
 * Explicit approval request. `executableByPlugin` is `false` in v1 for system
 * changes: the plugin never runs system package managers itself. Only an
 * injected executor (Host integration / tests) may act after approval.
 */
export interface EnvironmentApproval {
  readonly kind: ApprovalKind
  readonly description: string
  readonly impact: readonly string[]
  readonly alternatives: readonly string[]
  /** Suggested command for the student, never executed automatically. */
  readonly commandPreview?: string
  readonly requiresNetwork: boolean
  readonly executableByPlugin: false
  /** Honest note about verification level of the command / plan. */
  readonly note?: string
}

/** One environment requirement declared by a course, material or activity. */
export interface DeclaredEnvironmentNeed {
  readonly language: string
  readonly dialect?: string
  /** Why this environment is needed; free text supplied by the declaration. */
  readonly reason: string
  readonly source: EnvironmentNeedSource
  readonly courseId?: CourseId
  readonly conceptIds?: readonly ConceptId[]
  readonly activityId?: ActivityId
  /**
   * Third-party dependencies the intended experiment uses. Their installation
   * is a network action and therefore needs explicit confirmation.
   */
  readonly dependencies?: readonly string[]
  /** Resource envelope of the intended experiment (used for AC12 fallbacks). */
  readonly resources?: DeclaredResourceEnvelope
}

/** Classification result for one declared requirement. */
export interface EnvironmentNeed {
  /** Position in the declaration list, so callers can correlate. */
  readonly index: number
  readonly language: string
  readonly dialect?: string
  readonly reason: string
  readonly source: EnvironmentNeedSource
  readonly status: EnvironmentNeedStatus
  readonly nextAction: EnvironmentNeedAction
  /** Observed host fact behind the classification (never a guess). */
  readonly detail: string
  readonly environmentId?: EnvironmentId
  readonly version?: string
  readonly kind?: EnvironmentRecord['kind']
  readonly approval?: EnvironmentApproval
  /** Attached when the declaration exceeds the host's real resources. */
  readonly resources?: ResourceAssessment
  readonly courseId?: CourseId
  readonly conceptIds?: readonly ConceptId[]
  readonly activityId?: ActivityId
}

/** Request to prepare one environment. */
export interface PrepareEnvironmentRequest {
  readonly language: string
  readonly dialect?: string
  readonly courseId?: CourseId
  readonly conceptIds?: readonly ConceptId[]
  readonly dependencies?: readonly string[]
  /** Python only: explicit interpreter mode. Venv mode prepares an isolated env. */
  readonly mode?: 'system' | 'venv'
  /** Requested hard timeout recorded in the environment's execution facts. */
  readonly timeoutMs?: number
}

/** Progress phases emitted during asynchronous preparation. */
export interface PreparationProgress {
  readonly phase: 'probe' | 'approval' | 'prepare' | 'smoke' | 'done'
  readonly record: EnvironmentRecord
  readonly detail?: string
}

/** Options for {@link EnvironmentManager.prepare}. */
export interface PrepareEnvironmentOptions {
  /** Cancels preparation; unfinished managed directories are cleaned up. */
  readonly signal?: AbortSignal
  /** Student confirmed the change described by `approval`. */
  readonly approveSystemChange?: boolean
  readonly onProgress?: (event: PreparationProgress) => void
}

/** Options for one extended-environment run. */
export interface EnvironmentRunOptions {
  readonly signal?: AbortSignal
  readonly onOutput?: (chunk: OutputChunk) => void
  readonly timeoutMs?: number
}

/** Outcome of cleaning a managed environment. */
export interface EnvironmentCleanupResult {
  readonly environmentId: EnvironmentId
  readonly status: 'not-found' | 'not-needed' | 'cleaned' | 'partial' | 'failed'
  readonly removedPaths: readonly string[]
  readonly failedPaths: readonly string[]
  readonly message: string
  readonly record?: EnvironmentRecord
}

/** Report of stale/leftover preparation cleanup. */
export interface StaleEnvironmentCleanupReport {
  readonly removed: readonly string[]
  readonly failed: readonly string[]
  /** Destroyed `preparing` records from a previous host process. */
  readonly recordsUpdated: readonly EnvironmentId[]
}

/** Real host facts used for resource assessment (measured, not assumed). */
export interface HostFacts {
  readonly platform: string
  readonly arch: string
  readonly cpuCount: number
  readonly totalMemoryMb: number
  readonly freeMemoryMb: number
  /** GPU acceleration is reported as unknown unless the host actually measured it. */
  readonly gpuAvailable: 'yes' | 'no' | 'unknown'
  readonly note?: string
}

/** Resource envelope requested by the intended (full-scale) experiment. */
export interface DeclaredResourceEnvelope {
  readonly memoryMb?: number
  readonly runtimeMs?: number
  readonly datasetMb?: number
  readonly modelParameters?: number
  /** Requires GPU acceleration. */
  readonly gpu?: boolean
  readonly description?: string
}

/** What kind of full-scale experiment is being reduced. */
export type ResourceRequestKind = 'training' | 'simulation' | 'numerical' | 'other'

/** Input of resource assessment. */
export interface ResourceRequest {
  /** Goal of the experiment in the course declaration (free text, not guessed). */
  readonly goal: string
  readonly kind: ResourceRequestKind
  readonly language?: string
  readonly declared?: DeclaredResourceEnvelope
}

/** A runnable reduced-scale experiment that keeps the teaching principle. */
export interface ReducedExperiment {
  readonly title: string
  readonly language: string
  readonly code: string
  /** Marker line used to prove the reduced experiment really ran. */
  readonly expectedStdout?: string
  readonly checks?: NonNullable<RunRequest['checks']>
  readonly timeoutMs?: number
  /** Scale facts, e.g. "20+20 样本、1 个参数、闭式解". */
  readonly scaleNote: string
}

/** Reduced-scale / simulated fallback for an experiment the host cannot carry. */
export interface ResourceFallback {
  /** Teaching-citable explanation of the limitation and the substitute. */
  readonly description: string
  /** Concrete differences from the full-scale experiment. */
  readonly knownDifferences: readonly string[]
  /** Requirements of the full experiment that exceed this host. */
  readonly fullExperimentRequirements: readonly string[]
  /** Runnable reduced experiment when one can keep the principle. */
  readonly reducedExperiment?: ReducedExperiment
  /** Explicit caveats: what the substitute does not prove. */
  readonly caveats: readonly string[]
}

/** Result of assessing one experiment's resource envelope against the host. */
export interface ResourceAssessment {
  /** `none` means the host cannot run it and no runnable substitute was generated. */
  readonly status: 'fits' | 'reduced' | 'simulated' | 'none'
  readonly goal: string
  readonly reasons: readonly string[]
  readonly declared?: DeclaredResourceEnvelope
  readonly host: HostFacts
  readonly fallback?: ResourceFallback
}

/** One lightweight language adapter added by T06 (beyond the first three). */
export interface ExtendedLanguageSpec {
  readonly language: string
  readonly label: string
  /** Candidate executables; the real probe runs each through PATH until one works. */
  readonly executables: readonly string[]
  /** Arguments that print a version string, e.g. `--version`. */
  readonly versionArgs: readonly string[]
  /** Parse the version out of combined stdout+stderr; undefined means "not usable". */
  readonly parseVersion: (output: string) => string | undefined
  readonly scriptExtension: string
  /** Arguments before the script file path, e.g. `['run', '--quiet']`. */
  readonly runArgs: readonly string[]
  /** Program used to prove the runtime really executes code. */
  readonly smokeProgram: string
  readonly expectedSmokeStdout: string
  /** Directories created inside the managed environment root. */
  readonly prepareDirs?: readonly string[]
  /** Child environment that isolates caches/dependencies inside the managed dir. */
  readonly isolationEnv?: (dir: string) => Readonly<Record<string, string>>
  readonly isolationNote?: string
  /** Network reachability default for this runtime; reported, never assumed blocked. */
  readonly network?: 'unknown' | 'blocked' | 'reachable'
  readonly confinementNote?: string
}

/** A language the plugin knows but cannot run yet; installing it is a system change. */
export interface SystemInstallPlanSpec {
  readonly language: string
  readonly label: string
  /** Executables that would signal the toolchain is already installed. */
  readonly executables: readonly string[]
  readonly approval: EnvironmentApproval
}

/** Result reported by an injected system-change executor. */
export interface SystemChangeExecutionResult {
  readonly ok: boolean
  readonly message: string
}

/** Executor for a student-approved system change; absent means "never execute". */
export type SystemChangeExecutor = (
  approval: EnvironmentApproval,
  context: { readonly language: string; readonly timeoutMs: number; readonly signal?: AbortSignal },
) => Promise<SystemChangeExecutionResult>

/** Options for {@link createEnvironmentManager}. */
export interface EnvironmentManagerOptions {
  /** Plugin-owned writable data directory (`$DSH_HOME/teaching`). */
  readonly dataDir: string
  /** The frozen runner registry, consumed read-only for the three builtin languages. */
  readonly runners: RunnerRegistry
  readonly logger?: (event: string, details?: Record<string, unknown>) => void
  /** Extra adapters merged over the built-in Ruby/Lua/Deno catalog (tests, future). */
  readonly adapters?: readonly ExtendedLanguageSpec[]
  /** Extra known-but-missing toolchains and their approval plans. */
  readonly installPlans?: readonly SystemInstallPlanSpec[]
  /**
   * Executes a system change after student approval. Absent in production by
   * default: the manager then only reports the approval branch and never
   * touches the system. Tests inject a fake executor to prove the gate.
   */
  readonly systemChangeExecutor?: SystemChangeExecutor
  /** Host facts override (tests); defaults to real `node:os` measurements. */
  readonly hostFacts?: Partial<HostFacts>
  /** Explicit executable override per language, e.g. `{ ruby: '/opt/homebrew/bin/ruby' }`. */
  readonly executables?: Readonly<Record<string, string>>
  readonly defaultTimeoutMs?: number
  readonly maxOutputBytes?: number
}

/**
 * The environment manager the Host owns. Every method is concurrency-safe; the
 * persistence file is written atomically and never outside `dataDir`.
 */
export interface EnvironmentManager {
  /**
   * Classify injected requirements. The manager never infers needs from course
   * text; callers pass what a course/material/activity actually declared.
   */
  detectNeeds(declared: readonly DeclaredEnvironmentNeed[]): Promise<Result<readonly EnvironmentNeed[]>>
  /** Probe, prepare (isolated when needed), smoke-verify, and persist one environment. */
  prepare(request: PrepareEnvironmentRequest, options?: PrepareEnvironmentOptions): Promise<Result<EnvironmentRecord>>
  /** Run the stored smoke program of one prepared environment with objective checks. */
  smoke(environmentId: EnvironmentId, options?: EnvironmentRunOptions): Promise<Result<ExperimentRun>>
  /** Run code: builtin languages delegate to the registry, extended ones use the managed adapter. */
  run(request: RunRequest, options?: EnvironmentRunOptions): Promise<ExperimentRun>
  /** Cancel an active run (builtin or extended). */
  cancelRun(runId: RunId): Promise<ExperimentRun | undefined>
  getRun(runId: RunId): ExperimentRun | undefined
  activeRuns(): readonly ExperimentRun[]
  get(environmentId: EnvironmentId): EnvironmentRecord | undefined
  /** Ready persisted environment for a language/dialect, if any. */
  getEnvironment(language: string, dialect?: string): EnvironmentRecord | undefined
  /** All persisted environment records (including failed/needs-approval ones). */
  listRecords(): readonly EnvironmentRecord[]
  /** Persisted configuration + fresh builtin detection, shaped for the client. */
  directory(): Promise<EnvironmentDirectory>
  /** Remove one managed environment's files; only plugin-owned directories are touched. */
  cleanup(environmentId: EnvironmentId): Promise<EnvironmentCleanupResult>
  /** Remove orphan managed dirs and stale `preparing` records from an interrupted host. */
  cleanupStale(): Promise<StaleEnvironmentCleanupReport>
  /** Abort an in-flight preparation; returns false when the id is not preparing. */
  cancelPreparation(environmentId: EnvironmentId): boolean
  /** Pure assessment of a declared resource envelope against measured host facts. */
  assessResources(request: ResourceRequest): ResourceAssessment
  hostFacts(): HostFacts
  /** Aborts in-flight work. Prepared environments and their persisted records are kept. */
  dispose(): Promise<void>
}
