/**
 * Width preferences for the two plugin-owned columns.
 *
 * Pure helpers: persistence uses an injected Storage-like object and the
 * layout solve is testable without a browser. The workspace still owns
 * pointer/keyboard gestures and observes its own width.
 *
 * Two values are deliberately kept apart:
 * - the *preference*, what the user last asked for (persisted);
 * - the *solution*, the effective widths after fitting the visible columns and
 *   the chat floor into the current container width (never persisted).
 * Clamping only the solution means a narrow window no longer destroys a wide
 * preference; it comes back when the window grows again.
 */

/** Persisted width pair (pixels). */
export interface PaneWidths {
  readonly left: number
  readonly right: number
}

/** Storage key; bumped so values clamped by the old solver are not inherited. */
export const PANE_WIDTHS_STORAGE_KEY = 'ai-teaching:widths:v2'

export const PANE_LIMITS = {
  leftMin: 180,
  leftMax: 420,
  rightMin: 280,
  rightMaxRatio: 0.6,
  /** The chat column is the flexible middle column and keeps this floor. */
  chatMin: 280,
  defaultLeft: 232,
  defaultRight: 480,
  /** Width of one vertical drag handle (px). */
  handleWidth: 8,
  /** Below this container width the columns stack instead of squeezing. */
  compactWidth: 780,
  /** Last-resort right-pane floor when the container cannot hold the minima. */
  rightHardMin: 240,
} as const

export const DEFAULT_PANE_WIDTHS: PaneWidths = {
  left: PANE_LIMITS.defaultLeft,
  right: PANE_LIMITS.defaultRight,
}

/** Where (and how wide) the plugin columns are laid out. */
export interface PaneLayoutInput {
  readonly containerWidth: number
  readonly leftCollapsed?: boolean
  readonly rightCollapsed?: boolean
}

/** Effective column widths plus the travel limits of the visible handles. */
export interface PaneLayout {
  readonly left: number
  readonly right: number
  readonly maxLeft: number
  readonly maxRight: number
  readonly compact: boolean
}

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem'>

/** Parsed preferences are clamped to the absolute pane ranges. */
const MAX_PREFERENCE = 2400

function finiteContainer(width: number): number {
  return Number.isFinite(width) && width > 0 ? width : 1440
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Whether the three-column strip must stack instead of squeezing the chat. */
export function shouldCompact(containerWidth: number): boolean {
  return finiteContainer(containerWidth) < PANE_LIMITS.compactWidth
}

/** Drag handles the workspace renders: one per visible plugin column. */
export function visibleHandleCount(input: PaneLayoutInput): number {
  return (input.leftCollapsed === true ? 0 : 1) + (input.rightCollapsed === true ? 0 : 1)
}

/** Parse persisted widths defensively; malformed data falls back to defaults. */
export function parsePaneWidths(raw: string | null | undefined): PaneWidths {
  if (raw === null || raw === undefined || raw.trim() === '') return DEFAULT_PANE_WIDTHS
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return DEFAULT_PANE_WIDTHS
    const record = value as Record<string, unknown>
    const rawLeft = typeof record['left'] === 'number' && Number.isFinite(record['left'])
      ? record['left']
      : DEFAULT_PANE_WIDTHS.left
    const rawRight = typeof record['right'] === 'number' && Number.isFinite(record['right'])
      ? record['right']
      : DEFAULT_PANE_WIDTHS.right
    return {
      left: Math.round(clampNumber(rawLeft, PANE_LIMITS.leftMin, PANE_LIMITS.leftMax)),
      right: Math.round(clampNumber(rawRight, PANE_LIMITS.rightMin, MAX_PREFERENCE)),
    }
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

/**
 * Fit the preference into the current container.
 *
 * Only visible columns are charged for, the two rendered handles are counted
 * individually and the chat keeps its floor; the right pane gives up its width
 * first when space runs out, then the left pane.
 */
export function resolvePaneWidths(preference: PaneWidths, input: PaneLayoutInput): PaneLayout {
  const container = finiteContainer(input.containerWidth)
  const leftVisible = input.leftCollapsed !== true
  const rightVisible = input.rightCollapsed !== true
  const compact = shouldCompact(container)
  const available = Math.max(
    0,
    container - (compact ? 0 : visibleHandleCount(input) * PANE_LIMITS.handleWidth),
  )
  const ratioCap = Math.max(PANE_LIMITS.rightMin, Math.floor(container * PANE_LIMITS.rightMaxRatio))

  let left = leftVisible
    ? Math.round(clampNumber(preference.left, PANE_LIMITS.leftMin, PANE_LIMITS.leftMax))
    : 0
  let right = rightVisible
    ? Math.round(clampNumber(preference.right, PANE_LIMITS.rightMin, Math.min(ratioCap, MAX_PREFERENCE)))
    : 0

  let overflow = left + right + PANE_LIMITS.chatMin - available
  if (overflow > 0) {
    const cutRight = Math.min(overflow, Math.max(0, right - PANE_LIMITS.rightMin))
    right -= cutRight
    overflow -= cutRight
  }
  if (overflow > 0) {
    const cutLeft = Math.min(overflow, Math.max(0, left - PANE_LIMITS.leftMin))
    left -= cutLeft
    overflow -= cutLeft
  }
  if (overflow > 0 && rightVisible) {
    right = Math.max(PANE_LIMITS.rightHardMin, right - overflow)
  }

  const maxLeft = leftVisible
    ? Math.min(
      PANE_LIMITS.leftMax,
      Math.max(PANE_LIMITS.leftMin, available - right - PANE_LIMITS.chatMin),
    )
    : 0
  const maxRight = rightVisible
    ? Math.max(right, Math.min(ratioCap, available - left - PANE_LIMITS.chatMin))
    : 0

  return { left, right, maxLeft, maxRight, compact }
}

/**
 * Adjust one pane by a pointer delta or keyboard step against the *effective*
 * widths, then fit the result back into the container.
 *
 * A positive `delta` means the pointer/keyboard moved right: the left pane
 * grows, the right pane shrinks.
 */
export function adjustPaneWidth(
  widths: PaneWidths,
  pane: 'left' | 'right',
  delta: number,
  input: PaneLayoutInput,
): PaneWidths {
  const layout = resolvePaneWidths(widths, input)
  const container = finiteContainer(input.containerWidth)
  const leftVisible = input.leftCollapsed !== true
  const rightVisible = input.rightCollapsed !== true
  const available = Math.max(
    0,
    container - (layout.compact ? 0 : visibleHandleCount(input) * PANE_LIMITS.handleWidth),
  )
  const ratioCap = Math.max(PANE_LIMITS.rightMin, Math.floor(container * PANE_LIMITS.rightMaxRatio))

  if (pane === 'left') {
    if (!leftVisible) return widths
    const max = Math.max(
      PANE_LIMITS.leftMin,
      Math.min(PANE_LIMITS.leftMax, available - (rightVisible ? layout.right : 0) - PANE_LIMITS.chatMin),
    )
    const next = Math.round(clampNumber(layout.left + delta, PANE_LIMITS.leftMin, max))
    const solved = resolvePaneWidths({ left: next, right: layout.right }, input)
    return { left: solved.left, right: solved.right }
  }
  if (!rightVisible) return widths
  const max = Math.max(
    PANE_LIMITS.rightMin,
    Math.min(ratioCap, available - (leftVisible ? layout.left : 0) - PANE_LIMITS.chatMin),
  )
  const next = Math.round(clampNumber(layout.right - delta, PANE_LIMITS.rightMin, max))
  const solved = resolvePaneWidths({ left: layout.left, right: next }, input)
  return { left: solved.left, right: solved.right }
}

/** Reset helper used by double-click and Home. */
export function resetPaneWidths(): PaneWidths {
  return DEFAULT_PANE_WIDTHS
}
