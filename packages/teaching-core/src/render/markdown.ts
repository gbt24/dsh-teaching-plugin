/**
 * Safe Markdown subset renderer.
 *
 * The model's prose is never treated as HTML: the source is tokenised into a
 * small block/inline vocabulary and every text run is written through
 * `textContent`. Only http(s) links survive (rendered with `target="_blank"`
 * and `rel="noopener noreferrer"`); inline `$…$` and fenced `$$…$$` math go
 * through the KaTeX renderer with the model's string as LaTeX, not HTML.
 *
 * Supported: ATX headings (1–4), paragraphs, unordered/ordered lists, fenced
 * code blocks, block quotes, horizontal rules, strong/emphasis, inline code,
 * http(s) links, inline/display math, hard line breaks.
 */
import { createElement } from './dom.ts'
import { renderMath } from './math.ts'

/** One inline token. */
export type MarkdownInline =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'strong'; readonly children: readonly MarkdownInline[] }
  | { readonly type: 'em'; readonly children: readonly MarkdownInline[] }
  | { readonly type: 'code'; readonly text: string }
  | { readonly type: 'link'; readonly href: string; readonly children: readonly MarkdownInline[] }
  | { readonly type: 'math'; readonly latex: string }
  | { readonly type: 'break' }

/** One block token. */
export type MarkdownBlock =
  | { readonly type: 'heading'; readonly level: 1 | 2 | 3 | 4; readonly children: readonly MarkdownInline[] }
  | { readonly type: 'paragraph'; readonly children: readonly MarkdownInline[] }
  | { readonly type: 'list'; readonly ordered: boolean; readonly items: readonly (readonly MarkdownInline[])[] }
  | { readonly type: 'code'; readonly language?: string; readonly code: string }
  | { readonly type: 'math'; readonly latex: string }
  | { readonly type: 'quote'; readonly blocks: readonly MarkdownBlock[] }
  | { readonly type: 'rule' }

const SAFE_LINK = /^https?:\/\//iu
const MAX_SOURCE_LENGTH = 200_000
const MAX_CODE_BLOCK = 100_000

/** Tokenise inline Markdown into the safe vocabulary. */
export function parseInlineMarkdown(source: string): readonly MarkdownInline[] {
  const result: MarkdownInline[] = []
  let buffer = ''
  const flush = (): void => {
    if (buffer !== '') {
      result.push({ type: 'text', text: buffer })
      buffer = ''
    }
  }
  let index = 0
  while (index < source.length) {
    const char = source[index] ?? ''
    // Backslash escape: the escaped character is literal text.
    if (char === '\\' && index + 1 < source.length) {
      buffer += source[index + 1] ?? ''
      index += 2
      continue
    }
    if (char === '\n') {
      if (buffer.endsWith('  ')) {
        buffer = buffer.slice(0, -2)
        flush()
        result.push({ type: 'break' })
      } else {
        buffer += ' '
      }
      index += 1
      continue
    }
    if (char === '`') {
      const close = source.indexOf('`', index + 1)
      if (close > index + 1) {
        flush()
        result.push({ type: 'code', text: source.slice(index + 1, close) })
        index = close + 1
        continue
      }
    }
    if (char === '*' || char === '_') {
      const double = source.startsWith(char + char, index)
      const marker = double ? char + char : char
      const end = source.indexOf(marker, index + marker.length)
      if (end > index + marker.length) {
        const inner = source.slice(index + marker.length, end)
        flush()
        const children = parseInlineMarkdown(inner)
        result.push(double ? { type: 'strong', children } : { type: 'em', children })
        index = end + marker.length
        continue
      }
    }
    if (char === '$') {
      // Inline math; `$$` would have been a block and is skipped here.
      const close = source.indexOf('$', index + 1)
      if (close > index + 1 && !source.startsWith('$$', index)) {
        const latex = source.slice(index + 1, close)
        if (latex.trim() !== '' && latex.length <= 2_000) {
          flush()
          result.push({ type: 'math', latex })
          index = close + 1
          continue
        }
      }
    }
    if (char === '[') {
      const closeBracket = source.indexOf(']', index + 1)
      if (closeBracket > index + 1 && source[closeBracket + 1] === '(') {
        const closeParen = source.indexOf(')', closeBracket + 2)
        if (closeParen > closeBracket + 2) {
          const label = source.slice(index + 1, closeBracket)
          const href = source.slice(closeBracket + 2, closeParen).trim()
          if (SAFE_LINK.test(href)) {
            flush()
            result.push({ type: 'link', href, children: parseInlineMarkdown(label) })
            index = closeParen + 1
            continue
          }
          // Unsafe scheme: keep only the label text, never a link.
          flush()
          result.push(...parseInlineMarkdown(label))
          index = closeParen + 1
          continue
        }
      }
    }
    buffer += char
    index += 1
  }
  flush()
  return result
}

/** Tokenise block-level Markdown into the safe vocabulary. */
export function parseMarkdown(source: string): readonly MarkdownBlock[] {
  const bounded = source.length > MAX_SOURCE_LENGTH ? source.slice(0, MAX_SOURCE_LENGTH) : source
  const lines = bounded.replace(/\r\n?/gu, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    const trimmed = line.trim()
    if (trimmed === '') {
      index += 1
      continue
    }
    // Fenced code block.
    const fence = /^```([A-Za-z0-9_+#.-]*)\s*$/u.exec(trimmed)
    if (fence !== null) {
      const language = fence[1] === '' ? undefined : fence[1]
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && (lines[index] ?? '').trim() !== '```') {
        codeLines.push(lines[index] ?? '')
        index += 1
      }
      index += 1 // closing fence (or EOF)
      const code = codeLines.join('\n')
      blocks.push({ type: 'code', code: code.length > MAX_CODE_BLOCK ? code.slice(0, MAX_CODE_BLOCK) : code, ...(language !== undefined ? { language } : {}) })
      continue
    }
    // Display math block.
    if (trimmed === '$$') {
      const mathLines: string[] = []
      index += 1
      while (index < lines.length && (lines[index] ?? '').trim() !== '$$') {
        mathLines.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      blocks.push({ type: 'math', latex: mathLines.join('\n') })
      continue
    }
    // Heading.
    const heading = /^(#{1,4})\s+(.*)$/u.exec(trimmed)
    if (heading !== null) {
      const level = (heading[1] ?? '#').length as 1 | 2 | 3 | 4
      blocks.push({ type: 'heading', level, children: parseInlineMarkdown(heading[2] ?? '') })
      index += 1
      continue
    }
    // Horizontal rule.
    if (/^(?:-{3,}|\*{3,}|_{3,})$/u.test(trimmed)) {
      blocks.push({ type: 'rule' })
      index += 1
      continue
    }
    // Block quote: consecutive `>` lines.
    if (/^>\s?/u.test(trimmed)) {
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s?/u.test((lines[index] ?? '').trim())) {
        quoteLines.push((lines[index] ?? '').trim().replace(/^>\s?/u, ''))
        index += 1
      }
      blocks.push({ type: 'quote', blocks: parseMarkdown(quoteLines.join('\n')) })
      continue
    }
    // Lists: unordered `-*+`, ordered `1.`.
    const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/u.exec(line)
    if (listItem !== null) {
      const ordered = /\d/u.test(listItem[2] ?? '-')
      const items: MarkdownInline[][] = []
      while (index < lines.length) {
        const current = lines[index] ?? ''
        const item = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/u.exec(current)
        if (item !== null) {
          items.push([...parseInlineMarkdown(item[3] ?? '')])
          index += 1
          continue
        }
        // An indented continuation line belongs to the previous item.
        if (current.trim() !== '' && /^\s+/u.test(current) && items.length > 0) {
          const last = items[items.length - 1]
          if (last !== undefined) last.push({ type: 'text', text: ' ' }, ...parseInlineMarkdown(current.trim()))
          index += 1
          continue
        }
        break
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }
    // Paragraph: consecutive plain lines.
    const paragraphLines: string[] = [line]
    index += 1
    while (index < lines.length) {
      const next = lines[index] ?? ''
      const nextTrimmed = next.trim()
      if (nextTrimmed === '' || /^```/u.test(nextTrimmed) || /^#{1,4}\s+/u.test(nextTrimmed)
        || /^>\s?/u.test(nextTrimmed) || nextTrimmed === '$$' || /^(?:-{3,}|\*{3,}|_{3,})$/u.test(nextTrimmed)) {
        break
      }
      paragraphLines.push(next)
      index += 1
    }
    blocks.push({ type: 'paragraph', children: parseInlineMarkdown(paragraphLines.join('\n')) })
  }
  return blocks
}

/** Render inline tokens into a span. */
export function renderInlineMarkdown(
  document: Document,
  source: string,
  environment?: { readonly document?: Document },
): HTMLElement {
  const span = createElement(document, 'span', { className: 'teaching-inline' })
  appendInlineTokens(document, span, parseInlineMarkdown(source), environment ?? { document })
  return span
}

/** Append inline tokens to a parent element. */
export function appendInlineTokens(
  document: Document,
  parent: HTMLElement,
  tokens: readonly MarkdownInline[],
  environment?: { readonly document?: Document },
): void {
  for (const token of tokens) {
    if (token.type === 'text') parent.appendChild(document.createTextNode(token.text))
    else if (token.type === 'break') parent.appendChild(createElement(document, 'br'))
    else if (token.type === 'code') {
      parent.appendChild(createElement(document, 'code', { className: 'teaching-code-inline', text: token.text }))
    } else if (token.type === 'strong' || token.type === 'em') {
      const element = createElement(document, token.type === 'strong' ? 'strong' : 'em')
      appendInlineTokens(document, element, token.children, environment)
      parent.appendChild(element)
    } else if (token.type === 'link') {
      const anchor = createElement(document, 'a', {
        className: 'teaching-link',
        attrs: { href: token.href, target: '_blank', rel: 'noopener noreferrer' },
      })
      appendInlineTokens(document, anchor, token.children, environment)
      parent.appendChild(anchor)
    } else if (token.type === 'math') {
      parent.appendChild(renderMath(token.latex, false, environment))
    }
  }
}

/**
 * Render a Markdown document into a detached container element.
 *
 * @param document - document used to create nodes.
 * @param source - model-authored Markdown (safe subset only).
 * @param environment - optional document override for nested helpers.
 * @returns `<div class="teaching-markdown">` with the rendered blocks.
 */
export function renderMarkdown(
  document: Document,
  source: string,
  environment?: { readonly document?: Document },
): HTMLElement {
  const wrapper = createElement(document, 'div', { className: 'teaching-markdown' })
  appendMarkdownBlocks(wrapper, document, parseMarkdown(source), environment ?? { document })
  return wrapper
}

/** Append rendered Markdown blocks to an existing container. */
export function appendMarkdownBlocks(
  parent: HTMLElement,
  document: Document,
  blocks: readonly MarkdownBlock[],
  environment?: { readonly document?: Document },
): void {
  for (const block of blocks) {
    if (block.type === 'heading') {
      const heading = createElement(document, `h${block.level}` as 'h1', { className: `teaching-h${block.level}` })
      appendInlineTokens(document, heading, block.children, environment)
      parent.appendChild(heading)
    } else if (block.type === 'paragraph') {
      const paragraph = createElement(document, 'p', { className: 'teaching-p' })
      appendInlineTokens(document, paragraph, block.children, environment)
      parent.appendChild(paragraph)
    } else if (block.type === 'list') {
      const list = createElement(document, block.ordered ? 'ol' : 'ul', { className: 'teaching-list' })
      for (const item of block.items) {
        const li = createElement(document, 'li')
        appendInlineTokens(document, li, item, environment)
        list.appendChild(li)
      }
      parent.appendChild(list)
    } else if (block.type === 'code') {
      const pre = createElement(document, 'pre', { className: 'teaching-code-block' })
      const code = createElement(document, 'code', { text: block.code })
      if (block.language !== undefined) code.setAttribute('data-language', block.language)
      pre.appendChild(code)
      parent.appendChild(pre)
    } else if (block.type === 'math') {
      parent.appendChild(renderMath(block.latex, true, environment))
    } else if (block.type === 'quote') {
      const quote = createElement(document, 'blockquote', { className: 'teaching-quote' })
      appendMarkdownBlocks(quote, document, block.blocks, environment)
      parent.appendChild(quote)
    } else if (block.type === 'rule') {
      parent.appendChild(createElement(document, 'hr', { className: 'teaching-rule' }))
    }
  }
}
