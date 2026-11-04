/**
 * learning 模块公开入口（T04）。
 *
 * Host 通过 createLearningService 接线；以下纯函数/评分器同时用于 Host 展示
 * （错题本、掌握依据、复习）与测试。LearningService 契约在
 * contracts/learning-service.ts 冻结。
 */
export {
  buildRecheckPlan, createLearningService, emptyLearningRecord, failedAttempts, isFailedAttempt,
  normalizeValidation,
} from './service.ts'
export type { LearningServiceOptions, RubricResolver } from './service.ts'

export { canCountAsEvidence, classifyIndependence } from './independence.ts'
export type { IndependenceClassification, IndependenceInput } from './independence.ts'

export {
  aggregateRubric, createModelRubricAssessor, DEFAULT_RUBRIC_THRESHOLD, degradedValidation,
  rubricFromActivityPayload,
} from './rubric.ts'
export type {
  ModelRubricAssessorOptions, RubricAggregate, RubricAssessmentRequest, RubricAssessor,
} from './rubric.ts'

export {
  attemptBasisLine, attemptDimensionEvidence, buildMasteryRecord, coveredDimensionCount,
  DIMENSION_KEYS, DIMENSION_LABELS, deriveMasteryLevel, emptyDimensions, hasOpenDispute,
  mergeDimensions,
} from './mastery.ts'
export type { BuildMasteryRecordInput, DeriveMasteryInput } from './mastery.ts'

export { computeReviewItems, reviewIntervalDays } from './review.ts'
export type { ReviewComputationInput } from './review.ts'

export { buildRubricSystemPrompt, buildRubricUserPrompt, RUBRIC_JSON } from './prompts.ts'
