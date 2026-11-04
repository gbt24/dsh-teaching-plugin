/**
 * 纯文本、Markdown、代码文件的抽取器。
 *
 * 定位约定：
 * - 文本/Markdown/代码使用 `locator.lines`（1-based 闭区间）与
 *   `locator.chars`（0-based 闭区间，相对该文件/该 Markdown 文本）；
 * - Markdown 标题维护 `locator.sectionPath`，公式单元保留 TeX/原文，
 *   代码单元保留语言与行号（`notes` 中给出语言）。
 */
import { dirname } from 'node:path'
import type { ExtractionConfidence, SourceIssue, SourceLocator, SourceUnit } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import type { ParseContext } from './context.ts'
import {
  addLocalImageAsset, assetNamePrefix, assertTextual, isRemoteRef,
} from './context.ts'
import { containsInlineMath, looksLikeFormula } from '../text-utils.ts'

const EXTRACTOR_VERSION = '1.0.0'

const LIST_LINE = /^\s*(?:[-*+]|\d{1,3}[.)])\s+/
const IMAGE_INLINE = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g

/** 计算每行起始字符偏移。 */
export function lineStarts(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

/** 按 \n 切行并去掉行尾 \r。 */
export function splitLines(text: string): string[] {
  return text.split('\n').map(line => (line.endsWith('\r') ? line.slice(0, -1) : line))
}

/** 若干行的字符区间（闭区间）；空区间返回 undefined。 */
function charsRange(
  lines: readonly string[],
  starts: readonly number[],
  startIndex: number,
  endIndex: number,
): readonly [number, number] | undefined {
  const start = starts[startIndex]
  if (start === undefined) return undefined
  let last = endIndex
  while (last > startIndex && (lines[last] ?? '') === '') last -= 1
  const lineStart = starts[last]
  if (lineStart === undefined) return undefined
  const end = lineStart + Math.max(0, (lines[last] ?? '').length - 1)
  return [start, Math.max(start, end)]
}

/** 行区间（1-based 闭区间）。 */
function linesRange(startIndex: number, endIndex: number): readonly [number, number] {
  return [startIndex + 1, endIndex + 1]
}

/** 给定位补充基础定位（例如 Notebook cell）。 */
function mergeLocator(base: SourceLocator | undefined, extra: SourceLocator): SourceLocator {
  if (base === undefined) return extra
  return { ...base, ...extra }
}

function issueOf(
  code: SourceIssue['code'],
  severity: SourceIssue['severity'],
  message: string,
  extra: { locator?: SourceLocator; excerpt?: string; reviewRequired: boolean },
): SourceIssue {
  return {
    code,
    severity,
    message,
    reviewRequired: extra.reviewRequired,
    ...(extra.locator !== undefined ? { locator: extra.locator } : {}),
    ...(extra.excerpt !== undefined ? { excerpt: extra.excerpt.slice(0, 240) } : {}),
  }
}

/* ------------------------------------------------------------------ 纯文本 */

/** 解析纯文本文件。 */
export async function parsePlainText(context: ParseContext): Promise<ParserOutput> {
  const text = assertTextual(context.bytes, '纯文本文件')
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const lines = splitLines(text)
  const starts = lineStarts(text)
  let index = 0
  while (index < lines.length) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    const line = lines[index] ?? ''
    if (line.trim() === '') {
      index += 1
      continue
    }
    const startIndex = index
    while (index < lines.length && (lines[index] ?? '').trim() !== '') index += 1
    const endIndex = index - 1
    await addTextBlock(budget, {
      lines, starts, startIndex, endIndex,
      sectionPath: [],
      baseLocator: undefined,
    })
  }
  return budget.finalize('text', undefined, { name: 'teaching-corpus/text', version: EXTRACTOR_VERSION }, {
    kind: 'lines',
    count: lines.length,
  })
}

/** 把一组连续行拆分为受字符上限约束的单元。 */
async function addTextBlock(
  budget: ExtractionBudget,
  options: {
    readonly lines: readonly string[]
    readonly starts: readonly number[]
    readonly startIndex: number
    readonly endIndex: number
    readonly sectionPath: readonly string[]
    readonly baseLocator: SourceLocator | undefined
  },
): Promise<void> {
  const { lines, starts } = options
  let cursor = options.startIndex
  while (cursor <= options.endIndex) {
    budget.checkAbort()
    const chunkStart = cursor
    let buffer = ''
    let chunkEnd = cursor
    while (chunkEnd <= options.endIndex) {
      const nextLine = lines[chunkEnd] ?? ''
      if (buffer !== '' && buffer.length + nextLine.length + 1 > budget.limits.maxUnitChars) break
      buffer = buffer === '' ? nextLine : `${buffer}\n${nextLine}`
      chunkEnd += 1
    }
    if (chunkEnd === chunkStart) chunkEnd = chunkStart + 1
    const endIndex = chunkEnd - 1
    const body = options.lines.slice(chunkStart, endIndex + 1).join('\n').trim()
    if (body !== '') {
      const chars = charsRange(lines, starts, chunkStart, endIndex)
      const locator: SourceLocator = {
        ...(options.baseLocator ?? {}),
        ...(options.sectionPath.length > 0 ? { sectionPath: [...options.sectionPath] } : {}),
        lines: linesRange(chunkStart, endIndex),
        ...(chars !== undefined ? { chars } : {}),
      }
      const singleLine = endIndex === chunkStart
      const allListLines = lines.slice(chunkStart, endIndex + 1).every(line => LIST_LINE.test(line))
      let kind: SourceUnit['kind'] = 'paragraph'
      let confidence: ExtractionConfidence = 'high'
      if (allListLines) kind = 'list'
      else if ((singleLine || endIndex - chunkStart === 1) && looksLikeFormula(body)) {
        kind = 'formula'
        confidence = 'medium'
        budget.addIssue(issueOf('formula-uncertain', 'info',
          '该行被识别为公式（启发式判断），请核对原文的符号与条件', {
            locator,
            excerpt: body,
            reviewRequired: false,
          }))
      }
      budget.addUnit({ kind, locator, text: body, confidence })
    }
    cursor = chunkEnd
  }
}

/* ------------------------------------------------------------------ 代码 */

const CODE_LANGUAGES: Readonly<Record<string, string>> = {
  '.py': 'python', '.pyw': 'python',
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.tsx': 'tsx', '.jsx': 'jsx',
  '.scm': 'scheme', '.ss': 'scheme', '.rkt': 'racket', '.lisp': 'lisp', '.el': 'elisp',
  '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.hpp': 'cpp', '.cxx': 'cpp',
  '.java': 'java', '.kt': 'kotlin', '.cs': 'csharp', '.go': 'go', '.rs': 'rust',
  '.rb': 'ruby', '.php': 'php', '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh',
  '.sql': 'sql', '.r': 'r', '.jl': 'julia', '.hs': 'haskell', '.ml': 'ocaml',
  '.swift': 'swift', '.pl': 'perl', '.lua': 'lua', '.toml': 'toml',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.css': 'css', '.scss': 'scss',
}

/** 由扩展名推断代码语言（未知返回 undefined）。 */
export function codeLanguageOf(extension: string): string | undefined {
  return CODE_LANGUAGES[extension]
}

/** 解析代码文件：按行块产出 code 单元，保留语言与行号。 */
export async function parseCode(context: ParseContext): Promise<ParserOutput> {
  const text = assertTextual(context.bytes, '代码文件')
  const language = codeLanguageOf(context.extension) ?? 'text'
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const lines = splitLines(text)
  const starts = lineStarts(text)
  const maxLinesPerUnit = 80
  let cursor = 0
  while (cursor < lines.length) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    let endIndex = cursor
    let length = 0
    while (endIndex < lines.length && endIndex - cursor < maxLinesPerUnit) {
      const next = lines[endIndex] ?? ''
      if (length > 0 && length + next.length + 1 > budget.limits.maxUnitChars) break
      length += next.length + 1
      endIndex += 1
    }
    const body = lines.slice(cursor, endIndex).join('\n')
    const chars = charsRange(lines, starts, cursor, endIndex - 1)
    const locator: SourceLocator = {
      lines: linesRange(cursor, endIndex - 1),
      ...(chars !== undefined ? { chars } : {}),
    }
    budget.addUnit({
      kind: 'code',
      locator,
      text: body,
      confidence: 'high',
      notes: [`语言：${language}`],
    })
    cursor = endIndex
  }
  return budget.finalize('code', language, {
    name: 'teaching-corpus/code',
    version: EXTRACTOR_VERSION,
  }, {
    kind: 'lines',
    count: lines.length,
  })
}

/* ------------------------------------------------------------------ Markdown */

/** Markdown 抽取选项（Notebook 单元格复用）。 */
export interface MarkdownExtractOptions {
  readonly budget: ExtractionBudget
  /** 用于解析相对图片路径的目录（Markdown 文件所在目录）。 */
  readonly fileDir: string
  /** 基础定位（Notebook 的 cell）。 */
  readonly baseLocator?: SourceLocator
  /** 资产名前缀。 */
  readonly assetPrefix: string
  /** 是否强制全部视为 Markdown（Notebook markdown 单元格）。 */
  readonly headingOffset?: number
}

/** 解析 Markdown 文件。 */
export async function parseMarkdown(context: ParseContext): Promise<ParserOutput> {
  const text = assertTextual(context.bytes, 'Markdown 文件')
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  await extractMarkdown(text, {
    budget,
    fileDir: dirname(context.path),
    assetPrefix: assetNamePrefix(context.path),
  })
  return budget.finalize('markdown', undefined, {
    name: 'teaching-corpus/markdown',
    version: EXTRACTOR_VERSION,
  }, {
    kind: 'lines',
    count: splitLines(text).length,
  })
}

/** 把 Markdown 文本抽取进预算器；供 .md 文件与 Notebook markdown 单元格复用。 */
export async function extractMarkdown(text: string, options: MarkdownExtractOptions): Promise<void> {
  const { budget } = options
  const lines = splitLines(text)
  const starts = lineStarts(text)
  const sectionPath: string[] = []
  let index = 0
  const addUnitWithLocator = (
    kind: SourceUnit['kind'],
    locator: SourceLocator,
    body: string,
    extra: {
      markdown?: string
      confidence?: ExtractionConfidence
      notes?: readonly string[]
      assetPath?: string
    } = {},
  ): void => {
    budget.addUnit({
      kind,
      locator: mergeLocator(options.baseLocator, locator),
      text: body,
      confidence: extra.confidence ?? 'high',
      ...(extra.markdown !== undefined ? { markdown: extra.markdown } : {}),
      ...(extra.notes !== undefined ? { notes: extra.notes } : {}),
      ...(extra.assetPath !== undefined ? { assetPath: extra.assetPath } : {}),
    })
  }
  const withSection = (extra: SourceLocator): SourceLocator => (
    sectionPath.length > 0 ? { ...extra, sectionPath: [...sectionPath] } : extra
  )

  while (index < lines.length) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    const line = lines[index] ?? ''
    if (line.trim() === '') {
      index += 1
      continue
    }

    // 标题
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading !== null) {
      const level = (heading[1] ?? '#').length
      const title = (heading[2] ?? '').trim()
      sectionPath.length = Math.max(0, level - 1)
      sectionPath.push(title)
      const chars = charsRange(lines, starts, index, index)
      addUnitWithLocator('heading', {
        lines: linesRange(index, index),
        ...(chars !== undefined ? { chars } : {}),
        sectionPath: [...sectionPath],
      }, title, { markdown: line })
      index += 1
      continue
    }

    // 围栏代码块
    const fence = /^\s*(```|~~~)\s*([A-Za-z0-9_+#.-]*)\s*$/.exec(line)
    if (fence !== null) {
      const marker = fence[1] ?? '```'
      const language = (fence[2] ?? '').trim()
      const startIndex = index
      index += 1
      const bodyLines: string[] = []
      let closed = false
      while (index < lines.length) {
        const current = lines[index] ?? ''
        if (current.trim().startsWith(marker)) {
          closed = true
          index += 1
          break
        }
        bodyLines.push(current)
        index += 1
      }
      if (!closed) {
        budget.addIssue(issueOf('unsupported-content', 'warning',
          '代码围栏未闭合，后续内容被当作代码读取', {
            locator: withSection({ lines: linesRange(startIndex, lines.length - 1) }),
            reviewRequired: false,
          }))
      }
      const chars = charsRange(lines, starts, startIndex, Math.max(startIndex, index - 1))
      addUnitWithLocator('code', withSection({
        lines: linesRange(startIndex, Math.max(startIndex, index - 1)),
        ...(chars !== undefined ? { chars } : {}),
      }), bodyLines.join('\n'), {
        markdown: lines.slice(startIndex, index).join('\n'),
        notes: [`语言：${language === '' ? '未标注' : language}`],
      })
      continue
    }

    // 块级公式（$$ ... $$ 或 \[ ... \]）
    const dollarLine = /^\s*\$\$\s*$/.test(line)
    if (dollarLine) {
      const startIndex = index
      index += 1
      const bodyLines: string[] = []
      while (index < lines.length && !/^\s*\$\$\s*$/.test(lines[index] ?? '')) {
        bodyLines.push(lines[index] ?? '')
        index += 1
      }
      index = Math.min(lines.length, index + 1)
      const tex = bodyLines.join('\n').trim()
      const chars = charsRange(lines, starts, startIndex, Math.max(startIndex, index - 1))
      addUnitWithLocator('formula', withSection({
        lines: linesRange(startIndex, Math.max(startIndex, index - 1)),
        ...(chars !== undefined ? { chars } : {}),
      }), tex, { markdown: lines.slice(startIndex, index).join('\n') })
      continue
    }
    const singleDollar = /^\s*\$\$(.+?)\$\$\s*$/.exec(line)
    if (singleDollar !== null) {
      const chars = charsRange(lines, starts, index, index)
      addUnitWithLocator('formula', withSection({
        lines: linesRange(index, index),
        ...(chars !== undefined ? { chars } : {}),
      }), (singleDollar[1] ?? '').trim(), { markdown: line })
      index += 1
      continue
    }
    if (/^\s*\\\[\s*$/.test(line)) {
      const startIndex = index
      index += 1
      const bodyLines: string[] = []
      while (index < lines.length && !/\\\]\s*$/.test(lines[index] ?? '')) {
        bodyLines.push(lines[index] ?? '')
        index += 1
      }
      index = Math.min(lines.length, index + 1)
      const chars = charsRange(lines, starts, startIndex, Math.max(startIndex, index - 1))
      addUnitWithLocator('formula', withSection({
        lines: linesRange(startIndex, Math.max(startIndex, index - 1)),
        ...(chars !== undefined ? { chars } : {}),
      }), bodyLines.join('\n').trim(), { markdown: lines.slice(startIndex, index).join('\n') })
      continue
    }

    // 独占一行的图片
    const imageOnly = /^\s*!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)\s*$/.exec(line)
    if (imageOnly !== null) {
      const chars = charsRange(lines, starts, index, index)
      await addFigureUnit(budget, options, {
        alt: imageOnly[1] ?? '',
        ref: imageOnly[2] ?? '',
        title: imageOnly[3],
        locator: withSection({
          lines: linesRange(index, index),
          ...(chars !== undefined ? { chars } : {}),
        }),
        raw: line,
        addUnitWithLocator,
      })
      index += 1
      continue
    }

    // 表格
    if (/^\s*\|/.test(line)) {
      const startIndex = index
      index += 1
      while (index < lines.length && /^\s*\|/.test(lines[index] ?? '')) index += 1
      const endIndex = index - 1
      const chars = charsRange(lines, starts, startIndex, endIndex)
      const block = lines.slice(startIndex, index)
      addUnitWithLocator('table', withSection({
        lines: linesRange(startIndex, endIndex),
        ...(chars !== undefined ? { chars } : {}),
      }), block.join('\n'), { markdown: block.join('\n') })
      continue
    }

    // 引用块
    if (/^\s*>/.test(line)) {
      const startIndex = index
      while (index < lines.length && /^\s*>/.test(lines[index] ?? '')) index += 1
      const endIndex = index - 1
      const chars = charsRange(lines, starts, startIndex, endIndex)
      const body = lines.slice(startIndex, index).map(item => item.replace(/^\s*>\s?/, '')).join('\n')
      addUnitWithLocator('note', withSection({
        lines: linesRange(startIndex, endIndex),
        ...(chars !== undefined ? { chars } : {}),
      }), body, { markdown: lines.slice(startIndex, index).join('\n') })
      continue
    }

    // 列表
    if (LIST_LINE.test(line)) {
      const startIndex = index
      while (index < lines.length) {
        const current = lines[index] ?? ''
        if (current.trim() === '') break
        const isListItem = LIST_LINE.test(current)
        const isIndented = /^\s{2,}\S/.test(current)
        if (!isListItem && !isIndented) break
        index += 1
      }
      const endIndex = index - 1
      const chars = charsRange(lines, starts, startIndex, endIndex)
      addUnitWithLocator('list', withSection({
        lines: linesRange(startIndex, endIndex),
        ...(chars !== undefined ? { chars } : {}),
      }), lines.slice(startIndex, index).join('\n'), { markdown: lines.slice(startIndex, index).join('\n') })
      continue
    }

    // 普通段落：直到空行
    const startIndex = index
    while (index < lines.length && (lines[index] ?? '').trim() !== '') index += 1
    const endIndex = index - 1
    const chars = charsRange(lines, starts, startIndex, endIndex)
    const body = lines.slice(startIndex, index).join('\n')
    const locator = withSection({
      lines: linesRange(startIndex, endIndex),
      ...(chars !== undefined ? { chars } : {}),
    })
    const notes: string[] = []
    if (containsInlineMath(body)) notes.push('含内联公式：保留 TeX 原文，未单独切分')
    const singleLineFormula = startIndex === endIndex && looksLikeFormula(body)
    if (singleLineFormula) {
      addUnitWithLocator('formula', locator, body.trim(), {
        markdown: lines.slice(startIndex, index).join('\n'),
        confidence: 'medium',
        ...(notes.length > 0 ? { notes } : {}),
      })
      budget.addIssue(issueOf('formula-uncertain', 'info',
        '该行被识别为公式（启发式判断），请核对原文的符号与条件', {
          locator,
          excerpt: body,
          reviewRequired: false,
        }))
      continue
    }
    addUnitWithLocator('paragraph', locator, body, {
      markdown: lines.slice(startIndex, index).join('\n'),
      ...(notes.length > 0 ? { notes } : {}),
    })
    // 段落中嵌入的图片也提取为 figure 单元
    IMAGE_INLINE.lastIndex = 0
    for (const match of body.matchAll(IMAGE_INLINE)) {
      await addFigureUnit(budget, options, {
        alt: match[1] ?? '',
        ref: match[2] ?? '',
        title: match[3],
        locator,
        raw: match[0],
        addUnitWithLocator,
      })
    }
  }
}

/** 把 Markdown 图片引用转成 figure 单元（缺失/外链显式报告）。 */
async function addFigureUnit(
  budget: ExtractionBudget,
  options: MarkdownExtractOptions,
  input: {
    alt: string
    ref: string
    title?: string
    locator: SourceLocator
    raw: string
    addUnitWithLocator: (
      kind: SourceUnit['kind'],
      locator: SourceLocator,
      body: string,
      extra: { markdown?: string; confidence?: ExtractionConfidence; notes?: readonly string[]; assetPath?: string },
    ) => void
  },
): Promise<void> {
  const caption = input.alt.trim() !== '' ? input.alt.trim() : (input.title ?? '')
  if (isRemoteRef(input.ref)) {
    input.addUnitWithLocator('figure', input.locator, caption === '' ? '外链图片' : caption, {
      markdown: input.raw,
      notes: [`外链图片未下载：${input.ref}`],
    })
    budget.addIssue(issueOf('unsupported-content', 'info',
      '资料引用了外部网络图片，本版本不联网下载，仅保留说明', {
        locator: input.locator,
        excerpt: input.ref,
        reviewRequired: false,
      }))
    return
  }
  const asset = await addLocalImageAsset(budget, options.fileDir, input.ref, options.assetPrefix)
  if (asset !== undefined && asset.assetPath !== undefined) {
    input.addUnitWithLocator('figure', input.locator, caption === '' ? '图片' : caption, {
      markdown: input.raw,
      assetPath: asset.assetPath,
    })
    return
  }
  // 文件缺失：仍保留可读说明，并作为待核对问题
  input.addUnitWithLocator('figure', input.locator, caption === '' ? `图片（缺失：${input.ref}）` : caption, {
    markdown: input.raw,
    confidence: 'unknown',
    notes: [`图片文件缺失或无法读取：${input.ref}`],
  })
  budget.addIssue(issueOf('figure-unreadable', 'warning',
    '资料引用的图片文件缺失或无法读取，学生可回看原文核对', {
      locator: input.locator,
      excerpt: input.ref,
      reviewRequired: true,
    }))
}

