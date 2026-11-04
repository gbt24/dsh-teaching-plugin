/**
 * 格式识别与解析分发。
 *
 * 识别只依据扩展名（可用 formatHint 覆盖），未知扩展名明确失败而不是猜；
 * 这样导入问题清单可以说清楚「为什么不支持」。
 */
import { extname } from 'node:path'
import type { SourceFormat } from '../../contracts/source.ts'
import type { ParserOutput } from '../budget.ts'
import type { FormatParser, ParseContext } from './context.ts'
import { codeLanguageOf, parseCode, parseMarkdown, parsePlainText } from './plain.ts'
import { parseNotebook } from './notebook.ts'
import { parseHtml } from './html.ts'
import { parseDocx, parsePptx } from './office.ts'
import { parsePdf } from './pdf.ts'
import { parseImage } from './image.ts'

/** 一组合法的 SourceFormat 值（用于 formatHint 校验）。 */
export const SOURCE_FORMATS: readonly SourceFormat[] = [
  'markdown', 'text', 'pdf', 'image', 'docx', 'pptx', 'code', 'notebook', 'html',
]

const EXTENSION_FORMATS: Readonly<Record<string, SourceFormat>> = {
  '.md': 'markdown', '.markdown': 'markdown', '.mdx': 'markdown',
  '.txt': 'text', '.text': 'text', '.log': 'text', '.rst': 'text', '.tex': 'text',
  '.csv': 'text', '.tsv': 'text',
  '.pdf': 'pdf',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image',
  '.bmp': 'image', '.tif': 'image', '.tiff': 'image', '.heic': 'image',
  '.docx': 'docx', '.pptx': 'pptx',
  '.ipynb': 'notebook',
  '.html': 'html', '.htm': 'html', '.xhtml': 'html',
}

/** formatHint 别名。 */
const FORMAT_ALIASES: Readonly<Record<string, SourceFormat>> = {
  txt: 'text', text: 'text', md: 'markdown', markdown: 'markdown', pdf: 'pdf',
  image: 'image', img: 'image', png: 'image', jpg: 'image', jpeg: 'image',
  docx: 'docx', doc: 'docx', word: 'docx', pptx: 'pptx', ppt: 'pptx', powerpoint: 'pptx',
  code: 'code', notebook: 'notebook', ipynb: 'notebook', html: 'html', htm: 'html',
}

/** 识别结果。 */
export interface DetectedFormat {
  readonly format: SourceFormat
  /** 代码语言等细节。 */
  readonly detail?: string
}

/** 由路径与可选提示识别格式；未知返回 undefined。 */
export function detectSourceFormat(path: string, formatHint?: string): DetectedFormat | undefined {
  if (formatHint !== undefined && formatHint !== '') {
    const hint = FORMAT_ALIASES[formatHint.trim().toLowerCase()]
    if (hint !== undefined) {
      return hint === 'code'
        ? { format: 'code', ...(codeLanguageOf(extname(path).toLowerCase()) !== undefined
          ? { detail: codeLanguageOf(extname(path).toLowerCase()) as string }
          : {}) }
        : { format: hint }
    }
  }
  const extension = extname(path).toLowerCase()
  const fromExtension = EXTENSION_FORMATS[extension]
  if (fromExtension !== undefined) return { format: fromExtension }
  const language = codeLanguageOf(extension)
  if (language !== undefined) return { format: 'code', detail: language }
  return undefined
}

const PARSERS: Readonly<Record<SourceFormat, FormatParser>> = {
  markdown: parseMarkdown,
  text: parsePlainText,
  pdf: parsePdf,
  image: parseImage,
  docx: parseDocx,
  pptx: parsePptx,
  code: parseCode,
  notebook: parseNotebook,
  html: parseHtml,
}

/** 按格式分发解析。 */
export async function parseSourceFile(context: ParseContext): Promise<ParserOutput> {
  const parser = PARSERS[context.format]
  return await parser(context)
}
