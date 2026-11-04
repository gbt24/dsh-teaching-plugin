/**
 * T01 host-slice tests: text extraction, retrieval tokenisation, teaching meta
 * parsing and activity normalisation. These are the behaviours the Host route
 * layer depends on; the real corpus/teaching modules replace them in T02/T03
 * behind the same seams.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  detectFormat, draftConceptsFromSources, normalizeActivityProposal, parseTeachingMeta,
  parseTextContent, tokenize,
} from '../../src/host/minimal.ts'
import type { SourceDocument, SourceUnit } from '@deepseek-teaching/core'

function unit(overrides: Partial<SourceUnit> & { text: string }): SourceUnit {
  return {
    id: 'unit-1' as never,
    revisionId: 'srev-1' as never,
    kind: 'paragraph',
    locator: {},
    confidence: 'high',
    ...overrides,
  }
}

describe('detectFormat', () => {
  it('maps supported extensions and falls back to text', () => {
    assert.equal(detectFormat('a.md'), 'markdown')
    assert.equal(detectFormat('a.pdf'), 'pdf')
    assert.equal(detectFormat('a.PNG'), 'image')
    assert.equal(detectFormat('a.docx'), 'docx')
    assert.equal(detectFormat('a.pptx'), 'pptx')
    assert.equal(detectFormat('a.ipynb'), 'notebook')
    assert.equal(detectFormat('a.py'), 'code')
    assert.equal(detectFormat('a.unknown'), 'text')
  })
})

describe('parseTextContent', () => {
  const markdown = [
    '# 第一章',
    '',
    '过拟合是模型记住噪声的现象。',
    '',
    '## 1.1 条件',
    '',
    '$$E = mc^2$$',
    '',
    '```python',
    'print(1)',
    '```',
  ].join('\n')

  it('keeps heading paths and line locators', () => {
    const { units, warnings } = parseTextContent(markdown, 'markdown')
    assert.deepEqual(warnings, [])
    const headings = units.filter(item => item.kind === 'heading')
    assert.equal(headings.length, 2)
    assert.deepEqual(headings[1]?.locator.sectionPath, ['第一章', '1.1 条件'])
    const paragraph = units.find(item => item.text.includes('过拟合'))
    assert.deepEqual(paragraph?.locator.lines, [3, 3])
  })

  it('extracts formulas and fenced code as separate units', () => {
    const { units } = parseTextContent(markdown, 'markdown')
    assert.ok(units.some(item => item.kind === 'formula' && item.text.includes('E = mc^2')))
    const code = units.find(item => item.kind === 'code')
    assert.ok(code !== undefined)
    assert.ok(code?.text.includes('print(1)'))
    assert.deepEqual(code?.locator.lines, [9, 11])
  })

  it('warns instead of inventing content for an empty file', () => {
    const { units, warnings } = parseTextContent('   \n\n', 'text')
    assert.deepEqual(units, [])
    assert.equal(warnings.length, 1)
  })
})

describe('tokenize', () => {
  it('produces latin words and CJK bigrams', () => {
    const terms = tokenize('Overfitting 过拟合 generalization')
    assert.ok(terms.includes('overfitting'))
    assert.ok(terms.includes('拟合'))
    assert.ok(terms.filter(term => /^[\u4e00-\u9fff]{2}$/.test(term)).length > 0)
  })

  it('returns no terms for punctuation-only input', () => {
    assert.deepEqual(tokenize('？！。'), [])
  })
})

describe('parseTeachingMeta', () => {
  it('splits the visible reply from the trailing JSON block', () => {
    const text = '讲解正文。\n\n```json\n{"stage":"practice","activity":null,"uncertainty":["未覆盖反例"]}\n```'
    const parsed = parseTeachingMeta(text)
    assert.equal(parsed.replyText, '讲解正文。')
    assert.equal(parsed.meta?.stage, 'practice')
    assert.deepEqual(parsed.meta?.uncertainty, ['未覆盖反例'])
    assert.deepEqual(parsed.warnings, [])
  })

  it('keeps the reply when the JSON block is malformed', () => {
    const text = '讲解正文。\n\n```json\n{broken\n```'
    const parsed = parseTeachingMeta(text)
    assert.equal(parsed.replyText, '讲解正文。')
    assert.equal(parsed.warnings.length, 1)
  })

  it('returns the whole text when there is no metadata block', () => {
    assert.equal(parseTeachingMeta('只有正文').replyText, '只有正文')
  })
})

describe('normalizeActivityProposal', () => {
  it('accepts a quiz with string options and option letters', () => {
    const normalized = normalizeActivityProposal({
      kind: 'quiz',
      payload: {
        type: 'quiz',
        question: '哪个更可能过拟合？',
        options: ['训练误差低的模型', '验证误差高的模型'],
        correctOptionIds: ['B'],
      },
    })
    assert.ok(normalized !== undefined)
    assert.equal(normalized?.payload.type, 'quiz')
    if (normalized?.payload.type === 'quiz') {
      assert.equal(normalized.payload.options.length, 2)
      assert.deepEqual(normalized.payload.correctOptionIds, ['B'])
    }
    assert.equal(normalized?.verification.kind, 'objective')
  })

  it('accepts the questions[0] shape with answerIndex', () => {
    const normalized = normalizeActivityProposal({
      kind: 'quiz',
      payload: { questions: [{ stem: '题目', options: ['A', 'B'], answerIndex: 1 }] },
    })
    assert.ok(normalized !== undefined)
    if (normalized?.payload.type === 'quiz') {
      assert.equal(normalized.payload.question, '题目')
      assert.deepEqual(normalized.payload.correctOptionIds, ['B'])
    }
  })

  it('accepts a graph whose series use the functions alias', () => {
    const normalized = normalizeActivityProposal({
      kind: 'graph',
      payload: {
        xRange: [-5, 5],
        yRange: [-1, 5],
        functions: [{ expression: 'x^2', label: '平方' }],
      },
    })
    assert.ok(normalized !== undefined)
    if (normalized?.payload.type === 'graph') {
      assert.equal(normalized.payload.series[0]?.expr, 'x^2')
      assert.equal(normalized.verification.kind === 'none', true)
    }
  })

  it('rejects unusable or non-verifiable shapes', () => {
    assert.equal(normalizeActivityProposal(undefined), undefined)
    assert.equal(normalizeActivityProposal({ kind: 'quiz', payload: { question: 'x', options: [] } }), undefined)
    assert.equal(normalizeActivityProposal({ kind: 'unknown-kind', payload: {} }), undefined)
  })
})

describe('draftConceptsFromSources', () => {
  it('turns headings into concepts with source anchors and coverage', () => {
    const source: SourceDocument = {
      id: 'src-1' as never,
      originalPath: '/tmp/a.md',
      title: 'a.md',
      format: 'markdown',
      courseIds: ['course-1' as never],
      addedAt: 'now',
      updatedAt: 'now',
      status: 'ready',
      revisions: [],
    }
    const units: SourceUnit[] = [
      unit({ id: 'u1' as never, kind: 'heading', text: '第一章', locator: { lines: [1, 1] } }),
      unit({ id: 'u2' as never, kind: 'heading', text: '第二章', locator: { lines: [3, 3] } }),
      unit({ text: '正文内容' }),
    ]
    const drafted = draftConceptsFromSources([{ document: source, units }])
    assert.deepEqual(drafted.concepts.map(concept => concept.title), ['第一章', '第二章'])
    assert.equal(drafted.concepts[0]?.sourceAnchors[0]?.documentId, 'src-1')
    assert.equal(drafted.coverage[0]?.usedUnits, 2)
    assert.deepEqual(drafted.warnings, [])
  })

  it('falls back to leading paragraphs and warns when no headings exist', () => {
    const source: SourceDocument = {
      id: 'src-2' as never, originalPath: '/tmp/b.txt', title: 'b.txt', format: 'text',
      courseIds: [], addedAt: 'now', updatedAt: 'now', status: 'ready', revisions: [],
    }
    const drafted = draftConceptsFromSources([{
      document: source,
      units: [unit({ text: '第一段内容用来生成概念' }), unit({ text: '第二段内容' })],
    }])
    assert.ok(drafted.concepts.length > 0)
    assert.ok(drafted.warnings.some(warning => warning.includes('段落')))
  })
})
