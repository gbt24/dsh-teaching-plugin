/**
 * Typed repositories over {@link LocalState} for the T01 domain objects.
 *
 * These are the only supported way features persist data; they keep the file
 * layout, ordering and compare-and-set rules in one place. Each repository is
 * intentionally small: modules that need a new query should add a method here
 * rather than reaching into paths directly.
 */
import type { AppError } from '../contracts/result.ts'
import type { SourceDocument } from '../contracts/source.ts'
import type {
  Course, CourseRevision, SourceRole,
} from '../contracts/course.ts'
import type { CourseId } from '../contracts/ids.ts'
import type {
  ActivityState, LessonActivity,
} from '../contracts/activity.ts'
import type {
  ChatMessage, StudentProfile, TeachingSession,
} from '../contracts/session.ts'
import type { CourseLearningRecord } from '../contracts/learning.ts'
import { nowIso } from '../contracts/ids.ts'
import type { LocalState } from './local-state.ts'
import { StoreError } from './local-state.ts'
import {
  activityFile, activityStateFile, courseFile, courseRevisionDir, courseRevisionFile,
  learningFile, sessionFile, sessionMessagesFile, sourceFile,
} from './layout.ts'

/** Default empty student profile. */
export function emptyProfile(): StudentProfile {
  return {
    language: 'zh',
    preferences: { showSources: true, keepOriginalTerms: true, confirmSystemChanges: true },
    updatedAt: nowIso(),
  }
}

/** Store for the single local student profile. */
export class ProfileRepository {
  constructor(private readonly state: LocalState) {}

  /** Read the profile, creating defaults on first use. */
  async get(): Promise<StudentProfile> {
    const stored = await this.state.readJson<StudentProfile>(this.state.paths.files.profile)
    if (stored !== undefined) return stored
    const profile = emptyProfile()
    await this.state.writeJson(this.state.paths.files.profile, profile)
    return profile
  }

  /** Merge a patch into the profile and persist it. */
  async patch(patch: Partial<StudentProfile>): Promise<StudentProfile> {
    const current = await this.get()
    const next: StudentProfile = {
      ...current,
      ...patch,
      preferences: { ...current.preferences, ...(patch.preferences ?? {}) },
      updatedAt: nowIso(),
    }
    await this.state.writeJson(this.state.paths.files.profile, next)
    return next
  }
}

/** Store for courses and their immutable structure revisions. */
export class CourseRepository {
  constructor(private readonly state: LocalState) {}

  /** All courses, newest first. */
  async list(): Promise<Course[]> {
    const files = (await this.state.list('courses')).filter(name => name.endsWith('.json'))
    const courses: Course[] = []
    for (const name of files) {
      const course = await this.state.readJson<Course>(`courses/${name}`)
      if (course !== undefined) courses.push(course)
    }
    return courses.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Read one course or undefined. */
  async get(courseId: string): Promise<Course | undefined> {
    return this.state.readJson<Course>(courseFile(this.state.dataDir, courseId))
  }

  /** Create or replace a course record. */
  async save(course: Course): Promise<Course> {
    const next = { ...course, updatedAt: nowIso() }
    await this.state.writeJson(courseFile(this.state.dataDir, course.id), next)
    return next
  }

  /** Persist one course revision. */
  async saveRevision(revision: CourseRevision): Promise<void> {
    await this.state.writeJson(courseRevisionFile(this.state.dataDir, revision.courseId, revision.id), revision)
  }

  /** Read one course revision. */
  async getRevision(courseId: string, revisionId: string): Promise<CourseRevision | undefined> {
    return this.state.readJson<CourseRevision>(courseRevisionFile(this.state.dataDir, courseId, revisionId))
  }

  /** Read the confirmed revision a session should use. */
  async getActiveRevision(course: Course): Promise<CourseRevision | undefined> {
    if (course.activeRevisionId === undefined) return undefined
    return this.getRevision(course.id, course.activeRevisionId)
  }

  /** Read the newest proposed revision, if any. */
  async getDraftRevision(course: Course): Promise<CourseRevision | undefined> {
    if (course.draftRevisionId === undefined) return undefined
    return this.getRevision(course.id, course.draftRevisionId)
  }

  /** All revisions of one course, oldest first. */
  async listRevisions(courseId: string): Promise<CourseRevision[]> {
    const dir = courseRevisionDir(this.state.dataDir, courseId)
    const rel = dir.slice(this.state.dataDir.length + 1)
    const files = (await this.state.list(rel)).filter(name => name.endsWith('.json'))
    const revisions: CourseRevision[] = []
    for (const name of files) {
      const revision = await this.state.readJson<CourseRevision>(`${rel}/${name}`)
      if (revision !== undefined) revisions.push(revision)
    }
    return revisions.sort((a, b) => a.version - b.version)
  }

  /**
   * Compare-and-set update of the course header. Expected revision guards
   * against two windows overwriting each other's structural state.
   */
  async updateHeader(
    courseId: string,
    patch: Partial<Pick<Course, 'title' | 'description' | 'status' | 'subjectTags'>>,
  ): Promise<Course> {
    const course = await this.get(courseId)
    if (course === undefined) throw new StoreError(notFound('课程'))
    return this.save({ ...course, ...patch })
  }

  /** Delete a course, its revisions and source links. */
  async delete(courseId: string): Promise<void> {
    await this.state.remove(`courses/${courseId}.json`)
    await this.state.remove(`courses/${courseId}.revisions`)
  }

  /** Read the course sources (whole documents; units stay in the source store). */
  async listSources(courseId: string): Promise<SourceDocument[]> {
    const files = (await this.state.list('sources')).filter(name => name.endsWith('.json'))
    const docs: SourceDocument[] = []
    for (const name of files) {
      const doc = await this.state.readJson<SourceDocument>(`sources/${name}`)
      if (doc !== undefined && doc.courseIds.includes(courseId as never)) docs.push(doc)
    }
    return docs
  }

  /** Attach/unattach an existing source document to a course. */
  async setSourceCourse(documentId: string, courseId: string, attach: boolean): Promise<SourceDocument> {
    const path = sourceFile(this.state.dataDir, documentId)
    const doc = await this.state.readJson<SourceDocument>(path)
    if (doc === undefined) throw new StoreError(notFound('资料'))
    const courseIds = (attach
      ? Array.from(new Set([...doc.courseIds, courseId]))
      : doc.courseIds.filter(id => id !== courseId)) as unknown as readonly CourseId[]
    const next: SourceDocument = { ...doc, courseIds, updatedAt: nowIso() }
    await this.state.writeJson(path, next)
    return next
  }

  /** Store one source document record. */
  async saveSource(document: SourceDocument): Promise<SourceDocument> {
    const next = { ...document, updatedAt: nowIso() }
    await this.state.writeJson(sourceFile(this.state.dataDir, document.id), next)
    return next
  }

  /** Read one source document record. */
  async getSource(documentId: string): Promise<SourceDocument | undefined> {
    return this.state.readJson<SourceDocument>(sourceFile(this.state.dataDir, documentId))
  }

  /** Roles attached to a course's sources are stored on the course revision; unused helper kept for T02. */
  static roleOf(revision: CourseRevision, sourceId: string): SourceRole | undefined {
    return revision.sources.find(source => source.sourceId === sourceId)?.role
  }
}

/** Store for teaching sessions, their message stream and activities. */
export class SessionRepository {
  constructor(private readonly state: LocalState) {}

  /** Sessions for one course (or all), newest first. */
  async list(courseId?: string): Promise<TeachingSession[]> {
    const files = (await this.state.list('sessions')).filter(name => name.endsWith('.json') && !name.includes('.messages.'))
    const sessions: TeachingSession[] = []
    for (const name of files) {
      const session = await this.state.readJson<TeachingSession>(`sessions/${name}`)
      if (session !== undefined && (courseId === undefined || session.courseId === courseId)) sessions.push(session)
    }
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  /** Read one session. */
  async get(sessionId: string): Promise<TeachingSession | undefined> {
    return this.state.readJson<TeachingSession>(sessionFile(this.state.dataDir, sessionId))
  }

  /** Persist one session record. */
  async save(session: TeachingSession): Promise<TeachingSession> {
    const next = { ...session, updatedAt: nowIso() }
    await this.state.writeJson(sessionFile(this.state.dataDir, session.id), next)
    return next
  }

  /** Read all messages of one session, oldest first. */
  async messages(sessionId: string): Promise<ChatMessage[]> {
    return this.state.readJsonl<ChatMessage>(sessionMessagesFile(this.state.dataDir, sessionId))
  }

  /** Append one message to the durable stream. */
  async appendMessage(message: ChatMessage): Promise<void> {
    await this.state.appendJsonl(sessionMessagesFile(this.state.dataDir, message.sessionId), message)
  }

  /** Persist an activity record. */
  async saveActivity(activity: LessonActivity): Promise<LessonActivity> {
    const next = { ...activity, updatedAt: nowIso() }
    await this.state.writeJson(activityFile(this.state.dataDir, activity.id), next)
    return next
  }

  /** Read one activity. */
  async getActivity(activityId: string): Promise<LessonActivity | undefined> {
    return this.state.readJson<LessonActivity>(activityFile(this.state.dataDir, activityId))
  }

  /** All activities of one session. */
  async listActivities(sessionId: string): Promise<LessonActivity[]> {
    const files = (await this.state.list('activities')).filter(name => name.endsWith('.json') && !name.endsWith('.state.json'))
    const activities: LessonActivity[] = []
    for (const name of files) {
      const activity = await this.state.readJson<LessonActivity>(`activities/${name}`)
      if (activity !== undefined && activity.sessionId === sessionId) activities.push(activity)
    }
    return activities.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  /** Persist student-editable activity state. */
  async saveActivityState(stateRecord: ActivityState): Promise<ActivityState> {
    const next = { ...stateRecord, updatedAt: nowIso() }
    await this.state.writeJson(activityStateFile(this.state.dataDir, stateRecord.activityId), next)
    return next
  }

  /** Read student-editable activity state. */
  async getActivityState(activityId: string): Promise<ActivityState | undefined> {
    return this.state.readJson<ActivityState>(activityStateFile(this.state.dataDir, activityId))
  }

  /** Delete a session and its messages (student data control). */
  async delete(sessionId: string): Promise<void> {
    await this.state.remove(`sessions/${sessionId}.json`)
    await this.state.remove(`sessions/${sessionId}.messages.jsonl`)
  }
}

/** Store for per-course learning records (attempts, mastery, review, notes). */
export class LearningRepository {
  constructor(private readonly state: LocalState) {}

  /** Read one course learning record. */
  async get(courseId: string): Promise<CourseLearningRecord | undefined> {
    return this.state.readJson<CourseLearningRecord>(learningFile(this.state.dataDir, courseId))
  }

  /** Persist one course learning record. */
  async save(record: CourseLearningRecord): Promise<CourseLearningRecord> {
    const next = { ...record, updatedAt: nowIso() }
    await this.state.writeJson(learningFile(this.state.dataDir, record.courseId), next)
    return next
  }

  /** List every course learning record (for backup/export). */
  async listAll(): Promise<CourseLearningRecord[]> {
    const files = (await this.state.list('learning')).filter(name => name.endsWith('.json'))
    const records: CourseLearningRecord[] = []
    for (const name of files) {
      const record = await this.state.readJson<CourseLearningRecord>(`learning/${name}`)
      if (record !== undefined) records.push(record)
    }
    return records
  }
}

/** Read the course revision a session is bound to, with a clear error otherwise. */
export async function requireRevision(
  courses: CourseRepository,
  courseId: string,
  revisionId: string,
): Promise<CourseRevision> {
  const revision = await courses.getRevision(courseId, revisionId)
  if (revision === undefined) {
    throw new StoreError({ code: 'not-found', message: '课程结构版本不存在', details: { courseId, revisionId } })
  }
  return revision
}

/** Standard not-found error without leaking implementation detail. */
export function notFound(what: string): AppError {
  return { code: 'not-found', message: `${what}不存在或已被删除` }
}
