/**
 * 检索词生成测试：4–8 条、确定性、去重、语言后缀、最小 brief 补足。
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSearchQueries, MAX_SEARCH_QUERIES, MIN_SEARCH_QUERIES,
} from '../../src/planning/index.ts'
import { makeBrief } from './fixtures.ts'

describe('buildSearchQueries 检索词', () => {
  test('正常 PlanBrief：4–8 条、稳定可复现、无重复', () => {
    const brief = makeBrief()
    const first = buildSearchQueries(brief)
    const second = buildSearchQueries(brief)
    assert.deepEqual(first, second, '同一 brief 应产生相同查询（确定性）')
    assert.ok(first.length >= MIN_SEARCH_QUERIES)
    assert.ok(first.length <= MAX_SEARCH_QUERIES)
    const keys = first.map(query => query.toLowerCase())
    assert.equal(new Set(keys).size, keys.length, '查询不应重复')
    assert.ok(first.every(query => query.trim() !== ''))
  })

  test('包含检索主题与计划标题', () => {
    const brief = makeBrief()
    const queries = buildSearchQueries(brief)
    assert.ok(queries.some(query => query.includes('机器学习 入门教材')))
    assert.ok(queries.some(query => query.includes('过拟合 验证集 习题')))
    assert.ok(queries.some(query => query.includes(brief.title)))
  })

  test('语言后缀：中文用教程/讲义等，英文用 tutorial/textbook 等，双语混合', () => {
    const zh = buildSearchQueries(makeBrief({ language: 'zh' }))
    assert.ok(zh.some(query => query.includes('教程') || query.includes('讲义')))
    const en = buildSearchQueries(makeBrief({ language: 'en' }))
    assert.ok(en.some(query => query.includes('tutorial') || query.includes('textbook') || query.includes('lecture notes')))
    const bilingual = buildSearchQueries(makeBrief({ language: 'bilingual' }))
    assert.ok(bilingual.some(query => query.includes('tutorial') || query.includes('textbook')))
  })

  test('最小 brief（1 目标/1 章/1 检索主题）也能补足到 4 条', () => {
    const minimal = makeBrief({
      goals: ['能解释过拟合'],
      chapters: [{ title: '基础', topics: ['过拟合'] }],
      searchTopics: ['过拟合 教材'],
      exclusions: undefined,
      practiceStyle: undefined,
    })
    const queries = buildSearchQueries(minimal)
    assert.ok(queries.length >= MIN_SEARCH_QUERIES, JSON.stringify(queries))
    assert.ok(queries.length <= MAX_SEARCH_QUERIES)
  })

  test('重复的检索主题/标题去重后仍满足数量范围', () => {
    const brief = makeBrief({
      title: '过拟合',
      searchTopics: ['过拟合', '过拟合', '过拟合 教材', '过拟合 教材'],
      goals: ['过拟合'],
      chapters: [{ title: '过拟合', topics: ['过拟合'] }],
    })
    const queries = buildSearchQueries(brief)
    assert.ok(queries.length >= MIN_SEARCH_QUERIES)
    assert.ok(queries.length <= MAX_SEARCH_QUERIES)
    const keys = queries.map(query => query.toLowerCase())
    assert.equal(new Set(keys).size, keys.length)
  })

  test('大量主题/章节时最多 8 条', () => {
    const brief = makeBrief({
      searchTopics: Array.from({ length: 8 }, (_, index) => `主题 ${index}`),
      goals: Array.from({ length: 8 }, (_, index) => `目标 ${index}`),
      chapters: Array.from({ length: 12 }, (_, index) => ({ title: `章 ${index}`, topics: ['主题'] })),
    })
    const queries = buildSearchQueries(brief)
    assert.ok(queries.length <= MAX_SEARCH_QUERIES)
    assert.ok(queries.length >= MIN_SEARCH_QUERIES)
  })

  test('超长查询被截断到 200 字符以内', () => {
    const brief = makeBrief({
      searchTopics: ['长'.repeat(500)],
    })
    const queries = buildSearchQueries(brief)
    assert.ok(queries.every(query => query.length <= 200))
  })
})
