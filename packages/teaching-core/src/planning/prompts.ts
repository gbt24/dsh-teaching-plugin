/**
 * 引导式课程规划提示词：/grilling 设计树访谈 + PlanBrief 生成。
 *
 * 访谈按轮次推进 design tree：每轮只问“当前 frontier”（prerequisites 已敲定
 * 的决策），每题给具体推荐答案；Host 能查到的事实不进学生问题（用 factQuery
 * 交给 Host）。提示词与 JSON 要求集中在此文件，解析在 parse.ts。
 */
import type { ModelJsonRequest, ModelRequest } from '../model/types.ts'
import type { PlanDecision, PlanRound } from '../contracts/planning.ts'
import type { LanguagePreference } from '../contracts/session.ts'
import {
  MAX_EXCLUSIONS, MAX_FINAL_ROUND_QUESTIONS, MAX_INTERVIEW_ROUNDS, MAX_OPTIONS_PER_QUESTION,
  MAX_PLAN_CHAPTERS, MAX_PLAN_GOALS, MAX_PREREQUISITES_PER_CHAPTER, MAX_QUESTIONS_PER_ROUND,
  MAX_SEARCH_TOPICS, MAX_TOPICS_PER_CHAPTER, MIN_QUESTIONS_PER_ROUND,
} from './types.ts'
import type { InterviewRequestInput, PlanBriefRequestInput } from './types.ts'

/** 访谈响应 JSON 要求（adapter 映射用；严格校验仍由 parse.ts 完成）。 */
export const INTERVIEW_JSON: ModelJsonRequest = {
  name: 'guided_planning_interview_round',
  description: '设计树访谈的一轮：只问当前 frontier，每个学生问题给推荐答案；需要事实时用 factQuery 交给 Host',
  fields: {
    questions: `[{ id: 短横线小写 id, title: 问题标题, body: 问题正文（含选项/权衡）, options?: 最多 ${MAX_OPTIONS_PER_QUESTION} 个候选答案, recommendation: 具体推荐答案, factQuery?: Host 需要代查的事实（可选，不能替代学生决策） }]，正常一轮 ${MIN_QUESTIONS_PER_ROUND}–${MAX_QUESTIONS_PER_ROUND} 个`,
    readyForPlan: 'boolean：frontier 已空/已足够制定计划时为 true；此时 questions 必须为空数组',
    decisions: '可选 [{ key, value, decidedBy: user|recommendation|fact }]：本轮已敲定的决策',
  },
}

/** PlanBrief 响应 JSON 要求。 */
export const PLAN_BRIEF_JSON: ModelJsonRequest = {
  name: 'guided_planning_brief',
  description: '根据已敲定的访谈决策生成详细、可执行的学习计划（PlanBrief）',
  fields: {
    title: '计划标题（非空）',
    goals: `学习目标数组（1–${MAX_PLAN_GOALS} 条，可检验、具体）`,
    level: '学生水平（可选，如 入门/进阶/考研）',
    background: '学生背景（可选）',
    duration: '总时长（可选，如 8 周）',
    weeklyHours: '每周投入（可选，如 每周 6 小时）',
    language: 'zh | en | bilingual',
    chapters: `[{ title, topics: string[], prerequisites?: string[] }]，1–${MAX_PLAN_CHAPTERS} 章，每章 1–${MAX_TOPICS_PER_CHAPTER} 个主题`,
    practiceStyle: '练习方式（可选，如 每章 2 道证明 + 1 个小项目）',
    exclusions: `明确不学的内容（可选，最多 ${MAX_EXCLUSIONS} 条）`,
    searchTopics: `用于检索外部资料的检索主题（1–${MAX_SEARCH_TOPICS} 条，具体、可搜索）`,
  },
}

/** 与目标语言对应的输出指令（规划模块自包含，不依赖 teaching）。 */
function languageInstruction(language: LanguagePreference): string {
  switch (language) {
    case 'en':
      return 'Write every question, recommendation and plan field in English; keep proper nouns and technical terms in their original form.'
    case 'bilingual':
      return '用双语输出：标题与关键术语保留英文，正文以中文为主；必要时中英对照。'
    default:
      return '用中文输出；关键英文术语保留原文。'
  }
}

/** 单行截断（提示词预算用）。 */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`
}

function decidedByLabel(decidedBy: PlanDecision['decidedBy']): string {
  return decidedBy === 'user' ? '学生决定' : decidedBy === 'recommendation' ? '采用推荐' : 'Host 查证'
}

/** 渲染已敲定决策（frontier 的 prerequisites）。 */
function formatDecisions(decisions: readonly PlanDecision[]): string[] {
  if (decisions.length === 0) return ['（尚未敲定任何决策；本轮应问最上游的 frontier 问题）']
  return decisions.map(decision =>
    `- ${truncate(decision.key, 80)}：${truncate(decision.value, 240)}（${decidedByLabel(decision.decidedBy)}）`)
}

/** 渲染之前轮次的问题与回答。 */
function formatRounds(rounds: readonly PlanRound[]): string[] {
  if (rounds.length === 0) return ['（尚无已完成轮次）']
  return rounds.map(round => {
    const questions = round.questions.map((question, index) =>
      `Q${index + 1}「${truncate(question.title, 80)}」`).join('；')
    const answers = (round.answers ?? []).map(answer =>
      `${truncate(answer.questionId, 40)}=${truncate(answer.answer, 120)}`).join('；')
    return `- 第 ${round.index + 1} 轮：${questions}${answers === '' ? '' : `；学生回答：${answers}`}`
  })
}

/** 渲染 Host 已查到的事实。 */
function formatFactNotes(factNotes: readonly string[] | undefined): string[] {
  if (factNotes === undefined || factNotes.length === 0) return ['（无；不要向学生询问 Host 可查询的事实）']
  return factNotes.map(note => `- ${truncate(note, 300)}`)
}

/** 把调用方传入的轮数夹到合法范围。 */
function normalizeRounds(input: Pick<InterviewRequestInput, 'roundIndex' | 'maxRounds'>): {
  readonly roundIndex: number
  readonly maxRounds: number
} {
  const rawMax = Number.isFinite(input.maxRounds) ? Math.trunc(input.maxRounds) : MAX_INTERVIEW_ROUNDS
  const maxRounds = Math.min(MAX_INTERVIEW_ROUNDS, Math.max(1, rawMax))
  const rawIndex = Number.isFinite(input.roundIndex) ? Math.trunc(input.roundIndex) : 0
  return { roundIndex: Math.max(0, rawIndex), maxRounds }
}

/** 构造一轮访谈请求（只问当前 frontier，要求严格 JSON）。 */
export function buildInterviewRequest(input: InterviewRequestInput): ModelRequest {
  const { roundIndex, maxRounds } = normalizeRounds(input)
  const exhausted = roundIndex >= maxRounds
  const finalRound = !exhausted && roundIndex + 1 >= maxRounds
  const roundLabel = `${roundIndex + 1}/${maxRounds}`

  const systemLines: string[] = [
    '你是「AI 知识库教学插件」的课程规划访谈者。你的任务是通过多轮访谈，把学生的模糊学习需求收敛成一份可执行的学习计划。',
    '',
    '## 访谈方式：设计树 / frontier（必须遵守）',
    '- 把需求想成一棵 design tree：每个 decision 分支到依赖它的 decisions。',
    '- 每轮只问当前 frontier：这些问题的 prerequisites（前置决策）已经敲定，学生现在就能回答；答案依赖本轮其它未决问题的，留到更晚轮次。',
    '- 已敲定的决策不要重复询问，也不要换个说法重问；每轮问题必须互不重叠。',
    `- 正常一轮提出 ${MIN_QUESTIONS_PER_ROUND}–${MAX_QUESTIONS_PER_ROUND} 个带编号的问题；每个问题必须给具体、可执行的推荐答案（recommendation），而不是空泛建议。`,
    '- 事实由 Host 查，不问学生：凡是文件、路径、环境、工具版本、已有资料、课程大纲等 Host 能查到的事实，不要写成问题；在相关问题里设置 factQuery（Host 查询后作为背景），问题本身仍必须是学生要做的决策。',
    '- 问题要能推进计划：围绕目标、水平、时间投入、范围取舍、章节顺序、练习方式、排除内容、评估方式等设计决策。',
    '- readyForPlan：当 frontier 已空或剩余细节不值得再问时置 true，questions 必须为空数组，访谈结束。',
    exhausted
      ? '- 已达到最大轮次：本轮不得再提问；questions 必须为空数组，readyForPlan 必须为 true。'
      : finalRound
        ? `- 这是最后一轮：最多提 ${MAX_FINAL_ROUND_QUESTIONS} 个关键确认问题；若已足够，直接 questions=[]、readyForPlan=true。`
        : `- 最多 ${maxRounds} 轮；足够时提前收束（readyForPlan=true）。`,
    '',
    '## 输出格式（严格 JSON）',
    '只输出一个 JSON 对象，不要 Markdown 代码围栏、不要解释文字：',
    '{',
    '  "questions": [',
    `    { "id": "target-level", "title": "目标水平", "body": "你希望达到什么程度？", "options": ["入门", "进阶", "考研"], "recommendation": "先按进阶目标设计，保留考研真题作为迁移练习。", "factQuery": "可选：需要 Host 代查的事实时填写" }`,
    '  ],',
    '  "readyForPlan": false,',
    '  "decisions": [{ "key": "target-level", "value": "进阶", "decidedBy": "recommendation" }]',
    '}',
    `- questions 数量：正常 ${MIN_QUESTIONS_PER_ROUND}–${MAX_QUESTIONS_PER_ROUND}；readyForPlan=true 时必须为 0；最后一轮最多 ${MAX_FINAL_ROUND_QUESTIONS} 个。`,
    '- id 用短横线小写英文；title/body/recommendation 非空；options 可选且不超过 ' + MAX_OPTIONS_PER_QUESTION + ' 个。',
    `- ${languageInstruction(input.language)}`,
  ]

  const userLines: string[] = [
    `## 规划主题`,
    truncate(input.topic, 500) || '（学生未指定主题；先问清主题与目标）',
    '',
    `## 轮次`,
    `第 ${roundLabel} 轮（roundIndex=${roundIndex}，maxRounds=${maxRounds}）`,
    '',
    '## 已敲定的设计决策（frontier 的 prerequisites；不要重复询问）',
    ...formatDecisions(input.decisions),
    '',
    '## 之前的访谈轮次（不要重复这些问题）',
    ...formatRounds(input.previousRounds),
    '',
    '## Host 已查到的事实（作为背景；不要向学生重复询问）',
    ...formatFactNotes(input.factNotes),
    '',
    '## 本轮任务',
    exhausted
      ? '已达到最大轮次：输出空 questions 与 readyForPlan=true。'
      : finalRound
        ? `最后一轮：最多 ${MAX_FINAL_ROUND_QUESTIONS} 个关键确认问题，或直接收束。`
        : `只问当前 frontier 的 ${MIN_QUESTIONS_PER_ROUND}–${MAX_QUESTIONS_PER_ROUND} 个问题，每题附推荐答案。`,
    '只输出 JSON 对象。',
  ]

  return {
    system: systemLines.join('\n'),
    messages: [{ role: 'user', text: userLines.join('\n') }],
    json: INTERVIEW_JSON,
    purpose: 'course-draft',
    language: input.language,
    maxTokens: 8192,
    temperature: 0.3,
  }
}

/** 构造 PlanBrief 生成请求。 */
export function buildPlanBriefRequest(input: PlanBriefRequestInput): ModelRequest {
  const systemLines: string[] = [
    '你是「AI 知识库教学插件」的课程规划者。根据已敲定的访谈决策，写一份详细、可执行、可核对的 PlanBrief（学习计划），供学生确认后再检索资料并生成课程结构。',
    '',
    '## 计划要求',
    '- 只使用访谈中已敲定的决策；不要引入未讨论的重大假设；信息不足时按最保守的合理默认推进，并在背景/排除项中写明。',
    '- 目标（goals）要具体、可检验（例如“能解释 X 并完成 Y 类题”），不要写“了解 X”。',
    '- 章节（chapters）按学习顺序排列，每章给具体主题（topics）；跨章依赖写进 prerequisites；难度从学生的 level/background 出发。',
    '- practiceStyle 说明练习/检验方式；exclusions 写清本次明确不学的范围。',
    '- searchTopics 是之后检索外部资料用的具体检索主题（教材名、章节、题型等），不要写空泛口号。',
    `- 上限：goals ≤ ${MAX_PLAN_GOALS}，chapters ≤ ${MAX_PLAN_CHAPTERS}，每章 topics ≤ ${MAX_TOPICS_PER_CHAPTER}，每章 prerequisites ≤ ${MAX_PREREQUISITES_PER_CHAPTER}，searchTopics ≤ ${MAX_SEARCH_TOPICS}。`,
    '- 不虚构学生没有的背景、学校、考试时间；不知道的字段省略。',
    '',
    '## 输出格式（严格 JSON）',
    '只输出一个 JSON 对象，不要 Markdown 代码围栏、不要解释文字：',
    '{',
    '  "title": "计划标题",',
    '  "goals": ["可检验目标"],',
    '  "level": "入门/进阶/考研（可选）",',
    '  "background": "学生背景（可选）",',
    '  "duration": "总时长（可选）",',
    '  "weeklyHours": "每周投入（可选）",',
    '  "language": "zh | en | bilingual",',
    '  "chapters": [{ "title": "章节标题", "topics": ["主题"], "prerequisites": ["前置"] }],',
    '  "practiceStyle": "练习方式（可选）",',
    '  "exclusions": ["明确不学的内容（可选）"],',
    '  "searchTopics": ["检索主题"]',
    '}',
    `- ${languageInstruction(input.language)}`,
  ]

  const userLines: string[] = [
    '## 规划主题',
    truncate(input.topic, 500),
    '',
    '## 已敲定的设计决策',
    ...formatDecisions(input.decisions),
    '',
    '## 访谈记录（问题与回答）',
    ...formatRounds(input.rounds),
    '',
    '## 输出',
    '按上述 JSON 结构输出完整 PlanBrief；只输出 JSON 对象。',
  ]

  return {
    system: systemLines.join('\n'),
    messages: [{ role: 'user', text: userLines.join('\n') }],
    json: PLAN_BRIEF_JSON,
    purpose: 'course-draft',
    language: input.language,
    maxTokens: 8192,
    temperature: 0.2,
  }
}
