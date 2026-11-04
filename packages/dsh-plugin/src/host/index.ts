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
import { HarnessModelAdapter } from './model-adapter.ts'
import { MinimalCorpus } from './minimal.ts'
import { registerRoutes } from './routes.ts'
import { TaskManager } from './tasks.ts'

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

  const state = new LocalState({ dataDir, pluginVersion: '0.1.0' })
  const profiles = new ProfileRepository(state)
  const courses = new CourseRepository(state)
  const sessions = new SessionRepository(state)
  const learning = new LearningRepository(state)
  const tasks = new TaskManager(state, logger)
  const corpus = new MinimalCorpus(state)
  const model = new HarnessModelAdapter(ctx, {
    routingSessionId: 'session-teaching-plugin',
    onUsage: entry => {
      void state.appendJsonl('usage/model-usage.jsonl', entry).catch(cause => {
        logger('usage log failed', { message: String(cause) })
      })
    },
    log: logger,
  })

  const ready = (async (): Promise<void> => {
    const meta = await state.open()
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
    tasks,
    corpus,
    profiles,
    courses,
    sessions,
    learning,
    pluginVersion: '0.1.0',
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

  ctx.effect(() => () => {
    void tasks.dispose()
    logger('disposed')
  }, 'ai-teaching: lifetime')
}
