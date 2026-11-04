/**
 * Restricted arithmetic expression evaluator for interactive graphs.
 *
 * Model-authored expressions are parsed into a small AST and evaluated with
 * plain arithmetic — **never** `eval`/`Function`. Supported: numbers, `x` and
 * declared parameters, `+ - * / ^ %`, parentheses, unary signs, constants
 * `pi`/`e`, and a fixed function set (sin/cos/tan/asin/acos/atan/exp/log/ln/
 * sqrt/abs/min/max/floor/ceil/round/sign/pow/atan2).
 *
 * Angles are radians. `log` and `ln` are both the natural logarithm (the
 * contract lists both; there is no base-10 name in the vocabulary).
 */

/** One compile/evaluation failure with a student-readable message. */
export class ExpressionError extends Error {
  override readonly name = 'ExpressionError'

  constructor(message: string) {
    super(message)
  }
}

/** A compiled expression bound to its allowed variable names. */
export interface CompiledExpression {
  readonly source: string
  /** Declared variables (x + parameters) used by the expression. */
  readonly variables: readonly string[]
  /** Evaluate with concrete variable values; throws {@link ExpressionError} on missing variables. */
  evaluate(values: Readonly<Record<string, number>>): number
}

/** Compile options. */
export interface CompileExpressionOptions {
  /** Allowed variable names; unknown identifiers become compile errors. */
  readonly variables?: readonly string[]
}

const MAX_SOURCE_LENGTH = 500
const MAX_DEPTH = 64
const CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
}

type FunctionName =
  | 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan' | 'atan2'
  | 'exp' | 'log' | 'ln' | 'sqrt' | 'abs' | 'min' | 'max'
  | 'floor' | 'ceil' | 'round' | 'sign' | 'pow'

type UnaryFunction = (value: number) => number
const UNARY_FUNCTIONS: Readonly<Record<string, UnaryFunction>> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  exp: Math.exp, log: Math.log, ln: Math.log,
  sqrt: Math.sqrt, abs: Math.abs,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign,
}
const MIN_MAX_LENGTH = 2
const BINARY_FUNCTIONS: readonly string[] = ['min', 'max', 'pow', 'atan2']

type Ast =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'variable'; readonly name: string }
  | { readonly kind: 'negate'; readonly operand: Ast }
  | { readonly kind: 'binary'; readonly op: '+' | '-' | '*' | '/' | '^' | '%'; readonly left: Ast; readonly right: Ast }
  | { readonly kind: 'call'; readonly name: FunctionName; readonly args: readonly Ast[] }

interface Token {
  readonly type: 'number' | 'name' | 'op' | 'lparen' | 'rparen' | 'comma' | 'end'
  readonly text: string
  readonly position: number
}

/** Tokenise an expression. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const char = source[index] ?? ''
    if (/\s/u.test(char)) {
      index += 1
      continue
    }
    if (/[0-9.]/u.test(char)) {
      const match = /^\d*\.?\d+(?:[eE][+-]?\d+)?/u.exec(source.slice(index))
      if (match === null) throw new ExpressionError(`无法解析数字（位置 ${index + 1}）`)
      const text = match[0]
      if (text === '.' || text === '') throw new ExpressionError(`无法解析数字（位置 ${index + 1}）`)
      tokens.push({ type: 'number', text, position: index })
      index += text.length
      continue
    }
    if (/[A-Za-z_\u4e00-\u9fa5]/u.test(char)) {
      const match = /^[A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*/u.exec(source.slice(index))
      const text = match?.[0] ?? char
      tokens.push({ type: 'name', text, position: index })
      index += text.length
      continue
    }
    if ('+-*/^%'.includes(char)) {
      tokens.push({ type: 'op', text: char, position: index })
      index += 1
      continue
    }
    if (char === '(' || char === '（') {
      tokens.push({ type: 'lparen', text: '(', position: index })
      index += 1
      continue
    }
    if (char === ')' || char === '）') {
      tokens.push({ type: 'rparen', text: ')', position: index })
      index += 1
      continue
    }
    if (char === ',' || char === '，') {
      tokens.push({ type: 'comma', text: ',', position: index })
      index += 1
      continue
    }
    throw new ExpressionError(`表达式中出现不支持的字符「${char}」（位置 ${index + 1}）`)
  }
  tokens.push({ type: 'end', text: '', position: source.length })
  return tokens
}

/** Recursive-descent parser with a fixed grammar and depth guard. */
class Parser {
  private readonly tokens: Token[]
  private readonly variables: ReadonlySet<string> | undefined
  private index = 0
  private depth = 0

  constructor(tokens: Token[], variables: readonly string[] | undefined) {
    this.tokens = tokens
    this.variables = variables === undefined ? undefined : new Set(variables)
  }

  private peek(): Token {
    return this.tokens[this.index] ?? { type: 'end', text: '', position: 0 }
  }

  private next(): Token {
    const token = this.peek()
    this.index += 1
    return token
  }

  private expect(type: Token['type'], what: string): Token {
    const token = this.next()
    if (token.type !== type) throw new ExpressionError(`表达式语法错误：期望 ${what}，得到「${token.text || '结尾'}」`)
    return token
  }

  private enter(): void {
    this.depth += 1
    if (this.depth > MAX_DEPTH) throw new ExpressionError('表达式嵌套过深')
  }

  private leave(): void {
    this.depth -= 1
  }

  parse(): Ast {
    const ast = this.parseAdditive()
    if (this.peek().type !== 'end') {
      throw new ExpressionError(`表达式语法错误：多余的「${this.peek().text}」`)
    }
    return ast
  }

  private parseAdditive(): Ast {
    this.enter()
    try {
      let left = this.parseMultiplicative()
      for (;;) {
        const token = this.peek()
        if (token.type === 'op' && (token.text === '+' || token.text === '-')) {
          this.next()
          const right = this.parseMultiplicative()
          left = { kind: 'binary', op: token.text, left, right }
        } else {
          return left
        }
      }
    } finally {
      this.leave()
    }
  }

  private parseMultiplicative(): Ast {
    this.enter()
    try {
      let left = this.parseUnary()
      for (;;) {
        const token = this.peek()
        if (token.type === 'op' && (token.text === '*' || token.text === '/' || token.text === '%')) {
          this.next()
          const right = this.parseUnary()
          left = { kind: 'binary', op: token.text, left, right }
        } else {
          return left
        }
      }
    } finally {
      this.leave()
    }
  }

  private parseUnary(): Ast {
    const token = this.peek()
    if (token.type === 'op' && (token.text === '+' || token.text === '-')) {
      this.next()
      const operand = this.parseUnary()
      return token.text === '-' ? { kind: 'negate', operand } : operand
    }
    return this.parsePower()
  }

  private parsePower(): Ast {
    this.enter()
    try {
      const base = this.parsePrimary()
      const token = this.peek()
      if (token.type === 'op' && token.text === '^') {
        this.next()
        // Right-associative, and `2^-3` is allowed.
        const exponent = this.parseUnary()
        return { kind: 'binary', op: '^', left: base, right: exponent }
      }
      return base
    } finally {
      this.leave()
    }
  }

  private parsePrimary(): Ast {
    const token = this.next()
    if (token.type === 'number') {
      const value = Number(token.text)
      if (!Number.isFinite(value)) throw new ExpressionError(`数字无效：${token.text}`)
      return { kind: 'number', value }
    }
    if (token.type === 'lparen') {
      const inner = this.parseAdditive()
      this.expect('rparen', '右括号')
      return inner
    }
    if (token.type === 'name') {
      const name = token.text
      if (this.peek().type === 'lparen') {
        this.next()
        const args: Ast[] = []
        if (this.peek().type !== 'rparen') {
          for (;;) {
            args.push(this.parseAdditive())
            if (this.peek().type === 'comma') {
              this.next()
              continue
            }
            break
          }
        }
        this.expect('rparen', '函数调用的右括号')
        return this.makeCall(name, args)
      }
      if (Object.hasOwn(CONSTANTS, name)) return { kind: 'number', value: CONSTANTS[name] as number }
      if (this.variables !== undefined && !this.variables.has(name)) {
        throw new ExpressionError(`表达式使用了未声明的变量「${name}」`)
      }
      return { kind: 'variable', name }
    }
    if (token.type === 'op') throw new ExpressionError(`表达式语法错误：运算符「${token.text}」缺少操作数`)
    throw new ExpressionError('表达式不完整')
  }

  private makeCall(name: string, args: readonly Ast[]): Ast {
    if (Object.hasOwn(UNARY_FUNCTIONS, name)) {
      if (args.length !== 1) throw new ExpressionError(`函数 ${name} 需要 1 个参数，实际 ${args.length} 个`)
      return { kind: 'call', name: name as FunctionName, args }
    }
    if (BINARY_FUNCTIONS.includes(name)) {
      const minimum = name === 'pow' || name === 'atan2' ? 2 : MIN_MAX_LENGTH
      const exact = name === 'pow' || name === 'atan2' ? 2 : undefined
      if (exact !== undefined && args.length !== exact) throw new ExpressionError(`函数 ${name} 需要 ${exact} 个参数`)
      if (exact === undefined && args.length < minimum) throw new ExpressionError(`函数 ${name} 至少需要 ${minimum} 个参数`)
      return { kind: 'call', name: name as FunctionName, args }
    }
    // Unknown function/trailing parentheses is a model authoring mistake, not eval.
    throw new ExpressionError(`不支持的函数「${name}」`)
  }
}

function evaluateAst(ast: Ast, values: Readonly<Record<string, number>>): number {
  switch (ast.kind) {
    case 'number':
      return ast.value
    case 'variable': {
      // Own property + number check: a variable named `constructor` or
      // `toString` must never resolve to Object.prototype members.
      if (!Object.hasOwn(values, ast.name)) throw new ExpressionError(`缺少变量「${ast.name}」的值`)
      const value = values[ast.name]
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ExpressionError(`变量「${ast.name}」不是有限数字`)
      }
      return value
    }
    case 'negate':
      return -evaluateAst(ast.operand, values)
    case 'binary': {
      const left = evaluateAst(ast.left, values)
      const right = evaluateAst(ast.right, values)
      if (ast.op === '+') return left + right
      if (ast.op === '-') return left - right
      if (ast.op === '*') return left * right
      if (ast.op === '/') return left / right
      if (ast.op === '%') return left % right
      return left ** right
    }
    case 'call': {
      const name = ast.name
      const args = ast.args.map(arg => evaluateAst(arg, values))
      if (name === 'pow') return (args[0] ?? 0) ** (args[1] ?? 0)
      if (name === 'atan2') return Math.atan2(args[0] ?? 0, args[1] ?? 0)
      if (name === 'min') return Math.min(...args)
      if (name === 'max') return Math.max(...args)
      const fn = Object.hasOwn(UNARY_FUNCTIONS, name) ? UNARY_FUNCTIONS[name] : undefined
      if (fn === undefined) throw new ExpressionError(`不支持的函数「${name}」`)
      return fn(args[0] ?? 0)
    }
    default:
      throw new ExpressionError('表达式内部错误')
  }
}

/** Collect identifiers referenced by an AST (for diagnostics). */
function collectVariables(ast: Ast, into: Set<string>): void {
  switch (ast.kind) {
    case 'variable':
      into.add(ast.name)
      return
    case 'negate':
      collectVariables(ast.operand, into)
      return
    case 'binary':
      collectVariables(ast.left, into)
      collectVariables(ast.right, into)
      return
    case 'call':
      for (const arg of ast.args) collectVariables(arg, into)
      return
    default:
      return
  }
}

/**
 * Compile one expression.
 *
 * @throws ExpressionError when the source is malformed or uses an unknown name.
 */
export function compileExpression(source: string, options: CompileExpressionOptions = {}): CompiledExpression {
  if (typeof source !== 'string' || source.trim() === '') throw new ExpressionError('表达式为空')
  if (source.length > MAX_SOURCE_LENGTH) throw new ExpressionError(`表达式过长（上限 ${MAX_SOURCE_LENGTH} 字符）`)
  const tokens = tokenize(source)
  const ast = new Parser(tokens, options.variables).parse()
  const used = new Set<string>()
  collectVariables(ast, used)
  return {
    source,
    variables: [...used],
    evaluate(values) {
      const result = evaluateAst(ast, values)
      if (Number.isNaN(result)) throw new ExpressionError('表达式结果为 NaN')
      return result
    },
  }
}

/** Evaluate a single point with the variables it needs. */
export function evaluateExpression(
  source: string,
  values: Readonly<Record<string, number>>,
  options: CompileExpressionOptions = {},
): number {
  return compileExpression(source, options).evaluate(values)
}

/** True when the expression compiles with the given variables. */
export function isValidExpression(source: string, variables?: readonly string[]): boolean {
  try {
    compileExpression(source, variables === undefined ? {} : { variables })
    return true
  } catch {
    return false
  }
}
