/**
 * 复习建议测试：间隔计算、薄弱/间隔/后续课程需要/争议/资料变化分支与排序。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LearningAttempt } from '../../src/contracts/learning.ts'
import { attemptId, conceptId, courseId, courseRevisionId, sessionId } from '../../src/contracts/ids.ts'
import { computeReviewItems, reviewIntervalDays } from '../../src/learning/index.ts'
import { makeMasteryFixture, objectiveValidation } from './fixtures.ts'

const NOW = new Date('2026-11-04T00:00:00.000Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function makeAttempt(params: {
  readonly concept: ReturnType<typeof conceptId>
  readonly course: ReturnType<typeof courseId>
  readonly createdAt: string
  readonly passed?: boolean
  readonly independence?: LearningAttempt['independence']
}): LearningAttempt {
  const revision = courseRevisionId()
  return {
    id: attemptId(),
    sessionId: sessionId(),
    courseId: params.course,
    courseRevisionId: revision,
    conceptIds: [params.concept],
    prompt: '题目',
    answerText: '答案',
    helpExposure: { level: 0 },
    independence: params.independence ?? 'independent',
    ...(params.passed === undefined ? {} : { validation: objectiveValidation(params.passed) }),
    createdAt: params.createdAt,
  }
}

describe('reviewIntervalDays 间隔', () => {
  test('等级越高间隔越长，掌握后随独立通过次数翻倍且封顶', () => {
    assert.equal(reviewIntervalDays('exposed', 0), 1)
    assert.equal(reviewIntervalDays('practiced', 0), 2)
    assert.equal(reviewIntervalDays('checked', 1), 4)
    assert.equal(reviewIntervalDays('mastered', 1), 7)
    assert.equal(reviewIntervalDays('mastered', 2), 14)
    assert.equal(reviewIntervalDays('mastered', 10), 56)
    assert.equal(reviewIntervalDays('unseen', 0), 0)
  })
})

describe('computeReviewItems 复习建议', () => {
  test('薄弱概念到期 → low-mastery，dueAt 早于 now', () => {
    const course = courseId()
    const concept = conceptId()
    const mastery = [makeMasteryFixture({ conceptId: concept, courseId: course, level: 'exposed' })]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(3), passed: false })]
    const items = computeReviewItems({ courseId: course, mastery, attempts, now: NOW })
    assert.equal(items.length, 1)
    assert.equal(items[0]?.reason, 'low-mastery')
    assert.ok(items[0]?.dueAt !== undefined && items[0].dueAt <= NOW.toISOString())
    assert.ok(items[0]?.note?.includes('掌握尚未稳定'))
  })

  test('掌握且近期通过：在较短窗口内不打扰', () => {
    const course = courseId()
    const concept = conceptId()
    const mastery = [makeMasteryFixture({ conceptId: concept, courseId: course, level: 'mastered' })]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(2), passed: true })]
    const items = computeReviewItems({
      courseId: course, mastery, attempts, now: NOW, horizonDays: 3,
    })
    assert.equal(items.length, 0)
  })

  test('掌握但超过间隔 → spaced', () => {
    const course = courseId()
    const concept = conceptId()
    const mastery = [makeMasteryFixture({ conceptId: concept, courseId: course, level: 'mastered' })]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(8), passed: true })]
    const items = computeReviewItems({ courseId: course, mastery, attempts, now: NOW })
    assert.equal(items[0]?.reason, 'spaced')
    assert.ok(items[0]?.note?.includes('间隔复习'))
  })

  test('后续课程需要的未掌握概念 → upcoming-course-need 且立即到期', () => {
    const course = courseId()
    const concept = conceptId()
    const mastery = [makeMasteryFixture({ conceptId: concept, courseId: course, level: 'practiced' })]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(1), passed: false })]
    const items = computeReviewItems({
      courseId: course,
      mastery,
      attempts,
      now: NOW,
      upcomingConceptIds: [concept],
    })
    assert.equal(items[0]?.reason, 'upcoming-course-need')
    assert.equal(items[0]?.dueAt, NOW.toISOString())
  })

  test('存在未解决争议 → after-dispute 且立即到期', () => {
    const course = courseId()
    const concept = conceptId()
    const record = makeMasteryFixture({ conceptId: concept, courseId: course, level: 'checked' })
    const mastery = [{
      ...record,
      disputes: [{
        id: 'dispute-1',
        reason: '我认为我的答案也正确',
        createdAt: NOW.toISOString(),
        status: 'open' as const,
      }],
    }]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(1), passed: true })]
    const items = computeReviewItems({ courseId: course, mastery, attempts, now: NOW })
    assert.equal(items[0]?.reason, 'after-dispute')
    assert.equal(items[0]?.intervalDays, 0)
  })

  test('资料变化待复核 → 立即到期且说明原因', () => {
    const course = courseId()
    const concept = conceptId()
    const mastery = [makeMasteryFixture({
      conceptId: concept, courseId: course, level: 'checked', needsRecheck: true,
    })]
    const attempts = [makeAttempt({ concept, course, createdAt: daysAgo(1), passed: true })]
    const items = computeReviewItems({ courseId: course, mastery, attempts, now: NOW })
    assert.equal(items[0]?.reason, 'low-mastery')
    assert.equal(items[0]?.dueAt, NOW.toISOString())
    assert.ok(items[0]?.note?.includes('资料来源发生变化'))
  })

  test('多个概念按 dueAt 升序排序', () => {
    const course = courseId()
    const weak = conceptId()
    const spaced = conceptId()
    const mastery = [
      makeMasteryFixture({ conceptId: weak, courseId: course, level: 'exposed' }),
      makeMasteryFixture({ conceptId: spaced, courseId: course, level: 'mastered' }),
    ]
    const attempts = [
      makeAttempt({ concept: weak, course: course, createdAt: daysAgo(10), passed: false }),
      makeAttempt({ concept: spaced, course: course, createdAt: daysAgo(20), passed: true }),
    ]
    const items = computeReviewItems({ courseId: course, mastery, attempts, now: NOW })
    assert.equal(items.length, 2)
    assert.ok((items[0]?.dueAt ?? '') <= (items[1]?.dueAt ?? ''))
  })

  test('没有学习记录的概念不产生复习项', () => {
    const items = computeReviewItems({
      courseId: courseId(),
      mastery: [],
      attempts: [],
      now: NOW,
    })
    assert.deepEqual(items, [])
  })
})
