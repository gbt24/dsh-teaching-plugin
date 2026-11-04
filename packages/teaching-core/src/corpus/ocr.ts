/**
 * 宿主 OCR 能力探测与调用（tesseract / pdftoppm）。
 *
 * 原则：
 * - 工具缺失、超时、失败都是**可报告状态**，不崩溃、不无限重试；
 * - 低置信度结果照常返回，但由调用方写入 reviewRequired 问题进入待核对；
 * - 子进程输出限制大小，取消会终止子进程。
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CorpusLimits } from './limits.ts'
import { CorpusCancelledError } from './errors.ts'
import { runCommand, whichTool } from './process.ts'
import { imageSizeFromBytes } from './png.ts'
import { isCjkChar } from './text-utils.ts'

/** Host 可注入的 OCR 设置。 */
export interface OcrOptions {
  /** 默认 true；false 时扫描件仅报告扫描无文字。 */
  readonly enabled?: boolean
  /** 显式 tesseract 路径；缺省从 PATH/常见安装位置查找。 */
  readonly tesseractPath?: string
  /** 显式 pdftoppm 路径（PDF 扫描页渲染用）。 */
  readonly pdftoppmPath?: string
  /** 识别语言列表，默认自动选择 eng+chi_sim 中已安装者。 */
  readonly languages?: readonly string[]
  /** 平均置信度阈值（0-100），覆盖 limits.ocrMinConfidence。 */
  readonly minConfidence?: number
  /** 单次 OCR 超时（毫秒），覆盖 limits.ocrTimeoutMs。 */
  readonly timeoutMs?: number
  /** 扫描页渲染 DPI，覆盖 limits.ocrRenderDpi。 */
  readonly renderDpi?: number
}

/** 解析后的 OCR 运行环境。 */
export interface OcrRuntime {
  readonly available: boolean
  /** 不可用原因（学生可读），available=true 时为空。 */
  readonly reason: string
  readonly tesseractPath?: string
  readonly pdftoppmPath?: string
  readonly languages: readonly string[]
  readonly minConfidence: number
  readonly timeoutMs: number
  readonly renderDpi: number
}

const PREFERRED_LANGUAGES = ['eng', 'chi_sim'] as const

/** 探测 OCR 运行环境；不会抛出可预期失败。 */
export async function resolveOcrRuntime(
  options: OcrOptions | undefined,
  limits: CorpusLimits,
): Promise<OcrRuntime> {
  const base: OcrRuntime = {
    available: false,
    reason: '',
    languages: [],
    minConfidence: options?.minConfidence ?? limits.ocrMinConfidence,
    timeoutMs: options?.timeoutMs ?? limits.ocrTimeoutMs,
    renderDpi: options?.renderDpi ?? limits.ocrRenderDpi,
    ...(options?.tesseractPath !== undefined ? { tesseractPath: options.tesseractPath } : {}),
    ...(options?.pdftoppmPath !== undefined ? { pdftoppmPath: options.pdftoppmPath } : {}),
  }
  if (options?.enabled === false) {
    return { ...base, reason: 'OCR 已在配置中关闭' }
  }
  const tesseractPath = await whichTool('tesseract', options?.tesseractPath)
  if (tesseractPath === undefined) {
    return { ...base, reason: '本机未找到 tesseract，扫描件/图片文字无法识别' }
  }
  const versionResult = await runCommand(tesseractPath, ['--version'], { timeoutMs: 15_000 })
  if (versionResult.failed || versionResult.code !== 0) {
    return { ...base, reason: 'tesseract 无法运行（版本探测失败）', tesseractPath }
  }
  const langResult = await runCommand(tesseractPath, ['--list-langs'], { timeoutMs: 15_000 })
  const availableLangs = new Set<string>()
  if (!langResult.failed && langResult.code === 0) {
    for (const line of `${langResult.stdout}\n${langResult.stderr}`.split('\n')) {
      const trimmed = line.trim()
      if (trimmed !== '' && /^[a-z][a-z0-9_]*$/i.test(trimmed)) availableLangs.add(trimmed)
    }
  }
  const requested = options?.languages !== undefined && options.languages.length > 0
    ? options.languages
    : PREFERRED_LANGUAGES
  const languages = requested.filter(lang => availableLangs.size === 0 || availableLangs.has(lang))
  if (languages.length === 0) {
    const reasons = requested.join('、')
    return { ...base, reason: `tesseract 缺少可用语言包（需要 ${reasons}）`, tesseractPath }
  }
  const pdftoppmPath = await whichTool('pdftoppm', options?.pdftoppmPath)
  return {
    ...base,
    available: true,
    languages,
    tesseractPath,
    ...(pdftoppmPath !== undefined ? { pdftoppmPath } : {}),
  }
}

/** 一行 OCR 结果。 */
export interface OcrLine {
  readonly text: string
  /** 归一化 bbox：[x0, y0, x1, y1] ∈ 0..1，相对图片左上角。 */
  readonly bbox?: readonly [number, number, number, number]
  /** 该行平均置信度（0-100，-1 表示未知）。 */
  readonly confidence: number
}

/** 一页 OCR 结果。 */
export interface OcrPage {
  readonly lines: readonly OcrLine[]
  readonly meanConfidence: number
  readonly width: number
  readonly height: number
  /** 失败原因；成功时为空。 */
  readonly failure?: string
  /** 是否因为超时导致不完整。 */
  readonly timedOut: boolean
}

interface TsvWord {
  readonly block: number
  readonly par: number
  readonly line: number
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly confidence: number
  readonly text: string
}

function parseTsvWords(tsv: string): TsvWord[] {
  const words: TsvWord[] = []
  const rows = tsv.split('\n')
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] as string
    if (row.trim() === '') continue
    const columns = row.split('\t')
    if (columns.length < 12) continue
    if (columns[0] !== '5') continue
    const text = columns.slice(11).join('\t').trim()
    if (text === '') continue
    words.push({
      block: Number(columns[2] ?? 0),
      par: Number(columns[3] ?? 0),
      line: Number(columns[4] ?? 0),
      left: Number(columns[6] ?? 0),
      top: Number(columns[7] ?? 0),
      width: Number(columns[8] ?? 0),
      height: Number(columns[9] ?? 0),
      confidence: Number(columns[10] ?? -1),
      text,
    })
  }
  return words
}

/** 把 TSV 词组合成行并计算归一化 bbox。 */
function buildOcrLines(words: readonly TsvWord[], width: number, height: number): OcrLine[] {
  const groups = new Map<string, TsvWord[]>()
  for (const word of words) {
    const key = `${word.block}:${word.par}:${word.line}`
    const list = groups.get(key)
    if (list === undefined) groups.set(key, [word])
    else list.push(word)
  }
  const lines: OcrLine[] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.left - b.left)
    let text = ''
    let previousRight = 0
    let previousHeight = 0
    for (const word of group) {
      const gap = word.left - previousRight
      const needsSpace = text !== '' && gap > Math.max(4, previousHeight * 0.35)
        && !(isCjkChar(word.text[0] ?? '') && isCjkChar(text[text.length - 1] ?? ''))
      text += `${needsSpace ? ' ' : ''}${word.text}`
      previousRight = word.left + word.width
      previousHeight = word.height
    }
    const left = Math.min(...group.map(word => word.left))
    const top = Math.min(...group.map(word => word.top))
    const right = Math.max(...group.map(word => word.left + word.width))
    const bottom = Math.max(...group.map(word => word.top + word.height))
    const confidences = group.map(word => word.confidence).filter(value => value >= 0)
    const confidence = confidences.length === 0
      ? -1
      : confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    lines.push({
      text: text.trim(),
      confidence,
      ...(width > 0 && height > 0
        ? {
            bbox: [
              Math.min(1, Math.max(0, left / width)),
              Math.min(1, Math.max(0, top / height)),
              Math.min(1, Math.max(0, right / width)),
              Math.min(1, Math.max(0, bottom / height)),
            ] as const,
          }
        : {}),
    })
  }
  lines.sort((a, b) => (a.bbox?.[1] ?? 0) - (b.bbox?.[1] ?? 0))
  return lines
}

/** 对一张图片执行 OCR；工具失败/超时返回 failure，不抛异常（取消除外）。 */
export async function ocrImage(
  runtime: OcrRuntime,
  imagePath: string,
  signal?: AbortSignal,
): Promise<OcrPage> {
  if (!runtime.available || runtime.tesseractPath === undefined) {
    return { lines: [], meanConfidence: 0, width: 0, height: 0, failure: runtime.reason, timedOut: false }
  }
  let width = 0
  let height = 0
  try {
    const size = imageSizeFromBytes(await readFile(imagePath))
    width = size?.width ?? 0
    height = size?.height ?? 0
  } catch {
    // 尺寸未知不阻断 OCR；bbox 会缺省
  }
  const args = [imagePath, 'stdout', '-l', runtime.languages.join('+'), '--psm', '3', 'tsv']
  const result = await runCommand(runtime.tesseractPath, args, {
    timeoutMs: runtime.timeoutMs,
    ...(signal !== undefined ? { signal } : {}),
    maxOutputChars: 16 * 1024 * 1024,
  })
  if (result.aborted) throw new CorpusCancelledError()
  if (result.timedOut) {
    return {
      lines: [], meanConfidence: 0, width, height, timedOut: true,
      failure: `OCR 超时（>${runtime.timeoutMs}ms），已终止`,
    }
  }
  if (result.failed || result.code !== 0) {
    return {
      lines: [], meanConfidence: 0, width, height, timedOut: false,
      failure: `OCR 失败：${result.stderr.trim().slice(0, 200) || 'tesseract 返回非零退出码'}`,
    }
  }
  const words = parseTsvWords(result.stdout)
  const lines = buildOcrLines(words, width, height)
  if (width === 0 || height === 0) {
    // 尺寸未知时用词框推断画布，避免 bbox 全部为 0
    const inferredWidth = Math.max(1, ...words.map(word => word.left + word.width))
    const inferredHeight = Math.max(1, ...words.map(word => word.top + word.height))
    return {
      lines: buildOcrLines(words, inferredWidth, inferredHeight),
      meanConfidence: averageConfidence(words),
      width: inferredWidth,
      height: inferredHeight,
      timedOut: false,
    }
  }
  return { lines, meanConfidence: averageConfidence(words), width, height, timedOut: false }
}

/** 把 OCR 行按垂直间距组合成段落（供扫描页/图片单元使用）。 */
export interface OcrParagraph {
  readonly text: string
  readonly bbox?: readonly [number, number, number, number]
  readonly confidence: number
}

export function groupOcrLines(lines: readonly OcrLine[]): OcrParagraph[] {
  const paragraphs: OcrParagraph[] = []
  let current: OcrLine[] = []
  const flush = (): void => {
    if (current.length === 0) return
    const text = current.map(line => line.text.trim()).filter(text => text !== '').join('\n')
    const confidences = current.map(line => line.confidence).filter(value => value >= 0)
    const confidence = confidences.length === 0
      ? 0
      : confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    const boxes = current.map(line => line.bbox).filter((box): box is readonly [number, number, number, number] => box !== undefined)
    let bbox: readonly [number, number, number, number] | undefined
    if (boxes.length === current.length && boxes.length > 0) {
      bbox = [
        Math.min(...boxes.map(box => box[0])),
        Math.min(...boxes.map(box => box[1])),
        Math.max(...boxes.map(box => box[2])),
        Math.max(...boxes.map(box => box[3])),
      ]
    }
    paragraphs.push({ text, confidence, ...(bbox !== undefined ? { bbox } : {}) })
    current = []
  }
  for (const line of lines) {
    if (current.length > 0) {
      const previous = current[current.length - 1] as OcrLine
      const previousBottom = previous.bbox?.[3]
      const currentTop = line.bbox?.[1]
      const lineHeight = previous.bbox !== undefined ? Math.max(0.005, previous.bbox[3] - previous.bbox[1]) : 0.02
      const gap = previousBottom !== undefined && currentTop !== undefined ? currentTop - previousBottom : 0
      if (gap > lineHeight * 0.9) flush()
    }
    current.push(line)
  }
  flush()
  return paragraphs
}

function averageConfidence(words: readonly TsvWord[]): number {
  const values = words.map(word => word.confidence).filter(value => value >= 0)
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** 渲染结果，调用方负责清理 dir。 */
export interface RenderedPage {
  readonly path: string
  readonly dir: string
}

/** 用 pdftoppm 渲染 PDF 单页为 PNG；工具缺失返回 undefined。 */
export async function renderPdfPageToPng(
  runtime: OcrRuntime,
  pdfPath: string,
  pageNumber: number,
  signal?: AbortSignal,
): Promise<RenderedPage | undefined> {
  if (runtime.pdftoppmPath === undefined) return undefined
  const dir = await mkdtemp(join(tmpdir(), 'dsh-corpus-pdfpage-'))
  const outPrefix = join(dir, 'page')
  const result = await runCommand(runtime.pdftoppmPath, [
    '-r', String(runtime.renderDpi), '-f', String(pageNumber), '-l', String(pageNumber),
    '-png', '-singlefile', pdfPath, outPrefix,
  ], {
    timeoutMs: runtime.timeoutMs,
    ...(signal !== undefined ? { signal } : {}),
  })
  if (result.aborted) {
    await rm(dir, { recursive: true, force: true })
    throw new CorpusCancelledError()
  }
  if (result.timedOut || result.failed || result.code !== 0) {
    await rm(dir, { recursive: true, force: true })
    return undefined
  }
  return { path: `${outPrefix}.png`, dir }
}

/** 清理渲染临时目录（幂等）。 */
export async function cleanupTempDir(dir: string | undefined): Promise<void> {
  if (dir === undefined) return
  try {
    await rm(dir, { recursive: true, force: true })
  } catch {
    // 临时目录清理失败不影响导入结果
  }
}
