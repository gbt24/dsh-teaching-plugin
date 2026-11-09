/**
 * Top bar: current course/goal, plugin-column toggles, model + reasoning-effort
 * selector, context-window usage meter, compression entry, language switch,
 * online state and the long-task progress strip.
 *
 * Everything here is presentation/selection only: model and context changes go
 * through the Host routes (`model.catalog`, `model.info`, `model.set`,
 * `context.usage`); the Harness outer sidebar is never touched.
 */
import React, { useState } from 'react'
import type {
  BootstrapInfo, ContextUsageView, LanguagePreference, ModelCatalogView, TaskSnapshot,
} from '@deepseek-teaching/core/contracts'
import { apiGet, describeError } from '../api.ts'
import { contextMeter } from '../context-meter.ts'
import { LANGUAGE_LABELS } from '../helpers.ts'
import { TaskProgressBar } from './Banner.tsx'

/** Request accepted by `POST /api/teaching/model.set`. */
export type ModelSetRequest =
  | { readonly followHost: true }
  | {
    readonly followHost?: false
    readonly provider: string
    readonly model: string
    readonly reasoningEffort?: string
  }

export interface TopBarProps {
  readonly bootstrap?: BootstrapInfo
  readonly courseTitle?: string
  readonly goals: readonly string[]
  readonly language: LanguagePreference
  readonly offline: boolean
  readonly busy: boolean
  readonly tasks: readonly TaskSnapshot[]
  readonly modelCatalog?: ModelCatalogView
  readonly contextUsage?: ContextUsageView
  /** Plugin-owned columns (course nav left, teaching area right). */
  readonly leftCollapsed: boolean
  readonly rightCollapsed: boolean
  readonly onToggleLeft: () => void
  readonly onToggleRight: () => void
  readonly onModelSet: (request: ModelSetRequest) => Promise<{ readonly ok: boolean; readonly error?: string }>
  readonly onCompressContext: () => void
  /** Compression is running (button disabled with progress label). */
  readonly compressing?: boolean
  readonly onLanguage: (language: LanguagePreference) => void
  readonly onCancelTask: (taskId: string) => void
}

/** Provider/model menu with optional reasoning-effort choice. */
function ModelSelector(props: {
  readonly catalog: ModelCatalogView
  readonly busy: boolean
  readonly onSet: (request: ModelSetRequest) => Promise<{ readonly ok: boolean; readonly error?: string }>
}): React.ReactElement {
  const { catalog } = props
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{
    readonly provider: string
    readonly model: string
    readonly efforts: readonly { readonly id: string; readonly name: string; readonly description?: string }[]
    readonly defaultEffort?: string
  } | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const close = (): void => {
    setOpen(false)
    setPending(undefined)
    setError(undefined)
  }
  const apply = async (request: ModelSetRequest): Promise<void> => {
    setLoading(true)
    setError(undefined)
    try {
      const result = await props.onSet(request)
      if (result.ok) close()
      else setError(result.error ?? '设置模型失败')
    } finally {
      setLoading(false)
    }
  }
  const chooseModel = async (provider: string, model: string): Promise<void> => {
    setError(undefined)
    setLoading(true)
    try {
      const info = await apiGet('model.info', { provider, model })
      const efforts = info.reasoning?.efforts ?? []
      if (efforts.length > 0) {
        setPending({
          provider,
          model,
          efforts,
          ...(info.reasoning?.defaultEffort !== undefined ? { defaultEffort: info.reasoning.defaultEffort } : {}),
        })
      } else {
        await apply({ followHost: false, provider, model })
      }
    } catch (cause) {
      setError(`读取模型能力失败：${describeError(cause)}`)
    } finally {
      setLoading(false)
    }
  }
  const currentLabel = pending === undefined
    ? `${catalog.current.model}${catalog.current.reasoningEffort !== undefined ? ` · ${catalog.current.reasoningEffort}` : ''}`
    : `${pending.model} · 选择推理力度`
  const effortLabel = (id: string | undefined): string => {
    if (id === undefined) return '默认'
    return catalog.providers.flatMap(provider => provider.models).length > 0 ? id : id
  }
  return (
    <span className="ai-model-selector">
      <button
        type="button"
        className="ai-model-button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={props.busy || loading}
        title={`当前模型：${catalog.current.provider}/${catalog.current.model}${catalog.current.reasoningEffort !== undefined ? `（推理力度 ${catalog.current.reasoningEffort}）` : ''}${catalog.followHost ? '；跟随宿主默认' : '；插件覆盖'}`}
        onClick={() => { if (open) close(); else setOpen(true) }}
      >
        <span className="ai-model-name">{currentLabel}</span>
        <span className="ai-badge" data-follow-host={catalog.followHost}>
          {catalog.followHost ? '跟随宿主' : '已覆盖'}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ai-model-menu" role="menu" aria-label="选择模型">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={catalog.followHost}
            className="ai-model-item"
            data-active={catalog.followHost}
            disabled={loading}
            onClick={() => { void apply({ followHost: true }) }}
          >
            <span>跟随宿主默认</span>
            <span className="ai-muted">{catalog.default.provider}/{catalog.default.model}</span>
          </button>
          {catalog.providers.map(provider => (
            <div className="ai-model-provider" key={provider.id}>
              <div className="ai-model-provider-name">{provider.name}</div>
              {provider.models.map(model => (
                <button
                  key={`${provider.id}/${model.id}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={!catalog.followHost && catalog.current.provider === provider.id && catalog.current.model === model.id}
                  className="ai-model-item"
                  data-active={!catalog.followHost && catalog.current.provider === provider.id && catalog.current.model === model.id}
                  disabled={loading}
                  title={model.description}
                  onClick={() => { void chooseModel(provider.id, model.id) }}
                >
                  <span>{model.name}</span>
                  <span className="ai-muted">{model.id}</span>
                </button>
              ))}
            </div>
          ))}
          {pending !== undefined && (
            <div className="ai-model-efforts" role="group" aria-label="推理力度">
              <div className="ai-model-provider-name">推理力度（{pending.model}）</div>
              <button
                type="button"
                className="ai-model-item"
                aria-checked={pending.defaultEffort === undefined}
                data-active={pending.defaultEffort === undefined}
                disabled={loading}
                onClick={() => { void apply({ followHost: false, provider: pending.provider, model: pending.model }) }}
              >
                <span>默认（继承模型默认力度）</span>
                {pending.defaultEffort !== undefined && <span className="ai-muted">{pending.defaultEffort}</span>}
              </button>
              {pending.efforts.map(effort => (
                <button
                  key={effort.id}
                  type="button"
                  className="ai-model-item"
                  disabled={loading}
                  title={effort.description}
                  onClick={() => { void apply({
                    followHost: false,
                    provider: pending.provider,
                    model: pending.model,
                    reasoningEffort: effort.id,
                  }) }}
                >
                  <span>{effort.name}</span>
                  <span className="ai-muted">{effortLabel(effort.id)}</span>
                </button>
              ))}
            </div>
          )}
          {catalog.failures !== undefined && catalog.failures.length > 0 && (
            <div className="ai-model-failures">
              {catalog.failures.map(failure => (
                <div key={failure.provider} className="ai-muted">无法列出 {failure.provider}：{failure.message}</div>
              ))}
            </div>
          )}
          {loading && <div className="ai-muted">正在应用…</div>}
          {error !== undefined && <div className="ai-model-error" role="alert">{error}</div>}
          <button type="button" className="ai-link-button" onClick={close}>关闭</button>
        </div>
      )}
    </span>
  )
}

/** Context-window meter with the manual-compression entry. */
function ContextMeter(props: {
  readonly usage?: ContextUsageView
  readonly busy: boolean
  readonly compressing?: boolean
  readonly onCompress: () => void
}): React.ReactElement | null {
  const meter = contextMeter(props.usage)
  if (meter === undefined) return null
  return (
    <span className="ai-context-meter" title={meter.tooltip} aria-label={`上下文用量：${meter.label}`}>
      <span className="ai-context-bar" data-tone={meter.tone} aria-hidden="true">
        <span style={{ width: `${Math.round((meter.fraction ?? 0) * 100)}%` }} />
      </span>
      <span className="ai-context-label">{meter.label}</span>
      <button
        type="button"
        className="ai-small-button"
        disabled={props.busy || props.compressing === true}
        onClick={props.onCompress}
        aria-label="压缩上下文"
        title="把较早对话压缩为结构化摘要；本机完整历史仍保留"
      >
        {props.compressing === true ? '压缩中…' : '压缩上下文'}
      </button>
    </span>
  )
}

export function TopBar(props: TopBarProps): React.ReactElement {
  const warningText = props.bootstrap?.warnings.join('；') ?? ''
  const [dismissedWarning, setDismissedWarning] = useState<string | undefined>(() => {
    try {
      return window.sessionStorage.getItem('ai-teaching:dismissed-warning') ?? undefined
    } catch {
      return undefined
    }
  })
  const showWarnings = warningText !== '' && dismissedWarning !== warningText
  const dismissWarnings = (): void => {
    setDismissedWarning(warningText)
    try {
      window.sessionStorage.setItem('ai-teaching:dismissed-warning', warningText)
    } catch {
      // Session storage may be blocked; the in-memory dismissal still works.
    }
  }
  const model = props.bootstrap?.model
  const imageCapability = model?.imageInput === 'yes' ? '可读图' : model?.imageInput === 'no' ? '不可读图' : '图像能力未知'
  return (
    <>
      {/* The bar takes the window's top strip (like DSH's conversation header),
          so mark it draggable: ui-web base.css turns `data-window-drag` into the
          one darwin drag rule, and keeps buttons/inputs under it clickable. */}
      <header className="ai-teaching-topbar" data-window-drag="">
        <div className="ai-topbar-titles">
          <div className="ai-row" style={{ alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="ai-icon-button"
              aria-pressed={!props.leftCollapsed}
              aria-label={props.leftCollapsed ? '展开课程导航' : '收起课程导航'}
              title={props.leftCollapsed ? '展开课程导航' : '收起课程导航'}
              onClick={props.onToggleLeft}
            >
              {props.leftCollapsed ? '▸' : '◂'}
            </button>
            <h2 className="ai-topbar-title">{props.courseTitle ?? 'AI 知识库教学'}</h2>
            <button
              type="button"
              className="ai-icon-button"
              aria-pressed={!props.rightCollapsed}
              aria-label={props.rightCollapsed ? '展开持续教学区域' : '收起持续教学区域'}
              title={props.rightCollapsed ? '展开持续教学区域' : '收起持续教学区域'}
              onClick={props.onToggleRight}
            >
              {props.rightCollapsed ? '◂' : '▸'}
            </button>
          </div>
          {props.goals.length > 0 && (
            <div className="ai-topbar-goal" title={props.goals.join('；')}>
              目标：{props.goals.join('；')}
            </div>
          )}
        </div>
        <div className="ai-topbar-meta">
          {props.offline && <span className="ai-badge" style={{ color: 'var(--dsw-alias-state-warn-primary, #b45309)', borderColor: 'var(--dsw-alias-state-warn-primary, #d97706)' }}>离线</span>}
          {props.modelCatalog !== undefined ? (
            <ModelSelector catalog={props.modelCatalog} busy={props.busy} onSet={props.onModelSet} />
          ) : model !== undefined && (
            <span title={`模型：${model.provider}/${model.model}；${imageCapability}${model.note !== undefined ? `；${model.note}` : ''}`}>
              模型 {model.model} · {imageCapability}
            </span>
          )}
          <ContextMeter
            usage={props.contextUsage}
            busy={props.busy}
            {...(props.compressing !== undefined ? { compressing: props.compressing } : {})}
            onCompress={props.onCompressContext}
          />
          {props.bootstrap !== undefined && (
            <span title={`Host ${props.bootstrap.host.platform}-${props.bootstrap.host.arch} · Node ${props.bootstrap.host.nodeVersion} · 数据目录 ${props.bootstrap.dataDir}`}>
              v{props.bootstrap.pluginVersion}
            </span>
          )}
          <span className="ai-lang-switch" role="group" aria-label="讲解语言">
            {(Object.keys(LANGUAGE_LABELS) as LanguagePreference[]).map(language => (
              <button
                key={language}
                type="button"
                data-active={props.language === language}
                disabled={props.busy}
                onClick={() => props.onLanguage(language)}
                aria-label={`切换为 ${LANGUAGE_LABELS[language]}`}
              >
                {LANGUAGE_LABELS[language]}
              </button>
            ))}
          </span>
        </div>
      </header>
      <TaskProgressBar tasks={props.tasks} onCancel={props.onCancelTask} />
      {showWarnings && (
        <div className="ai-banner ai-capability-banner" data-kind="warning" role="status">
          <span>能力提示：{warningText}</span>
          <button
            type="button"
            className="ai-banner-close"
            aria-label="关闭能力提示"
            title="关闭本次会话的能力提示"
            onClick={dismissWarnings}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
