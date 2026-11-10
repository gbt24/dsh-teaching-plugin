# Client UI 项目记忆（dsh-teaching-plugin）

> 生成日期 **2026-11-10** ｜ 基线 HEAD **ea366c4** ｜ **本文件为事实记忆，非需求**（需求见 `docs/requirements.md`，计划见 `docs/plan.md`）。
> 范围：`packages/dsh-plugin/src/client/**` —— 运行在 DeepSeek Harness Desktop/Web 前端里的 React 客户端，通过左侧栏「AI 教学」打开中央教学页。
> 引用约定：路径相对仓库根，行号为 2026-11-10 快照；源码优先于证据文档（`docs/evidence/T05.md` §19 的部分宽度参数已被 §21 取代）。

## 1. 注册与入口（index.tsx）

- 包声明：`packages/dsh-plugin/package.json:7` `main=lib/index.js`（Host 半）；`:10` `./client=lib/client.js`（浏览器半）；`:22-29` `dsh.client={platform:"web"}`；`packages/dsh-plugin/cordis.patch.yml:6-8` 以一条 `id: ai-teaching` 记录同时挂 Host/Client 半。装载链路：`src/client/index.tsx`（`scripts/build-plugin.mjs:53`）由 esbuild 打成 CJS（:62-77，externals 仅 react/react-dom 系列），再包成 `window.__ModuleLoader__.load({ id: <包名>, factory: (require) => … })`（:80-90）；模块导出 `name='ai-teaching-client'`（:16）、`inject=['slots']`（:19）与 `apply(ctx)`（:141），由 Harness 装载器在浏览器里调用（apply 的调用方在 DSH 宿主内，不在本仓库；包格式实测见 `docs/technical-decisions.md:37`）。
- 面板 id：`PANEL_ID='ai-teaching'`（`index.tsx:22`），两侧共用，保证点侧栏入口即切到对应 keyed 主面板。
- `apply(ctx)`（`index.tsx:141-155`）：
  - 中央页：`ctx.slots.inject('main', () => ctx.slots.register({ name:'main', key: PANEL_ID }, () => <TeachingPage …/>))`（:144-147）。
  - 侧栏入口：`ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name:'sidebar.panellist', id: PANEL_ID, order: 10, label: () => 'AI 教学' }, TeachingIcon))`（:149-154）。
- 样式注入：`ensureStyles()` 在 `TeachingPage` 的 `useEffect` 里执行（:94-103）；`injectStyle` 按 id 复用并对比内容更新（:31-42，live 重组合时不残留旧 CSS），注入 `katex.min.css` 与 `TEACHING_CSS`（:45-50）。KaTeX 字体未随包分发，公式走回退字形（:46-48，已知局限）。
- 渲染兜底：`PanelErrorBoundary` 把渲染异常显示为 `.ai-banner[data-kind=error]`（:69-91）。
- 目录选择：`bindDirectoryPicker(ctx)`（:112-124）在点击时惰性 `ctx.get('uiWorkspace')`，不可用/抛错返回 `null`，向导保留手动路径输入。

## 2. 组件树与职责

根组件 `TeachingWorkspace`（`components/Workspace.tsx:134`）由 `TeachingPage` 包裹。挂载树（`Workspace.tsx:1372-1771`）：

```
.ai-teaching-root (1373)
├ TopBar (1374-1393)  ├ notice Banner (1394)  ├ fatal/loading
├ Onboarding (phase=onboarding, 1413-1419)
├ CourseSetupCard (1420-1433) / integrationDraft DraftReview (1434-1448)
└ .ai-teaching-body (phase=ready 且结构已确认, 1450-1586)
  ├ .ai-pane-left > Sidebar (> MaterialsPanel) (1461-1505)
  ├ ResizeHandle left (1506-1516)
  └ .ai-teaching-main (1517-1585)
    ├ ChatPanel (> InlineActivity / ChatVisualPreview / 页内全屏 overlay)
    ├ ResizeHandle right (1537-1547)
    └ .ai-pane-right > TeachingArea (仅 !compact, 1548-1584)
+ 弹窗：压缩上下文/编辑目标/删除活动/删除会话/删除课程 (1588-1771)
```

| 组件（文件） | 职责 | props 来源 |
| --- | --- | --- |
| `TopBar`（TopBar.tsx:245） | 课程标题/目标、左右栏折叠、模型与推理力度、上下文 meter+压缩入口、语言、离线、任务条、能力提示关闭 | Workspace:1374-1393，数据来自 `state.bootstrap/modelCatalog/contextUsage/tasks/online`、`courseDetail`、`goals`（:1327-1330） |
| `Sidebar`（Sidebar.tsx:130） | 课程导航/新建/删除/编辑目标、概念进度与章节、学习会话、复习建议、资料区 | Workspace:1462-1504（`state.courses/courseDetail/sessions/session/mastery/review/progress` + 回调） |
| `ChatPanel`（ChatPanel.tsx:310） | 持久消息、流式文本、证据 chip、快捷操作（skip/hint/full-answer/restyle）、输入与停止/重试、聊天内图形活动与 visual 预览 | Workspace:1518-1536 |
| `TeachingArea`（TeachingArea.tsx:648） | 四 tab：当前活动/来源/实验运行结果/笔记；当前活动严格取 `session.position.activityId`，历史活动可恢复 | Workspace:1549-1583（`state.activities/activityStates/attemptFeedback/latestRuns/selectedTab` 等） |
| `PlanningWizard`（PlanningWizard.tsx:307） | AI 访谈 → PlanBrief → 候选资料 → 抓取 → 建课的完整向导 | 由 `Onboarding.tsx:175` 挂载；`onCourseCreated` → `Workspace.finishGuidedCourse`（:1334） |
| `MaterialsPanel`（MaterialsPanel.tsx） | 资料列表、添加资料（本地/URL）、“整合到知识库”增量整合 | `Sidebar.tsx:350`；直连 `sources.importWeb`（:124）/`sources.integrate`（:151） |
| `Onboarding`（Onboarding.tsx） | 首建课程三步向导 + 规划建课入口 + 任务进度/重试 | Workspace:1413-1419（`onboardingCallbacks` :1353-1370） |
| `DraftReview`（DraftReview.tsx） | 草案章节/概念编辑、排序、增删、确认；显示整合摘要 | Onboarding.tsx:356、Workspace:1436、CourseSetupCard |
| `CourseSetupCard`（CourseSetupCard.tsx:34） | 仅草案无确认修订时的“课程结构待确认”卡（生成/审阅/随问随学） | Workspace:1420-1433 |
| 子件 | `InlineActivity`（包装 core `mountActivity`，含全屏）、`ChatVisualPreview`（沙箱 iframe 预览 visual fence）、`Markdown`（安全的 Markdown/KaTeX 渲染） | ChatPanel.tsx:175-195 |

## 3. 状态层 state.ts（纯 reducer，无 I/O）

- 重要事实：`state.ts` 不发请求；所有 fetch/SSE 在 `Workspace.tsx`。状态只由 Host 响应 + `ChatStreamEvent` 驱动（`state.ts:1-8`）。`WorkspaceState` :45-81，`WorkspaceAction` :103-142，`workspaceReducer` :274-514。
- 客户端实际调用的 exact routes（`/api/teaching/<op>`，契约见 `packages/teaching-core/src/contracts/api.ts:133-406`；下列括号内行号默认指 `Workspace.tsx`）：
  - 启动：GET `bootstrap`、`courses.list`（Workspace:337-338）。
  - 课程/草案：GET `courses.get`+`sessions.list`（:354-357）、POST `courses.create`(:1049)、POST `courses.delete`(:381)、POST `courseGoals.update`(:1020)、GET `courseDraft.get`(:1120/:1188)、POST `courseDraft.generate`(:1110)/`courseDraft.confirm`(:1144)。
  - 会话：POST `sessions.create`(:440)、GET `sessions.get`(:427/:578)、POST `sessions.delete`(:457)/`sessions.position`(:740)。
  - 聊天：POST `chat.send`（唯一 SSE 路由，契约 api.ts:502；客户端 `apiChatSend` :136）、POST `chat.cancel`(:590)。
  - 活动/学习：POST `activity.state`(:648/:912)、`activity.run`(:676)、`activity.delete`(:781)、`attempts.submit`(:837)、`experiments.cancel`(:721)、GET `runs.latest`(:414)。
  - 资料：GET `sources.get`(:930)、POST `sources.refresh`(:939)、`sources.import`(:1085)、`sources.integrate`/`sources.importWeb`（MaterialsPanel.tsx:151/:124）。
  - 规划：`planning.start/answer/brief/get/search/fetch/createCourse/cancel`（PlanningWizard.tsx）。
  - 模型/上下文：GET `model.catalog`(:315)、`model.info`（TopBar）、POST `model.set`(:1232)、GET `context.usage`(:324)、POST `context.compress`(:1278)、POST `profile.set`(:961)、GET `environments.list`(:954)。
  - 任务：GET `tasks.list`(:484)/`tasks.get`(:507)、POST `tasks.cancel`(:519)；子组件统一用 `task-poll.ts` 的 `waitForTask`。
- 传输层 `api.ts`：路由 `API_PREFIX` :14/`apiUrl` :52；成功/失败都 HTTP 200 + `Result` 封套（:70-92）；网络失败归一为 `ApiFailure{code:'network'}`（:63-67）；SSE 按空行分帧、只读 `data:` 行、未知事件类型显式拒绝（:183-226）；`consumeChatStreamResponse` 处理非 SSE 错误封套、缺终止事件→“连接中断”错误、finally 释放 reader（:252-336）。
- 流式状态机（`applyChatStreamEvent` :204-271）：`start`→studentMessage 入 messages、status=streaming；`progress` 只改 progressLabel；`delta` 累加 text；`activity` upsert 并选中/切到 activity tab；`evidence` 去重合并；`position` 改 session.position.stage；`done` 按 id 幂等追加（`appendMessage` :157-163）并回 idle；`error` 保留已流出文本并暴露 `AppError`。
- 刷新/恢复策略：Host 是唯一权威。`selectSession` 重新 GET `sessions.get` 恢复 messages/activities/states/learning，`deriveAttemptFeedback`（:166-176）从持久化 feedback 消息反推 quiz graded 状态；当前活动严格取 `session.position.activityId`，**没有“最新活动”回退**（:351-357，测试 state.test.ts:275）。
- 轮询/缓存：无客户端持久缓存；补充数据静默加载（model catalog、context usage、latest runs、tasks）；任务列表轮询 1.5s（Workspace:487-493），单任务等待上限 120s / 800ms 间隔（:502-515）。
- 错误处理：bootstrap 失败→`phase='fatal'`+`fatalError`；局部失败→`notice` banner；补充数据失败静默不阻塞教学；SSE 协议错误→`chat/local-error`；离线时拒绝发送并提示（:538-541）。
- 本地存储只有 3 个 key，均非权威数据：`ai-teaching:layout`（`layout-prefs.ts:16`，左右栏折叠）、`ai-teaching:widths:v2`（`resize-layout.ts:23`，宽度偏好）、`ai-teaching:dismissed-warning`（sessionStorage，`TopBar.tsx:249/258`，能力提示签名）。

## 4. 布局与样式

### 4.1 类名体系（`styles.ts` 单字符串 `TEACHING_CSS`，由 index.tsx 注入）

- 颜色一律用 DSH 主题变量 `--dsw-alias-*`（bg-base/bg-layer-1/label-primary/border-l2/state-*/link/markdown-code-block）带中性回退（:10 起）。
- 结构：`.ai-teaching-root`（竖排 flex，`padding-top:0`，:10-22）→ `.ai-teaching-topbar`（:28-43）→ banner → `.ai-teaching-body`（横排三列，:62-70）→ `.ai-pane-left|right` 承载固定宽 → `.ai-teaching-main` → `.ai-resize-handle`（8px，:70-78）。
- 折叠/紧凑用属性选择器：`data-left-collapsed`/`data-right-collapsed`（:68-69、:381-382）；`data-compact="true"`（:283-293：body 竖排、隐藏手柄、main 竖排）。
- 其他族：`.ai-materials-*`（:503-527，紧凑资料行；此前缺 CSS 时被浏览器默认按钮渲染成大胶囊）、`.ai-planning-*`（:529-610，两列 grid、textarea 96px；760px 单列 :611）、`.ai-banner`（:232-238）、`.ai-modal-*`（:498-501）、`.ai-fullscreen-*`（:474-497；720px 铺满 :492-497）。图形活动 iframe 内联固定 520px（:467）。
- 页内全屏 HTML/图形：fixed overlay（z-index 120），Esc/点背景关闭（`ChatPanel.tsx:266-282`、:379-400）。

### 4.2 左右栏宽度模型（`resize-layout.ts`）

- 两个值刻意分离：**偏好**（persisted）与**解算**（rendered）；窄窗只夹紧解算值、不写回偏好（文件头 :1-14；`Workspace.tsx:276-279` 只持久化用户操作结果）。
- 常量 `PANE_LIMITS`（:25-40）：left 180–420 / default 232；right min 280 / default 480 / hardMin 240 / 上限 `max(280, floor(容器×0.6))`（rightMaxRatio 0.6，MAX_PREFERENCE 2400 :67）；chatMin 280；handleWidth 8；compactWidth 780。
- `resolvePaneWidths(preference,{containerWidth,leftCollapsed,rightCollapsed})`（:141-185）：只扣可见栏与可见手柄；空间不足**先缩右栏再缩左栏**，最后右栏可降到 240；返回 `{left,right,maxLeft,maxRight,compact}`。
- `shouldCompact`（:78-80，<780）、`visibleHandleCount`（:83-85）、`adjustPaneWidth`（:194-228，按生效宽度和真实上限做拖拽/键盘步进）、`resetPaneWidths`（:231-233）。
- 容器宽度用 `ResizeObserver` 观察 `.ai-teaching-body` 实际宽度（Workspace:155-166、:1450-1451），**不是** `window.innerWidth`——DSH 外层侧栏/右栏变化也会改变可用宽度；无 RO 时回退 window resize（:283-288）。
- 生效宽度落到 CSS 变量：非 compact 时在 body inline `--ai-left-width`/`--ai-right-width`（:1456-1459）；CSS 默认 232/480（styles.ts:64/66）。
- 偏好解析容错、storage 异常吞掉（:88-132）；`layout-prefs.ts` 同风格（:28-76）。
- 手柄交互：pointer capture 拖拽；双击/Home 复位；Arrow ±16、Shift ±48；`role=separator` + `aria-value*`（Workspace:76-131）。左手柄在左栏后、右手柄在 ChatPanel 与右栏之间（:1506-1516、:1537-1547）。

### 4.3 DSH 框架变量使用约束（历史踩坑结论）

- 只用 `--dsh-frame-leading-clearance`（行内/水平）：`.ai-teaching-topbar { padding-left: max(14px, var(--dsh-frame-leading-clearance, 0px)) }`（styles.ts:39）；**不要**给 root 用 `--dsh-frame-top-clearance`（styles.ts:10-22 注释 + 回归测试）。
- 变量语义（T05 §19.1 :924-928）：top-clearance = macOS 顶部 48px；leading-clearance = 外层侧栏收起 160px / 全屏 84px。但按 §20 核对：top-clearance 只供“入口型页面”，会话主面板（自带顶栏）从窗口顶开始。
- 顶栏可拖动窗口：`<header className="ai-teaching-topbar" data-window-drag="">`（TopBar.tsx:267-270），依赖 DSH base.css 的 darwin 规则；按钮/输入自动 no-drag。

## 5. 已实现功能入口

| 功能 | 入口与实现位置 |
| --- | --- |
| 课程导航/切换/进度条 | Sidebar.tsx:130-165；Workspace.selectCourse :352-370 |
| 新建课程（含 AI 规划） | Sidebar.tsx:134-143 → `wizard/open`；Onboarding（Workspace:1413）；PlanningWizard（Onboarding.tsx:175） |
| 删除课程 | Sidebar.tsx:166-176 → Workspace:377-408 确认弹窗（可选“同时删除解析记录”，原文件永不修改） |
| 编辑学习目标 | Sidebar.tsx:182-193 → Workspace:1011-1037（生成新课程修订；旧会话仍绑定旧修订） |
| 概念进度/章节 | Sidebar.tsx:198-285（有章节时分组；未确认结构给提示） |
| 学习会话建/切/删 | Sidebar.tsx:286-318；Workspace:438-478（删除保留课程/资料/学习统计） |
| 复习建议 | Sidebar.tsx:323-348 → 发一条复习请求消息 |
| 资料面板 | Sidebar.tsx:350 → MaterialsPanel（本地/URL 添加、整合到知识库；DraftReview 显示 integration 摘要） |
| 规划向导 | PlanningWizard：5 轮访谈→推荐答案/自定义→PlanBrief→候选资料→抓取→建课；任务轮询；无 web provider 时“按计划直接建课（无资料）” |
| 课程结构草案审阅 | DraftReview + CourseSetupCard；章节/概念编辑、排序、增删，未保存离开需确认 |
| 聊天与证据 | ChatPanel：流式文本、证据 chip 展开、skip/hint/full-answer/restyle 快捷操作、停止/重试 |
| 聊天内图形活动 + 全屏 | InlineActivity（core `mountActivity`）+ ChatVisualPreview；图形 kind 4 种（activity-kinds.ts:9）；页内全屏 overlay（ChatPanel:379-400） |
| 模型/推理力度 | TopBar ModelSelector :115-214（`model.catalog`/`model.info`/`model.set`） |
| 上下文 meter / 压缩 | TopBar ContextMeter :217-243 + Workspace 压缩弹窗 :1588-1646 |
| 语言切换/离线徽标 | TopBar :321-334 / :302 |
| 活动运行、实验、笔记 | TeachingArea 四 tab :648-719；代码运行/取消、历史运行、Notes 持久化 |
| 能力提示关闭 | TopBar :245-262、:338-351（sessionStorage 记 warnings 签名） |
| 资料文件夹选择 | `uiWorkspace.pickDirectory()`（index.tsx:112-124；T08.md:82-93） |

## 6. 最近三轮修复的事实与陷阱

### 6.1 顶栏黑边 / 框架 CSS 变量（T05 §19 :918-953、§20 :957-987）

- 经过：§19 为避免顶栏与 DSH UI 重叠，给 `.ai-teaching-root` 加 `padding-top: var(--dsh-frame-top-clearance)`；macOS 该变量 48px，root 背景近黑、顶栏略亮 → 顶栏上方出现约 48px 黑边。§20 核对源码/文档后确认：该变量只供“入口型页面”，会话主面板自带顶栏、应从窗口顶开始；真正的重叠是水平方向——外层侧栏收起时 `shell.leading` 座（红绿灯等）盖住主面板左上角，规范做法是用 leading-clearance 做行内 padding。
- 现行实现：root `padding-top:0`（styles.ts:10-22）；topbar `padding-left:max(14px,var(--dsh-frame-leading-clearance,0px))`（:39）；顶栏 `data-window-drag`（TopBar.tsx:270）。
- 陷阱：① 旧公式 `calc(var(...) - 56px + 14px)` 算成 118px<160px，侧栏收起仍被座盖住——回归测试明确禁止 `- 56px`（`tests/client/styles.test.ts:21-26`）；② 不要再给 root 恢复顶部 padding；若窄窗下 DSH 自己给 `mainPanel[data-global-panel]` 留 48px，按 T05 §20.4 计划 B 用顶栏同色填充；③ dev 验证靠注入 CSS 变量模拟 darwin，真实 Electron 几何仍需目视确认（§20.4）。

### 6.2 右栏手柄位置 + resolvePaneWidths（T05 §21 :991-1030）

- 现象：右栏无法自由拖宽。根因三条：① 右手柄 JSX 渲染在 `.ai-pane-right` 之后，贴在窗口最右缘而非聊天/教学区分隔线；② 旧 clamp 固定扣左栏 232 + 聊天 320 + 手柄 12，右栏上限被压到 388px（可拖 320–388），插件宽 ≤884px 时范围为 0；③ 挂载/resize 把 clamp 结果写回 localStorage，覆盖用户偏好，且只监听 `window.innerWidth`，DSH 外层侧栏折叠不触发。
- 现行实现：布局顺序 `[左栏][手柄][聊天][手柄][右栏]`（Workspace:1461-1586；右手柄 :1537-1547）；`resolvePaneWidths` 规则见 §4.2；偏好/解算分离、clamp 不写回、存储键升级 `v2`（resize-layout.ts:23）；`ResizeObserver` 观察 body；手柄 8px + hover/active 高亮竖线（styles.ts:70-78）。
- 陷阱：① T05 §19.1 写的“右栏 320–60%、聊天最小 320、key `ai-teaching:widths`”已被 §21 取代，以 §21 与源码为准；② 物理上限仍在（1232 窗口 + 外层侧栏展开时右栏最多约 424px），不是 bug；③ compact(<780) 时手柄隐藏，且**JSX 根本不挂载右栏 `TeachingArea`**（Workspace:1548，只渲染左栏+聊天），因此 CSS 里 `.ai-pane-right` 的 compact 规则在当前分支是死规则；④ 偏好按像素保存，不随窗口比例缩放。

### 6.3 模型下拉透明（T05 §9 :634-651，代码仍在）

- 现象：模型选择菜单背景透明、与聊天/能力提示文字重叠。根因：`.ai-topbar-meta { opacity: 0.62 }` 把整个模型选择器包在 62% 透明容器里，后代背景再正确也会被祖先 opacity 变透明，并让下层内容透出。
- 现行实现：`.ai-topbar-meta` opacity 1（styles.ts:47-48），只对非交互 span 用 0.62、交互控件显式 1（:51-54）；`.ai-model-menu` 用不透明层色 `--dsw-alias-bg-layer-2` 叠加 layer-1、`isolation:isolate`、`z-index:200`、`min-width:300px/max-height:60vh`（:396-403）；菜单 DOM 见 TopBar.tsx:131-211。
- 陷阱：菜单是 topbar 内绝对定位而非 portal——若 topbar 或祖先出现 `overflow:hidden`/更近定位上下文会被裁切，需改 portal/fixed；且未做“点击外部自动关闭”（T05 §9 局限）。

## 7. 客户端测试落点（只读清点，本次未运行）

- `packages/dsh-plugin/tests/client/` 11 个文件、96 个 `test()`：state 21、draft-edits 18、api 11、planning-helpers 10、context-meter 7、resize-layout 7、chat-visuals 6、activity-kinds 5、source-helpers 5、layout-prefs 4、styles 2（`grep -c "^test("`，2026-11-10）。
- `styles.test.ts` 就是 §6.1 的两条回归断言（root 不用 top-clearance；topbar 只用 leading 且无 `- 56px`）。
- `resize-layout.test.ts` 固化：952px 下 232/424、收起左栏后右栏 571、窄窗只夹紧偏好、compact 阈值、`v2` 存储键。

## 8. 未确认项 / 局限

- 真实 Electron Desktop 的 leading 座几何、黑边是否彻底消失：§20 仅在 dev 注入 CSS 变量验证；本轮按要求未构建、未启动应用、未跑 pnpm test/build。
- compact(<780px) 下右栏教学区完全不渲染是源码事实，但是否符合产品预期未在文档中确认。
- 规划向导无“历史规划列表/恢复”UI（T05 §15.3）；模型菜单非 portal、无外部点击关闭（T05 §9）。
- KaTeX 字体未内联，离线/缺字体环境走回退字形（index.tsx:46-48）；图形 iframe 主题不继承插件主题（T05 §12.3）。
- Harness 侧调用 `apply(ctx)`、提供 `slots` 服务与注入 React 的代码在 DSH 宿主内，不在本仓库；本仓库只能核查导出形状与 bundle 包装。
- 配套记忆：Host/API 层见 `docs/impl/memory/host-and-api.md`；本文件只覆盖 Client UI。
- 参考材料：`docs/impl/TEAM-BRIEF.md:40-46`（客户端只有 exact routes、React 由宿主注入）、`docs/evidence/T08.md:82-125`（文件夹选择、课程删除、目标更新、OCR 能力提示）、`docs/impl/HUMAN-REVIEW.md`（人工教学评审流程，非 UI 实现事实）。
