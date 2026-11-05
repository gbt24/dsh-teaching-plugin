/**
 * Detect fenced visual code blocks in teacher chat text.
 *
 * Teacher messages may contain ```svg / ```html / ```mermaid fences (often as a
 * fallback when the activity proposal failed). The chat renders a safe,
 * sandboxed preview card for them — it never executes the source in the plugin
 * page and never turns chat text into an activity automatically.
 */

/** One fence detected in a message. */
export interface ChatVisualFence {
  readonly renderer: 'svg' | 'html' | 'mermaid'
  readonly source: string
  /** 0-based order inside the message. */
  readonly index: number
}

const FENCE = /```[ \t]*(svg|html|mermaid)[ \t]*\r?\n([\s\S]*?)```/giu
/** At most a few previews per message keeps rendering bounded. */
const MAX_FENCES = 3
/** Same source limit as the visual activity validator. */
const MAX_SOURCE_CHARS = 200_000

/** Extract visual fences from one Markdown message (tolerant of fence casing). */
export function extractChatVisualFences(text: string): readonly ChatVisualFence[] {
  const fences: ChatVisualFence[] = []
  FENCE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE.exec(text)) !== null) {
    const renderer = (match[1] ?? '').toLowerCase() as ChatVisualFence['renderer']
    const source = match[2] ?? ''
    if (source.trim() === '' || source.length > MAX_SOURCE_CHARS) continue
    fences.push({ renderer, source, index: fences.length })
    if (fences.length >= MAX_FENCES) break
  }
  return fences
}
