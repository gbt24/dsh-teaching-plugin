/**
 * API client + SSE parser tests with a mocked fetch. No browser required: the
 * stream is a real ReadableStream and responses are real `Response` objects.
 */
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { ChatStreamEvent } from '@deepseek-teaching/core/contracts'
import {
  ApiFailure, apiGet, apiPost, apiUrl, buildQueryString, consumeChatStreamResponse,
  decodeSseFrame, readResultEnvelope, splitSseFrames, toApiFailure,
} from '../../src/client/api.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    return await handler(url, init)
  }) as typeof fetch
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

test('query strings skip empty values and preserve order', () => {
  assert.equal(buildQueryString(undefined), '')
  assert.equal(buildQueryString({ courseId: 'course-1', offset: 0, limit: undefined }), '?courseId=course-1&offset=0')
  assert.equal(apiUrl('sessions.get', { sessionId: 'sess-1' }), '/api/teaching/sessions.get?sessionId=sess-1')
})

test('GET unwraps the Result envelope and sends same-origin credentials', async () => {
  let seenUrl = ''
  let seenInit: RequestInit | undefined
  mockFetch((url, init) => {
    seenUrl = url
    seenInit = init
    return jsonResponse({ ok: true, value: { courses: [] } })
  })
  const value = await apiGet('courses.list')
  assert.deepEqual(value, { courses: [] })
  assert.equal(seenUrl, '/api/teaching/courses.list')
  assert.equal(seenInit?.method, 'GET')
  assert.equal(seenInit?.credentials, 'same-origin')
})

test('POST serialises the JSON body', async () => {
  let body = ''
  let contentType = ''
  mockFetch((_url, init) => {
    body = String(init?.body ?? '')
    contentType = String((init?.headers as Record<string, string>)['content-type'])
    return jsonResponse({ ok: true, value: { deleted: true } })
  })
  const value = await apiPost('courses.delete', { courseId: 'course-1' as never })
  assert.equal(value.deleted, true)
  assert.equal(body, '{"courseId":"course-1"}')
  assert.equal(contentType, 'application/json')
})

test('an error envelope becomes a typed ApiFailure', async () => {
  mockFetch(() => jsonResponse({ ok: false, error: { code: 'not-found', message: '课程不存在', retryable: false } }))
  await assert.rejects(
    () => apiGet('courses.get', { courseId: 'course-x' as never }),
    (error: unknown) => {
      assert.ok(error instanceof ApiFailure)
      assert.equal(error.appError.code, 'not-found')
      assert.equal(error.appError.message, '课程不存在')
      return true
    },
  )
})

test('a non-JSON response and a network failure are explicit', async () => {
  mockFetch(() => new Response('<html>bad gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }))
  await assert.rejects(() => apiGet('bootstrap'), /非 JSON 响应/u)

  mockFetch(() => { throw new TypeError('fetch failed') })
  await assert.rejects(
    () => apiGet('bootstrap'),
    (error: unknown) => error instanceof ApiFailure && error.appError.code === 'network',
  )
  const described = toApiFailure(new Error('boom'))
  assert.equal(described.appError.code, 'network')
})

test('readResultEnvelope rejects a missing envelope', async () => {
  await assert.rejects(() => readResultEnvelope(new Response('{"value":1}', { status: 200 })), /封套/u)
})

test('SSE frame splitting keeps the partial tail', () => {
  const { frames, rest } = splitSseFrames('data: {"type":"progress","label":"读资料"}\n\ndata: {"type":')
  assert.equal(frames.length, 1)
  assert.equal(rest, 'data: {"type":')
  const decoded = decodeSseFrame(frames[0] ?? '')
  assert.deepEqual(decoded, [{ type: 'progress', label: '读资料' }])
})

test('SSE decoder ignores comments/event lines and rejects unknown types', () => {
  assert.deepEqual(decodeSseFrame(': keep-alive\nevent: delta\ndata: {"type":"delta","text":"你好"}'), [{ type: 'delta', text: '你好' }])
  assert.deepEqual(decodeSseFrame('event: noop'), [])
  assert.throws(() => decodeSseFrame('data: not-json'), ApiFailure)
  assert.throws(() => decodeSseFrame('data: {"type":"mystery"}'), ApiFailure)
})

function sseResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
}

test('consumes a full chat stream in order and stops at the terminal event', async () => {
  const studentMessage = { id: 'msg-student', text: '什么是过拟合？' }
  const teacherMessage = { id: 'msg-teacher', text: '过拟合是…' }
  const events: ChatStreamEvent[] = []
  const response = sseResponse([
    'data: {"type":"start","studentMessage":{"id":"msg-student","text":"什么是过拟合？"}}\n\n',
    'data: {"type":"progress","label":"检索课程资料"}\n\n',
    'data: {"type":"delta","text":"过拟合是"}\n\ndata: {"type":"delta","text":"…"}\n\n',
    'data: {"type":"activity","activity":{"id":"act-1","title":"图"}}\n\n',
    'data: {"type":"evidence","refs":[{"kind":"course-source","label":"SICP.pdf"}]}\n\n',
    'data: {"type":"position","stage":"teaching"}\n\n',
    'data: {"type":"done","message":{"id":"msg-teacher","text":"过拟合是…"}}\n\n',
    // Frames after the terminal event must not be processed.
    'data: {"type":"delta","text":"不应该出现"}\n\n',
  ])
  const outcome = await consumeChatStreamResponse(response, { onEvent: event => events.push(event) })
  assert.equal(outcome.terminal, true)
  assert.deepEqual(events.map(event => event.type), ['start', 'progress', 'delta', 'delta', 'activity', 'evidence', 'position', 'done'])
  assert.equal(events.length, 8)
  assert.equal(events[0]?.type === 'start' && events[0].studentMessage.text, studentMessage.text)
  assert.equal(events[7]?.type === 'done' && events[7].message.id, teacherMessage.id)
})

test('a truncated stream becomes an explicit error event', async () => {
  const events: ChatStreamEvent[] = []
  const response = sseResponse(['data: {"type":"start","studentMessage":{}}\n\n', 'data: {"type":"delta","text":"半句"}\n\n'])
  const outcome = await consumeChatStreamResponse(response, { onEvent: event => events.push(event) })
  assert.equal(outcome.terminal, true)
  const last = events.at(-1)
  assert.equal(last?.type, 'error')
  assert.match(last?.type === 'error' ? last.error.message : '', /连接中断/u)
})

test('a non-SSE Result error becomes the terminal error event', async () => {
  const events: ChatStreamEvent[] = []
  const response = jsonResponse({ ok: false, error: { code: 'cancelled', message: '已取消' } })
  const outcome = await consumeChatStreamResponse(response, { onEvent: event => events.push(event) })
  assert.equal(outcome.terminal, true)
  assert.equal(events[0]?.type, 'error')
  assert.equal(events[0]?.type === 'error' ? events[0].error.code : '', 'cancelled')
})
