# 安装、升级与卸载（DeepSeek Harness Desktop）

当前目标版本：DeepSeek Harness Desktop **0.2.2-rc.1**（本机实测）。插件包名 `dsh-ai-teaching`，版本 `0.1.1`。

## 前置

- 已安装并至少启动过一次 DeepSeek Harness Desktop（应用会初始化 `$DSH_HOME`，默认 `~/.dsh`，以及 desktop profile）。
- 使用 Desktop 自带的 `dsh` CLI 或应用内插件管理器管理 desktop profile；**不要**用普通 npm 安装的 dsh 修改 desktop profile。
- 命令中的 `dsh` 指应用自带的 CLI，请确保它在 `PATH` 中；不同平台的安装位置不同，使用对应平台的 CLI 可执行文件即可。当前在 macOS 完成验证，Windows / Linux 尚未验证。

## 安装

### 方式 A：GitHub Release 分发包（推荐给其他同学）

从 [Releases](https://github.com/gbt24/dsh-teaching-plugin/releases) 下载 `dsh-ai-teaching-<version>.tgz`（或 `.zip`），无需 Node/pnpm 环境，也不需要仓库源码。

```bash
# 1. 完全退出 DeepSeek Harness Desktop
# 2. 用应用自带 CLI 安装分发包
dsh plugin --profile desktop add /path/to/dsh-ai-teaching-0.1.1.tgz

# 3. 重新打开应用，左侧栏出现「AI 教学」
```

分发包只含 `lib/`（已内联 Host 侧依赖与 Client 产物）、`cordis.patch.yml` 和重写后的 `package.json`，安装后 profile 的 `dependencies.dsh-ai-teaching` 为 `file:`，bundles 列表包含 `dsh-ai-teaching`。

### 方式 B：应用内插件管理器（本机开发，可热加载）

插件管理入口（Host `plugin_manager` 工具）用本地路径安装：

```text
install_bundle target=/absolute/path/to/dsh-teaching-plugin/packages/dsh-plugin
```

安装成功后 profile 的 `dependencies.dsh-ai-teaching` 为 `link:` 路径，bundles 列表包含 `dsh-ai-teaching`，宿主侧立即激活（`application: applied`）；浏览器页面刷新后左侧栏出现「AI 教学」。

### 方式 C：dsh CLI + 源码目录（本机开发）

```bash
dsh plugin --profile desktop add /absolute/path/to/packages/dsh-plugin
```

安装后重新打开应用生效。

## 首次使用

1. 打开左侧栏「AI 教学」。
2. 首次向导：填写课程名、学习目标与基础 → 选择本地资料（支持 Markdown/文本/PDF/图片/Word/PPT/代码/Notebook）→ 等待导入进度 → 检查 AI 生成的课程草案（可修改概念顺序/删除概念）→ 确认后开始系统学习。
3. 想直接提问：可先跳过课程结构，随问随学（已就绪资料可立即检索）。

数据位置：`$DSH_HOME/teaching/`（默认 `~/.dsh/teaching/`；原资料只读，不会写回；解析产物、索引、学习记录分别存放）。云端模型请求只发送与当前任务相关的资料片段；凭据沿用 Harness 自身配置，插件不复制、不落盘。

## 升级

1. 用新版本重复一次安装命令（分发包或源码目录均可）：`dsh plugin --profile desktop add <新路径>`；需要时先 `remove dsh-ai-teaching`。
2. 重新打开应用；宿主会重新组合 profile。
3. 数据 schema 升级由插件自动迁移并保留备份。

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

## 维护者：构建并发布新版本

```bash
node scripts/build-plugin.mjs   # 生成 packages/dsh-plugin/lib/
pnpm run pack                   # 生成 dist/dsh-ai-teaching-<version>.tgz|.zip + SHA256SUMS
```

`pnpm run pack` 会把工作区专用的 `workspace:*` 依赖从发布清单中移除（Host 依赖已内联），再打 tar/zip。发布前建议在隔离 `DSH_HOME` 中用分发包做一次安装与启动验证：

```bash
DSH_HOME=/tmp/dsh-release-check dsh plugin --profile web add dist/dsh-ai-teaching-0.1.1.tgz
# 启动后日志出现 [ai-teaching] ready 即通过
```

确认后推送 tag 并创建 Release：

```bash
git tag v0.1.1 && git push origin v0.1.1
gh release create v0.1.1 dist/dsh-ai-teaching-0.1.1.tgz dist/dsh-ai-teaching-0.1.1.zip dist/SHA256SUMS \
  --title "v0.1.1" --notes-file docs/release-notes-v0.1.1.md
```
- **数据迁移/备份**：设置页或 API 可创建备份 ZIP（含清单与 sha256，不含凭据）；换机恢复后会提示缺失的原资料路径。
