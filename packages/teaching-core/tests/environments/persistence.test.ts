/**
 * Persistence mechanics: versioned atomic state under `<dataDir>/environments`,
 * quarantine of corrupt/newer files, and stale-preparation recovery.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import type { EnvironmentRecord } from '../../src/contracts/experiment.ts'
import { environmentId as newEnvironmentId } from '../../src/contracts/ids.ts'
import { createEnvironmentManager } from '../../src/environments/index.ts'
import { makeTempDataDir, shellAdapter, withContext } from './helpers.ts'

/** A structurally valid record used to seed a state file. */
function preparingRecord(path: string | undefined): EnvironmentRecord {
  const now = new Date().toISOString()
  return {
    id: newEnvironmentId(),
    language: 't06-stale',
    kind: 'managed',
    status: 'preparing',
    isolation: {
      dependencies: 'isolated',
      ...(path !== undefined ? { path } : {}),
      note: '测试用中断记录',
    },
    execution: {
      mode: 'process',
      timeoutMs: 10_000,
      cancellable: true,
      network: 'unknown',
      confinement: '测试',
    },
    createdAt: now,
    updatedAt: now,
  }
}

async function writeStateFile(dataDir: string, value: unknown): Promise<string> {
  const root = join(dataDir, 'environments')
  await mkdir(root, { recursive: true })
  const statePath = join(root, 'state.json')
  await writeFile(statePath, typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf8')
  return statePath
}

test('prepared environments persist across manager instances and reload through the directory', async () => {
  const adapter = shellAdapter({ language: 't06-persist', smokeProgram: 'printf "42\\n"\n' })
  await withContext(async ({ manager, runners, dataDir }) => {
    const prepared = await manager.prepare({ language: 't06-persist' })
    assert.equal(prepared.ok, true)
    if (!prepared.ok) return
    assert.equal(prepared.value.status, 'ready')

    const restarted = createEnvironmentManager({ dataDir, runners, adapters: [adapter] })
    try {
      const seen = await restarted.get(prepared.value.id)
      assert.equal(seen?.status, 'ready')
      assert.equal(seen?.language, 't06-persist')
      const records = await restarted.listRecords()
      assert.equal(records.some(record => record.id === prepared.value.id), true)
      const environment = await restarted.getEnvironment('t06-persist')
      assert.equal(environment?.id, prepared.value.id)
      const directory = await restarted.directory()
      assert.equal(directory.environments.some(record => record.id === prepared.value.id), true)
      const row = directory.supportedLanguages.find(item => item.language === 't06-persist')
      assert.equal(row?.status, 'ready')
    } finally {
      await restarted.dispose()
    }
    // Atomic save leaves no temp file behind.
    const entries = await readdir(join(dataDir, 'environments'))
    assert.deepEqual(entries.filter(entry => entry.startsWith('.state-')), [])
  }, { adapters: [adapter] })
})

test('a corrupt state file is quarantined instead of silently overwritten', async () => {
  const dataDir = await makeTempDataDir()
  try {
    const statePath = await writeStateFile(dataDir, '{not-json')
    const events: string[] = []
    const manager = createEnvironmentManager({
      dataDir,
      runners: (await import('../../src/experiments/index.ts')).createRunnerRegistry({ dataDir }),
      logger: event => events.push(event),
    })
    try {
      const records = await manager.listRecords()
      assert.deepEqual(records, [])
      assert.equal(existsSync(statePath), false, 'corrupt file was moved aside')
      const entries = await readdir(join(dataDir, 'environments'))
      assert.equal(entries.some(entry => entry.startsWith('state.corrupt-')), true)
      assert.ok(events.includes('environments.state-quarantined'))
    } finally {
      await manager.dispose()
    }
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('a newer schema state file is quarantined, not downgraded', async () => {
  const dataDir = await makeTempDataDir()
  try {
    await writeStateFile(dataDir, { schemaVersion: 99, updatedAt: new Date().toISOString(), records: [] })
    const { createRunnerRegistry } = await import('../../src/experiments/index.ts')
    const manager = createEnvironmentManager({ dataDir, runners: createRunnerRegistry({ dataDir }) })
    try {
      assert.deepEqual(await manager.listRecords(), [])
      const entries = await readdir(join(dataDir, 'environments'))
      assert.equal(entries.some(entry => entry.startsWith('state.unsupported-')), true)
    } finally {
      await manager.dispose()
    }
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('stale preparing records and orphan managed dirs are cleaned on the next start', async () => {
  const dataDir = await makeTempDataDir()
  try {
    const managedRoot = join(dataDir, 'environments', 'managed')
    const brokenDir = join(managedRoot, 't06-stale-interrupted')
    const orphanDir = join(managedRoot, 't06-orphan')
    const tmpDir = join(dataDir, 'environments', 'tmp', 'run-crashed')
    await mkdir(join(brokenDir, 'work'), { recursive: true })
    await writeFile(join(brokenDir, 'work', 'leftover.txt'), 'leftover', 'utf8')
    await mkdir(orphanDir, { recursive: true })
    await writeFile(join(orphanDir, 'orphan.txt'), 'orphan', 'utf8')
    await mkdir(tmpDir, { recursive: true })
    await writeFile(join(tmpDir, 'partial.py'), 'print(1)', 'utf8')
    const broken = preparingRecord(brokenDir)
    await writeStateFile(dataDir, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      records: [broken],
    })
    const { createRunnerRegistry } = await import('../../src/experiments/index.ts')
    const manager = createEnvironmentManager({ dataDir, runners: createRunnerRegistry({ dataDir }) })
    try {
      // Any async entry point triggers stale cleanup after loading records.
      const directory = await manager.directory()
      assert.ok(directory.gaps.length > 0)
      const recovered = await manager.get(broken.id)
      assert.equal(recovered?.status, 'failed')
      assert.equal(recovered?.failure?.code, 'interrupted')
      assert.equal(recovered?.failure?.cleanup, 'cleaned')
      assert.equal(existsSync(brokenDir), false, 'interrupted preparation directory removed')
      assert.equal(existsSync(orphanDir), false, 'orphan managed dir removed')
      assert.equal(existsSync(tmpDir), false, 'stale run directory removed')
    } finally {
      await manager.dispose()
      const { createRunnerRegistry: makeRegistry } = await import('../../src/experiments/index.ts')
      await makeRegistry({ dataDir }).dispose()
    }
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('invalid records inside an otherwise valid state file are skipped and reported', async () => {
  const dataDir = await makeTempDataDir()
  try {
    const seed = preparingRecord(undefined)
    const valid: EnvironmentRecord = { ...seed, status: 'failed' }
    const events: string[] = []
    await writeStateFile(dataDir, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      records: [valid, { id: 'broken', language: 42 }],
    })
    const { createRunnerRegistry } = await import('../../src/experiments/index.ts')
    const manager = createEnvironmentManager({
      dataDir,
      runners: createRunnerRegistry({ dataDir }),
      logger: event => events.push(event),
    })
    try {
      const records = await manager.listRecords()
      assert.equal(records.length, 1)
      assert.equal(records[0]?.id, valid.id)
      assert.ok(events.includes('environments.state-records-skipped'))
      const raw = JSON.parse(await readFile(join(dataDir, 'environments', 'state.json'), 'utf8')) as unknown
      assert.equal(typeof raw, 'object')
    } finally {
      await manager.dispose()
    }
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})
