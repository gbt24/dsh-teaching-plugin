# AI 知识库教学插件（DeepSeek Harness Desktop）

以学生本地资料为课程依据的对话式教学插件：导入自己的课程资料，生成课程结构，在对话中学习、练习、做实验，并保留学习记录与证据。

面向 [DeepSeek Harness Desktop](https://deepseek-harness.github.io/deepseek-harness/) 的 `desktop` profile，插件包名 `dsh-ai-teaching`。

## 项目状态

- 插件版本 `0.1.0`；目标 **DeepSeek Harness Desktop `0.2.2-rc.1`**（`engines.dsh`: `>=0.2.2-rc.1 <0.3.0`）。
- 已在 **macOS + 0.2.2-rc.1** 上完成真实桌面加载、模型调用、资料导入、教学流程与数据持久化验证；Windows / Linux 尚未验证。
- 自动化验证：`tsc` 0 errors、`524` 项测试通过；客户端 bundle 约 `1.1 MiB`。
- 真实桌面验收清单中仍有若干人工教学/外部依赖项在持续补齐，详见 `docs/evidence/`。

## 功能

**课程与资料**

- 导入 Markdown / 文本 / PDF / 图片 / Word / PPT / 代码 / Notebook；原文件只读，解析产物与索引单独存放。
- AI 访谈式课程规划（学习目标、基础、每周投入），可生成课程结构与概念清单；支持从 Agent 联网检索候选资料并按章分配用途。
- 资料区支持增量补充材料，生成结构化整合草案后再确认。

**教学与练习**

- 对话式教学 + 右侧持续教学区域（可调整宽度、可折叠）。
- 练习、提示、参考答案、换种讲法；作答提交后给出反馈并记录。
- 概念掌握度、复习队列、学习会话与历史记录。
- 图形/动画/交互式 HTML 教学卡片直接内嵌在对话中，支持全屏交互。

**实验与证据**

- 内置 Python / JavaScript / Scheme 运行环境记录，可运行课程代码实验并保留结果。
- 题目与作答、运行结果、引用资料片段可作为学习证据回看。
- 支持导出离线教学页面、备份/恢复学习数据。

**工作区**

- 左侧课程导航与右侧教学区可拖拽调整宽度（双击/Home 恢复默认，宽度本地保存）。
- 模型与推理力度选择、上下文用量显示、手动压缩上下文。
- 中文 / English / 中英双语界面；能力缺失提示可关闭（本次会话内）。
- 数据默认保存在 `~/.dsh/teaching/`；模型凭据沿用 Harness 自身配置，插件不复制、不落盘凭据。

## 安装（使用仓库提供的构建产物）

前置：macOS，已安装并至少启动过一次 DeepSeek Harness Desktop `0.2.2-rc.1` 或更高兼容版本。仓库 `packages/dsh-plugin/lib/` 已包含构建好的 Host/Client 产物，无需自行构建。

```bash
# 1. 完全退出 DeepSeek Harness Desktop
# 2. 用应用自带的 CLI 把插件装进 desktop profile（路径换成你本机的仓库位置）
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add /absolute/path/to/deepseek-teaching-plugin/packages/dsh-plugin

# 3. 重新打开 DeepSeek Harness，左侧栏出现「AI 教学」
```

卸载：

```bash
# 完全退出应用后
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop remove dsh-ai-teaching
```

学习数据在 `~/.dsh/teaching/`，卸载后保留；确认不再需要时可手动删除（不会影响原始资料文件）。

> 只使用 Desktop 自带的 dsh CLI 或应用内插件管理器修改 `desktop` profile；不要用普通 npm 安装的 dsh 修改它。更完整的安装、升级、排障说明见 [`docs/install.md`](docs/install.md)。

## 从源码构建与开发

```bash
pnpm install

node scripts/build-plugin.mjs   # 生成 packages/dsh-plugin/lib/{index.js,client.js}
pnpm typecheck                  # tsc --noEmit
pnpm test                       # node --test，524 项
```

开发调试时可用应用自带 CLI 在隔离的 `DSH_HOME` 中启动 Web GUI，例如：

```bash
DSH_HOME="$PWD/.scratch/dsh-dev/home" \
  "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  --profile teaching-dev --no-open --port 3180
```

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `packages/dsh-plugin/` | 插件本体：Host 路由与本地服务、Client 教学界面、`cordis.patch.yml`、构建产物 `lib/` |
| `packages/teaching-core/` | 教学领域核心：资料/课程/学习/实验/可移植性等模块与契约 |
| `docs/` | 需求、架构、契约、验收矩阵、技术决策、安装文档与研究记录 |
| `docs/evidence/` | 各阶段真实执行结果与截图证据 |
| `samples/` | 可分发课程样例 |
| `scripts/` | 构建与冒烟脚本 |

## 文档入口

| 目的 | 文档 |
| --- | --- |
| 产品需求（R01–R40） | [`docs/requirements.md`](docs/requirements.md) |
| 模块职责与数据流 | [`docs/architecture.md`](docs/architecture.md) |
| 跨模块契约 | [`docs/contracts.md`](docs/contracts.md) |
| 实施计划与阶段 | [`docs/plan.md`](docs/plan.md) |
| 验收矩阵 | [`docs/acceptance.md`](docs/acceptance.md) |
| 安装 / 升级 / 卸载 | [`docs/install.md`](docs/install.md) |
| 技术决策登记 | [`docs/technical-decisions.md`](docs/technical-decisions.md) |

## 已知限制

- 仅验证 macOS 桌面；其他平台与旧版 Harness 未做兼容性承诺。
- 联网资料检索依赖宿主配置的搜索 provider；未配置时明确降级为基于已有资料/模型知识的方案。
- 扫描件 OCR 依赖本机可用的 tesseract；缺失时回退为原文/图片展示并标注不确定性。
- Mermaid 目前以源码形式展示，尚未接入实时渲染。
- 插件不会静默安装系统级依赖；需要时会向用户确认。

## License

[MIT](LICENSE)
