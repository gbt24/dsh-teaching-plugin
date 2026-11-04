/**
 * 课程草案证据：有效 JSON 持久化为 draft 修订、解析失败一次修复、
 * 修复失败返回 uncertain、无效 anchor 不伪造、模型取消/缺失、coverage 数据。
 *
 * 模型通过 ScriptedModelClient 注入，真实模型调用由 Host adapter 提供。
 */
import test from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import { courseId as newCourseId, nowIso } from '../../src/contracts/ids.ts'
import type { CourseId, SourceId } from '../../src/contracts/ids.ts'
import type { Course } from '../../src/contracts/course.ts'
import type { SourceDocument, SourceRevision } from '../../src/contracts/source.ts'
import type { CourseRepository } from '../../src/storage/repositories.ts'
import { samplePath, createTestCorpus, serviceSharing, valueOf, errorCode } from './helpers.ts'

interface Material {
  readonly courseId: CourseId
  readonly document: SourceDocument
  readonly revision: SourceRevision
}

async function createCourse(courses: CourseRepository, title = '微积分'): Promise<Course> {
  const timestamp = nowIso()
  return await courses.save({
    id: newCourseId(),
    title,
    description: '',
    subjectTags: [],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

async function setupMaterial(t: TestContext): Promise<Awaited<ReturnType<typeof createTestCorpus>> & Material> {
  const context = await createTestCorpus()
  t.after(async () => await context.cleanup())
  const course = await createCourse(context.courses)
  const document = valueOf(await context.service.importFile({
    path: samplePath('markdown/derivatives.md'),
    courseId: course.id,
  }))
  assert.ok(document.currentRevisionId !== undefined)
  const revision = valueOf(await context.service.getRevision(document.id, document.currentRevisionId))
  return { ...context, courseId: course.id, document, revision }
}

/** 组装一个有效的模型 JSON 草案（anchor 全部指向真实单元）。 */
function validDraftValue(material: { document: SourceDocument; revision: SourceRevision }): unknown {
  const units = material.revision.units
  const heading = units.find(unit => unit.kind === 'heading')
  const paragraph = units.find(unit => unit.kind === 'paragraph')
  assert.ok(heading !== undefined && paragraph !== undefined)
  return {
    goals: ['理解导数的定义与几何意义'],
    concepts: [
      {
        title: '导数的定义',
        summary: '导数是差商的极限，描述瞬时变化率。',
        prerequisites: [],
        difficulty: 'intro',
        misconceptions: ['把平均变化率当成瞬时变化率'],
        checkIdeas: ['写出导数定义并解释各符号含义'],
        anchors: [
          { documentId: material.document.id as SourceId, unitId: heading.id },
          { documentId: material.document.id as SourceId, unitId: paragraph.id },
        ],
      },
      {
        title: '求导法则',
        summary: '幂函数、和与链式法则。',
        prerequisites: ['导数的定义'],
        difficulty: 'core',
        anchors: [{ documentId: material.document.id as SourceId, unitId: paragraph.id }],
      },
    ],
    sequence: ['导数的定义', '求导法则'],
  }
}

test('有效草案：持久化为 draft 修订、anchor 指向真实资料、coverage 可组装', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([{ kind: 'json', value: validDraftValue(material) }])
  const service = serviceSharing(material, { model })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    background: '学过极限',
    language: 'zh',
  }))
  assert.equal(revision.state, 'draft')
  assert.equal(revision.provenance, 'ai-draft')
  assert.equal(revision.version, 1)
  assert.equal(revision.courseId, material.courseId)
  assert.equal(revision.language, 'zh')
  assert.equal(revision.goals[0], '理解导数', '学生目标应保留在 goals 首位')
  assert.equal(revision.concepts.length, 2)
  const first = revision.concepts[0]
  assert.ok(first !== undefined)
  assert.equal(first.sourceAnchors.length, 2)
  for (const anchor of first.sourceAnchors) {
    assert.equal(anchor.documentId, material.document.id)
    assert.equal(anchor.revisionId, material.revision.id)
    assert.ok(anchor.excerpt.length > 0)
    assert.ok(anchor.label.includes(material.document.title))
  }
  assert.equal(revision.concepts[1]?.prerequisites[0], first.id, 'prerequisites 应按 title 映射为概念 id')
  assert.deepEqual(revision.sequence, revision.concepts.map(concept => concept.id))
  assert.ok(revision.basedOn.some(item => item.sourceId === material.document.id && item.revisionId === material.revision.id))
  assert.ok(revision.sources.some(source => source.sourceId === material.document.id))
  assert.equal(revision.changeSummary !== undefined, true)
  assert.match(revision.changeSummary ?? '', /1 份资料/)

  // 课程草稿关系：只设置 draftRevisionId，不碰 activeRevisionId
  const course = await material.courses.get(material.courseId)
  assert.ok(course !== undefined)
  assert.equal(course.draftRevisionId, revision.id)
  assert.equal(course.activeRevisionId, undefined)

  // 持久化可读回
  const stored = await material.courses.getRevision(material.courseId, revision.id)
  assert.ok(stored !== undefined)
  assert.deepEqual(stored.concepts.map(concept => concept.title), ['导数的定义', '求导法则'])

  // coverage/warnings 数据来源
  const coverage = valueOf(await service.buildCourseDraftCoverage(material.courseId))
  assert.ok(coverage.coverage.some(item => item.sourceId === material.document.id && item.usedUnits >= 2))
  assert.ok(Array.isArray(coverage.warnings))

  // 模型请求：带真实 unitId、purpose 为 course-draft
  assert.equal(model.calls.length, 1)
  const call = model.calls[0]
  assert.equal(call?.purpose, 'course-draft')
  const prompt = call?.messages.map(message => message.text).join('\n') ?? ''
  assert.match(prompt, /unitId=/)
  assert.match(prompt, /微积分/)
  assert.match(prompt, /理解导数/)
  assert.match(prompt, /学过极限/)
})

test('解析失败一次修复后成功；请求包含修复说明', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([
    { kind: 'text', text: '抱歉，我无法按要求输出 JSON。' },
    { kind: 'json', value: validDraftValue(material) },
  ])
  const service = serviceSharing(material, { model })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  }))
  assert.equal(revision.concepts.length, 2)
  assert.equal(model.calls.length, 2, '只允许一次修复调用')
  const repairCall = model.calls[1]
  assert.ok(repairCall !== undefined)
  const repairText = repairCall.messages.map(message => message.text).join('\n')
  assert.match(repairText, /上一次输出无法解析/)
  assert.equal(repairCall.messages.at(-1)?.role, 'user')
})

test('两次都无法解析：返回 uncertain，不保存草案', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([
    { kind: 'text', text: '不是 JSON' },
    { kind: 'text', text: '仍然不是 JSON' },
  ])
  const service = serviceSharing(material, { model })
  const result = await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  })
  assert.equal(errorCode(result), 'uncertain')
  assert.equal(model.calls.length, 2)
  const revisions = await material.courses.listRevisions(material.courseId)
  assert.equal(revisions.length, 0, '失败时不能保存任何草案修订')
  const course = await material.courses.get(material.courseId)
  assert.equal(course?.draftRevisionId, undefined)
})

test('缺字段/概念为空：不可恢复时返回 uncertain（不编造）', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([
    { kind: 'json', value: { goals: [], concepts: [] } },
    { kind: 'json', value: { concepts: [{ summary: '没有 title' }] } },
  ])
  const service = serviceSharing(material, { model })
  const result = await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  })
  assert.equal(errorCode(result), 'uncertain')
  assert.equal((await material.courses.listRevisions(material.courseId)).length, 0)
})

test('模型引用不存在的单元：丢弃 anchor 而不是伪造定位', async t => {
  const material = await setupMaterial(t)
  const draft = validDraftValue(material) as {
    concepts: { title: string; anchors: { documentId: string; unitId: string }[] }[]
  }
  const forged = structuredClone(draft)
  const firstConcept = forged.concepts[0]
  assert.ok(firstConcept !== undefined)
  firstConcept.anchors = [{ documentId: material.document.id, unitId: 'unit-does-not-exist' }]
  const model = new ScriptedModelClient([{ kind: 'json', value: forged }])
  const service = serviceSharing(material, { model })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  }))
  assert.equal(revision.concepts[0]?.sourceAnchors.length, 0, '不存在的单元引用必须被丢弃')
  assert.match(revision.changeSummary ?? '', /丢弃/)
  const coverage = valueOf(await service.buildCourseDraftCoverage(material.courseId))
  assert.ok(coverage.warnings.some(warning => warning.includes('没有资料定位')))
})

test('模型取消：返回 cancelled；无模型：capability-missing；课程不存在：not-found', async t => {
  const material = await setupMaterial(t)
  const abortModel = new ScriptedModelClient([{ kind: 'abort' }])
  const abortService = serviceSharing(material, { model: abortModel })
  const aborted = await abortService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  })
  assert.equal(errorCode(aborted), 'cancelled')

  const noModelService = serviceSharing(material)
  const noModel = await noModelService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
  })
  assert.equal(errorCode(noModel), 'capability-missing')

  const missingCourse = await noModelService.proposeCourseStructure({
    courseId: 'course-not-exists' as never,
    courseTitle: '不存在',
    goal: '目标',
    language: 'zh',
  })
  assert.equal(errorCode(missingCourse), 'not-found')
})

test('重新生成草案：新版本 draft，旧 draft 标记 superseded，确认版不变', async t => {
  const material = await setupMaterial(t)
  const firstModel = new ScriptedModelClient([{ kind: 'json', value: validDraftValue(material) }])
  const firstService = serviceSharing(material, { model: firstModel })
  const first = valueOf(await firstService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第一版目标',
    language: 'zh',
  }))
  // 先确认第一版（模拟 Host/学生确认），再生成第二版
  await material.courses.saveRevision({ ...first, state: 'confirmed', confirmedAt: nowIso() })
  const confirmedCourse = await material.courses.get(material.courseId)
  assert.ok(confirmedCourse !== undefined)
  await material.courses.save({ ...confirmedCourse, activeRevisionId: first.id, draftRevisionId: undefined })

  const secondModel = new ScriptedModelClient([
    { kind: 'json', value: { ...(validDraftValue(material) as object), goals: ['第二版目标'] } },
  ])
  const secondService = serviceSharing(material, { model: secondModel })
  const second = valueOf(await secondService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第二版目标',
    language: 'zh',
  }))
  assert.equal(second.version, 2)
  const revisions = await material.courses.listRevisions(material.courseId)
  assert.equal(revisions.length, 2)
  const courseAfter = await material.courses.get(material.courseId)
  assert.equal(courseAfter?.draftRevisionId, second.id)
  assert.equal(courseAfter?.activeRevisionId, first.id, '生成草案不能改变已确认版本')
  // 只有 draft 会被 superseded（confirmed 版本不受影响）；用新模型生成第三版
  const thirdModel = new ScriptedModelClient([{ kind: 'json', value: validDraftValue(material) }])
  const thirdService = serviceSharing(material, { model: thirdModel })
  await thirdService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第三版目标',
    language: 'zh',
  })
  const secondStored = await material.courses.getRevision(material.courseId, second.id)
  assert.equal(secondStored?.state, 'superseded')
})

test('学生修改 instruction 进入提示；sequence 缺失时自动补齐', async t => {
  const material = await setupMaterial(t)
  const draft = validDraftValue(material) as { sequence?: string[]; concepts: unknown[] }
  delete draft.sequence
  const model = new ScriptedModelClient([{ kind: 'json', value: draft }])
  const service = serviceSharing(material, { model })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
    instruction: '先讲直观定义，再讲求导法则',
  }))
  assert.equal(revision.sequence.length, revision.concepts.length, 'sequence 必须覆盖所有概念')
  assert.equal(new Set(revision.sequence).size, revision.concepts.length)
  const prompt = model.calls[0]?.messages.map(message => message.text).join('\n') ?? ''
  assert.match(prompt, /先讲直观定义/)
})
