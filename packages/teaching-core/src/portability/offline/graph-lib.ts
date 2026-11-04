/**
 * Pure graph helpers shared by the export-time layout step and the inline
 * offline runtime.
 *
 * The functions in this file are intentionally self-contained JavaScript (no
 * imports, no module-level helpers): the exported HTML embeds their source text
 * through `Function.prototype.toString()`, so the browser executes exactly the
 * code that the tests exercise here. Keep them dependency-free and free of
 * TypeScript-only runtime constructs.
 *
 * The evaluator mirrors the restricted grammar of `src/render/expr.ts`
 * (numbers, x + declared parameters, `+ - * / ^ %`, parentheses, constants
 * `pi`/`e`/`tau`, and the fixed function set). It never uses `eval`/`Function`.
 */

/** Values supplied to a compiled expression: `x` plus declared parameters. */
export interface RuntimeValues {
  readonly [name: string]: number
}

/** One compiled graph expression (parse once, evaluate many times). */
export interface RuntimeCompiledExpression {
  evaluate(values: RuntimeValues): number
}

/** Format one number for an offline readout (no locale-dependent noise). */
export function runtimeFormatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  const rounded = Number(value.toFixed(digits))
  return String(rounded)
}

/**
 * Compile a restricted arithmetic expression for the offline runtime.
 *
 * Parsing produces evaluation closures directly (no AST objects), so one
 * `compile` call is enough for a whole slider drag or animation sweep.
 */
export function runtimeCompileExpression(source: string): RuntimeCompiledExpression {
  type Eval = (values: RuntimeValues) => number
  const text = String(source)
  let index = 0
  let depth = 0

  const constants: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 }
  const unaryFunctionNames: readonly string[] = [
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log', 'ln',
    'sqrt', 'abs', 'floor', 'ceil', 'round', 'sign',
  ]
  const binaryFunctionNames: readonly string[] = ['min', 'max', 'pow', 'atan2']

  const fail = (message: string): never => { throw new Error(message) }
  const enter = (): void => {
    depth += 1
    if (depth > 64) fail('表达式嵌套过深')
  }
  const leave = (): void => { depth -= 1 }
  const skipSpace = (): void => {
    while (index < text.length && /\s/u.test(text.charAt(index))) index += 1
  }

  const applyUnary = (name: string, value: number): number => {
    switch (name) {
      case 'sin': return Math.sin(value)
      case 'cos': return Math.cos(value)
      case 'tan': return Math.tan(value)
      case 'asin': return Math.asin(value)
      case 'acos': return Math.acos(value)
      case 'atan': return Math.atan(value)
      case 'exp': return Math.exp(value)
      case 'log': return Math.log(value)
      case 'ln': return Math.log(value)
      case 'sqrt': return Math.sqrt(value)
      case 'abs': return Math.abs(value)
      case 'floor': return Math.floor(value)
      case 'ceil': return Math.ceil(value)
      case 'round': return Math.round(value)
      case 'sign': return Math.sign(value)
      default: return fail(`不支持的函数「${name}」`)
    }
  }

  const parsePrimary = (): Eval => {
    skipSpace()
    const char = text.charAt(index)
    if (char === '(' || char === '（') {
      index += 1
      const inner = parseAdditive()
      skipSpace()
      const close = text.charAt(index)
      if (close !== ')' && close !== '）') fail('表达式缺少右括号')
      index += 1
      return inner
    }
    const numberMatch = /^\d*\.?\d+(?:[eE][+-]?\d+)?/u.exec(text.slice(index))
    if (numberMatch !== null && numberMatch[0] !== '') {
      const value = Number(numberMatch[0])
      if (!Number.isFinite(value)) fail(`数字无效：${numberMatch[0]}`)
      index += numberMatch[0].length
      return (): number => value
    }
    const nameMatch = /^[A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*/u.exec(text.slice(index))
    if (nameMatch === null) return fail('表达式不完整')
    const name = nameMatch[0]
    index += name.length
    skipSpace()
    const nextChar = text.charAt(index)
    if (nextChar === '(' || nextChar === '（') {
      index += 1
      const args: Eval[] = []
      skipSpace()
      const closing = text.charAt(index)
      if (closing !== ')' && closing !== '）') {
        for (;;) {
          args.push(parseAdditive())
          skipSpace()
          const separator = text.charAt(index)
          if (separator === ',' || separator === '，') {
            index += 1
            continue
          }
          break
        }
      }
      skipSpace()
      const finish = text.charAt(index)
      if (finish !== ')' && finish !== '）') fail('函数调用缺少右括号')
      index += 1
      if (unaryFunctionNames.includes(name)) {
        if (args.length !== 1) fail(`函数 ${name} 需要 1 个参数`)
        const only = args[0] ?? ((): number => 0)
        return (values: RuntimeValues): number => applyUnary(name, only(values))
      }
      if (!binaryFunctionNames.includes(name)) fail(`不支持的函数「${name}」`)
      if (name === 'pow' || name === 'atan2') {
        if (args.length !== 2) fail(`函数 ${name} 需要 2 个参数`)
        const first = args[0] ?? ((): number => 0)
        const second = args[1] ?? ((): number => 0)
        return (values: RuntimeValues): number => (name === 'pow'
          ? (first(values) ** second(values))
          : Math.atan2(first(values), second(values)))
      }
      if (args.length < 2) fail(`函数 ${name} 至少需要 2 个参数`)
      return (values: RuntimeValues): number => {
        const evaluated = args.map(arg => arg(values))
        return name === 'min' ? Math.min(...evaluated) : Math.max(...evaluated)
      }
    }
    if (Object.hasOwn(constants, name)) {
      const constant = constants[name] ?? 0
      return (): number => constant
    }
    return (values: RuntimeValues): number => {
      if (!Object.hasOwn(values, name)) throw new Error(`缺少变量「${name}」的值`)
      const value = values[name]
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`变量「${name}」不是有限数字`)
      }
      return value
    }
  }

  const parsePower = (): Eval => {
    enter()
    try {
      const base = parsePrimary()
      skipSpace()
      if (text.charAt(index) === '^') {
        index += 1
        const exponent = parseUnary()
        return (values: RuntimeValues): number => base(values) ** exponent(values)
      }
      return base
    } finally {
      leave()
    }
  }

  const parseUnary = (): Eval => {
    skipSpace()
    const char = text.charAt(index)
    if (char === '+' || char === '-') {
      index += 1
      const operand = parseUnary()
      return char === '-' ? (values: RuntimeValues): number => -operand(values) : operand
    }
    return parsePower()
  }

  const parseMultiplicative = (): Eval => {
    enter()
    try {
      let left = parseUnary()
      for (;;) {
        skipSpace()
        const char = text.charAt(index)
        if (char !== '*' && char !== '/' && char !== '%') return left
        index += 1
        const right = parseUnary()
        const current = left
        if (char === '*') left = (values: RuntimeValues): number => current(values) * right(values)
        else if (char === '/') left = (values: RuntimeValues): number => current(values) / right(values)
        else left = (values: RuntimeValues): number => current(values) % right(values)
      }
    } finally {
      leave()
    }
  }

  const parseAdditive = (): Eval => {
    enter()
    try {
      let left = parseMultiplicative()
      for (;;) {
        skipSpace()
        const char = text.charAt(index)
        if (char !== '+' && char !== '-') return left
        index += 1
        const right = parseMultiplicative()
        const current = left
        left = char === '+'
          ? (values: RuntimeValues): number => current(values) + right(values)
          : (values: RuntimeValues): number => current(values) - right(values)
      }
    } finally {
      leave()
    }
  }

  const evaluateAll = parseAdditive()
  skipSpace()
  if (index < text.length) fail(`表达式末尾有多余内容：「${text.slice(index, index + 12)}」`)
  return {
    evaluate(values: RuntimeValues): number {
      const result = evaluateAll(values)
      if (Number.isNaN(result)) throw new Error('表达式结果为 NaN')
      return result
    },
  }
}

/** Evaluate one expression point with the values it needs. */
export function runtimeEvaluateExpression(source: string, values: RuntimeValues): number {
  return runtimeCompileExpression(source).evaluate(values)
}

/**
 * Build one SVG path for a graph series over the visible x-range.
 *
 * Mirrors the in-app renderer: non-finite results lift the pen, and a jump
 * between adjacent samples (a discontinuity such as `1/x`) starts a new
 * subpath instead of drawing a vertical line.
 */
export function runtimeBuildSeriesPath(
  source: string,
  baseValues: RuntimeValues,
  xFrom: number,
  xTo: number,
  projectX: (x: number) => number,
  projectY: (y: number) => number,
  samples: number,
): string {
  const expression = runtimeCompileExpression(source)
  const step = (xTo - xFrom) / Math.max(1, samples)
  const parts: string[] = []
  let penDown = false
  let previousY = Number.NaN
  for (let sample = 0; sample <= samples; sample += 1) {
    const x = xFrom + step * sample
    const values: Record<string, number> = {}
    for (const name of Object.keys(baseValues)) values[name] = baseValues[name] ?? 0
    values['x'] = x
    let y: number
    try {
      y = expression.evaluate(values)
    } catch {
      penDown = false
      previousY = Number.NaN
      continue
    }
    if (!Number.isFinite(y)) {
      penDown = false
      previousY = Number.NaN
      continue
    }
    if (penDown && Number.isFinite(previousY) && Math.abs(y - previousY) > 1e6) penDown = false
    parts.push(`${penDown ? 'L' : 'M'}${projectX(x).toFixed(2)},${projectY(y).toFixed(2)}`)
    penDown = true
    previousY = y
  }
  return parts.join(' ')
}
