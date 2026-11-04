/**
 * 独立性分类纯函数测试：提示层级 0/1/2/3/完整答案、跳过、看答案/模型代答。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { canCountAsEvidence, classifyIndependence } from '../../src/learning/index.ts'

describe('classifyIndependence 独立性', () => {
  test('层级 0 且独立作答 → independent', () => {
    const result = classifyIndependence({
      helpLevel: 0,
      answerText: '训练误差低但验证误差高',
      answerRevealed: false,
    })
    assert.equal(result.independence, 'independent')
    assert.deepEqual(result.helpExposure, { level: 0 })
    assert.equal(result.note, undefined)
    assert.equal(canCountAsEvidence(result.independence), true)
  })

  test('层级 1/2/3 → assisted 并记录提示条数', () => {
    for (const level of [1, 2, 3] as const) {
      const result = classifyIndependence({
        helpLevel: level,
        hintsSeen: ['提示一', '提示二'],
        answerText: '答案',
        answerRevealed: false,
      })
      assert.equal(result.independence, 'assisted')
      assert.equal(result.helpExposure.level, level)
      assert.ok(result.note?.includes('辅助完成'))
    }
  })

  test('层级 0 但看过提示 → 仍算 assisted（不虚报独立）', () => {
    const result = classifyIndependence({
      helpLevel: 0,
      hintsSeen: ['先看训练误差'],
      answerText: '答案',
      answerRevealed: false,
    })
    assert.equal(result.independence, 'assisted')
  })

  test('full-answer → answer-shown', () => {
    const result = classifyIndependence({
      helpLevel: 'full-answer',
      answerText: '照抄的答案',
      answerRevealed: false,
    })
    assert.equal(result.independence, 'answer-shown')
    assert.equal(result.helpExposure.level, 'full-answer')
  })

  test('answerRevealed=true（含模型代答）→ answer-shown，即使层级 0', () => {
    const result = classifyIndependence({
      helpLevel: 0,
      answerText: '模型给出的答案',
      answerRevealed: true,
    })
    assert.equal(result.independence, 'answer-shown')
    assert.ok(result.note?.includes('模型代答'))
  })

  test('空答案（跳过）→ skipped，即使有帮助暴露', () => {
    const result = classifyIndependence({
      helpLevel: 1,
      hintsSeen: ['提示'],
      answerText: '   ',
      answerRevealed: false,
    })
    assert.equal(result.independence, 'skipped')
    assert.ok(result.note?.includes('跳过'))
    assert.equal(canCountAsEvidence(result.independence), false)
  })

  test('只选了选项也算作答（不算跳过）', () => {
    const result = classifyIndependence({
      helpLevel: 0,
      answerText: '',
      selectedOptionIds: ['b'],
      answerRevealed: false,
    })
    assert.equal(result.independence, 'independent')
  })

  test('只有跳过/辅助/看答案不能作为独立证据', () => {
    assert.equal(canCountAsEvidence('assisted'), false)
    assert.equal(canCountAsEvidence('answer-shown'), false)
    assert.equal(canCountAsEvidence('skipped'), false)
  })
})
