/**
 * Corpus 模块公开入口。
 *
 * Host 接线示例：
 * ```ts
 * const corpus = createCorpusService({ state, courses, model, references })
 * ```
 * 其中 `state` 为本地数据目录（service 自行 open），`courses` 可省略（由 state 构造），
 * `model` 用于课程草案，`references` 用于资料变化时反查受影响的概念/活动（可选）。
 */
export type {
  CorpusServiceApi,
} from './service.ts'
export { createCorpusService, CorpusServiceImpl } from './service.ts'
export type {
  CorpusLogger, CorpusReferenceHooks, CorpusServiceOptions,
} from './types.ts'
export type { CorpusLimits } from './limits.ts'
export { DEFAULT_LIMITS, resolveLimits } from './limits.ts'
export type { OcrOptions, OcrRuntime } from './ocr.ts'
export { resolveOcrRuntime } from './ocr.ts'
export type { DraftCoverageData } from './draft.ts'
export { buildDraftCoverage, proposeCourseRevision, tryParseJson } from './draft.ts'
export { detectSourceFormat, parseSourceFile } from './parsers/index.ts'
export type { DetectedFormat } from './parsers/index.ts'
export { buildSearchIndex, searchCorpus, SearchIndexCache } from './search.ts'
export type { SearchStats, StoredSearchIndex } from './search.ts'
export { buildEffects, describeDiff, diffUnits, resolveReferences } from './change-utils.ts'
export type { ReferenceResolution, UnitDiff } from './change-utils.ts'
export { CorpusCancelledError, CorpusFailure, CorpusParseError } from './errors.ts'
export type { ParseAsset } from './budget.ts'

/* 网页资料导入（Host 抓取后交给 corpus 抽取/持久化） */
export type { WebImportRequest, WebParsedContent } from './web.ts'
export {
  domainOf, extractHtmlTitle, parseWebPage, stripNonContentHtml, webSyntheticPath,
  WEB_MAX_UNITS, WEB_TEXT_CAP,
} from './web.ts'

/* 增量整合：新草案与已确认结构的 id/锚点/章节对齐（纯函数） */
export type { ReconcileResult, ReconcileStats } from './reconcile.ts'
export { normalizeConceptTitle, reconcileDraftWithActive } from './reconcile.ts'

/* 课程结构 v2：知识库结构识别/角色判定/确定性构建（模式 A） */
export type {
  KbBuiltChapter, KbBuiltConcept, KbContext, KbDetection, KbDetectionFacts, KbDetectionSignal,
  KbFrontmatterValue, KbIndex, KbIndexEntry, KbIndexSection, KbLink, KbPage, KbSourceRole,
  KbStructureBuild, MaterialDocument, MaterialLoadResult, ParsedFrontmatter, RoleClassifyInput,
} from './structure.ts'
export {
  buildKbStructureData, buildKbStructureFromContext, classifySourceRole, cleanHeadingText,
  describeKbDetection, detectWikiKnowledgeBase, kbRoleToSourceRole, loadKbPages,
  loadMaterialDocuments, normalizeSlug, parseFrontmatter, parseIndexSections, prepareKbContext,
  reconstructMarkdownFromUnits, scanMarkdownPage, summarizeRoles,
} from './structure.ts'
