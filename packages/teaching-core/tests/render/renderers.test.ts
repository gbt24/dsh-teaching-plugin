/**
 * Interactive renderer tests: graph + animation, figures, derivation reveal,
 * code-run output, quiz help exposure and the prose task forms.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  CodeRunPayload, DerivationPayload, FigurePayload, GraphPayload,
  OpenQuestionPayload, ProofTaskPayload, QuizPayload, ReadingTaskPayload,
} from '../../src/contracts/index.ts'
import {
  mountCodeRun, mountDerivation, mountFigure, mountGraph, mountOpenQuestion, mountProofTask,
  mountQuiz, mountReadingTask,
} from '../../src/render/index.ts'
import { asShim, createTestDocument, fire, type ShimElement } from './dom-shim.ts'

/** Deterministic frame scheduler for the animation test. */
function manualFrames(): {
  requestFrame: (callback: (timeMs: number) => void) => number
  cancelFrame: (handle: number) => void
  step: (timeMs: number) => void
  pending: () => number
} {
  let nextId = 1
  const frames = new Map<number, (timeMs: number) => void>()
  return {
    requestFrame: (callback) => {
      const id = nextId
      nextId += 1
      frames.set(id, callback)
      return id
    },
    cancelFrame: (handle) => { frames.delete(handle) },
    step: (timeMs) => {
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(timeMs)
    },
    pending: () => frames.size,
  }
}

function findButton(root: ShimElement, text: string): ShimElement | undefined {
  return root.find('button').find(button => button.textContent === text)
}

const GRAPH: GraphPayload = {
  type: 'graph',
  title: '二次函数',
  xRange: [-5, 5],
  yRange: [-5, 25],
  xLabel: 'x',
  yLabel: 'y',
  series: [{ id: 's1', label: 'a x²', expr: 'a * x^2', color: 'blue' }],
  params: [{ name: 'a', label: '系数 a', min: 0, max: 2, step: 0.1, value: 1 }],
  markers: [{ x: 0, y: 0, label: '顶点' }],
  animation: { param: 'a', from: 0.2, to: 2, durationMs: 1000 },
  hint: '拖动滑杆观察图形变化',
}

test('graph renders SVG axes, series path, markers and parameter slider', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const handle = mountGraph(container as unknown as HTMLElement, GRAPH, { document })
  const shim = asShim(handle.element)
  assert.ok(shim.findOne('svg') !== undefined)
  assert.equal(shim.find('path').length, 1)
  assert.match(shim.find('path')[0]?.getAttribute('d') ?? '', /^M/u)
  assert.equal(shim.find('input').length, 1)
  assert.equal(shim.find('input')[0]?.getAttribute('type'), 'range')
  assert.ok(shim.find('circle').length >= 1)
  assert.match(shim.textContent, /顶点/u)
  assert.deepEqual(handle.getParams(), { a: 1 })
  handle.dispose()
  assert.equal(shim.parentNode, null)
})

test('graph parameter slider redraws the series and reports the new value', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const changes: number[] = []
  const handle = mountGraph(container as unknown as HTMLElement, GRAPH, {
    document,
    onChange: (params) => { changes.push(params.a ?? -1) },
  })
  const shim = asShim(handle.element)
  const slider = shim.find('input')[0]
  assert.ok(slider !== undefined)
  const before = shim.find('path')[0]?.getAttribute('d')
  slider.value = '2'
  fire(slider, 'input')
  const after = shim.find('path')[0]?.getAttribute('d')
  assert.notEqual(before, after)
  assert.equal(handle.getParams().a, 2)
  assert.deepEqual(changes, [2])
  handle.setParams({ a: 0.5 })
  assert.equal(handle.getParams().a, 0.5)
  handle.dispose()
})

test('graph animation plays, pauses and reports interpolated parameters', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const frames = manualFrames()
  const changes: number[] = []
  const handle = mountGraph(container as unknown as HTMLElement, GRAPH, {
    document,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    onChange: (params, source) => { if (source === 'animation') changes.push(params.a ?? -1) },
  })
  assert.equal(handle.isPlaying(), false)
  handle.play()
  assert.equal(handle.isPlaying(), true)
  assert.equal(frames.pending(), 1)
  frames.step(1_000) // t0
  frames.step(1_500) // half of the 1000ms sweep
  assert.ok(Math.abs((handle.getParams().a ?? 0) - 1.1) < 0.001, `mid value ${handle.getParams().a}`)
  handle.pause()
  assert.equal(handle.isPlaying(), false)
  assert.equal(frames.pending(), 0)
  assert.ok(changes.length >= 2)
  handle.dispose()
})

test('graph expression errors are shown instead of crashing the panel', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const handle = mountGraph(container as unknown as HTMLElement, {
    ...GRAPH,
    series: [{ id: 'bad', label: '坏函数', expr: 'notAFunction(x)' }],
  }, { document })
  const shim = asShim(handle.element)
  assert.equal(shim.find('path').length, 1)
  assert.match(shim.textContent, /无法求值/u)
  handle.dispose()
})

const FIGURES: FigurePayload[] = [
  { type: 'figure', variant: 'bar-chart', title: '柱状图', data: [{ label: 'A', y: 3 }, { label: 'B', y: 5 }] },
  { type: 'figure', variant: 'scatter', data: [{ label: 'p1', x: 1, y: 2 }, { label: 'p2', x: 2, y: 4 }] },
  {
    type: 'figure', variant: 'concept-map',
    nodes: [{ id: 'a', label: '过拟合' }, { id: 'b', label: '正则化' }],
    edges: [{ from: 'a', to: 'b', label: '缓解' }],
  },
  {
    type: 'figure', variant: 'flow',
    nodes: [{ id: 'a', label: '数据' }, { id: 'b', label: '模型' }],
    edges: [{ from: 'a', to: 'b' }],
  },
  { type: 'figure', variant: 'table', data: [{ label: 'A', y: 1 }, { label: 'B', y: 2 }] },
]

test('all figure variants render renderer-owned SVG/HTML', () => {
  for (const payload of FIGURES) {
    const document = createTestDocument()
    const container = asShim(document.createElement('div'))
    const handle = mountFigure(container as unknown as HTMLElement, payload, { document })
    const shim = asShim(handle.element)
    assert.ok(shim.textContent.length > 0, `${payload.variant} has text`)
    if (payload.variant === 'table') {
      assert.equal(shim.find('tr').length, 3)
    } else {
      assert.ok(shim.findOne('svg') !== undefined, `${payload.variant} has svg`)
    }
    if (payload.variant === 'bar-chart') assert.equal(shim.find('rect').length, 2)
    if (payload.variant === 'scatter') assert.equal(shim.find('circle').length, 2)
    if (payload.variant === 'concept-map' || payload.variant === 'flow') {
      assert.ok(shim.find('rect').length >= 2)
      assert.ok(shim.find('line').length >= 1)
    }
    handle.dispose()
  }
})

const DERIVATION: DerivationPayload = {
  type: 'derivation',
  claim: '证明 (a+b)² = a² + 2ab + b²',
  steps: [
    { id: 's1', latex: '(a+b)^2 = (a+b)(a+b)', note: '展开定义' },
    { id: 's2', latex: '= a^2 + ab + ba + b^2', dependsOn: ['s1'], note: '分配律' },
    { id: 's3', latex: '= a^2 + 2ab + b^2', dependsOn: ['s2'] },
  ],
  conclusion: '得证',
}

test('derivation reveals steps progressively and restores saved state', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const changes: string[][] = []
  const handle = mountDerivation(container as unknown as HTMLElement, DERIVATION, {
    document,
    revealedStepIds: ['s1'],
    onChange: (ids) => { changes.push([...ids]) },
  })
  const shim = asShim(handle.element)
  assert.deepEqual([...handle.getRevealed()], ['s1'])
  // Unrevealed steps show a reveal button; the restored step shows its formula.
  assert.equal(shim.find('button').filter(button => button.textContent.startsWith('揭示第')).length, 2)
  assert.equal(handle.revealNext(), 's2')
  assert.deepEqual([...handle.getRevealed()], ['s1', 's2'])
  handle.revealAll()
  assert.deepEqual([...handle.getRevealed()], ['s1', 's2', 's3'])
  assert.ok(shim.textContent.includes('结论：得证'))
  assert.equal(changes.at(-1)?.length, 3)
  handle.dispose()
})

const CODE: CodeRunPayload = {
  type: 'code-run',
  title: '求平方和',
  language: 'python',
  code: 'print(sum(i*i for i in range(5)))',
  editable: true,
  starterCode: 'print(0)',
  instructions: '运行代码并解释结果。',
  tests: [{ name: '输出为 30', type: 'stdout-contains', value: '30' }],
}

test('code-run runs through the injected callback and shows real output/checks', async () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const edits: string[] = []
  const handle = mountCodeRun(container as unknown as HTMLElement, CODE, {
    document,
    onChange: (code) => { edits.push(code) },
    onRun: async (request) => ({
      runId: 'run-1',
      status: 'succeeded',
      stdout: request.code.includes('range(5)') ? '30\n' : '?\n',
      stderr: '',
      exitCode: 0,
      durationMs: 12,
      checks: [{ name: '输出为 30', status: 'pass' }],
      verification: 'objective',
    }),
  })
  const shim = asShim(handle.element)
  const textarea = shim.findOne('textarea')
  assert.ok(textarea !== undefined)
  textarea.value = 'print(2)'
  fire(textarea, 'input')
  assert.deepEqual(edits, ['print(2)'])
  assert.equal(handle.getCode(), 'print(2)')
  const runButton = findButton(shim, '运行')
  assert.ok(runButton !== undefined)
  fire(runButton, 'click')
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.match(shim.textContent, /运行结果：succeeded/u)
  assert.match(shim.textContent, /30/u)
  assert.match(shim.textContent, /客观校验/u)
  assert.match(shim.textContent, /输出为 30/u)
  handle.setCode(CODE.code)
  await handle.run()
  assert.equal(handle.getCode(), CODE.code)
  handle.dispose()
})

test('offline code-run disables execution and says so', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const handle = mountCodeRun(container as unknown as HTMLElement, CODE, { document })
  const shim = asShim(handle.element)
  const runButton = findButton(shim, '运行')
  assert.equal(runButton?.disabled, true)
  assert.match(shim.textContent, /离线页面：不执行原生代码/u)
  handle.dispose()
})

const QUIZ: QuizPayload = {
  type: 'quiz',
  question: '过拟合最直接的表现是什么？',
  options: [
    { id: 'a', label: '训练误差低、验证误差高' },
    { id: 'b', label: '训练误差高、验证误差低' },
  ],
  correctOptionIds: ['a'],
  explanation: '过拟合记住训练集噪声，泛化变差。',
  hint: '比较训练集与验证集的误差。',
}

test('quiz submits selections and reports help exposure on reveal', async () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const submitted: string[][] = []
  const help: string[] = []
  const handle = mountQuiz(container as unknown as HTMLElement, QUIZ, {
    document,
    onSubmit: (selected) => { submitted.push([...selected]) },
    onHelpExposed: (info) => { help.push(info.level) },
  })
  const shim = asShim(handle.element)
  const inputs = shim.find('input')
  assert.equal(inputs.length, 2)
  const first = inputs[0]
  assert.ok(first !== undefined)
  first.checked = true
  fire(first, 'change')
  assert.deepEqual([...handle.getSelected()], ['a'])
  fire(findButton(shim, '提交答案') as unknown as ShimElement, 'click')
  assert.equal(submitted.length, 1)
  // Answer is hidden until explicitly revealed.
  assert.doesNotMatch(shim.textContent, /正确答案/u)
  fire(findButton(shim, '看完整答案') as unknown as ShimElement, 'click')
  assert.match(shim.textContent, /正确答案/u)
  assert.match(shim.textContent, /训练误差低/u)
  assert.ok(help.includes('full-answer'))
  handle.dispose()
})

test('quiz hint counts as level-1 help', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const levels: (1 | 'full-answer')[] = []
  const handle = mountQuiz(container as unknown as HTMLElement, QUIZ, {
    document,
    onHelpExposed: (info) => { levels.push(info.level) },
  })
  fire(findButton(asShim(handle.element), '给提示') as unknown as ShimElement, 'click')
  assert.deepEqual(levels, [1])
  handle.dispose()
})

test('proof/open/reading task forms collect answers and citations', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const answers: string[] = []
  const helps: string[] = []
  const proofHandle = mountProofTask(container as unknown as HTMLElement, {
    type: 'proof-task',
    claim: '√2 是无理数',
    assumptions: ['p, q 互质'],
    rubric: [{ id: 'r1', label: '反证结构完整', weight: 1 }],
    hint: '假设 √2 = p/q。',
    reference: '经典反证法。',
  } satisfies ProofTaskPayload, {
    document,
    onSubmitAnswer: (text) => { answers.push(text) },
    onHelpExposed: (info) => { helps.push(info.level) },
  })
  const shim = asShim(proofHandle.element)
  const textarea = shim.findOne('textarea')
  assert.ok(textarea !== undefined)
  textarea.value = '假设 √2 是有理数…'
  fire(findButton(shim, '提交回答') as unknown as ShimElement, 'click')
  assert.deepEqual(answers, ['假设 √2 是有理数…'])
  fire(findButton(shim, '给提示') as unknown as ShimElement, 'click')
  assert.deepEqual(helps, [1])
  fire(findButton(shim, '看完整答案') as unknown as ShimElement, 'click')
  assert.ok(helps.includes('full-answer'))
  proofHandle.dispose()

  const openHandle = mountOpenQuestion(container as unknown as HTMLElement, {
    type: 'open-question',
    prompt: '为什么正则化能缓解过拟合？',
    rubric: [{ id: 'r1', label: '条件清楚', weight: 1 }],
    referencePoints: ['限制模型复杂度', '偏差-方差权衡'],
  } satisfies OpenQuestionPayload, { document })
  fire(findButton(asShim(openHandle.element), '看完整答案') as unknown as ShimElement, 'click')
  assert.match(asShim(openHandle.element).textContent, /限制模型复杂度/u)
  openHandle.dispose()

  const anchors: string[] = []
  const readingHandle = mountReadingTask(container as unknown as HTMLElement, {
    type: 'reading-task',
    instructions: '阅读第 2 章，注意定义与反例。',
    anchors: [{
      documentId: 'src-1' as never,
      revisionId: 'srev-1' as never,
      unitId: 'unit-1' as never,
      locator: { page: 12 },
      excerpt: '过拟合是指…',
      confidence: 'high',
      label: 'SICP.pdf · 第 2 章',
    }],
    questions: ['过拟合与欠拟合的区别？'],
  } satisfies ReadingTaskPayload, {
    document,
    onAnchorClick: (anchor) => { anchors.push(anchor.label) },
  })
  const readingShim = asShim(readingHandle.element)
  fire(readingShim.find('button')[0] as unknown as ShimElement, 'click')
  assert.deepEqual(anchors, ['SICP.pdf · 第 2 章'])
  readingHandle.dispose()
})
