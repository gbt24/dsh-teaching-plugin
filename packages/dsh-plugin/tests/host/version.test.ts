import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PLUGIN_VERSION } from '../../src/version.ts'

test('plugin version stays in sync with package.json', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version?: string }
  assert.equal(PLUGIN_VERSION, manifest.version)
})
