/**
 * rubric 评价测试：加权聚合、缺项、越界裁剪、从活动取 rubric，
 * 以及模型评分器的成功/坏 JSON/调用失败降级与语言提示。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import type { RubricCriterion } from '../../src/contracts/activity.ts'
import {
  aggregateRubric, createModelRubricAssessor, degradedValidation, rubricFromActivityPayload,
} from '../../src/learning/index.ts'
import { makeAttemptInput, makeIds } from './fixtures.ts'

const criteria: readonly RubricCriterion[] = [
  { id: 'explain', label: '解释清楚', weight: 2, description: '能用自己的话解释' },
  { id: 'conditions', label: '条件/反例', weight: 1 },
]

describe('aggregateRubric 加权聚合', () => {
  test('加权得分达到阈值 → passed', () => {
    const result = aggregateRubric([
      { criterionId: 'explain', score: 10, maxScore: 10 },
      { criterionId: 'conditions', score: 5, maxScore: 10 },
    ], criteria)
    assert.equal(result.ratio, (2 * 1 + 1 * 0.5) / 3)
    assert.equal(result.passed, true)
    assert.deepEqual(result.missingCriteria, [])
  })

  test('缺评分项 → passed=false 并列出缺项', () => {
    const result = aggregateRubric([
      { criterionId: 'explain', score: 10, maxScore: 10 },
    ], criteria)
    assert.equal(result.passed, false)
    assert.deepEqual(result.missingCriteria, ['conditions'])
    assert.ok(result.notes.some(note => note.includes('缺失')))
  })

  test('越界分数被裁剪，非法 maxScore 被忽略', () => {
    const result = aggregateRubric([
      { criterionId: 'explain', score: 99, maxScore: 10 },
      { criterionId: 'conditions', score: 10, maxScore: 0 },
    ], criteria)
    // conditions 非法 maxScore 被忽略 → 视为缺项。
    assert.deepEqual(result.missingCriteria, ['conditions'])
    assert.ok(result.ratio <= 1)
  })

  test('阈值可配置', () => {
    const scores = [
      { criterionId: 'explain', score: 6, maxScore: 10 },
      { criterionId: 'conditions', score: 6, maxScore: 10 },
    ]
    assert.equal(aggregateRubric(scores, criteria, 0.6).passed, true)
    assert.equal(aggregateRubric(scores, criteria, 0.8).passed, false)
  })

  test('空 rubric → ratio 0 且不通过', () => {
    const result = aggregateRubric([], [])
    assert.equal(result.ratio, 0)
    assert.equal(result.passed, false)
  })
})

describe('rubricFromActivityPayload', () => {
  test('证明/开放题返回 rubric，quiz 返回 undefined', () => {
    const proof = rubricFromActivityPayload({
      type: 'proof-task',
      claim: '命题',
      assumptions: [],
      rubric: criteria,
    })
    assert.deepEqual(proof, criteria)
    const open = rubricFromActivityPayload({
      type: 'open-question',
      prompt: '问题',
      rubric: criteria,
    })
    assert.deepEqual(open, criteria)
    const quiz = rubricFromActivityPayload({
      type: 'quiz',
      question: '问题',
      options: [{ id: 'a', label: 'A' }],
      correctOptionIds: ['a'],
    })
    assert.equal(quiz, undefined)
  })
})

describe('createModelRubricAssessor 模型评分', () => {
  test('合法 JSON：返回 rubric 验证，assessedBy=model-rubric，confidence 上限 medium', async () => {
    const model = new ScriptedModelClient([{
      kind: 'json',
      value: {
        scores: [
          { criterionId: 'explain', score: 9, note: '学生用自己的话解释了' },
          { criterionId: 'conditions', score: 8, note: '举了反例' },
        ],
        evidence: ['学生答案第一段'],
        limits: ['学生没有讨论边界情况'],
        confidence: 'high',
      },
    }])
    const assessor = createModelRubricAssessor(model, { language: 'zh' })
    const ids = makeIds()
    const validation = await assessor({ input: makeAttemptInput(ids), rubric: criteria })
    assert.equal(validation.kind, 'rubric')
    assert.equal(validation.passed, true)
    assert.equal(validation.assessedBy, 'model-rubric')
    assert.equal(validation.confidence, 'medium', '模型自评 confidence 上限为 medium')
    assert.equal(validation.rubric?.length, 2)
    assert.ok(validation.limits?.some(limit => limit.includes('模型')))
    assert.ok(validation.evidence?.includes('学生答案第一段'))
  })

  test('坏 JSON：降级为 unverified，带 limits，不假装通过', async () => {
    const model = new ScriptedModelClient([{ kind: 'text', text: '抱歉，我无法按 JSON 输出。' }])
    const assessor = createModelRubricAssessor(model)
    const validation = await assessor({ input: makeAttemptInput(makeIds()), rubric: criteria })
    assert.equal(validation.kind, 'unverified')
    assert.equal(validation.passed, undefined)
    assert.equal(validation.assessedBy, 'none')
    assert.equal(validation.confidence, 'unknown')
    assert.ok(validation.limits?.some(limit => limit.includes('无法解析')))
  })

  test('模型调用失败：降级为 unverified 并记录失败原因', async () => {
    const model = new ScriptedModelClient([{ kind: 'error', code: 'network', message: '断网' }])
    const assessor = createModelRubricAssessor(model)
    const validation = await assessor({ input: makeAttemptInput(makeIds()), rubric: criteria })
    assert.equal(validation.kind, 'unverified')
    assert.ok(validation.limits?.some(limit => limit.includes('失败')))
    assert.ok(validation.limits?.some(limit => limit.includes('断网')))
  })

  test('评分项 id 不匹配：降级为 unverified（不拿未知分数凑通过）', async () => {
    const model = new ScriptedModelClient([{
      kind: 'json',
      value: { scores: [{ criterionId: 'unknown', score: 10 }], confidence: 'high' },
    }])
    const assessor = createModelRubricAssessor(model)
    const validation = await assessor({ input: makeAttemptInput(makeIds()), rubric: criteria })
    assert.equal(validation.kind, 'unverified')
  })

  test('缺评分项：passed=false，limits 说明未覆盖项', async () => {
    const model = new ScriptedModelClient([{
      kind: 'json',
      value: {
        scores: [{ criterionId: 'explain', score: 10 }],
        confidence: 'medium',
      },
    }])
    const assessor = createModelRubricAssessor(model)
    const validation = await assessor({ input: makeAttemptInput(makeIds()), rubric: criteria })
    assert.equal(validation.kind, 'rubric')
    assert.equal(validation.passed, false)
    assert.ok(validation.limits?.some(limit => limit.includes('缺少评分项')))
  })

  test('语言提示：en 要求英文理由，bilingual 要求中英术语', async () => {
    const enModel = new ScriptedModelClient([{ kind: 'json', value: { scores: [{ criterionId: 'explain', score: 8 }] } }])
    await createModelRubricAssessor(enModel, { language: 'en' })({
      input: makeAttemptInput(makeIds()), rubric: criteria,
    })
    assert.ok((enModel.calls[0]?.messages[0]?.text ?? '').includes('英文'))

    const biModel = new ScriptedModelClient([{ kind: 'json', value: { scores: [{ criterionId: 'explain', score: 8 }] } }])
    await createModelRubricAssessor(biModel, { language: 'bilingual' })({
      input: makeAttemptInput(makeIds()), rubric: criteria,
    })
    assert.ok((biModel.calls[0]?.messages[0]?.text ?? '').includes('双语'))
  })
})

describe('degradedValidation', () => {
  test('降级结果永远是 unverified 且带 limits', () => {
    const validation = degradedValidation('测试原因')
    assert.equal(validation.kind, 'unverified')
    assert.equal(validation.passed, undefined)
    assert.equal(validation.assessedBy, 'none')
    assert.ok(validation.limits?.some(limit => limit.includes('测试原因')))
  })
})
