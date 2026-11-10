# teaching-core 领域层事实记忆

生成日期 2026-11-10；基线 HEAD `ea366c4`；**本文件为事实记忆，不是需求，也不是改造提案**。需求以 `docs/requirements.md`（2026-11-04 确认版，R01–R40）为准；协作与写入范围见 `docs/impl/TEAM-BRIEF.md`。核查方式为只读代码/文档 + grep，未运行 `pnpm build`/`pnpm test`；行号均对应上述基线，路径相对仓库根。

## 1. 边界与依赖方向

- `packages/teaching-core` 是纯 Node/TypeScript 领域层，被 `packages/dsh-plugin` 的 Host bundle 用 esbuild 内联（`docs/impl/TEAM-BRIEF.md:7-15`）。
- 禁止依赖 Harness：`grep -rn "@deepseek-ai" packages/teaching-core/src` 零命中；core 也不 import `packages/dsh-plugin/**`。
- core 不联网：无 `node:http|https|net|tls|dgram` 导入；联网检索只在 Host（`packages/dsh-plugin/src/host/web.ts`）。
- core 的全部非相对运行时依赖只有：`fast-xml-parser`（`packages/teaching-core/src/corpus/xml.ts:6`）、`fflate`（`packages/teaching-core/src/corpus/png.ts:7`、`src/portability/backup.ts:20`）、`katex`（`src/render/math.ts:10`）、`pdfjs-dist`（`src/corpus/parsers/pdf.ts:10-11`）；其余为 `node:*`。
- 测试执行：`node --test` 直跑 `.ts`（Node ≥22.19 原生剥离类型，import 带 `.ts`）；`packages/teaching-core/package.json:7-18` 定义根入口 + 9 个公开子路径出口（contracts/corpus/teaching/learning/experiments/environments/portability/render/planning）。
- 实测模块依赖图（按目录统计跨模块 import）：`contracts`→`model`（仅类型，`src/contracts/teaching.ts:17`）与 `model`→`contracts`（`src/model/types.ts:8`）构成类型级互引，运行时无环；`storage`→`contracts`；`corpus`→{contracts, model, storage}；`learning`→{contracts, model, storage}；`teaching`→{contracts, model}；`experiments`→`contracts`；`environments`→{contracts, experiments}；`portability`→{contracts, storage, experiments, render}；`render`→`contracts`（且无任何 `node:*` 导入）；`planning`→{contracts, model(仅提示词类型)}。feature 模块之间不互相 import，组合发生在 Host（`packages/dsh-plugin/src/host/routes.ts`）。

## 2. 模块地图

| 模块 | 一句话职责 | 主要公开入口（index.ts 导出要点） |
| --- | --- | --- |
| contracts | 冻结的跨模块类型、公开 seam 接口、Result/错误码、Client↔Host 路由表 | `src/contracts/index.ts:1-18`：17 个 barrel（ids/result/task/source/course/session/activity/learning/experiment/portability/corpus/teaching/learning-service/api/model/planning/portability-service） |
| corpus | 资料导入/逐格式解析/检索/课程结构草案/变化检测 | `src/corpus/index.ts:11-55`：`createCorpusService`、parsers、`searchCorpus`、`proposeCourseRevision`、`reconcileDraftWithActive`、`buildKbStructure*`、limits/errors/web |
| teaching | 一轮学生输入 → 流式教学事件+证据+活动提案 | `src/teaching/index.ts:7-31`：`createTeachingService`；strategy/prompts/parse 纯函数 |
| learning | 尝试 → 独立性/验证 → 掌握证据/争议/复习 | `src/learning/index.ts:8-35`：`createLearningService`、independence/rubric/mastery/review |
| experiments | 内置语言运行器（python/javascript/scheme）与运行记录 | `src/experiments/index.ts:15-26`：`createRunnerRegistry`、`runProcess`、`validationFromRun`、`SUPPORTED_LANGUAGES`、scheme prelude |
| environments | 扩展语言环境探测/准备/清理/资源受限替代 | `src/environments/index.ts:22-34`：`createEnvironmentManager`、`EnvironmentStore`、资源评估、安装/审批目录 |
| portability | 导出/备份/恢复/记录控制/离线 HTML | `src/portability/index.ts:10-55`：`createPortabilityService`、backup/records、`buildOfflinePage` 等 |
| render | 声明式活动渲染（DOM，无 React/无 node） | `src/render/index.ts:11-47`：`mountActivity` + 各 kind mounter、markdown/math/expr/dom/visual |
| planning | 引导式访谈、PlanBrief 解析、检索词（纯函数，不调模型不写状态） | `src/planning/index.ts:11-22`：request builders、parsers、`buildSearchQueries`、上限常量 |
| storage | 原子版本化本地 JSON 存储、磁盘布局、领域仓库 | `src/storage/layout.ts`、`local-state.ts`、`repositories.ts`（由 `src/index.ts:25-27` 导出） |
| model | provider-neutral 模型 seam 与测试 fake | `src/model/types.ts:61`（ModelClient）、`src/model/fake.ts:21`（ScriptedModelClient） |
| util | **无独立 util 目录**；通用工具散在 `src/contracts/ids.ts`/`result.ts`、`src/corpus/text-utils.ts`/`budget.ts`、`src/render/dom.ts` | 根 `src/index.ts:8-29` 只 re-export contracts/storage/model |

## 3. 关键 seam（实现位置与调用方）

| Seam | 契约 | 实现 | 调用方（Host bundle） |
| --- | --- | --- | --- |
| CorpusService | `src/contracts/corpus.ts:84-116` | `src/corpus/service.ts:128`（类）/`:917`（工厂） | `packages/dsh-plugin/src/host/index.ts:141` 构造；`routes.ts` 的 sources.import:1119、sources.integrate:1224、sources.refresh:1271、courseDraft.generate:1350/confirm:1418、chat 检索:1782/1819 |
| TeachingService | `src/contracts/teaching.ts:103-111` | `src/teaching/service.ts:191`（工厂），`respond` 在 :202 | `host/index.ts:87` 构造；`routes.ts` chat.send:1740 → `services.teaching.respond`:1875 |
| LearningService | `src/contracts/learning-service.ts:38-64` | `src/learning/service.ts:146` | `host/index.ts:153` 每次尝试 `createLearningFor`；`routes.ts` attempts.submit:2315（组装:2337-2353）、mastery.dispute:2421、mastery.recheck:2438 |
| ModelClient | `src/model/types.ts:61-74` | fake `src/model/fake.ts:21`；真实 `packages/dsh-plugin/src/host/model-adapter.ts:96`（HarnessModelAdapter） | `host/index.ts:94` 构造并注入 teaching/corpus/learning-rubric |
| LocalState | `src/storage/local-state.ts:87-294` | 同文件（`open` :101） | `host/index.ts:79` 构造；80-83 建 4 个仓库；激活时 `state.open()`（`host/index.ts:181`），corpus 自行幂等 open（`src/corpus/service.ts:153-156`） |
| HarnessBridge | 只有提案语义（`docs/contracts.md:40`） | core 中**没有**该类型；现实对应物是 Host 入口 `apply(ctx)`（`packages/dsh-plugin/src/host/index.ts:73`）+ routes | 宿主加载/卸载调用 |
| PortabilityService（附加） | `src/contracts/portability-service.ts:64` | `src/portability/service.ts:474` | `host/index.ts:110`；`routes.ts` portability.* / records.* |

## 4. 不变量与语义（改造时最容易踩）

### 4.1 资料：文档身份 ≠ 修订快照

- `SourceDocument` 是稳定身份，`currentRevisionId` + `revisions` 列表；每次导入/刷新写一份不可变 `SourceRevision`（`src/contracts/source.ts:99-160`）。
- `SourceAnchor` 固定 `documentId+revisionId+unitId+locator+excerpt`（`src/contracts/source.ts:166-176`）；`resolveAnchor` 找不到修订返回 `stale-revision`、不伪造可跳转（`src/corpus/service.ts:458-475`）。
- 刷新 = 指纹比对（sha256）→ 新修订 → diff；结构变化或变更比例 ≥0.3 → `needsConfirmation`（`src/corpus/service.ts:729-755`）；旧修订保留可回看。
- 受影响引用靠可选 `references` hook；未注入时概念从课程修订 `sourceAnchors` 反查、活动列表为空（明确不猜，`src/corpus/types.ts:17-27`，`docs/evidence/T02.md:94-96`）。

### 4.2 活动修订 vs 尝试

- `LessonActivity.revision` 单调递增；学生编辑 = 新 revision，旧 payload 进 `revisionHistory`（`src/contracts/activity.ts:302-322`）；Host 用 `expectedRevision` 做 CAS，冲突返回 `conflict`（`packages/dsh-plugin/src/host/routes.ts:2129-2153`）。
- `ActivityState`（参数/代码/展开步骤）按 `activityRevision` 绑定（`src/contracts/activity.ts:325-337`），与活动 payload 分文件存（`src/storage/layout.ts:101-104`）。
- `LearningAttempt.activityRevision` 记录作答时 Host 的活动修订（`src/contracts/learning.ts:94-95`）；但 Host 提交时忽略客户端传的 `activityRevision`、用当前 `activity.revision`（`routes.ts:2343`），quiz 判定也用当前 payload（`routes.ts:2886-2918`）→ 活动被更新后，晚到的旧题答案不会按学生看到的修订判分，客户端声明的修订也不会被拒绝；这是当前语义边界。
- 删除活动不删学习尝试/掌握证据（`routes.ts:2259-2309`）。

### 4.3 掌握证据：独立 / 辅助 / 看答案严格分开

- 独立性分类（`src/learning/independence.ts:42-78`）：空作答→`skipped`；`answerRevealed` 或 `helpLevel='full-answer'`→`answer-shown`；`helpLevel 1-3` 或 `hintsSeen`→`assisted`；否则 `independent`。仅 independent 可算证据（:81-83）。
- 维度贡献仅“独立 + `validation.passed===true` + 可信评价来源”：quiz→conditions+variants；objective(run)→variants；open→explain+transfer；rubric 按 criterion 关键词（分数/满分 ≥0.6）映射；`assessedBy='none'` 的“通过”不计（`src/learning/mastery.ts:67-105`）。
- 等级推导 `unseen→exposed→practiced→checked→mastered`；mastered 需四维全覆盖 + ≥2 条有效独立通过 + 无未决争议 + 无 `needsRecheck`（`mastery.ts:125-139`）；单次证据不会 mastered。
- 维度只增不减（`mergeDimensions`，`mastery.ts:35-45`）；`basis`/`evidenceAttemptIds`/`uncovered` 保留审计（`mastery.ts:175-221`）。
- 验证优先级：Host 传入的客观 validation 直接采用、不调模型；只有 `unverified` 才走 rubric；rubric 失败/坏 JSON 降级为 unverified + limits（`src/learning/service.ts:189-259`，`docs/evidence/T04.md:48-51`）。
- 争议/重检/资料变化只追加：`dispute`→`recheck`→`markStaleForSources` 把等级封顶 `checked` 并置 `needsRecheck`，历史证据保留（`learning/service.ts:387-513`）。

### 4.4 任务状态机

- 契约 `TaskStatus: queued→running→completed|partial|failed|cancelled`（`src/contracts/task.ts:13`）；`TaskSnapshot` 带 steps/progress/warnings/resumable（:26-50）。
- 实现 `TaskManager`（`packages/dsh-plugin/src/host/tasks.ts:47`）：启动即 `running`（:96-100）；Host 重启时把遗留 queued/running 标 `failed`（cause=interrupted，resumable=true）（:57-77）；`cancel()` 先置 `cancelRequested` 并 abort（:193-207），运行结束按取消标 `cancelled`（:137,151），`dispose()` 直接标 `cancelled`（:218-222）。当前**没有任何代码产生 `partial`**（`grep partial tasks.ts` 无命中），只有契约与展示位。
- 任务完成 ≠ 内容已验证/课程已确认/学生已掌握，这些是独立字段（`src/contracts/task.ts:1-8`，`docs/contracts.md:44`）。

### 4.5 Result 与错误码

- 公开 seam 的预期失败一律返回 `Result<T>`，不 throw（`src/contracts/result.ts:1-7,52-72`）；抛出只当 bug，`toAppError` 归一为 `failed`（:75-90）。
- 13 个 `AppErrorCode`（`result.ts:10-36`）：invalid-input/not-found/conflict/capability-missing/needs-confirmation/cancelled/failed/unverified/limit-exceeded/storage/stale-revision/network/uncertain；`retryable` 仅表示“重试同调用可能成功”，不做无限重试。
- 仓储异常在 service 边界转 `storage`（如 `learning/service.ts:131-143`）；corpus 统一走 `guard` 包装（`corpus/service.ts:892`，错误转换 `corpus/errors.ts:47`）。

### 4.6 存储 schema 版本与迁移

- `SCHEMA_VERSION = 1`（`src/storage/layout.ts:12`）；`meta.json` 含 `schemaVersion/installationId/pluginVersion`（`local-state.ts:24-31`）。打开时：新于当前版本报 `storage`；旧版本且未 `allowOldSchema` 也报 `storage`（`local-state.ts:275-293`）。
- **当前无迁移实现**：`grep migrat` 仅注释；备份恢复也明确只支持同版本（`src/portability/backup.ts:397-401`）。升级 schema 需同时补迁移、历史数据样例与升级测试（`docs/contracts.md:50-52`）。
- 分领域版本：环境记录 `ENVIRONMENT_STATE_SCHEMA_VERSION = 1`，损坏/更新版本文件被隔离为 `state.corrupt-*.json` 而非覆盖（`src/environments/persistence.ts:5-23,106-115`）；语料目录缓存 `CATALOG_VERSION = 1`（可重建，`src/corpus/store.ts:48-50`）；备份/导出 `BACKUP_FORMAT_VERSION=1`/`EXPORT_FORMAT_VERSION=1`，备份清单带 `schemaVersion`（`src/contracts/portability.ts:15-18,89-103`）。

### 4.7 会话、位置与证据

- 会话绑定 `courseId+courseRevisionId`；`position` 记录 stage/concept/activity，用于重启恢复（`src/contracts/session.ts:51-92`）；消息正文在 append-only JSONL，会话 JSON 只存 messageIds。
- 证据来源 6 类：course-source/other-course/external-web/model-knowledge/derivation/experiment（`session.ts:95-128`）；教师消息可带结构化 `teaching` 元数据（:145-186）。
- Client 只走 exact Fetch 路由 `/api/teaching/<operation>`，Host 是唯一状态权威；仅 `chat.send` 用 SSE（`src/contracts/api.ts:132-407,493-502`）。

## 5. 数据目录布局（`$DSH_HOME/teaching`，以代码为准）

根目录由 Host 解析：`config.dataDir`，否则 `$DSH_HOME/teaching`，再否则 `~/.dsh/teaching`（`packages/dsh-plugin/src/host/index.ts:64-70`）。测试一律用临时目录。

```text
<dataDir>/
├─ meta.json                                  # StoreMeta，schemaVersion 等（storage/local-state.ts:24-31）
├─ student-profile.json                       # ProfileRepository（storage/repositories.ts:40-67）
├─ settings.json                              # 模型 override（dsh-plugin/src/host/settings.ts:4,21）
├─ usage/model-usage.jsonl                    # 每次模型调用追加（layout.ts:39）
├─ courses/<courseId>.json                    # Course 头（activeRevisionId/draftRevisionId）
│  └─ <courseId>.revisions/<revisionId>.json  # 不可变结构修订（layout.ts:52-64）
├─ sources/<sourceId>.json                    # 文档身份（layout.ts:67-69）
│  └─ <sourceId>/{revisions/<rev>.meta.json, revisions/<rev>.units.json,
│                 assets/<rev>/*, search/<rev>.json}   # corpus/paths.ts:45-63
├─ cache/corpus-catalog.json, cache/corpus-tmp/        # 可重建缓存（corpus/paths.ts:60-61）
├─ sessions/<sessionId>.json + <sessionId>.messages.jsonl   # layout.ts:87-94
├─ activities/<activityId>.json + <activityId>.state.json   # layout.ts:97-104
├─ learning/<courseId>.json                   # attempts/mastery/review/notes（layout.ts:107-109）
├─ environments/state.json + environments/managed/<lang>-<envId>/
│                                               + environments/tmp/run-*/（environments/persistence.ts:5-14,72-77）
├─ runs/<runId>.json                          # 每次真实运行（layout.ts:117-119）
├─ tasks/<taskId>.json                        # 长任务快照（layout.ts:122-124）
├─ exports/<exportId>/ + <exportId>.manifest.json        # portability/service.ts:338-341
├─ backups/<backupId>.zip + <backupId>.manifest.json     # backup.ts:245-249
└─ experiments/tmp/run-*                      # 运行临时目录（experiments/registry.ts:243）
```

要点：JSON 单文件原子写（tmp+rename，`local-state.ts:269-273`），同路径写串行（PathMutex，:55-69）；JSONL 读会跳过尾行损坏（:242-262）；越界路径直接拒绝（:77-84）。

## 6. 测试覆盖地图（56 个 `.test.ts`）

`pnpm test` 的 glob 为 `packages/**/tests/**/*.test.ts`（`package.json:11`）→ **42 个 core + 14 个 plugin = 56**；`.scratch/tstest/b.test.ts` 不在 packages 下、不计入。56 是文件数，不是用例数（用例数随基线变动，本次未重跑）。

| 目录（core，42） | 文件与覆盖点 |
| --- | --- |
| `tests/corpus`（9） | changes 指纹/变化/影响报告；draft 草案（ScriptedModel）与覆盖；formats 逐格式解析/指纹；import-many 批量/进度/取消；reconcile 增量对齐；scale 规模与目录；search 检索/跨课程/过滤；structure KB 检测与结构构建；web 网页抽取 |
| `tests/environments`（7） | approval 系统级改动只说明不执行；directory 能力目录；needs 需求识别；persistence 记录 schema/quarantine；prepare-cancel 准备失败清理与取消；resources 资源评估/替代；ruby-extension 真实扩展语言 |
| `tests/experiments`（5） | process 子进程/超时/取消；runner-javascript/python/scheme 真实运行与验证；runner-registry 注册/清理 |
| `tests/learning`（4） | independence 独立性分类；rubric 加权/阈值/坏 JSON 降级；review 间隔与复习项；submit 落库/验证优先级/等级/争议/笔记 |
| `tests/planning`（3） | brief PlanBrief 解析校验；interview 访谈请求与防御式解析；search 检索词生成 |
| `tests/portability`（3） | backup-restore 清单/校验/恢复；export-html 离线页与渲染；records 记录导出/删除/重置 |
| `tests/render`（5） | activity 挂载/校验；expr 表达式沙箱；markdown 安全子集；renderers 各活动渲染；visual 沙箱/CSP/拒绝非法输入 |
| `tests/storage`（1） | local-state 原子写/schema/并发/仓库 |
| `tests/teaching`（5） | checkpoint 压缩检查点；flow 端到端流转；respond 流式/证据/不确定性/降级；strategy 形式选择/位置；visual visual 提案与提示词 |
| `packages/dsh-plugin/tests`（14） | client 11 个：activity-kinds/api/chat-visuals/context-meter/draft-edits/layout-prefs/planning-helpers/resize-layout/source-helpers/state/styles（视图状态与纯函数）；host 3 个：minimal/routes/version |

跨模块集成测试（同时 import 多个 seam/模块，改造这些文件时最需回归）：

- `tests/teaching/flow.test.ts`：teaching + learning + 临时 LocalState 的端到端（讲解→尝试→诊断→练习→迁移，`docs/evidence/T03.md:95`、`T04.md:97`）。
- `tests/portability/backup-restore.test.ts`：portability + storage + contracts 的 `SCHEMA_VERSION`。
- `tests/portability/export-html.test.ts`：portability + render + storage（离线页复用 render）。
- `tests/storage/local-state.test.ts`：storage + 4 个仓库 + contracts。
- `tests/corpus/{draft,structure,changes}.test.ts`：corpus service + model fake + repositories（changes 还含 references hook）。
- `tests/environments/*`：environments + experiments registry + 持久化（真实子进程）。
- `packages/dsh-plugin/tests/host/routes.test.ts`：最大集成面，全部 `/api/teaching` 路由 + 真 LocalState；其余 client 测试基本是单模块。

## 7. 未确认项与接线缺口（改造前先复核）

1. `LearningService.markStaleForSources` 已实现，但 Host 无调用点：`grep -rn markStaleForSources packages/dsh-plugin/src` 零命中；`sources.refresh` 只把 effects 写进任务结果（`routes.ts:1290-1300`）→ 资料变化后掌握记录不会自动标 `needsRecheck`。
2. `createCorpusService` 的 `learning` 参数当前只保存不使用（`corpus/service.ts:145`）；`references` hook Host 未注入（`host/index.ts:141-147`），故 `affectedActivityIds` 实际恒空，概念走默认反查。
3. `attempts.submit` 忽略客户端 `activityRevision`（见 4.2），活动修订与尝试的绑定只在“提交瞬间快照”层面成立。
4. `TaskStatus.partial`、`queued` 未由 TaskManager 产生；重启遗留任务标 `failed` 而非 `partial`（`tasks.ts:57-77`）。
5. 无 schema 迁移代码，`SCHEMA_VERSION` 仍为 1（见 4.6）；若下次改造要 bump 版本，必须同时补迁移与历史样例。
6. `activity.state` 的 `activityRevision` 由客户端提供、Host 不校验与当前修订一致（`routes.ts:2155-2168`）。
7. core 渲染测试用 `tests/render/dom-shim.ts` 的假 Document；真实浏览器/Harness 渲染不在 core 测试范围（客户端测试在 `packages/dsh-plugin/tests/client`）。

参考文档：`docs/impl/TEAM-BRIEF.md`、`docs/requirements.md`、`docs/contracts.md`、`docs/evidence/T02.md`、`T03.md`、`T04.md`、`T06.md`、`T07.md`。
