/**
 * Dedicated visual teaching source generator.
 *
 * Drawing inside the main teaching JSON metadata is brittle: SVG/HTML source is
 * large and full of quotes/newlines, so models frequently truncate or emit
 * invalid JSON. This secondary call asks the model for only a small brief plus
 * a fenced source block; the Host validates it and turns it into a visual
 * activity. The main teaching turn can still propose a small visual directly.
 */
import type { ModelClient, VisualPayload } from '@deepseek-teaching/core'

/** Context for one visual-generation call. */
export interface VisualGenerationInput {
  readonly courseTitle: string
  readonly conceptTitle?: string
  readonly studentText: string
  readonly teachingText: string
  readonly language: string
  readonly sessionId: string
}

/** Generated payload plus the model that produced it. */
export interface GeneratedVisual {
  readonly payload: VisualPayload
  readonly provider: string
  readonly model: string
}

const MAX_SOURCE_CHARS = 200_000

const VISUAL_SYSTEM_PROMPT = [
  '你是一个学科无关的教学可视化生成器。你的任务不是写长篇讲解，而是产出一个能在沙箱中安全显示的、自包含的教学图表/交互演示。',
  '',
  '工作流（来自 math-visual 技能，适用于所有学科）：',
  '1. 先确定一个教学点：控制量（只主动改变一个参数）、观测量、不变量、结论与适用条件；能一句话说明“改变什么、观察什么”。',
  '2. 选最简载体：结构/几何用 SVG；参数探索/拖动比较用自包含交互 HTML；流程/关系/分类用 Mermaid；连续变化才用动画；普通曲线/简单数据留空（由主教学流程决定），不要为凑图而画。',
  '3. 标签、图例、公式、数值读数符号一致；颜色辅以线型/标记/文字；坐标范围稳定；几何用等比例坐标，非等比例必须说明。',
  '4. 视觉是直觉辅助，不是证明；有限图只能展示趋势，不要声称“图证明了结论”。',
  '5. 必须完全自包含：内联 CSS/SVG/脚本；禁止外部 CDN、字体、库、图片或网络请求；不要完整 HTML 文档外壳（不要 doctype/html/head/body），只给片段。',
  '6. 不编造与课程/学生上下文不符的事实；无法核实的内容用“模型补充”标注在 caption/conditions 中。',
  '7. 优先 SVG 静态图；只有学生明确要求拖动/交互时才用 HTML；源码控制在 6000 字符以内，写完整闭合标签，不要用长篇 CSS。',
  '',
  '只输出以下两个标记区块，不要输出任何其他文字：',
  '<<<VISUAL_BRIEF>>>',
  '{"renderer":"svg|html|mermaid","title":"...","caption":"一句话结论","observe":"注意看……","conditions":["适用条件/边界/反例"],"formula":"可选 LaTeX","visualType":"diagram|flow|timeline|tree|map|chart|animation|interactive|other","interactive":false,"height":420,"fallbackText":"无法显示时的文字说明"}',
  '<<<VISUAL_SOURCE>>>',
  '```svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420">...</svg>',
  '```',
  '',
  '渲染器选择规则：source 是 SVG 标记 → renderer=svg；自包含 HTML 片段 → html；Mermaid 源码 → mermaid。源码必须完整、可解析；宁可简单也不要截断。',
].join('\n')

function extractBetween(text: string, start: string, end: string): string | undefined {
  const startIndex = text.indexOf(start)
  if (startIndex < 0) return undefined
  const from = startIndex + start.length
  const endIndex = text.indexOf(end, from)
  if (endIndex < 0) return undefined
  return text.slice(from, endIndex).trim()
}

function extractFence(text: string): { renderer: 'svg' | 'html' | 'mermaid'; source: string } | undefined {
  const match = /```(svg|html|mermaid)[^\n]*\n([\s\S]*?)```/iu.exec(text)
  if (match !== null) {
    const source = (match[2] ?? '').trim()
    if (source !== '') {
      return { renderer: (match[1] ?? 'svg').toLowerCase() as 'svg' | 'html' | 'mermaid', source }
    }
  }
  const svg = /<svg[\s\S]*<\/svg>/iu.exec(text)?.[0]
  if (svg !== undefined && svg.trim() !== '') return { renderer: 'svg', source: svg.trim() }
  return undefined
}

function parseBrief(text: string): Record<string, unknown> {
  const raw = extractBetween(text, '<<<VISUAL_BRIEF>>>', '<<<VISUAL_SOURCE>>>')
    ?? text.split('```')[0]?.match(/\{[\s\S]*\}/u)?.[0]
  if (raw === undefined) return {}
  try {
    const value: unknown = JSON.parse(raw.trim())
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function stringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function conditionsField(record: Record<string, unknown>): string[] {
  const value = record['conditions']
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .slice(0, 8)
    .map(item => item.trim().slice(0, 300))
}

function normalizeSource(source: string): string | undefined {
  let text = source.trim()
  if (text === '' || text.length > MAX_SOURCE_CHARS) return undefined
  // Strip a complete document wrapper if the model ignored the fragment rule.
  if (/<!doctype\s+html/iu.test(text) || /<html[\s>]/iu.test(text)) {
    const body = /<body[^>]*>([\s\S]*?)<\/body>/iu.exec(text)?.[1]
    if (body === undefined) return undefined
    text = body.trim()
  }
  return text === '' ? undefined : text
}

/**
 * Ask the model for one self-contained visual and validate the outer shape.
 * Returns `undefined` when the output is unusable; the caller degrades to text.
 */
export async function generateVisual(
  model: ModelClient,
  input: VisualGenerationInput,
  signal?: AbortSignal,
): Promise<GeneratedVisual | undefined> {
  const info = await model.info()
  const completion = await model.complete({
    system: VISUAL_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      text: [
        `课程：${input.courseTitle}`,
        input.conceptTitle === undefined ? '' : `当前概念：${input.conceptTitle}`,
        `学生本轮请求：${input.studentText}`,
        `主教学回复节选：${input.teachingText.slice(0, 1_200)}`,
        '',
        '请生成本轮最合适的可视化。只输出两个标记区块和简短源码；源码必须完整。',
      ].filter(line => line !== '').join('\n'),
    }],
    maxTokens: 6_000,
    purpose: 'visual',
    sessionId: input.sessionId,
    language: 'zh',
  }, signal)
  const fence = extractFence(completion.text)
  if (fence === undefined) return undefined
  const source = normalizeSource(fence.source)
  if (source === undefined) return undefined
  const brief = parseBrief(completion.text)
  const renderer = (() => {
    const value = stringField(brief, 'renderer')
    if (value === 'svg' || value === 'html' || value === 'mermaid') return value
    return fence.renderer
  })()
  const title = stringField(brief, 'title')
  const payload: VisualPayload = {
    type: 'visual',
    renderer,
    source,
    ...(title === undefined ? {} : { title: title.slice(0, 120) }),
    ...(stringField(brief, 'caption') === undefined ? {} : { caption: stringField(brief, 'caption')!.slice(0, 300) }),
    ...(stringField(brief, 'observe') === undefined ? {} : { observe: stringField(brief, 'observe')!.slice(0, 300) }),
    ...(stringField(brief, 'formula') === undefined ? {} : { formula: stringField(brief, 'formula')!.slice(0, 1_000) }),
    ...(conditionsField(brief).length === 0 ? {} : { conditions: conditionsField(brief) }),
    ...(typeof brief['visualType'] === 'string' ? { visualType: brief['visualType'] as VisualPayload['visualType'] } : {}),
    ...(typeof brief['interactive'] === 'boolean' ? { interactive: brief['interactive'] } : {}),
    ...(typeof brief['height'] === 'number' && Number.isFinite(brief['height'])
      ? { height: Math.max(120, Math.min(2_000, Math.round(brief['height']))) }
      : {}),
    ...(stringField(brief, 'fallbackText') === undefined ? {} : { fallbackText: stringField(brief, 'fallbackText')!.slice(0, 1_000) }),
  }
  return { payload, provider: info.provider, model: info.model }
}
