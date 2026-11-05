/**
 * Generalized visual activities (SVG / HTML / Mermaid source).
 *
 * The source is untrusted model output and is never injected into the plugin
 * DOM. It is placed inside a self-contained `srcdoc` document rendered by a
 * sandboxed iframe with a strict CSP:
 * - scripts are completely disabled for SVG, Mermaid and static HTML;
 * - interactive HTML gets `script-src 'unsafe-inline'` and the iframe gets
 *   `sandbox="allow-scripts"` (no same-origin, forms, popups or navigation);
 * - network access is denied (`default-src 'none'`, `connect-src 'none'`), only
 *   data:/blob: images/fonts/media are allowed.
 *
 * Mermaid execution is not implemented yet (P2): the source is shown in a safe
 * `<pre>` with an explicit "渲染器待 P2" note and the author's fallback text.
 */
import type { VisualPayload } from '../contracts/activity.ts'
import { err, ok, type Result } from '../contracts/result.ts'
import { createElement, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { renderMath } from './math.ts'

/** Hard limits for one visual payload (kept lower than a hostile model could abuse). */
export const VISUAL_LIMITS = {
  sourceChars: 200_000,
  heightMin: 120,
  heightMax: 2_000,
  defaultHeight: 420,
  titleChars: 200,
  captionChars: 500,
  observeChars: 500,
  conditionChars: 300,
  conditionsMax: 12,
  formulaChars: 2_000,
  fallbackChars: 2_000,
  altChars: 500,
} as const

/** Renderers supported by this version. */
export const VISUAL_RENDERERS = ['svg', 'html', 'mermaid'] as const

/** Pedagogical visual kinds accepted by the contract. */
export const VISUAL_TYPES = [
  'diagram', 'flow', 'timeline', 'tree', 'map', 'chart', 'animation', 'interactive', 'other',
] as const

/** Base CSP shared by every visual iframe. */
export const VISUAL_CSP_BASE: string = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
  "frame-src 'none'",
  'media-src data: blob:',
].join('; ')

/** Iframe sandbox value: scripts only for interactive HTML. */
export function visualSandbox(payload: Pick<VisualPayload, 'renderer' | 'interactive'>): string {
  return payload.renderer === 'html' && payload.interactive === true ? 'allow-scripts' : ''
}

/** Full Content-Security-Policy for one payload. */
export function buildVisualCsp(payload: Pick<VisualPayload, 'renderer' | 'interactive'>): string {
  const scriptPolicy = payload.renderer === 'html' && payload.interactive === true
    ? "script-src 'unsafe-inline'"
    : "script-src 'none'"
  return `${VISUAL_CSP_BASE}; ${scriptPolicy}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): Result<never> {
  return err('invalid-input', `可视化活动数据无效：${message}`)
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
  maxChars: number,
): Result<string | undefined> {
  const value = record[field]
  if (value === undefined) return ok(undefined)
  if (typeof value !== 'string') return invalid(`${field} 必须是字符串`)
  if (value.length > maxChars) return invalid(`${field} 不能超过 ${maxChars} 字符`)
  return ok(value)
}

/** True when the source looks like a full HTML document rather than a fragment/SVG. */
export function looksLikeFullHtmlDocument(source: string): boolean {
  return /<!doctype\s+html/iu.test(source) || /<html[\s>]/iu.test(source) || /<\/html\s*>/iu.test(source)
}

/**
 * Validate a visual payload.
 *
 * @returns the payload on success, or an `invalid-input` AppError with a clear
 *          Chinese message (the same shape the other activity validators use).
 */
export function validateVisualPayload(input: unknown): Result<VisualPayload> {
  if (!isRecord(input)) return invalid('payload 不是对象')
  if (input.type !== undefined && input.type !== 'visual') return invalid('type 必须是 visual')
  const renderer = input.renderer
  if (typeof renderer !== 'string' || !(VISUAL_RENDERERS as readonly string[]).includes(renderer)) {
    return invalid(`renderer 必须是 ${VISUAL_RENDERERS.join(' / ')} 之一`)
  }
  const source = input.source
  if (typeof source !== 'string') return invalid('source 必须是字符串')
  if (source.trim() === '') return invalid('source 不能为空')
  if (source.length > VISUAL_LIMITS.sourceChars) {
    return invalid(`source 不能超过 ${VISUAL_LIMITS.sourceChars} 字符`)
  }
  if (looksLikeFullHtmlDocument(source)) {
    return invalid('source 不能是完整 HTML 文档（不要包含 <!DOCTYPE>/<html>）；请提供自包含的片段')
  }
  if (input.visualType !== undefined) {
    if (typeof input.visualType !== 'string' || !(VISUAL_TYPES as readonly string[]).includes(input.visualType)) {
      return invalid(`visualType 必须是 ${VISUAL_TYPES.join(' / ')} 之一`)
    }
  }
  if (input.interactive !== undefined && typeof input.interactive !== 'boolean') {
    return invalid('interactive 必须是布尔值')
  }
  if (input.height !== undefined) {
    if (typeof input.height !== 'number' || !Number.isFinite(input.height)) return invalid('height 必须是数字')
    if (input.height < VISUAL_LIMITS.heightMin || input.height > VISUAL_LIMITS.heightMax) {
      return invalid(`height 必须在 ${VISUAL_LIMITS.heightMin}..${VISUAL_LIMITS.heightMax} 之间`)
    }
  }
  const title = optionalString(input, 'title', VISUAL_LIMITS.titleChars)
  if (!title.ok) return title
  const caption = optionalString(input, 'caption', VISUAL_LIMITS.captionChars)
  if (!caption.ok) return caption
  const observe = optionalString(input, 'observe', VISUAL_LIMITS.observeChars)
  if (!observe.ok) return observe
  const formula = optionalString(input, 'formula', VISUAL_LIMITS.formulaChars)
  if (!formula.ok) return formula
  const fallbackText = optionalString(input, 'fallbackText', VISUAL_LIMITS.fallbackChars)
  if (!fallbackText.ok) return fallbackText
  const alt = optionalString(input, 'alt', VISUAL_LIMITS.altChars)
  if (!alt.ok) return alt
  if (input.conditions !== undefined) {
    if (!Array.isArray(input.conditions)) return invalid('conditions 必须是字符串数组')
    if (input.conditions.length > VISUAL_LIMITS.conditionsMax) {
      return invalid(`conditions 最多 ${VISUAL_LIMITS.conditionsMax} 条`)
    }
    for (const condition of input.conditions) {
      if (typeof condition !== 'string') return invalid('conditions 里的每一项必须是字符串')
      if (condition.length > VISUAL_LIMITS.conditionChars) {
        return invalid(`conditions 的每一项不能超过 ${VISUAL_LIMITS.conditionChars} 字符`)
      }
    }
  }
  return ok(input as unknown as VisualPayload)
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

function escapeHtmlAttribute(text: string): string {
  return escapeHtmlText(text).replace(/\r/gu, '&#13;').replace(/\n/gu, '&#10;')
}

/** Base stylesheet inside the iframe (no network assets). */
const IFRAME_BASE_CSS: string = [
  ':root{color-scheme:light dark}',
  'html,body{margin:0;padding:0}',
  'body{font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC",sans-serif;',
  'font-size:13px;line-height:1.5;color:CanvasText;background:Canvas;padding:8px;box-sizing:border-box}',
  'svg,img,canvas{max-width:100%;height:auto}',
  '.visual-root{max-width:100%;overflow:auto}',
  '.visual-note{font-size:11px;opacity:.7;margin:0 0 6px}',
  '.visual-source{white-space:pre-wrap;word-break:break-word;font-size:12px;',
  'background:rgba(127,127,127,.08);padding:8px;border-radius:6px;margin:0}',
  '*{box-sizing:border-box}',
].join('')

/** Body content for one renderer; Mermaid shows escaped source, never executes. */
function buildVisualBody(payload: VisualPayload): string {
  if (payload.renderer === 'mermaid') {
    const fallback = payload.fallbackText !== undefined && payload.fallbackText !== ''
      ? `<p class="visual-note">${escapeHtmlText(payload.fallbackText)}</p>`
      : ''
    return [
      '<div class="visual-root">',
      '<p class="visual-note">Mermaid 源（渲染器待 P2）：下面显示原始源码，未执行任何 Mermaid 渲染。</p>',
      `<pre class="visual-source">${escapeHtmlText(payload.source)}</pre>`,
      fallback,
      '</div>',
    ].join('')
  }
  // SVG/HTML: the source stays inside the sandboxed iframe. Script execution is
  // controlled by the CSP + sandbox attributes, not by rewriting the model text.
  return `<div class="visual-root">${payload.source}</div>`
}

/**
 * Build the self-contained iframe document for one visual payload.
 *
 * Pure string builder: no DOMParser, no document access, so the same output is
 * usable when the offline exporter serializes `srcdoc` into a standalone page.
 */
export function buildVisualDocument(payload: VisualPayload): string {
  const csp = escapeHtmlAttribute(buildVisualCsp(payload))
  const title = payload.title !== undefined ? escapeHtmlText(payload.title) : '可视化'
  return [
    '<!DOCTYPE html>',
    `<html lang="zh"><head><meta charset="utf-8">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<meta name="referrer" content="no-referrer">`,
    `<style>${IFRAME_BASE_CSS}</style>`,
    `<title>${title}</title>`,
    '</head><body>',
    buildVisualBody(payload),
    '</body></html>',
  ].join('')
}

/** Options for {@link mountVisual}. */
export interface VisualMountOptions extends RenderEnvironment {
  /** When false the activity header (mountActivity) already shows the title. */
  readonly showTitle?: boolean
}

/** Handle returned by {@link mountVisual}. */
export interface VisualHandle {
  readonly element: HTMLElement
  /** Generated iframe document (for tests/export tooling). */
  readonly documentHtml?: string
  dispose(): void
}

/**
 * Mount a visual activity.
 *
 * Only the sandboxed iframe receives the model source; the plugin DOM gets
 * title/caption/observe/formula/conditions as ordinary text nodes and KaTeX.
 * The renderer is plain DOM (works with the offline `OfflineDocument` too):
 * no `DOMParser`, no iframe `onload`, no `innerHTML` of model content.
 */
export function mountVisual(
  container: HTMLElement,
  payload: VisualPayload,
  options: VisualMountOptions = {},
): VisualHandle {
  const document = resolveDocument(options)
  const validation = validateVisualPayload(payload)
  const wrapper = createElement(document, 'div', {
    className: 'teaching-visual',
    attrs: { 'data-visual-renderer': payload.renderer },
  })
  if (!validation.ok) {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-error',
      text: `可视化无法显示：${validation.error.message}`,
      styles: { color: 'var(--dsw-alias-state-error-primary, #b91c1c)', fontSize: '12px' },
    }))
    container.appendChild(wrapper)
    return { element: wrapper, dispose: () => { wrapper.remove() } }
  }
  const valid = validation.value
  const height = valid.height ?? VISUAL_LIMITS.defaultHeight
  if (options.showTitle !== false && valid.title !== undefined && valid.title !== '') {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-title',
      text: valid.title,
      styles: { fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
    }))
  }
  if (valid.caption !== undefined && valid.caption !== '') {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-caption',
      text: valid.caption,
      styles: { fontSize: '12px', opacity: '0.8', marginBottom: '4px' },
    }))
  }
  if (valid.observe !== undefined && valid.observe !== '') {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-observe',
      text: `注意观察：${valid.observe}`,
      styles: { fontSize: '12px', color: 'var(--dsw-alias-state-warn-primary, #b45309)', marginBottom: '4px' },
    }))
  }
  if (valid.formula !== undefined && valid.formula !== '') {
    const formula = createElement(document, 'div', { className: 'teaching-visual-formula' })
    formula.appendChild(renderMath(valid.formula, true, { document }))
    wrapper.appendChild(formula)
  }
  const iframe = createElement(document, 'iframe', {
    className: 'teaching-visual-frame',
    ariaLabel: valid.alt ?? valid.title ?? '可视化活动',
    attrs: {
      sandbox: visualSandbox(valid),
      srcdoc: buildVisualDocument(valid),
      title: valid.alt ?? valid.title ?? '可视化活动',
      loading: 'lazy',
      referrerpolicy: 'no-referrer',
      // Keep the frame from escaping via form submission or top navigation.
      allow: 'fullscreen',
    },
    styles: {
      width: '100%',
      height: `${Math.round(height)}px`,
      border: '0',
      borderRadius: '8px',
      background: 'transparent',
      display: 'block',
    },
  })
  wrapper.appendChild(iframe)
  if (valid.renderer === 'mermaid') {
    wrapper.appendChild(createElement(document, 'p', {
      className: 'teaching-visual-limitation',
      text: 'Mermaid 目前只显示源码，不做实时渲染（渲染器待 P2）。',
      styles: { fontSize: '11px', opacity: '0.65', margin: '4px 0 0' },
    }))
  }
  if (valid.fallbackText !== undefined && valid.fallbackText !== '') {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-fallback',
      text: valid.fallbackText,
      styles: { fontSize: '12px', opacity: '0.75', marginTop: '4px', whiteSpace: 'pre-wrap' },
    }))
  }
  if ((valid.conditions ?? []).length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-visual-conditions-title',
      text: '适用条件与注意',
      styles: { fontWeight: '600', fontSize: '12px', marginTop: '6px' },
    }))
    const list = createElement(document, 'ul', {
      className: 'teaching-visual-conditions',
      styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--dsw-alias-state-warn-primary, #b45309)' },
    })
    for (const condition of valid.conditions ?? []) {
      list.appendChild(createElement(document, 'li', { text: condition }))
    }
    wrapper.appendChild(list)
  }
  container.appendChild(wrapper)
  return {
    element: wrapper,
    documentHtml: buildVisualDocument(valid),
    dispose: () => {
      wrapper.remove()
    },
  }
}
