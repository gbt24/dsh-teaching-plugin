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
  ActivityState, ApiRequests, AppError, AttemptOutcome, AttemptValidation, BootstrapInfo,
  ChatMessage, ChatStreamEvent, Course, CourseDraftView, CourseRevision, CourseSummary,
  CourseLearningRecord, EnvironmentDirectory, ExperimentRun, LearningAttempt, LearningService, LessonActivity,
  MasteryRecord, ModelCapabilities, ReviewItem, SessionSummary, SessionView,
  SourceAnchor, SourceDocument, SourceView, TeachingService, TeachingSession, TeachingTurnInput,
  UsageEntry,
} from '@deepseek-teaching/core'
import {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
  activityStateFile, apiPath, courseId as newCourseId, courseRevisionId as newCourseRevisionId,
  nowIso, runFile,
} from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'
import type { ModelClient } from '@deepseek-teaching/core'
import { validationFromRun } from '@deepseek-teaching/core/experiments'
import type { RunnerRegistry } from '@deepseek-teaching/core/experiments'
import type { PortabilityService } from '@deepseek-teaching/core'
import { detectRequestedForm } from '@deepseek-teaching/core/teaching'
import type { TaskManager } from './tasks.ts'
import type { WebBridge } from './web.ts'
import { toSearchQuery, wantsWebLookup } from './web.ts'
import type { CorpusServiceApi } from '@deepseek-teaching/core/corpus'
import {
  activityFromProposal, appError, createCourseRecord, createSessionRecord,
  hitToEvidence, studentMessage, teacherMessage,
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
  readonly web: WebBridge
  readonly tasks: TaskManager
  readonly corpus: CorpusServiceApi
  readonly teaching: TeachingService
  readonly experiments: RunnerRegistry
  readonly portability: PortabilityService
  /** Build a learning service bound to the activity an attempt answers. */
  readonly createLearningFor: (activity?: LessonActivity) => LearningService
  /** Usage of the most recent model call in one session, then cleared. */
  readonly takeUsage: (sessionId: string) => UsageEntry | undefined
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
        webSearch: services.web.available(),
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
      environments: await services.experiments.directory(),
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
      draft = await buildDraftView(services, course, draftRevision)
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
      steps: paths.slice(0, 20).map((path, index) => ({ id: `file-${index}`, label: basename(path) })),
      resumable: true,
    }, async context => {
      const progress = (done: number, total: number, current: string): void => {
        context.progress(total === 0 ? undefined : done / total)
        const index = paths.indexOf(current)
        if (index >= 0 && index < 20) {
          context.step(`file-${index}`, done > index ? { status: 'done' } : { status: 'running' })
        }
      }
      const outcome = await services.corpus.importFiles(
        courseId as never,
        paths.map(path => ({ path, ...(courseId === undefined ? {} : { courseId: courseId as never }) })),
        { onProgress: progress, signal: context.signal },
      )
      for (const warning of outcome.warnings) context.warn(warning)
      for (const failure of outcome.failures) context.warn(`${failure.path}: ${failure.error.message}`)
      // Mark any step the corpus service skipped (cancelled or failed fast).
      for (let index = 0; index < Math.min(20, paths.length); index += 1) {
        if (context.cancelled()) context.step(`file-${index}`, { status: 'skipped' })
      }
      context.result({
        imported: outcome.documents.map(document => document.id),
        failures: outcome.failures.map(failure => ({ path: failure.path, error: failure.error })),
      })
      if (outcome.failures.length > 0 && outcome.documents.length === 0) {
        throw appError('failed', '所有资料导入失败', {
          failures: outcome.failures.map(failure => ({ path: failure.path, code: failure.error.code })),
        })
      }
      return { imported: outcome.documents.map(document => document.id) }
    })
    return envelope({ task: handle })
  })

  route('sources.refresh', async ({ body }) => {
    const input = body as ApiRequests['sources.refresh']['body']
    const documentId = input?.documentId
    if (typeof documentId !== 'string') throw appError('invalid-input', '缺少 documentId')
    const handle = services.tasks.start({
      kind: 'source-refresh',
      label: '检查并更新资料',
      steps: [
        { id: 'compare', label: '对比文件指纹' },
        { id: 'reimport', label: '重新解析受影响内容' },
        { id: 'report', label: '报告受影响引用' },
      ],
    }, async context => {
      context.step('compare', { status: 'running' })
      const change = await services.corpus.refreshDocument(documentId as never, context.signal)
      if (!change.ok) throw appError(change.error.code, change.error.message, change.error.details)
      context.step('compare', { status: 'done', detail: change.value.changed ? '检测到变化' : '内容未变化' })
      context.step('reimport', { status: change.value.changed ? 'done' : 'skipped' })
      context.step('report', { status: 'done' })
      const effects = change.value.effects
      if (effects.needsConfirmation) context.warn(effects.summary)
      context.result({
        changed: change.value.changed,
        effects: {
          affectedConceptIds: effects.affectedConceptIds,
          affectedActivityIds: effects.affectedActivityIds,
          needsConfirmation: effects.needsConfirmation,
          summary: effects.summary,
        },
      })
      return { changed: change.value.changed }
    })
    return envelope({ task: handle })
  })

  route('sources.get', async ({ query }) => {
    const documentId = requireQuery(query, 'documentId')
    const offset = Math.max(0, Number(query.get('offset') ?? '0') || 0)
    const limit = Math.min(200, Math.max(1, Number(query.get('limit') ?? '50') || 50))
    const documentResult = await services.corpus.getDocument(documentId as never)
    if (!documentResult.ok) return failure(documentResult.error)
    const document = documentResult.value
    const revisionId = query.get('revisionId') ?? document.currentRevisionId
    let units: import('@deepseek-teaching/core').SourceUnit[] = []
    let totalUnits = 0
    let issues: readonly import('@deepseek-teaching/core').SourceIssue[] = []
    let revision: SourceView['revision']
    if (revisionId !== undefined) {
      const [unitsResult, issuesResult] = await Promise.all([
        services.corpus.readUnits(document.id, offset, limit, revisionId as never),
        services.corpus.listIssues(document.id),
      ])
      if (unitsResult.ok) {
        units = [...unitsResult.value.units]
        totalUnits = unitsResult.value.total
      }
      if (issuesResult.ok) issues = issuesResult.value
      const meta = document.revisions.find(entry => entry.id === revisionId)
      revision = {
        id: revisionId as never,
        documentId: document.id,
        fingerprint: meta?.fingerprint ?? '',
        createdAt: meta?.createdAt ?? document.updatedAt,
        extractor: { name: 'corpus', version: '0.2.0' },
        unitCount: totalUnits,
        issueCount: issues.length,
        status: meta?.status ?? 'ready',
        units,
        issues,
      }
    }
    const view: SourceView = { document, revision, issues, totalUnits }
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
    const profile = await services.profiles.get()
    const active = await services.courses.getActiveRevision(course)
    const handle = services.tasks.start({
      kind: 'course-draft',
      label: '分析资料并生成课程草案',
      steps: [
        { id: 'read', label: '读取已就绪资料' },
        { id: 'structure', label: '提取概念与先修顺序' },
        { id: 'save', label: '保存课程草案' },
      ],
    }, async context => {
      context.step('read', { status: 'running' })
      const documents = await services.courses.listSources(course.id)
      context.step('read', { status: 'done', detail: `${documents.length} 份资料` })
      context.step('structure', { status: 'running' })
      const proposed = await services.corpus.proposeCourseStructure({
        courseId: course.id,
        courseTitle: course.title,
        goal: active?.goals.join('；') ?? course.description,
        ...(active?.background === undefined ? {} : { background: active.background }),
        language: profile.language,
        ...(input.instruction === undefined ? {} : { instruction: input.instruction }),
      }, context.signal)
      if (!proposed.ok) {
        throw appError(proposed.error.code, proposed.error.message, proposed.error.details)
      }
      context.step('structure', { status: 'done', detail: `${proposed.value.concepts.length} 个概念` })
      context.step('save', { status: 'done' })
      context.result({ revisionId: proposed.value.id, conceptCount: proposed.value.concepts.length })
      return { revisionId: proposed.value.id }
    })
    return envelope({ task: handle })
  })

  route('courseDraft.get', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const course = await services.courses.get(courseId)
    if (course === undefined) throw notFoundError('课程')
    const draft = await services.courses.getDraftRevision(course)
    if (draft === undefined) return envelope({})
    return envelope({ draft: await buildDraftView(services, course, draft) })
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
    await services.sessions.save({
      ...session,
      messageIds: [...session.messageIds, student.id],
      updatedAt: nowIso(),
    })

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
        const createdActivities: LessonActivity[] = []
        try {
          send({ type: 'start', studentMessage: student })
          send({ type: 'progress', label: '检索课程资料' })
          const searchedCorpus = await services.corpus.search({ query: input.text, courseId: course.id, limit: 6 })
          const hits = searchedCorpus.ok ? searchedCorpus.value.hits : []
          const material = hits.map(hit => ({
            anchor: hit.anchor,
            documentTitle: hit.anchor.label.split(' · ')[0] ?? hit.anchor.label,
          }))
          const evidenceFromMaterial = hits.map(hit => hitToEvidence(hit))
          let webResults: { title: string; url: string; snippet: string }[] = []
          const webEvidence: import('@deepseek-teaching/core').EvidenceReference[] = []
          let webNote: string | undefined
          if (wantsWebLookup(input.text)) {
            if (!services.web.available()) {
              webNote = '本轮请求涉及联网查证，但当前 Harness 配置没有可用的联网能力；回答仅基于本地资料与模型知识。'
            } else {
              send({ type: 'progress', label: '联网查证（按需）' })
              const searched = await services.web.search(toSearchQuery(input.text), { maxResults: 4, signal: controller.signal })
              if (searched.ok) {
                webResults = [...searched.value]
                for (const hit of searched.value) {
                  webEvidence.push({ kind: 'external-web', label: hit.title, url: hit.url, note: hit.snippet.slice(0, 240) })
                }
                if (searched.value.length === 0) webNote = '联网查询没有返回可用来源，回答未引用外部资料。'
              } else {
                webNote = `联网查证未完成（${searched.error.code}）：${searched.error.message}`
              }
            }
          }
          const record = await services.learning.get(course.id)
          const learningSummary = (record?.mastery ?? []).map(item => ({
            conceptId: item.conceptId,
            level: item.level,
            basis: item.basis,
          }))
          const teachingInput: TeachingTurnInput = {
            sessionId: session.id,
            studentText: input.text.trim(),
            stage: session.position.stage,
            profile,
            language: profile.language,
            course,
            courseRevision: revision,
            currentConceptId: session.position.conceptId,
            history,
            material,
            crossCourse: [],
            learning: learningSummary,
            materialWarnings: [],
            requestedForm: detectRequestedForm(input.text)?.form,
            wantsFullAnswer: /完整答案|直接给(我)?答案|别提示|tell me the answer|just give me/i.test(input.text),
            webResults,
          }

          let finalText = ''
          let finalMeta: import('@deepseek-teaching/core').TeachingTurnMeta | undefined
          let evidenceRefs: import('@deepseek-teaching/core').EvidenceReference[] = [...evidenceFromMaterial, ...webEvidence]
          let uncertainty: string[] = []
          let limitations: string[] = []
          for await (const event of services.teaching.respond(teachingInput, services.model, controller.signal)) {
            if (event.type === 'phase') {
              send({ type: 'progress', label: event.label })
              continue
            }
            if (event.type === 'delta') {
              send({ type: 'delta', text: event.text })
              continue
            }
            if (event.type === 'evidence') {
              evidenceRefs = [...event.refs]
              send({ type: 'evidence', refs: evidenceRefs })
              continue
            }
            if (event.type === 'position') {
              await services.sessions.save({
                ...session,
                position: {
                  stage: event.stage,
                  ...(event.conceptId === undefined ? {} : { conceptId: event.conceptId }),
                  ...(session.position.activityId === undefined ? {} : { activityId: session.position.activityId }),
                  updatedAt: nowIso(),
                },
                updatedAt: nowIso(),
              })
              send({ type: 'position', stage: event.stage, conceptId: event.conceptId })
              continue
            }
            if (event.type === 'activity') {
              const activity = activityFromProposal({
                proposal: event.proposal,
                sessionId: session.id,
                courseId: course.id,
                sourceRefs: event.proposal.sourceRefs.length > 0
                  ? event.proposal.sourceRefs
                  : hits.slice(0, 3).map(hit => hit.anchor),
              })
              await services.sessions.saveActivity(activity)
              createdActivities.push(activity)
              send({ type: 'activity', activity })
              continue
            }
            if (event.type === 'done') {
              finalText = event.text
              finalMeta = event.meta
              evidenceRefs = [...event.evidenceRefs]
              uncertainty = [...event.uncertainty]
              limitations = [...event.limitations]
              continue
            }
            if (event.type === 'error') {
              throw appError(event.error.code, event.error.message, event.error.details)
            }
          }
          const usage = services.takeUsage(session.id)
          const teacher = teacherMessage({
            sessionId: session.id,
            text: finalText,
            evidenceRefs: webNote === undefined
              ? evidenceRefs
              : [...evidenceRefs, { kind: 'model-knowledge', label: '能力说明', note: webNote }],
            activityIds: createdActivities.map(activity => activity.id),
            usage: usage === undefined
              ? undefined
              : {
                  provider: usage.provider,
                  model: usage.model,
                  durationMs: usage.durationMs,
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                  totalTokens: usage.totalTokens,
                  costUsd: usage.costUsd,
                  usageUnknown: usage.usageUnknown,
                },
            uncertainty: [...uncertainty, ...limitations, ...(webNote === undefined ? [] : [webNote])],
          })
          await services.sessions.appendMessage(teacher)
          const latest = (await services.sessions.get(session.id)) ?? session
          const nextPosition = {
            stage: (finalMeta?.stage ?? latest.position.stage) as TeachingSession['position']['stage'],
            conceptId: finalMeta?.conceptIds?.[0] ?? latest.position.conceptId,
            activityId: createdActivities.at(-1)?.id ?? latest.position.activityId,
            updatedAt: nowIso(),
          }
          await services.sessions.save({
            ...latest,
            messageIds: [...latest.messageIds, teacher.id],
            position: nextPosition,
            coveredConceptIds: Array.from(new Set([
              ...latest.coveredConceptIds,
              ...(finalMeta?.conceptIds ?? []),
            ])),
            updatedAt: nowIso(),
          })
          send({ type: 'position', stage: nextPosition.stage, conceptId: nextPosition.conceptId })
          send({ type: 'done', message: teacher })
        } catch (cause) {
          const error = toAppError(cause)
          services.logger('chat turn failed', { sessionId: session.id, code: error.code, message: error.message })
          // Persist a visible failure note so a reload does not hide what happened.
          try {
            const note = teacherMessage({
              sessionId: session.id,
              text: `本轮教学未能完成：${error.message}`,
              evidenceRefs: [],
              activityIds: [],
            })
            await services.sessions.appendMessage({ ...note, kind: 'system-note', error: { code: error.code, message: error.message } })
            const latest = await services.sessions.get(session.id)
            if (latest !== undefined) {
              await services.sessions.save({ ...latest, messageIds: [...latest.messageIds, note.id], updatedAt: nowIso() })
            }
          } catch {
            // A failed note must not replace the original error.
          }
          try {
            send({ type: 'error', error })
          } catch {
            // Client already gone; the persisted state above remains.
          }
        } finally {
          activeChats.delete(session.id)
          try { sink.close() } catch { /* already closed */ }
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
    const run = await runExperiment(services, {
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
    return envelope({ run, validation: run.status === 'succeeded' || run.verification === 'objective'
      ? validationFromRun(run)
      : undefined })
  })

  route('experiments.run', async ({ body }) => {
    const input = body as ApiRequests['experiments.run']['body']
    if (typeof input?.language !== 'string' || typeof input?.code !== 'string') {
      throw appError('invalid-input', '缺少语言或代码')
    }
    const run = await runExperiment(services, {
      sessionId: input.sessionId,
      courseId: input.courseId,
      activityId: input.activityId,
      activityRevision: input.activityRevision,
      language: input.language,
      dialect: input.dialect,
      code: input.code,
      stdin: input.stdin,
      checks: input.checks,
      timeoutMs: input.timeoutMs,
    })
    return envelope({ run })
  })

  route('experiments.cancel', async ({ body }) => {
    const input = body as ApiRequests['experiments.cancel']['body']
    if (typeof input?.runId !== 'string') throw appError('invalid-input', '缺少 runId')
    const run = await services.experiments.cancel(input.runId)
    if (run === undefined) {
      return failure({ code: 'not-found', message: '运行不存在或已结束' })
    }
    await services.state.writeJson(runFile(services.state.dataDir, run.id), run)
    return envelope({ run })
  })

  /* ------------------------------------------------------------------ */
  /* Attempts / mastery / review                                          */
  /* ------------------------------------------------------------------ */

  route('attempts.submit', async ({ body }) => {
    const input = body as ApiRequests['attempts.submit']['body']
    if (typeof input?.sessionId !== 'string') throw appError('invalid-input', '缺少 sessionId')
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const activity = input.activityId === undefined ? undefined : await services.sessions.getActivity(input.activityId)
    const validation = activity === undefined ? undefined : await validateAttempt(services, activity, input)
    const conceptIds = activity?.conceptIds ?? (session.position.conceptId === undefined ? [] : [session.position.conceptId])
    const learning = services.createLearningFor(activity)
    const outcome = await learning.submitAttempt({
      sessionId: session.id,
      courseId: session.courseId,
      courseRevisionId: session.courseRevisionId,
      conceptIds,
      ...(activity === undefined ? {} : { activityId: activity.id, activityRevision: activity.revision }),
      prompt: input.prompt,
      answerText: input.answerText,
      helpLevel: input.helpLevel,
      hintsSeen: input.hintsSeen ?? [],
      answerRevealed: input.answerRevealed,
      ...(input.selectedOptionIds === undefined ? {} : { selectedOptionIds: input.selectedOptionIds }),
      ...(input.selfReport === undefined ? {} : { selfReport: input.selfReport }),
      ...(validation === undefined ? {} : { validation }),
      ...(input.runId === undefined ? {} : { runId: input.runId as never }),
    })
    if (!outcome.ok) return failure(outcome.error)
    return envelope(outcome.value)
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
    const learning = services.createLearningFor(undefined)
    const result = await learning.dispute(input.courseId, input.conceptId, input.reason)
    if (!result.ok) return failure(result.error)
    return envelope({ mastery: result.value })
  })

  route('mastery.recheck', async ({ body }) => {
    const input = body as ApiRequests['mastery.recheck']['body']
    if (typeof input?.courseId !== 'string' || typeof input?.conceptId !== 'string') {
      throw appError('invalid-input', '缺少课程或概念')
    }
    const learning = services.createLearningFor(undefined)
    const result = await learning.recheck(input.courseId, input.conceptId)
    if (!result.ok) return failure(result.error)
    return envelope({ mastery: result.value.record, plan: result.value.plan })
  })

  route('review.list', async ({ query }) => {
    const courseId = requireQuery(query, 'courseId')
    const learning = services.createLearningFor(undefined)
    const result = await learning.listReview(courseId as never)
    if (!result.ok) return failure(result.error)
    return envelope({ review: result.value })
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

  route('environments.list', async () => envelope(await services.experiments.directory()))

  route('environments.prepare', async ({ body }) => {
    const input = body as ApiRequests['environments.prepare']['body']
    if (typeof input?.language !== 'string') throw appError('invalid-input', '缺少语言')
    const handle = services.tasks.start({
      kind: 'environment-prepare',
      label: `准备 ${input.language} 运行环境`,
      steps: [
        { id: 'probe', label: '探测已有运行时' },
        { id: 'prepare', label: '准备独立环境' },
        { id: 'verify', label: '冒烟验证' },
      ],
    }, async context => {
      context.step('probe', { status: 'running' })
      const environment = await services.experiments.prepare({
        language: input.language,
        ...(input.dialect === undefined ? {} : { dialect: input.dialect }),
        ...(input.courseId === undefined ? {} : { courseId: input.courseId as never }),
      })
      context.step('probe', { status: environment.status === 'failed' ? 'failed' : 'done', detail: environment.version })
      context.step('prepare', { status: environment.status === 'failed' ? 'failed' : 'done' })
      context.step('verify', { status: environment.status === 'ready' ? 'done' : 'skipped' })
      context.result({ environmentId: environment.id, status: environment.status })
      return { environment }
    })
    return envelope({ task: handle, environment: await services.experiments.prepare({
      language: input.language,
      ...(input.dialect === undefined ? {} : { dialect: input.dialect }),
    }) })
  })

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

  route('portability.export', async ({ body }) => {
    const input = body as ApiRequests['portability.export']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    const handle = services.tasks.start({
      kind: 'export-html',
      label: '导出离线教学页面',
      steps: [
        { id: 'collect', label: '收集会话与活动' },
        { id: 'render', label: '渲染离线页面' },
        { id: 'write', label: '写入导出文件' },
      ],
    }, async context => {
      context.step('collect', { status: 'running' })
      const result = await services.portability.exportCourse({
        courseId: input.courseId as never,
        ...(input.sessionIds === undefined ? {} : { sessionIds: input.sessionIds as never }),
        ...(input.outDir === undefined ? {} : { outDir: input.outDir }),
        ...(input.format === undefined ? {} : { format: input.format }),
      }, context.signal)
      if (!result.ok) throw appError(result.error.code, result.error.message, result.error.details)
      context.step('collect', { status: 'done' })
      context.step('render', { status: 'done' })
      context.step('write', { status: 'done', detail: `${result.value.manifest.files.length} 个文件` })
      for (const warning of result.value.warnings) context.warn(warning)
      context.result({
        exportId: result.value.exportId,
        htmlPath: result.value.htmlPath,
        manifestPath: result.value.manifestPath,
        nativeFiles: result.value.nativeFiles,
        limitations: result.value.manifest.limitations,
      })
      return result.value
    })
    return envelope({ task: handle })
  })

  route('portability.backup', async ({ body }) => {
    const input = body as ApiRequests['portability.backup']['body']
    const handle = services.tasks.start({
      kind: 'backup',
      label: '创建本地备份',
      steps: [
        { id: 'collect', label: '收集本地数据' },
        { id: 'archive', label: '打包并校验' },
      ],
    }, async context => {
      context.step('collect', { status: 'running' })
      const result = await services.portability.createBackup(input?.outDir, context.signal)
      if (!result.ok) throw appError(result.error.code, result.error.message, result.error.details)
      context.step('collect', { status: 'done' })
      context.step('archive', { status: 'done', detail: `${result.value.bytes} 字节` })
      context.result({
        backupId: result.value.backupId,
        archivePath: result.value.archivePath,
        bytes: result.value.bytes,
      })
      return result.value
    })
    return envelope({ task: handle })
  })

  route('portability.inspect', async ({ body }) => {
    const input = body as ApiRequests['portability.inspect']['body']
    if (typeof input?.archivePath !== 'string' || input.archivePath.trim() === '') {
      throw appError('invalid-input', '缺少备份文件路径')
    }
    const result = await services.portability.inspectBackup(input.archivePath)
    if (!result.ok) return failure(result.error)
    return envelope({ manifest: result.value })
  })

  route('portability.restore', async ({ body }) => {
    const input = body as ApiRequests['portability.restore']['body']
    if (typeof input?.archivePath !== 'string' || input.archivePath.trim() === '') {
      throw appError('invalid-input', '缺少备份文件路径')
    }
    const result = await services.portability.restoreBackup(input.archivePath, {
      ...(input.remapSources === undefined ? {} : { remapSources: input.remapSources }),
    })
    if (!result.ok) return failure(result.error)
    return envelope({ report: result.value })
  })

  route('records.export', async ({ body }) => {
    const input = body as ApiRequests['records.export']['body']
    const handle = services.tasks.start({
      kind: 'records-export',
      label: '导出学习记录',
      steps: [
        { id: 'collect', label: '收集记录' },
        { id: 'write', label: '写入 JSON' },
      ],
    }, async context => {
      context.step('collect', { status: 'running' })
      const result = await services.portability.exportRecords({
        ...(input?.courseId === undefined ? {} : { courseId: input.courseId as never }),
        ...(input?.outDir === undefined ? {} : { outDir: input.outDir }),
      })
      if (!result.ok) throw appError(result.error.code, result.error.message, result.error.details)
      context.step('collect', { status: 'done' })
      context.step('write', { status: 'done', detail: result.value.path })
      context.result({ path: result.value.path, bytes: result.value.bytes })
      return result.value
    })
    return envelope({ task: handle })
  })

  route('records.delete', async ({ body }) => {
    const input = body as ApiRequests['records.delete']['body']
    if (input?.scope === undefined) throw appError('invalid-input', '缺少删除范围')
    const result = await services.portability.deleteRecords({
      scope: input.scope,
      ...(input.id === undefined ? {} : { id: input.id }),
      ...(input.confirm === undefined ? {} : { confirm: input.confirm }),
    })
    if (!result.ok) return failure(result.error)
    return envelope(result.value)
  })

  route('records.reset', async ({ body }) => {
    const input = body as ApiRequests['records.reset']['body']
    if (input?.scope !== 'learning' && input?.scope !== 'all') throw appError('invalid-input', '缺少重置范围')
    const result = await services.portability.resetRecords(input.scope, input.confirm === true)
    if (!result.ok) return failure(result.error)
    return envelope(result.value)
  })

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

/** Build a course draft view with coverage and warnings from the corpus service. */
async function buildDraftView(
  services: RouteServices,
  course: Course,
  revision: CourseRevision,
): Promise<CourseDraftView> {
  const coverage = await services.corpus.buildCourseDraftCoverage(course.id, revision.id)
  if (!coverage.ok) {
    return {
      course,
      revision,
      coverage: [],
      warnings: [`无法读取资料覆盖情况：${coverage.error.message}`],
    }
  }
  return { course, revision, coverage: coverage.value.coverage, warnings: coverage.value.warnings }
}

/** Run code through the experiments registry and persist the run record. */
async function runExperiment(
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
    timeoutMs?: number
    checks?: readonly { readonly name: string; readonly type: string; readonly value: string | number }[]
  },
): Promise<ExperimentRun> {
  const runId = `run-${randomUUID().slice(0, 12)}`
  const checks = (input.checks ?? []).flatMap(check => {
    if (check.type !== 'stdout-contains' && check.type !== 'stdout-equals' && check.type !== 'exit-code') return []
    return [{ name: check.name, type: check.type, value: check.value }]
  })
  const run = await services.experiments.run({
    ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId as never }),
    ...(input.courseId === undefined ? {} : { courseId: input.courseId as never }),
    ...(input.activityId === undefined ? {} : { activityId: input.activityId as never }),
    ...(input.activityRevision === undefined ? {} : { activityRevision: input.activityRevision }),
    language: input.language,
    ...(input.dialect === undefined ? {} : { dialect: input.dialect }),
    code: input.code,
    ...(input.stdin === undefined ? {} : { stdin: input.stdin }),
    ...(checks.length === 0 ? {} : { checks }),
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
  } as import('@deepseek-teaching/core').RunRequest, { runId: runId as never })
  await services.state.writeJson(runFile(services.state.dataDir, run.id), run)
  return run
}

/**
 * Host-side objective validation for one attempt.
 *
 * Only checks the Host can determine without model judgement happen here: quiz
 * answers and real run results. Every other activity returns `undefined` so the
 * learning service applies its rubric path (or records the attempt as
 * unverified) instead of this layer pretending to judge it.
 */
async function validateAttempt(
  services: RouteServices,
  activity: LessonActivity,
  input: ApiRequests['attempts.submit']['body'],
): Promise<AttemptValidation | undefined> {
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
    if (run !== undefined) return validationFromRun(run)
    return {
      kind: 'unverified',
      confidence: 'unknown',
      notes: ['没有找到对应的运行记录，无法客观验证'],
      assessedBy: 'none',
    }
  }
  return undefined
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
