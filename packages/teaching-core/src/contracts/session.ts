/**
 * Teaching sessions, chat messages, evidence provenance, and student profile.
 *
 * A session is one continuous learning conversation bound to a course
 * revision. The persistent teaching area lives on the session (current
 * activity + position), so refresh/restart can restore the same view; chat
 * messages only reference activities by id instead of owning rendered state.
 */
import type {
  ActivityId, ConceptId, CourseId, CourseRevisionId, MessageId, SessionId,
} from './ids.ts'
import type { SourceAnchor } from './source.ts'

/** Language preference for explanations. */
export type LanguagePreference = 'zh' | 'en' | 'bilingual'

/** Where the student is in the teaching loop. */
export type LearningStage =
  | 'goal-setting'
  | 'diagnosis'
  | 'teaching'
  | 'practice'
  | 'transfer'
  | 'review'
  | 'idle'

/** Persistent student profile (per local installation). */
export interface StudentProfile {
  readonly displayName?: string
  /** Free-form learning goal stated once; sessions may override with course goals. */
  readonly goals?: string
  /** Self-described background for pacing decisions. */
  readonly background?: string
  readonly language: LanguagePreference
  readonly preferences: {
    /** Preferred teaching style hint, e.g. '类比优先' or '严谨推导'. */
    readonly style?: string
    readonly pace?: 'slow' | 'normal' | 'fast'
    /** Show source citations inline by default. */
    readonly showSources?: boolean
    /** Keep original English terms beside Chinese translations. */
    readonly keepOriginalTerms?: boolean
    /** Ask before installing anything system-level. */
    readonly confirmSystemChanges?: boolean
  }
  readonly updatedAt: string
}

/** Current position inside a session; used to resume after restart. */
export interface LearningPosition {
  readonly stage: LearningStage
  readonly conceptId?: ConceptId
  /** Activity currently displayed in the persistent teaching area. */
  readonly activityId?: ActivityId
  /** Free-form note about the next intended step. */
  readonly note?: string
  readonly updatedAt: string
}

/** One continuous teaching conversation. */
export interface TeachingSession {
  readonly id: SessionId
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly title: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: 'active' | 'archived'
  readonly position: LearningPosition
  /** Ordered message ids. */
  readonly messageIds: readonly MessageId[]
  /** Concept ids already discussed in this session. */
  readonly coveredConceptIds: readonly ConceptId[]
}

/** Provenance of one piece of teaching content. */
export type EvidenceKind =
  /** Local course material (the authority for the course). */
  | 'course-source'
  /** Another course's local material, referenced explicitly. */
  | 'other-course'
  /** External web page consulted on demand (with URL). */
  | 'external-web'
  /** Model's own knowledge beyond the material. */
  | 'model-knowledge'
  /** Derivation/inference performed by the AI, with premises. */
  | 'derivation'
  /** Real experiment/execution output. */
  | 'experiment'

/** One typed provenance record attached to teaching content. */
export interface EvidenceReference {
  readonly kind: EvidenceKind
  /** Short display label, e.g. "SICP.pdf · 第 1.2 节". */
  readonly label?: string
  /** For course material. */
  readonly anchor?: SourceAnchor
  /** For cross-course references. */
  readonly courseId?: CourseId
  readonly courseTitle?: string
  /** For external sources. */
  readonly url?: string
  readonly accessedAt?: string
  /** For derivations: which premises this step relies on. */
  readonly premises?: readonly string[]
  /** Free-form clarification, e.g. "符号约定与教材不同：教材用 Θ，此处用 O". */
  readonly note?: string
  /** Confidence the content itself is accurate, when the model can state it. */
  readonly confidence?: 'high' | 'medium' | 'low' | 'unknown'
}

/** Model call accounting stored beside teacher messages. */
export interface ModelUsageRecord {
  readonly provider: string
  readonly model: string
  readonly durationMs: number
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
  readonly costUsd?: number
  /** True when the provider did not report usage. */
  readonly usageUnknown?: boolean
  readonly retried?: number
}

/** One chat message. */
export interface ChatMessage {
  readonly id: MessageId
  readonly sessionId: SessionId
  readonly role: 'student' | 'teacher' | 'system'
  readonly kind:
    | 'student-question'
    | 'student-answer'
    | 'teacher-explanation'
    | 'teacher-diagnosis'
    | 'teacher-hint'
    | 'teacher-feedback'
    | 'teacher-question'
    | 'system-note'
  readonly text: string
  /** Markdown rendering hint; always rendered through the safe subset renderer. */
  readonly markdown?: boolean
  readonly createdAt: string
  readonly evidenceRefs?: readonly EvidenceReference[]
  readonly activityIds?: readonly ActivityId[]
  readonly usage?: ModelUsageRecord
  /** Present when this message reports a failure instead of content. */
  readonly error?: { readonly code: string; readonly message: string }
  /** Structured teaching intent recorded for audit and resume. */
  readonly teaching?: TeachingTurnMeta
}

/** Structured metadata a teaching turn may carry. */
export interface TeachingTurnMeta {
  readonly intent?: 'explain' | 'diagnose' | 'practice' | 'feedback' | 'review' | 'switch-style' | 'answer'
  readonly stage?: LearningStage
  readonly conceptIds?: readonly ConceptId[]
  /** Student asked to switch teaching form. */
  readonly requestedForm?: string
  /** Sources actually used in the reply. */
  readonly evidenceKinds?: readonly EvidenceKind[]
  /** Uncertainty the student should know about. */
  readonly uncertainty?: readonly string[]
  /** Next recommended action shown as a button. */
  readonly nextActions?: readonly { readonly id: string; readonly label: string }[]
}

/** Session summary as listed in the UI. */
export interface SessionSummary {
  readonly id: SessionId
  readonly courseId: CourseId
  readonly title: string
  readonly updatedAt: string
  readonly status: 'active' | 'archived'
  readonly stage: LearningStage
  readonly messageCount: number
}
