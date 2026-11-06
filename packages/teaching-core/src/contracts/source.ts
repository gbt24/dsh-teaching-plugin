/**
 * Source documents, their immutable revisions, original-position anchors, and
 * extraction uncertainty.
 *
 * Student files are never rewritten. A document (stable identity) owns one or
 * more immutable revisions (content snapshots); every unit of extracted content
 * belongs to exactly one revision and can be located back in the original file.
 */
import type { CourseId, SourceId, SourceRevisionId, UnitId } from './ids.ts'

/** Supported first-version input formats. */
export type SourceFormat =
  | 'markdown'
  | 'text'
  | 'pdf'
  | 'image'
  | 'docx'
  | 'pptx'
  | 'code'
  | 'notebook'
  | 'html'

/** Lifecycle of one imported document (per course-relevant state). */
export type SourceStatus = 'discovered' | 'processing' | 'ready' | 'partial' | 'needs-review' | 'failed'

/** What one extracted unit contains; used for teaching material selection. */
export type UnitKind =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'formula'
  | 'figure'
  | 'table'
  | 'code'
  | 'caption'
  | 'note'

/** How much the extractor trusts this unit; never invented when unknown. */
export type ExtractionConfidence = 'high' | 'medium' | 'low' | 'unknown'

/**
 * Position of a unit in the original file. Only the fields that the format
 * actually supports are present; an anchor never invents precision.
 */
export interface SourceLocator {
  /** 1-based PDF/Office page number when the format has pages. */
  readonly page?: number
  /** Normalised rectangle on the page: [x0, y0, x1, y1] in 0..1. */
  readonly bbox?: readonly [number, number, number, number]
  /** Heading path inside the document, outermost first. */
  readonly sectionPath?: readonly string[]
  /** 1-based slide number for presentations. */
  readonly slide?: number
  /** 0-based cell index for notebooks. */
  readonly cell?: number
  /** 1-based inclusive line range for text/code. */
  readonly lines?: readonly [number, number]
  /** 0-based inclusive character range for plain text. */
  readonly chars?: readonly [number, number]
}

/** One extracted, independently locatable piece of a source revision. */
export interface SourceUnit {
  readonly id: UnitId
  readonly revisionId: SourceRevisionId
  readonly kind: UnitKind
  readonly locator: SourceLocator
  /** Plain text used for retrieval and display. Formulas keep their source TeX. */
  readonly text: string
  /** Optional Markdown when the format carries structure (headings, lists). */
  readonly markdown?: string
  /** Relative path (under the revision's assets dir) for figure/image bytes. */
  readonly assetPath?: string
  readonly confidence: ExtractionConfidence
  /** Human-readable notes, e.g. "OCR 置信度低，请核对原文". */
  readonly notes?: readonly string[]
}

/** A problem discovered while extracting; reviewRequired propagates to teaching. */
export interface SourceIssue {
  readonly code:
    | 'ocr-low-confidence'
    | 'formula-uncertain'
    | 'figure-unreadable'
    | 'missing-page'
    | 'unsupported-content'
    | 'truncated'
    | 'scan-no-text'
    | 'font-missing'
  readonly severity: 'info' | 'warning' | 'error'
  readonly message: string
  readonly locator?: SourceLocator
  /** Short excerpt to show beside the issue (bounded). */
  readonly excerpt?: string
  readonly reviewRequired: boolean
}

/** Metadata stored per revision; units are kept in a separate JSON file. */
export interface SourceRevisionMeta {
  readonly id: SourceRevisionId
  readonly documentId: SourceId
  readonly fingerprint: string
  readonly createdAt: string
  readonly extractor: { readonly name: string; readonly version: string }
  readonly unitCount: number
  readonly issueCount: number
  readonly status: 'ready' | 'partial' | 'needs-review' | 'failed'
  /** Number of pages/slides/cells/lines the extractor saw. */
  readonly extent?: { readonly kind: 'pages' | 'slides' | 'cells' | 'lines'; readonly count: number }
  /** Total extracted characters; useful for scale reporting. */
  readonly textChars?: number
  readonly failure?: { readonly message: string }
}

/** One content snapshot of a source document. */
export interface SourceRevision extends SourceRevisionMeta {
  readonly units: readonly SourceUnit[]
  readonly issues: readonly SourceIssue[]
}

/** Stable identity of one imported student file. */
export interface SourceDocument {
  readonly id: SourceId
  /** Where the content came from; absent in old records means local. */
  readonly origin?: 'local' | 'web'
  /** Web provenance when `origin === 'web'`. */
  readonly web?: {
    readonly url: string
    readonly finalUrl?: string
    readonly title: string
    readonly fetchedAt: string
    readonly provider?: string
    readonly contentHash?: string
  }
  /** Original absolute path at import time; re-checked on refresh. */
  readonly originalPath: string
  readonly title: string
  readonly format: SourceFormat
  /** MIME-ish detail for code/notebook formats. */
  readonly detail?: string
  readonly sizeBytes?: number
  /** mtime at import time (ms); used for cheap change detection. */
  readonly mtimeMs?: number
  /** Courses this document is attached to (a document can serve several). */
  readonly courseIds: readonly CourseId[]
  readonly addedAt: string
  readonly updatedAt: string
  readonly status: SourceStatus
  readonly currentRevisionId?: SourceRevisionId
  /** Lightweight revision list, newest last. */
  readonly revisions: readonly {
    readonly id: SourceRevisionId
    readonly fingerprint: string
    readonly createdAt: string
    readonly status: SourceRevisionMeta['status']
    readonly unitCount: number
  }[]
  /** Whether the original file still exists at its recorded path. */
  readonly missing?: boolean
}

/**
 * Pointer to original course material at a specific revision. Everything sent
 * to the teaching layer that claims to come from course material carries one.
 */
export interface SourceAnchor {
  readonly documentId: SourceId
  readonly revisionId: SourceRevisionId
  readonly unitId: UnitId
  readonly locator: SourceLocator
  /** Bounded excerpt copied from the revision (not rewritten). */
  readonly excerpt: string
  readonly confidence: ExtractionConfidence
  /** Title/path used in citations, e.g. "SICP.pdf 第 2 章". */
  readonly label: string
}

/** Retrieval hit before it is promoted into a citation. */
export interface CorpusHit {
  readonly anchor: SourceAnchor
  readonly score: number
  readonly matchedTerms: readonly string[]
}

/** One parsed import result, ready to be persisted as a revision. */
export interface ParsedSource {
  readonly format: SourceFormat
  readonly detail?: string
  readonly extractor: { readonly name: string; readonly version: string }
  readonly units: readonly SourceUnit[]
  readonly issues: readonly SourceIssue[]
  readonly extent?: SourceRevisionMeta['extent']
}

/** Request to import one local file. */
export interface ImportRequest {
  readonly path: string
  readonly courseId?: CourseId
  /** Display title override; defaults to the basename. */
  readonly title?: string
}

/** Change detection result for one document refresh. */
export interface SourceChange {
  readonly documentId: SourceId
  readonly previousFingerprint: string
  readonly currentFingerprint: string
  readonly changed: boolean
  readonly effects: {
    /** Course nodes whose explanations cite this document. */
    readonly affectedConceptIds: readonly string[]
    /** Activities whose source anchors point into the old revision. */
    readonly affectedActivityIds: readonly string[]
    /** Whether the new revision looks like a structural change requiring confirmation. */
    readonly needsConfirmation: boolean
    readonly summary: string
  }
}
