/**
 * 引导式课程规划（guided planning）内部类型与上限。
 *
 * 对外契约在 contracts/planning.ts（CoursePlan/PlanQuestion/PlanBrief…），
 * 本模块只负责：访谈请求构造、模型 JSON 的防御式解析、PlanBrief 校验与
 * 检索词生成。所有函数可单测，不直接调用模型、不写持久状态。
 */
import type { PlanBrief, PlanDecision, PlanQuestion, PlanRound } from '../contracts/planning.ts'
import type { LanguagePreference } from '../contracts/session.ts'

/** 访谈最多轮数（含第一轮）；达到后必须收束为 readyForPlan。 */
export const MAX_INTERVIEW_ROUNDS = 5

/** 每轮学生决策问题的数量范围。 */
export const MIN_QUESTIONS_PER_ROUND = 3
export const MAX_QUESTIONS_PER_ROUND = 6

/** 单个问题的选项上限（自由文本始终允许）。 */
export const MAX_OPTIONS_PER_QUESTION = 6
/** 最后一轮最多保留的关键确认问题数。 */
export const MAX_FINAL_ROUND_QUESTIONS = 2

/** PlanBrief 各字段的合理上限。 */
export const MAX_PLAN_GOALS = 8
export const MAX_PLAN_CHAPTERS = 12
export const MAX_TOPICS_PER_CHAPTER = 15
export const MAX_PREREQUISITES_PER_CHAPTER = 8
export const MAX_EXCLUSIONS = 8
export const MAX_SEARCH_TOPICS = 12

/** 检索词数量范围。 */
export const MIN_SEARCH_QUERIES = 4
export const MAX_SEARCH_QUERIES = 8

/** 构造访谈请求所需输入。 */
export interface InterviewRequestInput {
  readonly topic: string
  readonly language: LanguagePreference
  /** 当前轮次下标，从 0 开始。 */
  readonly roundIndex: number
  /** 调用方允许的最大轮数；模块会夹到 1..MAX_INTERVIEW_ROUNDS。 */
  readonly maxRounds: number
  /** 已敲定的设计决策（frontier 的 prerequisites）。 */
  readonly decisions: readonly PlanDecision[]
  /** 之前的访谈轮次（含问题与学生回答）。 */
  readonly previousRounds: readonly PlanRound[]
  /** Host 已替学生查到的环境/资料事实（作为背景注入，不要向学生重复询问）。 */
  readonly factNotes?: readonly string[]
}

/** 解析访谈响应时可选的上下文（用于查重与上限收紧）。 */
export interface InterviewParseOptions {
  /** 之前轮次；用于拒绝重复询问已问过的话题。 */
  readonly previousRounds?: readonly PlanRound[]
  /** 额外需要查重的历史问题（例如 frontier 中尚未回答的问题）。 */
  readonly previousQuestions?: readonly PlanQuestion[]
  /** 本轮问题数量上限，默认 MAX_QUESTIONS_PER_ROUND。 */
  readonly maxQuestions?: number
}

/** 访谈响应解析结果：成功时给出 questions/readyForPlan，失败时只给 error。 */
export interface ParsedInterviewResponse {
  readonly questions: readonly PlanQuestion[]
  readonly readyForPlan: boolean
  readonly decisions?: readonly PlanDecision[]
  readonly error?: string
}

/** 构造 PlanBrief 请求所需输入。 */
export interface PlanBriefRequestInput {
  readonly topic: string
  readonly decisions: readonly PlanDecision[]
  readonly rounds: readonly PlanRound[]
  readonly language: LanguagePreference
}

/** PlanBrief 解析结果。 */
export interface ParsedPlanBrief {
  readonly brief?: PlanBrief
  readonly error?: string
}
