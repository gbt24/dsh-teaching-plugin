/**
 * Persistent teaching area: the current activity (exactly
 * `session.position.activityId`), the collapsed history of completed
 * activities, the experiment/run view and notes.
 *
 * The activity body is rendered by the shared vanilla renderer
 * (`@deepseek-teaching/core/render`) so the in-app view and the offline export
 * share one implementation; the React components here own the navigation
 * (current vs history) and Host persistence only.
 */
import React, { useEffect, useRef, useState } from 'react'
import type {
  ActivityState, CodeRunPayload, CodeRunResultView, CourseDetail, EnvironmentDirectory,
  EvidenceReference, ExperimentRun, LessonActivity, MountedActivityState, SessionView,
  SourceAnchor, SourceView,
} from './activity-types.ts'
import {
  mountActivity, validateActivityPayload,
} from '@deepseek-teaching/core/render'
import type { TeachingTab } from '../state.ts'
import { formatDay, formatTime, truncate } from '../helpers.ts'
import { isGraphicalActivityKind } from '../activity-kinds.ts'
import { Spinner } from './Banner.tsx'

/** Callback bundle the area hands to the vanilla renderer. */
export interface ActivityInteractionCallbacks {
  readonly onStateChange: (activity: LessonActivity, patch: MountedActivityState) => void
  readonly onRunCode: (activity: LessonActivity, request: {
    readonly clientRunId: string
    readonly code: string
    readonly language: string
    readonly dialect?: string
    readonly stdin?: string
  }) => Promise<CodeRunResultView>
  readonly onCancelRun: (runId: string | undefined) => void
  readonly onQuizSubmit: (activity: LessonActivity, selected: readonly string[]) => void
  readonly onAnswerSubmit: (activity: LessonActivity, answerText: string) => void
  readonly onHelpExposure: (activity: LessonActivity, help: {
    readonly level: 0 | 1 | 2 | 3 | 'full-answer'
    readonly hintsSeen?: readonly string[]
    readonly answer?: string
  }) => void
  readonly onAnchorClick: (anchor: SourceAnchor) => void
}

/** Props of the persistent teaching area. */
export interface TeachingAreaProps extends ActivityInteractionCallbacks {
  readonly activities: readonly LessonActivity[]
  /** The current activity: exactly `session.position.activityId`. */
  readonly currentActivityId?: string
  readonly selectedDocumentId?: string
  readonly activityStates: Readonly<Record<string, ActivityState>>
  /** Latest persisted run per activity id (`runs.latest`). */
  readonly latestRuns: Readonly<Record<string, ExperimentRun>>
  readonly selectedTab: TeachingTab
  readonly courseDetail?: CourseDetail
  readonly session?: SessionView
  readonly environments?: EnvironmentDirectory
  readonly notes: string
  readonly busy: boolean
  readonly onSelectTab: (tab: TeachingTab) => void
  /** Restore a historical activity as the current one (POST sessions.position). */
  readonly onRestoreActivity: (activityId: string) => void
  /** Collapse the current activity (POST sessions.position {activityId:null}). */
  readonly onCollapseActivity: () => void
  /** Ask the workspace to confirm + delete an activity. */
  readonly onRequestDeleteActivity: (activity: LessonActivity) => void
  readonly onOpenSource: (documentId: string) => void
  readonly onRefreshSource: (documentId: string) => void
  readonly loadSource: (documentId: string, offset?: number, limit?: number) => Promise<SourceView>
  readonly onLoadEnvironments: () => void
  readonly onNotesChange: (text: string) => void
  readonly onSaveNotes: () => void
  readonly onEvidenceClick: (reference: EvidenceReference) => void
}

/** Student-facing activity-kind labels. */
const KIND_LABELS: Readonly<Record<LessonActivity['kind'], string>> = {
  explanation: '讲解',
  'static-figure': '图',
  'interactive-graph': '交互图',
  animation: '动画',
  derivation: '推导',
  'code-run': '代码实验',
  quiz: '练习',
  'reading-task': '阅读任务',
  'proof-task': '证明任务',
  'open-question': '开放问题',
  'experiment-note': '实验记录',
  visual: '可视化',
}

/** Labels for persisted run states. */
const RUN_STATUS_LABELS: Readonly<Record<ExperimentRun['status'], string>> = {
  queued: '排队中',
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
  cancelled: '已取消',
  'timed-out': '超时',
}

/** Format the created time of a historical activity. */
function createdLabel(iso: string): string {
  return `${formatDay(iso)} ${formatTime(iso)}`
}

/** A collapsible section with a count; collapsed by default. */
function CollapsibleSection(props: {
  readonly title: string
  readonly count: number
  readonly defaultOpen?: boolean
  readonly children: React.ReactNode
}): React.ReactElement {
  const [open, setOpen] = useState(props.defaultOpen === true)
  return (
    <div className="ai-collapsible">
      <button
        type="button"
        className="ai-collapsible-head"
        aria-expanded={open}
        aria-label={`${props.title}（${props.count}）`}
        onClick={() => setOpen(!open)}
      >
        <span className="ai-collapsible-arrow" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span>{props.title}（{props.count}）</span>
      </button>
      {open && <div className="ai-collapsible-body">{props.children}</div>}
    </div>
  )
}

/** One persisted run: summary line + optionally expanded output. */
function RunSummary(props: {
  readonly run: ExperimentRun | undefined
  readonly expanded: boolean
  readonly onToggle?: () => void
  readonly emptyText?: string
}): React.ReactElement {
  const run = props.run
  if (run === undefined) {
    return <div className="ai-muted">{props.emptyText ?? '尚未运行。'}</div>
  }
  return (
    <div className="ai-run-summary">
      <div className="ai-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="ai-badge" data-run-status={run.status}>{RUN_STATUS_LABELS[run.status]}</span>
        {run.exitCode !== undefined ? <span className="ai-muted">退出码 {run.exitCode}</span> : null}
        {run.durationMs !== undefined ? <span className="ai-muted">{run.durationMs}ms</span> : null}
        <span className="ai-muted">校验：{run.verification}</span>
        {props.onToggle !== undefined && (
          <button type="button" className="ai-link-button" aria-expanded={props.expanded} onClick={props.onToggle}>
            {props.expanded ? '收起输出' : '展开输出'}
          </button>
        )}
      </div>
      {props.expanded && (
        <div style={{ marginTop: 4 }}>
          {run.stdout !== '' && (
            <>
              <div className="ai-muted">stdout</div>
              <pre className="ai-run-output">{run.stdout}</pre>
            </>
          )}
          {run.stderr !== '' && (
            <>
              <div className="ai-muted">stderr</div>
              <pre className="ai-run-output ai-run-output-error">{run.stderr}</pre>
            </>
          )}
          {run.stdout === '' && run.stderr === '' && <div className="ai-muted">（没有输出）</div>}
          <div className="ai-muted">运行 {run.id} · {formatTime(run.startedAt)}</div>
        </div>
      )}
    </div>
  )
}

/** React wrapper that owns one mount of the vanilla activity renderer. */
function ActivityView(props: {
  readonly activity: LessonActivity
  readonly state?: ActivityState
  readonly callbacks: ActivityInteractionCallbacks
}): React.ReactElement {
  const host = useRef<HTMLDivElement | null>(null)
  const callbacksRef = useRef(props.callbacks)
  callbacksRef.current = props.callbacks
  const stateRef = useRef(props.state)
  stateRef.current = props.state
  const { activity } = props
  useEffect(() => {
    const element = host.current
    if (element === null) return
    element.textContent = ''
    const validation = validateActivityPayload(activity.payload)
    if (!validation.ok) {
      const error = document.createElement('div')
      error.className = 'ai-banner'
      error.dataset.kind = 'error'
      error.textContent = `活动数据无法渲染：${validation.error.message}`
      element.appendChild(error)
      return
    }
    const mounted = mountActivity(element, {
      payload: validation.value,
      id: activity.id,
      revision: activity.revision,
      title: activity.title,
      goal: activity.goal,
      sourceRefs: activity.sourceRefs,
      verification: activity.verification,
    }, {
      ...(stateRef.current !== undefined ? { state: stateRef.current } : {}),
      callbacks: {
        onStateChange: patch => callbacksRef.current.onStateChange(activity, patch),
        onRunCode: request => callbacksRef.current.onRunCode(activity, request),
        onCancelRun: runId => callbacksRef.current.onCancelRun(runId),
        onQuizSubmit: selected => callbacksRef.current.onQuizSubmit(activity, selected),
        onAnswerSubmit: submission => callbacksRef.current.onAnswerSubmit(activity, submission.answerText),
        onHelpExposure: help => callbacksRef.current.onHelpExposure(activity, help),
        onAnchorClick: anchor => callbacksRef.current.onAnchorClick(anchor),
      },
    })
    return () => {
      mounted.dispose()
      element.textContent = ''
    }
    // Only a different activity/revision remounts; metadata updates (updatedAt)
    // and editable-state saves do not rebuild the live handle, so an in-flight
    // code run keeps its cancel control.
  }, [activity.id, activity.revision])
  return <div ref={host} />
}

/** One row in the activity history list. */
function ActivityHistoryRow(props: {
  readonly activity: LessonActivity
  readonly run?: ExperimentRun
  readonly onRestore: () => void
  readonly onDelete: () => void
  readonly busy: boolean
}): React.ReactElement {
  const { activity } = props
  return (
    <div className="ai-history-row">
      <div className="ai-history-main">
        <div className="ai-history-title">{activity.title}</div>
        <div className="ai-history-meta">
          <span className="ai-badge">{KIND_LABELS[activity.kind] ?? activity.kind}</span>
          <span>{createdLabel(activity.createdAt)}</span>
          {activity.payload.type === 'code-run' && (
            <span>最近运行：{props.run === undefined ? '尚未运行' : RUN_STATUS_LABELS[props.run.status]}</span>
          )}
        </div>
      </div>
      <div className="ai-row">
        <button type="button" className="ai-small-button" disabled={props.busy} onClick={props.onRestore}>
          恢复为当前
        </button>
        <button type="button" className="ai-danger-button" disabled={props.busy} onClick={props.onDelete}>
          删除
        </button>
      </div>
    </div>
  )
}

/** Tab body: only the current activity + collapsed history. */
function ActivityTab(props: {
  readonly activities: readonly LessonActivity[]
  readonly currentActivityId?: string
  readonly activityStates: Readonly<Record<string, ActivityState>>
  readonly latestRuns: Readonly<Record<string, ExperimentRun>>
  readonly callbacks: ActivityInteractionCallbacks
  readonly busy: boolean
  readonly onRestoreActivity: (activityId: string) => void
  readonly onCollapseActivity: () => void
  readonly onRequestDeleteActivity: (activity: LessonActivity) => void
}): React.ReactElement {
  const [showAll, setShowAll] = useState(false)
  // Graphical activities now render inline under their teacher message; this
  // panel keeps the text/code/practice activities.
  const graphical = props.activities.filter(activity => isGraphicalActivityKind(activity.kind))
  const panelActivities = props.activities.filter(activity => !isGraphicalActivityKind(activity.kind))
  const current = panelActivities.find(activity => activity.id === props.currentActivityId)
  const history = panelActivities
    .filter(activity => activity.id !== current?.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const visibleHistory = showAll ? history : history.slice(0, 10)
  return (
    <div>
      {graphical.length > 0 && (
        <div className="ai-banner ai-graphical-moved-note" data-kind="info" role="status" style={{ marginBottom: 8 }}>
          <span>
            图形类活动已显示在对话中（{graphical.length} 个）；此面板只保留文字、代码与练习类活动。
          </span>
        </div>
      )}
      {current === undefined && (
        <div className="ai-empty">
          {graphical.length > 0
            ? '当前图形类活动已显示在对话中；此面板可在下方「历史活动」恢复其它活动，或继续对话。'
            : '当前没有进行中的活动。可以在下方「历史活动」中恢复一个继续操作，或继续对话让教师创建新的活动。'}
        </div>
      )}
      {current !== undefined && (
        <div className="ai-current-activity">
          <div className="ai-current-head">
            <div className="ai-current-title">{current.title}</div>
            <button
              type="button"
              className="ai-small-button"
              disabled={props.busy}
              onClick={props.onCollapseActivity}
              aria-label="收起当前活动"
            >
              收起当前活动
            </button>
          </div>
          <ActivityView
            key={`${current.id}:${current.revision}`}
            activity={current}
            {...(props.activityStates[current.id] !== undefined ? { state: props.activityStates[current.id] } : {})}
            callbacks={props.callbacks}
          />
          <div className="ai-muted" style={{ marginTop: 6 }}>
            修订 v{current.revision} · 更新于 {formatTime(current.updatedAt)}
            {current.status === 'archived' ? ' · 已归档' : ''}
            {current.revisionHistory !== undefined && current.revisionHistory.length > 0
              ? ` · 历史 ${current.revisionHistory.length} 个修订`
              : ''}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <CollapsibleSection title="历史活动" count={history.length}>
          {history.length === 0 && <div className="ai-muted">还没有历史活动。</div>}
          {visibleHistory.map(activity => (
            <ActivityHistoryRow
              key={activity.id}
              activity={activity}
              {...(props.latestRuns[activity.id] !== undefined ? { run: props.latestRuns[activity.id] } : {})}
              busy={props.busy}
              onRestore={() => props.onRestoreActivity(activity.id)}
              onDelete={() => props.onRequestDeleteActivity(activity)}
            />
          ))}
          {!showAll && history.length > 10 && (
            <button type="button" className="ai-link-button" onClick={() => setShowAll(true)}>
              显示全部（{history.length}）
            </button>
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}

/** Tab body: course sources and the reader for one source. */
function SourcesTab(props: {
  readonly courseDetail?: CourseDetail
  readonly selectedDocumentId?: string
  readonly loadSource: TeachingAreaProps['loadSource']
  readonly onOpenSource: (documentId: string) => void
  readonly onRefreshSource: (documentId: string) => void
}): React.ReactElement {
  const [view, setView] = useState<SourceView | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const documentId = props.selectedDocumentId
  useEffect(() => {
    if (documentId === undefined) {
      setView(undefined)
      return
    }
    let disposed = false
    setLoading(true)
    setError(undefined)
    void props.loadSource(documentId)
      .then((loaded) => { if (!disposed) setView(loaded) })
      .catch((cause: unknown) => { if (!disposed) setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { if (!disposed) setLoading(false) })
    return () => { disposed = true }
  }, [documentId, props.loadSource])
  const sources = props.courseDetail?.sources ?? []
  return (
    <div>
      {sources.length === 0 && <div className="ai-empty">还没有导入资料。首次使用向导或课程设置中可以导入本地资料。</div>}
      {sources.map(source => (
        <div className="ai-source-card" key={source.id}>
          <div className="ai-source-title">
            <span>{source.missing === true ? '⚠ ' : ''}{source.title}</span>
            <span className="ai-badge">{source.format}</span>
            <span className="ai-badge">{source.status}</span>
          </div>
          <div className="ai-source-meta" title={source.originalPath}>{truncate(source.originalPath, 70)}</div>
          <div className="ai-row" style={{ marginTop: 4 }}>
            <button type="button" className="ai-link-button" onClick={() => props.onOpenSource(source.id)}>读取内容</button>
            <button type="button" className="ai-link-button" onClick={() => props.onRefreshSource(source.id)}>检查原文件变化</button>
          </div>
        </div>
      ))}
      {loading && <Spinner label="读取资料…" />}
      {error !== undefined && <div className="ai-banner" data-kind="error" role="alert">读取失败：{error}</div>}
      {view !== undefined && (
        <div style={{ marginTop: 8 }}>
          <div className="ai-row">
            <strong>{view.document.title}</strong>
            <span className="ai-muted">共 {view.totalUnits} 个单元</span>
          </div>
          {view.issues.length > 0 && (
            <ul className="ai-warning-list">
              {view.issues.slice(0, 6).map((issue, index) => (
                <li key={index} className="ai-source-issue">[{issue.severity}] {issue.message}</li>
              ))}
            </ul>
          )}
          {view.revision?.units.slice(0, 40).map(unit => (
            <div className="ai-source-unit" key={unit.id}>
              <div className="ai-muted">{unit.kind} · {unit.locator.page !== undefined ? `第 ${unit.locator.page} 页` : unit.locator.lines !== undefined ? `第 ${unit.locator.lines[0]}–${unit.locator.lines[1]} 行` : ''} · 置信度 {unit.confidence}</div>
              {unit.text.length > 1200 ? `${unit.text.slice(0, 1200)}…` : unit.text}
              {unit.notes !== undefined && unit.notes.length > 0 && (
                <div className="ai-source-issue">{unit.notes.join('；')}</div>
              )}
            </div>
          ))}
          {view.revision === undefined && <div className="ai-empty">该资料还没有可读修订（可能仍在处理或抽取失败）。</div>}
        </div>
      )}
    </div>
  )
}

/** Tab body: current experiment, collapsed experiment history, environment. */
function ExperimentsTab(props: {
  readonly activities: readonly LessonActivity[]
  readonly currentActivityId?: string
  readonly latestRuns: Readonly<Record<string, ExperimentRun>>
  readonly environments?: EnvironmentDirectory
  readonly busy: boolean
  readonly onLoadEnvironments: () => void
  readonly onRestoreActivity: (activityId: string) => void
  readonly onRequestDeleteActivity: (activity: LessonActivity) => void
}): React.ReactElement {
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const toggleExpanded = (id: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const isCode = (activity: LessonActivity): activity is LessonActivity & { payload: CodeRunPayload } =>
    activity.payload.type === 'code-run'
  const current = props.activities.find(activity => activity.id === props.currentActivityId)
  const currentExperiment = current !== undefined && isCode(current) ? current : undefined
  const history = props.activities
    .filter((activity): activity is LessonActivity & { payload: CodeRunPayload } =>
      isCode(activity) && activity.id !== currentExperiment?.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const visibleHistory = showAll ? history : history.slice(0, 5)
  return (
    <div>
      <div className="ai-row" style={{ marginBottom: 6 }}>
        <strong>实验环境</strong>
        <button type="button" className="ai-small-button" onClick={props.onLoadEnvironments}>刷新环境状态</button>
      </div>
      {props.environments === undefined && (
        <div className="ai-empty">尚未加载环境清单。点击“刷新环境状态”从 Host 读取真实解释器版本与隔离方式。</div>
      )}
      {props.environments !== undefined && (
        <>
          {props.environments.supportedLanguages.map(row => (
            <div className="ai-env-row" key={row.language}>
              <span className="ai-badge">{row.status}</span> {row.label}
              {row.note !== undefined ? ` · ${row.note}` : ''}
            </div>
          ))}
          {props.environments.environments.map(record => (
            <div className="ai-env-row" key={record.id}>
              <div>
                <span className="ai-badge">{record.status}</span> {record.language}
                {record.dialect !== undefined ? `（${record.dialect}）` : ''}
                {record.version !== undefined ? ` · ${record.version}` : ''}
              </div>
              <div className="ai-muted">
                依赖：{record.isolation.dependencies}
                {record.isolation.path !== undefined ? ` · ${record.isolation.path}` : ''}
                {' · '}执行：{record.execution.mode}
                {record.execution.executable !== undefined ? ` · ${record.execution.executable}` : ''}
                {' · '}超时 {record.execution.timeoutMs}ms
                {record.execution.network !== undefined ? ` · 网络：${record.execution.network}` : ''}
              </div>
              {record.failure !== undefined && (
                <div className="ai-source-issue">准备失败：{record.failure.message}（清理：{record.failure.cleanup}）</div>
              )}
            </div>
          ))}
          {props.environments.gaps.length > 0 && (
            <ul className="ai-warning-list">
              {props.environments.gaps.map(gap => <li key={gap}>{gap}</li>)}
            </ul>
          )}
        </>
      )}

      <div className="ai-row" style={{ margin: '14px 0 6px' }}>
        <strong>当前实验</strong>
      </div>
      {currentExperiment === undefined && (
        <div className="ai-empty">
          当前活动不是代码实验。可在「历史实验」中恢复一个代码实验，或在对话/当前活动中运行代码。
        </div>
      )}
      {currentExperiment !== undefined && (
        <div className="ai-current-experiment">
          <div className="ai-history-title">
            {currentExperiment.title} <span className="ai-badge">{currentExperiment.payload.language}</span>
          </div>
          <RunSummary
            run={props.latestRuns[currentExperiment.id]}
            expanded={expanded.has(currentExperiment.id)}
            onToggle={() => toggleExpanded(currentExperiment.id)}
            emptyText="尚未运行；在「当前活动」中运行后这里显示真实输出（刷新后仍保留）。"
          />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <CollapsibleSection title="历史实验" count={history.length}>
          {history.length === 0 && <div className="ai-muted">还没有其他代码实验。</div>}
          {visibleHistory.map(activity => (
            <div className="ai-history-row" key={activity.id}>
              <div className="ai-history-main">
                <div className="ai-history-title">{activity.title} <span className="ai-badge">{activity.payload.language}</span></div>
                <div className="ai-history-meta">{createdLabel(activity.createdAt)}</div>
                <RunSummary
                  run={props.latestRuns[activity.id]}
                  expanded={expanded.has(activity.id)}
                  onToggle={() => toggleExpanded(activity.id)}
                />
              </div>
              <div className="ai-row">
                <button
                  type="button"
                  className="ai-small-button"
                  disabled={props.busy}
                  onClick={() => props.onRestoreActivity(activity.id)}
                >
                  恢复为当前
                </button>
                <button
                  type="button"
                  className="ai-danger-button"
                  disabled={props.busy}
                  onClick={() => props.onRequestDeleteActivity(activity)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {!showAll && history.length > 5 && (
            <button type="button" className="ai-link-button" onClick={() => setShowAll(true)}>
              显示全部（{history.length}）
            </button>
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}

/** Tab body: notes bound to the current activity + stored course notes. */
function NotesTab(props: {
  readonly activities: readonly LessonActivity[]
  readonly currentActivityId?: string
  readonly notes: string
  readonly busy: boolean
  readonly courseDetail?: CourseDetail
  readonly onNotesChange: (text: string) => void
  readonly onSaveNotes: () => void
}): React.ReactElement {
  const selected = props.activities.find(activity => activity.id === props.currentActivityId)
  const stored = props.courseDetail?.learning.notes ?? []
  return (
    <div className="ai-notes-area">
      <div className="ai-muted" style={{ marginBottom: 4 }}>
        {selected !== undefined
          ? `笔记绑定到当前活动「${selected.title}」，随活动状态保存到 Host。`
          : '当前没有进行中的活动；可先在历史活动中恢复一个活动再记录笔记。'}
      </div>
      <textarea
        value={props.notes}
        aria-label="活动笔记"
        placeholder="记录你的理解、疑问或实验观察…"
        onChange={event => props.onNotesChange(event.target.value)}
      />
      <div className="ai-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="ai-primary-button"
          disabled={props.busy || selected === undefined}
          onClick={props.onSaveNotes}
        >
          保存笔记
        </button>
        <span className="ai-muted">笔记只保存在本机 Host 数据目录。</span>
      </div>
      {stored.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="ai-sidebar-heading">课程笔记历史（{stored.length}）</div>
          {stored.slice(0, 10).map(note => (
            <div className="ai-source-card" key={note.id}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{note.markdown}</pre>
              <div className="ai-muted">{note.updatedAt.slice(0, 16).replace('T', ' ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** The persistent teaching area with its four tabs. */
export function TeachingArea(props: TeachingAreaProps): React.ReactElement {
  const tab = props.selectedTab
  const callbacks: ActivityInteractionCallbacks = {
    onStateChange: props.onStateChange,
    onRunCode: props.onRunCode,
    onCancelRun: props.onCancelRun,
    onQuizSubmit: props.onQuizSubmit,
    onAnswerSubmit: props.onAnswerSubmit,
    onHelpExposure: props.onHelpExposure,
    onAnchorClick: props.onAnchorClick,
  }
  return (
    <section className="ai-teaching-area" aria-label="持续教学区域">
      <div className="ai-tabs" role="tablist">
        {([
          ['activity', '当前活动'],
          ['sources', '来源'],
          ['experiments', '实验/运行结果'],
          ['notes', '笔记'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="ai-tab"
            role="tab"
            aria-selected={tab === key}
            data-active={tab === key}
            onClick={() => props.onSelectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ai-tab-body">
        {tab === 'activity' && (
          <ActivityTab
            activities={props.activities}
            {...(props.currentActivityId !== undefined ? { currentActivityId: props.currentActivityId } : {})}
            activityStates={props.activityStates}
            latestRuns={props.latestRuns}
            callbacks={callbacks}
            busy={props.busy}
            onRestoreActivity={props.onRestoreActivity}
            onCollapseActivity={props.onCollapseActivity}
            onRequestDeleteActivity={props.onRequestDeleteActivity}
          />
        )}
        {tab === 'sources' && (
          <SourcesTab
            {...(props.courseDetail !== undefined ? { courseDetail: props.courseDetail } : {})}
            {...(props.selectedDocumentId !== undefined ? { selectedDocumentId: props.selectedDocumentId } : {})}
            loadSource={props.loadSource}
            onOpenSource={props.onOpenSource}
            onRefreshSource={props.onRefreshSource}
          />
        )}
        {tab === 'experiments' && (
          <ExperimentsTab
            {...(props.environments !== undefined ? { environments: props.environments } : {})}
            activities={props.activities}
            {...(props.currentActivityId !== undefined ? { currentActivityId: props.currentActivityId } : {})}
            latestRuns={props.latestRuns}
            busy={props.busy}
            onLoadEnvironments={props.onLoadEnvironments}
            onRestoreActivity={props.onRestoreActivity}
            onRequestDeleteActivity={props.onRequestDeleteActivity}
          />
        )}
        {tab === 'notes' && (
          <NotesTab
            activities={props.activities}
            {...(props.currentActivityId !== undefined ? { currentActivityId: props.currentActivityId } : {})}
            notes={props.notes}
            busy={props.busy}
            {...(props.courseDetail !== undefined ? { courseDetail: props.courseDetail } : {})}
            onNotesChange={props.onNotesChange}
            onSaveNotes={props.onSaveNotes}
          />
        )}
      </div>
    </section>
  )
}
