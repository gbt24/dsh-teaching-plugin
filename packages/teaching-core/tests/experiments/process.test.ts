/**
 * Execution-kernel tests: real child processes, real timeout/cancel, output
 * caps and spawn failures. These do not depend on Python or Scheme.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runProcess } from '../../src/experiments/index.ts'

const NODE = process.execPath

test('captures stdout, stderr and the real exit code', async () => {
  const outcome = await runProcess({
    command: NODE,
    args: ['-e', 'process.stdout.write("out"); process.stderr.write("err"); process.exitCode = 4'],
    timeoutMs: 10_000,
    maxOutputBytes: 64 * 1024,
  })
  assert.equal(outcome.stdout, 'out')
  assert.equal(outcome.stderr, 'err')
  assert.equal(outcome.exitCode, 4)
  assert.equal(outcome.timedOut, false)
  assert.equal(outcome.cancelled, false)
  assert.equal(outcome.spawnError, undefined)
  assert.ok(outcome.durationMs >= 0)
})

test('passes stdin to the child', async () => {
  const outcome = await runProcess({
    command: NODE,
    args: ['-e', 'process.stdin.setEncoding("utf8"); let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => process.stdout.write("got:" + s))'],
    stdin: 'hello stdin',
    timeoutMs: 10_000,
    maxOutputBytes: 64 * 1024,
  })
  assert.equal(outcome.stdout, 'got:hello stdin')
  assert.equal(outcome.exitCode, 0)
})

test('times out a real infinite process and reports timedOut', async () => {
  const started = Date.now()
  const outcome = await runProcess({
    command: NODE,
    args: ['-e', 'setInterval(() => {}, 1000)'],
    timeoutMs: 300,
    maxOutputBytes: 8 * 1024,
  })
  const elapsed = Date.now() - started
  assert.equal(outcome.timedOut, true)
  assert.equal(outcome.cancelled, false)
  // The kill happens promptly after the deadline; the fallback is 2s.
  assert.ok(elapsed < 5_000, `timeout took ${elapsed}ms`)
  assert.ok(elapsed >= 250, `timeout fired too early: ${elapsed}ms`)
})

test('cancels through an AbortSignal and reports cancelled', async () => {
  const controller = new AbortController()
  const promise = runProcess({
    command: NODE,
    args: ['-e', 'setInterval(() => {}, 1000)'],
    timeoutMs: 30_000,
    maxOutputBytes: 8 * 1024,
    signal: controller.signal,
  })
  setTimeout(() => controller.abort(), 200)
  const outcome = await promise
  assert.equal(outcome.cancelled, true)
  assert.equal(outcome.timedOut, false)
})

test('caps output and marks it truncated', async () => {
  const outcome = await runProcess({
    command: NODE,
    args: ['-e', 'for (let i = 0; i < 200; i++) process.stdout.write("x".repeat(1000))'],
    timeoutMs: 10_000,
    maxOutputBytes: 4_000,
  })
  assert.equal(outcome.truncated, true)
  assert.ok(outcome.stdout.length < 5_000, `captured ${outcome.stdout.length} bytes`)
  assert.match(outcome.stdout, /输出已截断/u)
})

test('reports a spawn failure instead of throwing', async () => {
  const outcome = await runProcess({
    command: 'definitely-not-an-interpreter-xyz',
    args: ['--version'],
    timeoutMs: 5_000,
    maxOutputBytes: 8 * 1024,
  })
  assert.equal(outcome.exitCode, undefined)
  assert.ok(outcome.spawnError !== undefined)
  assert.match(outcome.spawnError ?? '', /ENOENT|not found|spawn/u)
})
