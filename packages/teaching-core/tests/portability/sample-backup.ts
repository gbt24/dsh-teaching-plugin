#!/usr/bin/env node
/**
 * Demonstrate backup → inspect → restore-to-another-path with a missing source.
 *
 * Usage:
 *   node packages/teaching-core/tests/portability/sample-backup.ts /tmp/t07-demo/backup
 *
 * The script creates temporary teaching data under the OS temp dir (never
 * `~/.dsh`), writes one backup into the given directory, restores it into a
 * *fresh* data directory while re-locating the missing original material, and
 * prints the restore report plus the references that survived by id.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createTestStore, seedTeachingData } from './helpers.ts'

const outDirArgument = process.argv[2]
if (outDirArgument === undefined || outDirArgument.trim() === '') {
  console.error('usage: node packages/teaching-core/tests/portability/sample-backup.ts <outDir>')
  process.exit(2)
}
const outDir = resolve(outDirArgument)
await mkdir(outDir, { recursive: true })

const sourceStore = await createTestStore()
const targetStore = await createTestStore({ open: false, pluginVersion: '0.1.0-t07-demo' })
try {
  const data = await seedTeachingData(sourceStore)
  const created = await sourceStore.service.createBackup(outDir)
  if (!created.ok) {
    console.error(`backup failed: ${created.error.code}: ${created.error.message}`)
    process.exit(1)
  }
  const inspected = await sourceStore.service.inspectBackup(created.value.archivePath)
  if (!inspected.ok) {
    console.error(`inspect failed: ${inspected.error.code}: ${inspected.error.message}`)
    process.exit(1)
  }
  const relocatedPath = join(targetStore.materialDir, 'relocated.md')
  await writeFile(relocatedPath, '# 迁移后的过拟合讲义\n', 'utf8')
  const restored = await targetStore.service.restoreBackup(created.value.archivePath, {
    remapSources: { [data.missingFile]: relocatedPath },
  })
  if (!restored.ok) {
    console.error(`restore failed: ${restored.error.code}: ${restored.error.message}`)
    process.exit(1)
  }
  const course = await targetStore.courses.get(data.course.id)
  const session = await targetStore.sessions.get(data.session.id)
  const activities = await targetStore.sessions.listActivities(data.session.id)
  const learning = await targetStore.learning.get(data.course.id)
  const relocatedSource = await targetStore.courses.getSource(data.missingSource.id)
  const originalMaterial = await readFile(data.materialFile, 'utf8')
  console.log(JSON.stringify({
    archivePath: created.value.archivePath,
    archiveBytes: created.value.bytes,
    manifest: {
      id: created.value.manifest.id,
      formatVersion: created.value.manifest.formatVersion,
      schemaVersion: created.value.manifest.schemaVersion,
      excludesCredentials: created.value.manifest.excludesCredentials,
      entries: created.value.manifest.entries.length,
      categories: [...new Set(created.value.manifest.entries.map(entry => entry.category))].sort(),
      sourcePaths: created.value.manifest.sourcePaths,
      totalBytes: created.value.manifest.totalBytes,
    },
    inspectedBackupId: inspected.value.id,
    restoreReport: restored.value,
    referenceChecksAfterRestore: {
      courseId: course?.id,
      activeRevisionId: course?.activeRevisionId,
      sessionCourseId: session?.courseId,
      sessionCount: session === undefined ? 0 : 1,
      activityCount: activities.length,
      graphPayloadType: activities.find(activity => activity.payload.type === 'graph')?.payload.type,
      learningAttempts: learning?.attempts.length,
      relocatedSourcePath: relocatedSource?.originalPath,
      relocatedSourceMissing: relocatedSource?.missing ?? false,
      originalMaterialUntouched: originalMaterial.includes('过拟合'),
    },
  }, null, 2))
} finally {
  await sourceStore.dispose()
  await targetStore.dispose()
}
