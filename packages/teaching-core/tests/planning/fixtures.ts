/**
 * planning 测试夹具：PlanBrief / PlanRound / PlanDecision 构造。
 */
import type { PlanBrief, PlanDecision, PlanRound } from '../../src/contracts/planning.ts'
import { nowIso } from '../../src/contracts/ids.ts'

/** 一个完整、合法的 PlanBrief。 */
export function makeBrief(overrides: Partial<PlanBrief> = {}): PlanBrief {
  return {
    title: '机器学习入门计划',
    goals: ['能用自己的话解释过拟合与泛化', '能独立完成一次训练/验证/测试流程'],
    level: '进阶',
    background: '会 Python，数学基础一般',
    duration: '8 周',
    weeklyHours: '每周 6 小时',
    language: 'zh',
    chapters: [
      { title: '基础与泛化', topics: ['监督学习', '训练误差与泛化误差', '验证集'], prerequisites: [] },
      { title: '模型复杂度', topics: ['偏差-方差权衡', '正则化'], prerequisites: ['基础与泛化'] },
    ],
    practiceStyle: '每章 2 道概念题 + 1 个小实验',
    exclusions: ['不涉及深度学习框架内部实现'],
    searchTopics: ['机器学习 入门教材', '过拟合 验证集 习题'],
    ...overrides,
  }
}

/** 一个访谈决策。 */
export function makeDecision(
  key: string,
  value: string,
  decidedBy: PlanDecision['decidedBy'] = 'user',
): PlanDecision {
  return { key, value, decidedBy }
}

/** 一个已完成的访谈轮次。 */
export function makeRound(
  index: number,
  questions: PlanRound['questions'],
  answers: PlanRound['answers'] = [],
): PlanRound {
  return { index, questions, answers, createdAt: nowIso() }
}
