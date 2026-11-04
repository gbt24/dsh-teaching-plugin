/**
 * T00 minimal integration spike — Host half.
 *
 * Proves: bundle load and activation in a real dsh runtime, exact Fetch routes
 * over the authenticated /api channel, durable filesystem state that survives a
 * Host restart, and a real model call through the host LLM service.
 */
import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'

export const name = 'teaching-spike'
export const inject = ['connection', 'llm', 'agentDefaultModel']

interface Config {
  /** Evidence directory override; defaults to `$DSH_HOME/teaching-spike`. */
  evidenceRoot?: string
}

interface HostState {
  bootCount: number
  createdAt: string
  lastBootAt: string
  saves: Record<string, unknown>
}

function evidenceRoot(config: Config): string {
  const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  const root = config.evidenceRoot ?? join(home, 'teaching-spike')
  mkdirSync(root, { recursive: true })
  return root
}

export function apply(ctx: any, config: Config = {}): void {
  const root = evidenceRoot(config)
  const logPath = join(root, 'evidence.jsonl')
  const statePath = join(root, 'state.json')
  const startedAt = new Date().toISOString()

  function log(event: string, data: Record<string, unknown> = {}): void {
    appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n')
  }

  function readState(): HostState {
    try {
      return JSON.parse(readFileSync(statePath, 'utf8')) as HostState
    } catch {
      return { bootCount: 0, createdAt: startedAt, lastBootAt: startedAt, saves: {} }
    }
  }

  function writeState(state: HostState): void {
    writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')
  }

  const state = readState()
  state.bootCount += 1
  state.lastBootAt = startedAt
  writeState(state)

  const selection = (() => {
    try {
      return ctx.agentDefaultModel.currentSelection() as { provider: string; model: string }
    } catch (error) {
      return { provider: `error:${String(error)}`, model: '' }
    }
  })()

  log('host/activate', {
    sessionId: process.env.DSH_SESSION_ID ?? null,
    profile: process.env.DSH_PROFILE ?? null,
    node: process.versions.node,
    electron: process.versions.electron ?? null,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    bootCount: state.bootCount,
    selection,
  })

  ctx.effect(() => () => {
    log('host/dispose', { uptimeMs: Date.now() - Date.parse(startedAt) })
  })

  const json = (value: unknown, status = 200): Response =>
    new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

  function register(path: string, methods: ('GET' | 'POST')[], handler: (request: Request) => Promise<Response>): void {
    ctx.effect(() =>
      ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', fetch: handler }),
    )
    log('host/route', { path, methods })
  }

  register('/api/teaching-spike/health', ['GET'], async () =>
    json({
      ok: true,
      spikeVersion: '0.0.1',
      hostname: hostname(),
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      electron: process.versions.electron ?? null,
      pid: process.pid,
      profile: process.env.DSH_PROFILE ?? null,
      startedAt,
      bootCount: state.bootCount,
      selection,
    }),
  )

  register('/api/teaching-spike/client-event', ['POST'], async (request) => {
    const body = await request.json().catch(() => ({}))
    log('client/event', typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : { body: String(body) })
    return json({ ok: true })
  })

  register('/api/teaching-spike/state', ['GET', 'POST'], async (request) => {
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if (typeof body === 'object' && body !== null) {
        for (const [key, value] of Object.entries(body as Record<string, unknown>)) state.saves[key] = value
        writeState(state)
        log('state/save', { keys: Object.keys(body), bootCount: state.bootCount })
      }
      return json({ ok: true, state })
    }
    return json({ ok: true, state })
  })

  register('/api/teaching-spike/model', ['POST'], async (request) => {
    const body = (await request.json().catch(() => ({}))) as { prompt?: string }
    const prompt = typeof body.prompt === 'string' && body.prompt.trim() !== '' ? body.prompt : '用一句中文说明什么是过拟合。'
    const chosen = ctx.agentDefaultModel.currentSelection() as { provider: string; model: string; reasoningEffort?: string }
    const controller = new AbortController()
    const started = Date.now()
    let text = ''
    let failure: unknown = null
    try {
      for await (const chunk of ctx.llm.stream({
        provider: chosen.provider,
        model: chosen.model,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        maxTokens: 256,
        signal: controller.signal,
        // pi-ai routes stamp routing metadata from this opaque session identity.
        sessionId: (process.env.DSH_SESSION_ID ?? 'session-teaching-spike') as never,
      })) {
        if (chunk?.type === 'text-delta') text += chunk.text ?? ''
        if (chunk?.type === 'finish') {
          // The terminal finish always arrives; only its reason distinguishes success.
          if (chunk.reason?.kind === 'error' || chunk.reason?.kind === 'aborted') failure = chunk.reason.failure ?? chunk.reason
          break
        }
      }
    } catch (error) {
      failure = String(error)
    }
    const result = { ok: failure === null, provider: chosen.provider, model: chosen.model, text, failure, durationMs: Date.now() - started }
    log('model/call', result)
    return json(result, failure === null ? 200 : 502)
  })

  // V7 evidence: spawn a real child process from the host plugin (Electron Node
  // mode). The teaching plugin needs this for Python/Node experiment runners.
  register('/api/teaching-spike/exec', ['POST'], async (request) => {
    const body = (await request.json().catch(() => ({}))) as { language?: string; code?: string }
    const language = body.language === 'python' ? 'python' : 'javascript'
    const code = typeof body.code === 'string' && body.code.length > 0
      ? body.code
      : language === 'python' ? 'print(6 * 7)' : 'console.log(6 * 7)'
    const started = Date.now()
    return new Promise<Response>((resolve) => {
      const child = language === 'python'
        ? spawn('python3', ['-I', '-c', code], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
        : spawn(process.execPath, ['--eval', code], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
      child.on('close', (exitCode) => {
        const result = { ok: exitCode === 0, language, exitCode, stdout, stderr, durationMs: Date.now() - started }
        log('exec/run', { language, exitCode, durationMs: result.durationMs })
        resolve(json(result, exitCode === 0 ? 200 : 422))
      })
      child.on('error', (error) => {
        log('exec/error', { language, error: String(error) })
        resolve(json({ ok: false, language, failure: String(error) }, 422))
      })
    })
  })

  // V8 evidence route: produce one self-contained, offline-openable HTML page.
  // This is the feasibility probe for the teaching plugin's standalone export.
  register('/api/teaching-spike/export', ['GET'], async () =>
    new Response([
      '<!doctype html>',
      '<html lang="zh-CN"><head><meta charset="utf-8"><title>T00 离线导出 spike</title>',
      '<style>body{font-family:system-ui;margin:40px;max-width:720px;line-height:1.7}',
      '#out{margin-top:16px;padding:12px;border:1px solid #ccc;border-radius:8px}',
      'button{padding:6px 14px;font-size:14px}',
      'svg text{font-size:12px;fill:#333}</style></head><body>',
      '<h1>T00 离线导出 spike</h1>',
      '<p>这个页面完全自包含：无宿主 API、无 CDN、无网络请求。用于验证独立 HTML 导出路线。</p>',
      '<label>参数 a：<input id="a" type="range" min="0" max="10" value="3"></label>',
      '<span id="av">3</span>',
      '<p><button id="run">计算并画图</button></p>',
      '<div id="out">等待操作</div>',
      '<svg id="chart" width="480" height="140" aria-label="函数曲线"></svg>',
      '<script>',
      'const out=document.getElementById("out"),av=document.getElementById("av");',
      'function render(){const a=Number(document.getElementById("a").value);av.textContent=a;',
      'const ys=[];for(let i=0;i<=40;i++){const x=i/10;ys.push(a*x*x)};',
      'let path="";ys.forEach((y,i)=>{const x=20+i*11,h=120-(y/100)*100;path+=(i?"L":"M")+x+" "+Math.max(10,h)});',
      'document.getElementById("chart").innerHTML=`<path d="${path}" fill="none" stroke="#3b6fd8" stroke-width="2"/><text x="20" y="135">y = a·x², a=${a}</text>`;',
      'out.textContent=`a=${a}; f(4)=${a*16}; 数据点 ${ys.length} 个。`}',
      'document.getElementById("a").addEventListener("input",render);',
      'document.getElementById("run").addEventListener("click",render);render();',
      '</script></body></html>',
    ].join('\n'), { headers: { 'content-type': 'text/html; charset=utf-8', 'content-disposition': 'attachment; filename="t00-offline-spike.html"' } }),
  )
}
