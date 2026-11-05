/**
 * Presentation helpers for the context-window meter (pure, no React).
 *
 * The meter shows how full the model's context window is for the current
 * session. The number comes from the Host: either the prompt tokens the
 * provider reported for the most recent request, or a local estimate. When the
 * window is unknown only the token count is shown; no percentage is invented.
 */
import type { ContextUsageView } from '@deepseek-teaching/core/contracts'

/** Semantic tone used for the meter bar colour. */
export type ContextTone = 'ok' | 'warn' | 'danger'

/** Everything the TopBar needs to render one usage snapshot. */
export interface ContextMeterView {
  /** e.g. "12.3k / 128k (10%)" or "12.3k（窗口未知）". */
  readonly label: string
  /** 0..1 when both tokens and window are known; undefined otherwise. */
  readonly fraction?: number
  readonly percent?: number
  readonly tone: ContextTone
  /** Long explanation for the title attribute. */
  readonly tooltip: string
  /** True when the token count itself is unknown. */
  readonly unknown: boolean
}

/** Compact token formatting: 999 → "999", 1500 → "1.5k", 1250000 → "1.3M". */
export function formatTokenCount(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return '未知'
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) {
    const thousands = value / 1_000
    return `${thousands >= 100 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`
  }
  const millions = value / 1_000_000
  return `${Math.round(millions * 10) / 10}M`
}

/** Warm at 70% of the window, danger at 90%. */
export function toneForPercent(percent: number): ContextTone {
  if (percent >= 90) return 'danger'
  if (percent >= 70) return 'warn'
  return 'ok'
}

const SOURCE_LABELS: Readonly<Record<ContextUsageView['source'], string>> = {
  reported: '最近一次模型请求的服务端上报 prompt tokens',
  estimated: '本地估算（服务端未上报用量）',
  unknown: '暂无用量数据',
}

/** Build the meter view for the TopBar, or undefined when there is no snapshot. */
export function contextMeter(usage: ContextUsageView | undefined): ContextMeterView | undefined {
  if (usage === undefined) return undefined
  const tokens = usage.tokensUsed
  const window = usage.contextWindow
  const hasTokens = tokens !== undefined && Number.isFinite(tokens) && tokens >= 0
  const hasWindow = hasTokens && window !== undefined && Number.isFinite(window) && window > 0
  const percent = hasWindow
    ? (typeof usage.percent === 'number' && Number.isFinite(usage.percent)
      ? usage.percent
      : (tokens / window) * 100)
    : undefined
  const tone = percent === undefined ? 'ok' : toneForPercent(percent)
  const tokensLabel = hasTokens ? formatTokenCount(tokens) : '用量未知'
  const label = hasWindow && percent !== undefined
    ? `${tokensLabel} / ${formatTokenCount(window)} (${Math.round(percent)}%)`
    : hasTokens
      ? `${tokensLabel}（窗口未知）`
      : '用量未知'
  const tooltipParts = [
    SOURCE_LABELS[usage.source],
    hasWindow && percent !== undefined
      ? `已用 ${formatTokenCount(tokens)} / ${formatTokenCount(window)} tokens（${Math.round(percent)}%）`
      : hasTokens
        ? `已用 ${formatTokenCount(tokens)} tokens；该模型未报告上下文窗口，只显示用量。`
        : 'Host 尚未报告或估算出用量。',
    `模型：${usage.model.provider}/${usage.model.model}`,
    usage.reportedAt !== undefined ? `最近更新：${usage.reportedAt}` : '',
    usage.compressed !== undefined
      ? `较早对话已压缩 ${usage.compressed.compactedMessages} 条（约 ${formatTokenCount(usage.compressed.tokensBefore)} → ${formatTokenCount(usage.compressed.tokensAfterEstimate)} tokens）`
      : '',
    usage.note ?? '',
    '提示：该数字是最近一次请求的 prompt tokens（服务端上报或本地估算），不等同于精确的剩余窗口。',
  ].filter(part => part !== '')
  return {
    label,
    ...(hasWindow && percent !== undefined
      ? { fraction: Math.min(1, Math.max(0, tokens / window)), percent }
      : {}),
    tone,
    tooltip: tooltipParts.join('\n'),
    unknown: !hasTokens,
  }
}
