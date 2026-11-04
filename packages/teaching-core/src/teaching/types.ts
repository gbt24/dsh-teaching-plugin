/**
 * teaching 模块内部类型：教学策略选择结果与模型结构化元数据。
 *
 * 这些类型不进入跨模块契约（contracts/ 冻结），只服务 TeachingService 的
 * 实现与单元测试。对外仍只暴露 `TeachingService` 契约。
 */
import type { ActivityKind } from '../contracts/activity.ts'
import type { SourceAnchor } from '../contracts/source.ts'
import type {
  LanguagePreference, LearningStage, TeachingTurnMeta,
} from '../contracts/session.ts'

/** 讲解形式；由目标/基础/概念/学情/学生要求共同选择，不是固定模板。 */
export type TeachingForm =
  | 'intuition-first'
  | 'formal'
  | 'worked-example'
  | 'socratic'
  | 'visual'
  | 'code-experiment'
  | 'reading-guided'
  | 'concept-contrast'
  | 'open-argument'
  | 'diagnosis'
  | 'review'
  | 'answer-first'

/** 任务形态：不同学科/题型适配不同讲解骨架。 */
export type TaskShape =
  | 'concept'
  | 'proof'
  | 'procedure'
  | 'reading'
  | 'contrast'
  | 'open-argument'
  | 'problem-set'

/** 一轮教学计划（纯函数产物，可单测）。 */
export interface TeachingPlan {
  readonly form: TeachingForm
  readonly taskShape: TaskShape
  /** 为什么选择该形式（写进提示，便于学生理解与审计）。 */
  readonly formReason: string
  /** 建议的讲解骨架，按顺序展示。 */
  readonly outline: readonly string[]
  readonly language: LanguagePreference
  /** 建议的活动类型；模型可提出兼容的其它类型。 */
  readonly activityKindHint: ActivityKind
  /** 学生切换形式时是否必须保留原目标与进度。 */
  readonly keepGoal: boolean
  /** 本轮是否应先诊断再讲解。 */
  readonly diagnosisFirst: boolean
}

/** 提示词里给课程资料编号（M1、M2…），回填引用时只认这些真实对象。 */
export interface MaterialRefView {
  readonly refId: string
  readonly documentTitle: string
  readonly label: string
  readonly locator: string
  readonly excerpt: string
  readonly confidence: string
  readonly anchor: SourceAnchor
}

/** 提示词里给跨课程引用编号（C1、C2…）。 */
export interface CrossCourseRefView {
  readonly refId: string
  readonly courseTitle: string
  readonly reason: string
  readonly anchors: readonly SourceAnchor[]
}

/** 提示词里给外部检索结果编号（W1、W2…）。 */
export interface WebRefView {
  readonly refId: string
  readonly title: string
  readonly url: string
  readonly snippet: string
}

/** 模型声明的证据使用情况；引用编号由引擎回填为真实 EvidenceReference。 */
export interface ParsedEvidenceMeta {
  readonly usedMaterialRefs?: readonly string[]
  readonly usedCrossCourseRefs?: readonly string[]
  readonly usedWebRefs?: readonly string[]
  readonly usedModelKnowledge?: boolean
  readonly derivations?: readonly {
    readonly label?: string
    readonly premises?: readonly string[]
  }[]
}

/** 资料冲突：约定差异与实质错误必须分开呈现。 */
export interface ParsedConflict {
  readonly kind: 'convention' | 'substantive' | 'unresolved'
  readonly summary: string
  readonly basisRefs?: readonly string[]
}

/** 模型返回的结构化教学元数据（解析并清洗后）。 */
export interface ParsedTurnMeta {
  readonly intent?: TeachingTurnMeta['intent']
  readonly stage?: LearningStage
  readonly conceptIds?: readonly string[]
  readonly requestedForm?: string
  readonly nextActions?: readonly { readonly id: string; readonly label: string }[]
  readonly uncertainty?: readonly string[]
  readonly evidence?: ParsedEvidenceMeta
  readonly conflicts?: readonly ParsedConflict[]
  /** 原始活动提案；由 normalizeActivityProposal 校验后再交给 Host。 */
  readonly activity?: unknown
  readonly diagnosis?: {
    readonly misconception?: string
    readonly evidence?: string
    readonly nextStep?: string
  }
}

/** 流式拆分结果：正文 + 尾部元数据文本。 */
export interface SplitTurnOutput {
  readonly body: string
  readonly metadataText?: string
  /** 元数据在完整文本中的起始下标；用于判断是否已经被流式发给学生。 */
  readonly metadataStart?: number
}

/** TeachingService 的可选配置（提示预算、时钟）。 */
export interface TeachingServiceOptions {
  /** 单轮最多展示几条课程资料。 */
  readonly maxMaterial?: number
  /** 最近对话保留条数。 */
  readonly maxHistory?: number
  /** 每条资料摘录截断字符数。 */
  readonly excerptChars?: number
  readonly maxCrossCourse?: number
  readonly maxWebResults?: number
  /** 单轮回复 token 上限（质量优先，不做无限重试）。 */
  readonly maxTokens?: number
  readonly temperature?: number
  /** 可注入时钟，便于测试引用 accessedAt。 */
  readonly clock?: () => string
}
