/**
 * Interpreter and package discovery for the three first-version languages.
 *
 * Discovery is always based on a real probe of the executable (a tiny program
 * that prints its version), never on a guessed path. Explicit overrides win so
 * the Host can pass the exact interpreter it already resolved.
 */
import { createRequire } from 'node:module'
import { accessSync, constants } from 'node:fs'
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runProcess } from './process.ts'

/** A resolved executable plus the argument/environment prefix used to run code. */
export interface ResolvedCommand {
  readonly executable: string
  readonly args: readonly string[]
  readonly env: Readonly<Record<string, string>>
  readonly version: string
  readonly note?: string
}

/** Candidates are probed in order; PATH lookup is done by the OS on spawn. */
function candidateList(explicit: string | undefined, envNames: readonly string[], defaults: readonly string[]): string[] {
  const found: string[] = []
  const push = (value: string | undefined): void => {
    if (value !== undefined && value.trim() !== '' && !found.includes(value)) found.push(value)
  }
  push(explicit)
  for (const name of envNames) push(process.env[name])
  for (const value of defaults) push(value)
  return found
}

/** True when the path points at an existing file (used to prefer absolute candidates). */
function existsAtPath(path: string): boolean {
  if (!isAbsolute(path)) return true // resolved through PATH; let spawn decide
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Probe one command by running `args` and reading stdout. */
async function probeCommand(
  command: string,
  args: readonly string[],
  env: Readonly<Record<string, string>>,
  parse: (stdout: string) => string | undefined,
): Promise<ResolvedCommand | undefined> {
  if (!existsAtPath(command)) return undefined
  const outcome = await runProcess({
    command,
    args: [...args],
    env: { ...process.env, ...env },
    timeoutMs: 8_000,
    maxOutputBytes: 8_192,
  })
  if (outcome.spawnError !== undefined) return undefined
  const version = parse(outcome.stdout)
  if (version === undefined) return undefined
  return { executable: command, args: [], env, version }
}

function parsePythonVersion(stdout: string): string | undefined {
  const match = /Python\s+(\d+\.\d+(?:\.\d+)?)/u.exec(stdout)
  return match?.[1]
}

function parseNodeVersion(stdout: string): string | undefined {
  const match = /v?(\d+\.\d+\.\d+)/u.exec(stdout)
  return match?.[1]
}

/** Resolve a Python 3 interpreter, preferring isolated mode (`-I`) at run time. */
export async function resolvePython(explicit?: string): Promise<ResolvedCommand | undefined> {
  const candidates = candidateList(explicit, ['TEACHING_PYTHON', 'PYTHON'], ['python3', 'python'])
  for (const candidate of candidates) {
    const probe = await probeCommand(candidate, ['--version'], {}, parsePythonVersion)
    if (probe !== undefined) {
      return { ...probe, args: ['-I'], note: '以 -I（隔离模式）运行：忽略 PYTHON* 环境变量与用户 site-packages' }
    }
  }
  return undefined
}

/** Probe one concrete Python executable (e.g. a virtualenv interpreter). */
export async function probePythonAt(path: string): Promise<ResolvedCommand | undefined> {
  const probe = await probeCommand(path, ['--version'], {}, parsePythonVersion)
  return probe === undefined ? undefined : { ...probe, args: ['-I'] }
}

/** Resolve the Node executable used for JavaScript experiments. */
export async function resolveNode(explicit?: string): Promise<ResolvedCommand | undefined> {
  // Inside Electron (the DeepSeek Harness host) `process.execPath` is the app
  // binary; ELECTRON_RUN_AS_NODE makes it behave as a plain Node process.
  if (process.versions.electron !== undefined) {
    const probe = await probeCommand(
      process.execPath,
      ['-e', 'process.stdout.write(process.version)'],
      { ELECTRON_RUN_AS_NODE: '1' },
      parseNodeVersion,
    )
    if (probe !== undefined) {
      return {
        ...probe,
        env: { ELECTRON_RUN_AS_NODE: '1' },
        note: 'DeepSeek Harness 内置 Electron Node（ELECTRON_RUN_AS_NODE=1）',
      }
    }
  }
  const candidates = candidateList(explicit, ['TEACHING_NODE'], [
    process.versions.electron === undefined ? process.execPath : 'node',
    'node',
  ])
  for (const candidate of candidates) {
    const probe = await probeCommand(candidate, ['-e', 'process.stdout.write(process.version)'], {}, parseNodeVersion)
    if (probe !== undefined) return probe
  }
  return undefined
}

/** Resolve the Node executable that will host the Scheme interpreter. */
export async function resolveNodeForScheme(options: {
  readonly nodePath?: string
  readonly biwaschemePath?: string
}): Promise<ResolvedCommand | undefined> {
  const node = await resolveNode(options.nodePath)
  if (node === undefined) return undefined
  const entry = resolveBiwaschemeEntry(options.biwaschemePath)
  if (entry === undefined) return undefined
  return {
    ...node,
    note: `${node.note ?? 'Node'} + npm biwascheme 解释器`,
  }
}

/**
 * Locate the CommonJS entry of the `biwascheme` package.
 *
 * `import.meta.resolve`/`createRequire` from this module works for source and
 * for the bundled Host (which lives inside the plugin package), so the same
 * lookup serves development and a linked install. An explicit path and an env
 * override exist for packaged layouts where the dependency sits elsewhere.
 */
export function resolveBiwaschemeEntry(explicit?: string): string | undefined {
  const candidates: string[] = []
  const push = (value: string | undefined): void => {
    if (value !== undefined && value.trim() !== '' && !candidates.includes(value)) candidates.push(value)
  }
  push(explicit)
  push(process.env.TEACHING_BIWASCHEME_ENTRY)
  const bases = [
    import.meta.url,
    join(process.cwd(), 'index.js'),
    ...moduleParentBases(),
  ]
  for (const base of bases) {
    try {
      const require = createRequire(base)
      push(require.resolve('biwascheme'))
    } catch { /* try the next base */ }
  }
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.R_OK)
      return candidate
    } catch { /* not this one */ }
  }
  return undefined
}

/** Walk up from this module looking for a `node_modules/biwascheme` directory. */
function moduleParentBases(): string[] {
  const bases: string[] = []
  try {
    let dir = dirname(fileURLToPath(import.meta.url))
    for (let depth = 0; depth < 8; depth += 1) {
      bases.push(join(dir, 'index.js'))
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch { /* import.meta.url may be unavailable in exotic bundles */ }
  return bases
}

/** PATH entries, useful for diagnostics and export instructions. */
export function pathEntries(): string[] {
  return (process.env.PATH ?? '').split(delimiter).filter(entry => entry !== '')
}

/** True when a resolved Node executable is the Electron application binary. */
export function isElectronExecutable(command: ResolvedCommand): boolean {
  return command.env.ELECTRON_RUN_AS_NODE === '1'
}

/** Directory containing the interpreter, used in EnvironmentRecord.execution. */
export function executableDir(command: ResolvedCommand): string | undefined {
  if (!isAbsolute(command.executable)) return undefined
  return dirname(resolve(command.executable))
}
