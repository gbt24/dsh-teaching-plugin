/**
 * HTML 抽取器。
 *
 * 用确定性的标签扫描器（不执行脚本、不联网）：
 * - 标题 → heading + sectionPath；段落/列表/引用 → paragraph/list/note；
 * - `<pre>` / `<code>` → code（保留语言类名）；
 * - TeX 公式（`<script type="math/tex">`、`$$..$$`、`\[..\]`）与 MathML → formula；
 * - `<table>` → table；`<img>` 本地图片写入资产，外链图片显式报告未下载；
 * - 定位：`locator.chars` 为原文（HTML 源）字符区间，`locator.lines` 为源码行区间。
 */
import { dirname } from 'node:path'
import type { ExtractionConfidence, SourceIssue, SourceLocator } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import { looksLikeFormula } from '../text-utils.ts'
import type { ParseContext } from './context.ts'
import { addLocalImageAsset, assetNamePrefix, assertTextual, isRemoteRef } from './context.ts'

const EXTRACTOR_VERSION = '1.0.0'

const TOKEN_REGEX = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)\/?>/g
const ATTR_REGEX = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'li', 'ul', 'ol',
  'blockquote', 'dt', 'dd', 'dl', 'figure', 'figcaption', 'form', 'fieldset', 'nav',
])

/** 解码常见 HTML 实体（含数字实体）。 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, full => {
    const body = full.slice(1, -1)
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : full
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : full
    }
    switch (body) {
      case 'amp': return '&'
      case 'lt': return '<'
      case 'gt': return '>'
      case 'quot': return '"'
      case 'apos': return "'"
      case 'nbsp': return ' '
      case 'mdash': return '—'
      case 'ndash': return '–'
      case 'hellip': return '…'
      default: return full
    }
  })
}

/** 从标签属性串解析键值。 */
function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  ATTR_REGEX.lastIndex = 0
  for (const match of raw.matchAll(ATTR_REGEX)) {
    const key = (match[1] ?? '').toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    if (key !== '') attrs[key] = decodeHtmlEntities(value)
  }
  return attrs
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' '))
}

/** 解析 HTML 文件。 */
export async function parseHtml(context: ParseContext): Promise<ParserOutput> {
  const raw = assertTextual(context.bytes, 'HTML 文件')
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const fileDir = dirname(context.path)
  const assetPrefix = assetNamePrefix(context.path)
  const lineStarts = computeLineStarts(raw)
  const totalLines = lineStarts.length

  const sectionPath: string[] = []
  let block: {
    tag: string
    startOffset: number
    endOffset: number
    text: string
  } | undefined
  let headingLevel = 0
  let inHead = false
  let tableDepth = 0
  let tableRows: string[][] = []
  let tableRow: string[] = []
  let tableCell: string | undefined
  let tableStart = 0
  let tableEnd = 0

  const lineOf = (offset: number): number => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if ((lineStarts[mid] as number) <= offset) low = mid
      else high = mid - 1
    }
    return low
  }
  const locatorRange = (startOffset: number, endOffset: number): SourceLocator => ({
    lines: [lineOf(startOffset) + 1, lineOf(Math.max(startOffset, endOffset)) + 1],
    chars: [startOffset, Math.max(startOffset, endOffset)],
    ...(sectionPath.length > 0 ? { sectionPath: [...sectionPath] } : {}),
  })
  const addIssue = (
    code: SourceIssue['code'],
    severity: SourceIssue['severity'],
    message: string,
    locator?: SourceLocator,
    reviewRequired = false,
  ): void => {
    budget.addIssue({
      code, severity, message, reviewRequired,
      ...(locator !== undefined ? { locator } : {}),
    })
  }

  const flushBlock = (tagOverride?: string): void => {
    if (block === undefined) return
    const tag = tagOverride ?? block.tag
    const text = block.text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    const locator = locatorRange(block.startOffset, block.endOffset)
    const current = block
    block = undefined
    if (text === '') return
    if (headingLevel > 0) {
      sectionPath.length = Math.min(sectionPath.length, headingLevel - 1)
      sectionPath.push(text.slice(0, 120))
      budget.addUnit({ kind: 'heading', locator: { ...locator, sectionPath: [...sectionPath] }, text, confidence: 'high' })
      headingLevel = 0
      return
    }
    if (tag === 'li') {
      budget.addUnit({ kind: 'list', locator, text, confidence: 'high' })
      return
    }
    if (tag === 'blockquote') {
      budget.addUnit({ kind: 'note', locator, text, confidence: 'high' })
      return
    }
    if (tag === 'pre' || tag === 'code') {
      budget.addUnit({ kind: 'code', locator, text: current.text.trimEnd(), confidence: 'high' })
      return
    }
    if (looksLikeFormula(text) && text.length <= 400) {
      budget.addUnit({ kind: 'formula', locator, text, confidence: 'medium' })
      addIssue('formula-uncertain', 'info', '该段被识别为公式（启发式判断），请核对原文', locator)
      return
    }
    budget.addUnit({ kind: 'paragraph', locator, text, confidence: 'high' })
  }

  const appendText = (text: string): void => {
    if (text === '') return
    if (block === undefined) {
      if (text.trim() === '') return
      block = { tag: 'p', startOffset: lastOffset, endOffset: lastOffset, text: '' }
    }
    const normalized = text.replace(/\r/g, '')
    block.text += normalized
    block.endOffset = lastOffset + normalized.length
  }

  let lastOffset = 0
  let match: RegExpExecArray | null
  TOKEN_REGEX.lastIndex = 0
  while ((match = TOKEN_REGEX.exec(raw)) !== null) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    const tokenStart = match.index
    const between = raw.slice(lastOffset, tokenStart)
    if (between !== '') {
      if (!inHead && tableDepth === 0) appendText(decodeHtmlEntities(between))
      else if (tableDepth > 0 && tableCell !== undefined) tableCell += decodeHtmlEntities(between)
    }
    lastOffset = tokenStart + match[0].length
    const tagName = (match[1] ?? '').toLowerCase()
    const attrsRaw = match[2] ?? ''
    const isClosing = match[0].startsWith('</')
    if (tagName === '') continue

    // 需要跳过内容或整体抽取的标签
    if (!isClosing && (tagName === 'script' || tagName === 'style' || tagName === 'pre'
      || tagName === 'math' || tagName === 'title' || tagName === 'svg')) {
      const closeTag = new RegExp(`</${tagName}\\s*>`, 'i')
      const rest = raw.slice(lastOffset)
      const closeMatch = closeTag.exec(rest)
      const innerEnd = closeMatch !== null ? lastOffset + closeMatch.index : raw.length
      const inner = raw.slice(lastOffset, innerEnd)
      lastOffset = closeMatch !== null ? innerEnd + closeMatch[0].length : raw.length
      TOKEN_REGEX.lastIndex = lastOffset
      const attrs = parseAttrs(attrsRaw)
      if (tagName === 'script') {
        const type = (attrs['type'] ?? '').toLowerCase()
        if (type.includes('math/tex')) {
          const tex = stripTags(inner).trim()
          if (tex !== '') {
            budget.addUnit({
              kind: 'formula', locator: locatorRange(tokenStart, lastOffset), text: tex, confidence: 'high',
            })
          }
        }
      } else if (tagName === 'math') {
        const tex = stripTags(inner).replace(/\s+/g, ' ').trim()
        if (tex !== '') {
          budget.addUnit({
            kind: 'formula', locator: locatorRange(tokenStart, lastOffset), text: tex, confidence: 'medium',
            notes: ['MathML 公式按纯文本保留，未转换为 TeX'],
          })
          addIssue('formula-uncertain', 'info', 'MathML 公式仅保留纯文本，复杂结构可能丢失', locatorRange(tokenStart, lastOffset))
        }
      } else if (tagName === 'pre') {
        const language = /(?:^|\s)language-([\w+#.-]+)/.exec(attrs['class'] ?? '')?.[1]
        const code = stripTags(inner).replace(/^\n/, '').trimEnd()
        if (code.trim() !== '') {
          budget.addUnit({
            kind: 'code', locator: locatorRange(tokenStart, lastOffset), text: code, confidence: 'high',
            ...(language !== undefined ? { notes: [`语言：${language}`] } : {}),
          })
        }
      }
      // style/title/svg 内容忽略
      continue
    }

    if (tagName === 'head') {
      inHead = !isClosing
      continue
    }
    if (tagName === 'img') {
      const attrs = parseAttrs(attrsRaw)
      const ref = attrs['src'] ?? ''
      const alt = attrs['alt'] ?? attrs['title'] ?? ''
      const locator = locatorRange(tokenStart, lastOffset)
      if (isRemoteRef(ref)) {
        budget.addUnit({
          kind: 'figure', locator,
          text: alt.trim() === '' ? '外链图片' : alt.trim(),
          confidence: 'unknown',
          notes: [`外链图片未下载：${ref}`],
        })
        addIssue('unsupported-content', 'info', 'HTML 引用了外部图片，本版本不联网下载', locator)
      } else {
        const asset = await addLocalImageAsset(budget, fileDir, ref, assetPrefix)
        if (asset !== undefined && asset.assetPath !== undefined) {
          budget.addUnit({
            kind: 'figure', locator, text: alt.trim() === '' ? '图片' : alt.trim(),
            assetPath: asset.assetPath, confidence: 'high',
          })
        } else {
          budget.addUnit({
            kind: 'figure', locator, text: alt.trim() === '' ? `图片（缺失：${ref}）` : alt.trim(),
            confidence: 'unknown',
            notes: [`图片文件缺失或无法读取：${ref}`],
          })
          addIssue('figure-unreadable', 'warning', 'HTML 引用的图片缺失或无法读取，可回看原文件核对', locator, true)
        }
      }
      continue
    }
    if (tagName === 'br') {
      if (block !== undefined) block.text += '\n'
      continue
    }
    if (tagName === 'table') {
      if (isClosing) {
        tableDepth = 0
        const rows = tableRows.filter(row => row.some(cell => cell.trim() !== ''))
        if (rows.length > 0) {
          const text = rows.map(row => row.map(cell => cell.trim()).join(' | ')).join('\n')
          budget.addUnit({ kind: 'table', locator: locatorRange(tableStart, tableEnd), text, confidence: 'high' })
        }
        tableRows = []
        tableRow = []
        tableCell = undefined
      } else {
        tableDepth += 1
        tableStart = tokenStart
        tableEnd = lastOffset
        tableRows = []
        tableRow = []
        tableCell = undefined
      }
      continue
    }
    if (tagName === 'tr') {
      if (isClosing) {
        if (tableRow.length > 0 || tableCell !== undefined) {
          tableRows.push([...tableRow, tableCell ?? ''])
          tableRow = []
          tableCell = undefined
        }
      } else {
        tableRow = []
        tableCell = undefined
      }
      continue
    }
    if (tagName === 'td' || tagName === 'th') {
      if (isClosing) {
        if (tableCell !== undefined) tableRow.push(tableCell)
        tableCell = undefined
      } else {
        tableCell = ''
      }
      continue
    }
    if (tableDepth > 0) {
      tableEnd = lastOffset
      continue
    }

    if (HEADING_TAGS.has(tagName)) {
      if (!isClosing) {
        flushBlock()
        headingLevel = Number(tagName.slice(1))
        block = { tag: 'p', startOffset: tokenStart, endOffset: lastOffset, text: '' }
      } else {
        flushBlock()
      }
      continue
    }
    if (BLOCK_TAGS.has(tagName)) {
      if (!isClosing) {
        flushBlock()
        const kindTag = tagName === 'li' ? 'li'
          : tagName === 'blockquote' ? 'blockquote'
            : tagName === 'figcaption' ? 'p' : 'p'
        block = { tag: kindTag, startOffset: tokenStart, endOffset: lastOffset, text: '' }
      } else {
        flushBlock(tagName === 'li' ? 'li' : tagName === 'blockquote' ? 'blockquote' : 'p')
      }
      continue
    }
  }
  if (lastOffset < raw.length && !inHead) {
    appendText(decodeHtmlEntities(raw.slice(lastOffset)))
  }
  flushBlock()
  if (budget.units.length === 0) {
    addIssue('unsupported-content', 'warning', 'HTML 中没有抽取到可读正文', undefined, true)
  }
  return budget.finalize('html', undefined, {
    name: 'teaching-corpus/html',
    version: EXTRACTOR_VERSION,
  }, { kind: 'lines', count: totalLines })
}

function computeLineStarts(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

/** 供测试复用：HTML 解析中的置信度类型。 */
export type HtmlConfidence = ExtractionConfidence
