# v0.1.0 — AI 知识库教学插件

面向 DeepSeek Harness Desktop 的首个公开版本：以学生本地资料为课程依据，在对话、持续教学区域、练习与实验中完成学习，并保留学习记录与证据。

## 安装

要求：macOS + DeepSeek Harness Desktop **0.2.2-rc.1**（`engines.dsh` 允许 `>=0.2.2-rc.1 <0.3.0`）。

1. 下载本 Release 的 `dsh-ai-teaching-0.1.0.tgz`（或 `.zip`）。
2. **完全退出** DeepSeek Harness Desktop。
3. 用应用自带 CLI 安装：

   ```bash
   "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
     plugin --profile desktop add /path/to/dsh-ai-teaching-0.1.0.tgz
   ```

4. 重新打开应用，左侧栏出现「AI 教学」。

卸载：`... plugin --profile desktop remove dsh-ai-teaching`（需先退出应用）。学习数据保留在 `~/.dsh/teaching/`，删除前请确认不再需要；原始资料文件不受影响。

## 主要内容

- 本地资料导入（Markdown/文本/PDF/图片/Word/PPT/代码/Notebook）与只读保护。
- AI 访谈式课程规划、课程结构生成、资料增量整合草案。
- 对话式教学 + 右侧持续教学区域（可拖拽调宽、可折叠）。
- 练习/提示/参考答案/换种讲法、作答反馈、掌握度与复习队列。
- 内嵌对话的交互式教学卡片（图形/动画/HTML），支持全屏。
- Python / JavaScript / Scheme 实验运行与结果记录。
- 模型与推理力度选择、上下文用量与手动压缩。
- 中 / EN / 中英双语界面，离线教学页导出，学习数据备份/恢复。

## 验证状态

- `tsc` 0 errors，`524` 项自动化测试通过，CI 在每次 push 时运行。
- 已在 macOS + DSH `0.2.2-rc.1` 上完成真实桌面加载、模型调用、资料导入、教学流程与持久化验证。
- Windows / Linux 未验证。

## 已知限制

- 联网资料检索依赖宿主配置的搜索 provider；未配置时降级为基于已有资料/模型知识的方案。
- 扫描件 OCR 依赖本机 tesseract；缺失时回退原文/图片并标注不确定性。
- Mermaid 目前以源码形式展示，尚未实时渲染。
- 真实桌面的人工教学验收项仍在持续补齐，详见仓库 `docs/evidence/`。

## 校验

Release 附带 `SHA256SUMS`，可校验下载文件：

```bash
shasum -a 256 -c SHA256SUMS
```
