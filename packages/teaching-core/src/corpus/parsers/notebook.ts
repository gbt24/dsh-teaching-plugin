/**
 * Jupyter Notebook (.ipynb) 抽取器。
 *
 * 每个单元格（cell）产出一个或多个单元；定位使用 `locator.cell`（0-based）。
 * Markdown 单元格复用 Markdown 抽取（公式/图片规则一致）；代码单元格保留语言；
 * 图像输出写入派生资产并作为 figure 单元，文本输出作为 note 单元进入检索。
 */
import { dirname } from 'node:path'
import type { SourceIssue, SourceLocator } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import { CorpusParseError } from '../errors.ts'
import { clamp01 } from '../text-utils.ts'
import type { ParseContext } from './context.ts'
import { addImageAsset, assetNamePrefix, decodeText } from './context.ts'
import { extractMarkdown } from './plain.ts'

const EXTRACTOR_VERSION = '1.0.0'

interface NotebookOutput {
  readonly output_type?: string
  readonly text?: string | readonly string[]
  readonly data?: Readonly<Record<string, unknown>>
  readonly ename?: string
  readonly evalue?: string
  readonly name?: string
}

interface NotebookCell {
  readonly cell_type?: string
  readonly source?: string | readonly string[]
  readonly outputs?: readonly NotebookOutput[]
}

interface NotebookDocument {
  readonly cells?: readonly NotebookCell[]
  readonly metadata?: {
    readonly kernelspec?: { readonly language?: string; readonly name?: string }
    readonly language_info?: { readonly name?: string }
  }
}

/** 合并多行 source/text 字段。 */
function joinSource(value: string | readonly string[] | undefined): string {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : value.join('')
}

function issue(
  code: SourceIssue['code'],
  severity: SourceIssue['severity'],
  message: string,
  locator: SourceLocator,
  reviewRequired: boolean,
): SourceIssue {
  return { code, severity, message, locator, reviewRequired }
}

/** 解析 Notebook。 */
export async function parseNotebook(context: ParseContext): Promise<ParserOutput> {
  let document: NotebookDocument
  try {
    document = JSON.parse(decodeText(context.bytes)) as NotebookDocument
  } catch (cause) {
    throw new CorpusParseError(
      `Notebook JSON 解析失败：${cause instanceof Error ? cause.message : String(cause)}`,
      'corrupt-json',
    )
  }
  if (!Array.isArray(document.cells)) {
    throw new CorpusParseError('Notebook 缺少 cells 数组，可能不是 nbformat 文件', 'invalid-notebook')
  }
  const language = document.metadata?.kernelspec?.language
    ?? document.metadata?.language_info?.name
    ?? 'python'
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const assetPrefix = assetNamePrefix(context.path)
  const cells = document.cells
  if (cells.length === 0) {
    budget.addIssue(issue('unsupported-content', 'warning',
      'Notebook 没有任何单元格，导入后没有可读内容', { cell: 0 }, true))
  }
  for (let index = 0; index < cells.length; index += 1) {
    budget.checkAbort()
    if (budget.full || budget.overTextLimit) break
    const cell = cells[index] as NotebookCell
    const source = joinSource(cell.source)
    const cellType = cell.cell_type ?? 'unknown'
    if (cellType === 'markdown') {
      await extractMarkdown(source, {
        budget,
        fileDir: dirname(context.path),
        baseLocator: { cell: index },
        assetPrefix,
      })
      continue
    }
    if (cellType === 'code') {
      budget.addUnit({
        kind: 'code',
        locator: { cell: index },
        text: source,
        confidence: 'high',
        notes: [`语言：${language}`, `Notebook 代码单元格（cell ${index + 1}）`],
      })
      await addOutputs(budget, cell.outputs ?? [], index, assetPrefix)
      continue
    }
    // raw / 未知类型：作为 note 保留
    if (source.trim() !== '') {
      budget.addUnit({
        kind: 'note',
        locator: { cell: index },
        text: source,
        confidence: 'high',
        notes: [`Notebook ${cellType} 单元格（cell ${index + 1}）`],
      })
    }
  }
  return budget.finalize('notebook', language, {
    name: 'teaching-corpus/notebook',
    version: EXTRACTOR_VERSION,
  }, { kind: 'cells', count: cells.length })
}

async function addOutputs(
  budget: ExtractionBudget,
  outputs: readonly NotebookOutput[],
  cellIndex: number,
  assetPrefix: string,
): Promise<void> {
  for (const output of outputs) {
    budget.checkAbort()
    const type = output.output_type ?? ''
    if (type === 'stream') {
      const text = joinSource(output.text)
      if (text.trim() !== '') {
        budget.addUnit({
          kind: 'note',
          locator: { cell: cellIndex },
          text: `输出：\n${text.trim()}`,
          confidence: 'high',
          notes: ['Notebook 文本输出'],
        })
      }
      continue
    }
    if (type === 'error') {
      const name = output.ename ?? 'Error'
      const value = output.evalue ?? ''
      budget.addUnit({
        kind: 'note',
        locator: { cell: cellIndex },
        text: `运行错误：${name}: ${value}`,
        confidence: 'high',
        notes: ['Notebook 执行错误输出'],
      })
      continue
    }
    if (type === 'execute_result' || type === 'display_data') {
      const data = output.data ?? {}
      const plain = data['text/plain']
      const plainText = Array.isArray(plain) ? plain.join('') : (typeof plain === 'string' ? plain : '')
      const imageKeys = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      let imageAdded = false
      for (const key of imageKeys) {
        const encoded = data[key]
        if (typeof encoded !== 'string' || encoded.trim() === '') continue
        const bytes = decodeBase64(encoded)
        if (bytes === undefined) continue
        const extension = key.slice('image/'.length)
        const assetPath = addImageAsset(budget, bytes, extension, `${assetPrefix}-cell${cellIndex}`)
        if (assetPath !== undefined) {
          budget.addUnit({
            kind: 'figure',
            locator: { cell: cellIndex },
            text: plainText.trim() !== '' ? plainText.trim().slice(0, 240) : `Notebook 单元格 ${cellIndex + 1} 的输出图像`,
            assetPath,
            confidence: 'high',
            notes: ['Notebook 图像输出'],
          })
          imageAdded = true
          break
        }
      }
      if (!imageAdded && plainText.trim() !== '') {
        budget.addUnit({
          kind: 'note',
          locator: { cell: cellIndex },
          text: `输出：\n${plainText.trim()}`,
          confidence: 'high',
          notes: ['Notebook 文本输出'],
        })
      }
    }
  }
}

/** base64 解码；失败返回 undefined。 */
function decodeBase64(value: string): Uint8Array | undefined {
  try {
    const cleaned = value.replace(/\s+/g, '')
    const buffer = Buffer.from(cleaned, 'base64')
    if (buffer.length === 0) return undefined
    return new Uint8Array(buffer)
  } catch {
    return undefined
  }
}

/** 保留给未来 bbox 归一化（Notebook 暂无页面坐标）。 */
export function normalizePoint(value: number): number {
  return clamp01(value)
}
