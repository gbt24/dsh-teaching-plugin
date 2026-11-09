/**
 * Width preferences for the two plugin-owned columns.
 *
 * Pure helpers: persistence uses an injected Storage-like object and layout
 * clamping is testable without a browser. The workspace still owns pointer and
 * keyboard gestures.
 */

/** Persisted width pair (pixels). */
export interface PaneWidths {
  readonly left: number
  readonly right: number
}

/** Storage key; separate from the collapse-preference key. */
export const PANE_WIDTHS_STORAGE_KEY = 'ai-teaching:widths'

export const PANE_LIMITS = {
  leftMin: 180,
  leftMax: 420,
  rightMin: 320,
  rightMaxRatio: 0.6,
  chatMin: 320,
  defaultLeft: 232,
  defaultRight: 480,
  /** Two vertical drag handles between the three columns. */
  handles: 12,
} as const

export const DEFAULT_PANE_WIDTHS: PaneWidths = {
  left: PANE_LIMITS.defaultLeft,
  right: PANE_LIMITS.defaultRight,
}

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>

/** Parse persisted widths defensively; malformed data falls back to defaults. */
export function parsePaneWidths(raw: string | null | undefined): PaneWidths {
  if (raw === null || raw === undefined || raw.trim() === '') return DEFAULT_PANE_WIDTHS
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return DEFAULT_PANE_WIDTHS
    const record = value as Record<string, unknown>
    const left = typeof record['left'] === 'number' && Number.isFinite(record['left']) ? record['left'] : DEFAULT_PANE_WIDTHS.left
    const right = typeof record['right'] === 'number' && Number.isFinite(record['right']) ? record['right'] : DEFAULT_PANE_WIDTHS.right
    return clampPaneWidths({ left, right }, Number.POSITIVE_INFINITY)
  } catch {
    return DEFAULT_PANE_WIDTHS
  }
}

/** Read widths from storage, swallowing unavailable/blocked storage. */
export function loadPaneWidths(storage: ReadStorage | undefined): PaneWidths {
  if (storage === undefined) return DEFAULT_PANE_WIDTHS
  try {
    return parsePaneWidths(storage.getItem(PANE_WIDTHS_STORAGE_KEY))
  } catch {
    return DEFAULT_PANE_WIDTHS
  }
}

/** Serialize without throwing. */
export function serializePaneWidths(widths: PaneWidths): string {
  return JSON.stringify({ left: Math.round(widths.left), right: Math.round(widths.right) })
}

/** Persist widths, swallowing unavailable/blocked storage. */
export function savePaneWidths(storage: WriteStorage | undefined, widths: PaneWidths): void {
  if (storage === undefined) return
  try {
    storage.setItem(PANE_WIDTHS_STORAGE_KEY, serializePaneWidths(widths))
  } catch {
    // Storage may be unavailable in private/offline contexts; layout still works.
  }
}

/** Clamp both widths so the chat keeps its minimum and no pane exceeds limits. */
export function clampPaneWidths(widths: PaneWidths, containerWidth: number): PaneWidths {
  const container = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : 1440
  const maxLeft = Math.min(PANE_LIMITS.leftMax, Math.max(PANE_LIMITS.leftMin, container - PANE_LIMITS.chatMin - PANE_LIMITS.rightMin - PANE_LIMITS.handles))
  const left = Math.round(Math.max(PANE_LIMITS.leftMin, Math.min(widths.left, maxLeft)))
  const maxRightByContainer = Math.max(PANE_LIMITS.rightMin, Math.floor(container * PANE_LIMITS.rightMaxRatio))
  const maxRight = Math.max(PANE_LIMITS.rightMin, Math.min(maxRightByContainer, container - left - PANE_LIMITS.chatMin - PANE_LIMITS.handles))
  const right = Math.round(Math.max(PANE_LIMITS.rightMin, Math.min(widths.right, maxRight)))
  return {
    left: Math.max(PANE_LIMITS.leftMin, Math.min(left, maxLeft)),
    right: Math.max(PANE_LIMITS.rightMin, Math.min(right, maxRight)),
  }
}

/** Adjust one pane by a pointer delta or keyboard step, then clamp. */
export function adjustPaneWidth(
  widths: PaneWidths,
  pane: 'left' | 'right',
  delta: number,
  containerWidth: number,
): PaneWidths {
  return clampPaneWidths({
    left: pane === 'left' ? widths.left + delta : widths.left,
    right: pane === 'right' ? widths.right - delta : widths.right,
  }, containerWidth)
}

/** Reset helper used by double-click and Home. */
export function resetPaneWidths(): PaneWidths {
  return DEFAULT_PANE_WIDTHS
}
