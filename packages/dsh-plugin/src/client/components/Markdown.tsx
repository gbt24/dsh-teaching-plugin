/**
 * React wrapper around the framework-free Markdown/KaTeX renderer.
 *
 * The markdown text is rendered by the shared `render` module (safe subset, no
 * raw HTML); React holds the container and the renderer owns its children.
 */
import React, { useEffect, useRef } from 'react'
import { renderInlineMarkdown, renderMarkdown } from '@deepseek-teaching/core/render'

/** Render complete Markdown (prose turns, explanations, notes). */
export function RenderedMarkdown({ source }: { readonly source: string }): React.ReactElement {
  const host = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const element = host.current
    if (element === null) return
    element.textContent = ''
    element.appendChild(renderMarkdown(document, source))
    return () => {
      element.textContent = ''
    }
  }, [source])
  return <div ref={host} className="teaching-markdown-host" />
}

/** Render one line of inline Markdown (labels, questions). */
export function RenderedInline({ source }: { readonly source: string }): React.ReactElement {
  const host = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const element = host.current
    if (element === null) return
    element.textContent = ''
    element.appendChild(renderInlineMarkdown(document, source))
    return () => {
      element.textContent = ''
    }
  }, [source])
  return <span ref={host} />
}
