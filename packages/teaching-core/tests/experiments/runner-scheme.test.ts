/**
 * Scheme adapter: real execution through biwascheme in a Node child process,
 * with the SICP teaching prelude. Documents dialect differences by asserting
 * the observed behaviour of the installed engine (not by trusting docs).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newId } from '../../src/contracts/ids.ts'
import { SCHEME_DIALECT_DIFFERENCES } from '../../src/experiments/index.ts'
import { withRegistry } from './helpers.ts'

test('probes the real biwascheme interpreter', async () => {
  await withRegistry(async (registry) => {
    const probe = await registry.probe('scheme', 'sicp')
    assert.equal(probe.available, true, `scheme missing: ${probe.missingReason ?? ''}`)
    assert.match(probe.version ?? '', /biwascheme 0\.8\.3/u)
  })
})

test('runs display/newline and reports exit code 0', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(display "hello scheme")\n(newline)\n(display (+ 40 2))\n(newline)\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, 'hello scheme\n42\n')
    assert.equal(run.exitCode, 0)
    assert.equal(run.dialect, 'sicp')
  })
})

test('SICP prelude provides recursion, square, inc/dec and runtime', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: [
        '(define (fib n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2)))))',
        '(display (fib 10))',
        '(newline)',
        '(display (square (inc 4)))',
        '(newline)',
        '(display (integer? (runtime)))',
        '(newline)',
        '(display (dec 10))',
        '(newline)',
      ].join('\n'),
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, '55\n25\n#t\n9\n')
  })
})

test('SICP streams use cons-stream laziness from the prelude', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: [
        '(define (side-effect) (display "EAGER!") (newline) 99)',
        '(define s (cons-stream 1 (side-effect)))',
        '(display "built")',
        '(newline)',
        '(display (stream-car s))',
        '(newline)',
        '(display (stream-take (stream-map square (stream-enumerate-interval 1 5)) 5))',
        '(newline)',
      ].join('\n'),
    })
    assert.equal(run.status, 'succeeded')
    // The delayed branch must not have run while building the stream.
    assert.equal(run.stdout, 'built\n1\n(1 4 9 16 25)\n')
  })
})

test('observed dialect difference: no exact rationals', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(/ 1 3)\n(display (/ 1 3))\n(newline)\n',
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.stdout, '0.3333333333333333\n')
    assert.ok(SCHEME_DIALECT_DIFFERENCES.some(item => item.includes('精确有理数')))
  })
})

test('(error ...) stops the program with stderr and exit code 1', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(display "before")\n(newline)\n(error "故意错误")\n(display "after")\n',
    })
    assert.equal(run.status, 'failed')
    assert.equal(run.exitCode, 1)
    assert.equal(run.stdout, 'before\n')
    assert.match(run.stderr, /Scheme 错误/u)
    assert.doesNotMatch(run.stdout, /after/u)
  })
})

test('(exit n) terminates with code n and keeps prior output', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(display "x")\n(exit 3)\n',
    })
    assert.equal(run.status, 'failed')
    assert.equal(run.exitCode, 3)
    assert.equal(run.stdout, 'x')
  })
})

test('timeout applies to a real scheme program', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(js-eval "while (true) {}")\n',
      timeoutMs: 500,
    })
    assert.equal(run.status, 'timed-out')
  })
})

test('cancellation kills a scheme child process', async () => {
  await withRegistry(async (registry) => {
    const runId = newId<'RunId'>('run')
    const pending = registry.run({
      language: 'scheme',
      dialect: 'sicp',
      code: '(js-eval "while (true) {}")\n',
      timeoutMs: 30_000,
    }, { runId })
    setTimeout(() => { void registry.cancel(runId) }, 250)
    const run = await pending
    assert.equal(run.status, 'cancelled')
  })
})

test('plain (non-SICP) dialect does not inject the teaching prelude', async () => {
  await withRegistry(async (registry) => {
    const run = await registry.run({
      language: 'scheme',
      dialect: 'r6rs',
      code: '(display (inc 1))\n',
    })
    assert.equal(run.status, 'failed')
    assert.match(run.stderr, /Scheme 错误|unbound/u)
  })
})
