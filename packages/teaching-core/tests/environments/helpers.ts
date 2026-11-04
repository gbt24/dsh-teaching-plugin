/**
 * Helpers for the T06 environment tests: real temp data directories, a real
 * RunnerRegistry + EnvironmentManager pair, and small synthetic adapters that
 * let failure/cancellation/approval branches run real child processes without
 * touching the host's package manager.
 */
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRunnerRegistry } from '../../src/experiments/index.ts'
import type { RunnerRegistry } from '../../src/experiments/index.ts'
import { createEnvironmentManager } from '../../src/environments/index.ts'
import type {
  EnvironmentManager, EnvironmentManagerOptions, ExtendedLanguageSpec,
} from '../../src/environments/index.ts'

/** Real temp data directory (never inside the repository). */
export async function makeTempDataDir(prefix = 'teaching-env-test-'): Promise<string> {
  return await mkdtemp(join(tmpdir(), prefix))
}

export interface LoggedEvent {
  readonly event: string
  readonly details?: Record<string, unknown>
}

export interface TestContext {
  readonly manager: EnvironmentManager
  readonly runners: RunnerRegistry
  readonly dataDir: string
  readonly events: readonly LoggedEvent[]
  readonly cleanup: () => Promise<void>
}

/** Build a manager + registry rooted in a fresh temp directory. */
export async function makeContext(
  options: Omit<Partial<EnvironmentManagerOptions>, 'dataDir' | 'runners'> = {},
): Promise<TestContext> {
  const dataDir = await makeTempDataDir()
  const runners = createRunnerRegistry({ dataDir })
  const events: LoggedEvent[] = []
  const manager = createEnvironmentManager({
    dataDir,
    runners,
    logger: (event, details) => events.push({ event, ...(details !== undefined ? { details } : {}) }),
    ...options,
  })
  return {
    manager,
    runners,
    dataDir,
    events,
    cleanup: async () => {
      await manager.dispose()
      await runners.dispose()
      await rm(dataDir, { recursive: true, force: true })
    },
  }
}

/** Run `fn` with a context and always clean up. */
export async function withContext(
  fn: (context: TestContext) => Promise<void>,
  options: Omit<Partial<EnvironmentManagerOptions>, 'dataDir' | 'runners'> = {},
): Promise<void> {
  const context = await makeContext(options)
  try {
    await fn(context)
  } finally {
    await context.cleanup()
  }
}

/** Write an executable shell script (used as a synthetic interpreter in tests). */
export async function writeExecutable(path: string, content: string): Promise<void> {
  await writeFile(path, content, 'utf8')
  await chmod(path, 0o755)
}

/** Build a minimal adapter that really executes through /bin/sh. */
export function shellAdapter(overrides: {
  readonly language: string
  readonly smokeProgram: string
  readonly expectedSmokeStdout?: string
  readonly runArgs?: readonly string[]
  readonly prepareDirs?: readonly string[]
}): ExtendedLanguageSpec {
  return {
    language: overrides.language,
    label: `Shell ${overrides.language}`,
    executables: ['/bin/sh'],
    versionArgs: ['-c', 'printf 9.9.9'],
    parseVersion: output => (output.includes('9.9.9') ? '9.9.9' : undefined),
    scriptExtension: 'sh',
    runArgs: overrides.runArgs ?? [],
    smokeProgram: overrides.smokeProgram,
    expectedSmokeStdout: overrides.expectedSmokeStdout ?? '42',
    ...(overrides.prepareDirs !== undefined ? { prepareDirs: overrides.prepareDirs } : {}),
    isolationNote: '测试用 /bin/sh 适配器：独立目录仅用于隔离演示',
  }
}

/**
 * A synthetic runtime whose executable appears only after a student-approved
 * system change. The wrapper prints a version for probing and 42 for smoke.
 */
export function fakeInterpreterScript(): string {
  return [
    '#!/bin/sh',
    'if [ "$1" = "--version" ]; then',
    '  printf "fake 9.9.9\\n"',
    '  exit 0',
    'fi',
    'printf "42\\n"',
    'exit 0',
    '',
  ].join('\n')
}

/** Approval plan + adapter for the approved-system-change test. */
export function approvalAdapter(language: string): {
  adapter: ExtendedLanguageSpec
  plan: {
    language: string
    label: string
    executables: string[]
    approval: {
      kind: 'system-change'
      description: string
      impact: string[]
      alternatives: string[]
      requiresNetwork: boolean
      executableByPlugin: false
      note: string
    }
  }
} {
  return {
    adapter: {
      language,
      label: `Fake ${language}`,
      executables: [`${language}-bin`],
      versionArgs: ['--version'],
      parseVersion: output => {
        const match = /fake\s+(\d+\.\d+\.\d+)/u.exec(output)
        return match?.[1]
      },
      scriptExtension: 'txt',
      runArgs: [],
      smokeProgram: 'ignored\n',
      expectedSmokeStdout: '42',
      isolationNote: '测试用合成运行时：独立目录位于插件数据目录',
    },
    plan: {
      language,
      label: `Fake ${language}`,
      executables: [`${language}-bin`],
      approval: {
        kind: 'system-change',
        description: '需要系统级安装合成运行时（测试替身，不执行真实包管理器）',
        impact: ['会写入全局可执行路径', '需要网络下载'],
        alternatives: ['改用 Python 完成同一实验', '学生自行安装后重新探测'],
        requiresNetwork: true,
        executableByPlugin: false,
        note: '测试中由注入的假执行器创建替身文件；真实系统不会被执行。',
      },
    },
  }
}
