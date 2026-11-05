/**
 * Teaching seam: one student turn in, streamed teaching out.
 *
 * The engine is deliberately given only the seams it may use (model client,
 * corpus retrieval result, persisted history) so it cannot reach into storage
 * or the Harness runtime directly. The Host persists the final message and any
 * activity the engine proposes; the engine never writes durable state itself.
 */
import type { ActivityPayload, ActivityVerification } from './activity.ts'
import type { Course, CourseRevision, CrossCourseReference } from './course.ts'
import type { AppError } from './result.ts'
import type {
  ChatMessage, EvidenceReference, LanguagePreference, LearningStage, StudentProfile,
  TeachingTurnMeta,
} from './session.ts'
import type { SourceAnchor } from './source.ts'
import type { ModelClient } from '../model/types.ts'
import type { ConceptId, SessionId } from './ids.ts'

/** One activity the engine asks the Host to create or update. */
export interface ActivityProposal {
  readonly kind: string
  readonly title: string
  readonly goal: string
  readonly payload: ActivityPayload
  readonly verification: ActivityVerification
  readonly sourceRefs: readonly SourceAnchor[]
  readonly conceptIds: readonly ConceptId[]
  /** Whether solving it can count as independent mastery evidence. */
  readonly independent: boolean
}

/** Everything available to plan and produce one teaching turn. */
export interface TeachingTurnInput {
  readonly sessionId: SessionId
  readonly studentText: string
  readonly stage: LearningStage
  readonly profile: StudentProfile
  readonly language: LanguagePreference
  readonly course: Course
  readonly courseRevision: CourseRevision
  readonly currentConceptId?: ConceptId
  /** Recent messages (bounded) for conversational continuity. */
  readonly history: readonly ChatMessage[]
  /** Optional summary replacing an older, compacted span of the conversation. */
  readonly contextCheckpoint?: {
    readonly summary: string
    readonly compactedAt?: string
  }
  /** Course-material anchors retrieved for this turn. */
  readonly material: readonly {
    readonly anchor: SourceAnchor
    readonly documentTitle: string
  }[]
  /** Cross-course references explicitly allowed for this turn. */
  readonly crossCourse: readonly CrossCourseReference[]
  /** Concepts already mastered/exposed, used to adjust the next step. */
  readonly learning: readonly {
    readonly conceptId: ConceptId
    readonly level: string
    readonly basis: readonly string[]
  }[]
  /** Issues/uncertainty inherited from the source material (must be shown, not hidden). */
  readonly materialWarnings: readonly string[]
  /** Student requested a specific form, e.g. "画图解释" or "先给完整证明". */
  readonly requestedForm?: string
  /** True when the student asked for the full answer instead of trying first. */
  readonly wantsFullAnswer?: boolean
  /** Optional web verification results already retrieved by the Host. */
  readonly webResults?: readonly {
    readonly title: string
    readonly url: string
    readonly snippet: string
  }[]
}

/** Streaming events from a teaching turn. */
export type TeachingStreamEvent =
  /** Human-readable progress label for slow phases. */
  | { readonly type: 'phase'; readonly label: string }
  /** Incremental teacher text (Markdown subset). */
  | { readonly type: 'delta'; readonly text: string }
  /** A persistent teaching-area activity; may arrive during or after text. */
  | { readonly type: 'activity'; readonly proposal: ActivityProposal }
  /** Evidence used by the reply; cumulative. */
  | { readonly type: 'evidence'; readonly refs: readonly EvidenceReference[] }
  /** Position/stage update after the turn. */
  | { readonly type: 'position'; readonly stage: LearningStage; readonly conceptId?: ConceptId }
  /** Terminal event; the Host persists this as the teacher message. */
  | {
    readonly type: 'done'
    readonly text: string
    readonly meta: TeachingTurnMeta
    readonly evidenceRefs: readonly EvidenceReference[]
    readonly uncertainty: readonly string[]
    /** Sources that could not be used, for honest reporting. */
    readonly limitations: readonly string[]
  }
  /** Terminal failure. */
  | { readonly type: 'error'; readonly error: AppError }

/** The seam itself. */
export interface TeachingService {
  /** Produce one teaching turn; always emits a terminal `done` or `error`. */
  respond(input: TeachingTurnInput, model: ModelClient, signal?: AbortSignal): AsyncIterable<TeachingStreamEvent>
  /**
   * Classify the student's latest message without producing a full lesson:
   * used to decide diagnose/explain/practice and to detect requests to switch
   * teaching form. Cheap, one small model call.
   */
  classify(input: TeachingTurnInput, model: ModelClient, signal?: AbortSignal): Promise<TeachingTurnMeta>
}
