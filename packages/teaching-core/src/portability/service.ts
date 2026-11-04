/**
 * PortabilityService implementation — export, backup, inspect, restore and
 * record control over the local teaching data directory.
 *
 * The Host bridge creates exactly one instance with the shared repositories and
 * calls this seam from `/api/teaching/portability.*` and `records.*` routes.
 * Everything here is pure Node: no Harness imports, no network access, no
 * credentials. Expected failures return `Result` values; thrown errors are
 * programming bugs and are converted to a diagnostic `failed` result.
 */
import { isAbsolute, join } from 'node:path'
import type { BackupManifest, ExportManifest, RestoreReport } from '../contracts/portability.ts'
import { EXPORT_FORMAT_VERSION } from '../contracts/portability.ts'
import type {
  BackupResult, DeleteRecordsRequest, DeleteRecordsResult, ExportRequest, ExportResult,
  PortabilityService,
} from '../contracts/portability-service.ts'
import type { EnvironmentRecord, ExperimentRun } from '../contracts/experiment.ts'
import { exportId as newExportId, nowIso } from '../contracts/ids.ts'
import { err, ok, toAppError, type Result } from '../contracts/result.ts'
import type { LocalState } from '../storage/local-state.ts'
import type {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
} from '../storage/repositories.ts'
import { SICP_PRELUDE } from '../experiments/scheme-support.ts'
import {
  createBackupArchive, readValidatedArchive, restoreBackupArchive, sha256Hex, writeFileAtomic,
} from './backup.ts'
import { deleteRecords, exportRecordsJson, resetLearningRecords } from './records.ts'
import {
  buildNativeReadme, languageLabel, needsSicpPrelude, planNativeSources,
  type PlannedNativeSource,
} from './offline/native.ts'
import {
  buildOfflinePage, OFFLINE_LIMITS, OFFLINE_NOTICE_LINES, type OfflinePageInput, type PageSessionInput,
} from './offline/export-page.ts'

/** Repositories and facts the service needs; wired by the Host bridge. */
export interface PortabilityDependencies {
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly sessions: SessionRepository
  readonly learning: LearningRepository
  readonly profiles?: ProfileRepository
  readonly pluginVersion: string
  readonly appVersion: string
  /** Include `usage/model-usage.jsonl` in backups (default false: no cost data). */
  readonly includeUsageInBackups?: boolean
}

/** Whether an optional cancellation signal already fired. */
function aborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

/** Read every JSON file in one data subdirectory (missing dir → empty). */
async function readAllJson<T>(state: LocalState, relativeDir: string): Promise<T[]> {
  const names = (await state.list(relativeDir)).filter(name => name.endsWith('.json'))
  const values: T[] = []
  for (const name of names) {
    const value = await state.readJson<T>(`${relativeDir}/${name}`)
    if (value !== undefined) values.push(value)
  }
  return values
}

/** Read recorded experiment environments (missing dir → empty). */
async function loadEnvironments(state: LocalState): Promise<EnvironmentRecord[]> {
  return readAllJson<EnvironmentRecord>(state, 'environments')
}

/** Latest recorded run per activity id (used read-only on the export page). */
async function loadLastRunsByActivity(state: LocalState): Promise<Map<string, ExperimentRun>> {
  const runs = await readAllJson<ExperimentRun>(state, 'runs')
  const byActivity = new Map<string, ExperimentRun>()
  for (const run of runs) {
    if (run.activityId === undefined) continue
    const previous = byActivity.get(run.activityId)
    if (previous === undefined || (run.startedAt ?? '') > (previous.startedAt ?? '')) {
      byActivity.set(run.activityId, run)
    }
  }
  return byActivity
}

/** Default output directory for one export. */
function defaultExportDir(state: LocalState, exportId: string): string {
  return join(state.paths.exports, exportId)
}

/** Validate an optional caller-provided output directory. */
function checkOutDir(outDir: string | undefined): Result<string | undefined> {
  if (outDir === undefined) return ok(undefined)
  if (typeof outDir !== 'string' || outDir.trim() === '' || !isAbsolute(outDir)) {
    return err('invalid-input', '输出目录必须是绝对路径')
  }
  return ok(outDir)
}

/** One generated export package before the manifest is finalized. */
interface PackageFile {
  readonly path: string
  readonly absolutePath: string
  readonly bytes: Uint8Array
}

/** The service created by {@link createPortabilityService}. */
class PortabilityServiceImpl implements PortabilityService {
  private readonly deps: PortabilityDependencies

  constructor(deps: PortabilityDependencies) {
    this.deps = deps
  }

  async createBackup(outDir?: string, signal?: AbortSignal): Promise<Result<BackupResult>> {
    try {
      const checked = checkOutDir(outDir)
      if (!checked.ok) return checked
      const targetDir = checked.value ?? this.deps.state.paths.backups
      const sidecarDirs = targetDir === this.deps.state.paths.backups
        ? [this.deps.state.paths.backups]
        : [this.deps.state.paths.backups, targetDir]
      const created = await createBackupArchive({
        dataDir: this.deps.state.dataDir,
        outDir: targetDir,
        sidecarDirs,
        pluginVersion: this.deps.pluginVersion,
        appVersion: this.deps.appVersion,
        includeUsage: this.deps.includeUsageInBackups === true,
        ...(signal !== undefined ? { signal } : {}),
      })
      if (!created.ok) return created
      return ok({
        backupId: created.value.backupId,
        archivePath: created.value.archivePath,
        manifest: created.value.manifest,
        bytes: created.value.bytes,
      })
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '创建备份失败') }
    }
  }

  async inspectBackup(archivePath: string): Promise<Result<BackupManifest>> {
    try {
      if (typeof archivePath !== 'string' || archivePath.trim() === '') {
        return err('invalid-input', '需要备份文件路径')
      }
      const archive = await readValidatedArchive(archivePath)
      if (!archive.ok) return archive
      return ok(archive.value.manifest)
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '读取备份失败') }
    }
  }

  async restoreBackup(
    archivePath: string,
    options?: { readonly remapSources?: Readonly<Record<string, string>>; readonly signal?: AbortSignal },
  ): Promise<Result<RestoreReport>> {
    try {
      if (typeof archivePath !== 'string' || archivePath.trim() === '') {
        return err('invalid-input', '需要备份文件路径')
      }
      return await restoreBackupArchive({
        dataDir: this.deps.state.dataDir,
        archivePath,
        ...(options?.remapSources !== undefined ? { remapSources: options.remapSources } : {}),
        ...(options?.signal !== undefined ? { signal: options.signal } : {}),
        createPreRestoreBackup: async () => {
          const backup = await this.createBackup()
          return backup.ok
            ? ok({ archivePath: backup.value.archivePath })
            : err('storage', `恢复前自动备份失败：${backup.error.message}`)
        },
      })
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '恢复备份失败') }
    }
  }

  async exportCourse(request: ExportRequest, signal?: AbortSignal): Promise<Result<ExportResult>> {
    try {
      if (typeof request?.courseId !== 'string' || request.courseId === '') {
        return err('invalid-input', '导出课程需要 courseId')
      }
      if (request.format !== undefined && request.format !== 'html') {
        return err('invalid-input', 'v1 只支持 HTML 导出')
      }
      const targetOutDir = checkOutDir(request.outDir)
      if (!targetOutDir.ok) return targetOutDir
      const course = await this.deps.courses.get(request.courseId)
      if (course === undefined) return err('not-found', '课程不存在或已被删除', { details: { courseId: request.courseId } })
      if (aborted(signal)) return err('cancelled', '导出已取消')

      const warnings: string[] = []
      const revision = await this.deps.courses.getActiveRevision(course)
        ?? await this.deps.courses.getDraftRevision(course)
      if (revision === undefined) {
        warnings.push('课程还没有课程结构，导出页只包含课程信息与已有会话')
      } else if (revision.state === 'draft') {
        warnings.push('课程结构尚未确认，本次导出使用草案版本')
      }

      const allSessions = await this.deps.sessions.list(course.id)
      let sessions = allSessions
      if (request.sessionIds !== undefined) {
        const wanted = new Set(request.sessionIds)
        sessions = allSessions.filter(session => wanted.has(session.id))
        for (const missing of request.sessionIds.filter(id => !allSessions.some(session => session.id === id))) {
          warnings.push(`请求导出的会话不存在，已跳过：${missing}`)
        }
      }
      const lastRuns = await loadLastRunsByActivity(this.deps.state)
      const pageSessions: PageSessionInput[] = []
      for (const session of sessions) {
        if (aborted(signal)) return err('cancelled', '导出已取消')
        const messages = await this.deps.sessions.messages(session.id)
        const activities = await this.deps.sessions.listActivities(session.id)
        const activityStates = new Map<string, import('../contracts/activity.ts').ActivityState>()
        for (const activity of activities) {
          const state = await this.deps.sessions.getActivityState(activity.id)
          if (state !== undefined) activityStates.set(activity.id, state)
        }
        pageSessions.push({ session, messages, activities, activityStates, lastRunByActivity: lastRuns })
      }

      const learning = await this.deps.learning.get(course.id)
      const sourceDocuments = await this.deps.courses.listSources(course.id)
      const sourceTitles = new Map(sourceDocuments.map(document => [document.id, document.title]))
      const environments = await loadEnvironments(this.deps.state)
      const nativePlan = planNativeSources(
        pageSessions.map(sessionData => ({
          sessionTitle: sessionData.session.title,
          activities: sessionData.activities,
        })),
        environments,
      )
      const includeSicpPrelude = needsSicpPrelude(nativePlan)
      const nativeFiles: string[] = nativePlan.map(source => source.path)
      if (includeSicpPrelude) nativeFiles.push('native/sicp-prelude.scm')
      if (nativePlan.length > 0) nativeFiles.push('native/README.md')

      const limitations = this.buildExportLimitations(nativePlan, includeSicpPrelude)
      const exportId = newExportId()
      const createdAt = nowIso()
      const page = buildOfflinePage({
        exportId,
        createdAt,
        pluginVersion: this.deps.pluginVersion,
        course,
        ...(revision !== undefined ? { revision } : {}),
        sessions: pageSessions,
        ...(learning !== undefined ? { learning } : {}),
        sourceTitles,
        includeNotes: request.includeNotes === true,
        limitations,
        nativeFiles,
      })
      if (aborted(signal)) return err('cancelled', '导出已取消')

      const outDir = targetOutDir.value ?? defaultExportDir(this.deps.state, exportId)
      const files: PackageFile[] = []
      files.push({
        path: 'index.html',
        absolutePath: join(outDir, 'index.html'),
        bytes: new TextEncoder().encode(page.html),
      })
      for (const source of nativePlan) {
        files.push({
          path: source.path,
          absolutePath: join(outDir, ...source.path.split('/')),
          bytes: new TextEncoder().encode(ensureTrailingNewline(source.code)),
        })
      }
      if (includeSicpPrelude) {
        files.push({
          path: 'native/sicp-prelude.scm',
          absolutePath: join(outDir, 'native', 'sicp-prelude.scm'),
          bytes: new TextEncoder().encode(ensureTrailingNewline(SICP_PRELUDE)),
        })
      }
      if (nativePlan.length > 0) {
        const readme = buildNativeReadme(nativePlan, {
          pluginVersion: this.deps.pluginVersion,
          exportId,
          includeSicpPrelude,
        })
        files.push({
          path: 'native/README.md',
          absolutePath: join(outDir, 'native', 'README.md'),
          bytes: new TextEncoder().encode(readme),
        })
      }
      for (const file of files) await writeFileAtomic(file.absolutePath, file.bytes)

      const manifest: ExportManifest = {
        id: exportId,
        formatVersion: EXPORT_FORMAT_VERSION,
        createdAt,
        pluginVersion: this.deps.pluginVersion,
        courses: [{
          courseId: course.id,
          title: course.title,
          sessionIds: sessions.map(session => session.id),
        }],
        files: files.map(file => ({
          path: file.path,
          bytes: file.bytes.byteLength,
          sha256: sha256Hex(file.bytes),
        })),
        offlineCapable: true,
        nativeSources: [
          ...nativePlan.map(source => ({
            language: source.language,
            path: source.path,
            runInstructions: source.runInstructions,
          })),
          ...(includeSicpPrelude
            ? [{
              language: 'scheme',
              path: 'native/sicp-prelude.scm',
              runInstructions: 'SICP 教学预置库：在插件外运行 SICP 方言源码前先加载（如 guile -l native/sicp-prelude.scm）。',
            }]
            : []),
        ],
        limitations: uniqueStrings([
          ...page.limitations,
          ...warnings,
          ...page.warnings,
          ...(nativePlan.length > 0
            ? [`Python/Scheme/其他原生实验源码共 ${nativePlan.length} 个，离线页面不执行；需按 native/README.md 在本机运行，导出不含运行环境。`]
            : []),
          '导出不含 Harness 凭据、模型用量明细或原始资料文件；页面交互不写入学习记录。',
        ]),
      }
      const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`
      const manifestPath = join(outDir, 'manifest.json')
      await writeFileAtomic(manifestPath, new TextEncoder().encode(manifestBody))
      await writeFileAtomic(
        join(this.deps.state.paths.exports, `${exportId}.manifest.json`),
        new TextEncoder().encode(manifestBody),
      )

      const nativeAbsoluteFiles = files
        .filter(file => file.path !== 'index.html' && file.path !== 'native/README.md')
        .map(file => file.absolutePath)
      return ok({
        exportId,
        htmlPath: join(outDir, 'index.html'),
        manifestPath,
        manifest,
        nativeFiles: nativeAbsoluteFiles,
        warnings: uniqueStrings([...warnings, ...page.warnings]),
      })
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '导出课程失败') }
    }
  }

  async exportRecords(input: { readonly courseId?: string; readonly outDir?: string }): Promise<Result<{ readonly path: string; readonly bytes: number }>> {
    try {
      const checked = checkOutDir(input?.outDir)
      if (!checked.ok) return checked
      return await exportRecordsJson(
        {
          state: this.deps.state,
          courses: this.deps.courses,
          sessions: this.deps.sessions,
          learning: this.deps.learning,
          pluginVersion: this.deps.pluginVersion,
        },
        {
          ...(input?.courseId !== undefined ? { courseId: input.courseId } : {}),
          ...(checked.value !== undefined ? { outDir: checked.value } : {}),
        },
      )
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '导出学习记录失败') }
    }
  }

  async deleteRecords(request: DeleteRecordsRequest): Promise<Result<DeleteRecordsResult>> {
    try {
      return await deleteRecords(
        {
          state: this.deps.state,
          courses: this.deps.courses,
          sessions: this.deps.sessions,
          learning: this.deps.learning,
          pluginVersion: this.deps.pluginVersion,
        },
        request,
      )
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '删除记录失败') }
    }
  }

  async resetRecords(scope: 'learning' | 'all', confirm: boolean): Promise<Result<{ readonly reset: boolean }>> {
    try {
      return await resetLearningRecords(
        {
          state: this.deps.state,
          courses: this.deps.courses,
          sessions: this.deps.sessions,
          learning: this.deps.learning,
          pluginVersion: this.deps.pluginVersion,
        },
        scope,
        confirm,
      )
    } catch (cause) {
      return { ok: false, error: toAppError(cause, '重置记录失败') }
    }
  }

  async listArtifacts(): Promise<{ readonly backups: readonly BackupManifest[]; readonly exports: readonly ExportManifest[] }> {
    const backups: BackupManifest[] = []
    for (const name of await this.deps.state.list('backups')) {
      if (!name.endsWith('.manifest.json')) continue
      const manifest = await this.deps.state.readJson<BackupManifest>(`backups/${name}`)
      if (manifest !== undefined) backups.push(manifest)
    }
    const exports: ExportManifest[] = []
    for (const name of await this.deps.state.list('exports')) {
      if (!name.endsWith('.manifest.json')) continue
      const manifest = await this.deps.state.readJson<ExportManifest>(`exports/${name}`)
      if (manifest !== undefined) exports.push(manifest)
    }
    const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }): number => b.createdAt.localeCompare(a.createdAt)
    return {
      backups: backups.sort(byCreatedAt),
      exports: exports.sort(byCreatedAt),
    }
  }

  /** Known limitations listed in the export manifest and on the page. */
  private buildExportLimitations(nativePlan: readonly PlannedNativeSource[], includeSicpPrelude: boolean): string[] {
    const limitations: string[] = [...OFFLINE_NOTICE_LINES]
    const languages = uniqueStrings(nativePlan.map(source => languageLabel(source.language, source.dialect)))
    if (languages.length > 0) {
      limitations.push(`本次导出包含原生实验源码（${languages.join('、')}），离线页面不执行代码，需在本机按 native/README.md 运行。`)
    }
    if (includeSicpPrelude) {
      limitations.push('SICP 方言代码依赖插件提供的教学预置库（已单独导出 native/sicp-prelude.scm）；与 MIT Scheme 的字面差异见环境说明。')
    }
    limitations.push('单文件页面目标在 2MB 以内；超大内容在导出时截断并在页面与清单中写明，完整内容保留在插件数据中。')
    limitations.push(`页面最多包含 ${OFFLINE_LIMITS.maxMessagesPerSession} 条消息/会话、${OFFLINE_LIMITS.maxActivitiesPerSession} 个活动/会话。`)
    return uniqueStrings(limitations)
  }
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

/**
 * Create the portability seam used by the Host routes.
 *
 * @throws never — construction only stores dependencies.
 */
export function createPortabilityService(dependencies: PortabilityDependencies): PortabilityService {
  return new PortabilityServiceImpl(dependencies)
}
