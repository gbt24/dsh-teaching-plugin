import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adjustPaneWidth, clampPaneWidths, DEFAULT_PANE_WIDTHS, loadPaneWidths, PANE_LIMITS,
  parsePaneWidths, savePaneWidths, serializePaneWidths,
} from '../../src/client/resize-layout.ts'

test('pane widths parse defensively and clamp to valid ranges', () => {
  assert.deepEqual(parsePaneWidths(null), DEFAULT_PANE_WIDTHS)
  assert.deepEqual(parsePaneWidths('{oops'), DEFAULT_PANE_WIDTHS)
  const parsed = parsePaneWidths(JSON.stringify({ left: 300, right: 600 }))
  assert.equal(parsed.left, 300)
  assert.equal(parsed.right, 600)
  const clamped = clampPaneWidths({ left: 9999, right: 9999 }, 1200)
  assert.equal(clamped.left, PANE_LIMITS.leftMax)
  assert.ok(clamped.right <= Math.floor(1200 * PANE_LIMITS.rightMaxRatio))
})

test('right pane adjustment keeps chat width and clamps at min/max', () => {
  const wide = adjustPaneWidth({ left: 232, right: 500 }, 'right', 40, 1440)
  assert.equal(wide.right, 460)
  const grow = adjustPaneWidth({ left: 232, right: 350 }, 'right', -1000, 1440)
  assert.ok(grow.right <= Math.floor(1440 * PANE_LIMITS.rightMaxRatio))
  const small = adjustPaneWidth({ left: 232, right: 320 }, 'right', 500, 1000)
  assert.equal(small.right, PANE_LIMITS.rightMin)
})

test('left pane adjustment respects min/max and chat minimum', () => {
  const shrunk = adjustPaneWidth({ left: 232, right: 480 }, 'left', -1000, 1440)
  assert.equal(shrunk.left, PANE_LIMITS.leftMin)
  const grown = adjustPaneWidth({ left: 232, right: 480 }, 'left', 1000, 1440)
  assert.equal(grown.left, PANE_LIMITS.leftMax)
})

test('widths persist through a storage-like object and malformed values fall back', () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  savePaneWidths(storage, { left: 300, right: 520 })
  assert.deepEqual(loadPaneWidths(storage), { left: 300, right: 520 })
  assert.equal(serializePaneWidths({ left: 300.4, right: 520.6 }), '{"left":300,"right":521}')
  data.set('ai-teaching:widths', 'not-json')
  assert.deepEqual(loadPaneWidths(storage), DEFAULT_PANE_WIDTHS)
})
