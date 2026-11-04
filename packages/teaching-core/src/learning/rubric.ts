/**
 * rubric 评价：聚合纯函数 + 可注入的模型评分器。
 *
 * - 聚合规则可单测：按 criterion weight 加权，缺项按不满足处理，达到阈值才 passed；
 * - 模型评分器只返回 AttemptValidation，不直接改掌握状态；解析失败/调用失败/超时
 *   一律降级为 `unverified` 并写清 limits（不假装通过）；
 * - assessedBy 如实标为 'model-rubric' 或 'none'。
 */
import type { ActivityPayload, RubricCriterion } from '../contracts/activity.ts'
import type { AttemptValidation, RubricScore } from '../contracts/learning.ts'
import type { SubmitAttemptInput } from '../contracts/learning-service.ts'
import type { LanguagePreference } from '../contracts/session.ts'
import type { ModelClient } from '../model/types.ts'
import { nowIso } from '../contracts/ids.ts'
import { buildRubricSystemPrompt, buildRubricUserPrompt, RUBRIC_JSON } from './prompts.ts'

/** 通过阈值：加权得分比例达到该值且无缺项。 */
export const DEFAULT_RUBRIC_THRESHOLD = 0.6

/** 从活动 payload 中取出显式 rubric（仅证明/开放题有）。 */
export function rubricFromActivityPayload(
  payload: ActivityPayload | undefined,
): readonly RubricCriterion[] | undefined {
  if (payload === undefined) return undefined
  if (payload.type === 'proof-task' || payload.type === 'open-question') return payload.rubric
  return undefined
}

/** rubric 聚合结果。 */
export interface RubricAggregate {
  /** 加权得分比例 0–1。 */
  readonly ratio: number
  readonly passed: boolean
  /** 缺失的评分项 id（按不满足处理）。 */
  readonly missingCriteria: readonly string[]
  readonly notes: readonly string[]
}

/** 聚合 rubric 分数；模型/学生给出的越界分数会被裁剪。 */
export function aggregateRubric(
  scores: readonly RubricScore[],
  criteria: readonly RubricCriterion[],
  threshold: number = DEFAULT_RUBRIC_THRESHOLD,
): RubricAggregate {
  const scoreById = new Map<string, RubricScore>()
  for (const score of scores) {
    if (!Number.isFinite(score.score) || !Number.isFinite(score.maxScore) || score.maxScore <= 0) continue
    scoreById.set(score.criterionId, score)
  }
  const missingCriteria: string[] = []
  let weighted = 0
  let totalWeight = 0
  const notes: string[] = []
  for (const criterion of criteria) {
    const weight = Number.isFinite(criterion.weight) && criterion.weight > 0 ? criterion.weight : 1
    totalWeight += weight
    const score = scoreById.get(criterion.id)
    if (score === undefined) {
      missingCriteria.push(criterion.id)
      notes.push(`评分项「${criterion.label}」缺失，按不满足处理。`)
      continue
    }
    const ratio = Math.min(1, Math.max(0, score.score / score.maxScore))
    weighted += weight * ratio
  }
  const ratio = totalWeight === 0 ? 0 : weighted / totalWeight
  const passed = missingCriteria.length === 0 && ratio >= threshold
  notes.push(`rubric 加权得分 ${(ratio * 100).toFixed(0)}%，通过阈值 ${(threshold * 100).toFixed(0)}%。`)
  return { ratio, passed, missingCriteria, notes }
}

/** 模型评分请求。 */
export interface RubricAssessmentRequest {
  readonly input: SubmitAttemptInput
  readonly rubric: readonly RubricCriterion[]
  readonly conceptTitles?: readonly string[]
}

/** Host 可注入的评分器（模型实现或测试替身）。 */
export type RubricAssessor = (request: RubricAssessmentRequest) => Promise<AttemptValidation>

/** 模型 rubric 评分器选项。 */
export interface ModelRubricAssessorOptions {
  readonly language?: LanguagePreference
  readonly maxTokens?: number
  readonly threshold?: number
}

/** 降级验证：明确“未验证”，不假装通过。 */
export function degradedValidation(reason: string): AttemptValidation {
  return {
    kind: 'unverified',
    notes: [reason],
    evidence: [],
    assessedBy: 'none',
    confidence: 'unknown',
    limits: [`${reason}；本次未自动判定通过，不计入掌握维度。`],
    createdAt: nowIso(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).flatMap(item => (typeof item === 'string' && item.trim() !== '' ? [item.trim()] : []))
}

function tryParseJsonObject(text: string): Record<string, unknown> | undefined {
  const start = text.indexOf('{')
  if (start === -1) return undefined
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (char === undefined) break
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') { inString = true; continue }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(text.slice(start, index + 1))
          return isRecord(parsed) ? parsed : undefined
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

function normalizeScores(value: unknown, criteria: readonly RubricCriterion[]): RubricScore[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(criteria.map(criterion => criterion.id))
  const scores: RubricScore[] = []
  for (const item of value.slice(0, 12)) {
    if (!isRecord(item)) continue
    const criterionId = typeof item.criterionId === 'string' ? item.criterionId : undefined
    if (criterionId === undefined || !allowed.has(criterionId)) continue
    const score = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : undefined
    if (score === undefined) continue
    const maxScore = typeof item.maxScore === 'number' && Number.isFinite(item.maxScore) && item.maxScore > 0
      ? item.maxScore
      : 10
    const note = typeof item.note === 'string' && item.note.trim() !== '' ? item.note.trim() : undefined
    scores.push({ criterionId, score, maxScore, ...(note === undefined ? {} : { note }) })
  }
  return scores
}

function normalizeConfidence(value: unknown): 'high' | 'medium' | 'low' | 'unknown' {
  return value === 'high' || value === 'medium' || value === 'low' || value === 'unknown' ? value : 'unknown'
}

/**
 * 创建基于 ModelClient 的 rubric 评分器。
 *
 * 失败路径（模型报错、超时、坏 JSON、没有可用分数）都返回 degraded 的
 * `unverified` 验证，不抛异常穿透到 Host。
 */
export function createModelRubricAssessor(
  model: ModelClient,
  options: ModelRubricAssessorOptions = {},
): RubricAssessor {
  const language = options.language ?? 'zh'
  const maxTokens = options.maxTokens ?? 2000
  const threshold = options.threshold ?? DEFAULT_RUBRIC_THRESHOLD

  return async (request: RubricAssessmentRequest): Promise<AttemptValidation> => {
    let completion
    try {
      completion = await model.complete({
        system: buildRubricSystemPrompt(),
        messages: [{
          role: 'user',
          text: buildRubricUserPrompt({
            input: request.input,
            rubric: request.rubric,
            ...(request.conceptTitles === undefined ? {} : { conceptTitles: request.conceptTitles }),
            language,
          }),
        }],
        json: RUBRIC_JSON,
        sessionId: request.input.sessionId,
        purpose: 'evaluation',
        language,
        maxTokens,
        temperature: 0,
      })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      return degradedValidation(`模型 rubric 评分调用失败：${message}`)
    }

    let parsed = completion.json !== undefined && isRecord(completion.json)
      ? completion.json
      : tryParseJsonObject(completion.text)
    if (parsed === undefined) {
      // One bounded repair call: ask for the same JSON again without prose,
      // with all newlines escaped. A second failure degrades honestly.
      let detail = completion.parseError ?? '模型没有返回可解析的 JSON'
      try {
        const repair = await model.complete({
          system: buildRubricSystemPrompt(),
          messages: [
            {
              role: 'user',
              text: buildRubricUserPrompt({
                input: request.input,
                rubric: request.rubric,
                ...(request.conceptTitles === undefined ? {} : { conceptTitles: request.conceptTitles }),
                language,
              }),
            },
            { role: 'assistant', text: completion.text.slice(0, 3000) },
            { role: 'user', text: '上一次输出不是合法 JSON。请只输出一个合法的 JSON 对象（不要代码围栏、不要解释；字符串内的换行请写成空格）。' },
          ],
          json: RUBRIC_JSON,
          sessionId: request.input.sessionId,
          purpose: 'evaluation',
          language,
          maxTokens,
          temperature: 0,
        })
        parsed = repair.json !== undefined && isRecord(repair.json)
          ? repair.json
          : tryParseJsonObject(repair.text)
        if (parsed === undefined) detail = repair.parseError ?? detail
      } catch (cause) {
        detail = cause instanceof Error ? cause.message : String(cause)
      }
      if (parsed === undefined) {
        return degradedValidation(`模型 rubric 评分输出无法解析（已尝试一次修复）：${detail}`)
      }
    }
    const scores = normalizeScores(parsed.scores, request.rubric)
    if (scores.length === 0) {
      return degradedValidation('模型 rubric 评分输出没有可用的评分项（可能字段缺失或 criterionId 不匹配）')
    }
    const aggregate = aggregateRubric(scores, request.rubric, threshold)
    const modelEvidence = asStringArray(parsed.evidence)
    const modelLimits = asStringArray(parsed.limits)
    // 模型自评的 confidence 上限为 medium：模型判断不能作为权威证据。
    const confidence = normalizeConfidence(parsed.confidence)
    const cappedConfidence: AttemptValidation['confidence'] = confidence === 'low' ? 'low' : confidence === 'unknown' ? 'unknown' : 'medium'
    const limits = [
      '由模型依据 rubric 评分，可能误判；学生可提出异议并重新检验。',
      ...modelLimits,
      ...(aggregate.missingCriteria.length === 0
        ? []
        : [`评分缺少评分项：${aggregate.missingCriteria.join('、')}；未覆盖项按不满足处理。`]),
      ...(cappedConfidence === 'low' ? ['模型对该次评分把握较低。'] : []),
    ]
    return {
      kind: 'rubric',
      passed: aggregate.passed,
      rubric: scores,
      notes: aggregate.notes,
      evidence: modelEvidence,
      assessedBy: 'model-rubric',
      confidence: cappedConfidence,
      limits,
      createdAt: nowIso(),
    }
  }
}
