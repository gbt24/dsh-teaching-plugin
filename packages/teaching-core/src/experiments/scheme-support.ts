/**
 * Scheme (SICP dialect) support: the teaching prelude and the child-process
 * runner used to execute student programs with the npm `biwascheme` interpreter.
 *
 * Facts about the engine (biwascheme 0.8.3), verified against the real
 * interpreter and recorded in docs/evidence/T05.md:
 * - `display`, `newline`, `print`, `write` write to the process stdout;
 * - `raise` reports through the interpreter's error handler and stops the
 *   program; the runner then exits with code 1;
 * - `(exit n)` terminates the child process with code n;
 * - exact rationals are not supported (`(/ 1 3)` is a JavaScript number);
 * - `runtime`, `inc`, `dec`, `nil`, `true`, `false`, `error` and the SICP stream
 *   primitives are NOT built in — they are provided by {@link SICP_PRELUDE};
 * - `define-macro` works, R6RS `syntax-rules` does not (avoid macros in course
 *   material beyond the ones provided here).
 *
 * These differences are stated to the student instead of pretending the engine
 * is the book's original MIT Scheme. The prelude never changes the installed
 * package; it is prepended at run time inside a throw-away temp directory.
 */

/**
 * Prelude for `dialect: 'sicp'`.
 *
 * Deliberately small: only names the textbook chapters actually use and that
 * the engine lacks. Each definition is plain Scheme so an offline export can be
 * read by a student.
 */
export const SICP_PRELUDE: string = [
  ';; ---- 教学预置库：SICP 方言（由插件注入，不是 MIT Scheme 本体）----',
  "(define nil '())",
  '(define true #t)',
  '(define false #f)',
  '(define (inc x) (+ x 1))',
  '(define (dec x) (- x 1))',
  '(define (identity x) x)',
  '(define (square x) (* x x))',
  '(define (cube x) (* x x x))',
  '(define (average x y) (/ (+ x y) 2))',
  '(define (error message) (raise message))',
  '',
  ';; 延迟求值 / 流（SICP 3.5）：cons-stream 的第二个参数必须惰性求值，',
  ';; 因此这里用 define-macro（该解释器不支持 R6RS syntax-rules）。',
  '(define-macro (cons-stream a b) `(cons ,a (delay ,b)))',
  "(define the-empty-stream '())",
  '(define (stream-null? s) (null? s))',
  '(define (stream-car s) (car s))',
  '(define (stream-cdr s) (force (cdr s)))',
  '(define (stream-map proc s)',
  '  (if (stream-null? s)',
  '      the-empty-stream',
  '      (cons-stream (proc (stream-car s)) (stream-map proc (stream-cdr s)))))',
  '(define (stream-filter pred s)',
  '  (cond ((stream-null? s) the-empty-stream)',
  '        ((pred (stream-car s)) (cons-stream (stream-car s) (stream-filter pred (stream-cdr s))))',
  '        (else (stream-filter pred (stream-cdr s)))))',
  '(define (stream-for-each proc s)',
  "  (if (stream-null? s) 'done (begin (proc (stream-car s)) (stream-for-each proc (stream-cdr s)))))",
  '(define (stream-ref s n)',
  '  (if (= n 0) (stream-car s) (stream-ref (stream-cdr s) (- n 1))))',
  '(define (stream-take s n)',
  "  (if (= n 0) '() (cons (stream-car s) (stream-take (stream-cdr s) (- n 1)))))",
  '(define (stream-enumerate-interval low high)',
  '  (if (> low high) the-empty-stream (cons-stream low (stream-enumerate-interval (+ low 1) high))))',
  '(define (display-line x) (newline) (display x))',
  '(define (display-stream s) (stream-for-each display-line s))',
  '',
  ';; 常见课程辅助（SICP 2.2 序列操作）',
  '(define (accumulate op initial sequence)',
  "  (if (null? sequence) initial (op (car sequence) (accumulate op initial (cdr sequence)))))",
  '(define (enumerate-interval low high)',
  "  (if (> low high) '() (cons low (enumerate-interval (+ low 1) high))))",
  '(define (flatmap proc seq) (accumulate append (quote ()) (map proc seq)))',
  '(define (filter-map proc seq)',
  '  (cond ((null? seq) (quote ()))',
  '        ((proc (car seq)) (cons (proc (car seq)) (filter-map proc (cdr seq))))',
  '        (else (filter-map proc (cdr seq)))))',
  '',
  ';; 与教材的已知差异（运行器会向学生显示）：',
  ';; - runtime 返回毫秒（Date.now），MIT Scheme 的 runtime 返回微秒；',
  ';; - 无精确有理数，分数按 JavaScript 浮点数计算；',
  ';; - 未提供 syntax-rules（仅 define-macro）。',
  '',
].join('\n')

/**
 * The CommonJS runner executed by the Node/Electron child process.
 *
 * It receives the resolved biwascheme entry, the prelude path and the program
 * path through the environment/argv so no path is baked into the bundle. All
 * output goes straight to the child's stdout/stderr, which the execution kernel
 * captures with a byte cap.
 */
export const SCHEME_RUNNER_SOURCE: string = [
  "'use strict'",
  '// 由教学插件生成的一次性 Scheme 运行器（不是课程内容）。',
  "const fs = require('node:fs')",
  'const entry = process.env.TEACHING_BIWASCHEME_ENTRY',
  'const preludePath = process.env.TEACHING_SICP_PRELUDE',
  'const programPath = process.argv[2]',
  'const stderr = (text) => { try { process.stderr.write(String(text)) } catch {} }',
  "if (!entry || !programPath) { stderr('运行器缺少 biwascheme 或程序路径\\n'); process.exit(2) }",
  'let BiwaScheme',
  'try {',
  '  BiwaScheme = require(entry)',
  '} catch (cause) {',
  "  stderr('无法加载 biwascheme 解释器: ' + String(cause && cause.message ? cause.message : cause) + '\\n')",
  '  process.exit(2)',
  '}',
  'BiwaScheme.define_libfunc("runtime", 0, 0, () => Date.now())',
  'BiwaScheme.define_libfunc("random", 1, 1, (args) => {',
  '  const n = args[0];',
  '  const bound = Number(n);',
  '  if (!Number.isFinite(bound) || bound <= 0) return 0',
  '  return Math.floor(Math.random() * Math.floor(bound))',
  '})',
  'let failed = false',
  'const formatError = (err) => {',
  '  if (err === null || err === undefined) return "未知错误"',
  '  if (typeof err === "string") return err',
  '  if (typeof err.message === "string" && err.message !== "") return err.message',
  '  return String(err)',
  '}',
  'const interpreter = new BiwaScheme.Interpreter((err) => {',
  '  failed = true',
  "  stderr('Scheme 错误: ' + formatError(err) + '\\n')",
  '})',
  'try {',
  '  if (preludePath && fs.existsSync(preludePath)) {',
  '    interpreter.evaluate(fs.readFileSync(preludePath, "utf8"))',
  '  }',
  '  const program = fs.readFileSync(programPath, "utf8")',
  '  interpreter.evaluate(program)',
  '} catch (cause) {',
  '  failed = true',
  "  stderr('Scheme 错误: ' + formatError(cause) + '\\n')",
  '}',
  'if (failed) process.exitCode = 1',
  '',
].join('\n')

/** Known differences between the SICP teaching prelude and the book's Scheme. */
export const SCHEME_DIALECT_DIFFERENCES: readonly string[] = [
  '解释器为 biwascheme 0.8.3（Node 子进程内运行），不是 MIT Scheme / Chez Scheme。',
  'runtime 返回毫秒（Date.now）；教材中用 runtime 计算的时间差需按毫秒解释。',
  '没有精确有理数：(/ 1 3) 得到 JavaScript 浮点数 0.3333333333333333。',
  '不支持 R6RS syntax-rules；预置库的 cons-stream 用 define-macro 实现。',
  'nil / true / false / inc / dec / error / 流操作与 accumulate 等由插件预置库提供，不是解释器内置。',
  'display、newline、write、print 输出到子进程标准输出；raise 触发错误处理器后程序以退出码 1 结束。',
  '(exit n) 会以退出码 n 结束整个子进程；运行器的超时/取消会强制结束该进程。',
]

/** Describe the dialect facts shown to students in the experiment panel. */
export function schemeDialectSummary(dialect: string | undefined): readonly string[] {
  if (dialect === undefined || dialect === '' || dialect === 'sicp') return SCHEME_DIALECT_DIFFERENCES
  return [
    `方言 ${dialect}：未注入 SICP 预置库，仅提供 biwascheme 内置原语。`,
    'biwascheme 0.8.3 的通用限制：无精确有理数、无 R6RS syntax-rules。',
  ]
}
