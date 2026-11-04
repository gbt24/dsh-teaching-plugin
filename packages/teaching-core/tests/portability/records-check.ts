#!/usr/bin/env node
/**
 * Record-control service rehearsal against a copy of real dev data (T07 close-out).
 *
 * Usage:
 *   node packages/teaching-core/tests/portability/records-check.ts \
 *     .scratch/dsh-dev/home/teaching .scratch/restore-test-home/records-check
 *
 * The source teaching directory is only read/copied, never modified. Each
 * scenario works on its own copy under the work dir:
 *   - records/teaching        : export → confirm=false negatives → notes/learning delete
 *   - session-delete/teaching : delete session (messages + activities + details)
 *   - course-delete/teaching  : delete course (sources detached, original file untouched)
 *   - all-reset/teaching      : reset all (teaching records cleared, meta/profile kept)
 */
import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  Course, CourseLearningRecord, LearningAttempt, MasteryRecord, SourceDocument,
} from '../../src/contracts/index.ts'
import {
  attemptId, masteryId, nowIso, sessionId as newSessionId,
} from '../../src/contracts/index.ts'
import { createPortabilityService } from '../../src/portability/index.ts'
import { LocalState } from '../../src/storage/local-state.ts'
import {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
} from '../../src/storage/repositories.ts'

const [sourceArgument, workArgument] = process.argv.slice(2)
if (sourceArgument === undefined || workArgument === undefined) {
  console.error('usage: node packages/teaching-core/tests/portability/records-check.ts <teachingDir> <workDir>')
  process.exit(2)
}
const sourceDir = resolve(sourceArgument)
const workDir = resolve(workArgument)
await stat(sourceDir).catch(() => {
  console.error(`source teaching dir not found: ${sourceDir}`)
  process.exit(2)
})

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
    pluginVersion: meta.pluginVersion ?? '0.1.0',
    appVersion: '0.2.1-rc.5',
  })
  return { dataDir, state, courses, sessions, learning, service }
}

async function copySource(label: string): Promise<string> {
  const target = join(workDir, label, 'teaching')
  await mkdir(join(workDir, label), { recursive: true })
  await cp(sourceDir, target, { recursive: true })
  return target
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function dirNames(path: string): Promise<string[]> {
  try {
    return (await readdir(path)).sort()
  } catch {
    return []
  }
}

async function readSources(store: OpenedStore): Promise<SourceDocument[]> {
  const documents: SourceDocument[] = []
  for (const name of (await store.state.list('sources')).filter(name => name.endsWith('.json'))) {
    const document = await store.state.readJson<SourceDocument>(`sources/${name}`)
    if (document !== undefined) documents.push(document)
  }
  return documents
}

/** Find one course that has an active revision, else the first course. */
async function pickCourse(store: OpenedStore): Promise<Course | undefined> {
  const courses = await store.courses.list()
  return courses.find(course => course.activeRevisionId !== undefined) ?? courses[0]
}

const report: Record<string, unknown> = { sourceDir, workDir, scenarios: {} }
await rm(workDir, { recursive: true, force: true })
await mkdir(workDir, { recursive: true })
const scenarios = report['scenarios'] as Record<string, unknown>

// ---------------------------------------------------------------------------
// 1) Record export + destructive confirmations + notes/learning delete.
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('records')
  const store = await openStore(dataDir)
  const course = await pickCourse(store)
  if (course === undefined) {
    console.error('source data has no course to test records against')
    process.exit(1)
  }
  const revisionId = course.activeRevisionId ?? (await store.courses.listRevisions(course.id)).at(-1)?.id
  if (revisionId === undefined) {
    console.error('course has no revision')
    process.exit(1)
  }
  const initialExport = await store.service.exportRecords({})
  if (!initialExport.ok) process.exit(1)
  const initialJson = JSON.parse(await readFile(initialExport.value.path, 'utf8')) as {
    formatVersion: number
    schemaVersion: number
    courses: { courseId: string; attempts: unknown[]; mastery: unknown[]; review: unknown[]; notes: unknown[] }[]
    sessions: { sessionId: string; messageCount: number }[]
  }

  const timestamp = nowIso()
  const attempt: LearningAttempt = {
    id: attemptId(),
    sessionId: newSessionId(),
    courseId: course.id,
    courseRevisionId: revisionId,
    conceptIds: [],
    prompt: 'T07 记录控制实测用临时尝试',
    answerText: '临时测试回答',
    helpExposure: { level: 0 },
    independence: 'independent',
    createdAt: timestamp,
  }
  const mastery: MasteryRecord = {
    id: masteryId(),
    courseId: course.id,
    courseRevisionId: revisionId,
    conceptId: 'concept-t07' as never,
    level: 'practiced',
    dimensions: { explain: 1, conditions: 0, variants: 0, transfer: 0 },
    evidenceAttemptIds: [attempt.id],
    basis: ['T07 临时测试'],
    uncovered: ['variants', 'transfer'],
    disputes: [],
    updatedAt: timestamp,
  }
  const synthetic: CourseLearningRecord = {
    courseId: course.id,
    courseRevisionId: revisionId,
    attempts: [attempt],
    mastery: [mastery],
    review: [{
      conceptId: 'concept-t07' as never,
      courseId: course.id,
      dueAt: timestamp,
      intervalDays: 1,
      reason: 'spaced',
    }],
    notes: [
      { id: 'note-a', markdown: '临时笔记 A', createdAt: timestamp, updatedAt: timestamp },
      { id: 'note-b', markdown: '临时笔记 B', createdAt: timestamp, updatedAt: timestamp },
    ],
    updatedAt: timestamp,
  }
  await store.learning.save(synthetic)

  const exportAfterSynthetic = await store.service.exportRecords({ courseId: course.id })
  if (!exportAfterSynthetic.ok) process.exit(1)
  const exported = JSON.parse(await readFile(exportAfterSynthetic.value.path, 'utf8')) as {
    formatVersion: number
    schemaVersion: number
    pluginVersion: string
    courses: { courseId: string; attempts: unknown[]; mastery: unknown[]; review: unknown[]; notes: unknown[]; sessionIds: string[] }[]
    sessions: { sessionId: string; messageCount: number }[]
  }

  const negativeChecks: Record<string, string> = {}
  for (const request of [
    { scope: 'session' as const, id: 'sess-x' },
    { scope: 'course' as const, id: course.id },
    { scope: 'learning' as const, id: course.id },
    { scope: 'notes' as const, id: course.id },
    { scope: 'all' as const },
  ]) {
    const denied = await store.service.deleteRecords(request)
    negativeChecks[request.scope] = denied.ok ? 'unexpected-ok' : denied.error.code
  }
  const deniedReset = await store.service.resetRecords('learning', false)
  negativeChecks['reset-learning'] = deniedReset.ok ? 'unexpected-ok' : deniedReset.error.code

  const notesDeleted = await store.service.deleteRecords({ scope: 'notes', id: course.id, confirm: true })
  const afterNotes = await store.learning.get(course.id)
  const learningDeleted = await store.service.deleteRecords({ scope: 'learning', id: course.id, confirm: true })
  scenarios['records'] = {
    courseId: course.id,
    initialExportFile: initialExport.value.path,
    initialExportSummary: {
      formatVersion: initialJson.formatVersion,
      schemaVersion: initialJson.schemaVersion,
      courses: initialJson.courses.map(entry => ({
        courseId: entry.courseId,
        attempts: entry.attempts.length,
        mastery: entry.mastery.length,
        review: entry.review.length,
        notes: entry.notes.length,
      })),
      sessions: initialJson.sessions.map(entry => ({ sessionId: entry.sessionId, messageCount: entry.messageCount })),
    },
    exportAfterSynthetic: {
      file: exportAfterSynthetic.value.path,
      bytes: exportAfterSynthetic.value.bytes,
      pluginVersion: exported.pluginVersion,
      formatVersion: exported.formatVersion,
      schemaVersion: exported.schemaVersion,
      course: exported.courses.map(entry => ({
        courseId: entry.courseId,
        sessionIds: entry.sessionIds,
        attempts: entry.attempts.length,
        mastery: entry.mastery.length,
        review: entry.review.length,
        notes: entry.notes.length,
      })),
    },
    confirmFalseCodes: negativeChecks,
    notesDeleted: notesDeleted.ok ? notesDeleted.value : notesDeleted,
    afterNotesDelete: afterNotes === undefined
      ? undefined
      : {
        notes: afterNotes.notes.length,
        attempts: afterNotes.attempts.length,
        mastery: afterNotes.mastery.length,
        review: afterNotes.review.length,
      },
    learningDeleted: learningDeleted.ok ? learningDeleted.value : learningDeleted,
    learningAfterDelete: (await store.learning.get(course.id)) === undefined ? 'absent' : 'present',
    courseStillReadable: (await store.courses.get(course.id))?.title,
    sessionStillReadable: (await store.sessions.list(course.id)).map(session => session.id),
  }
}

// ---------------------------------------------------------------------------
// 2) Delete one session on a copy.
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('session-delete')
  const store = await openStore(dataDir)
  const sessions = await store.sessions.list()
  const session = sessions[0]
  if (session === undefined) {
    scenarios['sessionDelete'] = { skipped: 'source data has no session' }
  } else {
    const messageCount = (await store.sessions.messages(session.id)).length
    const deleted = await store.service.deleteRecords({ scope: 'session', id: session.id, confirm: true })
    scenarios['sessionDelete'] = {
      sessionId: session.id,
      messageCount,
      deleted: deleted.ok ? deleted.value : deleted,
      sessionAfter: (await store.sessions.get(session.id)) === undefined ? 'absent' : 'present',
      sessionFileExists: await exists(join(dataDir, 'sessions', `${session.id}.json`)),
      messagesFileExists: await exists(join(dataDir, 'sessions', `${session.id}.messages.jsonl`)),
      courseStillReadable: (await store.courses.get(session.courseId))?.title,
      remainingSessions: (await store.sessions.list()).length,
    }
  }
}

// ---------------------------------------------------------------------------
// 3) Delete one course on a copy (sources detached, original file untouched).
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('course-delete')
  const store = await openStore(dataDir)
  const courses = await store.courses.list()
  const course = courses.find(entry => (entry.activeRevisionId ?? '') !== '') ?? courses[0]
  if (course === undefined) {
    scenarios['courseDelete'] = { skipped: 'source data has no course' }
  } else {
    const sourcesBefore = await readSources(store)
    const materialSnapshots: { path: string; contentHash: string; exists: boolean }[] = []
    for (const document of sourcesBefore) {
      try {
        materialSnapshots.push({
          path: document.originalPath,
          contentHash: (await readFile(document.originalPath, 'utf8')).length.toString(),
          exists: true,
        })
      } catch {
        materialSnapshots.push({ path: document.originalPath, contentHash: '', exists: false })
      }
    }
    const deleted = await store.service.deleteRecords({ scope: 'course', id: course.id, confirm: true })
    const sourcesAfter = await readSources(store)
    const materialsStillExist: Record<string, boolean> = {}
    for (const snapshot of materialSnapshots) materialsStillExist[snapshot.path] = await exists(snapshot.path)
    scenarios['courseDelete'] = {
      courseId: course.id,
      courseTitle: course.title,
      deleted: deleted.ok ? deleted.value : deleted,
      courseAfter: (await store.courses.get(course.id)) === undefined ? 'absent' : 'present',
      sessionsAfter: (await store.sessions.list(course.id)).length,
      learningAfter: (await store.learning.get(course.id)) === undefined ? 'absent' : 'present',
      sourcesAfter: sourcesAfter.map(document => ({ id: document.id, courseIds: [...document.courseIds] })),
      originalMaterialsStillExist: materialsStillExist,
      otherCoursesStillReadable: (await store.courses.list()).map(entry => entry.id),
    }
  }
}

// ---------------------------------------------------------------------------
// 4) Reset all on a copy (meta/profile kept, artifacts/backups kept).
// ---------------------------------------------------------------------------
{
  const dataDir = await copySource('all-reset')
  const store = await openStore(dataDir)
  const backupsBefore = await dirNames(join(dataDir, 'backups'))
  const exportsBefore = await dirNames(join(dataDir, 'exports'))
  const reset = await store.service.resetRecords('all', true)
  const dirState: Record<string, string[]> = {}
  for (const dir of ['courses', 'sessions', 'activities', 'learning', 'sources', 'environments', 'runs', 'tasks']) {
    dirState[dir] = await dirNames(join(dataDir, dir))
  }
  scenarios['allReset'] = {
    reset,
    dirState,
    metaExists: await exists(join(dataDir, 'meta.json')),
    profileExists: await exists(join(dataDir, 'student-profile.json')),
    backupsBefore,
    backupsAfter: await dirNames(join(dataDir, 'backups')),
    exportsBefore,
    exportsAfter: await dirNames(join(dataDir, 'exports')),
    usageExists: await exists(join(dataDir, 'usage')),
  }
}

console.log(JSON.stringify(report, null, 2))
