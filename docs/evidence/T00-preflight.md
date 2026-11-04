# T00 Desktop preflight

日期：2026-11-04（Asia/Shanghai）。状态：只读 preflight 已完成；用户澄清由其自行派发实现任务后，本次 agent 执行已停止。T00 最小真实集成未执行、未通过。

## 实际基线

| 项目 | 本机读取结果 |
| --- | --- |
| 系统 | macOS 27.0.1，arm64 |
| 应用 | `/Applications/DeepSeek Harness.app` |
| Bundle ID | `com.deepseek.dsh` |
| Info.plist 版本 / build | `0.2.1-rc.5` / `0.2.1-rc.5` |
| bundled CLI | `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
| CLI `--version` | 实际执行返回 `0.2.1-rc.5`，exit 0 |
| runtime descriptor | `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/desktop-runtime.json` |
| descriptor release | `0.2.1-rc.5`，Host protocol 4 |
| Node / pnpm | descriptor 与 `runtime/versions.json`：`24.21.0` / `11.28.5` |
| Electron / Chrome | Node 模式实际 `process.versions`：`44.7.0` / `152.0.7977.130` |
| Cordis | descriptor 中 `@deepseek-ai/cordis` 为 `4.0.5` |
| Shared packages | descriptor 列出 305 项；本次只输出相关包的摘要 |
| descriptor SHA-256 | `69c636ab56a6062496ff6e8ee89b6da0b8688da052232b6384e899273735769a` |
| commit | descriptor 的 release 未提供 commit；当前未知 |

研究报告中 master 的 `0.2.2-alpha.3` 不是本机目标。本轮适配应以实际 `0.2.1-rc.5` 的发布声明、exports 与运行结果为准。

## 查找与实际操作

1. 检查 `/Applications`、`~/Applications` 中名称含 DeepSeek/Harness/dsh 的应用，找到上述安装。
2. 用 Python `plistlib` 读取应用 `Contents/Info.plist`，只读列出已知 Resources/runtime 路径。
3. 读取 bundled CLI launcher：它通过应用 Electron 的 Node 模式执行 `@deepseek-ai/dsh-desktop-host/lib/cli.js`。
4. 运行 bundled CLI 的 `--version` 和 `--help`，均成功；没有执行 add/remove 或启动会话。
5. 使用同一应用的 `ELECTRON_RUN_AS_NODE=1` 只读解析 asar 内 runtime descriptor 和相关 manifest，读取 `process.versions`。未改写签名应用资源。
6. 已找到本机 `agent-browser`，并读取其 core 与 Electron 技能内容；尚未连接或控制 Desktop 界面。

上述操作没有读取模型凭据或课程内容，没有修改用户 desktop profile，没有安装依赖或调用云端模型。

## 已遇到的限制与差异

- `ps -axo pid,comm` 在当前执行权限下返回 operation not permitted，因此尚未通过进程表确认 Desktop 是否已在运行。
- Node 模式执行命令时 Electron 输出 `codesign_util ... task_name_for_pid ... failure (5)`，但 `--version`/`--help` exit 0；不能据此判断 GUI 不能运行。
- 尝试读取 master 文档使用的 `@deepseek-ai/dsh-client-ui-slots/package.json` 在本机 asar 返回 ENOENT。这是具体发布差异线索，需要从本机 manifest/exports 确认正确入口，不能先宣称 Slots 不受支持。
- 一次初始 descriptor 输出包含了大量包清单，后续已改为筛选字段摘要；证据文件仅保存必要基线。

## 验证级别

| 研究清单 | 状态 |
| --- | --- |
| V1 版本/运行时指纹 | 版本、平台、运行时与 descriptor hash 已采集；commit 未提供 |
| V2 安装/禁用/卸载 | 未执行 |
| V3 Host/Client/真实 Slot | 未执行；需核对本机版本入口 |
| V4 宿主业务通信 | 未执行 |
| V5 当前模型/工具/取消 | 未执行 |
| V6 重启恢复 | 未执行 |
| V7 文件/转换/执行约束 | 未执行 |
| V8 独立 HTML | 未执行 |

覆盖 R11/R33/R39 的环境事实；AC01、AC06、AC14 均未据此判通过。自动化产品测试、真实桌面插件操作、人工教学验证尚未开始。

## 下一步

供用户后续指定的实现 agent 参考：核对本机 asar 中实际的 Client/Slots、gateway、storage、Agent exports；采集 desktop profile 的非敏感路径和存在性；检查 GUI 的连接条件。在用户派发任务且实际条件具备后，建立 `spikes/desktop/` 最小包，继续 V2–V8。
