/**
 * Graphical activity kinds now render inline in the chat conversation instead of
 * the right teaching panel. These helpers are pure so message/activity mapping
 * is directly testable.
 */
import type { ActivityKind, ChatMessage, LessonActivity } from '@deepseek-teaching/core/contracts'

/** Activity kinds whose visualization belongs inline under the teacher message. */
export const GRAPHICAL_ACTIVITY_KINDS = ['visual', 'interactive-graph', 'static-figure', 'animation'] as const

/** True for the chat-inline graphical kinds. */
export function isGraphicalActivityKind(kind: ActivityKind | string): boolean {
  return (GRAPHICAL_ACTIVITY_KINDS as readonly string[]).includes(kind)
}

/** Split activities into the graphical ones (chat) and the rest (teaching panel). */
export function splitGraphicalActivities(
  activities: readonly LessonActivity[],
): { readonly graphical: readonly LessonActivity[]; readonly other: readonly LessonActivity[] } {
  const graphical: LessonActivity[] = []
  const other: LessonActivity[] = []
  for (const activity of activities) {
    if (isGraphicalActivityKind(activity.kind)) graphical.push(activity)
    else other.push(activity)
  }
  return { graphical, other }
}

/** Resolve a message's linked activity ids to activities, preserving message order. */
export function linkedActivitiesForMessage(
  message: Pick<ChatMessage, 'activityIds'>,
  activities: readonly LessonActivity[],
): readonly LessonActivity[] {
  const byId = new Map(activities.map(activity => [activity.id as string, activity]))
  const linked: LessonActivity[] = []
  for (const id of message.activityIds ?? []) {
    const activity = byId.get(id as string)
    if (activity !== undefined) linked.push(activity)
  }
  return linked
}

/** The graphical subset of one message's linked activities (inline cards). */
export function messageGraphicalActivities(
  message: Pick<ChatMessage, 'activityIds'>,
  activities: readonly LessonActivity[],
): readonly LessonActivity[] {
  return splitGraphicalActivities(linkedActivitiesForMessage(message, activities)).graphical
}

/** True when the message has at least one linked graphical activity. */
export function messageHasGraphicalActivity(
  message: Pick<ChatMessage, 'activityIds'>,
  activities: readonly LessonActivity[],
): boolean {
  return messageGraphicalActivities(message, activities).length > 0
}

/**
 * Newest message that carries graphical activities, if any. Used by ChatPanel to
 * scroll to the inline block instead of the conversation bottom.
 */
export function latestGraphicalMessageId(
  messages: readonly ChatMessage[],
  activities: readonly LessonActivity[],
): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message !== undefined && messageHasGraphicalActivity(message, activities)) return message.id as string
  }
  return undefined
}
