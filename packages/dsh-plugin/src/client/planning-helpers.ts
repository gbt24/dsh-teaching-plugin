/**
 * Pure helpers for the guided planning wizard (interview rounds, PlanBrief
 * editing, candidate selection, task-result parsing). No React and no I/O so the
 * planning UX logic is unit testable.
 */
import type {
  CoursePlan, PlanAnswer, PlanBrief, PlanMaterialCandidate, PlanQuestion,
} from '@deepseek-teaching/core/contracts'

/** Interview rounds shown in the progress indicator ("第 N/5 轮"). */
export const MAX_PLAN_ROUNDS = 5

/** One per-question answer being edited in the UI. */
export interface DraftAnswer {
  readonly questionId: string
  readonly answer: string
  readonly usedRecommendation: boolean
}

/** Editable strings for the PlanBrief form (lists are newline separated). */
export interface PlanBriefDraft {
  readonly title: string
  readonly goals: string
  readonly level: string
  readonly background: string
  readonly duration: string
  readonly weeklyHours: string
  readonly language: PlanBrief['language']
  readonly chapters: readonly {
    readonly title: string
    readonly topics: string
    readonly prerequisites: string
  }[]
  readonly practiceStyle: string
  readonly exclusions: string
  readonly searchTopics: string
}

/** Human label for a plan status. */
export const PLAN_STATUS_LABELS: Readonly<Record<CoursePlan['status'], string>> = {
  interviewing: '规划访谈中',
  'plan-ready': '规划已就绪',
  searching: '正在检索资料',
  'materials-review': '选择候选资料',
  importing: '正在抓取资料',
  building: '正在创建课程',
  done: '规划完成',
  cancelled: '已取消',
}

/** A recommended answer for one frontier question (explicit recommendation, else first option). */
export function recommendedAnswer(question: PlanQuestion): string | undefined {
  if (question.recommendation !== undefined && question.recommendation.trim() !== '') {
    return question.recommendation.trim()
  }
  const first = question.options?.[0]
  return first !== undefined && first.trim() !== '' ? first.trim() : undefined
}

/** Pre-fill one answer per question with the recommendation where available. */
export function answersFromRecommendations(
  questions: readonly PlanQuestion[],
): Readonly<Record<string, DraftAnswer>> {
  const answers: Record<string, DraftAnswer> = {}
  for (const question of questions) {
    const recommended = recommendedAnswer(question)
    answers[question.id] = {
      questionId: question.id,
      answer: recommended ?? '',
      usedRecommendation: recommended !== undefined,
    }
  }
  return answers
}

/** Build the `planning.answer` payload, skipping blank free-text answers. */
export function buildRoundAnswers(
  questions: readonly PlanQuestion[],
  answers: Readonly<Record<string, DraftAnswer>>,
): readonly PlanAnswer[] {
  const payload: PlanAnswer[] = []
  for (const question of questions) {
    const draft = answers[question.id]
    const answer = (draft?.answer ?? '').trim()
    if (answer === '') continue
    payload.push({
      questionId: question.id,
      answer,
      ...(draft?.usedRecommendation === true ? { usedRecommendation: true } : {}),
    })
  }
  return payload
}

/** Progress label for the interview: current round / max rounds. */
export function planRoundProgress(plan: CoursePlan): {
  readonly round: number
  readonly total: number
  readonly label: string
} {
  const current = Math.min(MAX_PLAN_ROUNDS, plan.rounds.length + (plan.frontier !== undefined && plan.frontier.length > 0 ? 1 : 0))
  const round = Math.max(1, current)
  return { round, total: MAX_PLAN_ROUNDS, label: `第 ${round}/${MAX_PLAN_ROUNDS} 轮` }
}

/** Candidate ids selected by default (explicit selection first, then `selected` flags). */
export function defaultSelectedCandidateIds(plan: CoursePlan): readonly string[] {
  if (plan.selectedCandidateIds !== undefined && plan.selectedCandidateIds.length > 0) {
    return plan.selectedCandidateIds
  }
  return (plan.candidates ?? []).filter(candidate => candidate.selected === true).map(candidate => candidate.id)
}

/** Toggle one candidate id immutably. */
export function toggleCandidateId(selected: readonly string[], candidateId: string): readonly string[] {
  return selected.includes(candidateId)
    ? selected.filter(id => id !== candidateId)
    : [...selected, candidateId]
}

/** Start the editable brief from an existing plan brief (or a topic fallback). */
export function briefToDraft(brief: PlanBrief | undefined, fallbackTitle = ''): PlanBriefDraft {
  return {
    title: brief?.title ?? fallbackTitle,
    goals: (brief?.goals ?? []).join('\n'),
    level: brief?.level ?? '',
    background: brief?.background ?? '',
    duration: brief?.duration ?? '',
    weeklyHours: brief?.weeklyHours ?? '',
    language: brief?.language ?? 'zh',
    chapters: (brief?.chapters ?? []).map(chapter => ({
      title: chapter.title,
      topics: chapter.topics.join('\n'),
      prerequisites: (chapter.prerequisites ?? []).join('\n'),
    })),
    practiceStyle: brief?.practiceStyle ?? '',
    exclusions: (brief?.exclusions ?? []).join('\n'),
    searchTopics: (brief?.searchTopics ?? []).join('\n'),
  }
}

/** Split multiline form text into trimmed non-empty lines. */
export function linesOf(text: string): readonly string[] {
  return text.split(/\r?\n/u).map(line => line.trim()).filter(line => line !== '')
}

/** Convert the editable brief back to the Host `PlanBrief` shape. */
export function draftToBrief(draft: PlanBriefDraft): PlanBrief {
  return {
    title: draft.title.trim(),
    goals: linesOf(draft.goals),
    ...(draft.level.trim() !== '' ? { level: draft.level.trim() } : {}),
    ...(draft.background.trim() !== '' ? { background: draft.background.trim() } : {}),
    ...(draft.duration.trim() !== '' ? { duration: draft.duration.trim() } : {}),
    ...(draft.weeklyHours.trim() !== '' ? { weeklyHours: draft.weeklyHours.trim() } : {}),
    language: draft.language,
    chapters: draft.chapters
      .map(chapter => ({
        title: chapter.title.trim(),
        topics: linesOf(chapter.topics),
        ...(linesOf(chapter.prerequisites).length > 0 ? { prerequisites: linesOf(chapter.prerequisites) } : {}),
      }))
      .filter(chapter => chapter.title !== ''),
    ...(draft.practiceStyle.trim() !== '' ? { practiceStyle: draft.practiceStyle.trim() } : {}),
    ...(linesOf(draft.exclusions).length > 0 ? { exclusions: linesOf(draft.exclusions) } : {}),
    searchTopics: linesOf(draft.searchTopics),
  }
}

/** Validation message for the brief form, or undefined when it can be saved. */
export function validateBriefDraft(draft: PlanBriefDraft): string | undefined {
  if (draft.title.trim() === '') return '请填写课程标题。'
  if (linesOf(draft.goals).length === 0) return '至少写一个学习目标。'
  if (draft.chapters.length === 0 || draft.chapters.every(chapter => chapter.title.trim() === '')) {
    return '至少保留一个章节。'
  }
  if (linesOf(draft.searchTopics).length === 0) return '至少填一个资料检索主题（可先沿用目标）。'
  return undefined
}

/** Extract candidates from a `planning.search` task result defensively. */
export function parseCandidates(result: unknown): readonly PlanMaterialCandidate[] {
  if (typeof result !== 'object' || result === null) return []
  const raw = (result as { candidates?: unknown }).candidates
  if (!Array.isArray(raw)) return []
  const candidates: PlanMaterialCandidate[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.url !== 'string' || typeof record.title !== 'string') continue
    if (typeof record.domain !== 'string' || typeof record.snippet !== 'string') continue
    if (typeof record.status !== 'string') continue
    candidates.push(entry as unknown as PlanMaterialCandidate)
  }
  return candidates
}

/** Extract the created course id from a `planning.createCourse` task result. */
export function extractCourseId(result: unknown): string | undefined {
  if (typeof result !== 'object' || result === null) return undefined
  const record = result as { courseId?: unknown; course?: unknown }
  if (typeof record.courseId === 'string' && record.courseId !== '') return record.courseId
  if (typeof record.course === 'object' && record.course !== null) {
    const id = (record.course as { id?: unknown }).id
    if (typeof id === 'string' && id !== '') return id
  }
  return undefined
}

/** Failure message for a failed/cancelled task snapshot, or undefined when usable. */
export function taskFailureMessage(snapshot: { readonly status: string; readonly error?: { readonly message: string } }, label: string): string | undefined {
  if (snapshot.status === 'completed' || snapshot.status === 'partial') return undefined
  if (snapshot.status === 'cancelled') return `${label}已取消。`
  if (snapshot.status === 'failed') return `${label}失败：${snapshot.error?.message ?? '未知原因'}`
  return `${label}未完成（${snapshot.status}）。`
}

/** Whether the plan has nothing more to ask in the interview. */
export function interviewComplete(plan: CoursePlan): boolean {
  return plan.status !== 'interviewing' || plan.frontier === undefined || plan.frontier.length === 0
}
