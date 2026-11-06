/**
 * Quiz renderer. The answer key is part of the payload but the UI only reveals
 * it after the student submits or explicitly asks for the full answer; revealing
 * is reported through `onHelpExposed` so the attempt records that help was used.
 */
import type { QuizPayload } from '../contracts/activity.ts'
import type { AttemptFeedback } from '../contracts/learning.ts'
import { createElement, on, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { appendMarkdownBlocks, parseMarkdown } from './markdown.ts'

/** Options for {@link mountQuiz}. */
export interface QuizMountOptions extends RenderEnvironment {
  /** Restored selections (not part of ActivityState; kept for re-render). */
  readonly selectedOptionIds?: readonly string[]
  /** True when the answer was already revealed before a refresh. */
  readonly answerRevealed?: boolean
  /** True when the hint was already revealed. */
  readonly hintRevealed?: boolean
  /** Persisted attempt result; renders the graded state without re-submitting. */
  readonly result?: AttemptFeedback
  /** Student submitted a selection. */
  readonly onSubmit?: (selectedOptionIds: readonly string[]) => void | Promise<void>
  /** Hint or full answer was exposed; used for help-exposure accounting. */
  readonly onHelpExposed?: (help: {
    readonly level: 1 | 'full-answer'
    readonly answer: string
  }) => void
}

/** Handle returned by {@link mountQuiz}. */
export interface QuizHandle {
  readonly element: HTMLElement
  getSelected(): readonly string[]
  revealAnswer(): void
  dispose(): void
}

/** Mount a quiz activity. */
export function mountQuiz(container: HTMLElement, payload: QuizPayload, options: QuizMountOptions = {}): QuizHandle {
  const document = resolveDocument(options)
  const disposers: (() => void)[] = []
  const selected = new Set<string>(options.result?.selectedOptionIds ?? options.selectedOptionIds ?? [])
  let revealed = options.answerRevealed === true || options.result !== undefined
  let hintShown = options.hintRevealed === true

  const wrapper = createElement(document, 'div', { className: 'teaching-quiz' })
  const question = createElement(document, 'div', {
    className: 'teaching-quiz-question',
    styles: { fontWeight: '600', fontSize: '13px', marginBottom: '6px' },
  })
  question.appendChild(document.createTextNode(payload.question))
  if (payload.markdown !== undefined) {
    appendMarkdownBlocks(question, document, parseMarkdown(payload.markdown), options)
  }
  wrapper.appendChild(question)
  wrapper.appendChild(createElement(document, 'div', {
    text: payload.multiple === true ? '多选（至少选一项）' : '单选',
    styles: { fontSize: '11px', opacity: '0.6', marginBottom: '4px' },
  }))

  const optionList = createElement(document, 'div', {
    className: 'teaching-quiz-options',
    attrs: { role: 'group', 'aria-label': '选项' },
    styles: { display: 'grid', gap: '6px' },
  })
  const rowById = new Map<string, HTMLElement>()
  const inputById = new Map<string, HTMLInputElement>()
  const feedbackSuffix = new Map<string, HTMLElement>()
  for (const option of payload.options) {
    const row = createElement(document, 'label', {
      className: 'teaching-quiz-option',
      styles: {
        display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 8px',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))', borderRadius: '8px',
        cursor: 'pointer', fontSize: '12px',
      },
    })
    const input = createElement(document, 'input', {
      attrs: {
        type: payload.multiple === true ? 'checkbox' : 'radio',
        name: 'teaching-quiz-option',
        value: option.id,
      },
      ariaLabel: option.label,
    }) as HTMLInputElement
    input.checked = selected.has(option.id)
    disposers.push(on(input, 'change', () => {
      if (payload.multiple === true) {
        if (input.checked) selected.add(option.id)
        else selected.delete(option.id)
      } else {
        selected.clear()
        selected.add(option.id)
      }
      syncSelections()
    }))
    const label = createElement(document, 'span', { text: option.label })
    const suffix = createElement(document, 'span', { styles: { marginLeft: 'auto', fontSize: '11px' } })
    row.appendChild(input)
    row.appendChild(label)
    row.appendChild(suffix)
    optionList.appendChild(row)
    rowById.set(option.id, row)
    inputById.set(option.id, input)
    feedbackSuffix.set(option.id, suffix)
  }
  wrapper.appendChild(optionList)

  const syncSelections = (): void => {
    for (const option of payload.options) {
      const row = rowById.get(option.id)
      const input = inputById.get(option.id)
      const suffix = feedbackSuffix.get(option.id)
      if (row === undefined || input === undefined || suffix === undefined) continue
      input.checked = selected.has(option.id)
      row.style.background = selected.has(option.id) ? 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.12))' : ''
      if (!revealed) {
        row.style.borderColor = ''
        suffix.textContent = ''
        continue
      }
      const correct = payload.correctOptionIds.includes(option.id)
      const chosen = selected.has(option.id)
      row.style.borderColor = correct ? 'var(--dsw-alias-state-success-primary, #16a34a)' : chosen ? 'var(--dsw-alias-state-error-primary, #dc2626)' : ''
      suffix.textContent = correct ? '✓ 正确选项' : chosen ? '✗ 你的选择不正确' : ''
    }
  }

  const feedback = createElement(document, 'div', {
    className: 'teaching-quiz-feedback',
    styles: { marginTop: '8px', fontSize: '12px' },
  })
  const explanation = createElement(document, 'div', {
    className: 'teaching-quiz-explanation',
    styles: { marginTop: '6px', fontSize: '12px' },
  })

  const controls = createElement(document, 'div', {
    styles: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' },
  })
  const submitButton = createElement(document, 'button', {
    text: '提交答案', ariaLabel: '提交答案', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 14px', cursor: 'pointer' },
  })

  // Hint (level 1 help) is created before submit so no DOM insertion order logic is needed.
  let hintButton: HTMLElement | undefined
  const hintBox = createElement(document, 'div', {
    className: 'teaching-quiz-hint',
    styles: { marginTop: '8px', fontSize: '12px', color: 'var(--dsw-alias-state-warn-primary, #b45309)', display: 'none' },
  })
  const showHint = (): void => {
    if (payload.hint === undefined || hintShown) return
    hintShown = true
    hintBox.textContent = `提示：${payload.hint}`
    hintBox.style.display = ''
    if (hintButton !== undefined) hintButton.style.display = 'none'
    options.onHelpExposed?.({ level: 1, answer: payload.hint })
  }
  if (payload.hint !== undefined) {
    hintButton = createElement(document, 'button', {
      text: '给提示', ariaLabel: '显示提示', attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
    })
    disposers.push(on(hintButton, 'click', showHint))
    controls.appendChild(hintButton)
  }
  controls.appendChild(submitButton)

  const correctLabels = (): string[] =>
    payload.correctOptionIds.map(id => payload.options.find(option => option.id === id)?.label ?? id)

  let revealButton: HTMLElement | undefined
  const doReveal = (): void => {
    if (revealed) return
    revealed = true
    syncSelections()
    feedback.textContent = `正确答案：${correctLabels().join('、')}`
    if (payload.explanation !== undefined) {
      appendMarkdownBlocks(explanation, document, parseMarkdown(payload.explanation), options)
    }
    if (revealButton !== undefined) revealButton.style.display = 'none'
    options.onHelpExposed?.({ level: 'full-answer', answer: correctLabels().join('、') })
  }
  if (payload.correctOptionIds.length > 0) {
    revealButton = createElement(document, 'button', {
      text: '看完整答案', ariaLabel: '查看完整答案', attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
    })
    disposers.push(on(revealButton, 'click', doReveal))
    controls.appendChild(revealButton)
  }
  disposers.push(on(submitButton, 'click', () => {
    if (selected.size === 0) {
      feedback.textContent = '请先选择至少一个选项。'
      return
    }
    feedback.textContent = '已提交；等待教学反馈。'
    void options.onSubmit?.([...selected])
  }))

  wrapper.appendChild(controls)
  wrapper.appendChild(hintBox)
  wrapper.appendChild(feedback)
  wrapper.appendChild(explanation)
  if (options.result !== undefined) {
    const result = options.result
    feedback.textContent = result.passed === true
      ? '✅ 已提交：回答正确'
      : result.passed === false ? '❌ 已提交：回答不正确' : '已提交，反馈见对话。'
    const explanationText = payload.explanation ?? result.explanation
    if (explanationText !== undefined) {
      appendMarkdownBlocks(explanation, document, parseMarkdown(explanationText), options)
    }
    submitButton.disabled = true
    if (hintButton !== undefined) hintButton.style.display = 'none'
    if (revealButton !== undefined) revealButton.style.display = 'none'
  } else {
    if (hintShown) showHint()
    if (revealed) {
      revealed = false
      doReveal()
    }
  }

  container.appendChild(wrapper)
  return {
    element: wrapper,
    getSelected: () => [...selected],
    revealAnswer: doReveal,
    dispose: () => {
      for (const dispose of disposers) dispose()
      disposers.length = 0
      wrapper.remove()
    },
  }
}
