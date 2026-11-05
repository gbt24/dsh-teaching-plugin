/**
 * 可视化教学（visual activity）测试：
 * payload 校验/归一化（renderer/source 边界、自包含安全、尺寸/条件/文本上限）、
 * kind 映射与阶段/形态兼容、提示词 schema 与可视化教学指南、端到端活动提案。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { LearningStage } from '../../src/contracts/session.ts'
import type { TeachingTurnInput } from '../../src/contracts/teaching.ts'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import {
  activityKindCompatible, buildCrossCourseRefs, buildMaterialRefs, buildTeachingSystemPrompt,
  buildWebRefs, createTeachingService, normalizeActivityProposal, planTeachingTurn,
} from '../../src/teaching/index.ts'
import type { ActivityNormalizeContext, TeachingPromptContext } from '../../src/teaching/index.ts'
import { collectEvents, makeCourseFixture, makeTurnInput, replyWithMeta } from './fixtures.ts'

const fixture = makeCourseFixture()

/** 构造活动归一化上下文（与 TeachingService 内部一致）。 */
function normalize(
  raw: unknown,
  options: { readonly stage?: LearningStage; readonly input?: Partial<TeachingTurnInput> } = {},
) {
  const input = makeTurnInput(fixture, {
    stage: options.stage ?? 'teaching',
    ...(options.input ?? {}),
  })
  const ctx: ActivityNormalizeContext = {
    input,
    plan: planTeachingTurn(input),
    evidenceRefs: [],
    independent: true,
    conceptIds: fixture.revision.concepts.map(concept => concept.id),
  }
  return normalizeActivityProposal(raw, ctx)
}

/** 构造一个 visual 活动提案。 */
function visualRaw(
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    kind: 'visual',
    title: '可视化讲解',
    payload: { type: 'visual', ...payload },
    ...extra,
  }
}

/** 构造系统提示上下文。 */
function promptContext(input: TeachingTurnInput): TeachingPromptContext {
  return {
    input,
    plan: planTeachingTurn(input),
    materialRefs: buildMaterialRefs(input, 8, 400),
    crossCourseRefs: buildCrossCourseRefs(input, 3),
    webRefs: buildWebRefs(input, 4),
    maxHistory: 8,
    excerptChars: 400,
  }
}

const SVG_SOURCE = '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">train</text><text x="10" y="60">val</text></svg>'

describe('visual payload 归一化', () => {
  test('合法 SVG：保留字段、补默认 alt、验证方式为 none', () => {
    const result = normalize(visualRaw({
      renderer: 'svg',
      source: SVG_SOURCE,
      visualType: 'chart',
      title: '训练/验证误差曲线',
      caption: '训练误差低但验证误差高',
      observe: '注意两条曲线何时分开',
      formula: 'E_{gen} > E_{train}',
      conditions: ['验证集与训练集独立同分布', '样本量足够'],
      height: 360,
      fallbackText: '训练误差下降而验证误差上升，说明可能过拟合。',
    }))
    const proposal = result.proposal
    assert.ok(proposal !== undefined, JSON.stringify(result.warnings))
    assert.equal(proposal.kind, 'visual')
    assert.equal(proposal.payload.type, 'visual')
    if (proposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(proposal.payload.renderer, 'svg')
    assert.equal(proposal.payload.source, SVG_SOURCE)
    assert.equal(proposal.payload.visualType, 'chart')
    assert.equal(proposal.payload.title, '训练/验证误差曲线')
    assert.equal(proposal.payload.caption, '训练误差低但验证误差高')
    assert.equal(proposal.payload.observe, '注意两条曲线何时分开')
    assert.equal(proposal.payload.formula, 'E_{gen} > E_{train}')
    assert.deepEqual(proposal.payload.conditions, ['验证集与训练集独立同分布', '样本量足够'])
    assert.equal(proposal.payload.height, 360)
    assert.equal(proposal.payload.alt, '训练/验证误差曲线', 'alt 默认回填 title')
    assert.equal(proposal.payload.interactive, false)
    assert.equal(proposal.verification.kind, 'none')
    assert.ok(proposal.verification.note?.includes('不单独作为掌握证据'))
    assert.equal(proposal.independent, true)
  })

  test('合法 Mermaid：无 title 时活动标题与 alt 有兜底', () => {
    const result = normalize({
      payload: { type: 'visual', renderer: 'mermaid', source: 'graph TD; A-->B; B-->C;' },
    })
    const proposal = result.proposal
    assert.ok(proposal !== undefined)
    assert.equal(proposal.kind, 'visual')
    assert.equal(proposal.title, '可视化讲解')
    if (proposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(proposal.payload.renderer, 'mermaid')
    assert.equal(proposal.payload.alt, '教学可视化')
    assert.equal(proposal.payload.caption, undefined)
  })

  test('HTML 片段含脚本：默认 interactive=true；显式值优先；height 被裁剪到 120..2000', () => {
    const interactive = normalize(visualRaw({
      renderer: 'html',
      source: '<div id="plot"></div><script>document.getElementById("plot").textContent = "x";</script>',
    }))
    const proposal = interactive.proposal
    assert.ok(proposal !== undefined)
    if (proposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(proposal.payload.interactive, true)

    const forcedStatic = normalize(visualRaw({
      renderer: 'html',
      source: '<div>静态内容</div><script>void 0;</script>',
      interactive: false,
    }))
    const staticProposal = forcedStatic.proposal
    assert.ok(staticProposal !== undefined)
    if (staticProposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(staticProposal.payload.interactive, false)

    const tooTall = normalize(visualRaw({ renderer: 'svg', source: SVG_SOURCE, height: 9999 }))
    const short = normalize(visualRaw({ renderer: 'svg', source: SVG_SOURCE, height: 50 }))
    const tooTallPayload = tooTall.proposal?.payload
    const shortPayload = short.proposal?.payload
    assert.ok(tooTallPayload !== undefined && tooTallPayload.type === 'visual')
    assert.ok(shortPayload !== undefined && shortPayload.type === 'visual')
    assert.equal(tooTallPayload.height, 2000)
    assert.equal(shortPayload.height, 120)
  })

  test('caption/alt 默认回填：caption 缺失用 payload.title，alt 缺失用 caption', () => {
    const result = normalize(visualRaw({
      renderer: 'svg',
      source: SVG_SOURCE,
      title: '调用树',
      caption: '递归展开形成调用树',
    }))
    const proposal = result.proposal
    assert.ok(proposal !== undefined)
    if (proposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(proposal.payload.caption, '递归展开形成调用树')
    assert.equal(proposal.payload.alt, '调用树')

    const captionOnly = normalize(visualRaw({
      renderer: 'svg',
      source: SVG_SOURCE,
      caption: '一句话结论',
    }))
    const captionPayload = captionOnly.proposal?.payload
    assert.ok(captionPayload !== undefined && captionPayload.type === 'visual')
    assert.equal(captionPayload.alt, '一句话结论')
  })

  test('conditions 最多 8 条且单条长度有界', () => {
    const conditions = Array.from({ length: 12 }, (_, index) => `条件 ${index}：${'长'.repeat(400)}`)
    const result = normalize(visualRaw({ renderer: 'svg', source: SVG_SOURCE, conditions }))
    const proposal = result.proposal
    assert.ok(proposal !== undefined)
    if (proposal.payload.type !== 'visual') assert.fail('payload 类型应为 visual')
    assert.equal(proposal.payload.conditions?.length, 8)
    for (const condition of proposal.payload.conditions ?? []) {
      assert.ok(condition.length <= 301, '单条条件应截断到约 300 字符')
    }
  })

  test('未知字段被忽略（只保留声明式字段）', () => {
    const result = normalize(visualRaw({
      renderer: 'svg',
      source: SVG_SOURCE,
      evil: 'rm -rf /',
      onclick: 'alert(1)',
    }))
    const proposal = result.proposal
    assert.ok(proposal !== undefined)
    const payloadRecord = proposal.payload as unknown as Record<string, unknown>
    assert.equal('evil' in payloadRecord, false)
    assert.equal('onclick' in payloadRecord, false)
  })

  test('kind 映射：缺省 kind 按 payload 推断为 visual；kind 不一致时修正并告警', () => {
    const inferred = normalize({ payload: { type: 'visual', renderer: 'svg', source: SVG_SOURCE } })
    assert.equal(inferred.proposal?.kind, 'visual')

    const mismatched = normalize({
      kind: 'figure',
      payload: { type: 'visual', renderer: 'svg', source: SVG_SOURCE },
    })
    assert.equal(mismatched.proposal?.kind, 'visual')
    assert.ok(mismatched.warnings.some(warning => warning.includes('不一致')))
  })

  test('扁平 payload（模型直接把字段放在活动对象上）也能识别', () => {
    const result = normalize({ type: 'visual', renderer: 'svg', source: SVG_SOURCE })
    assert.ok(result.proposal !== undefined)
    assert.equal(result.proposal.kind, 'visual')
  })

  test('目标设定阶段：visual 与阶段不匹配，不创建活动', () => {
    const result = normalize(
      visualRaw({ renderer: 'svg', source: SVG_SOURCE }),
      { stage: 'goal-setting' },
    )
    assert.equal(result.proposal, undefined)
    assert.ok(result.warnings.some(warning => warning.includes('不匹配')))
  })
})

describe('visual payload 拒绝不安全/不合法输入', () => {
  const cases: readonly { readonly name: string; readonly raw: Record<string, unknown>; readonly expected: string }[] = [
    { name: '缺少 renderer', raw: { payload: { type: 'visual', source: SVG_SOURCE } }, expected: 'renderer' },
    { name: 'renderer 不在白名单', raw: visualRaw({ renderer: 'webgl', source: SVG_SOURCE }), expected: 'renderer' },
    { name: '缺少 source', raw: visualRaw({ renderer: 'svg' }), expected: 'source' },
    { name: '空 source', raw: visualRaw({ renderer: 'svg', source: '   ' }), expected: 'source' },
    {
      name: 'source 超过 200k',
      raw: visualRaw({ renderer: 'svg', source: `<svg>${'x'.repeat(200_001)}</svg>` }),
      expected: '200000',
    },
    {
      name: '完整 HTML 文档',
      raw: visualRaw({ renderer: 'html', source: '<!doctype html><html><body><div>x</div></body></html>' }),
      expected: '完整 HTML 文档',
    },
    {
      name: '外部链接（外部-only）',
      raw: visualRaw({ renderer: 'html', source: 'https://example.com/plot.png' }),
      expected: '外部链接',
    },
    {
      name: '引用外部 CDN 图片',
      raw: visualRaw({ renderer: 'html', source: '<img src="https://cdn.example.com/plot.png" alt="x">' }),
      expected: '外部',
    },
    {
      name: '引用外部脚本',
      raw: visualRaw({ renderer: 'html', source: '<script src="https://cdn.example.com/d3.js"></script>' }),
      expected: '外部',
    },
    {
      name: 'visualType 不在白名单',
      raw: visualRaw({ renderer: 'svg', source: SVG_SOURCE, visualType: 'hologram' }),
      expected: 'visualType',
    },
  ]
  for (const testCase of cases) {
    test(testCase.name, () => {
      const result = normalize(testCase.raw)
      assert.equal(result.proposal, undefined)
      const warning = result.warnings.join(' ')
      assert.ok(warning.includes('活动 payload 不合法'), warning)
      assert.ok(warning.includes(testCase.expected), warning)
    })
  }
})

describe('activityKindCompatible 对 visual 的适配', () => {
  function planFor(overrides: Partial<TeachingTurnInput>) {
    return planTeachingTurn(makeTurnInput(fixture, overrides))
  }

  test('概念形态：讲解/练习允许 visual，目标设定/空闲不允许', () => {
    const plan = planFor({ stage: 'teaching' })
    assert.equal(activityKindCompatible(plan, 'teaching', 'visual'), true)
    assert.equal(activityKindCompatible(plan, 'practice', 'visual'), true)
    assert.equal(activityKindCompatible(plan, 'goal-setting', 'visual'), false)
    // Idle is still a legitimate Q&A state: the student may explicitly ask for a figure.
    assert.equal(activityKindCompatible(plan, 'idle', 'visual'), true)
  })

  test('各任务形态在练习阶段允许 visual', () => {
    const cases: readonly { readonly input: Partial<TeachingTurnInput> }[] = [
      { input: { studentText: '证明中值定理' } },
      { input: { studentText: '用 Python 实现这个算法' } },
      { input: { studentText: '读教材第 2 章' } },
      { input: { studentText: '这两个概念有什么区别？' } },
      { input: { studentText: '请论证这个结论是否成立' } },
      { input: { studentText: '做一道考研真题' } },
    ]
    for (const entry of cases) {
      const plan = planFor(entry.input)
      assert.equal(activityKindCompatible(plan, 'practice', 'visual'), true, JSON.stringify(entry.input))
    }
  })

  test('练习阶段原有排除规则不变：explanation/static-figure/experiment-note 仍不允许', () => {
    const plan = planFor({ stage: 'practice' })
    assert.equal(activityKindCompatible(plan, 'practice', 'explanation'), false)
    assert.equal(activityKindCompatible(plan, 'practice', 'static-figure'), false)
    assert.equal(activityKindCompatible(plan, 'practice', 'experiment-note'), false)
    assert.equal(activityKindCompatible(plan, 'practice', 'quiz'), true)
  })
})

describe('提示词中的可视化教学', () => {
  test('系统提示把可视化生成交给 Host，并要求不内联源码', () => {
    const system = buildTeachingSystemPrompt(promptContext(makeTurnInput(fixture, { stage: 'practice' })))
    assert.ok(system.includes('## 可视化教学（Host 负责生成）'))
    assert.ok(system.includes('控制量'))
    assert.ok(system.includes('右侧教学区'))
    assert.ok(system.includes('不要在主回复里写 SVG/HTML/Mermaid 源码'))
    assert.ok(system.includes('不单独作为掌握证据'))
    assert.ok(system.includes('不要声称'))
    // Large model-authored source must not be requested inside the main JSON metadata.
    assert.ok(!system.includes('"type":"visual"'))
    assert.ok(!system.includes('"source"'))
  })

  test('目标设定/讲解阶段都保留 Host 可视化说明，但不在活动中塞源码', () => {
    for (const stage of ['goal-setting', 'teaching'] as const) {
      const system = buildTeachingSystemPrompt(promptContext(makeTurnInput(fixture, { stage })))
      assert.ok(system.includes('## 可视化教学（Host 负责生成）'))
      assert.ok(!system.includes('"type":"visual"'))
    }
  })
})

describe('TeachingService.respond 的 visual 活动提案', () => {
  test('练习阶段：visual 提案通过校验并作为 activity 事件输出', async () => {
    const input = makeTurnInput(fixture, { stage: 'practice', studentText: '给我一张图理解过拟合' })
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('看这张图：训练误差下降而验证误差回升。', {
        intent: 'practice',
        stage: 'practice',
        activity: visualRaw({
          renderer: 'svg',
          source: SVG_SOURCE,
          visualType: 'chart',
          caption: '训练误差低但验证误差高',
          observe: '注意两条曲线何时分开',
          conditions: ['验证集独立同分布'],
        }),
      }),
    }])
    const events = await collectEvents(createTeachingService().respond(input, model))
    const activity = events.find(event => event.type === 'activity')
    assert.ok(activity !== undefined && activity.type === 'activity')
    assert.equal(activity.proposal.kind, 'visual')
    assert.equal(activity.proposal.payload.type, 'visual')
    if (activity.proposal.payload.type === 'visual') {
      assert.equal(activity.proposal.payload.renderer, 'svg')
      assert.equal(activity.proposal.payload.caption, '训练误差低但验证误差高')
    }
    assert.equal(activity.proposal.verification.kind, 'none')
    assert.equal(activity.proposal.independent, true)
  })

  test('目标设定阶段：visual 被拒并写入 uncertainty，正文仍正常输出', async () => {
    const input = makeTurnInput(fixture, { stage: 'goal-setting', studentText: '我想学好机器学习' })
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('我们先定目标。', {
        intent: 'explain',
        stage: 'goal-setting',
        activity: visualRaw({ renderer: 'svg', source: SVG_SOURCE }),
      }),
    }])
    const events = await collectEvents(createTeachingService().respond(input, model))
    assert.equal(events.some(event => event.type === 'activity'), false)
    const done = events.find(event => event.type === 'done')
    assert.ok(done !== undefined && done.type === 'done')
    assert.ok(done.uncertainty.some(item => item.includes('不匹配')))
    assert.ok(done.text.includes('我们先定目标'))
  })
})
