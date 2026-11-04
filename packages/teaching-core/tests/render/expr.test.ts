/**
 * Restricted expression evaluator tests: precedence, functions, variables and
 * the rejection of anything that is not arithmetic.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileExpression, evaluateExpression, ExpressionError, isValidExpression } from '../../src/render/index.ts'

test('arithmetic precedence, unary signs and right-associative powers', () => {
  assert.equal(evaluateExpression('2 + 3 * 4', {}), 14)
  assert.equal(evaluateExpression('(2 + 3) * 4', {}), 20)
  assert.equal(evaluateExpression('2 ^ 3 ^ 2', {}), 512)
  assert.equal(evaluateExpression('-2 ^ 2', {}), -4)
  assert.equal(evaluateExpression('(-2) ^ 2', {}), 4)
  assert.equal(evaluateExpression('2 ^ -1', {}), 0.5)
  assert.equal(evaluateExpression('10 % 3', {}), 1)
  assert.equal(evaluateExpression('1 / 4', {}), 0.25)
})

test('fixed function set and constants', () => {
  assert.equal(evaluateExpression('sqrt(16)', {}), 4)
  assert.equal(evaluateExpression('abs(-3)', {}), 3)
  assert.ok(Math.abs(evaluateExpression('sin(pi / 2)', {}) - 1) < 1e-12)
  assert.ok(Math.abs(evaluateExpression('log(e)', {}) - 1) < 1e-12)
  assert.ok(Math.abs(evaluateExpression('ln(e)', {}) - 1) < 1e-12)
  assert.equal(evaluateExpression('min(3, 1, 2)', {}), 1)
  assert.equal(evaluateExpression('max(3, 1, 2)', {}), 3)
  assert.equal(evaluateExpression('pow(2, 10)', {}), 1024)
  assert.equal(evaluateExpression('floor(1.9)', {}), 1)
  assert.equal(evaluateExpression('ceil(1.1)', {}), 2)
  assert.equal(evaluateExpression('round(1.6)', {}), 2)
  assert.equal(evaluateExpression('sign(-2)', {}), -1)
  assert.ok(Math.abs(evaluateExpression('atan2(1, 1)', {}) - Math.PI / 4) < 1e-12)
})

test('variables must be declared at compile time and supplied at evaluation', () => {
  const expression = compileExpression('a * x + b', { variables: ['a', 'x', 'b'] })
  assert.equal(expression.evaluate({ a: 2, x: 3, b: 1 }), 7)
  assert.deepEqual([...expression.variables].sort(), ['a', 'b', 'x'])
  assert.throws(() => compileExpression('a + 1', { variables: ['x'] }), ExpressionError)
  assert.throws(() => expression.evaluate({ a: 2, x: 3 }), ExpressionError)
})

test('malformed or non-arithmetic input is rejected, never evaluated', () => {
  for (const source of ['', '2 +', '**x', 'foo(1)', 'x[0]', 'a.b', 'process.exit()', '`code`', 'x = 1']) {
    assert.throws(() => compileExpression(source), ExpressionError, `should reject ${JSON.stringify(source)}`)
  }
  assert.throws(() => compileExpression('sqrt(-1)').evaluate({}), ExpressionError)
  // Prototype members must not leak in as variable values.
  assert.throws(() => compileExpression('constructor').evaluate({}), ExpressionError)
  assert.throws(() => compileExpression('toString').evaluate({}), ExpressionError)
  assert.throws(() => compileExpression('x'.repeat(600)), ExpressionError)
  assert.equal(isValidExpression('sin(x)', ['x']), true)
  assert.equal(isValidExpression('sin(y)', ['x']), false)
})

test('compilation is deterministic and reusable', () => {
  const expression = compileExpression('x^2 + 2*x + 1', { variables: ['x'] })
  assert.equal(expression.evaluate({ x: 3 }), 16)
  assert.equal(expression.evaluate({ x: -1 }), 0)
  assert.equal(expression.source, 'x^2 + 2*x + 1')
})
