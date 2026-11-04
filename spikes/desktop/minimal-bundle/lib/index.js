// spikes/desktop/minimal-bundle/src/host/index.ts
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
var name = "teaching-spike";
var inject = ["connection", "llm", "agentDefaultModel"];
function evidenceRoot(config) {
  const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
  const root = config.evidenceRoot ?? join(home, "teaching-spike");
  mkdirSync(root, { recursive: true });
  return root;
}
function apply(ctx, config = {}) {
  const root = evidenceRoot(config);
  const logPath = join(root, "evidence.jsonl");
  const statePath = join(root, "state.json");
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  function log(event, data = {}) {
    appendFileSync(logPath, JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), event, ...data }) + "\n");
  }
  function readState() {
    try {
      return JSON.parse(readFileSync(statePath, "utf8"));
    } catch {
      return { bootCount: 0, createdAt: startedAt, lastBootAt: startedAt, saves: {} };
    }
  }
  function writeState(state2) {
    writeFileSync(statePath, JSON.stringify(state2, null, 2) + "\n");
  }
  const state = readState();
  state.bootCount += 1;
  state.lastBootAt = startedAt;
  writeState(state);
  const selection = (() => {
    try {
      return ctx.agentDefaultModel.currentSelection();
    } catch (error) {
      return { provider: `error:${String(error)}`, model: "" };
    }
  })();
  log("host/activate", {
    sessionId: process.env.DSH_SESSION_ID ?? null,
    profile: process.env.DSH_PROFILE ?? null,
    node: process.versions.node,
    electron: process.versions.electron ?? null,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    bootCount: state.bootCount,
    selection
  });
  ctx.effect(() => () => {
    log("host/dispose", { uptimeMs: Date.now() - Date.parse(startedAt) });
  });
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  function register(path, methods, handler) {
    ctx.effect(
      () => ctx.connection.fetch.register({ path, methods, requestBody: "buffered", fetch: handler })
    );
    log("host/route", { path, methods });
  }
  register(
    "/api/teaching-spike/health",
    ["GET"],
    async () => json({
      ok: true,
      spikeVersion: "0.0.1",
      hostname: hostname(),
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      electron: process.versions.electron ?? null,
      pid: process.pid,
      profile: process.env.DSH_PROFILE ?? null,
      startedAt,
      bootCount: state.bootCount,
      selection
    })
  );
  register("/api/teaching-spike/client-event", ["POST"], async (request) => {
    const body = await request.json().catch(() => ({}));
    log("client/event", typeof body === "object" && body !== null ? body : { body: String(body) });
    return json({ ok: true });
  });
  register("/api/teaching-spike/state", ["GET", "POST"], async (request) => {
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (typeof body === "object" && body !== null) {
        for (const [key, value] of Object.entries(body)) state.saves[key] = value;
        writeState(state);
        log("state/save", { keys: Object.keys(body), bootCount: state.bootCount });
      }
      return json({ ok: true, state });
    }
    return json({ ok: true, state });
  });
  register("/api/teaching-spike/model", ["POST"], async (request) => {
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" && body.prompt.trim() !== "" ? body.prompt : "\u7528\u4E00\u53E5\u4E2D\u6587\u8BF4\u660E\u4EC0\u4E48\u662F\u8FC7\u62DF\u5408\u3002";
    const chosen = ctx.agentDefaultModel.currentSelection();
    const controller = new AbortController();
    const started = Date.now();
    let text = "";
    let failure = null;
    try {
      for await (const chunk of ctx.llm.stream({
        provider: chosen.provider,
        model: chosen.model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        maxTokens: 256,
        signal: controller.signal,
        // pi-ai routes stamp routing metadata from this opaque session identity.
        sessionId: process.env.DSH_SESSION_ID ?? "session-teaching-spike"
      })) {
        if (chunk?.type === "text-delta") text += chunk.text ?? "";
        if (chunk?.type === "finish") {
          if (chunk.reason?.kind === "error" || chunk.reason?.kind === "aborted") failure = chunk.reason.failure ?? chunk.reason;
          break;
        }
      }
    } catch (error) {
      failure = String(error);
    }
    const result = { ok: failure === null, provider: chosen.provider, model: chosen.model, text, failure, durationMs: Date.now() - started };
    log("model/call", result);
    return json(result, failure === null ? 200 : 502);
  });
  register("/api/teaching-spike/exec", ["POST"], async (request) => {
    const body = await request.json().catch(() => ({}));
    const language = body.language === "python" ? "python" : "javascript";
    const code = typeof body.code === "string" && body.code.length > 0 ? body.code : language === "python" ? "print(6 * 7)" : "console.log(6 * 7)";
    const started = Date.now();
    return new Promise((resolve) => {
      const child = language === "python" ? spawn("python3", ["-I", "-c", code], { env: { ...process.env, PYTHONIOENCODING: "utf-8" } }) : spawn(process.execPath, ["--eval", code], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.on("close", (exitCode) => {
        const result = { ok: exitCode === 0, language, exitCode, stdout, stderr, durationMs: Date.now() - started };
        log("exec/run", { language, exitCode, durationMs: result.durationMs });
        resolve(json(result, exitCode === 0 ? 200 : 422));
      });
      child.on("error", (error) => {
        log("exec/error", { language, error: String(error) });
        resolve(json({ ok: false, language, failure: String(error) }, 422));
      });
    });
  });
  register(
    "/api/teaching-spike/export",
    ["GET"],
    async () => new Response([
      "<!doctype html>",
      '<html lang="zh-CN"><head><meta charset="utf-8"><title>T00 \u79BB\u7EBF\u5BFC\u51FA spike</title>',
      "<style>body{font-family:system-ui;margin:40px;max-width:720px;line-height:1.7}",
      "#out{margin-top:16px;padding:12px;border:1px solid #ccc;border-radius:8px}",
      "button{padding:6px 14px;font-size:14px}",
      "svg text{font-size:12px;fill:#333}</style></head><body>",
      "<h1>T00 \u79BB\u7EBF\u5BFC\u51FA spike</h1>",
      "<p>\u8FD9\u4E2A\u9875\u9762\u5B8C\u5168\u81EA\u5305\u542B\uFF1A\u65E0\u5BBF\u4E3B API\u3001\u65E0 CDN\u3001\u65E0\u7F51\u7EDC\u8BF7\u6C42\u3002\u7528\u4E8E\u9A8C\u8BC1\u72EC\u7ACB HTML \u5BFC\u51FA\u8DEF\u7EBF\u3002</p>",
      '<label>\u53C2\u6570 a\uFF1A<input id="a" type="range" min="0" max="10" value="3"></label>',
      '<span id="av">3</span>',
      '<p><button id="run">\u8BA1\u7B97\u5E76\u753B\u56FE</button></p>',
      '<div id="out">\u7B49\u5F85\u64CD\u4F5C</div>',
      '<svg id="chart" width="480" height="140" aria-label="\u51FD\u6570\u66F2\u7EBF"></svg>',
      "<script>",
      'const out=document.getElementById("out"),av=document.getElementById("av");',
      'function render(){const a=Number(document.getElementById("a").value);av.textContent=a;',
      "const ys=[];for(let i=0;i<=40;i++){const x=i/10;ys.push(a*x*x)};",
      'let path="";ys.forEach((y,i)=>{const x=20+i*11,h=120-(y/100)*100;path+=(i?"L":"M")+x+" "+Math.max(10,h)});',
      'document.getElementById("chart").innerHTML=`<path d="${path}" fill="none" stroke="#3b6fd8" stroke-width="2"/><text x="20" y="135">y = a\xB7x\xB2, a=${a}</text>`;',
      "out.textContent=`a=${a}; f(4)=${a*16}; \u6570\u636E\u70B9 ${ys.length} \u4E2A\u3002`}",
      'document.getElementById("a").addEventListener("input",render);',
      'document.getElementById("run").addEventListener("click",render);render();',
      "</script></body></html>"
    ].join("\n"), { headers: { "content-type": "text/html; charset=utf-8", "content-disposition": 'attachment; filename="t00-offline-spike.html"' } })
  );
}
export {
  apply,
  inject,
  name
};
