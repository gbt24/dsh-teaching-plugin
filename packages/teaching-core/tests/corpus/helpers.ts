/**
 * Corpus 测试公共设施：临时数据目录、真实样例路径、课程修订构造。
 *
 * 测试只通过公开 seam（createCorpusService / CorpusService 方法）验证行为；
 * 临时目录放在系统临时区，绝不写用户资料或 ~/.dsh。
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModelClient } from '../../src/model/types.ts'
import type { CorpusServiceOptions, CorpusServiceApi, CorpusLimits, OcrOptions } from '../../src/corpus/index.ts'
import { createCorpusService } from '../../src/corpus/index.ts'
import { LocalState } from '../../src/storage/local-state.ts'
import { CourseRepository, LearningRepository } from '../../src/storage/repositories.ts'
import type { CorpusReferenceHooks } from '../../src/corpus/types.ts'
import { conceptId as newConceptId, courseId as newCourseId, courseRevisionId as newCourseRevisionId, nowIso } from '../../src/contracts/ids.ts'
import type { Course, CourseRevision } from '../../src/contracts/course.ts'
import type { SourceAnchor } from '../../src/contracts/source.ts'
import type { Result } from '../../src/contracts/result.ts'
import { expectOk } from '../../src/contracts/result.ts'

/** 仓库内可分发样例目录（多格式语料）。 */
export const SAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../samples/corpus')

/** 仓库内可分发 LLM-wiki fixture 目录（课程结构 v2）。 */
export const KB_SAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../samples/kb')

/** 嵌套章节 fixture：章节标题在 H3、非章节分区各自成章、章节 tags 兜底。 */
export const KB_NESTED_SAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../samples/kb-nested')

/** 样例绝对路径（samples/corpus）。 */
export function samplePath(...parts: readonly string[]): string {
  return join(SAMPLE_DIR, ...parts)
}

/** LLM-wiki fixture 绝对路径（samples/kb）。 */
export function kbSamplePath(...parts: readonly string[]): string {
  return join(KB_SAMPLE_DIR, ...parts)
}

/** 嵌套章节 fixture 绝对路径（samples/kb-nested）。 */
export function kbNestedSamplePath(...parts: readonly string[]): string {
  return join(KB_NESTED_SAMPLE_DIR, ...parts)
}

/** 递归列出 fixture 中需要导入的 Markdown 文件（排除 README）。 */
export async function listKbFixtureFiles(root: string = KB_SAMPLE_DIR): Promise<string[]> {
  const files: string[] = []
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(full)
    }
  }
  await walk(root)
  return files.sort()
}

/** 测试上下文。 */
export interface CorpusTestContext {
  readonly dataDir: string
  readonly state: LocalState
  readonly courses: CourseRepository
  readonly learning: LearningRepository
  readonly service: CorpusServiceApi
  cleanup(): Promise<void>
}

/** 测试扩展选项。 */
export interface TestCorpusOptions {
  readonly model?: ModelClient
  readonly limits?: Partial<CorpusLimits>
  readonly ocr?: OcrOptions
  readonly references?: CorpusReferenceHooks
}

/** 创建一套隔离的语料服务（临时目录）。 */
export async function createTestCorpus(options: TestCorpusOptions = {}): Promise<CorpusTestContext> {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-corpus-test-'))
  const state = new LocalState({ dataDir })
  await state.open()
  const courses = new CourseRepository(state)
  const learning = new LearningRepository(state)
  const serviceOptions: CorpusServiceOptions = {
    state,
    courses,
    learning,
    ...(options.model !== undefined ? { model: options.model } : {}),
    ...(options.limits !== undefined ? { limits: options.limits } : {}),
    ...(options.ocr !== undefined ? { ocr: options.ocr } : {}),
    ...(options.references !== undefined ? { references: options.references } : {}),
  }
  const service = createCorpusService(serviceOptions)
  return {
    dataDir,
    state,
    courses,
    learning,
    service,
    async cleanup(): Promise<void> {
      await rm(dataDir, { recursive: true, force: true })
    },
  }
}

/** 在同一个存储上创建第二个服务实例（验证缓存之外的持久化正确性）。 */
export function serviceSharing(
  context: CorpusTestContext,
  options: TestCorpusOptions = {},
): CorpusServiceApi {
  return createCorpusService({
    state: context.state,
    courses: context.courses,
    learning: context.learning,
    ...(options.model !== undefined ? { model: options.model } : {}),
    ...(options.limits !== undefined ? { limits: options.limits } : {}),
    ...(options.ocr !== undefined ? { ocr: options.ocr } : {}),
    ...(options.references !== undefined ? { references: options.references } : {}),
  })
}

/** 创建一个不含修订的课程记录（用于挂接资料/过滤检索）。 */
export async function createCourseRecord(courses: CourseRepository, title: string): Promise<Course> {
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

/** 创建带一个已确认修订的课程（概念引用给定 anchors）。 */
export async function createConfirmedCourse(
  courses: CourseRepository,
  input: {
    readonly title?: string
    readonly conceptTitle?: string
    readonly anchors?: readonly SourceAnchor[]
    readonly extraConcepts?: readonly { readonly title: string; readonly anchors?: readonly SourceAnchor[] }[]
  } = {},
): Promise<{ course: Course; revision: CourseRevision }> {
  const courseId = newCourseId()
  const timestamp = nowIso()
  const firstConceptId = newConceptId()
  const concepts = [
    {
      id: firstConceptId,
      title: input.conceptTitle ?? '测试概念',
      summary: '测试课程概念',
      prerequisites: [] as ReturnType<typeof newConceptId>[],
      sourceAnchors: input.anchors ?? [],
    },
    ...(input.extraConcepts ?? []).map(extra => ({
      id: newConceptId(),
      title: extra.title,
      summary: '',
      prerequisites: [] as ReturnType<typeof newConceptId>[],
      sourceAnchors: extra.anchors ?? [],
    })),
  ]
  const revision: CourseRevision = {
    id: newCourseRevisionId(),
    courseId,
    version: 1,
    createdAt: timestamp,
    state: 'confirmed',
    provenance: 'student-edit',
    goals: ['测试目标'],
    language: 'zh',
    sources: [],
    concepts,
    sequence: concepts.map(concept => concept.id),
    basedOn: [],
  }
  const course: Course = {
    id: courseId,
    title: input.title ?? '测试课程',
    description: '',
    subjectTags: [],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    activeRevisionId: revision.id,
  }
  await courses.saveRevision(revision)
  const saved = await courses.save(course)
  return { course: saved, revision }
}

/** 断言 Result 成功并返回值。 */
export function valueOf<T>(result: Result<T>): T {
  return expectOk(result)
}

/** 断言存在错误码。 */
export function errorCode(result: Result<unknown>): string {
  return result.ok ? 'ok' : result.error.code
}

/** 等待条件成立（用于少量异步缓存场景）；有上限，不无限等待。 */
export async function waitFor(
  check: () => Promise<boolean> | boolean,
  timeoutMs = 2_000,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  return false
}
