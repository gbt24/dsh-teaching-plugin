# Wiki Schema

## Domain

测试用微积分知识库（T02 课程结构 v2 的可分发 fixture，非真实课程资料）。

## Conventions

- 文件命名：小写、连字符、无空格
- 每个 wiki 页面以 YAML frontmatter 开头（title/type/tags/sources/confidence）
- 使用 `[[wikilinks]]` 交叉链接；每页至少 2 条出链
- 新页面必须登记到 `index.md` 对应分区
- 每次操作追加到 `log.md`

## Frontmatter

```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary | chapter-overview
tags: [ch01]
sources: [raw/articles/source-notes.md]
confidence: high
---
```

## Tag Taxonomy

- 章节归属：`ch01`、`ch02`
- 类型：`definition`、`calculation`、`theorem`

## Page Thresholds

- 一个概念/实体在 2+ 来源出现，或对单份来源是核心内容，才建立页面
- passing mention 不建页

## Concept Pages

一页一个概念：定义/解释、当前知识状态、相关概念（wikilinks）、来源。
