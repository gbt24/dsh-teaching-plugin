import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adjustPaneWidth, DEFAULT_PANE_WIDTHS, loadPaneWidths, PANE_LIMITS, PANE_WIDTHS_STORAGE_KEY,
  parsePaneWidths, resolvePaneWidths, savePaneWidths, serializePaneWidths, shouldCompact,
  visibleHandleCount,
} from '../../src/client/resize-layout.ts'

test('pane widths parse defensively and clamp to the absolute ranges', () => {
  assert.deepEqual(parsePaneWidths(null), DEFAULT_PANE_WIDTHS)
  assert.deepEqual(parsePaneWidths('{oops'), DEFAULT_PANE_WIDTHS)
  const parsed = parsePaneWidths(JSON.stringify({ left: 300, right: 600 }))
  assert.equal(parsed.left, 300)
  assert.equal(parsed.right, 600)
  const clamped = parsePaneWidths(JSON.stringify({ left: 9999, right: 1 }))
  assert.equal(clamped.left, PANE_LIMITS.leftMax)
  assert.equal(clamped.right, PANE_LIMITS.rightMin)
})

test('solver fits a wide preference into a narrow plugin strip', () => {
  const solution = resolvePaneWidths(DEFAULT_PANE_WIDTHS, { containerWidth: 952 })
  // 952 - two 8px handles - 232 left - 280 chat floor = 424.
  assert.equal(solution.left, 232)
  assert.equal(solution.right, 424)
  assert.equal(solution.maxLeft, 232)
  assert.equal(solution.maxRight, 424)
  assert.equal(solution.compact, false)
})

test('collapsing the left column frees its budget for the right column', () => {
  const collapsed = resolvePaneWidths({ left: 232, right: 600 }, {
    containerWidth: 952,
    leftCollapsed: true,
  })
  assert.equal(collapsed.left, 0)
  // 952 - one handle - 280 chat floor = 664, capped by the 60% ratio at 571.
  assert.equal(collapsed.right, 571)
  assert.equal(collapsed.maxRight, 571)
})

test('right-pane adjustment clamps against the chat floor and ratio cap', () => {
  const narrow = adjustPaneWidth({ left: 232, right: 424 }, 'right', 40, { containerWidth: 952 })
  assert.equal(narrow.right, 384)
  // Already at the fitted maximum: dragging left cannot widen the pane.
  const atMax = adjustPaneWidth({ left: 232, right: 424 }, 'right', -40, { containerWidth: 952 })
  assert.equal(atMax.right, 424)

  const wide = adjustPaneWidth({ left: 232, right: 480 }, 'right', -1000, { containerWidth: 1440 })
  assert.equal(wide.right, Math.floor(1440 * PANE_LIMITS.rightMaxRatio))
  const floor = adjustPaneWidth({ left: 232, right: 300 }, 'right', 500, { containerWidth: 952 })
  assert.equal(floor.right, PANE_LIMITS.rightMin)
})

test('left-pane adjustment respects its range and the chat minimum', () => {
  const shrunk = adjustPaneWidth({ left: 232, right: 480 }, 'left', -1000, { containerWidth: 1440 })
  assert.equal(shrunk.left, PANE_LIMITS.leftMin)
  const grown = adjustPaneWidth({ left: 232, right: 480 }, 'left', 1000, { containerWidth: 1440 })
  assert.equal(grown.left, PANE_LIMITS.leftMax)
  const tight = adjustPaneWidth({ left: 232, right: 424 }, 'left', 1000, { containerWidth: 952 })
  assert.equal(tight.left, 232)
})

test('narrow containers shrink the effective widths but keep the preference', () => {
  const preference = { left: 232, right: 480 }
  const narrow = resolvePaneWidths(preference, { containerWidth: 800 })
  assert.equal(narrow.left + narrow.right + PANE_LIMITS.chatMin,
    Math.max(0, 800 - 2 * PANE_LIMITS.handleWidth))
  assert.ok(narrow.right < preference.right)
  // The preference itself is never rewritten by fitting.
  assert.deepEqual(preference, { left: 232, right: 480 })
  const wide = resolvePaneWidths(preference, { containerWidth: 1440 })
  assert.deepEqual({ left: wide.left, right: wide.right }, preference)
})

test('handle count, compact threshold and storage are wired to the new layout', () => {
  assert.equal(visibleHandleCount({ containerWidth: 952 }), 2)
  assert.equal(visibleHandleCount({ containerWidth: 952, leftCollapsed: true }), 1)
  assert.equal(visibleHandleCount({ containerWidth: 952, leftCollapsed: true, rightCollapsed: true }), 0)
  assert.equal(shouldCompact(952), false)
  assert.equal(shouldCompact(PANE_LIMITS.compactWidth - 1), true)

  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
  savePaneWidths(storage, { left: 300, right: 520 })
  assert.deepEqual(loadPaneWidths(storage), { left: 300, right: 520 })
  assert.equal(serializePaneWidths({ left: 300.4, right: 520.6 }), '{"left":300,"right":521}')
  data.set(PANE_WIDTHS_STORAGE_KEY, 'not-json')
  assert.deepEqual(loadPaneWidths(storage), DEFAULT_PANE_WIDTHS)
})
