/**
 * Python adapter: real python3 execution through the registry seam.
 * Covers version probing, stdout/exit code, stdin, objective checks, timeout,
 * cancellation and syntax errors. Skips (with an explicit note) when the host
 * has no python3 — the current dev/desktop machine does.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newId } from '../../src/contracts/ids.ts'
import { validationFromRun } from '../../src/experiments/index.ts'
import { withRegistry } from './helpers.ts'

test('probes a real python3 with its version', async () => {
  await withRegistry(async (registry) => {
    const probe = await registry.probe('python')
    assert.equal(probe.available, true, `python3 missing: ${probe.missingReason ?? ''}`)
    assert.match(probe.version ?? '', /^3\.\d+/u)
    assert.equal(probe.args?.includes('-I'), true, 'runs isolated (-I)')
  })
})

test('runs a real python program and keeps stdout/exit code/duration', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'python',
      code: 'print("你好，Python")\nprint(2 ** 10)\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, '你好，Python\n1024\n')
    assert.equal(run.stderr, '')
    assert.equal(run.exitCode, 0)
    assert.equal(run.verification, 'exploratory')
    assert.ok((run.durationMs ?? -1) >= 0)
    assert.match(run.environmentId, /^env-/u)
    assert.match(run.id, /^run-/u)
    assert.equal(registry.getRun(run.id)?.id, run.id)
  })
})

test('applies objective checks and maps them to attempt validation', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'python',
      code: 'print("answer=42")\n',
      checks: [
        { name: '输出包含答案', type: 'stdout-contains', value: 'answer=42' },
        { name: '输出完全匹配', type: 'stdout-equals', value: 'answer=42' },
        { name: '退出码为 0', type: 'exit-code', value: 0 },
      ],
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.verification, 'objective')
    assert.deepEqual(run.checks?.map(check => check.status), ['pass', 'pass', 'pass'])
    const validation = validationFromRun(run)
    assert.equal(validation.kind, 'objective')
    assert.equal(validation.passed, true)
    assert.equal(validation.assessedBy, 'objective-runner')
    assert.ok((validation.evidence ?? []).some(item => item.includes('真实执行')))
  })
})

test('failed checks are reported with a concrete detail', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'python',
      code: 'print("wrong")\n',
      checks: [
        { name: '应为 42', type: 'stdout-equals', value: '42' },
        { name: '退出码为 7', type: 'exit-code', value: 7 },
      ],
    })
    assert.equal(run.verification, 'objective')
    assert.deepEqual(run.checks?.map(check => check.status), ['fail', 'fail'])
    assert.match(run.checks?.[0]?.detail ?? '', /期望/u)
    assert.equal(validationFromRun(run).passed, false)
  })
})

test('keeps stdin support inside the isolated interpreter', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'python',
      code: 'name = input()\nprint(f"Hi {name}")\n',
      stdin: 'Ada\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, 'Hi Ada\n')
  })
})

test('non-zero exit code is a real failed run, not a runner error', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'python', code: 'raise SystemExit(3)\n' })
    assert.equal(run.status, 'failed')
    assert.equal(run.exitCode, 3)
    assert.equal(run.verification, 'exploratory')
  })
})

test('a syntax error surfaces stderr and a non-zero exit code', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'python', code: 'def broken(:\n  pass\n' })
    assert.equal(run.status, 'failed')
    assert.notEqual(run.exitCode, 0)
    assert.match(run.stderr, /SyntaxError/u)
  })
})

test('enforces the timeout on a real infinite loop', async () => {
  await withRegistry(async (registry) => {
    const started = Date.now()
    const run = await registry.run({
      language: 'python',
      code: 'while True:\n    pass\n',
      timeoutMs: 500,
    })
    const elapsed = Date.now() - started
    assert.equal(run.status, 'timed-out')
    assert.equal(run.verification, 'unverified')
    assert.ok(elapsed < 8_000, `timeout took ${elapsed}ms`)
    assert.equal(run.limits.timeoutMs, 500)
  })
})

test('cancels an in-flight python run through its pre-assigned run id', async () => {
  await withRegistry(async (registry) => {
    const runId = newId<'RunId'>('run')
    const pending = registry.run({
      language: 'python',
      code: 'while True:\n    pass\n',
      timeoutMs: 30_000,
    }, { runId })
    setTimeout(() => { void registry.cancel(runId) }, 250)
    const run = await pending
    assert.equal(run.status, 'cancelled')
    assert.equal(run.id, runId)
    assert.equal(registry.activeRuns().length, 0)
  })
})

test('unsupported languages produce an explicit failed run', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({ language: 'ruby', code: 'puts 1' })
    assert.equal(run.status, 'failed')
    assert.equal(run.verification, 'unverified')
    assert.match(run.stderr, /暂不支持的语言/u)
  })
})
