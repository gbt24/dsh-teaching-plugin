/**
 * Tiny DOM helpers shared by every renderer.
 *
 * The renderers are plain DOM code (no React) so the same payload renders in
 * the Harness workspace and in a standalone offline HTML page. They receive the
 * `Document` explicitly, which also lets the tests drive a minimal DOM shim.
 */

/** Options base that carries the owning document. */
export interface RenderEnvironment {
  /** Document used to create every node; defaults to the global document. */
  readonly document?: Document
}

/** Resolve the document or fail with an actionable message. */
export function resolveDocument(environment: RenderEnvironment | undefined): Document {
  if (environment?.document !== undefined) return environment.document
  const globalDocument = (globalThis as { document?: Document }).document
  if (globalDocument !== undefined) return globalDocument
  throw new Error('渲染器需要 Document；浏览器内使用全局 document，测试/离线生成时通过 options.document 注入。')
}

/** Attribute bag accepted by the element helpers. */
export interface ElementOptions {
  readonly text?: string
  readonly className?: string
  readonly title?: string
  readonly styles?: Readonly<Record<string, string>>
  readonly attrs?: Readonly<Record<string, string>>
  /** Accessible name; buttons/labels always need one in the teaching UI. */
  readonly ariaLabel?: string
}

/** Create an HTML element with text/attributes/styles in one call. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (options.className !== undefined) element.className = options.className
  if (options.title !== undefined) element.setAttribute('title', options.title)
  if (options.ariaLabel !== undefined) element.setAttribute('aria-label', options.ariaLabel)
  if (options.styles !== undefined) applyStyles(element, options.styles)
  if (options.attrs !== undefined) {
    for (const [name, value] of Object.entries(options.attrs)) element.setAttribute(name, value)
  }
  if (options.text !== undefined) element.textContent = options.text
  return element
}

/** Create an SVG element in the SVG namespace. */
export function createSvgElement(
  document: Document,
  tag: string,
  attrs: Readonly<Record<string, string | number>> = {},
): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value))
  return element
}

/** Apply inline styles (kept as CSS custom properties where the theme needs them). */
export function applyStyles(element: HTMLElement | SVGElement, styles: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(styles)) {
    ;(element.style as unknown as Record<string, string>)[name] = value
  }
}

/** Replace all children of an element. */
export function clearElement(element: HTMLElement | SVGElement): void {
  while (element.firstChild !== null) element.removeChild(element.firstChild)
}

/** Append a mix of nodes and strings to a parent. */
export function appendAll(parent: Node, children: readonly (Node | string)[]): void {
  for (const child of children) {
    parent.appendChild(typeof child === 'string' ? (parent.ownerDocument ?? resolveOwner(parent)).createTextNode(child) : child)
  }
}

/** Owner document fallback for shims that do not model ownerDocument. */
function resolveOwner(node: Node): Document {
  const doc = (node.ownerDocument ?? (globalThis as { document?: Document }).document)
  if (doc === undefined) throw new Error('节点没有所属 Document')
  return doc
}

/** Append a text node with `textContent` semantics. */
export function textNode(document: Document, content: string): Text {
  return document.createTextNode(content)
}

/** Register a listener and return its disposer. */
export function on(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  type: string,
  listener: (event: Event) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(type, listener, options)
  return () => { target.removeEventListener(type, listener, options) }
}

/** Remove an element from its parent when attached. */
export function removeElement(element: Element): void {
  if (typeof element.remove === 'function') {
    element.remove()
    return
  }
  element.parentNode?.removeChild(element)
}

/** Number formatting for axes and slider readouts (no locale-dependent noise). */
export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  const rounded = Number(value.toFixed(digits))
  return String(rounded)
}

/** Colour tokens from the activity contract mapped to concrete colours. */
export const PLOT_COLORS: Readonly<Record<string, string>> = {
  blue: '#3b82f6',
  orange: '#f59e0b',
  green: '#22c55e',
  purple: '#a855f7',
  red: '#ef4444',
  gray: '#94a3b8',
}

/** Resolve a plot colour token, defaulting by series index. */
export function plotColor(token: string | undefined, index: number): string {
  const fallback = ['blue', 'orange', 'green', 'purple', 'red', 'gray'][index % 6] ?? 'blue'
  return PLOT_COLORS[token ?? fallback] ?? PLOT_COLORS.blue ?? '#3b82f6'
}
