/**
 * Pure workspace state for the teaching client.
 *
 * Everything persisted lives in the Host; this reducer only models what the
 * current page shows and is fully driven by Host responses plus the
 * `ChatStreamEvent` stream. Keeping it pure makes the streaming/resume
 * semantics testable without a browser.
 */
import type {
  ActivityState, AppError, BootstrapInfo, ChatMessage, ChatStreamEvent, CourseDetail,
  CourseDraftView, CourseSummary, EnvironmentDirectory, EvidenceReference, LearningStage,
  LessonActivity, MasteryRecord, ReviewItem, SessionSummary, SessionView, TaskSnapshot,
} from '@deepseek-teaching/core/contracts'

/** Lifecycle of the whole panel. */
export type WorkspacePhase = 'loading' | 'onboarding' | 'ready' | 'fatal'

/** Tabs of the persistent teaching area. */
export type TeachingTab = 'activity' | 'sources' | 'experiments' | 'notes'

/** Streaming status of one chat turn. */
export interface ChatStreamState {
  readonly status: 'idle' | 'streaming' | 'stopping'
  /** Teacher text accumulated so far (kept visible if the stream fails). */
  readonly text: string
  readonly progressLabel?: string
  readonly evidence: readonly EvidenceReference[]
  readonly error?: AppError
  readonly studentMessageId?: string
}

/** Non-fatal banner shown above the chat. */
export interface WorkspaceNotice {
  readonly kind: 'info' | 'warning' | 'error'
  readonly message: string
  readonly code?: string
}

/** Full client state. */
export interface WorkspaceState {
  readonly phase: WorkspacePhase
  readonly bootstrap?: BootstrapInfo
  readonly fatalError?: AppError
  readonly courses: readonly CourseSummary[]
  readonly courseDetail?: CourseDetail
  readonly sessions: readonly SessionSummary[]
  readonly session?: SessionView
  readonly messages: readonly ChatMessage[]
  readonly activities: readonly LessonActivity[]
  /** Student-editable activity state keyed by activity id. */
  readonly activityStates: Readonly<Record<string, ActivityState>>
  readonly mastery: readonly MasteryRecord[]
  readonly review: readonly ReviewItem[]
  readonly chat: ChatStreamState
  readonly tasks: readonly TaskSnapshot[]
  readonly environments?: EnvironmentDirectory
  readonly courseDraft?: CourseDraftView
  readonly selectedTab: TeachingTab
  readonly selectedActivityId?: string
  readonly selectedSourceDocumentId?: string
  readonly notice?: WorkspaceNotice
  /** Short-lived non-task busy label (e.g. submitting an attempt). */
  readonly busy?: string
}

/** Initial state. */
export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  phase: 'loading',
  courses: [],
  sessions: [],
  messages: [],
  activities: [],
  activityStates: {},
  mastery: [],
  review: [],
  chat: { status: 'idle', text: '', evidence: [] },
  tasks: [],
  selectedTab: 'activity',
}

/** Actions the workspace can dispatch. */
export type WorkspaceAction =
  | { readonly type: 'bootstrap/loaded'; readonly bootstrap: BootstrapInfo; readonly courses: readonly CourseSummary[] }
  | { readonly type: 'bootstrap/failed'; readonly error: AppError }
  | { readonly type: 'workspace/loading' }
  | { readonly type: 'courses/loaded'; readonly courses: readonly CourseSummary[] }
  | { readonly type: 'course/loaded'; readonly detail: CourseDetail; readonly sessions: readonly SessionSummary[] }
  | { readonly type: 'course/cleared' }
  | { readonly type: 'sessions/loaded'; readonly sessions: readonly SessionSummary[] }
  | { readonly type: 'session/loaded'; readonly session: SessionView }
  | { readonly type: 'session/cleared' }
  | { readonly type: 'activity/upserted'; readonly activity: LessonActivity }
  | { readonly type: 'activity/state'; readonly state: ActivityState }
  | { readonly type: 'activity/states'; readonly states: readonly ActivityState[] }
  | { readonly type: 'learning/updated'; readonly mastery?: readonly MasteryRecord[]; readonly review?: readonly ReviewItem[] }
  | { readonly type: 'chat/stream-event'; readonly event: ChatStreamEvent }
  | { readonly type: 'chat/cancel-requested' }
  | { readonly type: 'chat/local-error'; readonly error: AppError }
  | { readonly type: 'chat/reset' }
  | { readonly type: 'tasks/loaded'; readonly tasks: readonly TaskSnapshot[] }
  | { readonly type: 'environments/loaded'; readonly environments: EnvironmentDirectory }
  | { readonly type: 'draft/loaded'; readonly draft?: CourseDraftView }
  | { readonly type: 'ui/tab'; readonly tab: TeachingTab }
  | { readonly type: 'ui/select-activity'; readonly activityId?: string }
  | { readonly type: 'ui/select-source'; readonly documentId?: string }
  | { readonly type: 'notice'; readonly notice?: WorkspaceNotice }
  | { readonly type: 'busy'; readonly label?: string }
  | { readonly type: 'error/clear' }

/** Replace an activity with the newer revision or append it. */
export function upsertActivity(
  activities: readonly LessonActivity[],
  activity: LessonActivity,
): readonly LessonActivity[] {
  const index = activities.findIndex(existing => existing.id === activity.id)
  if (index < 0) return [...activities, activity]
  const next = [...activities]
  next[index] = activity
  return next
}

/** Append a chat message once (by id); streaming `done` can repeat persisted ids. */
export function appendMessage(
  messages: readonly ChatMessage[],
  message: ChatMessage,
): readonly ChatMessage[] {
  if (messages.some(existing => existing.id === message.id)) return messages
  return [...messages, message]
}

/** Merge evidence refs, dropping exact duplicates. */
export function mergeEvidence(
  existing: readonly EvidenceReference[],
  incoming: readonly EvidenceReference[],
): readonly EvidenceReference[] {
  const seen = new Set(existing.map(ref => JSON.stringify(ref)))
  const merged = [...existing]
  for (const ref of incoming) {
    const key = JSON.stringify(ref)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(ref)
  }
  return merged
}

/** Latest activity of the session, used to restore the persistent area. */
export function latestActivity(activities: readonly LessonActivity[]): LessonActivity | undefined {
  let latest: LessonActivity | undefined
  for (const activity of activities) {
    if (latest === undefined || activity.updatedAt > latest.updatedAt) latest = activity
  }
  return latest
}

/** Apply one SSE event to the workspace state. */
export function applyChatStreamEvent(state: WorkspaceState, event: ChatStreamEvent): WorkspaceState {
  const chat = state.chat
  switch (event.type) {
    case 'start':
      return {
        ...state,
        messages: appendMessage(state.messages, event.studentMessage),
        chat: { status: 'streaming', text: '', evidence: [], studentMessageId: event.studentMessage.id },
        phase: 'ready',
      }
    case 'progress':
      return { ...state, chat: { ...chat, progressLabel: event.label } }
    case 'delta':
      return { ...state, chat: { ...chat, text: chat.text + event.text } }
    case 'activity':
      return {
        ...state,
        activities: upsertActivity(state.activities, event.activity),
        session: state.session === undefined ? state.session : {
          ...state.session,
          activities: upsertActivity(state.session.activities, event.activity),
        },
        selectedActivityId: event.activity.id,
        selectedTab: 'activity',
        chat: { ...chat },
      }
    case 'evidence':
      return {
        ...state,
        chat: { ...chat, evidence: mergeEvidence(chat.evidence, event.refs) },
      }
    case 'position': {
      if (state.session === undefined) return state
      return {
        ...state,
        session: {
          ...state.session,
          session: {
            ...state.session.session,
            position: {
              ...state.session.session.position,
              stage: event.stage as LearningStage,
              ...(event.conceptId !== undefined ? { conceptId: event.conceptId } : {}),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      }
    }
    case 'done':
      return {
        ...state,
        messages: appendMessage(state.messages, event.message),
        session: state.session === undefined ? state.session : {
          ...state.session,
          messages: appendMessage(state.session.messages, event.message),
        },
        chat: { status: 'idle', text: '', evidence: [] },
      }
    case 'error':
      return {
        ...state,
        chat: { ...chat, status: 'idle', error: event.error },
      }
    default:
      return state
  }
}

/** Run the reducer. */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'bootstrap/loaded': {
      const empty = action.courses.length === 0
      return {
        ...state,
        phase: empty ? 'onboarding' : 'ready',
        bootstrap: action.bootstrap,
        courses: action.courses,
        fatalError: undefined,
      }
    }
    case 'bootstrap/failed':
      return { ...state, phase: 'fatal', fatalError: action.error }
    case 'workspace/loading':
      return { ...state, phase: 'loading', fatalError: undefined }
    case 'courses/loaded':
      return {
        ...state,
        courses: action.courses,
        phase: action.courses.length === 0 && state.bootstrap !== undefined ? 'onboarding' : state.phase,
      }
    case 'course/loaded': {
      return {
        ...state,
        courseDetail: action.detail,
        sessions: action.sessions,
        phase: 'ready',
      }
    }
    case 'course/cleared':
      return {
        ...state,
        courseDetail: undefined,
        session: undefined,
        sessions: [],
        messages: [],
        activities: [],
        activityStates: {},
        mastery: [],
        review: [],
        selectedActivityId: undefined,
        selectedSourceDocumentId: undefined,
        chat: { status: 'idle', text: '', evidence: [] },
      }
    case 'sessions/loaded':
      return { ...state, sessions: action.sessions }
    case 'session/loaded': {
      const activityStates: Record<string, ActivityState> = {}
      for (const activityState of action.session.states) activityStates[activityState.activityId] = activityState
      const positionActivityId = action.session.session.position.activityId
      const selected = action.session.activities.some(activity => activity.id === positionActivityId)
        ? positionActivityId
        : latestActivity(action.session.activities)?.id
      return {
        ...state,
        phase: 'ready',
        session: action.session,
        messages: [...action.session.messages],
        activities: [...action.session.activities],
        activityStates,
        mastery: [...action.session.mastery],
        review: [...action.session.review],
        selectedActivityId: selected,
        selectedTab: selected === undefined ? state.selectedTab : 'activity',
        chat: { status: 'idle', text: '', evidence: [] },
        notice: undefined,
      }
    }
    case 'session/cleared':
      return {
        ...state,
        session: undefined,
        messages: [],
        activities: [],
        activityStates: {},
        mastery: [],
        review: [],
        selectedActivityId: undefined,
        chat: { status: 'idle', text: '', evidence: [] },
      }
    case 'activity/upserted':
      return {
        ...state,
        activities: upsertActivity(state.activities, action.activity),
        selectedActivityId: action.activity.id,
      }
    case 'activity/state':
      return {
        ...state,
        activityStates: { ...state.activityStates, [action.state.activityId]: action.state },
      }
    case 'activity/states': {
      const next: Record<string, ActivityState> = { ...state.activityStates }
      for (const activityState of action.states) next[activityState.activityId] = activityState
      return { ...state, activityStates: next }
    }
    case 'learning/updated':
      return {
        ...state,
        ...(action.mastery !== undefined ? { mastery: action.mastery } : {}),
        ...(action.review !== undefined ? { review: action.review } : {}),
      }
    case 'chat/stream-event':
      return applyChatStreamEvent(state, action.event)
    case 'chat/cancel-requested':
      return {
        ...state,
        chat: { ...state.chat, status: 'stopping' },
      }
    case 'chat/local-error':
      return {
        ...state,
        chat: { ...state.chat, status: 'idle', error: action.error },
      }
    case 'chat/reset':
      return { ...state, chat: { status: 'idle', text: '', evidence: [] } }
    case 'tasks/loaded':
      return { ...state, tasks: action.tasks }
    case 'environments/loaded':
      return { ...state, environments: action.environments }
    case 'draft/loaded':
      return { ...state, ...(action.draft !== undefined ? { courseDraft: action.draft } : {}) }
    case 'ui/tab':
      return { ...state, selectedTab: action.tab }
    case 'ui/select-activity':
      return { ...state, selectedActivityId: action.activityId, selectedTab: 'activity' }
    case 'ui/select-source':
      return { ...state, selectedSourceDocumentId: action.documentId, selectedTab: 'sources' }
    case 'notice':
      return { ...state, notice: action.notice }
    case 'busy':
      return { ...state, busy: action.label }
    case 'error/clear':
      return { ...state, chat: { ...state.chat, error: undefined } }
    default:
      return state
  }
}

/** Course progress derived from covered concepts against the active revision. */
export interface CourseProgress {
  readonly covered: number
  readonly total: number
  readonly percent: number
}

/** Compute progress for the selected course/session. */
export function computeCourseProgress(state: {
  readonly courseDetail?: WorkspaceState['courseDetail']
  readonly session?: WorkspaceState['session']
  readonly mastery?: readonly MasteryRecord[]
}): CourseProgress {
  const revision = state.courseDetail?.activeRevision ?? state.courseDetail?.draftRevision
  const total = revision?.concepts.length ?? 0
  const coveredIds = new Set(state.session?.session.coveredConceptIds ?? [])
  const masteryIds = new Set((state.mastery ?? []).filter(record => record.level !== 'unseen').map(record => record.conceptId))
  const covered = revision === undefined
    ? 0
    : revision.concepts.filter(concept => coveredIds.has(concept.id) || masteryIds.has(concept.id)).length
  return { covered, total, percent: total === 0 ? 0 : Math.round((covered / total) * 100) }
}

/** Review suggestions ordered by due date (earliest first). */
export function sortedReview(review: readonly ReviewItem[]): readonly ReviewItem[] {
  return [...review].sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

/** True while a teaching turn is being generated. */
export function isChatBusy(state: WorkspaceState): boolean {
  return state.chat.status === 'streaming' || state.chat.status === 'stopping'
}

/** The activity currently shown in the persistent area. */
export function selectedActivity(state: WorkspaceState): LessonActivity | undefined {
  return state.activities.find(activity => activity.id === state.selectedActivityId)
}
