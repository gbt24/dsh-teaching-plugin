/**
 * Safe math rendering for the teaching text and the derivation activities.
 *
 * The model supplies LaTeX, never HTML. KaTeX runs with `trust: false` (so
 * `\href`, `\htmlClass`, … cannot smuggle links or classes) and
 * `throwOnError: false` (a broken formula degrades to a marked error instead of
 * blanking the page). The only place the renderer assigns `innerHTML` is the
 * KaTeX string it just generated from that LaTeX.
 */
import katex from 'katex'
import { createElement } from './dom.ts'
import type { RenderEnvironment } from './dom.ts'

/** Upper bound on one formula; longer input is treated as malformed. */
const MAX_LATEX_LENGTH = 4_000

/** Render LaTeX to safe HTML with KaTeX. */
export function katexToHtml(latex: string, displayMode: boolean): string {
  const source = latex.length > MAX_LATEX_LENGTH ? latex.slice(0, MAX_LATEX_LENGTH) : latex
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: 'ignore',
      output: 'html',
      maxSize: 40,
      maxExpand: 1_000,
      globalGroup: false,
    })
  } catch {
    return ''
  }
}

/** Render one formula into a span/div; returns the wrapper element. */
export function renderMath(latex: string, displayMode: boolean, environment?: RenderEnvironment): HTMLElement {
  const document = environment?.document ?? (globalThis as { document?: Document }).document
  if (document === undefined) throw new Error('renderMath 需要 Document')
  const wrapper = createElement(document, displayMode ? 'div' : 'span', {
    className: displayMode ? 'teaching-math-block' : 'teaching-math-inline',
  })
  const html = katexToHtml(latex, displayMode)
  if (html === '') {
    // Degrade to readable source, never to raw markup.
    wrapper.textContent = latex
    wrapper.setAttribute('title', '公式无法渲染，已显示原始 LaTeX')
    return wrapper
  }
  // Trusted KaTeX output only: the model's text was passed as LaTeX to KaTeX,
  // not as HTML, and `trust:false` removes link/class injection commands.
  ;(wrapper as HTMLElement).innerHTML = html
  wrapper.setAttribute('data-latex-source', latex.length > 400 ? `${latex.slice(0, 400)}…` : latex)
  return wrapper
}

/** Render display math into an element (used by derivation steps). */
export function renderDisplayMathInto(
  container: HTMLElement,
  latex: string,
  environment?: RenderEnvironment,
): HTMLElement {
  const formula = renderMath(latex, true, environment)
  container.appendChild(formula)
  return formula
}
