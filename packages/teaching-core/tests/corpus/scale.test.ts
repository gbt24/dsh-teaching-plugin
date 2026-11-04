/**
 * 规模与耗时测量：60 份资料批量导入（进度/增量/独立 JSON）、万级行文本分页读取、
 * 检索与二次导入耗时。断言保持宽松，只保证行为正确；耗时通过 t.diagnostic 报告，
 * 供 docs/evidence/T02.md 记录实测数字。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestCorpus, createCourseRecord, valueOf } from './helpers.ts'

async function writeGeneratedCorpus(workDir: string, fileCount: number): Promise<string[]> {
  const paths: string[] = []
  for (let index = 0; index < fileCount; index += 1) {
    const path = join(workDir, `lecture-${String(index).padStart(3, '0')}.md`)
    const lines = [
      `# 第 ${index} 讲：导数与变化率`,
      '',
      `本讲属于主题 ${index % 7}，讨论导数的定义与计算。唯一标记 zz-${index}。`,
      '',
      '## 公式',
      '',
      '$$',
      "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}",
      '$$',
      '',
      '## 代码',
      '',
      '```python',
      'def rate(f, x, h=1e-6):',
      '    return (f(x + h) - f(x - h)) / (2 * h)',
      '```',
      '',
      `关键字：导数 derivative 第${index}讲 主题${index % 7}`,
    ]
    await writeFile(path, lines.join('\n'))
    paths.push(path)
  }
  return paths
}

test('规模：60 份资料批量导入、进度、增量与独立 JSON 布局', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-scale-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const course = await createCourseRecord(context.courses, '规模课程')
  const fileCount = 60
  const paths = await writeGeneratedCorpus(workDir, fileCount)
  let progressCalls = 0
  const importStarted = performance.now()
  const outcome = await context.service.importFiles(
    course.id,
    paths.map(path => ({ path })),
    { onProgress: done => { progressCalls = done } },
  )
  const importMs = performance.now() - importStarted
  t.diagnostic(`导入 ${fileCount} 份 Markdown 耗时 ${importMs.toFixed(0)}ms（${(importMs / fileCount).toFixed(1)}ms/份）`)
  assert.equal(outcome.documents.length, fileCount)
  assert.equal(outcome.failures.length, 0)
  assert.equal(progressCalls, fileCount)
  assert.ok(importMs < 60_000, '60 份小资料导入不应超过 60s')

  // 独立 JSON 布局：每份资料一个记录 + 修订文件；无全库大文件
  const sourceFiles = (await readdir(join(context.state.dataDir, 'sources'))).filter(name => name.endsWith('.json'))
  assert.equal(sourceFiles.length, fileCount)
  const catalogSize = (await stat(join(context.state.dataDir, 'cache', 'corpus-catalog.json'))).size
  t.diagnostic(`sources 记录文件 ${sourceFiles.length} 个；目录缓存 ${(catalogSize / 1024).toFixed(1)}KB`)
  assert.ok(catalogSize < 512 * 1024, '目录缓存应保持轻量')

  // 检索：唯一标记定位到具体文件，普通中文词命中多份
  const searchStarted = performance.now()
  const unique = valueOf(await context.service.search({ query: 'zz-42', courseId: course.id }))
  const uniqueMs = performance.now() - searchStarted
  t.diagnostic(`唯一标记检索 ${uniqueMs.toFixed(1)}ms`)
  assert.equal(unique.empty, false)
  assert.ok(unique.hits.some(hit => hit.documentTitle.includes('lecture-042')))
  const broadStarted = performance.now()
  const broad = valueOf(await context.service.search({ query: '导数 derivative', courseId: course.id, limit: 10 }))
  const broadMs = performance.now() - broadStarted
  t.diagnostic(`跨 60 份资料检索 ${broadMs.toFixed(1)}ms，命中 ${broad.hits.length}`)
  assert.ok(broad.hits.length > 1)
  assert.ok(broadMs < 10_000, '跨课程检索不应超过 10s')

  // 二次导入：同内容从哈希短路，不产生新修订
  const againStarted = performance.now()
  const again = await context.service.importFiles(course.id, paths.map(path => ({ path })))
  const againMs = performance.now() - againStarted
  t.diagnostic(`二次导入（幂等跳过）耗时 ${againMs.toFixed(0)}ms`)
  assert.equal(again.documents.length, fileCount)
  assert.equal(again.failures.length, 0)
  const sampleDocument = again.documents[20]
  assert.ok(sampleDocument !== undefined)
  assert.equal(sampleDocument.revisions.length, 1, '重复导入不应新增修订')
})

test('规模：万行级文本分页读取与截断上限', async t => {
  const context = await createTestCorpus({ limits: { maxUnits: 5_000, maxUnitChars: 4_000 } })
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-bigtext-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const path = join(workDir, 'big-notes.txt')
  const lines: string[] = []
  for (let index = 0; index < 12_000; index += 1) {
    lines.push(`第${index}行：导数的定义、连续性与极限的说明，用于规模测试。`)
    if (index % 10 === 0) lines.push('')
  }
  await writeFile(path, lines.join('\n'))
  const started = performance.now()
  const document = valueOf(await context.service.importFile({ path }))
  const importMs = performance.now() - started
  t.diagnostic(`12,000 行纯文本导入耗时 ${importMs.toFixed(0)}ms`)
  assert.equal(document.format, 'text')
  assert.ok(document.currentRevisionId !== undefined)
  const total = valueOf(await context.service.readUnits(document.id, 0, 1))
  t.diagnostic(`抽取单元总数 ${total.total}`)
  assert.ok(total.total > 100, '长文本应产生多个段落单元，便于分页与按需加载')
  const page = valueOf(await context.service.readUnits(document.id, 100, 20))
  assert.equal(page.units.length, Math.min(20, total.total - 100))
  assert.equal(page.total, total.total)
  const tail = valueOf(await context.service.readUnits(document.id, total.total - 3, 10))
  assert.equal(tail.units.length, 3)
})
