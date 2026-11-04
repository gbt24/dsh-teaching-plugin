/**
 * Render module public surface.
 *
 * Two consumers share this exact interface:
 * - the Harness in-app teaching workspace (`packages/dsh-plugin/src/client`);
 * - the standalone offline HTML export owned by T07.
 *
 * Everything here is plain DOM + TypeScript: no React, no browser-only global
 * beyond an optionally-injected `Document`, and no model-provided HTML.
 */
export { mountActivity, validateActivityPayload } from './activity.ts'
export type {
  ActivityCallbacks, AnswerSubmission, HelpExposureInfo, MountActivityInput,
  MountActivityOptions, MountedActivity, MountedActivityState,
} from './activity.ts'
export { mountGraph } from './graph.ts'
export type { GraphHandle, GraphMountOptions } from './graph.ts'
export { mountFigure } from './figure.ts'
export type { FigureHandle, FigureMountOptions } from './figure.ts'
export { mountDerivation } from './derivation.ts'
export type { DerivationHandle, DerivationMountOptions } from './derivation.ts'
export { mountCodeRun } from './code-run.ts'
export type { CodeRunCheckView, CodeRunHandle, CodeRunMountOptions, CodeRunResultView } from './code-run.ts'
export { mountQuiz } from './quiz.ts'
export type { QuizHandle, QuizMountOptions } from './quiz.ts'
export {
  mountExplanation, mountExperimentNote, mountOpenQuestion, mountProofTask, mountReadingTask,
} from './tasks.ts'
export type {
  AnswerTaskHandle, AnswerTaskMountOptions, ContentHandle, TaskMountOptions,
} from './tasks.ts'
export {
  appendInlineTokens, parseInlineMarkdown, parseMarkdown, renderInlineMarkdown, renderMarkdown,
} from './markdown.ts'
export type { MarkdownBlock, MarkdownInline } from './markdown.ts'
export { compileExpression, evaluateExpression, ExpressionError, isValidExpression } from './expr.ts'
export type { CompiledExpression, CompileExpressionOptions } from './expr.ts'
export { katexToHtml, renderDisplayMathInto, renderMath } from './math.ts'
export {
  PLOT_COLORS, createElement, createSvgElement, formatNumber, plotColor, resolveDocument,
} from './dom.ts'
export type { ElementOptions, RenderEnvironment } from './dom.ts'
