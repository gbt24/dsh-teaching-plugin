/**
 * Layout preferences for the teaching workspace columns (pure, no React).
 *
 * The plugin's own left Sidebar (course navigation) and right TeachingArea can
 * be collapsed independently; the preference is persisted in localStorage so a
 * refresh keeps the chosen layout. The Harness outer sidebar is untouched.
 */

/** Collapse state of the two plugin-owned columns. */
export interface LayoutPrefs {
  readonly leftCollapsed: boolean
  readonly rightCollapsed: boolean
}

/** localStorage key owned by the teaching client. */
export const LAYOUT_STORAGE_KEY = 'ai-teaching:layout'

/** Both columns visible. */
export const DEFAULT_LAYOUT_PREFS: LayoutPrefs = { leftCollapsed: false, rightCollapsed: false }

/** Minimal storage surface so tests can inject a fake localStorage. */
export interface LayoutStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Parse persisted preferences leniently; corrupt/partial data falls back to defaults. */
export function parseLayoutPrefs(raw: string | null | undefined): LayoutPrefs {
  if (raw === null || raw === undefined || raw.trim() === '') return DEFAULT_LAYOUT_PREFS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return DEFAULT_LAYOUT_PREFS
    const record = parsed as { leftCollapsed?: unknown; rightCollapsed?: unknown }
    return {
      leftCollapsed: typeof record.leftCollapsed === 'boolean' ? record.leftCollapsed : false,
      rightCollapsed: typeof record.rightCollapsed === 'boolean' ? record.rightCollapsed : false,
    }
  } catch {
    return DEFAULT_LAYOUT_PREFS
  }
}

/** Serialize the preference for localStorage. */
export function serializeLayoutPrefs(prefs: LayoutPrefs): string {
  return JSON.stringify({ leftCollapsed: prefs.leftCollapsed, rightCollapsed: prefs.rightCollapsed })
}

/** Browser localStorage when available (guarded for SSR/tests). */
function defaultStorage(): LayoutStorage | undefined {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return undefined
    return window.localStorage
  } catch {
    return undefined
  }
}

/** Restore preferences from storage; missing/corrupt values use the defaults. */
export function loadLayoutPrefs(storage: LayoutStorage | undefined = defaultStorage()): LayoutPrefs {
  if (storage === undefined) return DEFAULT_LAYOUT_PREFS
  try {
    return parseLayoutPrefs(storage.getItem(LAYOUT_STORAGE_KEY))
  } catch {
    return DEFAULT_LAYOUT_PREFS
  }
}

/** Persist preferences; storage failures are non-fatal. */
export function saveLayoutPrefs(prefs: LayoutPrefs, storage: LayoutStorage | undefined = defaultStorage()): void {
  if (storage === undefined) return
  try {
    storage.setItem(LAYOUT_STORAGE_KEY, serializeLayoutPrefs(prefs))
  } catch {
    // Quota/privacy-mode failures must not break the workspace.
  }
}
