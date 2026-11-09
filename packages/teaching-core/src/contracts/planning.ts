/**
 * Guided course planning: grilling-style interview rounds and the material
 * search/selection plan that feeds the existing llm-wiki course draft.
 */
import type { CourseId, SourceId } from './ids.ts'

/** Lifecycle of one guided course plan. */
export type PlanStatus =
  | 'interviewing'
  | 'plan-ready'
  | 'searching'
  | 'materials-review'
  | 'importing'
  | 'building'
  | 'done'
  | 'cancelled'

/** One frontier question generated for a round. */
export interface PlanQuestion {
  readonly id: string
  readonly title: string
  readonly body: string
  /** Suggested answers / options; free text is always allowed. */
  readonly options?: readonly string[]
  /** Recommended answer shown to the student. */
  readonly recommendation?: string
  /** If set, the Host should look this up instead of asking the student. */
  readonly factQuery?: string
}

/** One answer recorded for a round. */
export interface PlanAnswer {
  readonly questionId: string
  readonly answer: string
  readonly usedRecommendation?: boolean
}

/** One interview round. */
export interface PlanRound {
  readonly index: number
  readonly questions: readonly PlanQuestion[]
  readonly answers?: readonly PlanAnswer[]
  readonly createdAt: string
}

/** One settled design decision. */
export interface PlanDecision {
  readonly key: string
  readonly value: string
  readonly decidedBy: 'user' | 'recommendation' | 'fact'
}

/** Detailed study plan shown for review before searching. */
export interface PlanBrief {
  readonly title: string
  readonly goals: readonly string[]
  readonly level?: string
  readonly background?: string
  readonly duration?: string
  readonly weeklyHours?: string
  readonly language: 'zh' | 'en' | 'bilingual'
  readonly chapters: readonly {
    readonly title: string
    readonly topics: readonly string[]
    readonly prerequisites?: readonly string[]
  }[]
  readonly practiceStyle?: string
  readonly exclusions?: readonly string[]
  readonly searchTopics: readonly string[]
}

/** One candidate external page. */
export interface PlanMaterialCandidate {
  readonly id: string
  readonly url: string
  readonly title: string
  readonly snippet: string
  readonly domain: string
  readonly score?: number
  readonly selected?: boolean
  readonly status: 'candidate' | 'selected' | 'fetched' | 'failed'
  readonly reason?: string
  /** What this material is used for in the plan (chapter/topic). */
  readonly purpose?: string
  /** The search query that surfaced this candidate. */
  readonly sourceQuery?: string
}

/** One guided course plan, persisted beside courses/sessions. */
export interface CoursePlan {
  readonly id: string
  readonly status: PlanStatus
  readonly topic: string
  /** Language used for interview questions and the plan. */
  readonly language?: 'zh' | 'en' | 'bilingual'
  readonly createdAt: string
  readonly updatedAt: string
  readonly rounds: readonly PlanRound[]
  readonly decisions: readonly PlanDecision[]
  /** Current unanswered frontier; empty when the interview is complete. */
  readonly frontier?: readonly PlanQuestion[]
  readonly brief?: PlanBrief
  readonly searchQueries?: readonly string[]
  readonly candidates?: readonly PlanMaterialCandidate[]
  readonly selectedCandidateIds?: readonly string[]
  readonly importedSourceIds?: readonly SourceId[]
  readonly courseId?: CourseId
  readonly warnings?: readonly string[]
}
