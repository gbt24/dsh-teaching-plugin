/**
 * 课程结构 v2 · 知识库模式（kb-structure）证据：
 * - 角色判定（llm-wiki skill 三层 + 本地 chapter-overview 扩展 + 未知回退）；
 * - frontmatter / index 分区 / wikilink 解析；
 * - detectWikiKnowledgeBase 检测事实与逐文档角色；
 * - 确定性构建：章节/概念/锚点/顺序/来源/警告，且**不调用模型**；
 * - 策略错误分支：未检测到 KB 时 kb-structure 明确失败；llm-wiki 强制走模型。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import {
  classifySourceRole, normalizeSlug, parseFrontmatter, parseIndexSections, scanMarkdownPage,
} from '../../src/corpus/index.ts'
import type { KbDetection, KbSourceRole } from '../../src/corpus/index.ts'
import { courseId as newCourseId, nowIso } from '../../src/contracts/ids.ts'
import type { Course } from '../../src/contracts/course.ts'
import type { CourseRepository } from '../../src/storage/repositories.ts'
import {
  createCourseRecord, createTestCorpus, errorCode, kbSamplePath, listKbFixtureFiles,
  samplePath, valueOf,
} from './helpers.ts'

async function importFixture(context: Awaited<ReturnType<typeof createTestCorpus>>, courseId: string): Promise<void> {
  const files = await listKbFixtureFiles()
  const outcome = await context.service.importFiles(courseId as never, files.map(path => ({ path })))
  assert.equal(outcome.failures.length, 0, JSON.stringify(outcome.failures))
  assert.ok(outcome.documents.length >= 10)
}

function roleOf(detection: KbDetection, documentPathSuffix: string): KbSourceRole | undefined {
  for (const page of detection.pages) {
    if (page.document.originalPath.endsWith(documentPathSuffix)) return page.role
  }
  return undefined
}

test('角色判定：llm-wiki 三层目录/frontmatter type/未知回退', () => {
  const cases: { path: string; fileName: string; extension: string; frontmatter?: Record<string, unknown>; expected: KbSourceRole }[] = [
    { path: 'SCHEMA.md', fileName: 'SCHEMA.md', extension: '.md', expected: 'schema' },
    { path: 'index.md', fileName: 'index.md', extension: '.md', expected: 'catalog' },
    { path: 'log.md', fileName: 'log.md', extension: '.md', expected: 'log' },
    { path: 'log-2026.md', fileName: 'log-2026.md', extension: '.md', expected: 'log' },
    { path: 'raw/articles/karpathy.md', fileName: 'karpathy.md', extension: '.md', expected: 'raw-article' },
    { path: 'raw/papers/attention.pdf', fileName: 'attention.pdf', extension: '.pdf', expected: 'raw-paper' },
    { path: 'raw/transcripts/lecture-1.md', fileName: 'lecture-1.md', extension: '.md', expected: 'raw-transcript' },
    { path: 'raw/assets/diagram.png', fileName: 'diagram.png', extension: '.png', expected: 'raw-asset' },
    { path: 'visuals/graph.html', fileName: 'graph.html', extension: '.html', expected: 'visual-asset' },
    { path: 'concepts/limit-concept.md', fileName: 'limit-concept.md', extension: '.md', expected: 'concept' },
    { path: 'concepts/chapter-1-overview.md', fileName: 'chapter-1-overview.md', extension: '.md', expected: 'chapter-overview' },
    { path: 'concepts/custom.md', fileName: 'custom.md', extension: '.md', frontmatter: { type: 'chapter-overview' }, expected: 'chapter-overview' },
    { path: 'entities/openai.md', fileName: 'openai.md', extension: '.md', expected: 'entity' },
    { path: 'comparisons/a-vs-b.md', fileName: 'a-vs-b.md', extension: '.md', expected: 'comparison' },
    { path: 'queries/q-2026.md', fileName: 'q-2026.md', extension: '.md', expected: 'query' },
    { path: '_archive/old.md', fileName: 'old.md', extension: '.md', expected: 'archive' },
    { path: 'notes/random.md', fileName: 'random.md', extension: '.md', frontmatter: { type: 'summary' }, expected: 'summary' },
    { path: 'notes/random.md', fileName: 'random.md', extension: '.md', expected: 'unknown' },
    { path: 'concepts/foo.md', fileName: 'foo.md', extension: '.md', frontmatter: { type: 'concept' }, expected: 'concept' },
  ]
  for (const item of cases) {
    const role = classifySourceRole({
      relativePath: item.path,
      fileName: item.fileName,
      extension: item.extension,
      ...(item.frontmatter !== undefined
        ? { frontmatter: item.frontmatter as never }
        : {}),
    })
    assert.equal(role, item.expected, `${item.path} 应为 ${item.expected}，实际 ${role}`)
  }
})

test('frontmatter 与 index 解析：行内/块数组、章节分区与一句话摘要', async () => {
  const overview = await readFile(kbSamplePath('concepts/chapter-1-overview.md'), 'utf8')
  const parsed = parseFrontmatter(overview)
  assert.equal(parsed.data['type'], 'chapter-overview')
  assert.equal(parsed.data['title'], '第一章 极限与连续 — 概览')
  assert.deepEqual(parsed.data['tags'], ['ch01', 'exam-focus'])
  assert.deepEqual(parsed.data['sources'], ['raw/articles/source-notes.md'])
  assert.ok(parsed.bodyStartLine > 1)

  const blockArray = parseFrontmatter('---\ntitle: X\nsources:\n  - raw/a.md\n  - raw/b.md\nlist: [a, b, "c"]\nflag: true\n---\nbody')
  assert.deepEqual(blockArray.data['sources'], ['raw/a.md', 'raw/b.md'])
  assert.deepEqual(blockArray.data['list'], ['a', 'b', 'c'])
  assert.equal(blockArray.data['flag'], true)

  const indexContent = await readFile(kbSamplePath('index.md'), 'utf8')
  const index = parseIndexSections(indexContent)
  assert.deepEqual(index.sections.map(section => section.kind), ['chapter-overviews', 'chapter', 'chapter', 'tool', 'raw'])
  assert.equal(index.sections[1]?.chapterNumber, 1)
  assert.equal(index.sections[2]?.chapterNumber, 2)
  const limitEntry = index.sections[1]?.entries.find(entry => entry.target === 'limit-concept')
  assert.ok(limitEntry !== undefined)
  assert.match(limitEntry.summary ?? '', /左右极限/)

  const scan = scanMarkdownPage('# 标题\n\n## 小节\n\n这是第一段正文，包含 [[other-page|别名]] 链接。\n\n```\n[[fenced-link]]\n```\n')
  assert.equal(scan.h1, '标题')
  assert.deepEqual(scan.headings.map(heading => heading.text), ['标题', '小节'])
  assert.ok(scan.wikilinks.some(link => link.target === 'other-page' && link.display === '别名'))
  assert.ok(!scan.wikilinks.some(link => link.target === 'fenced-link'), '代码围栏内的链接不应解析')
  assert.match(scan.firstParagraph ?? '', /这是第一段正文/)
  assert.equal(normalizeSlug('Chapter 1-Overview.md'), 'chapter-1-overview')
})

test('检测：fixture 命中知识库结构、逐文档角色正确、非 KB 资料不误报', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '微积分测试')
  await importFixture(context, course.id)

  const detection = valueOf(await context.service.detectKnowledgeBase({ courseId: course.id as never }))
  assert.equal(detection.facts.isKnowledgeBase, true)
  assert.equal(detection.facts.hasSchema, true)
  assert.equal(detection.facts.hasIndex, true)
  assert.equal(detection.facts.chapterOverviewCount, 2)
  assert.ok(detection.facts.frontmatterPageCount >= 5)
  assert.ok(detection.facts.layeredDirs.includes('concepts'))
  assert.ok(detection.facts.layeredDirs.includes('raw'))
  assert.ok(detection.facts.resolvableWikilinkCount >= 10)
  assert.ok(detection.facts.signals.some(signal => signal.id === 'chapter-overview' && signal.matched))
  assert.equal(roleOf(detection, '/SCHEMA.md'), 'schema')
  assert.equal(roleOf(detection, '/index.md'), 'catalog')
  assert.equal(roleOf(detection, '/log.md'), 'log')
  assert.equal(roleOf(detection, '/concepts/chapter-1-overview.md'), 'chapter-overview')
  assert.equal(roleOf(detection, '/concepts/limit-concept.md'), 'concept')
  assert.equal(roleOf(detection, '/raw/articles/source-notes.md'), 'raw-article')

  // 非结构化资料不误报
  const plainCourse = await createCourseRecord(context.courses, '普通资料')
  const imported = await context.service.importFiles(plainCourse.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('text/limits-notes.txt') },
  ])
  assert.equal(imported.failures.length, 0)
  const plainDetection = valueOf(await context.service.detectKnowledgeBase({ courseId: plainCourse.id as never }))
  assert.equal(plainDetection.facts.isKnowledgeBase, false)
})

test('确定性构建：2 章 + 工具章节 + 概念/锚点/顺序/来源，且不调用模型', async t => {
  const model = new ScriptedModelClient([])
  const context = await createTestCorpus({ model })
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '微积分测试')
  await importFixture(context, course.id)

  // auto：检测到知识库 → 确定性构建，不调用模型
  const revision = valueOf(await context.service.proposeCourseStructure({
    courseId: course.id as never,
    courseTitle: '微积分',
    goal: '掌握极限与导数',
    language: 'zh',
  }))
  assert.equal(model.calls.length, 0, '知识库直读不应调用模型')
  assert.equal(revision.provenance, 'kb-structure')
  assert.equal(revision.version, 1)
  assert.ok(revision.chapters !== undefined)
  const chapterRoles = new Map(revision.chapters?.map(chapter => [chapter.role, (revision.chapters ?? []).filter(item => item.role === chapter.role).length]))
  assert.equal(chapterRoles.get('chapter'), 2)
  assert.equal(chapterRoles.get('tool'), 1)
  assert.ok((revision.concepts.length ?? 0) >= 3)
  assert.equal(new Set(revision.sequence).size, revision.concepts.length, 'sequence 必须覆盖全部概念且不重复')
  assert.equal(revision.sequence.length, revision.concepts.length)
  assert.ok(revision.changeSummary?.includes('kb-structure'))
  assert.ok(revision.changeSummary?.includes('知识库结构直读'))

  // 章节覆盖每个概念一次
  const ids = new Set(revision.concepts.map(concept => concept.id))
  const chapterConceptIds = (revision.chapters ?? []).flatMap(chapter => [...chapter.conceptIds])
  assert.equal(new Set(chapterConceptIds).size, chapterConceptIds.length, '概念不应出现在多个章节')
  assert.equal(new Set(chapterConceptIds).size, ids.size)
  for (const id of chapterConceptIds) assert.ok(ids.has(id))

  // 概念锚点：都能通过 resolveAnchor 回解到原文单元
  let anchorCount = 0
  for (const concept of revision.concepts) {
    assert.ok(concept.title.length > 0)
    assert.ok(concept.sourceAnchors.length > 0, `概念《${concept.title}》应有资料锚点`)
    for (const anchor of concept.sourceAnchors) {
      anchorCount += 1
      const unit = valueOf(await context.service.resolveAnchor(anchor))
      assert.equal(unit.id, anchor.unitId)
      assert.ok(anchor.locator.lines !== undefined || anchor.locator.chars !== undefined)
    }
  }
  assert.ok(anchorCount >= revision.concepts.length * 2, '每个概念至少应有页面 H1 + raw 来源锚点')

  // basedOn 只包含实际使用的资料（log/README 等未使用的不在其中）
  assert.ok(revision.basedOn.length > 0)
  const basedOnTitles = new Set<string>()
  for (const item of revision.basedOn) {
    const document = valueOf(await context.service.getDocument(item.sourceId))
    basedOnTitles.add(document.title)
  }
  assert.ok([...basedOnTitles].some(title => title === 'index.md'))
  assert.ok([...basedOnTitles].some(title => title.includes('chapter-1-overview')))

  // 课程草稿关系：只写 draftRevisionId
  const courseAfter = await context.courses.get(course.id)
  assert.equal(courseAfter?.draftRevisionId, revision.id)
  assert.equal(courseAfter?.activeRevisionId, undefined)

  // coverage/warnings 数据可用
  const coverage = valueOf(await context.service.buildCourseDraftCoverage(course.id))
  assert.ok(coverage.coverage.length > 0)
  assert.ok(coverage.warnings.some(warning => warning.includes('kb-structure')))
})

test('策略分支：kb-structure 未检测到时明确失败；llm-wiki 强制走模型', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const plainCourse = await createCourseRecord(context.courses, '普通资料')
  await context.service.importFiles(plainCourse.id, [
    { path: samplePath('markdown/derivatives.md') },
  ])
  const rejected = await context.service.proposeCourseStructure({
    courseId: plainCourse.id as never,
    courseTitle: '普通课程',
    goal: '理解导数',
    language: 'zh',
    strategy: 'kb-structure',
  })
  assert.equal(errorCode(rejected), 'capability-missing')
  if (!rejected.ok) {
    assert.ok(rejected.error.details !== undefined)
    assert.ok(String(rejected.error.message).includes('kb-structure'))
  }
  // 未注入模型时 auto/llm-wiki 均返回 capability-missing（未检测到结构）
  const autoNoModel = await context.service.proposeCourseStructure({
    courseId: plainCourse.id as never,
    courseTitle: '普通课程',
    goal: '理解导数',
    language: 'zh',
  })
  assert.equal(errorCode(autoNoModel), 'capability-missing')

  // KB fixture + llm-wiki 强制：使用模型（模型回复非法 → uncertain，但调用发生）
  const model = new ScriptedModelClient([{ kind: 'text', text: '不是 JSON' }, { kind: 'text', text: '仍然不是 JSON' }])
  const kbContext = await createTestCorpus({ model })
  t.after(async () => await kbContext.cleanup())
  const kbCourse = await createCourseRecord(kbContext.courses, '微积分强制模型')
  await importFixture(kbContext, kbCourse.id)
  const forced = await kbContext.service.proposeCourseStructure({
    courseId: kbCourse.id as never,
    courseTitle: '微积分',
    goal: '掌握极限',
    language: 'zh',
    strategy: 'llm-wiki',
  })
  assert.equal(errorCode(forced), 'uncertain')
  assert.equal(model.calls.length, 2, '强制 llm-wiki 应调用模型并只修复一次')
})

test('警告：悬空 wikilink 与未导入 sources 不伪造锚点', async t => {
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-kb-warn-'))
  const context = await createTestCorpus()
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  // 复制 fixture 并加入悬空链接（临时目录，不改仓库样例）
  await cp(kbSamplePath(), workDir, { recursive: true })
  const dangling = await readFile(join(workDir, 'concepts/limit-concept.md'), 'utf8')
  await writeFile(join(workDir, 'concepts/limit-concept.md'), `${dangling}\n\n参见 [[missing-page|不存在的页面]]。\n`)
  const course = await createCourseRecord(context.courses, '悬空链接课程')
  const files: string[] = []
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(full)
    }
  }
  await walk(workDir)
  const imported = await context.service.importFiles(course.id, files.map(path => ({ path })))
  assert.equal(imported.failures.length, 0)
  const revision = valueOf(await context.service.proposeCourseStructure({
    courseId: course.id as never,
    courseTitle: '悬空链接课程',
    goal: '验证警告',
    language: 'zh',
  }))
  assert.equal(revision.provenance, 'kb-structure')
  assert.ok(revision.changeSummary?.includes('结构警告'), revision.changeSummary)
  assert.ok(revision.changeSummary?.includes('wikilink') || revision.changeSummary?.includes('结构警告'))
  // 悬空链接不能导致伪造概念
  assert.ok(!revision.concepts.some(concept => concept.title.includes('不存在的页面')))
})

test('章节顺序：index 顺序与章节概览编号一致时按 index 顺序输出', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '顺序')
  await importFixture(context, course.id)
  const revision = valueOf(await context.service.proposeCourseStructure({
    courseId: course.id as never,
    courseTitle: '微积分',
    goal: '顺序验证',
    language: 'zh',
  }))
  const chapters = revision.chapters ?? []
  assert.equal(chapters[0]?.title, '第一章 极限与连续')
  assert.equal(chapters[1]?.title, '第二章 导数与微分')
  assert.equal(chapters[2]?.role, 'tool')
  // 第一章概念顺序与 index 条目一致
  const firstChapterTitles = (chapters[0]?.conceptIds ?? []).map(id => revision.concepts.find(concept => concept.id === id)?.title)
  assert.deepEqual(firstChapterTitles, ['极限概念', '连续与间断'])
})
