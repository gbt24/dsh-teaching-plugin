/**
 * teaching 测试夹具：课程/概念/资料 anchor/学生档案/回合输入。
 * 只使用公开契约与 ids 生成器，不依赖其它模块实现。
 */
import type { Course, CourseRevision } from '../../src/contracts/course.ts'
import type { SourceAnchor } from '../../src/contracts/source.ts'
import type { StudentProfile } from '../../src/contracts/session.ts'
import type { TeachingTurnInput } from '../../src/contracts/teaching.ts'
import type { ConceptId } from '../../src/contracts/ids.ts'
import {
  conceptId, courseId, courseRevisionId, nowIso, sessionId, sourceId, sourceRevisionId, unitId,
} from '../../src/contracts/ids.ts'
import { META_MARKER } from '../../src/teaching/prompts.ts'

/** 一段可定位的课程资料 anchor。 */
export function makeAnchor(overrides: Partial<SourceAnchor> = {}): SourceAnchor {
  return {
    documentId: sourceId(),
    revisionId: sourceRevisionId(),
    unitId: unitId(),
    locator: { page: 3, sectionPath: ['第 2 章', '2.1 过拟合'] },
    excerpt: '过拟合指模型把训练数据中的噪声也学了进去，导致在新数据上的泛化误差变大。',
    confidence: 'high',
    label: '第 2 章 · 2.1 过拟合',
    ...overrides,
  }
}

/** 课程夹具：一个 AI 课程与「过拟合/验证集」两个概念。 */
export interface CourseFixture {
  readonly course: Course
  readonly revision: CourseRevision
  readonly overfittingId: ConceptId
  readonly validationId: ConceptId
  readonly anchor: SourceAnchor
}

export function makeCourseFixture(): CourseFixture {
  const id = courseId()
  const revisionId = courseRevisionId()
  const overfittingId = conceptId()
  const validationId = conceptId()
  const anchor = makeAnchor()
  const timestamp = nowIso()
  const revision: CourseRevision = {
    id: revisionId,
    courseId: id,
    version: 1,
    createdAt: timestamp,
    state: 'confirmed',
    confirmedAt: timestamp,
    provenance: 'ai-draft',
    goals: ['理解过拟合与泛化', '能解释验证集的作用'],
    background: '学过基础线性回归',
    language: 'zh',
    sources: [],
    concepts: [
      {
        id: overfittingId,
        title: '过拟合与泛化',
        summary: '模型在训练集上误差很低，但在未见过的新数据上表现变差。需要区分训练误差与泛化误差。',
        prerequisites: [],
        sourceAnchors: [anchor],
        difficulty: 'core',
        misconceptions: ['把训练误差低当成泛化好', '认为模型越复杂越好'],
        checkIdeas: ['能解释验证集为什么能估计泛化误差', '能给出缓解过拟合的方法'],
      },
      {
        id: validationId,
        title: '验证集与模型选择',
        summary: '用验证集选择模型复杂度，避免用测试集调参。',
        prerequisites: [overfittingId],
        sourceAnchors: [],
        difficulty: 'intro',
      },
    ],
    sequence: [overfittingId, validationId],
    basedOn: [],
  }
  const course: Course = {
    id,
    title: '机器学习导论',
    description: '面向初学者的机器学习课程',
    subjectTags: ['AI', '机器学习'],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    activeRevisionId: revisionId,
  }
  return { course, revision, overfittingId, validationId, anchor }
}

/** 学生档案夹具。 */
export function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    displayName: '测试学生',
    goals: '能独立解释并应用机器学习概念',
    background: '会一点 Python，数学基础一般',
    language: 'zh',
    preferences: { showSources: true, keepOriginalTerms: true, pace: 'normal' },
    updatedAt: nowIso(),
    ...overrides,
  }
}

/** 一轮教学输入夹具（可覆盖任意字段）。 */
export function makeTurnInput(
  fixture: CourseFixture,
  overrides: Partial<TeachingTurnInput> = {},
): TeachingTurnInput {
  const base: TeachingTurnInput = {
    sessionId: sessionId(),
    studentText: '什么是过拟合？',
    stage: 'teaching',
    profile: makeProfile(),
    language: 'zh',
    course: fixture.course,
    courseRevision: fixture.revision,
    currentConceptId: fixture.overfittingId,
    history: [],
    material: [{ anchor: fixture.anchor, documentTitle: '机器学习导论.pdf' }],
    crossCourse: [],
    learning: [],
    materialWarnings: [],
  }
  return { ...base, ...overrides }
}

/** 构造「正文 + 分隔符 + 元数据 JSON」的模型回复文本。 */
export function replyWithMeta(body: string, meta: unknown): string {
  return `${body}\n\n${META_MARKER}\n${JSON.stringify(meta)}`
}

/** 收集异步流事件。 */
export async function collectEvents<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const events: T[] = []
  for await (const event of iterable) events.push(event)
  return events
}

/** 从事件流中取最后一个事件。 */
export function lastEvent<T>(events: readonly T[]): T | undefined {
  return events.at(-1)
}
