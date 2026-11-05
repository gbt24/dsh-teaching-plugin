/**
 * 知识库结构识别与确定性课程结构构建（course structure v2，模式 A）。
 *
 * 遵循 Karpathy LLM Wiki skill（`/Users/gbt24/Downloads/llm-wiki/SKILL.md`，v2.1.0）：
 * - 三层结构：raw/ 源材料、wiki 页（concepts/entities/comparisons/queries）、SCHEMA/index/log；
 * - frontmatter（title/type/tags/sources/confidence）与 `[[wikilinks]]` 是结构事实；
 * - 本地扩展 page type：chapter-overview（章节概览，章节节点与子概念顺序）。
 *
 * 本文件只读取学生原始文件（只读）并产出「结构数据」，持久化由 draft.ts 统一完成；
 * 模式 A 不调用模型（检测 + 确定性构建），模式 B（LLM-wiki 回退）见 draft.ts。
 */
import { readFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'
import type { CourseDraftInput } from '../contracts/corpus.ts'
import type {
  CourseChapter, CourseSourceRef, ConceptDifficulty, SourceRole,
} from '../contracts/course.ts'
import type { SourceAnchor, SourceDocument, SourceRevision, SourceUnit } from '../contracts/source.ts'
import type { SourceId } from '../contracts/ids.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import { isSignalAborted } from './budget.ts'
import type { CorpusLimits } from './limits.ts'
import type { CorpusStore } from './store.ts'
import { excerptAround, locatorDescription } from './text-utils.ts'

/* ------------------------------------------------------------------ 基础类型 */

/** LLM-wiki skill 与本地扩展定义的知识库资料角色。 */
export type KbSourceRole =
  | 'schema'
  | 'catalog'
  | 'log'
  | 'raw-article'
  | 'raw-paper'
  | 'raw-transcript'
  | 'raw-asset'
  | 'visual-asset'
  | 'concept'
  | 'entity'
  | 'comparison'
  | 'query'
  | 'summary'
  | 'chapter-overview'
  | 'archive'
  | 'unknown'

/** 可从 frontmatter 读出的标量或字符串数组。 */
export type KbFrontmatterValue = string | boolean | readonly string[]

/** 待解析的 Markdown 页面（先按路径做初步角色判定，再决定是否读取正文）。 */
export interface KbPage {
  readonly document: SourceDocument
  /** 相对知识库根目录的路径（posix 分隔符）。 */
  readonly relativePath: string
  readonly fileName: string
  readonly slug: string
  /** 是否成功读取原始 Markdown 文件。 */
  readonly fromDisk: boolean
  /** 是否由已存单元重建（原文件缺失）。 */
  readonly fromUnits: boolean
  readonly content?: string
  readonly frontmatter?: Readonly<Record<string, KbFrontmatterValue>>
  readonly h1?: string
  readonly h1Line?: number
  readonly headings: readonly KbHeading[]
  readonly wikilinks: readonly KbLink[]
  readonly firstParagraph?: string
  readonly lineCount: number
  readonly role: KbSourceRole
}

/** Markdown 标题行。 */
export interface KbHeading {
  readonly level: number
  readonly text: string
  readonly line: number
}

/** 一个 wikilink 引用。 */
export interface KbLink {
  readonly target: string
  readonly display?: string
  readonly embed: boolean
  readonly line: number
}

/** 检测信号（用于向 UI 解释「为什么认为是知识库」）。 */
export interface KbDetectionSignal {
  readonly id: string
  readonly label: string
  readonly weight: number
  readonly matched: boolean
}

/** 知识库检测事实。 */
export interface KbDetectionFacts {
  readonly isKnowledgeBase: boolean
  readonly reason: string
  readonly rootPath?: string
  readonly pageCount: number
  readonly hasSchema: boolean
  readonly hasIndex: boolean
  readonly indexSectionCount: number
  readonly frontmatterPageCount: number
  readonly layeredDirs: readonly string[]
  readonly chapterOverviewCount: number
  readonly wikilinkCount: number
  readonly resolvableWikilinkCount: number
  readonly rawSourceCount: number
  readonly visualAssetCount: number
  readonly signals: readonly KbDetectionSignal[]
}

/** 检测结果。 */
export interface KbDetection {
  readonly facts: KbDetectionFacts
  readonly pages: readonly KbPage[]
  readonly indexPage?: KbPage
  readonly schemaPage?: KbPage
  readonly roleByDocumentId: ReadonlyMap<string, KbSourceRole>
}

/** index.md 中的一行条目。 */
export interface KbIndexEntry {
  readonly target: string
  readonly display?: string
  readonly summary?: string
  readonly line: number
}

/** index.md 的一个 H2 分区。 */
export interface KbIndexSection {
  readonly title: string
  readonly kind: 'chapter-overviews' | 'chapter' | 'tool' | 'review' | 'raw' | 'other'
  readonly chapterNumber?: number
  readonly entries: readonly KbIndexEntry[]
}

/** 解析后的 index.md。 */
export interface KbIndex {
  readonly title?: string
  readonly lastUpdated?: string
  readonly totalPages?: number
  readonly sections: readonly KbIndexSection[]
}

/** 构建所需的课程资料（文档 + 当前修订 + 单元）。 */
export interface MaterialDocument {
  readonly document: SourceDocument
  readonly revision: SourceRevision
  readonly units: readonly SourceUnit[]
}

/** 资料装载结果。 */
export interface MaterialLoadResult {
  readonly documents: readonly MaterialDocument[]
  readonly warnings: readonly string[]
}

/** 确定性构建出的概念（id 由持久化层分配）。 */
export interface KbBuiltConcept {
  readonly title: string
  readonly summary: string
  readonly anchors: readonly SourceAnchor[]
  readonly prerequisites: readonly string[]
  readonly difficulty?: ConceptDifficulty
  readonly tags: readonly string[]
  readonly slug: string
}

/** 确定性构建出的章节。 */
export interface KbBuiltChapter {
  readonly title: string
  readonly summary?: string
  readonly role: 'chapter' | 'appendix' | 'tool'
  readonly conceptTitles: readonly string[]
  readonly anchors: readonly SourceAnchor[]
}

/** 确定性构建的完整结构数据（交给 draft.ts 持久化）。 */
export interface KbStructureBuild {
  readonly detection: KbDetection
  readonly concepts: readonly KbBuiltConcept[]
  readonly chapters: readonly KbBuiltChapter[]
  readonly sequence: readonly string[]
  readonly sources: readonly CourseSourceRef[]
  readonly basedOn: readonly { readonly sourceId: SourceId; readonly revisionId: string }[]
  readonly notes: readonly string[]
  readonly warnings: readonly string[]
}

/** 构建依赖。 */
export interface KbBuildDeps {
  readonly store: CorpusStore
  readonly limits: CorpusLimits
}

/** 预处理后的知识库上下文（资料 + 页面 + 检测结果），供检测/确定性构建/LLM 回退共用。 */
export interface KbContext {
  readonly material: MaterialLoadResult
  readonly pages: readonly KbPage[]
  readonly detection: KbDetection
}

/** 装载资料并检测知识库结构（不调用模型）。 */
export async function prepareKbContext(
  deps: KbBuildDeps,
  input: Pick<CourseDraftInput, 'courseId' | 'documentIds'>,
  signal?: AbortSignal,
): Promise<Result<KbContext>> {
  const material = await loadMaterialDocuments(deps, input)
  if (material.documents.length === 0) {
    return err('invalid-input', '课程没有可读资料，无法读取知识库结构')
  }
  const pages = await loadKbPages(deps, material.documents, signal)
  const detection = detectWikiKnowledgeBase(pages)
  return ok({ material, pages, detection })
}

/** 知识库角色 → 课程来源角色（Contract SourceRole）。 */
export function kbRoleToSourceRole(role: KbSourceRole): SourceRole {
  return SOURCE_ROLE_BY_KB_ROLE[role]
}

const LAYER_SEGMENTS = [
  'concepts', 'entities', 'comparisons', 'queries', 'raw', 'visuals', 'images', 'assets', '_archive', '_meta',
] as const

const VISUAL_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.html', '.htm'])

/** 可挂载到课程来源的来源角色（契约 SourceRole 有限集合）。 */
const SOURCE_ROLE_BY_KB_ROLE: Readonly<Record<KbSourceRole, SourceRole>> = {
  schema: 'reference',
  catalog: 'reference',
  log: 'reference',
  'raw-article': 'textbook',
  'raw-paper': 'textbook',
  'raw-transcript': 'textbook',
  'raw-asset': 'other',
  'visual-asset': 'other',
  concept: 'lecture',
  entity: 'lecture',
  comparison: 'reference',
  query: 'reference',
  summary: 'reference',
  'chapter-overview': 'lecture',
  archive: 'other',
  unknown: 'other',
}

/** 会被作为教学概念收录的页面角色。 */
const TEACHABLE_ROLES = new Set<KbSourceRole>(['concept', 'entity', 'comparison', 'summary'])

/** 需要读取正文做结构判定的初步角色。 */
const CONTENT_READING_ROLES = new Set<KbSourceRole>([
  'schema', 'catalog', 'log', 'concept', 'entity', 'comparison', 'query', 'summary',
  'chapter-overview', 'archive', 'unknown',
])

/* ------------------------------------------------------------------ 小工具 */

function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/')
}

/** 归一化为用于 wikilink/标题匹配的 key（小写、空白转连字符、去重标点）。 */
export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[\\/]+/g, '-')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** 去掉标题里的 Markdown/装饰字符（#、⭐、加粗、尾部说明）。 */
export function cleanHeadingText(text: string): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/[*_`~]+/g, '')
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u2b50\u2605\u2606\s]+/gu, '')
    .replace(/\s*[—–-]\s*概览\s*$/u, '')
    .replace(/\s*概览\s*$/u, '')
    .trim()
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_match, _target: string, alias: string | undefined) => alias ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Keep numeric ranges readable ("4~8 分" -> "4–8 分") before stripping ~.
    .replace(/(\d)\s*~\s*(\d)/g, '$1–$2')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/* ------------------------------------------------------------------ YAML frontmatter */

/** frontmatter 解析结果。 */
export interface ParsedFrontmatter {
  readonly data: Readonly<Record<string, KbFrontmatterValue>>
  readonly body: string
  /** 正文第一行的 1-based 行号。 */
  readonly bodyStartLine: number
}

function parseYamlScalar(raw: string): string | boolean {
  let value = raw.trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

function splitInlineArray(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (inner.trim() === '') return []
  const items: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined
  for (const char of inner) {
    if (quote !== undefined) {
      if (char === quote) quote = undefined
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === ',') {
      const value = current.trim()
      if (value !== '') items.push(value)
      current = ''
      continue
    }
    current += char
  }
  const last = current.trim()
  if (last !== '') items.push(last)
  return items
}

/**
 * 解析文件级 YAML frontmatter（最小实现）。
 *
 * 支持：扁平 `key: value`、行内数组 `[a, b]`、块数组（`key:` + 缩进 `- item`）、
 * 字符串引号与布尔。不支持的复杂 YAML 不会伪装成结构化数据：原样跳过。
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const withoutBom = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const lines = withoutBom.split('\n')
  const blank: ParsedFrontmatter = { data: {}, body: withoutBom, bodyStartLine: 1 }
  if (lines.length === 0 || (lines[0] ?? '').trim() !== '---') return blank
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? '').trim() === '---') {
      end = index
      break
    }
  }
  if (end === -1) return blank
  const data: Record<string, KbFrontmatterValue> = {}
  for (let index = 1; index < end; index += 1) {
    const line = lines[index] ?? ''
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (match === null) continue
    const key = (match[1] ?? '').toLowerCase()
    const rawValue = (match[2] ?? '').trim()
    if (rawValue === '') {
      // 块数组：后续缩进的 "- item"
      const items: string[] = []
      let cursor = index + 1
      while (cursor < end) {
        const candidate = lines[cursor] ?? ''
        const itemMatch = /^\s*-\s+(.+)$/.exec(candidate)
        if (itemMatch !== null) {
          items.push(parseYamlScalar(itemMatch[1] ?? '') as string)
          cursor += 1
          continue
        }
        if (candidate.trim() === '') {
          cursor += 1
          continue
        }
        break
      }
      if (items.length > 0) {
        data[key] = items
        index = cursor - 1
      }
      continue
    }
    if (rawValue.startsWith('[')) {
      data[key] = splitInlineArray(rawValue)
      continue
    }
    data[key] = parseYamlScalar(rawValue)
  }
  const bodyStartLine = end + 2
  const body = lines.slice(end + 1).join('\n')
  return { data, body, bodyStartLine }
}

function frontmatterString(frontmatter: Readonly<Record<string, KbFrontmatterValue>> | undefined, key: string): string | undefined {
  const value = frontmatter?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function frontmatterList(frontmatter: Readonly<Record<string, KbFrontmatterValue>> | undefined, key: string): string[] {
  const value = frontmatter?.[key]
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(item => item !== '')
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(',').map(item => item.trim()).filter(item => item !== '')
  }
  return []
}

/* ------------------------------------------------------------------ Markdown 扫描 */

/** 提取 Markdown 的标题、wikilink 与首段。 */
export function scanMarkdownPage(content: string): {
  readonly h1?: string
  readonly h1Line?: number
  readonly headings: readonly KbHeading[]
  readonly wikilinks: readonly KbLink[]
  readonly firstParagraph?: string
  readonly lineCount: number
} {
  const parsedFrontmatter = parseFrontmatter(content)
  const lines = parsedFrontmatter.body.split('\n')
  const headings: KbHeading[] = []
  const wikilinks: KbLink[] = []
  let h1: string | undefined
  let h1Line: number | undefined
  let inFence = false
  let fenceMarker = ''
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + parsedFrontmatter.bodyStartLine
    const line = lines[index] ?? ''
    const fenceMatch = /^\s*(```|~~~)/.exec(line)
    if (fenceMatch !== null) {
      const marker = fenceMatch[1] ?? '```'
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false
        fenceMarker = ''
      }
      continue
    }
    if (inFence) continue
    const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (headingMatch !== null) {
      const level = (headingMatch[1] ?? '#').length
      const text = cleanHeadingText(headingMatch[2] ?? '')
      if (text !== '') headings.push({ level, text, line: lineNumber })
      if (level === 1 && h1 === undefined) {
        h1 = text
        h1Line = lineNumber
      }
      continue
    }
    const linkRegex = /(!?)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g
    // 忽略行内代码中的示例链接（如 SCHEMA.md 里的 `[[wikilinks]]` 约定说明）
    const lineWithoutCode = line.replace(/`[^`]*`/g, '')
    for (const match of lineWithoutCode.matchAll(linkRegex)) {
      const target = (match[2] ?? '').trim()
      if (target === '') continue
      const display = (match[4] ?? match[3] ?? '').trim()
      wikilinks.push({
        target,
        ...(display !== '' ? { display } : {}),
        embed: match[1] === '!',
        line: lineNumber,
      })
    }
  }
  let firstParagraph: string | undefined
  const bodyStart = h1Line !== undefined ? h1Line : parsedFrontmatter.bodyStartLine
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + parsedFrontmatter.bodyStartLine
    if (lineNumber < bodyStart) continue
    const line = (lines[index] ?? '').trim()
    if (line === '' || line === '---') continue
    if (/^(#{1,6}\s|```|~~~|\||>\s|[-*+]\s|\d+\.\s|\$\$|\\\[)/.test(line)) continue
    if (/^!\[\[.*\]\]$/.test(line) || /^!\[.*\]\(.*\)$/.test(line)) continue
    const cleaned = stripInlineMarkdown(line)
    if (cleaned.length < 10) continue
    firstParagraph = truncate(cleaned, 300)
    break
  }
  return {
    ...(h1 !== undefined ? { h1 } : {}),
    ...(h1Line !== undefined ? { h1Line } : {}),
    headings,
    wikilinks,
    ...(firstParagraph !== undefined ? { firstParagraph } : {}),
    lineCount: lines.length,
  }
}

/** 从已存单元重建 Markdown 文本（原文件缺失时使用）。 */
export function reconstructMarkdownFromUnits(units: readonly SourceUnit[]): string {
  const lines: string[] = []
  for (const unit of units) {
    if (unit.kind === 'heading') {
      const level = Math.min(6, Math.max(1, unit.locator.sectionPath?.length ?? 1))
      lines.push(`${'#'.repeat(level)} ${unit.text}`)
      continue
    }
    lines.push(unit.text)
  }
  return lines.join('\n')
}

/* ------------------------------------------------------------------ 资料装载 */

/** 装载课程（或指定文档）的已就绪资料及当前修订单元。 */
export async function loadMaterialDocuments(
  deps: { readonly store: CorpusStore },
  input: Pick<CourseDraftInput, 'courseId' | 'documentIds'>,
): Promise<MaterialLoadResult> {
  const warnings: string[] = []
  let documents: SourceDocument[]
  if (input.documentIds !== undefined && input.documentIds.length > 0) {
    documents = []
    for (const documentId of input.documentIds) {
      const document = await deps.store.readDocument(documentId)
      if (document === undefined) {
        warnings.push(`资料 ${documentId} 不存在，已跳过`)
        continue
      }
      documents.push(document)
    }
  } else {
    const ids = await deps.store.documentIdsForCourses([input.courseId])
    documents = []
    for (const id of ids) {
      const document = await deps.store.readDocument(id)
      if (document !== undefined) documents.push(document)
    }
  }
  const ready: MaterialDocument[] = []
  for (const document of documents) {
    if (document.currentRevisionId === undefined) {
      warnings.push(`《${document.title}》尚未成功解析，未纳入课程草案`)
      continue
    }
    const revision = await deps.store.readRevision(document.id, document.currentRevisionId)
    if (revision === undefined) {
      warnings.push(`《${document.title}》的当前修订缺失，未纳入课程草案`)
      continue
    }
    if (revision.units.length === 0) {
      warnings.push(`《${document.title}》没有可读单元，未纳入课程草案`)
      continue
    }
    ready.push({ document, revision, units: revision.units })
  }
  return { documents: ready, warnings }
}

/* ------------------------------------------------------------------ 角色判定 */

/** 角色判定输入（路径 + 可选的 frontmatter）。 */
export interface RoleClassifyInput {
  readonly relativePath: string
  /** 绝对路径（用于路径空格差异/分层目录兜底识别）。 */
  readonly absolutePath?: string
  readonly fileName: string
  readonly extension: string
  readonly frontmatter?: Readonly<Record<string, KbFrontmatterValue>>
}

function lastSegmentIndex(segments: readonly string[], name: string): number {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if ((segments[index] ?? '').toLowerCase() === name) return index
  }
  return -1
}

/** 根据 llm-wiki skill 的目录层级 + frontmatter type 判定资料角色。 */
export function classifySourceRole(input: RoleClassifyInput): KbSourceRole {
  const relativeSegments = input.relativePath.split('/').filter(Boolean)
  const absoluteSegments = input.absolutePath !== undefined
    ? toPosix(input.absolutePath).split('/').filter(Boolean)
    : relativeSegments
  const fileName = input.fileName.toLowerCase()
  const extension = input.extension.toLowerCase()
  const fmType = frontmatterString(input.frontmatter, 'type')?.toLowerCase()

  // raw/ 层级最优先（raw/assets 中的图片也是 raw-asset 而非视觉资产）
  const rawIndex = Math.max(lastSegmentIndex(relativeSegments, 'raw'), lastSegmentIndex(absoluteSegments, 'raw'))
  if (rawIndex !== -1) {
    const segments = lastSegmentIndex(relativeSegments, 'raw') !== -1 ? relativeSegments : absoluteSegments
    const next = (segments[rawIndex + 1] ?? '').toLowerCase()
    if (next === 'assets') return 'raw-asset'
    if (next === 'papers') return 'raw-paper'
    if (next === 'transcripts') return 'raw-transcript'
    if (next === 'articles') return 'raw-article'
    return 'raw-article'
  }
  const segmentSearch = (name: string): boolean => (
    lastSegmentIndex(relativeSegments, name) !== -1 || lastSegmentIndex(absoluteSegments, name) !== -1
  )
  const segmentAt = (name: string): string[] => {
    const rel = lastSegmentIndex(relativeSegments, name)
    if (rel !== -1) return relativeSegments
    const abs = lastSegmentIndex(absoluteSegments, name)
    return abs !== -1 ? absoluteSegments : []
  }

  if (segmentSearch('_archive')) return 'archive'
  if (segmentSearch('concepts')) {
    const fileNameIsOverview = /^chapter[-_ ]?\d+[-_ ]?overview\.md$/i.test(fileName)
    if (fmType === 'chapter-overview' || fileNameIsOverview) return 'chapter-overview'
    if (fmType === 'entity' || fmType === 'comparison' || fmType === 'query' || fmType === 'summary') {
      return fmType
    }
    return 'concept'
  }
  if (segmentSearch('entities')) return 'entity'
  if (segmentSearch('comparisons')) return 'comparison'
  if (segmentSearch('queries')) return 'query'
  if (segmentSearch('_meta')) return fmType === 'summary' ? 'summary' : 'unknown'
  if (segmentSearch('visuals') || segmentSearch('images') || segmentSearch('assets')) {
    if (VISUAL_EXTENSIONS.has(extension) || segmentAt('visuals').length > 0) return 'visual-asset'
  }
  // 根目录约定文件
  const depth = relativeSegments.length
  if (depth === 1) {
    if (fileName === 'schema.md') return 'schema'
    if (fileName === 'index.md') return 'catalog'
    if (/^log(?:-\d{4})?\.md$/.test(fileName) || fileName === 'error-log.md') return 'log'
  }
  // 纯 frontmatter type 兜底（wiki 页可能在自定义目录）
  if (fmType === 'chapter-overview') return 'chapter-overview'
  if (fmType === 'concept') return 'concept'
  if (fmType === 'entity') return 'entity'
  if (fmType === 'comparison') return 'comparison'
  if (fmType === 'query') return 'query'
  if (fmType === 'summary') return 'summary'
  if (extension === '.md' && (input.absolutePath?.includes('/concepts/') ?? false)) return 'concept'
  if (VISUAL_EXTENSIONS.has(extension)) return 'visual-asset'
  return 'unknown'
}

/* ------------------------------------------------------------------ index.md */

function sectionKindOf(title: string): { kind: KbIndexSection['kind']; chapterNumber?: number } {
  if (/^chapter\s*overviews?/i.test(title)) return { kind: 'chapter-overviews' }
  const chapterMatch = /^(?:ch|chapter)\s*(\d+)/i.exec(title) ?? /^第\s*([0-9一二三四五六七八九十百零两]+)\s*章/.exec(title)
  if (chapterMatch !== null) {
    return { kind: 'chapter', chapterNumber: chineseNumber(chapterMatch[1] ?? '') ?? undefined }
  }
  if (/跨章工具|工具|tool/i.test(title)) return { kind: 'tool' }
  if (/复习/.test(title)) return { kind: 'review' }
  if (/raw\s*sources?/i.test(title)) return { kind: 'raw' }
  return { kind: 'other' }
}

function chineseNumber(raw: string): number | undefined {
  const digits = Number.parseInt(raw, 10)
  if (Number.isFinite(digits)) return digits
  const map: Record<string, number> = {
    一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  }
  if (raw === '十') return 10
  const tenMatch = /^([一二三四五六七八九])?十([一二三四五六七八九])?$/.exec(raw)
  if (tenMatch !== null) {
    const tens = tenMatch[1] === undefined ? 1 : (map[tenMatch[1]] ?? 0)
    const ones = tenMatch[2] === undefined ? 0 : (map[tenMatch[2]] ?? 0)
    return tens * 10 + ones
  }
  return map[raw]
}

/** 解析 index.md：H2 分区 + 每行的 wikilink 条目与一句话摘要。 */
export function parseIndexSections(content: string): KbIndex {
  const parsedFrontmatter = parseFrontmatter(content)
  const lines = parsedFrontmatter.body.split('\n')
  const sections: KbIndexSection[] = []
  let title: string | undefined
  let lastUpdated: string | undefined
  let totalPages: number | undefined
  let current: { title: string; kind: KbIndexSection['kind']; chapterNumber?: number; entries: KbIndexEntry[] } | undefined
  let inFence = false
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + parsedFrontmatter.bodyStartLine
    const line = lines[index] ?? ''
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const h1 = /^#\s+(.+)$/.exec(line)
    if (h1 !== null && title === undefined) {
      title = (h1[1] ?? '').trim()
      continue
    }
    const quote = /^>\s*(.*)$/.exec(line)
    if (quote !== null) {
      const text = quote[1] ?? ''
      const updated = /Last updated:\s*([0-9-]+)/i.exec(text)
      if (updated !== null) lastUpdated = updated[1]
      const total = /Total pages:\s*(\d+)/i.exec(text)
      if (total !== null) totalPages = Number(total[1])
      continue
    }
    const h2 = /^##\s+(.+?)\s*#*\s*$/.exec(line)
    if (h2 !== null) {
      const rawTitle = (h2[1] ?? '').trim()
      const cleanedTitle = rawTitle.replace(/\s*\(\d+\)\s*$/, '')
      const meta = sectionKindOf(cleanedTitle)
      current = {
        title: cleanedTitle,
        kind: meta.kind,
        ...(meta.chapterNumber !== undefined ? { chapterNumber: meta.chapterNumber } : {}),
        entries: [],
      }
      sections.push(current as KbIndexSection)
      continue
    }
    if (current === undefined) continue
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet === null) continue
    const body = bullet[1] ?? ''
    const link = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/.exec(body)
    if (link === null) continue
    const target = (link[1] ?? '').trim()
    if (target === '') continue
    const display = (link[2] ?? '').trim()
    const rest = stripInlineMarkdown(body.slice(link.index + link[0].length))
      .replace(/^[\s—–:-]+/, '')
      .trim()
    current.entries.push({
      target,
      ...(display !== '' ? { display } : {}),
      ...(rest !== '' ? { summary: truncate(rest, 240) } : {}),
      line: lineNumber,
    })
  }
  return {
    ...(title !== undefined ? { title } : {}),
    ...(lastUpdated !== undefined ? { lastUpdated } : {}),
    ...(totalPages !== undefined ? { totalPages } : {}),
    sections: sections.map(section => ({ ...section, entries: [...section.entries] })),
  }
}

/* ------------------------------------------------------------------ 装载页面 */

/** 页面装载依赖。 */
export interface KbLoadDeps {
  readonly store: CorpusStore
  readonly limits: CorpusLimits
  /** 测试可注入的读取函数（默认 node:fs readFile）。 */
  readonly readFileText?: (path: string) => Promise<string | undefined>
}

interface KbLayout {
  readonly kbRoot: string
}

function commonAncestor(paths: readonly string[]): string {
  if (paths.length === 0) return process.cwd()
  const split = paths.map(path => toPosix(path).split('/'))
  const first = split[0] ?? []
  let length = first.length
  for (const parts of split.slice(1)) {
    let index = 0
    while (index < length && index < parts.length && parts[index] === first[index]) index += 1
    length = index
  }
  const joined = first.slice(0, length).join('/')
  return joined === '' ? '/' : joined
}

function inferKbLayout(documents: readonly SourceDocument[]): KbLayout {
  const candidates: string[] = []
  for (const document of documents) {
    const absolute = toPosix(document.originalPath)
    const segments = absolute.split('/').filter(Boolean)
    const fileName = basename(absolute).toLowerCase()
    if (fileName === 'schema.md' || fileName === 'index.md') {
      candidates.push(dirname(absolute))
      continue
    }
    for (const layer of LAYER_SEGMENTS) {
      const index = segments.lastIndexOf(layer)
      if (index !== -1) {
        candidates.push(`/${segments.slice(0, index).join('/')}`)
        break
      }
    }
  }
  if (candidates.length === 0) {
    const dirs = documents.map(document => dirname(toPosix(document.originalPath)))
    return { kbRoot: commonAncestor(dirs) }
  }
  const kbRoot = commonAncestor(candidates)
  return { kbRoot: kbRoot === '' ? '/' : kbRoot }
}

async function readTextFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}

/** 识别并装载 Markdown 页面（读取原文件；原文件缺失时从已存单元重建）。 */
export async function loadKbPages(
  deps: KbLoadDeps,
  materials: readonly MaterialDocument[],
  signal?: AbortSignal,
): Promise<KbPage[]> {
  const layout = inferKbLayout(materials.map(material => material.document))
  const readText = deps.readFileText ?? readTextFile
  const pages: KbPage[] = []
  for (const material of materials) {
    if (isSignalAborted(signal)) break
    const document = material.document
    const absolute = toPosix(document.originalPath)
    const relativePath = toPosix(relative(layout.kbRoot, absolute)).replace(/^\.\//, '')
    const fileName = basename(absolute)
    const extension = extname(absolute).toLowerCase()
    // 第一遍：仅按路径判定角色，决定是否需要读取正文
    const preliminaryRole = classifySourceRole({
      relativePath,
      absolutePath: absolute,
      fileName,
      extension,
    })
    let content: string | undefined
    let fromDisk = false
    let fromUnits = false
    if (CONTENT_READING_ROLES.has(preliminaryRole) && document.format === 'markdown') {
      const raw = await readText(document.originalPath)
      if (raw !== undefined) {
        content = raw.length > 4_000_000 ? raw.slice(0, 4_000_000) : raw
        fromDisk = true
      }
    }
    if (content === undefined && document.format === 'markdown') {
      // 原文件缺失：用已存单元重建（frontmatter 段落/标题/wikilinks 仍可用）
      content = reconstructMarkdownFromUnits(material.units)
      fromUnits = true
    }
    const frontmatter = content === undefined ? undefined : parseFrontmatter(content).data
    const emptyScan: {
      readonly h1?: string
      readonly h1Line?: number
      readonly headings: readonly KbHeading[]
      readonly wikilinks: readonly KbLink[]
      readonly firstParagraph?: string
      readonly lineCount: number
    } = { headings: [], wikilinks: [], lineCount: 0 }
    const scan = content === undefined ? emptyScan : scanMarkdownPage(content)
    const role = classifySourceRole({
      relativePath,
      absolutePath: absolute,
      fileName,
      extension,
      ...(frontmatter !== undefined ? { frontmatter } : {}),
    })
    pages.push({
      document,
      relativePath,
      fileName,
      slug: normalizeSlug(fileName.replace(/\.md$/i, '')),
      fromDisk,
      fromUnits,
      ...(content !== undefined ? { content } : {}),
      ...(frontmatter !== undefined ? { frontmatter } : {}),
      ...(scan.h1 !== undefined ? { h1: scan.h1 } : {}),
      ...(scan.h1Line !== undefined ? { h1Line: scan.h1Line } : {}),
      headings: scan.headings,
      wikilinks: scan.wikilinks,
      ...(scan.firstParagraph !== undefined ? { firstParagraph: scan.firstParagraph } : {}),
      lineCount: scan.lineCount,
      role,
    })
  }
  return pages
}

/* ------------------------------------------------------------------ 检测 */

/** 从已装载页面检测 LLM-wiki 知识库结构。 */
export function detectWikiKnowledgeBase(pages: readonly KbPage[]): KbDetection {
  const pageBySlug = new Map<string, KbPage>()
  const pageByTitle = new Map<string, KbPage>()
  for (const page of pages) {
    if (!pageBySlug.has(page.slug)) pageBySlug.set(page.slug, page)
    const titleKey = normalizeSlug(pageTitleOf(page))
    if (titleKey !== '' && !pageByTitle.has(titleKey)) pageByTitle.set(titleKey, page)
  }
  const resolve = (target: string): KbPage | undefined => {
    const key = normalizeSlug(basename(target))
    return pageBySlug.get(key) ?? pageByTitle.get(normalizeSlug(target))
  }
  const roleByDocumentId = new Map<string, KbSourceRole>()
  for (const page of pages) roleByDocumentId.set(page.document.id, page.role)

  const rootPages = pages.filter(page => page.relativePath === page.fileName)
  const schemaPage = rootPages.find(page => page.role === 'schema')
  const indexCandidates = pages
    .filter(page => page.role === 'catalog')
    .sort((a, b) => (a.relativePath.split('/').length - b.relativePath.split('/').length))
  const indexPage = indexCandidates[0]
  const index = indexPage?.content !== undefined ? parseIndexSections(indexPage.content) : undefined
  const indexSectionCount = index?.sections.length ?? 0

  const frontmatterRolePages = pages.filter(page => page.frontmatter !== undefined && page.role !== 'raw-article'
    && page.role !== 'raw-paper' && page.role !== 'raw-transcript' && page.role !== 'raw-asset')
  const frontmatterPageCount = frontmatterRolePages.filter(page => {
    const hasTitle = frontmatterString(page.frontmatter, 'title') !== undefined
    const hasType = frontmatterString(page.frontmatter, 'type') !== undefined
    return hasTitle || hasType
  }).length

  const layeredDirs: string[] = []
  for (const layer of LAYER_SEGMENTS) {
    if (pages.some(page => page.relativePath.split('/').includes(layer))) layeredDirs.push(layer)
  }
  const chapterOverviewPages = pages.filter(page => page.role === 'chapter-overview')
  const rawSourceCount = pages.filter(page => page.role === 'raw-article'
    || page.role === 'raw-paper' || page.role === 'raw-transcript').length
  const visualAssetCount = pages.filter(page => page.role === 'raw-asset' || page.role === 'visual-asset').length

  let wikilinkCount = 0
  let resolvableWikilinkCount = 0
  for (const page of pages) {
    for (const link of page.wikilinks) {
      if (link.embed) continue
      wikilinkCount += 1
      if (resolve(link.target) !== undefined) resolvableWikilinkCount += 1
    }
  }

  const signals: KbDetectionSignal[] = [
    { id: 'schema', label: '存在根目录 SCHEMA.md', weight: 3, matched: schemaPage !== undefined },
    { id: 'index', label: '存在 index.md 目录页', weight: 2, matched: indexPage !== undefined },
    { id: 'index-sections', label: 'index.md 含 ≥2 个分区条目', weight: 2, matched: indexSectionCount >= 2 },
    { id: 'frontmatter', label: '≥2 个页面带 title/type frontmatter', weight: 2, matched: frontmatterPageCount >= 2 },
    { id: 'layers', label: '存在 concepts/raw 等分层目录', weight: 2, matched: layeredDirs.length >= 2 },
    { id: 'chapter-overview', label: '存在 chapter-overview 章节概览页', weight: 3, matched: chapterOverviewPages.length >= 1 },
    { id: 'wikilinks', label: '存在可解析的 [[wikilinks]] 交叉引用', weight: 2, matched: resolvableWikilinkCount >= 2 },
    { id: 'raw-sources', label: '存在 raw/ 原始资料层', weight: 1, matched: rawSourceCount >= 1 || pages.some(page => page.relativePath.split('/').includes('raw')) },
  ]
  const matchedSignals = signals.filter(signal => signal.matched)
  const isKnowledgeBase = (schemaPage !== undefined && indexPage !== undefined)
    || (indexPage !== undefined && (indexSectionCount >= 2 || chapterOverviewPages.length >= 1))
    || (chapterOverviewPages.length >= 1 && frontmatterPageCount >= 2)
    || (frontmatterPageCount >= 3 && layeredDirs.length >= 2)
    || (resolvableWikilinkCount >= 3 && layeredDirs.length >= 2)
  const reason = isKnowledgeBase
    ? `检测到 LLM-wiki 知识库结构（${matchedSignals.map(signal => signal.label.replace('存在', '').replace('≥2 个', '')).slice(0, 4).join('、')}）`
    : '未发现 SCHEMA.md/index.md、分层目录、frontmatter 或 chapter-overview 等知识库结构特征'
  const facts: KbDetectionFacts = {
    isKnowledgeBase,
    reason,
    ...(schemaPage !== undefined || indexPage !== undefined
      ? { rootPath: dirname((schemaPage ?? indexPage)?.document.originalPath ?? '') }
      : {}),
    pageCount: pages.length,
    hasSchema: schemaPage !== undefined,
    hasIndex: indexPage !== undefined,
    indexSectionCount,
    frontmatterPageCount,
    layeredDirs,
    chapterOverviewCount: chapterOverviewPages.length,
    wikilinkCount,
    resolvableWikilinkCount,
    rawSourceCount,
    visualAssetCount,
    signals,
  }
  return {
    facts,
    pages,
    ...(indexPage !== undefined ? { indexPage } : {}),
    ...(schemaPage !== undefined ? { schemaPage } : {}),
    roleByDocumentId,
  }
}

/** 页面显示标题：frontmatter.title > H1 > 文件名。 */
export function pageTitleOf(page: KbPage): string {
  return frontmatterString(page.frontmatter, 'title')
    ?? page.h1
    ?? page.fileName.replace(/\.md$/i, '')
}

/* ------------------------------------------------------------------ 角色说明 */

/** 汇总各角色页面数量（用于结构说明）。 */
export function summarizeRoles(pages: readonly KbPage[]): string {
  const counts = new Map<KbSourceRole, number>()
  for (const page of pages) counts.set(page.role, (counts.get(page.role) ?? 0) + 1)
  const order: KbSourceRole[] = [
    'concept', 'chapter-overview', 'entity', 'comparison', 'summary', 'query',
    'catalog', 'schema', 'log', 'raw-article', 'raw-paper', 'raw-transcript', 'raw-asset',
    'visual-asset', 'archive', 'unknown',
  ]
  const labels: Record<KbSourceRole, string> = {
    concept: '概念页', 'chapter-overview': '章节概览', entity: '实体页', comparison: '对比页',
    summary: '摘要页', query: '查询归档', catalog: '目录页', schema: 'Schema', log: '日志',
    'raw-article': 'raw 文章', 'raw-paper': 'raw 论文', 'raw-transcript': 'raw 转录',
    'raw-asset': 'raw 资产', 'visual-asset': '可视化资产', archive: '归档', unknown: '未识别',
  }
  return order
    .filter(role => (counts.get(role) ?? 0) > 0)
    .map(role => `${labels[role]} ${counts.get(role)}`)
    .join(' / ')
}

/** 由检测事实生成人读结构说明（供 CourseDraftView.structureNotes）。 */
export function describeKbDetection(detection: KbDetection): string[] {
  const facts = detection.facts
  const notes: string[] = []
  notes.push(`结构来源：知识库直读（kb-structure）。${facts.reason}`)
  notes.push(`资料角色：${summarizeRoles(detection.pages)}`)
  const matched = facts.signals.filter(signal => signal.matched).map(signal => signal.label)
  if (matched.length > 0) notes.push(`检测信号：${matched.join('；')}`)
  if (facts.rootPath !== undefined) notes.push(`知识库根目录：${facts.rootPath}`)
  return notes
}

/* ------------------------------------------------------------------ 构建辅助 */

interface ChapterSource {
  readonly page: KbPage
  readonly number?: number
  readonly title: string
  readonly summary?: string
  readonly links: readonly string[]
}

interface ConceptSource {
  readonly page: KbPage
  readonly title: string
  readonly summary: string
  readonly slug: string
  readonly tags: readonly string[]
  readonly confidence?: string
  readonly rawSourceRefs: readonly string[]
  readonly anchors: readonly SourceAnchor[]
}

function materialById(materials: readonly MaterialDocument[]): Map<string, MaterialDocument> {
  const map = new Map<string, MaterialDocument>()
  for (const material of materials) map.set(material.document.id, material)
  return map
}

function anchorForUnit(material: MaterialDocument, unit: SourceUnit): SourceAnchor {
  return {
    documentId: material.document.id,
    revisionId: material.revision.id,
    unitId: unit.id,
    locator: unit.locator,
    excerpt: excerptAround(unit.text, [], 240),
    confidence: unit.confidence,
    label: `${material.document.title} · ${locatorDescription(unit.locator)}`,
  }
}

/** 在页面单元中找一个能代表该页面的锚点（标题匹配优先，其次首标题/首段）。 */
function pageAnchor(
  material: MaterialDocument | undefined,
  preferredTitle?: string,
): SourceAnchor | undefined {
  if (material === undefined || material.units.length === 0) return undefined
  const headings = material.units.filter(unit => unit.kind === 'heading')
  const wanted = preferredTitle === undefined ? '' : normalizeSlug(cleanHeadingText(preferredTitle))
  let best: SourceUnit | undefined
  let bestScore = 0
  for (const heading of headings) {
    const normalized = normalizeSlug(cleanHeadingText(heading.text))
    if (normalized === '') continue
    let score = 0
    if (wanted !== '' && normalized === wanted) score = 5
    else if (wanted !== '' && (normalized.includes(wanted) || wanted.includes(normalized))) score = 3
    else if (headings[0]?.id === heading.id) score = 1
    if (score > bestScore) {
      bestScore = score
      best = heading
    }
  }
  const chosen = best
    ?? material.units.find(unit => unit.kind === 'heading')
    ?? material.units.find(unit => unit.kind === 'paragraph')
    ?? material.units[0]
  if (chosen === undefined) return undefined
  return anchorForUnit(material, chosen)
}

function resolvedChapterNumber(page: KbPage): number | undefined {
  const match = /chapter[-_ ]?(\d+)[-_ ]?overview/i.exec(page.fileName)
  if (match !== null) {
    const value = Number(match[1])
    return Number.isFinite(value) ? value : undefined
  }
  const title = pageTitleOf(page)
  return chineseNumber(/第\s*([0-9一二三四五六七八九十百零两]+)\s*章/.exec(title)?.[1] ?? '')
}

function pageSummary(page: KbPage): string | undefined {
  return page.firstParagraph
}

/* ------------------------------------------------------------------ 主构建 */

/** 知识库结构检测 + 确定性构建（使用已准备好的上下文）；返回结构数据。 */
export async function buildKbStructureFromContext(
  deps: KbBuildDeps,
  input: Pick<CourseDraftInput, 'courseId' | 'documentIds'>,
  context: KbContext,
  signal?: AbortSignal,
): Promise<Result<KbStructureBuild>> {
  const material = context.material
  const pages = context.pages
  const detection = context.detection
  if (!detection.facts.isKnowledgeBase) {
    return err('capability-missing', `未检测到 LLM-wiki 知识库结构：${detection.facts.reason}`, {
      details: {
        signals: detection.facts.signals.map(signal => ({ id: signal.id, matched: signal.matched })),
        pageCount: detection.facts.pageCount,
      },
    })
  }
  if (isSignalAborted(signal)) return err('cancelled', '课程草案生成已取消')

  const warnings: string[] = [...material.warnings]
  const notes: string[] = [...describeKbDetection(detection)]
  const materials = materialById(material.documents)
  const pageBySlug = new Map<string, KbPage>()
  const pageByTitle = new Map<string, KbPage>()
  const pageByDocumentId = new Map<string, KbPage>()
  for (const page of pages) {
    pageByDocumentId.set(page.document.id, page)
    if (!pageBySlug.has(page.slug)) pageBySlug.set(page.slug, page)
    const titleKey = normalizeSlug(pageTitleOf(page))
    if (titleKey !== '' && !pageByTitle.has(titleKey)) pageByTitle.set(titleKey, page)
  }
  const resolveLink = (target: string): KbPage | undefined => pageBySlug.get(normalizeSlug(basename(target)))
    ?? pageByTitle.get(normalizeSlug(target))

  const index = detection.indexPage?.content !== undefined
    ? parseIndexSections(detection.indexPage.content)
    : undefined
  if (index === undefined) {
    notes.push('未找到或无法解析 index.md：章节顺序回退为 chapter-overview 编号与文件名顺序')
  } else {
    notes.push(`index.md 解析：${index.sections.length} 个分区（最后更新 ${index.lastUpdated ?? '未知'}）`)
  }

  // index 条目索引：slug/title → 摘要等
  interface IndexEntryInfo {
    readonly entry: KbIndexEntry
    readonly section: KbIndexSection
  }
  const indexEntryByKey = new Map<string, IndexEntryInfo>()
  for (const section of index?.sections ?? []) {
    for (const entry of section.entries) {
      const key = normalizeSlug(basename(entry.target))
      if (!indexEntryByKey.has(key)) indexEntryByKey.set(key, { entry, section })
    }
  }

  // 章节概览页
  const chapterOverviewPages = pages.filter(page => page.role === 'chapter-overview')
  const chapterByNumber = new Map<number, KbPage>()
  for (const page of chapterOverviewPages) {
    const number = resolvedChapterNumber(page)
    if (number !== undefined && !chapterByNumber.has(number)) chapterByNumber.set(number, page)
  }
  const overviewOrder = (() => {
    const section = index?.sections.find(item => item.kind === 'chapter-overviews')
    if (section !== undefined) {
      const ordered: KbPage[] = []
      for (const entry of section.entries) {
        const page = resolveLink(entry.target)
        if (page !== undefined && page.role === 'chapter-overview' && !ordered.includes(page)) ordered.push(page)
      }
      if (ordered.length > 0) return ordered
    }
    return [...chapterOverviewPages].sort((a, b) => {
      const numberA = resolvedChapterNumber(a) ?? Number.MAX_SAFE_INTEGER
      const numberB = resolvedChapterNumber(b) ?? Number.MAX_SAFE_INTEGER
      return numberA - numberB || a.relativePath.localeCompare(b.relativePath)
    })
  })()

  // 概念页（含实体/对比/摘要页；查询归档不进入主线）
  const teachablePages = pages.filter(page => TEACHABLE_ROLES.has(page.role))
  const conceptSources = new Map<string, ConceptSource>()
  const usedDocumentIds = new Set<string>()
  const usedRawDocumentIds = new Set<string>()
  let invalidAnchorCount = 0
  const duplicateTitles: string[] = []
  const titleSeen = new Set<string>()

  for (const page of teachablePages) {
    if (isSignalAborted(signal)) return err('cancelled', '课程草案生成已取消')
    const materialDocument = materials.get(page.document.id)
    const title = cleanHeadingText(pageTitleOf(page))
    if (title === '') continue
    const titleKey = normalizeSlug(title)
    const titleOwner = pageByTitle.get(titleKey)
    if (titleSeen.has(titleKey) && titleOwner !== page) duplicateTitles.push(title)
    titleSeen.add(titleKey)
    const indexInfo = indexEntryByKey.get(page.slug)
    const summary = indexInfo?.entry.summary
      ?? pageSummary(page)
      ?? ''
    const anchors: SourceAnchor[] = []
    const pageMaterial = materials.get(page.document.id)
    const anchor = pageAnchor(pageMaterial, title)
    if (anchor !== undefined) anchors.push(anchor)
    const rawSourceRefs = frontmatterList(page.frontmatter, 'sources')
    // raw 来源锚点（最多 2 个，只取已导入的 raw 文档）
    let rawAnchorCount = 0
    for (const ref of rawSourceRefs) {
      if (rawAnchorCount >= 2) break
      const resolved = resolveRawDocument(pages, materials, ref)
      if (resolved === undefined) continue
      if (resolved.page.document.id === page.document.id) continue
      const rawAnchor = pageAnchor(materials.get(resolved.page.document.id))
      if (rawAnchor === undefined) continue
      if (anchors.some(existing => existing.documentId === rawAnchor.documentId && existing.unitId === rawAnchor.unitId)) continue
      anchors.push(rawAnchor)
      usedRawDocumentIds.add(resolved.page.document.id)
      rawAnchorCount += 1
    }
    usedDocumentIds.add(page.document.id)
    if (summary === '' && anchors.length === 0) invalidAnchorCount += 1
    conceptSources.set(page.slug, {
      page,
      title,
      summary: truncate(summary, 600),
      slug: page.slug,
      tags: frontmatterList(page.frontmatter, 'tags'),
      ...(frontmatterString(page.frontmatter, 'confidence') !== undefined
        ? { confidence: frontmatterString(page.frontmatter, 'confidence') }
        : {}),
      rawSourceRefs,
      anchors,
    })
  }

  if (duplicateTitles.length > 0) {
    warnings.push(`${duplicateTitles.length} 个概念标题重复（保留首个，其余按 slug 区分）：${duplicateTitles.slice(0, 5).join('、')}`)
  }

  // 概念顺序：index 中的概念条目（章/工具/其他分区按顺序），然后未列出的概念
  const orderedConceptSlugs: string[] = []
  const seenConceptSlugs = new Set<string>()
  const addConceptSlug = (slug: string): void => {
    if (!conceptSources.has(slug) || seenConceptSlugs.has(slug)) return
    seenConceptSlugs.add(slug)
    orderedConceptSlugs.push(slug)
  }
  const indexConceptEntriesBySection: { section: KbIndexSection; slug: string }[] = []
  for (const section of index?.sections ?? []) {
    for (const entry of section.entries) {
      const page = resolveLink(entry.target)
      if (page === undefined) continue
      if (!conceptSources.has(page.slug)) continue
      indexConceptEntriesBySection.push({ section, slug: page.slug })
      addConceptSlug(page.slug)
    }
  }
  const unlistedConcepts = [...conceptSources.values()]
    .filter(concept => !seenConceptSlugs.has(concept.slug))
    .sort((a, b) => a.page.relativePath.localeCompare(b.page.relativePath) || a.title.localeCompare(b.title))
  for (const concept of unlistedConcepts) addConceptSlug(concept.slug)
  if (unlistedConcepts.length > 0) {
    warnings.push(`${unlistedConcepts.length} 个 wiki 页未出现在 index.md 中，已按路径顺序附在最后：${unlistedConcepts.slice(0, 5).map(concept => concept.title).join('、')}`)
  }

  // 章节：index 章节分区 / chapter-overview 页
  const chapterSectionByNumber = new Map<number, KbIndexSection>()
  for (const section of index?.sections ?? []) {
    if (section.kind === 'chapter' && section.chapterNumber !== undefined) {
      chapterSectionByNumber.set(section.chapterNumber, section)
    }
  }
  interface ChapterDraft {
    readonly title: string
    readonly summary?: string
    readonly role: 'chapter' | 'appendix' | 'tool'
    readonly page?: KbPage
    readonly conceptSlugs: string[]
  }
  const chapterDrafts: ChapterDraft[] = []
  const assignedConceptSlugs = new Set<string>()
  const overviewSourceByPage = new Map<string, ChapterSource>()
  for (const page of overviewOrder) {
    const number = resolvedChapterNumber(page)
    const title = cleanHeadingText(pageTitleOf(page))
      || (number === undefined ? '' : `第 ${number} 章`)
    if (title === '') continue
    overviewSourceByPage.set(page.document.id, {
      page,
      ...(number !== undefined ? { number } : {}),
      title,
      ...(pageSummary(page) !== undefined ? { summary: pageSummary(page) } : {}),
      links: page.wikilinks.filter(link => !link.embed).map(link => link.target),
    })
  }
  const useIndexChapters = chapterSectionByNumber.size > 0
  if (useIndexChapters) {
    const sections = [...chapterSectionByNumber.entries()].sort((a, b) => a[0] - b[0])
    for (const [number, section] of sections) {
      const overview = chapterByNumber.get(number)
      const title = overview !== undefined
        ? (cleanHeadingText(pageTitleOf(overview)) || section.title)
        : section.title
      const conceptSlugs: string[] = []
      for (const entry of section.entries) {
        const page = resolveLink(entry.target)
        if (page === undefined) {
          warnings.push(`index.md 的「${section.title}」引用了未导入页面：${entry.target}`)
          continue
        }
        if (conceptSources.has(page.slug) && !conceptSlugs.includes(page.slug)) conceptSlugs.push(page.slug)
      }
      // 章节概览链接与 index 分区不一致时以 index 为准并警告
      if (overview !== undefined) {
        const overviewSlugs = overview.wikilinks
          .filter(link => !link.embed)
          .map(link => resolveLink(link.target))
          .filter((page): page is KbPage => page !== undefined && conceptSources.has(page.slug))
          .map(page => page.slug)
          .filter((slug, index, all) => all.indexOf(slug) === index)
        const missingFromIndex = overviewSlugs.filter(slug => !conceptSlugs.includes(slug))
        const missingFromOverview = conceptSlugs.filter(slug => !overviewSlugs.includes(slug))
        if (overviewSlugs.length > 0 && (missingFromIndex.length > 0 || missingFromOverview.length > 0)) {
          warnings.push(`章节概览《${title}》与 index 分区的子概念不一致（概览多 ${missingFromIndex.length} / index 多 ${missingFromOverview.length}）`)
        }
      }
      if (conceptSlugs.length === 0 && overview !== undefined) {
        // index 分区为空时回退到章节概览链接
        for (const link of overview.wikilinks) {
          const page = resolveLink(link.target)
          if (page !== undefined && conceptSources.has(page.slug) && !conceptSlugs.includes(page.slug)) {
            conceptSlugs.push(page.slug)
          }
        }
      }
      for (const slug of conceptSlugs) assignedConceptSlugs.add(slug)
      chapterDrafts.push({
        title,
        ...(overview !== undefined && pageSummary(overview) !== undefined ? { summary: pageSummary(overview) } : {}),
        role: 'chapter',
        ...(overview !== undefined ? { page: overview } : {}),
        conceptSlugs,
      })
    }
  } else {
    for (const page of overviewOrder) {
      const source = overviewSourceByPage.get(page.document.id)
      if (source === undefined) continue
      const conceptSlugs: string[] = []
      for (const target of source.links) {
        const resolved = resolveLink(target)
        if (resolved === undefined) {
          warnings.push(`章节概览《${source.title}》引用了未导入页面：${target}`)
          continue
        }
        if (conceptSources.has(resolved.slug) && !conceptSlugs.includes(resolved.slug)) conceptSlugs.push(resolved.slug)
      }
      for (const slug of conceptSlugs) assignedConceptSlugs.add(slug)
      chapterDrafts.push({
        title: source.title,
        ...(source.summary !== undefined ? { summary: source.summary } : {}),
        role: 'chapter',
        page,
        conceptSlugs,
      })
    }
    // index 有章节分区但缺 chapter-overview 页时，直接按分区建章节
    if (chapterDrafts.length === 0) {
      for (const [number, section] of [...chapterSectionByNumber.entries()].sort((a, b) => a[0] - b[0])) {
        const conceptSlugs: string[] = []
        for (const entry of section.entries) {
          const page = resolveLink(entry.target)
          if (page !== undefined && conceptSources.has(page.slug) && !conceptSlugs.includes(page.slug)) {
            conceptSlugs.push(page.slug)
          }
        }
        for (const slug of conceptSlugs) assignedConceptSlugs.add(slug)
        chapterDrafts.push({ title: `第 ${number} 章 ${section.title}`, role: 'chapter', conceptSlugs })
      }
    }
  }

  // 工具章节（跨章工具/复习工具中指向已导入概念页的条目）
  const toolSections = (index?.sections ?? []).filter(section => section.kind === 'tool' || section.kind === 'review')
  for (const section of toolSections) {
    const conceptSlugs: string[] = []
    for (const entry of section.entries) {
      const page = resolveLink(entry.target)
      if (page === undefined) {
        warnings.push(`index.md 的「${section.title}」引用了未导入页面：${entry.target}`)
        continue
      }
      if (conceptSources.has(page.slug) && !conceptSlugs.includes(page.slug)) {
        conceptSlugs.push(page.slug)
      } else if (!conceptSources.has(page.slug)) {
        notes.push(`「${section.title}」中的页面《${pageTitleOf(page)}》角色为 ${page.role}，未作为教学概念收录`)
      }
    }
    if (conceptSlugs.length === 0) continue
    for (const slug of conceptSlugs) assignedConceptSlugs.add(slug)
    chapterDrafts.push({
      title: section.title,
      ...(section.entries.find(entry => entry.summary !== undefined)?.summary !== undefined
        ? { summary: section.entries.find(entry => entry.summary !== undefined)?.summary as string }
        : {}),
      role: 'tool',
      conceptSlugs,
    })
  }

  // 未分章概念 → 附录章节
  const unassigned = orderedConceptSlugs.filter(slug => !assignedConceptSlugs.has(slug))
  if (unassigned.length > 0) {
    chapterDrafts.push({
      title: '未分章内容',
      summary: '以下 wiki 页未出现在章节索引或章节概览中，暂列附录',
      role: 'appendix',
      conceptSlugs: unassigned,
    })
    warnings.push(`${unassigned.length} 个概念不属于任何章节，已放入附录章节`)
  }
  if (chapterDrafts.length === 0) {
    chapterDrafts.push({
      title: '知识库概念',
      summary: '知识库没有章节分区，概念按索引顺序排列',
      role: 'appendix',
      conceptSlugs: orderedConceptSlugs,
    })
    for (const slug of orderedConceptSlugs) assignedConceptSlugs.add(slug)
  }

  // sequence：章节顺序内概念顺序
  const sequence: string[] = []
  const sequenceSeen = new Set<string>()
  for (const chapter of chapterDrafts) {
    for (const slug of chapter.conceptSlugs) {
      const concept = conceptSources.get(slug)
      if (concept === undefined || sequenceSeen.has(concept.title)) continue
      sequenceSeen.add(concept.title)
      sequence.push(concept.title)
    }
  }
  for (const slug of orderedConceptSlugs) {
    const concept = conceptSources.get(slug)
    if (concept === undefined || sequenceSeen.has(concept.title)) continue
    sequenceSeen.add(concept.title)
    sequence.push(concept.title)
  }

  // 概念输出（difficulty 依据章节/序列位置启发式；先修=同章前一概念）
  const conceptDifficulty = (indexInSequence: number, total: number, role: 'chapter' | 'appendix' | 'tool'): ConceptDifficulty => {
    if (role === 'tool') return 'core'
    const ratio = total <= 1 ? 0 : indexInSequence / (total - 1)
    if (ratio < 1 / 3) return 'intro'
    if (ratio < 2 / 3) return 'core'
    return 'advanced'
  }
  const chapterBySlug = new Map<string, { chapter: ChapterDraft; indexInChapter: number; role: 'chapter' | 'appendix' | 'tool' }>()
  for (const chapter of chapterDrafts) {
    chapter.conceptSlugs.forEach((slug, indexInChapter) => {
      if (!chapterBySlug.has(slug)) chapterBySlug.set(slug, { chapter, indexInChapter, role: chapter.role })
    })
  }
  const builtConcepts: KbBuiltConcept[] = []
  const conceptBySlug = new Map<string, KbBuiltConcept>()
  const builtSequence: string[] = []
  for (let sequenceIndex = 0; sequenceIndex < sequence.length; sequenceIndex += 1) {
    const title = sequence[sequenceIndex] as string
    const entry = [...conceptSources.values()].find(concept => concept.title === title)
    if (entry === undefined) continue
    const placement = chapterBySlug.get(entry.slug)
    const previousInChapter = placement !== undefined && placement.indexInChapter > 0
      ? (placement.chapter.conceptSlugs[placement.indexInChapter - 1] as string)
      : undefined
    const previousTitle = previousInChapter !== undefined
      ? conceptSources.get(previousInChapter)?.title
      : undefined
    const difficulty = conceptDifficulty(sequenceIndex, sequence.length, placement?.role ?? 'appendix')
    const concept: KbBuiltConcept = {
      title: entry.title,
      summary: entry.summary,
      anchors: entry.anchors,
      prerequisites: previousTitle !== undefined ? [previousTitle] : [],
      difficulty,
      tags: entry.tags,
      slug: entry.slug,
    }
    if (builtConcepts.length >= deps.limits.kbMaxConcepts) {
      warnings.push(`概念数超过知识库直读上限（${deps.limits.kbMaxConcepts}），其余概念已丢弃`)
      break
    }
    builtConcepts.push(concept)
    conceptBySlug.set(entry.slug, concept)
    builtSequence.push(entry.title)
  }
  if (builtConcepts.length === 0) {
    return err('uncertain', '检测到知识库结构，但没有解析出任何可教学的概念页（concepts/entities/comparisons/summary）', {
      details: { pageCount: pages.length, roles: detection.facts.signals },
    })
  }

  // 章节输出（只保留有概念或章节页的章节；锚点=章节概览页标题行）
  const knownTitles = new Set(builtConcepts.map(concept => concept.title))
  const builtChapters: KbBuiltChapter[] = []
  for (const chapter of chapterDrafts) {
    const conceptTitles = chapter.conceptSlugs
      .map(slug => conceptSources.get(slug)?.title)
      .filter((title): title is string => title !== undefined && knownTitles.has(title))
      .filter((title, index, all) => all.indexOf(title) === index)
    if (conceptTitles.length === 0 && chapter.page === undefined) continue
    const chapterMaterial = chapter.page === undefined ? undefined : materials.get(chapter.page.document.id)
    const anchor = chapter.page === undefined ? undefined : pageAnchor(chapterMaterial, chapter.title)
    builtChapters.push({
      title: chapter.title,
      ...(chapter.summary !== undefined ? { summary: chapter.summary } : {}),
      role: chapter.role,
      conceptTitles,
      anchors: anchor !== undefined ? [anchor] : [],
    })
    if (builtChapters.length >= deps.limits.kbMaxChapters) {
      warnings.push(`章节数超过知识库直读上限（${deps.limits.kbMaxChapters}），其余章节已丢弃`)
      break
    }
  }
  let droppedChapterConcepts = 0
  const normalizedChapters = builtChapters.map(chapter => ({
    ...chapter,
    conceptTitles: chapter.conceptTitles.filter(title => {
      if (knownTitles.has(title)) return true
      droppedChapterConcepts += 1
      return false
    }),
  })).filter(chapter => chapter.conceptTitles.length > 0 || chapter.role !== 'chapter')
  if (droppedChapterConcepts > 0) {
    warnings.push(`${droppedChapterConcepts} 个章节概念因概念上限被丢弃`)
  }

  // 来源与 basedOn：只包含实际使用的资料
  const usedIds = new Set<string>([...usedDocumentIds, ...usedRawDocumentIds])
  if (detection.indexPage !== undefined) usedIds.add(detection.indexPage.document.id)
  if (detection.schemaPage !== undefined) usedIds.add(detection.schemaPage.document.id)
  for (const page of pages) {
    if (page.role === 'chapter-overview') usedIds.add(page.document.id)
  }
  // 章节锚点用到的概览页
  for (const chapter of builtChapters) {
    for (const anchor of chapter.anchors) usedIds.add(anchor.documentId)
  }
  const usedPages = pages.filter(page => usedIds.has(page.document.id))
  const sources: CourseSourceRef[] = usedPages.map(page => ({
    sourceId: page.document.id,
    role: SOURCE_ROLE_BY_KB_ROLE[page.role],
  }))
  const basedOn = usedPages
    .map(page => materials.get(page.document.id))
    .filter((item): item is MaterialDocument => item !== undefined)
    .map(item => ({ sourceId: item.document.id, revisionId: item.revision.id }))

  // 追加警告：悬空链接、孤立页、frontmatter 缺字段、tags 章节不一致、路径空格差异
  const importedSlugs = new Set(pages.map(page => page.slug))
  // 只有 wiki 内容页（概念/章节概览）的链接参与结构完整性检查；
  // SCHEMA/log 中的 `[[wikilinks]]` 是写作约定，不是页面引用。
  const linkSourceRoles = new Set<KbSourceRole>(['concept', 'chapter-overview', 'entity', 'comparison', 'summary'])
  let danglingCount = 0
  const danglingSamples: string[] = []
  for (const page of pages) {
    if (!linkSourceRoles.has(page.role)) continue
    for (const link of page.wikilinks) {
      if (link.embed) continue
      const targetSlug = normalizeSlug(basename(link.target))
      if (importedSlugs.has(targetSlug)) continue
      if (resolveLink(link.target) !== undefined) continue
      danglingCount += 1
      if (danglingSamples.length < 3) danglingSamples.push(`${page.fileName} → [[${link.target}]]`)
    }
  }
  if (danglingCount > 0) {
    warnings.push(`${danglingCount} 个 wikilink 指向未导入的页面（结果中不伪造对应概念）：${danglingSamples.join('；')}`)
  }
  // 孤立页（无入链且不在 index 中）
  const inbound = new Map<string, number>()
  for (const page of pages) {
    if (!linkSourceRoles.has(page.role)) continue
    for (const link of page.wikilinks) {
      if (link.embed) continue
      const targetSlug = normalizeSlug(basename(link.target))
      inbound.set(targetSlug, (inbound.get(targetSlug) ?? 0) + 1)
    }
  }
  const orphans = teachablePages.filter(page => (inbound.get(page.slug) ?? 0) === 0 && !indexEntryByKey.has(page.slug))
  if (orphans.length > 0) {
    warnings.push(`${orphans.length} 个概念页没有入链也不在 index.md 中（孤立页）：${orphans.slice(0, 5).map(page => pageTitleOf(page)).join('、')}`)
  }
  // frontmatter 缺字段
  const missingFrontmatter = teachablePages.filter(page => page.frontmatter === undefined
    || frontmatterString(page.frontmatter, 'title') === undefined
    || frontmatterString(page.frontmatter, 'type') === undefined)
  if (missingFrontmatter.length > 0) {
    warnings.push(`${missingFrontmatter.length} 个概念页缺少 frontmatter 的 title/type：${missingFrontmatter.slice(0, 5).map(page => page.fileName).join('、')}`)
  }
  // tags 章节号与分配章节不一致
  let tagMismatch = 0
  const tagMismatchSamples: string[] = []
  for (const concept of conceptSources.values()) {
    const chapterTag = concept.tags.map(tag => /^ch0*(\d+)$/i.exec(tag)?.[1]).find(value => value !== undefined)
    if (chapterTag === undefined) continue
    const placement = chapterBySlug.get(concept.slug)
    const chapterPage = placement?.chapter.page
    const assignedNumber = chapterPage === undefined ? undefined : resolvedChapterNumber(chapterPage)
    if (assignedNumber !== undefined && Number(chapterTag) !== assignedNumber) {
      tagMismatch += 1
      if (tagMismatchSamples.length < 3) tagMismatchSamples.push(`${concept.title}(ch${chapterTag}→章${assignedNumber})`)
    }
  }
  if (tagMismatch > 0) {
    warnings.push(`${tagMismatch} 个概念页的 tags 章节号与 index 章节不一致：${tagMismatchSamples.join('、')}`)
  }
  // frontmatter sources 路径空格差异（只提示可匹配到实际页面但路径不完全一致的）
  let whitespaceMismatch = 0
  const whitespaceSamples: string[] = []
  for (const concept of conceptSources.values()) {
    for (const ref of concept.rawSourceRefs) {
      if (resolveRawDocument(pages, materials, ref) !== undefined) continue
      const collapsed = normalizeWhitespacePath(ref)
      const matched = pages.some(page => normalizeWhitespacePath(page.relativePath) === collapsed)
      if (matched) {
        whitespaceMismatch += 1
        if (whitespaceSamples.length < 3) whitespaceSamples.push(ref)
      }
    }
  }
  if (whitespaceMismatch > 0) {
    warnings.push(`${whitespaceMismatch} 个 frontmatter sources 路径与已导入文件存在空格/规范差异：${whitespaceSamples.join('、')}`)
  }
  const unresolvedRaw = [...conceptSources.values()]
    .flatMap(concept => concept.rawSourceRefs)
    .filter((ref, index, all) => all.indexOf(ref) === index)
    .filter(ref => resolveRawDocument(pages, materials, ref) === undefined)
  if (unresolvedRaw.length > 0) {
    notes.push(`frontmatter sources 中有 ${unresolvedRaw.length} 条原始资料路径未导入（概念页仍作为主锚点）：${unresolvedRaw.slice(0, 3).join('、')}`)
  }
  if (invalidAnchorCount > 0) {
    notes.push(`${invalidAnchorCount} 个概念既无摘要也无锚点，已保留标题但提示教学时标注不确定`)
  }

  notes.push(`构建结果：${normalizedChapters.filter(chapter => chapter.role === 'chapter').length} 章 + ${normalizedChapters.filter(chapter => chapter.role === 'tool').length} 个工具章节 + ${builtConcepts.length} 个概念（${builtConcepts.reduce((sum, concept) => sum + concept.anchors.length, 0)} 个原文锚点）`)
  if (warnings.length > 0) {
    notes.push(`结构警告 ${warnings.length} 条（详见 warnings）`)
  }

  return ok({
    detection,
    concepts: builtConcepts,
    chapters: normalizedChapters,
    sequence: builtSequence,
    sources,
    basedOn,
    notes,
    warnings,
  })
}

/** 知识库结构检测 + 确定性构建入口（自行装载资料）。 */
export async function buildKbStructureData(
  deps: KbBuildDeps,
  input: Pick<CourseDraftInput, 'courseId' | 'documentIds'>,
  signal?: AbortSignal,
): Promise<Result<KbStructureBuild>> {
  const prepared = await prepareKbContext(deps, input, signal)
  if (!prepared.ok) return prepared
  return await buildKbStructureFromContext(deps, input, prepared.value, signal)
}

/* ------------------------------------------------------------------ 路径匹配 */

function normalizeWhitespacePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** 把 frontmatter sources 中的路径解析到已导入 raw/visual 页面。 */
function resolveRawDocument(
  pages: readonly KbPage[],
  _materials: ReadonlyMap<string, MaterialDocument>,
  ref: string,
): { page: KbPage } | undefined {
  const normalizedRef = normalizeWhitespacePath(ref).replace(/^\.\//, '')
  const refBase = basename(normalizedRef)
  for (const page of pages) {
    if (page.role === 'concept' || page.role === 'chapter-overview' || page.role === 'catalog'
      || page.role === 'schema' || page.role === 'log') {
      continue
    }
    const normalizedPage = normalizeWhitespacePath(page.relativePath).replace(/^\.\//, '')
    if (normalizedPage === normalizedRef || normalizedPage.endsWith(`/${normalizedRef}`)) return { page }
    if (normalizeWhitespacePath(page.document.originalPath).endsWith(`/${normalizedRef}`)) return { page }
    if (basename(normalizedPage) === refBase
      && normalizeWhitespacePath(page.document.originalPath).endsWith(normalizedRef)) {
      return { page }
    }
  }
  return undefined
}

/** 保留：对外暴露章节类型（Host/测试构造 CourseChapter 时使用）。 */
export type KbChapterRole = NonNullable<CourseChapter['role']>
