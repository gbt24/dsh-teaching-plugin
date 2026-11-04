/**
 * 资料指纹与文件元信息：变化检测的事实来源。
 *
 * 指纹是文件内容的 SHA-256（前缀 `sha256:`），mtime/size 只用于廉价短路；
 * 哈希相同即内容未变，绝不把「mtime 变了」直接当成内容变化。
 */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

/** 指纹前缀，便于未来升级算法。 */
export const FINGERPRINT_PREFIX = 'sha256:'

/** 一个文件的当前元信息。 */
export interface FileStatInfo {
  readonly mtimeMs: number
  readonly sizeBytes: number
}

/** 读取文件元信息；不存在返回 undefined。 */
export async function statFile(path: string): Promise<FileStatInfo | undefined> {
  try {
    const info = await stat(path)
    if (!info.isFile()) return undefined
    return { mtimeMs: info.mtimeMs, sizeBytes: info.size }
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && (cause as { code?: unknown }).code === 'ENOENT') {
      return undefined
    }
    throw cause
  }
}

/** 流式计算文件 SHA-256，避免一次性把大文件读进内存。 */
export async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve())
  })
  return `${FINGERPRINT_PREFIX}${hash.digest('hex')}`
}

/** 计算内存字节的指纹（parseFile 等场景）。 */
export function fingerprintOfBytes(bytes: Uint8Array): string {
  return `${FINGERPRINT_PREFIX}${createHash('sha256').update(bytes).digest('hex')}`
}
