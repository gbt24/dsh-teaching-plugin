/**
 * 网页资料导入证据（Host 抓取后交给 corpus，不联网、不执行脚本）：
 * 标题/标题层级/正文单元与定位、去壳（script/style/nav/footer）、来源元信息、
 * 去重与内容更新、空内容失败、200k 截断、纯文本/Markdown、以及非本地路径的 saveRevision。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceId as newSourceId, nowIso } from '../../src/contracts/ids.ts'
import type { SourceDocument } from '../../src/contracts/source.ts'
import {
  domainOf, parseWebPage, webSyntheticPath, WEB_TEXT_CAP,
} from '../../src/corpus/index.ts'
import { DEFAULT_LIMITS } from '../../src/corpus/index.ts'
import {
  createTestCorpus, createCourseRecord, samplePath, valueOf, errorCode,
} from './helpers.ts'

const WEB_HTML = [
  '<!doctype html><html><head>',
  '<title> 导数与极限 | 数学Wiki </title>',
  '<style>.x{color:red}</style>',
  '<script>alert("bad-script")</script>',
  '</head><body>',
  '<nav><a href="/">首页导航</a></nav>',
  '<header><h1>导数与极限</h1></header>',
  '<section><h2>第一节 极限</h2>',
  '<p>极限描述趋近过程，包含 <strong>ε-δ</strong> 定义。</p>',
  '<h3>1.1 左右极限</h3>',
  '<ul><li>左极限</li><li>右极限</li></ul>',
  '</section>',
  '<section><h2>第二节 导数</h2>',
  '<p>导数是差商的极限，几何上对应切线斜率。</p>',
  '<pre><code class="language-python">def f(x):\n    return x</code></pre>',
  '</section>',
  '<footer>页脚版权信息</footer>',
  '</body></html>',
].join('\n')

test('网页导入：标题层级/正文单元/定位/去壳/来源元信息', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '网页课程')
  const result = await context.service.importWebPage({
    courseId: course.id,
    url: 'https://math.example.com/derivative?from=index',
    finalUrl: 'https://math.example.com/derivative',
    html: WEB_HTML,
    fetchedAt: nowIso(),
    provider: 'harness-web',
    contentType: 'text/html',
  })
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error))
  if (!result.ok) return
  const { document, revision } = result.value
  assert.equal(document.origin, 'web')
  assert.match(document.originalPath, /^web:\/\//)
  assert.equal(document.format, 'html')
  assert.deepEqual(document.courseIds, [course.id])
  assert.ok(document.web !== undefined)
  assert.equal(document.web?.url, 'https://math.example.com/derivative?from=index')
  assert.equal(document.web?.finalUrl, 'https://math.example.com/derivative')
  assert.equal(document.web?.provider, 'harness-web')
  assert.match(document.web?.contentHash ?? '', /^sha256:[0-9a-f]{64}$/)
  assert.match(document.title, /导数与极限/)
  assert.equal(document.status, 'ready')
  assert.equal(document.missing, undefined)
  assert.equal(revision.documentId, document.id)
  assert.equal(revision.fingerprint, document.web?.contentHash)

  // 标题层级 → heading 单元 + sectionPath + 保留 Markdown 标题
  const headings = revision.units.filter(unit => unit.kind === 'heading')
  assert.ok(headings.length >= 4)
  const section = headings.find(unit => unit.text === '第一节 极限')
  assert.ok(section !== undefined)
  assert.deepEqual(section.locator.sectionPath, ['导数与极限', '第一节 极限'])
  assert.equal(section.markdown?.startsWith('## '), true)
  assert.ok(section.locator.lines !== undefined && section.locator.chars !== undefined)
  const h1 = headings.find(unit => unit.text === '导数与极限')
  assert.equal(h1?.markdown, '# 导数与极限')

  const kinds = new Set(revision.units.map(unit => unit.kind))
  for (const kind of ['heading', 'paragraph', 'list', 'code'] as const) {
    assert.ok(kinds.has(kind), `网页应抽取 ${kind} 单元，实际 ${[...kinds].join(',')}`)
  }
  const allText = revision.units.map(unit => unit.text).join('\n')
  assert.match(allText, /ε-δ/)
  assert.match(allText, /导数是差商的极限/)
  assert.match(allText, /def f\(x\)/)
  // 去壳：脚本/样式/导航/页脚不进入正文
  assert.ok(!allText.includes('bad-script'), 'script 内容必须被移除')
  assert.ok(!allText.includes('首页导航'), 'nav 内容必须被移除')
  assert.ok(!allText.includes('页脚版权'), 'footer 内容必须被移除')
  assert.ok(!allText.includes('color:red'), 'style 内容必须被移除')
  assert.ok(!allText.includes('alert('))

  // 资料可读、可检索
  const stored = valueOf(await context.service.getDocument(document.id))
  assert.equal(stored.origin, 'web')
  const search = valueOf(await context.service.search({ query: '极限', courseId: course.id }))
  assert.equal(search.empty, false)
  assert.ok(search.hits.some(hit => hit.anchor.documentId === document.id))
  assert.equal((await context.courses.listSources(course.id)).length, 1)
})

test('网页去重：同 URL 同内容幂等；同 URL 新内容生成新修订；跨 URL 同正文去重', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '网页去重')
  const course2 = await createCourseRecord(context.courses, '第二门课')
  const request = {
    url: 'https://example.com/a',
    html: '<html><head><title>A</title></head><body><h1>主题</h1><p>第一段内容，用于去重测试。</p></body></html>',
    fetchedAt: '2026-11-06T08:00:00.000Z',
  }
  const first = valueOf(await context.service.importWebPage({ ...request, courseId: course.id }))
  assert.equal(first.document.revisions.length, 1)

  // 同 URL 同内容：幂等，不新增修订；可补挂课程
  const second = valueOf(await context.service.importWebPage({ ...request, courseId: course2.id }))
  assert.equal(second.document.id, first.document.id)
  assert.equal(second.revision.id, first.revision.id)
  assert.equal(second.document.revisions.length, 1)
  assert.deepEqual([...second.document.courseIds].sort(), [course.id, course2.id].sort())

  // 不同 URL 相同正文：内容哈希去重，返回既有文档且不新增修订
  const otherUrl = valueOf(await context.service.importWebPage({
    ...request,
    url: 'https://mirror.example.net/copy',
    courseId: course.id,
  }))
  assert.equal(otherUrl.document.id, first.document.id)
  assert.equal(otherUrl.document.revisions.length, 1)

  // 同 URL 内容变化：新修订 + web.contentHash/fetchedAt 更新
  const changedHtml = '<html><head><title>A</title></head><body><h1>主题</h1><p>第一段内容。</p><h2>新增小节</h2><p>第二段新内容，用于更新测试。</p></body></html>'
  const changed = valueOf(await context.service.importWebPage({
    ...request,
    courseId: course.id,
    html: changedHtml,
    fetchedAt: '2026-11-06T09:00:00.000Z',
  }))
  assert.equal(changed.document.id, first.document.id)
  assert.equal(changed.document.revisions.length, 2)
  assert.notEqual(changed.revision.id, first.revision.id)
  assert.notEqual(changed.document.web?.contentHash, first.document.web?.contentHash)
  assert.equal(changed.document.web?.fetchedAt, '2026-11-06T09:00:00.000Z')
  const text = changed.revision.units.map(unit => unit.text).join('\n')
  assert.match(text, /新增小节/)
})

test('网页导入失败：非法 URL / 完全空内容 / 无可提取正文', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const invalidUrl = await context.service.importWebPage({ url: 'ftp://example.com/x', html: '<p>x</p>', fetchedAt: nowIso() })
  assert.equal(errorCode(invalidUrl), 'invalid-input')
  const empty = await context.service.importWebPage({ url: 'https://example.com/empty', fetchedAt: nowIso() })
  assert.equal(errorCode(empty), 'invalid-input')
  if (!empty.ok) assert.equal(empty.error.cause, 'empty-page')
  const noContent = await context.service.importWebPage({
    url: 'https://example.com/spa',
    html: '<html><head><script>app()</script></head><body><nav>导航</nav><footer>页脚</footer></body></html>',
    fetchedAt: nowIso(),
  })
  assert.equal(errorCode(noContent), 'invalid-input')
  if (!noContent.ok) assert.equal(noContent.error.cause, 'empty-content')
  // 失败不留文档记录
  assert.equal((await context.service.search({ query: 'spa' })).ok, true)
})

test('网页纯文本/Markdown：保留 Markdown 标题、标题回退与内容上限', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const markdown = valueOf(await context.service.importWebPage({
    url: 'https://notes.example.com/post',
    text: '# 极限笔记\n\n极限是差商的...\n\n## 左右极限\n\n左极限与右极限定义。',
    fetchedAt: nowIso(),
  }))
  assert.equal(markdown.document.format, 'markdown')
  assert.equal(markdown.document.title, 'notes.example.com', '无 title/html 时回退到域名')
  const headings = markdown.revision.units.filter(unit => unit.kind === 'heading')
  assert.deepEqual(headings.map(unit => unit.text), ['极限笔记', '左右极限'])
  assert.equal(headings[0]?.markdown, '# 极限笔记')

  const titled = valueOf(await context.service.importWebPage({
    url: 'https://example.org/x',
    title: '调用方标题',
    text: '正文段落内容。',
    fetchedAt: nowIso(),
  }))
  assert.equal(titled.document.title, '调用方标题')

  // 超过 200k 字符：截断并报告，不崩溃
  const hugeText = '正文内容。'.repeat(50_000)
  const truncated = valueOf(await context.service.importWebPage({
    url: 'https://example.com/huge',
    text: hugeText,
    fetchedAt: nowIso(),
  }))
  assert.equal(truncated.document.status, 'needs-review')
  assert.ok(truncated.revision.issues.some(issue => issue.code === 'truncated' && issue.reviewRequired))
  const totalChars = truncated.revision.units.reduce((sum, unit) => sum + unit.text.length, 0)
  assert.ok(totalChars <= WEB_TEXT_CAP + DEFAULT_LIMITS.maxUnitChars, `截断后字符数 ${totalChars}`)
})

test('网页来源的读取/变化检测/刷新语义：不误判缺文件、不走本地刷新', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importWebPage({
    url: 'https://example.com/lifecycle',
    html: '<html><body><h1>生命周期</h1><p>网页资料的生命周期语义。</p></body></html>',
    fetchedAt: nowIso(),
  })).document
  const stored = valueOf(await context.service.getDocument(document.id))
  assert.equal(stored.missing, undefined, '网页来源不应被标记为缺失文件')
  const detected = valueOf(await context.service.detectChange(document.id))
  assert.equal(detected.changed, false)
  assert.match(detected.effects.summary, /网页来源/)
  const refreshed = await context.service.refreshDocument(document.id)
  assert.equal(errorCode(refreshed), 'invalid-input')
  if (!refreshed.ok) assert.match(refreshed.error.message, /重新抓取/)
})

test('saveRevision：非本地 originalPath 不 crash，回退解析指纹并归一 unit revisionId', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const parsed = valueOf(await context.service.parseFile(samplePath('markdown/overfitting.md')))
  const document: SourceDocument = {
    id: newSourceId(),
    originalPath: '/definitely/not/a/local/file/notes.md',
    title: '离线解析资料',
    format: 'markdown',
    courseIds: [],
    addedAt: nowIso(),
    updatedAt: nowIso(),
    status: 'discovered',
    revisions: [],
  }
  const saved = valueOf(await context.service.saveRevision(document, parsed))
  assert.equal(saved.document.id, document.id)
  assert.match(saved.revision.fingerprint, /^sha256:parsed-/)
  assert.ok(saved.revision.units.length > 0)
  for (const unit of saved.revision.units) {
    assert.equal(unit.revisionId, saved.revision.id, 'unit.revisionId 应与修订一致')
  }
  const stored = valueOf(await context.service.getRevision(saved.document.id, saved.revision.id))
  assert.equal(stored.units.length, saved.revision.units.length)
  // 本地文件不存在：读取文档时不崩溃，只是标记 missing
  const read = valueOf(await context.service.getDocument(saved.document.id))
  assert.equal(read.missing, true)
})

test('纯函数辅助：URL 合成路径/域名/HTML 去壳', () => {
  assert.equal(webSyntheticPath('https://example.com/a'), 'web://https://example.com/a')
  assert.equal(domainOf('https://www.example.com/a/b'), 'example.com')
  assert.equal(domainOf('not a url'), '')
})

test('parseWebPage 直接调用（Host web-ingest 依赖的公开 seam）', async () => {
  const parsed = await parseWebPage({
    url: 'https://example.com/direct',
    html: '<html><head><title>直连</title></head><body><h1>直连</h1><p>直连解析正文内容。</p></body></html>',
    fetchedAt: nowIso(),
  }, DEFAULT_LIMITS)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.value.title, '直连')
  assert.equal(parsed.value.format, 'html')
  assert.ok(parsed.value.units.length >= 2)
  assert.match(parsed.value.contentHash, /^sha256:/)
  assert.equal(parsed.value.finalUrl, 'https://example.com/direct')
})
