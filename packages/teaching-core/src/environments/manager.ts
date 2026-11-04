/**
 * T06 environment manager: classification, isolated preparation, smoke
 * verification, failure cleanup, cancellation and resource fallbacks.
 *
 * The manager consumes the frozen {@link RunnerRegistry} for the first-version
 * languages and adds lightweight adapters (Ruby/Lua/Deno) that run from an
 * interpreter already present on the host but keep dependencies, caches and
 * working files inside `<dataDir>/environments/managed/**`.
 *
 * Guarantees:
 * - Nothing is installed system-wide. A missing runtime yields either
 *   `needs-approval` with an explicit impact/alternatives description or
 *   `unsupported`; the manager never guesses a package manager command.
 * - Preparation is cancellable; a failed/cancelled preparation cleans its
 *   unfinished managed directory and records the cleanup status truthfully.
 * - Ready environments are never touched by a failed preparation elsewhere.
 * - Environment records are persisted atomically and survive a host restart.
 */
import { accessSync, constants, existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { delimiter, isAbsolute, join, resolve, sep } from 'node:path'
import type {
  EnvironmentDirectory, EnvironmentRecord, ExperimentRun, RunRequest,
} from '../contracts/experiment.ts'
import {
  environmentId as newEnvironmentId, nowIso, runId as newRunId,
  type EnvironmentId, type RunId,
} from '../contracts/ids.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import { SUPPORTED_LANGUAGES, runProcess } from '../experiments/index.ts'
import type { EnvironmentProbe, OutputChunk, PrepareEnvironmentInput, RunnerRegistry } from '../experiments/index.ts'
import {
  DEFAULT_INSTALL_PLANS, EXTENDED_LANGUAGE_SPECS, findExtendedSpec, findInstallPlan,
  networkInstallApproval, pluginRepairApproval, systemRuntimeApproval,
} from './catalog.ts'
import { EnvironmentStore } from './persistence.ts'
import { assessResourceRequest, readHostFacts } from './resources.ts'
import type {
  DeclaredEnvironmentNeed, DeclaredResourceEnvelope, EnvironmentApproval, EnvironmentCleanupResult,
  EnvironmentManager, EnvironmentManagerOptions, EnvironmentNeed, EnvironmentRunOptions,
  ExtendedLanguageSpec, HostFacts, PreparationProgress, PrepareEnvironmentOptions,
  PrepareEnvironmentRequest, ResourceAssessment, ResourceRequest, StaleEnvironmentCleanupReport,
  SystemInstallPlanSpec,
} from './types.ts'

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_TIMEOUT_MS = 120_000
const MIN_TIMEOUT_MS = 100
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024
const SMOKE_TIMEOUT_MS = 8_000
const PROBE_TIMEOUT_MS = 8_000
const SYSTEM_CHANGE_TIMEOUT_MS = 120_000
const MAX_CONCURRENT_RUNS = 4
const RUN_HISTORY = 50

const BUILTIN_LABELS: Readonly<Record<string, string>> = {
  python: 'Python',
  javascript: 'JavaScript',
  scheme: 'Scheme（SICP 方言）',
}

/** Cleanup status vocabulary from the environment contract. */
type CleanupStatus = NonNullable<EnvironmentRecord['failure']>['cleanup']

/** Child environment variables safe to pass through; no secrets are inherited. */
const INHERITED_ENV_KEYS: readonly string[] = [
  'PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'SHELL',
  'SystemRoot', 'ComSpec', 'SYSTEMROOT',
]

function childEnv(extra?: Readonly<Record<string, string>>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const key of INHERITED_ENV_KEYS) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  if (extra !== undefined) {
    for (const [key, value] of Object.entries(extra)) env[key] = value
  }
  return env
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeLanguage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().toLowerCase()
  if (trimmed === '' || trimmed.length > 64) return undefined
  return trimmed
}

function normalizeDialect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed.slice(0, 64)
}

function normalizeDependencies(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const deps: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed !== '' && trimmed.length <= 200 && !deps.includes(trimmed)) deps.push(trimmed)
  }
  return deps
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/gu, '-').slice(0, 48)
}

/** Structural validation for a resource envelope read from a declaration. */
function isDeclaredResourceEnvelope(value: unknown): value is DeclaredResourceEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  for (const key of ['memoryMb', 'runtimeMs', 'datasetMb', 'modelParameters']) {
    const entry = record[key]
    if (entry !== undefined && (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0)) return false
  }
  if (record.gpu !== undefined && typeof record.gpu !== 'boolean') return false
  if (record.description !== undefined && typeof record.description !== 'string') return false
  return true
}

/** A runtime found on PATH, with the version read from a real probe. */
interface ExtendedProbeResult {
  readonly available: boolean
  readonly executable?: string
  readonly version?: string
  readonly note?: string
}

interface PreparationContext {
  readonly id: EnvironmentId
  readonly language: string
  readonly dialect?: string
  readonly dependencies: readonly string[]
  readonly courseId?: EnvironmentRecord['courseId']
  readonly conceptIds?: EnvironmentRecord['conceptIds']
  readonly timeoutMs: number
  readonly controller: AbortController
  readonly onProgress?: (event: PreparationProgress) => void
}

interface ActivePreparation {
  readonly environmentId: EnvironmentId
  readonly controller: AbortController
  readonly promise: Promise<EnvironmentRecord>
}

/** Mutable state of one extended-language run. */
interface ExtendedRunState {
  readonly id: RunId
  readonly request: RunRequest
  readonly environment: EnvironmentRecord
  readonly startedAt: string
  readonly limits: ExperimentRun['limits']
  status: ExperimentRun['status']
  stdout: string
  stderr: string
  exitCode?: number
  durationMs?: number
  endedAt?: string
  checks?: ExperimentRun['checks']
  verification: ExperimentRun['verification']
  resourceNote?: string
}

interface ActiveExtendedRun {
  readonly runId: RunId
  readonly controller: AbortController
  readonly promise: Promise<ExperimentRun>
  snapshot: ExperimentRun
}

/** Build the public run record from mutable state. */
function toRunRecord(state: ExtendedRunState): ExperimentRun {
  return {
    id: state.id,
    environmentId: state.environment.id,
    language: state.request.language,
    ...(state.request.dialect !== undefined ? { dialect: state.request.dialect } : {}),
    code: state.request.code,
    ...(state.request.stdin !== undefined ? { stdin: state.request.stdin } : {}),
    ...(state.request.sessionId !== undefined ? { sessionId: state.request.sessionId } : {}),
    ...(state.request.courseId !== undefined ? { courseId: state.request.courseId } : {}),
    ...(state.request.activityId !== undefined ? { activityId: state.request.activityId } : {}),
    ...(state.request.activityRevision !== undefined ? { activityRevision: state.request.activityRevision } : {}),
    startedAt: state.startedAt,
    ...(state.endedAt !== undefined ? { endedAt: state.endedAt } : {}),
    status: state.status,
    stdout: state.stdout,
    stderr: state.stderr,
    ...(state.exitCode !== undefined ? { exitCode: state.exitCode } : {}),
    ...(state.durationMs !== undefined ? { durationMs: state.durationMs } : {}),
    ...(state.checks !== undefined ? { checks: state.checks } : {}),
    verification: state.verification,
    limits: state.limits,
    ...(state.resourceNote !== undefined ? { resourceNote: state.resourceNote } : {}),
  }
}

/** Map raw outcome facts to the contract run status. */
function runStatusOf(outcome: {
  cancelled: boolean
  timedOut: boolean
  spawnError?: string
  exitCode?: number
}): ExperimentRun['status'] {
  if (outcome.cancelled) return 'cancelled'
  if (outcome.timedOut) return 'timed-out'
  if (outcome.spawnError !== undefined) return 'failed'
  return outcome.exitCode === 0 ? 'succeeded' : 'failed'
}

/** Objective checks against captured output; same semantics as the builtin runner. */
function evaluateChecks(
  checks: NonNullable<RunRequest['checks']>,
  status: ExperimentRun['status'],
  stdout: string,
  exitCode: number | undefined,
): NonNullable<ExperimentRun['checks']> {
  const completed = status === 'succeeded' || status === 'failed'
  return checks.map((check) => {
    if (!completed) {
      return { name: check.name, type: check.type, status: 'not-run' as const, detail: '运行未正常结束，未执行检查' }
    }
    if (check.type === 'stdout-contains') {
      const pass = stdout.includes(String(check.value))
      return {
        name: check.name,
        type: check.type,
        status: pass ? 'pass' as const : 'fail' as const,
        ...(pass ? {} : { detail: `stdout 中未找到 ${JSON.stringify(String(check.value))}` }),
      }
    }
    if (check.type === 'stdout-equals') {
      const actual = stdout.replace(/\r\n/gu, '\n').trimEnd()
      const expected = String(check.value).replace(/\r\n/gu, '\n').trimEnd()
      const pass = actual === expected
      return {
        name: check.name,
        type: check.type,
        status: pass ? 'pass' as const : 'fail' as const,
        ...(pass ? {} : { detail: `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual.slice(0, 400))}` }),
      }
    }
    const pass = exitCode === Number(check.value)
    return {
      name: check.name,
      type: check.type,
      status: pass ? 'pass' as const : 'fail' as const,
      ...(pass ? {} : { detail: `期望退出码 ${String(check.value)}，实际 ${String(exitCode ?? '无')}` }),
    }
  })
}

/** Verification level of a completed run. */
function verificationOf(
  checks: NonNullable<RunRequest['checks']>,
  status: ExperimentRun['status'],
): ExperimentRun['verification'] {
  if (checks.length === 0) return status === 'succeeded' || status === 'failed' ? 'exploratory' : 'unverified'
  return status === 'succeeded' || status === 'failed' ? 'objective' : 'unverified'
}

/** Resolve a bare executable name through the real filesystem PATH. */
function findOnPath(name: string): string | undefined {
  if (name.includes('/') || name.includes('\\')) {
    if (!isAbsolute(name)) return undefined
    try {
      accessSync(name, constants.X_OK)
      return name
    } catch {
      return undefined
    }
  }
  const pathValue = process.env.PATH ?? ''
  for (const entry of pathValue.split(delimiter)) {
    if (entry === '') continue
    const candidate = join(entry, name)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // keep looking
    }
  }
  return undefined
}

function findOnPathEntries(names: readonly string[]): string | undefined {
  for (const name of names) {
    const found = findOnPath(name)
    if (found !== undefined) return found
  }
  return undefined
}

/** Generic approval for an extended runtime that is absent and has no catalog plan. */
function missingRuntimeApproval(language: string, label: string): EnvironmentApproval {
  return {
    kind: 'system-change',
    description: `本机未检测到 ${label} 运行时（${language}）。安装或下载运行时属于插件目录之外的改动，插件不会静默执行。`,
    impact: [
      '需要系统级包管理器或联网下载便携运行时，会占用全局路径/磁盘',
      '插件无法保证安装命令、版本与网络可用性',
    ],
    alternatives: [
      '改用 Python 或 JavaScript 完成同一教学目标',
      '学生自行安装/下载运行时后重新探测（不需要重装插件）',
      '若只需演示语法，可退化为逐行走查并明确标注“未真实运行”',
    ],
    requiresNetwork: true,
    executableByPlugin: false,
    note: '第一版不自动下载解释器，也不执行系统包管理器；不提供安装成功率保证。',
  }
}

/** Smoke program for a first-version language (math result is checked as 42). */
function builtinSmokeProgram(language: string): string {
  if (language === 'python') return 'print(21 * 2)\n'
  if (language === 'javascript') return 'console.log(21 * 2)\n'
  return '(display (* 21 2))\n(newline)\n'
}

/** Merge extra adapters over the built-in catalog (same language = override). */
function mergeAdapters(extra: readonly ExtendedLanguageSpec[] | undefined): readonly ExtendedLanguageSpec[] {
  if (extra === undefined || extra.length === 0) return EXTENDED_LANGUAGE_SPECS
  const overridden = new Set(extra.map(item => item.language))
  return [...extra, ...EXTENDED_LANGUAGE_SPECS.filter(item => !overridden.has(item.language))]
}

/** Merge extra install plans over the built-in catalog (same language = override). */
function mergeInstallPlans(extra: readonly SystemInstallPlanSpec[] | undefined): readonly SystemInstallPlanSpec[] {
  if (extra === undefined || extra.length === 0) return DEFAULT_INSTALL_PLANS
  const overridden = new Set(extra.map(item => item.language))
  return [...extra, ...DEFAULT_INSTALL_PLANS.filter(item => !overridden.has(item.language))]
}

/** One manager instance; created through {@link createEnvironmentManager}. */
class Manager implements EnvironmentManager {
  private readonly options: EnvironmentManagerOptions
  private readonly runners: RunnerRegistry
  private readonly store: EnvironmentStore
  private readonly logger: (event: string, details?: Record<string, unknown>) => void
  private readonly adapters: readonly ExtendedLanguageSpec[]
  private readonly installPlans: readonly SystemInstallPlanSpec[]
  private readonly executableOverrides: Readonly<Record<string, string>>
  private readonly host: HostFacts
  private readonly defaultTimeoutMs: number
  private readonly maxOutputBytes: number
  private readonly records = new Map<string, EnvironmentRecord>()
  private readonly preparing = new Map<string, ActivePreparation>()
  private readonly active = new Map<string, ActiveExtendedRun>()
  private readonly runs = new Map<string, ExperimentRun>()
  private readonly probeCache = new Map<string, ExtendedProbeResult>()
  private loadTask: Promise<void> | undefined
  private staleCleanupTask: Promise<StaleEnvironmentCleanupReport> | undefined
  private disposed = false

  constructor(options: EnvironmentManagerOptions) {
    this.options = options
    this.runners = options.runners
    this.store = new EnvironmentStore(resolve(options.dataDir), options.logger)
    this.logger = options.logger ?? (() => undefined)
    this.adapters = mergeAdapters(options.adapters)
    this.installPlans = mergeInstallPlans(options.installPlans)
    this.executableOverrides = options.executables ?? {}
    this.host = readHostFacts(options.hostFacts)
    this.defaultTimeoutMs = clamp(options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
    this.maxOutputBytes = clamp(options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES, 1024, MAX_OUTPUT_BYTES)
  }

  // ---- needs classification ---------------------------------------------

  async detectNeeds(declared: readonly DeclaredEnvironmentNeed[]): Promise<Result<readonly EnvironmentNeed[]>> {
    if (!Array.isArray(declared)) return err('invalid-input', 'needs 必须是数组')
    await this.ensureLoaded()
    const needs: EnvironmentNeed[] = []
    for (let index = 0; index < declared.length; index += 1) {
      const item = declared[index]
      if (item === undefined || typeof item !== 'object') return err('invalid-input', `第 ${index + 1} 项需求不是对象`)
      const language = normalizeLanguage(item.language)
      if (language === undefined) return err('invalid-input', `第 ${index + 1} 项需求缺少有效 language`)
      if (typeof item.reason !== 'string' || item.reason.trim() === '') {
        return err('invalid-input', `第 ${index + 1} 项需求缺少 reason`)
      }
      if (item.source !== 'course' && item.source !== 'material' && item.source !== 'activity' && item.source !== 'student') {
        return err('invalid-input', `第 ${index + 1} 项需求的 source 无效`)
      }
      if (item.dependencies !== undefined && !Array.isArray(item.dependencies)) {
        return err('invalid-input', `第 ${index + 1} 项需求的 dependencies 必须是数组`)
      }
      if (item.resources !== undefined && !isDeclaredResourceEnvelope(item.resources)) {
        return err('invalid-input', `第 ${index + 1} 项需求的 resources 无效`)
      }
      const dialect = normalizeDialect(item.dialect)
      const need = await this.classifyNeed({
        ...item,
        language,
        ...(dialect !== undefined ? { dialect } : {}),
        dependencies: normalizeDependencies(item.dependencies),
      }, index)
      if (item.resources !== undefined) {
        const assessment = this.assessResources({
          goal: item.reason,
          kind: item.experimentKind ?? 'other',
          language,
          declared: item.resources,
        })
        if (assessment.status !== 'fits') {
          needs.push({ ...need, resources: assessment })
          continue
        }
      }
      needs.push(need)
    }
    return ok(needs)
  }

  private async classifyNeed(declared: DeclaredEnvironmentNeed, index: number): Promise<EnvironmentNeed> {
    const language = declared.language
    const dialect = declared.dialect
    const base = {
      index,
      language,
      ...(dialect !== undefined ? { dialect } : {}),
      reason: declared.reason,
      source: declared.source,
      ...(declared.courseId !== undefined ? { courseId: declared.courseId } : {}),
      ...(declared.conceptIds !== undefined ? { conceptIds: declared.conceptIds } : {}),
      ...(declared.activityId !== undefined ? { activityId: declared.activityId } : {}),
    }
    const dependencies = normalizeDependencies(declared.dependencies)
    const ready = this.findReadyRecord(language, dialect)
      ?? (this.isBuiltin(language) ? this.runners.getEnvironment(language, dialect) : undefined)
    if (ready !== undefined && ready.status === 'ready') {
      return {
        ...base,
        status: 'available',
        nextAction: 'use-existing',
        detail: `已有可用的持久化环境记录（${ready.kind}，${ready.version ?? '版本未知'}）`,
        environmentId: ready.id,
        ...(ready.version !== undefined ? { version: ready.version } : {}),
        kind: ready.kind,
      }
    }
    if (this.isBuiltin(language)) {
      return { ...base, ...(await this.classifyBuiltin(language, dialect, dependencies)) }
    }
    const spec = findExtendedSpec(language, this.adapters)
    if (spec !== undefined) {
      if (dependencies.length > 0) {
        const probe = await this.probeExtended(spec)
        if (!probe.available) {
          const plan = findInstallPlan(language, this.installPlans)
          return {
            ...base,
            status: 'needs-approval',
            nextAction: 'request-approval',
            detail: `运行时缺失（${spec.label} 未在宿主 PATH 中探测到），且声明了第三方依赖：${dependencies.join('、')}`,
            approval: plan?.approval ?? missingRuntimeApproval(language, spec.label),
          }
        }
        return {
          ...base,
          status: 'needs-approval',
          nextAction: 'request-approval',
          detail: `运行时可用（${spec.label} ${probe.version ?? '版本未知'}），但第三方依赖需要联网安装到独立目录`,
          ...(probe.version !== undefined ? { version: probe.version } : {}),
          kind: 'managed',
          approval: networkInstallApproval(language, dependencies),
        }
      }
      const probe = await this.probeExtended(spec)
      if (!probe.available) {
        const plan = findInstallPlan(language, this.installPlans)
        return {
          ...base,
          status: 'needs-approval',
          nextAction: 'request-approval',
          detail: `未在宿主 PATH 探测到 ${spec.label} 运行时（已尝试 ${spec.executables.join('、')}）`,
          approval: plan?.approval ?? missingRuntimeApproval(language, spec.label),
        }
      }
      return {
        ...base,
        status: 'available',
        nextAction: 'prepare',
        detail: `${spec.label} ${probe.version ?? '版本未知'}（真实探测）；prepare 会在插件数据目录创建独立运行目录（${spec.isolationNote ?? '依赖/缓存隔离'}），不写系统依赖`,
        ...(probe.version !== undefined ? { version: probe.version } : {}),
        kind: 'managed',
      }
    }
    const plan = findInstallPlan(language, this.installPlans)
    if (plan !== undefined) {
      const found = findOnPathEntries(plan.executables)
      if (found !== undefined) {
        return {
          ...base,
          status: 'unsupported',
          nextAction: 'none',
          detail: `已检测到 ${plan.label} 工具链（${found}），但第一版没有该语言的运行适配器；不会猜测运行方式`,
        }
      }
      return {
        ...base,
        status: 'needs-approval',
        nextAction: 'request-approval',
        detail: `未在宿主 PATH 检测到 ${plan.label}；安装属于系统级改动，插件不会执行`,
        approval: plan.approval,
      }
    }
    return {
      ...base,
      status: 'unsupported',
      nextAction: 'none',
      detail: `插件没有 ${language} 的适配器，也没有已登记的独立安装方案；不会猜测环境或静默安装`,
    }
  }

  private async classifyBuiltin(
    language: string,
    dialect: string | undefined,
    dependencies: readonly string[],
  ): Promise<Pick<EnvironmentNeed, 'status' | 'nextAction' | 'detail' | 'approval' | 'version' | 'kind'>> {
    const probe: EnvironmentProbe = await this.runners.probe(language, dialect)
    const label = BUILTIN_LABELS[language] ?? language
    if (!probe.available) {
      if (language === 'scheme') {
        return {
          status: 'needs-approval',
          nextAction: 'request-approval',
          detail: probe.missingReason ?? 'Scheme 解释器依赖缺失',
          approval: pluginRepairApproval(language, probe.missingReason ?? 'Scheme 解释器依赖（biwascheme）缺失'),
        }
      }
      return {
        status: 'needs-approval',
        nextAction: 'request-approval',
        detail: probe.missingReason ?? `${label} 运行时缺失`,
        approval: systemRuntimeApproval(language, probe.missingReason ?? `${label} 运行时缺失`),
      }
    }
    if (dependencies.length > 0) {
      return {
        status: 'needs-approval',
        nextAction: 'request-approval',
        detail: `运行时可用（${label} ${probe.version ?? '版本未知'}），但声明的第三方依赖需要联网安装到独立 venv`,
        ...(probe.version !== undefined ? { version: probe.version } : {}),
        kind: 'virtualenv',
        approval: networkInstallApproval(language, dependencies),
      }
    }
    const isolationNote = language === 'python'
      ? '；运行器以 -I 隔离模式启动，忽略 PYTHON* 与用户 site-packages'
      : language === 'javascript'
        ? '；使用宿主/系统 Node，无第三方依赖'
        : '；biwascheme 为插件 npm 依赖（与宿主共享 node_modules），解释器在独立子进程运行'
    return {
      status: 'available',
      nextAction: 'prepare',
      detail: `${label} ${probe.version ?? '版本未知'}（真实探测）${isolationNote}`,
      ...(probe.version !== undefined ? { version: probe.version } : {}),
      kind: 'system',
    }
  }

  // ---- preparation -------------------------------------------------------

  async prepare(
    request: PrepareEnvironmentRequest,
    options: PrepareEnvironmentOptions = {},
  ): Promise<Result<EnvironmentRecord>> {
    if (this.disposed) return err('failed', '环境管理器已关闭')
    const language = normalizeLanguage(request.language)
    if (language === undefined) return err('invalid-input', 'language 必须是非空字符串（≤64 字符）')
    if (request.conceptIds !== undefined && !Array.isArray(request.conceptIds)) {
      return err('invalid-input', 'conceptIds 必须是数组')
    }
    await this.ensureLoaded()
    await this.ensureStaleCleaned()
    const dialect = normalizeDialect(request.dialect)
    const dependencies = normalizeDependencies(request.dependencies)
    const timeoutMs = clamp(request.timeoutMs ?? this.defaultTimeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
    // Venv mode is a distinct isolation fact: do not reuse a system record for it.
    const existing = this.findReadyRecord(language, dialect)
    const modeSatisfied = existing !== undefined
      && (request.mode !== 'venv' || existing.kind === 'virtualenv')
    if (existing !== undefined && modeSatisfied) return ok(existing)
    const id = newEnvironmentId()
    const controller = new AbortController()
    const externalAbort = (): void => controller.abort()
    if (options.signal !== undefined) {
      if (options.signal.aborted) controller.abort()
      else options.signal.addEventListener('abort', externalAbort, { once: true })
    }
    const context: PreparationContext = {
      id,
      language,
      ...(dialect !== undefined ? { dialect } : {}),
      dependencies,
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.conceptIds !== undefined ? { conceptIds: request.conceptIds } : {}),
      timeoutMs,
      controller,
      ...(options.onProgress !== undefined ? { onProgress: options.onProgress } : {}),
    }
    const promise = this.prepareCore(context, request, options)
    this.preparing.set(id, { environmentId: id, controller, promise })
    try {
      return ok(await promise)
    } catch (error) {
      this.logger('environments.prepare-error', { language, message: (error as Error).message })
      return err('failed', '环境准备失败', { details: { message: (error as Error).message }, retryable: false })
    } finally {
      if (options.signal !== undefined) options.signal.removeEventListener('abort', externalAbort)
      this.preparing.delete(id)
    }
  }

  private async prepareCore(
    context: PreparationContext,
    request: PrepareEnvironmentRequest,
    options: PrepareEnvironmentOptions,
  ): Promise<EnvironmentRecord> {
    const need = await this.classifyNeed({
      language: context.language,
      ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
      reason: '准备请求',
      source: 'student',
      dependencies: context.dependencies,
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.conceptIds !== undefined ? { conceptIds: request.conceptIds } : {}),
    }, 0)
    const kind: EnvironmentRecord['kind'] = this.isBuiltin(context.language)
      ? (context.language === 'python' && request.mode === 'venv' ? 'virtualenv' : 'system')
      : 'managed'
    const placeholder = this.placeholderRecord(context, kind)
    this.remember(placeholder)
    await this.persistRecords()
    this.emitProgress(context, 'probe', placeholder, need.detail)
    if (context.controller.signal.aborted) {
      return await this.finalizeCancelled(context, placeholder, '准备在探测阶段被取消', undefined)
    }
    if (need.status === 'unsupported') {
      this.records.delete(placeholder.id)
      const record = this.unsupportedRecord(context, need.detail, kind)
      this.remember(record)
      await this.persistRecords()
      this.emitProgress(context, 'done', record, '环境不受支持，未做任何安装')
      return record
    }
    if (need.status === 'needs-approval') {
      const approval = need.approval ?? missingRuntimeApproval(context.language, context.language)
      if (options.approveSystemChange !== true) {
        this.records.delete(placeholder.id)
        const existingApproval = this.findRecordByStatus(context.language, context.dialect, 'needs-approval')
        if (existingApproval !== undefined) {
          await this.persistRecords()
          this.emitProgress(context, 'approval', existingApproval, '复用已存在的待确认记录，未执行任何安装')
          this.emitProgress(context, 'done', existingApproval, '等待学生确认')
          return existingApproval
        }
        const record = this.approvalRecord(context, approval, kind)
        this.remember(record)
        await this.persistRecords()
        this.emitProgress(context, 'approval', record, '需要学生确认，未执行任何安装')
        this.emitProgress(context, 'done', record, '等待学生确认')
        return record
      }
      this.emitProgress(context, 'approval', placeholder, '学生已确认；检查是否有受控执行器')
      const executor = this.options.systemChangeExecutor
      if (approval.kind !== 'system-change' || executor === undefined) {
        this.records.delete(placeholder.id)
        const record = this.approvalRecord(context, approval, kind, {
          note: executor === undefined
            ? '插件未配置系统级安装执行器，不会执行；请按说明自行完成安装后重试。'
            : '第一版不会自动执行联网依赖安装；请按说明处理后重试。',
        })
        this.remember(record)
        await this.persistRecords()
        this.emitProgress(context, 'done', record, '未执行安装；等待学生按说明处理')
        return record
      }
      const execution = await this.awaitCancellable(
        executor(approval, {
          language: context.language,
          timeoutMs: SYSTEM_CHANGE_TIMEOUT_MS,
          signal: context.controller.signal,
        }).catch((error: unknown) => ({ ok: false, message: (error as Error).message })),
        context.controller.signal,
      )
      if (execution.cancelled) {
        return await this.finalizeCancelled(context, placeholder, '系统级改动执行期间取消', undefined)
      }
      if (!execution.value.ok) {
        return await this.finalizeFailure(context, placeholder, 'system-change-failed',
          `已确认的系统级改动失败：${execution.value.message}`, undefined, 'not-needed')
      }
      this.probeCache.delete(context.language)
      const refreshed = await this.classifyNeed({
        language: context.language,
        ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
        reason: '准备请求（确认后重新探测）',
        source: 'student',
        dependencies: context.dependencies,
      }, 0)
      if (refreshed.status === 'unsupported') {
        return await this.finalizeFailure(context, placeholder, 'unsupported-after-change',
          `系统级改动已执行（${execution.value.message}），但插件仍没有该语言的运行适配器：${refreshed.detail}`,
          undefined, 'not-needed')
      }
      if (refreshed.status === 'needs-approval') {
        return await this.finalizeFailure(context, placeholder, 'system-change-unsatisfied',
          `系统级改动返回成功（${execution.value.message}），但重新探测仍不可用：${refreshed.detail}`,
          undefined, 'not-needed')
      }
      return await this.finishPreparation(context, request, kind)
    }
    return await this.finishPreparation(context, request, kind)
  }

  private async finishPreparation(
    context: PreparationContext,
    request: PrepareEnvironmentRequest,
    kind: EnvironmentRecord['kind'],
  ): Promise<EnvironmentRecord> {
    const spec = findExtendedSpec(context.language, this.adapters)
    if (spec !== undefined && !this.isBuiltin(context.language)) {
      return await this.prepareExtended(context, spec)
    }
    return await this.prepareBuiltin(context, request, kind)
  }

  /** Delegate to the frozen registry; its preparation cannot be interrupted mid-flight. */
  private async prepareBuiltin(
    context: PreparationContext,
    request: PrepareEnvironmentRequest,
    kind: EnvironmentRecord['kind'],
  ): Promise<EnvironmentRecord> {
    const input: PrepareEnvironmentInput = {
      language: context.language,
      ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.conceptIds !== undefined ? { conceptIds: request.conceptIds } : {}),
      timeoutMs: context.timeoutMs,
      ...(request.mode !== undefined && context.language === 'python' ? { mode: request.mode } : {}),
    }
    const placeholder = this.findPlaceholder(context.id) ?? this.placeholderRecord(context, kind)
    this.emitProgress(context, 'prepare', placeholder, '委托内置运行器准备环境')
    const pending = this.runners.prepare(input)
    const raced = await this.awaitCancellable(pending, context.controller.signal)
    if (raced.cancelled) {
      // The registry has no cancellation seam: let it finish in the background,
      // but never report unfinished work as ready. A ready result is persisted
      // so a later directory refresh can show it.
      void pending.then(async (record) => {
        if (record.status === 'ready') {
          this.remember(record)
          await this.persistRecords()
          this.logger('environments.late-builtin-ready', { language: context.language, environmentId: record.id })
        }
      }).catch(() => undefined)
      return await this.finalizeCancelled(context, placeholder,
        '内置运行器不支持中断准备：已取消等待，底层准备可能继续；若随后成功，刷新环境列表可见', undefined)
    }
    this.records.delete(placeholder.id)
    this.remember(raced.value)
    await this.persistRecords()
    this.emitProgress(context, 'smoke', raced.value,
      raced.value.status === 'ready' ? `冒烟检查由运行器探测完成：${raced.value.version ?? '版本未知'}` : '环境不可用')
    this.emitProgress(context, 'done', raced.value,
      raced.value.status === 'ready' ? '环境已就绪' : `环境状态：${raced.value.status}`)
    return raced.value
  }

  /** Prepare an extended runtime inside its own managed directory. */
  private async prepareExtended(context: PreparationContext, spec: ExtendedLanguageSpec): Promise<EnvironmentRecord> {
    const placeholder = this.findPlaceholder(context.id) ?? this.placeholderRecord(context, 'managed')
    if (context.controller.signal.aborted) {
      return await this.finalizeCancelled(context, placeholder, '准备在创建目录前取消', undefined)
    }
    await this.store.ensureLayout()
    const managedDir = join(this.store.managedRoot, `${sanitizeSegment(spec.language)}-${context.id}`)
    const probe = await this.probeExtended(spec)
    if (!probe.available || probe.executable === undefined) {
      return await this.finalizeFailure(context, placeholder, 'probe-lost',
        `准备期间再次探测 ${spec.label} 失败（运行时可能被移除）`, undefined, 'not-needed')
    }
    const base: EnvironmentRecord = {
      ...placeholder,
      isolation: {
        dependencies: 'isolated',
        path: managedDir,
        note: spec.isolationNote ?? '依赖/缓存位于插件数据目录，不写系统依赖',
      },
      execution: {
        mode: 'process',
        executable: probe.executable,
        args: [...spec.runArgs],
        timeoutMs: context.timeoutMs,
        cancellable: true,
        network: spec.network ?? 'unknown',
        confinement: spec.confinementNote ?? '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
      },
      updatedAt: nowIso(),
    }
    this.remember(base)
    await this.persistRecords()
    this.emitProgress(context, 'prepare', base, `创建独立运行目录 ${managedDir}`)
    try {
      await mkdir(join(managedDir, 'work'), { recursive: true })
      for (const dir of spec.prepareDirs ?? []) await mkdir(join(managedDir, dir), { recursive: true })
    } catch (error) {
      return await this.finalizeFailure(context, base, 'prepare-failed',
        `创建独立目录失败：${(error as Error).message}`, managedDir, undefined)
    }
    const smokeFile = `smoke.${spec.scriptExtension}`
    try {
      await writeFile(join(managedDir, 'work', smokeFile), spec.smokeProgram, 'utf8')
    } catch (error) {
      return await this.finalizeFailure(context, base, 'prepare-failed',
        `写入冒烟程序失败：${(error as Error).message}`, managedDir, undefined)
    }
    this.emitProgress(context, 'smoke', base,
      `运行真实冒烟程序（期望输出 ${JSON.stringify(spec.expectedSmokeStdout)}）`)
    const outcome = await runProcess({
      command: probe.executable,
      args: [...spec.runArgs, smokeFile],
      cwd: join(managedDir, 'work'),
      env: childEnv(spec.isolationEnv?.(managedDir)),
      timeoutMs: Math.min(SMOKE_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, context.timeoutMs)),
      maxOutputBytes: this.maxOutputBytes,
      signal: context.controller.signal,
    })
    if (outcome.cancelled) {
      return await this.finalizeCancelled(context, base, '冒烟验证期间取消', managedDir)
    }
    if (outcome.spawnError !== undefined) {
      return await this.finalizeFailure(context, base, 'smoke-failed',
        `无法启动 ${spec.label}：${outcome.spawnError}`, managedDir, undefined, outcome.stderr)
    }
    if (outcome.timedOut) {
      return await this.finalizeFailure(context, base, 'smoke-failed',
        `冒烟程序超时（${String(Math.min(SMOKE_TIMEOUT_MS, context.timeoutMs))}ms）`, managedDir, undefined, outcome.stderr)
    }
    if (outcome.exitCode !== 0 || !outcome.stdout.includes(spec.expectedSmokeStdout)) {
      return await this.finalizeFailure(context, base, 'smoke-failed',
        `冒烟输出不符合预期：退出码 ${String(outcome.exitCode ?? '无')}，期望 stdout 包含 ${JSON.stringify(spec.expectedSmokeStdout)}`,
        managedDir, undefined, `${outcome.stdout}${outcome.stderr}`)
    }
    const record: EnvironmentRecord = {
      ...base,
      status: 'ready',
      ...(probe.version !== undefined ? { version: probe.version } : {}),
      updatedAt: nowIso(),
    }
    this.remember(record)
    await this.persistRecords()
    this.emitProgress(context, 'done', record,
      `环境已就绪（${spec.label} ${probe.version ?? '版本未知'}），冒烟输出已验证`)
    return record
  }

  private placeholderRecord(context: PreparationContext, kind: EnvironmentRecord['kind']): EnvironmentRecord {
    const now = nowIso()
    return {
      id: context.id,
      language: context.language,
      ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
      kind,
      status: 'preparing',
      isolation: { dependencies: kind === 'system' ? 'none' : 'isolated', note: '准备中，尚未完成' },
      execution: {
        mode: 'process',
        timeoutMs: context.timeoutMs,
        cancellable: true,
        network: 'unknown',
        confinement: '准备中；尚未启动实验进程',
      },
      ...(context.courseId !== undefined ? { courseId: context.courseId } : {}),
      ...(context.conceptIds !== undefined ? { conceptIds: context.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
    }
  }

  private approvalRecord(
    context: PreparationContext,
    approval: EnvironmentApproval,
    kind: EnvironmentRecord['kind'],
    extra: { note?: string } = {},
  ): EnvironmentRecord {
    const now = nowIso()
    const label = BUILTIN_LABELS[context.language] ?? context.language
    return {
      id: context.id,
      language: context.language,
      ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
      kind,
      status: 'needs-approval',
      isolation: {
        dependencies: kind === 'managed' ? 'isolated' : 'none',
        note: extra.note ?? '未创建任何插件或系统目录；环境未就绪',
      },
      execution: {
        mode: 'process',
        timeoutMs: context.timeoutMs,
        cancellable: false,
        network: 'unknown',
        confinement: '环境未就绪，未启动进程',
      },
      systemChange: { required: true, description: approval.description },
      fallback: {
        description: `${label} 环境需要学生确认后才能使用：${approval.description}`,
        knownDifferences: [
          ...approval.impact,
          ...approval.alternatives.map(item => `替代方案：${item}`),
          ...(approval.commandPreview !== undefined ? [`建议命令（插件不会执行）：${approval.commandPreview}`] : []),
        ],
      },
      ...(context.courseId !== undefined ? { courseId: context.courseId } : {}),
      ...(context.conceptIds !== undefined ? { conceptIds: context.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
    }
  }

  private unsupportedRecord(context: PreparationContext, detail: string, kind: EnvironmentRecord['kind']): EnvironmentRecord {
    const now = nowIso()
    return {
      id: context.id,
      language: context.language,
      ...(context.dialect !== undefined ? { dialect: context.dialect } : {}),
      kind,
      status: 'missing',
      isolation: { dependencies: 'none', note: '未创建任何目录' },
      execution: {
        mode: 'process',
        timeoutMs: context.timeoutMs,
        cancellable: false,
        network: 'unknown',
        confinement: '环境不受支持，未启动进程',
      },
      failure: { message: detail, code: 'unsupported', cleanup: 'not-needed' },
      fallback: {
        description: `该环境不受支持：${detail}`,
        knownDifferences: [
          '实验未真实运行，不能提供真实 stdout 与退出码。',
          '插件不会猜测安装方式或静默安装；可改用已支持的语言完成等价教学。',
        ],
      },
      ...(context.courseId !== undefined ? { courseId: context.courseId } : {}),
      ...(context.conceptIds !== undefined ? { conceptIds: context.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
    }
  }

  private async finalizeFailure(
    context: PreparationContext,
    base: EnvironmentRecord,
    code: string,
    message: string,
    cleanupTarget: string | undefined,
    cleanupOverride: CleanupStatus | undefined,
    stderrSample?: string,
  ): Promise<EnvironmentRecord> {
    const cleaned = cleanupOverride !== undefined
      ? { cleanup: cleanupOverride, note: undefined as string | undefined }
      : await this.cleanupDirectory(cleanupTarget)
    const record: EnvironmentRecord = {
      ...base,
      status: 'failed',
      failure: {
        message,
        code,
        cleanup: cleaned.cleanup,
        ...(cleaned.note !== undefined ? { cleanupNote: cleaned.note } : {}),
      },
      fallback: {
        description: `${base.language} 环境准备失败：${message}`,
        knownDifferences: [
          '实验不会真实运行，不能提供真实输出。',
          `未完成目录清理状态：${cleaned.cleanup}。`,
          ...(stderrSample !== undefined && stderrSample.trim() !== ''
            ? [`准备输出：${stderrSample.slice(0, 300)}`]
            : []),
          '其他已就绪的环境不受影响；可修正问题后重试。',
        ],
      },
      updatedAt: nowIso(),
    }
    this.remember(record)
    await this.persistRecords()
    this.emitProgress(context, 'done', record, `准备失败（${code}）：${message}`)
    return record
  }

  private async finalizeCancelled(
    context: PreparationContext,
    base: EnvironmentRecord,
    message: string,
    cleanupTarget: string | undefined,
  ): Promise<EnvironmentRecord> {
    const cleaned = await this.cleanupDirectory(cleanupTarget)
    const record: EnvironmentRecord = {
      ...base,
      status: 'failed',
      failure: {
        message: `准备已取消：${message}`,
        code: 'cancelled',
        cleanup: cleaned.cleanup,
        ...(cleaned.note !== undefined ? { cleanupNote: cleaned.note } : {}),
      },
      fallback: {
        description: `准备已取消（${message}）。未完成的目录已按状态清理；之前已就绪的环境不受影响。`,
        knownDifferences: [
          '环境未就绪，实验不会运行。',
          `清理状态：${cleaned.cleanup}。`,
          '重新发起准备会创建新的环境记录，不会复用未完成目录。',
        ],
      },
      updatedAt: nowIso(),
    }
    this.remember(record)
    await this.persistRecords()
    this.emitProgress(context, 'done', record, `准备已取消（清理：${cleaned.cleanup}）`)
    return record
  }

  /** Remove a managed directory and report the truthful cleanup status. */
  private async cleanupDirectory(
    path: string | undefined,
  ): Promise<{ cleanup: CleanupStatus; note?: string }> {
    if (path === undefined) return { cleanup: 'not-needed' }
    if (!this.isInsideManagedRoot(path)) {
      return { cleanup: 'failed', note: `拒绝清理非插件管理目录：${path}` }
    }
    if (!existsSync(path)) return { cleanup: 'not-needed' }
    try {
      await rm(path, { recursive: true, force: true })
    } catch (error) {
      return { cleanup: 'failed', note: `清理失败：${(error as Error).message}` }
    }
    if (!existsSync(path)) return { cleanup: 'cleaned' }
    try {
      const left = await readdir(path)
      return left.length === 0
        ? { cleanup: 'cleaned' }
        : { cleanup: 'partial', note: `仍残留 ${String(left.length)} 个条目` }
    } catch (error) {
      return { cleanup: 'partial', note: (error as Error).message }
    }
  }

  private isInsideManagedRoot(path: string): boolean {
    const root = resolve(this.store.managedRoot)
    const target = resolve(path)
    return target !== root && target.startsWith(`${root}${sep}`)
  }

  // ---- probing -----------------------------------------------------------

  private isBuiltin(language: string): boolean {
    return SUPPORTED_LANGUAGES.some(item => item.language === language)
  }

  private async probeExtended(spec: ExtendedLanguageSpec): Promise<ExtendedProbeResult> {
    const cached = this.probeCache.get(spec.language)
    if (cached !== undefined) return cached
    const override = this.executableOverrides[spec.language]
    const candidates: string[] = []
    if (override !== undefined && override.trim() !== '') candidates.push(override.trim())
    for (const name of spec.executables) if (!candidates.includes(name)) candidates.push(name)
    let result: ExtendedProbeResult = {
      available: false,
      note: `未找到可执行文件（尝试：${candidates.join('、')}）`,
    }
    for (const candidate of candidates) {
      const outcome = await runProcess({
        command: candidate,
        args: [...spec.versionArgs],
        env: childEnv(),
        timeoutMs: PROBE_TIMEOUT_MS,
        maxOutputBytes: 64 * 1024,
      })
      if (outcome.spawnError !== undefined || outcome.timedOut) continue
      const version = spec.parseVersion(`${outcome.stdout}\n${outcome.stderr}`)
      if (version === undefined || version === '') continue
      result = {
        available: true,
        executable: candidate,
        version,
        note: `真实探测：${candidate} ${spec.versionArgs.join(' ')} → ${version}`,
      }
      break
    }
    this.probeCache.set(spec.language, result)
    return result
  }

  private findPlaceholder(id: EnvironmentId): EnvironmentRecord | undefined {
    const record = this.records.get(id)
    return record?.status === 'preparing' ? record : undefined
  }

  private emitProgress(
    context: PreparationContext,
    phase: PreparationProgress['phase'],
    record: EnvironmentRecord,
    detail?: string,
  ): void {
    if (context.onProgress === undefined) return
    try {
      context.onProgress({ phase, record, ...(detail !== undefined ? { detail } : {}) })
    } catch (error) {
      this.logger('environments.progress-callback-error', { message: (error as Error).message })
    }
  }

  // ---- smoke / run -------------------------------------------------------

  async smoke(environmentId: EnvironmentId, options: EnvironmentRunOptions = {}): Promise<Result<ExperimentRun>> {
    await this.ensureLoaded()
    const record = this.records.get(environmentId)
    if (record === undefined) return err('not-found', '未找到该环境记录；请先准备环境')
    if (record.status !== 'ready') {
      return err('capability-missing', `环境状态为 ${record.status}，不能运行冒烟检查`)
    }
    const language = record.language
    const spec = findExtendedSpec(language, this.adapters)
    const code = this.isBuiltin(language) ? builtinSmokeProgram(language) : spec?.smokeProgram
    if (code === undefined) return err('capability-missing', `没有 ${language} 的冒烟程序`)
    const run = await this.run({
      language,
      ...(record.dialect !== undefined ? { dialect: record.dialect } : {}),
      code,
      timeoutMs: SMOKE_TIMEOUT_MS,
      checks: [
        { name: '冒烟输出', type: 'stdout-contains', value: '42' },
        { name: '退出码', type: 'exit-code', value: 0 },
      ],
    }, options)
    return ok(run)
  }

  async run(request: RunRequest, options: EnvironmentRunOptions = {}): Promise<ExperimentRun> {
    const language = normalizeLanguage(request.language) ?? ''
    if (this.isBuiltin(language)) {
      const runnerOptions = {
        ...(options.signal !== undefined ? { signal: options.signal } : {}),
        ...(options.onOutput !== undefined ? { onOutput: options.onOutput } : {}),
        ...(options.timeoutMs !== undefined ? { limits: { timeoutMs: options.timeoutMs } } : {}),
      }
      return await this.runners.run(request, runnerOptions)
    }
    await this.ensureLoaded()
    const spec = findExtendedSpec(language, this.adapters)
    if (spec === undefined) {
      return this.failedRunRequest(request,
        `暂不支持的语言：${request.language}。内置支持 Python/JavaScript/Scheme；扩展适配器为 ${this.adapters.map(item => item.language).join('/')}。`)
    }
    const dialect = normalizeDialect(request.dialect)
    const environment = this.findReadyRecord(language, dialect)
    if (environment === undefined) {
      return this.failedRunRequest(request,
        `扩展环境 ${spec.label} 尚未准备；请先调用 environments.prepare 完成探测与冒烟。`)
    }
    if (this.active.size >= MAX_CONCURRENT_RUNS) {
      return this.failedRunRequest(request,
        `同时运行数量已达上限（${String(MAX_CONCURRENT_RUNS)}）；请等待当前实验结束或取消后再试。`)
    }
    const timeoutMs = clamp(
      request.timeoutMs ?? options.timeoutMs ?? this.defaultTimeoutMs,
      MIN_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    )
    const runId = newRunId()
    const controller = new AbortController()
    const externalAbort = (): void => controller.abort()
    if (options.signal !== undefined) {
      if (options.signal.aborted) controller.abort()
      else options.signal.addEventListener('abort', externalAbort, { once: true })
    }
    const state: ExtendedRunState = {
      id: runId,
      request,
      environment,
      startedAt: nowIso(),
      status: 'running',
      stdout: '',
      stderr: '',
      verification: 'unverified',
      limits: { timeoutMs },
    }
    const promise = this.executeExtendedRun(state, spec, timeoutMs, controller.signal, options)
      .catch((error: unknown): ExperimentRun => {
        state.status = 'failed'
        state.stderr = `${state.stderr}${state.stderr === '' ? '' : '\n'}扩展运行器内部错误：${(error as Error).message}`
        state.endedAt = nowIso()
        return toRunRecord(state)
      })
      .then((record) => {
        this.rememberRun(record)
        return record
      })
      .finally(() => {
        if (options.signal !== undefined) options.signal.removeEventListener('abort', externalAbort)
        this.active.delete(runId)
      })
    this.active.set(runId, {
      runId,
      controller,
      promise,
      snapshot: toRunRecord(state),
    })
    return promise
  }

  private async executeExtendedRun(
    state: ExtendedRunState,
    spec: ExtendedLanguageSpec,
    timeoutMs: number,
    signal: AbortSignal,
    options: EnvironmentRunOptions,
  ): Promise<ExperimentRun> {
    const managedDir = state.environment.isolation.path
    if (managedDir === undefined || !existsSync(managedDir)) {
      state.status = 'failed'
      state.stderr = '扩展环境目录不存在（可能已被清理）；请重新准备环境。\n'
      state.endedAt = nowIso()
      state.resourceNote = '运行未开始，未产生真实输出。'
      return toRunRecord(state)
    }
    await this.store.ensureLayout()
    const runDir = await mkdtemp(join(this.store.tmpRoot, `run-${state.id}-`))
    let outcome: Awaited<ReturnType<typeof runProcess>> | undefined
    let cleanupNote: string | undefined
    try {
      const fileName = `program.${spec.scriptExtension}`
      await writeFile(join(runDir, fileName), state.request.code, 'utf8')
      outcome = await runProcess({
        command: state.environment.execution.executable ?? spec.executables[0] ?? spec.language,
        args: [...spec.runArgs, fileName],
        cwd: runDir,
        env: childEnv(spec.isolationEnv?.(managedDir)),
        ...(state.request.stdin !== undefined ? { stdin: state.request.stdin } : {}),
        timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
        signal,
        ...(options.onOutput !== undefined ? { onChunk: options.onOutput } : {}),
      })
    } catch (error) {
      state.status = 'failed'
      state.stderr = `扩展运行器错误：${(error as Error).message}\n`
      state.endedAt = nowIso()
      return toRunRecord(state)
    } finally {
      try {
        await rm(runDir, { recursive: true, force: true })
      } catch (error) {
        cleanupNote = `临时目录清理失败：${(error as Error).message}`
      }
    }
    const observed = outcome ?? {
      stdout: '', stderr: '扩展运行器未产生结果', durationMs: 0,
      timedOut: false, cancelled: false, truncated: false,
    }
    state.status = runStatusOf(observed)
    state.stdout = observed.stdout
    state.stderr = `${observed.stderr}${observed.spawnError !== undefined ? `${observed.stderr === '' ? '' : '\n'}无法启动进程：${observed.spawnError}` : ''}`
    if (cleanupNote !== undefined) state.stderr = `${state.stderr}${state.stderr === '' ? '' : '\n'}[${cleanupNote}]`
    state.exitCode = observed.exitCode
    state.durationMs = observed.durationMs
    state.endedAt = nowIso()
    const checks = state.request.checks ?? []
    state.checks = evaluateChecks(checks, state.status, observed.stdout, observed.exitCode)
    state.verification = verificationOf(checks, state.status)
    const notes = [
      `扩展环境 ${spec.label}：依赖/缓存位于插件数据目录（${spec.isolationNote ?? '独立目录'}）；未做 CPU/内存配额隔离。`,
    ]
    if (observed.truncated) notes.push('输出超过上限，已截断显示。')
    state.resourceNote = notes.join(' ')
    return toRunRecord(state)
  }

  async cancelRun(runId: RunId): Promise<ExperimentRun | undefined> {
    const active = this.active.get(runId)
    if (active !== undefined) {
      active.controller.abort()
      try {
        return await active.promise
      } catch {
        return this.runs.get(runId)
      }
    }
    const builtin = await this.runners.cancel(runId)
    return builtin ?? this.runs.get(runId)
  }

  getRun(runId: RunId): ExperimentRun | undefined {
    return this.runs.get(runId) ?? this.runners.getRun(runId)
  }

  activeRuns(): readonly ExperimentRun[] {
    const extended = [...this.active.values()].map(entry => entry.snapshot)
    return [...extended, ...this.runners.activeRuns()]
  }

  private failedRunRequest(request: RunRequest, message: string): ExperimentRun {
    const timeoutMs = clamp(
      request.timeoutMs ?? this.defaultTimeoutMs,
      MIN_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    )
    const now = nowIso()
    const record: ExperimentRun = {
      id: newRunId(),
      environmentId: newEnvironmentId(),
      language: request.language,
      ...(request.dialect !== undefined ? { dialect: request.dialect } : {}),
      code: request.code,
      ...(request.sessionId !== undefined ? { sessionId: request.sessionId } : {}),
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.activityId !== undefined ? { activityId: request.activityId } : {}),
      ...(request.activityRevision !== undefined ? { activityRevision: request.activityRevision } : {}),
      startedAt: now,
      endedAt: nowIso(),
      status: 'failed',
      stdout: '',
      stderr: `${message}\n`,
      verification: 'unverified',
      limits: { timeoutMs },
      ...(request.checks !== undefined
        ? { checks: request.checks.map(check => ({ name: check.name, type: check.type, status: 'not-run' as const, detail: '环境/并发限制导致未运行' })) }
        : {}),
      resourceNote: '运行未开始，未产生真实输出。',
    }
    this.rememberRun(record)
    return record
  }

  private rememberRun(record: ExperimentRun): void {
    this.runs.set(record.id, record)
    while (this.runs.size > RUN_HISTORY) {
      const oldest = this.runs.keys().next()
      if (oldest.done === true) break
      this.runs.delete(oldest.value)
    }
  }

  // ---- records / directory / cleanup ------------------------------------

  async get(environmentId: EnvironmentId): Promise<EnvironmentRecord | undefined> {
    await this.ensureLoaded()
    return this.records.get(environmentId)
  }

  async getEnvironment(language: string, dialect?: string): Promise<EnvironmentRecord | undefined> {
    const normalized = normalizeLanguage(language)
    if (normalized === undefined) return undefined
    await this.ensureLoaded()
    return this.findReadyRecord(normalized, normalizeDialect(dialect)) ?? this.runners.getEnvironment(normalized, dialect)
  }

  async listRecords(): Promise<readonly EnvironmentRecord[]> {
    await this.ensureLoaded()
    return [...this.records.values()]
  }

  private findRecordByStatus(
    language: string,
    dialect: string | undefined,
    status: EnvironmentRecord['status'],
  ): EnvironmentRecord | undefined {
    for (const record of this.records.values()) {
      if (record.language !== language || record.status !== status) continue
      if (dialect !== undefined && record.dialect !== dialect) continue
      return record
    }
    return undefined
  }

  private findReadyRecord(language: string, dialect?: string): EnvironmentRecord | undefined {
    for (const record of this.records.values()) {
      if (record.language !== language || record.status !== 'ready') continue
      if (dialect !== undefined) {
        if (record.dialect === dialect) return record
        continue
      }
      if (record.dialect === undefined) return record
    }
    return undefined
  }

  async directory(): Promise<EnvironmentDirectory> {
    await this.ensureLoaded()
    await this.ensureStaleCleaned()
    const base = await this.runners.directory()
    const environments: EnvironmentRecord[] = [...base.environments]
    const supportedLanguages = [...base.supportedLanguages]
    for (const spec of this.adapters) {
      if (this.isBuiltin(spec.language)) continue
      const persisted = [...this.records.values()].filter(record => record.language === spec.language)
      for (const record of persisted) environments.push(record)
      const ready = persisted.find(record => record.status === 'ready')
      const approval = persisted.find(record => record.status === 'needs-approval')
      const failed = persisted.find(record => record.status === 'failed')
      let status: EnvironmentDirectory['supportedLanguages'][number]['status']
      let note: string
      let environmentId: EnvironmentId | undefined
      if (ready !== undefined) {
        status = 'ready'
        environmentId = ready.id
        note = `${spec.label} ${ready.version ?? '版本未知'}（插件独立目录）`
      } else if (approval !== undefined) {
        status = 'needs-approval'
        environmentId = approval.id
        note = `需要学生确认：${approval.systemChange?.description?.slice(0, 120) ?? '系统级/联网改动'}`
      } else if (failed !== undefined) {
        status = 'failed'
        environmentId = failed.id
        note = `上次准备失败：${failed.failure?.message.slice(0, 120) ?? '见环境记录'}`
      } else {
        const probe = await this.probeExtended(spec)
        status = probe.available ? 'missing' : 'needs-approval'
        note = probe.available
          ? `${spec.label} ${probe.version ?? '版本未知'} 已探测，尚未准备（prepare 会在插件数据目录建立独立目录）`
          : `${spec.label} 运行时缺失；需要学生确认的系统级安装或自行安装`
      }
      supportedLanguages.push({
        language: spec.language,
        label: spec.label,
        status,
        ...(environmentId !== undefined ? { environmentId } : {}),
        note,
      })
    }
    const failedRecords = [...this.records.values()].filter(record => record.status === 'failed')
    const approvalRecords = [...this.records.values()].filter(record => record.status === 'needs-approval')
    const gaps = [
      ...base.gaps,
      `T06 扩展适配器（${this.adapters.map(item => item.label).join('/')}）在插件数据目录内准备独立目录；系统级安装与联网依赖安装不会自动执行，需要学生确认。`,
      '环境记录持久化在插件数据目录（environments/state.json）；准备失败的记录保留，未完成目录按 not-needed/cleaned/partial/failed 如实记录。',
      '执行是当前用户身份的真实子进程：有超时、取消、输出上限，但没有 CPU/内存配额或系统级沙箱。',
      '扩展环境的网络可达性未探测（unknown）；不把某项安装成功当作普遍保证。',
      '超出本机资源的实验不会真实运行：返回保留核心原理的降规模/模拟替代，并列出与完整实验的差别（assessResources）。',
      ...(failedRecords.length > 0
        ? [`存在准备失败/取消的环境记录：${[...new Set(failedRecords.map(record => `${record.language}(${record.failure?.code ?? 'failed'})`))].join('、')}；未完成目录已按状态清理，可重试。`]
        : []),
      ...(approvalRecords.length > 0
        ? [`存在需要学生确认的环境：${[...new Set(approvalRecords.map(record => record.language))].join('、')}；插件未执行任何系统级/联网安装。`]
        : []),
    ]
    return { environments, supportedLanguages, gaps }
  }

  async cleanup(environmentId: EnvironmentId): Promise<EnvironmentCleanupResult> {
    await this.ensureLoaded()
    const record = this.records.get(environmentId)
    if (record === undefined) {
      return {
        environmentId,
        status: 'not-found',
        removedPaths: [],
        failedPaths: [],
        message: '未找到该环境记录',
      }
    }
    const path = record.isolation.path
    if (path === undefined) {
      return {
        environmentId,
        status: 'not-needed',
        removedPaths: [],
        failedPaths: [],
        message: '该环境没有插件管理的目录（系统运行时无需清理）',
        record,
      }
    }
    if (!this.isInsideManagedRoot(path)) {
      return {
        environmentId,
        status: 'not-needed',
        removedPaths: [],
        failedPaths: [],
        message: `该目录由内置运行器管理（不属于 T06 独立环境目录），本管理器不做删除：${path}`,
        record,
      }
    }
    if (!existsSync(path)) {
      const updated: EnvironmentRecord = {
        ...record,
        status: 'missing',
        updatedAt: nowIso(),
        fallback: record.fallback ?? {
          description: '环境目录已不存在，记录标记为 missing；可重新准备环境。',
          knownDifferences: ['实验不会真实运行，直到重新准备完成。'],
        },
      }
      this.remember(updated)
      await this.persistRecords()
      return {
        environmentId,
        status: 'not-needed',
        removedPaths: [],
        failedPaths: [],
        message: '目录已不存在；记录已标记为 missing',
        record: updated,
      }
    }
    const cleaned = await this.cleanupDirectory(path)
    if (cleaned.cleanup === 'cleaned') {
      const updated: EnvironmentRecord = {
        ...record,
        status: 'missing',
        isolation: { ...record.isolation, note: `已清理插件管理目录：${path}` },
        updatedAt: nowIso(),
        fallback: {
          description: '环境已按学生/宿主请求清理；重新准备会创建全新的独立目录。',
          knownDifferences: ['清理后实验不能运行，直到重新准备完成。'],
        },
      }
      this.remember(updated)
      await this.persistRecords()
      return {
        environmentId,
        status: 'cleaned',
        removedPaths: [path],
        failedPaths: [],
        message: '已清理插件管理目录',
        record: updated,
      }
    }
    if (cleaned.cleanup === 'failed' || cleaned.cleanup === 'partial') {
      const updated: EnvironmentRecord = {
        ...record,
        status: 'failed',
        failure: {
          message: `清理未完全成功：${cleaned.note ?? '未知原因'}`,
          code: 'cleanup-failed',
          cleanup: cleaned.cleanup,
          ...(cleaned.note !== undefined ? { cleanupNote: cleaned.note } : {}),
        },
        updatedAt: nowIso(),
      }
      this.remember(updated)
      await this.persistRecords()
      return {
        environmentId,
        status: cleaned.cleanup,
        removedPaths: [],
        failedPaths: [path],
        message: `清理未完全成功（${cleaned.cleanup}）`,
        record: updated,
      }
    }
    return {
      environmentId,
      status: 'not-needed',
      removedPaths: [],
      failedPaths: [],
      message: '无需清理',
      record,
    }
  }

  async cleanupStale(): Promise<StaleEnvironmentCleanupReport> {
    await this.ensureLoaded()
    const removed: string[] = []
    const failed: string[] = []
    const recordsUpdated: EnvironmentId[] = []
    let changed = false
    for (const record of [...this.records.values()]) {
      if (record.status !== 'preparing') continue
      if (this.preparing.has(record.id)) continue
      const path = record.isolation.path
      const cleaned = path !== undefined && this.isInsideManagedRoot(path)
        ? await this.cleanupDirectory(path)
        : { cleanup: 'not-needed' as CleanupStatus, note: undefined }
      if (cleaned.cleanup === 'cleaned' && path !== undefined) removed.push(path)
      else if ((cleaned.cleanup === 'failed' || cleaned.cleanup === 'partial') && path !== undefined) failed.push(path)
      const updated: EnvironmentRecord = {
        ...record,
        status: 'failed',
        failure: {
          message: '上次宿主进程中断，环境准备未完成；已清理未完成目录。',
          code: 'interrupted',
          cleanup: cleaned.cleanup,
          ...(cleaned.note !== undefined ? { cleanupNote: cleaned.note } : {}),
        },
        updatedAt: nowIso(),
      }
      this.remember(updated)
      recordsUpdated.push(updated.id)
      changed = true
    }
    try {
      await this.store.ensureLayout()
      const managedEntries = await readdir(this.store.managedRoot)
      const referenced = new Set<string>()
      for (const record of this.records.values()) {
        if (record.status !== 'ready' || record.isolation.path === undefined) continue
        referenced.add(resolve(record.isolation.path))
      }
      for (const entry of managedEntries) {
        const path = join(this.store.managedRoot, entry)
        if (referenced.has(resolve(path))) continue
        if ([...this.preparing.values()].some(active => path.includes(active.environmentId))) continue
        const cleaned = await this.cleanupDirectory(path)
        if (cleaned.cleanup === 'cleaned') removed.push(path)
        else if (cleaned.cleanup === 'failed' || cleaned.cleanup === 'partial') failed.push(path)
      }
    } catch (error) {
      this.logger('environments.stale-managed-scan-failed', { message: (error as Error).message })
    }
    try {
      const tmpEntries = await readdir(this.store.tmpRoot)
      for (const entry of tmpEntries) {
        if ([...this.active.keys()].some(runId => entry.includes(runId))) continue
        const path = join(this.store.tmpRoot, entry)
        try {
          await rm(path, { recursive: true, force: true })
          removed.push(path)
        } catch {
          failed.push(path)
        }
      }
    } catch {
      // No tmp root yet: nothing to clean.
    }
    if (changed) await this.persistRecords()
    if (removed.length > 0 || failed.length > 0 || recordsUpdated.length > 0) {
      this.logger('environments.stale-cleaned', { removed: removed.length, failed: failed.length, recordsUpdated })
    }
    return { removed, failed, recordsUpdated }
  }

  cancelPreparation(environmentId: EnvironmentId): boolean {
    const active = this.preparing.get(environmentId)
    if (active === undefined) return false
    active.controller.abort()
    return true
  }

  // ---- resources / lifecycle --------------------------------------------

  assessResources(request: ResourceRequest): ResourceAssessment {
    return assessResourceRequest(request, this.host)
  }

  hostFacts(): HostFacts {
    return this.host
  }

  async dispose(): Promise<void> {
    if (!this.disposed) {
      this.disposed = true
      for (const preparation of this.preparing.values()) preparation.controller.abort()
      for (const run of this.active.values()) run.controller.abort()
    }
    const pending: Promise<unknown>[] = [
      ...[...this.preparing.values()].map(preparation => preparation.promise),
      ...[...this.active.values()].map(run => run.promise),
    ]
    await Promise.allSettled(pending)
    await this.store.flush()
  }

  // ---- internal plumbing -------------------------------------------------

  private ensureLoaded(): Promise<void> {
    if (this.loadTask === undefined) {
      this.loadTask = (async () => {
        try {
          const records = await this.store.load()
          for (const record of records) this.records.set(record.id, record)
        } catch (error) {
          this.logger('environments.load-failed', { message: (error as Error).message })
        }
      })()
    }
    return this.loadTask
  }

  private ensureStaleCleaned(): Promise<StaleEnvironmentCleanupReport> {
    if (this.staleCleanupTask === undefined) {
      this.staleCleanupTask = this.cleanupStale().catch((error: unknown) => {
        this.logger('environments.stale-cleanup-failed', { message: (error as Error).message })
        return { removed: [], failed: [], recordsUpdated: [] }
      })
    }
    return this.staleCleanupTask
  }

  private remember(record: EnvironmentRecord): void {
    this.records.set(record.id, record)
  }

  private async persistRecords(): Promise<void> {
    try {
      await this.store.save([...this.records.values()])
    } catch (error) {
      this.logger('environments.persist-failed', { message: (error as Error).message })
    }
  }

  private async awaitCancellable<T>(
    promise: Promise<T>,
    signal: AbortSignal,
  ): Promise<{ cancelled: true } | { cancelled: false; value: T }> {
    if (signal.aborted) return { cancelled: true }
    let listener: (() => void) | undefined
    const aborted = new Promise<{ cancelled: true }>((resolveAborted) => {
      listener = () => resolveAborted({ cancelled: true })
      signal.addEventListener('abort', listener, { once: true })
    })
    try {
      return await Promise.race([
        promise.then(value => ({ cancelled: false as const, value })),
        aborted,
      ])
    } finally {
      if (listener !== undefined) signal.removeEventListener('abort', listener)
    }
  }
}

/**
 * Create the T06 environment manager the Host bridge owns.
 *
 * @param options - data dir, the frozen runner registry and optional adapters.
 * @returns a manager that classifies needs, prepares isolated environments and
 *          records every execution/cleanup fact truthfully.
 */
export function createEnvironmentManager(options: EnvironmentManagerOptions): EnvironmentManager {
  return new Manager(options)
}
