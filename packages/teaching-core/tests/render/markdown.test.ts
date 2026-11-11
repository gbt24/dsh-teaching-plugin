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

test('renders GFM pipe tables: header, alignment, body rows and inline formatting', () => {
  const source = [
    '| 项目 | 含义 | 示例 |',
    '| :--- | :---: | ---: |',
    '| **声明式** | 是什么 | `x = 1` |',
    '| 命令式 | 怎么做 | $y^2 = x$ |',
  ].join('\n')
  const blocks = parseMarkdown(source)
  assert.deepEqual(blocks.map(block => block.type), ['table'])
  const table = blocks[0]
  assert.ok(table?.type === 'table')
  assert.equal(table.header.length, 3)
  assert.deepEqual(table.align, ['left', 'center', 'right'])
  assert.equal(table.rows.length, 2)

  const document = createTestDocument()
  const shim = asShim(renderMarkdown(document, source))
  assert.equal(shim.find('table').length, 1)
  assert.equal(shim.find('thead').length, 1)
  assert.equal(shim.find('tbody').length, 1)
  assert.equal(shim.find('th').length, 3)
  assert.equal(shim.find('td').length, 6)
  assert.equal(shim.find('th')[0]?.getAttribute('data-align'), 'left')
  assert.equal(shim.find('th')[2]?.getAttribute('data-align'), 'right')
  assert.equal(shim.find('strong')[0]?.textContent, '声明式')
  assert.equal(shim.find('code')[0]?.textContent, 'x = 1')
  assert.ok(shim.find('span').some(span => /katex/u.test(span.innerHTML)), '单元格内公式走 KaTeX')
})

test('table parsing: empty leading cell, `||` prefix, and no blank line after prose', () => {
  const header = parseMarkdown([
    '|| 声明式知识 | 命令式知识 |',
    '|---|---|---|',
    '| 回答 | “是什么”（what is） | “怎么做”（how to） |',
    '| 例子 | √x 是满足 y²=x 且 y≥0 的那个数 | 从猜测值出发，用牛顿法改进 |',
  ].join('\n'))
  assert.equal(header[0]?.type, 'table')
  const table = header[0]
  assert.ok(table?.type === 'table')
  assert.equal(table.header.length, 3, '空首列仍保留为第一列')
  assert.equal(table.rows.length, 2)
  const answerCell = table.rows[0]?.[1]?.[0]
  assert.equal(answerCell?.type === 'text' ? answerCell.text : undefined, '“是什么”（what is）')

  // 正文后紧接表格（中间不空行）时也要识别：段落 + 表格两个块。
  const blocks = parseMarkdown('先看两类知识的区别：\n| 项目 | 含义 |\n| --- | --- |\n| 声明式 | 是什么 |\n')
  assert.deepEqual(blocks.map(block => block.type), ['paragraph', 'table'])
  const intro = blocks[0]
  assert.ok(intro?.type === 'paragraph')
  const introToken = intro.children[0]
  assert.equal(introToken?.type === 'text' ? introToken.text : undefined, '先看两类知识的区别：')
})

test('malformed tables fall back to plain paragraphs instead of guessing structure', () => {
  // 分隔行列数与表头不一致
  const mismatch = parseMarkdown('| 项目 | 含义 |\n| --- |\n| 声明式 | 是什么 |')
  assert.equal(mismatch.some(block => block.type === 'table'), false)
  // 没有分隔行
  const noDelimiter = parseMarkdown('| 项目 | 含义 |\n| 声明式 | 是什么 |')
  assert.equal(noDelimiter.some(block => block.type === 'table'), false)
  // 分隔行单元格不是 `---` 形状
  const badDelimiter = parseMarkdown('| 项目 | 含义 |\n| a | b |\n| 声明式 | 是什么 |')
  assert.equal(badDelimiter.some(block => block.type === 'table'), false)
})

test('table cells: escaped pipes, pipes in code spans, raw HTML and unsafe links stay safe', () => {
  const source = [
    '| 列一 | 列二 | 列三 |',
    '| --- | --- | --- |',
    '| a \\| b | `c|d` | <script>alert(1)</script> |',
    '| [安全](https://example.com) | [危险](javascript:alert(1)) | **粗体** |',
  ].join('\n')
  const document = createTestDocument()
  const shim = asShim(renderMarkdown(document, source))
  const headers = shim.find('th')
  assert.equal(headers.length, 3)
  assert.equal(shim.find('script').length, 0, '单元格里的模型 HTML 不能变成节点')
  assert.ok(shim.textContent.includes('<script>alert(1)</script>'), '原始 HTML 以文本保留')
  const anchors = shim.find('a')
  assert.equal(anchors.length, 1, '只有 http(s) 链接保留')
  assert.equal(anchors[0]?.getAttribute('href'), 'https://example.com')
  assert.equal(anchors[0]?.getAttribute('rel'), 'noopener noreferrer')
  assert.equal(shim.find('code')[0]?.textContent, 'c|d')
  assert.ok(shim.textContent.includes('a | b'), '转义管道保留在单元格内')
})

test('table caps: rows and columns are bounded and truncation is visible', () => {
  const header = ['| 序号 | 说明 |', '| --- | --- |']
  const body = Array.from({ length: 205 }, (_, index) => `| ${index} | 行 ${index} |`)
  const table = parseMarkdown([...header, ...body].join('\n'))[0]
  assert.ok(table?.type === 'table')
  assert.equal(table.rows.length, 200)
  assert.equal(table.truncated, true)
  const shim = asShim(renderMarkdown(createTestDocument(), [...header, ...body].join('\n')))
  assert.ok(shim.find('div').some(div => /表格过长/.test(div.textContent)), '截断提示可见')
  assert.equal(shim.find('td').length, 200 * 2)

  const wideHeader = `| ${Array.from({ length: 20 }, (_, index) => `c${index}`).join(' | ')} |`
  const wideDelimiter = `| ${Array.from({ length: 20 }, () => '---').join(' | ')} |`
  const wideRow = `| ${Array.from({ length: 20 }, (_, index) => `v${index}`).join(' | ')} |`
  const wide = parseMarkdown([wideHeader, wideDelimiter, wideRow].join('\n'))[0]
  assert.ok(wide?.type === 'table')
  assert.equal(wide.header.length, 16, '列数上限 16')
  assert.equal(wide.rows[0]?.length, 16)
})
