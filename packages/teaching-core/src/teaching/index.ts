/**
 * teaching 模块公开入口（T03）。
 *
 * Host 只通过这里的工厂与纯函数接线；内部实现（提示词、解析细节）不要求
 * Host 依赖。TeachingService 契约本身在 contracts/teaching.ts 冻结。
 */
export { createTeachingService } from './service.ts'

export type {
  CrossCourseRefView, MaterialRefView, ParsedConflict, ParsedEvidenceMeta, ParsedTurnMeta,
  SplitTurnOutput, TaskShape, TeachingForm, TeachingPlan, TeachingServiceOptions, WebRefView,
} from './types.ts'

export {
  activityCanBeIndependent, activityKindCompatible, buildNextActions, decideNextPosition,
  detectRequestedForm, detectTaskShape, FORM_LABELS, heuristicClassify, isSideQuestion,
  languageInstruction, planTeachingTurn, resolveLanguage, styleGuidance,
} from './strategy.ts'

export {
  buildClassifySystemPrompt, buildClassifyUserPrompt, buildMetadataRepairPrompt,
  buildMetadataRepairSystemPrompt, buildTeachingSystemPrompt, buildTeachingUserPrompt,
  CLASSIFY_JSON, META_MARKER, REPAIR_JSON, TEACHING_META_JSON,
} from './prompts.ts'
export type { TeachingPromptContext } from './prompts.ts'

export {
  buildCrossCourseRefs, buildEvidenceReferences, buildMaterialRefs, buildWebRefs, dedupeStrings,
  modelErrorToAppError, normalizeActivityProposal, parseTurnMetaObject, parseTurnMetaText,
  splitTurnOutput,
} from './parse.ts'
export type { ActivityNormalizeContext, EvidenceBuildContext } from './parse.ts'
