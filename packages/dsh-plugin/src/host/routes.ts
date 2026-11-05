/**
 * Host route layer: every `/api/teaching/<operation>` exact Fetch route.
 *
 * Handlers validate inputs, delegate to feature services, and always return the
 * `Result` JSON envelope (HTTP 200 for logical outcomes) or an SSE stream for
 * chat. The Host is the sole authority for persisted state; the client only
 * renders what these routes return.
 */
import { createHash, randomUUID } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type {
  ActivityState, ApiRequests, AppError, AttemptOutcome, AttemptValidation, BootstrapInfo,
  ChatMessage, ChatStreamEvent, Concept, ContextUsageView, Course, CourseDraftView, CourseRevision, CourseSummary,
  CourseLearningRecord, EnvironmentDirectory, ExperimentRun, LearningAttempt, LearningService, LessonActivity,
  MasteryRecord, ModelCapabilities, ModelCatalogView, ModelInfoView, ModelSelectionView, ReviewItem, SessionSummary, SessionView,
  SourceAnchor, SourceDocument, SourceView, TeachingService, TeachingSession, TeachingTurnInput,
  UsageEntry,
} from '@deepseek-teaching/core'
import {
  CourseRepository, LearningRepository, ProfileRepository, SessionRepository,
  activityFile, activityStateFile, activityId as newActivityId, apiPath, conceptId as newConceptId,
  courseId as newCourseId,
  courseRevisionId as newCourseRevisionId, nowIso, runFile,
} from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'
import type { ModelClient } from '@deepseek-teaching/core'
import { validationFromRun } from '@deepseek-teaching/core/experiments'
import type { RunnerRegistry } from '@deepseek-teaching/core/experiments'
import type { PortabilityService } from '@deepseek-teaching/core'
import type { EnvironmentManager } from '@deepseek-teaching/core/environments'
import { detectRequestedForm } from '@deepseek-teaching/core/teaching'
import type { TaskManager } from './tasks.ts'
import type { WebBridge } from './web.ts'
import type { SettingsStore } from './settings.ts'
import { generateVisual } from './visual-service.ts'
import {
  buildSummaryInput, estimateCompactedTokens, estimateMessageTokens, estimateTokens,
  resolveCompactionPolicy, selectCompactionRange, SUMMARY_MAX_TOKENS, TEACHING_COMPACTION_INSTRUCTION,
} from './context.ts'
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
  readonly environments: EnvironmentManager
  readonly portability: PortabilityService
  /** Build a learning service bound to the activity an attempt answers. */
  readonly createLearningFor: (activity?: LessonActivity) => LearningService
  /** Usage of the most recent model call in one session, then cleared. */
  readonly takeUsage: (sessionId: string) => UsageEntry | undefined
  /** Latest settled model usage per session (not consumed by chat). */
  readonly lastUsage: (sessionId: string) => UsageEntry | undefined
  /** Plugin-local settings (model override). */
  readonly settings: SettingsStore
  /** Effective deployment default selection from `agentDefaultModel`. */
  readonly defaultModelSelection: () => { provider: string; model: string; reasoningEffort?: string }
  /** Clear cached capability info after a selection change. */
  readonly invalidateModelInfo: () => void
  /** Host LLM catalog queries (provider/model/efforts/context window). */
  readonly modelCatalog: {
    listProviders: () => Promise<readonly { id: string; name: string }[]>
    listModels: (provider: string) => Promise<readonly { provider?: string; id: string; name?: string; description?: string }[]>
    resolveModelInfo: (provider: string, model: string) => Promise<Record<string, unknown> | undefined>
  }
  /** Real host OCR capability (tesseract/language packs), probed once. */
  readonly getOcrInfo: () => Promise<{ readonly available: boolean; readonly reason: string; readonly languages: readonly string[] }>
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
    const ocr = await services.getOcrInfo()
    const capabilities: ModelCapabilities = {
      provider: model.provider,
      model: model.model,
      reasoningEffort: model.reasoningEffort,
      imageInput: model.imageInput,
      contextWindow: model.contextWindow,
      note: model.note,
    }
    const warnings: string[] = []
    if (!ocr.available) {
      warnings.push(`图片/扫描件文字识别未启用：${ocr.reason}。扫描件与图片中的公式图表将保留原文/图片供核对，不会编造识别结果。`)
    } else if (ocr.languages.length > 0) {
      warnings.push(`扫描件/图片将使用本机 tesseract OCR（${ocr.languages.join('+')}）；公式与复杂排版识别可能不完整，低置信度内容会标注待核对。`)
    }
    if (model.imageInput === 'unknown') {
      warnings.push('未能确认当前模型是否支持图片输入；插件不会把图片直接发送给模型，扫描内容以 OCR 文本 + 原文定位呈现。')
    } else if (model.imageInput === 'no') {
      warnings.push('当前模型不支持图片输入；扫描内容以 OCR 文本 + 原文定位呈现。')
    }
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
        imageOcr: ocr.available,
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
  /* Model selection / context usage / compaction                         */
  /* ------------------------------------------------------------------ */

  const selectionView = (selection: { provider: string; model: string; reasoningEffort?: string }): ModelSelectionView => ({
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
  })

  const modelInfoView = async (provider: string, model: string): Promise<ModelInfoView> => {
    const raw = await services.modelCatalog.resolveModelInfo(provider, model)
    const context = raw?.['context'] as { contextWindow?: unknown } | undefined
    const window = typeof raw?.['contextWindow'] === 'number'
      ? raw['contextWindow'] as number
      : typeof context?.contextWindow === 'number' ? context.contextWindow : undefined
    const modalities = Array.isArray(raw?.['inputModalities'])
      ? (raw?.['inputModalities'] as unknown[]).filter((item): item is string => typeof item === 'string')
      : undefined
    const reasoningRaw = raw?.['reasoning'] as
      | { efforts?: unknown; defaultEffort?: unknown }
      | undefined
    const efforts = Array.isArray(reasoningRaw?.efforts)
      ? reasoningRaw.efforts.flatMap(effort => {
        if (typeof effort !== 'object' || effort === null) return []
        const record = effort as Record<string, unknown>
        if (typeof record['id'] !== 'string' || record['id'] === '') return []
        return [{
          id: record['id'],
          name: typeof record['name'] === 'string' ? record['name'] : record['id'],
          ...(typeof record['description'] === 'string' ? { description: record['description'] } : {}),
        }]
      })
      : []
    return {
      provider,
      model,
      ...(typeof raw?.['name'] === 'string' ? { name: raw['name'] } : {}),
      ...(window === undefined ? {} : { contextWindow: window }),
      ...(modalities === undefined ? {} : { inputModalities: modalities }),
      ...(efforts.length === 0
        ? {}
        : {
            reasoning: {
              efforts,
              ...(typeof reasoningRaw?.defaultEffort === 'string' ? { defaultEffort: reasoningRaw.defaultEffort } : {}),
            },
          }),
    }
  }

  route('model.catalog', async () => {
    const override = services.settings.modelOverride()
    const fallback = services.defaultModelSelection()
    const providers: ModelCatalogView['providers'][number][] = []
    const failures: { provider: string; message: string }[] = []
    for (const provider of await services.modelCatalog.listProviders()) {
      try {
        const models = await services.modelCatalog.listModels(provider.id)
        providers.push({
          id: provider.id,
          name: provider.name,
          models: models
            .filter(model => typeof model.id === 'string' && model.id !== '')
            .map(model => ({
              id: model.id,
              name: typeof model.name === 'string' && model.name !== '' ? model.name : model.id,
              ...(typeof model.description === 'string' ? { description: model.description } : {}),
            })),
        })
      } catch (cause) {
        failures.push({ provider: provider.id, message: cause instanceof Error ? cause.message : String(cause) })
      }
    }
    return envelope({
      followHost: override === undefined,
      current: selectionView(override ?? fallback),
      default: selectionView(fallback),
      ...(override === undefined ? {} : { override: selectionView(override) }),
      providers,
      ...(failures.length === 0 ? {} : { failures }),
    } satisfies ModelCatalogView)
  })

  route('model.info', async ({ query }) => {
    const provider = requireQuery(query, 'provider')
    const model = requireQuery(query, 'model')
    return envelope(await modelInfoView(provider, model))
  })

  route('model.set', async ({ body }) => {
    const input = body as ApiRequests['model.set']['body']
    if (input?.followHost === true) {
      await services.settings.setModelSelection(undefined)
      services.invalidateModelInfo()
      return envelope({ selection: selectionView(services.defaultModelSelection()), followHost: true })
    }
    if (typeof input?.provider !== 'string' || typeof input?.model !== 'string'
      || input.provider.trim() === '' || input.model.trim() === '') {
      throw appError('invalid-input', '缺少 provider 或 model')
    }
    const provider = input.provider.trim()
    const model = input.model.trim()
    const reasoningEffort = typeof input.reasoningEffort === 'string' && input.reasoningEffort !== ''
      ? input.reasoningEffort
      : undefined
    const info = await modelInfoView(provider, model)
    if (info.reasoning !== undefined && reasoningEffort !== undefined
      && !info.reasoning.efforts.some(effort => effort.id === reasoningEffort)) {
      throw appError('invalid-input', `模型 ${provider}/${model} 不支持思考强度 ${reasoningEffort}`)
    }
    await services.settings.setModelSelection({
      provider,
      model,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
    })
    services.invalidateModelInfo()
    return envelope({
      selection: selectionView({ provider, model, ...(reasoningEffort === undefined ? {} : { reasoningEffort }) }),
      followHost: false,
    })
  })

  route('context.usage', async ({ query }) => {
    const sessionId = requireQuery(query, 'sessionId')
    const session = await services.sessions.get(sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const info = await services.model.info()
    const resolved = info.contextWindow === undefined
      ? await modelInfoView(info.provider, info.model)
      : undefined
    const contextWindow = info.contextWindow ?? resolved?.contextWindow
    const last = services.lastUsage(session.id)
    const checkpoint = session.context
    let tokensUsed: number | undefined
    let source: ContextUsageView['source'] = 'unknown'
    let reportedAt: string | undefined
    let note: string | undefined
    if (checkpoint !== undefined && (last === undefined || checkpoint.compactedAt > (last.at ?? ''))) {
      tokensUsed = checkpoint.tokensAfterEstimate
      source = 'estimated'
      note = `压缩检查点估算；最近一次请求 ${last?.inputTokens ?? '未知'} tokens`
    } else if (last?.inputTokens !== undefined) {
      tokensUsed = last.inputTokens
      source = 'reported'
      reportedAt = last.at
    } else {
      const messages = await services.sessions.messages(session.id)
      tokensUsed = estimateMessageTokens(messages) + 2_000
      source = 'estimated'
      note = '尚无模型用量报告；按消息字符估算'
    }
    const percent = tokensUsed !== undefined && contextWindow !== undefined
      ? Math.round((tokensUsed / contextWindow) * 1000) / 10
      : undefined
    const payload: ContextUsageView = {
      sessionId: session.id,
      ...(tokensUsed === undefined ? {} : { tokensUsed }),
      ...(contextWindow === undefined ? {} : { contextWindow }),
      ...(percent === undefined ? {} : { percent }),
      source,
      ...(reportedAt === undefined ? {} : { reportedAt }),
      model: selectionView({ provider: info.provider, model: info.model, ...(info.reasoningEffort === undefined ? {} : { reasoningEffort: info.reasoningEffort }) }),
      ...(checkpoint === undefined
        ? {}
        : {
            compressed: {
              compactedAt: checkpoint.compactedAt,
              compactedMessages: checkpoint.compactedMessageIds.length,
              tokensBefore: checkpoint.tokensBefore,
              tokensAfterEstimate: checkpoint.tokensAfterEstimate,
            },
          }),
      ...(note === undefined ? {} : { note }),
    }
    return envelope(payload)
  })

  route('context.compress', async ({ body }) => {
    const input = body as ApiRequests['context.compress']['body']
    if (typeof input?.sessionId !== 'string') throw appError('invalid-input', '缺少 sessionId')
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const force = input.force === true
    const handle = services.tasks.start({
      kind: 'context-compact',
      label: '压缩教学上下文',
      steps: [
        { id: 'read', label: '读取对话历史' },
        { id: 'summarize', label: '生成压缩摘要' },
        { id: 'save', label: '保存上下文检查点' },
      ],
    }, async context => {
      context.step('read', { status: 'running' })
      const messages = await services.sessions.messages(session.id)
      if (messages.length === 0) throw appError('invalid-input', '该学习会话还没有消息，无法压缩')
      const info = await services.model.info()
      const resolved = info.contextWindow === undefined
        ? await modelInfoView(info.provider, info.model)
        : undefined
      const policy = resolveCompactionPolicy(info.contextWindow ?? resolved?.contextWindow)
      const selection = selectCompactionRange(messages, policy, force)
      if (selection.compacted.length === 0) {
        context.step('read', { status: 'done', detail: '无需压缩' })
        context.result({ compacted: false, reason: selection.reason ?? '没有可压缩的历史' })
        return { compacted: false }
      }
      context.step('read', {
        status: 'done',
        detail: `${selection.compacted.length} 条消息 / 约 ${selection.tokensBefore} tokens`,
      })
      context.step('summarize', { status: 'running' })
      const completion = await services.model.complete({
        system: TEACHING_COMPACTION_INSTRUCTION,
        messages: [{
          role: 'user',
          text: `以下是较早的教学对话（原文）：

${buildSummaryInput(selection.compacted)}

请按要求输出压缩检查点。`,
        }],
        maxTokens: SUMMARY_MAX_TOKENS,
        purpose: 'compaction',
        sessionId: session.id as never,
        language: 'zh',
      }, context.signal)
      const summary = completion.text.trim()
      if (summary === '') throw appError('uncertain', '压缩摘要为空，未保存')
      const tokensAfterEstimate = estimateCompactedTokens(summary, selection.retained)
      if (tokensAfterEstimate >= selection.tokensBefore) {
        context.step('summarize', { status: 'done', detail: '压缩收益不足' })
        context.result({
          compacted: false,
          reason: `压缩后估算没有减少（${selection.tokensBefore} → ${tokensAfterEstimate} tokens）；摘要比原文长时不保存，避免上下文反而变大`,
        })
        return { compacted: false }
      }
      context.step('summarize', { status: 'done', detail: `约 ${selection.tokensBefore} → ${tokensAfterEstimate} tokens` })
      context.step('save', { status: 'running' })
      const checkpoint = {
        summary,
        compactedMessageIds: selection.compacted.map(message => message.id),
        compactedAt: nowIso(),
        tokensBefore: selection.tokensBefore,
        tokensAfterEstimate,
        model: { provider: info.provider, model: info.model },
      }
      const latest = await services.sessions.get(session.id)
      if (latest === undefined) throw notFoundError('学习会话')
      const saved = await services.sessions.save({
        ...latest,
        context: checkpoint,
        updatedAt: nowIso(),
      })
      context.step('save', { status: 'done' })
      context.result({ compacted: true, checkpoint })
      return { compacted: true, checkpoint, session: saved }
    })
    return envelope({ task: handle })
  })

  route('context.reset', async ({ body }) => {
    const input = body as ApiRequests['context.reset']['body']
    if (typeof input?.sessionId !== 'string') throw appError('invalid-input', '缺少 sessionId')
    const session = await services.sessions.get(input.sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const { context: _context, ...rest } = session
    const saved = await services.sessions.save({ ...rest, updatedAt: nowIso() })
    return envelope({ session: saved })
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
    const course = await services.courses.get(input.courseId)
    if (course === undefined) return failure({ code: 'not-found', message: '课程不存在或已被删除' })

    // 1. Remove the course's sessions together with their activities, student
    //    activity state and run records (student data, explicitly requested).
    const sessions = await services.sessions.list(input.courseId)
    let removedActivities = 0
    const removedActivityIds = new Set<string>()
    for (const session of sessions) {
      for (const activity of await services.sessions.listActivities(session.id)) {
        removedActivityIds.add(activity.id)
        await services.state.remove(activityFile(services.state.dataDir, activity.id))
        await services.state.remove(activityStateFile(services.state.dataDir, activity.id))
        removedActivities += 1
      }
      await services.sessions.delete(session.id)
    }
    for (const name of await services.state.list('runs')) {
      if (!name.endsWith('.json')) continue
      const run = await services.state.readJson<{ sessionId?: string; activityId?: string }>(`runs/${name}`)
      if (run === undefined) continue
      const belongs = run.sessionId !== undefined && sessions.some(session => session.id === run.sessionId)
      const activityRemoved = run.activityId !== undefined && removedActivityIds.has(run.activityId)
      if (belongs || activityRemoved) await services.state.remove(`runs/${name}`)
    }

    // 2. Course structure revisions + course record.
    await services.courses.delete(input.courseId)
    await services.state.remove(`learning/${input.courseId}.json`)

    // 3. Sources: delete parsed records only when exclusively owned and the
    //    student asked for it; otherwise just detach this course. Original files
    //    on disk are never modified.
    let detached = 0
    let deletedSources = 0
    for (const document of await services.courses.listSources(input.courseId)) {
      const remaining = document.courseIds.filter(id => id !== input.courseId)
      if (input.deleteSources === true && remaining.length === 0) {
        await services.state.remove(`sources/${document.id}.json`)
        await services.state.remove(`sources/${document.id}`)
        deletedSources += 1
        continue
      }
      await services.courses.saveSource({
        ...document,
        courseIds: remaining as never,
        updatedAt: nowIso(),
      })
      detached += 1
    }

    services.logger('course deleted', {
      courseId: input.courseId,
      sessions: sessions.length,
      activities: removedActivities,
      sourcesDetached: detached,
      sourcesDeleted: deletedSources,
    })
    return envelope({
      deleted: true,
      details: {
        sessions: sessions.length,
        activities: removedActivities,
        sourcesDetached: detached,
        sourcesDeleted: deletedSources,
      },
    })
  })

  /* ------------------------------------------------------------------ */
  /* Sources                                                              */
  /* ------------------------------------------------------------------ */

  route('sources.import', async ({ body }) => {
    const input = body as ApiRequests['sources.import']['body']
    const paths = (input?.paths ?? []).filter((path): path is string => typeof path === 'string' && path.trim() !== '')
    if (paths.length === 0) throw appError('invalid-input', '请提供至少一个本地文件路径，或选择一个资料文件夹')
    const courseId = input.courseId
    const expanded = await collectImportFiles(paths)
    if (expanded.files.length === 0) {
      return failure({
        code: 'invalid-input',
        message: '所选位置没有可导入的资料文件（支持 Markdown/文本/PDF/图片/Word/PPT/代码/Notebook）',
        details: { warnings: expanded.warnings },
      })
    }
    const files = expanded.files
    const handle = services.tasks.start({
      kind: 'source-import',
      label: `导入 ${files.length} 份资料`,
      steps: files.slice(0, 20).map((path, index) => ({ id: `file-${index}`, label: basename(path) })),
      resumable: true,
    }, async context => {
      for (const warning of expanded.warnings) context.warn(warning)
      const progress = (done: number, total: number, current: string): void => {
        context.progress(total === 0 ? undefined : done / total)
        const index = files.indexOf(current)
        if (index >= 0 && index < 20) {
          context.step(`file-${index}`, done > index ? { status: 'done' } : { status: 'running' })
        }
      }
      const outcome = await services.corpus.importFiles(
        courseId as never,
        files.map(path => ({ path, ...(courseId === undefined ? {} : { courseId: courseId as never }) })),
        { onProgress: progress, signal: context.signal },
      )
      for (const warning of outcome.warnings) context.warn(warning)
      for (const failed of outcome.failures) context.warn(`${failed.path}: ${failed.error.message}`)
      for (let index = 0; index < Math.min(20, files.length); index += 1) {
        if (context.cancelled()) context.step(`file-${index}`, { status: 'skipped' })
      }
      context.result({
        imported: outcome.documents.map(document => document.id),
        failures: outcome.failures.map(failed => ({ path: failed.path, error: failed.error })),
        expandedFrom: paths.length,
      })
      if (outcome.failures.length > 0 && outcome.documents.length === 0) {
        throw appError('failed', '所有资料导入失败', {
          failures: outcome.failures.map(failed => ({ path: failed.path, code: failed.error.code })),
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
    // New courses have only a draft revision: its goals/background are the
    // student input that the draft prompt must receive.
    const draftRevision = course.draftRevisionId === undefined
      ? undefined
      : await services.courses.getRevision(course.id, course.draftRevisionId)
    const goalSource = active?.goals ?? draftRevision?.goals
    const goalText = goalSource !== undefined && goalSource.length > 0
      ? goalSource.join('；')
      : (course.description !== '' ? course.description : `系统学习《${course.title}》`)
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
        goal: goalText,
        ...((active?.background ?? draftRevision?.background) === undefined
          ? {}
          : { background: (active?.background ?? draftRevision?.background) as string }),
        language: profile.language,
        ...(input.instruction === undefined ? {} : { instruction: input.instruction }),
        ...(input.strategy === undefined ? {} : { strategy: input.strategy }),
      }, context.signal)
      if (!proposed.ok) {
        throw appError(proposed.error.code, proposed.error.message, proposed.error.details)
      }
      context.step('structure', {
        status: 'done',
        detail: `${proposed.value.concepts.length} 个概念${proposed.value.chapters === undefined ? '' : ` · ${proposed.value.chapters.length} 个章节`}`,
      })
      context.step('save', { status: 'done' })
      context.result({
        revisionId: proposed.value.id,
        conceptCount: proposed.value.concepts.length,
        ...(proposed.value.chapters === undefined ? {} : { chapterCount: proposed.value.chapters.length }),
        provenance: proposed.value.provenance,
      })
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
      concepts = concepts.map(concept => {
        const raw = edits.conceptTitles?.[concept.id]
        const title = typeof raw === 'string' ? raw.trim().slice(0, 120) : ''
        return title === '' ? concept : { ...concept, title }
      })
    }
    // Student-authored concepts: no source anchors yet (teaching marks them as
    // model knowledge), optional placement into an existing chapter.
    const added: { concept: Concept; chapterId?: string }[] = []
    for (const input of (edits?.addConcepts ?? []).slice(0, 200)) {
      const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 120) : ''
      if (title === '') continue
      const summary = typeof input?.summary === 'string' ? input.summary.trim().slice(0, 1200) : ''
      added.push({
        concept: {
          id: newConceptId(),
          title,
          summary,
          prerequisites: [],
          sourceAnchors: [],
        },
        ...(typeof input?.chapterId === 'string' ? { chapterId: input.chapterId } : {}),
      })
    }
    concepts = [...concepts, ...added.map(item => item.concept)]
    let sequence = draft.sequence.filter(id => concepts.some(concept => concept.id === id))
    if (edits?.sequence !== undefined) {
      const requested = edits.sequence.filter(id => concepts.some(concept => concept.id === id))
      sequence = [...requested, ...concepts.map(concept => concept.id).filter(id => !requested.includes(id))]
    } else {
      sequence = [...sequence, ...added.map(item => item.concept.id)]
    }
    sequence = [...new Set(sequence)]
    if (concepts.length === 0) {
      return failure({ code: 'invalid-input', message: '确认的课程结构至少需要一个概念' })
    }
    // Keep optional chapter groupings consistent with the edited concept set and
    // apply student chapter title/summary edits.
    const chapters = draft.chapters === undefined
      ? undefined
      : draft.chapters.map(chapter => {
        const rawTitle = edits?.chapterTitles?.[chapter.id]
        const title = typeof rawTitle === 'string' && rawTitle.trim() !== ''
          ? rawTitle.trim().slice(0, 160)
          : chapter.title
        const rawSummary = edits?.chapterSummaries?.[chapter.id]
        const summary = typeof rawSummary === 'string' ? rawSummary.trim().slice(0, 600) : chapter.summary
        return {
          ...chapter,
          title,
          ...(summary === undefined ? {} : { summary }),
          conceptIds: chapter.conceptIds.filter(id => concepts.some(concept => concept.id === id)),
        }
      })
    const chaptersWithAdditions = chapters === undefined
      ? undefined
      : chapters
        .map(chapter => ({
          ...chapter,
          conceptIds: [
            ...chapter.conceptIds,
            ...added.filter(item => item.chapterId === chapter.id).map(item => item.concept.id),
          ],
        }))
        .filter(chapter => chapter.conceptIds.length > 0)
    const confirmed: CourseRevision = {
      ...draft,
      state: 'confirmed',
      confirmedAt: nowIso(),
      provenance: 'student-edit',
      concepts,
      sequence,
      ...(chaptersWithAdditions === undefined ? undefined : { chapters: chaptersWithAdditions }),
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

  route('courseGoals.update', async ({ body }) => {
    const input = body as ApiRequests['courseGoals.update']['body']
    if (typeof input?.courseId !== 'string') throw appError('invalid-input', '缺少 courseId')
    if (!Array.isArray(input.goals)) throw appError('invalid-input', 'goals 必须是字符串数组')
    const goals = input.goals
      .filter((goal): goal is string => typeof goal === 'string' && goal.trim() !== '')
      .map(goal => goal.trim().slice(0, 300))
      .slice(0, 20)
    if (goals.length === 0) throw appError('invalid-input', '至少保留一个学习目标')
    const course = await services.courses.get(input.courseId)
    if (course === undefined) throw notFoundError('课程')
    const active = await services.courses.getActiveRevision(course)
    const revisions = await services.courses.listRevisions(course.id)
    const background = typeof input.background === 'string' ? input.background.trim().slice(0, 2000) : undefined
    if (active === undefined) {
      // Draft-only course: replace the proposed draft's goals in a new draft revision.
      const draft = await services.courses.getDraftRevision(course)
      if (draft === undefined) throw notFoundError('课程草案')
      const next: CourseRevision = {
        ...draft,
        id: newCourseRevisionId(),
        version: (revisions.at(-1)?.version ?? draft.version) + 1,
        createdAt: nowIso(),
        state: 'draft',
        goals,
        ...(background === undefined ? {} : { background }),
        changeSummary: '学生更新了学习目标（待确认课程结构）',
      }
      await services.courses.saveRevision(next)
      const updated = await services.courses.save({ ...course, draftRevisionId: next.id, updatedAt: nowIso() })
      return envelope({ course: updated, revision: next })
    }
    // Confirmed course: a new confirmed revision keeps old sessions traceable
    // to the revision they were taught against while new sessions use the update.
    const next: CourseRevision = {
      ...active,
      id: newCourseRevisionId(),
      version: (revisions.at(-1)?.version ?? active.version) + 1,
      createdAt: nowIso(),
      state: 'confirmed',
      confirmedAt: nowIso(),
      provenance: 'student-edit',
      goals,
      ...(background === undefined ? {} : { background }),
      changeSummary: '学生更新了学习目标（课程结构不变）',
    }
    await services.courses.saveRevision(next)
    const superseded: CourseRevision = { ...active, state: 'superseded' }
    await services.courses.saveRevision(superseded)
    const updated = await services.courses.save({ ...course, activeRevisionId: next.id, updatedAt: nowIso() })
    return envelope({ course: updated, revision: next })
  })

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
    let revision = await services.courses.getActiveRevision(course)
    if (revision === undefined) {
      if (input.mode !== 'adhoc') {
        return failure({
          code: 'needs-confirmation',
          message: '课程结构尚未确认。请先确认 AI 生成的课程草案，或选择随问随学。',
          details: { courseId: course.id, draftRevisionId: course.draftRevisionId },
        })
      }
      // Ad-hoc learning: confirm a minimal structure derived from the existing
      // draft (or the course title) so progress/mastery remain traceable, while
      // making clear the full structure was not reviewed.
      const draft = await services.courses.getDraftRevision(course)
      const concepts = (draft?.concepts ?? []).length > 0
        ? draft?.concepts ?? []
        : [{
            id: `concept-${course.id}-adhoc` as never,
            title: course.title,
            summary: `${course.title}（随问随学，未确认完整课程结构）`,
            prerequisites: [],
            sourceAnchors: [],
          }]
      const revisions = await services.courses.listRevisions(course.id)
      const adhoc: CourseRevision = {
        id: newCourseRevisionId(),
        courseId: course.id,
        version: (revisions.at(-1)?.version ?? 0) + 1,
        createdAt: nowIso(),
        state: 'confirmed',
        confirmedAt: nowIso(),
        provenance: 'student-edit',
        goals: draft !== undefined && draft.goals.length > 0
          ? draft.goals
          : (course.description === '' ? [] : [course.description]),
        language: draft?.language ?? (await services.profiles.get()).language,
        sources: draft?.sources ?? [],
        concepts,
        sequence: concepts.map(concept => concept.id),
        basedOn: draft?.basedOn ?? [],
        changeSummary: '随问随学：自动确认最小可用课程结构（未经过完整草案评审）',
      }
      await services.courses.saveRevision(adhoc)
      await services.courses.save({ ...course, status: 'active', activeRevisionId: adhoc.id, draftRevisionId: undefined, updatedAt: nowIso() })
      revision = adhoc
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
    if (input.activityId !== undefined && input.activityId !== null) {
      const activity = await services.sessions.getActivity(input.activityId)
      if (activity === undefined || activity.sessionId !== session.id) {
        throw appError('not-found', '该活动不属于当前学习会话')
      }
    }
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
    const allHistory = await services.sessions.messages(session.id)
    const checkpoint = session.context
    // Older messages replaced by a checkpoint are omitted from the model prompt;
    // the UI still shows the full persisted history.
    const history = checkpoint === undefined
      ? allHistory
      : allHistory.filter(message => !checkpoint.compactedMessageIds.includes(message.id))
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
          // Cross-course references: only when the current course material is
          // thin and another course has relevant material, and always labelled
          // with the other course's title/revision (R10).
          const crossCourse: import('@deepseek-teaching/core').CrossCourseReference[] = []
          if (hits.length < 3) {
            const allCourses = await services.courses.list()
            const others = allCourses.filter(other => other.id !== course.id && other.activeRevisionId !== undefined).slice(0, 3)
            for (const other of others) {
              const otherRevision = await services.courses.getRevision(other.id, other.activeRevisionId as never)
              if (otherRevision === undefined) continue
              const otherHits = await services.corpus.search({ query: input.text, courseId: other.id, limit: 2 })
              if (!otherHits.ok || otherHits.value.hits.length === 0) continue
              crossCourse.push({
                courseId: other.id,
                courseTitle: other.title,
                revisionId: otherRevision.id,
                conceptIds: [],
                reason: `当前课程资料未覆盖，其他课程《${other.title}》有相关材料，仅作关联参考`,
                anchors: otherHits.value.hits.map(hit => hit.anchor),
              })
              if (crossCourse.length >= 2) break
            }
          }
          const crossEvidence: import('@deepseek-teaching/core').EvidenceReference[] = crossCourse.flatMap(ref =>
            ref.anchors.slice(0, 1).map(anchor => ({
              kind: 'other-course' as const,
              label: `${ref.courseTitle} · ${anchor.label ?? '相关片段'}`,
              anchor,
              courseId: ref.courseId,
              courseTitle: ref.courseTitle,
            })))
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
            ...(checkpoint === undefined
              ? {}
              : { contextCheckpoint: { summary: checkpoint.summary, compactedAt: checkpoint.compactedAt } }),
            material,
            crossCourse,
            learning: learningSummary,
            materialWarnings: [],
            requestedForm: detectRequestedForm(input.text)?.form,
            wantsFullAnswer: /完整答案|直接给(我)?答案|别提示|tell me the answer|just give me/i.test(input.text),
            // Only pass results when a lookup was actually attempted; an empty
            // array means "searched but nothing found", undefined means "not used".
            ...(wantsWebLookup(input.text) ? { webResults } : {}),
          }

          let finalText = ''
          let finalMeta: import('@deepseek-teaching/core').TeachingTurnMeta | undefined
          let evidenceRefs: import('@deepseek-teaching/core').EvidenceReference[] = [...evidenceFromMaterial, ...webEvidence, ...crossEvidence]
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
          // Dedicated visual generation: the main teaching JSON is a bad carrier
          // for large SVG/HTML source (escaped quotes/newlines get truncated).
          // When the student asked for a visual and no visual activity arrived,
          // ask a separate model call for a compact brief + fenced source.
          const visualKinds = new Set(['visual', 'interactive-graph', 'static-figure', 'animation'])
          if (!createdActivities.some(activity => visualKinds.has(activity.kind)) && wantsVisual(input.text)) {
            send({ type: 'progress', label: '生成可视化' })
            try {
              const generated = await generateVisual(services.model, {
                courseTitle: course.title,
                ...(currentConcept === undefined ? {} : { conceptTitle: currentConcept.title }),
                studentText: input.text.trim(),
                teachingText: finalText,
                language: profile.language,
                sessionId: session.id,
              }, controller.signal)
              if (generated !== undefined) {
                const now = nowIso()
                const heading = /^#{1,4}\s+(.+)$/mu.exec(finalText)?.[1]?.trim()
                const title = generated.payload.title ?? heading ?? currentConcept?.title ?? '可视化演示'
                const activity: LessonActivity = {
                  id: newActivityId(),
                  kind: 'visual',
                  sessionId: session.id,
                  courseId: course.id,
                  conceptIds: currentConcept === undefined ? [] : [currentConcept.id],
                  goal: currentConcept?.title ?? title,
                  title,
                  createdAt: now,
                  updatedAt: now,
                  revision: 1,
                  status: 'active',
                  sourceRefs: hits.slice(0, 3).map(hit => hit.anchor),
                  verification: { kind: 'none', note: '模型生成的可视化；需人工核对数学/事实正确性' },
                  independent: false,
                  payload: generated.payload,
                }
                await services.sessions.saveActivity(activity)
                createdActivities.push(activity)
                send({ type: 'activity', activity })
              } else {
                limitations.push('可视化生成未返回可用的自包含源码，本轮按文字讲解继续。')
              }
            } catch (cause) {
              const message = cause instanceof Error ? cause.message : String(cause)
              limitations.push(`可视化生成失败（${message}），本轮按文字讲解继续。`)
            }
          }
          // Robust fallback: when the model draws a diagram in prose (fenced
          // svg/html/mermaid) but the metadata fails or omits the activity, turn
          // the fence into a first-class visual activity so the right panel shows it.
          if (!createdActivities.some(activity => activity.kind === 'visual')) {
            const fenced = extractVisualFence(finalText)
            if (fenced !== undefined) {
              const now = nowIso()
              const heading = /^#{1,4}\s+(.+)$/mu.exec(finalText)?.[1]?.trim()
              const activity: LessonActivity = {
                id: newActivityId(),
                kind: 'visual',
                sessionId: session.id,
                courseId: course.id,
                conceptIds: currentConcept === undefined ? [] : [currentConcept.id],
                goal: currentConcept?.title ?? (heading ?? '可视化演示'),
                title: heading ?? '可视化演示',
                createdAt: now,
                updatedAt: now,
                revision: 1,
                status: 'active',
                sourceRefs: hits.slice(0, 3).map(hit => hit.anchor),
                verification: { kind: 'none', note: '模型生成的可视化；需人工核对数学/事实正确性' },
                independent: false,
                payload: {
                  type: 'visual',
                  renderer: fenced.renderer,
                  source: fenced.source,
                  ...(heading === undefined ? {} : { title: heading }),
                },
              }
              await services.sessions.saveActivity(activity)
              createdActivities.push(activity)
              send({ type: 'activity', activity })
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
            ...(finalMeta === undefined
              ? {}
              : {
                  meta: {
                    intent: finalMeta.intent,
                    stage: finalMeta.stage,
                    conceptIds: finalMeta.conceptIds,
                    requestedForm: finalMeta.requestedForm,
                    nextActions: finalMeta.nextActions,
                  },
                }),
          })
          await services.sessions.appendMessage(teacher)
          const latest = (await services.sessions.get(session.id)) ?? session
          const nextPosition = {
            stage: (finalMeta?.stage ?? latest.position.stage) as TeachingSession['position']['stage'],
            conceptId: finalMeta?.conceptIds?.[0] ?? latest.position.conceptId,
            // Graphical activities are rendered inline in the conversation; never
            // make one the right-side "current activity" (other activities still are).
            activityId: [...createdActivities].reverse()
              .find(activity => !CHAT_INLINE_ACTIVITY_KINDS.has(activity.kind))?.id
              ?? latest.position.activityId,
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
      ...(input.clientRunId === undefined ? {} : { runId: input.clientRunId }),
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
      ...(input.clientRunId === undefined ? {} : { runId: input.clientRunId }),
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

  /**
   * Latest persisted run per activity for one session.
   *
   * Runs are already written under `runs/`; reading them back keeps real output
   * visible after a page refresh (the client previously only kept this in
   * memory). Corrupt/unreadable run files are skipped, not fatal.
   */
  route('runs.latest', async ({ query }) => {
    const sessionId = requireQuery(query, 'sessionId')
    const session = await services.sessions.get(sessionId)
    if (session === undefined) throw notFoundError('学习会话')
    const latest = new Map<string, ExperimentRun>()
    for (const name of await services.state.list('runs')) {
      if (!name.endsWith('.json')) continue
      let run: ExperimentRun | undefined
      try {
        run = await services.state.readJson<ExperimentRun>(`runs/${name}`)
      } catch {
        continue
      }
      if (run === undefined || run.sessionId !== session.id || run.activityId === undefined) continue
      const previous = latest.get(run.activityId)
      if (previous === undefined || (run.startedAt ?? '') >= (previous.startedAt ?? '')) {
        latest.set(run.activityId, run)
      }
    }
    const runs = [...latest.values()].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
    return envelope({ runs })
  })

  /**
   * Delete one activity chosen by the student (history cleanup).
   *
   * Removes the activity record, its editable state and its run records. The
   * learning attempts/mastery evidence stay untouched (deleting evidence would
   * silently rewrite mastery); original course sources are never touched. If
   * the activity was the session's current one, the position is cleared.
   */
  route('activity.delete', async ({ body }) => {
    const input = body as ApiRequests['activity.delete']['body']
    if (typeof input?.activityId !== 'string') throw appError('invalid-input', '缺少 activityId')
    const activity = await services.sessions.getActivity(input.activityId)
    if (activity === undefined) throw notFoundError('活动')
    if (input.expectedRevision !== undefined && input.expectedRevision !== activity.revision) {
      return failure({
        code: 'conflict',
        message: '活动已被更新，请刷新后重试',
        details: { expected: input.expectedRevision, actual: activity.revision },
      })
    }
    await services.state.remove(activityFile(services.state.dataDir, activity.id))
    await services.state.remove(activityStateFile(services.state.dataDir, activity.id))
    // Future-proof: a later version may persist a per-activity result record.
    await services.state.remove(`activities/${activity.id}.result.json`)
    let removedRuns = 0
    for (const name of await services.state.list('runs')) {
      if (!name.endsWith('.json')) continue
      let run: ExperimentRun | undefined
      try {
        run = await services.state.readJson<ExperimentRun>(`runs/${name}`)
      } catch {
        continue
      }
      if (run === undefined || run.activityId !== activity.id) continue
      await services.state.remove(`runs/${name}`)
      removedRuns += 1
    }
    let positionCleared = false
    const session = await services.sessions.get(activity.sessionId)
    if (session !== undefined && session.position.activityId === activity.id) {
      const { activityId: _removedActivityId, ...restPosition } = session.position
      await services.sessions.save({
        ...session,
        position: { ...restPosition, updatedAt: nowIso() },
        updatedAt: nowIso(),
      })
      positionCleared = true
    }
    services.logger('activity deleted', { activityId: activity.id, removedRuns, positionCleared })
    return envelope({ activityId: activity.id, removedRuns, positionCleared })
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
    if (input.activityId !== undefined && activity === undefined) {
      // A stale client reference must be visible, not silently recorded as a
      // free-form attempt against the session position.
      return failure({ code: 'not-found', message: '作答的活动不存在或已被更新，请刷新后重试', details: { activityId: input.activityId } })
    }
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

  route('environments.list', async () => envelope(await services.environments.directory()))

  route('environments.prepare', async ({ body }) => {
    const input = body as ApiRequests['environments.prepare']['body']
    if (typeof input?.language !== 'string' || input.language.trim() === '') {
      throw appError('invalid-input', '缺少语言')
    }
    const handle = services.tasks.start({
      kind: 'environment-prepare',
      label: `准备 ${input.language} 运行环境`,
      steps: [
        { id: 'probe', label: '探测已有运行时' },
        { id: 'approval', label: '系统改动确认（如需）' },
        { id: 'prepare', label: '准备独立环境' },
        { id: 'smoke', label: '冒烟验证' },
      ],
    }, async context => {
      const phaseToStep: Record<string, string> = {
        probe: 'probe', approval: 'approval', prepare: 'prepare', smoke: 'smoke', done: 'smoke',
      }
      const result = await services.environments.prepare({
        language: input.language,
        ...(input.dialect === undefined ? {} : { dialect: input.dialect }),
        ...(input.courseId === undefined ? {} : { courseId: input.courseId as never }),
      }, {
        signal: context.signal,
        ...(input.approveSystemChange === undefined ? {} : { approveSystemChange: input.approveSystemChange }),
        onProgress: event => {
          const stepId = phaseToStep[event.phase]
          if (stepId !== undefined) {
            context.step(stepId, {
              status: event.phase === 'done' ? 'done' : 'running',
              ...(event.detail === undefined ? {} : { detail: event.detail }),
            })
          }
        },
      })
      if (!result.ok) throw appError(result.error.code, result.error.message, result.error.details)
      const record = result.value
      context.step('smoke', {
        status: record.status === 'ready' ? 'done' : (record.status === 'failed' ? 'failed' : 'done'),
        ...(record.version === undefined ? {} : { detail: record.version }),
      })
      context.result({ environmentId: record.id, status: record.status, version: record.version })
      return { environmentId: record.id }
    })
    return envelope({ task: handle })
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
        ...(input.includeNotes === undefined ? {} : { includeNotes: input.includeNotes }),
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
    'capabilities.get', 'runs.latest', 'model.catalog', 'model.info', 'context.usage',
  ])
  return { method: getOperations.has(operation) ? 'GET' : 'POST' }
}

/** Require one query parameter with a clear error. */
function requireQuery(query: URLSearchParams, name: string): string {
  const value = query.get(name)
  if (value === null || value === '') throw appError('invalid-input', `缺少参数 ${name}`)
  return value
}

/** Extensions the corpus understands; directory imports only pick these. */
const IMPORTABLE_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx', '.txt', '.text', '.log', '.pdf', '.png', '.jpg', '.jpeg',
  '.webp', '.gif', '.heic', '.docx', '.pptx', '.ipynb', '.html', '.htm',
  '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.scm', '.ss', '.rkt', '.c', '.h',
  '.cpp', '.java', '.rs', '.go', '.rb', '.sh', '.sql', '.json', '.yaml', '.yml',
])

/** Directories never worth importing even when the student picks a parent folder. */
const SKIPPED_DIR_NAMES = new Set(['node_modules', '.git', '.svn', 'dist', 'build', '.next', 'target', '__pycache__'])

/**
 * Expand the student's selected paths into concrete files.
 *
 * A folder picked through the native/Host directory chooser is walked
 * recursively (bounded depth and file count) so the wizard can offer a real
 * file-manager selection instead of requiring typed paths. Symlinked loops are
 * avoided by bounding depth; unreadable entries are reported as warnings.
 */
async function collectImportFiles(
  paths: readonly string[],
): Promise<{ files: string[]; warnings: string[] }> {
  const files: string[] = []
  const warnings: string[] = []
  const maxFiles = 3000
  const maxDepth = 8
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > maxDepth || files.length >= maxFiles) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (cause) {
      warnings.push(`无法读取目录 ${dir}：${cause instanceof Error ? cause.message : String(cause)}`)
      return
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (files.length >= maxFiles) {
        warnings.push(`目录文件过多，仅导入前 ${maxFiles} 个文件；可分批选择子目录`)
        return
      }
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIPPED_DIR_NAMES.has(entry.name)) continue
        await walk(full, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      if (!IMPORTABLE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue
      files.push(full)
    }
  }
  for (const path of paths) {
    const trimmed = path.trim()
    if (trimmed === '') continue
    let info
    try {
      info = await stat(trimmed)
    } catch {
      // Keep missing paths so the corpus task reports the same visible failure.
      files.push(trimmed)
      continue
    }
    if (info.isDirectory()) {
      const before = files.length
      await walk(trimmed, 0)
      if (files.length === before) warnings.push(`目录中没有可导入的资料文件：${trimmed}`)
      continue
    }
    files.push(trimmed)
  }
  return { files, warnings }
}

/** Build a course draft view with coverage and warnings from the corpus service. */
async function buildDraftView(
  services: RouteServices,
  course: Course,
  revision: CourseRevision,
): Promise<CourseDraftView> {
  const origin: CourseDraftView['origin'] = revision.provenance === 'kb-structure'
    ? 'kb-structure'
    : revision.provenance === 'llm-wiki'
      ? 'llm-wiki'
      : 'ai'
  const structureNotes = revision.provenance === 'kb-structure' || revision.provenance === 'llm-wiki'
    ? (revision.changeSummary === undefined ? [] : [revision.changeSummary])
    : []
  const coverage = await services.corpus.buildCourseDraftCoverage(course.id, revision.id)
  if (!coverage.ok) {
    return {
      course,
      revision,
      coverage: [],
      warnings: [`无法读取资料覆盖情况：${coverage.error.message}`],
      origin,
      ...(structureNotes.length > 0 ? { structureNotes } : {}),
    }
  }
  return {
    course,
    revision,
    coverage: coverage.value.coverage,
    warnings: coverage.value.warnings,
    origin,
    ...(structureNotes.length > 0 ? { structureNotes } : {}),
  }
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
    /** Client-generated identity for cancelling an in-flight run. */
    runId?: string
    checks?: readonly { readonly name: string; readonly type: string; readonly value: string | number }[]
  },
): Promise<ExperimentRun> {
  const runId = input.runId ?? `run-${randomUUID().slice(0, 12)}`
  const checks = (input.checks ?? []).flatMap(check => {
    if (check.type !== 'stdout-contains' && check.type !== 'stdout-equals' && check.type !== 'exit-code') return []
    return [{ name: check.name, type: check.type, value: check.value }]
  })
  const builtin = ['python', 'javascript', 'scheme'].includes(input.language)
  if (!builtin) {
    // Extended languages (ruby/lua/deno/...) are prepared and executed by the
    // environment manager; it records the same ExperimentRun shape.
    const run = await services.environments.run({
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
    } as import('@deepseek-teaching/core').RunRequest)
    await services.state.writeJson(runFile(services.state.dataDir, run.id), run)
    return run
  }
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

/** Activity kinds displayed inline in the chat, never as the right-side current activity. */
const CHAT_INLINE_ACTIVITY_KINDS: ReadonlySet<string> = new Set([
  'visual', 'interactive-graph', 'static-figure', 'animation',
])

/** Heuristic: the student explicitly asked for a visual/交互演示. */
function wantsVisual(text: string): boolean {
  return /画(?:一|个|张|幅|出|图|下)|可视化|示意图|图表|动画|svg|mermaid|交互(?:式|图)|拖动|参数(?:滑杆|调节)/iu.test(text)
}

/** Extract the first prose-level visual fence (`sv/h/html/mermaid`) from visible text. */
function extractVisualFence(text: string): { renderer: 'svg' | 'html' | 'mermaid'; source: string } | undefined {
  const match = /```(svg|html|mermaid)[^\n]*\n([\s\S]*?)```/iu.exec(text)
  if (match === null) return undefined
  const source = (match[2] ?? '').trim()
  if (source === '' || source.length > 200_000) return undefined
  if (/<!doctype\s+html|<html[\s>]|<\/html\s*>/iu.test(source)) return undefined
  return { renderer: (match[1] ?? 'svg').toLowerCase() as 'svg' | 'html' | 'mermaid', source }
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
