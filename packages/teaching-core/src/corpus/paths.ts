/**
 * 语料派生数据的路径与文件读写辅助。
 *
 * 原文件永远只读：所有派生数据（修订元数据、单元、图片资产、检索索引）都写在
 * `$DSH_HOME/teaching/sources/<id>/` 下，由 LocalState 的 dataDir 决定根目录。
 * 相对路径由 storage/layout.ts 的绝对路径换算而来，避免自建布局与存储层漂移。
 */
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import {
  sourceAssetsDir, sourceFile, sourceRevisionFile, sourceUnitsFile,
} from '../storage/layout.ts'
import type { LocalState } from '../storage/local-state.ts'

/** 一源资料相关的相对路径（相对 dataDir）。 */
export interface SourcePaths {
  /** sources/<id>.json —— 文档记录（由 CourseRepository 读写）。 */
  document(documentId: string): string
  /** 修订元数据（SourceRevisionMeta）。 */
  revisionMeta(documentId: string, revisionId: string): string
  /** 修订单元与问题（{units, issues} 对象）。 */
  revisionUnits(documentId: string, revisionId: string): string
  /** 修订图片资产目录的绝对路径。 */
  assetsDirAbs(documentId: string, revisionId: string): string
  /** 检索索引缓存（可删除，正确性不依赖）。 */
  searchIndex(documentId: string, revisionId: string): string
  /** 索引缓存目录。 */
  searchIndexDir(documentId: string): string
  /** 文档目录（用于清理）。 */
  documentDir(documentId: string): string
  /** 文档目录相对路径前缀。 */
  documentDirRel(documentId: string): string
  /** 派生数据目录（临时渲染等）。 */
  tempDir: string
  /** 库目录缓存（文档清单），属于可重建缓存。 */
  catalog: string
}

/** 把绝对路径换算成 LocalState 需要的相对路径。 */
export function toStoreRelative(dataDir: string, absolutePath: string): string {
  return relative(dataDir, absolutePath).split(sep).join('/')
}

/** 构造一套 source 存储路径。 */
export function sourcePaths(state: LocalState): SourcePaths {
  const dataDir = state.dataDir
  return {
    document: documentId => toStoreRelative(dataDir, sourceFile(dataDir, documentId)),
    revisionMeta: (documentId, revisionId) => toStoreRelative(
      dataDir, sourceRevisionFile(dataDir, documentId, revisionId),
    ),
    revisionUnits: (documentId, revisionId) => toStoreRelative(
      dataDir, sourceUnitsFile(dataDir, documentId, revisionId),
    ),
    assetsDirAbs: (documentId, revisionId) => sourceAssetsDir(dataDir, documentId, revisionId),
    searchIndex: (documentId, revisionId) => `sources/${documentId}/search/${revisionId}.json`,
    searchIndexDir: documentId => `sources/${documentId}/search`,
    documentDir: documentId => join(dataDir, 'sources', documentId),
    documentDirRel: documentId => `sources/${documentId}`,
    tempDir: join(dataDir, 'cache', 'corpus-tmp'),
    catalog: 'cache/corpus-catalog.json',
  }
}

/** 原子写一个二进制资产（tmp + rename，避免半写文件）。 */
export async function writeAssetAtomic(absolutePath: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(absolutePath), { recursive: true })
  const tmp = join(dirname(absolutePath), `.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`)
  await writeFile(tmp, bytes)
  await rename(tmp, absolutePath)
}

/** 递归删除一个目录（幂等）。 */
export async function removeDirIfExists(absolutePath: string): Promise<void> {
  await rm(absolutePath, { recursive: true, force: true })
}
