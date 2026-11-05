# T02 课程结构 fixture：小型 LLM-wiki

本目录是一个**可分发的小型知识库样例**，用于 T02 course structure v2 的自动测试（不是用户真实资料）。

结构与 Karpathy LLM Wiki skill 一致：

```
samples/kb/
├── SCHEMA.md                    # wiki 约定/标签分类/页面阈值
├── index.md                     # 分区目录：Chapter Overviews / Ch1 / Ch2 / 跨章工具 / Raw Sources
├── log.md                       # 活动日志（不参与教学）
├── concepts/
│   ├── chapter-1-overview.md    # chapter-overview（type: chapter-overview）
│   ├── chapter-2-overview.md
│   ├── limit-concept.md         # concept（frontmatter: tags/sources/confidence）
│   ├── continuity-concept.md
│   ├── derivative-concept.md
│   ├── derivative-rules.md
│   └── trig-tool.md             # 被 index「跨章工具」分区引用 → tool 章节
└── raw/
    └── articles/source-notes.md # raw 原始资料（只读；frontmatter source_url/ingested/sha256）
```

## 用途

- 检测：SCHEMA.md/index.md/frontmatter/分层目录/`[[wikilinks]]`/chapter-overview 全部存在；
- 确定性构建：2 章（Ch1 极限与连续、Ch2 导数与微分）+ 1 个工具章节（跨章工具）+ 4 个概念；
- 锚点：概念页 H1 行 + `sources` 指向的 raw 资料标题行；
- 警告：`concepts/continuity-concept.md` 的 `sources` 引用了一个未导入的 `raw/transcripts/not-imported.md`，
  用于验证「未导入来源只提示、不伪造锚点」。

测试中通过 `samples/corpus` 的导入管线把本目录的 `.md` 导入临时数据目录，原文件始终只读。
