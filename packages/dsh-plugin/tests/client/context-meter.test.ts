/**
 * Pure tests for context-meter formatting, compression result parsing and the
 * chat-side compaction banner.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ContextUsageView, SessionContextCheckpoint } from '@deepseek-teaching/core/contracts'
import {
  contextMeter, formatTokenCount, toneForPercent,
} from '../../src/client/context-meter.ts'
import {
  compactedMessageIds, compressionBannerText, compressionSuccessMessage,
  parseCompressionResult,
} from '../../src/client/context-compress.ts'

const MODEL = { provider: 'acme', model: 'teacher-1' }

function usage(overrides: Partial<ContextUsageView> = {}): ContextUsageView {
  return {
    sessionId: 'sess-1' as never,
    tokensUsed: 12_300,
    contextWindow: 128_000,
    percent: 9.6,
    source: 'reported',
    reportedAt: '2026-11-05T08:00:00.000Z',
    model: MODEL,
    ...overrides,
  }
}

test('token formatting is compact and never invents a value', () => {
  assert.equal(formatTokenCount(undefined), '未知')
  assert.equal(formatTokenCount(-1), '未知')
  assert.equal(formatTokenCount(0), '0')
  assert.equal(formatTokenCount(999), '999')
  assert.equal(formatTokenCount(1_000), '1k')
  assert.equal(formatTokenCount(1_500), '1.5k')
  assert.equal(formatTokenCount(12_345), '12.3k')
  assert.equal(formatTokenCount(123_456), '123k')
  assert.equal(formatTokenCount(1_250_000), '1.3M')
})

test('meter shows tokens/window with percent and tone thresholds', () => {
  const meter = contextMeter(usage())!
  assert.equal(meter.label, '12.3k / 128k (10%)')
  assert.equal(meter.percent, 9.6)
  assert.ok(meter.fraction !== undefined && Math.abs(meter.fraction - 12_300 / 128_000) < 1e-9)
  assert.equal(meter.tone, 'ok')
  assert.match(meter.tooltip, /服务端上报/u)
  assert.match(meter.tooltip, /不等同于精确的剩余窗口/u)
  assert.equal(toneForPercent(69.9), 'ok')
  assert.equal(toneForPercent(70), 'warn')
  assert.equal(toneForPercent(89.9), 'warn')
  assert.equal(toneForPercent(90), 'danger')
})

test('unknown window shows tokens only; unknown tokens show 用量未知', () => {
  const noWindow = contextMeter(usage({ contextWindow: undefined, percent: undefined }))!
  assert.equal(noWindow.label, '12.3k（窗口未知）')
  assert.equal(noWindow.fraction, undefined)
  assert.equal(noWindow.percent, undefined)
  assert.match(noWindow.tooltip, /未报告上下文窗口/u)

  const noTokens = contextMeter(usage({ tokensUsed: undefined, percent: undefined, source: 'unknown' }))!
  assert.equal(noTokens.label, '用量未知')
  assert.equal(noTokens.unknown, true)
  assert.equal(contextMeter(undefined), undefined)
})

test('estimates are labelled and compressed snapshots are mentioned', () => {
  const meter = contextMeter(usage({
    source: 'estimated',
    percent: undefined,
    compressed: { compactedAt: '2026-11-05T08:00:00.000Z', compactedMessages: 9, tokensBefore: 40_000, tokensAfterEstimate: 8_000 },
  }))!
  assert.match(meter.tooltip, /本地估算/u)
  assert.match(meter.tooltip, /已压缩 9 条/u)
  assert.match(meter.tooltip, /40k → 8k/u)
  // percent falls back to tokens/window when the Host did not send it.
  assert.equal(meter.percent, (12_300 / 128_000) * 100)
})

function checkpoint(overrides: Partial<SessionContextCheckpoint> = {}): SessionContextCheckpoint {
  return {
    summary: '较早对话摘要',
    compactedMessageIds: ['m1', 'm2', 'm3'] as never,
    compactedAt: '2026-11-05T08:00:00.000Z',
    tokensBefore: 40_000,
    tokensAfterEstimate: 8_000,
    ...overrides,
  }
}

test('compression banner and compacted-id helpers', () => {
  assert.equal(compressionBannerText(undefined), undefined)
  assert.equal(compressionBannerText(checkpoint()),
    '较早对话已压缩（3 条）；模型使用摘要 + 最近消息，原文仍保留在本机。')
  assert.deepEqual([...compactedMessageIds(checkpoint())], ['m1', 'm2', 'm3'])
  assert.deepEqual([...compactedMessageIds(undefined)], [])
})

test('compression task result parsing is defensive', () => {
  assert.equal(parseCompressionResult(undefined), undefined)
  assert.equal(parseCompressionResult('nope'), undefined)
  assert.equal(parseCompressionResult([]), undefined)
  assert.equal(parseCompressionResult({}), undefined)
  assert.deepEqual(parseCompressionResult({ compacted: false, reason: '阈值未触发' }),
    { compacted: false, reason: '阈值未触发' })
  const outcome = parseCompressionResult({ compacted: true, checkpoint: checkpoint() })!
  assert.equal(outcome.compacted, true)
  assert.equal(outcome.checkpoint?.compactedMessageIds.length, 3)
  // Invalid checkpoint shape is dropped rather than trusted.
  assert.equal(parseCompressionResult({ compacted: true, checkpoint: { summary: 1 } })?.checkpoint, undefined)
})

test('compression success message mentions the compacted count when known', () => {
  assert.match(compressionSuccessMessage({ compacted: true, checkpoint: checkpoint() }), /3 条/u)
  assert.match(compressionSuccessMessage({ compacted: true }), /原文仍保留/u)
})
