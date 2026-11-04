/**
 * Step-by-step derivation renderer: the student reveals steps one at a time,
 * and reveal state can be restored from persisted activity state.
 */
import type { DerivationPayload } from '../contracts/activity.ts'
import { clearElement, createElement, on, resolveDocument } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { renderMath } from './math.ts'

/** Options for {@link mountDerivation}. */
export interface DerivationMountOptions extends RenderEnvironment {
  /** Restored student state: steps already revealed. */
  readonly revealedStepIds?: readonly string[]
  /** Notifies the caller so reveal state can be persisted. */
  readonly onChange?: (revealedStepIds: readonly string[], source: 'reveal' | 'reveal-all' | 'restore') => void
}

/** Handle returned by {@link mountDerivation}. */
export interface DerivationHandle {
  readonly element: HTMLElement
  getRevealed(): readonly string[]
  revealNext(): string | undefined
  revealAll(): void
  dispose(): void
}

/** Mount a derivation. Unknown step ids in restored state are ignored. */
export function mountDerivation(
  container: HTMLElement,
  payload: DerivationPayload,
  options: DerivationMountOptions = {},
): DerivationHandle {
  const document = resolveDocument(options)
  const steps = payload.steps
  const known = new Set(steps.map(step => step.id))
  const revealed = new Set<string>((options.revealedStepIds ?? []).filter(id => known.has(id)))
  const disposers: (() => void)[] = []
  const wrapper = createElement(document, 'div', { className: 'teaching-derivation' })

  if (payload.claim !== undefined) {
    wrapper.appendChild(createElement(document, 'p', {
      className: 'teaching-derivation-claim',
      text: payload.claim,
      styles: { fontWeight: '600', margin: '0 0 8px' },
    }))
  }

  const list = createElement(document, 'ol', {
    className: 'teaching-derivation-steps',
    styles: { listStyle: 'none', padding: '0', margin: '0', display: 'grid', gap: '8px' },
  })
  const stepNodes = new Map<string, { item: HTMLElement; node: HTMLElement }>()
  const stepIndex = new Map(steps.map((step, index) => [step.id, index + 1]))

  for (const step of steps) {
    const item = createElement(document, 'li', {
      className: 'teaching-derivation-step',
      styles: {
        border: '1px solid var(--dsw-border, rgba(127,127,127,0.25))',
        borderRadius: '8px', padding: '8px 10px',
        background: 'var(--dsw-surface-raised, rgba(127,127,127,0.06))',
      },
    })
    const node = createElement(document, 'div')
    item.appendChild(node)
    stepNodes.set(step.id, { item, node })
    list.appendChild(item)
  }
  wrapper.appendChild(list)

  const conclusion = payload.conclusion !== undefined
    ? createElement(document, 'p', {
      className: 'teaching-derivation-conclusion',
      text: `结论：${payload.conclusion}`,
      styles: { marginTop: '8px', fontWeight: '600' },
    })
    : undefined
  if (conclusion !== undefined) {
    conclusion.style.display = 'none'
    wrapper.appendChild(conclusion)
  }

  const renderSteps = (): void => {
    for (const step of steps) {
      const entry = stepNodes.get(step.id)
      if (entry === undefined) continue
      clearElement(entry.node)
      const hidden = !revealed.has(step.id)
      if (hidden) {
        entry.item.setAttribute('data-revealed', 'false')
        entry.node.appendChild(createElement(document, 'button', {
          text: `揭示第 ${stepIndex.get(step.id) ?? '?'} 步`,
          ariaLabel: `揭示第 ${stepIndex.get(step.id) ?? '?'} 步`,
          attrs: { type: 'button' },
          styles: { fontSize: '12px', padding: '3px 10px', cursor: 'pointer' },
        }))
        const button = entry.node.firstChild as HTMLElement | null
        if (button !== null) {
          disposers.push(on(button, 'click', () => {
            revealed.add(step.id)
            renderSteps()
            refreshButtons()
            options.onChange?.([...revealed], 'reveal')
          }))
        }
        continue
      }
      entry.item.setAttribute('data-revealed', 'true')
      const heading = createElement(document, 'div', {
        text: `第 ${stepIndex.get(step.id) ?? '?'} 步`,
        styles: { fontSize: '11px', opacity: '0.6', marginBottom: '2px' },
      })
      entry.node.appendChild(heading)
      entry.node.appendChild(renderMath(step.latex, true, options))
      if (step.note !== undefined) {
        entry.node.appendChild(createElement(document, 'div', {
          text: step.note,
          styles: { fontSize: '12px', opacity: '0.8', marginTop: '4px' },
        }))
      }
      if (step.dependsOn !== undefined && step.dependsOn.length > 0) {
        entry.node.appendChild(createElement(document, 'div', {
          text: `依据：第 ${step.dependsOn.map(id => stepIndex.get(id)).filter((index): index is number => index !== undefined).join('、')} 步`,
          styles: { fontSize: '11px', opacity: '0.65', marginTop: '4px' },
        }))
      }
      if (step.anchor !== undefined) {
        entry.node.appendChild(createElement(document, 'div', {
          text: `来源：${step.anchor.label}`,
          title: step.anchor.excerpt,
          styles: { fontSize: '11px', opacity: '0.65', marginTop: '4px' },
        }))
      }
    }
    if (conclusion !== undefined) {
      conclusion.style.display = revealed.size === steps.length ? '' : 'none'
    }
  }

  const controls = createElement(document, 'div', {
    className: 'teaching-derivation-controls',
    styles: { display: 'flex', gap: '8px', marginTop: '10px' },
  })
  const nextButton = createElement(document, 'button', {
    text: '揭示下一步', ariaLabel: '揭示下一步', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
  })
  const allButton = createElement(document, 'button', {
    text: '全部揭示', ariaLabel: '全部揭示步骤', attrs: { type: 'button' },
    styles: { fontSize: '12px', padding: '4px 12px', cursor: 'pointer' },
  })
  const refreshButtons = (): void => {
    const next = steps.find(step => !revealed.has(step.id))
    nextButton.disabled = next === undefined
    allButton.disabled = next === undefined
  }
  disposers.push(on(nextButton, 'click', () => {
    const next = steps.find(step => !revealed.has(step.id))
    if (next === undefined) return
    revealed.add(next.id)
    renderSteps()
    refreshButtons()
    options.onChange?.([...revealed], 'reveal')
  }))
  disposers.push(on(allButton, 'click', () => {
    for (const step of steps) revealed.add(step.id)
    renderSteps()
    refreshButtons()
    options.onChange?.([...revealed], 'reveal-all')
  }))
  controls.appendChild(nextButton)
  controls.appendChild(allButton)
  wrapper.appendChild(controls)

  renderSteps()
  refreshButtons()
  if (revealed.size > 0) options.onChange?.([...revealed], 'restore')
  container.appendChild(wrapper)

  return {
    element: wrapper,
    getRevealed: () => [...revealed],
    revealNext: () => {
      const next = steps.find(step => !revealed.has(step.id))
      if (next === undefined) return undefined
      revealed.add(next.id)
      renderSteps()
      refreshButtons()
      options.onChange?.([...revealed], 'reveal')
      return next.id
    },
    revealAll: () => {
      for (const step of steps) revealed.add(step.id)
      renderSteps()
      refreshButtons()
      options.onChange?.([...revealed], 'reveal-all')
    },
    dispose: () => {
      for (const dispose of disposers) dispose()
      disposers.length = 0
      clearElement(wrapper)
      wrapper.remove()
    },
  }
}
