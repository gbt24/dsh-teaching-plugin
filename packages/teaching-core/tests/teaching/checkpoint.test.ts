/**
 * 压缩检查点提示词测试（T13）：Host 在上下文被压缩后提供 `contextCheckpoint`，
 * 用户提示应把摘要渲染为“既定背景”区块，且不改变最近对话、流式与验证行为。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { ChatMessage } from '../../src/contracts/session.ts'
import type { TeachingTurnInput } from '../../src/contracts/teaching.ts'
import { messageId, nowIso, sessionId } from '../../src/contracts/ids.ts'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import {
  buildCrossCourseRefs, buildMaterialRefs, buildTeachingSystemPrompt, buildTeachingUserPrompt,
  buildWebRefs, createTeachingService, planTeachingTurn,
} from '../../src/teaching/index.ts'
import type { TeachingPromptContext } from '../../src/teaching/index.ts'
import { collectEvents, makeCourseFixture, makeTurnInput, replyWithMeta } from './fixtures.ts'

const CHECKPOINT_HEADING = '## 更早对话的压缩检查点'

/** 构造用户提示所需的上下文（与 TeachingService 内部一致）。 */
function buildContext(input: TeachingTurnInput): TeachingPromptContext {
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

/** 生成一条学生历史消息（文本可辨识）。 */
function makeHistoryMessage(index: number): ChatMessage {
  return {
    id: messageId(),
    sessionId: sessionId(),
    role: 'student',
    kind: 'student-question',
    text: `history-line-${String(index).padStart(2, '0')}`,
    createdAt: nowIso(),
  }
}

function makeHistory(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => makeHistoryMessage(index + 1))
}

const fixture = makeCourseFixture()

describe('buildTeachingUserPrompt 压缩检查点', () => {
  test('存在检查点：渲染区块、保留摘要换行、保留最近 8 条历史', () => {
    const summary = '学生已掌握训练误差的概念。\n我们约定用验证集讨论泛化误差。\n学生偏好先看例子。'
    const input = makeTurnInput(fixture, {
      contextCheckpoint: {
        summary,
        compactedAt: '2026-11-05T00:00:00.000Z',
      },
      history: makeHistory(10),
    })
    const prompt = buildTeachingUserPrompt(buildContext(input))

    assert.ok(prompt.includes(CHECKPOINT_HEADING))
    // 摘要原文与换行结构保留。
    assert.ok(prompt.includes(summary))
    // 区块说明：既定背景、不要复述、不是资料证据。
    assert.ok(prompt.includes('既定背景'))
    assert.ok(prompt.includes('不要复述检查点本身'))
    assert.ok(prompt.includes('不是课程资料证据'))
    assert.ok(prompt.includes('- 压缩时间：2026-11-05T00:00:00.000Z'))
    // 区块位于最近对话之前。
    assert.ok(prompt.indexOf(CHECKPOINT_HEADING) < prompt.indexOf('## 最近对话'))
    // 最近对话仍只取最后 8 条（maxHistory=8），顺序不变。
    assert.equal((prompt.match(/（student-question）/g) ?? []).length, 8)
    for (const index of [3, 4, 5, 6, 7, 8, 9, 10]) {
      assert.ok(prompt.includes(`history-line-${String(index).padStart(2, '0')}`), `应包含最近历史 ${index}`)
    }
    for (const index of [1, 2]) {
      assert.ok(!prompt.includes(`history-line-${String(index).padStart(2, '0')}`), `不应包含被挤出的历史 ${index}`)
    }
  })

  test('不存在检查点：不出现区块，其余提示结构不变', () => {
    const input = makeTurnInput(fixture, { history: makeHistory(10) })
    const prompt = buildTeachingUserPrompt(buildContext(input))
    assert.ok(!prompt.includes(CHECKPOINT_HEADING))
    assert.ok(!prompt.includes('压缩检查点'))
    assert.ok(prompt.includes('## 最近对话（由旧到新）'))
    assert.equal((prompt.match(/（student-question）/g) ?? []).length, 8)
  })

  test('摘要超过约 6000 字符：截断并标注，保留前面的换行结构', () => {
    const longSummary = Array.from(
      { length: 300 },
      (_, index) => `第${index + 1}行：${'内容'.repeat(20)}`,
    ).join('\n')
    const input = makeTurnInput(fixture, {
      contextCheckpoint: { summary: `${longSummary}\nTAIL-UNIQUE-MARKER-不应出现` },
    })
    const prompt = buildTeachingUserPrompt(buildContext(input))
    assert.ok(prompt.includes(CHECKPOINT_HEADING))
    assert.ok(prompt.includes('摘要已截断'))
    assert.ok(prompt.includes('第1行：'))
    assert.ok(prompt.includes('\n第2行：'), '截断后仍保留行结构')
    assert.ok(!prompt.includes('TAIL-UNIQUE-MARKER-不应出现'), '超长尾部应被截断')
    const start = prompt.indexOf(CHECKPOINT_HEADING)
    const end = prompt.indexOf('## 最近对话')
    const section = prompt.slice(start, end)
    // 区块 = 标题 + 说明 + 最多 6000 字符摘要 + 截断标注。
    assert.ok(section.length > 6000)
    assert.ok(section.length < 6500, `检查点区块不应无限增长（实际 ${section.length}）`)
  })

  test('空摘要：仍渲染区块并给出占位说明（不产生空标题）', () => {
    const input = makeTurnInput(fixture, { contextCheckpoint: { summary: '   \n  ' } })
    const prompt = buildTeachingUserPrompt(buildContext(input))
    assert.ok(prompt.includes(CHECKPOINT_HEADING))
    assert.ok(prompt.includes('（检查点内容为空）'))
  })

  test('系统提示声明检查点纪律：上下文而非资料证据', () => {
    const input = makeTurnInput(fixture, { contextCheckpoint: { summary: '摘要' } })
    const system = buildTeachingSystemPrompt(buildContext(input))
    assert.ok(system.includes('压缩检查点'))
    assert.ok(system.includes('不是课程资料证据'))
    assert.ok(system.includes('不要复述检查点本身'))
  })
})

describe('TeachingService.respond 与压缩检查点', () => {
  test('检查点进入模型请求，但不改变流式/验证行为，也不进入 uncertainty', async () => {
    const summary = '更早的对话：学生已理解训练误差，正在转向泛化误差。'
    const input = makeTurnInput(fixture, {
      contextCheckpoint: { summary },
      history: makeHistory(10),
    })
    const model = new ScriptedModelClient([{
      kind: 'text',
      text: replyWithMeta('继续讲泛化误差。', {
        intent: 'explain',
        stage: 'teaching',
        evidence: { usedMaterialRefs: ['M1'] },
      }),
    }])
    const events = await collectEvents(createTeachingService().respond(input, model))
    const done = events.find(event => event.type === 'done')
    assert.ok(done !== undefined && done.type === 'done')

    const userPrompt = model.calls[0]?.messages[0]?.text ?? ''
    assert.ok(userPrompt.includes(CHECKPOINT_HEADING))
    assert.ok(userPrompt.includes(summary))
    assert.ok(userPrompt.includes('history-line-10'))

    // 检查点只是上下文：不改变证据回填与不确定性。
    assert.ok(done.evidenceRefs.some(ref => ref.kind === 'course-source'))
    assert.ok(!done.uncertainty.some(item => item.includes(summary)))
    assert.equal(done.meta.intent, 'explain')
    assert.equal(done.meta.stage, 'teaching')
  })
})
