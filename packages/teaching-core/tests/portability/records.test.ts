/**
 * Record export and destructive record control (R29, AC15).
 */
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import type { RecordsExportFile } from '../../src/portability/index.ts'
import { SCHEMA_VERSION } from '../../src/storage/layout.ts'
import { createTestStore, seedTeachingData } from './helpers.ts'

/** Whether a path exists. */
async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

test('records export is an auditable JSON file with schema and references', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const exported = await store.service.exportRecords({ courseId: data.course.id })
    assert.ok(exported.ok, exported.ok ? '' : exported.error.message)
    assert.ok(exported.value.bytes > 0)
    assert.equal(exported.value.bytes, (await stat(exported.value.path)).size)

    const parsed = JSON.parse(await readFile(exported.value.path, 'utf8')) as RecordsExportFile
    assert.equal(parsed.formatVersion, 1)
    assert.equal(parsed.schemaVersion, SCHEMA_VERSION)
    assert.equal(parsed.pluginVersion, store.pluginVersion)
    assert.equal(parsed.courses.length, 1)
    const course = parsed.courses[0]
    assert.equal(course?.courseId, data.course.id)
    assert.equal(course?.courseTitle, data.course.title)
    assert.deepEqual(course?.sessionIds, [data.session.id])
    assert.equal(course?.attempts.length, 1)
    assert.equal(course?.attempts[0]?.sessionId, data.session.id)
    assert.equal(course?.mastery.length, 1)
    assert.deepEqual(course?.mastery[0]?.evidenceAttemptIds, [data.learning.attempts[0]?.id])
    assert.equal(course?.review.length, 1)
    assert.equal(course?.notes.length, 1)
    assert.equal(parsed.sessions.length, 1)
    assert.equal(parsed.sessions[0]?.messageCount, 2)
    assert.match(parsed.auditNote, /凭据/iu)

    // Export for an unknown course is an explicit not-found, not an empty file.
    const missing = await store.service.exportRecords({ courseId: 'course-missing' as never })
    assert.ok(!missing.ok)
    assert.equal(missing.ok ? '' : missing.error.code, 'not-found')
  } finally {
    await store.dispose()
  }
})

test('all destructive operations require confirm=true and a valid scope', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    for (const request of [
      { scope: 'session' as const, id: data.session.id },
      { scope: 'course' as const, id: data.course.id },
      { scope: 'learning' as const, id: data.course.id },
      { scope: 'notes' as const, id: data.course.id },
      { scope: 'all' as const },
    ]) {
      const attempt = await store.service.deleteRecords(request)
      assert.ok(!attempt.ok, `confirm missing is rejected for ${request.scope}`)
      assert.equal(attempt.ok ? '' : attempt.error.code, 'needs-confirmation')
    }
    const confirmFalse = await store.service.deleteRecords({ scope: 'all', confirm: false })
    assert.ok(!confirmFalse.ok)
    assert.equal(confirmFalse.ok ? '' : confirmFalse.error.code, 'needs-confirmation')
    const reset = await store.service.resetRecords('learning', false)
    assert.ok(!reset.ok)
    assert.equal(reset.ok ? '' : reset.error.code, 'needs-confirmation')

    // Nothing was deleted.
    assert.ok(await exists(join(store.dir, 'sessions', `${data.session.id}.json`)))
    assert.ok(await exists(join(store.dir, 'learning', `${data.course.id}.json`)))

    const invalidScope = await store.service.deleteRecords({ scope: 'everything' as never, confirm: true })
    assert.ok(!invalidScope.ok)
    assert.equal(invalidScope.ok ? '' : invalidScope.error.code, 'invalid-input')

    const missingSession = await store.service.deleteRecords({ scope: 'session', id: 'session-missing', confirm: true })
    assert.ok(!missingSession.ok)
    assert.equal(missingSession.ok ? '' : missingSession.error.code, 'not-found')
    const missingCourse = await store.service.deleteRecords({ scope: 'course', id: 'course-missing', confirm: true })
    assert.ok(!missingCourse.ok)
    assert.equal(missingCourse.ok ? '' : missingCourse.error.code, 'not-found')
  } finally {
    await store.dispose()
  }
})

test('deleting a session removes its messages/activities and session-scoped learning', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const deleted = await store.service.deleteRecords({ scope: 'session', id: data.session.id, confirm: true })
    assert.ok(deleted.ok, deleted.ok ? '' : deleted.error.message)
    const details = deleted.value.details
    assert.equal(deleted.value.deleted, true)
    assert.equal(details.sessions, 1)
    assert.equal(details.messages, 2)
    assert.equal(details.activities, data.activities.length)
    assert.equal(details.activityStates, 3)
    assert.equal(details.attempts, 1)
    assert.equal(details.notes, 1)
    assert.equal(details.masteryEvidenceRefs, 1)

    assert.equal(await store.sessions.get(data.session.id), undefined)
    assert.equal(await exists(join(store.dir, 'sessions', `${data.session.id}.json`)), false)
    assert.equal(await exists(join(store.dir, 'sessions', `${data.session.id}.messages.jsonl`)), false)
    for (const activity of data.activities) {
      assert.equal(await store.sessions.getActivity(activity.id), undefined, `activity ${activity.id} deleted`)
    }
    // Mastery keeps its history but drops the deleted attempt reference.
    const learning = await store.learning.get(data.course.id)
    assert.equal(learning?.attempts.length, 0)
    assert.equal(learning?.notes.length, 0)
    assert.equal(learning?.mastery.length, 1)
    assert.equal(learning?.mastery[0]?.evidenceAttemptIds.length, 0)
    // The course and its sources stay.
    assert.ok(await store.courses.get(data.course.id))
    assert.ok(await store.courses.getSource(data.presentSource.id))
  } finally {
    await store.dispose()
  }
})

test('deleting a course detaches source documents but never touches original files', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const materialBefore = await readFile(data.materialFile, 'utf8')
    const deleted = await store.service.deleteRecords({ scope: 'course', id: data.course.id, confirm: true })
    assert.ok(deleted.ok, deleted.ok ? '' : deleted.error.message)
    const details = deleted.value.details
    assert.equal(details.courses, 1)
    assert.equal(details.courseRevisions, 1)
    assert.equal(details.sessions, 1)
    assert.equal(details.activities, data.activities.length)
    assert.equal(details.attempts, 1)
    assert.equal(details.sourcesDetached, 2)

    assert.equal(await store.courses.get(data.course.id), undefined)
    assert.equal(await exists(join(store.dir, 'courses', `${data.course.id}.revisions`)), false)
    assert.equal(await exists(join(store.dir, 'learning', `${data.course.id}.json`)), false)
    // Source records survive, detached from the deleted course.
    const source = await store.courses.getSource(data.presentSource.id)
    assert.ok(source !== undefined)
    assert.deepEqual(source.courseIds, [])
    // The student's original file is byte-identical.
    assert.equal(await readFile(data.materialFile, 'utf8'), materialBefore)
  } finally {
    await store.dispose()
  }
})

test('clearing learning keeps courses and sources; notes scope only clears notes', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const learningDeleted = await store.service.deleteRecords({ scope: 'learning', id: data.course.id, confirm: true })
    assert.ok(learningDeleted.ok)
    assert.equal(learningDeleted.value.details.attempts, 1)
    assert.equal(learningDeleted.value.details.notes, 1)
    assert.equal(await store.learning.get(data.course.id), undefined)
    assert.ok(await store.courses.get(data.course.id))
    assert.ok(await store.courses.getSource(data.presentSource.id))

    // Re-seed learning, then clear only notes.
    await store.learning.save(data.learning)
    const notesDeleted = await store.service.deleteRecords({ scope: 'notes', id: data.course.id, confirm: true })
    assert.ok(notesDeleted.ok)
    assert.equal(notesDeleted.value.details.notes, 1)
    const record = await store.learning.get(data.course.id)
    assert.equal(record?.notes.length, 0)
    assert.equal(record?.attempts.length, 1)
    assert.equal(record?.mastery.length, 1)

    // resetRecords('learning') clears the whole learning record again.
    const reset = await store.service.resetRecords('learning', true)
    assert.ok(reset.ok)
    assert.equal(await store.learning.get(data.course.id), undefined)
    assert.ok(await store.courses.get(data.course.id))
  } finally {
    await store.dispose()
  }
})

test('delete all / reset all clear teaching records but keep identity, settings and artifacts', async () => {
  const store = await createTestStore()
  try {
    await seedTeachingData(store)
    const backup = await store.service.createBackup()
    assert.ok(backup.ok)
    const deleted = await store.service.deleteRecords({ scope: 'all', confirm: true })
    assert.ok(deleted.ok, deleted.ok ? '' : deleted.error.message)
    const details = deleted.value.details
    assert.equal(details.courses, 1)
    assert.equal(details.sessions, 1)
    assert.equal(details.attempts, 1)
    assert.equal(details.notes, 1)
    assert.ok((details.activities ?? 0) > 0)

    for (const dir of ['courses', 'sessions', 'activities', 'learning', 'sources', 'environments', 'runs', 'tasks']) {
      const entries = await exists(join(store.dir, dir)) ? await import('node:fs/promises').then(fs => fs.readdir(join(store.dir, dir))) : []
      assert.deepEqual(entries, [], `${dir} cleared`)
    }
    assert.ok(await exists(join(store.dir, 'meta.json')), 'meta kept')
    assert.ok(await exists(join(store.dir, 'student-profile.json')), 'profile kept')
    assert.ok(await exists(join(store.dir, 'settings.json')), 'settings kept')
    assert.ok(await exists(backup.value.archivePath), 'backup archive kept')
    const artifacts = await store.service.listArtifacts()
    assert.equal(artifacts.backups.length, 1)
  } finally {
    await store.dispose()
  }
})

test('resetRecords(all) clears records and is explicit about confirmation', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const reset = await store.service.resetRecords('all', true)
    assert.ok(reset.ok)
    assert.equal(reset.value.reset, true)
    assert.equal(await store.courses.get(data.course.id), undefined)
    assert.equal(await store.learning.get(data.course.id), undefined)
    assert.ok(await exists(join(store.dir, 'meta.json')))
  } finally {
    await store.dispose()
  }
})
