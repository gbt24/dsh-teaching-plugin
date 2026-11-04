/**
 * 格式解析器的公共上下文与派生资产辅助。
 *
 * 每个解析器只读 `ctx.bytes`（原文件内容），产出 ParsedSource 与资产字节；
 * 持久化、状态推导、指纹等由 service 统一处理。
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, resolve as resolvePath } from 'node:path'
import type { ParsedSource, SourceFormat } from '../../contracts/source.ts'
import type { SourceRevisionId } from '../../contracts/ids.ts'
import type { ExtractionBudget, ParserOutput } from '../budget.ts'
import type { CorpusLimits } from '../limits.ts'
import type { OcrRuntime } from '../ocr.ts'
import { CorpusParseError } from '../errors.ts'

/** 单个解析器收到的上下文。 */
export interface ParseContext {
  /** 原文件绝对路径（只读）。 */
  readonly path: string
  /** 原文件内容。 */
  readonly bytes: Uint8Array
  readonly format: SourceFormat
  /** 扩展名（小写、含点），用于代码语言/格式细节。 */
  readonly extension: string
  /** 调用方给出的格式提示（如测试指定）。 */
  readonly formatHint?: string
  readonly limits: CorpusLimits
  readonly signal?: AbortSignal
  readonly ocr: OcrRuntime
  /** 本次解析对应的修订 ID，单元必须携带。 */
  readonly revisionId: SourceRevisionId
}

/** 格式解析器签名。 */
export type FormatParser = (context: ParseContext) => Promise<ParserOutput>

/** 新预算器：把 revisionId/limits/signal 绑定到上下文。 */
export function budgetFor(
  context: ParseContext,
  createBudget: (revisionId: SourceRevisionId, limits: CorpusLimits, signal?: AbortSignal) => ExtractionBudget,
): ExtractionBudget {
  return createBudget(context.revisionId, context.limits, context.signal)
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'])

/** UTF-8 文本解码（带 BOM 处理）。 */
export function decodeText(bytes: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * 二进制内容检测：文本格式遇到大量 NUL/控制字符时明确失败，
 * 避免把二进制当作文本「抽取」出垃圾内容。
 */
export function assertTextual(bytes: Uint8Array, what: string): string {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192))
  let nul = 0
  let control = 0
  for (const byte of sample) {
    if (byte === 0) nul += 1
    else if (byte < 9 || (byte > 13 && byte < 32)) control += 1
  }
  if (sample.length > 0 && (nul / sample.length > 0.02 || control / sample.length > 0.05)) {
    throw new CorpusParseError(`${what}看起来不是文本文件（含二进制内容）`, 'binary-content')
  }
  return decodeText(bytes)
}

/** 图片引用解析结果。 */
export interface LocalAssetRef {
  readonly absolutePath: string
  readonly extension: string
  /** 原始引用（用于说明） */
  readonly ref: string
}

/** 判断引用是否为远程/内联资源（本版本不联网下载）。 */
export function isRemoteRef(ref: string): boolean {
  return /^(?:https?:)?\/\//i.test(ref) || /^data:/i.test(ref)
}

/** 把文档内图片引用解析为本地绝对路径；非图片或越界返回 undefined。 */
export function resolveLocalAssetRef(fileDir: string, ref: string): LocalAssetRef | undefined {
  if (ref === '' || isRemoteRef(ref)) return undefined
  let cleaned = ref.split('#')[0]?.split('?')[0] ?? ''
  if (cleaned === '') return undefined
  try {
    cleaned = decodeURIComponent(cleaned)
  } catch {
    // 保留原字符串
  }
  const extension = extname(cleaned).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(extension)) return undefined
  const absolutePath = isAbsolute(cleaned) ? cleaned : resolvePath(fileDir, cleaned)
  return { absolutePath, extension, ref }
}

/** 图片扩展名 → 资产扩展名（jpeg 保持原样）。 */
export function assetExtension(extension: string): string {
  return extension.startsWith('.') ? extension.slice(1) : extension
}

function hashPrefix(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 10)
}

/** 把图片字节加入预算资产，返回相对资产目录路径。 */
export function addImageAsset(
  budget: ExtractionBudget,
  bytes: Uint8Array,
  extension: string,
  prefix: string,
): string | undefined {
  const ext = assetExtension(extension)
  if (ext === '') return undefined
  const relativePath = `figures/${prefix}-${hashPrefix(bytes)}.${ext}`
  if (budget.assets.has(relativePath)) return relativePath
  return budget.addAsset(relativePath, bytes, ext)
}

/** 读取本地图片并加入资产；文件缺失/过大/非图片返回 undefined。 */
export async function addLocalImageAsset(
  budget: ExtractionBudget,
  fileDir: string,
  ref: string,
  prefix: string,
): Promise<{ assetPath?: string; ref: LocalAssetRef } | undefined> {
  const resolved = resolveLocalAssetRef(fileDir, ref)
  if (resolved === undefined) return undefined
  try {
    const bytes = new Uint8Array(await readFile(resolved.absolutePath))
    const assetPath = addImageAsset(budget, bytes, resolved.extension, prefix)
    return { ...(assetPath !== undefined ? { assetPath } : {}), ref: resolved }
  } catch {
    return undefined
  }
}

/** 安全的资产名前缀：来自文件名，去掉路径与特殊字符。 */
export function assetNamePrefix(documentPath: string): string {
  const name = basename(documentPath, extname(documentPath)).replace(/[^\w-]+/g, '-').slice(0, 24)
  return name === '' ? 'asset' : name
}

/** 读取图片尺寸（用于图片 OCR 的 bbox 归一化）；失败返回 undefined。 */
export async function readImageBytes(path: string): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await readFile(path))
  } catch {
    return undefined
  }
}
