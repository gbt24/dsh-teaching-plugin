/**
 * 图片资料（扫描页/照片）抽取器：原图作为派生资产保留，文字走宿主 OCR。
 *
 * 不确定性规则：OCR 不可用、失败、识别为空、平均置信度低都会写入
 * SourceIssue（reviewRequired=true），导入本身成功返回可读/可核对状态。
 */
import { basename } from 'node:path'
import type { ExtractionConfidence, SourceLocator } from '../../contracts/source.ts'
import { ExtractionBudget } from '../budget.ts'
import type { ParserOutput } from '../budget.ts'
import { addOcrPageUnits } from './pdf.ts'
import { ocrImage } from '../ocr.ts'
import { looksLikeFormula } from '../text-utils.ts'
import type { ParseContext } from './context.ts'
import { addImageAsset, assetNamePrefix } from './context.ts'

const EXTRACTOR_VERSION = '1.0.0'

/** 解析图片文件。 */
export async function parseImage(context: ParseContext): Promise<ParserOutput> {
  const budget = new ExtractionBudget(context.revisionId, context.limits, context.signal)
  const assetPrefix = assetNamePrefix(context.path)
  const locator: SourceLocator = {}
  const assetPath = addImageAsset(budget, context.bytes, context.extension, `${assetPrefix}-original`)
  const fileName = basename(context.path)
  budget.addUnit({
    kind: 'figure',
    locator,
    text: `图片资料：${fileName}`,
    ...(assetPath !== undefined ? { assetPath } : {}),
    confidence: 'high',
    notes: ['原图已作为派生资产保留，可回看核对'],
  })
  if (!context.ocr.available) {
    budget.addIssue({
      code: 'unsupported-content',
      severity: 'warning',
      message: `本机 OCR 不可用，图片文字未识别：${context.ocr.reason}。安装 tesseract 后可重新导入。`,
      locator,
      reviewRequired: true,
    })
  } else {
    const pageResult = await ocrImage(context.ocr, context.path, context.signal)
    if (pageResult.failure !== undefined) {
      budget.addIssue({
        code: 'scan-no-text',
        severity: 'warning',
        message: `图片 OCR 失败：${pageResult.failure}`,
        locator,
        reviewRequired: true,
      })
    } else {
      addOcrPageUnits(budget, pageResult, locator, context.ocr.minConfidence)
      addLowConfidenceFormulaNotes(budget, pageResult, context.ocr.minConfidence)
    }
  }
  return budget.finalize('image', context.extension.replace(/^\./, ''), {
    name: 'teaching-corpus/image',
    version: EXTRACTOR_VERSION,
  }, { kind: 'pages', count: 1 })
}

/** 对 OCR 出的疑似公式单元补充不确定说明。 */
function addLowConfidenceFormulaNotes(
  budget: ExtractionBudget,
  pageResult: { readonly lines: readonly { readonly text: string }[] },
  minConfidence: number,
): void {
  const formulaTexts = pageResult.lines.map(line => line.text.trim()).filter(text => looksLikeFormula(text))
  if (formulaTexts.length === 0) return
  budget.addIssue({
    code: 'formula-uncertain',
    severity: 'warning',
    message: '图片中的公式由 OCR 识别，符号可能错误，请核对原图',
    excerpt: formulaTexts[0] ?? '',
    reviewRequired: true,
  })
}

/** 保留：供测试显式转换置信度。 */
export function asConfidence(value: number, threshold: number): ExtractionConfidence {
  return value >= threshold ? 'medium' : 'low'
}
