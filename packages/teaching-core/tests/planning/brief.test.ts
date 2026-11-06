/**
 * PlanBrief 请求构造与解析测试：字段/上限校验、语言回退、可选字段截断、
 * 严格 JSON 提取与错误信息。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPlanBriefRequest, MAX_PLAN_CHAPTERS, MAX_PLAN_GOALS, MAX_SEARCH_TOPICS,
  MAX_TOPICS_PER_CHAPTER, parsePlanBrief,
} from '../../src/planning/index.ts'
import { makeBrief, makeDecision, makeRound } from './fixtures.ts'

function validBriefJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: '机器学习入门计划',
    goals: ['能解释过拟合与泛化', '能完成一次训练/验证/测试流程'],
    level: '进阶',
    background: '会 Python',
    duration: '8 周',
    weeklyHours: '每周 6 小时',
    language: 'zh',
    chapters: [
      { title: '基础与泛化', topics: ['监督学习', '过拟合'], prerequisites: [] },
      { title: '模型复杂度', topics: ['正则化'], prerequisites: ['基础与泛化'] },
    ],
    practiceStyle: '每章 2 道概念题',
    exclusions: ['不涉及框架内部实现'],
    searchTopics: ['机器学习 入门教材', '过拟合 习题'],
    ...overrides,
  }
}

describe('buildPlanBriefRequest 请求', () => {
  test('包含决策/访谈记录/JSON 结构与上限要求', () => {
    const request = buildPlanBriefRequest({
      topic: '机器学习入门',
      decisions: [makeDecision('target-level', '进阶'), makeDecision('duration', '8 周', 'recommendation')],
      rounds: [makeRound(0, [{ id: 'goal', title: '学习目标', body: '目标？', recommendation: '进阶' }], [
        { questionId: 'goal', answer: '进阶' },
      ])],
      language: 'zh',
    })
    assert.equal(request.json?.name, 'guided_planning_brief')
    assert.equal(request.purpose, 'course-draft')
    assert.equal(request.language, 'zh')
    const system = request.system ?? ''
    assert.ok(system.includes('PlanBrief'))
    assert.ok(system.includes('chapters'))
    assert.ok(system.includes('searchTopics'))
    assert.ok(system.includes(`chapters ≤ ${MAX_PLAN_CHAPTERS}`))
    assert.ok(system.includes('只输出一个 JSON 对象'))
    const user = request.messages[0]?.text ?? ''
    assert.ok(user.includes('target-level：进阶（学生决定）'))
    assert.ok(user.includes('学习目标'))
    assert.ok(user.includes('进阶'))
  })

  test('语言：en/bilingual 输出指令可区分', () => {
    const en = buildPlanBriefRequest({
      topic: 'ML', decisions: [], rounds: [], language: 'en',
    })
    assert.ok((en.system ?? '').includes('Write every question'))
    assert.equal(en.language, 'en')
    const bilingual = buildPlanBriefRequest({
      topic: 'ML', decisions: [], rounds: [], language: 'bilingual',
    })
    assert.ok((bilingual.system ?? '').includes('双语'))
  })
})

describe('parsePlanBrief 解析与校验', () => {
  test('合法 PlanBrief：保留全部字段', () => {
    const parsed = parsePlanBrief(validBriefJson())
    assert.equal(parsed.error, undefined)
    const brief = parsed.brief
    assert.ok(brief !== undefined)
    assert.equal(brief.title, '机器学习入门计划')
    assert.deepEqual(brief.goals, ['能解释过拟合与泛化', '能完成一次训练/验证/测试流程'])
    assert.equal(brief.level, '进阶')
    assert.equal(brief.background, '会 Python')
    assert.equal(brief.duration, '8 周')
    assert.equal(brief.weeklyHours, '每周 6 小时')
    assert.equal(brief.language, 'zh')
    assert.equal(brief.chapters.length, 2)
    assert.deepEqual(brief.chapters[0]?.topics, ['监督学习', '过拟合'])
    assert.deepEqual(brief.chapters[1]?.prerequisites, ['基础与泛化'])
    assert.equal(brief.practiceStyle, '每章 2 道概念题')
    assert.deepEqual(brief.exclusions, ['不涉及框架内部实现'])
    assert.deepEqual(brief.searchTopics, ['机器学习 入门教材', '过拟合 习题'])
  })

  test('支持代码围栏与解释文字；未知字段忽略', () => {
    const text = `这是计划：\n\`\`\`json\n${JSON.stringify(validBriefJson({ evil: 'x' }))}\n\`\`\`\n请确认。`
    const parsed = parsePlanBrief(text)
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.brief?.title, '机器学习入门计划')
  })

  test('language 缺失/非法时回退到 fallbackLanguage', () => {
    const missing = parsePlanBrief(validBriefJson({ language: undefined }), 'en')
    assert.equal(missing.brief?.language, 'en')
    const invalid = parsePlanBrief(validBriefJson({ language: 'fr' }), 'bilingual')
    assert.equal(invalid.brief?.language, 'bilingual')
    const defaultFallback = parsePlanBrief(validBriefJson({ language: 'fr' }))
    assert.equal(defaultFallback.brief?.language, 'zh')
  })

  test('可选字段：超长截断；非法类型忽略', () => {
    const parsed = parsePlanBrief(validBriefJson({
      level: '进'.repeat(200),
      background: '背'.repeat(1000),
      practiceStyle: '练'.repeat(600),
      levelNumber: 123,
      exclusions: Array.from({ length: 12 }, (_, index) => `排除项 ${index}`),
    }))
    assert.equal(parsed.error, undefined)
    assert.ok((parsed.brief?.level?.length ?? 0) <= 81)
    assert.ok((parsed.brief?.background?.length ?? 0) <= 601)
    assert.ok((parsed.brief?.practiceStyle?.length ?? 0) <= 301)
    assert.equal(parsed.brief?.exclusions?.length, 8)
  })

  test('缺少/非法必填字段：返回清晰错误', () => {
    const cases: readonly { readonly input: Record<string, unknown>; readonly expected: string }[] = [
      { input: validBriefJson({ title: '' }), expected: 'title' },
      { input: validBriefJson({ goals: [] }), expected: 'goals' },
      { input: validBriefJson({ goals: 'x' }), expected: 'goals' },
      { input: validBriefJson({ chapters: [] }), expected: 'chapters' },
      { input: validBriefJson({ chapters: [{ title: '章' }] }), expected: 'topics' },
      { input: validBriefJson({ chapters: [{ title: '', topics: ['a'] }] }), expected: 'title' },
      { input: validBriefJson({ chapters: [{ title: '章', topics: [] }] }), expected: 'topics' },
      { input: validBriefJson({ searchTopics: [] }), expected: 'searchTopics' },
      { input: validBriefJson({ searchTopics: 'x' }), expected: 'searchTopics' },
    ]
    for (const testCase of cases) {
      const parsed = parsePlanBrief(testCase.input)
      assert.ok(parsed.error !== undefined, JSON.stringify(testCase.input))
      assert.ok(parsed.error.includes(testCase.expected), parsed.error)
    }
  })

  test('上限校验：goals/chapters/topics/searchTopics 超限都拒绝', () => {
    const tooManyGoals = parsePlanBrief(validBriefJson({
      goals: Array.from({ length: MAX_PLAN_GOALS + 1 }, (_, index) => `目标 ${index}`),
    }))
    assert.ok(tooManyGoals.error?.includes(`不能超过 ${MAX_PLAN_GOALS}`))

    const tooManyChapters = parsePlanBrief(validBriefJson({
      chapters: Array.from({ length: MAX_PLAN_CHAPTERS + 1 }, (_, index) => ({
        title: `章 ${index}`, topics: ['主题'],
      })),
    }))
    assert.ok(tooManyChapters.error?.includes(`不能超过 ${MAX_PLAN_CHAPTERS}`))

    const tooManyTopics = parsePlanBrief(validBriefJson({
      chapters: [{
        title: '章',
        topics: Array.from({ length: MAX_TOPICS_PER_CHAPTER + 1 }, (_, index) => `主题 ${index}`),
      }],
    }))
    assert.ok(tooManyTopics.error?.includes(`不能超过 ${MAX_TOPICS_PER_CHAPTER}`))

    const tooManySearchTopics = parsePlanBrief(validBriefJson({
      searchTopics: Array.from({ length: MAX_SEARCH_TOPICS + 1 }, (_, index) => `主题 ${index}`),
    }))
    assert.ok(tooManySearchTopics.error?.includes(`不能超过 ${MAX_SEARCH_TOPICS}`))

    const tooManyPrerequisites = parsePlanBrief(validBriefJson({
      chapters: [{
        title: '章',
        topics: ['主题'],
        prerequisites: Array.from({ length: 9 }, (_, index) => `前置 ${index}`),
      }],
    }))
    assert.ok(tooManyPrerequisites.error?.includes('prerequisites'))
  })

  test('非法 JSON：返回错误而不抛异常', () => {
    const parsed = parsePlanBrief('这不是 JSON')
    assert.equal(parsed.brief, undefined)
    assert.ok(parsed.error?.includes('无法从模型输出中提取 JSON'))
  })

  test('makeBrief 夹具与解析结果一致（供后续任务复用）', () => {
    const parsed = parsePlanBrief(JSON.stringify(makeBrief()))
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.brief?.chapters.length, 2)
  })
})
