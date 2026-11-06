/**
 * 引导式课程规划（guided planning）公开入口。
 *
 * Host 使用方式（示意）：
 * - 开始访谈：`buildInterviewRequest(...)` → 模型 → `parseInterviewResponse(...)`
 * - 收束计划：`buildPlanBriefRequest(...)` → 模型 → `parsePlanBrief(...)`
 * - 检索兜底：`buildSearchQueries(brief)`（模型不可用时也能得到 4–8 条查询）
 *
 * 本模块不直接调用模型、不写持久状态；契约在 contracts/planning.ts 冻结。
 */
export { buildInterviewRequest, buildPlanBriefRequest, INTERVIEW_JSON, PLAN_BRIEF_JSON } from './prompts.ts'
export { extractPlanningJson, normalizePlanTopic, parseInterviewResponse, parsePlanBrief } from './parse.ts'
export { buildSearchQueries } from './search.ts'
export {
  MAX_EXCLUSIONS, MAX_FINAL_ROUND_QUESTIONS, MAX_INTERVIEW_ROUNDS, MAX_OPTIONS_PER_QUESTION,
  MAX_PLAN_CHAPTERS, MAX_PLAN_GOALS, MAX_PREREQUISITES_PER_CHAPTER, MAX_QUESTIONS_PER_ROUND,
  MAX_SEARCH_QUERIES, MAX_SEARCH_TOPICS, MAX_TOPICS_PER_CHAPTER, MIN_QUESTIONS_PER_ROUND,
  MIN_SEARCH_QUERIES,
} from './types.ts'
export type {
  InterviewParseOptions, InterviewRequestInput, ParsedInterviewResponse, ParsedPlanBrief,
  PlanBriefRequestInput,
} from './types.ts'
