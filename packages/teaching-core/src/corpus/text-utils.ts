/**
 * 中英文检索用的文本工具：归一化、分词（英文词干/CJK 单字+二元组/公式符号）、
 * 摘录与定位描述。
 *
 * 这里刻意保持「可解释、确定性、无词典依赖」：检索结果要能告诉学生为什么命中，
 * 因此 matchedTerms 使用可读的查询词（而不是内部词干编码）。
 */
import type { SourceLocator } from '../contracts/source.ts'

/** 低信息量英文停用词（仅用于索引/查询，不改变原文）。 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'for', 'from',
  'had', 'has', 'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'our', 'she', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'to', 'was', 'we', 'were', 'what', 'when', 'which', 'who', 'will', 'with', 'you',
])

/** CJK 统一表意文字范围（含扩展 A 与兼容区）。 */
export function isCjkChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0
  return (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff)
}

const CJK_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g
// '-' 作为分隔符处理（避免连字符/列表符号产生噪声 token）；'.' '_' 保留在标识符内
const ASCII_WORD = /[a-z0-9]+(?:[._'][a-z0-9]+)*/g
// 只把真正的公式符号编入索引；单独的 '-' 不索引，避免匹配所有列表/连字符文本
const MATH_SYMBOLS = /[+*/^=<>≤≥≠≈→←↔∂∇√∫∑∏∞∈∉⊂⊆∪∩]+/g

/** 极简英文词干化：只处理高频屈折后缀，保证同词根命中（不追求语言学正确）。 */
export function stemEnglish(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies') && word.length >= 5) return `${word.slice(0, -3)}y`
  if (word.endsWith('ss') || word.endsWith('us') || word.endsWith('is')) return word
  let stem = word
  if (stem.endsWith('s')) stem = stem.slice(0, -1)
  if (stem.endsWith('ing') && stem.length >= 6) stem = stem.slice(0, -3)
  else if (stem.endsWith('ed') && stem.length >= 5) stem = stem.slice(0, -2)
  else if (stem.endsWith('ly') && stem.length >= 5) stem = stem.slice(0, -2)
  return stem
}

/** 归一化：NFKC（全角→半角、兼容字符）并小写。原文展示不受影响。 */
export function normalizeForIndex(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/** 一个检索词：term 用于倒排索引匹配，display 用于向学生解释命中原因。 */
export interface QueryToken {
  readonly term: string
  readonly display: string
}

/** 把文本切成索引词（英文词干、CJK 单字+二元组、公式符号）。 */
export function tokenizeForIndex(text: string): string[] {
  const out: string[] = []
  const normalized = normalizeForIndex(text)
  for (const match of normalized.matchAll(ASCII_WORD)) {
    const word = match[0]
    if (STOPWORDS.has(word)) continue
    out.push(stemEnglish(word))
  }
  for (const match of normalized.matchAll(CJK_RUN)) {
    const run = match[0]
    for (let i = 0; i < run.length; i += 1) out.push(run[i] as string)
    for (let i = 0; i < run.length - 1; i += 1) out.push(run.slice(i, i + 2))
  }
  for (const match of normalized.matchAll(MATH_SYMBOLS)) out.push(`sym:${match[0]}`)
  return out
}

/** 把查询切成检索词；CJK 多字串优先用二元组以保证精度，单字查询用单字。 */
export function tokenizeQuery(query: string): QueryToken[] {
  const out: QueryToken[] = []
  const seen = new Set<string>()
  const push = (term: string, display: string): void => {
    if (term === '' || seen.has(term)) return
    seen.add(term)
    out.push({ term, display })
  }
  const normalized = normalizeForIndex(query)
  for (const match of normalized.matchAll(ASCII_WORD)) {
    const word = match[0]
    if (STOPWORDS.has(word)) continue
    push(stemEnglish(word), word)
  }
  for (const match of normalized.matchAll(CJK_RUN)) {
    const run = match[0]
    if (run.length === 1) {
      push(run, run)
      continue
    }
    for (let i = 0; i < run.length - 1; i += 1) {
      const bigram = run.slice(i, i + 2)
      push(bigram, bigram)
    }
  }
  for (const match of normalized.matchAll(MATH_SYMBOLS)) push(`sym:${match[0]}`, match[0])
  if (out.length === 0 && normalized.trim() !== '') {
    const fallback = normalized.trim().slice(0, 40)
    push(fallback, query.trim().slice(0, 40))
  }
  return out
}

/** 压缩空白并截断为一段可展示的摘录。 */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 生成有界摘录；优先围绕首个命中词，便于学生核对原文。 */
export function excerptAround(text: string, terms: readonly string[], max = 240): string {
  const clean = collapseWhitespace(text)
  if (clean.length <= max) return clean
  const lower = clean.toLowerCase()
  let index = -1
  for (const term of terms) {
    const display = term.startsWith('sym:') ? term.slice(4) : term
    const found = lower.indexOf(display.toLowerCase())
    if (found !== -1) {
      index = found
      break
    }
  }
  const keep = Math.max(20, max - 2)
  if (index === -1) return `${clean.slice(0, keep)}…`
  const start = Math.max(0, Math.min(index - Math.floor(keep / 3), clean.length - keep))
  const body = clean.slice(start, start + keep)
  return `${start > 0 ? '…' : ''}${body}${start + keep < clean.length ? '…' : ''}`
}

const STRONG_MATH_CHARS = /[=^∫∑√≤≥≠≈∞∂∇→←↔πλθαβγδσφωμ×÷±∈∉⊂⊆∪∩]/g
const STRONG_MATH_CHARS_ONLY = /[=^∫∑√≤≥≠≈∞∂∇→←↔πλθαβγδσφωμ×÷±∈∉⊂⊆∪∩]/
const TEX_COMMAND = /\\(?:frac|lim|sum|int|sqrt|alpha|beta|theta|lambda|mu|pi|sigma|phi|omega|cdot|times|div|leq|geq|neq|approx|infty|partial|nabla|rightarrow|leftarrow|leftrightarrow|forall|exists|in|notin|subset|subseteq|cup|cap|left|right)\b/

/** 判断一段文本是否更像公式而不是自然语言句子（保守启发式）。 */
export function looksLikeFormula(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed.length > 400) return false
  if (TEX_COMMAND.test(trimmed)) return true
  if (/\$[^$]+\$/.test(trimmed)) return true
  const strong = (trimmed.match(STRONG_MATH_CHARS) ?? []).length
  if (strong >= 3) return true
  const operators = (trimmed.match(/[+*/]/g) ?? []).length
  return strong >= 1 && operators >= 1 && trimmed.split(/\s+/).length <= 40
}

/** 是否包含内联公式（段落不会被拆成公式单元，但会带注释）。 */
export function containsInlineMath(text: string): boolean {
  return /\$[^$\n]{2,}\$/.test(text) || /\\\([^)\n]{2,}\\\)/.test(text) || TEX_COMMAND.test(text)
}

/** 公式符号占比，用于 Office/HTML 文本块的公式启发式。 */
export function mathSymbolRatio(text: string): number {
  const visible = text.replace(/\s+/g, '')
  if (visible === '') return 0
  const strong = (text.match(STRONG_MATH_CHARS_ONLY) ?? []).length
  return strong / visible.length
}

/** 把定位信息转成引用里可读的短标签。 */
export function locatorDescription(locator: SourceLocator): string {
  const parts: string[] = []
  if (locator.sectionPath !== undefined && locator.sectionPath.length > 0) {
    parts.push(locator.sectionPath.slice(0, 3).join(' / '))
  }
  if (locator.page !== undefined) parts.push(`第 ${locator.page} 页`)
  if (locator.slide !== undefined) parts.push(`幻灯片 ${locator.slide}`)
  if (locator.cell !== undefined) parts.push(`第 ${locator.cell + 1} 个单元`)
  if (locator.lines !== undefined) parts.push(`第 ${locator.lines[0]}-${locator.lines[1]} 行`)
  if (locator.bbox !== undefined) parts.push('区域定位')
  if (parts.length === 0 && locator.chars !== undefined) {
    parts.push(`字符 ${locator.chars[0]}-${locator.chars[1]}`)
  }
  return parts.length > 0 ? parts.join(' · ') : '原文定位'
}

/** 把字符串限制在 [0,1] 区间。 */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}
