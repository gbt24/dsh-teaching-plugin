/**
 * 检索证据：中英文与公式/代码检索、过滤、空结果、持久化索引与损坏缓存重建。
 *
 * 断言命中来自真实导入的样例，不使用手工索引数据；空结果必须 empty=true。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceId } from '../../src/contracts/ids.ts'
import { samplePath, createTestCorpus, createCourseRecord, serviceSharing, valueOf } from './helpers.ts'

test('中英文检索：命中、matchedTerms 与可回解 anchor', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '微积分')
  const imported = await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('code/derivative.py') },
    { path: samplePath('notebook/derivative-lab.ipynb') },
  ])
  assert.equal(imported.documents.length, 4)

  const chinese = valueOf(await context.service.search({ query: '导数', courseId: course.id, limit: 5 }))
  assert.equal(chinese.empty, false)
  assert.ok(chinese.hits.length > 0)
  for (const hit of chinese.hits) {
    assert.ok(hit.matchedTerms.includes('导数'), `matchedTerms 应解释命中原因：${hit.matchedTerms.join(',')}`)
    assert.ok(hit.anchor.locator !== undefined)
    assert.ok(hit.anchor.excerpt.length > 0)
    assert.ok(hit.score > 0)
    const resolved = valueOf(await context.service.resolveAnchor(hit.anchor))
    assert.equal(resolved.id, hit.anchor.unitId)
  }

  const english = valueOf(await context.service.search({ query: 'derivative', limit: 5 }))
  assert.equal(english.empty, false)
  const plural = valueOf(await context.service.search({ query: 'derivatives', limit: 5 }))
  assert.equal(plural.empty, false, '英文词干化应让 derivatives 命中 derivative')

  const codeSearch = valueOf(await context.service.search({ query: 'numeric_derivative', limit: 5 }))
  assert.equal(codeSearch.empty, false)
  const codeKinds = new Set<string>()
  for (const hit of codeSearch.hits) {
    const unit = valueOf(await context.service.resolveAnchor(hit.anchor))
    codeKinds.add(unit.kind)
  }
  assert.ok(codeKinds.has('code'), `代码文本应可检索，实际 kinds=${[...codeKinds].join(',')}`)

  const formula = valueOf(await context.service.search({ query: 'epsilon delta', limit: 5 }))
  assert.equal(formula.empty, false, '公式/文本内容应可检索')

  const chineseBigram = valueOf(await context.service.search({ query: '过拟合', limit: 5 }))
  assert.equal(chineseBigram.empty, true, '本课程未导入过拟合资料，不能编造命中')

  // 空结果语义
  const missing = valueOf(await context.service.search({ query: 'zzzzqqq' }))
  assert.equal(missing.empty, true)
  assert.deepEqual(missing.hits, [])
  const blank = valueOf(await context.service.search({ query: '   ' }))
  assert.equal(blank.empty, true)
})

test('检索过滤：kinds / documentIds / courseId / alsoCourseIds / limit', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const courseA = await createCourseRecord(context.courses, '课程 A')
  const courseB = await createCourseRecord(context.courses, '课程 B')
  const importedA = await context.service.importFiles(courseA.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('docx/derivative-lecture.docx') },
  ])
  const importedB = await context.service.importFiles(courseB.id, [
    { path: samplePath('pptx/derivative-slides.pptx') },
    { path: samplePath('pdf/derivative-rules.pdf') },
  ])
  const courseADocs = new Set(importedA.documents.map(document => document.id as string))
  const courseBDocs = new Set(importedB.documents.map(document => document.id as string))

  const inCourseA = valueOf(await context.service.search({ query: '导数 derivative', courseId: courseA.id, limit: 20 }))
  assert.equal(inCourseA.empty, false)
  assert.ok(inCourseA.hits.every(hit => courseADocs.has(hit.anchor.documentId as string)))
  assert.ok(inCourseA.hits.some(hit => hit.anchor.documentId === importedA.documents[0]?.id))

  const inCourseB = valueOf(await context.service.search({ query: '导数 derivative', courseId: courseB.id, limit: 20 }))
  assert.ok(inCourseB.hits.every(hit => courseBDocs.has(hit.anchor.documentId as string)))

  const cross = valueOf(await context.service.search({
    query: '导数 derivative',
    courseId: courseB.id,
    alsoCourseIds: [courseA.id],
    limit: 20,
  }))
  assert.ok(cross.hits.some(hit => hit.anchor.documentId === importedA.documents[0]?.id), '跨课程检索应包含关联课程')

  const onlyDoc = importedA.documents[0] as { id: SourceId }
  const filteredDoc = valueOf(await context.service.search({
    query: '导数 derivative',
    documentIds: [onlyDoc.id],
    limit: 20,
  }))
  assert.equal(filteredDoc.empty, false)
  assert.ok(filteredDoc.hits.every(hit => hit.anchor.documentId === onlyDoc.id))

  const formulaOnly = valueOf(await context.service.search({ query: '导数', kinds: ['formula'], limit: 20 }))
  for (const hit of formulaOnly.hits) {
    const unit = valueOf(await context.service.resolveAnchor(hit.anchor))
    assert.equal(unit.kind, 'formula')
  }
  const codeOnlyEmpty = valueOf(await context.service.search({ query: 'epsilon', kinds: ['code'], limit: 20 }))
  assert.equal(codeOnlyEmpty.empty, true)

  const limited = valueOf(await context.service.search({ query: 'derivative', limit: 1 }))
  assert.ok(limited.hits.length <= 1)

  const unknownCourse = valueOf(await context.service.search({ query: '导数', courseId: 'course-missing' as never }))
  assert.equal(unknownCourse.empty, true)
})

test('索引持久化：新服务实例可复用、缓存损坏可重建', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '持久化')
  const document = valueOf(await context.service.importFile({
    path: samplePath('markdown/derivatives.md'),
    courseId: course.id,
  }))
  assert.ok(document.currentRevisionId !== undefined)
  const indexRelative = join('sources', document.id, 'search', `${document.currentRevisionId}.json`)
  const { access } = await import('node:fs/promises')
  await access(join(context.state.dataDir, indexRelative))

  // 新 service（内存缓存为空）仍能检索：说明索引/单元来自磁盘
  const fresh = serviceSharing(context)
  const fromDisk = valueOf(await fresh.search({ query: '切线', limit: 3 }))
  assert.equal(fromDisk.empty, false)

  // 删除索引缓存后仍能检索（从单元重建）
  await rm(join(context.state.dataDir, 'sources', document.id, 'search'), { recursive: true, force: true })
  const rebuiltService = serviceSharing(context)
  const rebuilt = valueOf(await rebuiltService.search({ query: '切线', limit: 3 }))
  assert.equal(rebuilt.empty, false)
  await access(join(context.state.dataDir, indexRelative))
})

test('中文查询：CJK 二元组精度与单字查询', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '中文')
  await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('markdown/overfitting.md') },
  ])
  const overfit = valueOf(await context.service.search({ query: '过拟合', courseId: course.id, limit: 5 }))
  assert.equal(overfit.empty, false)
  assert.ok(overfit.hits.every(hit => hit.documentTitle.includes('overfitting') || hit.anchor.excerpt.includes('过拟合')))
  const singleChar = valueOf(await context.service.search({ query: '导', courseId: course.id, limit: 5 }))
  assert.equal(singleChar.empty, false)
  const unrelated = valueOf(await context.service.search({ query: '量子力学', courseId: course.id, limit: 5 }))
  assert.equal(unrelated.empty, true)
})

test('检索上限与默认条数', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '上限')
  await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('docx/derivative-lecture.docx') },
  ])
  const defaulted = valueOf(await context.service.search({ query: '导数' }))
  assert.ok(defaulted.hits.length <= 10)
  const huge = valueOf(await context.service.search({ query: '导数', limit: 1000 }))
  assert.ok(huge.hits.length <= 100)
})
