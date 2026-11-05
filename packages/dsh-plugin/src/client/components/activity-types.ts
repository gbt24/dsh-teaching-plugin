/**
 * Re-exports of the contract/renderer types used by the client components.
 *
 * Keeping the imports in one place lets components stay free of deep import
 * paths and makes it obvious which types are contract types and which belong to
 * the shared renderer.
 */
export type {
  ActivityState, CodeRunPayload, CourseDetail, EnvironmentDirectory, EvidenceReference,
  ExperimentRun, LessonActivity, SessionView, SourceAnchor, SourceView,
} from '@deepseek-teaching/core/contracts'
export type {
  CodeRunResultView, MountedActivityState,
} from '@deepseek-teaching/core/render'
