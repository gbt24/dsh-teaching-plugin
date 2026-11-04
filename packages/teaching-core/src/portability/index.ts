/**
 * Portability module public surface.
 *
 * The Host bridge imports `createPortabilityService` from
 * `@deepseek-teaching/core/portability` and calls it from the
 * `/api/teaching/portability.*` and `records.*` routes. Everything exported
 * here is pure Node domain logic (fflate ZIP, node:crypto sha256, no network,
 * no Harness imports).
 */
export { createPortabilityService } from './service.ts'
export type { PortabilityDependencies } from './service.ts'
export {
  createBackupArchive,
  hasExistingData,
  isSafeArchivePath,
  listBackupFiles,
  readValidatedArchive,
  restoreBackupArchive,
  sha256Hex,
  writeFileAtomic,
} from './backup.ts'
export type { CreateBackupParams, RestoreBackupParams, ValidatedArchive } from './backup.ts'
export {
  deleteRecords,
  exportRecordsJson,
  resetLearningRecords,
  RECORDS_FORMAT_VERSION,
} from './records.ts'
export type {
  ExportedCourseRecords, RecordsDependencies, RecordsExportFile,
} from './records.ts'
export {
  buildOfflinePage,
  graphLayoutOf,
  OFFLINE_LIMITS,
  OFFLINE_NOTICE_LINES,
} from './offline/export-page.ts'
export type {
  GraphLayout, OfflineActivityEntry, OfflinePageInput, OfflinePageResult, PageSessionInput,
} from './offline/export-page.ts'
export { buildOfflineRuntimeScript } from './offline/runtime.ts'
export {
  buildNativeReadme, environmentNoteFor, extensionFor, languageLabel, needsSicpPrelude, planNativeSources,
} from './offline/native.ts'
export type { PlannedNativeSource } from './offline/native.ts'
export {
  asOfflineDocument, asOfflineElement, createOfflineDocument, escapeHtmlAttribute, escapeHtmlText,
  serializeChildren, serializeNode,
} from './offline/dom.ts'
export type { OfflineElement, OfflineText } from './offline/dom.ts'
export {
  runtimeBuildSeriesPath, runtimeCompileExpression, runtimeEvaluateExpression, runtimeFormatNumber,
} from './offline/graph-lib.ts'
export type { RuntimeCompiledExpression, RuntimeValues } from './offline/graph-lib.ts'
export { KATEX_CSS } from './offline/katex-css.ts'
