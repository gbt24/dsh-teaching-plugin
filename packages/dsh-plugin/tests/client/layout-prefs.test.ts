/**
 * Pure tests for the persisted plugin-column layout preferences.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_LAYOUT_PREFS, LAYOUT_STORAGE_KEY, loadLayoutPrefs, parseLayoutPrefs, saveLayoutPrefs,
  serializeLayoutPrefs, type LayoutStorage,
} from '../../src/client/layout-prefs.ts'

/** Minimal in-memory localStorage stand-in. */
function memoryStorage(initial: Record<string, string> = {}): LayoutStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial }
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value },
  }
}

test('missing, empty, corrupt or non-object values fall back to both columns visible', () => {
  assert.deepEqual(parseLayoutPrefs(null), DEFAULT_LAYOUT_PREFS)
  assert.deepEqual(parseLayoutPrefs(''), DEFAULT_LAYOUT_PREFS)
  assert.deepEqual(parseLayoutPrefs('not-json'), DEFAULT_LAYOUT_PREFS)
  assert.deepEqual(parseLayoutPrefs('[]'), DEFAULT_LAYOUT_PREFS)
  assert.deepEqual(parseLayoutPrefs('"left"'), DEFAULT_LAYOUT_PREFS)
  assert.deepEqual(parseLayoutPrefs('{"leftCollapsed":"yes","rightCollapsed":1}'), DEFAULT_LAYOUT_PREFS)
})

test('partial preferences keep valid booleans and default the rest', () => {
  assert.deepEqual(parseLayoutPrefs('{"leftCollapsed":true}'), { leftCollapsed: true, rightCollapsed: false })
  assert.deepEqual(parseLayoutPrefs('{"rightCollapsed":true}'), { leftCollapsed: false, rightCollapsed: true })
  assert.deepEqual(parseLayoutPrefs('{"leftCollapsed":false,"rightCollapsed":true}'),
    { leftCollapsed: false, rightCollapsed: true })
})

test('serialize/parse round-trips', () => {
  const prefs = { leftCollapsed: true, rightCollapsed: true }
  assert.equal(serializeLayoutPrefs(prefs), '{"leftCollapsed":true,"rightCollapsed":true}')
  assert.deepEqual(parseLayoutPrefs(serializeLayoutPrefs(prefs)), prefs)
})

test('load/save use the plugin-specific storage key and swallow storage failures', () => {
  const storage = memoryStorage()
  assert.deepEqual(loadLayoutPrefs(storage), DEFAULT_LAYOUT_PREFS)
  saveLayoutPrefs({ leftCollapsed: true, rightCollapsed: false }, storage)
  assert.equal(storage.getItem(LAYOUT_STORAGE_KEY), '{"leftCollapsed":true,"rightCollapsed":false}')
  assert.deepEqual(loadLayoutPrefs(storage), { leftCollapsed: true, rightCollapsed: false })

  const broken: LayoutStorage = {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('quota') },
  }
  assert.deepEqual(loadLayoutPrefs(broken), DEFAULT_LAYOUT_PREFS)
  assert.doesNotThrow(() => saveLayoutPrefs({ leftCollapsed: true, rightCollapsed: true }, broken))
  // No storage at all is fine (SSR/tests).
  assert.deepEqual(loadLayoutPrefs(undefined), DEFAULT_LAYOUT_PREFS)
  assert.doesNotThrow(() => saveLayoutPrefs(DEFAULT_LAYOUT_PREFS, undefined))
})
