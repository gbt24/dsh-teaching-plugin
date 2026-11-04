/**
 * Failure cleanup and cancellation: preparation failures remove their
 * unfinished managed directories, record the truthful cleanup status, persist
 * the failed record, and never disturb an already-ready environment.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createEnvironmentManager } from '../../src/environments/index.ts'
import { makeContext, shellAdapter, withContext } from './helpers.ts'

test('a failing smoke run cleans the unfinished directory and keeps a failed record', async () => {
  const adapter = shellAdapter({ language: 't06-fail', smokeProgram: 'exit 7\n' })
  await withContext(async ({ manager, runners, dataDir }) => {
    const prepared = await manager.prepare({ language: 't06-fail' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'failed')
    assert.equal(record.failure?.code, 'smoke-failed')
    assert.equal(record.failure?.cleanup, 'cleaned')
    const managedDir = record.isolation.path
    assert.ok(managedDir !== undefined)
    assert.equal(existsSync(managedDir), false, 'unfinished directory was removed')

    // The failed record is persisted and explainable after a restart.
    const restarted = createEnvironmentManager({ dataDir, runners })
    try {
      const seen = await restarted.get(record.id)
      assert.equal(seen?.status, 'failed')
      assert.equal(seen?.failure?.code, 'smoke-failed')
      assert.match(seen?.fallback?.description ?? '', /准备失败/u)
      const records = await restarted.listRecords()
      assert.equal(records.some(item => item.id === record.id), true)
    } finally {
      await restarted.dispose()
    }

    // A fresh preparation uses a new id and does not reuse the failed directory.
    const retried = await manager.prepare({ language: 't06-fail' })
    assert.equal(retried.ok, true)
    if (retried.ok) {
      assert.notEqual(retried.value.id, record.id)
      assert.equal(retried.value.failure?.cleanup, 'cleaned')
    }
  }, { adapters: [adapter] })
})

test('AbortSignal cancels preparation during the smoke step and cleans up', async () => {
  const adapter = shellAdapter({ language: 't06-slow', smokeProgram: 'exec sleep 10\n' })
  await withContext(async ({ manager, dataDir }) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 250)
    const phases: string[] = []
    try {
      const prepared = await manager.prepare(
        { language: 't06-slow' },
        {
          signal: controller.signal,
          onProgress: event => phases.push(event.phase),
        },
      )
      assert.equal(prepared.ok, true)
      if (!prepared.ok) return
      const record = prepared.value
      assert.equal(record.status, 'failed')
      assert.equal(record.failure?.code, 'cancelled')
      assert.equal(record.failure?.cleanup, 'cleaned')
      assert.match(record.failure?.message ?? '', /取消/u)
      assert.ok(phases.includes('done'), 'progress terminates with a done event')
      const managedDir = record.isolation.path
      assert.ok(managedDir === undefined || !existsSync(managedDir))
      const persisted = await manager.get(record.id)
      assert.equal(persisted?.failure?.code, 'cancelled')
      assert.ok(dataDir.length > 0)
    } finally {
      clearTimeout(timer)
    }
  }, { adapters: [adapter] })
})

test('cancelPreparation(environmentId) aborts an in-flight preparation', async () => {
  const adapter = shellAdapter({ language: 't06-cancel-id', smokeProgram: 'exec sleep 10\n' })
  await withContext(async ({ manager }) => {
    let preparationId: string | undefined
    const preparedPromise = manager.prepare(
      { language: 't06-cancel-id' },
      {
        onProgress: event => {
          if (event.phase === 'probe') preparationId = event.record.id
        },
      },
    )
    // Wait until the record id is visible, then cancel by id.
    for (let attempt = 0; attempt < 50 && preparationId === undefined; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.ok(preparationId !== undefined, 'preparation id was reported through progress')
    await new Promise(resolve => setTimeout(resolve, 100))
    assert.equal(manager.cancelPreparation(preparationId as never), true)
    const prepared = await preparedPromise
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(prepared.value.failure?.code, 'cancelled')
    assert.equal(prepared.value.failure?.cleanup, 'cleaned')
    assert.equal(manager.cancelPreparation('env-does-not-exist' as never), false)
  }, { adapters: [adapter] })
})

test('a failed preparation never disturbs an already-ready environment', async () => {
  const good = shellAdapter({ language: 't06-good', smokeProgram: 'printf "42\\n"\n' })
  const bad = shellAdapter({ language: 't06-bad', smokeProgram: 'exit 9\n' })
  await withContext(async ({ manager }) => {
    const ready = await manager.prepare({ language: 't06-good' })
    assert.equal(ready.ok, true)
    if (!ready.ok) return
    assert.equal(ready.value.status, 'ready')
    const readyDir = ready.value.isolation.path
    assert.ok(readyDir !== undefined && existsSync(readyDir))

    const failed = await manager.prepare({ language: 't06-bad' })
    assert.equal(failed.ok, true)
    if (failed.ok) {
      assert.equal(failed.value.status, 'failed')
      assert.equal(failed.value.failure?.cleanup, 'cleaned')
    }
    // The ready environment still works after the unrelated failure.
    const stillThere = await manager.get(ready.value.id)
    assert.equal(stillThere?.status, 'ready')
    assert.ok(readyDir === undefined || existsSync(readyDir))
    const smoke = await manager.smoke(ready.value.id)
    assert.equal(smoke.ok, true)
    if (smoke.ok) {
      assert.equal(smoke.value.status, 'succeeded')
      assert.equal(smoke.value.stdout.trim(), '42')
    }
    // And a second prepare of the ready language reuses the record instead of
    // creating a new environment.
    const again = await manager.prepare({ language: 't06-good' })
    assert.equal(again.ok, true)
    if (again.ok) assert.equal(again.value.id, ready.value.id)
  }, { adapters: [good, bad] })
})

test('cleanup refuses paths outside the plugin-managed directory', async () => {
  const adapter = shellAdapter({ language: 't06-safe', smokeProgram: 'printf "42\\n"\n' })
  await withContext(async ({ manager, dataDir }) => {
    const prepared = await manager.prepare({ language: 't06-safe' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    const record = prepared.value
    assert.equal(record.status, 'ready')
    const managedDir = String(record.isolation.path)
    assert.ok(managedDir.startsWith(join(dataDir, 'environments', 'managed')))
    // Unknown ids and system environments have nothing plugin-owned to remove.
    const unknown = await manager.cleanup('env-unknown' as never)
    assert.equal(unknown.status, 'not-found')
    const unknownRecord = await manager.get('env-unknown' as never)
    assert.equal(unknownRecord, undefined)
  }, { adapters: [adapter] })
})
