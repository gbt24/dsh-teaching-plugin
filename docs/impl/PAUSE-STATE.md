# 暂停状态与恢复入口（2026-11-04 18:12 Asia/Shanghai）

> **历史文件（勿据此判断现状）**：本文件写于 299 项测试的暂停时点。当前状态、版本、命令与待办以 [`PROJECT-MEMORY.md`](PROJECT-MEMORY.md)（2026-11-10，基线 `ea366c4`）为准；本文件只保留当时的恢复入口记录。

用户要求暂停全部执行任务。本文件记录仓库真实状态、已验证/未验证事项与恢复时的第一步。

## 当前仓库状态

- 分支 `main`，工作区包含未提交的 T02/T03/T04/T05/T07 实现与 Host 整合改动；本文件与同一提交把这些改动固化为检查点。
- **全仓类型检查通过**：`npx tsc -p tsconfig.json --noEmit`（0 错误）。
- **全仓自动测试通过**：`pnpm test` → **299 tests / 299 pass / 0 fail**。
- 开发用隔离环境（gitignore，不随仓库提交）：`.scratch/dsh-dev/home`（profile `teaching-dev`，已 link 安装 `packages/dsh-plugin`）。
- 已停止：dev profile Host 进程（3180）、agent-browser/Chrome 会话、全部 teammate 执行、goal 已 pause。

## 已完成并有证据

| 阶段 | 状态 | 证据 |
| --- | --- | --- |
| T00 | bundled runtime 关键通路通过；Electron 进程内装载待用户批准 | `docs/evidence/T00.md` |
| T01 | 契约/存储/模型桥/路由/长任务/最小流程通过（24 项自动测试 + 真实 runtime 实测）；客户端 UI 由 T05 替换后尚未在本阶段复验 | `docs/evidence/T01.md`（路由测试已升级为真实 Corpus/Teaching/Learning/Experiments 服务） |
| T02 | 交付：9 类格式解析、定位、OCR/不确定性、检索、课程草案、变化检测、批量进度；44 项测试；18 个可分发样例 | `docs/evidence/T02.md` |
| T03 | 交付：流式教学回合、任务形态/形式选择、来源纪律、冲突/不确定性、双语言 | `docs/evidence/T03.md` |
| T04 | 交付：独立性/帮助层级、客观优先、rubric 降级、四维掌握证据、争议/重检、复习 | `docs/evidence/T04.md` |
| T05 | 交付：完整客户端工作区（侧栏入口+教学页）、声明式渲染器（Markdown/KaTeX/graph/figure/derivation/code/quiz）、Python/JS/Scheme 真实运行器；客户端视觉为 **mock Host** 截图 | `docs/evidence/assets/T05/t05-ready.png`；T05 evidence 文件**尚未写** |
| T07 | 交付（代码+测试）：ZIP 备份/校验/恢复、记录导出/删除/重置、离线 HTML 导出器；**Host 路由尚未接线** | `docs/evidence/T07.md`（需按最终接线更新） |
| T06 / T08 | 未开始 | — |

## Host 整合进展（本次暂停前的工作）

已完成：
- `packages/dsh-plugin/src/host/index.ts` 已创建并注入：真实 `CorpusService`、`TeachingService`、`LearningService`（含 model rubric assessor）、`RunnerRegistry`、可选 `ctx.web` 桥、usage 记录。
- `routes.ts`：`sources.import/refresh/get`、`courseDraft.generate/get` 已切到真实 corpus；`chat.send` 已改为 TeachingService 流式事件（phase/delta/activity/evidence/position/done/error）；`attempts.submit`、`mastery.dispute/recheck`、`review.list` 已切到 LearningService；`activity.run`/`experiments.run`/`experiments.cancel`/`environments.list` 已切到 RunnerRegistry。
- `packages/dsh-plugin/tests/host/routes.test.ts`：4 项 route 契约测试使用真实服务 + ScriptedModel 通过。

未完成（恢复后的直接入口）：
1. **重新构建并实战验证**：`node scripts/build-plugin.mjs`，然后
   `env -u DSH_PROFILE -u DSH_SESSION_ID DSH_HOME="$PWD/.scratch/dsh-dev/home" "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" --profile teaching-dev --no-open --port 3180`
   用 `node scripts/smoke-t01.mjs <url> <token> .scratch/fixtures/overfitting.md` 验证真实模型的完整流程（教学服务替换 minimal 后尚未跑过）。
2. **客户端真实页面验证**（给 ui-dev 的 dev URL；ui-dev 已停止，恢复后重新派发/继续）：侧栏入口→首次向导→导入→草案确认→SSE 对话→graph 调参/code-run 真跑→刷新恢复。
3. **T07 路由接线**：`portability.export/backup/inspect/restore`、`records.export/delete/reset` 目前仍返回 `capability-missing`；服务已实现，Host 只需包装长任务并注入 `createPortabilityService({state, courses, sessions, learning, pluginVersion, appVersion})`。
4. **桌面 profile 安装**（T00/T01/T08 的真实桌面证据）：bash 无法写 `~/.dsh`（sandbox EPERM），需用应用内 `plugin_manager` 工具（需用户批准 danger-full-access）或用户协助重启 Desktop；建议在功能稳定后做一次，并请用户目视确认左侧栏入口。
5. **证据更新**：补 T05 evidence；更新 T01/T07；T02/T03/T04 的桌面实测仍需真实桌面联调。
6. **T06**（环境扩展/资源替代）与 **T08**（分发/规模/四类课程人工评审）未开始。

## 恢复时的环境速查

- Desktop/runtime：0.2.2-rc.1（bundled Node 24.21.0 / Electron 44.7.0）。
- 构建：`node scripts/build-plugin.mjs`（Host `lib/index.js` + Client `lib/client.js`）；`pnpm build` 同义。
- 依赖已装：pdfjs-dist、mammoth、fflate、fast-xml-parser、katex、biwascheme。
- 宿主工具：python3 3.15.2、tesseract 5.5.4（eng+chi_sim）、pdftoppm/gs/cupsfilter。
- 约束：Node 26 strip-only（禁止构造器参数属性/enum/namespace）；import 带 `.ts`；不写 `~/.dsh`；不改 contracts/storage/host 之外的队友范围（恢复时重新指派）。
- 团队任务板：task-1（T02）、task-2（T03/04）completed；task-3（T05）、task-4（T07）in_progress（执行者已停止，恢复后需重新领取或由 Lead 接管收尾）。

## 恢复第一步（建议顺序）

1. 读取本文件 + `docs/plan.md` + 最新 `git log`。
2. `npx tsc -p tsconfig.json --noEmit && pnpm test` 确认基线仍为 0 错误 / 299 pass。
3. 重新构建插件、启动 dev profile、跑 smoke（见上）。
4. 通过后补 T05 视觉/交互真实验证，接线 T07 路由，更新 T01/T05/T07 证据。
5. 申请一次桌面安装/重启验证（用户批准），然后进入 T06/T08。
