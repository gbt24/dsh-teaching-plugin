/**
 * 尝试独立性分类（纯函数）。
 *
 * 规则（宁可低估，不可虚报）：
 * - 没有作答内容（空答案且无选项）→ skipped：只记录接触，不产生掌握；
 * - 已展示完整答案 / 学生直接要答案 / 模型代答（Host 以 answerRevealed 或
 *   helpLevel='full-answer' 提交）→ answer-shown：不算独立证据；
 * - 使用过提示（helpLevel 1–3 或 hintsSeen 非空）→ assisted；
 * - 否则 independent。
 */
import type { AttemptIndependence, HelpExposure } from '../contracts/learning.ts'
import type { SubmitAttemptInput } from '../contracts/learning-service.ts'

/** 独立性分类结果：分类 + 实际帮助暴露 + 给学生看的说明。 */
export interface IndependenceClassification {
  readonly independence: AttemptIndependence
  readonly helpExposure: HelpExposure
  /** 不能算独立证据时给学生/审计看的诚实说明。 */
  readonly note?: string
}

/** 参与分类的最小输入（便于纯函数测试与复用）。 */
export type IndependenceInput = Pick<
  SubmitAttemptInput,
  'helpLevel' | 'hintsSeen' | 'answerRevealed' | 'answerText' | 'selectedOptionIds'
>

function cleanHints(hints: readonly string[] | undefined): string[] {
  if (hints === undefined) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const hint of hints) {
    const trimmed = hint.trim()
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/** 根据帮助暴露与作答内容分类一次尝试。 */
export function classifyIndependence(input: IndependenceInput): IndependenceClassification {
  const hints = cleanHints(input.hintsSeen)
  const hasAnswer = input.answerText.trim() !== '' || (input.selectedOptionIds?.length ?? 0) > 0
  const answerShown = input.answerRevealed || input.helpLevel === 'full-answer'
  const helpLevel = input.helpLevel
  let helpExposure: HelpExposure
  if (answerShown || helpLevel === 'full-answer') {
    helpExposure = { level: 'full-answer', answer: '' }
  } else if (helpLevel === 0) {
    helpExposure = { level: 0 }
  } else {
    helpExposure = { level: helpLevel, hints }
  }

  if (!hasAnswer) {
    return {
      independence: 'skipped',
      helpExposure,
      note: '本次未作答（跳过）：只记录接触，不产生掌握证据。',
    }
  }
  if (answerShown) {
    return {
      independence: 'answer-shown',
      helpExposure,
      note: '本次在已展示完整答案（含模型代答）后作答，不能作为独立掌握证据。',
    }
  }
  if (input.helpLevel !== 0 || hints.length > 0) {
    return {
      independence: 'assisted',
      helpExposure,
      note: `本次使用了提示（帮助层级 ${input.helpLevel}，${hints.length} 条）：记录为辅助完成，不计独立掌握。`,
    }
  }
  return { independence: 'independent', helpExposure }
}

/** 该独立性是否可能作为掌握证据（仍需验证通过）。 */
export function canCountAsEvidence(independence: AttemptIndependence): boolean {
  return independence === 'independent'
}
