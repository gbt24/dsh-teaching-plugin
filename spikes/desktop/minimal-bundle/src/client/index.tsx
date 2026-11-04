/**
 * T00 minimal integration spike — browser half.
 *
 * Proves: the client module bundle loads in a real Host-served page (Web and
 * Desktop shell), a real `main` panel + `sidebar.panellist` entry render inside
 * the application frame (the exact mechanism the teaching plugin will use for
 * its left-sidebar entry), and the panel round-trips through the authenticated
 * /api Fetch channel to the plugin's own Host routes.
 */
import React, { useEffect, useState } from 'react'

export const name = 'teaching-spike-client'
export const inject = ['slots']

/** Sidebar panel id; the same id keys the `main` slot occupant. */
const PANEL_ID = 'teaching-spike'

interface Health {
  ok: boolean
  spikeVersion: string
  platform: string
  arch: string
  node: string
  electron: string | null
  pid: number
  profile: string | null
  startedAt: string
  bootCount: number
  selection: { provider: string; model: string }
}

interface ModelResult {
  ok: boolean
  provider: string
  model: string
  text: string
  failure: unknown
  durationMs: number
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(`/api/teaching-spike${path}`, document.baseURI)
  return fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
}

function SpikePanel(): React.ReactElement {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientState, setClientState] = useState('idle')
  const [model, setModel] = useState<ModelResult | null>(null)
  const [modelBusy, setModelBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [mountedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    let disposed = false
    void (async () => {
      try {
        const response = await api('/health')
        const body = (await response.json()) as Health
        if (disposed) return
        setHealth(body)
        await api('/client-event', {
          method: 'POST',
          body: JSON.stringify({
            event: 'client/panel-mount',
            location: String(document.baseURI),
            userAgent: navigator.userAgent,
            bootCountSeen: body.bootCount,
          }),
        })
        setClientState('connected')
      } catch (cause) {
        if (!disposed) setError(String(cause))
      }
    })()
    return () => {
      disposed = true
    }
  }, [])

  const save = async (): Promise<void> => {
    const response = await api('/state', {
      method: 'POST',
      body: JSON.stringify({ clientView: { mountedAt, note: `saved at ${new Date().toISOString()}` } }),
    })
    const body = (await response.json()) as { state: { saves: Record<string, unknown> } }
    setSaved(JSON.stringify(body.state.saves).slice(0, 200))
  }

  const runModel = async (): Promise<void> => {
    setModelBusy(true)
    setModel(null)
    try {
      const response = await api('/model', { method: 'POST', body: JSON.stringify({ prompt: '用一句话解释什么是过拟合。' }) })
      setModel((await response.json()) as ModelResult)
    } catch (cause) {
      setError(String(cause))
    } finally {
      setModelBusy(false)
    }
  }

  return (
    <div style={{ padding: '16px 20px', fontSize: 13, lineHeight: 1.6, overflow: 'auto', height: '100%' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>教学插件 spike（T00）</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.7 }}>
        左侧栏入口 → 主面板。用于证明宿主 Sidebar/Slot、Host 往返、当前模型调用与重启恢复。
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" onClick={() => void api('/health').then(async r => setHealth(await r.json() as Health))}>健康检查</button>
        <button type="button" onClick={() => void save()}>保存到 Host</button>
        <button type="button" disabled={modelBusy} onClick={() => void runModel()}>{modelBusy ? '模型调用中…' : '调用当前模型'}</button>
      </div>
      {clientState === 'connected' && health && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>client: connected</li>
          <li>host: node {health.node}{health.electron ? ` / electron ${health.electron}` : ''} / {health.platform}-{health.arch}</li>
          <li>profile: {health.profile ?? '(none)'} / boot #{health.bootCount} / pid {health.pid}</li>
          <li>model: {health.selection.provider}/{health.selection.model}</li>
          <li>client mounted: {mountedAt}</li>
        </ul>
      )}
      {error && <div style={{ color: '#c0392b', marginTop: 8 }}>error: {error}</div>}
      {saved && <div style={{ marginTop: 8 }}>已保存到 Host: {saved}</div>}
      {model && (
        <div style={{ marginTop: 8 }}>
          <strong>模型结果</strong>（{model.durationMs}ms，{model.ok ? 'ok' : 'failed'}）：{model.text || JSON.stringify(model.failure)}
        </div>
      )}
    </div>
  )
}

function SpikeIcon({ size }: { size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 3.5h9.5A2.5 2.5 0 0 1 16 6v10.5H6.5A2.5 2.5 0 0 1 4 14V3.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 7h6M7 10h6M7 13h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function apply(ctx: any): void {
  // The centre panel: registered under the same id the sidebar entry selects.
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, SpikePanel))
  // The left-sidebar entry: a global panel icon beside the shipped panels.
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 10,
    label: () => '教学 spike',
  }, SpikeIcon))
}
