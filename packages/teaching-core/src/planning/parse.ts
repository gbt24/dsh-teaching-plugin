/**
 * 规划模块的防御式解析：从模型输出中提取 JSON，严格校验访谈轮次与 PlanBrief。
 *
 * 原则：
 * - 模型输出不可信：允许代码围栏/前后解释，但只接受合法 JSON 对象；
 * - 校验失败返回中文 error，不抛异常穿透 Host；
 * - 访谈问题必须有推荐答案；readyForPlan=true 时不再提问；
 * - 不重复询问已敲定的 frontier（按标题查重）。
 */
import type { PlanBrief, PlanDecision, PlanQuestion } from '../contracts/planning.ts'
import type { LanguagePreference } from '../contracts/session.ts'
import {
  MAX_EXCLUSIONS, MAX_OPTIONS_PER_QUESTION, MAX_PLAN_CHAPTERS, MAX_PLAN_GOALS,
  MAX_PREREQUISITES_PER_CHAPTER, MAX_QUESTIONS_PER_ROUND, MAX_SEARCH_TOPICS, MAX_TOPICS_PER_CHAPTER,
} from './types.ts'
import type { InterviewParseOptions, ParsedInterviewResponse, ParsedPlanBrief } from './types.ts'

/* ------------------------------------------------------------------ *
 * 通用工具
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 取非空字符串并截断；空串/非字符串返回 undefined。 */
function textValue(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

/** 校验必填字符串；失败返回错误说明。 */
function requireText(value: unknown, max: number, what: string): { readonly text: string } | { readonly error: string } {
  const text = textValue(value, max)
  return text === undefined ? { error: `${what}必须是非空字符串` } : { text }
}

/** 标题查重用的归一化（忽略大小写/空白/标点/符号）。 */
export function normalizePlanTopic(text: string): string {
  return text.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

/** 从代码围栏或解释文字中提取第一个平衡的 JSON 对象/数组。 */
function findJsonCandidate(text: string): string | undefined {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenced !== null && fenced[1] !== undefined && fenced[1].trim() !== '') {
    return fenced[1].trim()
  }
  const start = text.search(/[{[]/)
  if (start === -1) return undefined
  const first = text[start]
  if (first === undefined) return undefined
  const stack: string[] = [first === '{' ? '}' : ']']
  let inString = false
  let escaped = false
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index]
    if (char === undefined) break
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{' || char === '[') {
      stack.push(char === '{' ? '}' : ']')
      continue
    }
    if (char === '}' || char === ']') {
      const expected = stack.at(-1)
      if (char !== expected) return undefined
      stack.pop()
      if (stack.length === 0) return text.slice(start, index + 1)
    }
  }
  return undefined
}

/** 把 string（可能带解释/围栏）或已解析对象统一成 JSON 值。 */
export function extractPlanningJson(input: unknown): { readonly value?: unknown; readonly error?: string } {
  if (typeof input !== 'string') {
    if (isRecord(input) || Array.isArray(input)) return { value: input }
    return { error: '模型输出不是 JSON 对象/数组' }
  }
  const direct = input.trim()
  if (direct === '') return { error: '模型输出为空' }
  try {
    return { value: JSON.parse(direct) as unknown }
  } catch {
    // 继续尝试从解释文字/代码围栏中提取。
  }
  const candidate = findJsonCandidate(input)
  if (candidate === undefined) return { error: '无法从模型输出中提取 JSON（未找到完整对象/数组）' }
  try {
    return { value: JSON.parse(candidate) as unknown }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return { error: `JSON 解析失败：${message}` }
  }
}

/* ------------------------------------------------------------------ *
 * 访谈响应
 * ------------------------------------------------------------------ */

const DECIDED_BY = new Set(['user', 'recommendation', 'fact'])

/** 校验一条 PlanQuestion；返回问题或错误。 */
function parseQuestion(
  value: unknown,
  index: number,
  seenIds: Set<string>,
  seenTitles: Set<string>,
  previousTitles: ReadonlySet<string>,
): { readonly question?: PlanQuestion; readonly error?: string } {
  if (!isRecord(value)) return { error: `questions[${index}] 必须是对象` }
  const label = `questions[${index}]`

  const id = textValue(value.id, 80)
  if (id === undefined) return { error: `${label} 缺少非空 id` }
  if (seenIds.has(id)) return { error: `${label} 的 id「${id}」重复` }
  const title = textValue(value.title, 120)
  if (title === undefined) return { error: `${label} 缺少非空 title` }
  const normalizedTitle = normalizePlanTopic(title)
  if (seenTitles.has(normalizedTitle)) return { error: `${label} 的标题「${title}」在本轮重复` }
  if (previousTitles.has(normalizedTitle)) {
    return { error: `${label} 的标题「${title}」与之前轮次重复：不要重复询问已敲定的 frontier` }
  }
  const body = textValue(value.body, 1200)
  if (body === undefined) return { error: `${label}（${title}）缺少非空 body` }

  const recommendation = textValue(value.recommendation, 600)
  const factQuery = value.factQuery === undefined ? undefined : textValue(value.factQuery, 200)
  if (recommendation === undefined) {
    if (value.factQuery !== undefined) {
      return { error: `${label}（${title}）缺少 recommendation：factQuery 不能替代学生决策问题，必须给出具体推荐答案` }
    }
    return { error: `${label}（${title}）缺少 recommendation（每个学生问题必须给出具体推荐答案）` }
  }

  let options: string[] | undefined
  if (value.options !== undefined) {
    if (!Array.isArray(value.options)) return { error: `${label}（${title}）的 options 必须是字符串数组` }
    if (value.options.length > MAX_OPTIONS_PER_QUESTION) {
      return { error: `${label}（${title}）的 options 超过 ${MAX_OPTIONS_PER_QUESTION} 个上限` }
    }
    const parsedOptions: string[] = []
    for (const item of value.options) {
      const option = textValue(item, 200)
      if (option === undefined) return { error: `${label}（${title}）的 options 含空项` }
      parsedOptions.push(option)
    }
    if (parsedOptions.length > 0) options = parsedOptions
  }
  if (value.factQuery !== undefined && factQuery === undefined) {
    return { error: `${label}（${title}）的 factQuery 必须是非空字符串` }
  }

  seenIds.add(id)
  seenTitles.add(normalizedTitle)
  return {
    question: {
      id,
      title,
      body,
      ...(options === undefined ? {} : { options }),
      recommendation,
      ...(factQuery === undefined ? {} : { factQuery }),
    },
  }
}

/** 校验决策数组。 */
function parseDecisions(value: unknown): { readonly decisions?: readonly PlanDecision[]; readonly error?: string } {
  if (!Array.isArray(value)) return { error: 'decisions 必须是数组' }
  if (value.length > 12) return { error: 'decisions 不能超过 12 条' }
  const decisions: PlanDecision[] = []
  const seenKeys = new Set<string>()
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    if (!isRecord(item)) return { error: `decisions[${index}] 必须是对象` }
    const key = textValue(item.key, 80)
    const decisionValue = textValue(item.value, 300)
    if (key === undefined) return { error: `decisions[${index}] 缺少非空 key` }
    if (decisionValue === undefined) return { error: `decisions[${index}]（${key}）缺少非空 value` }
    if (seenKeys.has(key)) return { error: `decisions 中 key「${key}」重复` }
    const decidedBy = textValue(item.decidedBy, 20)
    if (decidedBy === undefined || !DECIDED_BY.has(decidedBy)) {
      return { error: `decisions[${index}]（${key}）的 decidedBy 必须是 user/recommendation/fact` }
    }
    seenKeys.add(key)
    decisions.push({ key, value: decisionValue, decidedBy: decidedBy as PlanDecision['decidedBy'] })
  }
  return decisions.length === 0 ? {} : { decisions }
}

/** 收集需要查重的历史问题标题（之前轮次 + 额外 frontier）。 */
function previousQuestionTitles(options: InterviewParseOptions): Set<string> {
  const titles = new Set<string>()
  for (const round of options.previousRounds ?? []) {
    for (const question of round.questions) titles.add(normalizePlanTopic(question.title))
  }
  for (const question of options.previousQuestions ?? []) titles.add(normalizePlanTopic(question.title))
  return titles
}

/**
 * 解析一轮访谈响应。输入可以是 JSON 字符串（允许围栏/解释）或已解析对象。
 * 成功返回 questions/readyForPlan（及可选 decisions）；失败返回 error。
 */
export function parseInterviewResponse(
  input: unknown,
  options: InterviewParseOptions = {},
): ParsedInterviewResponse {
  const extracted = extractPlanningJson(input)
  if (extracted.error !== undefined) return { questions: [], readyForPlan: false, error: extracted.error }
  const root = extracted.value
  if (!isRecord(root)) return { questions: [], readyForPlan: false, error: '访谈响应必须是 JSON 对象' }

  if (!Array.isArray(root.questions)) {
    return { questions: [], readyForPlan: false, error: '访谈响应缺少 questions 数组' }
  }
  if (typeof root.readyForPlan !== 'boolean') {
    return { questions: [], readyForPlan: false, error: '访谈响应缺少 readyForPlan 布尔值' }
  }
  const readyForPlan = root.readyForPlan
  const maxQuestions = Math.min(
    MAX_QUESTIONS_PER_ROUND,
    Math.max(1, Number.isFinite(options.maxQuestions) ? Math.trunc(options.maxQuestions ?? MAX_QUESTIONS_PER_ROUND) : MAX_QUESTIONS_PER_ROUND),
  )
  const rawQuestions = root.questions
  if (rawQuestions.length > maxQuestions) {
    return { questions: [], readyForPlan, error: `questions 数量不能超过 ${maxQuestions}（实际 ${rawQuestions.length}）` }
  }
  if (readyForPlan && rawQuestions.length > 0) {
    return { questions: [], readyForPlan, error: 'readyForPlan=true 时 questions 必须为空数组（访谈已结束）' }
  }
  if (!readyForPlan && rawQuestions.length === 0) {
    return { questions: [], readyForPlan, error: 'questions 为空时必须标记 readyForPlan=true' }
  }

  const previousTitles = previousQuestionTitles(options)
  const seenIds = new Set<string>()
  const seenTitles = new Set<string>()
  const questions: PlanQuestion[] = []
  for (let index = 0; index < rawQuestions.length; index += 1) {
    const parsed = parseQuestion(rawQuestions[index], index, seenIds, seenTitles, previousTitles)
    if (parsed.error !== undefined) return { questions: [], readyForPlan, error: parsed.error }
    if (parsed.question !== undefined) questions.push(parsed.question)
  }

  let decisions: readonly PlanDecision[] | undefined
  if (root.decisions !== undefined) {
    const parsedDecisions = parseDecisions(root.decisions)
    if (parsedDecisions.error !== undefined) {
      return { questions: [], readyForPlan, error: parsedDecisions.error }
    }
    decisions = parsedDecisions.decisions
  }

  return {
    questions,
    readyForPlan,
    ...(decisions === undefined ? {} : { decisions }),
  }
}

/* ------------------------------------------------------------------ *
 * PlanBrief
 * ------------------------------------------------------------------ */

const LANGUAGES = new Set(['zh', 'en', 'bilingual'])

/** 校验章节数组；返回章节或错误。 */
function parseChapters(value: unknown): {
  readonly chapters?: PlanBrief['chapters']
  readonly error?: string
} {
  if (!Array.isArray(value)) return { error: 'PlanBrief 缺少 chapters 数组' }
  if (value.length === 0) return { error: 'PlanBrief 的 chapters 不能为空（至少 1 章）' }
  if (value.length > MAX_PLAN_CHAPTERS) {
    return { error: `PlanBrief 的 chapters 不能超过 ${MAX_PLAN_CHAPTERS} 章（实际 ${value.length}）` }
  }
  const chapters: PlanBrief['chapters'][number][] = []
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    if (!isRecord(item)) return { error: `chapters[${index}] 必须是对象` }
    const title = textValue(item.title, 200)
    if (title === undefined) return { error: `chapters[${index}] 缺少非空 title` }
    if (!Array.isArray(item.topics)) return { error: `chapters[${index}]（${title}）缺少 topics 数组` }
    if (item.topics.length === 0) return { error: `chapters[${index}]（${title}）的 topics 不能为空` }
    if (item.topics.length > MAX_TOPICS_PER_CHAPTER) {
      return { error: `chapters[${index}]（${title}）的 topics 不能超过 ${MAX_TOPICS_PER_CHAPTER} 个` }
    }
    const topics: string[] = []
    for (const topicValue of item.topics) {
      const topic = textValue(topicValue, 200)
      if (topic === undefined) return { error: `chapters[${index}]（${title}）的 topics 含空项` }
      topics.push(topic)
    }
    let prerequisites: string[] | undefined
    if (item.prerequisites !== undefined) {
      if (!Array.isArray(item.prerequisites)) {
        return { error: `chapters[${index}]（${title}）的 prerequisites 必须是字符串数组` }
      }
      if (item.prerequisites.length > MAX_PREREQUISITES_PER_CHAPTER) {
        return { error: `chapters[${index}]（${title}）的 prerequisites 不能超过 ${MAX_PREREQUISITES_PER_CHAPTER} 条` }
      }
      const parsedPrerequisites: string[] = []
      for (const prerequisiteValue of item.prerequisites) {
        const prerequisite = textValue(prerequisiteValue, 120)
        if (prerequisite === undefined) return { error: `chapters[${index}]（${title}）的 prerequisites 含空项` }
        parsedPrerequisites.push(prerequisite)
      }
      if (parsedPrerequisites.length > 0) prerequisites = parsedPrerequisites
    }
    chapters.push({
      title,
      topics,
      ...(prerequisites === undefined ? {} : { prerequisites }),
    })
  }
  return { chapters }
}

/** 校验字符串数组（用于 goals/searchTopics）。 */
function parseStringList(
  value: unknown,
  what: string,
  maxItems: number,
  itemMax: number,
): { readonly items?: readonly string[]; readonly error?: string } {
  if (!Array.isArray(value)) return { error: `PlanBrief 缺少 ${what} 数组` }
  if (value.length === 0) return { error: `PlanBrief 的 ${what} 不能为空` }
  if (value.length > maxItems) return { error: `PlanBrief 的 ${what} 不能超过 ${maxItems} 条（实际 ${value.length}）` }
  const items: string[] = []
  for (const item of value) {
    const text = textValue(item, itemMax)
    if (text === undefined) return { error: `PlanBrief 的 ${what} 含空项` }
    items.push(text)
  }
  return { items }
}

/**
 * 解析 PlanBrief。输入可以是 JSON 字符串（允许围栏/解释）或已解析对象；
 * language 缺失/非法时回退到 fallbackLanguage。
 */
export function parsePlanBrief(
  input: unknown,
  fallbackLanguage: LanguagePreference = 'zh',
): ParsedPlanBrief {
  const extracted = extractPlanningJson(input)
  if (extracted.error !== undefined) return { error: extracted.error }
  const root = extracted.value
  if (!isRecord(root)) return { error: 'PlanBrief 必须是 JSON 对象' }

  const title = requireText(root.title, 200, 'PlanBrief 的 title')
  if ('error' in title) return { error: title.error }

  const goals = parseStringList(root.goals, 'goals', MAX_PLAN_GOALS, 300)
  if (goals.error !== undefined) return { error: goals.error }

  const chapters = parseChapters(root.chapters)
  if (chapters.error !== undefined) return { error: chapters.error }

  const searchTopics = parseStringList(root.searchTopics, 'searchTopics', MAX_SEARCH_TOPICS, 120)
  if (searchTopics.error !== undefined) return { error: searchTopics.error }

  const languageRaw = textValue(root.language, 20)
  const language: LanguagePreference = languageRaw !== undefined && LANGUAGES.has(languageRaw)
    ? (languageRaw as LanguagePreference)
    : fallbackLanguage

  let exclusions: readonly string[] | undefined
  if (root.exclusions !== undefined) {
    if (!Array.isArray(root.exclusions)) return { error: 'PlanBrief 的 exclusions 必须是字符串数组' }
    const parsedExclusions: string[] = []
    for (const item of root.exclusions.slice(0, MAX_EXCLUSIONS)) {
      const text = textValue(item, 200)
      if (text !== undefined) parsedExclusions.push(text)
    }
    if (parsedExclusions.length > 0) exclusions = parsedExclusions
  }

  const brief: PlanBrief = {
    title: title.text,
    goals: goals.items ?? [],
    language,
    chapters: chapters.chapters ?? [],
    searchTopics: searchTopics.items ?? [],
    ...(textValue(root.level, 80) === undefined ? {} : { level: textValue(root.level, 80) }),
    ...(textValue(root.background, 600) === undefined ? {} : { background: textValue(root.background, 600) }),
    ...(textValue(root.duration, 80) === undefined ? {} : { duration: textValue(root.duration, 80) }),
    ...(textValue(root.weeklyHours, 80) === undefined ? {} : { weeklyHours: textValue(root.weeklyHours, 80) }),
    ...(textValue(root.practiceStyle, 300) === undefined ? {} : { practiceStyle: textValue(root.practiceStyle, 300) }),
    ...(exclusions === undefined ? {} : { exclusions }),
  }
  return { brief }
}
