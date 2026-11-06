/**
 * Pure tests for guided planning helpers (interview round answers, PlanBrief
 * conversion/validation, candidate selection, task-result parsing).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CoursePlan, PlanBrief, PlanQuestion } from '@deepseek-teaching/core/contracts'
import {
  MAX_PLAN_ROUNDS, answersFromRecommendations, briefToDraft, buildRoundAnswers,
  defaultSelectedCandidateIds, draftToBrief, extractCourseId, interviewComplete, parseCandidates,
  planRoundProgress, recommendedAnswer, taskFailureMessage, toggleCandidateId, validateBriefDraft,
} from '../../src/client/planning-helpers.ts'

function question(id: string, options?: readonly string[], recommendation?: string): PlanQuestion {
  return {
    id,
    title: `问题 ${id}`,
    body: '正文',
    ...(options !== undefined ? { options } : {}),
    ...(recommendation !== undefined ? { recommendation } : {}),
  }
}

function plan(overrides: Partial<CoursePlan> = {}): CoursePlan {
  return {
    id: 'plan-1',
    status: 'interviewing',
    topic: '概率论',
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
    rounds: [],
    decisions: [],
    ...overrides,
  }
}

const BRIEF: PlanBrief = {
  title: '概率论入门',
  goals: ['理解条件期望', '能做基础题'],
  level: '入门',
  background: '学过微积分',
  duration: '4 周',
  weeklyHours: '6',
  language: 'zh',
  chapters: [
    { title: '第一章', topics: ['条件概率', '贝叶斯'], prerequisites: ['概率基础'] },
    { title: '第二章', topics: ['期望', '方差'] },
  ],
  practiceStyle: '每周小测',
  exclusions: ['测度论'],
  searchTopics: ['条件期望', '贝叶斯公式'],
}

test('recommendedAnswer prefers the explicit recommendation then the first option', () => {
  assert.equal(recommendedAnswer(question('q1', ['A', 'B'], 'B')), 'B')
  assert.equal(recommendedAnswer(question('q2', ['A', 'B'])), 'A')
  assert.equal(recommendedAnswer(question('q3')), undefined)
  assert.equal(recommendedAnswer(question('q4', [' '], '')), undefined)
})

test('answersFromRecommendations fills one draft per question', () => {
  const filled = answersFromRecommendations([
    question('q1', ['A'], 'A'),
    question('q2'),
  ])
  assert.deepEqual(filled.q1, { questionId: 'q1', answer: 'A', usedRecommendation: true })
  assert.deepEqual(filled.q2, { questionId: 'q2', answer: '', usedRecommendation: false })
})

test('buildRoundAnswers skips blank answers and marks recommendations', () => {
  const questions = [question('q1'), question('q2'), question('q3')]
  const answers = {
    q1: { questionId: 'q1', answer: ' 自定义 ', usedRecommendation: false },
    q2: { questionId: 'q2', answer: '   ', usedRecommendation: false },
    q3: { questionId: 'q3', answer: '建议', usedRecommendation: true },
  }
  assert.deepEqual(buildRoundAnswers(questions, answers), [
    { questionId: 'q1', answer: '自定义' },
    { questionId: 'q3', answer: '建议', usedRecommendation: true },
  ])
  assert.deepEqual(buildRoundAnswers(questions, {}), [])
})

test('planRoundProgress counts rounds and caps at the max', () => {
  assert.deepEqual(planRoundProgress(plan()), { round: 1, total: MAX_PLAN_ROUNDS, label: '第 1/5 轮' })
  const rounds = Array.from({ length: 2 }, (_, index) => ({ index, questions: [], createdAt: '2026-11-06T00:00:00.000Z' }))
  assert.equal(planRoundProgress(plan({ rounds, frontier: [question('q')] })).round, 3)
  const many = Array.from({ length: 9 }, (_, index) => ({ index, questions: [], createdAt: '2026-11-06T00:00:00.000Z' }))
  assert.equal(planRoundProgress(plan({ rounds: many })).round, MAX_PLAN_ROUNDS)
})

test('interviewComplete is false only while frontier questions remain', () => {
  assert.equal(interviewComplete(plan({ frontier: [question('q')] })), false)
  assert.equal(interviewComplete(plan({ frontier: [] })), true)
  assert.equal(interviewComplete(plan({ status: 'plan-ready' })), true)
})

test('PlanBrief ↔ editable draft round-trips lists and optional fields', () => {
  const draft = briefToDraft(BRIEF)
  assert.equal(draft.title, '概率论入门')
  assert.equal(draft.goals, '理解条件期望\n能做基础题')
  assert.equal(draft.chapters[0]?.topics, '条件概率\n贝叶斯')
  assert.equal(draft.chapters[0]?.prerequisites, '概率基础')
  assert.deepEqual(draftToBrief(draft), BRIEF)

  // Empty optional fields are omitted on the way back; empty chapters dropped.
  const minimal = briefToDraft(undefined, '新主题')
  assert.equal(minimal.title, '新主题')
  assert.equal(minimal.language, 'zh')
  const brief = draftToBrief({ ...minimal, title: ' 课程 ', goals: ' 目标 ', chapters: [], searchTopics: ' 检索 ' })
  assert.deepEqual(brief, {
    title: '课程', goals: ['目标'], language: 'zh', chapters: [], searchTopics: ['检索'],
  })
})

test('validateBriefDraft requires title, goals, a chapter and search topics', () => {
  const valid = briefToDraft(BRIEF)
  assert.equal(validateBriefDraft(valid), undefined)
  assert.match(validateBriefDraft({ ...valid, title: '   ' }) ?? '', /标题/u)
  assert.match(validateBriefDraft({ ...valid, goals: ' ' }) ?? '', /目标/u)
  assert.match(validateBriefDraft({ ...valid, chapters: [{ title: ' ', topics: '', prerequisites: '' }] }) ?? '', /章节/u)
  assert.match(validateBriefDraft({ ...valid, searchTopics: '' }) ?? '', /检索主题/u)
})

test('candidate default selection and toggling', () => {
  const withFlags = plan({
    candidates: [
      { id: 'c1', url: 'https://a', title: 'A', snippet: 's', domain: 'a', status: 'candidate', selected: true },
      { id: 'c2', url: 'https://b', title: 'B', snippet: 's', domain: 'b', status: 'candidate' },
    ],
  })
  assert.deepEqual(defaultSelectedCandidateIds(withFlags), ['c1'])
  assert.deepEqual(defaultSelectedCandidateIds(plan({ selectedCandidateIds: ['c2'], candidates: withFlags.candidates })), ['c2'])
  assert.deepEqual(defaultSelectedCandidateIds(plan()), [])

  assert.deepEqual(toggleCandidateId([], 'c1'), ['c1'])
  assert.deepEqual(toggleCandidateId(['c1', 'c2'], 'c1'), ['c2'])
  assert.deepEqual(toggleCandidateId(['c2'], 'c1'), ['c2', 'c1'])
})

test('parseCandidates is defensive about task results', () => {
  assert.deepEqual(parseCandidates(undefined), [])
  assert.deepEqual(parseCandidates('nope'), [])
  assert.deepEqual(parseCandidates({ candidates: 'nope' }), [])
  const valid = { id: 'c1', url: 'https://a', title: 'A', snippet: 's', domain: 'a', status: 'candidate' }
  assert.deepEqual(parseCandidates({ candidates: [valid, { id: 1 }, null] }), [valid])
})

test('extractCourseId handles both result shapes and task failure messages', () => {
  assert.equal(extractCourseId({ courseId: 'course-1' }), 'course-1')
  assert.equal(extractCourseId({ course: { id: 'course-2' } }), 'course-2')
  assert.equal(extractCourseId({}), undefined)
  assert.equal(extractCourseId(undefined), undefined)

  assert.equal(taskFailureMessage({ status: 'completed' }, '检索'), undefined)
  assert.equal(taskFailureMessage({ status: 'partial' }, '检索'), undefined)
  assert.match(taskFailureMessage({ status: 'failed', error: { message: '网络失败' } }, '检索') ?? '', /检索失败：网络失败/u)
  assert.match(taskFailureMessage({ status: 'cancelled' }, '抓取') ?? '', /抓取已取消/u)
})
