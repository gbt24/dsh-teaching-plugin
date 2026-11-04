/**
 * TeachingService 行为测试：有/无资料、冲突与不确定性、形式切换、追问恢复、
 * 元数据解析降级、活动提案校验、模型失败/取消、分类与语言提示。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import { conceptId, courseId, courseRevisionId } from '../../src/contracts/ids.ts'
import type { ScriptedReply } from '../../src/model/fake.ts'
import { createTeachingService, planTeachingTurn } from '../../src/teaching/index.ts'
import type { TeachingStreamEvent } from '../../src/contracts/teaching.ts'
import type { ActivityProposal } from '../../src/contracts/teaching.ts'
import {
  collectEvents, makeCourseFixture, makeProfile, makeTurnInput, replyWithMeta,
} from './fixtures.ts'

function doneOf(events: readonly TeachingStreamEvent[]): Extract<TeachingStreamEvent, { type: 'done' }> {
  const done = events.find(event => event.type === 'done')
  assert.ok(done !== undefined && done.type === 'done', '应产出 done 终止事件')
  return done
}

function errorOf(events: readonly TeachingStreamEvent[]): Extract<TeachingStreamEvent, { type: 'error' }> {
  const error = events.find(event => event.type === 'error')
  assert.ok(error !== undefined && error.type === 'error', '应产出 error 终止事件')
  return error
}

function deltaText(events: readonly TeachingStreamEvent[]): string {
  return events.flatMap(event => (event.type === 'delta' ? [event.text] : [])).join('')
}

function activitiesOf(events: readonly TeachingStreamEvent[]): ActivityProposal[] {
  return events.flatMap(event => (event.type === 'activity' ? [event.proposal] : []))
}

function positionOf(events: readonly TeachingStreamEvent[]): Extract<TeachingStreamEvent, { type: 'position' }> {
  const position = events.find(event => event.type === 'position')
  assert.ok(position !== undefined && position.type === 'position', '应产出 position 事件')
  return position
}

describe('TeachingService.respond 来源与不确定性', () => {
  test('有资料回合：正文流式、元数据不泄漏、证据回填真实 anchor', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('## 过拟合\n\n过拟合是模型记住了训练数据里的噪声 [M1]。', {
        intent: 'explain',
        stage: 'teaching',
        conceptIds: [fixture.overfittingId],
        evidence: { usedMaterialRefs: ['M1'], usedModelKnowledge: false },
        nextActions: [{ id: 'start-practice', label: '开始练习' }],
        uncertainty: ['类比“死记硬背”只在直觉层面成立'],
      }),
    }])
    const input = makeTurnInput(fixture, { materialWarnings: ['公式 OCR 置信度低，请核对原文'] })
    const events = await collectEvents(createTeachingService().respond(input, model))
    const done = doneOf(events)

    const streamed = deltaText(events)
    assert.ok(streamed.includes('过拟合'))
    assert.ok(!streamed.includes('<<<TEACHING_META>>>'))
    assert.ok(!streamed.includes('"intent"'), '元数据 JSON 不应展示给学生')
    assert.equal(done.text, streamed.trim())
    assert.equal(done.meta.intent, 'explain')
    assert.equal(done.meta.stage, 'teaching')
    assert.deepEqual(done.meta.evidenceKinds, ['course-source'])
    assert.equal(done.evidenceRefs.length, 1)
    const evidenceRef = done.evidenceRefs[0]
    assert.equal(evidenceRef?.kind, 'course-source')
    assert.equal(evidenceRef?.anchor?.unitId, fixture.anchor.unitId)
    assert.equal(evidenceRef?.confidence, 'high')
    // 资料不确定性必须传播到 uncertainty。
    assert.ok(done.uncertainty.some(item => item.includes('公式 OCR 置信度低')))
    assert.ok(!done.limitations.some(item => item.includes('未检索到可用的课程资料')))
    assert.ok(done.meta.nextActions?.some(action => action.id === 'start-practice'))
    assert.equal(model.calls.length, 1)
    assert.equal(model.calls[0]?.sessionId, input.sessionId)
    assert.ok(model.calls[0]?.system?.includes('<<<TEACHING_META>>>'))
  })

  test('无资料回合：标注模型知识补充并进入 limitations，不伪造课程来源', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('没有检索到资料，这里用模型知识解释：过拟合是……', {
        intent: 'explain',
        stage: 'teaching',
        evidence: { usedMaterialRefs: [], usedModelKnowledge: true },
      }),
    }])
    const input = makeTurnInput(fixture, { material: [] })
    const done = doneOf(await collectEvents(createTeachingService().respond(input, model)))
    assert.deepEqual(done.meta.evidenceKinds, ['model-knowledge'])
    assert.equal(done.evidenceRefs.some(ref => ref.kind === 'course-source'), false)
    assert.ok(done.limitations.some(item => item.includes('未检索到可用的课程资料')))
  })

  test('资料冲突：约定差异与实质错误分开呈现并给依据', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('教材与常见约定有一处符号差异……', {
        intent: 'explain',
        stage: 'teaching',
        evidence: { usedMaterialRefs: ['M1'] },
        conflicts: [
          { kind: 'convention', summary: '教材用 Θ 表示复杂度，常用记法用 O', basisRefs: ['M1'] },
          { kind: 'substantive', summary: '教材此处把验证集误写成测试集', basisRefs: ['M1'] },
        ],
      }),
    }])
    const done = doneOf(await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model)))
    const joined = done.uncertainty.join('\n')
    assert.ok(joined.includes('约定差异'))
    assert.ok(joined.includes('实质错误'))
    assert.ok(joined.includes('依据：M1'))
  })

  test('模型引用不存在的资料编号：忽略并告警，不伪造 anchor', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('正文引用了不存在的资料。', {
        intent: 'explain',
        evidence: { usedMaterialRefs: ['M9'] },
      }),
    }])
    const done = doneOf(await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model)))
    assert.ok(done.uncertainty.some(item => item.includes('不存在的课程资料编号 M9')))
    assert.equal(done.evidenceRefs.some(ref => ref.kind === 'course-source'), false)
    assert.equal(done.evidenceRefs.some(ref => ref.anchor !== undefined && ref.kind === 'course-source'), false)
  })

  test('跨课程/外部网页/推导证据：类型、来源信息与前提可区分', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('结合另一门课与外部资料，并给出推导。', {
        intent: 'explain',
        stage: 'teaching',
        evidence: {
          usedMaterialRefs: ['M1'],
          usedCrossCourseRefs: ['C1'],
          usedWebRefs: ['W1'],
          usedModelKnowledge: false,
          derivations: [{ label: '由定义推出泛化误差上界', premises: ['M1'] }],
        },
      }),
    }])
    const input = makeTurnInput(fixture, {
      crossCourse: [{
        courseId: courseId(),
        courseTitle: 'SICP',
        revisionId: courseRevisionId(),
        conceptIds: [conceptId()],
        reason: '递归与过程抽象的类比',
        anchors: [makeCourseFixture().anchor],
      }],
      webResults: [{
        title: 'Generalization and Overfitting',
        url: 'https://example.org/paper',
        snippet: 'A short external snippet about generalization error.',
      }],
    })
    const done = doneOf(await collectEvents(createTeachingService().respond(input, model)))
    const kinds = new Set(done.evidenceRefs.map(ref => ref.kind))
    assert.ok(kinds.has('course-source'))
    assert.ok(kinds.has('other-course'))
    assert.ok(kinds.has('external-web'))
    assert.ok(kinds.has('derivation'))
    const cross = done.evidenceRefs.find(ref => ref.kind === 'other-course')
    assert.equal(cross?.courseTitle, 'SICP')
    const web = done.evidenceRefs.find(ref => ref.kind === 'external-web')
    assert.equal(web?.url, 'https://example.org/paper')
    assert.ok(web?.accessedAt !== undefined)
    const derivation = done.evidenceRefs.find(ref => ref.kind === 'derivation')
    assert.ok(derivation?.premises?.some(premise => premise.includes('机器学习导论.pdf')))
    assert.ok(done.meta.evidenceKinds?.includes('other-course'))
  })

  test('外部检索无结果与模型图像能力不足进入 limitations', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient(
      [{
        kind: 'text',
        text: replyWithMeta('图中曲线说明……', {
          intent: 'explain',
          evidence: { usedMaterialRefs: ['M1'] },
        }),
      }],
      { imageInput: 'no' },
    )
    const input = makeTurnInput(fixture, {
      webResults: [],
      materialWarnings: ['扫描图 OCR 置信度低'],
    })
    const done = doneOf(await collectEvents(createTeachingService().respond(input, model)))
    assert.ok(done.limitations.some(item => item.includes('外部检索已尝试但没有可用结果')))
    assert.ok(done.limitations.some(item => item.includes('不支持图像输入')))
  })
})

describe('TeachingService.respond 教学形式与位置', () => {
  test('学生要求切换形式：保留原目标，提示词体现图形形式', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('我们用一张图来理解过拟合。', {
        intent: 'switch-style',
        stage: 'teaching',
        requestedForm: '画图解释',
        evidence: { usedMaterialRefs: ['M1'] },
      }),
    }])
    const input = makeTurnInput(fixture, { requestedForm: '画图解释' })
    assert.equal(planTeachingTurn(input).form, 'visual')
    const done = doneOf(await collectEvents(createTeachingService().respond(input, model)))
    assert.equal(done.meta.requestedForm, '画图解释')
    assert.equal(done.meta.stage, 'teaching')
    const system = model.calls[0]?.system ?? ''
    assert.ok(system.includes('图形/可视化'))
    assert.ok(system.includes('保留原目标'))
  })

  test('练习中的临时追问：回答后恢复原阶段并给“回到当前练习”按钮', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('验证集用来估计泛化误差……', {
        intent: 'explain',
        stage: 'teaching',
        evidence: { usedMaterialRefs: ['M1'] },
      }),
    }])
    const input = makeTurnInput(fixture, {
      stage: 'practice',
      studentText: '等一下，为什么要用验证集而不是直接看训练误差？',
    })
    const events = await collectEvents(createTeachingService().respond(input, model))
    const done = doneOf(events)
    assert.equal(positionOf(events).stage, 'practice', '临时追问不应把学习位置从练习带走')
    assert.equal(done.meta.stage, 'practice')
    assert.ok(done.meta.nextActions?.some(action => action.id === 'resume-current'))
  })

  test('诊断阶段提示词要求先定位误解、不要只给正确答案', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('你这一步的问题在于……', {
        intent: 'diagnose',
        stage: 'diagnosis',
      }),
    }])
    const input = makeTurnInput(fixture, { stage: 'diagnosis', studentText: '我不知道哪里错了' })
    await collectEvents(createTeachingService().respond(input, model))
    const system = model.calls[0]?.system ?? ''
    assert.ok(system.includes('诊断'))
    assert.ok(system.includes('定位具体误解'))
  })

  test('学生要求完整答案：形式切到 answer-first 且活动不能算独立', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('完整答案如下……', {
        intent: 'answer',
        stage: 'practice',
        activity: {
          kind: 'quiz',
          title: '同题重做',
          goal: '检验是否理解',
          conceptIds: [fixture.overfittingId],
          payload: {
            type: 'quiz',
            question: '过拟合的直接表现是？',
            options: [{ id: 'a', label: '训练误差高' }, { id: 'b', label: '泛化误差高' }],
            correctOptionIds: ['b'],
          },
        },
      }),
    }])
    const input = makeTurnInput(fixture, { stage: 'practice', wantsFullAnswer: true })
    const events = await collectEvents(createTeachingService().respond(input, model))
    const proposals = activitiesOf(events)
    assert.equal(proposals.length, 1)
    assert.equal(proposals[0]?.independent, false, '看过答案后的活动不能算独立证据')
    assert.equal(doneOf(events).meta.intent, 'answer')
  })
})

describe('TeachingService.respond 解析降级与失败', () => {
  test('元数据坏 JSON：一次修复调用后仍失败则纯文本降级，不编造活动', async () => {
    const fixture = makeCourseFixture()
    const body = '## 过拟合\n\n这是正文。'
    const model = new ScriptedModelClient([
      { kind: 'text', text: replyWithMeta(body, '{这不是合法 JSON') },
      { kind: 'text', text: '抱歉，我无法输出 JSON。' },
    ])
    const events = await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model))
    const done = doneOf(events)
    assert.equal(done.text, body)
    assert.equal(activitiesOf(events).length, 0)
    assert.ok(done.uncertainty.some(item => item.includes('结构化元数据解析失败')))
    assert.ok(done.limitations.some(item => item.includes('已降级为纯文本讲解')))
    assert.equal(model.calls.length, 2, '解析失败最多做一次修复调用')
  })

  test('元数据坏 JSON：修复调用成功则采用修复后的元数据', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([
      { kind: 'text', text: replyWithMeta('正文内容。', '{坏 JSON') },
      { kind: 'json', value: { intent: 'explain', stage: 'teaching', conceptIds: [fixture.overfittingId] } },
    ])
    const done = doneOf(await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model)))
    assert.equal(done.meta.intent, 'explain')
    assert.equal(done.meta.stage, 'teaching')
  })

  test('完全没有元数据分隔符：尝试修复，失败则保留正文并告警', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([
      { kind: 'text', text: '只有正文，没有元数据。' },
      { kind: 'text', text: '仍然没有 JSON。' },
    ])
    const done = doneOf(await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model)))
    assert.equal(done.text, '只有正文，没有元数据。')
    assert.ok(done.uncertainty.some(item => item.includes('结构化元数据解析失败')))
  })

  test('模型流错误：终止为 error，不产生 done', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{ kind: 'error', code: 'network', message: '连接失败' }])
    const events = await collectEvents(createTeachingService().respond(makeTurnInput(fixture), model))
    const error = errorOf(events)
    assert.equal(error.error.code, 'network')
    assert.equal(events.some(event => event.type === 'done'), false)
  })

  test('取消：返回 cancelled 错误事件', async () => {
    const fixture = makeCourseFixture()
    const controller = new AbortController()
    controller.abort()
    const model = new ScriptedModelClient([])
    const events = await collectEvents(
      createTeachingService().respond(makeTurnInput(fixture), model, controller.signal),
    )
    assert.equal(errorOf(events).error.code, 'cancelled')
    assert.equal(model.calls.length, 0)
  })
})

describe('TeachingService.respond 活动提案', () => {
  test('合法 quiz 提案：校验 kind/verification/来源/独立性与学习目标匹配', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('做一道题检验一下。', {
        intent: 'practice',
        stage: 'practice',
        conceptIds: [fixture.overfittingId],
        activity: {
          kind: 'quiz',
          title: '过拟合判断',
          goal: '检验能否区分训练误差与泛化误差',
          conceptIds: [fixture.overfittingId],
          payload: {
            type: 'quiz',
            question: '哪个现象最能说明过拟合？',
            options: [
              { id: 'a', label: '训练误差和验证误差都高' },
              { id: 'b', label: '训练误差很低但验证误差高' },
            ],
            correctOptionIds: ['b'],
            hint: '想想模型记住了什么',
          },
        },
      }),
    }])
    const input = makeTurnInput(fixture, { stage: 'practice', studentText: '给我一道练习题' })
    const events = await collectEvents(createTeachingService().respond(input, model))
    const proposal = activitiesOf(events)[0]
    assert.ok(proposal !== undefined)
    assert.equal(proposal.kind, 'quiz')
    assert.equal(proposal.payload.type, 'quiz')
    assert.equal(proposal.verification.kind, 'objective')
    assert.equal(proposal.independent, true)
    assert.ok(proposal.sourceRefs.length > 0)
    assert.ok(proposal.conceptIds.includes(fixture.overfittingId))
    assert.equal(positionOf(events).stage, 'practice')
    assert.ok(doneOf(events).meta.nextActions?.some(action => action.id === 'hint'))
  })

  test('非法 payload：不创建活动，原因进入 uncertainty', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('做一道开放题。', {
        intent: 'practice',
        stage: 'practice',
        activity: {
          kind: 'quiz',
          title: '开放题',
          payload: { type: 'open-question', prompt: '谈谈你的理解' },
        },
      }),
    }])
    const input = makeTurnInput(fixture, { stage: 'practice' })
    const events = await collectEvents(createTeachingService().respond(input, model))
    assert.equal(activitiesOf(events).length, 0)
    assert.ok(doneOf(events).uncertainty.some(item => item.includes('活动 payload 不合法')))
  })

  test('练习阶段提案讲解卡：判定与阶段不匹配，不创建活动', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('再看一遍讲解。', {
        intent: 'practice',
        stage: 'practice',
        activity: {
          kind: 'explanation',
          title: '讲解卡',
          payload: { type: 'explanation', markdown: '过拟合是……' },
        },
      }),
    }])
    const input = makeTurnInput(fixture, { stage: 'practice' })
    const events = await collectEvents(createTeachingService().respond(input, model))
    assert.equal(activitiesOf(events).length, 0)
    assert.ok(doneOf(events).uncertainty.some(item => item.includes('不匹配')))
  })
})

describe('TeachingService.classify', () => {
  test('模型分类：识别要答案与切换形式', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'json',
      value: {
        intent: 'answer',
        requestedForm: '直接给答案',
        wantsFullAnswer: true,
        conceptIds: [fixture.overfittingId],
      },
    }])
    const input = makeTurnInput(fixture, { studentText: '直接告诉我答案吧' })
    const meta = await createTeachingService().classify(input, model)
    assert.equal(meta.intent, 'answer')
    assert.equal(meta.requestedForm, '直接给答案')
    assert.deepEqual(meta.conceptIds, [fixture.overfittingId])
  })

  test('模型失败：规则兜底识别切换形式与要答案', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{ kind: 'error', code: 'failed', message: '模型不可用' }])
    const input = makeTurnInput(fixture, { studentText: '直接告诉我答案吧' })
    const meta = await createTeachingService().classify(input, model)
    assert.equal(meta.intent, 'answer')
    assert.ok(meta.requestedForm !== undefined)
  })

  test('练习阶段学生作答：分类为 feedback', async () => {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([])
    const input = makeTurnInput(fixture, { stage: 'practice', studentText: '我选 b，因为验证误差高' })
    const meta = await createTeachingService().classify(input, model)
    assert.equal(meta.intent, 'feedback')
  })
})

describe('TeachingService 语言提示', () => {
  async function systemFor(language: 'zh' | 'en' | 'bilingual'): Promise<string> {
    const fixture = makeCourseFixture()
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('正文。', { intent: 'explain', evidence: { usedModelKnowledge: true } }),
    }])
    await collectEvents(createTeachingService().respond(
      makeTurnInput(fixture, { language, profile: makeProfile({ language }) }),
      model,
    ))
    return model.calls[0]?.system ?? ''
  }

  test('中文：要求中文讲解并保留原文术语', async () => {
    const system = await systemFor('zh')
    assert.ok(system.includes('用中文讲解'))
    assert.ok(system.includes('保留原文'))
  })

  test('英文：要求 English 讲解', async () => {
    const system = await systemFor('en')
    assert.ok(system.includes('Answer in English'))
  })

  test('双语：要求中英对照', async () => {
    const system = await systemFor('bilingual')
    assert.ok(system.includes('双语'))
  })
})

describe('模型脚本类型', () => {
  test('ScriptedReply 支持文本/JSON/错误（类型自检）', () => {
    const replies: ScriptedReply[] = [
      { kind: 'text', text: 'a' },
      { kind: 'json', value: {} },
      { kind: 'error', code: 'failed', message: 'x' },
      { kind: 'abort' },
    ]
    assert.equal(replies.length, 4)
  })
})
