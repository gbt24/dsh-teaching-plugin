/**
 * Corpus service seam: import, read, retrieve, structure-proposal and change
 * detection. The teaching layer depends only on this interface, never on the
 * concrete parsers, so new formats and better extraction cannot change
 * teaching semantics silently.
 */
import type { CourseRevision } from './course.ts'
import type { AppError, Result } from './result.ts'
import type {
  ImportRequest, ParsedSource, SourceAnchor, SourceChange, SourceDocument, SourceIssue,
  SourceRevision, SourceUnit,
} from './source.ts'
import type {
  CourseId, SourceId, SourceRevisionId, TaskId, UnitId,
} from './ids.ts'
import type { TaskSnapshot } from './task.ts'
import type { LanguagePreference } from './session.ts'

/** Retrieval request scoped to the current course (other courses optional). */
export interface CorpusSearchQuery {
  readonly query: string
  readonly courseId?: CourseId
  /** Additional courses to search for cross-course references. */
  readonly alsoCourseIds?: readonly CourseId[]
  readonly limit?: number
  /** Restrict to specific unit kinds (e.g. formulas, figures). */
  readonly kinds?: readonly SourceUnit['kind'][]
  /** Only consider these documents (e.g. the course's own materials). */
  readonly documentIds?: readonly SourceId[]
}

/** One retrieval result with provenance ready for citation. */
export interface CorpusSearchResult {
  readonly hits: readonly {
    readonly anchor: SourceAnchor
    readonly documentTitle: string
    readonly score: number
    /** Why it matched (for explainability). */
    readonly matchedTerms: readonly string[]
  }[]
  /** True when no material matched; teaching must not pretend otherwise. */
  readonly empty: boolean
}

/**
 * How a course structure draft should be produced.
 *
 * - `auto` (default): use the knowledge-base structure when the materials look
 *   like an LLM wiki (schema/index/frontmatter/layers); otherwise fall back to
 *   the llm-wiki style generation.
 * - `kb-structure`: require a detected knowledge base; error when none.
 * - `llm-wiki`: always build a virtual wiki-style outline from the materials
 *   (used for unstructured sources and for regeneration).
 */
export type CourseDraftStrategy = 'auto' | 'kb-structure' | 'llm-wiki'

/** Input for course structure proposals (knowledge-base direct or llm-wiki AI). */
export interface CourseDraftInput {
  readonly courseId: CourseId
  readonly courseTitle: string
  readonly goal: string
  readonly background?: string
  readonly language: LanguagePreference
  /** Documents to structure; when absent every document attached to the course. */
  readonly documentIds?: readonly SourceId[]
  /** Student instruction refining a previous draft. */
  readonly instruction?: string
  /** Structure source strategy; default `auto`. */
  readonly strategy?: CourseDraftStrategy
}

/** Outcome of one import task. */
export interface ImportOutcome {
  readonly documents: readonly SourceDocument[]
  readonly failures: readonly {
    readonly path: string
    readonly error: AppError
  }[]
  /** Non-fatal extraction problems surfaced to the student. */
  readonly warnings: readonly string[]
}

/** The corpus seam used by teaching, the UI and task orchestration. */
export interface CorpusService {
  /** Import one file path; resolves to a new document revision. */
  importFile(request: ImportRequest): Promise<Result<SourceDocument>>
  /** Import many files with per-file progress reported through `onProgress`. */
  importFiles(
    courseId: CourseId | undefined,
    requests: readonly ImportRequest[],
    hooks?: {
      readonly onProgress?: (done: number, total: number, current: string) => void
      readonly signal?: AbortSignal
    },
  ): Promise<ImportOutcome>
  /** Parse a file into an in-memory revision (no persistence); used by tests. */
  parseFile(path: string, formatHint?: string): Promise<Result<ParsedSource>>
  /** Persist a parsed revision for an existing or new document. */
  saveRevision(document: SourceDocument, parsed: ParsedSource): Promise<Result<{ document: SourceDocument; revision: SourceRevision }>>
  getDocument(documentId: SourceId): Promise<Result<SourceDocument>>
  getRevision(documentId: SourceId, revisionId: SourceRevisionId): Promise<Result<SourceRevision>>
  /** Read one page of units from the current revision. */
  readUnits(documentId: SourceId, offset: number, limit: number, revisionId?: SourceRevisionId): Promise<Result<{ units: readonly SourceUnit[]; total: number }>>
  /** Fetch one anchor's unit to show original text. */
  resolveAnchor(anchor: SourceAnchor): Promise<Result<SourceUnit>>
  /** Retrieval for teaching; never invents hits. */
  search(query: CorpusSearchQuery): Promise<Result<CorpusSearchResult>>
  /** Ask the model to propose a course structure from the imported material. */
  proposeCourseStructure(input: CourseDraftInput, signal?: AbortSignal): Promise<Result<CourseRevision>>
  /** Detect whether a document changed on disk since its current revision. */
  detectChange(documentId: SourceId): Promise<Result<SourceChange>>
  /** Re-import a changed document and report affected structures. */
  refreshDocument(documentId: SourceId, signal?: AbortSignal): Promise<Result<SourceChange>>
  /** Issues of the current revision, for the problem list. */
  listIssues(documentId: SourceId): Promise<Result<readonly SourceIssue[]>>
}

/** Persisted task context the host passes into long-running corpus work. */
export interface CorpusTaskContext {
  readonly taskId: TaskId
  readonly signal: AbortSignal
  report(patch: Partial<TaskSnapshot>): void
}
