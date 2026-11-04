# 安装、升级与卸载（DeepSeek Harness Desktop）

当前目标版本：DeepSeek Harness Desktop **0.2.1-rc.5**（本机实测）。插件包名 `dsh-ai-teaching`，版本 `0.1.0`。

## 前置

- 已安装并至少启动过一次 DeepSeek Harness Desktop（应用会初始化 `~/.dsh` 与 desktop profile）。
- 使用 Desktop 自带的 dsh CLI 或应用内插件管理器管理 desktop profile；**不要**用普通 npm 安装的 dsh 修改 desktop profile。
- bundled CLI 路径（macOS）：
  `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`

## 安装

### 方式 A：应用内插件管理器（推荐，可热加载）

插件管理入口（Host `plugin_manager` 工具）用本地路径安装：

```text
install_bundle target=/absolute/path/to/deepseek-teaching-plugin/packages/dsh-plugin
```

安装成功后 profile 的 `dependencies.dsh-ai-teaching` 为 `link:` 路径，bundles 列表包含 `dsh-ai-teaching`，宿主侧立即激活（`application: applied`）；浏览器页面刷新后左侧栏出现「AI 教学」。

### 方式 B：bundled CLI（需完全退出应用）

```bash
DSH_HOME="${DSH_HOME:-$HOME/.dsh}" \
  "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add /absolute/path/to/packages/dsh-plugin
```

安装后重新打开应用生效。

## 首次使用

1. 打开左侧栏「AI 教学」。
2. 首次向导：填写课程名、学习目标与基础 → 选择本地资料（支持 Markdown/文本/PDF/图片/Word/PPT/代码/Notebook）→ 等待导入进度 → 检查 AI 生成的课程草案（可修改概念顺序/删除概念）→ 确认后开始系统学习。
3. 想直接提问：可先跳过课程结构，随问随学（已就绪资料可立即检索）。

数据位置：`~/.dsh/teaching/`（原资料只读，不会写回；解析产物、索引、学习记录分别存放）。云端模型请求只发送与当前任务相关的资料片段；凭据沿用 Harness 自身配置，插件不复制、不落盘。

## 升级

1. 更新插件源码后重新构建：`node scripts/build-plugin.mjs`（生成 `packages/dsh-plugin/lib/`）。
2. 通过应用内插件管理器再次安装同一路径（或先移除再安装）；宿主会重新组合 profile。
3. 刷新页面；若提示需要重启应用，按提示重启。数据 schema 升级由插件自动迁移并保留备份。

## 卸载

1. 应用内插件管理器移除 `dsh-ai-teaching`（或 `dsh plugin --profile desktop remove dsh-ai-teaching`，需先退出应用）。
2. 刷新/重启后侧栏入口消失；宿主数据目录可保留以便重装续学。
3. 彻底删除学习数据：关闭应用后删除 `~/.dsh/teaching/`（**原资料文件不受影响**）。
4. 卸载后不影响 Harness 其他插件与既有会话。

## 故障排查

- **侧栏没有入口**：确认 profile bundles 含 `dsh-ai-teaching`；刷新页面；查看应用日志中 `[ai-teaching]` 前缀输出。
- **无法联网查证**：插件按需使用宿主 `ctx.web`；未配置搜索提供方时会明确显示能力缺失，不影响本地资料教学。
- **OCR/扫描件不确定**：会显示原文供核对；宿主安装 `tesseract` 可增强识别，缺失时降级为图片/原文展示而非编造内容。
- **实验无法运行**：检查 Python/Node/Scheme 环境记录；插件不会静默安装系统级依赖，需要时会请求确认。
- **数据迁移/备份**：设置页或 API 可创建备份 ZIP（含清单与 sha256，不含凭据）；换机恢复后会提示缺失的原资料路径。
