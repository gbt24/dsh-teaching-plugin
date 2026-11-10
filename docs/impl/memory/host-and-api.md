# Host / API 层事实记忆（dsh-teaching-plugin）

> 生成日期：2026-11-10 ｜ 基线：HEAD `ea366c4`（工作树 clean）｜ 本文件是**事实记忆**，不是需求、计划或承诺。路径均相对仓库根；`文件:行` 指该提交下的行号。凡 evidence 文档与当前代码冲突，以代码为准，冲突见 §5。

## 1. 插件装载链路

| 环节 | 事实 | 引用 |
| --- | --- | --- |
| 包身份 | npm 包名 `dsh-teaching-plugin`，版本 `0.1.2`；`main=lib/index.js`，`exports["./client"]=lib/client.js`；`private:true`（发布时 `pnpm run pack` 去掉） | `packages/dsh-plugin/package.json:2-3,7-12` |
| 兼容声明 | `engines.dsh=">=0.2.2-rc.1 <0.3.0"`；`peerDependencies["@deepseek-ai/cordis"]="~4.0.5"` | `packages/dsh-plugin/package.json:19-20,34-36` |
| bundle/client | `dsh.bundle.patch="./cordis.patch.yml"`；`dsh.client.platform="web"` | `packages/dsh-plugin/package.json:22-30` |
| patch | 只做一件事：`insert` 一行 `id: ai-teaching` / `name: dsh-teaching-plugin`；同一个 package 同时声明 Host entry 与 client export，故一行带两半 | `packages/dsh-plugin/cordis.patch.yml:6-8` |
| Host 入口 | `src/host/index.ts` 导出 `name='ai-teaching'`、`inject=['connection','llm','agentDefaultModel']`；`apply(ctx, config)` 是唯一入口 | `packages/dsh-plugin/src/host/index.ts:34,37,73` |
| 构建产物 | Host 由 esbuild 打成 Node ESM（externals 仅 `node:*`，core 内联），banner `// dsh-teaching-plugin v0.1.2 — Host half. Built for DeepSeek Harness 0.2.2-rc.1.` | `scripts/build-plugin.mjs:31-46`、`packages/dsh-plugin/lib/index.js:1` |
| 数据目录 | `resolveDataDir`：`config.dataDir` → `$DSH_HOME` → `~/.dsh`，末尾拼 `teaching`；默认 `$DSH_HOME/teaching` | `packages/dsh-plugin/src/host/index.ts:65-70` |
| 存储布局 | schema 1；目录 `courses/sources/sessions/activities/learning/environments/runs/tasks/exports/backups/usage/cache`；文件 `meta.json/student-profile.json/settings.json/usage/model-usage.jsonl` | `packages/teaching-core/src/storage/layout.ts:11-37` |
| 版本横幅 | `PLUGIN_VERSION='0.1.2'`（与 package.json 单测同步）；bootstrap 返回 `pluginVersion` 与 `builtFor:'0.2.2-rc.1'`；启动日志 `[ai-teaching] ready` | `packages/dsh-plugin/src/version.ts:8`、`host/routes.ts:223-224`、`host/index.ts:186` |

`apply()` 实际装配（`host/index.ts:73-258`）：仓库 `LocalState`+四个 Repository（79-83）；`TaskManager`（84）；`createWebBridge(ctx)`（85）；`HarnessModelAdapter`（94-107，`routingSessionId='session-teaching-plugin'`，usage 落 `usage/model-usage.jsonl`）；`createTeachingService({maxTokens:12000})`（87）；`RunnerRegistry`+`EnvironmentManager`（88-89）；`SettingsStore`（90）；`PortabilityService`（110-118，`appVersion:'0.2.2-rc.1'`）；`CorpusService`（141-147）；`createLearningFor(activity)`（153-171）。启动时序 `ready` = `state.open()`→`settings.load()`→`profiles.get()`→`tasks.recoverInterrupted()`（180-187），之后清理 stale environments/experiments（245-251）。`registerRoutes` 额外传入 `modelCatalog`（包 `ctx.llm.listProviders/listModels/resolveModelInfo`，207-227）、`defaultModelSelection=()=>ctx.agentDefaultModel.currentSelection()`（205）、`hostFacts`（236-241）、`getOcrInfo`（228）。`ctx.effect` 在 dispose 时取消任务/实验/环境（253-258）。

## 2. operation 路由清单（64 个 exact Fetch；`ApiRequests`/`ApiResponses` 各 64 键，本次按 HEAD 逐键核对）

前缀 `/api/teaching`（`packages/teaching-core/src/contracts/api.ts:494`），路径=前缀+operation（497-499），无路径参数。全部经 `ctx.connection.fetch.register` 注册，handler 前先 `await services.ready`（`packages/dsh-plugin/src/host/routes.ts:150-196`）。**T**=长任务（响应 `{task:TaskHandle}`）；**SSE**=流式。

- 启动/能力：`bootstrap`（首屏引导：版本/宿主事实/模型能力/数据目录/features/warnings）、`capabilities.get`（模型能力 + 环境目录）（199,246）
- 模型/上下文：`model.catalog`（provider/model/思考强度目录及 current/default/override/failures）、`model.info`（单模型窗口/输入模态/efforts）、`model.set`（设置插件级覆盖或改回跟随宿主）、`context.usage`（会话 token 用量与压缩检查点）、`context.compress`(**T** 压缩早期历史为检查点，可 force)、`context.reset`（删除检查点）（311,344,350,383,438,522）
- 规划：`planning.start`（开访谈并生成首轮问题）、`planning.get`（读计划）、`planning.answer`（提交本轮回答，可能 ready）、`planning.brief`（生成/确认 PlanBrief）、`planning.search`(**T** 联网搜候选资料)、`planning.fetch`(**T** 抓取选定候选并建 source)、`planning.createCourse`(**T** 建课+关联资料+llm-wiki 结构)、`planning.cancel`（标记计划取消）（625,652,659,725,762,833,900,971）
- 课程/草案：`courses.list`（课程摘要）、`courses.create`（建课程+draft 修订）、`courses.get`（课程详情）、`courses.update`（改标题/描述/status）、`courses.delete`（级联删课程/会话/活动/学习记录，可选删资料解析）、`courseDraft.generate`(**T** 生成草案)、`courseDraft.get`（读草案）、`courseDraft.confirm`（确认草案为 active，支持编辑）、`courseGoals.update`（新修订更新目标）（983,1002,1016,1032,1043,1350,1409,1418,1529）
- 资料：`sources.import`(**T** 导入本地文件/目录，目录递归展开)、`sources.importWeb`(**T** 按 URL 导入网页)、`sources.integrate`(**T** 解析资料整合进课程结构)、`sources.refresh`(**T** 重新解析单份文件探测变化)、`sources.get`（分页读资料单元）（1119,1172,1224,1271,1306）
- 会话/聊天：`sessions.list`（按课程列会话）、`sessions.create`（建会话，course/adhoc）、`sessions.get`（恢复工作区视图）、`sessions.delete`（删会话及活动/消息）、`sessions.position`（更新学习位置）、`chat.send`(**SSE** 教学回合)、`chat.cancel`（停止在途回合）（1582,1601,1657,1685,1712,1740,2109）
- 活动/实验：`activity.get`（活动+学生状态）、`activity.patch`（CAS 改 payload）、`activity.state`（存参数/代码/揭示/笔记）、`activity.run`（运行代码活动，返回 run+客观校验）、`activity.delete`（删活动/状态/runs 并清位置）、`experiments.run`（通用运行）、`experiments.cancel`（取消在途 run）、`runs.latest`（会话内每活动最新 run）（2122,2129,2155,2170,2267,2197,2218,2236）
- 学习：`attempts.submit`（提交作答→反馈与掌握证据）、`attempts.list`（尝试历史）、`mastery.list`（掌握记录）、`mastery.dispute`（标记争议）、`mastery.recheck`（重评）、`review.list`（复习项）（2315,2399,2415,2421,2432,2443）
- 档案/环境/任务：`profile.get`/`profile.set`（学生档案）、`environments.list`（环境目录与缺口）、`environments.prepare`(**T** 探测/准备语言运行环境)、`tasks.get`/`tasks.cancel`/`tasks.list`（长任务快照/取消/列表）（2455,2457,2463,2465,2512,2519,2526）
- 可迁移/记录：`portability.export`(**T** 离线 HTML)、`portability.backup`(**T** 备份 ZIP)、`portability.inspect`（读备份清单）、`portability.restore`（恢复）、`records.export`(**T** 导出记录 JSON)、`records.delete`（按 scope 删记录，需 confirm）、`records.reset`（重置学习/全部）（2532,2569,2594,2604,2616,2640,2652）

GET operation 白名单 21 个，其余一律 POST（`routes.ts:2667-2673`）；POST 请求体 `buffered`（176）。长任务共 13 个：上文 **T** 标记者，kind 与行号见 §3.1。

## 3. 关键机制

### 3.1 长任务注册表
- `TaskManager`（`packages/dsh-plugin/src/host/tasks.ts:47-236`）：`start()` 立即返回 `TaskHandle{id,snapshot}`，后台执行 `run(TaskContext)`；`TaskContext` 只暴露 `id/signal/step/warn/progress/result/cancelled`（17-30）。
- 状态 `queued|running|completed|partial|failed|cancelled`，步骤 `pending|running|done|skipped|failed`（`packages/teaching-core/src/contracts/task.ts:14,19-27`）；每个快照原子写 `tasks/<taskId>.json`（tasks.ts:229-235），`list()` 合并磁盘与内存按 `updatedAt` 倒序（181-190）。
- 取消：`cancel()` 对活动任务 `abort()` 并置 `cancelRequested`；已结束任务返回 `accepted:false`，未知任务抛 `not-found`（193-206）。任务实现须在 `context.cancelled()` 处自行停止。
- 重启中断：`recoverInterrupted()` 把上个进程遗留的 `queued|running` 改成 `failed`，错误 `cause:'interrupted'`、消息「宿主重启导致任务中断；已保留部分结果」、保留 `resumable`（59-82）；在 `ready` 内调用（index.ts:184）。
- 关闭：`dispose()` abort 所有活动任务并写 `cancelled/skipped`（214-227）；`tasks.get|cancel|list` 直接读注册表（routes.ts:2512-2528）。
- 13 个 kind：`context-compact / planning-search / planning-materials / planning-course / source-import / source-import-web / source-integrate / source-refresh / course-draft / environment-prepare / export-html / backup / records-export`（routes.ts:445,770,844,907,1134,1183,1233,1276,1367,2471,2536,2572,2619）。

### 3.2 SSE 与中断恢复
- 唯一 SSE operation 是 `chat.send`（`contracts/api.ts:501-502`；实现 `routes.ts:1740-2107`），响应头 `text/event-stream`（2103-2106），帧为 `data: <ChatStreamEvent JSON>\n\n`（1775-1777）。
- 事件全集 `start/progress/delta/activity/evidence/position/done/error`（`contracts/api.ts:113-129`）；`done|error` 为终态。学生消息先落盘再开流（routes.ts:1759-1765）。
- 在途取消：进程内 `activeChats: Map<sessionId, AbortController>`（1738）；`chat.cancel` abort（2109-2117）；浏览器断开时 `ReadableStream.cancel` 也 abort（2098-2101）。
- 失败可见：流内异常先持久化一条 `kind:'system-note'` 教师消息，再发 `error` 事件（2069-2092），刷新不会静默丢失。
- 压缩生效：开流前按 `session.context.compactedMessageIds` 过滤历史（1755-1757），UI 仍显示完整持久化历史。

### 3.3 模型桥
- `HarnessModelAdapter` 实现 core `ModelClient`，只依赖 `ctx.agentDefaultModel.currentSelection()` 与 `ctx.llm.stream()`（`host/model-adapter.ts:20-29`）。
- 有效选择=插件覆盖（`settings.json` 的 `model`）否则宿主部署默认（model-adapter.ts:108-110；`host/settings.ts:60-68`）；`model.set` 写/清覆盖并 `invalidateInfo()`（routes.ts:350-380）。
- 必须带 `sessionId`（pi-ai 路由要求，否则 400 `MissingSessionID`）：固定 `routingSessionId:'session-teaching-plugin'`（index.ts:95）写入 GenerateOptions（model-adapter.ts:72-77）。
- 非 chat 的辅助/结构化调用不继承部署 `reasoningEffort`，避免推理 token 挤占 JSON 输出（50-58）；手写 assistant 消息补 `id/content/source`（59-71）。
- 有界重试：单次 180s 超时、最多 2 次（32-33）；可重试判定 `/rate|timeout|network|503|502|429|overloaded/i`（282-287）；成功但无可见文本时去掉强制 reasoning 再试一次（233-239）。
- 终止判定：chunk `.type` ∈ `text-delta|usage|finish`，`finish.reason.kind` ∈ `stop|tool-calls|max-tokens` 为成功（175-211）；取消映射 `cancelled`（272-275）。
- 用量：每个 settled 调用产 `UsageEntry`（未知记 `usageUnknown`，221-231），`onUsage` 同时写 `usage/model-usage.jsonl`（index.ts:96-104）；chat 结束用 `takeUsage` 附到教师消息（routes.ts:2012-2050）。
- `complete()` 对 `request.json` 用 `extractJson` 解析，失败返回 `rawText/parseError` 而不抛（model-adapter.ts:293-314）。

### 3.4 能力探测（OCR / 搜索 / 运行器 / 模型目录）
- OCR：`apply()` 内一次性 `resolveOcrRuntime(undefined, DEFAULT_LIMITS)` 并缓存 `{available,reason,languages}`（index.ts:120-138）；`bootstrap.features.imageOcr` 与 warnings 取自真实结果（routes.ts:200-241）；不可用只降级为原文/图片，不伪造识别。
- 搜索/抓取：`createWebBridge` 用 `ctx.get('web')!==undefined` 判挂载（`host/web.ts:51-53`），调用时才判 provider，缺失返回 `capability-missing`（57,81,123）；`features.webSearch` 同源（routes.ts:237）；chat 缺能力写 `webNote` 降级为「仅基于本地资料与模型知识」（1793-1796）。
- 运行器：`RunnerRegistry`+`EnvironmentManager` 总是注册（index.ts:88-89），bootstrap 固定 `features.experiments:true`（routes.ts:238）；`capabilities.get` 返回 `environments.directory()`（246-259）；`environments.prepare` 是 **T**，四步 probe→approval→prepare→smoke（2465-2511）。
- 模型目录：`model.catalog` 逐 provider 调 `ctx.llm.listModels`，单个失败写 `failures[]` 而非整体失败（routes.ts:311-341）；`model.info` 归一化 contextWindow/inputModalities/reasoning efforts（270-310）。

### 3.5 错误码与 Result 语义
- core 公共 seam 返回 `Result<T>={ok:true,value}|{ok:false,error}`，13 个错误码：`invalid-input/not-found/conflict/capability-missing/needs-confirmation/cancelled/failed/unverified/limit-exceeded/storage/stale-revision/network/uncertain`（`contracts/result.ts:10-52`）。
- HTTP 层业务成败一律 200：成功 `{ok:true,value}`，失败 `{ok:false,error}`（routes.ts:113-127）；客户端必须读 `ok`，不能只看状态码。
- 请求体上限 2,000,000 字符（超限 `limit-exceeded`）；空体视为 `{}`；非法 JSON 为 `invalid-input`（129-138）。未知抛出由 `catchToResponse` 归一为 `failed`+`details.message`（141-152）。
- 版本冲突用 `conflict`：`activity.patch`/`activity.delete` 校验 `expectedRevision`（2134-2152,2272-2286）；`attempts.submit` 对已删除活动返回 `not-found`（2315-2327）。

## 4. 已知 gotcha（均有一手证据）

1. **链接安装的 peerDependencies 警告可忽略**：`package.json:34-36` 声明 `@deepseek-ai/cordis ~4.0.5`，但 Host/Client 源码不 import 任何 `@deepseek-ai/*`（grep 为空），构建 externals 仅 `node:*`；T08 记录该警告「实际不受影响」（`docs/evidence/T08.md:75`）。
2. **开发会话沙箱不能写 `~/.dsh`**：workspace-write 下写 `~/.dsh/profiles/desktop` 报 EPERM，desktop profile 必须走应用内 `plugin_manager`（bundled CLI 不能改 desktop profile，`docs/technical-decisions.md:40`；沙箱事实见 `docs/evidence/T00.md:64`、`docs/technical-decisions.md:42`）；真实安装走的是 `plugin_manager`（`docs/evidence/T00.md:74-79`）。
3. **真实模型输出上限会截断结构化输出**：教学主调用 `maxTokens:12000`（index.ts:87）；把大段 SVG/HTML 塞进教学 JSON 元数据会出现 `Unterminated string in JSON`，12k tokens 仍可能拿不到完整源码（`docs/evidence/T05.md:533,579`），故拆出专用 `generateVisual`（`host/visual-service.ts:1-10,29-36`，prompt 要求源码 ≤6000 字符）并在主回复无 visual 时回退 fence 转活动（routes.ts:1981-2010）。
4. **搜索 provider 缺失是能力缺口而非错误**：未挂载 `ctx.web`/无 provider 时返回 `capability-missing`（web.ts:57,81,123），chat 降级为本地资料回答（routes.ts:1793），规划搜索把每个查询失败写入 task `warnings`（routes.ts:786-796）；dev 环境真实 provider 长期不可用（`docs/evidence/T05.md:913`），插件不伪造结果。
5. **Desktop 从 Finder 启动时 PATH 很短**：OCR 找 `tesseract/pdftoppm` 除 PATH 外还查 `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`（`packages/teaching-core/src/corpus/process.ts:102-119`），T08 记录过该修正（`docs/evidence/T08.md:121`）。
6. **模型能力探测要用服务方法 `resolveModelInfo`**：旧实现用 adapter 侧 `resolveModel` 导致 `imageInput=unknown`；现优先 `ctx.llm.resolveModelInfo`、回退 `resolveModel`（model-adapter.ts:126-137；`docs/evidence/T08.md:123`）。
7. **exact Fetch route 必须在 `/api/` 前缀且只对 owner peer 放行**：否则激活期抛 `invalid exact Fetch route`，其他 principal 403（`docs/technical-decisions.md:35`）。
8. **HTTP 200 ≠ 成功**：见 §3.5；SSE 也是 200 内用 `error` 事件表达失败，客户端不能按状态码判错。
9. **压缩默认几乎不触发**：策略取 DSH compaction-basic 形状（80% 压力阈值、16% 保留尾巴、65,536 headroom，`host/context.ts:16-27`）；本部署窗口 1M，保留尾巴约 158k，需显式 `force`（context.ts:70-97；`docs/evidence/T05.md:508-517`）。

## 5. 参考文档中已过时的事实（以代码为准）

| 过时说法 | 出处 | 当前事实 |
| --- | --- | --- |
| 插件 `dsh-ai-teaching@0.1.0`、Desktop `0.2.1-rc.5`、`pnpm test` 339/339 | `docs/evidence/T08.md:79` | 包名 `dsh-teaching-plugin`、`0.1.2`；Desktop `0.2.2-rc.1`；最近记录 524/524（`docs/evidence/T05.md:1017`、`docs/install.md:3`、`package.json:3,20`） |
| `engines.dsh` 精确 `0.2.1-rc.5` | `docs/evidence/T05.md:822`（历史记录） | `>=0.2.2-rc.1 <0.3.0`（package.json:19-20），T05:820-841 记录了这次迁移 |
| `experiments.run` 同步返回、无法取消在途运行 | `docs/evidence/T05.md:1044`（附录旧记录） | 契约已加 `clientRunId` 与 `experiments.cancel`（api.ts:287-294,361-371；routes.ts:2197-2235），T08 异常矩阵实测在途取消通过（T08.md:59,68） |
| `meta.json` pluginVersion `0.1.0` | `docs/evidence/T00.md:77`、`T08.md:14` | 现写入当前 `PLUGIN_VERSION`（0.1.2，`version.ts:8`） |
| T05 早期「真实页面交互证据待 ui-dev」等阶段性结论 | T05 附录 | 已被 T05 第 16-21 轮与 T08 覆盖 |

## 6. 文件引用索引

| 文件 | 角色 |
| --- | --- |
| `packages/dsh-plugin/package.json` | 包身份、bundle/client 声明、engines、peerDependencies |
| `packages/dsh-plugin/cordis.patch.yml` | bundle patch，唯一 insert 行 `id=ai-teaching` |
| `packages/dsh-plugin/src/host/index.ts` | `apply()`：数据目录、服务装配、模型桥、OCR 探测、路由、生命周期 |
| `packages/dsh-plugin/src/host/routes.ts` | 64 个 operation、envelope/错误归一、chat SSE、长任务启动、目录导入展开 |
| `packages/dsh-plugin/src/host/tasks.ts` | 长任务注册表、快照落盘、取消、重启中断恢复、dispose |
| `packages/dsh-plugin/src/host/model-adapter.ts` | `ModelClient` 实现：选择、GenerateOptions、流式、用量、重试、JSON |
| `packages/dsh-plugin/src/host/settings.ts` | `settings.json` 插件级模型覆盖 |
| `packages/dsh-plugin/src/host/context.ts` | 压缩策略常数、选择算法、摘要提示词 |
| `packages/dsh-plugin/src/host/web.ts` | 可选 `ctx.web` 桥：search/fetch、能力缺口映射 |
| `packages/dsh-plugin/src/host/visual-service.ts` | 专用可视化生成调用 |
| `packages/dsh-plugin/src/host/minimal.ts` | 路由共用 helper（消息/活动/错误/课程记录） |
| `packages/dsh-plugin/src/version.ts` | `PLUGIN_VERSION` 单一来源 |
| `packages/teaching-core/src/contracts/api.ts` | 全部 operation、请求/响应类型、SSE 事件、`API_PREFIX`/`STREAMING_OPERATIONS` |
| `packages/teaching-core/src/contracts/result.ts` | `Result`/`AppError`/错误码 |
| `packages/teaching-core/src/contracts/task.ts` | `TaskHandle`/`TaskSnapshot`/步骤状态 |
| `packages/teaching-core/src/storage/layout.ts`、`local-state.ts` | 数据目录布局、schema 1、`meta.json` |
| `packages/dsh-plugin/tests/host/routes.test.ts` | 同一注册 seam 的契约测试（主流程、错误/冲突、规划、压缩、活动删除） |
| `scripts/build-plugin.mjs` | Host/Client 构建与版本 banner |

## 7. 未确认 / 需要以后验证

- Windows/Linux 未验证；`0.2.2-rc.1` 之后的 0.2.x 也未验证（`docs/evidence/T05.md:841`、`docs/install.md:9`）。
- `model.catalog` 在真实多 provider 组合下的行为只按代码推断（routes.ts:311-341）；某些 provider 列不出模型时只显示 `failures`。
- 真实 Electron Desktop 的完整教学流程仍需人工验收（AC19–AC22，`docs/evidence/T08.md:43-49`）。
- `onUsage` 先于 `done` 事件进入 Map 的顺序（model-adapter.ts:231,254-269 → routes.ts:2012-2050）在本仓库内成立，但依赖宿主 chunk 顺序；换 provider 后需复测。
- 本文件只覆盖 Host/API；client 装载（slots/ModuleLoader/SSE 解析）见 `docs/evidence/T00.md` 与 `packages/dsh-plugin/src/client/**`。
