# v0.1.2 — 支持 npm 一条命令安装

本版本让安装方式与 `dsh-context` 等 Harness 插件一致：直接按包名安装。

## 变更

- 插件包名从 `dsh-ai-teaching` 更名为 `dsh-teaching-plugin`（与仓库/项目名一致）。
- 发布 npm 包 `dsh-teaching-plugin`：包含 Host/Client 构建产物、`cordis.patch.yml` 与发布用 `package.json`（无 `private`、无 `workspace:*` 依赖）。
- 安装命令：

  ```bash
  dsh plugin --profile desktop add dsh-teaching-plugin
  ```

- README 与安装文档统一使用应用自带的 `dsh` CLI 和 `$DSH_HOME` 表述，不再出现固定的 macOS 安装路径，也不再把 macOS 写成安装前提（当前仍只在 macOS 完成验证）。
- 版本号升到 `0.1.2`；无教学功能变更。

## 安装

要求：DeepSeek Harness Desktop **0.2.2-rc.1**（`engines.dsh` 允许 `>=0.2.2-rc.1 <0.3.0`；当前在 macOS 验证，Windows / Linux 尚未验证）。命令中的 `dsh` 指应用自带的 CLI，请确保它在 `PATH` 中。

1. **完全退出** DeepSeek Harness Desktop。
2. 安装 npm 包：

   ```bash
   dsh plugin --profile desktop add dsh-teaching-plugin
   ```

3. 重新打开应用，左侧栏出现「AI 教学」。

GitHub Releases 仅用于发布说明，不再附带 tgz/zip 分发包；安装统一以 npm 为准。

卸载：`dsh plugin --profile desktop remove dsh-teaching-plugin`（需先退出应用）。学习数据保留在 `$DSH_HOME/teaching/`（默认 `~/.dsh/teaching/`）；原始资料文件不受影响。
