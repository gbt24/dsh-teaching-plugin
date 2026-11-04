/**
 * Code-run activity: editor, run/stop controls, real execution output and the
 * objective checks returned by the Host. The renderer never spawns anything —
 * the Host route does (and the offline export degrades to a static code block
 * plus environment instructions instead of pretending to run code).
 */
import type { CodeRunPayload } from '../contracts/activity.ts'
import { clearElement, createElement, on, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { appendMarkdownBlocks, parseMarkdown } from './markdown.ts'

/** One check outcome shown beside the output. */
export interface CodeRunCheckView {
  readonly name: string
  readonly status: 'pass' | 'fail' | 'not-run'
  readonly detail?: string
}

/** Result of one execution, as the Host returns it (`ExperimentRun`). */
export interface CodeRunResultView {
  readonly runId?: string
  readonly status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed-out'
  readonly stdout: string
  readonly stderr: string
  readonly exitCode?: number
  readonly durationMs?: number
  readonly checks?: readonly CodeRunCheckView[]
  readonly verification?: 'objective' | 'unverified' | 'exploratory'
  readonly resourceNote?: string
  /** Present when the run could not start (e.g. environment missing). */
  readonly errorMessage?: string
}

/** Options for {@link mountCodeRun}. */
export interface CodeRunMountOptions extends RenderEnvironment {
  /** Restored student code; falls back to the payload code. */
  readonly code?: string
  /** Runs code through the Host; absent in the offline export. */
  readonly onRun?: (request: {
    readonly code: string
    readonly language: string
    readonly dialect?: string
    readonly stdin?: string
  }) => Promise<CodeRunResultView> | CodeRunResultView
  /** Cancels the in-flight run (`/experiments.cancel`); optional. */
  readonly onCancel?: (runId: string | undefined) => void | Promise<void>
  /** Persists the edited code as activity state. */
  readonly onChange?: (code: string) => void
}

/** Handle returned by {@link mountCodeRun}. */
export interface CodeRunHandle {
  readonly element: HTMLElement
  getCode(): string
  setCode(code: string): void
  run(): Promise<void>
  setResult(result: CodeRunResultView | null): void
  dispose(): void
}

const VERIFICATION_LABEL: Readonly<Record<string, string>> = {
  objective: '客观校验',
  exploratory: '探索性运行（无客观检查）',
  unverified: '未验证',
}

/** Mount a runnable code activity. */
export function mountCodeRun(
  container: HTMLElement,
  payload: CodeRunPayload,
  options: CodeRunMountOptions = {},
): CodeRunHandle {
  const document = resolveDocument(options)
  const disposers: (() => void)[] = []
  let currentCode = options.code ?? payload.code
  let busy = false
  let lastResult: CodeRunResultView | null = null
  let lastRunId: string | undefined

  const wrapper = createElement(document, 'div', { className: 'teaching-code-run' })
  if (payload.title !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      text: payload.title,
      styles: { fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
    }))
  }
  if (payload.instructions !== undefined) {
    const instructions = createElement(document, 'div', { className: 'teaching-code-run-instructions' })
    appendMarkdownBlocks(instructions, document, parseMarkdown(payload.instructions), options)
    wrapper.appendChild(instructions)
  }
  wrapper.appendChild(createElement(document, 'div', {
    text: `语言：${payload.language}${payload.dialect !== undefined ? `（${payload.dialect} 方言）` : ''}${(payload.requires ?? []).length > 0 ? ` · 预置：${(payload.requires ?? []).join('、')}` : ''}`,
    styles: { fontSize: '11px', opacity: '0.65', margin: '2px 0 6px' },
  }))

  const editor = createElement(document, 'textarea', {
    className: 'teaching-code-editor',
    attrs: {
      'aria-label': '代码编辑器',
      rows: String(Math.min(20, Math.max(6, currentCode.split('\n').length + 1))),
      spellcheck: 'false',
      ...(payload.editable ? {} : { readonly: 'readonly' }),
    },
    styles: {
      width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '12px', lineHeight: '1.5', padding: '8px', borderRadius: '8px',
      border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))',
      background: 'var(--dsw-alias-bg-base, transparent)', color: 'inherit', resize: 'vertical',
      boxSizing: 'border-box',
    },
  })
  editor.value = currentCode
  disposers.push(on(editor, 'input', () => {
    currentCode = editor.value
    options.onChange?.(currentCode)
  }))
  wrapper.appendChild(editor)

  const controls = createElement(document, 'div', {
    className: 'teaching-code-run-controls',
    styles: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' },
  })
  const runButton = createElement(document, 'button', {
    text: '运行', ariaLabel: '运行代码', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 14px', cursor: 'pointer' },
  })
  const stopButton = createElement(document, 'button', {
    text: '停止', ariaLabel: '停止运行', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 14px', cursor: 'pointer', display: 'none' },
  })
  const resetButton = payload.starterCode !== undefined
    ? createElement(document, 'button', {
      text: '重置为起始代码', ariaLabel: '重置为起始代码', attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
    })
    : undefined
  const statusLine = createElement(document, 'span', {
    className: 'teaching-code-run-status',
    text: '',
    styles: { fontSize: '12px', opacity: '0.8' },
  })
  const output = createElement(document, 'div', {
    className: 'teaching-code-run-output',
    styles: { marginTop: '8px' },
  })

  const setBusy = (value: boolean): void => {
    busy = value
    runButton.disabled = value
    if (options.onCancel !== undefined) stopButton.style.display = value ? '' : 'none'
    if (value) statusLine.textContent = '运行中…（有超时限制，可停止）'
  }

  const renderResult = (result: CodeRunResultView | null): void => {
    clearElement(output)
    lastResult = result
    if (result === null) return
    lastRunId = result.runId
    const parts: string[] = [`运行结果：${result.status}`]
    if (result.exitCode !== undefined) parts.push(`退出码 ${String(result.exitCode)}`)
    if (result.durationMs !== undefined) parts.push(`${result.durationMs}ms`)
    if (result.verification !== undefined) parts.push(VERIFICATION_LABEL[result.verification] ?? result.verification)
    statusLine.textContent = parts.join(' · ')
    if (result.errorMessage !== undefined) {
      output.appendChild(createElement(document, 'div', {
        text: result.errorMessage,
        styles: { color: 'var(--dsw-alias-state-warn-primary, #b45309)', fontSize: '12px', whiteSpace: 'pre-wrap' },
      }))
    }
    if (result.stdout !== '') {
      output.appendChild(createElement(document, 'div', { text: 'stdout', styles: { fontSize: '11px', opacity: '0.6', marginTop: '6px' } }))
      output.appendChild(createElement(document, 'pre', {
        className: 'teaching-code-run-stdout',
        text: result.stdout,
        styles: {
          margin: '2px 0', padding: '8px', borderRadius: '6px', maxHeight: '260px', overflow: 'auto',
          background: 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.08))', fontSize: '12px',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        },
      }))
    }
    if (result.stderr !== '') {
      output.appendChild(createElement(document, 'div', { text: 'stderr', styles: { fontSize: '11px', opacity: '0.6', marginTop: '6px' } }))
      output.appendChild(createElement(document, 'pre', {
        className: 'teaching-code-run-stderr',
        text: result.stderr,
        styles: {
          margin: '2px 0', padding: '8px', borderRadius: '6px', maxHeight: '200px', overflow: 'auto',
          background: 'rgba(239,68,68,0.08)', color: 'var(--dsw-alias-state-error-primary, #b91c1c)', fontSize: '12px',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        },
      }))
    }
    if (result.checks !== undefined && result.checks.length > 0) {
      const list = createElement(document, 'ul', { styles: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px' } })
      for (const check of result.checks) {
        const marker = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '·'
        list.appendChild(createElement(document, 'li', {
          text: `${marker} ${check.name}${check.detail !== undefined ? ` — ${check.detail}` : ''}`,
          styles: { color: check.status === 'fail' ? 'var(--dsw-alias-state-error-primary, #b91c1c)' : 'inherit' },
        }))
      }
      output.appendChild(list)
    }
    if (result.resourceNote !== undefined) {
      output.appendChild(createElement(document, 'div', {
        text: `说明：${result.resourceNote}`,
        styles: { fontSize: '11px', opacity: '0.6', marginTop: '6px' },
      }))
    }
    if (result.stdout === '' && result.stderr === '' && result.errorMessage === undefined) {
      output.appendChild(createElement(document, 'div', {
        text: '（没有输出）', styles: { fontSize: '12px', opacity: '0.6' },
      }))
    }
  }

  const doRun = async (): Promise<void> => {
    if (busy) return
    if (options.onRun === undefined) {
      statusLine.textContent = '离线导出页面不执行原生代码；请按环境说明在本机运行。'
      return
    }
    setBusy(true)
    lastRunId = undefined
    try {
      const result = await options.onRun({
        code: currentCode,
        language: payload.language,
        ...(payload.dialect !== undefined ? { dialect: payload.dialect } : {}),
        ...(payload.stdin !== undefined ? { stdin: payload.stdin } : {}),
      })
      renderResult(result)
    } catch (error) {
      renderResult({
        status: 'failed',
        stdout: '',
        stderr: '',
        errorMessage: `运行失败：${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setBusy(false)
    }
  }

  disposers.push(on(runButton, 'click', () => { void doRun() }))
  disposers.push(on(stopButton, 'click', () => { if (lastRunId !== undefined) void options.onCancel?.(lastRunId) }))
  if (resetButton !== undefined) {
    disposers.push(on(resetButton, 'click', () => {
      currentCode = payload.starterCode ?? ''
      editor.value = currentCode
      options.onChange?.(currentCode)
    }))
  }
  controls.appendChild(runButton)
  if (options.onCancel !== undefined) controls.appendChild(stopButton)
  if (resetButton !== undefined) controls.appendChild(resetButton)
  controls.appendChild(statusLine)
  wrapper.appendChild(controls)
  wrapper.appendChild(output)

  if (options.onRun === undefined) {
    runButton.disabled = true
    wrapper.appendChild(createElement(document, 'p', {
      className: 'teaching-code-run-offline',
      text: '离线页面：不执行原生代码，仅保留代码与运行说明。',
      styles: { fontSize: '11px', opacity: '0.65', marginTop: '6px' },
    }))
  }
  if (payload.tests !== undefined && payload.tests.length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: `客观检查：${payload.tests.map(test => `${test.name}（${test.type}）`).join('、')}`,
      styles: { fontSize: '11px', opacity: '0.6', marginTop: '6px' },
    }))
  }

  container.appendChild(wrapper)

  return {
    element: wrapper,
    getCode: () => currentCode,
    setCode: (code) => {
      currentCode = code
      editor.value = code
      options.onChange?.(code)
    },
    run: doRun,
    setResult: renderResult,
    dispose: () => {
      for (const dispose of disposers) dispose()
      disposers.length = 0
      clearElement(wrapper)
      wrapper.remove()
      lastResult = null
    },
  }
}

/** Expose the last result for callers that need to persist it. */
export type { CodeRunHandle as CodeRunMountHandle }
