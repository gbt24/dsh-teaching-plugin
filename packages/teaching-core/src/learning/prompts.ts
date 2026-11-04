/**
 * 学情模块提示词：模型 rubric 评分。
 *
 * 评分提示要求模型逐项引用学生原话/步骤，并保留局限；模型评分永远不是
 * 权威结论（assessedBy='model-rubric'、confidence 有上限、limits 必须展示）。
 */
import type { RubricCriterion } from '../contracts/activity.ts'
import type { SubmitAttemptInput } from '../contracts/learning-service.ts'
import type { LanguagePreference } from '../contracts/session.ts'
import type { ModelJsonRequest } from '../model/types.ts'

/** rubric 评分的 JSON 要求。 */
export const RUBRIC_JSON: ModelJsonRequest = {
  name: 'rubric_assessment',
  description: '按 rubric 逐项评价学生作答；每项 0–10 分并引用学生原文/步骤',
  fields: {
    scores: '[{criterionId: rubric 中的 id, score: 0–10 的数字, note: 评分理由，引用学生原话或步骤}]',
    evidence: '字符串数组：支持评分的具体证据（学生原话/步骤/缺失项）',
    limits: '字符串数组：本次评分的局限（例如学生只写了结论、答案模糊）',
    confidence: 'high | medium | low | unknown（对该次评分的把握，不能替代证据）',
  },
}

/** rubric 评分系统提示。 */
export function buildRubricSystemPrompt(): string {
  return [
    '你是课程助教中的评分者。你的任务是按给定的 rubric 逐项评价学生作答，而不是重新讲解。',
    '要求：',
    '1. 只依据学生答案文本评分；不要替学生补全没写的推理。',
    '2. 每项评分必须引用学生原话/步骤作为理由；明显缺失就给低分，不要因为“意思接近”而虚高。',
    '3. 区分「写错了」和「没写/写不清」：没写的内容不算满足标准。',
    '4. 如果答案不足以评分，就如实给低分并在 limits 中说明，不要猜测。',
    '5. 你的评分只是模型判断，不是权威结论；请写出本次评分的局限。',
    '6. 只输出一个 JSON 对象，不要代码围栏，不要输出额外文字。',
  ].join('\n')
}

/** rubric 评分用户提示。 */
export function buildRubricUserPrompt(params: {
  readonly input: SubmitAttemptInput
  readonly rubric: readonly RubricCriterion[]
  readonly conceptTitles?: readonly string[]
  readonly language: LanguagePreference
}): string {
  const { input, rubric, conceptTitles, language } = params
  const languageLine = language === 'en'
    ? '评分理由用英文书写。'
    : language === 'bilingual' ? '评分理由用双语：中文为主，可附英文术语。' : '评分理由用中文。'
  const criteria = rubric.map(criterion => [
    `- id: ${criterion.id}`,
    `  label: ${criterion.label}`,
    `  weight: ${criterion.weight}`,
    ...(criterion.description === undefined ? [] : [`  description: ${criterion.description}`]),
    ...(criterion.observable === undefined ? [] : [`  observable: ${criterion.observable}`]),
  ].join('\n')).join('\n')
  return [
    `涉及概念：${conceptTitles === undefined || conceptTitles.length === 0 ? '（未提供）' : conceptTitles.join('、')}`,
    `题目/要求：${input.prompt}`,
    `学生作答（原文，未改写）：`,
    '```',
    input.answerText,
    '```',
    input.selfReport === undefined ? '' : `学生自评：${input.selfReport}（仅供参考，不能作为评分依据）`,
    `评分标准（rubric）：`,
    criteria,
    languageLine,
    '请输出 JSON：{"scores":[{"criterionId":"...","score":0-10,"note":"..."}],"evidence":["..."],"limits":["..."],"confidence":"medium"}',
  ].filter(line => line !== '').join('\n')
}
