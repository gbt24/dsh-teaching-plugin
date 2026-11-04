/**
 * PDF 抽取器（pdfjs-dist legacy build，纯 JS，无 native 依赖）。
 *
 * - 文字型 PDF：按页面抽取文本行 → 段落/标题/公式单元，定位 `page` + 归一化 bbox；
 * - 图表：从页面 operator list 中取内嵌位图，编码为 PNG 派生资产，带页面 bbox；
 * - 扫描页：页面无文本时调用宿主 pdftoppm + tesseract OCR；OCR 不可用/失败/低置信度
 *   都写入 SourceIssue（reviewRequired），导入仍然成功并返回可读部分；
 * - 受密码保护/损坏的 PDF 明确失败，不产生垃圾单元。
 */
import type { PDFPageProxy, PageViewport } from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { ExtractionConfidence, SourceIssue, SourceLocator } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import { CorpusParseError } from '../errors.ts'
import { encodePng, imageSizeFromBytes } from '../png.ts'
import { groupOcrLines, ocrImage, renderPdfPageToPng, cleanupTempDir } from '../ocr.ts'
import type { OcrPage } from '../ocr.ts'
import { looksLikeFormula } from '../text-utils.ts'
import type { ParseContext } from './context.ts'

const EXTRACTOR_VERSION = '1.0.0'

/** 页面文本少于该字符数时按扫描页处理。 */
const SCAN_TEXT_THRESHOLD = 10
/** 位图像素上限（超出不编码，避免内存爆炸）。 */
const MAX_IMAGE_PIXELS = 32_000_000

interface PdfLine {
  readonly text: string
  /** 页面坐标（viewport 像素）。 */
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
  readonly fontSize: number
}

interface PdfTextItemLike {
  readonly str: string
  readonly transform: readonly number[]
  readonly width: number
  readonly height: number
}

function issueOf(
  code: SourceIssue['code'],
  severity: SourceIssue['severity'],
  message: string,
  extra: { locator?: SourceLocator; excerpt?: string; reviewRequired?: boolean } = {},
): SourceIssue {
  return {
    code,
    severity,
    message,
    reviewRequired: extra.reviewRequired ?? false,
    ...(extra.locator !== undefined ? { locator: extra.locator } : {}),
    ...(extra.excerpt !== undefined ? { excerpt: extra.excerpt.slice(0, 240) } : {}),
  }
}

function isTextItem(item: unknown): item is PdfTextItemLike {
  return typeof item === 'object' && item !== null
    && typeof (item as { str?: unknown }).str === 'string'
    && Array.isArray((item as { transform?: unknown }).transform)
}

/** 把 pdfjs 文本项按基线分组为行（PDF 坐标系 y 向上，viewport 已翻转）。 */
function buildPdfLines(items: readonly PdfTextItemLike[], viewport: PageViewport): PdfLine[] {
  interface FlatItem { str: string; x: number; y: number; width: number; height: number }
  const flat: FlatItem[] = []
  for (const item of items) {
    if (item.str === '') continue
    const transform = item.transform
    const x = transform[4] ?? 0
    const y = transform[5] ?? 0
    const scaleY = Math.abs(transform[3] ?? 0) || item.height || 10
    flat.push({ str: item.str, x, y, width: item.width, height: Math.max(scaleY, item.height || 0) })
  }
  flat.sort((a, b) => (b.y - a.y) || (a.x - b.x))
  interface Group { y: number; height: number; items: FlatItem[] }
  const groups: Group[] = []
  for (const item of flat) {
    const tolerance = Math.max(2, item.height * 0.4)
    const group = groups.find(candidate => Math.abs(candidate.y - item.y) <= tolerance)
    if (group === undefined) groups.push({ y: item.y, height: item.height, items: [item] })
    else {
      group.items.push(item)
      group.height = Math.max(group.height, item.height)
    }
  }
  const lines: PdfLine[] = []
  for (const group of groups) {
    group.items.sort((a, b) => a.x - b.x)
    let text = ''
    let previousRight = 0
    for (const item of group.items) {
      const gap = item.x - previousRight
      const needsSpace = text !== '' && gap > group.height * 0.28
        && !/\s$/.test(text) && !/^[\s,.;:!?，。；：！？）)\]】]/.test(item.str)
        && !isCjkPair(text, item.str)
      text += `${needsSpace ? ' ' : ''}${item.str}`
      previousRight = item.x + item.width
    }
    const x0 = Math.min(...group.items.map(item => item.x))
    const x1 = Math.max(...group.items.map(item => item.x + item.width))
    const bottom = Math.min(...group.items.map(item => item.y))
    const top = Math.max(...group.items.map(item => item.y + item.height))
    const topView = viewport.height - top
    const bottomView = viewport.height - bottom
    lines.push({
      text: text.trim(),
      x0,
      y0: topView,
      x1,
      y1: bottomView,
      fontSize: group.height,
    })
  }
  lines.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0))
  return lines.filter(line => line.text !== '')
}

function isCjkPair(previous: string, next: string): boolean {
  const last = previous[previous.length - 1] ?? ''
  const first = next[0] ?? ''
  const cjk = (char: string): boolean => {
    const code = char.codePointAt(0) ?? 0
    return (code >= 0x3400 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff)
  }
  return cjk(last) && cjk(first)
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 12
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] as number
}

function bboxOfLines(
  lines: readonly PdfLine[],
  viewport: PageViewport,
): readonly [number, number, number, number] | undefined {
  if (lines.length === 0) return undefined
  const clamp = (value: number): number => Math.min(1, Math.max(0, value))
  const x0 = Math.min(...lines.map(line => line.x0))
  const y0 = Math.min(...lines.map(line => line.y0))
  const x1 = Math.max(...lines.map(line => line.x1))
  const y1 = Math.max(...lines.map(line => line.y1))
  return [
    clamp(x0 / viewport.width), clamp(y0 / viewport.height),
    clamp(x1 / viewport.width), clamp(y1 / viewport.height),
  ]
}

interface SectionState {
  path: string[]
}

/** 把一行文本加入单元。 */
function addPdfParagraph(
  budget: ExtractionBudget,
  pageNumber: number,
  viewport: PageViewport,
  lines: readonly PdfLine[],
  section: SectionState,
): void {
  const text = lines.map(line => line.text).join('\n').trim()
  if (text === '') return
  const bbox = bboxOfLines(lines, viewport)
  const locator: SourceLocator = {
    page: pageNumber,
    ...(bbox !== undefined ? { bbox } : {}),
    ...(section.path.length > 0 ? { sectionPath: [...section.path] } : {}),
  }
  const kind = looksLikeFormula(text) && lines.length <= 2 ? 'formula' : 'paragraph'
  const confidence: ExtractionConfidence = kind === 'formula' ? 'medium' : 'high'
  budget.addUnit({ kind, locator, text, confidence })
  if (kind === 'formula') {
    budget.addIssue(issueOf('formula-uncertain', 'info',
      'PDF 文本行被识别为公式（启发式判断），请核对原文的符号与条件', { locator, excerpt: text }))
  }
}

/** 解析文字页文本为段落/标题/列表单元。 */
function addPdfTextPage(
  budget: ExtractionBudget,
  pageNumber: number,
  viewport: PageViewport,
  lines: readonly PdfLine[],
  section: SectionState,
  scannedPages: number[],
): void {
  if (lines.length === 0) {
    scannedPages.push(pageNumber)
    return
  }
  const bodySize = median(lines.map(line => line.fontSize))
  let paragraph: PdfLine[] = []
  const flush = (): void => {
    if (paragraph.length === 0) return
    addPdfParagraph(budget, pageNumber, viewport, paragraph, section)
    paragraph = []
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] as PdfLine
    const isHeading = line.fontSize >= bodySize * 1.18
    if (isHeading) {
      flush()
      const title = line.text.trim()
      if (title.length <= 160) {
        section.path = [title.slice(0, 120)]
        const bbox = bboxOfLines([line], viewport)
        budget.addUnit({
          kind: 'heading',
          locator: {
            page: pageNumber,
            ...(bbox !== undefined ? { bbox } : {}),
            sectionPath: [...section.path],
          },
          text: title,
          confidence: 'high',
        })
        continue
      }
    }
    const previous = paragraph[paragraph.length - 1]
    if (previous !== undefined) {
      const gap = line.y0 - previous.y1
      const sizeRatio = Math.max(line.fontSize, previous.fontSize) / Math.max(1, Math.min(line.fontSize, previous.fontSize))
      const isListStart = /^\s*(?:[•·▪◦-]|\d{1,3}[.)])\s+/.test(line.text)
      if (gap > previous.fontSize * 1.2 || sizeRatio > 1.15 || isListStart) flush()
    }
    paragraph.push(line)
    if (line.text.length > 0 && /[。！？.!?]$/.test(line.text) && line === lines[lines.length - 1]) flush()
  }
  flush()
}

/* ------------------------------------------------------------------ 图片提取 */

interface PdfImageData {
  readonly width: number
  readonly height: number
  readonly channels: 1 | 3 | 4
  readonly pixels: Uint8Array
}

/** 把 pdfjs 图像对象标准化为像素；无法处理返回 undefined。 */
function normalizePdfImage(value: unknown): PdfImageData | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const width = (value as { width?: unknown }).width
  const height = (value as { height?: unknown }).height
  const data = (value as { data?: unknown }).data
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return undefined
  if (width * height > MAX_IMAGE_PIXELS) return undefined
  if (data === undefined || data === null) return undefined
  let bytes: Uint8Array
  if (data instanceof Uint8Array) bytes = data
  else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
  } else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data)
  else return undefined
  const rgbLength = width * height * 3
  const rgbaLength = width * height * 4
  const grayLength = Math.ceil(width / 8) * height
  if (bytes.length === rgbaLength) return { width, height, channels: 4, pixels: bytes }
  if (bytes.length === rgbLength) return { width, height, channels: 3, pixels: bytes }
  if (bytes.length >= grayLength && bytes.length < rgbLength) {
    // 1bpp 灰度
    const pixels = new Uint8Array(width * height)
    const rowBytes = Math.ceil(width / 8)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const byte = bytes[y * rowBytes + (x >> 3)] ?? 0
        pixels[y * width + x] = ((byte >> (7 - (x & 7))) & 1) === 0 ? 0 : 255
      }
    }
    return { width, height, channels: 1, pixels }
  }
  return undefined
}

function multiplyMatrix(left: readonly number[], right: readonly number[]): number[] {
  const [a1, b1, c1, d1, e1, f1] = left
  const [a2, b2, c2, d2, e2, f2] = right
  return [
    (a1 as number) * (a2 as number) + (c1 as number) * (b2 as number),
    (b1 as number) * (a2 as number) + (d1 as number) * (b2 as number),
    (a1 as number) * (c2 as number) + (c1 as number) * (d2 as number),
    (b1 as number) * (c2 as number) + (d1 as number) * (d2 as number),
    (a1 as number) * (e2 as number) + (c1 as number) * (f2 as number) + (e1 as number),
    (b1 as number) * (e2 as number) + (d1 as number) * (f2 as number) + (f1 as number),
  ]
}

function imageBbox(
  ctm: readonly number[],
  viewport: PageViewport,
): readonly [number, number, number, number] | undefined {
  const points: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]]
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [x, y] of points) {
    const userX = (ctm[0] as number) * x + (ctm[2] as number) * y + (ctm[4] as number)
    const userY = (ctm[1] as number) * x + (ctm[3] as number) * y + (ctm[5] as number)
    const [viewX, viewY] = viewport.convertToViewportPoint(userX, userY) as [number, number]
    minX = Math.min(minX, viewX)
    maxX = Math.max(maxX, viewX)
    minY = Math.min(minY, viewY)
    maxY = Math.max(maxY, viewY)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return undefined
  const clamp = (value: number): number => Math.min(1, Math.max(0, value))
  return [
    clamp(minX / viewport.width), clamp(minY / viewport.height),
    clamp(maxX / viewport.width), clamp(maxY / viewport.height),
  ]
}

/** 从一页的 operator list 提取内嵌位图为 figure 单元。 */
async function extractPdfFigures(
  budget: ExtractionBudget,
  page: PDFPageProxy,
  viewport: PageViewport,
  pageNumber: number,
  imageCounter: { value: number },
): Promise<void> {
  let opList
  try {
    opList = await page.getOperatorList()
  } catch {
    budget.addIssue(issueOf('figure-unreadable', 'warning',
      `第 ${pageNumber} 页的图形无法解析`, { locator: { page: pageNumber } }))
    return
  }
  const ops = pdfjs.OPS as unknown as Record<string, number>
  const imageOps = new Set<number>([
    ops.paintImageXObject ?? -1,
    ops.paintInlineImageXObject ?? -1,
    ops.paintImageXObjectRepeat ?? -1,
    ops.paintJpegXObject ?? -1,
  ])
  const saveOp = ops.save ?? -2
  const restoreOp = ops.restore ?? -3
  const transformOp = ops.transform ?? -4
  let ctm: number[] = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []
  for (let index = 0; index < opList.fnArray.length; index += 1) {
    const fn = opList.fnArray[index] as number
    const args = opList.argsArray[index] as unknown[]
    if (fn === saveOp) {
      stack.push([...ctm])
      continue
    }
    if (fn === restoreOp) {
      ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]
      continue
    }
    if (fn === transformOp) {
      const matrix = args as unknown as number[]
      if (Array.isArray(matrix) && matrix.length === 6) ctm = multiplyMatrix(ctm, matrix)
      continue
    }
    if (!imageOps.has(fn)) continue
    let imageObject: unknown
    if (fn === ops.paintInlineImageXObject) {
      imageObject = args[0]
    } else {
      const name = args[0]
      if (typeof name !== 'string') continue
      try {
        imageObject = (page as unknown as { objs: { get(key: string): unknown } }).objs.get(name)
      } catch {
        imageObject = undefined
      }
    }
    const image = normalizePdfImage(imageObject)
    imageCounter.value += 1
    const figureIndex = imageCounter.value
    if (image === undefined) {
      budget.addIssue(issueOf('figure-unreadable', 'warning',
        `第 ${pageNumber} 页的第 ${figureIndex} 张图片无法转换`, {
          locator: { page: pageNumber },
          reviewRequired: true,
        }))
      continue
    }
    const png = encodePng(image.width, image.height, image.channels, image.pixels)
    const assetPath = budget.addAsset(`figures/page-${pageNumber}-${figureIndex}.png`, png, 'png')
    const bbox = imageBbox(ctm, viewport)
    budget.addUnit({
      kind: 'figure',
      locator: { page: pageNumber, ...(bbox !== undefined ? { bbox } : {}) },
      text: `第 ${pageNumber} 页图片（${image.width}×${image.height}）`,
      ...(assetPath !== undefined ? { assetPath } : {}),
      confidence: 'high',
    })
  }
}

/* ------------------------------------------------------------------ 扫描页 OCR */

async function ocrScannedPage(
  context: ParseContext,
  budget: ExtractionBudget,
  pageNumber: number,
  ocrPagesDone: { value: number },
): Promise<void> {
  const locatorBase: SourceLocator = { page: pageNumber }
  if (!context.ocr.available) {
    budget.addIssue(issueOf('scan-no-text', 'warning',
      `第 ${pageNumber} 页没有可抽取的文字（疑似扫描页），且 OCR 不可用：${context.ocr.reason}`,
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  if (context.ocr.pdftoppmPath === undefined) {
    budget.addIssue(issueOf('scan-no-text', 'warning',
      `第 ${pageNumber} 页疑似扫描页，但本机缺少 pdftoppm，无法渲染页面做 OCR`,
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  if (ocrPagesDone.value >= context.limits.pdfOcrPageLimit) {
    budget.addIssue(issueOf('truncated', 'warning',
      `扫描页超过 OCR 上限（${context.limits.pdfOcrPageLimit} 页），后续扫描页未识别`,
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  ocrPagesDone.value += 1
  let rendered
  try {
    rendered = await renderPdfPageToPng(context.ocr, context.path, pageNumber, context.signal)
  } catch {
    throw new CorpusParseError('OCR 渲染被取消', 'cancelled')
  }
  if (rendered === undefined) {
    budget.addIssue(issueOf('scan-no-text', 'warning',
      `第 ${pageNumber} 页疑似扫描页，页面渲染失败，无法 OCR`,
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  try {
    const pageResult = await ocrImage(context.ocr, rendered.path, context.signal)
    addOcrPageUnits(budget, pageResult, locatorBase, context.ocr.minConfidence)
  } finally {
    await cleanupTempDir(rendered.dir)
  }
}

/** 把 OCR 结果写入单元与问题。 */
export function addOcrPageUnits(
  budget: ExtractionBudget,
  pageResult: OcrPage,
  locatorBase: SourceLocator,
  minConfidence: number,
): void {
  if (pageResult.failure !== undefined) {
    budget.addIssue(issueOf('scan-no-text', 'warning',
      `OCR 未能识别页面文字：${pageResult.failure}`,
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  if (pageResult.lines.length === 0) {
    budget.addIssue(issueOf('scan-no-text', 'warning',
      'OCR 未识别到任何文字，请核对原页是否为空白/图片或提高扫描质量',
      { locator: locatorBase, reviewRequired: true }))
    return
  }
  const paragraphs = groupOcrLines(pageResult.lines)
  const lowConfidence = pageResult.meanConfidence < minConfidence
  if (lowConfidence) {
    budget.addIssue(issueOf('ocr-low-confidence', 'warning',
      `OCR 平均置信度较低（${pageResult.meanConfidence.toFixed(1)} < ${minConfidence}），内容可能识别错误，请核对原文`,
      {
        locator: locatorBase,
        excerpt: paragraphs[0]?.text ?? '',
        reviewRequired: true,
      }))
  }
  let formulaCount = 0
  let firstFormula = ''
  for (const paragraph of paragraphs) {
    if (paragraph.text.trim() === '') continue
    const locator: SourceLocator = {
      ...locatorBase,
      ...(paragraph.bbox !== undefined ? { bbox: paragraph.bbox } : {}),
    }
    const isFormula = looksLikeFormula(paragraph.text) && paragraph.text.length <= 300
    if (isFormula) {
      formulaCount += 1
      if (firstFormula === '') firstFormula = paragraph.text
    }
    const kind = isFormula ? 'formula' : 'paragraph'
    const confidence: ExtractionConfidence = paragraph.confidence >= minConfidence ? 'medium' : 'low'
    budget.addUnit({
      kind,
      locator,
      text: paragraph.text,
      confidence,
      notes: [`OCR 置信度 ${paragraph.confidence.toFixed(1)}`],
    })
  }
  if (formulaCount > 0) {
    budget.addIssue(issueOf('formula-uncertain', 'warning',
      `扫描页中有 ${formulaCount} 处疑似公式由 OCR 识别，符号/上下标可能错误，请核对原页`, {
        locator: locatorBase,
        excerpt: firstFormula,
        reviewRequired: true,
      }))
  }
}

/* ------------------------------------------------------------------ 主入口 */

/** 解析 PDF 文件。 */
export async function parsePdf(context: ParseContext): Promise<ParserOutput> {
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  let document
  try {
    const loadingTask = pdfjs.getDocument({
      // 传入副本，避免 pdfjs 内部 transfer 影响上层字节
      data: new Uint8Array(context.bytes),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    })
    document = await loadingTask.promise
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    if (/password/i.test(message)) {
      throw new CorpusParseError('PDF 受密码保护，无法读取', 'password-protected')
    }
    throw new CorpusParseError(`PDF 无法解析（可能已损坏）：${message.slice(0, 200)}`, 'corrupt-pdf')
  }
  try {
    const numPages = document.numPages
    const section: SectionState = { path: [] }
    const scannedPages: number[] = []
    const imageCounter = { value: 0 }
    const ocrPagesDone = { value: 0 }
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      budget.checkAbort()
      if (budget.full || budget.overTextLimit) break
      let page: PDFPageProxy
      try {
        page = await document.getPage(pageNumber)
      } catch {
        budget.addIssue(issueOf('missing-page', 'warning',
          `第 ${pageNumber} 页无法读取`, { locator: { page: pageNumber }, reviewRequired: true }))
        continue
      }
      const viewport = page.getViewport({ scale: 1 })
      await extractPdfFigures(budget, page, viewport, pageNumber, imageCounter)
      let textLines: PdfLine[] = []
      try {
        const textContent = await page.getTextContent()
        const rawItems: unknown[] = textContent.items
        const items = rawItems.filter(isTextItem)
        textLines = buildPdfLines(items, viewport)
      } catch {
        budget.addIssue(issueOf('unsupported-content', 'warning',
          `第 ${pageNumber} 页文本层无法读取`, { locator: { page: pageNumber } }))
      }
      if (textLines.map(line => line.text).join('').trim().length < SCAN_TEXT_THRESHOLD) {
        scannedPages.push(pageNumber)
        await ocrScannedPage(context, budget, pageNumber, ocrPagesDone)
      } else {
        addPdfTextPage(budget, pageNumber, viewport, textLines, section, scannedPages)
      }
      page.cleanup()
    }
    if (budget.units.length === 0) {
      budget.addIssue(issueOf('scan-no-text', 'warning',
        'PDF 中没有抽取到任何可读文字，可能是纯扫描件或空白文档',
        { reviewRequired: true }))
    }
    return budget.finalize('pdf', undefined, {
      name: 'teaching-corpus/pdf',
      version: `${EXTRACTOR_VERSION}+pdfjs-${pdfjs.version}`,
    }, { kind: 'pages', count: numPages })
  } finally {
    try {
      await document.destroy()
    } catch {
      // 销毁失败不影响已抽取结果
    }
  }
}

/** 保留：把字节尺寸转换（供测试的图片尺寸断言）。 */
export function pdfImageBytesSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const size = imageSizeFromBytes(bytes)
  return size !== undefined ? { width: size.width, height: size.height } : undefined
}
