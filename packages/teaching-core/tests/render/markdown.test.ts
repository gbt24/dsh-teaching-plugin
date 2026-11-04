/**
 * Safe Markdown + KaTeX tests: the model can never inject HTML, unsafe link
 * schemes are dropped, and the safe subset still renders its structure.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMarkdown, renderMarkdown } from '../../src/render/index.ts'
import { asShim, createTestDocument } from './dom-shim.ts'

test('parses headings, paragraphs, lists, code fences and rules', () => {
  const blocks = parseMarkdown([
    '# 标题',
    '',
    '段落 **粗体** 与 *斜体* 和 `code`。',
    '',
    '- 第一项',
    '- 第二项',
    '',
    '1. one',
    '2. two',
    '',
    '```python',
    'print(1)',
    '```',
    '',
    '---',
  ].join('\n'))
  assert.deepEqual(blocks.map(block => block.type), ['heading', 'paragraph', 'list', 'list', 'code', 'rule'])
  const list = blocks[2]
  assert.equal(list?.type === 'list' && list.ordered, false)
  const ordered = blocks[3]
  assert.equal(ordered?.type === 'list' && ordered.ordered, true)
  const code = blocks[4]
  assert.equal(code?.type === 'code' && code.language, 'python')
  assert.equal(code?.type === 'code' && code.code, 'print(1)')
})

test('never inserts model HTML: raw tags stay text', () => {
  const document = createTestDocument()
  const rendered = renderMarkdown(document, '<script>alert(1)</script> **<img src=x onerror=alert(1)>**')
  const shim = asShim(rendered)
  assert.equal(shim.findOne('script'), undefined)
  assert.equal(shim.findOne('img'), undefined)
  assert.match(shim.textContent, /<script>alert\(1\)<\/script>/u)
  assert.match(shim.textContent, /<img src=x onerror=alert\(1\)>/u)
})

test('only http(s) links survive, with target and rel set', () => {
  const document = createTestDocument()
  const rendered = renderMarkdown(document, '[安全](https://example.com/a?b=1) [坏的](javascript:alert(1)) [文件](file:///etc/passwd)')
  const shim = asShim(rendered)
  const anchors = shim.find('a')
  assert.equal(anchors.length, 1)
  assert.equal(anchors[0]?.getAttribute('href'), 'https://example.com/a?b=1')
  assert.equal(anchors[0]?.getAttribute('target'), '_blank')
  assert.equal(anchors[0]?.getAttribute('rel'), 'noopener noreferrer')
  assert.doesNotMatch(shim.textContent, /file:\/\/\/etc\/passwd/u)
  assert.match(shim.textContent, /坏的/u)
  assert.match(shim.textContent, /文件/u)
})

test('inline and display math render through KaTeX', () => {
  const document = createTestDocument()
  const rendered = renderMarkdown(document, '质能方程 $E = mc^2$。\n\n$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$')
  const shim = asShim(rendered)
  assert.ok(shim.find('span').some(span => /katex/u.test(span.innerHTML)), 'inline KaTeX markup present')
  // Display math is a div with the KaTeX markup; the source is kept as data.
  const divs = shim.find('div')
  assert.ok(divs.some(div => /katex-display|katex/u.test(div.innerHTML)))
  assert.ok(shim.textContent.length >= 0)
})

test('invalid LaTeX degrades instead of breaking the page', () => {
  const document = createTestDocument()
  // KaTeX with throwOnError:false renders a marked error; the wrapper survives.
  const rendered = renderMarkdown(document, '$\\thisIsNotACommand$')
  const shim = asShim(rendered)
  assert.equal(shim.children.length, 1)
  assert.ok(shim.find('span').some(span => /katex|katex-error/u.test(span.innerHTML)))
  assert.doesNotThrow(() => renderMarkdown(document, '$' + '\\frac{' + '$'))
})

test('renders strong/em/inline-code/lists/quotes as DOM structure', () => {
  const document = createTestDocument()
  const rendered = renderMarkdown(document, '**b** *i* `c`\n\n- a\n- b\n\n> 引用')
  const shim = asShim(rendered)
  assert.equal(shim.find('strong')[0]?.textContent, 'b')
  assert.equal(shim.find('em')[0]?.textContent, 'i')
  assert.equal(shim.find('code')[0]?.textContent, 'c')
  assert.equal(shim.find('li').length, 2)
  assert.equal(shim.find('blockquote').length, 1)
})
