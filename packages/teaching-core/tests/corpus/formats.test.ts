/**
 * 逐格式导入证据：Markdown / 文本 / 文字 PDF / 扫描 PDF / 图片 / Word / PPT /
 * 代码 / Notebook / HTML，以及损坏文件、未知扩展、缺失插图、超长文本、OCR 关闭等异常。
 *
 * 断言基于公开 seam 的返回值与磁盘派生资产，不依赖解析器内部函数。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { DEFAULT_LIMITS, resolveOcrRuntime } from '../../src/corpus/index.ts'
import type { SourceRevision, SourceUnit } from '../../src/contracts/source.ts'
import type { SourceId, SourceRevisionId } from '../../src/contracts/ids.ts'
import type { CorpusServiceApi } from '../../src/corpus/index.ts'
import {
  createTestCorpus, samplePath, valueOf, errorCode, type CorpusTestContext,
} from './helpers.ts'

function kindsOf(revision: SourceRevision): Set<SourceUnit['kind']> {
  return new Set(revision.units.map(unit => unit.kind))
}

async function revisionOf(
  service: CorpusServiceApi,
  documentId: SourceId,
  revisionId?: SourceRevisionId,
): Promise<SourceRevision> {
  assert.ok(revisionId !== undefined, '文档应当有当前修订')
  return valueOf(await service.getRevision(documentId, revisionId))
}

async function assetExists(context: CorpusTestContext, documentId: string, revisionId: string, assetPath: string): Promise<boolean> {
  try {
    await access(join(context.state.dataDir, 'sources', documentId, 'assets', revisionId, assetPath))
    return true
  } catch {
    return false
  }
}

test('Markdown：结构/公式/代码/表格/图片单元、定位与原文回解', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const sourcePath = samplePath('markdown/derivatives.md')
  const beforeBytes = await readFile(sourcePath)
  const beforeStat = await stat(sourcePath)
  const document = valueOf(await context.service.importFile({ path: sourcePath }))
  assert.equal(document.format, 'markdown')
  assert.equal(document.status, 'ready')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  const kinds = kindsOf(revision)
  for (const kind of ['heading', 'paragraph', 'formula', 'figure', 'list', 'code', 'table'] as const) {
    assert.ok(kinds.has(kind), `Markdown 应包含 ${kind} 单元，实际：${[...kinds].join(',')}`)
  }
  const formula = revision.units.find(unit => unit.kind === 'formula')
  assert.ok(formula !== undefined)
  assert.match(formula.text, /\\lim|f'|\\frac/)
  const code = revision.units.find(unit => unit.kind === 'code')
  assert.ok(code !== undefined)
  assert.match(code.text, /numeric_derivative/)
  assert.ok(code.notes?.some(note => note.includes('python')), '代码单元应保留语言')
  assert.ok(code.locator.lines !== undefined, '代码单元应带行号定位')
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined)
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
  const table = revision.units.find(unit => unit.kind === 'table')
  assert.ok(table !== undefined)
  assert.match(table.text, /English/)
  const heading = revision.units.find(unit => unit.kind === 'heading' && unit.text.includes('直观定义'))
  assert.ok(heading?.locator.sectionPath?.includes('直观定义'))

  // 原文回解：anchor → 单元
  const anchor = {
    documentId: document.id,
    revisionId: revision.id,
    unitId: formula.id,
    locator: formula.locator,
    excerpt: formula.text,
    confidence: formula.confidence,
    label: document.title,
  }
  const resolved = valueOf(await context.service.resolveAnchor(anchor))
  assert.equal(resolved.id, formula.id)
  assert.match(resolved.text, /\\lim/)

  // 分页读取
  const page = valueOf(await context.service.readUnits(document.id, 2, 3))
  assert.equal(page.total, revision.units.length)
  assert.deepEqual(page.units.map(unit => unit.id), revision.units.slice(2, 5).map(unit => unit.id))
  const overflow = valueOf(await context.service.readUnits(document.id, revision.units.length + 5, 10))
  assert.equal(overflow.units.length, 0)
  assert.equal(overflow.total, revision.units.length)

  // 原文件只读
  const afterBytes = await readFile(sourcePath)
  assert.equal(createHash('sha256').update(afterBytes).digest('hex'), createHash('sha256').update(beforeBytes).digest('hex'))
  assert.equal((await stat(sourcePath)).mtimeMs, beforeStat.mtimeMs)
})

test('纯文本：段落/行定位与公式启发式', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('text/limits-notes.txt') }))
  assert.equal(document.format, 'text')
  assert.equal(document.status, 'ready')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.ok(revision.units.length >= 4)
  for (const unit of revision.units) {
    assert.ok(unit.locator.lines !== undefined, '文本单元应有行定位')
    assert.ok(unit.locator.chars !== undefined, '文本单元应有字符定位')
  }
  assert.ok(revision.units.some(unit => unit.text.includes('epsilon')))
  const formula = revision.units.find(unit => unit.kind === 'formula')
  assert.ok(formula !== undefined, '含公式符号的行应标记为 formula')
})

test('文字型 PDF：页码/bbox 定位与文本抽取', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('pdf/derivative-rules.pdf') }))
  assert.equal(document.format, 'pdf')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.equal(revision.extent?.kind, 'pages')
  assert.ok(revision.units.length > 0)
  const allText = revision.units.map(unit => unit.text).join('\n')
  assert.match(allText, /derivative|Derivative/)
  for (const unit of revision.units) {
    assert.equal(unit.locator.page, 1)
    assert.ok(unit.locator.bbox !== undefined, 'PDF 文本单元应带页面 bbox')
    assert.equal(unit.confidence, 'high')
  }
})

test('扫描 PDF：OCR 或显式扫描无文字问题（不崩溃）', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const ocr = await resolveOcrRuntime({}, DEFAULT_LIMITS)
  const document = valueOf(await context.service.importFile({ path: samplePath('pdf/scanned-notes.pdf') }))
  assert.equal(document.format, 'pdf')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.ok(revision.units.length > 0, '扫描 PDF 至少应有图页资产或 OCR 文本')
  assert.ok(revision.units.some(unit => unit.kind === 'figure'), '扫描页应保留页面图资产')
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined)
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
  if (ocr.available) {
    assert.ok(revision.units.some(unit => unit.kind === 'paragraph'), 'OCR 应产出文字单元')
    assert.ok(revision.units.some(unit => unit.locator.page === 1))
    assert.equal(document.status, 'needs-review', '扫描公式/低置信度应进入待核对')
    assert.ok(revision.issues.some(issue => issue.reviewRequired), '应有 reviewRequired 问题')
  } else {
    assert.ok(revision.issues.some(issue => issue.code === 'scan-no-text' && issue.reviewRequired))
  }
})

test('图片：原图资产 + OCR 文字/低置信度问题', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const ocr = await resolveOcrRuntime({}, DEFAULT_LIMITS)
  const document = valueOf(await context.service.importFile({ path: samplePath('image/scanned-notes.png') }))
  assert.equal(document.format, 'image')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined)
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
  if (ocr.available) {
    assert.ok(revision.units.length > 1)
    assert.ok(revision.units.some(unit => unit.locator.bbox !== undefined), 'OCR 单元应带 bbox')
    assert.equal(document.status, 'needs-review')
    assert.ok(revision.issues.some(issue => issue.code === 'formula-uncertain' && issue.reviewRequired))
  } else {
    assert.ok(revision.issues.some(issue => issue.code === 'unsupported-content' && issue.reviewRequired))
  }
})

test('Word(.docx)：标题层级/公式/表格/图片与字符定位', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('docx/derivative-lecture.docx') }))
  assert.equal(document.format, 'docx')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  const kinds = kindsOf(revision)
  for (const kind of ['heading', 'paragraph', 'formula', 'table', 'figure'] as const) {
    assert.ok(kinds.has(kind), `Word 应包含 ${kind} 单元`)
  }
  const heading = revision.units.find(unit => unit.kind === 'heading' && unit.text.includes('导数讲义'))
  assert.ok(heading?.locator.sectionPath?.includes('导数讲义：从定义到应用'))
  const table = revision.units.find(unit => unit.kind === 'table')
  assert.match(table?.text ?? '', /English/)
  assert.match(revision.units.filter(unit => unit.kind === 'paragraph').map(unit => unit.text).join('\n'), /导数/)
  const formula = revision.units.find(unit => unit.kind === 'formula')
  assert.ok(formula !== undefined, 'Word OMML 公式应产出 formula 单元')
  assert.ok(revision.units.every(unit => unit.locator.chars !== undefined), 'Office 单元应带字符定位')
  assert.ok(revision.units.some(unit => unit.notes?.some(note => note.includes('Word 第'))), '应保留段落序号说明')
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined)
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
})

test('PowerPoint(.pptx)：幻灯片定位/表格/图片/备注', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('pptx/derivative-slides.pptx') }))
  assert.equal(document.format, 'pptx')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.equal(revision.extent?.kind, 'slides')
  assert.equal(revision.extent?.count, 3)
  const slideNumbers = new Set(revision.units.map(unit => unit.locator.slide))
  assert.ok(slideNumbers.has(1) && slideNumbers.has(2) && slideNumbers.has(3))
  const kinds = kindsOf(revision)
  for (const kind of ['heading', 'table', 'figure', 'note'] as const) {
    assert.ok(kinds.has(kind), `PPT 应包含 ${kind} 单元`)
  }
  const table = revision.units.find(unit => unit.kind === 'table')
  assert.match(table?.text ?? '', /derivative/)
  const notes = revision.units.find(unit => unit.kind === 'note')
  assert.ok(notes?.notes?.some(note => note.includes('演讲者备注')))
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined)
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
})

test('代码：语言与行号定位、可检索内容', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('code/derivative.py') }))
  assert.equal(document.format, 'code')
  assert.equal(document.detail, 'python')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.ok(revision.units.length >= 1)
  for (const unit of revision.units) {
    assert.equal(unit.kind, 'code')
    assert.ok(unit.locator.lines !== undefined, '代码单元应带行号')
    assert.ok(unit.notes?.some(note => note.includes('python')))
  }
  assert.match(revision.units.map(unit => unit.text).join('\n'), /numeric_derivative/)
  const scheme = valueOf(await context.service.importFile({ path: samplePath('code/derivative.scm') }))
  assert.equal(scheme.detail, 'scheme')
})

test('Notebook：cell 定位、代码语言、图像输出与文本输出', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('notebook/derivative-lab.ipynb') }))
  assert.equal(document.format, 'notebook')
  assert.equal(document.detail, 'python')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  assert.equal(revision.extent?.kind, 'cells')
  assert.ok(revision.units.every(unit => typeof unit.locator.cell === 'number'))
  const code = revision.units.find(unit => unit.kind === 'code')
  assert.ok(code?.notes?.some(note => note.includes('python')))
  assert.match(revision.units.filter(unit => unit.kind === 'note').map(unit => unit.text).join('\n'), /数值导数结果/)
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure?.assetPath !== undefined, 'Notebook 图像输出应保存为资产')
  assert.ok(await assetExists(context, document.id, revision.id, figure.assetPath))
  assert.ok(revision.units.some(unit => unit.kind === 'formula'), 'Markdown 单元格中的 TeX 公式应保留')
})

test('HTML：标题/公式/代码/表格/本地图片与外链图片问题', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('html/limits.html') }))
  assert.equal(document.format, 'html')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  const allText = revision.units.map(unit => unit.text).join('\n')
  assert.match(allText, /极限与连续/)
  const formula = revision.units.find(unit => unit.kind === 'formula')
  assert.ok(formula !== undefined, 'HTML TeX 公式应产出 formula 单元')
  assert.match(formula.text, /\\forall|\\epsilon/)
  assert.match(revision.units.filter(unit => unit.kind === 'code').map(unit => unit.text).join('\n'), /is_continuous/)
  const table = revision.units.find(unit => unit.kind === 'table')
  assert.match(table?.text ?? '', /English/)
  const figures = revision.units.filter(unit => unit.kind === 'figure')
  assert.ok(figures.some(unit => unit.assetPath !== undefined), '本地图片应保存资产')
  assert.ok(figures.some(unit => unit.notes?.some(note => note.includes('外链图片'))), '外链图片应显式说明未下载')
  const externalIssue = revision.issues.find(issue => issue.code === 'unsupported-content')
  assert.ok(externalIssue !== undefined)
  assert.equal(externalIssue.reviewRequired, false)
  assert.equal(document.status, 'ready')
})

test('异常：未知扩展名 / 损坏 PDF / 缺失插图', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const unknown = await context.service.importFile({ path: samplePath('anomalies/unknown.xyz') })
  assert.equal(errorCode(unknown), 'invalid-input')
  assert.equal(unknown.ok, false)
  if (!unknown.ok) assert.equal(unknown.error.cause, 'unsupported-format')

  const corrupt = await context.service.importFile({ path: samplePath('pdf/corrupt.pdf') })
  assert.equal(errorCode(corrupt), 'failed')

  const missingImage = valueOf(await context.service.importFile({ path: samplePath('anomalies/missing-image.md') }))
  const revision = await revisionOf(context.service, missingImage.id, missingImage.currentRevisionId)
  const figure = revision.units.find(unit => unit.kind === 'figure')
  assert.ok(figure !== undefined)
  assert.ok(figure.notes?.some(note => note.includes('缺失')))
  const issue = revision.issues.find(item => item.code === 'figure-unreadable')
  assert.ok(issue !== undefined)
  assert.equal(issue.reviewRequired, true)
  assert.equal(missingImage.status, 'needs-review')
  // 其余正文仍然可读
  assert.ok(revision.units.some(unit => unit.text.includes('缺失插图样例')))
})

test('异常：超长文本按上限截断并进入待核对', async t => {
  const context = await createTestCorpus({ limits: { maxTextChars: 20_000, maxUnits: 5_000 } })
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('anomalies/long-text.txt') }))
  assert.equal(document.format, 'text')
  assert.equal(document.status, 'needs-review')
  const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
  const truncated = revision.issues.find(issue => issue.code === 'truncated')
  assert.ok(truncated !== undefined, '超过上限应报告 truncated')
  assert.equal(truncated.reviewRequired, true)
  const totalChars = revision.units.reduce((sum, unit) => sum + unit.text.length, 0)
  assert.ok(totalChars <= 20_000 + DEFAULT_LIMITS.maxUnitChars, `截断后字符数 ${totalChars} 应接近上限`)
  assert.ok(revision.unitCount < 5_000)
})

test('异常：OCR 关闭时图片/扫描 PDF 返回可报告状态而不崩溃', async t => {
  const context = await createTestCorpus({ ocr: { enabled: false } })
  t.after(async () => await context.cleanup())
  const image = valueOf(await context.service.importFile({ path: samplePath('image/scanned-notes.png') }))
  const imageRevision = await revisionOf(context.service, image.id, image.currentRevisionId)
  assert.equal(image.status, 'needs-review')
  assert.ok(imageRevision.issues.some(issue => issue.code === 'unsupported-content' && issue.reviewRequired))
  assert.ok(imageRevision.units.some(unit => unit.kind === 'figure'))

  const pdf = valueOf(await context.service.importFile({ path: samplePath('pdf/scanned-notes.pdf') }))
  const pdfRevision = await revisionOf(context.service, pdf.id, pdf.currentRevisionId)
  assert.ok(pdfRevision.issues.some(issue => issue.code === 'scan-no-text' && issue.reviewRequired))
  assert.equal(pdf.status, 'needs-review')
})

test('异常：损坏 PDF 不影响同批其它文件导入', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const outcome = await context.service.importFiles(undefined, [
    { path: samplePath('markdown/overfitting.md') },
    { path: samplePath('pdf/corrupt.pdf') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('anomalies/unknown.xyz') },
  ])
  assert.equal(outcome.documents.length, 2)
  assert.equal(outcome.failures.length, 2)
  assert.ok(outcome.warnings.length > 0)
  assert.deepEqual(outcome.failures.map(failure => failure.error.code).sort(), ['failed', 'invalid-input'])
  for (const document of outcome.documents) {
    const revision = await revisionOf(context.service, document.id, document.currentRevisionId)
    assert.ok(revision.units.length > 0)
  }
})

test('导入不写入 ~/.dsh 或用户目录：全部派生数据在临时 dataDir 内', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const document = valueOf(await context.service.importFile({ path: samplePath('markdown/overfitting.md') }))
  assert.ok(document.originalPath.startsWith(process.cwd()) || document.originalPath.startsWith('/'))
  const sourceDir = join(context.state.dataDir, 'sources')
  const files = await stat(join(sourceDir, `${document.id}.json`))
  assert.ok(files.isFile())
  const revisionFiles = await stat(join(sourceDir, document.id, 'revisions', `${document.currentRevisionId}.units.json`))
  assert.ok(revisionFiles.isFile())
  const catalog = await stat(join(context.state.dataDir, 'cache', 'corpus-catalog.json'))
  assert.ok(catalog.isFile())
})

test('parseFile：不持久化的内存解析结果', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const parsed = valueOf(await context.service.parseFile(samplePath('markdown/derivatives.md')))
  assert.equal(parsed.format, 'markdown')
  assert.ok(parsed.units.length > 0)
  assert.equal(parsed.units[0]?.revisionId.startsWith('srev-'), true)
  // 未持久化：sources 目录下没有文档记录
  const { readdir } = await import('node:fs/promises')
  const files = await readdir(join(context.state.dataDir, 'sources'))
  assert.deepEqual(files, [])
  const withHint = await context.service.parseFile(samplePath('anomalies/unknown.xyz'))
  assert.equal(errorCode(withHint), 'invalid-input')
})
