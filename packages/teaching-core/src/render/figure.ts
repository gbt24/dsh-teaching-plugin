/**
 * Declarative static figure renderer: bar chart, scatter, concept map, flow and
 * table. Everything is renderer-owned SVG/HTML — a model never supplies raw SVG
 * or HTML. Text always goes through `textContent`.
 */
import type { FigurePayload } from '../contracts/activity.ts'
import {
  PLOT_COLORS, clearElement, createElement, createSvgElement, formatNumber, plotColor,
  resolveDocument,
} from './dom.ts'
import type { RenderEnvironment } from './dom.ts'

/** Handle returned by {@link mountFigure}. */
export interface FigureHandle {
  readonly element: HTMLElement
  dispose(): void
}

/** Options for {@link mountFigure}. */
export interface FigureMountOptions extends RenderEnvironment {
  readonly width?: number
  readonly height?: number
}

const WIDTH = 640
const HEIGHT = 340
const PADDING = { left: 48, right: 20, top: 24, bottom: 56 }
const TEXT = 'var(--dsw-text-secondary, #64748b)'
const BORDER = 'var(--dsw-border, rgba(127,127,127,0.25))'
const MAX_LABEL = 28

/** Truncate long labels for the canvas; full text stays in the tooltip. */
function shortLabel(label: string): string {
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label
}

/** Mount one declarative figure. */
export function mountFigure(
  container: HTMLElement,
  payload: FigurePayload,
  options: FigureMountOptions = {},
): FigureHandle {
  const document = resolveDocument(options)
  const width = options.width ?? WIDTH
  const height = options.height ?? HEIGHT
  const wrapper = createElement(document, 'div', { className: 'teaching-figure' })
  wrapper.style.width = '100%'
  if (payload.title !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-figure-title', text: payload.title,
      styles: { fontWeight: '600', fontSize: '13px', marginBottom: '4px' },
    }))
  }
  if (payload.variant === 'table') {
    wrapper.appendChild(renderTable(document, payload))
  } else {
    const { svg, description } = renderSvg(document, payload, width, height)
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', description)
    wrapper.appendChild(svg)
  }
  if (payload.caption !== undefined) {
    wrapper.appendChild(createElement(document, 'div', {
      className: 'teaching-figure-caption', text: payload.caption,
      styles: { fontSize: '12px', opacity: '0.72', marginTop: '4px' },
    }))
  }
  if (payload.alt !== undefined) wrapper.setAttribute('title', payload.alt)
  container.appendChild(wrapper)
  return {
    element: wrapper,
    dispose: () => {
      clearElement(wrapper)
      wrapper.remove()
    },
  }
}

interface SvgResult {
  readonly svg: SVGElement
  readonly description: string
}

function renderSvg(document: Document, payload: FigurePayload, width: number, height: number): SvgResult {
  const svg = createSvgElement(document, 'svg', {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
  })
  svg.setAttribute('width', '100%')
  if (payload.variant === 'bar-chart') return renderBarChart(document, svg, payload, width, height)
  if (payload.variant === 'scatter') return renderScatter(document, svg, payload, width, height)
  if (payload.variant === 'concept-map') return renderConceptMap(document, svg, payload, width, height)
  return renderFlow(document, svg, payload, width, height)
}

/** Format a numeric axis range with a little headroom. */
function niceDomain(values: readonly number[], includeZero: boolean): [number, number] {
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (includeZero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) return [min - 1, max + 1]
  const pad = (max - min) * 0.08
  return [min - (includeZero && min === 0 ? 0 : pad), max + pad]
}

function drawAxes(
  document: Document,
  svg: SVGElement,
  width: number,
  height: number,
  xTicks: readonly { x: number; label: string }[],
  yTicks: readonly { y: number; label: string }[],
): void {
  const plotW = width - PADDING.left - PADDING.right
  const plotH = height - PADDING.top - PADDING.bottom
  svg.appendChild(createSvgElement(document, 'line', {
    x1: PADDING.left, y1: PADDING.top + plotH, x2: PADDING.left + plotW, y2: PADDING.top + plotH,
    stroke: TEXT, 'stroke-width': 1,
  }))
  svg.appendChild(createSvgElement(document, 'line', {
    x1: PADDING.left, y1: PADDING.top, x2: PADDING.left, y2: PADDING.top + plotH,
    stroke: TEXT, 'stroke-width': 1,
  }))
  for (const tick of yTicks) {
    const label = createSvgElement(document, 'text', {
      x: PADDING.left - 6, y: tick.y + 3, 'text-anchor': 'end', 'font-size': 10, fill: TEXT,
    })
    label.textContent = tick.label
    svg.appendChild(label)
    svg.appendChild(createSvgElement(document, 'line', {
      x1: PADDING.left, y1: tick.y, x2: PADDING.left + plotW, y2: tick.y,
      stroke: BORDER, 'stroke-width': 1,
    }))
  }
  for (const tick of xTicks) {
    const label = createSvgElement(document, 'text', {
      x: tick.x, y: PADDING.top + plotH + 16, 'text-anchor': 'middle', 'font-size': 10, fill: TEXT,
    })
    label.textContent = tick.label
    svg.appendChild(label)
  }
}

function renderBarChart(
  document: Document, svg: SVGElement, payload: FigurePayload, width: number, height: number,
): SvgResult {
  const data = payload.data ?? []
  const [yMin, yMax] = niceDomain(data.map(point => point.y), true)
  const plotW = width - PADDING.left - PADDING.right
  const plotH = height - PADDING.top - PADDING.bottom
  const projectY = (value: number): number => PADDING.top + ((yMax - value) / (yMax - yMin)) * plotH
  const groups = [...new Set(data.map(point => point.group ?? ''))]
  const slot = data.length === 0 ? plotW : plotW / data.length
  const barWidth = Math.max(4, Math.min(48, slot * 0.62))
  drawAxes(document, svg, width, height,
    data.map((point, index) => ({ x: PADDING.left + slot * index + slot / 2, label: shortLabel(point.label) })),
    Array.from({ length: 5 }, (_, index) => {
      const value = yMin + ((yMax - yMin) * index) / 4
      return { y: projectY(value), label: formatNumber(value, 2) }
    }),
  )
  data.forEach((point, index) => {
    const cx = PADDING.left + slot * index + slot / 2
    const y = projectY(point.y)
    const top = Math.min(y, projectY(0))
    const barHeight = Math.abs(projectY(0) - y)
    const rect = createSvgElement(document, 'rect', {
      x: cx - barWidth / 2, y: top, width: barWidth, height: barHeight,
      fill: plotColor(undefined, groups.indexOf(point.group ?? '')),
      rx: 2,
    })
    rect.setAttribute('data-label', point.label)
    svg.appendChild(rect)
    const valueLabel = createSvgElement(document, 'text', {
      x: cx, y: point.y >= 0 ? top - 4 : top + barHeight + 12, 'text-anchor': 'middle',
      'font-size': 10, fill: TEXT,
    })
    valueLabel.textContent = formatNumber(point.y, 3)
    svg.appendChild(valueLabel)
  })
  return { svg, description: `柱状图：${data.map(point => `${point.label}=${formatNumber(point.y, 3)}`).join('，')}` }
}

function renderScatter(
  document: Document, svg: SVGElement, payload: FigurePayload, width: number, height: number,
): SvgResult {
  const data = payload.data ?? []
  const points = data.map((point, index) => ({ x: point.x ?? index, y: point.y, group: point.group ?? '', label: point.label }))
  const [xMin, xMax] = niceDomain(points.map(point => point.x), false)
  const [yMin, yMax] = niceDomain(points.map(point => point.y), false)
  const plotW = width - PADDING.left - PADDING.right
  const plotH = height - PADDING.top - PADDING.bottom
  const projectX = (value: number): number => PADDING.left + ((value - xMin) / (xMax - xMin)) * plotW
  const projectY = (value: number): number => PADDING.top + ((yMax - value) / (yMax - yMin)) * plotH
  drawAxes(document, svg, width, height,
    Array.from({ length: 5 }, (_, index) => {
      const value = xMin + ((xMax - xMin) * index) / 4
      return { x: projectX(value), label: formatNumber(value, 2) }
    }),
    Array.from({ length: 5 }, (_, index) => {
      const value = yMin + ((yMax - yMin) * index) / 4
      return { y: projectY(value), label: formatNumber(value, 2) }
    }),
  )
  const groups = [...new Set(points.map(point => point.group))]
  points.forEach((point) => {
    const dot = createSvgElement(document, 'circle', {
      cx: projectX(point.x), cy: projectY(point.y), r: 4,
      fill: plotColor(undefined, groups.indexOf(point.group)), opacity: 0.9,
    })
    dot.setAttribute('data-label', point.label)
    svg.appendChild(dot)
  })
  return {
    svg,
    description: `散点图：${points.map(point => `(${formatNumber(point.x, 2)}, ${formatNumber(point.y, 2)})`).join('，')}`,
  }
}

/** Circular layout for concept maps. */
function renderConceptMap(
  document: Document, svg: SVGElement, payload: FigurePayload, width: number, height: number,
): SvgResult {
  const nodes = payload.nodes ?? []
  const edges = payload.edges ?? []
  const centerX = width / 2
  const centerY = height / 2
  const radiusX = Math.max(60, (width - 180) / 2)
  const radiusY = Math.max(40, (height - 110) / 2)
  const positions = new Map<string, { x: number; y: number }>()
  nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2
    positions.set(node.id, { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY })
  })
  for (const edge of edges) {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (from === undefined || to === undefined) continue
    svg.appendChild(createSvgElement(document, 'line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: BORDER, 'stroke-width': 1.4, 'stroke-dasharray': edge.label === undefined ? '5 3' : '',
    }))
    if (edge.label !== undefined) {
      const label = createSvgElement(document, 'text', {
        x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 4, 'text-anchor': 'middle',
        'font-size': 9, fill: TEXT,
      })
      label.textContent = edge.label
      svg.appendChild(label)
    }
  }
  nodes.forEach((node, index) => {
    const position = positions.get(node.id)
    if (position === undefined) return
    const boxWidth = Math.min(180, Math.max(72, node.label.length * 13 + 20))
    svg.appendChild(createSvgElement(document, 'rect', {
      x: position.x - boxWidth / 2, y: position.y - 14, width: boxWidth, height: 28, rx: 8,
      fill: plotColor(undefined, index), opacity: 0.16,
    }))
    const label = createSvgElement(document, 'text', {
      x: position.x, y: position.y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: TEXT,
    })
    label.textContent = shortLabel(node.label)
    label.setAttribute('data-node-id', node.id)
    if (node.detail !== undefined) label.setAttribute('title', node.detail)
    svg.appendChild(label)
  })
  return { svg, description: `概念图：${nodes.map(node => node.label).join('、')}` }
}

/** Layered layout for flow diagrams: depth = longest path from a root node. */
function renderFlow(
  document: Document, svg: SVGElement, payload: FigurePayload, width: number, height: number,
): SvgResult {
  const nodes = payload.nodes ?? []
  const edges = payload.edges ?? []
  const incoming = new Map<string, string[]>()
  for (const node of nodes) incoming.set(node.id, [])
  for (const edge of edges) incoming.get(edge.to)?.push(edge.from)
  const depthCache = new Map<string, number>()
  const depthOf = (id: string, seen: Set<string>): number => {
    const cached = depthCache.get(id)
    if (cached !== undefined) return cached
    if (seen.has(id)) return 0
    seen.add(id)
    const parents = incoming.get(id) ?? []
    const depth = parents.length === 0 ? 0 : 1 + Math.max(...parents.map(parent => depthOf(parent, seen)))
    depthCache.set(id, depth)
    return depth
  }
  for (const node of nodes) depthOf(node.id, new Set<string>())
  const rows = new Map<number, typeof nodes>()
  for (const node of nodes) {
    const depth = depthCache.get(node.id) ?? 0
    rows.set(depth, [...(rows.get(depth) ?? []), node])
  }
  const rowCount = Math.max(1, rows.size)
  const rowHeight = (height - 50) / rowCount
  const positions = new Map<string, { x: number; y: number }>()
  for (const [depth, rowNodes] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    const slot = width / (rowNodes.length + 1)
    rowNodes.forEach((node, index) => {
      positions.set(node.id, { x: slot * (index + 1), y: 30 + rowHeight * depth + rowHeight / 2 })
    })
  }
  for (const edge of edges) {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (from === undefined || to === undefined) continue
    svg.appendChild(createSvgElement(document, 'line', {
      x1: from.x, y1: from.y + 14, x2: to.x, y2: to.y - 14,
      stroke: TEXT, 'stroke-width': 1.2,
    }))
    if (edge.label !== undefined) {
      const label = createSvgElement(document, 'text', {
        x: (from.x + to.x) / 2 + 4, y: (from.y + to.y) / 2, 'font-size': 9, fill: TEXT,
      })
      label.textContent = edge.label
      svg.appendChild(label)
    }
  }
  nodes.forEach((node) => {
    const position = positions.get(node.id)
    if (position === undefined) return
    const boxWidth = Math.min(190, Math.max(84, node.label.length * 13 + 24))
    svg.appendChild(createSvgElement(document, 'rect', {
      x: position.x - boxWidth / 2, y: position.y - 16, width: boxWidth, height: 32, rx: 8,
      fill: 'var(--dsw-surface-raised, rgba(127,127,127,0.10))', stroke: BORDER,
    }))
    const label = createSvgElement(document, 'text', {
      x: position.x, y: position.y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: TEXT,
    })
    label.textContent = shortLabel(node.label)
    if (node.detail !== undefined) label.setAttribute('title', node.detail)
    svg.appendChild(label)
  })
  return { svg, description: `流程图：${nodes.map(node => node.label).join(' → ')}` }
}

function renderTable(document: Document, payload: FigurePayload): HTMLElement {
  const table = createElement(document, 'table', {
    className: 'teaching-figure-table',
    styles: { borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  })
  const header = createElement(document, 'thead')
  const headerRow = createElement(document, 'tr')
  const hasGroups = (payload.data ?? []).some(point => point.group !== undefined)
  const columns = payload.variant === 'table' ? ['项目', '数值', ...(hasGroups ? ['分组'] : [])] : ['项目', '数值']
  for (const column of columns) {
    const cell = createElement(document, 'th', {
      text: column,
      styles: { textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${BORDER}` },
    })
    headerRow.appendChild(cell)
  }
  header.appendChild(headerRow)
  table.appendChild(header)
  const body = createElement(document, 'tbody')
  for (const point of payload.data ?? []) {
    const row = createElement(document, 'tr')
    const values = [point.label, formatNumber(point.y, 4), ...(hasGroups ? [point.group ?? ''] : [])]
    for (const value of values) {
      row.appendChild(createElement(document, 'td', {
        text: value,
        styles: { padding: '4px 8px', borderBottom: `1px solid ${BORDER}` },
      }))
    }
    body.appendChild(row)
  }
  table.appendChild(body)
  return table
}

/** Group colours exposed for tests and captions. */
export { PLOT_COLORS }
