/**
 * Runner registry: the single seam the Host bridge calls.
 *
 * `createRunnerRegistry({ dataDir, ... })` detects real interpreters, prepares
 * course-scoped environments, executes code with hard limits, and returns
 * `ExperimentRun` records that match the frozen contract. The Host owns
 * persistence; this module owns execution facts.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  EnvironmentDirectory, EnvironmentRecord, ExperimentRun, RunRequest,
} from '../contracts/experiment.ts'
import { environmentId as newEnvironmentId, nowIso, runId as newRunId, type RunId } from '../contracts/ids.ts'
import type { AttemptValidation } from '../contracts/learning.ts'
import {
  isElectronExecutable, probePythonAt, resolveBiwaschemeEntry, resolveNode, resolvePython,
  type ResolvedCommand,
} from './interpreters.ts'
import { killProcessTree, runProcess, type ProcessOutcome } from './process.ts'
import { SCHEME_DIALECT_DIFFERENCES, SCHEME_RUNNER_SOURCE, SICP_PRELUDE, schemeDialectSummary } from './scheme-support.ts'
import type {
  AdapterExecutionResult, CleanupReport, EnvironmentProbe, OutputChunk,
  PrepareEnvironmentInput, PreparedEnvironment, RunnerLimits, RunnerRegistry,
  RunnerRegistryOptions, RunnerRunOptions,
} from './types.ts'

/** Default wall-clock timeout for one run. */
const DEFAULT_TIMEOUT_MS = 10_000
/** Upper bound on a requested timeout; the host never lets one run hang the profile. */
const MAX_TIMEOUT_MS = 120_000
/** Lower bound so a typo cannot make every run fail instantly. */
const MIN_TIMEOUT_MS = 100
/** Default captured bytes per stream. */
const DEFAULT_OUTPUT_BYTES = 256 * 1024
/** Upper bound on captured bytes per stream. */
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024
/** Runs kept in the in-memory history for cancellation/status lookups. */
const RUN_HISTORY = 50

const SUPPORTED_LANGUAGES: readonly { language: string; label: string }[] = [
  { language: 'python', label: 'Python' },
  { language: 'javascript', label: 'JavaScript' },
  { language: 'scheme', label: 'Scheme（SICP 方言）' },
]

/** Child environment variables safe to inherit; no secrets are passed through. */
const INHERITED_ENV_KEYS: readonly string[] = [
  'PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'SHELL',
  'SystemRoot', 'ComSpec', 'SYSTEMROOT',
]

/** Build the base environment for a child process. */
function baseChildEnv(extra: Readonly<Record<string, string>> | undefined): Record<string, string> {
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

interface ActiveRun {
  readonly runId: string
  readonly controller: AbortController
  readonly promise: Promise<ExperimentRun>
  record(): ExperimentRun
}

interface ProbeCacheEntry {
  readonly probe: EnvironmentProbe
}

/** Internal mutable run state; frozen into ExperimentRun when the process ends. */
interface RunState {
  readonly id: RunId
  readonly sessionId?: ExperimentRun['sessionId']
  readonly courseId?: ExperimentRun['courseId']
  readonly activityId?: ExperimentRun['activityId']
  readonly activityRevision?: number
  readonly environmentId: EnvironmentRecord['id']
  readonly language: string
  readonly dialect?: string
  readonly code: string
  readonly stdin?: string
  readonly startedAt: string
  endedAt?: string
  status: ExperimentRun['status']
  stdout: string
  stderr: string
  exitCode?: number
  durationMs?: number
  checks?: ExperimentRun['checks']
  verification: ExperimentRun['verification']
  readonly limits: ExperimentRun['limits']
  resourceNote?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Copy a run state into the public contract shape. */
function toRunRecord(state: RunState): ExperimentRun {
  const record: ExperimentRun = {
    id: state.id,
    environmentId: state.environmentId,
    language: state.language,
    code: state.code,
    startedAt: state.startedAt,
    status: state.status,
    stdout: state.stdout,
    stderr: state.stderr,
    verification: state.verification,
    limits: state.limits,
    ...(state.sessionId !== undefined ? { sessionId: state.sessionId } : {}),
    ...(state.courseId !== undefined ? { courseId: state.courseId } : {}),
    ...(state.activityId !== undefined ? { activityId: state.activityId } : {}),
    ...(state.activityRevision !== undefined ? { activityRevision: state.activityRevision } : {}),
    ...(state.dialect !== undefined ? { dialect: state.dialect } : {}),
    ...(state.stdin !== undefined ? { stdin: state.stdin } : {}),
    ...(state.endedAt !== undefined ? { endedAt: state.endedAt } : {}),
    ...(state.exitCode !== undefined ? { exitCode: state.exitCode } : {}),
    ...(state.durationMs !== undefined ? { durationMs: state.durationMs } : {}),
    ...(state.checks !== undefined ? { checks: state.checks } : {}),
    ...(state.resourceNote !== undefined ? { resourceNote: state.resourceNote } : {}),
  }
  return record
}

/** Map a raw child outcome to the contract status vocabulary. */
function statusOf(outcome: { cancelled: boolean; timedOut: boolean; spawnError?: string; exitCode?: number }): ExperimentRun['status'] {
  if (outcome.cancelled) return 'cancelled'
  if (outcome.timedOut) return 'timed-out'
  if (outcome.spawnError !== undefined) return 'failed'
  return outcome.exitCode === 0 ? 'succeeded' : 'failed'
}

/** Run the declared objective checks against captured output. */
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
      const needle = String(check.value)
      const pass = stdout.includes(needle)
      return { name: check.name, type: check.type, status: pass ? 'pass' as const : 'fail' as const, ...(pass ? {} : { detail: `stdout 中未找到 ${JSON.stringify(needle)}` }) }
    }
    if (check.type === 'stdout-equals') {
      // Trailing newlines are a formatting accident of print calls, not a result.
      const actual = stdout.replace(/\r\n/gu, '\n').trimEnd()
      const expected = String(check.value).replace(/\r\n/gu, '\n').trimEnd()
      const pass = actual === expected
      return { name: check.name, type: check.type, status: pass ? 'pass' as const : 'fail' as const, ...(pass ? {} : { detail: `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual.slice(0, 400))}` }) }
    }
    const expectedCode = Number(check.value)
    const pass = exitCode === expectedCode
    return { name: check.name, type: check.type, status: pass ? 'pass' as const : 'fail' as const, ...(pass ? {} : { detail: `期望退出码 ${expectedCode}，实际 ${exitCode ?? '无'}` }) }
  })
}

/** Decide how the run's result is verified (objective vs exploratory vs unverified). */
function verificationOf(
  checks: NonNullable<RunRequest['checks']>,
  status: ExperimentRun['status'],
): ExperimentRun['verification'] {
  if (checks.length === 0) {
    return status === 'succeeded' || status === 'failed' ? 'exploratory' : 'unverified'
  }
  return status === 'succeeded' || status === 'failed' ? 'objective' : 'unverified'
}

/** Map a real run into the learning-attempt validation shape used by T04. */
export function validationFromRun(run: ExperimentRun): AttemptValidation {
  const checks = run.checks?.map(check => ({ name: check.name, status: check.status, ...(check.detail !== undefined ? { detail: check.detail } : {}) }))
  const passed = run.verification === 'objective' && (checks ?? []).every(check => check.status === 'pass') && (checks ?? []).length > 0
  const evidence = [
    `${run.language}${run.dialect !== undefined ? `/${run.dialect}` : ''} 真实执行：退出码 ${String(run.exitCode ?? '无')}，耗时 ${String(run.durationMs ?? 0)}ms`,
    `状态：${run.status}；输出校验：${run.verification}`,
  ]
  const limits = [
    '校验只覆盖 stdout/退出码，不能证明程序思路正确或效率足够。',
    '运行器未限制 CPU/内存占用，超时与输出上限之外没有沙箱隔离。',
  ]
  if (run.verification === 'objective') {
    return {
      kind: 'objective',
      passed,
      ...(checks !== undefined ? { checks } : {}),
      evidence,
      assessedBy: 'objective-runner',
      confidence: 'high',
      limits,
      ...(run.endedAt !== undefined ? { createdAt: run.endedAt } : {}),
    }
  }
  return {
    kind: 'unverified',
    ...(checks !== undefined ? { checks } : {}),
    evidence,
    assessedBy: 'objective-runner',
    confidence: 'low',
    limits: [
      ...limits,
      run.verification === 'exploratory'
        ? '该活动未声明客观检查，运行输出仅作探索证据，不用于判定掌握。'
        : '运行未正常结束，无法据此判断程序结果。',
    ],
    ...(run.endedAt !== undefined ? { createdAt: run.endedAt } : {}),
  }
}

/** One registry instance; see {@link createRunnerRegistry}. */
class Registry implements RunnerRegistry {
  private readonly dataDir: string
  private readonly tmpRoot: string
  private readonly envRoot: string
  private readonly options: RunnerRegistryOptions
  private readonly defaultTimeoutMs: number
  private readonly defaultMaxOutputBytes: number
  private readonly maxConcurrentRuns: number
  private readonly probes = new Map<string, ProbeCacheEntry>()
  private readonly prepared = new Map<string, PreparedEnvironment>()
  private readonly preparing = new Map<string, Promise<PreparedEnvironment>>()
  private readonly active = new Map<string, ActiveRun>()
  private readonly runs = new Map<string, ExperimentRun>()
  private cleanupTask: Promise<CleanupReport> | undefined

  constructor(options: RunnerRegistryOptions) {
    this.options = options
    this.dataDir = resolve(options.dataDir)
    this.tmpRoot = join(this.dataDir, 'experiments', 'tmp')
    this.envRoot = join(this.dataDir, 'experiments', 'envs')
    this.defaultTimeoutMs = clamp(options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
    this.defaultMaxOutputBytes = clamp(options.maxOutputBytes ?? DEFAULT_OUTPUT_BYTES, 1024, MAX_OUTPUT_BYTES)
    this.maxConcurrentRuns = clamp(options.maxConcurrentRuns ?? 4, 1, 16)
  }

  /** Probe one language and remember the result. */
  async probe(language: string, dialect?: string): Promise<EnvironmentProbe> {
    const key = this.probeKey(language, dialect)
    const cached = this.probes.get(key)
    if (cached !== undefined) return cached.probe
    const probe = await this.detect(language, dialect)
    this.probes.set(key, { probe })
    return probe
  }

  /** Drop the probe cache (tests and the T06 environment refresh flow). */
  invalidateProbes(): void {
    this.probes.clear()
  }

  async prepare(input: PrepareEnvironmentInput): Promise<EnvironmentRecord> {
    const key = this.envKey(input.language, input.dialect, input.mode)
    const existing = this.prepared.get(key)
    const inFlight = this.preparing.get(key)
    if (existing !== undefined) {
      return existing.record
    }
    if (inFlight !== undefined) return (await inFlight).record
    const task = this.doPrepare(input)
    this.preparing.set(key, task)
    try {
      const prepared = await task
      this.prepared.set(key, prepared)
      return prepared.record
    } finally {
      this.preparing.delete(key)
    }
  }

  getEnvironment(language: string, dialect?: string): EnvironmentRecord | undefined {
    return this.prepared.get(this.envKey(language, dialect))?.record
  }

  async directory(): Promise<EnvironmentDirectory> {
    const records: EnvironmentRecord[] = []
    for (const { language } of SUPPORTED_LANGUAGES) {
      try {
        records.push(await this.prepare({ language }))
      } catch (error) {
        records.push(this.missingRecord(language, undefined, `环境探测失败：${(error as Error).message}`, newEnvironmentId()))
      }
    }
    const supportedLanguages = SUPPORTED_LANGUAGES.map(({ language, label }) => {
      const record = records.find(item => item.language === language)
      return {
        language,
        label,
        status: record?.status ?? 'missing',
        ...(record !== undefined ? { environmentId: record.id } : {}),
        ...(record?.version !== undefined ? { note: `${label} ${record.version}` } : {}),
      }
    })
    const gaps = [
      '首版内置适配器仅覆盖 Python、JavaScript、Scheme；其他语言走 T06 的识别/独立配置/冒烟流程。',
      '执行以当前用户身份的真实子进程运行：有超时、取消、输出上限，但没有 CPU/内存配额或系统级沙箱。',
      '运行器不假设可联网；依赖安装与联网实验需要独立核验，不把某项安装成功当作普遍保证。',
      ...(records.some(record => record.status !== 'ready')
        ? [`存在不可用环境：${records.filter(record => record.status !== 'ready').map(record => `${record.language} ${record.dialect ?? ''}`.trim()).join('、')}`]
        : []),
    ]
    return { environments: records, supportedLanguages, gaps }
  }

  async run(request: RunRequest, options: RunnerRunOptions = {}): Promise<ExperimentRun> {
    // One cleanup attempt per registry, so a crashed host leaves no unowned dirs.
    await this.ensureCleaned()
    const limits: RunnerLimits = {
      timeoutMs: clamp(request.timeoutMs ?? this.defaultTimeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
      maxOutputBytes: clamp(options.limits?.maxOutputBytes ?? this.defaultMaxOutputBytes, 1024, MAX_OUTPUT_BYTES),
    }
    const language = request.language
    if (!SUPPORTED_LANGUAGES.some(item => item.language === language)) {
      return this.failedRun(request, limits, newEnvironmentId(), `暂不支持的语言：${language}。首版支持 Python、JavaScript、Scheme。`)
    }
    if (this.active.size >= this.maxConcurrentRuns) {
      return this.failedRun(request, limits, newEnvironmentId(), `同时运行数量已达上限（${this.maxConcurrentRuns}）；请等待当前实验结束或取消后再试。`)
    }
    // Prefer a ready course-scoped virtualenv; otherwise the system interpreter.
    let environment: EnvironmentRecord
    let prepared: PreparedEnvironment | undefined
    const venvKey = this.envKey(language, request.dialect, 'venv')
    const venv = this.prepared.get(venvKey)
    if (venv !== undefined && venv.record.status === 'ready') {
      environment = venv.record
      prepared = venv
    } else {
      try {
        environment = await this.prepare({ language, ...(request.dialect !== undefined ? { dialect: request.dialect } : {}) })
      } catch (error) {
        return this.failedRun(request, limits, newEnvironmentId(), `环境准备失败：${(error as Error).message}`)
      }
      prepared = this.prepared.get(this.envKey(language, request.dialect))
    }
    if (environment.status !== 'ready' || prepared === undefined) {
      const fallback = environment.fallback?.description ?? '环境不可用，实验未运行。'
      const record = this.failedRun(request, limits, environment.id, `${fallback}`)
      return record
    }

    const runState: RunState = {
      id: options.runId ?? newRunId(),
      ...(request.sessionId !== undefined ? { sessionId: request.sessionId } : {}),
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.activityId !== undefined ? { activityId: request.activityId } : {}),
      ...(request.activityRevision !== undefined ? { activityRevision: request.activityRevision } : {}),
      environmentId: environment.id,
      language,
      ...(request.dialect !== undefined ? { dialect: request.dialect } : {}),
      code: request.code,
      ...(request.stdin !== undefined ? { stdin: request.stdin } : {}),
      startedAt: nowIso(),
      status: 'running',
      stdout: '',
      stderr: '',
      verification: 'unverified',
      limits: { timeoutMs: limits.timeoutMs },
    }
    const controller = new AbortController()
    const externalAbort = (): void => controller.abort()
    if (options.signal !== undefined) {
      if (options.signal.aborted) controller.abort()
      else options.signal.addEventListener('abort', externalAbort, { once: true })
    }

    const promise = this.executeRun(runState, prepared, request, limits, controller.signal, options.onOutput)
      .catch((error: unknown): ExperimentRun => {
        runState.status = 'failed'
        runState.stderr = `${runState.stderr}${runState.stderr === '' ? '' : '\n'}\n运行器内部错误：${(error as Error).message}`
        runState.verification = 'unverified'
        runState.endedAt = nowIso()
        return toRunRecord(runState)
      })
      .then((record) => {
        this.rememberRun(record)
        return record
      })
      .finally(() => {
        if (options.signal !== undefined) options.signal.removeEventListener('abort', externalAbort)
        this.active.delete(runState.id)
      })

    this.active.set(runState.id, {
      runId: runState.id,
      controller,
      promise,
      record: () => toRunRecord(runState),
    })
    return promise
  }

  async cancel(runId: string): Promise<ExperimentRun | undefined> {
    const active = this.active.get(runId)
    if (active !== undefined) {
      active.controller.abort()
      try {
        return await active.promise
      } catch {
        return this.runs.get(runId)
      }
    }
    return this.runs.get(runId)
  }

  getRun(runId: string): ExperimentRun | undefined {
    return this.runs.get(runId)
  }

  activeRuns(): readonly ExperimentRun[] {
    return [...this.active.values()].map(entry => entry.record())
  }

  async cleanupStale(): Promise<CleanupReport> {
    const removed: string[] = []
    const failed: string[] = []
    let entries: string[]
    try {
      entries = await readdir(this.tmpRoot)
    } catch {
      return { removed, failed }
    }
    for (const entry of entries) {
      const path = join(this.tmpRoot, entry)
      const activeIds = [...this.active.keys()]
      if (activeIds.some(id => entry.includes(id))) continue
      try {
        await rm(path, { recursive: true, force: true })
        removed.push(path)
      } catch {
        failed.push(path)
      }
    }
    return { removed, failed }
  }

  async dispose(): Promise<void> {
    for (const active of this.active.values()) active.controller.abort()
    await Promise.allSettled([...this.active.values()].map(active => active.promise))
    try {
      await rm(this.tmpRoot, { recursive: true, force: true })
    } catch { /* best effort */ }
  }

  // ---- preparation -------------------------------------------------------

  private probeKey(language: string, dialect?: string): string {
    return `${language}\u0000${dialect ?? ''}`
  }

  private envKey(language: string, dialect?: string, mode?: string): string {
    return `${language}\u0000${dialect ?? ''}\u0000${mode ?? 'system'}`
  }

  private async detect(language: string, dialect?: string): Promise<EnvironmentProbe> {
    if (language === 'python') {
      const resolved = await resolvePython(this.options.pythonPath)
      if (resolved === undefined) {
        return {
          language, available: false,
          missingReason: '本机未找到可用的 python3。可在系统安装 Python 3 后重试；课程实验仍可用 JavaScript/Scheme 或降级教学。',
        }
      }
      return { language, available: true, version: resolved.version, executable: resolved.executable, args: [...resolved.args], note: resolved.note }
    }
    if (language === 'javascript') {
      const resolved = await resolveNode(this.options.nodePath)
      if (resolved === undefined) {
        return { language, available: false, missingReason: '本机未找到 Node.js 可执行文件，JavaScript 实验不可用。' }
      }
      return { language, available: true, version: resolved.version, executable: resolved.executable, args: [...resolved.args], note: resolved.note }
    }
    if (language === 'scheme') {
      const node = await resolveNode(this.options.nodePath)
      const entry = resolveBiwaschemeEntry(this.options.biwaschemePath)
      if (node === undefined || entry === undefined) {
        return {
          language, ...(dialect !== undefined ? { dialect } : {}), available: false,
          missingReason: node === undefined
            ? '本机未找到 Node.js，无法运行 Scheme 解释器。'
            : '未解析到 biwascheme 解释器依赖（npm 包 biwascheme）；Scheme 实验需要该依赖，安装前不可运行。',
        }
      }
      return {
        language, ...(dialect !== undefined ? { dialect } : {}), available: true,
        version: `biwascheme 0.8.3（Node ${node.version}）`,
        executable: node.executable, args: [...node.args],
        note: '解释器以 Node 子进程运行；SICP 预置库由插件注入，不修改 biwascheme 包。',
      }
    }
    return { language, available: false, missingReason: `未知语言：${language}` }
  }

  private async doPrepare(input: PrepareEnvironmentInput): Promise<PreparedEnvironment> {
    const probe = await this.probe(input.language, input.dialect)
    const id = newEnvironmentId()
    const now = nowIso()
    const timeoutMs = clamp(input.timeoutMs ?? this.defaultTimeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
    if (!probe.available) {
      const record = this.missingRecord(input.language, input.dialect, probe.missingReason ?? '环境不可用', id, now)
      return { record, command: { executable: '', args: [] } }
    }
    if (input.language === 'python' && input.mode === 'venv') {
      return await this.preparePythonVenv(input, id, now, timeoutMs)
    }
    const command: ResolvedCommand = {
      executable: probe.executable ?? '',
      args: probe.args ?? [],
      env: input.language === 'scheme' ? { TEACHING_BIWASCHEME_ENTRY: resolveBiwaschemeEntry(this.options.biwaschemePath) ?? '' } : {},
      version: probe.version ?? 'unknown',
    }
    const record: EnvironmentRecord = {
      id,
      language: input.language,
      ...(input.dialect !== undefined ? { dialect: input.dialect } : {}),
      kind: 'system',
      status: 'ready',
      version: probe.version,
      isolation: input.language === 'scheme'
        ? { dependencies: 'shared', note: 'biwascheme 为插件 npm 依赖（与宿主共享 node_modules）；解释器在独立子进程内运行' }
        : { dependencies: 'none', note: input.language === 'python' ? '系统 Python -I：忽略 PYTHON* 环境变量与用户 site-packages' : '宿主/系统 Node，无第三方依赖' },
      execution: {
        mode: 'process',
        executable: command.executable,
        args: [...command.args],
        timeoutMs,
        cancellable: true,
        network: 'unknown',
        confinement: '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
      },
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
      ...(input.conceptIds !== undefined ? { conceptIds: input.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
    }
    return { record, command: { executable: command.executable, args: command.args, ...(Object.keys(command.env).length > 0 ? { env: command.env } : {}) } }
  }

  private async preparePythonVenv(
    input: PrepareEnvironmentInput,
    id: EnvironmentRecord['id'],
    now: string,
    timeoutMs: number,
  ): Promise<PreparedEnvironment> {
    const venvDir = join(this.envRoot, 'python-venv')
    await mkdir(this.envRoot, { recursive: true })
    let record: EnvironmentRecord
    if (existsSync(join(venvDir, 'bin', 'python3'))) {
      const existing = await probePythonAt(join(venvDir, 'bin', 'python3'))
      if (existing !== undefined) {
        record = this.readyVenvRecord(input, id, now, timeoutMs, venvDir, existing.version)
        return { record, command: { executable: existing.executable, args: [...existing.args], env: { VIRTUAL_ENV: venvDir } } }
      }
      await rm(venvDir, { recursive: true, force: true })
    }
    const base = await resolvePython(this.options.pythonPath)
    if (base === undefined) {
      return { record: this.missingRecord(input.language, input.dialect, '创建虚拟环境失败：未找到 python3', id, now), command: { executable: '', args: [] } }
    }
    const creation = await runProcess({
      command: base.executable,
      args: [...base.args.filter(arg => arg !== '-I'), '-m', 'venv', venvDir],
      env: baseChildEnv(undefined),
      timeoutMs: Math.min(60_000, timeoutMs * 6),
      maxOutputBytes: 64 * 1024,
    })
    const venvPython = join(venvDir, 'bin', 'python3')
    const probed = creation.exitCode === 0 && existsSync(venvPython) ? await probePythonAt(venvPython) : undefined
    if (probed === undefined) {
      // Failure cleanup: never leave a half-created environment behind.
      let cleanup: EnvironmentRecord['failure'] = { message: `python -m venv 失败（退出码 ${String(creation.exitCode ?? '无')}）`, code: 'venv-create-failed', cleanup: 'not-needed' }
      try {
        await rm(venvDir, { recursive: true, force: true })
        cleanup = { ...cleanup, cleanup: 'cleaned' }
      } catch (error) {
        cleanup = { ...cleanup, cleanup: 'failed', cleanupNote: (error as Error).message }
      }
      return {
        record: this.recordWithStatus(input, id, now, timeoutMs, 'failed', { failure: cleanup, note: '虚拟环境创建失败，已回退到系统 Python 的说明见 fallback', stack: creation.stderr }),
        command: { executable: '', args: [] },
      }
    }
    record = this.readyVenvRecord(input, id, now, timeoutMs, venvDir, probed.version)
    return { record, command: { executable: probed.executable, args: [...probed.args], env: { VIRTUAL_ENV: venvDir } } }
  }

  private readyVenvRecord(
    input: PrepareEnvironmentInput,
    id: EnvironmentRecord['id'],
    now: string,
    timeoutMs: number,
    venvDir: string,
    version: string,
  ): EnvironmentRecord {
    return {
      id,
      language: input.language,
      ...(input.dialect !== undefined ? { dialect: input.dialect } : {}),
      kind: 'virtualenv',
      status: 'ready',
      version,
      isolation: { dependencies: 'isolated', path: venvDir, note: '课程/实验独立 venv（位于插件数据目录内，不改系统 Python）' },
      execution: {
        mode: 'process', executable: join(venvDir, 'bin', 'python3'), args: ['-I'], timeoutMs,
        cancellable: true, network: 'unknown', confinement: '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
      },
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
      ...(input.conceptIds !== undefined ? { conceptIds: input.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
    }
  }

  private recordWithStatus(
    input: PrepareEnvironmentInput,
    id: EnvironmentRecord['id'],
    now: string,
    timeoutMs: number,
    status: EnvironmentRecord['status'],
    extra: { failure?: EnvironmentRecord['failure']; note?: string; stack?: string },
  ): EnvironmentRecord {
    return {
      id,
      language: input.language,
      ...(input.dialect !== undefined ? { dialect: input.dialect } : {}),
      kind: 'virtualenv',
      status,
      ...(extra.failure !== undefined ? { failure: extra.failure } : {}),
      isolation: { dependencies: 'isolated', path: join(this.envRoot, 'python-venv') },
      execution: {
        mode: 'process', args: ['-I'], timeoutMs, cancellable: true, network: 'unknown',
        confinement: '当前用户身份子进程；无 CPU/内存配额；超时与取消会结束整个进程组',
      },
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
      ...(input.conceptIds !== undefined ? { conceptIds: input.conceptIds } : {}),
      createdAt: now,
      updatedAt: now,
      fallback: {
        description: '虚拟环境准备失败；可继续使用系统 Python（无第三方依赖）运行基础实验，或让教师改用不依赖该环境的等价小实验。',
        knownDifferences: ['虚拟环境未创建，第三方库不在隔离环境中', ...(extra.stack !== undefined && extra.stack !== '' ? [`准备输出：${extra.stack.slice(0, 300)}`] : [])],
      },
    }
  }

  private missingRecord(
    language: string,
    dialect: string | undefined,
    reason: string,
    id: EnvironmentRecord['id'],
    now = nowIso(),
  ): EnvironmentRecord {
    return {
      id,
      language,
      ...(dialect !== undefined ? { dialect } : {}),
      kind: 'system',
      status: 'missing',
      isolation: { dependencies: 'none' },
      execution: { mode: 'process', timeoutMs: this.defaultTimeoutMs, cancellable: false, network: 'unknown', confinement: '环境不可用，未启动进程' },
      createdAt: now,
      updatedAt: now,
      fallback: {
        description: `${language} 环境不可用：${reason}`,
        knownDifferences: [
          '实验未真实运行，不能提供真实 stdout/退出码。',
          '教学可退化为伪代码/逐行走查演示，但会明确标注“未运行”。',
        ],
      },
    }
  }

  // ---- execution ---------------------------------------------------------

  private async executeRun(
    state: RunState,
    prepared: PreparedEnvironment,
    request: RunRequest,
    limits: RunnerLimits,
    signal: AbortSignal,
    onOutput: RunnerRunOptions['onOutput'],
  ): Promise<ExperimentRun> {
    let runDir: string | undefined
    let execution: AdapterExecutionResult | undefined
    let cleanupNote: string | undefined
    try {
      await mkdir(this.tmpRoot, { recursive: true })
      runDir = await mkdtemp(join(this.tmpRoot, 'run-'))
      const cwd = runDir
      const env = baseChildEnv({ ...this.options.env })
      const input = {
        environment: prepared,
        code: request.code,
        ...(request.stdin !== undefined ? { stdin: request.stdin } : {}),
        cwd,
        env,
        limits,
        signal,
        ...(onOutput !== undefined ? { onOutput } : {}),
      }
      execution = request.language === 'python'
        ? await this.executeScript('program.py', input)
        : request.language === 'javascript'
          ? await this.executeScript('program.js', input)
          : await this.executeScheme(input)
    } finally {
      if (runDir !== undefined) {
        try {
          await rm(runDir, { recursive: true, force: true })
        } catch (error) {
          cleanupNote = `临时目录清理失败：${(error as Error).message}`
        }
      }
    }
    const outcome = execution ?? {
      status: 'failed' as const, stdout: '', stderr: '运行器未产生结果', durationMs: 0,
      timedOut: false, cancelled: false, truncated: false,
    }
    state.status = outcome.status
    state.stdout = outcome.stdout
    state.stderr = cleanupNote !== undefined ? `${outcome.stderr}${outcome.stderr === '' ? '' : '\n'}[${cleanupNote}]` : outcome.stderr
    state.exitCode = outcome.exitCode
    state.durationMs = outcome.durationMs
    state.endedAt = nowIso()
    const checks = request.checks ?? []
    state.checks = evaluateChecks(checks, outcome.status, outcome.stdout, outcome.exitCode)
    state.verification = verificationOf(checks, outcome.status)
    const notes: string[] = [...(outcome.notes ?? [])]
    if (outcome.truncated) notes.push('输出超过上限，已截断显示。')
    notes.push(`临时目录已清理；未做资源配额隔离。`)
    state.resourceNote = notes.join(' ')
    return toRunRecord(state)
  }

  /** Python / JavaScript share the write-a-file-and-run shape. */
  private async executeScript(fileName: string, input: {
    readonly environment: PreparedEnvironment
    readonly code: string
    readonly stdin?: string
    readonly cwd: string
    readonly env: Readonly<Record<string, string>>
    readonly limits: RunnerLimits
    readonly signal?: AbortSignal
    readonly onOutput?: (chunk: OutputChunk) => void
  }): Promise<AdapterExecutionResult> {
    await writeFile(join(input.cwd, fileName), input.code, 'utf8')
    const command = input.environment.command
    const childEnv = baseChildEnv({ ...this.options.env, ...(input.environment.command.env ?? {}) })
    const outcome = await runProcess({
      command: command.executable,
      args: [...command.args, fileName],
      cwd: input.cwd,
      env: childEnv,
      ...(input.stdin !== undefined ? { stdin: input.stdin } : {}),
      timeoutMs: input.limits.timeoutMs,
      maxOutputBytes: input.limits.maxOutputBytes,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      ...(input.onOutput !== undefined ? { onChunk: input.onOutput } : {}),
    })
    return this.mapOutcome(outcome)
  }

  /** Scheme runs through the generated CommonJS runner inside a Node child. */
  private async executeScheme(input: {
    readonly environment: PreparedEnvironment
    readonly code: string
    readonly stdin?: string
    readonly cwd: string
    readonly env: Readonly<Record<string, string>>
    readonly limits: RunnerLimits
    readonly signal?: AbortSignal
    readonly onOutput?: (chunk: OutputChunk) => void
  }): Promise<AdapterExecutionResult> {
    const entry = input.environment.command.env?.TEACHING_BIWASCHEME_ENTRY
      ?? resolveBiwaschemeEntry(this.options.biwaschemePath)
    if (entry === undefined || entry === '') {
      return {
        status: 'failed', stdout: '',
        stderr: 'Scheme 环境不可用：未解析到 biwascheme 解释器依赖。\n',
        durationMs: 0, timedOut: false, cancelled: false, truncated: false,
        notes: ['未注入预置库；没有真实运行。'],
      }
    }
    await writeFile(join(input.cwd, 'runner.cjs'), SCHEME_RUNNER_SOURCE, 'utf8')
    await writeFile(join(input.cwd, 'program.scm'), input.code, 'utf8')
    const dialect = input.environment.record.dialect
    const usePrelude = dialect === undefined || dialect === '' || dialect === 'sicp'
    if (usePrelude) await writeFile(join(input.cwd, 'sicp-prelude.scm'), SICP_PRELUDE, 'utf8')
    const childEnv = baseChildEnv({
      ...this.options.env,
      ...(input.environment.command.env ?? {}),
      TEACHING_BIWASCHEME_ENTRY: entry,
      ...(usePrelude ? { TEACHING_SICP_PRELUDE: join(input.cwd, 'sicp-prelude.scm') } : {}),
    })
    const outcome = await runProcess({
      command: input.environment.command.executable,
      args: [...input.environment.command.args, 'runner.cjs', 'program.scm'],
      cwd: input.cwd,
      env: childEnv,
      ...(input.stdin !== undefined ? { stdin: input.stdin } : {}),
      timeoutMs: input.limits.timeoutMs,
      maxOutputBytes: input.limits.maxOutputBytes,
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      ...(input.onOutput !== undefined ? { onChunk: input.onOutput } : {}),
    })
    const result = this.mapOutcome(outcome)
    const notes = [
      ...(result.notes ?? []),
      ...(input.stdin !== undefined ? ['Scheme 运行器暂不读取标准输入；stdin 被忽略。'] : []),
      `方言说明：${schemeDialectSummary(dialect)[0]}`,
    ]
    return { ...result, notes }
  }

  private mapOutcome(outcome: ProcessOutcome): AdapterExecutionResult {
    const status = statusOf(outcome)
    let stderr = outcome.stderr
    if (outcome.spawnError !== undefined) {
      stderr = `${stderr}${stderr === '' ? '' : '\n'}无法启动进程：${outcome.spawnError}`
    }
    return {
      status,
      stdout: outcome.stdout,
      stderr,
      ...(outcome.exitCode !== undefined ? { exitCode: outcome.exitCode } : {}),
      durationMs: outcome.durationMs,
      timedOut: outcome.timedOut,
      cancelled: outcome.cancelled,
      truncated: outcome.truncated,
      ...(outcome.spawnError !== undefined ? { notes: ['进程未能启动（解释器路径不可用或不可执行）。'] } : {}),
    }
  }

  private failedRun(
    request: RunRequest,
    limits: RunnerLimits,
    environmentId: EnvironmentRecord['id'],
    message: string,
  ): ExperimentRun {
    const startedAt = nowIso()
    const record: ExperimentRun = {
      id: newRunId(),
      ...(request.sessionId !== undefined ? { sessionId: request.sessionId } : {}),
      ...(request.courseId !== undefined ? { courseId: request.courseId } : {}),
      ...(request.activityId !== undefined ? { activityId: request.activityId } : {}),
      ...(request.activityRevision !== undefined ? { activityRevision: request.activityRevision } : {}),
      environmentId,
      language: request.language,
      ...(request.dialect !== undefined ? { dialect: request.dialect } : {}),
      code: request.code,
      startedAt,
      endedAt: nowIso(),
      status: 'failed',
      stdout: '',
      stderr: `${message}\n`,
      verification: 'unverified',
      limits: { timeoutMs: limits.timeoutMs },
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

  private ensureCleaned(): Promise<CleanupReport> {
    if (this.cleanupTask === undefined) {
      this.cleanupTask = this.cleanupStale().catch(() => ({ removed: [], failed: [] }))
    }
    return this.cleanupTask
  }
}

/**
 * Create the experiment runner registry the Host bridge owns.
 *
 * @param options - data directory, optional explicit interpreter paths and limits.
 * @returns a registry that detects, prepares, runs and cancels real processes.
 */
export function createRunnerRegistry(options: RunnerRegistryOptions): RunnerRegistry {
  return new Registry(options)
}

/** Re-exported for the Host bridge's environment listing. */
export { SUPPORTED_LANGUAGES, SCHEME_DIALECT_DIFFERENCES, killProcessTree }
export type { ProcessOutcome }
