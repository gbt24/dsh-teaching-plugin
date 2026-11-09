# v0.1.1 — 项目更名为 dsh-teaching-plugin

本版本没有教学功能变更，主要是一次发布一致性修复。

## 变更

- GitHub 仓库与项目名改为 `dsh-teaching-plugin`（旧地址 `gbt24/deepseek-teaching-plugin` 会 301 重定向）。
- 插件版本改为 `0.1.1`，并改为单一来源 `packages/dsh-plugin/src/version.ts`；新增单测保证它与 `package.json` 版本一致，避免 bundle 顶栏/记录版本与发布版本漂移。
- 重新构建 Host/Client bundle，顶栏与 bootstrap 显示 `v0.1.1`。
- README、安装文档中的版本号、下载文件名与仓库链接同步更新。

## 安装

要求：macOS + DeepSeek Harness Desktop **0.2.2-rc.1**（`engines.dsh` 允许 `>=0.2.2-rc.1 <0.3.0`）。

1. 下载本 Release 的 `dsh-ai-teaching-0.1.1.tgz`（或 `.zip`）。
2. **完全退出** DeepSeek Harness Desktop。
3. 用应用自带 CLI 安装：

   ```bash
   "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
     plugin --profile desktop add /path/to/dsh-ai-teaching-0.1.1.tgz
   ```

4. 重新打开应用，左侧栏出现「AI 教学」。

卸载：`... plugin --profile desktop remove dsh-ai-teaching`（需先退出应用）。学习数据保留在 `~/.dsh/teaching/`；原始资料文件不受影响。

## 校验

Release 附带 `SHA256SUMS`：

```bash
shasum -a 256 -c SHA256SUMS
```
