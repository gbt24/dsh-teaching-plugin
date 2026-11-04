/**
 * Host route layer: every `/api/teaching/<operation>` exact Fetch route.
 *
 * Handlers validate inputs, delegate to feature services, and always return the
 * `Result` JSON envelope (HTTP 200 for logical outcomes) or an SSE stream for
 * chat. The Host is the sole authority for persisted state; the client only
 * renders what these routes return.
 */
import { createHash, randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type {
  ActivityProposal, ActivityState, ApiRequests, AppError, AttemptOutcome, AttemptValidation, BootstrapInfo,
  ChatMessage, ChatStreamEvent, Course, CourseDraftView, CourseRevision, CourseSummary,
  CourseLearningRecord, EnvironmentDirectory, EnvironmentRecord, ExperimentRun, LearningAttempt,
  LessonActivity, MasteryRecord, ModelCapabilities, ReviewItem,
  SessionSummary, SessionView, SourceAnchor, SourceDocument, SourceView, TeachingSession,
} from '@deepseek-teaching/core'
import {
  API_PREFIX, CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
  activityFile, activityStateFile, courseId as newCourseId, courseRevisionId as newCourseRevisionId,
  environmentFile, nowIso, runFile, sessionId as newSessionId, sourceId as newSourceId,
  apiPath,
} from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'
import type { ModelClient } from '@deepseek-teaching/core'
import type { TaskManager } from './tasks.ts'
import type { MinimalCorpus } from './minimal.ts'
import {
  activityFromProposal, appError, buildTeachingMessages, createCourseRecord, createSessionRecord,
  detectFormat, draftConceptsFromSources, hitToEvidence, normalizeActivityProposal, parseTeachingMeta,
  runCode, studentMessage, teacherMessage,
} from './minimal.ts'

/** Services available to route handlers. */
export interface RouteServices {
  readonly ctx: {
    connection: {
      fetch: {
        register(route: {
          path: string
          methods: readonly ('GET' | 'HEAD' | 'POST')[]
          requestBody: 'buffered' | 'streaming'
          fetch: (request: Request) => Promise<Response>
        }): () => Promise<void>
      }
    }
  }
  readonly state: LocalState
  readonly model: ModelClient
  readonly tasks: TaskManager
  readonly corpus: MinimalCorpus
  readonly profiles: ProfileRepository
  readonly courses: CourseRepository
  readonly sessions: SessionRepository
  readonly learning: LearningRepository
  readonly pluginVersion: string
  readonly dataDir: string
  readonly logger: (message: string, fields?: Record<string, unknown>) => void
  readonly hostFacts: { platform: string; arch: string; nodeVersion: string; profile?: string }
  /** Resolves once the store is open and interrupted tasks are marked. */
  readonly ready: Promise<void>
}

/** JSON envelope helper. */
function envelope(value: unknown): Response {
  return new Response(JSON.stringify({ ok: true, value }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Failure envelope (HTTP 200; the client reads `ok`). */
function failure(error: AppError): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Read a JSON body with a size bound and structural sanity. */
async function readJsonBody<T>(request: Request): Promise<T> {
  const text = await request.text()
  if (text.length > 2_000_000) throw appError('limit-exceeded', '请求体过大')
  if (text.trim() === '') return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw appError('invalid-input', '请求体不是有效 JSON')
  }
}

/** Convert unknown thrown values into the failure envelope. */
function catchToResponse(cause: unknown, logger: RouteServices['logger']): Response {
  if (typeof cause === 'object' && cause !== null && typeof (cause as AppError).code === 'string') {
    return failure(cause as AppError)
  }
  logger('route error', { message: cause instanceof Error ? cause.message : String(cause) })
  return failure({
    code: 'failed',
    message: '操作失败',
    details: { message: cause instanceof Error ? cause.message : String(cause) },
  })
}

type Operation = keyof ApiRequests

/** Register every route on the Host connection service. */
export function registerRoutes(services: RouteServices): void {
  const { ctx, logger } = services

  /** Register one exact route with input decoding and error normalisation. */
  function route<Op extends Operation>(
    operation: Op,
    handler: (input: {
      query: URLSearchParams
      body: ApiRequests[Op]['body'] | undefined
      request: Request
      signal: AbortSignal
    }) => Promise<Response> | Response,
  ): void {
    const definition = { method: operation === 'bootstrap' ? 'GET' : undefined } as unknown
    void definition
    const spec = requestSpec(operation)
    const path = apiPath(operation)
    ctx.connection.fetch.register({
      path,
      methods: [spec.method],
      requestBody: spec.method === 'POST' ? 'buffered' : 'buffered',
      fetch: async request => {
        const controller = new AbortController()
        const abort = (): void => controller.abort()
        request.signal?.addEventListener('abort', abort, { once: true })
        try {
          await services.ready
          const url = new URL(request.url)
          const body = spec.method === 'POST' ? await readJsonBody<ApiRequests[Op]['body']>(request) : undefined
          return await handler({ query: url.searchParams, body, request, signal: controller.signal })
        } catch (cause) {
          return catchToResponse(cause, logger)
        } finally {
          request.signal?.removeEventListener('abort', abort)
        }
      },
    })
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap / capabilities                                             */
  /* ------------------------------------------------------------------ */

  route('bootstrap', async () => {
    const profile = await services.profiles.get()
    const model = await services.model.info()
    const capabilities: ModelCapabilities = {
      provider: model.provider,
      model: model.model,
      reasoningEffort: model.reasoningEffort,
      imageInput: model.imageInput,
      contextWindow: model.contextWindow,
      note: model.note,
    }
    const warnings: string[] = []
    if (model.imageInput === 'unknown') warnings.push('未能确认当前模型是否支持图片输入；扫描件将展示原文供核对')
    const info: BootstrapInfo = {
      pluginVersion: services.pluginVersion,
      builtFor: '0.2.1-rc.5',
      host: {
        profile: services.hostFacts.profile,
        platform: services.hostFacts.platform,
        arch: services.hostFacts.arch,
        nodeVersion: services.hostFacts.nodeVersion,
      },
      model: capabilities,
      dataDir: services.dataDir,
      profile,
      language: profile.language,
      features: {
        imageOcr: false,
        webSearch: false,
        experiments: true,
        offlineExport: false,
      },
      warnings,
    }
    return envelope(info)
  })

  route('capabilities.get', async () => {
    const model = await services.model.info()
    return envelope({
      model: {
        provider: model.provider,
        model: model.model,
        reasoningEffort: model.reasoningEffort,
        imageInput: model.imageInput,
        contextWindow: model.contextWindow,
      },
      environments: await listEnvironments(services),
    })
  })

  /* ------------------------------------------------------------------ */
  /* Courses                                                              */
  /* ------------------------------------------------------------------ */

  route('courses.list', async () => {
    const courses = await services.courses.list()
    const summaries: CourseSummary[] = []
    for (const course of courses) {
      const sources = await services.courses.listSources(course.id)
      const revisions = await services.courses.listRevisions(course.id)
      const active = revisions.find(revision => revision.id === course.activeRevisionId)
      const sessions = await services.sessions.list(course.id)
      summaries.push({
        course,
        sourceCount: sources.length,
        conceptCount: active?.concepts.length ?? 0,
        readySourceCount: sources.filter(source => source.status === 'ready').length,
        lastSessionAt: sessions[0]?.updatedAt,
      })
    }
    return envelope({ courses: summaries })
  })

  route('courses.create', async ({ body }) => {
    const input = body as ApiRequests['courses.create']['body']
    if (typeof input?.title !== 'string' || input.title.trim() === '') {
      throw appError('invalid-input', '课程标题不能为空')
    }
    const language = input.language ?? (await services.profiles.get()).language
    const { course, revision } = createCourseRecord(input.title.trim(), input.description ?? '', language, input.goals ?? [])
    const created = await services.courses.save(course)
    await services.courses.saveRevision(revision)
    const withDraft: Course = { ...created, draftRevisionId: revision.id }
    await services.courses.save(withDraft)
    return envelope({ course: withDraft, revision })
  })

  route('courses.get', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const course = await services.courses.get(courseId)
    if (course === undefined) throw notFoundError('课程')
    const revisions = await services.courses.listRevisions(courseId)
    const active = revisions.find(revision => revision.id === course.activeRevisionId)
    const draftRevision = revisions.find(revision => revision.id === course.draftRevisionId)
    const sources = await services.courses.listSources(courseId)
    const learning = (await services.learning.get(courseId)) ?? emptyLearning(courseId, active?.id ?? '')
    let draft: CourseDraftView | undefined
    if (draftRevision !== undefined) {
      draft = await buildDraftView(services, course, draftRevision, sources)
    }
    return envelope({ course, revisions, activeRevision: active, draftRevision, draft, sources, learning })
  })

  route('courses.update', async ({ body }) => {
    const input = body as ApiRequests['courses.update']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    const course = await services.courses.updateHeader(input.courseId, {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.status === undefined ? {} : { status: input.status }),
    })
    return envelope({ course })
  })

  route('courses.delete', async ({ body }) => {
    const input = body as ApiRequests['courses.delete']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    const sessions = await services.sessions.list(input.courseId)
    for (const session of sessions) await services.sessions.delete(session.id)
    await services.courses.delete(input.courseId)
    await services.state.remove(`learning/${input.courseId}.json`)
    return envelope({ deleted: true })
  })

  /* ------------------------------------------------------------------ */
  /* Sources                                                              */
  /* ------------------------------------------------------------------ */

  route('sources.import', async ({ body }) => {
    const input = body as ApiRequests['sources.import']['body']
    const paths = (input?.paths ?? []).filter((path): path is string => typeof path === 'string' && path.trim() !== '')
    if (paths.length === 0) throw appError('invalid-input', '请提供至少一个本地文件路径')
    const courseId = input.courseId
    const handle = services.tasks.start({
      kind: 'source-import',
      label: `导入 ${paths.length} 份资料`,
      steps: [
        ...paths.slice(0, 20).map((path, index) => ({ id: `file-${index}`, label: basename(path) })),
      ],
      resumable: true,
    }, async context => {
      const imported: SourceDocument[] = []
      const failures: { path: string; error: AppError }[] = []
      for (const [index, path] of paths.entries()) {
        if (context.cancelled()) break
        const stepId = `file-${index}`
        context.step(stepId, { status: 'running' })
        try {
          if (index >= 20) {
            // Steps beyond the visible list still report coarse progress.
            context.progress((index) / paths.length)
          }
          const result = await services.corpus.importFile(path, courseId)
          if (courseId !== undefined) await services.corpus.attach(result.document.id, courseId, true)
          imported.push(result.document)
          for (const warning of result.warnings) context.warn(`${basename(path)}: ${warning}`)
          context.step(stepId, { status: 'done', detail: `${result.units.length} 个内容单元` })
        } catch (cause) {
          const error = toAppError(cause)
          failures.push({ path, error })
          context.step(stepId, { status: 'failed', detail: error.message })
        }
        context.progress((index + 1) / paths.length)
      }
      context.result({ imported: imported.map(document => document.id), failures })
      if (failures.length > 0 && imported.length === 0) throw appError('failed', '所有资料导入失败', { failures })
      return { imported, failures }
    })
    return envelope({ task: handle })
  })

  route('sources.refresh', async ({ body }) => {
    const input = body as ApiRequests['sources.refresh']['body']
    const documentId = input?.documentId
    if (typeof documentId !== 'string') throw appError('invalid-input', '缺少 documentId')
    const handle = services.tasks.start({
      kind: 'source-refresh',
      label: '检查资料变化',
      steps: [{ id: 'compare', label: '对比指纹' }, { id: 'reimport', label: '更新解析' }],
    }, async context => {
      context.step('compare', { status: 'running' })
      const stored = await services.corpus.load(documentId)
      const info = await stat(stored.document.originalPath).catch(() => undefined)
      context.step('compare', { status: 'done', detail: info === undefined ? '原文件缺失' : '已读取' })
      if (info === undefined) throw appError('not-found', '原文件已不存在，无法刷新')
      const bytes = await readFile(stored.document.originalPath)
      const fingerprint = createHash('sha256').update(bytes).digest('hex')
      if (fingerprint === stored.fingerprint) {
        context.result({ changed: false })
        return { changed: false }
      }
      context.step('reimport', { status: 'running' })
      const reimported = await services.corpus.importFile(stored.document.originalPath, stored.document.courseIds[0])
      await services.corpus.attach(reimported.document.id, stored.document.courseIds[0] ?? '', true)
      context.step('reimport', { status: 'done', detail: `${reimported.units.length} 个内容单元` })
      context.result({
        changed: true,
        newRevision: reimported.document.currentRevisionId,
        affectedConcepts: '待 T02 基于引用索引计算',
      })
      return { changed: true }
    })
    return envelope({ task: handle })
  })

  route('sources.get', async ({ query }) => {
    const documentId = requireQuery(query, 'documentId')
    const offset = Number(query.get('offset') ?? '0')
    const limit = Math.min(200, Math.max(1, Number(query.get('limit') ?? '50')))
    const stored = await services.corpus.load(documentId)
    const units = stored.units.slice(offset, offset + limit)
    const revision: SourceView['revision'] = {
      id: stored.document.currentRevisionId ?? stored.units[0]?.revisionId ?? '',
      documentId: stored.document.id,
      fingerprint: stored.fingerprint,
      createdAt: stored.document.addedAt,
      extractor: { name: 'text-v1', version: '0.1.0' },
      unitCount: stored.units.length,
      issueCount: stored.warnings.length,
      status: stored.document.status === 'ready' ? 'ready' : 'partial',
      units,
      issues: stored.warnings.map(message => ({ code: 'unsupported-content', severity: 'info', message, reviewRequired: false })),
    } as never
    const view: SourceView = {
      document: stored.document,
      revision,
      issues: stored.warnings.map(message => ({ code: 'unsupported-content', severity: 'info', message, reviewRequired: false })),
      totalUnits: stored.units.length,
    }
    return envelope(view)
  })

  /* ------------------------------------------------------------------ */
  /* Course draft                                                         */
  /* ------------------------------------------------------------------ */

  route('courseDraft.generate', async ({ body }) => {
    const input = body as ApiRequests['courseDraft.generate']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    const course = await services.courses.get(input.courseId)
    if (course === undefined) throw notFoundError('课程')
    const handle = services.tasks.start({
      kind: 'course-draft',
      label: '分析资料并生成课程草案',
      steps: [
        { id: 'read', label: '读取已就绪资料' },
        { id: 'structure', label: '提取概念与顺序' },
        { id: 'save', label: '保存草案' },
      ],
    }, async context => {
      context.step('read', { status: 'running' })
      const documents = await services.courses.listSources(course.id)
      if (documents.length === 0) throw appError('invalid-input', '课程还没有资料，请先导入资料')
      const loaded = []
      for (const document of documents) {
        if (document.status === 'failed') continue
        loaded.push({ document, units: (await services.corpus.load(document.id)).units })
      }
      context.step('read', { status: 'done', detail: `${loaded.length} 份资料` })
      context.step('structure', { status: 'running' })
      const drafted = draftConceptsFromSources(loaded)
      context.step('structure', { status: 'done', detail: `${drafted.concepts.length} 个候选概念` })
      context.step('save', { status: 'running' })
      const previous = await services.courses.listRevisions(course.id)
      const nextVersion = (previous.at(-1)?.version ?? 0) + 1
      const revision: CourseRevision = {
        id: newCourseRevisionId(),
        courseId: course.id,
        version: nextVersion,
        createdAt: nowIso(),
        state: 'draft',
        provenance: 'ai-draft',
        goals: previous.find(item => item.id === course.activeRevisionId)?.goals ?? [],
        language: course.description !== '' ? (await services.profiles.get()).language : (await services.profiles.get()).language,
        sources: loaded.map(item => ({ sourceId: item.document.id, role: 'textbook' })),
        concepts: drafted.concepts,
        sequence: drafted.concepts.map(concept => concept.id),
        basedOn: loaded.map(item => ({ sourceId: item.document.id, revisionId: item.document.currentRevisionId ?? '' })),
        changeSummary: `基于 ${loaded.length} 份资料生成 ${drafted.concepts.length} 个概念`,
      }
      await services.courses.saveRevision(revision)
      await services.courses.save({ ...course, draftRevisionId: revision.id })
      context.step('save', { status: 'done' })
      context.result({ revisionId: revision.id, conceptCount: revision.concepts.length, warnings: drafted.warnings })
      return { revisionId: revision.id }
    })
    return envelope({ task: handle })
  })

  route('courseDraft.get', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const course = await services.courses.get(courseId)
    if (course === undefined) throw notFoundError('课程')
    const draft = await services.courses.getDraftRevision(course)
    if (draft === undefined) return envelope({})
    const sources = await services.courses.listSources(courseId)
    return envelope({ draft: await buildDraftView(services, course, draft, sources) })
  })

  route('courseDraft.confirm', async ({ body }) => {
    const input = body as ApiRequests['courseDraft.confirm']['body']
    if (typeof input?.courseId !== 'string' || typeof input?.revisionId !== 'string') {
      throw appError('invalid-input', '缺少 courseId 或 revisionId')
    }
    const course = await services.courses.get(input.courseId)
    if (course === undefined) throw notFoundError('课程')
    const draft = await services.courses.getRevision(input.courseId, input.revisionId)
    if (draft === undefined) throw notFoundError('课程草案')
    const edits = input.edits
    let concepts = draft.concepts
    if (edits?.removeConceptIds !== undefined) {
      const remove = new Set(edits.removeConceptIds)
      concepts = concepts.filter(concept => !remove.has(concept.id))
    }
    if (edits?.conceptTitles !== undefined) {
      concepts = concepts.map(concept => edits.conceptTitles?.[concept.id] === undefined
        ? concept
        : { ...concept, title: edits.conceptTitles[concept.id] ?? concept.title })
    }
    let sequence = draft.sequence.filter(id => concepts.some(concept => concept.id === id))
    if (edits?.sequence !== undefined) {
      const requested = edits.sequence.filter(id => concepts.some(concept => concept.id === id))
      sequence = [...requested, ...concepts.map(concept => concept.id).filter(id => !requested.includes(id))]
    }
    const confirmed: CourseRevision = {
      ...draft,
      state: 'confirmed',
      confirmedAt: nowIso(),
      provenance: 'student-edit',
      concepts,
      sequence,
      goals: edits?.goals ?? draft.goals,
    }
    await services.courses.saveRevision(confirmed)
    if (course.activeRevisionId !== undefined && course.activeRevisionId !== confirmed.id) {
      const previous = await services.courses.getRevision(course.id, course.activeRevisionId)
      if (previous !== undefined) await services.courses.saveRevision({ ...previous, state: 'superseded' })
    }
    const updatedCourse: Course = {
      ...course,
      status: 'active',
      activeRevisionId: confirmed.id,
      draftRevisionId: undefined,
      updatedAt: nowIso(),
    }
    await services.courses.save(updatedCourse)
    return envelope({ course: updatedCourse, revision: confirmed })
  })

  /* ------------------------------------------------------------------ */
  /* Sessions                                                             */
  /* ------------------------------------------------------------------ */

  route('sessions.list', async ({ query }) => {
    const courseId = query.get('courseId') ?? undefined
    const sessions = await services.sessions.list(courseId)
    const summaries: SessionSummary[] = []
    for (const session of sessions) {
      const messages = await services.sessions.messages(session.id)
      summaries.push({
        id: session.id,
        courseId: session.courseId,
        title: session.title,
        updatedAt: session.updatedAt,
        status: session.status,
        stage: session.position.stage,
        messageCount: messages.length,
      })
    }
    return envelope({ sessions: summaries })
  })

  route('sessions.create', async ({ body }) => {
    const input = body as ApiRequests['sessions.create']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    const course = await services.courses.get(input.courseId)
    if (course === undefined) throw notFoundError('课程')
    const revision = await services.courses.getActiveRevision(course)
    if (revision === undefined) {
      return failure({
        code: 'needs-confirmation',
        message: '课程结构尚未确认。请先确认 AI 生成的课程草案，或选择随问随学。',
        details: { courseId: course.id, draftRevisionId: course.draftRevisionId },
      })
    }
    const { session } = createSessionRecord(course, revision)
    const titled = { ...session, ...(input.title === undefined ? {} : { title: input.title }) }
    await services.sessions.save(titled)
    return envelope({ session: titled })
  })

  route('sessions.get', async ({ query }) => {
    const sessionId = requireQuery(query, 'sessionId')
    const session = await services.sessions.get(sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const course = await services.courses.get(session.courseId)
    const revision = await services.courses.getRevision(session.courseId, session.courseRevisionId)
    if (course === undefined || revision === undefined) throw notFoundError('课程结构')
    const messages = await services.sessions.messages(session.id)
    const activities = await services.sessions.listActivities(session.id)
    const states: ActivityState[] = []
    for (const activity of activities) {
      const state = await services.sessions.getActivityState(activity.id)
      if (state !== undefined) states.push(state)
    }
    const record = await services.learning.get(session.courseId)
    const view: SessionView = {
      session,
      messages,
      activities,
      states,
      course,
      courseRevision: revision,
      mastery: record?.mastery ?? [],
      review: record?.review ?? [],
    }
    return envelope(view)
  })

  route('sessions.position', async ({ body }) => {
    const input = body as ApiRequests['sessions.position']['body']
    if (typeof input?.sessionId !== 'string') throw appError('invalid-input', '缺少 sessionId')
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const position = {
      stage: (input.stage ?? session.position.stage) as TeachingSession['position']['stage'],
      conceptId: input.conceptId ?? session.position.conceptId,
      activityId: input.activityId === null ? undefined : (input.activityId ?? session.position.activityId),
      note: input.note ?? session.position.note,
      updatedAt: nowIso(),
    }
    const next = await services.sessions.save({ ...session, position })
    return envelope({ session: next })
  })

  /* ------------------------------------------------------------------ */
  /* Chat (SSE)                                                           */
  /* ------------------------------------------------------------------ */

  const activeChats = new Map<string, AbortController>()

  route('chat.send', async ({ body }) => {
    const input = body as ApiRequests['chat.send']['body']
    if (typeof input?.sessionId !== 'string' || typeof input?.text !== 'string' || input.text.trim() === '') {
      throw appError('invalid-input', '缺少 sessionId 或消息内容')
    }
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const course = await services.courses.get(session.courseId)
    const revision = await services.courses.getRevision(session.courseId, session.courseRevisionId)
    if (course === undefined || revision === undefined) throw notFoundError('课程结构')
    const profile = await services.profiles.get()
    const history = await services.sessions.messages(session.id)
    const student = studentMessage(session.id, input.text.trim())
    await services.sessions.appendMessage(student)
    await services.sessions.save({ ...session, messageIds: [...session.messageIds, student.id], updatedAt: nowIso() })

    const controller = new AbortController()
    activeChats.set(session.id, controller)
    const currentConcept = session.position.conceptId === undefined
      ? undefined
      : revision.concepts.find(concept => concept.id === session.position.conceptId)

    const stream = new ReadableStream<Uint8Array>({
      start: async sink => {
        const encoder = new TextEncoder()
        const send = (event: ChatStreamEvent): void => {
          sink.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        try {
          send({ type: 'start', studentMessage: student })
          send({ type: 'progress', label: '检索课程资料' })
          const hits = await services.corpus.search(input.text, [course.id], 6)
          const material = hits.map(hit => ({ anchor: hit.anchor, documentTitle: hit.anchor.label.split(' · ')[0] ?? hit.anchor.label }))
          const evidenceRefs = hits.map(hitToEvidence)
          if (hits.length === 0) {
            evidenceRefs.push({ kind: 'model-knowledge', label: '模型补充', note: '本轮未在本地资料中检索到相关片段' })
          }
          send({ type: 'evidence', refs: evidenceRefs })
          send({ type: 'progress', label: '生成讲解' })
          const prompt = buildTeachingMessages({
            course,
            revision,
            profile,
            history,
            material,
            studentText: input.text.trim(),
            currentConceptTitle: currentConcept?.title,
          })
          let answer = ''
          let modelFailure: AppError | undefined
          let usage: ChatMessage['usage']
          for await (const event of services.model.stream({
            system: prompt.system,
            messages: prompt.messages,
            maxTokens: 3000,
            sessionId: session.id,
            purpose: 'chat',
            language: profile.language,
          }, controller.signal)) {
            if (event.type === 'text') {
              answer += event.text
              send({ type: 'delta', text: event.text })
            } else if (event.type === 'usage') {
              usage = event.usage
            } else if (event.type === 'error') {
              modelFailure = { code: event.error.code === 'cancelled' ? 'cancelled' : 'failed', message: event.error.message }
            }
          }
          const parsed = parseTeachingMeta(answer)
          for (const warning of parsed.warnings) {
            send({ type: 'progress', label: warning })
          }
          const activities: LessonActivity[] = []
          let limitations: string[] = []
          if (parsed.meta?.activity !== undefined && parsed.meta.activity !== null) {
            const proposal = activityProposalFromMeta(parsed.meta.activity, revision, hits)
            if (proposal === undefined) {
              services.logger('activity proposal invalid', { raw: JSON.stringify(parsed.meta.activity).slice(0, 1200) })
              limitations = [...limitations, '模型提出的活动结构不完整，已省略']
            } else {
              const activity = activityFromProposal({
                proposal,
                sessionId: session.id,
                courseId: course.id,
                sourceRefs: hits.slice(0, 3).map(hit => hit.anchor),
              })
              await services.sessions.saveActivity(activity)
              activities.push(activity)
              send({ type: 'activity', activity })
            }
          }
          // If the teaching turn proposed no usable activity, ask once for one
          // focused activity; if that also fails, fall back to a deterministic
          // reflection question so the T01 flow always has a practice step.
          if (activities.length === 0) {
            const fallback = await proposeFallbackActivity(services, {
              course,
              revision,
              material,
              answerText: parsed.replyText,
              signal: controller.signal,
            })
            if (fallback !== undefined) {
              const activity = activityFromProposal({
                proposal: fallback,
                sessionId: session.id,
                courseId: course.id,
                sourceRefs: hits.slice(0, 3).map(hit => hit.anchor),
              })
              await services.sessions.saveActivity(activity)
              activities.push(activity)
              send({ type: 'activity', activity })
            }
          }
          const uncertainty = [
            ...(parsed.meta?.uncertainty ?? []).filter((item): item is string => typeof item === 'string'),
            ...limitations,
          ]
          const teacher = teacherMessage({
            sessionId: session.id,
            text: parsed.replyText,
            evidenceRefs,
            activityIds: activities.map(activity => activity.id),
            usage,
            uncertainty,
          })
          await services.sessions.appendMessage(teacher)
          const latest = (await services.sessions.get(session.id)) ?? session
          const nextPosition = {
            stage: (parsed.meta?.stage ?? latest.position.stage) as TeachingSession['position']['stage'],
            conceptId: latest.position.conceptId,
            activityId: activities[0]?.id ?? latest.position.activityId,
            updatedAt: nowIso(),
          }
          await services.sessions.save({
            ...latest,
            messageIds: [...latest.messageIds, teacher.id],
            position: nextPosition,
            updatedAt: nowIso(),
          })
          send({ type: 'position', stage: nextPosition.stage, conceptId: nextPosition.conceptId })
          if (modelFailure !== undefined) {
            send({ type: 'error', error: modelFailure })
          } else {
            send({ type: 'done', message: teacher })
          }
        } catch (cause) {
          const error = toAppError(cause)
          services.logger('chat turn failed', { sessionId: session.id, code: error.code })
          try {
            send({ type: 'error', error })
          } catch {
            // The client may already be gone; the persisted student message remains.
          }
        } finally {
          activeChats.delete(session.id)
          sink.close()
        }
      },
      cancel: () => {
        controller.abort()
        activeChats.delete(session.id)
      },
    })
    return new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' },
    })
  })

  route('chat.cancel', async ({ body }) => {
    const input = body as ApiRequests['chat.cancel']['body']
    const controller = activeChats.get(input?.sessionId)
    if (controller === undefined) return envelope({ cancelled: false })
    controller.abort()
    activeChats.delete(input.sessionId)
    return envelope({ cancelled: true })
  })

  /* ------------------------------------------------------------------ */
  /* Activities                                                           */
  /* ------------------------------------------------------------------ */

  route('activity.get', async ({ query }) => {
    const activityId = requireQuery(query, 'activityId')
    const activity = await services.sessions.getActivity(activityId)
    if (activity === undefined) throw notFoundError('活动')
    return envelope({ activity, state: await services.sessions.getActivityState(activityId) })
  })

  route('activity.patch', async ({ body }) => {
    const input = body as ApiRequests['activity.patch']['body']
    if (typeof input?.activityId !== 'string') throw appError('invalid-input', '缺少 activityId')
    const activity = await services.sessions.getActivity(input.activityId)
    if (activity === undefined) throw notFoundError('活动')
    if (activity.revision !== input.expectedRevision) {
      return failure({
        code: 'conflict',
        message: '活动已被更新，请刷新后重试',
        details: { expected: input.expectedRevision, actual: activity.revision },
      })
    }
    const updated: LessonActivity = {
      ...activity,
      revision: activity.revision + 1,
      payload: input.payload,
      updatedAt: nowIso(),
      revisionHistory: [
        ...(activity.revisionHistory ?? []),
        { revision: activity.revision, createdAt: activity.updatedAt, payload: activity.payload, createdBy: 'student', note: input.note },
      ],
    }
    await services.sessions.saveActivity(updated)
    return envelope({ activity: updated })
  })

  route('activity.state', async ({ body }) => {
    const input = body as ApiRequests['activity.state']['body']
    if (typeof input?.activityId !== 'string') throw appError('invalid-input', '缺少 activityId')
    const state: ActivityState = {
      activityId: input.activityId as never,
      activityRevision: input.activityRevision,
      params: input.params,
      code: input.code,
      revealedStepIds: input.revealedStepIds,
      notes: input.notes,
      updatedAt: nowIso(),
    }
    return envelope({ state: await services.sessions.saveActivityState(state) })
  })

  route('activity.run', async ({ body }) => {
    const input = body as ApiRequests['activity.run']['body']
    if (typeof input?.activityId !== 'string') throw appError('invalid-input', '缺少 activityId')
    const activity = await services.sessions.getActivity(input.activityId)
    if (activity === undefined) throw notFoundError('活动')
    if (activity.payload.type !== 'code-run') {
      return failure({ code: 'invalid-input', message: '该活动不是代码实验' })
    }
    const state = await services.sessions.getActivityState(activity.id)
    const code = input.code ?? state?.code ?? activity.payload.code
    const run = await executeCodeRun(services, {
      sessionId: activity.sessionId,
      courseId: activity.courseId,
      activityId: activity.id,
      activityRevision: activity.revision,
      language: activity.payload.language,
      dialect: activity.payload.dialect,
      code,
      stdin: input.stdin ?? activity.payload.stdin,
      checks: activity.payload.tests,
    })
    return envelope({ run, validation: run.validation })
  })

  route('experiments.run', async ({ body }) => {
    const input = body as ApiRequests['experiments.run']['body']
    if (typeof input?.language !== 'string' || typeof input?.code !== 'string') {
      throw appError('invalid-input', '缺少语言或代码')
    }
    const run = await executeCodeRun(services, {
      sessionId: input.sessionId,
      courseId: input.courseId,
      activityId: input.activityId,
      activityRevision: input.activityRevision,
      language: input.language,
      dialect: input.dialect,
      code: input.code,
      stdin: input.stdin,
      checks: input.checks,
    })
    return envelope({ run })
  })

  route('experiments.cancel', async () => failure({ code: 'capability-missing', message: '运行取消将在 T05 实验适配器接入后提供' }))

  /* ------------------------------------------------------------------ */
  /* Attempts / mastery / review                                          */
  /* ------------------------------------------------------------------ */

  route('attempts.submit', async ({ body }) => {
    const input = body as ApiRequests['attempts.submit']['body']
    if (typeof input?.sessionId !== 'string') throw appError('invalid-input', '缺少 sessionId')
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const activity = input.activityId === undefined ? undefined : await services.sessions.getActivity(input.activityId)
    const independence = classifyIndependence(input)
    const validation = activity === undefined
      ? { kind: 'unverified' as const, confidence: 'unknown' as const, notes: ['自由对话回答未进行客观验证'] }
      : await validateAttempt(services, activity, input)
    const attempt: LearningAttempt = {
      id: `try-${randomUUID().slice(0, 12)}` as never,
      sessionId: session.id,
      courseId: session.courseId,
      courseRevisionId: session.courseRevisionId,
      conceptIds: activity?.conceptIds ?? (session.position.conceptId === undefined ? [] : [session.position.conceptId]),
      activityId: activity?.id,
      activityRevision: activity?.revision,
      prompt: input.prompt,
      answerText: input.answerText,
      selectedOptionIds: input.selectedOptionIds,
      helpExposure: input.helpLevel === 'full-answer'
        ? { level: 'full-answer', answer: '' }
        : { level: input.helpLevel, hints: input.hintsSeen ?? [] },
      independence,
      selfReport: input.selfReport,
      runId: input.runId as never,
      validation,
      createdAt: nowIso(),
    }
    const record = (await services.learning.get(session.courseId)) ?? emptyLearning(session.courseId, session.courseRevisionId)
    const updated = applyAttemptToRecord(record, attempt, activity)
    const saved = await services.learning.save(updated)
    const mastery = saved.mastery.filter(item => attempt.conceptIds.includes(item.conceptId))
    const review = saved.review.filter(item => attempt.conceptIds.includes(item.conceptId))
    const outcome: AttemptOutcome = {
      attempt,
      validation,
      mastery,
      review,
      ...(independence === 'answer-shown' || independence === 'skipped' || independence === 'assisted'
        ? { independenceNote: '本次尝试不作为独立掌握证据' }
        : {}),
    }
    return envelope(outcome)
  })

  route('attempts.list', async ({ query }) => {
    const sessionId = query.get('sessionId') ?? undefined
    const courseId = query.get('courseId') ?? undefined
    const records: LearningAttempt[] = []
    if (courseId !== undefined) {
      const record = await services.learning.get(courseId)
      records.push(...(record?.attempts ?? []))
    } else if (sessionId !== undefined) {
      const session = await services.sessions.get(sessionId)
      if (session === undefined) throw notFoundError('学习会话')
      const record = await services.learning.get(session.courseId)
      records.push(...(record?.attempts.filter(attempt => attempt.sessionId === sessionId) ?? []))
    }
    return envelope({ attempts: records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
  })

  route('mastery.list', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const record = await services.learning.get(courseId)
    return envelope({ mastery: record?.mastery ?? [] })
  })

  route('mastery.dispute', async ({ body }) => {
    const input = body as ApiRequests['mastery.dispute']['body']
    if (typeof input?.courseId !== 'string' || typeof input?.conceptId !== 'string' || typeof input?.reason !== 'string') {
      throw appError('invalid-input', '缺少课程、概念或异议理由')
    }
    const record = await services.learning.get(input.courseId)
    if (record === undefined) throw notFoundError('学情记录')
    const index = record.mastery.findIndex(item => item.conceptId === input.conceptId)
    if (index === -1) throw notFoundError('掌握记录')
    const current = record.mastery[index] as MasteryRecord
    const disputed: MasteryRecord = {
      ...current,
      disputes: [...current.disputes, {
        id: `dispute-${randomUUID().slice(0, 8)}`,
        reason: input.reason,
        createdAt: nowIso(),
        status: 'open',
      }],
      updatedAt: nowIso(),
    }
    const mastery = record.mastery.map((item, i) => i === index ? disputed : item)
    await services.learning.save({ ...record, mastery })
    return envelope({ mastery: disputed })
  })

  route('mastery.recheck', async ({ body }) => {
    const input = body as ApiRequests['mastery.recheck']['body']
    if (typeof input?.courseId !== 'string' || typeof input?.conceptId !== 'string') {
      throw appError('invalid-input', '缺少课程或概念')
    }
    const record = await services.learning.get(input.courseId)
    if (record === undefined) throw notFoundError('学情记录')
    const index = record.mastery.findIndex(item => item.conceptId === input.conceptId)
    if (index === -1) throw notFoundError('掌握记录')
    const current = record.mastery[index] as MasteryRecord
    const recheck: MasteryRecord = {
      ...current,
      disputes: current.disputes.map(dispute => dispute.status === 'open'
        ? { ...dispute, status: 'recheck-due' as const }
        : dispute),
      uncovered: Array.from(new Set([...current.uncovered, '重新检验：条件/反例与迁移表现'])),
      updatedAt: nowIso(),
    }
    const mastery = record.mastery.map((item, i) => i === index ? recheck : item)
    await services.learning.save({ ...record, mastery })
    return envelope({ mastery: recheck })
  })

  route('review.list', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const record = await services.learning.get(courseId)
    return envelope({ review: record?.review ?? [] })
  })

  /* ------------------------------------------------------------------ */
  /* Profile / tasks / environments                                       */
  /* ------------------------------------------------------------------ */

  route('profile.get', async () => envelope({ profile: await services.profiles.get() }))

  route('profile.set', async ({ body }) => {
    const input = body as ApiRequests['profile.set']['body']
    if (input?.patch === undefined || typeof input.patch !== 'object') throw appError('invalid-input', '缺少 profile patch')
    return envelope({ profile: await services.profiles.patch(input.patch) })
  })

  route('environments.list', async () => envelope(await listEnvironments(services)))

  route('environments.prepare', async () => failure({
    code: 'capability-missing',
    message: '环境自动配置在 T06 接入；当前 Python/JavaScript 可直接运行',
  }))

  route('tasks.get', async ({ query }) => {
    const taskId = requireQuery(query, 'taskId')
    const task = await services.tasks.get(taskId)
    if (task === undefined) throw notFoundError('任务')
    return envelope({ task })
  })

  route('tasks.cancel', async ({ body }) => {
    const input = body as ApiRequests['tasks.cancel']['body']
    if (typeof input?.taskId !== 'string') throw appError('invalid-input', '缺少 taskId')
    const result = await services.tasks.cancel(input.taskId).catch(cause => { throw toAppError(cause) })
    return envelope({ snapshot: result.snapshot })
  })

  route('tasks.list', async () => envelope({ tasks: await services.tasks.list() }))

  /* ------------------------------------------------------------------ */
  /* Portability / records (T07)                                          */
  /* ------------------------------------------------------------------ */

  for (const operation of [
    'portability.export', 'portability.backup', 'portability.inspect', 'portability.restore',
    'records.export', 'records.delete', 'records.reset',
  ] as const) {
    route(operation, async () => failure({
      code: 'capability-missing',
      message: '导出、备份与记录管理在 T07 接入',
    }))
  }
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

/** Request method per operation, derived from the frozen API contract. */
function requestSpec(operation: Operation): { method: 'GET' | 'POST' } {
  const getOperations = new Set<string>([
    'bootstrap', 'courses.list', 'courses.get', 'courseDraft.get', 'sources.get',
    'sessions.list', 'sessions.get', 'activity.get', 'attempts.list', 'mastery.list',
    'review.list', 'profile.get', 'environments.list', 'tasks.get', 'tasks.list',
    'capabilities.get',
  ])
  return { method: getOperations.has(operation) ? 'GET' : 'POST' }
}

/** Require one query parameter with a clear error. */
function requireQuery(query: URLSearchParams, name: string): string {
  const value = query.get(name)
  if (value === null || value === '') throw appError('invalid-input', `缺少参数 ${name}`)
  return value
}

/** Build a course draft view with coverage and warnings. */
async function buildDraftView(
  services: RouteServices,
  course: Course,
  revision: CourseRevision,
  sources: readonly SourceDocument[],
): Promise<CourseDraftView> {
  const coverage = []
  const warnings: string[] = []
  for (const source of sources) {
    const stored = await services.corpus.load(source.id).catch(() => undefined)
    coverage.push({
      sourceId: source.id,
      title: source.title,
      status: source.status,
      usedUnits: stored?.units.length ?? 0,
      issues: stored?.warnings.length ?? 0,
    })
    for (const warning of stored?.warnings ?? []) warnings.push(`${source.title}: ${warning}`)
  }
  return { course, revision, coverage, warnings }
}

/** Convert model-proposed activity JSON into a typed proposal. */
function activityProposalFromMeta(
  raw: unknown,
  revision: CourseRevision,
  hits: readonly { anchor: { excerpt: string } }[],
): ActivityProposal | undefined {
  const normalized = normalizeActivityProposal(raw)
  if (normalized === undefined) return undefined
  const meta = raw as { kind?: string; title?: string; goal?: string }
  const concept = revision.concepts[0]
  return {
    kind: meta.kind ?? normalized.payload.type,
    title: typeof meta.title === 'string' && meta.title !== '' ? meta.title : '课堂活动',
    goal: typeof meta.goal === 'string' && meta.goal !== '' ? meta.goal : (concept?.summary ?? '检验对当前概念的理解'),
    payload: normalized.payload,
    verification: normalized.verification,
    sourceRefs: hits.slice(0, 2).map(hit => hit.anchor as never),
    conceptIds: concept === undefined ? [] : [concept.id],
    independent: normalized.verification.kind === 'objective',
  }
}

/** Independence classification shared by the T01 attempt path. */
function classifyIndependence(input: {
  helpLevel: 0 | 1 | 2 | 3 | 'full-answer'
  answerRevealed: boolean
  answerText: string
}): 'independent' | 'assisted' | 'skipped' | 'answer-shown' {
  if (input.answerText.trim() === '') return 'skipped'
  if (input.helpLevel === 'full-answer' || input.answerRevealed) return 'answer-shown'
  if (input.helpLevel >= 2) return 'assisted'
  return 'independent'
}

/** Execute code for an activity and apply objective checks. */
async function executeCodeRun(
  services: RouteServices,
  input: {
    sessionId?: string
    courseId?: string
    activityId?: string
    activityRevision?: number
    language: string
    dialect?: string
    code: string
    stdin?: string
    checks?: readonly { name: string; type: string; value: string | number }[]
  },
): Promise<ExperimentRun & { validation?: AttemptValidation }> {
  const runId = `run-${randomUUID().slice(0, 12)}`
  const startedAt = nowIso()
  const result = await runCode({ language: input.language, code: input.code, stdin: input.stdin })
  const checks = (input.checks ?? []).map(check => {
    let status: 'pass' | 'fail' | 'not-run' = 'not-run'
    if (check.type === 'stdout-contains') status = result.stdout.includes(String(check.value)) ? 'pass' : 'fail'
    else if (check.type === 'stdout-equals') status = result.stdout.trim() === String(check.value).trim() ? 'pass' : 'fail'
    else if (check.type === 'exit-code') status = result.exitCode === Number(check.value) ? 'pass' : 'fail'
    return { ...check, status }
  })
  const run: ExperimentRun = {
    id: runId as never,
    sessionId: input.sessionId as never,
    courseId: input.courseId as never,
    activityId: input.activityId as never,
    activityRevision: input.activityRevision,
    environmentId: `env-${input.language}` as never,
    language: input.language,
    dialect: input.dialect,
    code: input.code,
    stdin: input.stdin,
    startedAt,
    endedAt: nowIso(),
    status: result.timedOut ? 'timed-out' : (result.exitCode === 0 ? 'succeeded' : 'failed'),
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    checks,
    verification: checks.length === 0 ? 'exploratory' : (checks.every(check => check.status === 'pass') ? 'objective' : 'objective'),
    limits: { timeoutMs: 10_000 },
  }
  await services.state.writeJson(runFile(services.state.dataDir, run.id), run)
  const validation: AttemptValidation | undefined = checks.length === 0 ? undefined : {
    kind: 'objective',
    passed: checks.every(check => check.status === 'pass'),
    checks: checks.map(check => ({ name: check.name, status: check.status === 'pass' ? 'pass' : 'fail' })),
    evidence: [result.stdout.slice(0, 400)],
    assessedBy: 'objective-runner',
    confidence: 'high',
  }
  return { ...run, validation }
}

/** Validate an attempt against its activity. */
async function validateAttempt(
  services: RouteServices,
  activity: LessonActivity,
  input: ApiRequests['attempts.submit']['body'],
): Promise<AttemptValidation> {
  if (activity.payload.type === 'quiz') {
    const selected = (input.selectedOptionIds ?? []).slice().sort()
    const correct = activity.payload.correctOptionIds.slice().sort()
    const passed = selected.length === correct.length && selected.every((id, index) => id === correct[index])
    return {
      kind: 'quiz',
      passed,
      checks: activity.payload.options.map(option => ({
        name: option.label,
        status: selected.includes(option.id) === correct.includes(option.id) ? 'pass' : 'fail',
      })),
      notes: passed ? [activity.payload.explanation ?? '回答正确'] : ['回答与正确选项不一致'],
      assessedBy: 'objective-runner',
      confidence: 'high',
    }
  }
  if (activity.payload.type === 'code-run' && input.runId !== undefined) {
    const run = await services.state.readJson<ExperimentRun>(runFile(services.state.dataDir, input.runId))
    if (run !== undefined) {
      const passed = run.checks !== undefined && run.checks.length > 0
        ? run.checks.every(check => check.status === 'pass')
        : run.status === 'succeeded'
      return {
        kind: 'objective',
        passed,
        checks: (run.checks ?? []).map(check => ({ name: check.name, status: check.status })),
        evidence: [run.stdout.slice(0, 400)],
        assessedBy: 'objective-runner',
        confidence: 'high',
      }
    }
  }
  return {
    kind: 'unverified',
    confidence: 'unknown',
    notes: ['该回答尚未客观验证；模型/rubric 评价由 T04 接入'],
    assessedBy: 'none',
  }
}

/** Apply one attempt to the course learning record (T01 minimal mastery rules). */
function applyAttemptToRecord(
  record: CourseLearningRecord,
  attempt: LearningAttempt,
  _activity: LessonActivity | undefined,
): CourseLearningRecord {
  const attempts = [...record.attempts, attempt]
  const mastery = [...record.mastery]
  const review = [...record.review]
  const passed = attempt.validation?.passed === true
  for (const conceptId of attempt.conceptIds) {
    const index = mastery.findIndex(item => item.conceptId === conceptId)
    const current = index === -1 ? undefined : mastery[index]
    const independent = attempt.independence === 'independent'
    const dimensions = {
      explain: current?.dimensions.explain ?? 0,
      conditions: current?.dimensions.conditions ?? 0,
      variants: (current?.dimensions.variants ?? 0) + (independent && passed ? 1 : 0),
      transfer: current?.dimensions.transfer ?? 0,
    }
    const level: MasteryRecord['level'] = attempt.independence === 'skipped'
      ? (current?.level ?? 'exposed')
      : independent && passed
        ? (dimensions.variants >= 2 ? 'checked' : 'practiced')
        : (current?.level === 'unseen' || current === undefined ? 'exposed' : current.level)
    const basis = [...(current?.basis ?? [])]
    if (independent && passed) basis.push(`独立完成活动取得正确结果（${attempt.id}）`)
    else if (attempt.independence === 'assisted') basis.push(`在提示下完成，不计独立证据（${attempt.id}）`)
    else if (attempt.independence === 'answer-shown') basis.push(`已查看完整答案，不计独立证据（${attempt.id}）`)
    const next: MasteryRecord = {
      id: current?.id ?? (`mst-${randomUUID().slice(0, 10)}` as never),
      courseId: attempt.courseId,
      courseRevisionId: attempt.courseRevisionId,
      conceptId,
      level,
      dimensions,
      evidenceAttemptIds: [...(current?.evidenceAttemptIds ?? []), attempt.id],
      basis,
      uncovered: current?.uncovered ?? ['概念解释', '条件/反例辨析', '迁移表现'],
      disputes: current?.disputes ?? [],
      updatedAt: nowIso(),
    }
    if (index === -1) mastery.push(next)
    else mastery[index] = next
    if (level !== 'mastered' && level !== 'checked') {
      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      if (!review.some(item => item.conceptId === conceptId)) {
        review.push({
          conceptId,
          courseId: attempt.courseId,
          dueAt,
          intervalDays: 1,
          reason: 'low-mastery',
        })
      }
    }
  }
  return { ...record, attempts, mastery, review, updatedAt: nowIso() }
}

/** Empty learning record for a course. */
function emptyLearning(courseId: string, courseRevisionId: string): CourseLearningRecord {
  return {
    courseId: courseId as never,
    courseRevisionId: courseRevisionId as never,
    attempts: [],
    mastery: [],
    review: [],
    notes: [],
    updatedAt: nowIso(),
  }
}

/** Environment directory for T01: interpreters probed on demand. */
async function listEnvironments(services: RouteServices): Promise<EnvironmentDirectory> {
  const environments: EnvironmentRecord[] = []
  const probe = async (language: string, command: string, args: string[]): Promise<{ ok: boolean; version?: string }> => {
    try {
      const result = await new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
        const child = spawnSafe(command, args)
        let stdout = ''
        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
        child.on('error', reject)
        child.on('close', (code: number | null) => resolve({ code, stdout }))
      })
      if (result.code !== 0) return { ok: false }
      return { ok: true, version: result.stdout.split('\n')[0]?.trim() }
    } catch {
      return { ok: false }
    }
  }
  const python = await probe('python', process.env.DSH_TEACHING_PYTHON ?? 'python3', ['--version'])
  const node = await probe('javascript', process.execPath, ['--version'])
  const environmentsReady: EnvironmentRecord[] = [
    {
      id: 'env-python' as never,
      language: 'python',
      kind: 'system',
      status: python.ok ? 'ready' : 'missing',
      version: python.version,
      isolation: { dependencies: 'none', note: 'T01 使用系统 Python；课程级隔离环境在 T06 提供' },
      execution: { mode: 'process', executable: process.env.DSH_TEACHING_PYTHON ?? 'python3', timeoutMs: 10_000, cancellable: true, network: 'unknown', confinement: '宿主进程，无额外内存限制' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...(python.ok ? {} : { failure: { message: '未找到 python3', code: 'capability-missing', cleanup: 'not-needed' as const } }),
    },
    {
      id: 'env-javascript' as never,
      language: 'javascript',
      kind: 'system',
      status: node.ok ? 'ready' : 'missing',
      version: node.version,
      isolation: { dependencies: 'none', note: '使用宿主 Electron Node 模式子进程' },
      execution: { mode: 'process', executable: process.execPath, timeoutMs: 10_000, cancellable: true, network: 'unknown', confinement: '宿主进程，无额外内存限制' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'env-scheme' as never,
      language: 'scheme',
      dialect: 'sicp',
      kind: 'managed',
      status: 'missing',
      isolation: { dependencies: 'none', note: 'T05 接入 biwascheme 解释器' },
      execution: { mode: 'in-process', timeoutMs: 10_000, cancellable: false, network: 'unknown' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]
  for (const environment of environmentsReady) {
    environments.push(environment)
    await services.state.writeJson(environmentFile(services.state.dataDir, environment.id), environment)
  }
  return {
    environments,
    supportedLanguages: [
      { language: 'python', label: 'Python', status: python.ok ? 'ready' : 'missing', environmentId: 'env-python' as never, note: python.version },
      { language: 'javascript', label: 'JavaScript', status: node.ok ? 'ready' : 'missing', environmentId: 'env-javascript' as never, note: node.version },
      { language: 'scheme', label: 'Scheme (SICP)', status: 'missing', environmentId: 'env-scheme' as never, note: 'T05 接入' },
    ],
    gaps: ['Scheme 解释器与 SICP 教学库在 T05 接入', '课程级依赖隔离环境在 T06 接入'],
  }
}

/** Spawn without shell, used only for version probes. */
function spawnSafe(command: string, args: string[]): ReturnType<typeof import('node:child_process').spawn> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { spawn } = process.getBuiltinModule('node:child_process') as typeof import('node:child_process')
  return spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Ask the model for one activity when the teaching turn proposed none. */
async function proposeFallbackActivity(
  services: RouteServices,
  input: {
    course: Course
    revision: CourseRevision
    material: readonly { anchor: SourceAnchor; documentTitle: string }[]
    answerText: string
    signal: AbortSignal
  },
): Promise<ActivityProposal | undefined> {
  const concept = input.revision.concepts[0]
  const materialText = input.material.slice(0, 4).map((item, index) => `[资料${index + 1}] ${item.anchor.excerpt.slice(0, 240)}`).join('\n')
  try {
    const completion = await services.model.complete({
      system: '你是教学活动设计师。只输出 JSON，不要解释。',
      messages: [{
        role: 'user',
        text: [
          `课程：${input.course.title}`,
          `当前概念：${concept?.title ?? '未命名'}`,
          `讲解摘要：${input.answerText.slice(0, 500)}`,
          `可用资料：\n${materialText}`,
          '请设计一个能检验理解的小活动，JSON 字段：',
          '{"kind":"quiz|graph|code-run|derivation","title":"...","goal":"...","payload":{...},"verification":{"kind":"objective|open|none"}}',
          'quiz payload: {"type":"quiz","question":"...","options":[{"id":"A","label":"..."}],"correctOptionIds":["A"],"explanation":"..."}',
          'graph payload: {"type":"graph","title":"...","xRange":[-5,5],"yRange":[-5,5],"series":[{"id":"s1","label":"...","expr":"x^2"}]}',
          'code-run payload: {"type":"code-run","language":"python","code":"print(1)","editable":true}',
          'derivation payload: {"type":"derivation","steps":[{"id":"s1","latex":"x^2","note":"..."}]}',
        ].join('\n'),
      }],
      json: { name: 'activity', description: '一个教学活动', fields: { kind: '活动类型', title: '标题', goal: '目标', payload: '活动内容', verification: '验证方式' } },
      maxTokens: 900,
      purpose: 'other',
      sessionId: 'session-teaching-plugin',
    }, input.signal)
    const normalized = completion.json === undefined ? undefined : normalizeActivityProposal(completion.json)
    if (normalized === undefined) return fallbackReflectionActivity(input)
    const meta = completion.json as { kind?: string; title?: string; goal?: string }
    return {
      kind: meta.kind ?? normalized.payload.type,
      title: meta.title ?? '检验理解',
      goal: meta.goal ?? (concept?.summary ?? '检验当前概念的理解'),
      payload: normalized.payload,
      verification: normalized.verification,
      sourceRefs: input.material.slice(0, 2).map(item => item.anchor),
      conceptIds: concept === undefined ? [] : [concept.id],
      independent: normalized.verification.kind === 'objective',
    }
  } catch (cause) {
    services.logger('fallback activity failed', { message: cause instanceof Error ? cause.message : String(cause) })
    return fallbackReflectionActivity(input)
  }
}

/**
 * Deterministic fallback activity: a short reflection question keeps the
 * teaching loop observable even when the model cannot produce structured output.
 */
function fallbackReflectionActivity(input: {
  course: Course
  revision: CourseRevision
  material: readonly { anchor: SourceAnchor; documentTitle: string }[]
}): ActivityProposal | undefined {
  const concept = input.revision.concepts[0]
  const conceptTitle = concept?.title ?? input.course.title
  return {
    kind: 'open-question',
    title: `用自己的话解释：${conceptTitle}`,
    goal: '检验能否脱离原文复述并举例',
    payload: {
      type: 'open-question',
      prompt: `请用自己的话解释「${conceptTitle}」，并给出一个它适用或不适用的具体例子，说明你的判断依据。`,
      rubric: [
        { id: 'explain', label: '概念表述', description: '用自己的话准确表述核心含义', weight: 1 },
        { id: 'example', label: '例子与条件', description: '给出例子并说明适用条件', weight: 1 },
        { id: 'limits', label: '边界认识', description: '指出何时不适用或常见误区', weight: 1 },
      ],
    },
    verification: { kind: 'open', note: '开放题按 rubric 评价并保留不确定性' },
    sourceRefs: input.material.slice(0, 2).map(item => item.anchor),
    conceptIds: concept === undefined ? [] : [concept.id],
    independent: true,
  }
}

/** Convert unknown into AppError. */
function toAppError(cause: unknown): AppError {
  if (typeof cause === 'object' && cause !== null && typeof (cause as AppError).code === 'string') return cause as AppError
  return { code: 'failed', message: '操作失败', details: { message: cause instanceof Error ? cause.message : String(cause) } }
}

/** Standard not-found error. */
function notFoundError(what: string): AppError & Error {
  const error = appError('not-found', `${what}不存在或已被删除`)
  return error
}
