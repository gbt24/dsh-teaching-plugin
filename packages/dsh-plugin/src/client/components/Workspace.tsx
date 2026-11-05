/**
 * The teaching workspace: the whole client-side orchestration.
 *
 * The Host is the only authority for persisted state. This component loads
 * bootstrap/course/session data, streams one chat turn at a time (SSE), mounts
 * the persistent activity through the shared renderer, persists student edits
 * through `/activity.state`, submits attempts and restores the same view after a
 * refresh by reading `sessions.get` again.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ActivityState, AppError, ChatStreamEvent, CourseDetail, CourseDraftView, CourseSummary,
  EvidenceReference, LanguagePreference, LessonActivity, MasteryRecord, ReviewItem, SessionSummary,
  SourceAnchor, SourceView, TaskSnapshot,
} from '@deepseek-teaching/core/contracts'
import type { CodeRunResultView } from '@deepseek-teaching/core/render'
import {
  apiChatSend, apiGet, apiPost, consumeChatStreamResponse, describeError, isNetworkError, toAppError,
} from '../api.ts'
import {
  INITIAL_WORKSPACE_STATE, computeCourseProgress, draftConceptCount, isChatBusy, needsCourseSetup,
  selectedActivity, sortedReview, workspaceReducer, type WorkspaceNotice,
} from '../state.ts'
import { Banner, ErrorBanner, Spinner } from './Banner.tsx'
import { ChatPanel, QUICK_ACTION_PROMPTS, type QuickAction } from './ChatPanel.tsx'
import { Onboarding, type WizardResult } from './Onboarding.tsx'
import type { DraftConfirmEdits } from '../draft-edits.ts'
import { CourseSetupCard } from './CourseSetupCard.tsx'
import { Sidebar } from './Sidebar.tsx'
import { TeachingArea } from './TeachingArea.tsx'
import { TopBar } from './TopBar.tsx'
import type { MountedActivityState } from '@deepseek-teaching/core/render'

/** Extract the student-facing prompt of an activity for attempt records. */
export function activityPrompt(activity: LessonActivity): string {
  const payload = activity.payload
  switch (payload.type) {
    case 'quiz': return payload.question
    case 'proof-task': return payload.claim
    case 'open-question': return payload.prompt
    case 'reading-task': return payload.instructions
    case 'code-run': return payload.instructions ?? activity.title
    case 'derivation': return payload.claim ?? activity.title
    case 'explanation': return payload.title ?? activity.title
    case 'experiment-note': return payload.title
    case 'graph':
    case 'figure': return payload.title ?? activity.title
    default: return activity.title
  }
}

/** Help exposure the student has seen for one activity (client-side only). */
interface HelpState {
  level: 0 | 1 | 2 | 3 | 'full-answer'
  hintsSeen: string[]
  answer?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** The central teaching page registered under the `main` slot. */
export function TeachingWorkspace(props: {
  /** Harness directory chooser (native Desktop dialog / Host OS chooser). */
  readonly pickDirectory?: () => Promise<string | null>
} = {}): React.ReactElement {
  const [state, dispatch] = React.useReducer(workspaceReducer, INITIAL_WORKSPACE_STATE)
  const stateRef = useRef(state)
  stateRef.current = state
  const streamAbort = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const helpByActivity = useRef<Record<string, HelpState>>({})
  /** Client-generated run ids of in-flight code runs (for cancel before response). */
  const activeRuns = useRef<Record<string, { activityId: string }>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  const [deleteTarget, setDeleteTarget] = useState<{ readonly id: string; readonly title: string } | undefined>(undefined)
  /** Pending activity deletion awaiting the shared confirm modal. */
  const [activityDeleteTarget, setActivityDeleteTarget] = useState<LessonActivity | undefined>(undefined)
  const [deleteActivityBusy, setDeleteActivityBusy] = useState(false)
  const [goalsEditor, setGoalsEditor] = useState<{ readonly courseId: string; readonly goals: string; readonly background: string } | undefined>(undefined)
  const [savingGoals, setSavingGoals] = useState(false)
  const [deleteSources, setDeleteSources] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  /** Draft/confirm/adhoc flow of the workspace "structure pending" card. */
  const [setup, setSetup] = useState<{
    phase: 'ready' | 'loading' | 'draft' | 'error'
    draft?: CourseDraftView
    error?: string
    busy?: boolean
  }>({ phase: 'ready' })

  useEffect(() => {
    mounted.current = true
    const update = (): void => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    void bootstrap()
    return () => {
      mounted.current = false
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      if (pollTimer.current !== undefined) clearTimeout(pollTimer.current)
      for (const timer of Object.values(saveTimers.current)) clearTimeout(timer)
      streamAbort.current?.abort()
    }
    // Bootstrap runs once for the panel lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A different course restarts the structure-pending flow.
  useEffect(() => {
    setSetup({ phase: 'ready' })
  }, [state.courseDetail?.course.id])

  // Reload the notes box when the selected activity changes.
  useEffect(() => {
    const activityId = state.selectedActivityId
    if (activityId === undefined) {
      setNotesDraft('')
      return
    }
    setNotesDraft(state.activityStates[activityId]?.notes ?? '')
    // Only selection/session changes reset the editor; live state saves must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedActivityId, state.session?.session.id])

  const notify = useCallback((notice: WorkspaceNotice | undefined): void => {
    dispatch({ type: 'notice', notice })
  }, [])

  // ---- loading ---------------------------------------------------------

  const bootstrap = useCallback(async (): Promise<void> => {
    dispatch({ type: 'workspace/loading' })
    try {
      const bootstrapInfo = await apiGet('bootstrap')
      const { courses } = await apiGet('courses.list')
      if (!mounted.current) return
      dispatch({ type: 'bootstrap/loaded', bootstrap: bootstrapInfo, courses })
      const firstCourse = courses[0]
      if (firstCourse !== undefined) {
        await selectCourse(firstCourse.course.id)
      }
    } catch (error) {
      if (mounted.current) dispatch({ type: 'bootstrap/failed', error: toAppError(error) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectCourse = useCallback(async (courseId: string): Promise<void> => {
    try {
      const [detail, sessionsResponse] = await Promise.all([
        apiGet('courses.get', { courseId: courseId as never }),
        apiGet('sessions.list', { courseId: courseId as never }),
      ])
      if (!mounted.current) return
      dispatch({ type: 'course/loaded', detail, sessions: sessionsResponse.sessions })
      if (sessionsResponse.sessions.length > 0) {
        await selectSession(sessionsResponse.sessions[0]?.id as string)
      } else {
        await createSession(courseId)
      }
      void loadTasks()
    } catch (error) {
      notify({ kind: 'error', message: `加载课程失败：${describeError(error)}`, ...(error instanceof Error ? {} : {}) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify])
  /** Delete one course after explicit confirmation (student data control). */
  const confirmDeleteCourse = useCallback(async (): Promise<void> => {
    if (deleteTarget === undefined) return
    setDeleting(true)
    try {
      const result = await apiPost('courses.delete', {
        courseId: deleteTarget.id as never,
        deleteSources,
      })
      const { courses } = await apiGet('courses.list')
      dispatch({ type: 'courses/loaded', courses })
      const wasActive = state.courseDetail?.course.id === deleteTarget.id
      if (wasActive) {
        dispatch({ type: 'course/cleared' })
        dispatch({ type: 'session/cleared' })
        const next = courses[0]
        if (next !== undefined) await selectCourse(next.course.id)
      }
      const details = result.details
      notify({
        kind: 'info',
        message: `已删除课程「${deleteTarget.title}」${details === undefined
          ? ''
          : `（会话 ${details.sessions}、活动 ${details.activities}、解除资料关联 ${details.sourcesDetached}、删除解析记录 ${details.sourcesDeleted}；原文件未改动）`}。`,
      })
      setDeleteTarget(undefined)
      setDeleteSources(false)
    } catch (error) {
      notify({ kind: 'error', message: `删除课程失败：${describeError(error)}` })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, deleteSources, state.courseDetail, selectCourse, notify])


  /** Load the latest persisted run per activity for the experiments tab. */
  const loadLatestRuns = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const { runs } = await apiGet('runs.latest', { sessionId: sessionId as never })
      // Ignore late responses after the student switched sessions again.
      if (mounted.current && stateRef.current.session?.session.id === sessionId) {
        dispatch({ type: 'runs/loaded', runs })
      }
    } catch {
      // Runs are supplementary: a failure must not block the teaching session.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const view = await apiGet('sessions.get', { sessionId: sessionId as never })
      if (!mounted.current) return
      dispatch({ type: 'session/loaded', session: view })
      void loadLatestRuns(sessionId)
    } catch (error) {
      notify({ kind: 'error', message: `恢复学习会话失败：${describeError(error)}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify, loadLatestRuns])

  const createSession = useCallback(async (courseId: string): Promise<void> => {
    try {
      await apiPost('sessions.create', { courseId: courseId as never })
      const { sessions } = await apiGet('sessions.list', { courseId: courseId as never })
      if (!mounted.current) return
      dispatch({ type: 'sessions/loaded', sessions })
      const newest = sessions[0]
      if (newest !== undefined) await selectSession(newest.id)
    } catch (error) {
      notify({ kind: 'error', message: `创建学习会话失败：${describeError(error)}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify])

  // ---- tasks -----------------------------------------------------------

  const loadTasks = useCallback(async (): Promise<readonly TaskSnapshot[]> => {
    try {
      const { tasks } = await apiGet('tasks.list')
      if (!mounted.current) return tasks
      dispatch({ type: 'tasks/loaded', tasks })
      const running = tasks.some(task => task.status === 'running' || task.status === 'queued')
      if (running && pollTimer.current === undefined) {
        pollTimer.current = setTimeout(() => {
          pollTimer.current = undefined
          void loadTasks()
        }, 1_500)
      }
      return tasks
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Poll one task until it settles (bounded: no infinite retry). */
  const awaitTask = useCallback(async (taskId: string, timeoutMs = 120_000): Promise<TaskSnapshot | undefined> => {
    const started = Date.now()
    for (;;) {
      if (!mounted.current || Date.now() - started > timeoutMs) return undefined
      try {
        const { task } = await apiGet('tasks.get', { taskId })
        if (task.status !== 'running' && task.status !== 'queued') return task
      } catch {
        return undefined
      }
      await sleep(800)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancelTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      await apiPost('tasks.cancel', { taskId })
      await loadTasks()
      notify({ kind: 'info', message: '已请求取消任务。' })
    } catch (error) {
      notify({ kind: 'error', message: `取消失败：${describeError(error)}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, notify])

  // ---- chat ------------------------------------------------------------

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    const current = stateRef.current
    if (current.session === undefined) {
      notify({ kind: 'warning', message: '还没有学习会话：请先建立课程或新建会话。' })
      return
    }
    if (isChatBusy(current)) return
    const sessionId = current.session.session.id
    if (!online) {
      notify({ kind: 'warning', message: '当前离线：已保留对话与教学区域内容，恢复连接后可继续提问。' })
      return
    }
    const controller = new AbortController()
    streamAbort.current = controller
    try {
      const response = await apiChatSend(sessionId, text, controller.signal)
      await consumeChatStreamResponse(response, {
        onEvent: (event: ChatStreamEvent) => {
          if (!mounted.current) return
          dispatch({ type: 'chat/stream-event', event })
          if (event.type === 'done') {
            // Session position/stage changed on the Host; refresh the session in
            // the background so a reload and the sidebar agree, without blocking.
            void refreshLearning(sessionId)
          }
        },
        onProtocolError: failure => dispatch({ type: 'chat/local-error', error: failure.appError }),
      })
    } catch (error) {
      if (!mounted.current) return
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        dispatch({
          type: 'chat/stream-event',
          event: { type: 'error', error: { code: 'cancelled', message: '已停止生成' } },
        })
      } else {
        dispatch({ type: 'chat/local-error', error: toAppError(error) })
        if (isNetworkError(error)) notify({ kind: 'warning', message: '与 Host 的连接中断：已保留现有内容，恢复后可重试。' })
      }
    } finally {
      streamAbort.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, notify])

  const refreshLearning = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const view = await apiGet('sessions.get', { sessionId: sessionId as never })
      if (!mounted.current) return
      // Keep the just-streamed turn: merge only learning/position data.
      dispatch({ type: 'learning/updated', mastery: view.mastery, review: view.review })
    } catch { /* non-fatal */ }
  }, [])

  const stopGeneration = useCallback(async (): Promise<void> => {
    const session = stateRef.current.session
    if (session === undefined) return
    dispatch({ type: 'chat/cancel-requested' })
    try {
      await apiPost('chat.cancel', { sessionId: session.session.id })
    } catch (error) {
      streamAbort.current?.abort()
      dispatch({ type: 'chat/local-error', error: toAppError(error) })
    }
  }, [])

  const retryLast = useCallback((): void => {
    const messages = stateRef.current.messages
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role === 'student') {
        dispatch({ type: 'error/clear' })
        void sendMessage(message.text)
        return
      }
    }
    notify({ kind: 'info', message: '没有可重试的学生提问。' })
  }, [sendMessage, notify])

  const quickAction = useCallback((action: QuickAction): void => {
    void sendMessage(QUICK_ACTION_PROMPTS[action])
  }, [sendMessage])

  // ---- activity state / attempts --------------------------------------

  const persistActivityState = useCallback((activity: LessonActivity, patch: MountedActivityState): void => {
    const previous = stateRef.current.activityStates[activity.id]
    const next: ActivityState = {
      activityId: activity.id,
      activityRevision: activity.revision,
      ...(patch.params !== undefined ? { params: patch.params } : {}),
      ...(previous?.params !== undefined && patch.params === undefined ? { params: previous.params } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : previous?.code !== undefined ? { code: previous.code } : {}),
      ...(patch.revealedStepIds !== undefined ? { revealedStepIds: patch.revealedStepIds } : previous?.revealedStepIds !== undefined ? { revealedStepIds: previous.revealedStepIds } : {}),
      ...(previous?.notes !== undefined ? { notes: previous.notes } : {}),
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'activity/state', state: next })
    const Send = (): void => {
      const body: Record<string, unknown> = {
        activityId: activity.id,
        activityRevision: activity.revision,
      }
      if (next.params !== undefined) body.params = next.params
      if (next.code !== undefined) body.code = next.code
      if (next.revealedStepIds !== undefined) body.revealedStepIds = next.revealedStepIds
      if (next.notes !== undefined) body.notes = next.notes
      apiPost('activity.state', body as never)
        .then((response) => {
          const persisted = (response as { state?: unknown }).state
          if (persisted !== undefined && mounted.current) {
            dispatch({ type: 'activity/state', state: persisted as ActivityState })
          }
        })
        .catch((error: unknown) => {
          notify({ kind: 'warning', message: `活动状态未保存：${describeError(error)}（本地仍可继续操作）` })
        })
    }
    // Parameter sliders fire continuously: debounce per activity.
    const existing = saveTimers.current[activity.id]
    if (existing !== undefined) clearTimeout(existing)
    saveTimers.current[activity.id] = setTimeout(() => {
      delete saveTimers.current[activity.id]
      Send()
    }, 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify])

  const onRunCode = useCallback(async (
    activity: LessonActivity,
    request: { clientRunId: string; code: string; language: string; dialect?: string; stdin?: string },
  ): Promise<CodeRunResultView> => {
    const clientRunId = request.clientRunId
    activeRuns.current[clientRunId] = { activityId: activity.id }
    try {
      const { run } = await apiPost('activity.run', {
        activityId: activity.id,
        activityRevision: activity.revision,
        code: request.code,
        // Addresses the in-flight run with /experiments.cancel; the Host uses it
        // as the real run id.
        clientRunId,
      })
      const view: CodeRunResultView = {
        runId: run.id,
        status: run.status,
        stdout: run.stdout,
        stderr: run.stderr,
        ...(run.exitCode !== undefined ? { exitCode: run.exitCode } : {}),
        ...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
        ...(run.checks !== undefined ? { checks: run.checks } : {}),
        verification: run.verification,
        ...(run.resourceNote !== undefined ? { resourceNote: run.resourceNote } : {}),
      }
      // Persisted run: the experiments tab and reloads read this map, not the
      // transient renderer output.
      if (mounted.current) dispatch({ type: 'runs/loaded', runs: [run] })
      return view
    } catch (error) {
      const view: CodeRunResultView = {
        status: 'failed',
        stdout: '',
        stderr: '',
        errorMessage: `运行未开始：${describeError(error)}`,
      }
      return view
    } finally {
      delete activeRuns.current[clientRunId]
    }
  }, [])

  const onCancelRun = useCallback((runId: string | undefined): void => {
    // The renderer passes the in-flight client id; fall back to the newest
    // active run when only the legacy `runId` is available.
    const target = runId ?? Object.keys(activeRuns.current)[0]
    if (target === undefined) {
      notify({ kind: 'info', message: '当前没有可取消的运行。' })
      return
    }
    notify({ kind: 'info', message: '正在停止运行…' })
    void apiPost('experiments.cancel', { runId: target })
      .then(({ run }) => {
        if (!mounted.current) return
        if (run.status === 'cancelled') {
          notify({ kind: 'info', message: '已取消运行；进程已结束，结果标记为 cancelled。' })
        } else if (run.status === 'running') {
          notify({ kind: 'info', message: '已请求取消，运行仍在收尾。' })
        } else {
          notify({ kind: 'info', message: `运行已结束：${run.status}` })
        }
      })
      .catch((error: unknown) => notify({ kind: 'warning', message: `取消运行失败：${describeError(error)}` }))
  }, [notify])

  /** Persist the current activity in `session.position` (null collapses it). */
  const applyActivityPosition = useCallback(async (activityId: string | null): Promise<boolean> => {
    const session = stateRef.current.session
    if (session === undefined) return false
    try {
      const { session: updated } = await apiPost('sessions.position', {
        sessionId: session.session.id,
        activityId: (activityId === null ? null : activityId) as never,
      })
      if (!mounted.current) return false
      dispatch({ type: 'session/position', session: updated })
      return true
    } catch (error) {
      notify({ kind: 'error', message: `更新当前活动失败：${describeError(error)}` })
      return false
    }
  }, [notify])

  /** Restore a historical activity as the current one. */
  const restoreActivity = useCallback((activityId: string): void => {
    void (async () => {
      if (await applyActivityPosition(activityId)) {
        dispatch({ type: 'ui/tab', tab: 'activity' })
        notify({ kind: 'info', message: '已恢复为当前活动；之后的教学追问会继续基于它。' })
      }
    })()
  }, [applyActivityPosition, notify])

  /** Collapse the current activity; it stays available in history. */
  const collapseActivity = useCallback((): void => {
    void (async () => {
      if (await applyActivityPosition(null)) {
        notify({ kind: 'info', message: '已收起当前活动；可在「历史活动」中恢复继续操作。' })
      }
    })()
  }, [applyActivityPosition, notify])

  const requestDeleteActivity = useCallback((activity: LessonActivity): void => {
    setActivityDeleteTarget(activity)
  }, [])

  const confirmDeleteActivity = useCallback(async (): Promise<void> => {
    const target = activityDeleteTarget
    if (target === undefined) return
    setDeleteActivityBusy(true)
    try {
      const result = await apiPost('activity.delete', {
        activityId: target.id,
        expectedRevision: target.revision,
      })
      if (!mounted.current) return
      dispatch({ type: 'activity/removed', activityId: target.id, positionCleared: result.positionCleared })
      setActivityDeleteTarget(undefined)
      notify({
        kind: 'info',
        message: `已删除活动「${target.title}」${result.removedRuns > 0 ? `及其 ${result.removedRuns} 条运行记录` : ''}。学习尝试与掌握记录保留，原始资料未被修改。`,
      })
    } catch (error) {
      notify({ kind: 'error', message: `删除活动失败：${describeError(error)}` })
    } finally {
      setDeleteActivityBusy(false)
    }
  }, [activityDeleteTarget, notify])

  /** Chat activity chips restore non-current activities before selecting. */
  const onChatActivityClick = useCallback((activityId: string): void => {
    if (activityId === stateRef.current.selectedActivityId) {
      dispatch({ type: 'ui/tab', tab: 'activity' })
      return
    }
    restoreActivity(activityId)
  }, [restoreActivity])

  const onHelpExposure = useCallback((activity: LessonActivity, help: {
    readonly level: 0 | 1 | 2 | 3 | 'full-answer'
    readonly hintsSeen?: readonly string[]
    readonly answer?: string
  }): void => {
    const previous = helpByActivity.current[activity.id]
    const merged: HelpState = {
      level: help.level,
      hintsSeen: [...new Set([...(previous?.hintsSeen ?? []), ...(help.hintsSeen ?? []), ...(help.answer !== undefined ? [help.answer] : [])])],
      ...(help.answer !== undefined ? { answer: help.answer } : previous?.answer !== undefined ? { answer: previous.answer } : {}),
    }
    helpByActivity.current[activity.id] = merged
    if (help.level === 'full-answer') {
      notify({ kind: 'info', message: '已展示完整答案：本次作答会如实记录为“看答案”，不计为独立完成。' })
    } else if (help.level >= 1) {
      notify({ kind: 'info', message: '已使用提示：本次作答会如实记录为“有提示”。' })
    }
  }, [notify])

  const submitAttempt = useCallback(async (
    activity: LessonActivity,
    data: { answerText: string; selectedOptionIds?: readonly string[]; runId?: string },
  ): Promise<void> => {
    const session = stateRef.current.session
    if (session === undefined) return
    const help = helpByActivity.current[activity.id]
    const level = help?.level ?? 0
    dispatch({ type: 'busy', label: '提交回答…' })
    try {
      const outcome = await apiPost('attempts.submit', {
        sessionId: session.session.id,
        activityId: activity.id,
        activityRevision: activity.revision,
        prompt: activityPrompt(activity),
        answerText: data.answerText,
        helpLevel: level,
        ...(help?.hintsSeen !== undefined && help.hintsSeen.length > 0 ? { hintsSeen: help.hintsSeen } : {}),
        answerRevealed: level === 'full-answer',
        ...(data.selectedOptionIds !== undefined ? { selectedOptionIds: data.selectedOptionIds } : {}),
        ...(data.runId !== undefined ? { runId: data.runId } : {}),
      })
      if (!mounted.current) return
      dispatch({ type: 'learning/updated', mastery: outcome.mastery, review: outcome.review })
      const note = outcome.independenceNote !== undefined
        ? `已记录尝试（${outcome.attempt.independence}）：${outcome.independenceNote}`
        : `已记录尝试（${outcome.attempt.independence}）${outcome.validation.passed === undefined ? '' : outcome.validation.passed ? '，客观检查通过' : '，客观检查未通过'}。`
      notify({ kind: 'info', message: note })
    } catch (error) {
      notify({ kind: 'error', message: `提交回答失败：${describeError(error)}` })
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
    }
  }, [notify])

  const onQuizSubmit = useCallback((activity: LessonActivity, selected: readonly string[]): void => {
    const payload = activity.payload
    const labels = payload.type === 'quiz'
      ? selected.map(id => payload.options.find(option => option.id === id)?.label ?? id)
      : selected
    void submitAttempt(activity, { answerText: labels.join('；'), selectedOptionIds: selected })
  }, [submitAttempt])

  const onAnswerSubmit = useCallback((activity: LessonActivity, answerText: string): void => {
    void submitAttempt(activity, { answerText })
  }, [submitAttempt])

  const saveNotes = useCallback((): void => {
    const activity = selectedActivity(stateRef.current)
    if (activity === undefined) {
      notify({ kind: 'warning', message: '请先选择一个活动再保存笔记。' })
      return
    }
    const next: ActivityState = {
      activityId: activity.id,
      activityRevision: activity.revision,
      ...(stateRef.current.activityStates[activity.id]?.params !== undefined
        ? { params: stateRef.current.activityStates[activity.id]?.params }
        : {}),
      ...(stateRef.current.activityStates[activity.id]?.code !== undefined
        ? { code: stateRef.current.activityStates[activity.id]?.code }
        : {}),
      ...(stateRef.current.activityStates[activity.id]?.revealedStepIds !== undefined
        ? { revealedStepIds: stateRef.current.activityStates[activity.id]?.revealedStepIds }
        : {}),
      notes: notesDraft,
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'activity/state', state: next })
    void apiPost('activity.state', {
      activityId: activity.id,
      activityRevision: activity.revision,
      ...(next.params !== undefined ? { params: next.params } : {}),
      ...(next.code !== undefined ? { code: next.code } : {}),
      ...(next.revealedStepIds !== undefined ? { revealedStepIds: next.revealedStepIds } : {}),
      notes: notesDraft,
    }).then((response) => {
      if (mounted.current) dispatch({ type: 'activity/state', state: (response as { state: ActivityState }).state })
      notify({ kind: 'info', message: '笔记已保存到本机 Host。' })
    }).catch((error: unknown) => {
      notify({ kind: 'error', message: `笔记保存失败：${describeError(error)}` })
    })
  }, [notesDraft, notify])

  // ---- sources / environments / language -------------------------------

  const loadSource = useCallback(async (documentId: string, offset?: number, limit?: number): Promise<SourceView> => {
    return await apiGet('sources.get', {
      documentId,
      ...(offset !== undefined ? { offset } : {}),
      ...(limit !== undefined ? { limit } : {}),
    })
  }, [])

  const refreshSource = useCallback(async (documentId: string): Promise<void> => {
    try {
      const { task } = await apiPost('sources.refresh', { documentId })
      notify({ kind: 'info', message: `正在检查资料变化：${task.snapshot.label}` })
      void loadTasks()
      const settled = awaitTask(task.id)
      const snapshot = await settled
      if (snapshot?.status === 'completed') notify({ kind: 'info', message: '资料检查完成；结构变化会显示待确认提示。' })
      else if (snapshot?.status === 'failed') notify({ kind: 'error', message: `资料检查失败：${snapshot.error?.message ?? '未知原因'}` })
      void bootstrap()
    } catch (error) {
      notify({ kind: 'error', message: `资料刷新失败：${describeError(error)}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify, loadTasks, awaitTask])

  const loadEnvironments = useCallback((): void => {
    void apiGet('environments.list')
      .then((environments) => { if (mounted.current) dispatch({ type: 'environments/loaded', environments }) })
      .catch((error: unknown) => notify({ kind: 'warning', message: `环境清单加载失败：${describeError(error)}` }))
  }, [notify])

  const switchLanguage = useCallback((language: LanguagePreference): void => {
    dispatch({ type: 'busy', label: '保存语言偏好…' })
    void apiPost('profile.set', { patch: { language } })
      .then(() => {
        if (!mounted.current) return
        notify({ kind: 'info', message: `已切换讲解语言：${language === 'zh' ? '中文' : language === 'en' ? 'English' : '中英双语'}。` })
        void bootstrap()
      })
      .catch((error: unknown) => notify({ kind: 'error', message: `语言偏好保存失败：${describeError(error)}` }))
      .finally(() => { if (mounted.current) dispatch({ type: 'busy', label: undefined }) })
  }, [notify, bootstrap])

  const openSource = useCallback((documentId: string | undefined): void => {
    if (documentId === undefined) {
      notify({ kind: 'info', message: '这条来源没有本地原文位置（可能是模型补充或外部网页）。' })
      return
    }
    dispatch({ type: 'ui/select-source', documentId })
  }, [notify])

  const onEvidenceClick = useCallback((reference: EvidenceReference): void => {
    if (reference.anchor !== undefined) {
      dispatch({ type: 'ui/select-source', documentId: reference.anchor.documentId })
      dispatch({ type: 'ui/tab', tab: 'sources' })
      return
    }
    if (reference.url !== undefined) {
      window.open(reference.url, '_blank', 'noopener,noreferrer')
      return
    }
    notify({ kind: 'info', message: `该来源类型：${reference.kind}${reference.note !== undefined ? `（${reference.note}）` : ''}` })
  }, [notify])

  const onAnchorClick = useCallback((anchor: SourceAnchor): void => {
    dispatch({ type: 'ui/select-source', documentId: anchor.documentId })
    dispatch({ type: 'ui/tab', tab: 'sources' })
  }, [])


  /** Open the goals editor for the active course. */
  const openGoalsEditor = useCallback((): void => {
    const current = state.courseDetail
    if (current === undefined) return
    const revision = current.activeRevision ?? current.draftRevision
    setGoalsEditor({
      courseId: current.course.id,
      goals: (revision?.goals ?? []).join('\n'),
      background: revision?.background ?? '',
    })
  }, [state.courseDetail])

  /** Persist student-edited learning goals as a new course revision. */
  const saveGoals = useCallback(async (): Promise<void> => {
    if (goalsEditor === undefined) return
    const goals = goalsEditor.goals.split('\n').map(line => line.trim()).filter(line => line !== '')
    if (goals.length === 0) {
      notify({ kind: 'warning', message: '请至少保留一个学习目标。' })
      return
    }
    setSavingGoals(true)
    try {
      await apiPost('courseGoals.update', {
        courseId: goalsEditor.courseId as never,
        goals,
        ...(goalsEditor.background.trim() === '' ? {} : { background: goalsEditor.background.trim() }),
      })
      const [detail, sessionsResponse] = await Promise.all([
        apiGet('courses.get', { courseId: goalsEditor.courseId as never }),
        apiGet('sessions.list', { courseId: goalsEditor.courseId as never }),
      ])
      dispatch({ type: 'course/loaded', detail, sessions: sessionsResponse.sessions })
      notify({ kind: 'info', message: '学习目标已更新；已有学习会话保持不变，新会话使用更新后的目标。' })
      setGoalsEditor(undefined)
    } catch (error) {
      notify({ kind: 'error', message: `更新学习目标失败：${describeError(error)}` })
    } finally {
      setSavingGoals(false)
    }
  }, [goalsEditor, notify])

  // ---- onboarding ------------------------------------------------------

  const createCourse = useCallback(async (input: {
    title: string
    description?: string
    goals?: readonly string[]
    language?: 'zh' | 'en' | 'bilingual'
  }): Promise<string | undefined> => {
    dispatch({ type: 'busy', label: '建立课程…' })
    try {
      const { course } = await apiPost('courses.create', input)
      const { courses } = await apiGet('courses.list')
      if (mounted.current) dispatch({ type: 'courses/loaded', courses })
      return course.id
    } catch (error) {
      notify({ kind: 'error', message: `建立课程失败：${describeError(error)}` })
      return undefined
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
    }
  }, [notify])

  /** Reload a course and its session list after a structural change. */
  const refreshCourse = useCallback(async (courseId: string): Promise<{
    detail?: CourseDetail
    sessions: readonly SessionSummary[]
  }> => {
    const [detail, sessionsResponse] = await Promise.all([
      apiGet('courses.get', { courseId: courseId as never }),
      apiGet('sessions.list', { courseId: courseId as never }),
    ])
    if (mounted.current) {
      dispatch({ type: 'course/loaded', detail, sessions: sessionsResponse.sessions })
      dispatch({ type: 'sessions/loaded', sessions: sessionsResponse.sessions })
    }
    return { detail, sessions: sessionsResponse.sessions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importPaths = useCallback(async (courseId: string, paths: readonly string[]): Promise<WizardResult> => {
    dispatch({ type: 'busy', label: '开始导入资料…' })
    try {
      const { task } = await apiPost('sources.import', { courseId: courseId as never, paths })
      notify({ kind: 'info', message: `已开始导入：${task.snapshot.label}` })
      void loadTasks()
      const snapshot = await awaitTask(task.id)
      if (snapshot?.status === 'partial') {
        return { ok: false, error: `资料部分导入：${(snapshot.warnings ?? []).join('；') || '部分文件失败，详见任务详情。'}` }
      }
      if (snapshot?.status === 'failed') {
        return { ok: false, error: `资料导入失败：${snapshot.error?.message ?? '未知原因'}` }
      }
      if (snapshot === undefined) return { ok: false, error: '导入任务未在限定时间内完成，请稍后刷新任务状态重试。' }
      notify({ kind: 'info', message: '资料导入完成，可以生成课程草案。' })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: `导入失败：${describeError(error)}` }
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
      void loadTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, awaitTask, notify])

  const generateDraft = useCallback(async (courseId: string): Promise<WizardResult> => {
    dispatch({ type: 'busy', label: '生成课程结构草案…' })
    try {
      const { task } = await apiPost('courseDraft.generate', { courseId: courseId as never })
      void loadTasks()
      const snapshot = await awaitTask(task.id)
      if (snapshot === undefined) {
        return { ok: false, error: '草案生成任务没有在限定时间内完成（未获取到任务状态）。' }
      }
      if (snapshot.status === 'failed') {
        return { ok: false, error: `课程草案生成失败：${snapshot.error?.message ?? '未知原因'}` }
      }
      if (snapshot.status === 'cancelled') return { ok: false, error: '课程草案生成已取消。' }
      const { draft } = await apiGet('courseDraft.get', { courseId: courseId as never })
      if (!mounted.current) return { ok: false, error: '界面已关闭' }
      if (draft === undefined) {
        return { ok: false, error: '草案尚未生成：请确认资料已导入成功，或返回补充资料后重试。' }
      }
      dispatch({ type: 'draft/loaded', draft })
      return { ok: true, draft }
    } catch (error) {
      return { ok: false, error: `课程草案生成失败：${describeError(error)}` }
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
      void loadTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, awaitTask])

  const confirmDraft = useCallback(async (
    courseId: string,
    revisionId: string,
    edits?: DraftConfirmEdits,
  ): Promise<WizardResult> => {
    if (revisionId === '') return { ok: false, error: '草案版本无效，请重新生成草案。' }
    dispatch({ type: 'busy', label: '确认课程结构…' })
    try {
      await apiPost('courseDraft.confirm', {
        courseId: courseId as never,
        revisionId,
        ...(edits === undefined ? {} : { edits }),
      })
      const { sessions } = await refreshCourse(courseId)
      const first = sessions[0]
      if (first !== undefined) await selectSession(first.id)
      else await createSession(courseId)
      notify({ kind: 'info', message: '课程结构已确认，开始系统学习。' })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: `确认课程结构失败：${describeError(error)}` }
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify, refreshCourse, selectSession, createSession])

  /** Ad-hoc path: the Host confirms a minimal structure, then a session opens. */
  const startAdhocSession = useCallback(async (courseId: string): Promise<WizardResult> => {
    dispatch({ type: 'busy', label: '创建随问随学会话…' })
    try {
      const { session } = await apiPost('sessions.create', {
        courseId: courseId as never,
        mode: 'adhoc',
      })
      await refreshCourse(courseId)
      await selectSession(session.id)
      notify({ kind: 'info', message: '已用「先随便问问」开始：结构是最小确认版本，之后仍可生成完整草案。' })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: `随问随学会话创建失败：${describeError(error)}` }
    } finally {
      if (mounted.current) dispatch({ type: 'busy', label: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify, refreshCourse, selectSession])

  // ---- workspace "structure pending" card handlers ---------------------

  const loadSetupDraft = useCallback(async (courseId: string): Promise<void> => {
    setSetup({ phase: 'loading' })
    try {
      const { draft } = await apiGet('courseDraft.get', { courseId: courseId as never })
      if (!mounted.current) return
      if (draft === undefined) {
        setSetup({ phase: 'error', error: '还没有可确认的草案：请先导入资料后生成草案，或直接「先随便问问」。' })
      } else {
        setSetup({ phase: 'draft', draft })
      }
    } catch (error) {
      if (mounted.current) setSetup({ phase: 'error', error: `读取课程草案失败：${describeError(error)}` })
    }
  }, [])

  const generateSetupDraft = useCallback(async (courseId: string): Promise<void> => {
    setSetup({ phase: 'loading' })
    const result = await generateDraft(courseId)
    if (!mounted.current) return
    if (result.ok && result.draft !== undefined) setSetup({ phase: 'draft', draft: result.draft })
    else setSetup({ phase: 'error', error: result.error ?? '课程草案生成失败' })
  }, [generateDraft])

  const confirmSetupDraft = useCallback(async (
    courseId: string,
    revisionId: string,
    edits?: DraftConfirmEdits,
  ): Promise<void> => {
    setSetup(previous => ({ ...previous, busy: true, error: undefined }))
    const result = await confirmDraft(courseId, revisionId, edits)
    if (!mounted.current) return
    setSetup(result.ok ? { phase: 'ready' } : previous => ({ ...previous, busy: false, error: result.error }))
  }, [confirmDraft])

  const adhocSetup = useCallback(async (courseId: string): Promise<void> => {
    setSetup(previous => ({ ...previous, busy: true, error: undefined }))
    const result = await startAdhocSession(courseId)
    if (!mounted.current) return
    setSetup(result.ok ? { phase: 'ready' } : previous => ({ ...previous, busy: false, error: result.error }))
  }, [startAdhocSession])

  // ---- derived ---------------------------------------------------------

  const detail = state.courseDetail
  const progress = computeCourseProgress({
    courseDetail: detail,
    session: state.session,
    mastery: state.mastery,
  })
  const goals = (detail?.activeRevision ?? detail?.draftRevision)?.goals ?? (
    state.bootstrap?.profile.goals !== undefined ? [state.bootstrap.profile.goals] : []
  )
  const language = state.bootstrap?.language ?? state.bootstrap?.profile.language ?? 'zh'
  const busy = state.busy !== undefined || isChatBusy(state)
  const draftForOnboarding: CourseDraftView | undefined = state.courseDraft

  const onboardingCallbacks = {
    ...(state.bootstrap !== undefined ? { bootstrap: state.bootstrap } : {}),
    ...(state.busy !== undefined ? { busy: state.busy } : {}),
    ...(state.notice?.kind === 'error'
      ? { error: { code: 'failed' as const, message: state.notice.message } }
      : {}),
    tasks: state.tasks,
    ...(draftForOnboarding !== undefined ? { draft: draftForOnboarding } : {}),
    onDismissError: () => notify(undefined),
    onCancelTask: (taskId: string) => { void cancelTask(taskId) },
    onCreateCourse: createCourse,
    onImportPaths: importPaths,
    onGenerateDraft: generateDraft,
    onConfirmDraft: confirmDraft,
    onStartAdhoc: startAdhocSession,
    ...(props.pickDirectory === undefined ? {} : { onPickDirectory: props.pickDirectory }),
  }

  return (
    <div className="ai-teaching-root">
      <TopBar
        {...(state.bootstrap !== undefined ? { bootstrap: state.bootstrap } : {})}
        {...(detail !== undefined ? { courseTitle: detail.course.title } : {})}
        goals={goals}
        language={language as LanguagePreference}
        offline={!online}
        busy={busy}
        tasks={state.tasks}
        onLanguage={switchLanguage}
        onCancelTask={taskId => { void cancelTask(taskId) }}
      />
      {state.notice !== undefined && (
        <Banner
          kind={state.notice.kind}
          message={state.notice.message}
          {...(state.notice.code !== undefined ? { details: state.notice.code } : {})}
          onDismiss={() => notify(undefined)}
        />
      )}
      {state.phase === 'fatal' && state.fatalError !== undefined && (
        <div style={{ padding: 20 }}>
          <ErrorBanner error={state.fatalError} onRetry={() => void bootstrap()} />
          <p className="ai-muted">
            无法连接教学 Host。请确认插件已启用、Harness 仍在运行；已完成的本地学习记录不会丢失。
          </p>
        </div>
      )}
      {state.phase === 'loading' && (
        <div style={{ padding: 24 }}><Spinner label="正在连接教学 Host…" /></div>
      )}
      {state.phase === 'onboarding' && (
        <Onboarding
          {...onboardingCallbacks}
          canCancel={state.courses.length > 0}
          onCancel={() => dispatch({ type: 'wizard/close' })}
        />
      )}
      {state.phase === 'ready' && needsCourseSetup(detail) && detail !== undefined && (
        <CourseSetupCard
          detail={detail}
          phase={setup.phase}
          {...(setup.draft !== undefined ? { draft: setup.draft } : {})}
          {...(setup.error !== undefined ? { error: setup.error } : {})}
          busy={busy || setup.busy === true}
          hasDraftConcepts={draftConceptCount(detail) > 0}
          onGenerate={() => { void generateSetupDraft(detail.course.id) }}
          onLoadDraft={() => { void loadSetupDraft(detail.course.id) }}
          onConfirm={(revisionId, edits) => { void confirmSetupDraft(detail.course.id, revisionId, edits) }}
          onAdhoc={() => { void adhocSetup(detail.course.id) }}
        />
      )}
      {state.phase === 'ready' && !needsCourseSetup(detail) && (
        <div className="ai-teaching-body">
          <Sidebar
            courses={state.courses}
            {...(detail !== undefined ? { courseDetail: detail } : {})}
            sessions={state.sessions}
            {...(state.session !== undefined ? { session: state.session } : {})}
            mastery={state.mastery}
            review={sortedReview(state.review)}
            progress={progress}
            busy={busy}
            onSelectCourse={courseId => { void selectCourse(courseId) }}
            onNewCourse={() => dispatch({ type: 'wizard/open' })}
            onDeleteCourse={(courseId, title) => {
              setDeleteSources(false)
              setDeleteTarget({ id: courseId, title })
            }}
            onEditGoals={openGoalsEditor}
            onSelectSession={sessionId => { void selectSession(sessionId) }}
            onNewSession={() => {
              const courseId = detail?.course.id
              if (courseId === undefined) {
                notify({ kind: 'warning', message: '请先建立课程。' })
                return
              }
              void createSession(courseId)
            }}
            onConceptClick={(concept) => {
              void sendMessage(`请从概念「${concept.title}」继续教学：先确认我的理解程度，再决定讲解或练习。`)
            }}
            onReviewConcept={(item: ReviewItem) => {
              const concept = (detail?.activeRevision ?? detail?.draftRevision)?.concepts.find(candidate => candidate.id === item.conceptId)
              void sendMessage(`请帮我复习「${concept?.title ?? '这个概念'}」：先做一个简短诊断，再按需给提示。`)
            }}
            onOpenSource={documentId => openSource(documentId)}
          />
          <div className="ai-teaching-main">
            <ChatPanel
              {...(detail !== undefined ? { courseTitle: detail.course.title } : {})}
              {...(state.session !== undefined ? { session: state.session } : {})}
              messages={state.messages}
              activities={state.activities}
              chat={state.chat}
              busy={busy}
              offline={!online}
              onSend={text => { void sendMessage(text) }}
              onStop={() => { void stopGeneration() }}
              onQuickAction={quickAction}
              onActivityClick={onChatActivityClick}
              onEvidenceClick={onEvidenceClick}
              onRetry={retryLast}
              onDismissError={() => dispatch({ type: 'error/clear' })}
            />
            <TeachingArea
              activities={state.activities}
              {...(state.selectedActivityId !== undefined ? { currentActivityId: state.selectedActivityId } : {})}
              {...(state.selectedSourceDocumentId !== undefined ? { selectedDocumentId: state.selectedSourceDocumentId } : {})}
              activityStates={state.activityStates}
              latestRuns={state.latestRuns}
              selectedTab={state.selectedTab}
              {...(detail !== undefined ? { courseDetail: detail } : {})}
              {...(state.session !== undefined ? { session: state.session } : {})}
              {...(state.environments !== undefined ? { environments: state.environments } : {})}
              notes={notesDraft}
              busy={busy}
              onSelectTab={tab => {
                dispatch({ type: 'ui/tab', tab })
                if (tab === 'experiments' && state.environments === undefined) loadEnvironments()
              }}
              onRestoreActivity={restoreActivity}
              onCollapseActivity={collapseActivity}
              onRequestDeleteActivity={requestDeleteActivity}
              onStateChange={persistActivityState}
              onRunCode={onRunCode}
              onCancelRun={onCancelRun}
              onQuizSubmit={onQuizSubmit}
              onAnswerSubmit={onAnswerSubmit}
              onHelpExposure={onHelpExposure}
              onAnchorClick={onAnchorClick}
              onOpenSource={documentId => openSource(documentId)}
              onRefreshSource={documentId => { void refreshSource(documentId) }}
              loadSource={loadSource}
              onLoadEnvironments={loadEnvironments}
              onNotesChange={setNotesDraft}
              onSaveNotes={saveNotes}
              onEvidenceClick={onEvidenceClick}
            />
          </div>
        </div>
      )}
      {goalsEditor !== undefined && (
        <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-label="编辑学习目标">
          <div className="ai-modal">
            <h3>编辑学习目标</h3>
            <p className="ai-muted" style={{ margin: '0 0 8px' }}>
              每行一个目标。更新会生成新的课程结构修订；已有学习会话仍绑定原修订，新会话使用新目标。
            </p>
            <textarea
              aria-label="学习目标（每行一个）"
              rows={5}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13 }}
              value={goalsEditor.goals}
              onChange={event => setGoalsEditor({ ...goalsEditor, goals: event.target.value })}
            />
            <label className="ai-muted" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>我的基础/背景（可选）</label>
            <textarea
              aria-label="学习基础与背景"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13 }}
              value={goalsEditor.background}
              onChange={event => setGoalsEditor({ ...goalsEditor, background: event.target.value })}
            />
            <div className="ai-modal-actions">
              <button type="button" className="ai-small-button" disabled={savingGoals} onClick={() => setGoalsEditor(undefined)}>取消</button>
              <button type="button" className="ai-primary-button" disabled={savingGoals} onClick={() => void saveGoals()}>
                {savingGoals ? '保存中…' : '保存目标'}
              </button>
            </div>
          </div>
        </div>
      )}
      {activityDeleteTarget !== undefined && (
        <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-label="删除活动确认">
          <div className="ai-modal">
            <h3>删除活动「{activityDeleteTarget.title}」？</h3>
            <p className="ai-muted" style={{ margin: '0 0 10px' }}>
              将删除该活动的定义与编辑状态{activityDeleteTarget.kind === 'code-run' ? '、运行记录' : ''}。
              <strong>学习尝试与掌握记录保留，你的原始资料文件不会被修改。</strong>
            </p>
            <div className="ai-modal-actions">
              <button
                type="button"
                className="ai-small-button"
                disabled={deleteActivityBusy}
                onClick={() => setActivityDeleteTarget(undefined)}
              >
                取消
              </button>
              <button
                type="button"
                className="ai-danger-button"
                disabled={deleteActivityBusy}
                onClick={() => { void confirmDeleteActivity() }}
              >
                {deleteActivityBusy ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget !== undefined && (
        <div className="ai-modal-overlay" role="dialog" aria-modal="true" aria-label="删除课程确认">
          <div className="ai-modal">
            <h3>删除课程「{deleteTarget.title}」？</h3>
            <p className="ai-muted" style={{ margin: '0 0 10px' }}>
              将删除该课程的课程结构、全部学习会话、活动、学习记录（尝试/掌握/复习/笔记）。<strong>你的原始资料文件不会被修改。</strong>
            </p>
            <label className="ai-row" style={{ alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={deleteSources}
                onChange={event => setDeleteSources(event.target.checked)}
              />
              同时删除该课程导入的资料解析记录（仅限未被其他课程使用；原文件不受影响）
            </label>
            <div className="ai-modal-actions">
              <button
                type="button"
                className="ai-small-button"
                disabled={deleting}
                onClick={() => { setDeleteTarget(undefined); setDeleteSources(false) }}
              >
                取消
              </button>
              <button
                type="button"
                className="ai-danger-button"
                disabled={deleting}
                onClick={() => void confirmDeleteCourse()}
              >
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Expose the AppError type for the entry's error boundary. */
export type { AppError, CourseSummary, MasteryRecord, TaskSnapshot }
