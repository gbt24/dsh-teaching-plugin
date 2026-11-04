/**
 * Record export and destructive record control (R29/R30).
 *
 * Two products live here:
 * - `exportRecordsJson`: an auditable JSON file with attempts, mastery, review
 *   and notes plus schema/version and course/session references;
 * - `deleteRecords` / `resetRecords`: explicit destructive operations. Every
 *   operation requires `confirm === true`, returns per-category counts, and
 *   removes derived references together with the record it belongs to instead
 *   of leaving silent dangling IDs. Deleting a course never deletes the
 *   student's original files; source documents are only detached from the
 *   course and say so in the returned counts.
 */
import { join } from 'node:path'
import type {
  CourseLearningRecord, LearningAttempt, MasteryRecord, ReviewItem,
} from '../contracts/learning.ts'
import type { DeleteRecordsRequest, DeleteRecordsResult } from '../contracts/portability-service.ts'
import type { LessonActivity } from '../contracts/activity.ts'
import type { TeachingSession } from '../contracts/session.ts'
import { exportId as newExportId, nowIso } from '../contracts/ids.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import { SCHEMA_VERSION } from '../storage/layout.ts'
import type { LocalState } from '../storage/local-state.ts'
import type { CourseRepository, LearningRepository, SessionRepository } from '../storage/repositories.ts'
import { writeFileAtomic } from './backup.ts'

/** Format version of the records JSON file. */
export const RECORDS_FORMAT_VERSION = 1

/** Dependencies used by record operations. */
export interface RecordsDependencies {
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly sessions: SessionRepository
  readonly learning: LearningRepository
  readonly pluginVersion: string
}

/** One course's exported records, with explicit references for auditing. */
export interface ExportedCourseRecords {
  readonly courseId: string
  readonly courseTitle: string
  readonly courseStatus: string
  readonly activeRevisionId?: string
  readonly sessionIds: readonly string[]
  readonly attempts: readonly LearningAttempt[]
  readonly mastery: readonly MasteryRecord[]
  readonly review: readonly ReviewItem[]
  readonly notes: CourseLearningRecord['notes']
  readonly updatedAt?: string
}

/** Shape of the exported records JSON file. */
export interface RecordsExportFile {
  readonly formatVersion: number
  readonly schemaVersion: number
  readonly exportedAt: string
  readonly pluginVersion: string
  readonly courses: readonly ExportedCourseRecords[]
  readonly sessions: readonly {
    readonly sessionId: string
    readonly courseId: string
    readonly title: string
    readonly createdAt: string
    readonly updatedAt: string
    readonly status: string
    readonly stage: string
    readonly messageCount: number
  }[]
  /** Plain-language audit statement shown by the UI. */
  readonly auditNote: string
}

/** Export attempts/mastery/review/notes as one auditable JSON file. */
export async function exportRecordsJson(
  deps: RecordsDependencies,
  input: { readonly courseId?: string; readonly outDir?: string; readonly now?: () => string },
): Promise<Result<{ readonly path: string; readonly bytes: number }>> {
  const exportedAt = input.now?.() ?? nowIso()
  const courses = input.courseId === undefined
    ? await deps.courses.list()
    : [await deps.courses.get(input.courseId)].filter((course): course is NonNullable<typeof course> => course !== undefined)
  if (input.courseId !== undefined && courses.length === 0) {
    return err('not-found', '课程不存在或已被删除', { details: { courseId: input.courseId } })
  }
  const allSessions = await deps.sessions.list()
  const sessionSummaries: RecordsExportFile['sessions'][number][] = []
  const courseRecords: ExportedCourseRecords[] = []
  for (const course of courses) {
    const learning = await deps.learning.get(course.id)
    const courseSessions = allSessions.filter(session => session.courseId === course.id)
    for (const session of courseSessions) {
      const messages = await deps.sessions.messages(session.id)
      sessionSummaries.push({
        sessionId: session.id,
        courseId: session.courseId,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
        stage: session.position.stage,
        messageCount: messages.length,
      })
    }
    courseRecords.push({
      courseId: course.id,
      courseTitle: course.title,
      courseStatus: course.status,
      ...(course.activeRevisionId !== undefined ? { activeRevisionId: course.activeRevisionId } : {}),
      sessionIds: courseSessions.map(session => session.id),
      attempts: learning?.attempts ?? [],
      mastery: learning?.mastery ?? [],
      review: learning?.review ?? [],
      notes: learning?.notes ?? [],
      ...(learning !== undefined ? { updatedAt: learning.updatedAt } : {}),
    })
  }
  const payload: RecordsExportFile = {
    formatVersion: RECORDS_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    pluginVersion: deps.pluginVersion,
    courses: courseRecords,
    sessions: sessionSummaries,
    auditNote: '本文件是学生本地学习记录的可审计快照：尝试保留原回答、帮助暴露与独立性；掌握记录保留依据尝试 id；'
      + '争议保留原评价；不含模型凭据或原始资料文件内容。',
  }
  const exportId = newExportId()
  const outDir = input.outDir ?? deps.state.paths.exports
  const path = join(outDir, `records-${exportId}.json`)
  const body = `${JSON.stringify(payload, null, 2)}\n`
  try {
    await writeFileAtomic(path, body)
  } catch (cause) {
    return err('storage', '写入学习记录导出文件失败', {
      details: { path, message: cause instanceof Error ? cause.message : String(cause) },
    })
  }
  return ok({ path, bytes: Buffer.byteLength(body, 'utf8') })
}

/** Delete one per-course learning record. */
async function deleteLearningRecord(state: LocalState, courseId: string): Promise<void> {
  await state.remove(`learning/${courseId}.json`)
}

/** Per-category delete counters (explicit keys keep `noUncheckedIndexedAccess` honest). */
interface DeleteCounts {
  courses: number
  courseRevisions: number
  sessions: number
  messages: number
  activities: number
  activityStates: number
  attempts: number
  mastery: number
  masteryEvidenceRefs: number
  review: number
  notes: number
  sourcesDetached: number
  environments: number
  runs: number
  tasks: number
}

/** Zeroed per-category counter used by destructive operations. */
function emptyDetails(): DeleteCounts {
  return {
    courses: 0,
    courseRevisions: 0,
    sessions: 0,
    messages: 0,
    activities: 0,
    activityStates: 0,
    attempts: 0,
    mastery: 0,
    masteryEvidenceRefs: 0,
    review: 0,
    notes: 0,
    sourcesDetached: 0,
    environments: 0,
    runs: 0,
    tasks: 0,
  }
}

/** Expose the counters through the contract's generic record shape. */
function detailsRecord(details: DeleteCounts): Readonly<Record<string, number>> {
  return details as unknown as Readonly<Record<string, number>>
}

/** Read every activity record (excluding `.state.json`). */
async function listAllActivities(state: LocalState): Promise<LessonActivity[]> {
  const names = (await state.list('activities')).filter(name => name.endsWith('.json') && !name.endsWith('.state.json'))
  const activities: LessonActivity[] = []
  for (const name of names) {
    const activity = await state.readJson<LessonActivity>(`activities/${name}`)
    if (activity !== undefined) activities.push(activity)
  }
  return activities
}

/** Delete one activity record and its student state; returns 1 + state count. */
async function deleteActivityFiles(state: LocalState, activityId: string): Promise<{ activities: number; activityStates: number }> {
  const hadState = await state.exists(`activities/${activityId}.state.json`)
  await state.remove(`activities/${activityId}.json`)
  await state.remove(`activities/${activityId}.state.json`)
  return { activities: 1, activityStates: hadState ? 1 : 0 }
}

/** Delete one session, its message log and its activities. */
async function deleteSessionFiles(
  state: LocalState,
  sessions: SessionRepository,
  sessionId: string,
): Promise<{ messages: number; activities: number; activityStates: number }> {
  const messages = await sessions.messages(sessionId)
  const activities = await sessions.listActivities(sessionId)
  let activityStates = 0
  for (const activity of activities) {
    const result = await deleteActivityFiles(state, activity.id)
    activityStates += result.activityStates
  }
  await state.remove(`sessions/${sessionId}.json`)
  await state.remove(`sessions/${sessionId}.messages.jsonl`)
  return { messages: messages.length, activities: activities.length, activityStates }
}

/**
 * Remove the session-derived learning records from one course file.
 *
 * Attempts made in the session are deleted (the student asked to delete the
 * session), notes tied to it are deleted, and mastery records keep their
 * history but lose references to the now-deleted attempt ids. The counts make
 * that explicit; nothing is dropped silently.
 */
async function removeSessionLearning(
  learning: LearningRepository,
  courseId: string,
  sessionId: string,
): Promise<{ attempts: number; notes: number; masteryEvidenceRefs: number }> {
  const record = await learning.get(courseId)
  if (record === undefined) return { attempts: 0, notes: 0, masteryEvidenceRefs: 0 }
  const removedAttemptIds = new Set(
    record.attempts.filter(attempt => attempt.sessionId === sessionId).map(attempt => attempt.id),
  )
  const attempts = record.attempts.filter(attempt => attempt.sessionId !== sessionId)
  const notes = record.notes.filter(note => note.sessionId !== sessionId)
  let masteryEvidenceRefs = 0
  const mastery = record.mastery.map((entry) => {
    const kept = entry.evidenceAttemptIds.filter(id => !removedAttemptIds.has(id))
    masteryEvidenceRefs += entry.evidenceAttemptIds.length - kept.length
    return kept.length === entry.evidenceAttemptIds.length ? entry : { ...entry, evidenceAttemptIds: kept }
  })
  const next: CourseLearningRecord = {
    ...record,
    attempts,
    mastery,
    notes,
  }
  await learning.save(next)
  return { attempts: record.attempts.length - attempts.length, notes: record.notes.length - notes.length, masteryEvidenceRefs }
}

/** Count revision files of one course (0 for legacy layouts). */
async function countCourseRevisions(state: LocalState, courseId: string): Promise<number> {
  try {
    const names = await state.list(`courses/${courseId}.revisions`)
    return names.filter(name => name.endsWith('.json')).length
  } catch {
    return 0
  }
}

/**
 * Delete local records by scope.
 *
 * Scope rules (also shown in the T07 evidence):
 * - `session`: deletes the session record, its message log, its activities and
 *   the attempts/notes produced in it; mastery keeps its history but drops the
 *   deleted attempt references (`masteryEvidenceRefs` counter).
 * - `course`: deletes the course, its revisions, its sessions/messages,
 *   activities and learning record; source documents are only detached
 *   (`sourcesDetached` counter) — original files are never touched.
 * - `learning`: clears attempts/mastery/review/notes for one course; the course
 *   and its sources stay.
 * - `notes`: clears notes (one course when `id` is given, every course otherwise).
 * - `all`: clears courses/sessions/activities/learning/sources/environments/
 *   runs/tasks; keeps meta/profile/settings, exported artifacts, backups and
 *   model usage logs.
 */
export async function deleteRecords(
  deps: RecordsDependencies,
  request: DeleteRecordsRequest,
): Promise<Result<DeleteRecordsResult>> {
  const scope = request.scope
  if (scope !== 'session' && scope !== 'course' && scope !== 'learning' && scope !== 'notes' && scope !== 'all') {
    return err('invalid-input', `不支持的删除范围：${String(scope)}`)
  }
  if (request.confirm !== true) {
    return err('needs-confirmation', '删除或重置记录需要显式确认（confirm=true）')
  }
  const details = emptyDetails()
  if (scope === 'session') {
    if (typeof request.id !== 'string' || request.id === '') return err('invalid-input', '删除会话需要 session id')
    const session = await deps.sessions.get(request.id)
    if (session === undefined) return err('not-found', '会话不存在或已被删除', { details: { sessionId: request.id } })
    const removed = await deleteSessionFiles(deps.state, deps.sessions, session.id)
    details.sessions = 1
    details.messages = removed.messages
    details.activities = removed.activities
    details.activityStates = removed.activityStates
    const learningCounts = await removeSessionLearning(deps.learning, session.courseId, session.id)
    details.attempts = learningCounts.attempts
    details.notes = learningCounts.notes
    details.masteryEvidenceRefs = learningCounts.masteryEvidenceRefs
    return ok({ deleted: true, details: detailsRecord(details) })
  }
  if (scope === 'course') {
    if (typeof request.id !== 'string' || request.id === '') return err('invalid-input', '删除课程需要 course id')
    const course = await deps.courses.get(request.id)
    if (course === undefined) return err('not-found', '课程不存在或已被删除', { details: { courseId: request.id } })
    details.courseRevisions = await countCourseRevisions(deps.state, course.id)
    const learning = await deps.learning.get(course.id)
    if (learning !== undefined) {
      details.attempts = learning.attempts.length
      details.mastery = learning.mastery.length
      details.review = learning.review.length
      details.notes = learning.notes.length
      await deleteLearningRecord(deps.state, course.id)
    }
    const sessions = await deps.sessions.list(course.id)
    for (const session of sessions) {
      const removed = await deleteSessionFiles(deps.state, deps.sessions, session.id)
      details.sessions += 1
      details.messages += removed.messages
      details.activities += removed.activities
      details.activityStates += removed.activityStates
    }
    // Activities that reference the course but no longer have a session record.
    const remaining = (await listAllActivities(deps.state)).filter(activity => activity.courseId === course.id)
    for (const activity of remaining) {
      const removed = await deleteActivityFiles(deps.state, activity.id)
      details.activities += removed.activities
      details.activityStates += removed.activityStates
    }
    const sources = await deps.courses.listSources(course.id)
    for (const source of sources) {
      await deps.courses.setSourceCourse(source.id, course.id, false)
      details.sourcesDetached += 1
    }
    await deps.courses.delete(course.id)
    details.courses = 1
    return ok({ deleted: true, details: detailsRecord(details) })
  }
  if (scope === 'learning') {
    if (typeof request.id !== 'string' || request.id === '') return err('invalid-input', '清除学情需要 course id')
    const course = await deps.courses.get(request.id)
    if (course === undefined) return err('not-found', '课程不存在或已被删除', { details: { courseId: request.id } })
    const learning = await deps.learning.get(course.id)
    if (learning !== undefined) {
      details.attempts = learning.attempts.length
      details.mastery = learning.mastery.length
      details.review = learning.review.length
      details.notes = learning.notes.length
      await deleteLearningRecord(deps.state, course.id)
    }
    return ok({ deleted: true, details: detailsRecord(details) })
  }
  if (scope === 'notes') {
    if (request.id !== undefined && typeof request.id !== 'string') return err('invalid-input', 'notes 范围的 id 必须是课程 id')
    if (request.id !== undefined) {
      const record = await deps.learning.get(request.id)
      if (record !== undefined) {
        details.notes = record.notes.length
        await deps.learning.save({ ...record, notes: [] })
      }
      return ok({ deleted: true, details: detailsRecord(details) })
    }
    const records = await deps.learning.listAll()
    for (const record of records) {
      if (record.notes.length === 0) continue
      details.notes += record.notes.length
      await deps.learning.save({ ...record, notes: [] })
    }
    return ok({ deleted: true, details: detailsRecord(details) })
  }
  // `all`: clear every teaching record directory but keep identity/settings/artifacts.
  const allActivities = await listAllActivities(deps.state)
  const allSessions = await deps.sessions.list()
  for (const session of allSessions) {
    details.messages += (await deps.sessions.messages(session.id)).length
  }
  details.sessions = allSessions.length
  details.activities = allActivities.length
  details.activityStates = (await deps.state.list('activities')).filter(name => name.endsWith('.state.json')).length
  const learningRecords = await deps.learning.listAll()
  details.attempts = learningRecords.reduce((sum, record) => sum + record.attempts.length, 0)
  details.mastery = learningRecords.reduce((sum, record) => sum + record.mastery.length, 0)
  details.review = learningRecords.reduce((sum, record) => sum + record.review.length, 0)
  details.notes = learningRecords.reduce((sum, record) => sum + record.notes.length, 0)
  details.courses = (await deps.state.list('courses')).filter(name => name.endsWith('.json')).length
  for (const course of await deps.courses.list()) {
    details.courseRevisions += await countCourseRevisions(deps.state, course.id)
  }
  details.environments = (await deps.state.list('environments')).filter(name => name.endsWith('.json')).length
  details.runs = (await deps.state.list('runs')).filter(name => name.endsWith('.json')).length
  details.tasks = (await deps.state.list('tasks')).filter(name => name.endsWith('.json')).length
  for (const dir of ['courses', 'sessions', 'activities', 'learning', 'sources', 'environments', 'runs', 'tasks']) {
    await deps.state.remove(dir)
  }
  return ok({ deleted: true, details: detailsRecord(details) })
}

/** Reset learning data (keeps courses, sources, sessions and profile). */
export async function resetLearningRecords(
  deps: RecordsDependencies,
  scope: 'learning' | 'all',
  confirm: boolean,
): Promise<Result<{ readonly reset: boolean }>> {
  if (confirm !== true) return err('needs-confirmation', '重置记录需要显式确认（confirm=true）')
  if (scope !== 'learning' && scope !== 'all') return err('invalid-input', `不支持的重置范围：${String(scope)}`)
  if (scope === 'all') {
    const deleted = await deleteRecords(deps, { scope: 'all', confirm: true })
    if (!deleted.ok) return deleted
    return ok({ reset: true })
  }
  await deps.state.remove('learning')
  return ok({ reset: true })
}
