/**
 * Placeholder client half (T01). The full teaching workspace is implemented by
 * the T05 client task in this same directory; this file only keeps the bundle
 * loadable while Host routes are being validated.
 */
import React from 'react'

const PANEL_ID = 'ai-teaching'
const PLACEHOLDER_VERSION = '0.1.0-t01'

export const name = 'ai-teaching-client'
export const inject = ['slots']

function TeachingIcon({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h13v9.5h-6.2L6.5 17v-3H3.5V4.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 7.5h7M6.5 10h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function Placeholder(): React.ReactElement {
  return (
    <div style={{ padding: '24px 28px', fontSize: 14, lineHeight: 1.7 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>AI 知识库教学</h2>
      <p style={{ margin: 0, opacity: 0.75 }}>客户端工作区（T05）正在接入；Host 侧 /api/teaching 路由已就绪（{PLACEHOLDER_VERSION}）。</p>
    </div>
  )
}

export function apply(ctx: { slots: { inject(slot: string, cb: () => unknown): unknown; register(options: Record<string, unknown>, component: unknown): unknown } }): void {
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Placeholder))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 10, label: () => 'AI 教学',
  }, TeachingIcon))
}
