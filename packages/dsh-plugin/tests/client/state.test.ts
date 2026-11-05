/**
 * Workspace reducer tests: streaming lifecycle, activity persistence, session
 * restore, progress derivation and error/cancel semantics.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  ActivityState, ChatMessage, ChatStreamEvent, ContextUsageView, CourseDetail, ExperimentRun,
  LessonActivity, SessionView, TeachingSession,
} from '@deepseek-teaching/core/contracts'
import {
  INITIAL_WORKSPACE_STATE, applyChatStreamEvent, appendMessage, computeCourseProgress,
  draftConceptCount, latestActivity, mergeEvidence, needsCourseSetup, selectedActivity,
  sortedReview, upsertActivity, workspaceReducer, type WorkspaceState,
} from '../../src/client/state.ts'

const NOW = '2026-11-04T08:00:00.000Z'

function sessionView(options: {
  readonly activityIds: readonly string[]
  readonly positionActivityId?: string | null
}): SessionView {
  const activities = options.activityIds.map(id => activity(id, 1))
  return {
    session: {
      id: 'sess-1' as never, courseId: 'course-1' as never, courseRevisionId: 'crev-1' as never,
      title: '会话', createdAt: NOW, updatedAt: NOW, status: 'active',
      position: {
        stage: 'teaching',
        ...(options.positionActivityId === undefined || options.positionActivityId === null
          ? {}
          : { activityId: options.positionActivityId as never }),
        updatedAt: NOW,
      },
      messageIds: [], coveredConceptIds: [],
    },
    messages: [],
    activities,
    states: activities.map(item => ({
      activityId: item.id, activityRevision: 1, updatedAt: NOW,
    })) as never,
    course: {} as never, courseRevision: {} as never,
    mastery: [], review: [],
  }
}

function runFor(activityId: string, status: ExperimentRun['status'] = 'succeeded'): ExperimentRun {
  return {
    id: `run-${activityId}` as never,
    activityId: activityId as never,
    environmentId: 'env-1' as never,
    language: 'python',
    code: 'print(1)',
    startedAt: NOW,
    endedAt: NOW,
    status,
    stdout: '1\n',
    stderr: '',
    exitCode: 0,
    durationMs: 12,
    verification: 'exploratory',
    limits: { timeoutMs: 10000 },
  }
}

function message(id: string, role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: id as never, sessionId: 'sess-1' as never, role,
    kind: role === 'student' ? 'student-question' : 'teacher-explanation', text, createdAt: NOW,
  }
}

function activity(id: string, revision: number, updatedAt = NOW): LessonActivity {
  return {
    id: id as never, kind: 'explanation', sessionId: 'sess-1' as never, courseId: 'course-1' as never,
    conceptIds: [], goal: 'g', title: `活动 ${id}`, createdAt: NOW, updatedAt,
    revision, status: 'active', sourceRefs: [], verification: { kind: 'none' },
    payload: { type: 'explanation', markdown: '**x**' },
  }
}

test('streaming lifecycle: start → progress → delta → done', () => {
  let state: WorkspaceState = { ...INITIAL_WORKSPACE_STATE, phase: 'ready' }
  const events: ChatStreamEvent[] = [
    { type: 'start', studentMessage: message('msg-1', 'student', '问题') },
    { type: 'progress', label: '检索资料' },
    { type: 'delta', text: '第一段' },
    { type: 'delta', text: '第二段' },
    { type: 'done', message: message('msg-2', 'teacher', '第一段第二段') },
  ]
  for (const event of events) state = applyChatStreamEvent(state, event)
  assert.deepEqual(state.messages.map(item => item.id), ['msg-1', 'msg-2'])
  assert.equal(state.chat.status, 'idle')
  assert.equal(state.chat.text, '')
  // progress is transient: it is shown while streaming and cleared on done.
  assert.equal(state.chat.progressLabel, undefined)
})

test('a streamed activity becomes the selected persistent activity', () => {
  let state: WorkspaceState = { ...INITIAL_WORKSPACE_STATE, phase: 'ready' }
  state = applyChatStreamEvent(state, { type: 'activity', activity: activity('act-1', 1) })
  assert.equal(state.activities.length, 1)
  assert.equal(state.selectedActivityId, 'act-1')
  assert.equal(state.selectedTab, 'activity')
  // A later revision replaces instead of duplicating.
  state = applyChatStreamEvent(state, { type: 'activity', activity: activity('act-1', 2, '2026-11-04T08:00:01.000Z') })
  assert.equal(state.activities.length, 1)
  assert.equal(selectedActivity(state)?.revision, 2)
})

test('error keeps the partial text and exposes the AppError', () => {
  let state: WorkspaceState = { ...INITIAL_WORKSPACE_STATE, phase: 'ready' }
  state = applyChatStreamEvent(state, { type: 'start', studentMessage: message('msg-1', 'student', '问') })
  state = applyChatStreamEvent(state, { type: 'delta', text: '部分回答' })
  state = applyChatStreamEvent(state, { type: 'error', error: { code: 'network', message: '断网', retryable: true } })
  assert.equal(state.chat.status, 'idle')
  assert.equal(state.chat.text, '部分回答')
  assert.equal(state.chat.error?.code, 'network')
  // Starting a new turn clears the stale partial text.
  state = applyChatStreamEvent(state, { type: 'start', studentMessage: message('msg-3', 'student', '再问') })
  assert.equal(state.chat.text, '')
  assert.equal(state.chat.error, undefined)
})

test('evidence accumulates without duplicates', () => {
  const ref = { kind: 'course-source' as const, label: 'SICP.pdf · 第 1 章' }
  const merged = mergeEvidence([ref], [ref, { kind: 'model-knowledge' as const, label: '模型补充' }])
  assert.equal(merged.length, 2)
})

test('messages are appended once by id', () => {
  const existing = [message('msg-1', 'student', '问')]
  assert.equal(appendMessage(existing, message('msg-1', 'student', '问')).length, 1)
  assert.equal(appendMessage(existing, message('msg-2', 'teacher', '答')).length, 2)
})

test('session load restores messages, activities, state and learning data', () => {
  const state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: {
      session: {
        id: 'sess-1' as never, courseId: 'course-1' as never, courseRevisionId: 'crev-1' as never,
        title: '会话', createdAt: NOW, updatedAt: NOW, status: 'active',
        position: { stage: 'teaching', activityId: 'act-1' as never, updatedAt: NOW },
        messageIds: [], coveredConceptIds: ['concept-1' as never],
      },
      messages: [message('msg-1', 'student', '问')],
      activities: [activity('act-1', 1), activity('act-2', 1, '2026-11-04T07:00:00.000Z')],
      states: [{
        activityId: 'act-1' as never, activityRevision: 1, params: { a: 2 }, updatedAt: NOW,
      }],
      course: {} as never, courseRevision: {} as never,
      mastery: [], review: [],
    } satisfies SessionView,
  })
  assert.equal(state.messages.length, 1)
  assert.equal(state.activities.length, 2)
  assert.equal(state.selectedActivityId, 'act-1') // restored position wins over newest
  assert.deepEqual(state.activityStates['act-1']?.params, { a: 2 })
})

test('activity state upsert is keyed by activity id', () => {
  const activityState: ActivityState = {
    activityId: 'act-1' as never, activityRevision: 2, code: 'print(1)', updatedAt: NOW,
  }
  const state = workspaceReducer(INITIAL_WORKSPACE_STATE, { type: 'activity/state', state: activityState })
  assert.equal(state.activityStates['act-1']?.code, 'print(1)')
})

test('cancel transitions streaming → stopping', () => {
  let state: WorkspaceState = { ...INITIAL_WORKSPACE_STATE, phase: 'ready', chat: { status: 'streaming', text: '', evidence: [] } }
  state = workspaceReducer(state, { type: 'chat/cancel-requested' })
  assert.equal(state.chat.status, 'stopping')
  state = workspaceReducer(state, { type: 'chat/stream-event', event: { type: 'error', error: { code: 'cancelled', message: '已停止生成' } } })
  assert.equal(state.chat.status, 'idle')
})

test('course progress counts covered concepts and is resilient to missing revision', () => {
  const detail = {
    course: { id: 'course-1' } as never,
    revisions: [], sources: [],
    learning: { courseId: 'course-1', courseRevisionId: 'crev-1', attempts: [], mastery: [], review: [], notes: [], updatedAt: NOW } as never,
    activeRevision: {
      id: 'crev-1' as never, courseId: 'course-1' as never, version: 1, createdAt: NOW,
      state: 'confirmed', provenance: 'ai-draft', goals: [], language: 'zh', sources: [], sequence: [],
      concepts: [
        { id: 'c1' as never, title: 'A', summary: '', prerequisites: [], sourceAnchors: [] },
        { id: 'c2' as never, title: 'B', summary: '', prerequisites: [], sourceAnchors: [] },
      ],
      basedOn: [],
    },
  } satisfies CourseDetail
  const session = {
    session: { coveredConceptIds: ['c1' as never] },
  } as unknown as SessionView
  assert.deepEqual(computeCourseProgress({ courseDetail: detail, session, mastery: [] }), { covered: 1, total: 2, percent: 50 })
  assert.deepEqual(computeCourseProgress({}), { covered: 0, total: 0, percent: 0 })
})

test('needsCourseSetup detects a draft-only course and clears once confirmed', () => {
  const draftOnly = {
    course: { id: 'course-1', draftRevisionId: 'crev-1' } as never,
    revisions: [], sources: [],
    draftRevision: {
      id: 'crev-1' as never, courseId: 'course-1' as never, version: 1, createdAt: NOW,
      state: 'draft', provenance: 'student-edit', goals: ['g'], language: 'zh', sources: [], sequence: [],
      concepts: [
        { id: 'c1' as never, title: 'A', summary: '', prerequisites: [], sourceAnchors: [] },
      ],
      basedOn: [],
    },
    learning: { attempts: [], mastery: [], review: [], notes: [], updatedAt: NOW },
  } as unknown as CourseDetail
  assert.equal(needsCourseSetup(draftOnly), true)
  assert.equal(draftConceptCount(draftOnly), 1)
  assert.equal(needsCourseSetup(undefined), false)
  const confirmed = {
    ...draftOnly,
    activeRevision: { ...draftOnly.draftRevision, state: 'confirmed' },
  } as unknown as CourseDetail
  assert.equal(needsCourseSetup(confirmed), false)
  assert.equal(draftConceptCount(undefined), 0)
})

test('the first-run wizard is not switched to ready by course/task refreshes', () => {
  const bootstrap = { profile: { language: 'zh' }, warnings: [] } as never
  const onboarding = workspaceReducer(INITIAL_WORKSPACE_STATE, { type: 'bootstrap/loaded', bootstrap, courses: [] })
  assert.equal(onboarding.phase, 'onboarding')
  // A freshly created course must keep the student in the wizard until confirm.
  const afterCreate = workspaceReducer(onboarding, {
    type: 'courses/loaded',
    courses: [{ course: { id: 'course-1' } as never, sourceCount: 0, conceptCount: 0, readySourceCount: 0 }],
  })
  assert.equal(afterCreate.phase, 'onboarding')
  const afterTasks = workspaceReducer(afterCreate, { type: 'tasks/loaded', tasks: [] })
  assert.equal(afterTasks.phase, 'onboarding')
})

test('latest activity and sorted review helpers', () => {
  assert.equal(latestActivity([activity('a', 1, NOW), activity('b', 1, '2026-11-04T09:00:00.000Z')])?.id, 'b')
  assert.equal(latestActivity([]), undefined)
  const review = [
    { conceptId: 'c' as never, courseId: 'course' as never, dueAt: '2026-11-05T00:00:00Z', intervalDays: 2, reason: 'spaced' as const },
    { conceptId: 'd' as never, courseId: 'course' as never, dueAt: '2026-11-04T00:00:00Z', intervalDays: 1, reason: 'low-mastery' as const },
  ]
  assert.deepEqual(sortedReview(review).map(item => item.conceptId), ['d', 'c'])
})

test('upsertActivity keeps order for updates and appends new activities', () => {
  const list = [activity('a', 1), activity('b', 1)]
  const updated = upsertActivity(list, activity('a', 2))
  assert.deepEqual(updated.map(item => `${item.id}:${item.revision}`), ['a:2', 'b:1'])
  assert.equal(upsertActivity(list, activity('c', 1)).length, 3)
})

test('course wizard: opens from the workspace and cancels back without losing data', () => {
    const ready = {
      ...INITIAL_WORKSPACE_STATE,
      phase: 'ready' as const,
      courses: [{ course: { id: 'course-1' }, sourceCount: 1, conceptCount: 2, readySourceCount: 1 }] as never,
    }
    const opened = workspaceReducer(ready, { type: 'wizard/open' })
    assert.equal(opened.phase, 'onboarding')
    assert.equal(opened.courses.length, 1, 'existing courses stay loaded while adding a course')
  const closed = workspaceReducer(opened, { type: 'wizard/close' })
  assert.equal(closed.phase, 'ready')
})

test('course wizard: does not open while the workspace is still loading', () => {
  const loading = { ...INITIAL_WORKSPACE_STATE, phase: 'loading' as const }
  assert.equal(workspaceReducer(loading, { type: 'wizard/open' }), loading)
})


test('session load selects exactly position.activityId (no latest-activity fallback)', () => {
  const positioned = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: sessionView({ activityIds: ['act-1', 'act-2'], positionActivityId: 'act-2' }),
  })
  assert.equal(positioned.selectedActivityId, 'act-2')
  assert.deepEqual(positioned.latestRuns, {}, 'runs are loaded separately via runs.latest')

  const noPosition = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: sessionView({ activityIds: ['act-1', 'act-2'] }),
  })
  assert.equal(noPosition.selectedActivityId, undefined, 'no fallback to the newest activity')
  assert.equal(noPosition.activities.length, 2)

  const stalePosition = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: sessionView({ activityIds: ['act-1'], positionActivityId: 'act-missing' }),
  })
  assert.equal(stalePosition.selectedActivityId, undefined, 'missing position activity clears selection')
})

test('runs/loaded keys persisted runs by activity id and merges', () => {
  let state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'runs/loaded',
    runs: [runFor('act-1'), runFor('act-2', 'failed')],
  })
  assert.equal(state.latestRuns['act-1']?.status, 'succeeded')
  assert.equal(state.latestRuns['act-2']?.status, 'failed')
  state = workspaceReducer(state, { type: 'runs/loaded', runs: [runFor('act-1', 'cancelled')] })
  assert.equal(state.latestRuns['act-1']?.status, 'cancelled')
  const withoutActivity = { ...runFor('act-x'), activityId: undefined } as unknown as ExperimentRun
  state = workspaceReducer(state, { type: 'runs/loaded', runs: [withoutActivity] })
  assert.equal(Object.keys(state.latestRuns).length, 2, 'runs without activityId are ignored')
})

test('activity/removed removes the activity, its state/run and clears selection only when selected', () => {
  let state = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: sessionView({ activityIds: ['act-1', 'act-2'], positionActivityId: 'act-2' }),
  })
  state = workspaceReducer(state, { type: 'runs/loaded', runs: [runFor('act-1'), runFor('act-2')] })
  state = workspaceReducer(state, { type: 'activity/state', state: { activityId: 'act-2' as never, activityRevision: 1, code: 'print(1)', updatedAt: NOW } })
  // Removing the non-selected activity keeps the current one.
  state = workspaceReducer(state, { type: 'activity/removed', activityId: 'act-1', positionCleared: false })
  assert.deepEqual(state.activities.map(item => item.id), ['act-2'])
  assert.equal(state.session?.activities.length, 1)
  assert.equal(state.latestRuns['act-1'], undefined)
  assert.equal(state.selectedActivityId, 'act-2')
  // Removing the current activity clears the selection and its state/run.
  state = workspaceReducer(state, { type: 'activity/removed', activityId: 'act-2', positionCleared: true })
  assert.equal(state.activities.length, 0)
  assert.equal(state.session?.activities.length, 0)
  assert.equal(state.selectedActivityId, undefined)
  assert.deepEqual(state.activityStates, {})
  assert.deepEqual(state.latestRuns, {})
})

test('session/position applies the Host position after restore or collapse', () => {
  const loaded = workspaceReducer(INITIAL_WORKSPACE_STATE, {
    type: 'session/loaded',
    session: sessionView({ activityIds: ['act-1', 'act-2'], positionActivityId: 'act-1' }),
  })
  const restoredSession: TeachingSession = {
    ...loaded.session!.session,
    position: { ...loaded.session!.session.position, activityId: 'act-2' as never, updatedAt: NOW },
  }
  const restored = workspaceReducer(loaded, { type: 'session/position', session: restoredSession })
  assert.equal(restored.selectedActivityId, 'act-2')
  assert.equal(restored.session?.session.position.activityId, 'act-2')

  const collapsedSession: TeachingSession = {
    ...restoredSession,
    position: { stage: 'teaching', updatedAt: NOW },
  }
  const collapsed = workspaceReducer(restored, { type: 'session/position', session: collapsedSession })
  assert.equal(collapsed.selectedActivityId, undefined)
  assert.equal(collapsed.activities.length, 2, 'collapsing keeps history')
})


test('ui/collapse toggles the plugin columns independently', () => {
  const collapsed = workspaceReducer(INITIAL_WORKSPACE_STATE, { type: 'ui/collapse', panel: 'left', collapsed: true })
  assert.equal(collapsed.leftCollapsed, true)
  assert.equal(collapsed.rightCollapsed, false)
  const both = workspaceReducer(collapsed, { type: 'ui/collapse', panel: 'right', collapsed: true })
  assert.deepEqual([both.leftCollapsed, both.rightCollapsed], [true, true])
  const expanded = workspaceReducer(both, { type: 'ui/collapse', panel: 'left', collapsed: false })
  assert.deepEqual([expanded.leftCollapsed, expanded.rightCollapsed], [false, true])
})

test('context usage is stored per session and cleared when the session changes', () => {
  const usage: ContextUsageView = {
    sessionId: 'sess-1' as never,
    tokensUsed: 1234,
    contextWindow: 128000,
    percent: 1,
    source: 'reported',
    model: { provider: 'acme', model: 'teacher-1' },
  }
  let state = workspaceReducer(INITIAL_WORKSPACE_STATE, { type: 'context/usage', usage })
  assert.equal(state.contextUsage?.tokensUsed, 1234)
  // Loading another session drops the previous session's usage until reloaded.
  state = workspaceReducer(state, { type: 'session/loaded', session: sessionView({ activityIds: [], positionActivityId: null }) })
  assert.equal(state.contextUsage, undefined)
  state = workspaceReducer(state, { type: 'context/usage', usage })
  state = workspaceReducer(state, { type: 'session/cleared' })
  assert.equal(state.contextUsage, undefined)
})

