/**
 * Declarative Cartesian graph renderer (SVG, no external dependency).
 *
 * Expressions are evaluated by the restricted evaluator in `expr.ts`, never by
 * `eval`. Parameter sliders redraw immediately; an optional animation sweeps
 * one declared parameter with play/pause. `requestFrame`/`cancelFrame` are
 * injectable so tests can drive animation deterministically.
 */
import type { GraphPayload } from '../contracts/activity.ts'
import {
  PLOT_COLORS, appendAll, clearElement, createElement, createSvgElement, formatNumber, on,
  plotColor, resolveDocument,
} from './dom.ts'
import type { RenderEnvironment } from './dom.ts'
import { compileExpression, ExpressionError, type CompiledExpression } from './expr.ts'

/** Options accepted by {@link mountGraph}. */
export interface GraphMountOptions extends RenderEnvironment {
  /** Initial parameter overrides (restored student state). */
  readonly params?: Readonly<Record<string, number>>
  /** Called on slider/animation changes; persist this as activity state. */
  readonly onChange?: (params: Readonly<Record<string, number>>, source: 'slider' | 'animation') => void
  /** Injectable animation clock (tests provide a manual scheduler). */
  readonly requestFrame?: (callback: (timeMs: number) => void) => number
  readonly cancelFrame?: (handle: number) => void
  /** Logical canvas size; the SVG scales to the container width. */
  readonly width?: number
  readonly height?: number
}

/** Handle returned by {@link mountGraph}. */
export interface GraphHandle {
  readonly element: HTMLElement
  getParams(): Readonly<Record<string, number>>
  setParams(next: Readonly<Record<string, number>>): void
  isPlaying(): boolean
  play(): void
  pause(): void
  dispose(): void
}

const DEFAULT_WIDTH = 640
const DEFAULT_HEIGHT = 380
const SAMPLES = 480
const PADDING = { left: 52, right: 18, top: 16, bottom: 38 }

function defaultRequestFrame(callback: (timeMs: number) => void): number {
  const raf = (globalThis as { requestAnimationFrame?: (cb: (time: number) => void) => number }).requestAnimationFrame
  if (raf !== undefined) return raf(callback)
  return setTimeout(() => callback(Date.now()), 16) as unknown as number
}

function defaultCancelFrame(handle: number): void {
  const caf = (globalThis as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame
  if (caf !== undefined) caf(handle)
  else clearTimeout(handle as unknown as NodeJS.Timeout)
}

/** Build a polyline path across the visible x-range, breaking at singularities. */
function buildSeriesPath(
  expression: CompiledExpression,
  baseValues: Readonly<Record<string, number>>,
  xRange: readonly [number, number],
  projectX: (x: number) => number,
  projectY: (y: number) => number,
): string {
  const [from, to] = xRange
  const step = (to - from) / SAMPLES
  const parts: string[] = []
  let penDown = false
  let previousY = Number.NaN
  for (let index = 0; index <= SAMPLES; index += 1) {
    const x = from + step * index
    let y: number
    try {
      y = expression.evaluate({ ...baseValues, x })
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
    // A jump between adjacent samples is a discontinuity (e.g. 1/x): lift the pen.
    if (penDown && Number.isFinite(previousY) && Math.abs(y - previousY) > 1e6) penDown = false
    parts.push(`${penDown ? 'L' : 'M'}${projectX(x).toFixed(2)},${projectY(y).toFixed(2)}`)
    penDown = true
    previousY = y
  }
  return parts.join(' ')
}

/**
 * Mount a declarative graph into `container`.
 *
 * @param container - host element; its contents are owned by the handle.
 * @param payload - validated `graph` activity payload.
 * @param options - initial parameters, change callback, animation clock.
 * @returns handle with parameter/animation controls and `dispose`.
 */
export function mountGraph(
  container: HTMLElement,
  payload: GraphPayload,
  options: GraphMountOptions = {},
): GraphHandle {
  const document = resolveDocument(options)
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const requestFrame = options.requestFrame ?? defaultRequestFrame
  const cancelFrame = options.cancelFrame ?? defaultCancelFrame
  const disposers: (() => void)[] = []
  const params: Record<string, number> = {}
  for (const param of payload.params ?? []) params[param.name] = param.value
  for (const [name, value] of Object.entries(options.params ?? {})) {
    if (Number.isFinite(value)) params[name] = value
  }
  const variables = ['x', ...(payload.params ?? []).map(param => param.name)]
  const compiled: (CompiledExpression | ExpressionError)[] = payload.series.map((series) => {
    try {
      return compileExpression(series.expr, { variables })
    } catch (error) {
      return error instanceof ExpressionError ? error : new ExpressionError(String(error))
    }
  })
  const [xFrom, xTo] = normaliseRange(payload.xRange, -10, 10)
  const [yFrom, yTo] = normaliseRange(payload.yRange, -10, 10)

  const wrapper = createElement(document, 'div', { className: 'teaching-graph' })
  const canvas = createSvgElement(document, 'svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': payload.title ?? '交互图',
    preserveAspectRatio: 'xMidYMid meet',
  })
  wrapper.style.width = '100%'
  canvas.setAttribute('width', '100%')
  canvas.style.maxWidth = `${width}px`

  const plotWidth = width - PADDING.left - PADDING.right
  const plotHeight = height - PADDING.top - PADDING.bottom
  const projectX = (x: number): number => PADDING.left + ((x - xFrom) / (xTo - xFrom)) * plotWidth
  const projectY = (y: number): number => PADDING.top + ((yTo - y) / (yTo - yFrom)) * plotHeight
  const textFill = 'var(--dsw-text-secondary, #64748b)'
  const gridStroke = 'var(--dsw-border, rgba(127, 127, 127, 0.22))'

  /** Static frame: grid, axes, ticks (redrawn only on mount). */
  const drawFrame = (): void => {
    for (let index = 0; index <= 4; index += 1) {
      const x = xFrom + ((xTo - xFrom) * index) / 4
      const y = yFrom + ((yTo - yFrom) * index) / 4
      canvas.appendChild(createSvgElement(document, 'line', {
        x1: projectX(x), y1: PADDING.top, x2: projectX(x), y2: PADDING.top + plotHeight,
        stroke: gridStroke, 'stroke-width': 1,
      }))
      canvas.appendChild(createSvgElement(document, 'line', {
        x1: PADDING.left, y1: projectY(y), x2: PADDING.left + plotWidth, y2: projectY(y),
        stroke: gridStroke, 'stroke-width': 1,
      }))
      const xLabel = createSvgElement(document, 'text', {
        x: projectX(x), y: PADDING.top + plotHeight + 18, 'text-anchor': 'middle',
        'font-size': 10, fill: textFill,
      })
      xLabel.textContent = formatNumber(x, 2)
      canvas.appendChild(xLabel)
      const yLabel = createSvgElement(document, 'text', {
        x: PADDING.left - 8, y: projectY(y) + 3, 'text-anchor': 'end',
        'font-size': 10, fill: textFill,
      })
      yLabel.textContent = formatNumber(y, 2)
      canvas.appendChild(yLabel)
    }
    // Axis annotations.
    if (payload.xLabel !== undefined) {
      const label = createSvgElement(document, 'text', {
        x: PADDING.left + plotWidth, y: height - 6, 'text-anchor': 'end', 'font-size': 11, fill: textFill,
      })
      label.textContent = payload.xLabel
      canvas.appendChild(label)
    }
    if (payload.yLabel !== undefined) {
      const label = createSvgElement(document, 'text', {
        x: 8, y: PADDING.top - 4, 'text-anchor': 'start', 'font-size': 11, fill: textFill,
      })
      label.textContent = payload.yLabel
      canvas.appendChild(label)
    }
  }

  let seriesPaths: SVGElement[] = []
  let errorNote: HTMLElement | undefined
  const drawSeries = (): void => {
    for (const path of seriesPaths) path.remove()
    seriesPaths = []
    errorNote?.remove()
    errorNote = undefined
    payload.series.forEach((series, index) => {
      const expression = compiled[index]
      if (expression === undefined) return
      const path = createSvgElement(document, 'path', {
        d: '',
        fill: 'none',
        stroke: plotColor(series.color, index),
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke',
        ...(series.dashed === true ? { 'stroke-dasharray': '6 4' } : {}),
      })
      if (expression instanceof ExpressionError) {
        path.setAttribute('d', '')
        seriesPaths.push(path)
        canvas.appendChild(path)
        if (errorNote === undefined) {
          errorNote = createElement(document, 'div', {
            className: 'teaching-graph-error',
            text: `公式「${series.label}」无法求值：${expression.message}`,
            styles: { color: '#b45309', fontSize: '12px', marginTop: '4px' },
          })
          wrapper.appendChild(errorNote)
        }
        return
      }
      const pathData = buildSeriesPath(expression, params, [xFrom, xTo], projectX, projectY)
      path.setAttribute('d', pathData)
      seriesPaths.push(path)
      canvas.appendChild(path)
    })
    for (const marker of payload.markers ?? []) {
      if (!Number.isFinite(marker.x) || !Number.isFinite(marker.y)) continue
      const cx = projectX(marker.x)
      const cy = projectY(marker.y)
      canvas.appendChild(createSvgElement(document, 'circle', { cx, cy, r: 3.5, fill: PLOT_COLORS.orange ?? '#f59e0b' }))
      if (marker.label !== undefined) {
        const label = createSvgElement(document, 'text', { x: cx + 6, y: cy - 6, 'font-size': 11, fill: textFill })
        label.textContent = marker.label
        canvas.appendChild(label)
      }
    }
  }

  drawFrame()
  drawSeries()
  wrapper.appendChild(canvas)

  // Legend.
  if (payload.series.length > 0) {
    const legend = createElement(document, 'div', {
      className: 'teaching-graph-legend',
      styles: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', margin: '4px 0 0' },
    })
    payload.series.forEach((series, index) => {
      const item = createElement(document, 'span', { styles: { display: 'inline-flex', alignItems: 'center', gap: '5px' } })
      item.appendChild(createElement(document, 'span', {
        styles: {
          display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px',
          background: plotColor(series.color, index),
        },
      }))
      item.appendChild(document.createTextNode(series.label))
      legend.appendChild(item)
    })
    wrapper.appendChild(legend)
  }

  // Parameter sliders.
  const sliderValues = new Map<string, HTMLElement>()
  if ((payload.params ?? []).length > 0) {
    const controls = createElement(document, 'div', {
      className: 'teaching-graph-params',
      styles: { display: 'grid', gap: '6px', marginTop: '8px' },
    })
    for (const param of payload.params ?? []) {
      const row = createElement(document, 'label', {
        className: 'teaching-graph-param',
        styles: { display: 'grid', gridTemplateColumns: '120px 1fr 64px', alignItems: 'center', gap: '8px', fontSize: '12px' },
        ariaLabel: `参数 ${param.label}`,
      })
      row.appendChild(createElement(document, 'span', { text: param.label }))
      const slider = createElement(document, 'input', {
        attrs: {
          type: 'range',
          min: String(param.min),
          max: String(param.max),
          step: String(param.step),
          value: String(params[param.name] ?? param.value),
        },
        ariaLabel: `${param.label} 滑杆`,
      })
      const readout = createElement(document, 'span', {
        text: `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ''}`,
        styles: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
      })
      const update = (): void => {
        const next = Number(slider.value)
        if (!Number.isFinite(next)) return
        params[param.name] = clampToParam(next, param.min, param.max)
        readout.textContent = `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ''}`
        drawSeries()
        options.onChange?.({ ...params }, 'slider')
      }
      disposers.push(on(slider, 'input', update))
      row.appendChild(slider)
      row.appendChild(readout)
      controls.appendChild(row)
      sliderValues.set(param.name, readout)
    }
    wrapper.appendChild(controls)
  }

  // Animation controls.
  const animation = payload.animation
  let playing = false
  let frameHandle: number | undefined
  let animationStart: number | undefined
  let animationPrevious = animation?.from
  const persistParams = (): void => {
    options.onChange?.({ ...params }, 'animation')
  }
  const applyParamsToSliders = (): void => {
    for (const param of payload.params ?? []) {
      const readout = sliderValues.get(param.name)
      if (readout === undefined) continue
      readout.textContent = `${formatNumber(params[param.name] ?? param.value, 3)}${param.unit ?? ''}`
    }
  }
  const tick = (now: number): void => {
    if (!playing || animation === undefined) return
    if (animationStart === undefined) animationStart = now
    const elapsed = now - animationStart
    const duration = Math.max(1, animation.durationMs)
    const progress = elapsed / duration
    const cycle = animation.loop === true ? progress % 1 : Math.min(1, progress)
    const value = animation.from + (animation.to - animation.from) * cycle
    params[animation.param] = value
    applyParamsToSliders()
    drawSeries()
    animationPrevious = value
    if (!animation.loop && cycle >= 1) {
      playing = false
      scheduleNextFrame()
      syncPlayButton()
      persistParams()
      return
    }
    persistParams()
    scheduleNextFrame()
  }
  const scheduleNextFrame = (): void => {
    if (!playing) return
    frameHandle = requestFrame((timeMs) => {
      frameHandle = undefined
      tick(timeMs)
    })
  }
  const stopFrames = (): void => {
    if (frameHandle !== undefined) cancelFrame(frameHandle)
    frameHandle = undefined
    animationStart = undefined
  }
  let playButton: HTMLElement | undefined
  const syncPlayButton = (): void => {
    if (playButton === undefined) return
    playButton.textContent = playing ? '暂停动画' : '播放动画'
    playButton.setAttribute('aria-label', playing ? '暂停动画' : '播放动画')
  }
  if (animation !== undefined) {
    const controls = createElement(document, 'div', {
      className: 'teaching-graph-animation',
      styles: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' },
    })
    playButton = createElement(document, 'button', {
      text: '播放动画',
      ariaLabel: '播放动画',
      attrs: { type: 'button' },
      styles: { fontSize: '12px', padding: '3px 10px', cursor: 'pointer' },
    })
    disposers.push(on(playButton, 'click', () => {
      if (playing) {
        playing = false
        stopFrames()
      } else {
        playing = true
        animationStart = undefined
        scheduleNextFrame()
      }
      syncPlayButton()
    }))
    controls.appendChild(playButton)
    controls.appendChild(createElement(document, 'span', {
      text: `${animation.param}：${formatNumber(animation.from, 3)} → ${formatNumber(animation.to, 3)}（${Math.round(animation.durationMs / 100) / 10}s${animation.loop === true ? '，循环' : ''}）`,
      styles: { opacity: '0.75' },
    }))
    wrapper.appendChild(controls)
  }

  if (payload.hint !== undefined) {
    wrapper.appendChild(createElement(document, 'p', {
      className: 'teaching-graph-hint',
      text: payload.hint,
      styles: { fontSize: '12px', opacity: '0.75', margin: '6px 0 0' },
    }))
  }

  container.appendChild(wrapper)

  const play = (): void => {
    if (animation === undefined || playing) return
    playing = true
    animationStart = undefined
    scheduleNextFrame()
    syncPlayButton()
  }
  const pause = (): void => {
    playing = false
    stopFrames()
    syncPlayButton()
  }

  return {
    element: wrapper,
    getParams: () => ({ ...params }),
    setParams: (next) => {
      for (const [name, value] of Object.entries(next)) {
        if (Number.isFinite(value)) params[name] = value
      }
      applyParamsToSliders()
      drawSeries()
    },
    isPlaying: () => playing,
    play,
    pause,
    dispose: () => {
      playing = false
      stopFrames()
      for (const dispose of disposers) dispose()
      disposers.length = 0
      clearElement(wrapper)
      wrapper.remove()
    },
  }
}

/** Clamp a parameter to its declared bounds. */
function clampToParam(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Keep a valid ascending range; malformed payloads fall back instead of crashing. */
function normaliseRange(range: readonly [number, number], fallbackFrom: number, fallbackTo: number): [number, number] {
  const from = Number(range[0])
  const to = Number(range[1])
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return [fallbackFrom, fallbackTo]
  return from < to ? [from, to] : [to, from]
}
