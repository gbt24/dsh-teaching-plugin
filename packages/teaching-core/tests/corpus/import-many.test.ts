/**
 * 批量导入证据：进度回调顺序、单文件失败不中止、取消后的部分完成、
 * 重复导入幂等、课程挂接与 CourseRepository 兼容、已就绪课程不受其它导入影响。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { samplePath, createTestCorpus, createCourseRecord, valueOf } from './helpers.ts'

test('批量导入：进度回调 (done,total,current) 顺序与单文件失败不中止', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const progress: { done: number; total: number; current: string }[] = []
  const files = [
    samplePath('markdown/derivatives.md'),
    samplePath('anomalies/unknown.xyz'),
    samplePath('pdf/corrupt.pdf'),
    samplePath('text/limits-notes.txt'),
  ]
  const outcome = await context.service.importFiles(undefined, files.map(path => ({ path })), {
    onProgress: (done, total, current) => progress.push({ done, total, current }),
  })
  assert.equal(outcome.documents.length, 2)
  assert.equal(outcome.failures.length, 2)
  assert.ok(outcome.warnings.some(warning => warning.includes('导入失败')))
  assert.equal(progress.length, 5, '开头一次 + 每个文件完成一次')
  assert.deepEqual(progress[0], { done: 0, total: 4, current: files[0] })
  assert.deepEqual(progress.slice(1).map(item => item.done), [1, 2, 3, 4])
  assert.ok(progress.every(item => item.total === 4))
  assert.deepEqual(progress.slice(1).map(item => item.current), files)
})

test('批量导入取消：保留已完成资料并说明剩余数量', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourseRecord(context.courses, '取消测试')
  const controller = new AbortController()
  const progress: number[] = []
  const outcome = await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('code/derivative.py') },
  ], {
    signal: controller.signal,
    onProgress: done => {
      progress.push(done)
      if (done === 1) controller.abort()
    },
  })
  assert.equal(outcome.documents.length, 1, '取消后只保留已完成的文件')
  assert.ok(outcome.warnings.some(warning => warning.includes('导入已取消') && warning.includes('剩余')))
  assert.deepEqual(outcome.failures, [])
  const attached = await context.courses.listSources(course.id)
  assert.equal(attached.length, 1)
  // 已完成的资料可正常检索
  const search = valueOf(await context.service.search({ query: '导数', courseId: course.id }))
  assert.equal(search.empty, false)
})

test('重复导入幂等：同路径同内容不产生新修订', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const sourcePath = samplePath('markdown/overfitting.md')
  const first = valueOf(await context.service.importFile({ path: sourcePath }))
  const second = valueOf(await context.service.importFile({ path: sourcePath }))
  assert.equal(second.id, first.id)
  assert.equal(second.revisions.length, 1)
  assert.equal(second.currentRevisionId, first.currentRevisionId)
  const batch = await context.service.importFiles(undefined, [{ path: sourcePath }])
  assert.equal(batch.documents.length, 1)
  assert.equal(batch.documents[0]?.revisions.length, 1)
  assert.equal(batch.failures.length, 0)
})

test('课程挂接：importFile/importFiles 与 CourseRepository.listSources 兼容', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const courseA = await createCourseRecord(context.courses, '课程 A')
  const courseB = await createCourseRecord(context.courses, '课程 B')
  const first = valueOf(await context.service.importFile({
    path: samplePath('markdown/derivatives.md'),
    courseId: courseA.id,
  }))
  assert.deepEqual(first.courseIds, [courseA.id])
  const sourcesA = await context.courses.listSources(courseA.id)
  assert.equal(sourcesA.length, 1)
  assert.equal(sourcesA[0]?.id, first.id)
  // 同一文件挂到第二门课程：不重复创建文档/修订
  const reattachOutcome = await context.service.importFiles(courseB.id, [
    { path: samplePath('markdown/derivatives.md') },
  ])
  const reattached = reattachOutcome.documents[0]
  assert.ok(reattached !== undefined)
  assert.equal(reattached.id, first.id)
  assert.equal(reattached.revisions.length, 1)
  assert.deepEqual([...reattached.courseIds].sort(), [courseA.id, courseB.id].sort())
  assert.equal((await context.courses.listSources(courseB.id)).length, 1)
  // 多文档批量挂接
  const batch = await context.service.importFiles(courseA.id, [
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('code/derivative.py') },
  ])
  assert.equal(batch.documents.length, 2)
  const sourcesAAfter = await context.courses.listSources(courseA.id)
  assert.equal(sourcesAAfter.length, 3)
})

test('已就绪课程不受其它课程导入/失败影响', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const readyCourse = await createCourseRecord(context.courses, '已就绪课程')
  const busyCourse = await createCourseRecord(context.courses, '导入中的课程')
  const readyDocument = valueOf(await context.service.importFile({
    path: samplePath('markdown/derivatives.md'),
    courseId: readyCourse.id,
  }))
  const outcome = await context.service.importFiles(busyCourse.id, [
    { path: samplePath('pdf/corrupt.pdf') },
    { path: samplePath('pptx/derivative-slides.pptx') },
  ])
  assert.equal(outcome.failures.length, 1)
  assert.equal(outcome.documents.length, 1)
  // 已就绪课程仍可读、可检索
  const readBack = valueOf(await context.service.getDocument(readyDocument.id))
  assert.equal(readBack.status, 'ready')
  const search = valueOf(await context.service.search({ query: '导数', courseId: readyCourse.id }))
  assert.equal(search.empty, false)
  const issues = valueOf(await context.service.listIssues(readyDocument.id))
  assert.ok(issues.every(issue => issue.severity !== 'error'))
})

test('空批次：不报错、不产生文档', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const calls: number[] = []
  const outcome = await context.service.importFiles(undefined, [], { onProgress: done => calls.push(done) })
  assert.deepEqual(outcome.documents, [])
  assert.deepEqual(outcome.failures, [])
  assert.deepEqual(calls, [0])
})
