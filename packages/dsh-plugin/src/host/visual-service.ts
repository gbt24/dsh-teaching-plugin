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
  '你是一个教学图形生成器。只输出一个安全、自包含的可视化源码代码块，不要输出任何解释、JSON、思考过程或额外文字。',
  '',
  '要求：',
  '- 默认输出 SVG；如果学生明确要求拖动/交互/按钮，则输出自包含 HTML 片段；如果学生明确要求 Mermaid，则输出 Mermaid 源码。',
  '- 源码必须完整、可解析，优先控制在 6000 字符以内；不要截断；SVG 必须有闭合标签。',
  '- 必须完全自包含：内联 CSS/SVG/脚本；禁止外部 CDN、字体、库、图片或网络请求；不要完整 HTML 文档外壳（不要 doctype/html/head/body）。',
  '- 标签、图例、公式、数值读数符号一致；颜色辅以线型/标记/文字；坐标范围稳定；几何尽量等比例，非等比例要在图内说明。',
  '- 视觉是直觉辅助，不是证明；不要在图内声称“图证明了结论”。',
  '- 只输出形如 ```svg …``` 的一个代码块；不要在代码块外写任何文字。',
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
 * Ask the model for one self-contained visual source and validate the outer shape.
 * The output format is intentionally just one fenced block: embedding large
 * SVG/HTML inside JSON metadata is what caused truncated/escaped-data failures.
 */
export async function generateVisual(
  model: ModelClient,
  input: VisualGenerationInput,
  signal?: AbortSignal,
): Promise<GeneratedVisual | undefined> {
  const info = await model.info()
  const interactive = /交互|拖动|拖拽|滑杆|滑块|按钮|播放|暂停|html/iu.test(input.studentText)
  const mermaid = !interactive && /mermaid|流程图|关系图|时间线|状态机|分类图/iu.test(input.studentText)
  const renderer: VisualPayload['renderer'] = interactive ? 'html' : mermaid ? 'mermaid' : 'svg'
  const languageHint = renderer === 'html'
    ? '一个自包含 HTML 片段（不含 doctype/html/head/body 外壳）'
    : renderer === 'mermaid'
      ? '一段 Mermaid 源码'
      : '一个自包含 SVG（不要完整 HTML 文档）'
  const request = {
    system: VISUAL_SYSTEM_PROMPT,
    messages: [{
      role: 'user' as const,
      text: [
        `任务：为下面的教学场景生成${languageHint}，用 \`\`\`${renderer} 代码块输出，源码必须完整。`,
        `课程：${input.courseTitle}`,
        input.conceptTitle === undefined ? '' : `当前概念：${input.conceptTitle}`,
        `学生本轮请求：${input.studentText}`,
        `主教学回复节选：${input.teachingText.slice(0, 800)}`,
        '',
        '只输出代码块，不要解释。',
      ].filter(line => line !== '').join('\n'),
    }],
    maxTokens: 12_000,
    temperature: 0.2,
    purpose: 'visual' as const,
    sessionId: input.sessionId,
    language: 'zh' as const,
  }
  let completion = await model.complete(request, signal)
  let fence = extractFence(completion.text)
  if (fence === undefined) {
    // One strict retry: some models emit analysis only on the first attempt.
    completion = await model.complete({
      ...request,
      messages: [
        ...request.messages,
        { role: 'assistant' as const, text: completion.text.slice(0, 2_000) },
        { role: 'user' as const, text: `上次没有输出完整可解析的 ${renderer} 源码。现在只输出一个完整的 \`\`\`${renderer} 代码块，不要任何其他文字。` },
      ],
    }, signal)
    fence = extractFence(completion.text)
  }
  if (fence === undefined) return undefined
  const source = normalizeSource(fence.source)
  if (source === undefined) return undefined
  const brief = parseBrief(completion.text)
  const heading = /^#{1,4}\s+(.+)$/mu.exec(input.teachingText)?.[1]?.trim()
  const title = stringField(brief, 'title') ?? input.conceptTitle ?? heading
  const caption = stringField(brief, 'caption')
  const observe = stringField(brief, 'observe')
  const formula = stringField(brief, 'formula')
  const conditions = conditionsField(brief)
  const payload: VisualPayload = {
    type: 'visual',
    renderer: fence.renderer,
    source,
    ...(title === undefined ? {} : { title: title.slice(0, 120) }),
    ...(caption === undefined ? {} : { caption: caption.slice(0, 300) }),
    ...(observe === undefined ? {} : { observe: observe.slice(0, 300) }),
    ...(formula === undefined ? {} : { formula: formula.slice(0, 1_000) }),
    ...(conditions.length === 0 ? {} : { conditions }),
    ...(typeof brief['visualType'] === 'string' ? { visualType: brief['visualType'] as VisualPayload['visualType'] } : {}),
    ...(interactive ? { interactive: true } : {}),
    ...(typeof brief['height'] === 'number' && Number.isFinite(brief['height'])
      ? { height: Math.max(120, Math.min(2_000, Math.round(brief['height']))) }
      : {}),
    ...(stringField(brief, 'fallbackText') === undefined ? {} : { fallbackText: stringField(brief, 'fallbackText')!.slice(0, 1_000) }),
  }
  return { payload, provider: info.provider, model: info.model }
}
