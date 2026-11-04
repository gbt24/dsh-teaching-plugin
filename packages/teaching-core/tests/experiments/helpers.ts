/**
 * Helpers for the experiments tests: real temp data directories, one registry
 * per test, and cleanup. Tests never write into the repo, `~/.dsh` or the
 * user's home directory outside the OS temp area.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRunnerRegistry } from '../../src/experiments/index.ts'
import type { RunnerRegistry, RunnerRegistryOptions } from '../../src/experiments/index.ts'

/** Create a unique temp data directory for one test file/run. */
export async function makeTempDataDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'teaching-exp-test-'))
}

/** Create a registry rooted in a fresh temp directory, with cleanup helpers. */
export async function makeRegistry(options: Partial<RunnerRegistryOptions> = {}): Promise<{
  registry: RunnerRegistry
  dataDir: string
  cleanup: () => Promise<void>
}> {
  const dataDir = await makeTempDataDir()
  const registry = createRunnerRegistry({ dataDir, ...options })
  return {
    registry,
    dataDir,
    cleanup: async () => {
      await registry.dispose()
      await rm(dataDir, { recursive: true, force: true })
    },
  }
}

/** Run `fn` with a fresh registry and always clean up. */
export async function withRegistry(
  fn: (registry: RunnerRegistry, dataDir: string) => Promise<void>,
  options: Partial<RunnerRegistryOptions> = {},
): Promise<void> {
  const { registry, dataDir, cleanup } = await makeRegistry(options)
  try {
    await fn(registry, dataDir)
  } finally {
    await cleanup()
  }
}
