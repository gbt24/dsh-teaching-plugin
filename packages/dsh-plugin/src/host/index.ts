/**
 * Host entry of the AI knowledge-base teaching plugin.
 *
 * Activates as one Cordis row inside the Harness Host process. It owns:
 * - the local data directory (`$DSH_HOME/teaching`) and its schema;
 * - the model bridge to the student's configured provider;
 * - the `/api/teaching/*` exact Fetch routes used by the client half;
 * - long-task registry, cancellation and restart-interruption reporting.
 *
 * The client half of the same package declares `dsh.client` and renders the
 * left-sidebar entry + central teaching workspace.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CourseRepository, LearningRepository, LocalState, ProfileRepository, SessionRepository,
} from '@deepseek-teaching/core'
import { createCorpusService, DEFAULT_LIMITS, resolveOcrRuntime } from '@deepseek-teaching/core/corpus'
import { createTeachingService } from '@deepseek-teaching/core/teaching'
import { createLearningService, createModelRubricAssessor, rubricFromActivityPayload } from '@deepseek-teaching/core/learning'
import { createRunnerRegistry } from '@deepseek-teaching/core/experiments'
import { createPortabilityService } from '@deepseek-teaching/core/portability'
import { createEnvironmentManager } from '@deepseek-teaching/core/environments'
import type { LearningService } from '@deepseek-teaching/core'
import type { LessonActivity } from '@deepseek-teaching/core'
import { PLUGIN_VERSION } from '../version.ts'
import { HarnessModelAdapter } from './model-adapter.ts'
import { createWebBridge } from './web.ts'
import { registerRoutes } from './routes.ts'
import { TaskManager } from './tasks.ts'
import { SettingsStore } from './settings.ts'

/** Plugin identity shown in logs. */
export const name = 'ai-teaching'

/** Host services this plugin reads; the loader keeps them alive across reloads. */
export const inject = ['connection', 'llm', 'agentDefaultModel']

/** Plugin configuration (profile patch may override). */
export interface Config {
  /** Data directory; defaults to `$DSH_HOME/teaching`. */
  readonly dataDir?: string
  /** External exporter command placeholder (T07). */
  readonly [key: string]: unknown
}

interface HostContext {
  connection: ConstructorParameters<typeof HarnessModelAdapter>[0] extends never ? never : {
    fetch: {
      register(route: {
        path: string
        methods: readonly ('GET' | 'HEAD' | 'POST')[]
        requestBody: 'buffered' | 'streaming'
        fetch: (request: Request) => Promise<Response>
      }): () => Promise<void>
    }
  }
  llm: ConstructorParameters<typeof HarnessModelAdapter>[0]['llm']
  agentDefaultModel: ConstructorParameters<typeof HarnessModelAdapter>[0]['agentDefaultModel']
  get(serviceName: string): unknown
  effect(callback: () => () => void, label?: string): void
}

/** Resolve the local data directory without ever writing next to student files. */
export function resolveDataDir(config: Config): string {
  const overridden = typeof config.dataDir === 'string' && config.dataDir.trim() !== '' ? config.dataDir.trim() : undefined
  if (overridden !== undefined) return overridden
  const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  return join(home, 'teaching')
}

/** Plugin bootstrap. */
export function apply(ctx: HostContext, config: Config = {}): void {
  const dataDir = resolveDataDir(config)
  const logger = (message: string, fields?: Record<string, unknown>): void => {
    console.log(`[ai-teaching] ${message}`, fields === undefined ? '' : JSON.stringify(fields))
  }

  const state = new LocalState({ dataDir, pluginVersion: PLUGIN_VERSION })
  const profiles = new ProfileRepository(state)
  const courses = new CourseRepository(state)
  const sessions = new SessionRepository(state)
  const learning = new LearningRepository(state)
  const tasks = new TaskManager(state, logger)
  const web = createWebBridge(ctx)
  // Teaching turns are long-form: give the model room for reasoning + text.
  const teaching = createTeachingService({ maxTokens: 12000 })
  const experiments = createRunnerRegistry({ dataDir })
  const environments = createEnvironmentManager({ dataDir, runners: experiments, logger: (event, details) => logger(event, details) })
  const settings = new SettingsStore(state, (message, fields) => logger(message, fields))
  const usageBySession = new Map<string, import('@deepseek-teaching/core').UsageEntry>()
  /** Latest settled usage per session; not consumed by chat (context meter reads it). */
  const lastUsageBySession = new Map<string, import('@deepseek-teaching/core').UsageEntry>()
  const model = new HarnessModelAdapter(ctx, {
    routingSessionId: 'session-teaching-plugin',
    onUsage: entry => {
      if (entry.sessionId !== undefined) {
        usageBySession.set(entry.sessionId, entry)
        lastUsageBySession.set(entry.sessionId, entry)
      }
      void state.appendJsonl('usage/model-usage.jsonl', entry).catch(cause => {
        logger('usage log failed', { message: String(cause) })
      })
    },
    selectionOverride: () => settings.modelOverride(),
    log: logger,
  })

  /** Portability: backup/restore, record export/delete/reset, offline HTML export. */
  const portability = createPortabilityService({
    state,
    courses,
    sessions,
    learning,
    profiles,
    pluginVersion: PLUGIN_VERSION,
    appVersion: '0.2.2-rc.1',
  })

  // OCR capability is reported from the real host toolchain (tesseract +
  // language packs); it is not assumed and not hardcoded off.
  const ocrState: { available: boolean; reason: string; languages: readonly string[]; checked: boolean } = {
    available: false, reason: '尚未检测', languages: [], checked: false,
  }
  const ensureOcr = async (): Promise<typeof ocrState> => {
    if (ocrState.checked) return ocrState
    try {
      const runtime = await resolveOcrRuntime(undefined, DEFAULT_LIMITS)
      ocrState.available = runtime.available
      ocrState.reason = runtime.reason
      ocrState.languages = runtime.languages
    } catch (cause) {
      ocrState.reason = `OCR 能力检测失败：${cause instanceof Error ? cause.message : String(cause)}`
    }
    ocrState.checked = true
    logger('ocr capability', { available: ocrState.available, reason: ocrState.reason, languages: ocrState.languages })
    return ocrState
  }

  /** Corpus service: parsing, retrieval, course drafts, change detection. */
  const corpus = createCorpusService({
    state,
    courses,
    learning,
    model,
    logger: event => logger(`corpus ${event.level}: ${event.message}`, event.details),
  })

  /**
   * Build a learning service for one attempt. The activity is captured so the
   * rubric resolver can read the exact payload the student answered against.
   */
  const createLearningFor = (activity?: LessonActivity): LearningService => createLearningService({
    repository: learning,
    resolveRevisionId: async courseId => {
      const course = await courses.get(courseId)
      if (course?.activeRevisionId !== undefined) return course.activeRevisionId
      const revisions = await courses.listRevisions(courseId)
      return revisions.at(-1)?.id
    },
    upcomingConceptIds: async courseId => {
      const course = await courses.get(courseId)
      if (course?.activeRevisionId === undefined) return []
      const revision = await courses.getRevision(courseId, course.activeRevisionId)
      return revision?.sequence ?? []
    },
    rubric: {
      resolve: () => (activity === undefined ? undefined : rubricFromActivityPayload(activity.payload)),
      assess: createModelRubricAssessor(model),
    },
  })

  /** Usage of the most recent completed model call in a session, if reported. */
  const takeUsage = (sessionId: string): import('@deepseek-teaching/core').UsageEntry | undefined => {
    const entry = usageBySession.get(sessionId)
    usageBySession.delete(sessionId)
    return entry
  }

  const ready = (async (): Promise<void> => {
    const meta = await state.open()
    await settings.load()
    await profiles.get()
    const recovered = await tasks.recoverInterrupted()
    if (recovered.length > 0) logger('recovered interrupted tasks', { count: recovered.length })
    logger('ready', { dataDir, schemaVersion: meta.schemaVersion, installationId: meta.installationId })
  })()
  ready.catch(cause => logger('bootstrap failed', { message: cause instanceof Error ? cause.message : String(cause) }))

  registerRoutes({
    ctx: ctx as never,
    state,
    model,
    web,
    tasks,
    corpus,
    teaching,
    experiments,
    environments,
    portability,
    createLearningFor,
    takeUsage,
    lastUsage: sessionId => lastUsageBySession.get(sessionId),
    settings,
    defaultModelSelection: () => ctx.agentDefaultModel.currentSelection(),
    invalidateModelInfo: () => model.invalidateInfo(),
    modelCatalog: {
      listProviders: async () => {
        const llm = (ctx as unknown as { llm: { listProviders?: () => unknown; listModels?: (provider: string) => Promise<unknown>; resolveModelInfo?: (provider: string, model: string) => Promise<unknown> } }).llm
        if (llm?.listProviders === undefined) return []
        const providers = llm.listProviders() as { id?: unknown; name?: unknown }[]
        return Array.isArray(providers)
          ? providers.map(provider => ({ id: String(provider.id ?? ''), name: String(provider.name ?? provider.id ?? '') })).filter(provider => provider.id !== '')
          : []
      },
      listModels: async (provider: string) => {
        const llm = (ctx as unknown as { llm: { listModels?: (provider: string) => Promise<unknown> } }).llm
        if (llm?.listModels === undefined) return []
        return await llm.listModels(provider) as never
      },
      resolveModelInfo: async (provider: string, model: string) => {
        const llm = (ctx as unknown as { llm: { resolveModelInfo?: (provider: string, model: string) => Promise<unknown> } }).llm
        if (llm?.resolveModelInfo === undefined) return undefined
        const info = await llm.resolveModelInfo(provider, model)
        return typeof info === 'object' && info !== null ? info as Record<string, unknown> : undefined
      },
    },
    getOcrInfo: () => ensureOcr(),
    profiles,
    courses,
    sessions,
    learning,
    pluginVersion: PLUGIN_VERSION,
    dataDir,
    logger,
    hostFacts: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      profile: process.env.DSH_PROFILE,
    },
    ready,
  })

  ready.then(() => environments.cleanupStale()).catch(cause => {
    logger('environment cleanup failed', { message: cause instanceof Error ? cause.message : String(cause) })
  })

  ready.then(() => experiments.cleanupStale()).catch(cause => {
    logger('experiment cleanup failed', { message: cause instanceof Error ? cause.message : String(cause) })
  })

  ctx.effect(() => () => {
    void tasks.dispose()
    void experiments.dispose()
    void environments.dispose()
    logger('disposed')
  }, 'ai-teaching: lifetime')
}
