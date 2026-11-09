# 实现团队协作说明（T01 冻结版）

本文件是各实现 agent 的共同入口。需求以 `docs/requirements.md` 为准，计划以 `docs/plan.md` 为准；本文件只说明**当前代码布局、接口、构建测试与写作所有权**。

## 当前基座（T01）

- 项目：`dsh-teaching-plugin`，pnpm workspace，两个包：
  - `packages/teaching-core`：纯 Node/TypeScript 域逻辑，**不 import 任何 `@deepseek-ai/*`**，可被 `node --test` 直接运行（Node ≥ 22.19 原生剥离类型，import 需带 `.ts` 后缀）。
  - `packages/dsh-plugin`：可安装 bundle（Host entry + Client entry + `cordis.patch.yml`），由 Lead 负责；esbuild 打包时把 core 内联进 Host 产物。
- 构建/检查：
  - `npx tsc -p tsconfig.json --noEmit`（类型检查，提交前必须通过）
  - `pnpm test`（`node --test packages/**/tests/**/*.test.ts`）
  - `pnpm build`（构建 bundle，Lead 维护）
- 数据目录：`$DSH_HOME/teaching/`（`LocalState`，见 `packages/teaching-core/src/storage/`）；测试用临时目录，**绝不写 `~/.dsh` 或用户资料**。
- 模型调用：`ModelClient`（`packages/teaching-core/src/model/types.ts`）；测试用 `ScriptedModelClient`（`model/fake.ts`）。真实实现由 Host adapter 用 `ctx.llm.stream` 提供。**禁止在 core 中 import Harness 包或直接联网。**

## 已冻结的跨模块契约（只读，不要修改）

`packages/teaching-core/src/contracts/`：

| 文件 | 内容 |
| --- | --- |
| `ids.ts` | 所有 ID 类型与生成器、`nowIso()` |
| `result.ts` | `Result<T>`/`AppError`/错误码；公开 seam 用 Result 表达预期失败 |
| `task.ts` | 长任务 `TaskSnapshot`/进度/取消 |
| `source.ts` | 资料、修订、单元、定位、抽取不确定性 |
| `course.ts` | 课程与不可变课程修订、概念 |
| `session.ts` | 学习会话、消息、证据来源、学习位置、学生档案 |
| `activity.ts` | 声明式活动 payload（graph/figure/derivation/code/quiz/reading/proof/open/explanation）|
| `learning.ts` | 尝试、帮助暴露、独立性、掌握证据、争议、复习 |
| `experiment.ts` | 环境记录、执行事实、运行记录 |
| `portability.ts` | 导出/备份/恢复清单 |
| `corpus.ts` | `CorpusService` seam |
| `teaching.ts` | `TeachingService` seam（流式教学事件、活动提案）|
| `learning-service.ts` | `LearningService` seam |
| `api.ts` | Client↔Host 全部操作、请求/响应类型、SSE 事件 |

需要新增/修改契约时**先消息 Lead**，不要自行改动，避免影响其他 agent。

## 会话/流程事实（已实测，见 `docs/evidence/T00.md`）

- 该插件最终以「左侧栏入口 + 中央页面」呈现：`ctx.slots.inject('main', …` 注册 keyed 面板，`ctx.slots.inject('sidebar.panellist', …` 注册同 id 图标；React 客户端由宿主注入 `react`/`react/jsx-runtime`。
- 客户端只能通过 `/api/teaching/<operation>` exact Fetch 路由与 Host 通信（`api.ts` 已定义）；Host 是唯一权威状态持有者。
- 模型：`ctx.agentDefaultModel.currentSelection()` + `ctx.llm.stream()`；**必须传 `sessionId`**（pi-ai 路由要求），chunk 用 `.type`、终止为 `finish.reason.kind`。
- 本机 Python 3.15.2、Node 24（宿主）/26（开发 shell）；子进程在 Host 内可真实执行（T00 已验证）。
- 开发用隔离 profile：`.scratch/dsh-dev/home` + bundled CLI，**不要修改 `~/.dsh`**。

## 文件所有权（写入范围）

| 角色 | 可写路径 |
| --- | --- |
| Lead（整合） | 其余全部：根配置、`packages/dsh-plugin/**`（除 client/ 内容由 UI 负责）、`host/**`、`model/**`、`storage/**`、`contracts/**`、scripts、docs |
| corpus-dev（T02） | `packages/teaching-core/src/corpus/**`、`packages/teaching-core/tests/corpus/**`、`samples/corpus/**` |
| teaching-dev（T03/T04） | `packages/teaching-core/src/teaching/**`、`packages/teaching-core/src/learning/**`、对应 `tests/teaching/**`、`tests/learning/**` |
| ui-dev（T05） | `packages/dsh-plugin/src/client/**`、`packages/teaching-core/src/render/**`、`packages/teaching-core/src/experiments/**`、`tests/render/**`、`tests/experiments/**` |

跨范围发现的问题：消息 Lead，不直接改。新增 npm 依赖前先确认（一律装在根，`pnpm add -w`），并在消息中说明理由。

## 交付要求

1. 每个任务写 `docs/evidence/Txx.md`：环境、改动、覆盖 R/AC、实际执行命令与结果、局限。
2. 只报实测事实；mock/单测通过 ≠ 桌面通过；模型自动生成的“学生回答”不能当作人工教学评审。
3. 接口错误、取消、恢复语义必须显式；不做无限重试。
4. 测试从调用方使用的 public seam 验证（例如通过 `CorpusService`/`LearningService` 的工厂入口，而不是内部函数）。
5. 保持 `npx tsc -p tsconfig.json --noEmit` 与 `pnpm test` 通过；只改自己范围内的文件。
6. 完成后消息 Lead：完成内容、测试证据、阻塞、请求整合的事项。
