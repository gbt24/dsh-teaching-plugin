window.__ModuleLoader__.load({
  id: "dsh-ai-teaching",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
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

    // packages/dsh-plugin/src/client/index.tsx
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject,
      name: () => name
    });
    module.exports = __toCommonJS(index_exports);
    var import_react = require("react");
    var import_jsx_runtime = require("react/jsx-runtime");
    var PANEL_ID = "ai-teaching";
    var PLACEHOLDER_VERSION = "0.1.0-t01";
    var name = "ai-teaching-client";
    var inject = ["slots"];
    function TeachingIcon({ size }) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3.5 4.5h13v9.5h-6.2L6.5 17v-3H3.5V4.5Z", stroke: "currentColor", strokeWidth: "1.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.5 7.5h7M6.5 10h4.5", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })
      ] });
    }
    function Placeholder() {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "24px 28px", fontSize: 14, lineHeight: 1.7 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { style: { margin: "0 0 8px", fontSize: 18 }, children: "AI \u77E5\u8BC6\u5E93\u6559\u5B66" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { margin: 0, opacity: 0.75 }, children: [
          "\u5BA2\u6237\u7AEF\u5DE5\u4F5C\u533A\uFF08T05\uFF09\u6B63\u5728\u63A5\u5165\uFF1BHost \u4FA7 /api/teaching \u8DEF\u7531\u5DF2\u5C31\u7EEA\uFF08",
          PLACEHOLDER_VERSION,
          "\uFF09\u3002"
        ] })
      ] });
    }
    function apply(ctx) {
      ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID }, Placeholder));
      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 10,
        label: () => "AI \u6559\u5B66"
      }, TeachingIcon));
    }

    return module.exports;
  },
});
