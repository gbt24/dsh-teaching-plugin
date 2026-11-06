/**
 * 访谈请求构造与解析测试：frontier/决策注入、最大轮数、事实查询、严格 JSON
 * 校验（数量/唯一性/推荐答案/重复话题/选项上限）与错误信息。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInterviewRequest, MAX_INTERVIEW_ROUNDS, MAX_QUESTIONS_PER_ROUND, parseInterviewResponse,
} from '../../src/planning/index.ts'
import type { InterviewRequestInput } from '../../src/planning/index.ts'
import type { PlanQuestion, PlanRound } from '../../src/contracts/planning.ts'
import { makeDecision, makeRound } from './fixtures.ts'

function baseInput(overrides: Partial<InterviewRequestInput> = {}): InterviewRequestInput {
  return {
    topic: '机器学习入门',
    language: 'zh',
    roundIndex: 0,
    maxRounds: MAX_INTERVIEW_ROUNDS,
    decisions: [],
    previousRounds: [],
    ...overrides,
  }
}

function question(id: string, title: string, overrides: Partial<PlanQuestion> = {}): PlanQuestion {
  return {
    id,
    title,
    body: `${title}的具体选择是什么？`,
    recommendation: `推荐先按「${title}」的常见默认值设计。`,
    ...overrides,
  }
}

function roundOf(index: number, questions: readonly PlanQuestion[]): PlanRound {
  return makeRound(index, questions, questions.map(item => ({ questionId: item.id, answer: '已确认' })))
}

describe('buildInterviewRequest 访谈请求', () => {
  test('基本结构：严格 JSON 要求、frontier/factQuery/推荐答案规则、主题与轮次', () => {
    const request = buildInterviewRequest(baseInput())
    assert.equal(request.json?.name, 'guided_planning_interview_round')
    assert.equal(request.purpose, 'course-draft')
    assert.equal(request.language, 'zh')
    assert.equal(request.messages.length, 1)
    const system = request.system ?? ''
    assert.ok(system.includes('frontier'))
    assert.ok(system.includes('design tree'))
    assert.ok(system.includes('factQuery'))
    assert.ok(system.includes('recommendation'))
    assert.ok(system.includes('readyForPlan'))
    assert.ok(system.includes('只输出一个 JSON 对象'))
    const user = request.messages[0]?.text ?? ''
    assert.ok(user.includes('机器学习入门'))
    assert.ok(user.includes('第 1/5 轮'))
    assert.ok(user.includes('尚未敲定任何决策'))
  })

  test('frontier 只基于已敲定决策：注入 decisions 与之前轮次，要求不要重复询问', () => {
    const request = buildInterviewRequest(baseInput({
      roundIndex: 1,
      decisions: [
        makeDecision('target-level', '考研 140+'),
        makeDecision('duration', '12 周', 'recommendation'),
      ],
      previousRounds: [roundOf(0, [question('goal', '学习目标'), question('time', '时间投入')])],
    }))
    const system = request.system ?? ''
    const user = request.messages[0]?.text ?? ''
    assert.ok(system.includes('已敲定的决策不要重复询问'))
    assert.ok(system.includes('frontier'))
    assert.ok(user.includes('target-level：考研 140+（学生决定）'))
    assert.ok(user.includes('duration：12 周（采用推荐）'))
    assert.ok(user.includes('学习目标'))
    assert.ok(user.includes('学生回答'))
    assert.ok(user.includes('第 2/5 轮'))
  })

  test('最大轮数被夹到 5；最后一轮与超限轮次给出收束指令', () => {
    const clamped = buildInterviewRequest(baseInput({ maxRounds: 99 }))
    assert.ok((clamped.system ?? '').includes(`最多 ${MAX_INTERVIEW_ROUNDS} 轮`))
    assert.ok((clamped.messages[0]?.text ?? '').includes(`maxRounds=${MAX_INTERVIEW_ROUNDS}`))

    const finalRound = buildInterviewRequest(baseInput({ roundIndex: 4, maxRounds: 5 }))
    assert.ok((finalRound.system ?? '').includes('这是最后一轮'))
    assert.ok((finalRound.system ?? '').includes('最多提 2 个关键确认问题'))

    const exhausted = buildInterviewRequest(baseInput({ roundIndex: 5, maxRounds: 5 }))
    assert.ok((exhausted.system ?? '').includes('已达到最大轮次'))
    assert.ok((exhausted.system ?? '').includes('questions 必须为空数组'))
    assert.ok((exhausted.messages[0]?.text ?? '').includes('输出空 questions'))
  })

  test('Host 已查到的事实作为背景注入，并明确不要向学生重复询问', () => {
    const request = buildInterviewRequest(baseInput({
      factNotes: ['本机 Python 3.15.2，无 GPU', '资料库已有《机器学习》教材 PDF'],
    }))
    const user = request.messages[0]?.text ?? ''
    assert.ok(user.includes('本机 Python 3.15.2，无 GPU'))
    assert.ok(user.includes('资料库已有《机器学习》教材 PDF'))
    assert.ok(user.includes('不要向学生重复询问'))
    assert.ok((request.system ?? '').includes('不要写成问题'))
  })

  test('语言：en 使用英文输出指令，bilingual 使用双语指令', () => {
    const en = buildInterviewRequest(baseInput({ language: 'en' }))
    assert.ok((en.system ?? '').includes('Write every question'))
    assert.equal(en.language, 'en')
    const bilingual = buildInterviewRequest(baseInput({ language: 'bilingual' }))
    assert.ok((bilingual.system ?? '').includes('双语'))
  })
})

describe('parseInterviewResponse 防御式解析', () => {
  test('合法响应（含围栏/解释文字）：解析问题、推荐答案、选项与 factQuery', () => {
    const response = parseInterviewResponse([
      '好的，这是本轮问题：',
      '```json',
      JSON.stringify({
        questions: [
          {
            id: 'goal',
            title: '学习目标',
            body: '你希望达到什么程度？',
            options: ['入门', '进阶', '考研'],
            recommendation: '先按进阶目标设计，保留考研真题作为迁移练习。',
            factQuery: '本机是否已安装 Python',
          },
          {
            id: 'time',
            title: '时间投入',
            body: '每周能投入多少小时？',
            recommendation: '按每周 6 小时设计，留出 2 小时弹性。',
          },
        ],
        readyForPlan: false,
        decisions: [{ key: 'target-level', value: '进阶', decidedBy: 'recommendation' }],
      }),
      '```',
    ].join('\n'))
    assert.equal(response.error, undefined)
    assert.equal(response.readyForPlan, false)
    assert.equal(response.questions.length, 2)
    assert.equal(response.questions[0]?.id, 'goal')
    assert.deepEqual(response.questions[0]?.options, ['入门', '进阶', '考研'])
    assert.equal(response.questions[0]?.factQuery, '本机是否已安装 Python')
    assert.equal(response.questions[1]?.recommendation, '按每周 6 小时设计，留出 2 小时弹性。')
    assert.deepEqual(response.decisions, [{ key: 'target-level', value: '进阶', decidedBy: 'recommendation' }])
  })

  test('readyForPlan=true 且 questions 为空：提前收束合法', () => {
    const response = parseInterviewResponse({
      questions: [],
      readyForPlan: true,
      decisions: [{ key: 'scope', value: '只学基础', decidedBy: 'user' }],
    })
    assert.equal(response.error, undefined)
    assert.equal(response.readyForPlan, true)
    assert.equal(response.questions.length, 0)
  })

  test('非法 JSON / 缺少字段 / 类型错误：返回清晰错误而不抛异常', () => {
    const cases: readonly { readonly input: unknown; readonly expected: string }[] = [
      { input: '这不是 JSON', expected: '无法从模型输出中提取 JSON' },
      { input: '{ "questions": [', expected: 'JSON' },
      { input: { questions: [], readyForPlan: false }, expected: '必须标记 readyForPlan=true' },
      { input: { questions: [] }, expected: 'readyForPlan' },
      { input: { readyForPlan: true }, expected: 'questions' },
      { input: { questions: 'x', readyForPlan: false }, expected: 'questions 数组' },
    ]
    for (const testCase of cases) {
      const response = parseInterviewResponse(testCase.input)
      assert.ok(response.error !== undefined, JSON.stringify(testCase.input))
      assert.ok(response.error.includes(testCase.expected), response.error)
    }
  })

  test('问题数量与 readyForPlan 冲突：超过 6 个或 ready=true 仍提问都拒绝', () => {
    const tooMany = parseInterviewResponse({
      questions: Array.from({ length: 7 }, (_, index) => question(`q${index}`, `问题${index}`)),
      readyForPlan: false,
    })
    assert.ok(tooMany.error?.includes('不能超过 6'))

    const readyWithQuestions = parseInterviewResponse({
      questions: [question('q1', '问题一')],
      readyForPlan: true,
    })
    assert.ok(readyWithQuestions.error?.includes('readyForPlan=true 时 questions 必须为空'))

    const maxQuestionsOption = parseInterviewResponse({
      questions: [question('q1', '问题一'), question('q2', '问题二'), question('q3', '问题三')],
      readyForPlan: false,
    }, { maxQuestions: 2 })
    assert.ok(maxQuestionsOption.error?.includes('不能超过 2'))
  })

  test('唯一性：重复 id、重复标题（同轮/历史轮次）都拒绝', () => {
    const duplicateId = parseInterviewResponse({
      questions: [question('goal', '目标'), question('goal', '时间')],
      readyForPlan: false,
    })
    assert.ok(duplicateId.error?.includes('id「goal」重复'))

    const duplicateTitle = parseInterviewResponse({
      questions: [question('goal', '学习目标'), question('time', '学习目标')],
      readyForPlan: false,
    })
    assert.ok(duplicateTitle.error?.includes('本轮重复'))

    const previousRounds = [roundOf(0, [question('goal', '学习目标')])]
    const duplicatePrevious = parseInterviewResponse({
      questions: [question('goal2', '学习目标'), question('time', '时间投入')],
      readyForPlan: false,
    }, { previousRounds })
    assert.ok(duplicatePrevious.error?.includes('之前轮次重复'))

    const previousQuestions = [question('pending', '评估方式')]
    const duplicateFrontier = parseInterviewResponse({
      questions: [question('eval', '评估方式'), question('time', '时间投入')],
      readyForPlan: false,
    }, { previousQuestions })
    assert.ok(duplicateFrontier.error?.includes('之前轮次重复'))
  })

  test('每个学生问题必须有推荐答案；factQuery 不能替代决策问题', () => {
    const missingRecommendation = parseInterviewResponse({
      questions: [{ id: 'goal', title: '学习目标', body: '想达到什么程度？' }],
      readyForPlan: false,
    })
    assert.ok(missingRecommendation.error?.includes('recommendation'))

    const factOnly = parseInterviewResponse({
      questions: [{
        id: 'env',
        title: '本机环境',
        body: 'Python 版本是多少？',
        factQuery: '本机 Python 版本',
      }],
      readyForPlan: false,
    })
    assert.ok(factOnly.error?.includes('factQuery 不能替代学生决策问题'))
  })

  test('选项上限与空项、factQuery 空串都拒绝', () => {
    const tooManyOptions = parseInterviewResponse({
      questions: [question('goal', '学习目标', { options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })],
      readyForPlan: false,
    })
    assert.ok(tooManyOptions.error?.includes('options 超过 6 个'))

    const emptyOption = parseInterviewResponse({
      questions: [question('goal', '学习目标', { options: ['a', ''] })],
      readyForPlan: false,
    })
    assert.ok(emptyOption.error?.includes('options 含空项'))

    const emptyFactQuery = parseInterviewResponse({
      questions: [question('goal', '学习目标', { factQuery: '   ' })],
      readyForPlan: false,
    })
    assert.ok(emptyFactQuery.error?.includes('factQuery 必须是非空字符串'))
  })

  test('decisions 校验：重复 key / 非法 decidedBy / 超过 12 条都拒绝', () => {
    const duplicateKey = parseInterviewResponse({
      questions: [question('goal', '学习目标')],
      readyForPlan: false,
      decisions: [
        { key: 'a', value: '1', decidedBy: 'user' },
        { key: 'a', value: '2', decidedBy: 'user' },
      ],
    })
    assert.ok(duplicateKey.error?.includes('重复'))

    const badDecidedBy = parseInterviewResponse({
      questions: [question('goal', '学习目标')],
      readyForPlan: false,
      decisions: [{ key: 'a', value: '1', decidedBy: 'model' }],
    })
    assert.ok(badDecidedBy.error?.includes('decidedBy'))

    const tooMany = parseInterviewResponse({
      questions: [question('goal', '学习目标')],
      readyForPlan: false,
      decisions: Array.from({ length: 13 }, (_, index) => ({
        key: `k${index}`, value: 'v', decidedBy: 'user',
      })),
    })
    assert.ok(tooMany.error?.includes('不能超过 12 条'))
  })

  test('解析结果中的问题字段被截断到合理长度（防御超长模型输出）', () => {
    const response = parseInterviewResponse({
      questions: [question('goal', '学习目标', {
        body: '很长的正文'.repeat(400),
        recommendation: '很长的推荐'.repeat(200),
      })],
      readyForPlan: false,
    })
    assert.equal(response.error, undefined)
    assert.ok((response.questions[0]?.body.length ?? 0) <= 1201)
    assert.ok((response.questions[0]?.recommendation?.length ?? 0) <= 601)
  })

  test('MAX_QUESTIONS_PER_ROUND 常量与解析上限一致', () => {
    assert.equal(MAX_QUESTIONS_PER_ROUND, 6)
  })
})
