# DeepSeek Harness Desktop 集成核对

调研日期：2026-11-04（Asia/Shanghai）。范围为官方文档及官方 GitHub 源码的只读核对。本次未 clone、安装、启动 Desktop，未读取用户凭据，未编写产品代码。早期调研笔记仅作入口，以下结论重新核对当前页面。

标记：**事实**＝本次官方资料直接支持；**设计建议**＝据事实提出的本插件方案；**待 P0 验证**＝必须在实际目标 Desktop 验证，不能写成已兼容。

## 版本证据与冻结边界

- **事实**：本次读取官方 master 的根 package.json，版本为 `0.2.2-alpha.3`，Node 要求 `>=24.9.0`，packageManager 为 `pnpm@11.28.5`。这只是抓取到的源码状态，不代表 npm 最新发行版或用户已装桌面版。[官方 package.json](https://github.com/deepseek-ai/deepseek-harness/blob/master/package.json)
- **未知**：用户 Desktop 完整版本、内置 Electron/Node/Cordis 版本、构建 commit、操作系统架构均未采集；本次未取得不可变 commit permalink。所有 master/站点链接是可变资料。
- **设计建议**：P0 先记录桌面 About 中完整版本；再核对安装包的 `resources/app.asar/dsh/desktop-runtime.json`（含发布、Node、平台、架构、共享包信息）及实际运行 release 信息。浏览器 boot graph 的 `release.version` 和可选 `release.commit` 可作交叉证据。没有 commit 就明确记录未知，不从日期推算。[Desktop runtime](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#runtime-and-plugin-activation)、[Boot release](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules#the-wire)

## Desktop 安装与运行边界

- **事实**：Desktop 专属 `$DSH_HOME/profiles/desktop`；桌面与 npm CLI 可以共享产品数据，但不共享可执行包、插件激活、lockfile 和 node_modules。桌面运行其随应用发布的 dsh。[架构 Desktop 节](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md#desktop-application)
- **事实**：安装包中 `resources/runtime/cli/bin/dsh`（Windows 为 dsh.cmd）使用 Electron Node 模式与 bundled pnpm。首次运行 Desktop 初始化 profile 后，完全退出应用，再用这个 bundled command 执行 `dsh plugin --profile desktop add <package>`、`list` 或 `remove <package>`，重开应用生效；npm 安装的 dsh 不能修改 desktop profile，CLI 也不能启动 desktop profile。[Bundled command / Installation ownership](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#bundled-command-runtime)
- **设计建议**：安装文档必须使用采集到的 bundled CLI 绝对路径，不能假定 PATH 中 dsh 就是它。P0 在用户同意的测试环境验证安装、启停、卸载和恢复，不能手工替换签名应用资源。[同一安装边界](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#installation-ownership)
- **事实**：Host 插件运行于 Electron Node 模式；原生依赖可能因 Node/平台/架构变化而不兼容。renderer 不获得任意 filesystem、shell 或原始 Electron IPC。[Desktop 环境和插件激活](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#runtime-and-plugin-activation)
- **设计建议 / 待 P0 验证**：优先纯 JS 依赖；任何 PDF、数据库、Python、浏览器自动化等附带运行时应独立验证打包和可执行文件定位。不得把开发机全局安装或宿主自带 Office 资源当作插件发行物保证。[Desktop bundled runtime 限制](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#bundled-command-runtime)

## Bundle 与双端入口

- **事实**：可安装 bundle 在 package.json 声明 `dsh.bundle.patch`，指向实际发布的 patch；缺失声明只安装普通依赖，不激活 layer。`engines.dsh` 声明支持范围，安装与启动检查兼容性；缺失时回退检查 dsh peers。profile 由管理器维护，patch 对同一行 config 是整体替换。[发布教程](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
- **事实**：需要与 Host 共用实例的 dsh 包，应同时声明 peerDependencies 和 devDependencies；linked checkout 的物理查找优先级仍可能影响实例解析。独立第三方依赖与无状态工具库可放 dependencies。[链接与依赖解析规则](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish#install-into-a-profile)
- **事实**：Host 持有权威状态、持久化与策略；Client 是独立浏览器 Cordis 应用，通过 API Gateway 通信。不能理解为 Host 和浏览器共用一个 Context 实例。[Web Client 架构](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-client)
- **事实**：浏览器包声明 `dsh.client`（platform 为 web），提供 `exports["./client"]` 构建产物；非 baseline 模块请求使用 `dsh.client.external`。Host loader 扫描并发布客户端图。[Client Modules](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules#the-scan)、[模块共享规则](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/modules/README.md#sharing-modules)
- **设计建议 / 待 P0 验证**：Host、Client 分别复用各自运行时 Cordis/React 基线，禁止把第二套服务框架打入 bundle；在真实桌面检查服务注册、卸载及 React hooks，不能仅靠 ts 编译判断没有重复实例。[客户端作者规则](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/AGENTS.md)

## Slots 与离线导出

- **事实**：Slots 是 typed React 组合系统；通过 `ctx.slots.register()` 贡献 UI，依赖其他 owner 声明时使用 `ctx.slots.inject()` 跟随其生命周期。未声明 slot 或重复 owner 会导致激活错误。[Slots 生命周期](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/slots#declaration-and-lifecycle)
- **设计建议**：教学 UI 先验证实际版本可用的根页面/侧栏入口及其 props，再决定位置。界面可用纯业务模型，共用数据不直接依赖其他 feature 的组件。[Slots](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/slots)
- **设计建议 / 待 P0 验证**：原生 Slots 可显示页面，不等于可导出独立离线 HTML。导出应另做只依赖课程快照和本地资源的渲染器，排除 ctx.remote、会话 Provider、dsh-app 协议及运行时插件图。验收时退出 Desktop、断网，在普通浏览器打开导出并检查交互和资源请求；此为本插件验收要求，不是官方已提供能力。[推断依据：Web Client 依赖关系](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-client)

## 模型复用和工具调用

- **事实**：`ctx.agentDefaultModel.currentSelection()` 返回独立的 provider/model/reasoningEffort 选择；它负责新 Agent 的部署默认值。会话选择属于 Agent model API，不能把部署默认值与当前会话模型混为一谈。[默认模型服务](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent-default-model/README.md#read-and-change-the-default)
- **事实**：`agent.model.current()` 可读当前选择；会话 model select 影响后续步骤。通过公共 `ctx.agents` 创建/恢复 Agent 并用 followup、steer、inject 驱动；消费者不直接依赖 agent-loop 内部实现。`agent/request` 已弃用，不应新增监听器。[Agent 公共 API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/README.md)
- **事实**：LLM 服务提供注册适配器与准备/stream 调用；`prepareCall` 把模型元信息和调用绑定到同一适配器代，避免 HMR 期间混用。[LLM 服务](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/llm-streaming#cordis-api)
- **设计建议 / 待 P0 验证**：教学生成优先经宿主公共 Agent 路径复用选定模型与凭据。定义清楚使用“发起会话当前选择”还是“新任务部署默认”；没有可用选择时给出可恢复状态，不硬编码 deepseek-chat、不另建未经确认的 API key 流程。若必须单次直接 LLM 调用，单独验证取消、流式结算、请求记账和重试，不能假定 ctx.llm.stream 自动完成会话持久化。[模型服务边界](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/llm-streaming)
- **事实**：工具在 ctx.tools 注册，defineTool 提供参数推导/校验；当前 ToolDefinition 包含强制 output 合同，execute 返回规范 JSON 值并遵循 exec.signal。旧示例的任意字符串结果不应直接照搬。[工具合同](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/tools)
- **待 P0 验证**：精确 import、泛型和方法参数必须从锁定版本声明/源码抄录并编译；本报告仅确认接口名称与边界，不给未验证的产品调用签名。[工具教程](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)

## 课程持久化与 Session 日志

- **事实**：Session 是 typed append-only 事件日志，模型历史由它派生；SessionEventMap 可通过声明合并扩展。[Sessions](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/session)
- **事实**：持久化通过 SessionHandle 读写/flush/close 和单 writer 约束，不应直接修改宿主 JSONL 文件。[Session Persistence](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/persistence)
- **事实**：非会话日志的数据通过 storage 的 domain 形式，backend 提供 json/sqlite；业务包不直接调用 backend。domain/changed 在 backend 确认持久化之后发布。[Storage](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/storage)
- **设计建议 / 待 P0 验证**：课程、材料索引、任务状态、产物修订用独立业务 domain；与模型交互的审计引用对应 Session ID/事件序列。先验证目标 Desktop 是否挂载可用 storage domain，再确定路由、格式版本及恢复方式。流式 UI 状态不能替代落盘结果。[持久化分工依据](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/storage)

## 文件、进程与 sandbox

- **事实**：ctx.fs 提供抽象目标，targetKey 为 opaque，不能视作本机绝对路径；跨能力进程路径由 provider 提供。观察/新鲜度策略是可选插件，不是基础 fs 自动保证。[Filesystem](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/filesystem)
- **事实**：ctx.subprocess 与配对 filesystem 使用同一执行世界；服务负责可执行文件查找、环境清理和输出形态。[Subprocess](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/subprocess)
- **事实**：进程 sandbox 主要约束文件 effects，不包含网络与进程可见性保证；支持 read-only、workspace-write，danger-full-access 绕过 confinement；backend 可能报告 partial。[Sandbox](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/sandbox)
- **设计建议 / 待 P0 验证**：上传路径、课程库、转换临时目录和导出目录分别建模；使用宿主 fs/subprocess/policy 组合并传递取消，不能直接用 node:fs 或 child_process 后声称继承宿主权限。模型给出的文件名需作业务校验；转换器联网与否也需单独验证。[同一执行世界](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/subprocess#executable-lookup)、[策略边界](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/sandbox#modes-and-enforcement)

## P0 最小验证清单与版本 pin 操作

以下是**设计建议与待验证事项**，不是已通过的测试。每项必须记录实际版本、操作、日志/截图证据及通过/阻断结论。

| 项 | 必须执行的验证 | 通过证据与阻断条件 |
| --- | --- | --- |
| V1 发布指纹 | 采集 Desktop About、runtime descriptor、可用 boot release | 完整 prerelease 版本、架构、Node、Cordis、commit 或明确未知；不得用 master 版本顶替 |
| V2 安装与回滚 | bundled CLI 或桌面插件管理器安装最小 bundle，重启、禁用、卸载 | desktop profile 可加载且能恢复；PATH 中普通 npm dsh 不参与 |
| V3 双端装载 | Host entry + client export + external baseline + 一个真实 Slot | 无重复实例/hook 错误；卸载贡献消失；重载不重复注册 |
| V4 宿主通信 | 验证公共 gateway 的业务读写及取消传播 | 权威状态在 Host；renderer 无 filesystem/shell 假设 |
| V5 模型与工具 | 读部署默认/会话选择，使用现有凭据生成一小段结构化内容，工具调用、取消、失败重试 | 路由选择一致；无改写全局默认；输出验证、日志和取消完整 |
| V6 数据恢复 | domain 写入、Desktop 重开、任务中断恢复、事件引用回查 | 不丢课程记录；未完成结果不冒充完成；不直接改 JSONL |
| V7 文件与转换 | 选择目录、读样本、转换子进程、取消、越界写入拒绝、输出上限 | local/执行世界路径正确；目标平台依赖可定位；sandbox enforcement 被真实识别 |
| V8 离线 HTML | 导出最小课程快照，关闭宿主并断网打开 | 普通浏览器可用，无宿主 API/远程 CDN 依赖；失败则独立导出方案阻断 |

Pin 流程（**设计建议**）：

1. 先完成 V1，选定一个实际可安装且验证通过的 Desktop 完整版本作为唯一 P0 基线；版本未知时不开始宣称兼容。
2. 从该发布对应源码/类型取得 package 名、exports 和接口；有 commit 时把研发引用换为 `/blob/<commit>/...`，没有时保留未知并归档取得的版本元数据。
3. 插件 `engines.dsh` 暂定为经过验证的精确 prerelease 版本或明确覆盖该 prerelease 的范围，不复制教程中宽泛范围。需共享实例的 peers/devDependencies 与该运行时匹配，提交 lockfile；禁止以 latest 漂移。[兼容与 peers 官方规则](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
4. Host 与 Client 产物、manifest、patch 和测试报告组成同一插件版本；所有发布文件进入 package files，并检查实际归档内容。首次安装目标应是 unpacked/真实 Desktop 场景，不能只用普通 Node 测试替代。[客户端产物合同](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules)、[Desktop 真实运行验证](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#development)
5. 升级 Desktop 时重新跑 V2–V8；只有通过版本才扩大 engines 支持范围。实施中若发现文档与安装声明不同，记录差异并以锁定运行时实测为准，不自行发明兼容 shim。

结论：官方架构提供插件实现所需的扩展边界，但桌面版本兼容、业务 API、双端共享依赖、转换依赖与独立导出仍须 P0 实机确认。本报告不构成任何接口已在用户环境运行成功的声明。
