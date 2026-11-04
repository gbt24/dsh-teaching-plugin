/**
 * Learning seam: attempts in, honest mastery evidence and review out.
 *
 * The service never decides that a student mastered something from a single
 * click, a skipped task, or an answer the model effectively wrote. It records
 * help exposure and independence, keeps the attempts it cites, and exposes
 * disputes/re-checks without overwriting history.
 */
import type {
  AttemptOutcome, AttemptValidation, CourseLearningRecord, LearningAttempt, MasteryRecord,
  ReviewItem,
} from './learning.ts'
import type { AppError, Result } from './result.ts'
import type { ActivityId, ConceptId, CourseId, CourseRevisionId, RunId, SessionId } from './ids.ts'

/** Input for one attempt submission. */
export interface SubmitAttemptInput {
  readonly sessionId: SessionId
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly conceptIds: readonly ConceptId[]
  readonly activityId?: ActivityId
  readonly activityRevision?: number
  readonly prompt: string
  readonly answerText: string
  readonly helpLevel: 0 | 1 | 2 | 3 | 'full-answer'
  readonly hintsSeen?: readonly string[]
  readonly answerRevealed: boolean
  readonly selectedOptionIds?: readonly string[]
  readonly selfReport?: 'understood' | 'partly' | 'confused'
  /** Objective validation already performed (quiz/code run), if any. */
  readonly validation?: AttemptValidation
  readonly runId?: RunId
  readonly createdAt?: string
}

/** Learning service seam. */
export interface LearningService {
  /** Record an attempt, classify independence, update mastery + review. */
  submitAttempt(input: SubmitAttemptInput): Promise<Result<AttemptOutcome>>
  /** Read one course learning record. */
  getRecord(courseId: CourseId): Promise<Result<CourseLearningRecord>>
  /** Attempts filtered by session/course. */
  listAttempts(query: { readonly sessionId?: SessionId; readonly courseId?: CourseId }): Promise<Result<readonly LearningAttempt[]>>
  /** Mastery records of one course. */
  listMastery(courseId: CourseId): Promise<Result<readonly MasteryRecord[]>>
  /** Review suggestions due now or soon. */
  listReview(courseId: CourseId): Promise<Result<readonly ReviewItem[]>>
  /** Student disputes one assessment; keeps the old basis and opens a recheck. */
  dispute(courseId: CourseId, conceptId: ConceptId, reason: string): Promise<Result<MasteryRecord>>
  /** Run a re-check plan for one concept; returns the updated record and questions to ask. */
  recheck(courseId: CourseId, conceptId: ConceptId): Promise<Result<{ record: MasteryRecord; plan: readonly string[] }>>
  /** Called when a source revision changed: mark cited mastery for recheck without deleting it. */
  markStaleForSources(courseId: CourseId, conceptIds: readonly ConceptId[], note: string): Promise<Result<readonly MasteryRecord[]>>
  /** Append/update a student note. */
  saveNote(input: {
    readonly courseId: CourseId
    readonly id?: string
    readonly sessionId?: SessionId
    readonly conceptId?: ConceptId
    readonly activityId?: ActivityId
    readonly markdown: string
  }): Promise<Result<CourseLearningRecord['notes'][number]>>
}
