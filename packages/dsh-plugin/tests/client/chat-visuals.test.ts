/**
 * Pure tests for chat visual fence detection (safe preview cards).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractChatVisualFences } from '../../src/client/chat-visuals.ts'

test('extracts svg, html and mermaid fences with their source', () => {
  const text = [
    '前面是讲解。',
    '```svg',
    '<svg><circle r="1"/></svg>',
    '```',
    '中间文字。',
    '```html',
    '<div class="x">片段</div>',
    '```',
    '```mermaid',
    'graph TD; A-->B',
    '```',
  ].join('\n')
  const fences = extractChatVisualFences(text)
  assert.deepEqual(fences.map(fence => fence.renderer), ['svg', 'html', 'mermaid'])
  assert.deepEqual(fences.map(fence => fence.index), [0, 1, 2])
  assert.equal(fences[0]?.source.trim(), '<svg><circle r="1"/></svg>')
  assert.equal(fences[2]?.source.trim(), 'graph TD; A-->B')
})

test('fence language matching is case-insensitive and tolerates spaces', () => {
  const fences = extractChatVisualFences('```SVG\n<svg/>\n```\n``` html \n<p>x</p>\n```')
  assert.deepEqual(fences.map(fence => fence.renderer), ['svg', 'html'])
})

test('ignores other languages, malformed fences, empty and oversized sources', () => {
  assert.deepEqual(extractChatVisualFences('no fences here'), [])
  assert.deepEqual(extractChatVisualFences('```js\nconsole.log(1)\n```'), [])
  assert.deepEqual(extractChatVisualFences('```svg\n```'), [])
  assert.deepEqual(extractChatVisualFences('```svg\n   \n```'), [])
  // Unterminated fence is not a preview.
  assert.deepEqual(extractChatVisualFences('```svg\n<svg/>'), [])
  // Oversized source is skipped instead of creating a huge iframe document.
  const oversized = `\`\`\`svg\n${'x'.repeat(200_001)}\n\`\`\``
  assert.deepEqual(extractChatVisualFences(oversized), [])
})

test('caps preview cards per message at three', () => {
  const many = Array.from({ length: 5 }, (_, index) => `\`\`\`svg\n<svg id="${index}"/>\n\`\`\``).join('\n')
  const fences = extractChatVisualFences(many)
  assert.equal(fences.length, 3)
  assert.deepEqual(fences.map(fence => fence.index), [0, 1, 2])
})

test('nested details/source text is preserved verbatim in the fence source', () => {
  const source = '<div><p>line 1</p>\n<p>line 2</p></div>'
  const fences = extractChatVisualFences(`说明\n\`\`\`html\n${source}\n\`\`\`\n尾注`)
  assert.equal(fences[0]?.source.trim(), source)
})
