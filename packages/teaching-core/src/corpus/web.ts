/**
 * 网页资料导入（Host 用 `ctx.web.fetch` 抓取后把内容交给 corpus 抽取）。
 *
 * 设计约束：
 * - **只处理已抓取内容**：本模块不做网络请求、不执行任何脚本；纯文本/HTML 正则解析；
 * - 去掉页面外壳（script/style/nav/footer/aside 等）后复用既有 HTML 抽取器：
 *   标题层级 → heading 单元（保留 Markdown 标题与 sectionPath），正文 → paragraph/list/code/table；
 * - 标题回退顺序：调用方 title > `<title>` > 首个 H1 > URL 域名；
 * - 内容哈希基于抽取后的正文（稳定、可去重），写入 SourceDocument.web.contentHash 与修订 fingerprint；
 * - 正文上限 `WEB_TEXT_CAP`（200k 字符）；空正文/正文过少 → 明确失败或 reviewRequired 警告。
 */
import type { CourseId } from '../contracts/ids.ts'
import { sourceRevisionId as newSourceRevisionId } from '../contracts/ids.ts'
import type { Result } from '../contracts/result.ts'
import { err, ok } from '../contracts/result.ts'
import type { ParsedSource, SourceIssue, SourceRevisionMeta, SourceUnit } from '../contracts/source.ts'
import { fingerprintOfBytes } from './fingerprint.ts'
import type { CorpusLimits } from './limits.ts'
import type { ParserOutput } from './budget.ts'
import type { OcrRuntime } from './ocr.ts'
import type { ParseContext } from './parsers/context.ts'
import { decodeHtmlEntities, parseHtml } from './parsers/html.ts'
import { parseMarkdown, parsePlainText } from './parsers/plain.ts'

/** 网页正文抽取上限（字符）；超过部分截断并报告。 */
export const WEB_TEXT_CAP = 200_000

/** 网页抽取最多单元数。 */
export const WEB_MAX_UNITS = 20_000

/** Host 抓取后交给 corpus 的网页导入请求。 */
export interface WebImportRequest {
  readonly courseId?: CourseId
  /** 请求 URL（http/https）。 */
  readonly url: string
  /** 抓取后的最终 URL（重定向后）。 */
  readonly finalUrl?: string
  /** 调用方给出的标题（优先于页面 <title>）。 */
  readonly title?: string
  /** 已抓取的 HTML（与 text 至少提供一个）。 */
  readonly html?: string
  /** 已抓取的纯文本/Markdown（没有 html 时使用）。 */
  readonly text?: string
  /** 抓取时间（ISO 字符串，来自 Host）。 */
  readonly fetchedAt: string
  /** 抓取提供方名称（如 Harness web provider）。 */
  readonly provider?: string
  /** 原始 Content-Type（若有）。 */
  readonly contentType?: string
}

/** 抽取后的网页内容（尚未持久化）。 */
export interface WebParsedContent {
  readonly title: string
  readonly format: ParsedSource['format']
  readonly detail?: string
  /** 基于抽取正文的稳定内容哈希（sha256:...）。 */
  readonly contentHash: string
  readonly units: readonly SourceUnit[]
  readonly issues: readonly SourceIssue[]
  readonly extent?: SourceRevisionMeta['extent']
  readonly textChars: number
  /** 正文 UTF-8 字节数（用于 SourceDocument.sizeBytes 展示）。 */
  readonly textBytes: number
  readonly truncated: boolean
  /** 抓取后的最终 URL（用于 web.finalUrl）。 */
  readonly finalUrl: string
}

/** 网页来源的合成 originalPath（不指向本地文件，仅供身份与去重）。 */
export function webSyntheticPath(url: string): string {
  return `web://${url.trim()}`
}

/** URL 域名（去掉 www.），解析失败返回空串。 */
export function domainOf(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

/** 去掉脚本/样式/导航/页脚/侧栏等页面外壳（不执行任何内容）。 */
export function stripNonContentHtml(html: string): string {
  let output = html
  // 成对的外壳标签：直到闭合标签（跨行、忽略大小写）
  const paired = /<(script|style|nav|footer|aside|noscript|iframe|svg|form|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
  for (let pass = 0; pass < 3; pass += 1) {
    const next = output.replace(paired, ' ')
    if (next === output) break
    output = next
  }
  return output
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|nav|footer|aside|noscript|iframe|svg|form|template)\b[^>]*\/?>/gi, ' ')
    // 块级边界换行：让抽取单元的 lines/locator 与页面结构对应（HTML 常被压成一行）
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|li|ul|ol|h[1-6]|tr|table|thead|tbody|pre|blockquote|figure|figcaption|main|header)\s*>/gi, '\n')
}

/** 从 `<title>` 提取标题（解码实体、去标签）。 */
export function extractHtmlTitle(html: string): string | undefined {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)
  if (match === null) return undefined
  const title = decodeHtmlEntities((match[1] ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
  return title === '' ? undefined : title
}

/** 首个 H1 的纯文本（标题回退用）。 */
function extractFirstHeading(html: string): string | undefined {
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i.exec(html)
  if (match === null) return undefined
  const text = decodeHtmlEntities((match[1] ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
  return text === '' ? undefined : text
}

/** 文本是否像 Markdown（用于选择 Markdown 抽取器以保留标题）。 */
function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s+\S/m.test(text) || /^```/m.test(text)
}

/** 网页导入不使用 OCR（没有本地文件，也不需要识别图片文字）。 */
function disabledOcrRuntime(): OcrRuntime {
  return {
    available: false,
    reason: '网页导入不执行 OCR',
    languages: [],
    minConfidence: 70,
    timeoutMs: 0,
    renderDpi: 72,
  }
}

function webIssue(
  code: SourceIssue['code'],
  severity: SourceIssue['severity'],
  message: string,
  options: { readonly reviewRequired?: boolean; readonly excerpt?: string } = {},
): SourceIssue {
  return {
    code,
    severity,
    message,
    reviewRequired: options.reviewRequired ?? false,
    ...(options.excerpt !== undefined ? { excerpt: options.excerpt.slice(0, 240) } : {}),
  }
}

function webLimits(limits: CorpusLimits): CorpusLimits {
  return {
    ...limits,
    maxTextChars: Math.min(limits.maxTextChars, WEB_TEXT_CAP),
    maxUnits: Math.min(limits.maxUnits, WEB_MAX_UNITS),
  }
}

async function runParserForWeb(input: {
  readonly format: ParsedSource['format']
  readonly extension: string
  readonly content: string
  readonly limits: CorpusLimits
}): Promise<ParserOutput> {
  const revisionId = newSourceRevisionId()
  const context: ParseContext = {
    path: webSyntheticPath('web-import'),
    bytes: new TextEncoder().encode(input.content),
    format: input.format,
    extension: input.extension,
    limits: webLimits(input.limits),
    revisionId,
    ocr: disabledOcrRuntime(),
  }
  if (input.format === 'html') return await parseHtml(context)
  if (input.format === 'markdown') return await parseMarkdown(context)
  return await parsePlainText(context)
}

/** 给 heading 单元补 Markdown 标题（保留原始标题级别/层级）。 */
function withMarkdownHeadings(units: readonly SourceUnit[]): SourceUnit[] {
  return units.map(unit => {
    if (unit.kind !== 'heading') return unit
    const level = Math.min(6, Math.max(1, unit.locator.sectionPath?.length ?? 1))
    return { ...unit, markdown: `${'#'.repeat(level)} ${unit.text}` }
  })
}

/** 基于抽取正文计算稳定内容哈希。 */
function contentHashOf(units: readonly SourceUnit[]): string {
  const normalized = units
    .map(unit => `${unit.kind}\u0000${unit.text.replace(/\s+/g, ' ').trim()}`)
    .join('\n')
  return fingerprintOfBytes(new TextEncoder().encode(normalized))
}

/**
 * 解析已抓取的网页内容为 SourceUnits（纯函数式、无网络/无脚本执行）。
 *
 * 失败：URL 非法、html/text 均为空、抽取不到正文（可能依赖脚本渲染）。
 */
export async function parseWebPage(
  request: WebImportRequest,
  limits: CorpusLimits,
): Promise<Result<WebParsedContent>> {
  const url = typeof request.url === 'string' ? request.url.trim() : ''
  if (!/^https?:\/\//iu.test(url)) {
    return err('invalid-input', '网页导入只支持 http(s) URL', { cause: 'invalid-url' })
  }
  const html = typeof request.html === 'string' && request.html.trim() !== '' ? request.html : undefined
  const text = typeof request.text === 'string' && request.text.trim() !== '' ? request.text : undefined
  if (html === undefined && text === undefined) {
    return err('invalid-input', '网页没有返回内容（html 与 text 均为空）', { cause: 'empty-page' })
  }
  const finalUrl = (request.finalUrl ?? request.url).trim()
  let output: ParserOutput | undefined
  let attempted = ''
  try {
    if (html !== undefined) {
      const sanitized = stripNonContentHtml(html)
      attempted = `html(${html.length} chars, 去壳后 ${sanitized.length})`
      output = await runParserForWeb({ format: 'html', extension: '.html', content: sanitized, limits })
      // HTML 抽取不到正文但调用方同时给了 text：回退到文本内容
      if (output.parsed.units.length === 0 && text !== undefined) {
        attempted += ' → text 回退'
        const format: ParsedSource['format'] = looksLikeMarkdown(text) ? 'markdown' : 'text'
        output = await runParserForWeb({
          format,
          extension: format === 'markdown' ? '.md' : '.txt',
          content: text,
          limits,
        })
      }
    } else if (text !== undefined) {
      const format: ParsedSource['format'] = looksLikeMarkdown(text) ? 'markdown' : 'text'
      attempted = `${format}(${text.length} chars)`
      output = await runParserForWeb({
        format,
        extension: format === 'markdown' ? '.md' : '.txt',
        content: text,
        limits,
      })
    }
  } catch (cause) {
    return err('failed', `网页内容解析失败：${cause instanceof Error ? cause.message : String(cause)}`, {
      cause: 'web-parse-failed',
      details: { url, attempted },
      retryable: false,
    })
  }
  if (output === undefined) {
    return err('invalid-input', '网页没有返回可解析的内容', { cause: 'empty-page' })
  }
  const units = withMarkdownHeadings(output.parsed.units)
  if (units.length === 0) {
    return err(
      'invalid-input',
      '网页没有可提取的正文（可能依赖脚本渲染、只含导航/页脚，或返回的是验证/登录页）',
      { cause: 'empty-content', details: { url, attempted } },
    )
  }
  const firstHeading = units.find(unit => unit.kind === 'heading')
  // 标题回退顺序：调用方 title > 页面 <title> > 页面 H1 > 域名 > 正文首标题 > URL
  const title = (request.title ?? '').trim()
    || extractHtmlTitle(html ?? '')
    || extractFirstHeading(html ?? '')
    || domainOf(finalUrl)
    || firstHeading?.text
    || url
  const contentHash = contentHashOf(units)
  let textChars = 0
  for (const unit of units) textChars += unit.text.length
  const issues: SourceIssue[] = [...output.parsed.issues]
  const truncated = issues.some(issue => issue.code === 'truncated') || textChars >= WEB_TEXT_CAP
  if (truncated && !issues.some(issue => issue.code === 'truncated')) {
    issues.push(webIssue('truncated', 'warning',
      `网页正文超过上限（${WEB_TEXT_CAP} 字符），已截断；请回看原始网页核对完整内容`, { reviewRequired: true }))
  }
  // 正文过少：常出现在 SPA/需登录页面，明确提示而不是当成正常资料
  const rawLength = (html ?? text ?? '').length
  if (textChars < 200 && rawLength > 2_000) {
    issues.push(webIssue('unsupported-content', 'warning',
      '网页正文抽取过少（可能依赖脚本渲染或需要登录），建议用原始页面核对或改用可读的镜像/PDF 版本',
      { reviewRequired: true, excerpt: units[0]?.text ?? '' }))
  }
  const textBytes = new TextEncoder().encode(units.map(unit => unit.text).join('\n')).byteLength
  return ok({
    title: title.slice(0, 200),
    format: output.parsed.format,
    ...(output.parsed.detail !== undefined ? { detail: output.parsed.detail } : {}),
    contentHash,
    units,
    issues,
    ...(output.parsed.extent !== undefined ? { extent: output.parsed.extent } : {}),
    textChars,
    textBytes,
    truncated,
    finalUrl,
  })
}
