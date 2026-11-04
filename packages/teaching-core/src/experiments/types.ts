/**
 * Public types of the experiments module.
 *
 * The module is pure Node: it detects interpreters, isolates course-scoped
 * environments under the plugin data directory, executes code in real child
 * processes, and returns {@link ExperimentRun} records that the Host persists
 * and the teaching client renders. It never touches the local store and never
 * assumes network access.
 */
import type {
  EnvironmentDirectory, EnvironmentRecord, ExperimentRun, RunRequest,
} from '../contracts/experiment.ts'
import type { EnvironmentId, RunId } from '../contracts/ids.ts'
import type { AttemptValidation } from '../contracts/learning.ts'

/** One streamed chunk of child-process output. */
export interface OutputChunk {
  readonly stream: 'stdout' | 'stderr'
  readonly text: string
}

/** Limits applied to one execution. */
export interface RunnerLimits {
  /** Hard wall-clock timeout for one run. Defaults to 10s. */
  readonly timeoutMs: number
  /** Maximum bytes kept for stdout and stderr respectively. Defaults to 256 KiB. */
  readonly maxOutputBytes: number
}

/** Options for {@link RunnerRegistry.run}. */
export interface RunnerRunOptions {
  /**
   * Pre-assigned run id. The Host bridge generates and records the id before
   * awaiting the run so `/experiments.cancel` can address an in-flight run;
   * when absent the registry generates one.
   */
  readonly runId?: RunId
  /** Cancels the run; the child process tree is killed and the run records `cancelled`. */
  readonly signal?: AbortSignal
  /** Receives live output chunks; the same text is also kept in the run record. */
  readonly onOutput?: (chunk: OutputChunk) => void
  /** Overrides the default limits (clamped to the registry maximum). */
  readonly limits?: Partial<RunnerLimits>
}

/** A prepared, concrete environment handed to the host. */
export interface PreparedEnvironment {
  readonly record: EnvironmentRecord
  /** Command prefix used to execute, for export instructions. */
  readonly command: {
    readonly executable: string
    readonly args: readonly string[]
    readonly env?: Readonly<Record<string, string>>
  }
}

/** A detection result before an environment record exists. */
export interface EnvironmentProbe {
  readonly language: string
  readonly dialect?: string
  readonly available: boolean
  /** Version read from the real runtime, never guessed. */
  readonly version?: string
  readonly executable?: string
  readonly args?: readonly string[]
  /** Child-process environment the resolved interpreter needs (e.g. ELECTRON_RUN_AS_NODE). */
  readonly env?: Readonly<Record<string, string>>
  readonly note?: string
  /** Missing-capability description used by the teaching fallback. */
  readonly missingReason?: string
}

/** Input of {@link RunnerRegistry.prepare}. Mirrors the `/environments.prepare` contract plus internal options. */
export interface PrepareEnvironmentInput {
  readonly language: string
  /** Scheme dialect; `sicp` selects the SICP teaching prelude. */
  readonly dialect?: string
  readonly courseId?: EnvironmentRecord['courseId']
  readonly conceptIds?: EnvironmentRecord['conceptIds']
  /**
   * Internal option for a course-scoped Python virtual environment. The host
   * exposes this once T06 wires managed preparation; absent means system Python.
   */
  readonly mode?: 'system' | 'venv'
  /** Longer than the default run timeout are clamped. */
  readonly timeoutMs?: number
}

/** Result of cleaning temp directories left behind by a crashed/interrupted host. */
export interface CleanupReport {
  readonly removed: readonly string[]
  readonly failed: readonly string[]
}

/** Language support row shown by the environment directory. */
export interface LanguageSupportRow {
  readonly language: string
  readonly label: string
  readonly versions: readonly string[]
  readonly note?: string
}

/** Options for {@link createRunnerRegistry}. */
export interface RunnerRegistryOptions {
  /**
   * Plugin-owned writable data directory (the host's `$DSH_HOME/teaching`).
   * Temp run directories and managed environments live under it. Nothing is
   * written outside this directory.
   */
  readonly dataDir: string
  /** Explicit python3 executable, when the host already resolved one. */
  readonly pythonPath?: string
  /** Explicit Node executable, when the host already resolved one. */
  readonly nodePath?: string
  /** Explicit biwascheme entry module path (the resolved `node_biwascheme.js`). */
  readonly biwaschemePath?: string
  /** Extra environment variables for child processes (no secrets expected). */
  readonly env?: Readonly<Record<string, string>>
  /** Default wall-clock timeout; defaults to 10_000ms. */
  readonly defaultTimeoutMs?: number
  /** Default per-stream output cap; defaults to 256 KiB. */
  readonly maxOutputBytes?: number
  /** Maximum concurrently active runs; defaults to 4. */
  readonly maxConcurrentRuns?: number
}

/** One language adapter the registry can dispatch to. */
export interface LanguageAdapter {
  readonly language: string
  probe(dialect?: string): Promise<EnvironmentProbe>
  prepare(input: PrepareEnvironmentInput): Promise<PreparedEnvironment>
  /** Executes already-prepared code. The adapter owns no run-record bookkeeping. */
  execute(input: AdapterExecuteInput): Promise<AdapterExecutionResult>
}

/** Input handed to a language adapter. */
export interface AdapterExecuteInput {
  readonly environment: PreparedEnvironment
  readonly code: string
  readonly stdin?: string
  readonly cwd: string
  readonly env: Readonly<Record<string, string>>
  readonly limits: RunnerLimits
  readonly signal?: AbortSignal
  readonly onOutput?: (chunk: OutputChunk) => void
}

/** Raw outcome of one adapter execution. */
export interface AdapterExecutionResult {
  readonly status: ExperimentRun['status']
  readonly stdout: string
  readonly stderr: string
  readonly exitCode?: number
  readonly durationMs: number
  readonly timedOut: boolean
  readonly cancelled: boolean
  readonly truncated: boolean
  /** Non-fatal notes, e.g. a missing optional prelude. */
  readonly notes?: readonly string[]
}

/**
 * The registry the Host bridge owns. Every method is safe to call concurrently;
 * runs are independent child processes.
 */
export interface RunnerRegistry {
  /** Per-language detection; caches successful and failed probes. */
  probe(language: string, dialect?: string): Promise<EnvironmentProbe>
  /** Creates or reuses a concrete environment record for a language. */
  prepare(input: PrepareEnvironmentInput): Promise<EnvironmentRecord>
  /** Returns a previously prepared environment record, if any. */
  getEnvironment(language: string, dialect?: string): EnvironmentRecord | undefined
  /** Builds the environment directory shown in the client. */
  directory(): Promise<EnvironmentDirectory>
  /** Runs one request; always resolves with a complete run record. */
  run(request: RunRequest, options?: RunnerRunOptions): Promise<ExperimentRun>
  /** Cancels an active run; resolves with its final record when found. */
  cancel(runId: string): Promise<ExperimentRun | undefined>
  /** Looks up a run kept in the bounded in-memory history. */
  getRun(runId: string): ExperimentRun | undefined
  /** Runs currently executing. */
  activeRuns(): readonly ExperimentRun[]
  /** Removes temp directories left by a previous host process. */
  cleanupStale(): Promise<CleanupReport>
  /** Kills everything in flight and removes this registry's temp root. */
  dispose(): Promise<void>
}

/** Objective check applied to a completed run. */
export type RunCheck = NonNullable<RunRequest['checks']>[number]

/** Map a completed run to the learning-attempt validation shape. */
export type RunValidation = AttemptValidation

/** Identity for one prepared environment; exposed for host-side persistence. */
export type PreparedEnvironmentId = EnvironmentId
