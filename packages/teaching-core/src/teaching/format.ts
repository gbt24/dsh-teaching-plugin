/**
 * 教学提示词里用到的纯格式化工具：定位描述、截断、列表渲染。
 */
import type { SourceLocator } from '../contracts/source.ts'

/** 截断长文本，保留可读的开头；不添加省略号以外的加工。 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`
}

/**
 * 截断长文本但保留换行结构（压缩检查点、多行摘要用）。
 * 与 {@link truncate} 不同：不折叠空白，行首/段落结构原样保留。
 */
export function truncatePreserveLines(text: string, max: number): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}\n…（摘要已截断）`
}

/** 把原文定位描述成学生/模型都能读的短串（不虚构精度）。 */
export function formatLocator(locator: SourceLocator): string {
  const parts: string[] = []
  if (locator.sectionPath !== undefined && locator.sectionPath.length > 0) {
    parts.push(locator.sectionPath.join(' › '))
  }
  if (locator.page !== undefined) parts.push(`第 ${locator.page} 页`)
  if (locator.slide !== undefined) parts.push(`第 ${locator.slide} 张幻灯片`)
  if (locator.cell !== undefined) parts.push(`第 ${locator.cell + 1} 个单元`)
  if (locator.lines !== undefined) parts.push(`第 ${locator.lines[0]}–${locator.lines[1]} 行`)
  if (locator.chars !== undefined) parts.push(`字符 ${locator.chars[0]}–${locator.chars[1]}`)
  return parts.length > 0 ? parts.join(' · ') : '位置未知'
}

/** 渲染编号列表项（无内容时返回占位行）。 */
export function formatList(items: readonly string[], emptyText = '（无）'): string {
  return items.length === 0 ? emptyText : items.map(item => `- ${item}`).join('\n')
}
