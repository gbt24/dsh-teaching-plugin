/**
 * Pure tests for chat-inline graphical activity mapping.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ChatMessage, LessonActivity } from '@deepseek-teaching/core/contracts'
import {
  GRAPHICAL_ACTIVITY_KINDS, isGraphicalActivityKind, latestGraphicalMessageId,
  linkedActivitiesForMessage, messageGraphicalActivities, messageHasGraphicalActivity,
  splitGraphicalActivities,
} from '../../src/client/activity-kinds.ts'

function activity(id: string, kind: string): LessonActivity {
  return {
    id: id as never,
    kind: kind as never,
    sessionId: 'sess-1' as never,
    courseId: 'course-1' as never,
    conceptIds: [],
    goal: '观察',
    title: `活动 ${id}`,
    createdAt: '2026-11-05T00:00:00.000Z',
    updatedAt: '2026-11-05T00:00:00.000Z',
    revision: 1,
    status: 'active',
    sourceRefs: [],
    verification: { kind: 'none' },
    payload: { type: 'explanation', markdown: '' },
  }
}

function message(id: string, activityIds: readonly string[]): ChatMessage {
  return {
    id: id as never,
    sessionId: 'sess-1' as never,
    role: 'teacher',
    kind: 'teacher-explanation',
    text: '讲解',
    createdAt: '2026-11-05T00:00:00.000Z',
    activityIds: activityIds.map(item => item as never),
  }
}

test('graphical kinds are exactly visual, interactive-graph, static-figure and animation', () => {
  assert.deepEqual([...GRAPHICAL_ACTIVITY_KINDS], ['visual', 'interactive-graph', 'static-figure', 'animation'])
  for (const kind of GRAPHICAL_ACTIVITY_KINDS) assert.equal(isGraphicalActivityKind(kind), true)
  for (const kind of ['explanation', 'code-run', 'quiz', 'derivation', 'reading-task', 'experiment-note']) {
    assert.equal(isGraphicalActivityKind(kind), false)
  }
})

test('splitGraphicalActivities separates chat visuals from panel activities', () => {
  const activities = [
    activity('a1', 'explanation'),
    activity('a2', 'visual'),
    activity('a3', 'code-run'),
    activity('a4', 'interactive-graph'),
    activity('a5', 'static-figure'),
    activity('a6', 'animation'),
  ]
  const split = splitGraphicalActivities(activities)
  assert.deepEqual(split.graphical.map(item => item.id), ['a2', 'a4', 'a5', 'a6'])
  assert.deepEqual(split.other.map(item => item.id), ['a1', 'a3'])
})

test('linkedActivitiesForMessage preserves message order and ignores unknown ids', () => {
  const activities = [activity('a1', 'visual'), activity('a2', 'quiz'), activity('a3', 'interactive-graph')]
  const linked = linkedActivitiesForMessage(message('m1', ['a3', 'missing', 'a1']), activities)
  assert.deepEqual(linked.map(item => item.id), ['a3', 'a1'])
  assert.deepEqual(linkedActivitiesForMessage(message('m2', []), activities), [])
})

test('messageGraphicalActivities returns only the inline-card activities', () => {
  const activities = [
    activity('a1', 'explanation'), activity('a2', 'visual'), activity('a3', 'animation'), activity('a4', 'quiz'),
  ]
  const msg = message('m1', ['a1', 'a2', 'a3', 'a4'])
  assert.deepEqual(messageGraphicalActivities(msg, activities).map(item => item.id), ['a2', 'a3'])
  assert.equal(messageHasGraphicalActivity(msg, activities), true)
  assert.equal(messageHasGraphicalActivity(message('m2', ['a1', 'a4']), activities), false)
})

test('latestGraphicalMessageId finds the newest message with an inline visual', () => {
  const activities = [activity('a1', 'visual'), activity('a2', 'quiz')]
  const messages = [
    message('m1', ['a1']),
    message('m2', ['a2']),
    message('m3', []),
  ]
  assert.equal(latestGraphicalMessageId(messages, activities), 'm1')
  assert.equal(latestGraphicalMessageId([message('m1', ['a2'])], activities), undefined)
  assert.equal(latestGraphicalMessageId([], activities), undefined)
})
