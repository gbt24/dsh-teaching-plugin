# 课程结构生成 v2：知识库结构优先 + LLM-wiki 回退（设计）

日期：2026-11-05。状态：实现中。关联：R13（AI 识别资料并提出可修改课程结构）、T05/T08。

## 背景

当前 `courseDraft.generate` 只用 18,000 字符预算把少量资料单元塞进提示词，要求模型输出 4–12 个概念。对真实大课程（如 1,281 份资料的考研高数库）实际只用到 4 份资料，产出 4 个概念；而该库本身是按 Karpathy LLM-wiki 方法构建的：`SCHEMA.md` + `index.md` + `log.md` + `raw/`、`concepts/`、`entities/`、`comparisons/`、`queries/` 三层结构，frontmatter（title/type/tags/sources/confidence）、`[[wikilinks]]`、chapter-overview 页。结构已经存在，不应让模型重新猜。

参考 skill：`/Users/gbt24/Downloads/llm-wiki/SKILL.md`（Karpathy LLM Wiki，v2.1.0）。本设计把它作为**结构判定与生成规则**，而不是让插件去写用户的知识库。

## 目标

1. 有结构的资料：直接读取其结构生成课程草案（章节/概念/顺序/先修/来源/角色），不调用模型、不受 18k 字符预算影响，可追溯到具体文件与标题行。
2. 无结构的资料：按 LLM-wiki skill 的规则创建**虚拟知识库结构**（三层次 + 页面阈值 + 索引 + 交叉链接），再由它生成课程草案；不写入用户的原始目录。
3. 两种模式共用同一套“资料角色判定”，用于区分教学概念、源材料、目录/元数据、图表、归档内容。
4. 草案界面如实显示结构来源，并允许后续编辑（增删/改名/排序/章节）。
5. 不改变原始资料只读原则；所有派生产物只写插件数据目录。

## 资料角色判定（来自 llm-wiki skill，含本地扩展）

| 角色 | 判定规则 | 课程中的用途 |
| --- | --- | --- |
| `schema` | 根目录 `SCHEMA.md` / frontmatter 定义 | 知识库约定，不作为教学内容 |
| `catalog` | 根目录 `index.md` | 章节与概念清单、顺序、一句话摘要 |
| `log` | 根目录 `log.md`（含 `log-YYYY.md`） | 活动历史，不作为教学内容 |
| `raw-article` / `raw-paper` / `raw-transcript` | `raw/articles|papers|transcripts/` | 源材料；为概念提供 `sources` 与原文锚点 |
| `raw-asset` | `raw/assets/` 或 `visuals/` 的图片/HTML | 图表/可视化，不进结构生成（除非被概念页引用） |
| `concept` | `concepts/` + frontmatter `type: concept` | 课程概念 |
| `entity` | `entities/` + `type: entity` | 实体页；可作为概念或“人物/组织/模型”类资源 |
| `comparison` | `comparisons/` + `type: comparison` | 对比分析；可作为教学单元或练习素材 |
| `query` | `queries/` + `type: query` | 已归档的查询结果；默认不作为课程主结构 |
| `chapter-overview` | `concepts/chapter-*-overview.md`（本地扩展，`type: chapter-overview`） | 章节节点、章节摘要、章节知识树与子概念顺序 |
| `unknown` | 无匹配 | 回退为普通源材料 |

frontmatter 字段：`title`、`type`、`tags`、`sources`、`confidence`、`contested`、`contradictions`（skill 有定义）都要读取；`created/updated/status` 用于变更检测。`raw/` 永不修改。

## 模式 A：知识库结构直读（检测到结构时，默认）

检测条件（任一）：存在 `SCHEMA.md` / `index.md` 且含 sectioned catalog 或 `[[wikilinks]]`；存在 `concepts/`、`entities/`、`raw/` 等分层目录；Markdown 页面带 frontmatter（至少 title/type/tags/sources）；存在 chapter-overview 页。

构建：
1. 读 `SCHEMA.md`（领域/约定/标签分类）与 `index.md`（章节清单、概念清单与顺序、跨章工具/复习工具/Raw Sources 分组）。
2. 解析 chapter-overview：章节标题、摘要、知识结构图、子概念索引（`[[links]]`）。
3. 解析概念页 frontmatter：title（显示标题）、type、tags（章节归属）、sources（源文件）、confidence/contested；正文 H1 行号作为锚点。
4. 生成：`chapters`（章节 → conceptIds）、`concepts`（标题/摘要/锚点/来源）、`sequence`（index 顺序；无 index 时按章节/文件名/链接拓扑）；`basedOn` 只引用实际使用的资料修订。
5. 角色分类结果写入草案说明与 coverage（不把 raw/index/log 当概念）。
6. 输出警告：index 缺失/文件缺失/无效 wikilink/孤立页/frontmatter 缺字段/章节标签不一致/路径空格差异等。

已在真实库验证（只读，17 ms）：67 个 wiki 页（55 概念 + 12 章概览）→ 12 章 + 55 概念 + 1 跨章工具，全部引用可解析；`index.md`/`chapter-overview`/frontmatter/links 一致。

## 模式 B：LLM-wiki 回退（未检测到结构时）

按 skill 的 Ingest + Index 规则生成“虚拟 wiki”，不写用户目录：

1. **资料摘要（确定性）**：对每个已导入文档生成 digest：title/角色/格式/标题树（`sectionPath`）/首段/代表单元 id（含行号）——优先章节标题与概念型文档；全部文档都纳入一次“索引级”摘要（不再只用前 4 份）。
2. **LLM 生成索引式结构**：提示词规定遵守 skill：三层角色、页面阈值（2+ 来源出现或单来源核心才建页）、一句话摘要、每条概念至少 2 个交叉链接、章节/索引分区；输出 `sections → concepts`（每个概念带来源 documentId/unitId 候选），并允许“资料不足”说明。
3. **超长资料**：按章节/文件分组做 map（每组生成局部分区与概念），再 reduce 合并去重；不丢来源映射。
4. **校验与锚点**：模型返回的 documentId/unitId 必须在 digest 中，否则丢弃并警告（不伪造来源）；锚点优先概念页/标题行，其次段落单元。
5. **写入**：生成 `CourseRevision`（chapters + concepts + sequence + basedOn），`provenance: 'llm-wiki'`；`changeSummary` 说明“按 LLM-wiki 规则从 N 份资料生成，X 个概念/章节；受预算限制时列出未覆盖资料”。

## 契约与接口（Phase 1）

- `CourseRevision.chapters?: CourseChapter[]`（id/title/summary/conceptIds/sourceAnchors?/role?），保持 `concepts/sequence` 兼容。
- `CourseRevision.provenance ∈ { 'ai-draft' | 'student-edit' | 'source-update' | 'kb-structure' | 'llm-wiki' }`。
- `CourseDraftInput.strategy?: 'auto' | 'kb-structure' | 'llm-wiki'`；默认 `auto`（检测到 KB 用 A，否则 B）。
- `CourseDraftView.origin?: 'kb-structure' | 'llm-wiki' | 'ai'`；`structureNotes?: string[]`（角色判定/回退原因/未覆盖资料）。
- Host `courseDraft.generate` 透传 strategy；任务步骤显示“识别知识库结构 / 按 LLM-wiki 规则生成结构”。
- 客户端 DraftReview：显示来源（知识库直读 vs LLM-wiki 生成）、章节分组、每章概念数、结构与角色说明；概念仍平铺列出（Phase 1 不做编辑，编辑放 Phase 2）。

## 验证计划

- 自动：结构检测/角色判定/索引解析/章节-概念-锚点映射；无结构 fixture 的 LLM-wiki 回退（ScriptedModelClient）；无效锚点丢弃；空资料/部分失败/超预算警告。
- 真实库（只读 + 临时数据目录）：导入 67 个 concepts md（不导入 1159 张图）→ 生成 12 章 / 55 概念，锚点到 H1 行，sources 解析；与只读扫描脚本结果一致。
- 对照：同一课程现有 AI 草案 4 概念 vs 新流程 12 章/55 概念。
- UI：dev GUI 真实 Host 生成 + DraftReview 展示来源/章节；确认后进入学习的兼容性（chapters 为可选字段）。
- 证据：T05 §7/新章节、T08-trace R13；保留“真实桌面/人工评审”待办。

## 局限（Phase 1）

- 章节分组用于展示与学习组织，学习侧边栏暂不按章节折叠（Phase 2）。
- LLM-wiki 回退是“虚拟 wiki”，不写入 `WIKI_PATH`；不替代用户对知识库的维护（lint/ingest 写入仍由 skill/用户控制）。
- 自定义页面类型（如 `chapter-overview`）按本地扩展识别；其他自定义类型回退为普通概念/源材料。
- 未结构化的 PDF/Office 资料仍需解析成本；回退只改善结构质量，不减少 OCR 时间。
