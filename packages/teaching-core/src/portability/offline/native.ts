/**
 * Native experiment sources exported beside the offline page.
 *
 * The standalone HTML page never executes Python/Scheme (or any native) code:
 * the export writes the exact source plus the environment facts the plugin
 * recorded at teaching time, and says so in the page and manifest. Nothing from
 * the installed environment is bundled or copied.
 */
import type { CodeRunPayload, LessonActivity } from '../../contracts/activity.ts'
import type { EnvironmentRecord } from '../../contracts/experiment.ts'

/** One source file planned for the `native/` directory. */
export interface PlannedNativeSource {
  readonly activityId: string
  readonly sessionTitle: string
  readonly title: string
  readonly language: string
  readonly dialect?: string
  /** Relative path inside the export directory, e.g. `native/act-xxx.py`. */
  readonly path: string
  readonly code: string
  readonly environmentNote: string
  readonly runInstructions: string
}

/** Language label used in the generated README. */
const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  python: 'Python',
  scheme: 'Scheme',
  javascript: 'JavaScript',
}

/** File extension per language (unknown languages fall back to `.txt`). */
const LANGUAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  python: 'py',
  scheme: 'scm',
  javascript: 'js',
  ruby: 'rb',
  lua: 'lua',
  bash: 'sh',
  shell: 'sh',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  rust: 'rs',
  go: 'go',
}

/** Filename extension for one language. */
export function extensionFor(language: string): string {
  return LANGUAGE_EXTENSIONS[language] ?? 'txt'
}

/** Language display label. */
export function languageLabel(language: string, dialect?: string): string {
  const base = LANGUAGE_LABELS[language] ?? language
  return dialect !== undefined && dialect !== '' ? `${base}（${dialect} 方言）` : base
}

/** Recorded environment facts, or an honest statement that none were recorded. */
export function environmentNoteFor(
  language: string,
  dialect: string | undefined,
  environment: EnvironmentRecord | undefined,
): string {
  if (environment === undefined) {
    return `需要本机 ${languageLabel(language, dialect)} 运行环境；导出不包含运行环境，插件也没有保存该语言的环境记录。`
  }
  const parts: string[] = []
  parts.push(`${languageLabel(language, dialect)} 环境：${environment.kind}${environment.version !== undefined ? ` ${environment.version}` : ''}`)
  if (environment.isolation.path !== undefined) parts.push(`隔离目录：${environment.isolation.path}（导出时未复制）`)
  if (environment.execution.executable !== undefined) {
    const args = (environment.execution.args ?? []).join(' ')
    parts.push(`插件内运行命令：${environment.execution.executable}${args !== '' ? ` ${args}` : ''}`)
  }
  if (environment.execution.confinement !== undefined) parts.push(`执行限制：${environment.execution.confinement}`)
  if (environment.execution.network !== 'unknown') parts.push(`网络：${environment.execution.network === 'blocked' ? '已阻断' : '可访问'}`)
  if (environment.fallback !== undefined) parts.push(`教学替代：${environment.fallback.description}`)
  parts.push('导出不包含运行环境、依赖或凭据。')
  return parts.join('；')
}

/** Command the student can run locally for one language. */
function commandFor(language: string, dialect: string | undefined, relativePath: string, environment: EnvironmentRecord | undefined): string {
  const executable = environment?.execution.executable
  if (language === 'scheme' && dialect === 'sicp') {
    return `需要支持 SICP 方言的 Scheme 解释器：先加载 native/sicp-prelude.scm 再运行 ${relativePath}；`
      + '插件内实验使用内置 biwascheme 驱动（Node + npm biwascheme）+ 同一预置库，MIT Scheme/Guile 的差异见环境说明。'
  }
  if (language === 'python') return `${executable ?? 'python3'} ${relativePath}`
  if (language === 'javascript') return `${executable ?? 'node'} ${relativePath}`
  if (executable !== undefined) return `${executable} ${relativePath}`
  return `用本机 ${languageLabel(language, dialect)} 解释器运行 ${relativePath}`
}

/** Pick a code activity's runnable payload. */
function codePayloadOf(activity: LessonActivity): CodeRunPayload | undefined {
  return activity.payload.type === 'code-run' ? activity.payload : undefined
}

/**
 * Plan the native source files for one export.
 *
 * @param sessions - activities grouped with their session title, already
 *                   loaded by the service.
 * @param environments - recorded environment facts keyed by language+dialect.
 */
export function planNativeSources(
  sessions: readonly {
    readonly sessionTitle: string
    readonly activities: readonly LessonActivity[]
  }[],
  environments: readonly EnvironmentRecord[],
): PlannedNativeSource[] {
  const byLanguage = new Map<string, EnvironmentRecord[]>()
  for (const environment of environments) {
    const key = `${environment.language}\u0000${environment.dialect ?? ''}`
    const list = byLanguage.get(key) ?? []
    list.push(environment)
    byLanguage.set(key, list)
  }
  const findEnvironment = (language: string, dialect: string | undefined): EnvironmentRecord | undefined => {
    const candidates = byLanguage.get(`${language}\u0000${dialect ?? ''}`)
      ?? byLanguage.get(`${language}\u0000`)
      ?? []
    const ready = candidates.filter(environment => environment.status === 'ready')
    return ready.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  }

  const planned: PlannedNativeSource[] = []
  for (const session of sessions) {
    for (const activity of session.activities) {
      const payload = codePayloadOf(activity)
      if (payload === undefined) continue
      const environment = findEnvironment(payload.language, payload.dialect)
      const path = `native/${activity.id}.${extensionFor(payload.language)}`
      planned.push({
        activityId: activity.id,
        sessionTitle: session.sessionTitle,
        title: payload.title ?? activity.title,
        language: payload.language,
        ...(payload.dialect !== undefined ? { dialect: payload.dialect } : {}),
        path,
        code: payload.code,
        environmentNote: environmentNoteFor(payload.language, payload.dialect, environment),
        runInstructions: commandFor(payload.language, payload.dialect, path, environment),
      })
    }
  }
  return planned
}

/** Whether a planned export includes a SICP-dialect Scheme program. */
export function needsSicpPrelude(planned: readonly PlannedNativeSource[]): boolean {
  return planned.some((source) => source.language === 'scheme' && (source.dialect === undefined || source.dialect === 'sicp'))
}

/** Build the `native/README.md` run instructions for one export. */
export function buildNativeReadme(
  planned: readonly PlannedNativeSource[],
  options: { readonly pluginVersion: string; readonly exportId: string; readonly includeSicpPrelude: boolean },
): string {
  const lines: string[] = []
  lines.push('# 原生实验源码与运行说明')
  lines.push('')
  lines.push(`本目录由「AI 知识库教学」插件离线导出生成（导出编号 ${options.exportId}，插件版本 ${options.pluginVersion}）。`)
  lines.push('')
  lines.push('离线页面不执行原生代码；这里的源码来自课程活动，环境说明与运行方式如下。')
  lines.push('导出不包含解释器、依赖包、运行环境或任何凭据，也不包含插件内保存的历史运行输出。')
  lines.push('')
  if (planned.length === 0) {
    lines.push('本次导出没有可导出的原生实验源码。')
  }
  for (const source of planned) {
    lines.push(`## ${source.title}`)
    lines.push('')
    lines.push(`- 会话：${source.sessionTitle}`)
    lines.push(`- 语言：${languageLabel(source.language, source.dialect)}`)
    lines.push(`- 源码文件：\`${source.path}\``)
    lines.push(`- 环境说明：${source.environmentNote}`)
    lines.push(`- 运行方式：${source.runInstructions}`)
    lines.push('')
  }
  if (options.includeSicpPrelude) {
    lines.push('## SICP 教学预置库')
    lines.push('')
    lines.push('文件：`native/sicp-prelude.scm`')
    lines.push('插件在运行 SICP 方言实验时会先加载该预置库（`nil`/`true`/`false`/`inc`/`dec`/流原语等）；')
    lines.push('在插件外运行这些代码时，请先加载同一预置库，否则部分名字会缺失。')
    lines.push('')
  }
  lines.push('---')
  lines.push('真实断网与浏览器交互验证需要在导出后由使用者在本机打开页面确认；本目录只包含源码与说明。')
  lines.push('')
  return lines.join('\n')
}
