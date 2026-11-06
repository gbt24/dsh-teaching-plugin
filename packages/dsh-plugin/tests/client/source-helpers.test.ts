/**
 * Pure tests for sidebar materials helpers: origin badges, URL/path parsing and
 * integration summary text.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CourseDraftView, SourceDocument } from '@deepseek-teaching/core/contracts'
import {
  integrationSummaryText, parseLocalPaths, parseWebUrls, sourceDisplayLocation, sourceOriginLabel,
} from '../../src/client/source-helpers.ts'

function source(overrides: Partial<SourceDocument> = {}): SourceDocument {
  return {
    id: 'src-1' as never,
    originalPath: '/Users/student/概率论.pdf',
    title: '概率论.pdf',
    format: 'pdf',
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
    ...overrides,
  } as SourceDocument
}

test('origin labels distinguish local files from web pages', () => {
  assert.equal(sourceOriginLabel(source()), '本地')
  assert.equal(sourceOriginLabel(source({ origin: 'local' })), '本地')
  assert.equal(sourceOriginLabel(source({ origin: 'web' })), '网页')
  // Legacy web records may only have `web` provenance.
  assert.equal(sourceOriginLabel(source({
    web: { url: 'https://example.com/a', title: 'A', fetchedAt: '2026-11-06T00:00:00.000Z' },
  })), '网页')
})

test('sourceDisplayLocation uses the web URL when present, else original path', () => {
  assert.equal(sourceDisplayLocation(source()), '/Users/student/概率论.pdf')
  assert.equal(sourceDisplayLocation(source({
    web: { url: 'https://example.com/a', title: 'A', fetchedAt: '2026-11-06T00:00:00.000Z' },
  })), 'https://example.com/a')
})

test('parseWebUrls accepts http(s), normalizes and reports invalid entries', () => {
  const result = parseWebUrls([
    'https://example.com/a',
    ' http://example.org/b ',
    'https://example.com/a', // duplicate
    'not-a-url',
    'ftp://files.example.com/x',
    '',
  ].join('\n'))
  assert.deepEqual(result.urls, ['https://example.com/a', 'http://example.org/b'])
  assert.deepEqual(result.invalid, ['not-a-url', 'ftp://files.example.com/x'])
  assert.deepEqual(parseWebUrls(''), { urls: [], invalid: [] })
})

test('parseLocalPaths splits, trims and drops blank lines', () => {
  assert.deepEqual(parseLocalPaths(' /a/b.pdf \n\n  /c/d.md  \n'), ['/a/b.pdf', '/c/d.md'])
  assert.deepEqual(parseLocalPaths('   '), [])
})

test('integrationSummaryText describes the incremental diff', () => {
  const integration: NonNullable<CourseDraftView['integration']> = {
    mode: 'incremental', reusedConcepts: 3, addedConcepts: 2,
    preservedOldConcepts: 7, addedAnchors: 5, warnings: [],
  }
  assert.equal(integrationSummaryText(integration),
    '资料整合完成（增量）：复用 3 个概念、新增 2 个概念、保留 7 个旧概念、新增 5 处资料锚点。')
  assert.match(integrationSummaryText({ ...integration, mode: 'initial' }) ?? '', /初始/u)
  assert.equal(integrationSummaryText(undefined), undefined)
})
