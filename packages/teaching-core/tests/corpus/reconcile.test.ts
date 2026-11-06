/**
 * 增量整合证据（纯函数 reconcileDraftWithActive）：
 * 复用旧概念 id、旧-only 概念保留、新概念新增、锚点合并、先修 remap、
 * 章节重映射与一致性、重复/歧义标题警告、sequence 唯一覆盖、sources/basedOn 并集。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import type { Concept, CourseChapter, CourseRevision } from '../../src/contracts/course.ts'
import type { ConceptId, CourseRevisionId } from '../../src/contracts/ids.ts'
import type { SourceAnchor } from '../../src/contracts/source.ts'
import { normalizeConceptTitle, reconcileDraftWithActive } from '../../src/corpus/index.ts'

function anchor(documentId: string, unitId: string, revisionId = 'srev-old'): SourceAnchor {
  return {
    documentId: documentId as SourceAnchor['documentId'],
    revisionId: revisionId as SourceAnchor['revisionId'],
    unitId: unitId as SourceAnchor['unitId'],
    locator: { lines: [1, 1] },
    excerpt: `${documentId}/${unitId}`,
    confidence: 'high',
    label: documentId,
  }
}

function concept(
  id: string,
  title: string,
  options: {
    readonly anchors?: readonly SourceAnchor[]
    readonly prerequisites?: readonly string[]
    readonly summary?: string
  } = {},
): Concept {
  return {
    id: id as ConceptId,
    title,
    summary: options.summary ?? `${title} 摘要`,
    prerequisites: (options.prerequisites ?? []) as ConceptId[],
    sourceAnchors: options.anchors ?? [anchor('src-base', 'unit-1')],
  }
}

function chapter(id: string, title: string, conceptIds: readonly string[], role: CourseChapter['role'] = 'chapter'): CourseChapter {
  return {
    id,
    title,
    conceptIds: conceptIds as ConceptId[],
    role,
  }
}

function revision(input: {
  readonly id: string
  readonly concepts: readonly Concept[]
  readonly sequence?: readonly string[]
  readonly chapters?: readonly CourseChapter[]
  readonly sources?: CourseRevision['sources']
  readonly basedOn?: CourseRevision['basedOn']
  readonly changeSummary?: string
}): CourseRevision {
  const base: CourseRevision = {
    id: input.id as CourseRevisionId,
    courseId: 'course-1' as CourseRevision['courseId'],
    version: 1,
    createdAt: '2026-11-06T00:00:00.000Z',
    state: 'draft',
    provenance: 'llm-wiki',
    goals: ['目标'],
    language: 'zh',
    sources: input.sources ?? [],
    concepts: input.concepts,
    sequence: (input.sequence ?? input.concepts.map(item => item.id)) as ConceptId[],
    ...(input.chapters !== undefined ? { chapters: input.chapters } : {}),
    basedOn: input.basedOn ?? [],
    ...(input.changeSummary !== undefined ? { changeSummary: input.changeSummary } : {}),
  }
  return base
}

function conceptIdsOf(revisionValue: CourseRevision): string[] {
  return revisionValue.concepts.map(item => item.id as string)
}

test('归一化标题匹配：复用旧 id、新增概念保留新 id、旧-only 概念保留并追加', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [
      concept('c-old-derivative', '导数（定义）', {
        anchors: [anchor('src-old', 'unit-1'), anchor('src-old', 'unit-2')],
      }),
      concept('c-old-limit', '极限', { anchors: [anchor('src-old', 'unit-9')] }),
    ],
    chapters: [chapter('ch-old', '第一章', ['c-old-derivative', 'c-old-limit'])],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [
      concept('c-new-derivative', ' 导数(定义) ', {
        anchors: [anchor('src-new', 'unit-1'), anchor('src-old', 'unit-2')],
      }),
      concept('c-new-continuity', '连续', {
        anchors: [anchor('src-new', 'unit-5')],
        prerequisites: ['c-new-derivative'],
      }),
    ],
    chapters: [chapter('ch-draft', '第一章 导数与连续', ['c-new-derivative', 'c-new-continuity'])],
  })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  assert.equal(stats.reusedConcepts, 1)
  assert.equal(stats.addedConcepts, 1)
  assert.equal(stats.preservedOldConcepts, 1)
  assert.equal(stats.addedAnchors, 2, '新增 1 个复用概念的锚点 + 1 个新概念锚点')
  assert.deepEqual(conceptIdsOf(result), ['c-old-derivative', 'c-new-continuity', 'c-old-limit'])
  // 旧锚点保留 + 新锚点追加（去重）
  const derivative = result.concepts[0]
  assert.deepEqual(derivative?.sourceAnchors.map(item => `${item.documentId}/${item.unitId}`), [
    'src-old/unit-1', 'src-old/unit-2', 'src-new/unit-1',
  ])
  // 新概念先修 remap 到旧 id
  assert.deepEqual(result.concepts[1]?.prerequisites, ['c-old-derivative'])
  // sequence 唯一覆盖全部概念，草案顺序在前、旧-only 在后
  assert.deepEqual(result.sequence as unknown as string[], ['c-old-derivative', 'c-new-continuity', 'c-old-limit'])
  assert.equal(new Set(result.sequence).size, result.concepts.length)
  // 章节重映射 + 旧-only 概念保留（同名旧章节保留）
  const chapterIds = (result.chapters ?? []).flatMap(item => item.conceptIds as unknown as string[])
  assert.equal(new Set(chapterIds).size, chapterIds.length, '概念不应重复出现在章节')
  assert.deepEqual(new Set(chapterIds), new Set(conceptIdsOf(result)))
  // revision 元数据沿用草案
  assert.equal(result.id, draft.id)
  assert.equal(result.provenance, 'llm-wiki')
  assert.match(result.changeSummary ?? '', /增量整合/)
})

test('锚点合并与旧先修保留；指向已消失概念的先修被移除并有警告', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [
      concept('c1', '极限', { anchors: [anchor('src-a', 'u1')] }),
      concept('c2', '导数', { anchors: [anchor('src-a', 'u2')], prerequisites: ['c1', 'c-gone'] }),
    ],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [
      concept('d1', '极限', { anchors: [anchor('src-b', 'u1'), anchor('src-a', 'u1')] }),
      concept('d2', '导数', { anchors: [anchor('src-b', 'u2')], prerequisites: ['d1'] }),
    ],
  })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  assert.equal(stats.reusedConcepts, 2)
  const limit = result.concepts.find(item => item.id === 'c1')
  assert.deepEqual(limit?.sourceAnchors.map(item => `${item.documentId}/${item.unitId}`), [
    'src-a/u1', 'src-b/u1',
  ])
  const derivative = result.concepts.find(item => item.id === 'c2')
  assert.deepEqual(derivative?.prerequisites, ['c1'], '旧先修 c1 + 草案先修 d1 都映射到 c1')
  assert.ok(stats.warnings.some(warning => warning.includes('先修引用')))
})

test('重复/歧义标题：旧结构重复候选、草案重复标题均有警告且不丢概念', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [
      concept('a1', '导数'),
      concept('a2', '导数 '),
      concept('a3', '极限'),
    ],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [
      concept('d1', '导数', { anchors: [anchor('src-new', 'x1')] }),
      concept('d2', '极限', { anchors: [anchor('src-new', 'x2')] }),
      concept('d3', '极限', { anchors: [anchor('src-new', 'x3')] }),
    ],
  })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  assert.equal(stats.reusedConcepts, 2, '导数与第一个极限复用旧 id')
  assert.equal(stats.addedConcepts, 1, '第二个同名极限作为新概念保留')
  assert.equal(stats.preservedOldConcepts, 1, '旧结构第二个导数保留')
  assert.ok(stats.warnings.some(warning => warning.includes('多个候选') || warning.includes('归一化后相同')))
  assert.ok(stats.warnings.some(warning => warning.includes('重复出现')))
  assert.equal(result.concepts.length, 4)
  assert.equal(new Set(result.concepts.map(item => item.id)).size, 4)
  assert.equal(new Set(result.sequence).size, 4)
})

test('全角/空白/标点归一化确实匹配', () => {
  assert.equal(normalizeConceptTitle(' 导数（定义） '), normalizeConceptTitle('导数(定义)'))
  assert.equal(normalizeConceptTitle('ＡＢＣ　测试'), normalizeConceptTitle('abc测试'))
  const active = revision({ id: 'crev-active', concepts: [concept('old-id', '导数（定义）')] })
  const draft = revision({ id: 'crev-draft', concepts: [concept('new-id', ' 导数(定义)')] })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  assert.equal(stats.reusedConcepts, 1)
  assert.equal(result.concepts[0]?.id, 'old-id')
})

test('章节一致性：草案章节重映射；旧-only 并入同名章节；每个概念恰好一章', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [concept('a1', '极限'), concept('a2', '连续'), concept('a3', '旧章节概念')],
    chapters: [
      chapter('ch-active-1', '第一章 基础', ['a1', 'a2']),
      chapter('ch-active-2', '第二章 旧内容', ['a3']),
    ],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [concept('d1', '极限'), concept('d2', '连续'), concept('d3', '导数')],
    chapters: [
      chapter('ch-draft-1', '第一章 基础', ['d1', 'd2']),
      chapter('ch-draft-2', '第二章 导数', ['d3']),
    ],
  })
  const { revision: result } = reconcileDraftWithActive(active, draft)
  // '连续' 与 active 中 '连续' 匹配（复用 id a2），旧-only 只有 a3
  const conceptIds = conceptIdsOf(result)
  assert.deepEqual(conceptIds, ['a1', 'a2', 'd3', 'a3'])
  const chapters = result.chapters ?? []
  const seen = new Set<string>()
  for (const chapterItem of chapters) {
    assert.ok(chapterItem.conceptIds.length > 0)
    for (const id of chapterItem.conceptIds as unknown as string[]) {
      assert.ok(!seen.has(id), `概念 ${id} 出现在多个章节`)
      seen.add(id)
    }
  }
  assert.deepEqual(seen, new Set(conceptIds))
  // 旧-only 的旧章节（标题不冲突）保留
  assert.ok(chapters.some(item => item.title === '第二章 旧内容'))
})

test('草案没有章节但旧结构有：保留旧章节结构并 remap id', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [concept('a1', '极限'), concept('a2', '连续')],
    chapters: [chapter('ch-1', '第一章', ['a1', 'a2'])],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [concept('d1', '极限')],
  })
  const { revision: result } = reconcileDraftWithActive(active, draft)
  const chapters = result.chapters ?? []
  assert.equal(chapters.length, 1, '旧章节整体保留，不应拆成重复章节')
  assert.deepEqual(chapters[0]?.conceptIds as unknown as string[], ['a1', 'a2'])
  assert.ok((result.sequence as unknown as string[]).includes('a2'))
})

test('没有章节且旧概念无章节：进入附录章节，sequence 仍覆盖全部', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [concept('a1', '极限'), concept('a2', '旧概念')],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [concept('d1', '极限')],
  })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  const chapters = result.chapters ?? []
  assert.ok(chapters.some(item => item.role === 'appendix'))
  const chapterIds = new Set(chapters.flatMap(item => item.conceptIds as unknown as string[]))
  assert.deepEqual(chapterIds, new Set(conceptIdsOf(result)))
  assert.ok(stats.warnings.some(warning => warning.includes('附录') || warning.includes('未归属章节')))
  assert.equal(new Set(result.sequence).size, result.concepts.length)
})

test('sources/basedOn 取并集，changeSummary 记录整合统计', () => {
  const active = revision({
    id: 'crev-active',
    concepts: [concept('a1', '极限')],
    sources: [{ sourceId: 'src-old' as never, role: 'textbook' }],
    basedOn: [{ sourceId: 'src-old' as never, revisionId: 'srev-old' }],
  })
  const draft = revision({
    id: 'crev-draft',
    concepts: [concept('d1', '极限'), concept('d2', '导数')],
    sources: [{ sourceId: 'src-new' as never, role: 'reference' }],
    basedOn: [{ sourceId: 'src-new' as never, revisionId: 'srev-new' }],
    changeSummary: 'LLM-wiki 回退：2 个概念',
  })
  const { revision: result, stats } = reconcileDraftWithActive(active, draft)
  assert.deepEqual((result.sources ?? []).map(item => item.sourceId as string).sort(), ['src-new', 'src-old'])
  assert.deepEqual((result.basedOn ?? []).map(item => `${item.sourceId}|${item.revisionId}`).sort(), [
    'src-new|srev-new', 'src-old|srev-old',
  ])
  assert.match(result.changeSummary ?? '', /LLM-wiki 回退：2 个概念/)
  assert.match(result.changeSummary ?? '', /增量整合：复用 1 个概念 id、新增 1 个概念、保留 0 个旧概念、新增 1 个资料锚点/)
  assert.equal(stats.addedAnchors, 1)
})
