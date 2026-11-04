/**
 * Learning attempts, help exposure, mastery evidence, disputes and review.
 *
 * Rules encoded here rather than in UI code:
 * - showing the full answer or a model-provided answer never counts as
 *   independent evidence;
 * - skipping an activity records contact only, never mastery;
 * - mastery keeps the attempt ids and the uncovered dimensions it is based on;
 * - a student disagreement is stored beside the original assessment, not over
 *   it, and triggers re-check workflows.
 */
import type {
  ActivityId, AttemptId, ConceptId, CourseId, CourseRevisionId, MasteryId, SessionId,
} from './ids.ts'
import type { RubricCriterion } from './activity.ts'

/** How much help the student had seen before answering. */
export type HelpExposure =
  | { readonly level: 0 }
  | { readonly level: 1; readonly hints: readonly string[] }
  | { readonly level: 2; readonly hints: readonly string[] }
  | { readonly level: 3; readonly hints: readonly string[] }
  | { readonly level: 'full-answer'; readonly answer: string }

/** Independence classification of one attempt (derived from help exposure + provenance). */
export type AttemptIndependence = 'independent' | 'assisted' | 'skipped' | 'answer-shown'

/** One objective test outcome. */
export interface ObjectiveCheck {
  readonly name: string
  readonly status: 'pass' | 'fail' | 'not-run'
  readonly detail?: string
}

/** One rubric criterion score. */
export interface RubricScore {
  readonly criterionId: string
  readonly score: number
  readonly maxScore: number
  readonly note?: string
}

/** How an attempt was validated. */
export interface AttemptValidation {
  readonly kind: 'objective' | 'quiz' | 'rubric' | 'open' | 'unverified'
  readonly passed?: boolean
  readonly checks?: readonly ObjectiveCheck[]
  readonly rubric?: readonly RubricScore[]
  readonly notes?: readonly string[]
  /** Concrete evidence supporting the judgement (run output, cited text, etc.). */
  readonly evidence?: readonly string[]
  /** Whether a model judged this; model judgement must never be silently authoritative. */
  readonly assessedBy?: 'objective-runner' | 'model-rubric' | 'student-self' | 'none'
  readonly confidence: 'high' | 'medium' | 'low' | 'unknown'
  /** Limits of this judgement, shown to the student. */
  readonly limits?: readonly string[]
  readonly createdAt?: string
}

/** How the student did on one activity. */
export interface LearningAttempt {
  readonly id: AttemptId
  readonly sessionId: SessionId
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly conceptIds: readonly ConceptId[]
  /** Absent for free-form chat answers with no activity. */
  readonly activityId?: ActivityId
  /** Activity revision this attempt was made against. */
  readonly activityRevision?: number
  /** The question/activity prompt as the student saw it. */
  readonly prompt: string
  /** Student's own answer text (verbatim). */
  readonly answerText: string
  /** For quiz attempts. */
  readonly selectedOptionIds?: readonly string[]
  readonly helpExposure: HelpExposure
  readonly independence: AttemptIndependence
  /** Student's own claim about understanding. */
  readonly selfReport?: 'understood' | 'partly' | 'confused'
  /** Objective run id when validated by real execution. */
  readonly runId?: string
  readonly validation?: AttemptValidation
  readonly createdAt: string
  /** True when the source material behind this attempt has since changed. */
  readonly needsRecheck?: boolean
}

/** Mastery levels, deliberately ordered from contact to checked understanding. */
export type MasteryLevel = 'unseen' | 'exposed' | 'practiced' | 'checked' | 'mastered'

/** Which dimensions of mastery the evidence covers. */
export interface MasteryDimensions {
  /** Can explain the idea in their own words. */
  readonly explain: number
  /** Can state conditions / spot counterexamples. */
  readonly conditions: number
  /** Can solve an independent variant. */
  readonly variants: number
  /** Can apply it in an unseen situation and justify why. */
  readonly transfer: number
}

/** A student disagreement with an assessment. */
export interface MasteryDispute {
  readonly id: string
  readonly reason: string
  readonly createdAt: string
  readonly status: 'open' | 'recheck-due' | 'resolved' | 'upheld'
  readonly resolution?: string
}

/** Assessment of one concept, never overwriting the attempts it cites. */
export interface MasteryRecord {
  readonly id: MasteryId
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly conceptId: ConceptId
  readonly level: MasteryLevel
  readonly dimensions: MasteryDimensions
  readonly evidenceAttemptIds: readonly AttemptId[]
  /** Why this level was assigned, citing concrete attempts. */
  readonly basis: readonly string[]
  /** Dimensions not covered yet. */
  readonly uncovered: readonly string[]
  readonly disputes: readonly MasteryDispute[]
  readonly updatedAt: string
  /** Material changed; the record keeps its history but asks for re-check. */
  readonly needsRecheck?: boolean
}

/** One scheduled review candidate. */
export interface ReviewItem {
  readonly conceptId: ConceptId
  readonly courseId: CourseId
  readonly dueAt: string
  readonly intervalDays: number
  readonly reason: 'low-mastery' | 'spaced' | 'upcoming-course-need' | 'after-dispute'
  readonly lastReviewedAt?: string
  readonly note?: string
}

/** Per-course learning file kept by LocalState. */
export interface CourseLearningRecord {
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly attempts: readonly LearningAttempt[]
  readonly mastery: readonly MasteryRecord[]
  readonly review: readonly ReviewItem[]
  /** Student-authored notes, independent of chat history. */
  readonly notes: readonly {
    readonly id: string
    readonly sessionId?: SessionId
    readonly conceptId?: ConceptId
    readonly activityId?: ActivityId
    readonly markdown: string
    readonly createdAt: string
    readonly updatedAt: string
  }[]
  readonly updatedAt: string
}

/** Result of submitting one attempt. */
export interface AttemptOutcome {
  readonly attempt: LearningAttempt
  /** Validation performed by the host (objective) or the model (rubric). */
  readonly validation: AttemptValidation
  /** Updated mastery records after incorporating the attempt. */
  readonly mastery: readonly MasteryRecord[]
  /** Updated review suggestions. */
  readonly review: readonly ReviewItem[]
  /** Honest note when the attempt cannot count as independent evidence. */
  readonly independenceNote?: string
}
