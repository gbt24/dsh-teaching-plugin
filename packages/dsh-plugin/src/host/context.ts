/**
 * Teaching-prompt context budgeting and manual compaction.
 *
 * Follows the DSH compaction-basic policy shape (80% pressure threshold,
 * 16% recent-tail retention, 65,536-token headroom) while compacting the
 * plugin's own teaching conversation. The model context window is read from
 * the effective selection; because this deployment's window is large, the
 * default policy often has nothing to compact — the caller can request a
 * forced compaction of all but the last two messages.
 */
import type { ChatMessage } from '@deepseek-teaching/core'

/** Approximation used everywhere the provider does not report exact tokens. */
export const CHARS_PER_TOKEN = 2.5

/** Reserved completion tokens for chat/compaction calls. */
export const RESERVED_COMPLETION_TOKENS = 12_000
/** DSH compaction-basic default headroom. */
export const COMPACTION_HEADROOM_TOKENS = 65_536
/** DSH compaction-basic default pressure threshold. */
export const COMPACTION_THRESHOLD_RATIO = 0.8
/** DSH compaction-basic default recent-tail retention. */
export const COMPACTION_RETAIN_RATIO = 0.16
/** Provider generation cap for one summary; documented safety cap. */
export const SUMMARY_MAX_TOKENS = 12_000
/** Maximum characters of old messages replayed into the summary request. */
export const SUMMARY_INPUT_MAX_CHARS = 60_000

/** Estimate tokens for a text chunk (mixed Chinese/English). */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN))
}

/** Estimate the prompt tokens represented by one message list. */
export function estimateMessageTokens(messages: readonly ChatMessage[]): number {
  let total = 0
  for (const message of messages) total += estimateTokens(message.text) + 4
  return total
}

/** Concrete policy numbers for one context window. */
export interface CompactionPolicy {
  readonly contextWindow: number
  readonly thresholdTokens: number
  readonly retainTokens: number
}

/** Resolve DSH-shaped policy numbers for one model window. */
export function resolveCompactionPolicy(contextWindow: number | undefined): CompactionPolicy {
  const window = typeof contextWindow === 'number' && contextWindow > 0 ? contextWindow : 128_000
  const messageBudget = Math.max(4_096, window - RESERVED_COMPLETION_TOKENS)
  const pressureBudget = messageBudget - COMPACTION_HEADROOM_TOKENS
  const thresholdTokens = Math.max(0, Math.min(
    Math.floor(window * COMPACTION_THRESHOLD_RATIO),
    pressureBudget,
  ))
  const retainTokens = Math.max(256, Math.floor(messageBudget * COMPACTION_RETAIN_RATIO))
  return { contextWindow: window, thresholdTokens, retainTokens }
}

/** Messages selected for compaction plus the retained recent tail. */
export interface CompactionSelection {
  readonly compacted: readonly ChatMessage[]
  readonly retained: readonly ChatMessage[]
  readonly tokensBefore: number
  readonly reason?: string
}

/**
 * Select the compactable range.
 *
 * Default mode retains the DSH recent-tail token budget; when the whole
 * conversation fits in that tail there is nothing to compact. Forced mode
 * retains only the last {@link FORCE_RETAIN_MESSAGES} messages so an explicit
 * student action always has an effect.
 */
export const FORCE_RETAIN_MESSAGES = 2

export function selectCompactionRange(
  messages: readonly ChatMessage[],
  policy: CompactionPolicy,
  force: boolean,
): CompactionSelection {
  const tokensBefore = estimateMessageTokens(messages)
  if (messages.length <= 1) {
    return { compacted: [], retained: [...messages], tokensBefore, reason: '消息太少，无需压缩' }
  }
  if (force) {
    const keep = Math.min(FORCE_RETAIN_MESSAGES, messages.length - 1)
    const split = messages.length - keep
    return {
      compacted: messages.slice(0, split),
      retained: messages.slice(split),
      tokensBefore,
    }
  }
  if (tokensBefore <= policy.retainTokens) {
    return {
      compacted: [],
      retained: [...messages],
      tokensBefore,
      reason: `当前估算 ${tokensBefore} tokens，低于保留尾巴 ${policy.retainTokens} tokens（DSH 默认策略），无需压缩`,
    }
  }
  let retainedStart = messages.length
  let retainedTokens = 0
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message === undefined) break
    const cost = estimateTokens(message.text) + 4
    if (retainedTokens + cost > policy.retainTokens && retainedStart < messages.length) break
    retainedTokens += cost
    retainedStart = index
  }
  if (retainedStart <= 0) {
    return {
      compacted: [],
      retained: [...messages],
      tokensBefore,
      reason: '没有可压缩的早期消息（全部落在保留尾巴内）',
    }
  }
  return {
    compacted: messages.slice(0, retainedStart),
    retained: messages.slice(retainedStart),
    tokensBefore,
  }
}

/** The DSH-style summary instruction, adapted to teaching context. */
export const TEACHING_COMPACTION_INSTRUCTION = [
  'You are now acting as a compaction engine for an AI teaching assistant. Condense the conversation ABOVE into a structured checkpoint that lets another model resume the teaching with no loss of essential context.',
  '',
  'Output EXACTLY the Markdown structure below: keep every section, in order. Use terse bullets, not prose paragraphs. Write "(none)" for an empty section — never drop a section.',
  '',
  '## Primary Request and Intent',
  '- [the student\'s original and evolving learning goals; quote verbatim where the exact wording matters]',
  '',
  '## Course and Sources',
  '- [course title/revision, source files or anchors referenced, unresolved source uncertainty]',
  '',
  '## Key Concepts',
  '- [concepts taught, definition/conditions/examples the student has seen, with concept ids when present]',
  '',
  '## Activities and Evidence',
  '- [activities, student attempts, experiment outputs, help level, independence, what remains unverified]',
  '',
  '## Errors and Misunderstandings',
  '- [student misconceptions, failed attempts, corrections, and open questions]',
  '',
  '## Pending Jobs',
  '- [requested work not yet completed]',
  '',
  '## Current Work',
  '- [precisely what was in progress at this checkpoint]',
  '',
  '## Next Step',
  '- [the single next action in line with the latest student request, or "(none)"]',
  '',
  '## Critical Context',
  '- [decisions and rationale, constraints, student preferences, data needed to continue]',
  '',
  'Rules:',
  '- Preserve exact ids, file paths, source labels, numbers, code fragments and error strings.',
  '- Preserve student feedback and corrections faithfully.',
  '- Do not invent sources, anchors or results that were not present.',
  '- Do NOT mention this summarization request or that the context was compacted.',
  '- Output only the checkpoint text; do not call any tool.',
].join('\n')

/** Format the compactable messages for the summarization request. */
export function buildSummaryInput(messages: readonly ChatMessage[]): string {
  const lines: string[] = []
  for (const message of messages) {
    const role = message.role === 'student' ? '学生' : message.role === 'teacher' ? '助教' : '系统'
    lines.push(`### ${role}（${message.kind}，${message.createdAt}）`)
    lines.push(message.text)
    lines.push('')
  }
  let text = lines.join('\n')
  if (text.length > SUMMARY_INPUT_MAX_CHARS) {
    text = `…（较早内容已省略）\n${text.slice(text.length - SUMMARY_INPUT_MAX_CHARS)}`
  }
  return text
}

/** Estimated prompt tokens after a checkpoint is applied. */
export function estimateCompactedTokens(summary: string, retained: readonly ChatMessage[]): number {
  return estimateTokens(summary) + estimateMessageTokens(retained) + 16
}
