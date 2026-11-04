/**
 * LearningService 集成测试（真实 LocalState + LearningRepository）：
 * 独立性记录、客观验证优先、rubric 路径与降级、掌握维度/等级、争议/重检、
 * 资料变化标记、错题查询、笔记与输入校验。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import type { RubricCriterion } from '../../src/contracts/activity.ts'
import type { AttemptOutcome, AttemptValidation } from '../../src/contracts/learning.ts'
import type { Result } from '../../src/contracts/result.ts'
import {
  createLearningService, createModelRubricAssessor, failedAttempts,
} from '../../src/learning/index.ts'
import type { LearningServiceOptions } from '../../src/learning/index.ts'
import {
  fixedClock, makeAttemptInput, makeIds, makeTempRepository, objectiveValidation, quizValidation,
} from './fixtures.ts'
import type { TempRepository } from './fixtures.ts'

const CLOCK = fixedClock('2026-11-04T00:00:00.000Z')

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) assert.fail(`${result.error.code}: ${result.error.message}`)
  return result.value
}

async function setup(extra: Partial<LearningServiceOptions> = {}): Promise<{
  readonly repo: TempRepository
  readonly service: ReturnType<typeof createLearningService>
}> {
  const repo = await makeTempRepository()
  const service = createLearningService({ repository: repo.repository, clock: CLOCK, ...extra })
  return { repo, service }
}

function masteryOf(outcome: AttemptOutcome, index = 0) {
  const record = outcome.mastery[index]
  assert.ok(record !== undefined, '应返回更新后的掌握记录')
  return record
}

const openPassValidation: AttemptValidation = {
  kind: 'open',
  passed: true,
  evidence: ['学生把概念应用到新情境并说明理由'],
  assessedBy: 'model-rubric',
  confidence: 'medium',
  limits: ['由模型依据 rubric 评价，可能误判'],
  createdAt: '2026-11-04T00:00:00.000Z',
}

const rubricCriteria: readonly RubricCriterion[] = [
  { id: 'explain', label: '解释', weight: 2 },
  { id: 'conditions', label: '条件/反例', weight: 1 },
]

describe('submitAttempt 独立性记录', () => {
  test('客观 quiz 通过：独立、checked、维度/依据/证据 id 落库并可跨实例读取', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: quizValidation(true),
    })))
    assert.equal(outcome.attempt.independence, 'independent')
    assert.equal(outcome.validation.kind, 'quiz')
    const record = masteryOf(outcome)
    assert.equal(record.level, 'checked')
    assert.equal(record.dimensions.conditions, 1)
    assert.equal(record.dimensions.variants, 1)
    assert.equal(record.dimensions.explain, 0)
    assert.ok(record.basis.some(line => line.includes(outcome.attempt.id)))
    assert.ok(record.evidenceAttemptIds.includes(outcome.attempt.id))

    const stored = await env.repo.repository.get(ids.courseId)
    assert.ok(stored !== undefined)
    assert.equal(stored.attempts.length, 1)
    assert.equal(stored.mastery.length, 1)

    const service2 = createLearningService({ repository: env.repo.repository, clock: CLOCK })
    const mastery = unwrap(await service2.listMastery(ids.courseId))
    assert.equal(mastery.length, 1)
    assert.equal(mastery[0]?.level, 'checked')
  })

  test('跳过：记录接触但不产生掌握维度', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      answerText: '   ',
      validation: quizValidation(true),
    })))
    assert.equal(outcome.attempt.independence, 'skipped')
    assert.ok(outcome.independenceNote?.includes('跳过'))
    const record = masteryOf(outcome)
    assert.equal(record.level, 'exposed')
    assert.deepEqual(record.dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
  })

  test('已展示完整答案（含模型代答）：answer-shown，不产生掌握', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      helpLevel: 'full-answer',
      answerRevealed: true,
      answerText: '模型给出的完整答案',
      validation: quizValidation(true),
    })))
    assert.equal(outcome.attempt.independence, 'answer-shown')
    assert.ok(outcome.independenceNote?.includes('模型代答'))
    const record = masteryOf(outcome)
    assert.equal(record.level, 'exposed')
    assert.deepEqual(record.dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
  })

  test('提示层级 2 → assisted，即使验证通过也不产生掌握维度', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      helpLevel: 2,
      hintsSeen: ['提示一', '提示二'],
      validation: quizValidation(true),
    })))
    assert.equal(outcome.attempt.independence, 'assisted')
    assert.equal(outcome.attempt.helpExposure.level, 2)
    assert.equal(masteryOf(outcome).level, 'exposed')
    assert.deepEqual(masteryOf(outcome).dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
  })

  test('层级 0 但看过提示 → assisted（不虚报独立）', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      hintsSeen: ['先看验证误差'],
      validation: quizValidation(true),
    })))
    assert.equal(outcome.attempt.independence, 'assisted')
    assert.equal(masteryOf(outcome).level, 'exposed')
  })

  test('独立但未通过 → practiced（不是 mastered）', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: quizValidation(false),
    })))
    assert.equal(masteryOf(outcome).level, 'practiced')
    assert.deepEqual(masteryOf(outcome).dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
  })

  test('学生自述“懂了”不能替代独立证据', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      answerText: '',
      selfReport: 'understood',
    })))
    assert.equal(outcome.attempt.independence, 'skipped')
    assert.equal(masteryOf(outcome).level, 'exposed')
  })
})

describe('submitAttempt 验证优先级与 rubric', () => {
  test('客观验证优先：提供 objective 结果时绝不调用模型评分', async (t) => {
    let assessCalls = 0
    const env = await setup({
      rubric: {
        resolve: () => rubricCriteria,
        assess: async () => {
          assessCalls += 1
          return openPassValidation
        },
      },
    })
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: objectiveValidation(false),
    })))
    assert.equal(assessCalls, 0, '客观验证存在时不应调用模型评分')
    assert.equal(outcome.validation.kind, 'objective')
    assert.equal(outcome.validation.passed, false)
    assert.equal(masteryOf(outcome).level, 'practiced')
  })

  test('没有客观验证时走 rubric：通过并记录 assessedBy=model-rubric 与 limits', async (t) => {
    const model = new ScriptedModelClient([{
      kind: 'json',
      value: {
        scores: [
          { criterionId: 'explain', score: 9, note: '解释清楚' },
          { criterionId: 'conditions', score: 8, note: '举了反例' },
        ],
        evidence: ['学生答案第二段'],
        limits: ['未讨论边界'],
        confidence: 'high',
      },
    }])
    const env = await setup({
      rubric: { resolve: () => rubricCriteria, assess: createModelRubricAssessor(model) },
    })
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      prompt: '请解释过拟合并举一个反例',
      answerText: '过拟合是……反例是……',
    })))
    assert.equal(outcome.validation.kind, 'rubric')
    assert.equal(outcome.validation.passed, true)
    assert.equal(outcome.validation.assessedBy, 'model-rubric')
    assert.equal(outcome.validation.confidence, 'medium')
    assert.ok(outcome.validation.limits !== undefined && outcome.validation.limits.length > 0)
    const record = masteryOf(outcome)
    assert.equal(record.level, 'checked')
    assert.equal(record.dimensions.explain, 1)
    assert.equal(record.dimensions.conditions, 1)
  })

  test('rubric 坏 JSON：降级为 unverified，不产生掌握维度，原文保留', async (t) => {
    const model = new ScriptedModelClient([{ kind: 'text', text: '我无法按 JSON 输出评分' }])
    const env = await setup({
      rubric: { resolve: () => rubricCriteria, assess: createModelRubricAssessor(model) },
    })
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids)))
    assert.equal(outcome.validation.kind, 'unverified')
    assert.equal(outcome.validation.assessedBy, 'none')
    assert.equal(outcome.validation.passed, undefined)
    assert.ok(outcome.validation.limits?.some(limit => limit.includes('无法解析')))
    assert.equal(outcome.attempt.answerText, '训练误差很低，但验证误差变高。')
    assert.equal(masteryOf(outcome).level, 'practiced')
    assert.deepEqual(masteryOf(outcome).dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
  })

  test('rubric 模型失败：降级为 unverified 并记录失败原因', async (t) => {
    const model = new ScriptedModelClient([{ kind: 'error', code: 'network', message: '连接超时' }])
    const env = await setup({
      rubric: { resolve: () => rubricCriteria, assess: createModelRubricAssessor(model) },
    })
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids)))
    assert.equal(outcome.validation.kind, 'unverified')
    assert.ok(outcome.validation.limits?.some(limit => limit.includes('失败')))
  })

  test('开放题“通过”但 assessedBy=none：来源不明，不计入掌握维度', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: {
        kind: 'open',
        passed: true,
        assessedBy: 'none',
        confidence: 'unknown',
      },
    })))
    assert.equal(outcome.validation.kind, 'open')
    assert.equal(outcome.validation.passed, true)
    const record = masteryOf(outcome)
    assert.deepEqual(record.dimensions, { explain: 0, conditions: 0, variants: 0, transfer: 0 })
    assert.equal(record.level, 'practiced')
  })

  test('rubric 评分器抛异常：服务捕获并降级，不把异常穿透 Host', async (t) => {
    const env = await setup({
      rubric: {
        resolve: () => rubricCriteria,
        assess: async () => {
          throw new Error('评分器崩溃')
        },
      },
    })
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids)))
    assert.equal(outcome.validation.kind, 'unverified')
    assert.ok(outcome.validation.limits?.some(limit => limit.includes('评分器崩溃')))
  })
})

describe('掌握等级推进', () => {
  test('单次证据不轻易 mastered：一次开放题通过只到 checked', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: openPassValidation,
    })))
    const record = masteryOf(outcome)
    assert.equal(record.level, 'checked')
    assert.equal(record.dimensions.explain, 1)
    assert.equal(record.dimensions.transfer, 1)
    assert.ok(record.uncovered.some(item => item.includes('conditions')))
    assert.ok(record.uncovered.some(item => item.includes('variants')))
  })

  test('多维度 + 多次独立通过 → mastered，并保留全部证据 id', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const first = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: quizValidation(true),
    })))
    const second = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      prompt: '把过拟合放到一个新情境中解释',
      answerText: '在医疗诊断中……',
      validation: openPassValidation,
    })))
    const record = masteryOf(second)
    assert.equal(record.level, 'mastered')
    assert.deepEqual(record.dimensions, { explain: 1, conditions: 1, variants: 1, transfer: 1 })
    assert.ok(record.evidenceAttemptIds.includes(first.attempt.id))
    assert.ok(record.evidenceAttemptIds.includes(second.attempt.id))
    assert.ok(record.basis.some(line => line.includes(first.attempt.id)))
    assert.ok(record.basis.some(line => line.includes(second.attempt.id)))
    assert.deepEqual(record.uncovered, [])
  })

  test('已 mastered 后资料变化 → needsRecheck 且等级封顶 checked（历史保留）', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    unwrap(await env.service.submitAttempt(makeAttemptInput(ids, { validation: quizValidation(true) })))
    unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      prompt: '迁移题', answerText: '新情境应用', validation: openPassValidation,
    })))
    const stale = unwrap(await env.service.markStaleForSources(ids.courseId, [ids.conceptId], '教材第 2 章已更新'))
    assert.equal(stale.length, 1)
    const record = stale[0]
    assert.ok(record !== undefined)
    assert.equal(record.needsRecheck, true)
    assert.equal(record.level, 'checked')
    assert.ok(record.basis.some(line => line.includes('资料变化')))
    assert.equal(record.evidenceAttemptIds.length, 2)
    const stored = await env.repo.repository.get(ids.courseId)
    assert.ok(stored !== undefined)
    assert.equal(stored.attempts.length, 2)
    assert.ok(stored.attempts.every(attempt => attempt.needsRecheck === true))
    const review = unwrap(await env.service.listReview(ids.courseId))
    assert.ok(review.some(item => item.note?.includes('资料来源发生变化')))
  })
})

describe('争议与重检', () => {
  test('争议→重检：保留原判定/依据/尝试，状态推进且复习项标 after-dispute', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const outcome = unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      validation: quizValidation(true),
    })))
    const attemptId = outcome.attempt.id
    const disputed = unwrap(await env.service.dispute(ids.courseId, ids.conceptId, '我认为我的答案也满足要求'))
    assert.equal(disputed.level, 'checked', '争议不覆盖原判定')
    assert.equal(disputed.disputes.length, 1)
    assert.equal(disputed.disputes[0]?.status, 'open')
    assert.ok(disputed.basis.some(line => line.includes('学生异议')))
    assert.ok(disputed.evidenceAttemptIds.includes(attemptId))

    const reviewAfterDispute = unwrap(await env.service.listReview(ids.courseId))
    assert.ok(reviewAfterDispute.some(item => item.reason === 'after-dispute'))

    const rechecked = unwrap(await env.service.recheck(ids.courseId, ids.conceptId))
    assert.equal(rechecked.record.disputes[0]?.status, 'recheck-due')
    assert.ok(rechecked.plan.length > 0)
    assert.ok(rechecked.plan.some(item => item.includes('重检结果')))
    assert.equal(rechecked.record.level, 'checked')
    assert.ok(rechecked.record.evidenceAttemptIds.includes(attemptId))

    const stored = await env.repo.repository.get(ids.courseId)
    assert.ok(stored !== undefined)
    assert.equal(stored.attempts.length, 1, '重检不删除历史尝试')
    assert.equal(stored.mastery[0]?.disputes.length, 1)
  })

  test('对不存在的概念提异议 → not-found', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const result = await env.service.dispute(ids.courseId, ids.conceptId, '理由')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'not-found')
  })

  test('空异议说明 → invalid-input', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const result = await env.service.dispute(ids.courseId, ids.conceptId, '  ')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, 'invalid-input')
  })
})

describe('查询、错题、笔记与输入校验', () => {
  test('错题查询：未通过验证的尝试可被 failedAttempts 找到', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    unwrap(await env.service.submitAttempt(makeAttemptInput(ids, { validation: quizValidation(false) })))
    unwrap(await env.service.submitAttempt(makeAttemptInput(ids, {
      sessionId: makeIds().sessionId,
      validation: quizValidation(true),
    })))
    const attempts = unwrap(await env.service.listAttempts({ courseId: ids.courseId }))
    assert.equal(attempts.length, 2)
    assert.equal(failedAttempts(attempts).length, 1)
    const sessionFiltered = unwrap(await env.service.listAttempts({ sessionId: ids.sessionId }))
    assert.equal(sessionFiltered.length, 1)
  })

  test('getRecord：无记录返回空记录；有 resolveRevisionId 时带上课程修订 id', async (t) => {
    const repo = await makeTempRepository()
    t.after(repo.cleanup)
    const ids = makeIds()
    const service = createLearningService({
      repository: repo.repository,
      clock: CLOCK,
      resolveRevisionId: () => ids.courseRevisionId,
    })
    const record = unwrap(await service.getRecord(ids.courseId))
    assert.deepEqual(record.attempts, [])
    assert.deepEqual(record.mastery, [])
    assert.equal(record.courseRevisionId, ids.courseRevisionId)
  })

  test('saveNote：新建、修改、空内容拒绝', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const note = unwrap(await env.service.saveNote({
      courseId: ids.courseId,
      conceptId: ids.conceptId,
      markdown: '我的笔记：验证集用来估计泛化误差。',
    }))
    assert.ok(note.markdown.includes('验证集'))
    const updated = unwrap(await env.service.saveNote({
      courseId: ids.courseId,
      id: note.id,
      markdown: '更新后的笔记',
    }))
    assert.equal(updated.markdown, '更新后的笔记')
    const record = unwrap(await env.service.getRecord(ids.courseId))
    assert.equal(record.notes.length, 1)
    const invalid = await env.service.saveNote({ courseId: ids.courseId, markdown: '   ' })
    assert.equal(invalid.ok, false)
    if (!invalid.ok) assert.equal(invalid.error.code, 'invalid-input')
  })

  test('输入校验：缺少必需字段 → invalid-input', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const bad = await env.service.submitAttempt(makeAttemptInput(ids, {
      sessionId: '' as never,
    }))
    assert.equal(bad.ok, false)
    if (!bad.ok) assert.equal(bad.error.code, 'invalid-input')
    const badHelp = await env.service.submitAttempt(makeAttemptInput(ids, {
      helpLevel: 7 as never,
    }))
    assert.equal(badHelp.ok, false)
  })

  test('listReview 无记录返回空数组', async (t) => {
    const env = await setup()
    t.after(env.repo.cleanup)
    const ids = makeIds()
    const review = unwrap(await env.service.listReview(ids.courseId))
    assert.deepEqual(review, [])
  })
})
