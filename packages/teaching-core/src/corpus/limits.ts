/**
 * 语料导入/抽取的可配置上限。
 *
 * 这些上限是「可报告状态」的来源而不是静默截断：接近或超过上限时抽取器会写入
 * `truncated` 等 SourceIssue，教学层据此提示学生核对原文。测试与 Host 可以覆盖
 * 单个字段（样本较小，默认值面向真实资料规模）。
 */

/** 语料抽取与检索上限。 */
export interface CorpusLimits {
  /** 单份原文件最大字节数；超过直接失败（不静默截断文件）。 */
  readonly maxFileBytes: number
  /** 单份资料最多抽取的字符数；超过后停止抽取并报告 truncated。 */
  readonly maxTextChars: number
  /** 单份资料最多生成的单元数。 */
  readonly maxUnits: number
  /** 单个单元最多字符数；超出部分截断并报告。 */
  readonly maxUnitChars: number
  /** 单份资料最多记录的问题条数（其余汇总为一条）。 */
  readonly maxIssues: number
  /** 单个派生资产（图片）最大字节数。 */
  readonly maxAssetBytes: number
  /** 单份资料最多派生资产数。 */
  readonly maxAssets: number
  /** 扫描 PDF 最多 OCR 的页数；超过部分报告 truncated。 */
  readonly pdfOcrPageLimit: number
  /** 单次 OCR 子进程超时（毫秒）。 */
  readonly ocrTimeoutMs: number
  /** OCR 平均置信度低于该值时进入待核对（reviewRequired）。 */
  readonly ocrMinConfidence: number
  /** 扫描页渲染 DPI。 */
  readonly ocrRenderDpi: number
  /** （旧版单次提示）课程草案提示中材料摘要的最大字符数；v2 llm-wiki 路径改用下方预算。 */
  readonly draftMaxChars: number
  /** 课程草案每份资料最多包含的单元数。 */
  readonly draftUnitsPerDoc: number
  /** 旧版扁平草案最多概念数（超出丢弃并警告）。 */
  readonly draftMaxConcepts: number
  /** LLM-wiki 回退路径单次调用材料摘要预算（字符）；超过则按资料分组 map 后合并。 */
  readonly draftLlmWikiBudgetChars: number
  /** LLM-wiki 回退路径每份资料摘要的最大字符数。 */
  readonly draftLlmWikiDocChars: number
  /** LLM-wiki 回退路径最多模型调用次数（含单组修复调用）；有界，不无限重试。 */
  readonly draftLlmWikiGroupCallsMax: number
  /** LLM-wiki 回退路径最多概念数（超出丢弃并警告）。 */
  readonly draftLlmWikiMaxConcepts: number
  /** 知识库结构直读最多概念数（真实课程可能上百；超出丢弃并警告）。 */
  readonly kbMaxConcepts: number
  /** 知识库结构直读最多章节数（含工具/附录章节）。 */
  readonly kbMaxChapters: number
  /** 课程草案最多生成/读取的单元摘要数量（单文档标题树）。 */
  readonly draftLlmWikiHeadingsPerDoc: number
  /** search 默认返回条数。 */
  readonly searchDefaultLimit: number
  /** search 最大返回条数。 */
  readonly searchMaxLimit: number
  /** 单次查询最多使用的检索词数。 */
  readonly searchMaxQueryTerms: number
  /** 内存中缓存的检索索引文档数上限。 */
  readonly searchIndexCacheSize: number
}

/** 默认上限；面向「每课程数十份、总库数百份、上万页」的个人规模。 */
export const DEFAULT_LIMITS: CorpusLimits = Object.freeze({
  maxFileBytes: 256 * 1024 * 1024,
  maxTextChars: 8_000_000,
  maxUnits: 120_000,
  maxUnitChars: 4_000,
  maxIssues: 200,
  maxAssetBytes: 12 * 1024 * 1024,
  maxAssets: 2_000,
  pdfOcrPageLimit: 120,
  ocrTimeoutMs: 120_000,
  ocrMinConfidence: 70,
  ocrRenderDpi: 200,
  draftMaxChars: 18_000,
  draftUnitsPerDoc: 80,
  draftMaxConcepts: 40,
  draftLlmWikiBudgetChars: 80_000,
  draftLlmWikiDocChars: 1_400,
  draftLlmWikiGroupCallsMax: 6,
  draftLlmWikiMaxConcepts: 200,
  kbMaxConcepts: 500,
  kbMaxChapters: 80,
  draftLlmWikiHeadingsPerDoc: 24,
  searchDefaultLimit: 10,
  searchMaxLimit: 100,
  searchMaxQueryTerms: 24,
  searchIndexCacheSize: 24,
})

/** 合并默认值与调用方覆盖项。 */
export function resolveLimits(overrides?: Partial<CorpusLimits>): CorpusLimits {
  if (overrides === undefined) return DEFAULT_LIMITS
  return { ...DEFAULT_LIMITS, ...overrides }
}
