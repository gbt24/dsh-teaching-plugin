/**
 * 语料服务对 Host 公开的依赖注入类型。
 *
 * Host 接线：
 *   const corpus = createCorpusService({ state, courses, model, references })
 * 其中 `state` 是打开前的 LocalState（service 会自行 open），`courses` 可省略由 state 构造。
 * `references` 是可选的活动/引用索引（Host 可以传入活动存储与课程修订反查），
 * 没有注入时受影响概念默认从课程修订的 sourceAnchors 反查，活动列表为空（明确不猜测）。
 */
import type { SourceId } from '../contracts/ids.ts'
import type { ModelClient } from '../model/types.ts'
import type { LocalState } from '../storage/local-state.ts'
import type { CourseRepository, LearningRepository } from '../storage/repositories.ts'
import type { CorpusLimits } from './limits.ts'
import type { OcrOptions } from './ocr.ts'

/** Host 可注入的引用索引（用于资料更新后计算受影响对象）。 */
export interface CorpusReferenceHooks {
  /** 引用了该文档的概念 id（文档级，变化检测用）。 */
  conceptsForDocument?(documentId: SourceId): Promise<readonly string[]> | readonly string[]
  /** 引用了该文档的活动 id（文档级）。 */
  activitiesForDocument?(documentId: SourceId): Promise<readonly string[]> | readonly string[]
  /** 精确到单元的概念 id（刷新后计算）。 */
  conceptsForUnits?(documentId: SourceId, unitIds: readonly string[]): Promise<readonly string[]> | readonly string[]
  /** 精确到单元的活动 id（刷新后计算）。 */
  activitiesForUnits?(documentId: SourceId, unitIds: readonly string[]): Promise<readonly string[]> | readonly string[]
}

/** 结构化日志回调（默认静默；Host 可接到插件日志）。 */
export type CorpusLogger = (event: {
  readonly level: 'info' | 'warn'
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}) => void

/** createCorpusService 的构造参数。 */
export interface CorpusServiceOptions {
  /** 本地存储（必填）。 */
  readonly state: LocalState
  /** 课程/资料记录仓库；省略时用 state 构造。 */
  readonly courses?: CourseRepository
  /** 学情仓库（保留给后续与学习记录联动的扩展）。 */
  readonly learning?: LearningRepository
  /** 模型客户端；课程草案需要，其余能力不需要。 */
  readonly model?: ModelClient
  /** 抽取/检索上限覆盖（测试用小上限验证截断行为）。 */
  readonly limits?: Partial<CorpusLimits>
  /** OCR 配置（默认自动探测宿主 tesseract/pdftoppm）。 */
  readonly ocr?: OcrOptions
  /** 受影响的引用索引（资料更新用）。 */
  readonly references?: CorpusReferenceHooks
  /** 日志回调。 */
  readonly logger?: CorpusLogger
}
