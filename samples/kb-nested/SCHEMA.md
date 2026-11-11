# 嵌套章节 Fixture Schema

> 测试用 LLM-wiki fixture：index.md 的章节标题位于 H3（在「概念索引」H2 之下），
> 并包含「对比页」「实体」等非章节分区与 chapter-N tags 兜底场景。

## Conventions

- 每个 wiki 页带 YAML frontmatter（title/type/tags/sources）。
- 页面用 `[[wikilinks]]` 交叉引用。
