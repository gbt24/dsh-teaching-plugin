/**
 * Reusable Node-side audit of a standalone offline export.
 *
 * Used by the tests and by the CLI in `offline-scan.ts` so the evidence command
 * and the test assert exactly the same things:
 * - no external resource reference (script/link/img/iframe/fetch/import/CSS url);
 * - manifest exists, checksums every file and stays inside the export dir;
 * - the page stays a single self-contained HTML file.
 *
 * Real browser + physical-network offline verification is explicitly out of
 * scope here and belongs to the Lead/user acceptance step.
 */
import { readFile, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { sha256Hex } from '../../src/portability/index.ts'
import type { ExportManifest } from '../../src/contracts/index.ts'

/** One file listed by the export manifest. */
export interface AuditedFile {
  readonly path: string
  readonly bytes: number
  readonly sha256: string
  readonly ok: boolean
  readonly problem?: string
}

/** Result of auditing one export package. */
export interface OfflineAuditReport {
  readonly htmlPath: string
  readonly htmlBytes: number
  readonly resourceProblems: readonly string[]
  readonly manifestProblems: readonly string[]
  readonly files: readonly AuditedFile[]
  readonly limitations: readonly string[]
  readonly offlineCapable: boolean | undefined
  readonly nativeSourceCount: number
}

/** User-clicked Markdown links are allowed; they are never page resources. */
export function externalResourceProblems(html: string): string[] {
  const problems: string[] = []
  const withoutAnchors = html
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/giu, '')
    .replace(/<a\b[^>]*\/>/giu, '')
  if (/<script\b[^>]*\bsrc\s*=/iu.test(withoutAnchors)) problems.push('script src')
  if (/<link\b/iu.test(withoutAnchors)) problems.push('link tag')
  if (/<img\b[^>]*\bsrc\s*=/iu.test(withoutAnchors)) problems.push('img src')
  if (/<iframe\b|<object\b|<embed\b/iu.test(withoutAnchors)) problems.push('embedded frame/object')
  if (/\burl\s*\(\s*['"]?(?:https?:)?\/\//iu.test(withoutAnchors)) problems.push('CSS external url()')
  if (/@import\b/iu.test(withoutAnchors)) problems.push('@import')
  if (/\b(?:fetch|XMLHttpRequest|importScripts)\s*\(/u.test(withoutAnchors)) problems.push('network API call')
  if (/\bimport\s*\(/u.test(withoutAnchors)) problems.push('dynamic import()')
  if (/\bsrcset\s*=/iu.test(withoutAnchors)) problems.push('srcset')
  if (/(?:https?:)?\/\//u.test(withoutAnchors)) problems.push('external URL reference')
  return problems
}

/** Whether a path stays inside the export directory. */
function staysInside(root: string, candidate: string): boolean {
  const resolvedRoot = resolve(root)
  const resolvedCandidate = resolve(candidate)
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${sep}`)
}

/**
 * Audit one exported `index.html` (and its sibling `manifest.json`).
 *
 * @throws when the HTML or manifest cannot be read; a missing file is an error,
 *         not a silent pass.
 */
export async function auditOfflineExport(htmlPath: string): Promise<OfflineAuditReport> {
  const htmlBytesRaw = await readFile(htmlPath)
  const html = htmlBytesRaw.toString('utf8')
  const exportDir = resolve(htmlPath, '..')
  const manifestProblems: string[] = []
  const files: AuditedFile[] = []
  let manifest: ExportManifest | undefined
  try {
    manifest = JSON.parse(await readFile(join(exportDir, 'manifest.json'), 'utf8')) as ExportManifest
  } catch (cause) {
    manifestProblems.push(`manifest.json 无法读取或解析：${cause instanceof Error ? cause.message : String(cause)}`)
  }
  if (manifest !== undefined) {
    if (manifest.offlineCapable !== true) manifestProblems.push('manifest.offlineCapable 不是 true')
    const htmlEntry = manifest.files.find(file => file.path === 'index.html')
    if (htmlEntry === undefined) {
      manifestProblems.push('manifest 缺少 index.html 条目')
    } else {
      const actual = sha256Hex(new Uint8Array(htmlBytesRaw))
      if (actual !== htmlEntry.sha256) manifestProblems.push(`index.html sha256 不匹配（清单 ${htmlEntry.sha256}，实际 ${actual}）`)
      if (htmlEntry.bytes !== htmlBytesRaw.byteLength) {
        manifestProblems.push(`index.html 字节数不匹配（清单 ${htmlEntry.bytes}，实际 ${htmlBytesRaw.byteLength}）`)
      }
    }
    for (const entry of manifest.files) {
      const absolute = join(exportDir, ...entry.path.split('/'))
      if (!staysInside(exportDir, absolute)) {
        manifestProblems.push(`清单文件路径越界：${entry.path}`)
        files.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256, ok: false, problem: 'path escapes export dir' })
        continue
      }
      try {
        const bytes = new Uint8Array(await readFile(absolute))
        const actual = sha256Hex(bytes)
        const ok = bytes.byteLength === entry.bytes && actual === entry.sha256
        files.push({
          path: entry.path,
          bytes: entry.bytes,
          sha256: entry.sha256,
          ok,
          ...(ok ? {} : { problem: `大小/校验和与清单不一致（实际 ${bytes.byteLength} bytes, ${actual}）` }),
        })
      } catch {
        files.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256, ok: false, problem: '文件缺失' })
      }
    }
    if (!manifest.limitations.some(line => /KaTeX/iu.test(line))) {
      manifestProblems.push('manifest.limitations 未声明 KaTeX 字体回退')
    }
    if (!manifest.limitations.some(line => /native\/README\.md/iu.test(line)) && manifest.nativeSources.length > 0) {
      manifestProblems.push('manifest.limitations 未说明原生实验的运行说明')
    }
  }
  return {
    htmlPath: resolve(htmlPath),
    htmlBytes: htmlBytesRaw.byteLength,
    resourceProblems: externalResourceProblems(html),
    manifestProblems,
    files,
    limitations: manifest?.limitations ?? [],
    offlineCapable: manifest?.offlineCapable,
    nativeSourceCount: manifest?.nativeSources.length ?? 0,
  }
}

/** Whether an audit report passes every Node-side offline requirement. */
export function auditPassed(report: OfflineAuditReport): boolean {
  return report.resourceProblems.length === 0
    && report.manifestProblems.length === 0
    && report.files.every(file => file.ok)
}

/** Ensure a path exists (used by CLI argument validation). */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
