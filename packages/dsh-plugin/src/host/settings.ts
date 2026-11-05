/**
 * Plugin-local settings (currently the model override).
 *
 * Kept in `$DSH_HOME/teaching/settings.json` (never in the student's materials).
 * Absent model selection means "follow the Harness deployment default".
 */
import type { LocalState } from '@deepseek-teaching/core'

/** One provider/model/reasoning selection stored by the plugin. */
export interface StoredModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Persisted settings shape; unknown/older fields are ignored. */
export interface TeachingSettings {
  readonly model?: StoredModelSelection
}

const SETTINGS_FILE = 'settings.json'

function isSelection(value: unknown): value is StoredModelSelection {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record['provider'] === 'string' && record['provider'] !== ''
    && typeof record['model'] === 'string' && record['model'] !== ''
    && (record['reasoningEffort'] === undefined || typeof record['reasoningEffort'] === 'string')
}

/** Read/write the plugin settings file with a synchronous in-memory cache. */
export class SettingsStore {
  private readonly state: LocalState
  private cached: TeachingSettings | undefined
  private readonly logger: (message: string, fields?: Record<string, unknown>) => void

  constructor(state: LocalState, logger: (message: string, fields?: Record<string, unknown>) => void = () => undefined) {
    this.state = state
    this.logger = logger
  }

  /** Load once from disk; malformed settings fall back to defaults. */
  async load(): Promise<TeachingSettings> {
    if (this.cached !== undefined) return this.cached
    let value: TeachingSettings = {}
    try {
      const raw = await this.state.readJson<unknown>(SETTINGS_FILE)
      if (typeof raw === 'object' && raw !== null) {
        const model = (raw as Record<string, unknown>)['model']
        if (isSelection(model)) value = { model }
      }
    } catch (cause) {
      this.logger('settings read failed; using defaults', { message: cause instanceof Error ? cause.message : String(cause) })
    }
    this.cached = value
    return value
  }

  /** Current model override without waiting for disk (after `load`). */
  modelOverride(): StoredModelSelection | undefined {
    return this.cached?.model
  }

  /** Replace the stored model override; `undefined` follows the host default. */
  async setModelSelection(selection: StoredModelSelection | undefined): Promise<void> {
    const next: TeachingSettings = selection === undefined ? {} : { model: selection }
    await this.state.writeJson(SETTINGS_FILE, next)
    this.cached = next
  }
}
