/**
 * Student-approval branches: system-level changes are described but never
 * executed silently. Only an injected executor may act after approval, and
 * network dependency installs are never executed by the manager itself.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import type { EnvironmentApproval } from '../../src/environments/index.ts'
import {
  approvalAdapter, fakeInterpreterScript, makeTempDataDir, withContext, writeExecutable,
} from './helpers.ts'

test('without approval only a needs-approval record is produced and nothing is executed', async () => {
  const { adapter, plan } = approvalAdapter('t06-approved')
  const binDir = await makeTempDataDir('teaching-env-approval-')
  const wrapper = join(binDir, 't06-approved-bin')
  const executorCalls: string[] = []
  await withContext(async ({ manager, dataDir }) => {
    const prepared = await manager.prepare({ language: 't06-approved' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'needs-approval')
    assert.equal(record.systemChange?.required, true)
    assert.match(record.systemChange?.description ?? '', /系统级安装/u)
    assert.match(record.isolation.note ?? '', /未创建任何/u)
    assert.equal(executorCalls.length, 0, 'executor not called without approval')
    assert.equal(existsSync(wrapper), false, 'runtime was not installed')
    // The approval is persisted with the record, so it can be shown again.
    const persisted = await manager.get(record.id)
    assert.equal(persisted?.status, 'needs-approval')
    const directory = await manager.directory()
    const row = directory.supportedLanguages.find(item => item.language === 't06-approved')
    assert.equal(row?.status, 'needs-approval')
    assert.equal(dataDir.length > 0, true)
  }, {
    adapters: [adapter],
    installPlans: [plan],
    executables: { 't06-approved': wrapper },
    systemChangeExecutor: async (approval: EnvironmentApproval) => {
      executorCalls.push(approval.description)
      return { ok: true, message: 'unexpected call' }
    },
  })
  assert.equal(executorCalls.length, 0)
})

test('approval invokes the injected executor once, then probe → prepare → smoke succeeds', async () => {
  const { adapter, plan } = approvalAdapter('t06-approved')
  const binDir = await makeTempDataDir('teaching-env-approval-')
  const wrapper = join(binDir, 't06-approved-bin')
  const executorCalls: { kind: string; language: string }[] = []
  await withContext(async ({ manager }) => {
    const prepared = await manager.prepare(
      { language: 't06-approved' },
      {
        approveSystemChange: true,
      },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(executorCalls.length, 1, 'executor runs exactly once after approval')
    assert.deepEqual(executorCalls[0], { kind: 'system-change', language: 't06-approved' })
    assert.equal(record.status, 'ready')
    assert.equal(record.version, '9.9.9')
    assert.equal(record.kind, 'managed')
    const managedDir = String(record.isolation.path)
    assert.ok(managedDir.includes(join('environments', 'managed')))
    assert.ok(existsSync(managedDir), 'managed directory created after the approved change')
    // Real smoke: the injected wrapper really executed.
    const smoke = await manager.smoke(record.id)
    assert.equal(smoke.ok, true)
    if (!smoke.ok) return
    assert.equal(smoke.value.status, 'succeeded')
    assert.equal(smoke.value.stdout.trim(), '42')
  }, {
    adapters: [adapter],
    installPlans: [plan],
    executables: { 't06-approved': wrapper },
    systemChangeExecutor: async (approval: EnvironmentApproval, context) => {
      executorCalls.push({ kind: approval.kind, language: context.language })
      await mkdir(binDir, { recursive: true })
      await writeExecutable(wrapper, fakeInterpreterScript())
      return { ok: true, message: '测试替身：创建了合成运行时文件' }
    },
  })
  assert.equal(executorCalls.length, 1)
})

test('a failing approved executor is recorded as a system-change failure without a fake environment', async () => {
  const { adapter, plan } = approvalAdapter('t06-approve-fail')
  const binDir = await makeTempDataDir('teaching-env-approval-fail-')
  await withContext(async ({ manager }) => {
    const prepared = await manager.prepare(
      { language: 't06-approve-fail' },
      { approveSystemChange: true },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'failed')
    assert.equal(record.failure?.code, 'system-change-failed')
    assert.equal(record.failure?.cleanup, 'not-needed')
    assert.match(record.failure?.message ?? '', /模拟安装失败/u)
    assert.match(record.fallback?.description ?? '', /准备失败/u)
  }, {
    adapters: [adapter],
    installPlans: [plan],
    executables: { 't06-approve-fail': join(binDir, 't06-approve-fail-bin') },
    systemChangeExecutor: async () => ({ ok: false, message: '模拟安装失败' }),
  })
})

test('network dependency installs are never executed even when approval is requested', async () => {
  let executorCalls = 0
  await withContext(async ({ manager }) => {
    const prepared = await manager.prepare(
      { language: 'python', dependencies: ['numpy'] },
      { approveSystemChange: true },
    )
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'needs-approval')
    // Network installs are a separate approval kind; the manager does not run them.
    assert.equal(record.systemChange?.required, true)
    assert.match(record.fallback?.description ?? '', /联网/u)
    assert.equal(executorCalls, 0)
  }, {
    systemChangeExecutor: async () => {
      executorCalls += 1
      return { ok: true, message: '不应该被调用' }
    },
  })
  assert.equal(executorCalls, 0)
})

test('approval without an injected executor never executes anything', async () => {
  const { adapter, plan } = approvalAdapter('t06-noexec')
  const binDir = await makeTempDataDir('teaching-env-noexec-')
  const wrapper = join(binDir, 't06-noexec-bin')
  await withContext(async ({ manager }) => {
    const prepared = await manager.prepare({ language: 't06-noexec' }, { approveSystemChange: true })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(prepared.value.status, 'needs-approval')
    assert.match(prepared.value.isolation.note ?? '', /未配置系统级安装执行器/u)
    assert.equal(existsSync(wrapper), false)
  }, {
    adapters: [adapter],
    installPlans: [plan],
    executables: { 't06-noexec': wrapper },
  })
})
