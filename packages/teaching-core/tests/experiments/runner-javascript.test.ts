/**
 * JavaScript adapter: real Node execution through the registry seam.
 * On the developer machine this is system Node; inside the Harness host it is
 * the Electron binary with ELECTRON_RUN_AS_NODE=1 (same code path).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withRegistry } from './helpers.ts'

test('probes a real Node with its version', async () => {
  await withRegistry(async (registry) => {
    const probe = await registry.probe('javascript')
    assert.equal(probe.available, true, `node missing: ${probe.missingReason ?? ''}`)
    assert.match(probe.version ?? '', /^\d+\.\d+\.\d+/u)
  })
})

test('runs a real JavaScript program with real stdout', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'javascript',
      code: 'console.log("hello js");\nconsole.log([1, 2, 3].map(x => x * x).join(","));\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, 'hello js\n1,4,9\n')
    assert.equal(run.exitCode, 0)
  })
})

test('keeps the event loop alive for asynchronous output', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'javascript',
      code: 'setTimeout(() => { console.log("later"); }, 120);\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, 'later\n')
    assert.ok((run.durationMs ?? 0) >= 100)
  })
})

test('supports stdin', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'javascript',
      code: 'const fs = require("node:fs");\nconst text = fs.readFileSync(0, "utf8").trim();\nconsole.log("got:" + text);\n',
      stdin: 'abc\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, 'got:abc\n')
  })
})

test('non-zero exit code is preserved', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'javascript', code: 'process.exitCode = 5;\n' })
    assert.equal(run.status, 'failed')
    assert.equal(run.exitCode, 5)
  })
})

test('reports a thrown error with stderr and failed status', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'javascript', code: 'throw new Error("boom-js");\n' })
    assert.equal(run.status, 'failed')
    assert.notEqual(run.exitCode, 0)
    assert.match(run.stderr, /boom-js/u)
  })
})

test('timeout kills a JavaScript infinite loop', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'javascript',
      code: 'while (true) {}\n',
      timeoutMs: 400,
    })
    assert.equal(run.status, 'timed-out')
  })
})
