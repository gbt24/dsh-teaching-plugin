/**
 * 教学策略纯函数测试：任务形态识别、形式选择与切换、位置恢复、活动匹配、
 * 语言指令与规则分类。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activityCanBeIndependent, activityKindCompatible, buildNextActions, decideNextPosition,
  detectRequestedForm, detectTaskShape, heuristicClassify, isSideQuestion, languageInstruction,
  planTeachingTurn, resolveLanguage, styleGuidance,
} from '../../src/teaching/index.ts'
import { makeCourseFixture, makeProfile, makeTurnInput } from './fixtures.ts'

const fixture = makeCourseFixture()

describe('detectTaskShape 任务形态', () => {
  test('证明类目标识别为 proof', () => {
    const input = makeTurnInput(fixture, {
      profile: makeProfile({ goals: '能独立完成中值定理的证明' }),
      currentConceptId: fixture.overfittingId,
    })
    assert.equal(detectTaskShape(input), 'proof')
  })

  test('编程/SICP 目标识别为 procedure', () => {
    const input = makeTurnInput(fixture, {
      profile: makeProfile({ goals: '用 Scheme 实现递归过程' }),
      course: { ...fixture.course, title: 'SICP' },
    })
    assert.equal(detectTaskShape(input), 'procedure')
  })

  test('阅读任务识别为 reading', () => {
    const input = makeTurnInput(fixture, { studentText: '帮我读一下教材第 2 章' })
    assert.equal(detectTaskShape(input), 'reading')
  })

  test('辨析任务识别为 contrast', () => {
    const input = makeTurnInput(fixture, { studentText: '过拟合和欠拟合有什么区别？' })
    assert.equal(detectTaskShape(input), 'contrast')
  })

  test('开放式论证识别为 open-argument', () => {
    const input = makeTurnInput(fixture, { studentText: '请论证正则化是否总是有益' })
    assert.equal(detectTaskShape(input), 'open-argument')
  })

  test('考研习题识别为 problem-set', () => {
    const input = makeTurnInput(fixture, { profile: makeProfile({ goals: '考研数学 140+' }) })
    assert.equal(detectTaskShape(input), 'problem-set')
  })

  test('没有关键词时默认 concept', () => {
    const input = makeTurnInput(fixture, {
      studentText: '什么是过拟合？',
      profile: makeProfile({ goals: undefined, background: undefined }),
    })
    assert.equal(detectTaskShape(input), 'concept')
  })
})

describe('detectRequestedForm 学生要求切换形式', () => {
  test('画图 → visual', () => {
    assert.equal(detectRequestedForm('画图解释一下')?.form, 'visual')
  })
  test('完整证明 → formal', () => {
    assert.equal(detectRequestedForm('先给完整证明')?.form, 'formal')
  })
  test('直接给答案 → answer-first', () => {
    assert.equal(detectRequestedForm('直接告诉我答案')?.form, 'answer-first')
  })
  test('对比 → concept-contrast', () => {
    assert.equal(detectRequestedForm('对比一下这两个概念')?.form, 'concept-contrast')
  })
  test('无关文本返回 undefined', () => {
    assert.equal(detectRequestedForm('今天天气不错'), undefined)
  })
})

describe('planTeachingTurn 形式选择', () => {
  test('概念任务默认直觉优先，骨架包含直觉/准确表述/条件/类比边界', () => {
    const input = makeTurnInput(fixture, {
      studentText: '什么是过拟合？',
      profile: makeProfile({ goals: undefined }),
    })
    const plan = planTeachingTurn(input)
    assert.equal(plan.form, 'intuition-first')
    assert.deepEqual(plan.outline, ['直觉入口', '准确表述', '适用条件', '类比边界'])
    assert.equal(plan.activityKindHint, 'explanation')
  })

  test('证明任务选择 formal 骨架', () => {
    const input = makeTurnInput(fixture, { profile: makeProfile({ goals: '完成证明' }) })
    const plan = planTeachingTurn(input)
    assert.equal(plan.form, 'formal')
    assert.ok(plan.outline.includes('证明骨架'))
  })

  test('学生要求切换时 keepGoal=true 且形式被覆盖', () => {
    const input = makeTurnInput(fixture, { requestedForm: '画图解释' })
    const plan = planTeachingTurn(input)
    assert.equal(plan.form, 'visual')
    assert.equal(plan.keepGoal, true)
  })

  test('要求完整答案时形式为 answer-first', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { wantsFullAnswer: true }))
    assert.equal(plan.form, 'answer-first')
    assert.equal(plan.keepGoal, true)
  })

  test('诊断阶段选择 diagnosis', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { stage: 'diagnosis' }))
    assert.equal(plan.form, 'diagnosis')
    assert.equal(plan.diagnosisFirst, true)
  })

  test('已掌握概念在讲解阶段转为复习', () => {
    const input = makeTurnInput(fixture, {
      learning: [{ conceptId: fixture.overfittingId, level: 'mastered', basis: ['两次独立通过'] }],
    })
    assert.equal(planTeachingTurn(input).form, 'review')
  })

  test('练习阶段活动建议为 quiz', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { stage: 'practice' }))
    assert.equal(plan.activityKindHint, 'quiz')
  })

  test('阅读任务但没有资料：退化为直觉讲解并说明资料不足', () => {
    const withMaterial = makeTurnInput(fixture, { studentText: '帮我读一下教材第 2 章' })
    assert.equal(planTeachingTurn(withMaterial).form, 'reading-guided')
    const noMaterial = makeTurnInput(fixture, { studentText: '帮我读一下教材第 2 章', material: [] })
    const plan = planTeachingTurn(noMaterial)
    assert.equal(plan.form, 'intuition-first')
    assert.ok(plan.formReason.includes('没有检索到可定位的课程资料'))
  })

  test('语言由 input.language 优先、profile 兜底', () => {
    const input = makeTurnInput(fixture, { language: 'en', profile: makeProfile({ language: 'zh' }) })
    assert.equal(resolveLanguage(input), 'en')
    const fallback = makeTurnInput(fixture, {
      language: undefined,
      profile: makeProfile({ language: 'bilingual' }),
    })
    assert.equal(resolveLanguage(fallback), 'bilingual')
  })
})

describe('decideNextPosition 位置与恢复', () => {
  test('练习中的临时追问保持 practice', () => {
    const input = makeTurnInput(fixture, {
      stage: 'practice',
      studentText: '为什么要用验证集？',
    })
    const position = decideNextPosition(input, { intent: 'explain', stage: 'teaching' })
    assert.equal(position.stage, 'practice')
    assert.equal(isSideQuestion(input, { intent: 'explain', stage: 'teaching' }), true)
  })

  test('学生要求练习时从 teaching 进入 practice', () => {
    const input = makeTurnInput(fixture, { stage: 'teaching' })
    assert.equal(decideNextPosition(input, { intent: 'practice', stage: 'teaching' }).stage, 'practice')
  })

  test('feedback 保持练习/迁移阶段', () => {
    const transfer = makeTurnInput(fixture, { stage: 'transfer' })
    assert.equal(decideNextPosition(transfer, { intent: 'feedback' }).stage, 'transfer')
    const practice = makeTurnInput(fixture, { stage: 'practice' })
    assert.equal(decideNextPosition(practice, { intent: 'feedback' }).stage, 'practice')
  })

  test('复习意图进入 review', () => {
    assert.equal(decideNextPosition(makeTurnInput(fixture), { intent: 'review' }).stage, 'review')
  })

  test('模型给出的合法 stage 被采用（非临时追问时）', () => {
    const input = makeTurnInput(fixture, { stage: 'teaching', studentText: '我懂了' })
    assert.equal(decideNextPosition(input, { intent: 'explain', stage: 'transfer' }).stage, 'transfer')
  })
})

describe('活动匹配与独立性', () => {
  test('练习阶段拒绝纯讲解活动', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { stage: 'practice' }))
    assert.equal(activityKindCompatible(plan, 'practice', 'explanation'), false)
    assert.equal(activityKindCompatible(plan, 'practice', 'quiz'), true)
  })

  test('证明任务允许证明/推导/quiz，拒绝代码实验', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { profile: makeProfile({ goals: '完成证明' }) }))
    assert.equal(activityKindCompatible(plan, 'practice', 'proof-task'), true)
    assert.equal(activityKindCompatible(plan, 'practice', 'derivation'), true)
    assert.equal(activityKindCompatible(plan, 'practice', 'code-run'), false)
  })

  test('程序任务允许 code-run', () => {
    const plan = planTeachingTurn(makeTurnInput(fixture, { profile: makeProfile({ goals: '用 Python 实现' }) }))
    assert.equal(activityKindCompatible(plan, 'practice', 'code-run'), true)
  })

  test('要完整答案/看答案时活动不能算独立', () => {
    const input = makeTurnInput(fixture, { stage: 'practice', wantsFullAnswer: true })
    assert.equal(activityCanBeIndependent(input, { intent: 'practice' }), false)
    const normal = makeTurnInput(fixture, { stage: 'practice' })
    assert.equal(activityCanBeIndependent(normal, { intent: 'practice' }), true)
  })
})

describe('heuristicClassify 规则分类', () => {
  test('切换形式请求 → switch-style', () => {
    const meta = heuristicClassify(makeTurnInput(fixture, { studentText: '画图解释一下' }))
    assert.equal(meta.intent, 'switch-style')
    assert.ok(meta.requestedForm !== undefined)
  })

  test('要答案 → answer', () => {
    const meta = heuristicClassify(makeTurnInput(fixture, { studentText: '直接告诉我答案' }))
    assert.equal(meta.intent, 'answer')
  })

  test('诊断请求 → diagnose', () => {
    const meta = heuristicClassify(makeTurnInput(fixture, { studentText: '先考考我' }))
    assert.equal(meta.intent, 'diagnose')
  })

  test('练习阶段非提问作答 → feedback', () => {
    const meta = heuristicClassify(makeTurnInput(fixture, {
      stage: 'practice',
      studentText: '我选 b，因为验证误差高',
    }))
    assert.equal(meta.intent, 'feedback')
  })

  test('练习阶段提问 → explain（不误判为作答）', () => {
    const meta = heuristicClassify(makeTurnInput(fixture, {
      stage: 'practice',
      studentText: '为什么要用验证集？',
    }))
    assert.equal(meta.intent, 'explain')
  })
})

describe('buildNextActions 与语言/风格', () => {
  test('练习意图给提示/看答案/下一步按钮', () => {
    const input = makeTurnInput(fixture, { stage: 'practice' })
    const actions = buildNextActions(input, { intent: 'practice', stage: 'practice' }, planTeachingTurn(input))
    assert.deepEqual(actions.map(action => action.id), ['hint', 'show-answer', 'next-step'])
  })

  test('追问后给回到当前练习按钮', () => {
    const input = makeTurnInput(fixture, { stage: 'practice', studentText: '为什么？' })
    const actions = buildNextActions(input, { intent: 'explain', stage: 'practice' }, planTeachingTurn(input))
    assert.ok(actions.some(action => action.id === 'resume-current'))
  })

  test('三种语言指令可区分，术语保留偏好生效', () => {
    assert.ok(languageInstruction('zh').includes('保留原文'))
    assert.ok(languageInstruction('zh', makeProfile({
      preferences: { keepOriginalTerms: false },
    })).includes('术语可只给中文'))
    assert.ok(languageInstruction('en').includes('English'))
    assert.ok(languageInstruction('bilingual').includes('双语'))
  })

  test('风格/节奏/基础进入提示片段', () => {
    const hints = styleGuidance(makeProfile({
      preferences: { style: '类比优先', pace: 'slow' },
    }))
    assert.ok(hints.some(hint => hint.includes('类比优先')))
    assert.ok(hints.some(hint => hint.includes('慢一点')))
    assert.ok(hints.some(hint => hint.includes('自述基础')))
  })
})
