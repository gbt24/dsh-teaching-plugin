/**
 * Safe preview card for visual code fences in teacher chat text.
 *
 * The fence source is untrusted model output: it is only ever mounted through the
 * shared `mountVisual` renderer, i.e. inside a sandboxed iframe with scripts
 * disabled (`interactive: false`). Source viewing is an explicit details block;
 * the raw source never reaches the plugin DOM as markup.
 */
import React, { useEffect, useRef, useState } from 'react'
import type { VisualPayload } from '@deepseek-teaching/core/contracts'
import { mountVisual, validateVisualPayload } from '@deepseek-teaching/core/render'
import type { ChatVisualFence } from '../chat-visuals.ts'

/** One chat preview card. */
export function ChatVisualPreview({ fence }: { readonly fence: ChatVisualFence }): React.ReactElement {
  const host = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)
  useEffect(() => {
    const element = host.current
    if (element === null) return
    element.textContent = ''
    setError(undefined)
    const payload: VisualPayload = {
      type: 'visual',
      renderer: fence.renderer,
      source: fence.source,
      interactive: false,
      height: fence.renderer === 'mermaid' ? 220 : 360,
      caption: '模型生成的图表（安全预览）',
      alt: '模型生成的图表（安全预览）',
    }
    const validation = validateVisualPayload(payload)
    if (!validation.ok) {
      setError(`无法安全预览该内容：${validation.error.message}`)
      return
    }
    const mounted = mountVisual(element, validation.value, { showTitle: false })
    return () => {
      mounted.dispose()
      element.textContent = ''
    }
  }, [fence.renderer, fence.source])
  return (
    <div className="ai-chat-visual" data-visual-renderer={fence.renderer}>
      <div className="ai-chat-visual-caption">
        模型生成的图表（安全预览）· {fence.renderer.toUpperCase()} · 在沙箱中显示，不执行插件页面代码
      </div>
      {error !== undefined && <div className="ai-chat-visual-error" role="alert">{error}</div>}
      <div ref={host} />
      <details className="ai-chat-visual-source">
        <summary>查看源码</summary>
        <pre>{fence.source}</pre>
      </details>
    </div>
  )
}
