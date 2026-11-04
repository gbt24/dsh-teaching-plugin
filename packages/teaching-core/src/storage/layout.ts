/**
 * On-disk layout of the teaching plugin's local data.
 *
 * The layout is versioned and rooted outside the student's original material:
 * nothing here ever writes to a source file. JSON files are individually
 * atomic; large collections are split per identity (course/session/source) so a
 * library with hundreds of documents does not have to be read as one blob.
 */
import { join } from 'node:path'

/** Current on-disk schema version; bump together with a migration. */
export const SCHEMA_VERSION = 1

/** File name of the store metadata. */
export const META_FILE = 'meta.json'

/** Relative paths used by LocalState and repositories. */
export function layout(dataDir: string) {
  const root = dataDir
  const dirs = {
    root,
    courses: join(root, 'courses'),
    sources: join(root, 'sources'),
    sessions: join(root, 'sessions'),
    activities: join(root, 'activities'),
    learning: join(root, 'learning'),
    environments: join(root, 'environments'),
    runs: join(root, 'runs'),
    tasks: join(root, 'tasks'),
    exports: join(root, 'exports'),
    backups: join(root, 'backups'),
    usage: join(root, 'usage'),
    cache: join(root, 'cache'),
  } as const
  const files = {
    meta: join(root, META_FILE),
    profile: join(root, 'student-profile.json'),
    settings: join(root, 'settings.json'),
    usageLog: join(root, 'usage', 'model-usage.jsonl'),
  } as const
  return { ...dirs, files }
}

/** Every directory the store creates on init. */
export function dataDirs(dataDir: string): string[] {
  const l = layout(dataDir)
  return [l.courses, l.sources, l.sessions, l.activities, l.learning, l.environments,
    l.runs, l.tasks, l.exports, l.backups, l.usage, l.cache]
}

/** Path of one course record. */
export function courseFile(dataDir: string, courseId: string): string {
  return join(layout(dataDir).courses, `${courseId}.json`)
}

/** Path of one course revision record. */
export function courseRevisionFile(dataDir: string, courseId: string, revisionId: string): string {
  return join(layout(dataDir).courses, `${courseId}.revisions`, `${revisionId}.json`)
}

/** Directory holding a course's revision files. */
export function courseRevisionDir(dataDir: string, courseId: string): string {
  return join(layout(dataDir).courses, `${courseId}.revisions`)
}

/** Path of one source document record. */
export function sourceFile(dataDir: string, sourceId: string): string {
  return join(layout(dataDir).sources, `${sourceId}.json`)
}

/** Path of one source revision metadata record. */
export function sourceRevisionFile(dataDir: string, sourceId: string, revisionId: string): string {
  return join(layout(dataDir).sources, sourceId, 'revisions', `${revisionId}.meta.json`)
}

/** Path of one source revision's units payload. */
export function sourceUnitsFile(dataDir: string, sourceId: string, revisionId: string): string {
  return join(layout(dataDir).sources, sourceId, 'revisions', `${revisionId}.units.json`)
}

/** Directory for a source revision's extracted assets (figures/images). */
export function sourceAssetsDir(dataDir: string, sourceId: string, revisionId: string): string {
  return join(layout(dataDir).sources, sourceId, 'assets', revisionId)
}

/** Path of one session record. */
export function sessionFile(dataDir: string, sessionId: string): string {
  return join(layout(dataDir).sessions, `${sessionId}.json`)
}

/** Path of one session's message log (append-only JSONL). */
export function sessionMessagesFile(dataDir: string, sessionId: string): string {
  return join(layout(dataDir).sessions, `${sessionId}.messages.jsonl`)
}

/** Path of one activity record. */
export function activityFile(dataDir: string, activityId: string): string {
  return join(layout(dataDir).activities, `${activityId}.json`)
}

/** Path of one activity's student state. */
export function activityStateFile(dataDir: string, activityId: string): string {
  return join(layout(dataDir).activities, `${activityId}.state.json`)
}

/** Path of the per-course learning record. */
export function learningFile(dataDir: string, courseId: string): string {
  return join(layout(dataDir).learning, `${courseId}.json`)
}

/** Path of one environment record. */
export function environmentFile(dataDir: string, environmentId: string): string {
  return join(layout(dataDir).environments, `${environmentId}.json`)
}

/** Path of one experiment run record. */
export function runFile(dataDir: string, runId: string): string {
  return join(layout(dataDir).runs, `${runId}.json`)
}

/** Path of one task record. */
export function taskFile(dataDir: string, taskId: string): string {
  return join(layout(dataDir).tasks, `${taskId}.json`)
}

/** Path of one exported manifest. */
export function exportFile(dataDir: string, exportId: string): string {
  return join(layout(dataDir).exports, `${exportId}.json`)
}

/** Path of one backup manifest. */
export function backupFile(dataDir: string, backupId: string): string {
  return join(layout(dataDir).backups, `${backupId}.json`)
}
