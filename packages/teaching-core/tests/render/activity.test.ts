/**
 * Activity validation + the single `mountActivity` seam used by the Harness
 * workspace and (later) the offline export.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ActivityPayload, LessonActivity } from '../../src/contracts/index.ts'
import { mountActivity, validateActivityPayload } from '../../src/render/index.ts'
import { asShim, createTestDocument, fire } from './dom-shim.ts'

const VALID_PAYLOADS: ActivityPayload[] = [
  { type: 'explanation', markdown: '**要点**：$E=mc^2$', keyPoints: ['质能等价'], caveats: ['静止质量'] },
  { type: 'figure', variant: 'bar-chart', data: [{ label: 'A', y: 1 }] },
  { type: 'graph', xRange: [-2, 2], yRange: [-2, 2], series: [{ id: 's', label: 'x', expr: 'x' }] },
  { type: 'derivation', steps: [{ id: 'a', latex: 'a=b' }, { id: 'b', latex: 'b=c', dependsOn: ['a'] }] },
  { type: 'code-run', language: 'python', code: 'print(1)', editable: true, tests: [{ name: 'ok', type: 'exit-code', value: 0 }] },
  { type: 'quiz', question: 'q', options: [{ id: 'a', label: 'A' }], correctOptionIds: ['a'] },
  {
    type: 'reading-task', instructions: '读',
    anchors: [{ documentId: 'd', revisionId: 'r', unitId: 'u', locator: {}, excerpt: 'e', confidence: 'high', label: 'L' } as never],
    questions: ['q'],
  },
  { type: 'proof-task', claim: 'c', assumptions: ['a'], rubric: [{ id: 'r', label: 'l', weight: 1 }] },
  { type: 'open-question', prompt: 'p', rubric: [{ id: 'r', label: 'l', weight: 1 }] },
  { type: 'experiment-note', title: 't', markdown: 'm', limitations: ['l'] },
]

test('every declared activity kind has a valid payload', () => {
  for (const payload of VALID_PAYLOADS) {
    const result = validateActivityPayload(payload)
    assert.equal(result.ok, true, `${payload.type}: ${result.ok ? '' : result.error.message}`)
  }
})

test('invalid payloads are rejected with concrete invalid-input errors', () => {
  const bad: unknown[] = [
    null,
    {},
    { type: 'nope' },
    { type: 'graph', xRange: [0, 0], yRange: [0, 1], series: [{ id: 's', label: 'x', expr: 'x' }] },
    { type: 'graph', xRange: [0, 1], yRange: [0, 1], series: [{ id: 's', label: 'x', expr: 'nope(x)' }] },
    { type: 'graph', xRange: [0, 1], yRange: [0, 1], series: [] },
    { type: 'figure', variant: 'pie-chart' },
    { type: 'derivation', steps: [{ id: 'a', latex: 'x' }, { id: 'a', latex: 'y' }] },
    { type: 'derivation', steps: [{ id: 'a', latex: 'x', dependsOn: ['missing'] }] },
    { type: 'quiz', question: 'q', options: [{ id: 'a', label: 'A' }], correctOptionIds: ['b'] },
    { type: 'quiz', question: 'q', options: [], correctOptionIds: [] },
    { type: 'proof-task', claim: 'c', assumptions: [], rubric: [] },
    { type: 'reading-task', instructions: 'i', anchors: [{ label: 'l' }], questions: [] },
    { type: 'code-run', language: 'python', editable: true },
  ]
  for (const payload of bad) {
    const result = validateActivityPayload(payload)
    assert.equal(result.ok, false, `should reject ${JSON.stringify(payload)}`)
    if (!result.ok) {
      assert.equal(result.error.code, 'invalid-input')
      assert.match(result.error.message, /活动数据无效/u)
    }
  }
})

const GRAPH_PAYLOAD: Extract<ActivityPayload, { type: 'graph' }> = {
  type: 'graph',
  xRange: [-2, 2],
  yRange: [-2, 2],
  series: [{ id: 's', label: 'a·x', expr: 'a * x' }],
  params: [{ name: 'a', label: '斜率 a', min: 0, max: 2, step: 0.1, value: 1 }],
}

test('mountActivity dispatches graph, restores params and reports state changes', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const patches: unknown[] = []
  const mounted = mountActivity(container as unknown as HTMLElement, {
    payload: GRAPH_PAYLOAD,
    title: '画图',
    goal: '理解斜率',
    verification: { kind: 'none', note: '探索活动' },
  }, {
    document,
    state: undefined,
    callbacks: { onStateChange: (patch) => { patches.push(patch) } },
  })
  const shim = asShim(mounted.element)
  assert.match(shim.textContent, /画图/u)
  assert.match(shim.textContent, /目标：理解斜率/u)
  assert.match(shim.textContent, /无客观校验/u)
  assert.deepEqual(mounted.getState().params, { a: 1 })
  const slider = shim.find('input')[0]
  assert.ok(slider !== undefined)
  slider.value = '2'
  fire(slider, 'input')
  assert.ok(patches.length >= 1)
  assert.deepEqual(mounted.getState().params, { a: 2 })
  mounted.dispose()
})

test('mountActivity dispatches code-run and collects edited code', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const payload = VALID_PAYLOADS[4] as Extract<ActivityPayload, { type: 'code-run' }>
  const mounted = mountActivity(container as unknown as HTMLElement, { payload, revision: 3 }, {
    document,
    state: { activityId: 'act-1' as never, activityRevision: 3, code: 'print(0)', updatedAt: new Date().toISOString() },
  })
  const shim = asShim(mounted.element)
  const textarea = shim.findOne('textarea')
  assert.equal(textarea?.value, 'print(0)')
  if (textarea !== undefined) {
    textarea.value = 'print(2)'
    fire(textarea, 'input')
  }
  assert.deepEqual(mounted.getState(), { code: 'print(2)' })
  mounted.dispose()
})

test('mountActivity dispatches derivation and collects revealed step ids', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const payload = VALID_PAYLOADS[3] as Extract<ActivityPayload, { type: 'derivation' }>
  const mounted = mountActivity(container as unknown as HTMLElement, { payload }, {
    document,
    state: { activityId: 'act-2' as never, activityRevision: 1, revealedStepIds: ['a'], updatedAt: new Date().toISOString() },
  })
  const button = asShim(mounted.element).find('button').find(item => item.textContent === '全部揭示')
  assert.ok(button !== undefined)
  fire(button, 'click')
  assert.deepEqual([...(mounted.getState().revealedStepIds ?? [])], ['a', 'b'])
  mounted.dispose()
})

test('mountActivity routes quiz submissions to the callback', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const payload = VALID_PAYLOADS[5] as Extract<ActivityPayload, { type: 'quiz' }>
  const submitted: string[][] = []
  const mounted = mountActivity(container as unknown as HTMLElement, { payload }, {
    document,
    callbacks: { onQuizSubmit: (ids) => { submitted.push([...ids]) } },
  })
  const shim = asShim(mounted.element)
  const option = shim.find('input')[0]
  if (option !== undefined) {
    option.checked = true
    fire(option, 'change')
  }
  const submit = shim.find('button').find(item => item.textContent === '提交答案')
  assert.ok(submit !== undefined)
  fire(submit, 'click')
  assert.deepEqual(submitted, [['a']])
  mounted.dispose()
})

test('mountActivity accepts a full LessonActivity record', () => {
  const document = createTestDocument()
  const container = asShim(document.createElement('div'))
  const now = new Date().toISOString()
  const activity: LessonActivity = {
    id: 'act-9' as never,
    kind: 'explanation',
    sessionId: 'sess-1' as never,
    courseId: 'course-1' as never,
    conceptIds: [],
    goal: '理解证据链',
    title: '来自 Host 的活动',
    createdAt: now,
    updatedAt: now,
    revision: 2,
    status: 'active',
    sourceRefs: [],
    verification: { kind: 'open' },
    payload: VALID_PAYLOADS[0] as ActivityPayload,
  }
  const mounted = mountActivity(container as unknown as HTMLElement, activity, { document })
  const shim = asShim(mounted.element)
  assert.match(shim.textContent, /来自 Host 的活动/u)
  assert.equal(shim.getAttribute('data-activity-id'), 'act-9')
  assert.equal(shim.getAttribute('data-activity-revision'), '2')
  mounted.dispose()
})
