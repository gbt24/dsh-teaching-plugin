/**
 * T06 environments module public surface.
 *
 * The Host bridge creates one {@link EnvironmentManager} at activation next to
 * the frozen {@link RunnerRegistry} and calls `detectNeeds` / `prepare` /
 * `directory` from `/api/teaching` routes. Everything here is pure Node and
 * writes only inside the supplied data directory.
 */
export type {
  ApprovalKind, DeclaredEnvironmentNeed, DeclaredResourceEnvelope, EnvironmentApproval,
  EnvironmentCleanupResult, EnvironmentManager, EnvironmentManagerOptions,
  EnvironmentNeed, EnvironmentNeedAction, EnvironmentNeedSource, EnvironmentNeedStatus,
  EnvironmentRunOptions, ExtendedLanguageSpec, HostFacts,
  PreparationProgress, PrepareEnvironmentOptions, PrepareEnvironmentRequest, ReducedExperiment,
  ResourceAssessment, ResourceFallback, ResourceRequest, ResourceRequestKind,
  StaleEnvironmentCleanupReport, SystemChangeExecutionResult, SystemChangeExecutor,
  SystemInstallPlanSpec,
} from './types.ts'
export type {
  EnvironmentDirectory, EnvironmentRecord, ExperimentRun,
} from '../contracts/experiment.ts'
export { createEnvironmentManager } from './manager.ts'
export {
  ENVIRONMENT_STATE_SCHEMA_VERSION, EnvironmentStore,
} from './persistence.ts'
export {
  assessResourceRequest, buildResourceFallback, describeDeclaredResources,
  memoryBudgetMb, readHostFacts,
} from './resources.ts'
export {
  DEFAULT_INSTALL_PLANS, EXTENDED_LANGUAGE_SPECS, findExtendedSpec, findInstallPlan,
  networkInstallApproval, pluginRepairApproval, systemRuntimeApproval,
} from './catalog.ts'
