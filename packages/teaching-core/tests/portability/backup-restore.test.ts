/**
 * Backup / inspect / restore behaviour (AC15, R30).
 *
 * All fixtures live in OS temp directories; no test touches `~/.dsh` or the
 * repository's sample material.
 */
import assert from 'node:assert/strict'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { BackupManifest } from '../../src/contracts/index.ts'
import { BACKUP_FORMAT_VERSION } from '../../src/contracts/index.ts'
import { SCHEMA_VERSION } from '../../src/storage/layout.ts'
import { readValidatedArchive, sha256Hex } from '../../src/portability/index.ts'
import { createPortabilityService } from '../../src/portability/index.ts'
import { LocalState } from '../../src/storage/local-state.ts'
import {
  CourseRepository, LearningRepository, SessionRepository,
} from '../../src/storage/repositories.ts'
import { createTestStore, seedTeachingData } from './helpers.ts'

/** Rewrite one archive (used to simulate tampering/corruption). */
async function rewriteArchive(
  sourcePath: string,
  targetPath: string,
  mutate: (entries: Record<string, Uint8Array>, manifest: BackupManifest) => void,
): Promise<void> {
  const entries = unzipSync(new Uint8Array(await readFile(sourcePath)))
  const manifestBytes = entries['manifest.json']
  assert.ok(manifestBytes !== undefined, 'fixture archive has manifest')
  const manifest = JSON.parse(strFromU8(manifestBytes)) as BackupManifest
  mutate(entries, manifest)
  entries['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  await writeFile(targetPath, zipSync(entries))
}

/** Change one byte in place so the size check still passes and sha256 must catch it. */
function tamperBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes)
  copy[0] = (copy[0] ?? 0) ^ 0xff
  return copy
}

/** List archive files of one backups directory. */
async function zipFiles(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter(name => name.endsWith('.zip')).sort()
}

test('backup manifest covers durable data with sha256, categories and source paths', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const created = await store.service.createBackup()
    assert.ok(created.ok, created.ok ? '' : created.error.message)
    const result = created.value
    assert.equal(result.manifest.formatVersion, BACKUP_FORMAT_VERSION)
    assert.equal(result.manifest.schemaVersion, SCHEMA_VERSION)
    assert.equal(result.manifest.excludesCredentials, true)
    assert.equal(result.manifest.pluginVersion, store.pluginVersion)
    assert.equal(result.manifest.appVersion, store.appVersion)
    assert.ok(result.bytes > 0)
    assert.equal(result.archivePath, join(store.state.paths.backups, `${result.backupId}.zip`))

    const categories = new Set(result.manifest.entries.map(entry => entry.category))
    for (const expected of ['meta', 'profile', 'settings', 'course', 'course-revision', 'source',
      'session', 'session-messages', 'activity', 'activity-state', 'learning', 'environment', 'run']) {
      assert.ok(categories.has(expected), `backup covers ${expected}`)
    }
    assert.ok(result.manifest.entries.every(entry => !entry.path.startsWith('usage/')), 'usage excluded by default')
    assert.ok(result.manifest.entries.every(entry => !entry.path.startsWith('cache/')), 'cache excluded')
    assert.ok(result.manifest.entries.every(entry => !entry.path.startsWith('exports/')), 'exports excluded')
    assert.ok(result.manifest.entries.every(entry => !entry.path.startsWith('backups/')), 'backups excluded')
    const total = result.manifest.entries.reduce((sum, entry) => sum + entry.bytes, 0)
    assert.equal(result.manifest.totalBytes, total)

    // Every recorded sha256 matches the file still on disk.
    for (const entry of result.manifest.entries) {
      const bytes = new Uint8Array(await readFile(join(store.dir, ...entry.path.split('/'))))
      assert.equal(sha256Hex(bytes), entry.sha256, `sha256 for ${entry.path}`)
      assert.equal(bytes.byteLength, entry.bytes)
    }

    const present = result.manifest.sourcePaths.find(item => item.sourceId === data.presentSource.id)
    const missing = result.manifest.sourcePaths.find(item => item.sourceId === data.missingSource.id)
    assert.equal(present?.exists, true)
    assert.equal(present?.path, data.materialFile)
    assert.equal(missing?.exists, false)
    assert.equal(missing?.path, data.missingFile)

    const validated = await readValidatedArchive(result.archivePath)
    assert.ok(validated.ok, validated.ok ? '' : validated.error.message)
    assert.deepEqual(validated.value.manifest.id, result.manifest.id)

    // Inspect (UI preview) returns the same manifest without restoring.
    const inspected = await store.service.inspectBackup(result.archivePath)
    assert.ok(inspected.ok)
    assert.deepEqual(inspected.value.id, result.manifest.id)

    // listArtifacts sees the backup sidecar.
    const artifacts = await store.service.listArtifacts()
    assert.ok(artifacts.backups.some(manifest => manifest.id === result.manifest.id))

    // The manifest sidecar is valid JSON and excludes credentials.
    const sidecar = await readFile(join(store.state.paths.backups, `${result.backupId}.manifest.json`), 'utf8')
    assert.equal(JSON.parse(sidecar).excludesCredentials, true)
    assert.doesNotMatch(sidecar, /apiKey|api_key|secret|token/iu)
  } finally {
    await store.dispose()
  }
})

test('usage log can be included explicitly and validation rejects bad args', async () => {
  const store = await createTestStore({ includeUsageInBackups: true })
  try {
    await seedTeachingData(store)
    const created = await store.service.createBackup()
    assert.ok(created.ok)
    assert.ok(created.value.manifest.entries.some(entry => entry.path.startsWith('usage/')), 'usage included when configured')

    const relative = await store.service.createBackup('relative/path')
    assert.ok(!relative.ok)
    assert.equal(relative.ok ? '' : relative.error.code, 'invalid-input')
  } finally {
    await store.dispose()
  }
})

test('inspect rejects tampered bytes, missing files, unsafe paths, newer schema and corrupt zips', async () => {
  const store = await createTestStore()
  try {
    await seedTeachingData(store)
    const created = await store.service.createBackup()
    assert.ok(created.ok)
    const archivePath = created.value.archivePath
    const tamperDir = join(store.materialDir, 'tampered')
    await mkdir(tamperDir, { recursive: true })

    // 1. Modified file bytes (sha256 mismatch).
    const tamperedFile = join(tamperDir, 'tampered-file.zip')
    await rewriteArchive(archivePath, tamperedFile, (entries) => {
      const target = 'sessions/does-not-matter'
      void target
      const name = Object.keys(entries).find(key => key.endsWith('.messages.jsonl'))
      assert.ok(name !== undefined)
      const bytes = entries[name]
      assert.ok(bytes !== undefined)
      entries[name] = tamperBytes(bytes)
    })
    const tampered = await store.service.inspectBackup(tamperedFile)
    assert.ok(!tampered.ok)
    assert.equal(tampered.ok ? '' : tampered.error.code, 'storage')
    assert.match(tampered.ok ? '' : tampered.error.message, /sha256/iu)

    // 2. A manifest entry whose file is missing from the zip.
    const missingFile = join(tamperDir, 'missing-entry.zip')
    await rewriteArchive(archivePath, missingFile, (entries, manifest) => {
      const victim = manifest.entries[0]
      assert.ok(victim !== undefined)
      delete entries[victim.path]
    })
    const missing = await store.service.inspectBackup(missingFile)
    assert.ok(!missing.ok)
    assert.match(missing.ok ? '' : missing.error.message, /缺少清单中的文件/iu)

    // 3. Path traversal in the manifest.
    const traversal = join(tamperDir, 'traversal.zip')
    await rewriteArchive(archivePath, traversal, (entries, manifest) => {
      entries['../evil.txt'] = strToU8('evil')
      ;(manifest.entries as BackupManifest['entries'][number][]).push({
        path: '../evil.txt',
        bytes: 4,
        sha256: sha256Hex(strToU8('evil')),
        category: 'other',
      })
    })
    const unsafe = await store.service.inspectBackup(traversal)
    assert.ok(!unsafe.ok)
    assert.match(unsafe.ok ? '' : unsafe.error.message, /非法路径/iu)

    // 4. Backup written by a newer plugin schema.
    const newer = join(tamperDir, 'newer-schema.zip')
    await rewriteArchive(archivePath, newer, (_entries, manifest) => {
      ;(manifest as { schemaVersion: number }).schemaVersion = SCHEMA_VERSION + 1
    })
    const incompatible = await store.service.inspectBackup(newer)
    assert.ok(!incompatible.ok)
    assert.equal(incompatible.ok ? '' : incompatible.error.code, 'storage')
    assert.match(incompatible.ok ? '' : incompatible.error.message, /schema/iu)

    // 5. Not a zip at all.
    const corrupt = join(tamperDir, 'corrupt.zip')
    await writeFile(corrupt, 'this is not a zip file')
    const corruptResult = await store.service.inspectBackup(corrupt)
    assert.ok(!corruptResult.ok)
    assert.match(corruptResult.ok ? '' : corruptResult.error.message, /ZIP/iu)

    // 6. Missing archive path.
    const absent = await store.service.inspectBackup(join(tamperDir, 'not-there.zip'))
    assert.ok(!absent.ok)
    assert.equal(absent.ok ? '' : absent.error.code, 'not-found')
  } finally {
    await store.dispose()
  }
})

test('restore reports missing sources and creates a pre-restore backup', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const created = await store.service.createBackup()
    assert.ok(created.ok)
    const archivePath = created.value.archivePath
    const before = (await zipFiles(store.state.paths.backups)).length

    const restored = await store.service.restoreBackup(archivePath)
    assert.ok(restored.ok, restored.ok ? '' : restored.error.message)
    const report = restored.value
    assert.equal(report.backupId, created.value.manifest.id)
    assert.equal(report.restored.length, created.value.manifest.entries.length)
    assert.equal(report.missingSources.length, 1)
    assert.equal(report.missingSources[0]?.sourceId, data.missingSource.id)
    assert.equal(report.missingSources[0]?.path, data.missingFile)
    assert.equal(report.needsPathRemap, true)
    const warnings = report.warnings.join('\n')
    assert.match(warnings, /恢复前已自动备份当前数据/)
    assert.match(warnings, /可能需要重启/)
    assert.match(warnings, /目标数据目录为空|恢复前已自动备份/u)

    const backups = await zipFiles(store.state.paths.backups)
    assert.ok(backups.length >= before + 1, 'pre-restore backup archive exists')

    // The restored source record keeps the missing flag instead of dropping the reference.
    const stored = await store.courses.getSource(data.missingSource.id)
    assert.ok(stored !== undefined)
    assert.equal(stored.missing, true)
    assert.equal(stored.originalPath, data.missingFile)

    // Core references still resolve by id after restore.
    const course = await store.courses.get(data.course.id)
    assert.equal(course?.title, data.course.title)
    const session = await store.sessions.get(data.session.id)
    assert.equal(session?.courseId, data.course.id)
    const learning = await store.learning.get(data.course.id)
    assert.equal(learning?.attempts.length, 1)
  } finally {
    await store.dispose()
  }
})

test('restore into a new data directory remaps sources and keeps id references', async () => {
  const source = await createTestStore()
  const target = await createTestStore({ open: false })
  try {
    const data = await seedTeachingData(source)
    const created = await source.service.createBackup()
    assert.ok(created.ok)
    const relocated = join(target.materialDir, 'relocated-overfitting.md')
    await writeFile(relocated, '# 过拟合（迁移后）\n', 'utf8')

    const restored = await target.service.restoreBackup(created.value.archivePath, {
      remapSources: { [data.missingFile]: relocated },
    })
    assert.ok(restored.ok, restored.ok ? '' : restored.error.message)
    const report = restored.value
    assert.equal(report.missingSources.length, 0)
    assert.equal(report.needsPathRemap, false)
    assert.match(report.warnings.join('\n'), /目标数据目录为空/)

    const sourceDocument = await target.courses.getSource(data.missingSource.id)
    assert.ok(sourceDocument !== undefined)
    assert.equal(sourceDocument.originalPath, relocated)
    assert.notEqual(sourceDocument.missing, true)
    assert.equal(sourceDocument.courseIds.includes(data.course.id), true)

    const course = await target.courses.get(data.course.id)
    assert.equal(course?.activeRevisionId, data.revision.id)
    const revision = await target.courses.getRevision(data.course.id, data.revision.id)
    assert.equal(revision?.concepts.length, 2)
    const session = await target.sessions.get(data.session.id)
    assert.equal(session?.courseRevisionId, data.revision.id)
    assert.equal((await target.sessions.messages(data.session.id)).length, 2)
    const activities = await target.sessions.listActivities(data.session.id)
    assert.equal(activities.length, data.activities.length)
    const graph = await target.sessions.getActivity(data.graphActivity.id)
    assert.equal(graph?.payload.type, 'graph')
    const state = await target.sessions.getActivityState(data.graphActivity.id)
    assert.deepEqual(state?.params, { a: 1.5 })
    const learning = await target.learning.get(data.course.id)
    assert.equal(learning?.mastery[0]?.evidenceAttemptIds.length, 1)
    const artifacts = await target.service.listArtifacts()
    assert.equal(artifacts.backups.length, 0)
  } finally {
    await source.dispose()
    await target.dispose()
  }
})

test('restore rejects an old schema and a tampered archive without touching current data', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const created = await store.service.createBackup()
    assert.ok(created.ok)
    const courseBefore = await readFile(join(store.dir, 'courses', `${data.course.id}.json`), 'utf8')

    const older = join(store.materialDir, 'older.zip')
    await rewriteArchive(created.value.archivePath, older, (_entries, manifest) => {
      ;(manifest as { schemaVersion: number }).schemaVersion = 0
    })
    const rejected = await store.service.restoreBackup(older)
    assert.ok(!rejected.ok)
    assert.equal(rejected.ok ? '' : rejected.error.code, 'storage')
    assert.match(rejected.ok ? '' : rejected.error.message, /需要迁移/iu)

    const tampered = join(store.materialDir, 'tampered.zip')
    await rewriteArchive(created.value.archivePath, tampered, (entries) => {
      const name = Object.keys(entries).find(key => key.startsWith('courses/') && key.endsWith('.json'))
      assert.ok(name !== undefined)
      const bytes = entries[name]
      assert.ok(bytes !== undefined)
      entries[name] = tamperBytes(bytes)
    })
    const failed = await store.service.restoreBackup(tampered)
    assert.ok(!failed.ok)
    assert.match(failed.ok ? '' : failed.error.message, /sha256/iu)

    const courseAfter = await readFile(join(store.dir, 'courses', `${data.course.id}.json`), 'utf8')
    assert.equal(courseAfter, courseBefore)
    const backups = await zipFiles(store.state.paths.backups)
    assert.equal(backups.length, 1, 'no pre-restore backup on failed validation')
  } finally {
    await store.dispose()
  }
})

test('restored data opens in a fresh LocalState with the current schema', async () => {
  const source = await createTestStore()
  const target = await createTestStore({ open: false })
  try {
    await seedTeachingData(source)
    const created = await source.service.createBackup()
    assert.ok(created.ok)
    const restored = await target.service.restoreBackup(created.value.archivePath)
    assert.ok(restored.ok)
    const freshState = new LocalState({ dataDir: target.dir })
    const meta = await freshState.open()
    assert.equal(meta.schemaVersion, SCHEMA_VERSION)
    const courses = new CourseRepository(freshState)
    const sessions = new SessionRepository(freshState)
    const learning = new LearningRepository(freshState)
    const portability = createPortabilityService({
      state: freshState,
      courses,
      sessions,
      learning,
      pluginVersion: '0.1.0-test',
      appVersion: 'test',
    })
    const artifacts = await portability.listArtifacts()
    assert.ok(Array.isArray(artifacts.backups))
  } finally {
    await source.dispose()
    await target.dispose()
  }
})
