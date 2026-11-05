/**
 * Shared React wrapper around the core `mountActivity` renderer, used for
 * graphical activities inside the chat conversation (and their fullscreen view).
 *
 * Remounts only for activity id/revision/reload; graph parameter changes persist
 * through `onStateChange`. Graphical kinds do not need code/quiz/anchor
 * callbacks, but no-ops are supplied so the core renderer never sees undefined
 * handlers for the optional interactions it may render.
 */
import React, { useEffect, useRef, useState } from 'react'
import type { ActivityState, LessonActivity } from '@deepseek-teaching/core/contracts'
import {
  mountActivity, validateActivityPayload,
} from '@deepseek-teaching/core/render'
import type { MountedActivityState } from '@deepseek-teaching/core/render'

export interface InlineActivityProps {
  readonly activity: LessonActivity
  readonly state?: ActivityState
  /** Persist editable state (graph params, etc.). */
  readonly onStateChange?: (activity: LessonActivity, patch: MountedActivityState) => void
  /** `fullscreen` hides the inline toolbar (the overlay header supplies it). */
  readonly variant?: 'inline' | 'fullscreen'
  /** Open the page-internal fullscreen overlay (inline toolbar button). */
  readonly onFullscreen?: () => void
}

/** Card toolbar + mounted vanilla renderer for one graphical activity. */
export function InlineActivity(props: InlineActivityProps): React.ReactElement {
  const host = useRef<HTMLDivElement | null>(null)
  const callbacksRef = useRef({ onStateChange: props.onStateChange })
  callbacksRef.current = { onStateChange: props.onStateChange }
  const [error, setError] = useState<string | undefined>(undefined)
  const [reloadKey, setReloadKey] = useState(0)
  const [showSource, setShowSource] = useState(false)
  const { activity } = props

  useEffect(() => {
    const element = host.current
    if (element === null) return
    element.textContent = ''
    setError(undefined)
    const validation = validateActivityPayload(activity.payload)
    if (!validation.ok) {
      setError(`活动数据无法渲染：${validation.error.message}`)
      return
    }
    const noop = (): void => {}
    const runUnsupported = (): Promise<never> => Promise.reject(new Error('图形类活动不支持代码运行'))
    const mounted = mountActivity(element, {
      payload: validation.value,
      id: activity.id,
      revision: activity.revision,
      title: activity.title,
      goal: activity.goal,
      sourceRefs: activity.sourceRefs,
      verification: activity.verification,
    }, {
      ...(props.state !== undefined ? { state: props.state } : {}),
      callbacks: {
        onStateChange: patch => callbacksRef.current.onStateChange?.(activity, patch),
        onRunCode: runUnsupported,
        onCancelRun: noop,
        onQuizSubmit: noop,
        onAnswerSubmit: noop,
        onHelpExposure: noop,
        onAnchorClick: noop,
      },
    })
    return () => {
      mounted.dispose()
      element.textContent = ''
    }
    // State saves update props.state without remounting (live graph keeps params).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, activity.revision, reloadKey])

  const payload = activity.payload
  const visualSource = payload.type === 'visual' ? payload.source : undefined
  const interactive = payload.type === 'visual' && payload.interactive === true
  const graphicalKind = payload.type
  return (
    <div
      className={`ai-inline-activity${props.variant === 'fullscreen' ? ' ai-inline-activity-fullscreen' : ''}`}
      data-kind={graphicalKind}
      data-activity-id={activity.id as string}
    >
      {props.variant !== 'fullscreen' && (
        <div className="ai-inline-toolbar">
          <span className="ai-inline-title">{activity.title}</span>
          <span className="ai-badge ai-inline-kind">{GRAPHICAL_KIND_LABELS[graphicalKind] ?? graphicalKind}</span>
          {interactive && <span className="ai-badge ai-inline-interactive">交互演示 · 沙箱运行</span>}
          <span className="ai-inline-toolbar-spacer" />
          <button
            type="button"
            className="ai-small-button"
            onClick={() => setReloadKey(value => value + 1)}
            aria-label={`重新加载活动 ${activity.title}`}
            title="重新加载"
          >
            ⟳ 重新加载
          </button>
          {props.onFullscreen !== undefined && (
            <button
              type="button"
              className="ai-small-button"
              onClick={props.onFullscreen}
              aria-label={`全屏放大活动 ${activity.title}`}
              title="全屏放大"
            >
              ⛶ 全屏
            </button>
          )}
          {visualSource !== undefined && (
            <button
              type="button"
              className="ai-small-button"
              aria-expanded={showSource}
              onClick={() => setShowSource(value => !value)}
              aria-label={`查看活动源码 ${activity.title}`}
              title="查看源码"
            >
              {'</> 源码'}
            </button>
          )}
        </div>
      )}
      {error !== undefined && (
        <div className="ai-banner" data-kind="error" role="alert">
          <span>{error}</span>
        </div>
      )}
      <div ref={host} className="ai-inline-host" />
      {showSource && visualSource !== undefined && (
        <details className="ai-inline-source" open>
          <summary>可视化源码（只在沙箱 iframe 中运行）</summary>
          <pre>{visualSource}</pre>
        </details>
      )}
    </div>
  )
}

/** Readable kind labels for the inline card badge. */
const GRAPHICAL_KIND_LABELS: Readonly<Record<string, string>> = {
  visual: '可视化',
  'interactive-graph': '交互图',
  'static-figure': '静态图',
  animation: '动画',
}
