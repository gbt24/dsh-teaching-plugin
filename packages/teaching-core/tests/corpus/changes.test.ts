/**
 * 资料变化检测与更新证据：mtime/大小/哈希判断、单元级 diff、
 * 受影响概念/活动（默认反查 + Host 注入 hook）、结构变化确认、缺文件与失败刷新。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, unlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestCorpus, samplePath, valueOf, errorCode, createConfirmedCourse } from './helpers.ts'
import type { SourceAnchor } from '../../src/contracts/source.ts'
import type { SourceId } from '../../src/contracts/ids.ts'

async function copySample(workDir: string, name: string, target = 'material.md'): Promise<string> {
  const targetPath = join(workDir, target)
  await writeFile(targetPath, await readFile(samplePath('markdown', name)))
  return targetPath
}

test('变化检测：未变 / 修改 / 仅 mtime / 缺文件', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-change-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  assert.ok(document.currentRevisionId !== undefined)

  // 1) 刚导入：未变化
  const unchanged = valueOf(await context.service.detectChange(document.id))
  assert.equal(unchanged.changed, false)
  assert.equal(unchanged.previousFingerprint, unchanged.currentFingerprint)
  assert.deepEqual(unchanged.effects.affectedConceptIds, [])

  // 2) 仅 mtime 变化、内容相同：不算内容变化，但刷新记录的元信息
  const future = new Date(Date.now() + 5_000)
  await utimes(materialPath, future, future)
  const touched = valueOf(await context.service.detectChange(document.id))
  assert.equal(touched.changed, false)
  assert.equal(touched.previousFingerprint, touched.currentFingerprint)
  const afterTouch = valueOf(await context.service.getDocument(document.id))
  assert.notEqual(afterTouch.mtimeMs, document.mtimeMs)

  // 3) 内容变化：changed=true，哈希不同
  const changedContent = '# 过拟合与正则化\n\n## 新章节\n\n正则化系数 lambda 是超参数。\n'
  await writeFile(materialPath, changedContent)
  const changed = valueOf(await context.service.detectChange(document.id))
  assert.equal(changed.changed, true)
  assert.notEqual(changed.currentFingerprint, changed.previousFingerprint)
  assert.ok(changed.currentFingerprint.startsWith('sha256:'))

  // 4) 缺文件：changed=true 且 currentFingerprint=missing，文档标记 missing
  await unlink(materialPath)
  const missing = valueOf(await context.service.detectChange(document.id))
  assert.equal(missing.changed, true)
  assert.equal(missing.currentFingerprint, 'missing')
  assert.match(missing.effects.summary, /不在记录的位置/)
  const documentAfterMissing = valueOf(await context.service.getDocument(document.id))
  assert.equal(documentAfterMissing.missing, true)
  // 恢复文件后刷新可以继续
  await writeFile(materialPath, '# 过拟合与泛化\n\n恢复后的内容。\n')
  const recovered = valueOf(await context.service.detectChange(document.id))
  assert.equal(recovered.changed, true)
  assert.equal(recovered.currentFingerprint.startsWith('sha256:'), true)
})

test('更新：单元 diff、受影响概念、结构变化确认与新修订', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-refresh-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  assert.ok(document.currentRevisionId !== undefined)
  const oldRevision = valueOf(await context.service.getRevision(document.id, document.currentRevisionId))
  // 概念引用一段会被修改的正文单元（章节标题未改动时，仅引用标题的概念不应被误报为受影响）
  const heading = oldRevision.units.find(unit => unit.kind === 'paragraph' && unit.text.includes('过拟合'))
  assert.ok(heading !== undefined)
  const anchor: SourceAnchor = {
    documentId: document.id,
    revisionId: oldRevision.id,
    unitId: heading.id,
    locator: heading.locator,
    excerpt: heading.text,
    confidence: heading.confidence,
    label: document.title,
  }
  const { course } = await createConfirmedCourse(context.courses, {
    title: '过拟合课程',
    conceptTitle: '过拟合',
    anchors: [anchor],
  })

  await writeFile(materialPath, [
    '# 过拟合与泛化',
    '',
    '## 观察指标（修订）',
    '',
    '训练误差与验证误差的间隙是判断过拟合的重要依据。',
    '',
    '### 新增小节',
    '',
    '正则化参数 lambda 控制惩罚强度。',
    '',
  ].join('\n'))
  const change = valueOf(await context.service.refreshDocument(document.id))
  assert.equal(change.changed, true)
  assert.notEqual(change.previousFingerprint, change.currentFingerprint)
  assert.match(change.effects.summary, /新增|删除|修改/)
  assert.ok(change.effects.affectedConceptIds.length > 0, '默认引用反查应找出受影响的课程概念')
  assert.equal(change.effects.needsConfirmation, true, '标题结构变化需要学生确认')
  assert.ok(change.effects.affectedActivityIds.length === 0, '未注入活动索引时不猜测活动')

  const refreshed = valueOf(await context.service.getDocument(document.id))
  assert.equal(refreshed.revisions.length, 2)
  assert.notEqual(refreshed.currentRevisionId, document.currentRevisionId)
  assert.ok(refreshed.currentRevisionId !== undefined)
  const newRevision = valueOf(await context.service.getRevision(document.id, refreshed.currentRevisionId))
  const newText = newRevision.units.map(unit => unit.text).join('\n')
  assert.match(newText, /新增小节/)
  assert.match(newText, /lambda/)
  // 旧修订仍可按历史 anchor 回解（证据不静默失效）
  const oldUnit = valueOf(await context.service.resolveAnchor(anchor))
  assert.equal(oldUnit.id, heading.id)
  // 再次检测：未变化
  const again = valueOf(await context.service.detectChange(document.id))
  assert.equal(again.changed, false)
  // 课程修订仍存在（不由 Corpus 自动改写；Host/教学层负责基于 effects 调整）
  const storedCourse = await context.courses.get(course.id)
  assert.ok(storedCourse?.activeRevisionId !== undefined)
})

test('更新：未变化时 refresh 不产生新修订', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-nochange-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  const result = valueOf(await context.service.refreshDocument(document.id))
  assert.equal(result.changed, false)
  const after = valueOf(await context.service.getDocument(document.id))
  assert.equal(after.revisions.length, 1)
})

test('更新失败：记录 failed 修订并保留旧修订历史', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-fail-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  // 用二进制垃圾覆盖（原扩展名仍是 .md，解析器会明确判定不是文本）
  await writeFile(materialPath, new Uint8Array([0, 1, 2, 3, 0, 0, 0, 5, 7, 0, 0, 9, 0, 0]))
  const change = valueOf(await context.service.refreshDocument(document.id))
  assert.equal(change.changed, true)
  assert.match(change.effects.summary, /更新失败/)
  assert.equal(change.effects.needsConfirmation, true)
  const after = valueOf(await context.service.getDocument(document.id))
  assert.equal(after.status, 'failed')
  assert.equal(after.revisions.length, 2)
  const lastRevision = after.revisions[after.revisions.length - 1]
  assert.equal(lastRevision?.status, 'failed')
  const issues = valueOf(await context.service.listIssues(document.id))
  assert.ok(issues.some(issue => issue.severity === 'error'))
})

test('缺文件后 refresh 返回 not-found 而不是崩溃', async t => {
  const context = await createTestCorpus()
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-gone-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  await unlink(materialPath)
  const result = await context.service.refreshDocument(document.id)
  assert.equal(errorCode(result), 'not-found')
})

test('Host 注入引用索引：受影响活动/概念精确到单元', async t => {
  const capturedUnitIds: string[][] = []
  const context = await createTestCorpus({
    references: {
      conceptsForDocument: () => ['concept-doc-level'],
      activitiesForDocument: () => ['activity-doc-level'],
      conceptsForUnits: (_documentId, unitIds) => {
        capturedUnitIds.push([...unitIds])
        return ['concept-unit-level']
      },
      activitiesForUnits: () => ['activity-unit-level'],
    },
  })
  const workDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-hooks-'))
  t.after(async () => {
    await context.cleanup()
    await rm(workDir, { recursive: true, force: true })
  })
  const materialPath = await copySample(workDir, 'overfitting.md')
  const document = valueOf(await context.service.importFile({ path: materialPath }))
  await writeFile(materialPath, '# 过拟合与泛化\n\n## 修订\n\n新的内容。\n')
  const detected = valueOf(await context.service.detectChange(document.id))
  assert.deepEqual(detected.effects.affectedConceptIds, ['concept-doc-level'])
  assert.deepEqual(detected.effects.affectedActivityIds, ['activity-doc-level'])
  const refreshed = valueOf(await context.service.refreshDocument(document.id))
  assert.deepEqual(refreshed.effects.affectedConceptIds, ['concept-unit-level'])
  assert.deepEqual(refreshed.effects.affectedActivityIds, ['activity-unit-level'])
  assert.ok(capturedUnitIds.length > 0)
  assert.ok((capturedUnitIds[0] ?? []).length > 0, '刷新时应把受影响单元 id 传给 Host 索引')
})

test('变化检测错误输入：不存在文档返回 not-found', async t => {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const result = await context.service.detectChange('src-not-exists' as SourceId)
  assert.equal(errorCode(result), 'not-found')
})
