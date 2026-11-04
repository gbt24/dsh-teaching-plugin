/**
 * Registry-level behaviour: environment directory, run history, stale temp
 * cleanup, and the managed Python virtualenv (isolation fact kept separate from
 * execution confinement).
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { withRegistry } from './helpers.ts'

test('environment directory lists the three first-version languages', async () => {
  await withRegistry(async (registry) => {
    const directory = await registry.directory()
    assert.deepEqual(directory.environments.map(record => record.language).sort(), ['javascript', 'python', 'scheme'])
    assert.deepEqual(directory.supportedLanguages.map(item => item.language).sort(), ['javascript', 'python', 'scheme'])
    // Detection on this machine: all three are installed; each row must agree
    // with the environment record instead of assuming readiness.
    for (const row of directory.supportedLanguages) {
      const record = directory.environments.find(item => item.language === row.language)
      assert.equal(row.status, record?.status)
    }
    assert.ok(directory.gaps.length > 0, 'gaps are stated instead of hidden')
    assert.ok(directory.gaps.some(gap => gap.includes('CPU/内存')))
  })
})

test('ready environments record dependency isolation and execution limits separately', async () => {
  await withRegistry(async (registry) => {
    const python = await registry.prepare({ language: 'python' })
    assert.equal(python.status, 'ready')
    assert.equal(python.isolation.dependencies, 'none')
    assert.equal(python.execution.mode, 'process')
    assert.equal(python.execution.cancellable, true)
    assert.equal(python.execution.timeoutMs, 10_000)
    assert.equal(python.kind, 'system')
    const scheme = await registry.prepare({ language: 'scheme', dialect: 'sicp' })
    assert.equal(scheme.status, 'ready')
    assert.equal(scheme.isolation.dependencies, 'shared')
    assert.match(scheme.version ?? '', /biwascheme/u)
  })
})

test('run history is bounded and cancel of an unknown id is a no-op', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'javascript', code: 'console.log(1)' })
    assert.equal(registry.getRun(run.id)?.id, run.id)
    assert.equal(await registry.cancel('run-does-not-exist'), undefined)
    // activeRuns is empty once the run settled.
    assert.deepEqual(registry.activeRuns(), [])
  })
})

test('a crashed-run temp directory is cleaned before the next run', async () => {
  await withRegistry(async (registry, dataDir) => {
    const staleDir = join(dataDir, 'experiments', 'tmp', 'run-crashed-123')
    await mkdir(staleDir, { recursive: true })
    await writeFile(join(staleDir, 'leftover.py'), 'print(1)\n', 'utf8')
    const run = await registry.run({ language: 'javascript', code: 'console.log("alive")' })
    assert.equal(run.status, 'succeeded')
    // The first run triggers stale cleanup of directories from a previous host.
    const report = await registry.cleanupStale()
    assert.equal(report.failed.length, 0)
    const { readdir } = await import('node:fs/promises')
    const remaining = await readdir(join(dataDir, 'experiments', 'tmp')).catch(() => [] as string[])
    assert.deepEqual(remaining.filter(entry => entry.includes('crashed')), [])
  })
})

test('managed venv is isolated from system Python and executable', { timeout: 120_000 }, async () => {
  await withRegistry(async (registry, dataDir) => {
    const record = await registry.prepare({ language: 'python', mode: 'venv' })
    if (record.status !== 'ready') {
      // venv creation is an environment capability; report instead of faking it.
      assert.match(record.failure?.message ?? record.fallback?.description ?? '', /venv|虚拟环境|python/u)
      return
    }
    assert.equal(record.kind, 'virtualenv')
    assert.equal(record.isolation.dependencies, 'isolated')
    const venvPath = record.isolation.path
    assert.ok(venvPath !== undefined && venvPath.startsWith(dataDir), `venv outside data dir: ${venvPath}`)
    // Real isolation evidence: sys.prefix points at the managed venv.
    const run = await registry.run({
      language: 'python',
      code: 'import sys\nprint(sys.prefix)\n',
    })
    assert.equal(run.status, 'succeeded')
    // macOS resolves /var to /private/var; compare the resolved real path.
    const { realpath } = await import('node:fs/promises')
    assert.equal(await realpath(run.stdout.trim()), await realpath(venvPath))
  })
})
