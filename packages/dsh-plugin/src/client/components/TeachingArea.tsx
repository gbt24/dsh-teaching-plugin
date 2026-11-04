/**
 * Persistent teaching area: the current activity, source reader, experiment
 * results and notes. The activity body is rendered by the shared vanilla
 * renderer (`@deepseek-teaching/core/render`) so the in-app view and the future
 * offline export share one implementation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ActivityState, CodeRunPayload, CodeRunResultView, CourseDetail, EnvironmentDirectory,
  EvidenceReference, LessonActivity, MountedActivityState, SessionView, SourceAnchor, SourceView,
} from './activity-types.ts'
import {
  mountActivity, validateActivityPayload,
} from '@deepseek-teaching/core/render'
import type { TeachingTab } from '../state.ts'
import { truncate } from '../helpers.ts'
import { Spinner } from './Banner.tsx'

/** Callback bundle the area hands to the vanilla renderer. */
export interface ActivityInteractionCallbacks {
  readonly onStateChange: (activity: LessonActivity, patch: MountedActivityState) => void
  readonly onRunCode: (activity: LessonActivity, request: {
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
  readonly selectedActivityId?: string
  readonly selectedDocumentId?: string
  readonly activityStates: Readonly<Record<string, ActivityState>>
  readonly selectedTab: TeachingTab
  readonly courseDetail?: CourseDetail
  readonly session?: SessionView
  readonly environments?: EnvironmentDirectory
  readonly runResults: Readonly<Record<string, CodeRunResultView>>
  readonly notes: string
  readonly busy: boolean
  readonly onSelectTab: (tab: TeachingTab) => void
  readonly onSelectActivity: (activityId: string) => void
  readonly onOpenSource: (documentId: string) => void
  readonly onRefreshSource: (documentId: string) => void
  readonly loadSource: (documentId: string, offset?: number, limit?: number) => Promise<SourceView>
  readonly onLoadEnvironments: () => void
  readonly onNotesChange: (text: string) => void
  readonly onSaveNotes: () => void
  readonly onEvidenceClick: (reference: EvidenceReference) => void
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
    // Only a different activity/revision remounts; editable state is not rebuilt
    // on every keystroke, it flows through the Host and the live handle.
  }, [activity.id, activity.revision, activity.updatedAt])
  return <div ref={host} />
}

/** Tab body: the persistent current activity. */
function ActivityTab(props: {
  readonly activities: readonly LessonActivity[]
  readonly selectedActivityId?: string
  readonly selectedDocumentId?: string
  readonly activityStates: Readonly<Record<string, ActivityState>>
  readonly callbacks: ActivityInteractionCallbacks
  readonly onSelectActivity: (activityId: string) => void
}): React.ReactElement {
  const selected = props.activities.find(activity => activity.id === props.selectedActivityId)
    ?? props.activities[props.activities.length - 1]
  const sorted = [...props.activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return (
    <div>
      {sorted.length > 1 && (
        <div className="ai-activity-list" role="tablist" aria-label="教学活动">
          {sorted.map(activity => (
            <button
              key={activity.id}
              type="button"
              className="ai-small-button"
              data-active={activity.id === selected?.id}
              onClick={() => props.onSelectActivity(activity.id)}
              title={activity.goal}
            >
              {truncate(activity.title, 18)}
            </button>
          ))}
        </div>
      )}
      {selected === undefined && (
        <div className="ai-empty">
          教学区域还空着。继续对话，教师会在这里创建可交互的活动、图形、推导或代码实验；追问时它会保留并可继续操作。
        </div>
      )}
      {selected !== undefined && (
        <>
          <ActivityView
            key={`${selected.id}:${selected.revision}`}
            activity={selected}
            {...(props.activityStates[selected.id] !== undefined ? { state: props.activityStates[selected.id] } : {})}
            callbacks={props.callbacks}
          />
          <div className="ai-muted" style={{ marginTop: 6 }}>
            修订 v{selected.revision} · 更新于 {selected.updatedAt.slice(11, 16)}
            {selected.status === 'archived' ? ' · 已归档' : ''}
            {selected.revisionHistory !== undefined && selected.revisionHistory.length > 0
              ? ` · 历史 ${selected.revisionHistory.length} 个修订`
              : ''}
          </div>
        </>
      )}
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

/** Tab body: environments and recent real run results. */
function ExperimentsTab(props: {
  readonly environments?: EnvironmentDirectory
  readonly activities: readonly LessonActivity[]
  readonly runResults: Readonly<Record<string, CodeRunResultView>>
  readonly onLoadEnvironments: () => void
}): React.ReactElement {
  const codeActivities = props.activities.filter(
    (activity): activity is LessonActivity & { payload: CodeRunPayload } => activity.payload.type === 'code-run',
  )
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
      <div className="ai-row" style={{ margin: '10px 0 6px' }}>
        <strong>本次会话的代码实验</strong>
      </div>
      {codeActivities.length === 0 && <div className="ai-empty">当前会话还没有代码活动。</div>}
      {codeActivities.map(activity => {
        const result = props.runResults[activity.id]
        return (
          <div className="ai-env-row" key={activity.id}>
            <div>{activity.title} <span className="ai-badge">{activity.payload.type === 'code-run' ? activity.payload.language : ''}</span></div>
            {result === undefined && <div className="ai-muted">尚未运行；在“当前活动”中运行后这里显示真实输出。</div>}
            {result !== undefined && (
              <div className="ai-muted">
                状态：{result.status}
                {result.exitCode !== undefined ? ` · 退出码 ${result.exitCode}` : ''}
                {result.durationMs !== undefined ? ` · ${result.durationMs}ms` : ''}
                {result.verification !== undefined ? ` · 校验：${result.verification}` : ''}
                {result.runId !== undefined ? ` · 运行 ${result.runId}` : ''}
              </div>
            )}
            {result !== undefined && result.stdout !== '' && (
              <pre style={{ maxHeight: 140, overflow: 'auto', fontSize: 11 }}>{result.stdout}</pre>
            )}
            {result !== undefined && result.stderr !== '' && (
              <pre style={{ maxHeight: 140, overflow: 'auto', fontSize: 11, color: 'var(--dsw-alias-state-error-primary, #b91c1c)' }}>{result.stderr}</pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Tab body: notes bound to the selected activity + stored course notes. */
function NotesTab(props: {
  readonly activities: readonly LessonActivity[]
  readonly selectedActivityId?: string
  readonly notes: string
  readonly busy: boolean
  readonly courseDetail?: CourseDetail
  readonly onNotesChange: (text: string) => void
  readonly onSaveNotes: () => void
}): React.ReactElement {
  const selected = props.activities.find(activity => activity.id === props.selectedActivityId)
  const stored = props.courseDetail?.learning.notes ?? []
  return (
    <div className="ai-notes-area">
      <div className="ai-muted" style={{ marginBottom: 4 }}>
        {selected !== undefined
          ? `笔记绑定到当前活动「${selected.title}」，随活动状态保存到 Host。`
          : '选择一个活动后可记录笔记。'}
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
            {key === 'activity' && props.activities.length > 0 ? ` (${props.activities.length})` : ''}
          </button>
        ))}
      </div>
      <div className="ai-tab-body">
        {tab === 'activity' && (
          <ActivityTab
            activities={props.activities}
            {...(props.selectedActivityId !== undefined ? { selectedActivityId: props.selectedActivityId } : {})}
            activityStates={props.activityStates}
            callbacks={callbacks}
            onSelectActivity={props.onSelectActivity}
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
            runResults={props.runResults}
            onLoadEnvironments={props.onLoadEnvironments}
          />
        )}
        {tab === 'notes' && (
          <NotesTab
            activities={props.activities}
            {...(props.selectedActivityId !== undefined ? { selectedActivityId: props.selectedActivityId } : {})}
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
