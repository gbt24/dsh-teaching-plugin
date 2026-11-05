/**
 * Pure helpers for the manual context-compression flow (no React).
 *
 * The Host runs compression as a long task whose `snapshot.result` is untyped;
 * these helpers parse that result safely and derive the student-facing texts
 * (confirmation dialog / compacted banner).
 */
import type { SessionContextCheckpoint } from '@deepseek-teaching/core/contracts'

/** Parsed result of one `context.compress` task. */
export interface CompressionOutcome {
  readonly compacted: boolean
  readonly reason?: string
  readonly checkpoint?: SessionContextCheckpoint
}

/** Explanation shown before the student confirms compression. */
export const COMPRESSION_CONFIRM_TEXT: string = [
  '按 DeepSeek Harness 的保留规则压缩较早对话：较早消息会被替换为结构化摘要，模型只看到摘要 + 最近消息。',
  '本机仍保留完整对话原文，可展开查看，不会删除学习记录或笔记。',
  '压缩只影响后续模型请求的上下文，不改变活动、学情或资料。',
].join('')

/** Explanation beside the "force compress" retry. */
export const COMPRESSION_FORCE_TEXT: string =
  '强制压缩会忽略保留阈值，并保留更短的最近对话；较早内容同样只以摘要形式提供给模型，原文仍在本机。'

/** Parse `TaskSnapshot.result` for a compression task. */
export function parseCompressionResult(result: unknown): CompressionOutcome | undefined {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return undefined
  const record = result as {
    compacted?: unknown
    reason?: unknown
    checkpoint?: unknown
  }
  if (typeof record.compacted !== 'boolean') return undefined
  const reason = typeof record.reason === 'string' && record.reason !== '' ? record.reason : undefined
  const checkpoint = isCheckpoint(record.checkpoint) ? record.checkpoint : undefined
  return {
    compacted: record.compacted,
    ...(reason !== undefined ? { reason } : {}),
    ...(checkpoint !== undefined ? { checkpoint } : {}),
  }
}

function isCheckpoint(value: unknown): value is SessionContextCheckpoint {
  if (typeof value !== 'object' || value === null) return false
  const record = value as { summary?: unknown; compactedMessageIds?: unknown; compactedAt?: unknown }
  return typeof record.summary === 'string'
    && Array.isArray(record.compactedMessageIds)
    && typeof record.compactedAt === 'string'
}

/** Banner text for a session that already has a compressed context checkpoint. */
export function compressionBannerText(context: SessionContextCheckpoint | undefined): string | undefined {
  if (context === undefined) return undefined
  const count = context.compactedMessageIds.length
  return `较早对话已压缩（${count} 条）；模型使用摘要 + 最近消息，原文仍保留在本机。`
}

/** Message ids hidden from the default message flow behind the details block. */
export function compactedMessageIds(context: SessionContextCheckpoint | undefined): ReadonlySet<string> {
  return new Set((context?.compactedMessageIds ?? []).map(id => id as string))
}

/** Success notification after a compaction ran. */
export function compressionSuccessMessage(outcome: CompressionOutcome): string {
  const count = outcome.checkpoint?.compactedMessageIds.length
  if (count !== undefined) return `已压缩较早的 ${count} 条对话；原文仍保留在本机，后续教学使用摘要 + 最近消息。`
  return '已完成上下文压缩；原文仍保留在本机。'
}
