/**
 * 检索词生成（确定性兜底）：PlanBrief → 4–8 条可搜索查询。
 *
 * 模型可以生成更聪明的检索词，但 Host 在模型失败/未配置时必须仍能继续；
 * 这里不依赖模型、不联网、结果稳定可复现。
 */
import type { PlanBrief } from '../contracts/planning.ts'
import type { LanguagePreference } from '../contracts/session.ts'
import { MAX_SEARCH_QUERIES, MIN_SEARCH_QUERIES } from './types.ts'

/** 每种语言的检索后缀（按顺序用于不同来源的种子词）。 */
const SUFFIXES: Readonly<Record<LanguagePreference, readonly string[]>> = {
  zh: ['教程', '教材 PDF', '课程讲义', '练习题', '入门资料', '进阶资料', '习题解答', '公开课'],
  en: ['tutorial', 'textbook pdf', 'lecture notes', 'practice problems', 'course materials', 'exercises', 'study guide', 'open course'],
  bilingual: [
    '教程 tutorial',
    '教材 textbook PDF',
    '课程讲义 lecture notes',
    '练习题 practice problems',
    '入门资料 beginner guide',
    '进阶资料 advanced guide',
    '习题解答 solutions',
    '公开课 open course',
  ],
}

function cleanQuery(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= 200 ? clean : clean.slice(0, 200)
}

/**
 * 由 PlanBrief 生成 4–8 条检索词。
 * 顺序稳定：searchTopics → 标题 → goals → 章节 → 标题变体补足。
 */
export function buildSearchQueries(brief: PlanBrief): string[] {
  const suffixes = SUFFIXES[brief.language] ?? SUFFIXES.zh
  const queries: string[] = []
  const seen = new Set<string>()
  const push = (query: string): void => {
    const cleaned = cleanQuery(query)
    if (cleaned === '') return
    const key = cleaned.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    queries.push(cleaned)
  }

  // 1) 检索主题（最贴近资料搜索）。
  brief.searchTopics.slice(0, 4).forEach((topic, index) => {
    push(`${topic} ${suffixes[index % suffixes.length] ?? suffixes[0] ?? ''}`)
  })
  // 2) 计划标题。
  push(`${brief.title} ${suffixes[0] ?? ''}`)
  // 3) 学习目标（最多 2 条）。
  brief.goals.slice(0, 2).forEach((goal, index) => {
    push(`${goal} ${suffixes[(index + 2) % suffixes.length] ?? suffixes[0] ?? ''}`)
  })
  // 4) 章节标题（最多 2 章）。
  brief.chapters.slice(0, 2).forEach((chapter, index) => {
    push(`${chapter.title} ${suffixes[(index + 1) % suffixes.length] ?? suffixes[0] ?? ''}`)
  })
  // 5) 去重后不足最小数量时，用标题 + 不同后缀补足。
  for (const suffix of suffixes) {
    if (queries.length >= MIN_SEARCH_QUERIES) break
    push(`${brief.title} ${suffix}`)
  }
  return queries.slice(0, MAX_SEARCH_QUERIES)
}
