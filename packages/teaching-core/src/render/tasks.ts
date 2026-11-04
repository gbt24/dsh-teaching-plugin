/**
 * Non-executable activity renderers: explanation, reading task, proof task,
 * open question and experiment note.
 *
 * These are the forms where the student writes prose. The renderer collects the
 * text and reports it upward; assessment (rubric/model judgement) is never
 * faked in the client — the Host stores the attempt and its validation.
 */
import type {
  ExplanationPayload, ExperimentNotePayload, OpenQuestionPayload, ProofTaskPayload,
  ReadingTaskPayload, RubricCriterion,
} from '../contracts/activity.ts'
import type { SourceAnchor } from '../contracts/source.ts'
import { clearElement, createElement, on, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { appendMarkdownBlocks, parseMarkdown } from './markdown.ts'

/** Shared handle for simple rendered content. */
export interface ContentHandle {
  readonly element: HTMLElement
  dispose(): void
}

/** Options carrying the document (and anchor navigation). */
export interface TaskMountOptions extends RenderEnvironment {
  readonly onAnchorClick?: (anchor: SourceAnchor) => void
}

/** Render an explanation (the persistent teaching area's prose form). */
export function mountExplanation(
  container: HTMLElement,
  payload: ExplanationPayload,
  options: TaskMountOptions = {},
): ContentHandle {
  const document = resolveDocument(options)
  const wrapper = createElement(document, 'div', { className: 'teaching-explanation' })
  if (payload.title !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      text: payload.title, styles: { fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
    }))
  }
  appendMarkdownBlocks(wrapper, document, parseMarkdown(payload.markdown), options)
  if ((payload.keyPoints ?? []).length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: '关键点', styles: { fontWeight: '600', fontSize: '12px', marginTop: '8px' },
    }))
    const list = createElement(document, 'ul', { styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px' } })
    for (const point of payload.keyPoints ?? []) list.appendChild(createElement(document, 'li', { text: point }))
    wrapper.appendChild(list)
  }
  if ((payload.caveats ?? []).length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: '适用条件与注意', styles: { fontWeight: '600', fontSize: '12px', marginTop: '8px' },
    }))
    const list = createElement(document, 'ul', {
      styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px', color: '#b45309' },
    })
    for (const caveat of payload.caveats ?? []) list.appendChild(createElement(document, 'li', { text: caveat }))
    wrapper.appendChild(list)
  }
  container.appendChild(wrapper)
  return { element: wrapper, dispose: () => { clearElement(wrapper); wrapper.remove() } }
}

/** Render a reading task pointing into course material. */
export function mountReadingTask(
  container: HTMLElement,
  payload: ReadingTaskPayload,
  options: TaskMountOptions = {},
): ContentHandle {
  const document = resolveDocument(options)
  const wrapper = createElement(document, 'div', { className: 'teaching-reading-task' })
  appendMarkdownBlocks(wrapper, document, parseMarkdown(payload.instructions), options)
  if (payload.minMinutes !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      text: `建议阅读时间：约 ${payload.minMinutes} 分钟`,
      styles: { fontSize: '12px', opacity: '0.7', marginTop: '4px' },
    }))
  }
  appendAnchors(wrapper, document, payload.anchors, options)
  if (payload.questions.length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: '阅读时思考', styles: { fontWeight: '600', fontSize: '12px', marginTop: '8px' },
    }))
    const list = createElement(document, 'ol', { styles: { margin: '2px 0', paddingLeft: '20px', fontSize: '12px' } })
    for (const question of payload.questions) list.appendChild(createElement(document, 'li', { text: question }))
    wrapper.appendChild(list)
  }
  container.appendChild(wrapper)
  return { element: wrapper, dispose: () => { clearElement(wrapper); wrapper.remove() } }
}

/** Render a proof task with rubric, hint reveal and an answer box. */
export function mountProofTask(
  container: HTMLElement,
  payload: ProofTaskPayload,
  options: AnswerTaskMountOptions = {},
): AnswerTaskHandle {
  const document = resolveDocument(options)
  const wrapper = createElement(document, 'div', { className: 'teaching-proof-task' })
  wrapper.appendChild(createElement(document, 'div', {
    text: `命题：${payload.claim}`,
    styles: { fontWeight: '600', fontSize: '13px', margin: '0 0 4px' },
  }))
  if (payload.assumptions.length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: `已知条件：${payload.assumptions.join('；')}`,
      styles: { fontSize: '12px', marginBottom: '4px' },
    }))
  }
  wrapper.appendChild(renderRubric(document, payload.rubric))
  const handle = mountAnswerArea(wrapper, document, options, {
    ...(payload.hint !== undefined ? { hint: payload.hint } : {}),
    ...(payload.reference !== undefined ? { reference: payload.reference } : {}),
  })
  container.appendChild(wrapper)
  return {
    element: wrapper,
    getAnswerText: handle.getAnswerText,
    revealReference: handle.revealReference,
    dispose: () => {
      handle.dispose()
      wrapper.remove()
    },
  }
}

/** Render an open question with rubric and an answer box. */
export function mountOpenQuestion(
  container: HTMLElement,
  payload: OpenQuestionPayload,
  options: AnswerTaskMountOptions = {},
): AnswerTaskHandle {
  const document = resolveDocument(options)
  const wrapper = createElement(document, 'div', { className: 'teaching-open-question' })
  appendMarkdownBlocks(wrapper, document, parseMarkdown(payload.prompt), options)
  if (payload.expectedLanguage !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      text: `作答语言：${payload.expectedLanguage === 'zh' ? '中文' : payload.expectedLanguage === 'en' ? '英文' : '中英双语'}`,
      styles: { fontSize: '11px', opacity: '0.6', marginTop: '2px' },
    }))
  }
  wrapper.appendChild(renderRubric(document, payload.rubric))
  const handle = mountAnswerArea(wrapper, document, options, {
    ...(payload.referencePoints !== undefined ? { referencePoints: payload.referencePoints } : {}),
  })
  container.appendChild(wrapper)
  return {
    element: wrapper,
    getAnswerText: handle.getAnswerText,
    revealReference: handle.revealReference,
    dispose: () => {
      handle.dispose()
      wrapper.remove()
    },
  }
}

/** Render an experiment note (recorded run facts + limitations). */
export function mountExperimentNote(
  container: HTMLElement,
  payload: ExperimentNotePayload,
  options: TaskMountOptions = {},
): ContentHandle {
  const document = resolveDocument(options)
  const wrapper = createElement(document, 'div', { className: 'teaching-experiment-note' })
  wrapper.appendChild(createElement(document, 'div', {
    text: payload.title, styles: { fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
  }))
  appendMarkdownBlocks(wrapper, document, parseMarkdown(payload.markdown), options)
  const chips: string[] = []
  if (payload.runId !== undefined) chips.push(`运行 ${payload.runId}`)
  if (payload.environmentId !== undefined) chips.push(`环境 ${payload.environmentId}`)
  if (chips.length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: chips.join(' · '), styles: { fontSize: '11px', opacity: '0.65', marginTop: '4px' },
    }))
  }
  if ((payload.limitations ?? []).length > 0) {
    wrapper.appendChild(createElement(document, 'div', {
      text: '局限', styles: { fontWeight: '600', fontSize: '12px', marginTop: '8px' },
    }))
    const list = createElement(document, 'ul', { styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px', color: '#b45309' } })
    for (const limitation of payload.limitations ?? []) list.appendChild(createElement(document, 'li', { text: limitation }))
    wrapper.appendChild(list)
  }
  container.appendChild(wrapper)
  return { element: wrapper, dispose: () => { clearElement(wrapper); wrapper.remove() } }
}

/** Options for answer-writing tasks. */
export interface AnswerTaskMountOptions extends TaskMountOptions {
  /** Student submitted prose; the client records the attempt through the Host. */
  readonly onSubmitAnswer?: (answerText: string) => void | Promise<void>
  /** Hint or reference was revealed; used for help-exposure accounting. */
  readonly onHelpExposed?: (help: { readonly level: 1 | 'full-answer'; readonly answer: string }) => void
}

/** Handle for answer-writing tasks. */
export interface AnswerTaskHandle extends ContentHandle {
  getAnswerText(): string
  revealReference(): void
}

interface AnswerExtras {
  readonly hint?: string
  readonly reference?: string
  readonly referencePoints?: readonly string[]
}

function mountAnswerArea(
  root: HTMLElement,
  document: Document,
  options: AnswerTaskMountOptions,
  extras: AnswerExtras,
): {
  getAnswerText: () => string
  revealReference: () => void
  dispose: () => void
} {
  const disposers: (() => void)[] = []
  const textarea = createElement(document, 'textarea', {
    className: 'teaching-answer-input',
    attrs: { 'aria-label': '你的回答', rows: '6', placeholder: '写下你的推理过程或答案（可用中文）' },
    styles: {
      width: '100%', marginTop: '8px', padding: '8px', fontSize: '12px', lineHeight: '1.6',
      borderRadius: '8px', border: '1px solid var(--dsw-border, rgba(127,127,127,0.3))',
      background: 'var(--dsw-surface, transparent)', color: 'inherit', resize: 'vertical',
      boxSizing: 'border-box', fontFamily: 'inherit',
    },
  })
  root.appendChild(textarea)

  const referenceBox = createElement(document, 'div', {
    className: 'teaching-reference',
    styles: { marginTop: '6px', fontSize: '12px' },
  })
  let referenceRevealed = false
  const revealReference = (): void => {
    if (referenceRevealed) return
    referenceRevealed = true
    clearElement(referenceBox)
    if (extras.reference !== undefined) {
      appendMarkdownBlocks(referenceBox, document, parseMarkdown(`**参考答案：** ${extras.reference}`), options)
    }
    if (extras.referencePoints !== undefined) {
      referenceBox.appendChild(createElement(document, 'div', {
        text: '要点：', styles: { fontWeight: '600', fontSize: '12px', marginTop: '4px' },
      }))
      const list = createElement(document, 'ul', { styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px' } })
      for (const point of extras.referencePoints) list.appendChild(createElement(document, 'li', { text: point }))
      referenceBox.appendChild(list)
    }
    options.onHelpExposed?.({ level: 'full-answer', answer: extras.reference ?? (extras.referencePoints ?? []).join('；') })
  }

  const controls = createElement(document, 'div', {
    styles: { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' },
  })
  const submitButton = createElement(document, 'button', {
    text: '提交回答', ariaLabel: '提交回答', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 14px', cursor: 'pointer' },
  })
  const status = createElement(document, 'span', { styles: { fontSize: '12px', opacity: '0.75' } })
  disposers.push(on(submitButton, 'click', () => {
    const answerText = textarea.value
    if (answerText.trim() === '') {
      status.textContent = '请先写下回答。'
      return
    }
    status.textContent = '已提交；等待教学反馈。'
    void options.onSubmitAnswer?.(answerText)
  }))
  controls.appendChild(submitButton)

  if (extras.hint !== undefined) {
    const hintButton = createElement(document, 'button', {
      text: '给提示', ariaLabel: '显示提示', attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
    })
    const hintBox = createElement(document, 'div', {
      className: 'teaching-hint', styles: { marginTop: '6px', fontSize: '12px', color: '#b45309' },
    })
    disposers.push(on(hintButton, 'click', () => {
      clearElement(hintBox)
      hintBox.appendChild(document.createTextNode(`提示：${extras.hint ?? ''}`))
      hintButton.style.display = 'none'
      options.onHelpExposed?.({ level: 1, answer: extras.hint ?? '' })
    }))
    controls.appendChild(hintButton)
    root.appendChild(controls)
    root.appendChild(hintBox)
  } else {
    root.appendChild(controls)
  }

  if (extras.reference !== undefined || (extras.referencePoints ?? []).length > 0) {
    const revealButton = createElement(document, 'button', {
      text: '看完整答案', ariaLabel: '查看完整答案', attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
    })
    disposers.push(on(revealButton, 'click', revealReference))
    controls.appendChild(revealButton)
  }
  controls.appendChild(status)
  root.appendChild(referenceBox)

  return {
    getAnswerText: () => textarea.value,
    revealReference,
    dispose: () => {
      for (const dispose of disposers) dispose()
      disposers.length = 0
      textarea.remove()
      controls.remove()
      referenceBox.remove()
    },
  }
}

function renderRubric(document: Document, rubric: readonly RubricCriterion[]): HTMLElement {
  const wrapper = createElement(document, 'div', { className: 'teaching-rubric', styles: { marginTop: '8px' } })
  if (rubric.length === 0) return wrapper
  wrapper.appendChild(createElement(document, 'div', {
    text: '评价标准（会保留判断依据与局限）',
    styles: { fontWeight: '600', fontSize: '12px', marginBottom: '2px' },
  }))
  const list = createElement(document, 'ul', { styles: { margin: '2px 0', paddingLeft: '18px', fontSize: '12px' } })
  for (const criterion of rubric) {
    const detailParts = [criterion.description, criterion.observable === undefined ? undefined : `观察点：${criterion.observable}`]
      .filter((part): part is string => part !== undefined && part !== '')
    list.appendChild(createElement(document, 'li', {
      text: `${criterion.label}（权重 ${criterion.weight}）${detailParts.length > 0 ? `：${detailParts.join('；')}` : ''}`,
    }))
  }
  wrapper.appendChild(list)
  return wrapper
}

/** Render source anchors as clickable citation chips. */
export function appendAnchors(
  parent: HTMLElement,
  document: Document,
  anchors: readonly SourceAnchor[],
  options: TaskMountOptions,
): void {
  if (anchors.length === 0) return
  const row = createElement(document, 'div', {
    className: 'teaching-anchors',
    styles: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' },
  })
  for (const anchor of anchors) {
    const chip = createElement(document, 'button', {
      className: 'teaching-anchor-chip',
      text: anchor.label,
      title: anchor.excerpt,
      ariaLabel: `查看来源：${anchor.label}`,
      attrs: { type: 'button' },
      styles: {
        fontSize: '11px', padding: '2px 8px', borderRadius: '999px', cursor: 'pointer',
        border: '1px solid var(--dsw-border, rgba(127,127,127,0.3))', background: 'transparent',
        color: 'inherit', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      },
    })
    chip.addEventListener('click', () => options.onAnchorClick?.(anchor))
    row.appendChild(chip)
  }
  parent.appendChild(row)
}
