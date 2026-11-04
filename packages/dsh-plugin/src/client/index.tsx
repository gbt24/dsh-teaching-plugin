/**
 * Browser half of the teaching plugin.
 *
 * Registers the left-sidebar entry (`sidebar.panellist`) and the central page
 * (`main`) under one panel id, so a student clicks「AI 教学」and gets the whole
 * workspace. React and react/jsx-runtime are provided by the Harness shell as
 * external modules; everything else (contracts types, the framework-free
 * renderer) is bundled from this repository.
 */
import React, { useEffect } from 'react'
import katexCss from 'katex/dist/katex.min.css'
import { TEACHING_CSS } from './styles.ts'
import { TeachingWorkspace } from './components/Workspace.tsx'

/** Plugin client identity in the Harness module graph. */
export const name = 'ai-teaching-client'

/** Services required by the slot contributions. */
export const inject = ['slots']

/** Panel id shared by the sidebar entry and the `main` page. */
export const PANEL_ID = 'ai-teaching'

function injectStyleOnce(id: string, css: string): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(id) !== null) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = css
  document.head.appendChild(style)
}

/** Inject the stylesheet and KaTeX CSS exactly once per page. */
function ensureStyles(): void {
  // KaTeX CSS references font files with relative URLs; the app bundle does not
  // ship those fonts, so formulas render with fallback faces (documented limit).
  injectStyleOnce('ai-teaching-katex-css', katexCss)
  injectStyleOnce('ai-teaching-css', TEACHING_CSS)
}

/** Sidebar icon (rendered with the current theme colour). */
function TeachingIcon({ size }: { size?: number; active?: boolean }): React.ReactElement {
  const dimension = size ?? 20
  return (
    <svg width={dimension} height={dimension} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.2c1.9-.9 3.9-.9 6.5.4 2.6-1.3 4.6-1.3 6.5-.4v9.6c-1.9-.8-3.9-.8-6.5.5-2.6-1.3-4.6-1.3-6.5-.5V4.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 4.8v9.2M6.2 7.1h1.9M6.2 9.6h1.9M11.9 7.1h1.9M11.9 9.6h1.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/** Render the workspace and turn render failures into a visible message. */
class PanelErrorBoundary extends React.Component<
  { readonly children: React.ReactNode },
  { readonly error?: Error }
> {
  override state: { readonly error?: Error } = {}

  static getDerivedStateFromError(error: Error): { readonly error: Error } {
    return { error }
  }

  override render(): React.ReactNode {
    if (this.state.error !== undefined) {
      return (
        <div style={{ padding: 20 }}>
          <div className="ai-banner" data-kind="error" role="alert">
            <span>教学界面出现了错误：{this.state.error.message}。刷新页面可重试；学习记录保存在本机 Host。</span>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/** The `main` slot page. */
function TeachingPage(): React.ReactElement {
  useEffect(() => {
    ensureStyles()
  }, [])
  return (
    <PanelErrorBoundary>
      <TeachingWorkspace />
    </PanelErrorBoundary>
  )
}

/** Minimal shape of the browser context used by this plugin (no Host imports). */
interface ClientSlotContext {
  readonly slots: {
    inject(slot: string, factory: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
  }
}

/**
 * Contribute the sidebar entry and the central teaching page.
 *
 * @param ctx - browser plugin context with the `slots` service.
 */
export function apply(ctx: ClientSlotContext): void {
  // Central page: keyed by the same id the sidebar entry selects.
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, TeachingPage))
  // Left-sidebar entry.
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 10,
    label: () => 'AI 教学',
  }, TeachingIcon))
}
