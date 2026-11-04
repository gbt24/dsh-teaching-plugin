/**
 * 端到端单元级教学流转（ScriptedModelClient 确定性）：
 * 讲解（有资料）→ 尝试（客观验证）→ 诊断（学生答错）→ 练习（活动提案）→ 迁移（开放题 rubric）
 * 最后检查掌握等级、证据 id、复习建议与持久化。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import type { TeachingStreamEvent } from '../../src/contracts/teaching.ts'
import { createTeachingService } from '../../src/teaching/index.ts'
import { createLearningService } from '../../src/learning/index.ts'
import type { Result } from '../../src/contracts/result.ts'
import { collectEvents, makeCourseFixture, makeTurnInput, replyWithMeta } from './fixtures.ts'
import {
  fixedClock, makeAttemptInput, makeTempRepository, quizValidation,
} from '../learning/fixtures.ts'

const CLOCK = fixedClock('2026-11-04T00:00:00.000Z')

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) assert.fail(`${result.error.code}: ${result.error.message}`)
  return result.value
}

function doneOf(events: readonly TeachingStreamEvent[]): Extract<TeachingStreamEvent, { type: 'done' }> {
  const done = events.find(event => event.type === 'done')
  assert.ok(done !== undefined && done.type === 'done')
  return done
}

test('完整流转：讲解 → 尝试 → 诊断 → 练习 → 迁移，掌握与复习如实更新', async (t) => {
  const fixture = makeCourseFixture()
  const repo = await makeTempRepository()
  t.after(repo.cleanup)
  const teaching = createTeachingService()
  const learning = createLearningService({
    repository: repo.repository,
    clock: CLOCK,
    reviewHorizonDays: 30,
  })
  const baseInput = makeTurnInput(fixture)
  const ids = {
    sessionId: baseInput.sessionId,
    courseId: fixture.course.id,
    courseRevisionId: fixture.revision.id,
    conceptId: fixture.overfittingId,
  }

  // 1) 讲解：课程资料优先，证据回填真实 anchor。
  const explainModel = new ScriptedModelClient([{
    kind: 'text',
    text: replyWithMeta(
      '## 直觉\n\n过拟合像把练习题答案背下来 [M1]。\n\n## 准确表述\n\n训练误差低但泛化误差高。',
      {
        intent: 'explain',
        stage: 'teaching',
        conceptIds: [fixture.overfittingId],
        evidence: { usedMaterialRefs: ['M1'], usedModelKnowledge: false },
        nextActions: [{ id: 'start-practice', label: '开始练习' }],
      },
    ),
  }])
  const explainEvents = await collectEvents(teaching.respond(baseInput, explainModel))
  const explainDone = doneOf(explainEvents)
  assert.equal(explainDone.meta.stage, 'teaching')
  assert.equal(explainDone.meta.intent, 'explain')
  assert.ok(explainDone.evidenceRefs.some(ref => ref.kind === 'course-source'))
  assert.ok(explainDone.meta.nextActions?.some(action => action.id === 'start-practice'))

  // 2) 尝试：客观 quiz 通过 → 独立完成，贡献 conditions/variants。
  const firstAttempt = unwrap(await learning.submitAttempt(makeAttemptInput(ids, {
    prompt: '哪个现象最能说明过拟合？',
    answerText: '训练误差很低但验证误差高',
    selectedOptionIds: ['b'],
    validation: quizValidation(true),
  })))
  assert.equal(firstAttempt.attempt.independence, 'independent')
  const checked = firstAttempt.mastery[0]
  assert.ok(checked !== undefined)
  assert.equal(checked.level, 'checked')
  assert.equal(checked.dimensions.conditions, 1)
  assert.equal(checked.dimensions.variants, 1)

  // 3) 诊断：学生答错后给出针对性诊断，而不是只给正确答案。
  const diagnoseModel = new ScriptedModelClient([{
    kind: 'text',
    text: replyWithMeta(
      '你选了 a，说明你把“训练误差低”当成了泛化好。我们用一个反例看看边界。',
      {
        intent: 'diagnose',
        stage: 'diagnosis',
        conceptIds: [fixture.overfittingId],
        evidence: { usedMaterialRefs: ['M1'] },
        diagnosis: {
          misconception: '把训练误差低当成泛化好',
          evidence: '学生选择 a（训练误差高）',
          nextStep: '做一道区分训练/验证误差的变式题',
        },
        nextActions: [{ id: 'start-practice', label: '做题检验' }],
      },
    ),
  }])
  const practiceInput = makeTurnInput(fixture, {
    stage: 'practice',
    studentText: '我选了 a，但不知道为什么错。',
    history: [],
  })
  const diagnoseEvents = await collectEvents(teaching.respond(practiceInput, diagnoseModel))
  const diagnoseDone = doneOf(diagnoseEvents)
  assert.equal(diagnoseDone.meta.intent, 'diagnose')
  assert.equal(diagnoseDone.meta.stage, 'diagnosis')
  const position = diagnoseEvents.find(event => event.type === 'position')
  assert.ok(position !== undefined && position.type === 'position')
  assert.equal(position.stage, 'diagnosis')

  // 4) 练习：诊断后给出可检验活动，活动服务于当前概念。
  const practiceModel = new ScriptedModelClient([{
    kind: 'text',
    text: replyWithMeta('做这道变式题，注意训练误差与验证误差的差别。', {
      intent: 'practice',
      stage: 'practice',
      conceptIds: [fixture.overfittingId],
      activity: {
        kind: 'quiz',
        title: '训练误差 vs 验证误差',
        goal: '检验能否区分训练误差与泛化误差',
        conceptIds: [fixture.overfittingId],
        payload: {
          type: 'quiz',
          question: '训练误差很低、验证误差很高，最可能是什么问题？',
          options: [
            { id: 'a', label: '欠拟合' },
            { id: 'b', label: '过拟合' },
          ],
          correctOptionIds: ['b'],
        },
      },
    }),
  }])
  const practiceTurnInput = makeTurnInput(fixture, {
    stage: 'diagnosis',
    studentText: '好，给我一道题。',
  })
  const practiceEvents = await collectEvents(teaching.respond(practiceTurnInput, practiceModel))
  const proposal = practiceEvents.flatMap(event => (event.type === 'activity' ? [event.proposal] : []))[0]
  assert.ok(proposal !== undefined)
  assert.equal(proposal.kind, 'quiz')
  assert.equal(proposal.independent, true)
  assert.equal(proposal.verification.kind, 'objective')
  assert.ok(proposal.sourceRefs.length > 0)
  const practiceDone = doneOf(practiceEvents)
  assert.equal(practiceDone.meta.stage, 'practice')

  // 5) 迁移：开放题按 rubric 通过（Host 提供 model-rubric 验证），贡献 explain/transfer。
  const transferAttempt = unwrap(await learning.submitAttempt(makeAttemptInput(ids, {
    prompt: '在医疗诊断场景中，如何判断模型是否过拟合？请说明理由。',
    answerText: '比较训练集和独立验证集的表现；如果训练集很好而验证集明显变差，说明可能过拟合……',
    validation: {
      kind: 'rubric',
      passed: true,
      rubric: [
        { criterionId: 'explain', score: 9, maxScore: 10 },
        { criterionId: 'transfer', score: 8, maxScore: 10 },
      ],
      evidence: ['学生把概念应用到医疗诊断情境'],
      assessedBy: 'model-rubric',
      confidence: 'medium',
      limits: ['由模型 rubric 评价，可提出异议并重检'],
      createdAt: '2026-11-04T00:00:00.000Z',
    },
  })))
  const mastered = transferAttempt.mastery[0]
  assert.ok(mastered !== undefined)
  assert.equal(mastered.level, 'mastered')
  assert.deepEqual(mastered.dimensions, { explain: 1, conditions: 1, variants: 1, transfer: 1 })
  assert.equal(mastered.uncovered.length, 0)
  assert.equal(mastered.evidenceAttemptIds.length, 2)
  assert.ok(mastered.evidenceAttemptIds.includes(firstAttempt.attempt.id))
  assert.ok(mastered.evidenceAttemptIds.includes(transferAttempt.attempt.id))

  // 复习建议：掌握后的间隔复习项存在且理由合理。
  const review = unwrap(await learning.listReview(ids.courseId))
  assert.ok(review.length >= 1)
  assert.equal(review[0]?.conceptId, fixture.overfittingId)
  assert.equal(review[0]?.reason, 'spaced')

  // 持久化：两次尝试都在，跨实例可读。
  const stored = await repo.repository.get(ids.courseId)
  assert.ok(stored !== undefined)
  assert.equal(stored.attempts.length, 2)
  assert.equal(stored.mastery.length, 1)
  const reloaded = createLearningService({ repository: repo.repository, clock: CLOCK })
  const mastery = unwrap(await reloaded.listMastery(ids.courseId))
  assert.equal(mastery[0]?.level, 'mastered')

  // 三个教学回合都带 sessionId，且没有直接联网（ScriptedModelClient 无网络实现）。
  assert.equal(explainModel.calls.length, 1)
  assert.equal(diagnoseModel.calls.length, 1)
  assert.equal(practiceModel.calls.length, 1)
  assert.equal(explainModel.calls[0]?.sessionId, ids.sessionId)

  // 分类接口可用于 Host 选择流程。
  const classifyModel = new ScriptedModelClient([{
    kind: 'json',
    value: { intent: 'practice', conceptIds: [fixture.overfittingId] },
  }])
  const meta = await teaching.classify(makeTurnInput(fixture, {
    stage: 'practice',
    studentText: '再给我一道题',
  }), classifyModel)
  assert.equal(meta.intent, 'practice')
})
