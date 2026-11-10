# 项目记忆：dsh-teaching-plugin

> **性质**：改造前的项目事实记忆与速查，不是需求、计划或承诺。
> **生成**：2026-11-10（Asia/Shanghai）｜**基线**：`main` @ `ea366c4`，工作树 clean｜**核对方式**：本机实跑 `tsc` / `pnpm test`、读代码与证据文档。
> **权威顺序**：产品范围以 [`docs/requirements.md`](../requirements.md)（R01–R40）为准；计划以 [`docs/plan.md`](../plan.md) 为准；运行事实以 `docs/evidence/` 与当前代码为准；本文件冲突时以代码为准。
> **详细代码地图**（三份分区记忆，行号对应本基线）：
> - [`memory/host-and-api.md`](memory/host-and-api.md) —— Host 装载链路、64 个 operation 路由、长任务/SSE/模型桥/能力探测、错误码
> - [`memory/client-ui.md`](memory/client-ui.md) —— 客户端注册、组件树、state/SSE、样式与左右栏布局、UI 陷阱
> - [`memory/core-modules.md`](memory/core-modules.md) —— teaching-core 模块地图、seam、不变量、数据布局、测试覆盖

## 1. 这是什么项目

面向 **DeepSeek Harness Desktop** 的 AI 知识库教学插件，npm 包名 `dsh-teaching-plugin`（当前 `0.1.2`）。
学生导入自己的本地课程资料（Markdown/文本/PDF/图片/Word/PPT/代码/Notebook）→ AI 访谈式规划并生成可修改课程结构 → 在对话中教学、练习、做实验（Python/JS/Scheme 真实运行）→ 保存学习记录、复习、导出离线页面、备份/恢复。

安装形态是一个 Harness bundle，一个 package 同时挂两半：

| 半 | 运行位置 | 职责 |
| --- | --- | --- |
| Host（`lib/index.js`） | Electron Node 进程中的 Cordis 行 `ai-teaching` | `/api/teaching/*` exact Fetch 路由（64 个 operation）、`$DSH_HOME/teaching` 本地权威状态、模型桥、长任务/取消/重启恢复、能力探测 |
| Client（`lib/client.js`） | Harness Web 前端 | 左侧栏「AI 教学」入口（`sidebar.panellist`，id/order/label 见 client 记忆）+ 中央 keyed 页面（`main`） |

依赖方向：`client → HTTP → host → teaching-core`。`teaching-core` 是纯 TS 领域层，**不 import `@deepseek-ai/*`、不联网**，被 esbuild 内联进 Host 产物；宿主只提供 `ctx.connection.fetch`、`ctx.llm`、`ctx.agentDefaultModel`、`ctx.slots`、可选 `ctx.web`/`uiWorkspace`。

## 2. 当前真实状态（2026-11-10 核对）

| 项 | 值 | 依据 |
| --- | --- | --- |
| 仓库 / 分支 | `git@github.com:gbt24/dsh-teaching-plugin.git`，`main`，HEAD `ea366c4`，工作树 clean | `git log/status` |
| 插件版本 | `0.1.2`（`package.json`、`src/version.ts` 单一来源，有单测校验） | `node -e …version` |
| 目标 DSH | `>=0.2.2-rc.1 <0.3.0`；本机 Desktop `0.2.2-rc.1`（Info.plist） | `packages/dsh-plugin/package.json:19-20`、Info.plist |
| 自动基线 | `tsc` **0 errors**；`pnpm test` **525/525 pass**（node v26.8.1 / pnpm 12.16.1） | 本次实跑 |
| 构建产物 | `lib/client.js` 1,144,353 B（1117.5 KiB）、`lib/index.js` 2.5 MB；**`lib/` 已提交进 git** | `ls -l`、`git ls-files` |
| CI | GitHub Actions 在 `ea366c4` **success**（run 42641418675，ubuntu+Node 24，install→typecheck→test→build→pack） | `gh run list` |
| npm | `dsh-teaching-plugin@0.1.2` 为 `latest`（2026-11-09T14:56Z）；发布需 2FA 或 bypass token | `npm view` |
| GitHub Release | `v0.1.2` 只发版本说明，**不再附 tgz/zip** | release 页 |
| 本机 Desktop | 已安装为本地链接：profile 依赖 `link:/Users/gbt24/Projects/dsh-teaching-plugin/packages/dsh-plugin`，`bundles` 含 `dsh-teaching-plugin`；重启/刷新应用加载新 `lib/` | `~/.dsh/profiles/desktop/package.json` |
| 学习数据 | `$DSH_HOME/teaching/`（默认 `~/.dsh/teaching/`），schema 1，原资料只读 | `storage/layout.ts` |
| 证据规模 | `docs/evidence/` 11 个 md；`assets/` 107 张 png + 3 个 json；`.scratch/` 2.8 GB（gitignored 开发现场） | `find/du` |

已知陈旧文档（以本文件 §2 与代码为准）：`docs/evidence/T08.md`（0.2.1-rc.5 / `dsh-ai-teaching@0.1.0` / 339 测试时期）、`docs/evidence/T08-trace.md`（2026-11-05 追踪表）、`docs/impl/PAUSE-STATE.md`（299 测试时期）、`docs/technical-decisions.md` 的 TD01 版本条目、`T05.md` 附录旧记录。

## 3. 代码地图（顶层）

| 区域 | 关键文件 |
| --- | --- |
| 插件清单 | `packages/dsh-plugin/package.json`（`dsh.bundle.patch`、`dsh.client`、`engines.dsh`、`peerDependencies`）、`cordis.patch.yml`（唯一 insert 行 `id: ai-teaching`） |
| Host | `src/host/index.ts`（`apply()` 装配）、`routes.ts`（64 operation + SSE）、`tasks.ts`（长任务）、`model-adapter.ts`（`ModelClient` 实现）、`web.ts`、`context.ts`（压缩）、`settings.ts`、`visual-service.ts`、`minimal.ts` |
| Client | `src/client/index.tsx`（slots 注册、样式注入、错误边界）、`state.ts`（reducer + 请求/SSE）、`components/*.tsx`（Workspace 1777 行、PlanningWizard、TeachingArea、ChatPanel、Onboarding、DraftReview、MaterialsPanel、TopBar 等）、`styles.ts`（约 617 行 CSS 字符串）、`resize-layout.ts`（左右栏宽度模型） |
| Core | `packages/teaching-core/src/{contracts,corpus,teaching,learning,experiments,environments,portability,render,planning,storage,model}`；`contracts/api.ts` 是 Client↔Host 唯一契约总表（入口 `API_PREFIX='/api/teaching'`，`chat.send` 唯一 SSE） |
| 构建/发布 | `scripts/build-plugin.mjs`（esbuild：Host ESM externals `node:*`；Client 包成 `window.__ModuleLoader__.load` 工厂，external 仅 react/react/jsx-runtime）、`scripts/pack-plugin.mjs`（生成可发布的 `dist/`，去 `private` 与 `workspace:*`）、`scripts/smoke-t01.mjs`（真实 Host 的 API 冒烟） |
| 测试 | `packages/*/tests/**/*.test.ts` 共 56 个文件，`node --test` 直接跑 `.ts` |

## 4. 命令速查

```bash
# 依赖 / 检查 / 构建（改源码后必须重建并提交 lib/）
pnpm install
pnpm typecheck                 # tsc --noEmit（0 errors 才算通过）
pnpm test                      # node --test，当前 525 项
node scripts/build-plugin.mjs  # 生成 packages/dsh-plugin/lib/{index.js,client.js}
pnpm run pack                  # 生成 dist/dsh-teaching-plugin-<version>/（npm 发布用，gitignored）

# 开发调试：隔离 DSH_HOME，不碰 ~/.dsh（.scratch 已 gitignore）
DSH_HOME="$PWD/.scratch/dsh-dev/home" \
  "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  --profile teaching-dev --no-open --port 3180
# 终端会打印带 token 的访问 URL；客户端可配合 scripts/smoke-t01.mjs <url> <token> <fixture> 验证 API 主流程

# 安装到真实 Desktop（npm 形态，需先完全退出应用）
dsh plugin --profile desktop add dsh-teaching-plugin        # 或固定 dsh-teaching-plugin@0.1.2
dsh plugin --profile desktop remove dsh-teaching-plugin
```

本会话文件策略为 workspace-write：**bash 不能写 `~/.dsh`**。真实 Desktop 的插件生命周期走应用内插件管理器（`install_bundle`/`remove_bundle`，live profile 立即 `applied`），或由用户退出应用后在终端执行上面的 CLI。开发 profile 是 `.scratch/dsh-dev/home`（`teaching-dev`，已 link 本仓库包）。

## 5. 改造前必读的约束

1. **范围已冻结**：R01–R40 是用户确认的产品范围，改范围要用户明确确认（`requirements.md`「完成与变更规则」）；阶段完成 ≠ v1 完成。
2. **契约先行**：新增/修改操作要同时改 `teaching-core/src/contracts/api.ts`、Host `routes.ts` 注册、Client 调用与宿主契约测试；HTTP 一律 200 + `Result` envelope，成功与否看 `ok` 字段（不能只看状态码，SSE 内部用 `error` 事件）。
3. **core 边界**：不得在 `teaching-core` 引入 `@deepseek-ai/*`、HTTP 网络或 Host-only 依赖；模型只经 `ModelClient` seam（测试用 `ScriptedModelClient`）。
4. **运行时语法的约束**：`node --test` 直接跑 `.ts`，Node 26 strip-only 模式——不能使用 `enum`、`namespace`、构造器参数属性；import 需带 `.ts` 后缀。
5. **构建产物入库**：`lib/` 已提交，克隆即可安装；改完源码必须 `node scripts/build-plugin.mjs` 并把 `lib/` 一起提交，否则安装/发布内容与源码不一致。
6. **Desktop 版本边界**：`engines.dsh` 锁 `>=0.2.2-rc.1 <0.3.0`；换 Desktop 版本后要重跑安装与启动验证再放宽。
7. **不要动用户数据**：学习数据只在 `$DSH_HOME/teaching/`；原资料永远只读；测试用隔离 `DSH_HOME`。
8. **不要用普通 npm 安装的 `dsh` 改 desktop profile**；Desktop 自己的 CLI/插件管理器才是归属方。
9. **客户端 React 复用宿主**：bundle 只外部化 `react`、`react/jsx-runtime`，不打包第二套 React/Cordis。
10. **UI 验证不能只看单测**：改 UI 后要在 dev GUI（注入 DSH 框架变量模拟桌面）或真实 Desktop 截图验证，并写进 `docs/evidence/T05.md`（或新 Txx）；「tsc + 单测通过」不等于桌面通过。
11. **版本升级走单点**：`packages/dsh-plugin/src/version.ts` + `package.json` 同步（单测会校验），顶栏显示该版本；发布序号与 tag/Release/README/install 文档保持一致。

## 6. 已知陷阱与一手事实

- **DSH 框架 CSS 变量**：`--dsh-frame-top-clearance`（macOS 48px）只供「入口型页面」做顶部内边距；主面板/会话区从窗口顶开始。插件 root 曾因为它 `padding-top` 出现 48px 黑边，现行做法是 **root 不设顶部 padding**，顶栏只用 `--dsh-frame-leading-clearance` 做 `padding-left`（收起 160px/全屏 84px/无变量 14px），并加 `data-window-drag` 保持顶栏空白可拖窗口。改布局时不要恢复顶部避让。
- **左右栏宽度**：右手柄必须位于「聊天区与右栏之间」（曾错误挂在 `.ai-pane-right` 之后，贴窗口最右缘导致拖不动）；宽度用 `resolvePaneWidths(preference, {containerWidth, leftCollapsed, rightCollapsed})` 只扣可见列，偏好与生效值分离，`localStorage` 键 `ai-teaching:widths:v2`；用 `ResizeObserver` 观察 `.ai-teaching-body`（DSH 外层侧栏折叠不会触发 window resize）；工作区 <780px 进入 compact（手柄隐藏）。
- **模型输出上限**：教学主调用 `maxTokens:12000`；大段 SVG/HTML 塞进 JSON 会被截断（`Unterminated string`）——可视化走专用 `generateVisual` 与 fence 转活动回退；规划访谈/PlanBrief 曾因 1600/4096 tokens 截断解析失败，现为 4096/8192。
- **能力缺失是显式降级**：未挂 `ctx.web`/无搜索 provider 时返回 `capability-missing`，教学降级为「本地资料 + 模型知识」并标注；OCR 用本机 tesseract（从 Finder 启动 PATH 很短，代码有 `/opt/homebrew/bin` 等回退）；不支持的能力不伪造。
- **KaTeX 字体未内联**（离线页面用回退字体）；**Mermaid 只显示源码**未接渲染；模型下拉曾有祖先 `opacity` 导致透明，现行菜单用不透明层色 + `isolation`（仍非 portal）。
- **链接安装的 peerDependencies 警告可忽略**：`@deepseek-ai/cordis ~4.0.5` 只是声明，Host/Client 实际不 import；构建 externals 仅 `node:*`。
- **exact Fetch route** 必须形如 `/api/<segment>[/<segment>]`，否则激活抛 `invalid exact Fetch route`；只对 owner peer 放行。
- **压缩默认几乎不触发**：压力阈值 80%、保留尾巴 16%（1M 窗口约 158k），需要显式 force 才压缩。
- npm 发布需要 2FA 或带 Bypass 2FA 的 granular token；发布目录是 `dist/`，不是仓库包本身（仓库包 `private:true` 且依赖 `workspace:*`）。

## 7. v1 未完成 / 待验收（改造决策背景）

| 项 | 状态 |
| --- | --- |
| AC19–AC22 四类课程（AI/SICP/数学/考研）真实人工教学评审 | ⏳ 需用户作为学生完成，v1 最大剩余项；说明见 `docs/impl/HUMAN-REVIEW.md` |
| 最近三轮布局修复的真实 Desktop 目视验收 | ⏳ dev 已验证；顶栏黑边、收起侧栏不遮挡、左右栏拉伸、能力提示关闭需重启后确认 |
| R36「AI 使用实验运行结果继续教学」 | ⏳ 契约扩展未做（可列 v1.1） |
| 记录管理 / 备份恢复 / 离线导出的客户端按钮流程 | 🟡 服务与 API 有证据，桌面按钮流程待人工（AC09/AC14/AC15） |
| 检索性能 | 🟡 300 文档 / 10.5M 字符：导入 6.4s、查询约 1.3s；优化项=课程级索引缓存（无 SLA，不阻断） |
| Windows / Linux | ⏳ 未验证；发布只声明 macOS 已实测 |
| npm 上 `0.0.0-stage` 占位版本 | 可 `npm deprecate` 清理（需用户 npm 权限） |

## 8. 改造前检查清单

1. 读本文件 §2/§5/§6 + 对应区域的 `docs/impl/memory/*.md`；涉及需求再读 `requirements.md` 相关 R/AC。
2. `git status` 确认工作树；跑 `pnpm typecheck && pnpm test` 记录基线（当前 0 errors / 525）。
3. 改 UI → 先起隔离 dev GUI 验证；改 Host/契约 → 用 `scripts/smoke-t01.mjs` 或 dev GUI 跑真实 API 流程。
4. 改完：`node scripts/build-plugin.mjs` → typecheck → test → dev/桌面验证截图 → 更新 `docs/evidence/`（新增分节，别覆盖历史）→ 提交（含 `lib/`）。
5. 版本/发布变更再走：升 `version.ts` + `package.json` → `pnpm run pack` → `npm publish dist/…` → tag + Release 说明（无二进制）+ README/install 同步。
6. 任何「待验证」结论必须产出证据或明确 gap；不要把 mock/单测写成桌面通过，不用模型代答冒充人工教学评审。
