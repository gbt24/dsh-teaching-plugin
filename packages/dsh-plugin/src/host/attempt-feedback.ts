/**
 * Deterministic, student-facing feedback for one learning attempt.
 *
 * No model call: correctness, answer labels, explanation, independence and
 * mastery changes are already known. The composed markdown becomes a durable
 * teacher-feedback chat message; the structured view drives the quiz result and
 * action buttons.
 */
import type {
  ActivityPayload, AttemptFeedback, AttemptOutcome, LearningAttempt, MasteryLevel, LessonActivity,
} from '@deepseek-teaching/core'

/** Input needed to compose one attempt feedback card. */
export interface AttemptFeedbackInput {
  readonly activity?: LessonActivity
  readonly attempt: LearningAttempt
  readonly outcome: AttemptOutcome
  /** Mastery levels before this attempt (concept id -> level). */
  readonly previousLevels: ReadonlyMap<string, MasteryLevel>
  /** Student-facing title per concept id, when available. */
  readonly conceptTitles?: ReadonlyMap<string, string>
}

/** Composed feedback + its persisted Markdown representation. */
export interface ComposedAttemptFeedback {
  readonly feedback: AttemptFeedback
  readonly markdown: string
  readonly nextActions: readonly { readonly id: string; readonly label: string }[]
}

const INDEPENDENCE_LABELS: Readonly<Record<string, string>> = {
  independent: '独立完成',
  assisted: '使用了提示',
  skipped: '跳过',
  'answer-shown': '看过答案',
}

const MASTERY_LABELS: Readonly<Record<string, string>> = {
  unseen: '未接触',
  exposed: '接触过',
  practiced: '练习过',
  checked: '已检验',
  mastered: '已掌握',
}

function quizLabels(payload: ActivityPayload, ids: readonly string[]): string[] {
  if (payload.type !== 'quiz') return []
  return ids.map(id => payload.options.find(option => option.id === id)?.label ?? id)
}

function clean(text: string, max = 1_200): string {
  const trimmed = text.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

/** Compose deterministic feedback for one attempt. */
export function composeAttemptFeedback(input: AttemptFeedbackInput): ComposedAttemptFeedback {
  const { activity, attempt, outcome } = input
  const payload = activity?.payload
  const quiz = payload?.type === 'quiz' ? payload : undefined
  const selectedIds = attempt.selectedOptionIds ?? []
  const correctIds = quiz?.correctOptionIds ?? []
  const selectedLabels = quizLabels(payload ?? { type: 'explanation', markdown: '' }, selectedIds)
  const correctLabels = quizLabels(payload ?? { type: 'explanation', markdown: '' }, correctIds)
  const passed = outcome.validation.passed
  const explanation = quiz?.explanation !== undefined && quiz.explanation.trim() !== ''
    ? clean(quiz.explanation)
    : outcome.validation.notes !== undefined && outcome.validation.notes.length > 0
      ? clean(outcome.validation.notes.join('；'))
      : undefined
  const nextReviewAt = [...outcome.review].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]?.dueAt
  const mastery = outcome.mastery.map(record => ({
    conceptId: record.conceptId,
    ...(input.conceptTitles?.get(record.conceptId) === undefined
      ? {}
      : { conceptTitle: input.conceptTitles?.get(record.conceptId) }),
    level: record.level,
    ...(input.previousLevels.get(record.conceptId) === undefined
      ? {}
      : { previousLevel: input.previousLevels.get(record.conceptId) }),
  }))
  const nextActions = passed === true
    ? [
        { id: 'practice-variant', label: '再做一道变式题' },
        { id: 'explain-attempt', label: '让 AI 深入讲讲' },
      ]
    : [
        { id: 'explain-attempt', label: '让 AI 讲讲错因' },
        { id: 'practice-variant', label: '再做一道变式题' },
      ]
  const feedback: AttemptFeedback = {
    attemptId: attempt.id,
    ...(activity === undefined ? {} : { activityId: activity.id, activityTitle: activity.title }),
    ...(passed === undefined ? {} : { passed }),
    selectedOptionIds: selectedIds,
    correctOptionIds: correctIds,
    selectedLabels,
    correctLabels,
    ...(explanation === undefined ? {} : { explanation }),
    independence: attempt.independence,
    helpLevel: attempt.helpExposure.level,
    mastery,
    ...(nextReviewAt === undefined ? {} : { nextReviewAt }),
    nextActions,
  }

  const lines: string[] = []
  if (passed === true) lines.push('### 作答反馈：✅ 回答正确')
  else if (passed === false) lines.push('### 作答反馈：❌ 回答不正确')
  else lines.push('### 作答反馈：已记录本次作答')
  if (activity !== undefined) lines.push(`- 题目：${activity.title}`)
  if (correctLabels.length > 0) lines.push(`- 正确答案：${correctLabels.join('、')}`)
  if (selectedLabels.length > 0) lines.push(`- 你的选择：${selectedLabels.join('、')}`)
  if (explanation !== undefined) lines.push(`- 解析：${explanation}`)
  const independence = INDEPENDENCE_LABELS[attempt.independence] ?? attempt.independence
  const help = attempt.helpExposure.level === 0 ? '' : `（帮助等级 ${String(attempt.helpExposure.level)}）`
  lines.push(`- 完成方式：${independence}${help}`)
  if (outcome.independenceNote !== undefined) lines.push(`- 说明：${outcome.independenceNote}`)
  const changed = mastery.filter(item => item.previousLevel !== item.level)
  if (changed.length > 0) {
    lines.push(`- 掌握变化：${changed.map(item =>
      `${item.conceptTitle ?? item.conceptId} ${MASTERY_LABELS[item.previousLevel ?? 'unseen'] ?? item.previousLevel} → ${MASTERY_LABELS[item.level] ?? item.level}`,
    ).join('；')}`)
  }
  if (nextReviewAt !== undefined) lines.push(`- 下次复习：${nextReviewAt.slice(0, 16).replace('T', ' ')}`)
  if (activity === undefined) lines.push('- 这条反馈针对对话中的自由作答；可在下一轮继续追问。')
  const markdown = lines.join('\n')
  return { feedback, markdown, nextActions }
}
