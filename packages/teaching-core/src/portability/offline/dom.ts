/**
 * Minimal DOM used to render activities at export time.
 *
 * The renderers in `src/render/**` are plain DOM code that accept an injected
 * `Document`. The standalone export runs in Node, so this module provides the
 * exact DOM surface those renderers use (elements, text nodes, attributes,
 * inline styles, form-control properties, an `innerHTML` slot for KaTeX's
 * generated markup and no-op-capable listeners) plus an HTML serializer.
 *
 * It is deliberately not a general DOM: it never executes model-authored HTML,
 * only the markup the renderers and KaTeX produce.
 */

/** Event shape accepted by the shim (only what the renderers/runtime touch). */
export interface OfflineEvent {
  readonly type: string
  readonly target?: unknown
  preventDefault?: () => void
}

type OfflineListener = (event: OfflineEvent) => void

/** Minimal event target so exported widgets can be exercised in tests. */
export class OfflineEventTarget {
  private readonly listeners = new Map<string, Set<OfflineListener>>()

  addEventListener(type: string, listener: OfflineListener, _options?: unknown): void {
    const set = this.listeners.get(type) ?? new Set<OfflineListener>()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: OfflineListener, _options?: unknown): void {
    this.listeners.get(type)?.delete(listener)
  }

  /** Synchronously notify listeners; used by tests and by replayed events. */
  dispatchEvent(event: OfflineEvent): boolean {
    for (const listener of [...(this.listeners.get(event.type) ?? [])]) listener(event)
    return true
  }
}

/** Text node. */
export class OfflineText extends OfflineEventTarget {
  readonly nodeType = 3
  data: string
  parentNode: OfflineElement | null = null

  constructor(data: string) {
    super()
    this.data = data
  }

  get textContent(): string {
    return this.data
  }

  set textContent(value: string) {
    this.data = value
  }
}

/** Attribute-bearing element node. */
export class OfflineElement extends OfflineEventTarget {
  readonly nodeType = 1
  readonly tagName: string
  readonly namespaceURI: string | null
  parentNode: OfflineElement | null = null
  childNodes: (OfflineElement | OfflineText)[] = []
  readonly attributes = new Map<string, string>()
  /** Style declaration kept as a plain object; serialized as a style attribute. */
  readonly style: Record<string, string> = {}
  /** KaTeX writes generated markup here; model text never reaches it. */
  innerHTML = ''
  /** Form-control state used by the renderers. */
  value = ''
  checked = false
  disabled = false
  readonly ownerDocument: OfflineDocument

  constructor(document: OfflineDocument, tagName: string, namespaceURI: string | null) {
    super()
    this.ownerDocument = document
    this.tagName = namespaceURI === null ? tagName.toLowerCase() : tagName
    this.namespaceURI = namespaceURI
  }

  get firstChild(): OfflineElement | OfflineText | null {
    return this.childNodes[0] ?? null
  }

  get children(): OfflineElement[] {
    return this.childNodes.filter((node): node is OfflineElement => node.nodeType === 1)
  }

  appendChild<T extends OfflineElement | OfflineText>(node: T): T {
    node.parentNode = this
    this.childNodes.push(node)
    return node
  }

  removeChild<T extends OfflineElement | OfflineText>(node: T): T {
    const index = this.childNodes.indexOf(node)
    if (index >= 0) this.childNodes.splice(index, 1)
    node.parentNode = null
    return node
  }

  remove(): void {
    this.parentNode?.removeChild(this)
  }

  get textContent(): string {
    return this.childNodes.map((node) => node.textContent).join('')
  }

  set textContent(value: string) {
    for (const child of this.childNodes) child.parentNode = null
    this.childNodes = []
    this.innerHTML = ''
    if (value !== '') this.appendChild(new OfflineText(value))
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value))
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  get className(): string {
    return this.attributes.get('class') ?? ''
  }

  set className(value: string) {
    if (value === '') this.attributes.delete('class')
    else this.attributes.set('class', value)
  }

  get id(): string {
    return this.attributes.get('id') ?? ''
  }

  set id(value: string) {
    this.attributes.set('id', value)
  }

  get title(): string {
    return this.attributes.get('title') ?? ''
  }

  set title(value: string) {
    this.attributes.set('title', value)
  }

  /** Descendants with one tag name (DOM-compatible subset used by the export). */
  getElementsByTagName(tagName: string): OfflineElement[] {
    const wanted = tagName.toLowerCase()
    const found: OfflineElement[] = []
    const walk = (node: OfflineElement): void => {
      for (const child of node.children) {
        if (child.tagName.toLowerCase() === wanted) found.push(child)
        walk(child)
      }
    }
    walk(this)
    return found
  }

  /** Descendants carrying one class token (DOM-compatible subset). */
  getElementsByClassName(className: string): OfflineElement[] {
    const tokens = className.split(/\s+/u).filter(token => token !== '')
    const found: OfflineElement[] = []
    const walk = (node: OfflineElement): void => {
      for (const child of node.children) {
        const classes = child.className.split(/\s+/u).filter(token => token !== '')
        if (tokens.length > 0 && tokens.every(token => classes.includes(token))) found.push(child)
        walk(child)
      }
    }
    walk(this)
    return found
  }
}

/** Fake document with the renderers' required surface. */
export class OfflineDocument {
  readonly documentElement: OfflineElement
  readonly head: OfflineElement
  readonly body: OfflineElement
  readyState = 'complete'
  title = ''

  constructor() {
    this.documentElement = new OfflineElement(this, 'html', null)
    this.head = new OfflineElement(this, 'head', null)
    this.body = new OfflineElement(this, 'body', null)
    this.documentElement.appendChild(this.head)
    this.documentElement.appendChild(this.body)
  }

  createElement(tagName: string): OfflineElement {
    return new OfflineElement(this, tagName, null)
  }

  createElementNS(namespaceURI: string, tagName: string): OfflineElement {
    return new OfflineElement(this, tagName, namespaceURI)
  }

  createTextNode(data: string): OfflineText {
    return new OfflineText(data)
  }

  /** Top-level lookup used by the inline runtime boot (empty in export-only use). */
  getElementsByClassName(className: string): OfflineElement[] {
    return this.body.getElementsByClassName(className)
  }

  getElementsByTagName(tagName: string): OfflineElement[] {
    return this.body.getElementsByTagName(tagName)
  }
}

/** Build a fresh shim document cast to the DOM type the renderers expect. */
export function createOfflineDocument(): Document {
  return new OfflineDocument() as unknown as Document
}

/** Narrow a DOM value back to the shim element. */
export function asOfflineElement(value: unknown): OfflineElement {
  return value as OfflineElement
}

/** Narrow a DOM value back to the shim document. */
export function asOfflineDocument(value: unknown): OfflineDocument {
  return value as OfflineDocument
}

const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/** Escape text content for HTML. */
export function escapeHtmlText(text: string): string {
  return text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
}

/** Escape one HTML attribute value. */
export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

/** Convert a camelCase style property to kebab-case (custom properties unchanged). */
function stylePropertyName(name: string): string {
  if (name.startsWith('--')) return name
  return name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
}

/** Serialize one style object to a CSS declaration string. */
export function serializeStyle(style: Readonly<Record<string, string>>): string {
  const parts: string[] = []
  for (const [name, value] of Object.entries(style)) {
    if (value === '') continue
    parts.push(`${stylePropertyName(name)}:${value}`)
  }
  return parts.join(';')
}

function booleanAttribute(name: string): string {
  return ` ${name}`
}

/** Serialize one shim node to HTML. */
export function serializeNode(node: OfflineElement | OfflineText): string {
  if (node.nodeType === 3) return escapeHtmlText((node as OfflineText).data)
  const element = node as OfflineElement
  const isSvg = element.namespaceURI === SVG_NAMESPACE
  const tag = element.tagName
  const attributes: string[] = []
  for (const [name, value] of element.attributes) {
    attributes.push(` ${name}="${escapeHtmlAttribute(value)}"`)
  }
  const style = serializeStyle(element.style)
  if (style !== '') attributes.push(` style="${escapeHtmlAttribute(style)}"`)
  if (element.disabled) attributes.push(booleanAttribute('disabled'))
  if (element.checked) attributes.push(booleanAttribute('checked'))
  if (element.tagName === 'input' && element.value !== '' && !element.attributes.has('value')) {
    attributes.push(` value="${escapeHtmlAttribute(element.value)}"`)
  }
  const open = `<${tag}${attributes.join('')}`
  if (element.tagName === 'textarea') {
    return `${open}>${escapeHtmlText(element.value)}</textarea>`
  }
  // Inline CSS/JS payloads are authored by this module (never model content):
  // emit their text raw, exactly as a browser would receive it.
  if (element.tagName === 'style' || element.tagName === 'script') {
    return `${open}>${element.textContent}</${tag}>`
  }
  if (!isSvg && HTML_VOID_ELEMENTS.has(element.tagName)) return `${open}>`
  if (isSvg && element.childNodes.length === 0 && element.innerHTML === '') return `${open}/>`
  const inner = element.innerHTML !== '' ? element.innerHTML : serializeChildren(element)
  return `${open}>${inner}</${tag}>`
}

/** Serialize every child of one element. */
export function serializeChildren(element: OfflineElement): string {
  return element.childNodes.map((child) => serializeNode(child)).join('')
}
