# 技术决策登记

需求已确认不等于技术接口已验证。本表由任务负责人基于事实更新；技术选择不能悄悄改变 [R01–R40](requirements.md)。

| ID | 当前结论 / 待定项 | 状态 | 负责人及冻结条件 |
| --- | --- | --- | --- |
| TD01 | T00 preflight 已发现 `/Applications/DeepSeek Harness.app`，Info.plist 版本 `0.2.1-rc.5`，本机 macOS 27.0.1 arm64；运行时/接口和兼容性仍待验证。官方 master 调研版本不代替本机版本。 | 版本已采集，集成待验证 | T00，runtime 指纹、对应声明与真实运行结果见 evidence/T00-preflight.md。 |
| TD02 | Desktop 与普通 npm CLI 的安装边界不同；使用实际应用对应管理入口。 | 官方事实，待本机确认 | T00，加载、卸载、重启证据。 |
| TD03 | Host/Client 分别共享各自运行时依赖；bundle/client/patch/engines/peers 必须匹配实际版本。 | 官方事实，待落地 | T00，实际包归档与双端装载通过。 |
| TD04 | 现有会话模型与新任务默认模型不同；优先公共 Agent 路径，当前会话沿用其选择，新学习会话继承宿主默认。 | 设计提案 | T00/T03，实测模型路由、取消和记录一致，不修改宿主全局选择。 |
| TD05 | 用宿主可用业务 storage adapter 或自有本地 adapter 实现 LocalState；最终存储/索引技术由能力与规模测量决定。 | 待选型 | T00/T01 确认宿主能力，T02 以检索/中文/更新基准验证。 |
| TD06 | OCR、公式/图表和 Office 解析需独立能力；不默认当前模型支持图片，也不默认学生装了 Office。纯文本抽取不能替代图表语义教学的验收。 | 待选型 | T02，逐格式样例、定位、失败与不确定性证据；能力缺口保持可见，不能直接宣称满足 R12。 |
| TD07 | 宿主内活动和离线 HTML 为同一内容语义的两个 renderer；离线导出不是 Slots 自带保证。 | 设计提案 | T00 最小可行验证，T05/T07 完整活动、断网验证。 |
| TD08 | 语言依赖隔离与实际进程 sandbox 分别核实；网络/进程可见性不由文件 sandbox 自动保证。 | 官方限制，待适配 | T00 能力清单，T05/T06 执行、取消、资源与安装流程验证。 |
| TD09 | Scheme 方言和课程库需与资料一致；新增语言走识别、配置、冒烟、执行的通用流程。 | 待实现 | T05/T06，三种初始语言＋一种额外轻量环境真实样例。 |
| TD10 | 已定桌面，未指定 OS 发行矩阵；先采集本机与官方支持事实，设计保持可移植，发布明确实际验证的平台。 | 待验证/报告 | T00 采集；T08 给平台矩阵，不能由单机结果宣称全平台兼容或静默缩减范围。 |
| TD11 | 费用/等待时长无指定硬指标，采用质量优先及分步反馈；精确用量不可得时显式未知。 | 已确认偏好，待测量 | T03/T06/T08 测量，新增硬限制需协调者形成提案。 |
| TD12 | 掌握评价需证据、独立性与可解释 rubric；细则随学科适配，不以模型信心数字为唯一依据。 | 需求约束，细则待校准 | T04/T08 四类课程人工评审。 |

## 已识别的集成风险与处理

1. 文档与 Desktop 发布有版本差异：锁定实际版本与声明；spike 失败先解释事实，保持产品需求。
2. 生成 UI 可展示却不能恢复/导出：提前持久化活动描述与状态，P0 验证独立 renderer 路线。
3. 扫描公式错误传播：来源与不确定性进入整个教学链，不能只在导入日志记录。
4. 评价依赖同一个模型而误判掌握：客观运行证据、帮助记录、rubric 与真实学生评审分开。
5. 自动环境配置污染共享依赖或本机无法承担：独立环境、配置验证/清理及小规模等价教学实验。
6. 多 agent 公共文件冲突：T00/T01 单负责人冻结契约，之后按任务写入所有权整合。

所有“待验证”均应产出证据或明确 gap；不能在文档中直接改成“已支持”。

## T00 实测核对的宿主接口事实（2026-11-04，Desktop 0.2.1-rc.5）

标记：**实测**＝在本机 Desktop 0.2.1-rc.5 的 bundled runtime 上真实执行通过。

1. **实测**：exact Fetch route 的 `path` 必须形如 `/api/<segment>[/<segment>]`，否则插件激活时抛 `connection: invalid exact Fetch route`；它只对 owner peer 放行，其他 principal 403。Client 侧用 `fetch('/api/...', {credentials:'include'})` 即可，无需另接 gateway。
2. **实测**：`ctx.slots.inject('main', …)` 注册 keyed 中央页面 + `ctx.slots.inject('sidebar.panellist', …)` 注册同 id 的左侧栏入口，是官方插件提供「左侧栏入口 + 页面」的组合；sidebar 会调 `ctx.layout.selectPanel(id)`。图标组件收到 `{ size, active }`，label 可为函数。
3. **实测**：client bundle 格式为 `window.__ModuleLoader__.load({ id, factory(require) { … } })` 包裹的 CJS；宿主注入 baseline `require`（react、react/jsx-runtime 等）。构建时可把 baseline 模块列为 external。
4. **实测**：Host 插件以 Electron Node 模式运行，可直接 `import 'node:child_process'` 并 `spawn`：`process.execPath` + `ELECTRON_RUN_AS_NODE=1` 可执行 JS；`python3` 可用（本机 3.15.2）。
5. **实测**：`ctx.agentDefaultModel.currentSelection()` 返回部署默认 provider/model；`ctx.llm.stream()` 用宿主凭据真实生成。**pi-ai 系 provider 必须传 `GenerateOptions.sessionId`**（否则 400 `MissingSessionID`）；`StreamChunk` 以 `type` 区分（`text-delta` 带 `.text`，终止为 `finish.reason.kind` ∈ stop/tool-calls/max-tokens/aborted/error）。`usage` chunk 携带 token 用量。
6. **实测**：bundled CLI `dsh plugin --profile <name> add|remove <spec>` 可管理非 desktop profile 的插件（含 `link:` 本地路径），重启后生效；desktop profile 由 Electron 应用独占，CLI 写入被应用/沙箱阻止，需应用内 plugin-manager 或用户操作。
7. **实测**：独立离线导出不依赖 Slots：Host 生成自包含 HTML（内联 CSS/SVG/JS、无外部请求），`file://` + offline 下可交互，证明 T07 renderer 路线可行。
8. **环境差异**：Electron 打包应用的桌面窗口在启动时未开 CDP；真实窗口内验证需用户刷新/重启或带 `--remote-debugging-port` 的启动。文件沙箱（workspace-write）阻止插件开发直接写 `~/.dsh`。
