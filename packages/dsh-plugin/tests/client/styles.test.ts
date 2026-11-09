import test from 'node:test'
import assert from 'node:assert/strict'
import { TEACHING_CSS } from '../../src/client/styles.ts'

/** Body of the first rule with exactly this selector. */
function ruleBody(selector: string): string {
  const start = TEACHING_CSS.indexOf(`${selector} {`)
  assert.notEqual(start, -1, `missing rule: ${selector}`)
  const end = TEACHING_CSS.indexOf('}', start)
  return TEACHING_CSS.slice(start, end)
}

test('teaching root starts at the frame top edge (no top clearance band)', () => {
  const body = ruleBody('.ai-teaching-root')
  // The Harness only expects entry pages to pad below the window top strip;
  // painting the root's clearance band showed up as a black strip over the bar.
  assert.match(body, /padding-top:\s*0/)
  assert.doesNotMatch(body, /--dsh-frame-top-clearance/)
})

test('top bar clears the leading window-chrome band inline, not vertically', () => {
  const body = ruleBody('.ai-teaching-topbar')
  assert.match(body, /padding-left:\s*max\(14px, var\(--dsh-frame-leading-clearance, 0px\)\)/)
  // The previous loop subtracted an extra 56px and still landed under the seat.
  assert.doesNotMatch(body, /- 56px/)
})
