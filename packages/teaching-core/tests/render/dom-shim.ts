/**
 * Minimal DOM implementation for renderer tests.
 *
 * The renderers accept an injected `Document`; this shim implements exactly the
 * API the renderers use (nodes, attributes, styles, listeners, a textarea value
 * and an `innerHTML` slot for KaTeX's generated markup). It is deliberately not
 * a general DOM: it keeps the tests dependency-free and makes DOM writes
 * observable.
 */

type Listener = (event: { type: string; target?: unknown }) => void

class ShimEventTarget {
  private readonly listeners = new Map<string, Set<Listener>>()

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: { type: string; target?: unknown }): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event)
    return true
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0
  }
}

/** Text node. */
export class ShimText extends ShimEventTarget {
  readonly nodeType = 3
  data: string
  parentNode: ShimElement | null = null

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
export class ShimElement extends ShimEventTarget {
  readonly nodeType = 1
  readonly tagName: string
  readonly namespaceURI: string | null
  parentNode: ShimElement | null = null
  childNodes: (ShimElement | ShimText)[] = []
  readonly attributes = new Map<string, string>()
  /** Style declaration is a plain object so tests can assert values. */
  readonly style: Record<string, string> = {}
  /** KaTeX writes generated markup here; model HTML never reaches it. */
  innerHTML = ''
  /** Form-control state used by the renderers. */
  value = ''
  checked = false
  disabled = false
  readonly ownerDocument: ShimDocument

  constructor(document: ShimDocument, tagName: string, namespaceURI: string | null) {
    super()
    this.ownerDocument = document
    this.tagName = namespaceURI === null ? tagName.toLowerCase() : tagName
    this.namespaceURI = namespaceURI
  }

  get firstChild(): ShimElement | ShimText | null {
    return this.childNodes[0] ?? null
  }

  get children(): ShimElement[] {
    return this.childNodes.filter((node): node is ShimElement => node.nodeType === 1)
  }

  appendChild<T extends ShimElement | ShimText>(node: T): T {
    node.parentNode = this
    this.childNodes.push(node)
    return node
  }

  removeChild<T extends ShimElement | ShimText>(node: T): T {
    const index = this.childNodes.indexOf(node)
    if (index >= 0) this.childNodes.splice(index, 1)
    node.parentNode = null
    return node
  }

  remove(): void {
    this.parentNode?.removeChild(this)
  }

  replaceChildren(...nodes: (ShimElement | ShimText)[]): void {
    for (const child of this.childNodes) child.parentNode = null
    this.childNodes = []
    for (const node of nodes) this.appendChild(node)
  }

  get textContent(): string {
    return this.childNodes.map((node) => node.textContent).join('')
  }

  set textContent(value: string) {
    for (const child of this.childNodes) child.parentNode = null
    this.childNodes = []
    if (value !== '') this.appendChild(new ShimText(value))
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

  /** Recursively find descendants matching a tag name (test helper). */
  find(tagName: string): ShimElement[] {
    const found: ShimElement[] = []
    for (const child of this.children) {
      if (child.tagName === tagName) found.push(child)
      found.push(...child.find(tagName))
    }
    return found
  }

  /** First descendant matching a tag name (test helper). */
  findOne(tagName: string): ShimElement | undefined {
    return this.find(tagName)[0]
  }
}

/** Fake document with head/body. */
export class ShimDocument {
  readonly head: ShimElement
  readonly body: ShimElement
  readonly documentElement: ShimElement

  constructor() {
    this.documentElement = new ShimElement(this, 'html', null)
    this.head = new ShimElement(this, 'head', null)
    this.body = new ShimElement(this, 'body', null)
    this.documentElement.appendChild(this.head)
    this.documentElement.appendChild(this.body)
  }

  createElement(tagName: string): ShimElement {
    return new ShimElement(this, tagName, null)
  }

  createElementNS(namespaceURI: string, tagName: string): ShimElement {
    return new ShimElement(this, tagName, namespaceURI)
  }

  createTextNode(data: string): ShimText {
    return new ShimText(data)
  }
}

/** Build a fresh fake document cast to the DOM type the renderers expect. */
export function createTestDocument(): Document {
  return new ShimDocument() as unknown as Document
}

/** Narrow a DOM element back to the shim for inspection. */
export function asShim(element: unknown): ShimElement {
  return element as ShimElement
}

/** Fire a simple event of the given type on a shim element. */
export function fire(element: unknown, type: string): void {
  const target = element as ShimElement
  target.dispatchEvent({ type, target })
}
