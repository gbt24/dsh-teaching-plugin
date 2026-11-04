/**
 * Standalone offline HTML export (R27, R37, AC14).
 *
 * Node-side assertions only: generated page is self-contained (no external
 * resources / no network APIs / no Host API), every activity kind is rendered,
 * the manifest checksums are complete and native sources are exported.
 * Real browser/offline verification is performed by the Lead/user — this file
 * does not claim it.
 */
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import type { GraphPayload, LessonActivity } from '../../src/contracts/index.ts'
import { activityId, nowIso } from '../../src/contracts/index.ts'
import {
  asOfflineDocument, asOfflineElement, buildOfflineRuntimeScript, createOfflineDocument,
  graphLayoutOf, sha256Hex,
} from '../../src/portability/index.ts'
import { mountActivity } from '../../src/render/index.ts'
import { createTestStore, seedTeachingData } from './helpers.ts'
import { externalResourceProblems } from './offline-audit.ts'

/** Read one generated file and return it as text. */
async function readText(path: string): Promise<string> {
  return readFile(path, 'utf8')
}

test('offline export renders every activity kind and stays self-contained', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const exported = await store.service.exportCourse({ courseId: data.course.id, includeNotes: true })
    assert.ok(exported.ok, exported.ok ? '' : `${exported.error.code}: ${exported.error.message}`)
    const result = exported.value
    const html = await readText(result.htmlPath)
    assert.ok(html.startsWith('<!doctype html>'))
    assert.ok(Buffer.byteLength(html, 'utf8') < 2_000_000, 'single-file page stays under 2MB')

    // Course / session / message / activity coverage.
    for (const fragment of [data.course.title, data.session.title, '过拟合的核心', '验证集表现差',
      '过拟合讲解', '交互图：参数 a 对曲线的影响', '柱状图：误差对比', '推导：偏差-方差分解',
      '小测：过拟合表现', 'Python 实验：平方和', 'SICP 实验：平方', '阅读任务：第 1 节',
      '证明：样本外误差更高', '开放题：为什么正则化有效', '实验记录：学习率对比']) {
      assert.ok(html.includes(fragment), `page contains ${fragment}`)
    }
    assert.match(html, /class="katex"/u, 'KaTeX rendered formula markup')
    assert.match(html, /<svg[^>]*viewBox="0 0 640 380"/u, 'graph SVG rendered')
    assert.match(html, /揭示第 2 步/u, 'derivation step shell present')
    assert.match(html, /训练误差低、验证误差高/u, 'quiz options rendered')
    assert.match(html, /<textarea[^>]*class="teaching-code-editor"/u, 'code editor rendered')
    assert.match(html, /离线页面：不执行原生代码/u, 'offline code-run notice rendered')
    assert.match(html, /我的笔记：<strong>泛化误差<\/strong>是关键/u, 'notes rendered when requested')
    assert.match(html, /学习记录摘要/u, 'learning summary rendered')
    assert.match(html, /离线说明/u, 'visible offline notice')
    assert.match(html, /KaTeX 专用字体未内嵌/u, 'visible KaTeX font limitation')
    assert.equal((html.match(/本页面是单文件导出/gu) ?? []).length, 1, 'offline notice has no duplicated bullets')
    assert.match(html, /__TeachingOfflineRuntime/u, 'inline interaction runtime present')
    assert.match(html, /__TEACHING_OFFLINE_DATA__/u, 'inline runtime data present')
    assert.match(html, /data-teaching-runtime-ready|window\.__TeachingOfflineRuntime/u)

    // The one Markdown link is an ordinary user-clickable anchor (not a resource).
    assert.match(html, /<a [^>]*class="teaching-link"[^>]*href="https:\/\/example\.com\/material"/u)
    assert.deepEqual(externalResourceProblems(html), [], 'page has no external resource reference')
    assert.doesNotMatch(html, /apiKey|api_key|Authorization/iu, 'no credentials in the page')

    // Manifest: checksums cover index.html + native files.
    const manifest = result.manifest
    assert.equal(manifest.formatVersion, 1)
    assert.equal(manifest.offlineCapable, true)
    assert.deepEqual(manifest.courses.map(course => course.courseId), [data.course.id])
    assert.deepEqual(manifest.courses[0]?.sessionIds, [data.session.id])
    assert.ok(manifest.files.some(file => file.path === 'index.html'))
    for (const file of manifest.files) {
      const bytes = new Uint8Array(await readFile(join(result.htmlPath, '..', ...file.path.split('/'))))
      assert.equal(bytes.byteLength, file.bytes, `manifest bytes for ${file.path}`)
      assert.equal(sha256Hex(bytes), file.sha256, `manifest sha256 for ${file.path}`)
    }
    assert.ok(manifest.limitations.some(line => line.includes('KaTeX')))
    assert.ok(manifest.limitations.some(line => line.includes('2MB')))
    assert.ok(manifest.limitations.some(line => line.includes('native/README.md')))
    assert.ok(manifest.limitations.some(line => line.includes('不包含凭据') || line.includes('不含 Harness 凭据')))
    assert.equal(result.exportId, manifest.id)
    const manifestOnDisk = JSON.parse(await readText(result.manifestPath)) as typeof manifest
    assert.equal(manifestOnDisk.id, manifest.id)
    assert.ok(await stat(join(store.state.paths.exports, `${manifest.id}.manifest.json`)).then(() => true, () => false))

    // Native sources: python + scheme code + prelude + README.
    const pythonSource = manifest.nativeSources.find(source => source.language === 'python')
    assert.ok(pythonSource !== undefined)
    assert.match(pythonSource.path, /^native\/.+\.py$/u)
    assert.match(pythonSource.runInstructions, /python3/u)
    const schemeSource = manifest.nativeSources.find(source => source.language === 'scheme' && source.path.endsWith('.scm') && source.path !== 'native/sicp-prelude.scm')
    assert.ok(schemeSource !== undefined)
    assert.match(schemeSource.runInstructions, /biwascheme|预置库/u)
    assert.ok(manifest.nativeSources.some(source => source.path === 'native/sicp-prelude.scm'))
    const pythonBytes = await readText(join(result.htmlPath, '..', ...pythonSource.path.split('/')))
    assert.equal(pythonBytes.trim(), 'print(sum(i * i for i in range(5)))')
    assert.equal(result.nativeFiles.length, 3, 'two source files + prelude')
    const readme = await readText(join(result.htmlPath, '..', 'native', 'README.md'))
    assert.match(readme, /环境说明/u)
    assert.match(readme, /sicp-prelude\.scm/u)

    // The export is listed for the UI.
    const artifacts = await store.service.listArtifacts()
    assert.ok(artifacts.exports.some(item => item.id === manifest.id))
  } finally {
    await store.dispose()
  }
})

test('includeNotes controls note visibility and custom outDir is honoured', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const withoutNotes = await store.service.exportCourse({ courseId: data.course.id })
    assert.ok(withoutNotes.ok)
    const withoutNotesHtml = await readText(withoutNotes.value.htmlPath)
    assert.doesNotMatch(withoutNotesHtml, /我的笔记：<strong>泛化误差/u)
    assert.match(withoutNotesHtml, /有 1 条笔记未包含在本次导出/u)

    const outDir = join(store.materialDir, 'custom-export')
    const withNotes = await store.service.exportCourse({ courseId: data.course.id, includeNotes: true, outDir })
    assert.ok(withNotes.ok, withNotes.ok ? '' : withNotes.error.message)
    assert.equal(withNotes.value.htmlPath, join(outDir, 'index.html'))
    assert.ok(await stat(withNotes.value.htmlPath).then(() => true, () => false))
    assert.match(await readText(withNotes.value.htmlPath), /我的笔记：<strong>泛化误差/u)

    const invalidFormat = await store.service.exportCourse({ courseId: data.course.id, format: 'pdf' as never })
    assert.ok(!invalidFormat.ok)
    assert.equal(invalidFormat.ok ? '' : invalidFormat.error.code, 'invalid-input')
    const missing = await store.service.exportCourse({ courseId: 'course-missing' as never })
    assert.ok(!missing.ok)
    assert.equal(missing.ok ? '' : missing.error.code, 'not-found')
    const relativeOutDir = await store.service.exportCourse({ courseId: data.course.id, outDir: 'relative' })
    assert.ok(!relativeOutDir.ok)
    assert.equal(relativeOutDir.ok ? '' : relativeOutDir.error.code, 'invalid-input')
  } finally {
    await store.dispose()
  }
})

test('oversized message and code are truncated with explicit warnings', async () => {
  const store = await createTestStore()
  try {
    const data = await seedTeachingData(store)
    const longMessage = '长'.repeat(25_000)
    await store.sessions.appendMessage({
      id: 'msg-long' as never,
      sessionId: data.session.id,
      role: 'teacher',
      kind: 'teacher-explanation',
      text: longMessage,
      markdown: true,
      createdAt: nowIso(),
      evidenceRefs: [],
      activityIds: [],
    })
    const longCode = `# long\n${'print(1)\n'.repeat(12_000)}`
    const longActivity: LessonActivity = {
      ...data.pythonActivity,
      id: activityId(),
      title: '超大代码活动',
      payload: {
        ...(data.pythonActivity.payload as { type: 'code-run'; language: string; editable: boolean; code: string }),
        code: longCode,
      },
    }
    await store.sessions.saveActivity(longActivity)

    const exported = await store.service.exportCourse({ courseId: data.course.id })
    assert.ok(exported.ok, exported.ok ? '' : exported.error.message)
    const warnings = exported.value.warnings.join('\n')
    assert.match(warnings, /超过 20000 字符，导出页已截断/u)
    assert.match(warnings, /代码超过 100000 字符/u)
    const html = await readText(exported.value.htmlPath)
    assert.match(html, /内容过长，导出时已截断/u)
    assert.match(html, /代码过长，页面已截断/u)
    assert.ok(Buffer.byteLength(html, 'utf8') < 2_000_000)
    const limitations = exported.value.manifest.limitations.join('\n')
    assert.match(limitations, /超过 20000 字符/u, 'truncation warning recorded in manifest limitations')
    assert.match(limitations, /代码超过 100000 字符/u)
    // The native source keeps the complete code.
    const nativeForLong = exported.value.nativeFiles.find(path => path.includes(longActivity.id))
    assert.ok(nativeForLong !== undefined)
    const nativeContent = await readText(nativeForLong)
    assert.ok(nativeContent.includes('print(1)\n'.repeat(100)))
  } finally {
    await store.dispose()
  }
})

test('graph interaction runtime redraws paths and animates on a DOM shim', async () => {
  const document = createOfflineDocument()
  const shim = asOfflineDocument(document)
  const graphPayload: GraphPayload = {
    type: 'graph',
    title: '离线交互测试',
    xRange: [-4, 4],
    yRange: [-1, 9],
    series: [{ id: 's1', label: 'a·x²', expr: 'a * x^2' }],
    params: [{ name: 'a', label: '系数 a', min: 0.2, max: 2, step: 0.1, value: 1 }],
    animation: { param: 'a', from: 0.2, to: 2, durationMs: 1_000 },
  }
  const activity: LessonActivity = {
    id: activityId(),
    kind: 'interactive-graph',
    sessionId: 'session-test' as never,
    courseId: 'course-test' as never,
    conceptIds: [],
    goal: '观察参数对曲线的影响',
    title: '离线交互测试',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    revision: 1,
    status: 'active',
    sourceRefs: [],
    verification: { kind: 'none' },
    payload: graphPayload,
  }
  const container = document.createElement('div')
  mountActivity(container, activity, { document, offline: true })
  const wrapper = asOfflineElement(container).children[0]
  assert.ok(wrapper !== undefined)
  const layout = graphLayoutOf(graphPayload, wrapper as unknown as HTMLElement)
  assert.ok(layout !== undefined)
  // Padding recovered from the rendered frame (320px plot height, 38px bottom pad).
  assert.equal(layout.padTop, 16)
  assert.equal(layout.padBottom, 38)
  assert.equal(layout.padLeft, 52)
  assert.equal(layout.xFrom, -4)
  assert.equal(layout.xTo, 4)

  // Deterministic animation clock for the runtime.
  const frames = new Map<number, (time: number) => void>()
  let nextFrame = 1
  const fakeWindow: Record<string, unknown> = {
    requestAnimationFrame: (callback: (time: number) => void): number => {
      const id = nextFrame
      nextFrame += 1
      frames.set(id, callback)
      return id
    },
    cancelAnimationFrame: (id: number): void => { frames.delete(id) },
  }
  const stepFrames = (time: number): void => {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) callback(time)
  }

  const runtime = buildOfflineRuntimeScript()
  // Parse check + boot against the shim document (no activities attached there).
  new Function('document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', runtime)(
    document, fakeWindow, fakeWindow.requestAnimationFrame, fakeWindow.cancelAnimationFrame,
  )
  const api = fakeWindow.__TeachingOfflineRuntime as {
    initGraph: (target: unknown, entry: unknown) => void
    initQuiz: (target: unknown, entry: unknown) => void
  }
  assert.ok(api !== undefined)
  api.initGraph(wrapper, {
    activityId: activity.id,
    kind: 'graph',
    payload: graphPayload,
    layout: { graph: layout },
  })
  assert.equal(wrapper.getAttribute('data-teaching-enhanced'), 'graph')

  const path = wrapper.getElementsByTagName('path')[0]
  assert.ok(path !== undefined)
  const before = path.getAttribute('d')
  const slider = wrapper.getElementsByTagName('input')[0]
  const readout = wrapper.getElementsByClassName('teaching-graph-param')[0]?.getElementsByTagName('span')[1]
  assert.ok(slider !== undefined)
  assert.ok(readout !== undefined)
  slider.value = '2'
  slider.dispatchEvent({ type: 'input' })
  const afterSlider = path.getAttribute('d')
  assert.notEqual(afterSlider, before, 'slider redraws the series path')
  assert.match(readout.textContent, /^2(\.0)?$/u, 'slider readout updates')

  // Animation play/pause and parameter sweep.
  const playButton = wrapper.getElementsByClassName('teaching-graph-animation')[0]?.getElementsByTagName('button')[0]
  assert.ok(playButton !== undefined)
  playButton.dispatchEvent({ type: 'click' })
  assert.equal(playButton.textContent, '暂停动画')
  assert.equal(frames.size, 1)
  stepFrames(1_000)
  const afterStart = path.getAttribute('d')
  stepFrames(1_500)
  const mid = path.getAttribute('d')
  assert.notEqual(mid, afterStart, 'animation advances the curve')
  assert.notEqual(mid, afterSlider)
  stepFrames(2_000)
  assert.equal(playButton.textContent, '播放动画', 'animation stops at the end')
  assert.equal(frames.size, 0)

  // Quiz wiring on the same runtime (submit feedback, no network).
  const quizContainer = document.createElement('div')
  const quizActivity: LessonActivity = {
    ...(activity as unknown as LessonActivity),
    id: activityId(),
    kind: 'quiz',
    title: '离线 quiz',
    payload: {
      type: 'quiz',
      question: '2 + 2 = ?',
      options: [{ id: 'a', label: '4' }, { id: 'b', label: '5' }],
      correctOptionIds: ['a'],
      explanation: '2+2=4',
      hint: '想想加法',
    },
  }
  mountActivity(quizContainer, quizActivity, { document, offline: true })
  const quizWrapper = asOfflineElement(quizContainer).children[0]
  assert.ok(quizWrapper !== undefined)
  api.initQuiz(quizWrapper, { activityId: quizActivity.id, kind: 'quiz', payload: quizActivity.payload })
  const submit = quizWrapper.getElementsByTagName('button').find(button => button.textContent === '提交答案')
  assert.ok(submit !== undefined)
  submit.dispatchEvent({ type: 'click' })
  const feedback = quizWrapper.getElementsByClassName('teaching-quiz-feedback')[0]
  assert.match(feedback?.textContent ?? '', /请先选择至少一个选项/u)
  const input = quizWrapper.getElementsByTagName('input')[0]
  assert.ok(input !== undefined)
  input.checked = true
  submit.dispatchEvent({ type: 'click' })
  assert.match(feedback?.textContent ?? '', /离线页面：作答不会回传 Harness/u)
  assert.match(feedback?.textContent ?? '', /一致/u)
})

test('runtime script itself contains no external URLs and parses as JavaScript', () => {
  const script = buildOfflineRuntimeScript()
  assert.doesNotThrow(() => new Function(script))
  assert.doesNotMatch(script, /https?:\/\//u)
  assert.doesNotMatch(script, /\bfetch\s*\(/u)
  assert.doesNotMatch(script, /\bXMLHttpRequest\b/u)
})
