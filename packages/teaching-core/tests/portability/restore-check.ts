#!/usr/bin/env node
/**
 * Real-data restore rehearsal (T07 close-out evidence).
 *
 * Usage:
 *   node packages/teaching-core/tests/portability/restore-check.ts \
 *     .scratch/dsh-dev/home/teaching .scratch/restore-test-home
 *
 * The source teaching directory is only read/copied, never modified. The work
 * dir is recreated and receives:
 *   1. `base/teaching`   copy of the source data → backup → inspect → restore
 *                        into the same directory (auto pre-restore backup, and
 *                        byte comparison of durable files except meta.json);
 *   2. `remap/teaching`  copy of the source data → restore with `remapSources`
 *                        pointing at a relocated original material file;
 *   3. `missing/teaching` copy → restore with `remapSources` pointing at a
 *                        non-existent path (missingSources + needsPathRemap).
 *
 * The service instances use the same `LocalState`/repositories/seam the Host
 * routes use, so this exercises the real restore path rather than a mock.
 */
import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Course, CourseLearningRecord, SourceDocument } from '../../src/contracts/index.ts'
import { sha256Hex } from '../../src/portability/index.ts'
import { createPortabilityService } from '../../src/portability/index.ts'
import { LocalState } from '../../src/storage/local-state.ts'
import {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
} from '../../src/storage/repositories.ts'

const [sourceArgument, workArgument] = process.argv.slice(2)
if (sourceArgument === undefined || workArgument === undefined) {
  console.error('usage: node packages/teaching-core/tests/portability/restore-check.ts <teachingDir> <workDir>')
  process.exit(2)
}
const sourceDir = resolve(sourceArgument)
const workDir = resolve(workArgument)
await stat(sourceDir).catch(() => {
  console.error(`source teaching dir not found: ${sourceDir}`)
  process.exit(2)
})

const pluginVersion = '0.1.0'
const appVersion = '0.2.1-rc.5'

interface OpenedStore {
  readonly dataDir: string
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly sessions: SessionRepository
  readonly learning: LearningRepository
  readonly service: ReturnType<typeof createPortabilityService>
}

async function openStore(dataDir: string): Promise<OpenedStore> {
  const state = new LocalState({ dataDir })
  const meta = await state.open()
  const courses = new CourseRepository(state)
  const sessions = new SessionRepository(state)
  const learning = new LearningRepository(state)
  const profiles = new ProfileRepository(state)
  const service = createPortabilityService({
    state,
    courses,
    sessions,
    learning,
    profiles,
    pluginVersion: meta.pluginVersion ?? pluginVersion,
    appVersion,
  })
  return { dataDir, state, courses, sessions, learning, service }
}

/** Copy the source teaching dir to `<workDir>/<label>/teaching`. */
async function copySource(label: string): Promise<string> {
  const target = join(workDir, label, 'teaching')
  await mkdir(join(workDir, label), { recursive: true })
  await cp(sourceDir, target, { recursive: true })
  return target
}

/** Durable data files (relative path → sha256); backups/exports/cache/tasks/usage excluded. */
async function hashDurableFiles(dataDir: string): Promise<Record<string, string>> {
  const excluded = new Set(['backups', 'exports', 'cache', 'tasks', 'usage'])
  const hashes: Record<string, string> = {}
  const walk = async (relativeDir: string): Promise<void> => {
    const entries = await readdir(join(dataDir, relativeDir), { withFileTypes: true })
    for (const entry of entries) {
      const relativePath = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`
      if (entry.isDirectory()) {
        if (relativeDir === '' && excluded.has(entry.name)) continue
        await walk(relativePath)
        continue
      }
      if (!entry.isFile()) continue
      hashes[relativePath] = sha256Hex(new Uint8Array(await readFile(join(dataDir, ...relativePath.split('/')))))
    }
  }
  await walk('')
  return hashes
}

interface DataSnapshot {
  readonly courses: readonly { id: string; title: string; activeRevisionId?: string; revisionVersions: number[] }[]
  readonly sessions: readonly { id: string; courseId: string; courseRevisionId: string; messageCount: number }[]
  readonly sources: readonly { id: string; originalPath: string; courseIds: string[]; missing: boolean }[]
  readonly learning: readonly { courseId: string; attempts: number; mastery: number; notes: number; review: number }[]
  readonly fileCount: number
}

/** Read the durable state through the repositories (same as Host read paths). */
async function snapshot(store: OpenedStore): Promise<DataSnapshot> {
  const courseList: Course[] = await store.courses.list()
  const courses: DataSnapshot['courses'][number][] = []
  const sessions: DataSnapshot['sessions'][number][] = []
  for (const course of courseList) {
    const revisions = await store.courses.listRevisions(course.id)
    courses.push({
      id: course.id,
      title: course.title,
      ...(course.activeRevisionId !== undefined ? { activeRevisionId: course.activeRevisionId } : {}),
      revisionVersions: revisions.map(revision => revision.version),
    })
    for (const session of await store.sessions.list(course.id)) {
      sessions.push({
        id: session.id,
        courseId: session.courseId,
        courseRevisionId: session.courseRevisionId,
        messageCount: (await store.sessions.messages(session.id)).length,
      })
    }
  }
  const sourceNames = (await store.state.list('sources')).filter(name => name.endsWith('.json'))
  const sources: DataSnapshot['sources'][number][] = []
  for (const name of sourceNames) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document === undefined) continue
    sources.push({
      id: document.id,
      originalPath: document.originalPath,
      courseIds: [...document.courseIds],
      missing: document.missing === true,
    })
  }
  const learningNames = (await store.state.list('learning')).filter(name => name.endsWith('.json'))
  const learning: DataSnapshot['learning'][number][] = []
  for (const name of learningNames) {
    const record = await store.state.readJson<CourseLearningRecord>(`learning/${name}`)
    if (record === undefined) continue
    learning.push({
      courseId: record.courseId,
      attempts: record.attempts.length,
      mastery: record.mastery.length,
      notes: record.notes.length,
      review: record.review.length,
    })
  }
  const fileCount = Object.keys(await hashDurableFiles(store.dataDir)).length
  return { courses, sessions, sources, learning, fileCount }
}

/** Count backup ZIPs already present in one data dir's backups/ folder. */
async function backupZips(dataDir: string): Promise<string[]> {
  try {
    return (await readdir(join(dataDir, 'backups'))).filter(name => name.endsWith('.zip')).sort()
  } catch {
    return []
  }
}

const report: Record<string, unknown> = {
  sourceDir,
  workDir,
  pluginVersion,
  appVersion,
  scenarios: {},
}

await rm(workDir, { recursive: true, force: true })
await mkdir(workDir, { recursive: true })

// ---------------------------------------------------------------------------
// 1) Backup → inspect → restore into the same (copied) data dir.
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('base')
  const store = await openStore(dataDir)
  const before = await snapshot(store)
  const beforeHashes = await hashDurableFiles(dataDir)
  const beforeBackups = await backupZips(dataDir)

  const created = await store.service.createBackup(join(workDir, 'base-backup'))
  if (!created.ok) {
    console.error(`backup failed: ${created.error.code}: ${created.error.message}`)
    process.exit(1)
  }
  const inspected = await store.service.inspectBackup(created.value.archivePath)
  if (!inspected.ok) {
    console.error(`inspect failed: ${inspected.error.code}: ${inspected.error.message}`)
    process.exit(1)
  }
  const restored = await store.service.restoreBackup(created.value.archivePath)
  if (!restored.ok) {
    console.error(`restore failed: ${restored.error.code}: ${restored.error.message}`)
    process.exit(1)
  }
  const after = await snapshot(store)
  const afterHashes = await hashDurableFiles(dataDir)
  const changedFiles = Object.keys({ ...beforeHashes, ...afterHashes })
    .filter(path => beforeHashes[path] !== afterHashes[path])
    .sort()
  const afterBackups = await backupZips(dataDir)
  ;(report['scenarios'] as Record<string, unknown>)['samePathRestore'] = {
    backup: {
      backupId: created.value.backupId,
      archivePath: created.value.archivePath,
      archiveBytes: created.value.bytes,
      entries: created.value.manifest.entries.length,
      totalBytes: created.value.manifest.totalBytes,
      categories: [...new Set(created.value.manifest.entries.map(entry => entry.category))].sort(),
      schemaVersion: created.value.manifest.schemaVersion,
      excludesCredentials: created.value.manifest.excludesCredentials,
      sourcePaths: created.value.manifest.sourcePaths,
    },
    inspect: {
      backupId: inspected.value.id,
      entries: inspected.value.entries.length,
      verified: true,
    },
    restoreReport: restored.value,
    backupsBefore: beforeBackups,
    backupsAfter: afterBackups,
    newPreRestoreBackup: afterBackups.filter(name => !beforeBackups.includes(name)),
    snapshotBefore: before,
    snapshotAfter: after,
    snapshotEqual: JSON.stringify(before) === JSON.stringify(after),
    durableFilesChangedByRestore: changedFiles,
    changedOnlyExpected: changedFiles.length === 1 && changedFiles[0] === 'meta.json',
    metaAfter: await store.state.readJson<Record<string, unknown>>('meta.json'),
    warningsContainRestartHint: restored.value.warnings.some(line => line.includes('可能需要重启')),
    warningsContainPreRestoreBackup: restored.value.warnings.some(line => line.includes('恢复前已自动备份')),
  }
}

// ---------------------------------------------------------------------------
// 2) Restore into another copy with remapSources (relocated original file).
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('remap')
  const store = await openStore(dataDir)
  const baseArchive = (report['scenarios'] as Record<string, { backup: { archivePath: string } }>)['samePathRestore']?.backup.archivePath
  if (baseArchive === undefined) process.exit(1)
  const sourceNames = (await store.state.list('sources')).filter(name => name.endsWith('.json'))
  const sourceDocuments: SourceDocument[] = []
  for (const name of sourceNames) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document !== undefined) sourceDocuments.push(document)
  }
  const relocatedDir = join(workDir, 'remap-relocated')
  await mkdir(relocatedDir, { recursive: true })
  const remap: Record<string, string> = {}
  const relocatedFiles: string[] = []
  for (const document of sourceDocuments) {
    const destination = join(relocatedDir, `${document.id}.material`)
    try {
      await cp(document.originalPath, destination)
      remap[document.originalPath] = destination
      relocatedFiles.push(destination)
    } catch {
      // Missing originals are covered by scenario 3.
    }
  }
  const restored = await store.service.restoreBackup(baseArchive, { remapSources: remap })
  if (!restored.ok) {
    console.error(`remap restore failed: ${restored.error.code}: ${restored.error.message}`)
    process.exit(1)
  }
  const afterSources: SourceDocument[] = []
  for (const name of (await store.state.list('sources')).filter(name => name.endsWith('.json'))) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document !== undefined) afterSources.push(document)
  }
  ;(report['scenarios'] as Record<string, unknown>)['sourceRemap'] = {
    remappedPaths: remap,
    relocatedFiles,
    restoreReport: restored.value,
    sourcesAfter: afterSources.map(document => ({
      id: document.id,
      originalPath: document.originalPath,
      missing: document.missing === true,
    })),
    remappedRecordsUpdated: afterSources.every(document => remap[document.originalPath] === undefined
      ? true
      : document.originalPath === remap[document.originalPath]),
  }
}

// ---------------------------------------------------------------------------
// 3) Restore with a remap to a non-existent path → missingSources reported.
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('missing')
  const store = await openStore(dataDir)
  const baseArchive = (report['scenarios'] as Record<string, { backup: { archivePath: string } }>)['samePathRestore']?.backup.archivePath
  if (baseArchive === undefined) process.exit(1)
  const sourceNames = (await store.state.list('sources')).filter(name => name.endsWith('.json'))
  const sourceDocuments: SourceDocument[] = []
  for (const name of sourceNames) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document !== undefined) sourceDocuments.push(document)
  }
  const missingTarget = join(workDir, 'missing-target', 'not-here.md')
  const remap: Record<string, string> = {}
  for (const document of sourceDocuments) remap[document.originalPath] = missingTarget
  const restored = await store.service.restoreBackup(baseArchive, { remapSources: remap })
  if (!restored.ok) {
    console.error(`missing restore failed: ${restored.error.code}: ${restored.error.message}`)
    process.exit(1)
  }
  const afterSources: SourceDocument[] = []
  for (const name of (await store.state.list('sources')).filter(name => name.endsWith('.json'))) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document !== undefined) afterSources.push(document)
  }
  ;(report['scenarios'] as Record<string, unknown>)['missingSource'] = {
    restoreReport: restored.value,
    sourcesAfter: afterSources.map(document => ({
      id: document.id,
      originalPath: document.originalPath,
      missing: document.missing === true,
    })),
    missingReported: restored.value.missingSources.length > 0,
    needsPathRemap: restored.value.needsPathRemap,
  }
}

console.log(JSON.stringify(report, null, 2))
