/**
 * 掌握证据与等级推导（纯函数）。
 *
 * 原则（对应 R18/R28、AC08）：
 * - 只有「独立完成 + 验证通过」的尝试才贡献掌握维度；跳过、看答案、辅助完成、
 *   模型代答、单次“懂了”自述都不贡献；
 * - 维度证据只增不减（保留历史），等级由多维度覆盖与多次独立通过证据推导；
 * - 单次证据不轻易 mastered；存在未解决争议或资料待复核时等级封顶 checked；
 * - 每条记录保留依据尝试 id、维度覆盖与未覆盖项，学生可追溯。
 */
import type {
  LearningAttempt, MasteryDimensions, MasteryDispute, MasteryLevel, MasteryRecord,
  AttemptValidation,
} from '../contracts/learning.ts'
import type { ConceptId, CourseId, CourseRevisionId } from '../contracts/ids.ts'
import { newId } from '../contracts/ids.ts'

/** 四个掌握维度（顺序固定，便于展示与测试）。 */
export const DIMENSION_KEYS = ['explain', 'conditions', 'variants', 'transfer'] as const

/** 维度中文标签（uncovered/basis 里使用，学生可读）。 */
export const DIMENSION_LABELS: Readonly<Record<keyof MasteryDimensions, string>> = {
  explain: 'explain（用自己的话解释）',
  conditions: 'conditions（条件/反例）',
  variants: 'variants（独立变式）',
  transfer: 'transfer（新情境迁移）',
}

/** 全零维度（新记录起点）。 */
export function emptyDimensions(): MasteryDimensions {
  return { explain: 0, conditions: 0, variants: 0, transfer: 0 }
}

/** 合并维度证据：只取更大的覆盖值，历史证据不会因新尝试而丢失。 */
export function mergeDimensions(
  current: MasteryDimensions,
  evidence: Partial<MasteryDimensions>,
): MasteryDimensions {
  return {
    explain: Math.max(current.explain, evidence.explain ?? 0),
    conditions: Math.max(current.conditions, evidence.conditions ?? 0),
    variants: Math.max(current.variants, evidence.variants ?? 0),
    transfer: Math.max(current.transfer, evidence.transfer ?? 0),
  }
}

/** 已覆盖维度数。 */
export function coveredDimensionCount(dimensions: MasteryDimensions): number {
  return DIMENSION_KEYS.filter(key => dimensions[key] > 0).length
}

/** rubric 评分项 id/标签到掌握维度的关键词映射。 */
const RUBRIC_DIMENSION_PATTERNS: readonly {
  readonly dimension: keyof MasteryDimensions
  readonly pattern: RegExp
}[] = [
  { dimension: 'explain', pattern: /explain|解释|表述|复述|自己的话|概念理解/i },
  { dimension: 'conditions', pattern: /condition|前提|条件|反例|counter|边界|适用|区分/i },
  { dimension: 'variants', pattern: /variant|变式|solve|解题|步骤|计算|procedure/i },
  { dimension: 'transfer', pattern: /transfer|迁移|新情境|应用|apply|综合|unseen/i },
]

/**
 * 一次尝试能贡献哪些掌握维度（0/1 覆盖值）。
 * 非独立尝试或未通过验证一律不贡献。
 */
export function attemptDimensionEvidence(
  attempt: LearningAttempt,
  validation: AttemptValidation | undefined,
): Partial<MasteryDimensions> {
  if (attempt.independence !== 'independent') return {}
  if (validation === undefined || validation.passed !== true) return {}
  switch (validation.kind) {
    case 'quiz':
      return { conditions: 1, variants: 1 }
    case 'objective':
      return { variants: 1 }
    case 'open': {
      // 开放/证明题的判断必须如实标注评价来源；无来源的“通过”不算证据。
      if (validation.assessedBy !== 'model-rubric' && validation.assessedBy !== 'objective-runner') return {}
      return { explain: 1, transfer: 1 }
    }
    case 'rubric': {
      if (validation.assessedBy !== 'model-rubric' && validation.assessedBy !== 'objective-runner') return {}
      const dims = new Set<keyof MasteryDimensions>()
      for (const score of validation.rubric ?? []) {
        if (!Number.isFinite(score.score) || !Number.isFinite(score.maxScore) || score.maxScore <= 0) continue
        if (score.score / score.maxScore < 0.6) continue
        for (const entry of RUBRIC_DIMENSION_PATTERNS) {
          if (entry.pattern.test(score.criterionId)) dims.add(entry.dimension)
        }
      }
      // rubric 未按维度命名时，保守按「解释 + 条件」处理（证明/开放题常见覆盖）。
      if (dims.size === 0) return { explain: 1, conditions: 1 }
      return {
        ...(dims.has('explain') ? { explain: 1 } : {}),
        ...(dims.has('conditions') ? { conditions: 1 } : {}),
        ...(dims.has('variants') ? { variants: 1 } : {}),
        ...(dims.has('transfer') ? { transfer: 1 } : {}),
      }
    }
    default:
      return {}
  }
}

/** 掌握等级推导所需输入。 */
export interface DeriveMasteryInput {
  readonly attempts: readonly LearningAttempt[]
  readonly dimensions: MasteryDimensions
  readonly disputes?: readonly MasteryDispute[]
  readonly needsRecheck?: boolean
}

/** 是否存在未解决争议。 */
export function hasOpenDispute(disputes: readonly MasteryDispute[] | undefined): boolean {
  return (disputes ?? []).some(dispute => dispute.status === 'open' || dispute.status === 'recheck-due')
}

/**
 * 推导掌握等级：
 * unseen（无尝试）→ exposed（只有接触/辅助/看答案）→ practiced（有独立尝试但未通过）
 * → checked（独立通过但维度/次数不足或存在争议）→ mastered（四维覆盖 + ≥2 次独立通过证据）。
 */
export function deriveMasteryLevel(input: DeriveMasteryInput): MasteryLevel {
  const { attempts, dimensions } = input
  if (attempts.length === 0) return 'unseen'
  const independentAttempts = attempts.filter(attempt => attempt.independence === 'independent')
  if (independentAttempts.length === 0) return 'exposed'
  // 只有真正贡献维度证据的独立通过尝试才算“有效证据”。
  const credited = independentAttempts.filter(attempt =>
    Object.keys(attemptDimensionEvidence(attempt, attempt.validation)).length > 0)
  if (credited.length === 0) return 'practiced'
  if (coveredDimensionCount(dimensions) < DIMENSION_KEYS.length) return 'checked'
  if (credited.length < 2) return 'checked'
  if (input.needsRecheck === true) return 'checked'
  if (hasOpenDispute(input.disputes)) return 'checked'
  return 'mastered'
}

/** 一次尝试的审计描述（写入 basis）。 */
export function attemptBasisLine(attempt: LearningAttempt): string {
  const independence = attempt.independence === 'independent'
    ? '独立完成'
    : attempt.independence === 'assisted'
      ? '辅助完成'
      : attempt.independence === 'answer-shown' ? '已展示完整答案后作答' : '跳过未作答'
  const validation = attempt.validation
  let verdict = '未验证'
  if (validation !== undefined) {
    verdict = validation.passed === true
      ? `${validation.kind} 验证通过`
      : validation.passed === false ? `${validation.kind} 验证未通过` : `${validation.kind} 未判定`
  }
  const evidence = attemptDimensionEvidence(attempt, validation)
  const dims = Object.keys(evidence)
  return `尝试 ${attempt.id}：${independence}；${verdict}${dims.length === 0 ? '' : `；贡献维度 ${dims.join('/')}`}。`
}

/** 构造掌握记录所需输入。 */
export interface BuildMasteryRecordInput {
  readonly existing?: MasteryRecord
  readonly courseId: CourseId
  readonly courseRevisionId: CourseRevisionId
  readonly conceptId: ConceptId
  /** 该概念的全部尝试（含本次），按时间升序。 */
  readonly attempts: readonly LearningAttempt[]
  readonly now: string
}

/**
 * 由该概念的全部尝试重建/更新掌握记录。
 * 维度只增不减；basis 保留历史审计行并追加新的尝试依据与当前判定。
 */
export function buildMasteryRecord(input: BuildMasteryRecordInput): MasteryRecord {
  const { existing, attempts, now } = input
  let dimensions = existing?.dimensions ?? emptyDimensions()
  for (const attempt of attempts) {
    dimensions = mergeDimensions(dimensions, attemptDimensionEvidence(attempt, attempt.validation))
  }
  const independentPassed = attempts.filter(attempt =>
    attempt.independence === 'independent'
    && Object.keys(attemptDimensionEvidence(attempt, attempt.validation)).length > 0)
  const uncoveredKeys = DIMENSION_KEYS.filter(key => dimensions[key] <= 0)
  const uncovered = uncoveredKeys.map(key => DIMENSION_LABELS[key])
  const disputes = existing?.disputes ?? []
  const needsRecheck = existing?.needsRecheck
  const level = deriveMasteryLevel({ attempts, dimensions, disputes, ...(needsRecheck === undefined ? {} : { needsRecheck }) })

  const existingIds = new Set(existing?.evidenceAttemptIds ?? [])
  const notes = (existing?.basis ?? []).filter(line => !line.startsWith('判定：'))
  for (const attempt of attempts) {
    if (existingIds.has(attempt.id)) continue
    notes.push(attemptBasisLine(attempt))
  }
  const coveredKeys = DIMENSION_KEYS.filter(key => dimensions[key] > 0)
  notes.push([
    `判定：${level}`,
    `独立通过证据 ${independentPassed.length} 条`,
    `维度覆盖 ${coveredKeys.length}/4${coveredKeys.length === 0 ? '' : `（${coveredKeys.join('/')}）`}`,
    uncoveredKeys.length === 0 ? '维度已全覆盖' : `未覆盖：${uncoveredKeys.join('/')}`,
    needsRecheck === true ? '资料变化待复核' : '',
    hasOpenDispute(disputes) ? '存在未解决争议，等级封顶 checked' : '',
  ].filter(part => part !== '').join('；') + '。')

  const record: MasteryRecord = {
    id: existing?.id ?? newId('mst'),
    courseId: input.courseId,
    courseRevisionId: input.courseRevisionId,
    conceptId: input.conceptId,
    level,
    dimensions,
    evidenceAttemptIds: attempts.map(attempt => attempt.id),
    basis: notes.slice(-14),
    uncovered,
    disputes,
    updatedAt: now,
    ...(needsRecheck === undefined ? {} : { needsRecheck }),
  }
  return record
}

/** 错题判定：有验证结论且未通过（跳过的尝试没有验证，不算错题）。 */
export function isFailedAttempt(attempt: LearningAttempt): boolean {
  return attempt.validation?.passed === false
}

/** 错题列表（Host 可直接用于「错题本」视图）。 */
export function failedAttempts(attempts: readonly LearningAttempt[]): LearningAttempt[] {
  return attempts.filter(isFailedAttempt)
}
