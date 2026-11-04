#!/usr/bin/env node
/**
 * Create one real offline export from the fixture course (evidence artifact).
 *
 * Usage:
 *   node packages/teaching-core/tests/portability/sample-export.ts /tmp/t07-demo/export
 *
 * The script builds its own temporary teaching data directory under the OS temp
 * dir (never `~/.dsh`), exports the fixture course into the given output
 * directory and prints the package facts as JSON.
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createTestStore, seedTeachingData } from './helpers.ts'

const outDirArgument = process.argv[2]
if (outDirArgument === undefined || outDirArgument.trim() === '') {
  console.error('usage: node packages/teaching-core/tests/portability/sample-export.ts <outDir>')
  process.exit(2)
}
const outDir = resolve(outDirArgument)
await mkdir(outDir, { recursive: true })

const store = await createTestStore({ pluginVersion: '0.1.0-t07-demo', appVersion: '0.2.1-rc.5' })
try {
  const data = await seedTeachingData(store)
  const exported = await store.service.exportCourse({
    courseId: data.course.id,
    includeNotes: true,
    outDir,
  })
  if (!exported.ok) {
    console.error(`export failed: ${exported.error.code}: ${exported.error.message}`)
    process.exit(1)
  }
  const result = exported.value
  console.log(JSON.stringify({
    exportDir: outDir,
    exportId: result.exportId,
    htmlPath: result.htmlPath,
    manifestPath: result.manifestPath,
    nativeFiles: result.nativeFiles,
    warnings: result.warnings,
    manifest: {
      formatVersion: result.manifest.formatVersion,
      offlineCapable: result.manifest.offlineCapable,
      files: result.manifest.files.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 })),
      nativeSources: result.manifest.nativeSources,
      limitations: result.manifest.limitations,
    },
  }, null, 2))
} finally {
  await store.dispose()
}
