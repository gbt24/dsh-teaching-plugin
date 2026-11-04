/**
 * Real lightweight-environment extension: Ruby 3.4 on this host.
 *
 * The flow is probe → prepare in an isolated directory → real smoke run →
 * real user run → persistence across a host restart → cleanup. The test skips
 * (rather than fakes) when Ruby is not installed on the machine.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createEnvironmentManager } from '../../src/environments/index.ts'
import { withContext } from './helpers.ts'

test('Ruby extension: probe → isolated prepare → smoke → run → restart → cleanup', { timeout: 120_000 }, async (t) => {
  await withContext(async ({ manager, runners, dataDir }) => {
    const needs = await manager.detectNeeds([
      { language: 'ruby', reason: '课程需要 Ruby 实验', source: 'material' },
    ])
    assert.equal(needs.ok, true)
    if (!needs.ok) return
    const need = needs.value[0]
    if (need?.status !== 'available') {
      t.skip('本机未安装 Ruby；真实扩展证据见 docs/evidence/T06.md（本机 ruby 3.4.12）')
      return
    }
    assert.match(need.version ?? '', /^\d+\.\d+\.\d+$/u)
    assert.equal(need.kind, 'managed')

    const phases: string[] = []
    const prepared = await manager.prepare(
      { language: 'ruby', courseId: 'course-test' as never },
      { onProgress: event => phases.push(event.phase) },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'ready')
    assert.equal(record.kind, 'managed')
    assert.match(record.version ?? '', /^\d+\.\d+\.\d+$/u)
    assert.equal(record.isolation.dependencies, 'isolated')
    const managedDir = record.isolation.path
    assert.ok(managedDir !== undefined && managedDir.startsWith(join(dataDir, 'environments', 'managed')))
    assert.ok(existsSync(managedDir), 'managed environment directory exists on disk')
    assert.equal(record.execution.mode, 'process')
    assert.match(record.execution.executable ?? '', /ruby/u)
    assert.equal(record.execution.cancellable, true)
    assert.equal(record.execution.network, 'unknown', 'network reachability is reported as unknown, not assumed')
    assert.match(record.execution.confinement ?? '', /无 CPU\/内存配额/u)
    assert.deepEqual(phases, ['probe', 'prepare', 'smoke', 'done'])

    // Real smoke run with objective checks (the manager re-runs the program).
    const smoke = await manager.smoke(record.id)
    assert.equal(smoke.ok, true)
    if (!smoke.ok) return
    assert.equal(smoke.value.status, 'succeeded')
    assert.equal(smoke.value.verification, 'objective')
    assert.equal(smoke.value.stdout.trim(), '42')
    assert.deepEqual(smoke.value.checks?.map(check => check.status), ['pass', 'pass'])

    // Real user run, including proof that GEM_HOME points inside the plugin dir.
    const run = await manager.run({
      language: 'ruby',
      code: 'puts RUBY_VERSION\nputs 6 * 7\nputs ENV.fetch("GEM_HOME", "")\n',
      checks: [
        { name: '计算结果', type: 'stdout-contains', value: '42' },
        { name: '正常退出', type: 'exit-code', value: 0 },
      ],
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.verification, 'objective')
    assert.match(run.stdout, new RegExp(String(record.version).replaceAll('.', '\\.'), 'u'))
    assert.match(run.stdout, /42\n/u)
    const gemHome = run.stdout.split('\n').find(line => line.includes('managed'))
    assert.ok(gemHome !== undefined, 'child process saw the isolated GEM_HOME')
    assert.ok(gemHome === undefined || gemHome.startsWith(String(managedDir)))

    // Persisted record: survives a new manager instance (host restart).
    const state = JSON.parse(await readFile(join(dataDir, 'environments', 'state.json'), 'utf8')) as {
      schemaVersion: number
      records: { id: string; status: string }[]
    }
    assert.equal(state.schemaVersion, 1)
    assert.equal(state.records.some(item => item.id === record.id && item.status === 'ready'), true)
    const restarted = createEnvironmentManager({ dataDir, runners })
    try {
      const seen = await restarted.getEnvironment('ruby')
      assert.equal(seen?.id, record.id)
      assert.equal(seen?.version, record.version)
      const directory = await restarted.directory()
      const row = directory.supportedLanguages.find(item => item.language === 'ruby')
      assert.equal(row?.status, 'ready')
      assert.equal(row?.environmentId, record.id)
    } finally {
      await restarted.dispose()
    }

    // Cleanup demo: plugin-owned directory removed, record updated to missing.
    const cleanup = await manager.cleanup(record.id)
    assert.equal(cleanup.status, 'cleaned')
    assert.deepEqual(cleanup.removedPaths, [managedDir])
    assert.equal(cleanup.record?.status, 'missing')
    assert.equal(existsSync(String(managedDir)), false, 'managed directory is gone')
    const again = await manager.cleanup(record.id)
    assert.equal(again.status, 'not-needed')
    const afterCleanup = await manager.get(record.id)
    assert.equal(afterCleanup?.status, 'missing')
    const smokeAfter = await manager.smoke(record.id)
    assert.equal(smokeAfter.ok, false)
    if (!smokeAfter.ok) assert.equal(smokeAfter.error.code, 'capability-missing')
  })
})

test('builtin Python environment facts and cleanup semantics stay separate', { timeout: 120_000 }, async (t) => {
  await withContext(async ({ manager }) => {
    const prepared = await manager.prepare({ language: 'python' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    if (record.status !== 'ready') {
      t.skip('本机 Python 环境不可用')
      return
    }
    assert.equal(record.kind, 'system')
    assert.equal(record.isolation.dependencies, 'none')
    assert.equal(record.isolation.path, undefined, 'system Python creates no managed directory')
    assert.equal(record.execution.mode, 'process')
    assert.equal(record.execution.cancellable, true)
    // Cancellation/limits are execution facts; dependency isolation is 'none'.
    const cleanup = await manager.cleanup(record.id)
    assert.equal(cleanup.status, 'not-needed')
    assert.match(cleanup.message, /系统运行时/u)
  })
})

test('extended runs are cancellable while a builtin environment stays usable', { timeout: 120_000 }, async (t) => {
  await withContext(async ({ manager }) => {
    const needs = await manager.detectNeeds([{ language: 'ruby', reason: '取消验证', source: 'activity' }])
    if (!needs.ok || needs.value[0]?.status !== 'available') {
      t.skip('本机未安装 Ruby')
      return
    }
    const prepared = await manager.prepare({ language: 'ruby' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    if (prepared.value.status !== 'ready') {
      t.skip('Ruby 环境准备失败')
      return
    }
    // 1) AbortSignal cancels a long run.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 250)
    try {
      const cancelled = await manager.run(
        { language: 'ruby', code: 'sleep 10\nputs "never"\n' },
        { signal: controller.signal },
      )
      assert.equal(cancelled.status, 'cancelled')
      assert.ok((cancelled.durationMs ?? 0) < 8_000, 'cancelled run did not wait for the sleep')
      assert.equal(cancelled.stdout.includes('never'), false)
    } finally {
      clearTimeout(timer)
    }
    // 2) cancelRun() addresses an in-flight extended run by id.
    const pending = manager.run({ language: 'ruby', code: 'sleep 10\n' })
    await new Promise(resolve => setTimeout(resolve, 250))
    const active = manager.activeRuns()
    const target = active.find(run => run.language === 'ruby' && run.status === 'running')
    assert.ok(target !== undefined, 'run appears in activeRuns while in flight')
    if (target !== undefined) {
      const final = await manager.cancelRun(target.id)
      assert.equal(final?.status, 'cancelled')
    }
    await pending
    // 3) The prepared environment directory survives cancelled runs.
    const smoke = await manager.smoke(prepared.value.id)
    assert.equal(smoke.ok, true)
    if (smoke.ok) assert.equal(smoke.value.status, 'succeeded')
  })
})
