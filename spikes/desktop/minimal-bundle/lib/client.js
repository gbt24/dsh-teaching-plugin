window.__ModuleLoader__.load({
  id: "dsh-teaching-spike",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // spikes/desktop/minimal-bundle/src/client/index.tsx
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject,
      name: () => name
    });
    module.exports = __toCommonJS(index_exports);
    var import_react = require("react");
    var import_jsx_runtime = require("react/jsx-runtime");
    var name = "teaching-spike-client";
    var inject = ["slots"];
    var PANEL_ID = "teaching-spike";
    async function api(path, init) {
      const url = new URL(`/api/teaching-spike${path}`, document.baseURI);
      return fetch(url, {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers ?? {} }
      });
    }
    function SpikePanel() {
      const [health, setHealth] = (0, import_react.useState)(null);
      const [error, setError] = (0, import_react.useState)(null);
      const [clientState, setClientState] = (0, import_react.useState)("idle");
      const [model, setModel] = (0, import_react.useState)(null);
      const [modelBusy, setModelBusy] = (0, import_react.useState)(false);
      const [saved, setSaved] = (0, import_react.useState)(null);
      const [mountedAt] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).toISOString());
      (0, import_react.useEffect)(() => {
        let disposed = false;
        void (async () => {
          try {
            const response = await api("/health");
            const body = await response.json();
            if (disposed) return;
            setHealth(body);
            await api("/client-event", {
              method: "POST",
              body: JSON.stringify({
                event: "client/panel-mount",
                location: String(document.baseURI),
                userAgent: navigator.userAgent,
                bootCountSeen: body.bootCount
              })
            });
            setClientState("connected");
          } catch (cause) {
            if (!disposed) setError(String(cause));
          }
        })();
        return () => {
          disposed = true;
        };
      }, []);
      const save = async () => {
        const response = await api("/state", {
          method: "POST",
          body: JSON.stringify({ clientView: { mountedAt, note: `saved at ${(/* @__PURE__ */ new Date()).toISOString()}` } })
        });
        const body = await response.json();
        setSaved(JSON.stringify(body.state.saves).slice(0, 200));
      };
      const runModel = async () => {
        setModelBusy(true);
        setModel(null);
        try {
          const response = await api("/model", { method: "POST", body: JSON.stringify({ prompt: "\u7528\u4E00\u53E5\u8BDD\u89E3\u91CA\u4EC0\u4E48\u662F\u8FC7\u62DF\u5408\u3002" }) });
          setModel(await response.json());
        } catch (cause) {
          setError(String(cause));
        } finally {
          setModelBusy(false);
        }
      };
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "16px 20px", fontSize: 13, lineHeight: 1.6, overflow: "auto", height: "100%" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: "0 0 8px", fontSize: 16 }, children: "\u6559\u5B66\u63D2\u4EF6 spike\uFF08T00\uFF09" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "0 0 12px", opacity: 0.7 }, children: "\u5DE6\u4FA7\u680F\u5165\u53E3 \u2192 \u4E3B\u9762\u677F\u3002\u7528\u4E8E\u8BC1\u660E\u5BBF\u4E3B Sidebar/Slot\u3001Host \u5F80\u8FD4\u3001\u5F53\u524D\u6A21\u578B\u8C03\u7528\u4E0E\u91CD\u542F\u6062\u590D\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void api("/health").then(async (r) => setHealth(await r.json())), children: "\u5065\u5EB7\u68C0\u67E5" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => void save(), children: "\u4FDD\u5B58\u5230 Host" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: modelBusy, onClick: () => void runModel(), children: modelBusy ? "\u6A21\u578B\u8C03\u7528\u4E2D\u2026" : "\u8C03\u7528\u5F53\u524D\u6A21\u578B" })
        ] }),
        clientState === "connected" && health && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { style: { margin: 0, paddingLeft: 18 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "client: connected" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
            "host: node ",
            health.node,
            health.electron ? ` / electron ${health.electron}` : "",
            " / ",
            health.platform,
            "-",
            health.arch
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
            "profile: ",
            health.profile ?? "(none)",
            " / boot #",
            health.bootCount,
            " / pid ",
            health.pid
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
            "model: ",
            health.selection.provider,
            "/",
            health.selection.model
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
            "client mounted: ",
            mountedAt
          ] })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { color: "#c0392b", marginTop: 8 }, children: [
          "error: ",
          error
        ] }),
        saved && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8 }, children: [
          "\u5DF2\u4FDD\u5B58\u5230 Host: ",
          saved
        ] }),
        model && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginTop: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u6A21\u578B\u7ED3\u679C" }),
          "\uFF08",
          model.durationMs,
          "ms\uFF0C",
          model.ok ? "ok" : "failed",
          "\uFF09\uFF1A",
          model.text || JSON.stringify(model.failure)
        ] })
      ] });
    }
    function SpikeIcon({ size }) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 3.5h9.5A2.5 2.5 0 0 1 16 6v10.5H6.5A2.5 2.5 0 0 1 4 14V3.5Z", stroke: "currentColor", strokeWidth: "1.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 7h6M7 10h6M7 13h3.5", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })
      ] });
    }
    function apply(ctx) {
      ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID }, SpikePanel));
      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 10,
        label: () => "\u6559\u5B66 spike"
      }, SpikeIcon));
    }

    return module.exports;
  },
});
