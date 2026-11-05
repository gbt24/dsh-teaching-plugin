/**
 * Generalized visual activity renderer: validation, sandbox/CSP policy, Mermaid
 * fallback, DOM mounting and offline serialization.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { VisualPayload } from '../../src/contracts/index.ts'
import {
  VISUAL_CSP_BASE, VISUAL_LIMITS, buildVisualCsp, buildVisualDocument, looksLikeFullHtmlDocument,
  mountVisual, validateVisualPayload, visualSandbox,
} from '../../src/render/index.ts'
import {
  asOfflineElement, createOfflineDocument, serializeNode,
} from '../../src/portability/offline/dom.ts'
import { asShim, createTestDocument } from './dom-shim.ts'

const SVG: VisualPayload = {
  type: 'visual',
  renderer: 'svg',
  source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>',
  title: '示意图',
  caption: '一个圆',
  observe: '圆的半径与直径关系',
  conditions: ['只讨论平面几何', '忽略线宽'],
  height: 240,
}

const HTML_STATIC: VisualPayload = {
  type: 'visual',
  renderer: 'html',
  source: '<div class="demo"><strong>静态</strong>片段</div>',
}

const HTML_INTERACTIVE: VisualPayload = {
  type: 'visual',
  renderer: 'html',
  source: '<button id="b">点我</button><script>document.getElementById("b").onclick=()=>alert(1)</script>',
  interactive: true,
  height: 300,
}

const MERMAID: VisualPayload = {
  type: 'visual',
  renderer: 'mermaid',
  source: 'graph TD; A[开始] --> B[结束]',
  fallbackText: '流程图：开始到结束。',
  title: '流程图',
}

function payload(overrides: Record<string, unknown>): unknown {
  return { type: 'visual', renderer: 'svg', source: '<svg/>', ...overrides }
}

test('validation accepts the three renderers and all documented fields', () => {
  for (const valid of [SVG, HTML_STATIC, HTML_INTERACTIVE, MERMAID]) {
    const result = validateVisualPayload(valid)
    assert.equal(result.ok, true, result.ok ? '' : result.error.message)
  }
  const rich = validateVisualPayload(payload({
    visualType: 'diagram', formula: 'a^2+b^2=c^2', alt: '描述', fallbackText: '文本替代',
  }))
  assert.equal(rich.ok, true)
})

test('validation rejects malformed payloads with actionable messages', () => {
  const cases: readonly { value: unknown; match: RegExp }[] = [
    { value: null, match: /不是对象/u },
    { value: [], match: /不是对象/u },
    { value: { type: 'visual', renderer: 'canvas', source: 'x' }, match: /renderer 必须/u },
    { value: payload({ source: '' }), match: /source 不能为空/u },
    { value: payload({ source: undefined }), match: /source 必须是字符串/u },
    { value: payload({ source: 'x'.repeat(VISUAL_LIMITS.sourceChars + 1) }), match: /source 不能超过/u },
    { value: payload({ source: '<!DOCTYPE html><html><body>x</body></html>' }), match: /完整 HTML 文档/u },
    { value: payload({ source: '<div><html></div>' }), match: /完整 HTML 文档/u },
    { value: payload({ height: 119 }), match: /height 必须在/u },
    { value: payload({ height: 2001 }), match: /height 必须在/u },
    { value: payload({ height: '300' }), match: /height 必须是数字/u },
    { value: payload({ interactive: 'yes' }), match: /interactive 必须是布尔值/u },
    { value: payload({ visualType: 'plot' }), match: /visualType 必须是/u },
    { value: payload({ title: 'x'.repeat(VISUAL_LIMITS.titleChars + 1) }), match: /title 不能超过/u },
    { value: payload({ conditions: ['ok', 42] }), match: /每一项必须是字符串/u },
    { value: payload({ conditions: Array.from({ length: VISUAL_LIMITS.conditionsMax + 1 }, () => 'c') }), match: /最多/u },
    { value: payload({ conditions: ['x'.repeat(VISUAL_LIMITS.conditionChars + 1)] }), match: /每一项不能超过/u },
  ]
  for (const testCase of cases) {
    const result = validateVisualPayload(testCase.value)
    assert.equal(result.ok, false, `expected invalid: ${JSON.stringify(testCase.value)?.slice(0, 80)}`)
    if (!result.ok) assert.match(result.error.message, testCase.match)
  }
})

test('full-document detection covers doctype and html tags in any case', () => {
  assert.equal(looksLikeFullHtmlDocument('<!doctype HTML><p>x</p>'), true)
  assert.equal(looksLikeFullHtmlDocument('<HTML><body>x</body>'), true)
  assert.equal(looksLikeFullHtmlDocument('</html>'), true)
  assert.equal(looksLikeFullHtmlDocument('<div>hello</div>'), false)
  assert.equal(looksLikeFullHtmlDocument('<svg></svg>'), false)
})

test('CSP and sandbox: scripts only for interactive HTML', () => {
  assert.equal(VISUAL_CSP_BASE.includes("script-src"), false)
  assert.equal(visualSandbox(SVG), '')
  assert.equal(visualSandbox(HTML_STATIC), '')
  assert.equal(visualSandbox(HTML_INTERACTIVE), 'allow-scripts')
  assert.equal(buildVisualCsp(SVG).endsWith("script-src 'none'"), true)
  assert.equal(buildVisualCsp(HTML_STATIC).endsWith("script-src 'none'"), true)
  assert.equal(buildVisualCsp(HTML_INTERACTIVE).endsWith("script-src 'unsafe-inline'"), true)
  for (const csp of [buildVisualCsp(SVG), buildVisualCsp(HTML_INTERACTIVE)]) {
    assert.match(csp, /default-src 'none'/u)
    assert.match(csp, /style-src 'unsafe-inline'/u)
    assert.match(csp, /img-src data: blob:/u)
    assert.match(csp, /font-src data:/u)
    assert.match(csp, /connect-src 'none'/u)
    assert.match(csp, /frame-src 'none'/u)
    assert.match(csp, /media-src data: blob:/u)
  }
})

test('built document is self-contained with charset + CSP meta', () => {
  const html = buildVisualDocument(SVG)
  assert.match(html, /^<!DOCTYPE html>/u)
  assert.match(html, /<meta charset="utf-8">/u)
  assert.match(html, /http-equiv="Content-Security-Policy"/u)
  assert.match(html, /name="referrer" content="no-referrer"/u)
  assert.match(html, /<\/html>$/u)
  // The SVG source is embedded inside the iframe document body.
  assert.match(html, /<circle cx="5" cy="5" r="4"/u)
})

test('Mermaid source is shown escaped in a pre with a P2 note, never executed', () => {
  const payloadWithScript: VisualPayload = {
    type: 'visual',
    renderer: 'mermaid',
    source: 'graph TD; A-->B\n<script>alert(1)</script>',
    fallbackText: '图示替代文本',
  }
  const html = buildVisualDocument(payloadWithScript)
  assert.match(html, /Mermaid 源（渲染器待 P2）/u)
  assert.match(html, /<pre class="visual-source">/u)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u)
  assert.equal(html.includes('<script>alert'), false, 'model script must stay escaped')
  assert.match(html, /图示替代文本/u)
  assert.match(html, /script-src &#39;none&#39;/u)
})

test('mountVisual renders text metadata and a sandboxed iframe (no model HTML outside it)', () => {
  const document = createTestDocument()
  const container = document.createElement('div')
  const payloadWithRawHtml: VisualPayload = { ...HTML_STATIC, source: '<b>模型内容</b>' }
  const handle = mountVisual(container, payloadWithRawHtml, { document })
  const wrapper = asShim(handle.element)
  assert.equal(wrapper.childNodes.length > 0, true)

  const iframe = wrapper.childNodes
    .map(node => asShim(node))
    .find(node => node.tagName === 'iframe' && node.namespaceURI === null)
  assert.ok(iframe !== undefined, 'iframe exists')
  assert.equal(iframe.attributes.get('sandbox'), '')
  assert.equal(iframe.attributes.get('title'), '可视化活动')
  assert.equal(iframe.attributes.get('loading'), 'lazy')
  assert.equal(iframe.attributes.get('referrerpolicy'), 'no-referrer')
  assert.match(iframe.attributes.get('srcdoc') ?? '', /^<!DOCTYPE html>/u)
  assert.equal(iframe.style.height, `${VISUAL_LIMITS.defaultHeight}px`)
  assert.equal(iframe.style.width, '100%')

  // Model source appears only inside the iframe srcdoc attribute.
  const wrapperText = wrapper.textContent
  assert.equal(wrapperText.includes('<b>模型内容</b>'), false)
  handle.dispose()
  assert.equal(container.childNodes.length, 0)
})

test('mountVisual renders title, caption, observe, formula and conditions', () => {
  const document = createTestDocument()
  const container = document.createElement('div')
  const payloadWithFormula: VisualPayload = { ...SVG, formula: 'C = 2\\pi r' }
  const handle = mountVisual(container, payloadWithFormula, { document })
  const wrapper = asShim(handle.element)
  const classes = wrapper.childNodes.map(node => asShim(node).attributes.get('class') ?? asShim(node).tagName)
  assert.ok(classes.includes('teaching-visual-title'))
  assert.ok(classes.includes('teaching-visual-caption'))
  assert.ok(classes.includes('teaching-visual-observe'))
  assert.ok(classes.includes('teaching-visual-formula'))
  assert.ok(classes.includes('teaching-visual-conditions'))
  assert.match(wrapper.textContent, /一个圆/u)
  assert.match(wrapper.textContent, /注意观察：圆的半径与直径关系/u)
  assert.match(wrapper.textContent, /只讨论平面几何/u)
})

test('mountVisual reports invalid payloads instead of throwing', () => {
  const document = createTestDocument()
  const container = document.createElement('div')
  const handle = mountVisual(container, payload({ renderer: 'canvas' }) as VisualPayload, { document })
  assert.match(asShim(handle.element).textContent, /可视化无法显示/u)
  assert.equal(asShim(handle.element).attributes.get('data-visual-renderer'), 'canvas')
})

test('offline document serialization keeps srcdoc escaped and works without browser DOM', () => {
  const document = createOfflineDocument()
  const container = document.createElement('div') as never
  const handle = mountVisual(container as never, SVG, { document })
  const serialized = serializeNode(asOfflineElement(container))
  assert.match(serialized, /<div class="teaching-visual"/u)
  assert.match(serialized, /<iframe/u)
  assert.match(serialized, /srcdoc="/u)
  // The srcdoc attribute is escaped by the serializer, so no raw SVG element
  // appears in the host page markup.
  assert.equal(serialized.includes('<svg xmlns'), false)
  assert.match(serialized, /&lt;svg xmlns=/u)
  assert.match(serialized, /sandbox=""|sandbox=''/u)
  handle.dispose()
  assert.equal(serializeNode(asOfflineElement(container)), '<div></div>')
})
