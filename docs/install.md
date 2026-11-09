# 安装、升级与卸载（DeepSeek Harness Desktop）

当前目标版本：DeepSeek Harness Desktop **0.2.2-rc.1**（本机实测）。插件包名 `dsh-teaching-plugin`，版本 `0.1.2`。

## 前置

- 已安装并至少启动过一次 DeepSeek Harness Desktop（应用会初始化 `$DSH_HOME`，默认 `~/.dsh`，以及 desktop profile）。
- 使用 Desktop 自带的 `dsh` CLI 或应用内插件管理器管理 desktop profile；**不要**用普通 npm 安装的 dsh 修改 desktop profile。
- 命令中的 `dsh` 指应用自带的 CLI，请确保它在 `PATH` 中；不同平台的安装位置不同，使用对应平台的 CLI 可执行文件即可。当前在 macOS 完成验证，Windows / Linux 尚未验证。

## 安装

### 方式 A：npm 包（推荐，和 dsh-context 一样）

```bash
# 1. 完全退出 DeepSeek Harness Desktop
# 2. 安装最新版（或固定版本：dsh-teaching-plugin@0.1.2）
dsh plugin --profile desktop add dsh-teaching-plugin

# 3. 重新打开应用，左侧栏出现「AI 教学」
```

安装后 profile 的 `dependencies.dsh-teaching-plugin` 指向 npm 版本，bundles 列表包含 `dsh-teaching-plugin`。升级用同一命令加 `@latest`；卸载见文末。

### 方式 B：应用内插件管理器（本机开发，可热加载）

插件管理入口（Host `plugin_manager` 工具）用本地路径安装：

```text
install_bundle target=/absolute/path/to/dsh-teaching-plugin/packages/dsh-plugin
```

安装成功后 profile 的 `dependencies.dsh-teaching-plugin` 为 `link:` 路径，bundles 列表包含 `dsh-teaching-plugin`，宿主侧立即激活（`application: applied`）；浏览器页面刷新后左侧栏出现「AI 教学」。

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

1. 用新版本重复一次安装命令：`dsh plugin --profile desktop add dsh-teaching-plugin@latest`（或 `dsh plugin --profile desktop add <新路径>`）；需要时先 `remove dsh-teaching-plugin`。
2. 重新打开应用；宿主会重新组合 profile。
3. 数据 schema 升级由插件自动迁移并保留备份。

## 卸载

1. 应用内插件管理器移除 `dsh-teaching-plugin`（或 `dsh plugin --profile desktop remove dsh-teaching-plugin`，需先退出应用）。
2. 刷新/重启后侧栏入口消失；宿主数据目录可保留以便重装续学。
3. 彻底删除学习数据：关闭应用后删除 `~/.dsh/teaching/`（**原资料文件不受影响**）。
4. 卸载后不影响 Harness 其他插件与既有会话。

## 故障排查

- **侧栏没有入口**：确认 profile bundles 含 `dsh-teaching-plugin`；刷新页面；查看应用日志中 `[ai-teaching]` 前缀输出。
- **无法联网查证**：插件按需使用宿主 `ctx.web`；未配置搜索提供方时会明确显示能力缺失，不影响本地资料教学。
- **OCR/扫描件不确定**：会显示原文供核对；宿主安装 `tesseract` 可增强识别，缺失时降级为图片/原文展示而非编造内容。
- **实验无法运行**：检查 Python/Node/Scheme 环境记录；插件不会静默安装系统级依赖，需要时会请求确认。
- **数据迁移/备份**：设置页或 API 可创建备份 ZIP（含清单与 sha256，不含凭据）；换机恢复后会提示缺失的原资料路径。

## 维护者：构建、发布与验证

```bash
node scripts/build-plugin.mjs   # 生成 packages/dsh-plugin/lib/
pnpm run pack                   # 生成 dist/dsh-teaching-plugin-<version>/（npm publish 用的干净目录）
```

`pnpm run pack` 会把工作区专用的 `workspace:*` 依赖从发布清单中移除（Host 依赖已内联），生成一个可直接发布的目录；同时生成的 tgz/zip/SHA256SUMS 仅用于本地校验，**GitHub Releases 不再附带这些文件**。

发布到 npm（需先 `npm login`；npm 账号需开启 2FA 或使用带 Bypass 2FA 的 granular token；包名 `dsh-teaching-plugin`）：

```bash
npm publish ./dist/dsh-teaching-plugin-0.1.2 --access public
```

发布前建议在隔离 `DSH_HOME` 中用 npm 包做一次安装与启动验证：

```bash
DSH_HOME="$PWD/.scratch/release-check" dsh plugin --profile web add dsh-teaching-plugin
# 启动后日志出现 [ai-teaching] ready 即通过
```

确认后推送 tag，并创建**只含说明、不含二进制包**的 GitHub Release：

```bash
git tag v0.1.2 && git push origin v0.1.2
gh release create v0.1.2 --title "v0.1.2" --notes-file docs/release-notes-v0.1.2.md
```
