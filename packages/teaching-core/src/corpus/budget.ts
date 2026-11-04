/**
 * 抽取预算：统一的单元/问题/资产上限与取消检查。
 *
 * 所有格式解析器都通过它产出单元，从而让「截断、问题过多、取消」等行为一致，
 * 而不是每个解析器各写一套。
 */
import type {
  ExtractionConfidence, ParsedSource, SourceFormat, SourceIssue, SourceLocator, SourceUnit,
} from '../contracts/source.ts'
import { unitId as newUnitId, type SourceRevisionId } from '../contracts/ids.ts'
import type { CorpusLimits } from './limits.ts'
import { CorpusCancelledError } from './errors.ts'

/** 一个派生资产（图片等）的字节内容。 */
export interface ParseAsset {
  readonly bytes: Uint8Array
  readonly ext: string
}

/** 解析器输出：已抽取的修订内容 + 需要持久化到资产目录的字节。 */
export interface ParserOutput {
  readonly parsed: ParsedSource
  readonly assets: ReadonlyMap<string, ParseAsset>
}

/** 新增单元的输入；id/revisionId 由预算器生成。 */
export interface NewUnitInput {
  readonly kind: SourceUnit['kind']
  readonly locator: SourceLocator
  readonly text: string
  readonly markdown?: string
  readonly assetPath?: string
  readonly confidence: ExtractionConfidence
  readonly notes?: readonly string[]
}

/** 抽取器标识。 */
export interface ExtractorInfo {
  readonly name: string
  readonly version: string
}

/** 抽取预算器。 */
export class ExtractionBudget {
  readonly revisionId: SourceRevisionId
  readonly limits: CorpusLimits
  readonly units: SourceUnit[]
  readonly issues: SourceIssue[]
  readonly assets: Map<string, ParseAsset>

  private readonly signal?: AbortSignal
  private extractedChars = 0
  private truncatedUnits = 0
  private documentTruncated = false
  private suppressedIssues = 0
  private assetsRejected = 0

  constructor(revisionId: SourceRevisionId, limits: CorpusLimits, signal?: AbortSignal) {
    this.revisionId = revisionId
    this.limits = limits
    this.signal = signal
    this.units = []
    this.issues = []
    this.assets = new Map()
  }

  /** 取消检查：解析循环里定期调用。 */
  checkAbort(): void {
    if (this.signal?.aborted === true) throw new CorpusCancelledError()
  }

  /** 是否已经达到单元上限（解析器应停止继续抽取）。 */
  get full(): boolean {
    return this.units.length >= this.limits.maxUnits
  }

  /** 已抽取字符总数（用于 total 上限）。 */
  get textChars(): number {
    return this.extractedChars
  }

  /** 是否已超过整份资料的字符上限。 */
  get overTextLimit(): boolean {
    return this.textChars >= this.limits.maxTextChars
  }

  /** 添加一个问题；超过上限后只计一次汇总。 */
  addIssue(issue: SourceIssue): void {
    if (this.issues.length >= this.limits.maxIssues) {
      this.suppressedIssues += 1
      return
    }
    this.issues.push(issue)
  }

  /** 添加一个单元；达到上限或字符上限时返回 false 并记录截断。 */
  addUnit(input: NewUnitInput): boolean {
    if (this.full || this.overTextLimit) {
      this.markDocumentTruncated(input.locator)
      return false
    }
    let text = input.text
    let markdown = input.markdown
    if (text.length > this.limits.maxUnitChars) {
      this.truncatedUnits += 1
      text = `${text.slice(0, this.limits.maxUnitChars)}…`
      markdown = undefined
    }
    const notes = input.notes !== undefined ? [...input.notes] : undefined
    this.extractedChars += text.length
    this.units.push({
      id: newUnitId(),
      revisionId: this.revisionId,
      kind: input.kind,
      locator: input.locator,
      text,
      ...(markdown !== undefined ? { markdown } : {}),
      ...(input.assetPath !== undefined ? { assetPath: input.assetPath } : {}),
      confidence: input.confidence,
      ...(notes !== undefined && notes.length > 0 ? { notes } : {}),
    })
    if (this.truncatedUnits > 0 && this.truncatedUnits === 1) {
      this.addIssue({
        code: 'truncated',
        severity: 'info',
        message: '部分单元过长，已截断显示；原文仍完整保留在学生文件中',
        locator: input.locator,
        excerpt: text.slice(0, 120),
        reviewRequired: false,
      })
    }
    return true
  }

  /**
   * 添加一个派生资产；超过单资产上限/总资产上限时报告并返回 undefined。
   * @returns 相对修订资产目录的路径，例如 `figures/page-1-1.png`
   */
  addAsset(relativePath: string, bytes: Uint8Array, ext: string): string | undefined {
    if (this.assets.size >= this.limits.maxAssets) {
      this.assetsRejected += 1
      this.reportAssetProblem('派生资产数量过多，部分图片未保存')
      return undefined
    }
    if (bytes.length > this.limits.maxAssetBytes) {
      this.assetsRejected += 1
      this.reportAssetProblem('图片过大，未保存为派生资产')
      return undefined
    }
    this.assets.set(relativePath, { bytes, ext })
    return relativePath
  }

  private reportAssetProblem(message: string): void {
    if (this.assetsRejected === 1) {
      this.addIssue({
        code: 'figure-unreadable',
        severity: 'warning',
        message,
        reviewRequired: false,
      })
    }
  }

  private markDocumentTruncated(locator: SourceLocator): void {
    if (this.documentTruncated) return
    this.documentTruncated = true
    this.addIssue({
      code: 'truncated',
      severity: 'warning',
      message: `资料内容超过本版本上限（${this.limits.maxUnits} 个单元 / ${this.limits.maxTextChars} 字符），后续内容未抽取；请分段导入或核对原文`,
      locator,
      reviewRequired: true,
    })
  }

  /** 生成最终的 ParsedSource；附带截断/问题汇总。 */
  finalize(
    format: SourceFormat,
    detail: string | undefined,
    extractor: ExtractorInfo,
    extent?: ParsedSource['extent'],
  ): ParserOutput {
    if (this.suppressedIssues > 0) {
      this.issues.push({
        code: 'truncated',
        severity: 'info',
        message: `问题清单超过 ${this.limits.maxIssues} 条，另有 ${this.suppressedIssues} 条未记录`,
        reviewRequired: false,
      })
    }
    const parsed: ParsedSource = {
      format,
      ...(detail !== undefined ? { detail } : {}),
      extractor,
      units: this.units,
      issues: this.issues,
      ...(extent !== undefined ? { extent } : {}),
    }
    return { parsed, assets: this.assets }
  }
}

/** 由抽取问题推导修订状态；供存储层使用。 */
export function statusForIssues(issues: readonly SourceIssue[]): 'ready' | 'partial' | 'needs-review' {
  if (issues.some(issue => issue.reviewRequired || issue.severity === 'error')) return 'needs-review'
  if (issues.some(issue => issue.severity === 'warning' || issue.severity === 'info')) return 'partial'
  return 'ready'
}
