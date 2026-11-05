/**
 * 课程结构 v2 · LLM-wiki 回退（llm-wiki）证据：
 * - 新 sections 结构（章节 → 概念）持久化为 draft 修订，provenance=llm-wiki；
 * - 只修复一次、失败返回 uncertain、无效 anchor 丢弃不伪造；
 * - 模型取消/缺失、旧版扁平 JSON 兼容、学生 instruction 进入提示；
 * - 大资料按预算分组（map）后合并（reduce），调用次数有界；
 * - 重新生成草案：version 递增、旧 draft superseded、确认版不受影响。
 */
import test from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { ScriptedModelClient } from '../../src/model/fake.ts'
import { courseId as newCourseId, nowIso } from '../../src/contracts/ids.ts'
import type { CourseId, SourceId } from '../../src/contracts/ids.ts'
import type { Course } from '../../src/contracts/course.ts'
import type { SourceDocument, SourceRevision, SourceUnit } from '../../src/contracts/source.ts'
import type { CourseRepository } from '../../src/storage/repositories.ts'
import { samplePath, createTestCorpus, serviceSharing, valueOf, errorCode } from './helpers.ts'

interface MaterialDocument {
  readonly document: SourceDocument
  readonly revision: SourceRevision
  readonly units: readonly SourceUnit[]
}

interface Material {
  readonly courseId: CourseId
  readonly documents: readonly MaterialDocument[]
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
  const outcome = await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('markdown/overfitting.md') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('pdf/derivative-rules.pdf') },
  ])
  assert.equal(outcome.failures.length, 0)
  const documents: MaterialDocument[] = []
  for (const document of outcome.documents) {
    assert.ok(document.currentRevisionId !== undefined)
    const revision = valueOf(await context.service.getRevision(document.id, document.currentRevisionId))
    documents.push({ document, revision, units: revision.units })
  }
  return { ...context, courseId: course.id as CourseId, documents }
}

function unitOf(material: Material, documentIndex: number, kind: SourceUnit['kind']): SourceUnit {
  const units = material.documents[documentIndex]?.units ?? []
  const found = units.find(unit => unit.kind === kind)
  assert.ok(found !== undefined, `资料 ${documentIndex} 应包含 ${kind} 单元`)
  return found
}

/** 新版 sections 结构（章节 → 概念 → 真实资料锚点）。 */
function sectionsDraftValue(material: Material, overrides: { readonly titleSuffix?: string } = {}): unknown {
  const derivDoc = material.documents[0] as MaterialDocument
  const limitsDoc = material.documents[1] as MaterialDocument
  const heading = unitOf(material, 0, 'heading')
  const paragraph = unitOf(material, 1, 'paragraph')
  return {
    goals: ['理解导数与极限的关系'],
    sections: [
      {
        title: '第一章 极限',
        summary: '极限是微积分的基础',
        role: 'chapter',
        concepts: [{
          title: `极限${overrides.titleSuffix ?? ''}`,
          summary: '数列与函数极限、左右极限',
          difficulty: 'intro',
          prerequisites: [],
          misconceptions: ['把极限值当成函数值'],
          checkIdeas: ['写出 ε-δ 定义'],
          anchors: [{ documentId: limitsDoc.document.id, unitId: paragraph.id }],
        }],
      },
      {
        title: '第二章 导数',
        summary: '导数刻画瞬时变化率',
        role: 'chapter',
        concepts: [{
          title: `导数${overrides.titleSuffix ?? ''}`,
          summary: '差商的极限与切线斜率',
          difficulty: 'core',
          prerequisites: [`极限${overrides.titleSuffix ?? ''}`],
          anchors: [
            { documentId: derivDoc.document.id, unitId: heading.id },
            { documentId: derivDoc.document.id, unitId: 'unit-does-not-exist' },
          ],
        }],
      },
    ],
    notes: ['资料覆盖导数与极限，线性代数部分缺失'],
  }
}

test('有效 sections 草案：章节/概念/锚点/顺序持久化为 llm-wiki draft', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([{ kind: 'json', value: sectionsDraftValue(material) }])
  const service = serviceSharing(material, { model })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    background: '学过极限',
    language: 'zh',
  }))
  assert.equal(revision.state, 'draft')
  assert.equal(revision.provenance, 'llm-wiki')
  assert.equal(revision.version, 1)
  assert.equal(revision.goals[0], '理解导数', '学生目标保留在 goals 首位')
  assert.equal(revision.concepts.length, 2)
  assert.ok(revision.chapters !== undefined)
  assert.deepEqual(revision.chapters?.map(chapter => chapter.role), ['chapter', 'chapter'])
  assert.deepEqual(revision.chapters?.map(chapter => chapter.title), ['第一章 极限', '第二章 导数'])
  assert.equal(revision.sequence.length, 2)
  assert.deepEqual(revision.sequence, revision.chapters?.flatMap(chapter => [...chapter.conceptIds]))
  const derivative = revision.concepts.find(concept => concept.title === '导数')
  const limit = revision.concepts.find(concept => concept.title === '极限')
  assert.ok(derivative !== undefined && limit !== undefined)
  assert.equal(limit.sourceAnchors.length, 1)
  assert.equal(derivative.sourceAnchors.length, 1, '无效 anchor 应被丢弃')
  assert.equal(derivative.sourceAnchors[0]?.documentId, material.documents[0]?.document.id)
  assert.deepEqual(derivative.prerequisites, [limit.id])
  assert.ok(derivative.difficulty === 'core')
  assert.ok(revision.basedOn.length >= 2)
  assert.ok(revision.changeSummary?.includes('LLM-wiki 回退'))
  assert.ok(revision.changeSummary?.includes('llm-wiki'))

  // 课程关系：只写 draftRevisionId
  const course = await material.courses.get(material.courseId)
  assert.equal(course?.draftRevisionId, revision.id)
  assert.equal(course?.activeRevisionId, undefined)

  // coverage 可组装
  const coverage = valueOf(await service.buildCourseDraftCoverage(material.courseId))
  assert.ok(coverage.coverage.length > 0)
  assert.ok(coverage.warnings.some(warning => warning.includes('llm-wiki')))

  // 提示词：LLM-wiki 规则 + 真实 unitId + 课程/目标/基础
  assert.equal(model.calls.length, 1)
  const call = model.calls[0]
  assert.equal(call?.purpose, 'course-draft')
  const prompt = `${call?.system ?? ''}\n${call?.messages.map(message => message.text).join('\n') ?? ''}`
  assert.match(prompt, /LLM Wiki|LLM-wiki/)
  assert.match(prompt, /unitId=/)
  assert.match(prompt, /微积分/)
  assert.match(prompt, /理解导数/)
  assert.match(prompt, /学过极限/)
  assert.match(prompt, /页面阈值|passing mention/)
})

test('解析失败一次修复后成功；请求包含修复说明', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([
    { kind: 'text', text: '抱歉，我无法按要求输出 JSON。' },
    { kind: 'json', value: sectionsDraftValue(material) },
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
  const repairText = model.calls[1]?.messages.map(message => message.text).join('\n') ?? ''
  assert.match(repairText, /上一次输出无法解析/)
  assert.equal(model.calls[1]?.messages.at(-1)?.role, 'user')
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
  assert.equal((await material.courses.listRevisions(material.courseId)).length, 0, '失败时不能保存任何草案修订')
})

test('缺字段/概念为空：不可恢复时返回 uncertain（不编造）', async t => {
  const material = await setupMaterial(t)
  const model = new ScriptedModelClient([
    { kind: 'json', value: { sections: [] } },
    { kind: 'json', value: { sections: [{ title: '章', concepts: [{ summary: '没有 title' }] }] } },
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
  const forged = sectionsDraftValue(material) as {
    sections: { concepts: { title: string; anchors: { documentId: string; unitId: string }[] }[] }[]
  }
  const firstConcept = forged.sections[0]?.concepts[0]
  assert.ok(firstConcept !== undefined)
  firstConcept.anchors = [{ documentId: material.documents[0]?.document.id as SourceId, unitId: 'unit-does-not-exist' }]
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
})

test('模型取消：cancelled；无模型：capability-missing；课程不存在：not-found', async t => {
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

test('重新生成草案：新版本 draft、旧 draft superseded、确认版不受影响', async t => {
  const material = await setupMaterial(t)
  const firstModel = new ScriptedModelClient([{ kind: 'json', value: sectionsDraftValue(material) }])
  const firstService = serviceSharing(material, { model: firstModel })
  const first = valueOf(await firstService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第一版目标',
    language: 'zh',
  }))
  // 模拟 Host/学生确认第一版
  await material.courses.saveRevision({ ...first, state: 'confirmed', confirmedAt: nowIso() })
  const confirmedCourse = await material.courses.get(material.courseId)
  assert.ok(confirmedCourse !== undefined)
  await material.courses.save({ ...confirmedCourse, activeRevisionId: first.id, draftRevisionId: undefined })

  const secondModel = new ScriptedModelClient([{ kind: 'json', value: sectionsDraftValue(material, { titleSuffix: '（二）' }) }])
  const secondService = serviceSharing(material, { model: secondModel })
  const second = valueOf(await secondService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第二版目标',
    language: 'zh',
  }))
  assert.equal(second.version, 2)
  assert.equal((await material.courses.listRevisions(material.courseId)).length, 2)
  const courseAfter = await material.courses.get(material.courseId)
  assert.equal(courseAfter?.draftRevisionId, second.id)
  assert.equal(courseAfter?.activeRevisionId, first.id, '生成草案不能改变已确认版本')

  // 第三版会把第二版（draft）标记 superseded；已确认的第一版保持 confirmed
  const thirdModel = new ScriptedModelClient([{ kind: 'json', value: sectionsDraftValue(material, { titleSuffix: '（三）' }) }])
  const thirdService = serviceSharing(material, { model: thirdModel })
  await thirdService.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '第三版目标',
    language: 'zh',
  })
  const secondStored = await material.courses.getRevision(material.courseId, second.id)
  assert.equal(secondStored?.state, 'superseded')
  const firstStored = await material.courses.getRevision(material.courseId, first.id)
  assert.equal(firstStored?.state, 'confirmed')
})

test('学生 instruction 进入提示；旧版扁平 JSON 兼容为单章节', async t => {
  const material = await setupMaterial(t)
  const flatModel = new ScriptedModelClient([{
    kind: 'json',
    value: {
      goals: ['理解导数'],
      concepts: [{
        title: '导数',
        summary: '差商的极限',
        prerequisites: [],
        difficulty: 'intro',
        anchors: [{
          documentId: material.documents[0]?.document.id,
          unitId: unitOf(material, 0, 'heading').id,
        }],
      }],
      sequence: ['导数'],
    },
  }])
  const service = serviceSharing(material, { model: flatModel })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: material.courseId,
    courseTitle: '微积分',
    goal: '理解导数',
    language: 'zh',
    instruction: '先讲直观定义，再讲计算',
  }))
  assert.equal(revision.provenance, 'llm-wiki')
  assert.ok(revision.chapters !== undefined && revision.chapters.length >= 1, '旧版扁平输出应兼容为单章节')
  assert.equal(revision.concepts.length, 1)
  assert.equal(revision.concepts[0]?.sourceAnchors.length, 1)
  assert.equal(revision.sequence.length, 1)
  const prompt = flatModel.calls[0]?.messages.map(message => message.text).join('\n') ?? ''
  assert.match(prompt, /先讲直观定义/)
})

test('大资料：按摘要预算分组 map 后合并，模型调用有界', async t => {
  const context = await createTestCorpus({
    limits: {
      draftLlmWikiBudgetChars: 2_000,
      draftLlmWikiDocChars: 420,
      draftLlmWikiGroupCallsMax: 3,
      draftLlmWikiHeadingsPerDoc: 4,
    },
  })
  t.after(async () => await context.cleanup())
  const course = await createCourse(context.courses, '分组测试')
  const imported = await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('markdown/overfitting.md') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('pdf/derivative-rules.pdf') },
    { path: samplePath('docx/derivative-lecture.docx') },
    { path: samplePath('pptx/derivative-slides.pptx') },
  ])
  assert.equal(imported.failures.length, 0)
  const reply = (title: string): { kind: 'json'; value: unknown } => ({
    kind: 'json',
    value: {
      sections: [{ title, summary: '', role: 'chapter', concepts: [{ title: `${title} 概念`, summary: '一句话', anchors: [] }] }],
      goals: ['理解内容'],
      notes: [],
    },
  })
  const model = new ScriptedModelClient([reply('第一章'), reply('第二章'), reply('第三章')])
  const service = serviceSharing(context, {
    model,
    limits: {
      draftLlmWikiBudgetChars: 2_000,
      draftLlmWikiDocChars: 420,
      draftLlmWikiGroupCallsMax: 3,
      draftLlmWikiHeadingsPerDoc: 4,
    },
  })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: course.id,
    courseTitle: '分组测试',
    goal: '理解内容',
    language: 'zh',
  }))
  assert.ok(model.calls.length > 1, `应触发分组调用，实际 ${model.calls.length}`)
  assert.ok(model.calls.length <= 3, '模型调用次数必须有界')
  assert.ok(revision.chapters !== undefined && revision.chapters.length >= 1)
  assert.ok(revision.concepts.length >= 1)
  assert.equal(new Set(revision.sequence).size, revision.concepts.length)
  assert.ok(revision.changeSummary?.includes('份资料'))
})

test('分组部分失败：保留成功分组并给出覆盖警告，不整体失败', async t => {
  const context = await createTestCorpus({
    limits: {
      draftLlmWikiBudgetChars: 2_000,
      draftLlmWikiDocChars: 420,
      draftLlmWikiGroupCallsMax: 3,
      draftLlmWikiHeadingsPerDoc: 4,
    },
  })
  t.after(async () => await context.cleanup())
  const course = await createCourse(context.courses, '部分失败')
  const imported = await context.service.importFiles(course.id, [
    { path: samplePath('markdown/derivatives.md') },
    { path: samplePath('markdown/overfitting.md') },
    { path: samplePath('text/limits-notes.txt') },
    { path: samplePath('pdf/derivative-rules.pdf') },
    { path: samplePath('docx/derivative-lecture.docx') },
    { path: samplePath('pptx/derivative-slides.pptx') },
  ])
  assert.equal(imported.failures.length, 0)
  const validReply = {
    kind: 'json' as const,
    value: {
      sections: [{ title: '第一章 成功分组', role: 'chapter', concepts: [{ title: '成功概念', summary: '一句话', anchors: [] }] }],
      goals: [],
      notes: [],
    },
  }
  const model = new ScriptedModelClient([validReply, { kind: 'text', text: '第二组不是 JSON' }, { kind: 'text', text: '第二组仍然不是 JSON' }])
  const service = serviceSharing(context, {
    model,
    limits: {
      draftLlmWikiBudgetChars: 2_000,
      draftLlmWikiDocChars: 420,
      draftLlmWikiGroupCallsMax: 3,
      draftLlmWikiHeadingsPerDoc: 4,
    },
  })
  const revision = valueOf(await service.proposeCourseStructure({
    courseId: course.id,
    courseTitle: '部分失败',
    goal: '理解内容',
    language: 'zh',
  }))
  assert.ok(revision.concepts.length >= 1, '成功分组的概念应保留')
  assert.ok(revision.changeSummary?.includes('警告'), '部分分组失败应体现在结构说明/警告中')
  assert.ok(model.calls.length >= 2)
})
