/**
 * LocalState + repository contract tests.
 *
 * These exercise the same seams features use: open a store in a temp dir,
 * write/read records, hit schema and path-safety failures, and round-trip the
 * course/session/learning repositories across a "restart" (new instance).
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import {
  CourseRepository, LearningRepository, LocalState, ProfileRepository, SessionRepository,
  SCHEMA_VERSION, StoreError,
} from '../../src/index.ts'
import type { ChatMessage, Course, CourseRevision, TeachingSession } from '../../src/index.ts'

const tempDirs: string[] = []

async function newStore(): Promise<{ state: LocalState; dir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'teaching-store-'))
  tempDirs.push(dir)
  const state = new LocalState({ dataDir: dir, pluginVersion: 'test' })
  await state.open()
  return { state, dir }
}

after(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true })
})

describe('LocalState', () => {
  it('creates schema metadata and directories once', async () => {
    const { state, dir } = await newStore()
    const meta = await state.open()
    assert.equal(meta.schemaVersion, SCHEMA_VERSION)
    assert.match(meta.installationId, /^inst-/)
    const raw = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'))
    assert.equal(raw.schemaVersion, SCHEMA_VERSION)
    await state.writeJson('courses/x.json', { hello: 'world' })
    assert.deepEqual(await state.readJson('courses/x.json'), { hello: 'world' })
  })

  it('refuses paths outside the data directory and absolute writes elsewhere', async () => {
    const { state } = await newStore()
    await assert.rejects(state.writeJson('../escape.json', { a: 1 }), (error: unknown) => error instanceof StoreError)
    await assert.rejects(state.writeJson('/tmp/absolute-escape.json', { a: 1 }), (error: unknown) => error instanceof StoreError)
    // Absolute paths inside the data dir are accepted (layout helpers return them).
    const inside = join(state.dataDir, 'courses', 'inside.json')
    await state.writeJson(inside, { ok: true })
    assert.deepEqual(await state.readJson(inside), { ok: true })
  })

  it('reports corrupt records instead of silently replacing them', async () => {
    const { state, dir } = await newStore()
    await writeFile(join(dir, 'courses', 'broken.json'), '{not json')
    await assert.rejects(state.readJson('courses/broken.json'), (error: unknown) => {
      return error instanceof StoreError && error.appError.code === 'storage'
    })
    // The raw file is preserved for recovery.
    assert.equal(await readFile(join(dir, 'courses', 'broken.json'), 'utf8'), '{not json')
  })

  it('refuses a newer schema instead of guessing', async () => {
    const { state, dir } = await newStore()
    const metaPath = join(dir, 'meta.json')
    const meta = JSON.parse(await readFile(metaPath, 'utf8'))
    await writeFile(metaPath, JSON.stringify({ ...meta, schemaVersion: SCHEMA_VERSION + 5 }))
    const reopened = new LocalState({ dataDir: dir })
    await assert.rejects(reopened.open(), (error: unknown) => {
      return error instanceof StoreError && error.appError.code === 'storage'
    })
  })

  it('skips a trailing partial JSONL line after a crash', async () => {
    const { state, dir } = await newStore()
    await state.appendJsonl('sessions/s.messages.jsonl', { id: 'a' })
    await writeFile(join(dir, 'sessions', 's.messages.jsonl'), `${JSON.stringify({ id: 'a' })}\n{"id":`, 'utf8')
    const lines = await state.readJsonl<{ id: string }>('sessions/s.messages.jsonl')
    assert.deepEqual(lines, [{ id: 'a' }])
  })

  it('serialises concurrent writes to the same record', async () => {
    const { state } = await newStore()
    await Promise.all(Array.from({ length: 20 }, (_, index) => state.writeJson('notes/counter.json', { value: index })))
    const value = await state.readJson<{ value: number }>('notes/counter.json')
    assert.equal(typeof value?.value, 'number')
  })
})

describe('repositories', () => {
  it('round-trips course, revisions, session messages and learning across a reopen', async () => {
    const { state, dir } = await newStore()
    const courses = new CourseRepository(state)
    const sessions = new SessionRepository(state)
    const createdAt = new Date().toISOString()
    const course: Course = {
      id: 'course-1' as never,
      title: '测试课程',
      description: '',
      subjectTags: [],
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      activeRevisionId: 'crev-1' as never,
    }
    const revision: CourseRevision = {
      id: 'crev-1' as never,
      courseId: course.id,
      version: 1,
      createdAt,
      state: 'confirmed',
      provenance: 'ai-draft',
      goals: ['理解概念'],
      language: 'zh',
      sources: [],
      concepts: [{
        id: 'concept-1' as never,
        title: '概念一',
        summary: '',
        prerequisites: [],
        sourceAnchors: [],
      }],
      sequence: ['concept-1' as never],
      basedOn: [],
    }
    await courses.save(course)
    await courses.saveRevision(revision)
    const session: TeachingSession = {
      id: 'sess-1' as never,
      courseId: course.id,
      courseRevisionId: revision.id,
      title: '会话',
      createdAt,
      updatedAt: createdAt,
      status: 'active',
      position: { stage: 'teaching', updatedAt: createdAt },
      messageIds: [],
      coveredConceptIds: [],
    }
    await sessions.save(session)
    const message: ChatMessage = {
      id: 'msg-1' as never,
      sessionId: session.id,
      role: 'teacher',
      kind: 'teacher-explanation',
      text: '有来源的讲解',
      createdAt,
      evidenceRefs: [{ kind: 'course-source', label: '资料', confidence: 'high' }],
    }
    await sessions.appendMessage(message)

    // A second instance simulates a Host restart reading the same directory.
    const reopened = new LocalState({ dataDir: dir })
    await reopened.open()
    const courses2 = new CourseRepository(reopened)
    const sessions2 = new SessionRepository(reopened)
    const learning2 = new LearningRepository(reopened)
    assert.equal((await courses2.get('course-1'))?.title, '测试课程')
    assert.equal((await courses2.listRevisions('course-1')).length, 1)
    assert.deepEqual(await sessions2.messages('sess-1'), [message])
    assert.equal((await sessions2.list('course-1')).length, 1)
    assert.equal(await learning2.get('course-1'), undefined)
  })

  it('merges profile patches without dropping preferences', async () => {
    const { state } = await newStore()
    const profiles = new ProfileRepository(state)
    const first = await profiles.patch({ language: 'bilingual', preferences: { showSources: false } })
    assert.equal(first.language, 'bilingual')
    assert.equal(first.preferences.keepOriginalTerms, true)
    assert.equal(first.preferences.showSources, false)
  })

  it('rejects updates to a missing course', async () => {
    const { state } = await newStore()
    const courses = new CourseRepository(state)
    await assert.rejects(courses.updateHeader('missing', { title: 'x' }), (error: unknown) => {
      return error instanceof StoreError && error.appError.code === 'not-found'
    })
  })
})
