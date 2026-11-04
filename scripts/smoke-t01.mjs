#!/usr/bin/env node
/**
 * T01 smoke flow against a running development Host.
 *
 * Usage:
 *   node scripts/smoke-t01.mjs <baseUrl> <token> [fixturePath]
 *
 * Drives the real /api/teaching routes the way the client does: bootstrap ->
 * create course -> import source (async task) -> generate draft -> confirm ->
 * create session -> chat (SSE) -> run activity -> submit attempt -> reload
 * session. Prints a compact transcript used as T01 evidence; exits non-zero on
 * the first contract violation.
 */
const [, , baseUrlArg, tokenArg, fixtureArg] = process.argv
if (baseUrlArg === undefined || tokenArg === undefined) {
  console.error('usage: node scripts/smoke-t01.mjs <baseUrl> <token> [fixturePath]')
  process.exit(2)
}
const baseUrl = baseUrlArg.replace(/\/$/, '')
const token = tokenArg
const fixture = fixtureArg ?? '.scratch/fixtures/overfitting.md'
const cwd = process.cwd()

let cookies = ''
/** Call one /api/teaching operation and unwrap the Result envelope. */
async function call(operation, { method = 'POST', query, body } = {}) {
  const url = new URL(`${baseUrl}/api/teaching/${operation}`)
  if (query !== undefined) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookies === '' ? {} : { cookie: cookies }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const setCookie = response.headers.getSetCookie?.() ?? []
  if (setCookie.length > 0) cookies = setCookie.map(value => value.split(';')[0]).join('; ')
  const text = await response.text()
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error(`${operation}: non-JSON response ${response.status}: ${text.slice(0, 200)}`) }
  if (parsed.ok !== true) throw new Error(`${operation}: ${JSON.stringify(parsed.error)}`)
  return parsed.value
}

/** Authenticate the browser session cookie from the launch token. */
async function authenticate() {
  // The token endpoint answers 303 + Set-Cookie; read it before following so
  // undici's redirect handling cannot hide the cookie, then confirm it works.
  const first = await fetch(`${baseUrl}/?token=${encodeURIComponent(token)}`, { redirect: 'manual' })
  const raw = first.headers.getSetCookie?.() ?? []
  const fallback = first.headers.get('set-cookie')
  const cookiesFromHeaders = raw.length > 0 ? raw : (fallback === null ? [] : [fallback])
  cookies = cookiesFromHeaders.map(value => value.split(';')[0]).join('; ')
  if (cookies === '') throw new Error('启动 token 未能建立会话 cookie')
  const check = await fetch(`${baseUrl}/`, { headers: { cookie: cookies } })
  if (check.status !== 200) throw new Error(`会话 cookie 无效: ${check.status}`)
  return check.status
}

/** Poll a task until it settles. */
async function waitTask(taskId, label) {
  for (let i = 0; i < 200; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 100))
    const { task } = await call('tasks.get', { method: 'GET', query: { taskId } })
    if (['completed', 'failed', 'cancelled', 'partial'].includes(task.status)) {
      console.log(`[task] ${label}: ${task.status}${task.error === undefined ? '' : ` (${task.error.code}: ${task.error.message})`}`)
      if (task.status !== 'completed') throw new Error(`${label} 未完成: ${task.status} ${JSON.stringify(task.error ?? {})}`)
      return task
    }
  }
  throw new Error(`${label} 超时`)
}

/** Read an SSE chat turn to completion. */
async function chat(sessionId, text) {
  const response = await fetch(`${baseUrl}/api/teaching/chat.send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookies },
    body: JSON.stringify({ sessionId, text }),
  })
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error(`chat.send 未返回 SSE: ${response.status} ${await response.text()}`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events = []
  let answer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let index
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)
      const line = frame.split('\n').find(item => item.startsWith('data: '))
      if (line === undefined) continue
      const event = JSON.parse(line.slice(6))
      events.push(event)
      if (event.type === 'delta') answer += event.text
      if (event.type === 'error') throw new Error(`chat error: ${JSON.stringify(event.error)}`)
    }
  }
  const done = events.find(event => event.type === 'done')
  if (done === undefined) throw new Error('chat 流没有 done 终态')
  return { events, answer: answer || done.message.text, message: done.message }
}

const transcript = []
function record(label, value) {
  transcript.push({ label, value })
  console.log(`\n## ${label}`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2).slice(0, 1600))
}

await authenticate()
const bootstrap = await call('bootstrap', { method: 'GET' })
record('bootstrap', { pluginVersion: bootstrap.pluginVersion, model: bootstrap.model, host: bootstrap.host })

const created = await call('courses.create', { body: {
  title: 'T01 冒烟课程：过拟合与泛化',
  description: '用真实本地 Markdown 资料验证最小教学流程',
  goals: ['能用自己的话解释过拟合', '能在新数据情境下判断泛化风险'],
  language: 'zh',
} })
record('course.create', { courseId: created.course.id, revisionId: created.revision.id })

const importTask = await call('sources.import', { body: { courseId: created.course.id, paths: [`${cwd}/${fixture}`] } })
const importDone = await waitTask(importTask.task.id, 'sources.import')
record('sources.import', importDone.result)

const draftTask = await call('courseDraft.generate', { body: { courseId: created.course.id } })
await waitTask(draftTask.task.id, 'courseDraft.generate')
const draft = await call('courseDraft.get', { method: 'GET', query: { courseId: created.course.id } })
record('courseDraft', {
  revisionId: draft.draft.revision.id,
  concepts: draft.draft.revision.concepts.map(concept => concept.title),
  coverage: draft.draft.coverage,
  warnings: draft.draft.warnings,
})

const confirmed = await call('courseDraft.confirm', { body: {
  courseId: created.course.id,
  revisionId: draft.draft.revision.id,
  edits: { goals: ['能用自己的话解释过拟合', '能在新数据情境下判断泛化风险'] },
} })
record('course.confirm', { activeRevisionId: confirmed.course.activeRevisionId, conceptCount: confirmed.revision.concepts.length })

const session = await call('sessions.create', { body: { courseId: created.course.id, title: '过拟合学习' } })
record('session.create', { sessionId: session.session.id })

const turn = await chat(session.session.id, '过拟合是什么意思？为什么训练误差低不代表泛化好？')
record('chat.turn', {
  answer: turn.answer.slice(0, 800),
  events: turn.events.map(event => event.type),
  evidence: turn.message.evidenceRefs?.map(ref => ({ kind: ref.kind, label: ref.label })),
  usage: turn.message.usage,
})

const view = await call('sessions.get', { method: 'GET', query: { sessionId: session.session.id } })
record('session.reload', {
  messageCount: view.messages.length,
  roles: view.messages.map(message => message.role),
  activityCount: view.activities.length,
  position: view.session.position,
})

const activity = view.activities[0]
let attemptResult
if (activity !== undefined) {
  record('activity', { id: activity.id, kind: activity.kind, payloadType: activity.payload?.type, title: activity.title })
  if (activity.payload?.type === 'quiz') {
    attemptResult = await call('attempts.submit', { body: {
      sessionId: session.session.id,
      activityId: activity.id,
      activityRevision: activity.revision,
      prompt: activity.payload.question,
      answerText: '（选择）',
      helpLevel: 0,
      answerRevealed: false,
      selectedOptionIds: activity.payload.correctOptionIds.slice(0, 1),
    } })
  } else if (activity.payload?.type === 'code-run') {
    const run = await call('activity.run', { body: { activityId: activity.id } })
    record('activity.run', { status: run.run.status, stdout: run.run.stdout, checks: run.run.checks })
    attemptResult = await call('attempts.submit', { body: {
      sessionId: session.session.id,
      activityId: activity.id,
      activityRevision: activity.revision,
      prompt: activity.goal,
      answerText: run.run.stdout,
      helpLevel: 0,
      answerRevealed: false,
      runId: run.run.id,
    } })
  } else {
    attemptResult = await call('attempts.submit', { body: {
      sessionId: session.session.id,
      activityId: activity.id,
      activityRevision: activity.revision,
      prompt: activity.goal,
      answerText: '过拟合是模型记住了训练数据的噪声，导致新数据上误差变大；判断要看验证误差而不是训练误差。',
      helpLevel: 2,
      hintsSeen: ['先比较训练误差与验证误差'],
      answerRevealed: false,
    } })
  }
  record('attempt.submit', {
    independence: attemptResult.attempt.independence,
    validation: attemptResult.validation.kind,
    masteredConcepts: attemptResult.mastery.map(item => ({ conceptId: item.conceptId, level: item.level, basis: item.basis })),
    independenceNote: attemptResult.independenceNote,
  })
}

record('summary', {
  courseId: created.course.id,
  sessionId: session.session.id,
  activityId: activity?.id,
  activityCreated: activity !== undefined,
})
