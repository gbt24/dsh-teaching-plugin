/**
 * Experiments module public surface.
 *
 * The Host bridge creates one {@link RunnerRegistry} at activation, passes its
 * data directory, and calls `prepare` / `run` / `cancel` from the
 * `/api/teaching` routes. Everything here is pure Node and writes only inside
 * the supplied data directory (plus OS temp for short-lived run dirs inside it).
 */
export type {
  AdapterExecutionResult, AdapterExecuteInput, CleanupReport, EnvironmentProbe,
  LanguageAdapter, LanguageSupportRow, OutputChunk, PrepareEnvironmentInput,
  PreparedEnvironment, RunnerLimits, RunnerRegistry, RunnerRegistryOptions,
  RunnerRunOptions,
} from './types.ts'
export {
  createRunnerRegistry, validationFromRun, SUPPORTED_LANGUAGES,
  SCHEME_DIALECT_DIFFERENCES, killProcessTree,
} from './registry.ts'
export type { ProcessOutcome } from './registry.ts'
export { runProcess } from './process.ts'
export type { ProcessChunk, ProcessSpec } from './process.ts'
export {
  SICP_PRELUDE, SCHEME_RUNNER_SOURCE, schemeDialectSummary,
} from './scheme-support.ts'
export {
  resolvePython, resolveNode, resolveBiwaschemeEntry,
} from './interpreters.ts'
