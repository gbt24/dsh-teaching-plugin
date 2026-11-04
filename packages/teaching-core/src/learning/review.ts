/**
 * 复习建议（纯函数）：按薄弱程度、遗忘间隔与后续课程需要计算复习项。
 *
 * 时间全部由调用方注入（clock），便于测试遗忘间隔；本模块不读系统时间。
 */
import type {
  LearningAttempt, MasteryLevel, MasteryRecord, ReviewItem,
} from '../contracts/learning.ts'
import type { ConceptId, CourseId } from '../contracts/ids.ts'

/** 复习计算输入。 */
export interface ReviewComputationInput {
  readonly courseId: CourseId
  readonly mastery: readonly MasteryRecord[]
  readonly attempts: readonly LearningAttempt[]
  readonly now: Date
  /** 后续课程会需要的概念（Host 由课程顺序/下一概念提供）。 */
  readonly upcomingConceptIds?: readonly ConceptId[]
  /** 只返回未来多少天内到期的复习项；默认 7 天。 */
  readonly horizonDays?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 当前等级的基础复习间隔（天）；掌握证据越多间隔越长，但封顶 60 天。 */
export function reviewIntervalDays(level: MasteryLevel, independentPassedCount: number): number {
  switch (level) {
    case 'exposed': return 1
    case 'practiced': return 2
    case 'checked': return 4
    case 'mastered': {
      const doublings = Math.min(Math.max(independentPassedCount - 1, 0), 3)
      return Math.min(60, 7 * (2 ** doublings))
    }
    default: return 0
  }
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * DAY_MS).toISOString()
}

function sortedByTime(attempts: readonly LearningAttempt[]): LearningAttempt[] {
  return [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** 计算当前应展示的复习建议（到期或即将到期），按到期时间升序。 */
export function computeReviewItems(input: ReviewComputationInput): ReviewItem[] {
  const { courseId, mastery, attempts, now } = input
  const horizonDays = input.horizonDays ?? 7
  const horizonEnd = addDays(now, horizonDays)
  const upcoming = new Set((input.upcomingConceptIds ?? []).map(id => id as string))
  const items: ReviewItem[] = []

  for (const record of mastery) {
    if (record.level === 'unseen') continue
    const conceptAttempts = sortedByTime(attempts.filter(attempt => attempt.conceptIds.includes(record.conceptId)))
    const lastAttemptAt = conceptAttempts.at(-1)?.createdAt
    const passed = conceptAttempts.filter(
      attempt => attempt.independence === 'independent' && attempt.validation?.passed === true,
    )
    const lastPassedAt = passed.at(-1)?.createdAt
    const lastReviewedAt = lastPassedAt ?? lastAttemptAt
    const openDispute = record.disputes.some(
      dispute => dispute.status === 'open' || dispute.status === 'recheck-due',
    )
    const intervalDays = reviewIntervalDays(record.level, passed.length)
    const common = {
      conceptId: record.conceptId,
      courseId,
      ...(lastReviewedAt === undefined ? {} : { lastReviewedAt }),
    }

    if (openDispute) {
      items.push({
        ...common,
        dueAt: now.toISOString(),
        intervalDays: 0,
        reason: 'after-dispute',
        note: '存在未解决的掌握争议：重检结果会作为新证据，原记录保留。',
      })
      continue
    }
    if (record.needsRecheck === true) {
      items.push({
        ...common,
        dueAt: now.toISOString(),
        intervalDays: 0,
        reason: 'low-mastery',
        note: '资料来源发生变化，需要复核该掌握记录（历史证据保留）。',
      })
      continue
    }
    if (upcoming.has(record.conceptId as string) && record.level !== 'mastered') {
      items.push({
        ...common,
        dueAt: now.toISOString(),
        intervalDays: Math.max(1, intervalDays),
        reason: 'upcoming-course-need',
        note: '后续学习需要该概念，建议先复习再进入新内容。',
      })
      continue
    }

    const reference = lastPassedAt ?? lastAttemptAt
    if (reference === undefined) continue
    const dueAt = addDays(new Date(reference), intervalDays)
    if (dueAt > horizonEnd) continue
    const spaced = record.level === 'mastered' || record.level === 'checked'
    items.push({
      ...common,
      dueAt,
      intervalDays,
      reason: spaced ? 'spaced' : 'low-mastery',
      note: spaced
        ? `间隔复习：距上次独立通过约 ${intervalDays} 天，建议做一次变式或迁移检验。`
        : `掌握尚未稳定（当前等级 ${record.level}），建议尽快复习并补未覆盖维度。`,
    })
  }

  return items.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || (a.conceptId as string).localeCompare(b.conceptId as string))
}
