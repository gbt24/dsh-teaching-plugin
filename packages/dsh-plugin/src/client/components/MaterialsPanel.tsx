/**
 * Sidebar 资料 (materials) section: source list with origin badges, an
 * "添加资料" modal (local files or web URLs) and the incremental integration
 * action ("新资料已添加，整合到知识库").
 *
 * Local imports reuse the workspace callbacks (`onPickDirectory` /
 * `onImportLocalPaths`) so they keep the existing notify/task UI. Web imports
 * and `sources.integrate` are called directly and their tasks polled here; on a
 * successful integrate the refreshed draft is handed to `onDraftReady` so the
 * workspace can open the draft review (the summary itself is shown by
 * DraftReview from `draft.integration`).
 */
import React, { useState } from 'react'
import type { CourseDraftView, SourceDocument } from '@deepseek-teaching/core/contracts'
import { apiGet, apiPost, describeError } from '../api.ts'
import { waitForTask } from '../task-poll.ts'
import { Spinner } from './Banner.tsx'
import {
  integrationSummaryText, parseLocalPaths, parseWebUrls, sourceDisplayLocation, sourceOriginLabel,
} from '../source-helpers.ts'
import { taskFailureMessage } from '../planning-helpers.ts'

export interface MaterialsPanelProps {
  readonly courseId: string
  readonly sources: readonly SourceDocument[]
  readonly busy: boolean
  readonly onOpenSource: (documentId: string) => void
  /** Local file import through the workspace (keeps its notifications/task UI). */
  readonly onImportLocalPaths?: (courseId: string, paths: readonly string[]) => Promise<{ readonly ok: boolean; readonly error?: string }>
  /** Native directory chooser supplied by the Harness shell. */
  readonly onPickDirectory?: () => Promise<string | null>
  /** Refresh the course/source list after an import. */
  readonly onMaterialsChanged?: () => void | Promise<void>
  /** Draft refreshed after integration; open the draft review. */
  readonly onDraftReady?: (draft: CourseDraftView) => void
  /** Open the full "sources" tab (the sidebar only lists the first few). */
  readonly onShowAllSources?: () => void
}

type ModalTab = 'local' | 'web'
type Step = 'idle' | 'importing' | 'imported' | 'integrating' | 'integrated'

export function MaterialsPanel(props: MaterialsPanelProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ModalTab>('local')
  const [localPaths, setLocalPaths] = useState('')
  const [webUrls, setWebUrls] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [busyLabel, setBusyLabel] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [summary, setSummary] = useState<string | undefined>(undefined)
  const busy = props.busy || step === 'importing' || step === 'integrating'

  const openModal = (initialTab: ModalTab = 'local'): void => {
    setTab(initialTab)
    setError(undefined)
    setOpen(true)
  }

  const closeModal = (): void => {
    if (busy) return
    setOpen(false)
    setError(undefined)
  }

  const finishImport = async (): Promise<void> => {
    await props.onMaterialsChanged?.()
    setStep('imported')
    setLocalPaths('')
    setWebUrls('')
    setBusyLabel(undefined)
  }

  const importLocal = async (): Promise<void> => {
    if (props.onImportLocalPaths === undefined) {
      setError('当前界面未提供本地导入回调（onImportLocalPaths）。')
      return
    }
    const paths = parseLocalPaths(localPaths)
    if (paths.length === 0) {
      setError('请填写本地文件或文件夹路径。')
      return
    }
    setStep('importing')
    setBusyLabel('正在导入本地资料…')
    setError(undefined)
    try {
      const result = await props.onImportLocalPaths(props.courseId, paths)
      if (!result.ok) {
        setError(result.error ?? '本地资料导入失败。')
        setStep('idle')
        return
      }
      await finishImport()
    } catch (cause) {
      setError(describeError(cause))
      setStep('idle')
    } finally {
      setBusyLabel(undefined)
    }
  }

  const pickLocal = async (): Promise<void> => {
    if (props.onPickDirectory === undefined) return
    try {
      const picked = await props.onPickDirectory()
      if (picked === null || picked === '') return
      setLocalPaths(previous => previous === '' ? picked : `${previous}\n${picked}`)
    } catch (cause) {
      setError(describeError(cause))
    }
  }

  const importWeb = async (): Promise<void> => {
    const { urls, invalid } = parseWebUrls(webUrls)
    if (urls.length === 0) {
      setError(invalid.length > 0 ? `无法识别的 URL：${invalid.slice(0, 3).join('、')}` : '请填写至少一个网页 URL。')
      return
    }
    setStep('importing')
    setBusyLabel('正在抓取网页资料…')
    setError(undefined)
    try {
      const { task } = await apiPost('sources.importWeb', { courseId: props.courseId as never, urls })
      const snapshot = await waitForTask(task.id, {
        onProgress: current => setBusyLabel(`正在抓取网页…（${current.steps.find(item => item.status === 'running')?.label ?? '抓取中'}）`),
      })
      const failure = taskFailureMessage(snapshot, '网页资料导入')
      if (failure !== undefined) {
        setError(failure)
        setStep('idle')
        return
      }
      if (invalid.length > 0) {
        setError(`部分 URL 无法识别，已跳过：${invalid.slice(0, 3).join('、')}`)
      }
      await finishImport()
    } catch (cause) {
      setError(describeError(cause))
      setStep('idle')
    } finally {
      setBusyLabel(undefined)
    }
  }

  const integrateMaterials = async (): Promise<void> => {
    setStep('integrating')
    setBusyLabel('正在把新资料整合进知识库…')
    setError(undefined)
    try {
      const { task } = await apiPost('sources.integrate', { courseId: props.courseId as never })
      const snapshot = await waitForTask(task.id, {
        onProgress: current => setBusyLabel(`正在整合资料…（${current.steps.find(item => item.status === 'running')?.label ?? '整合中'}）`),
      })
      const failure = taskFailureMessage(snapshot, '资料整合')
      if (failure !== undefined) {
        setError(failure)
        setStep('imported')
        return
      }
      const { draft } = await apiGet('courseDraft.get', { courseId: props.courseId as never })
      setStep('integrated')
      setBusyLabel(undefined)
      // The draft review (opened by the workspace) shows the integration summary.
      if (draft !== undefined) setOpen(false)
      if (draft !== undefined) {
        setSummary(integrationSummaryText(draft.integration))
        props.onDraftReady?.(draft)
        if (draft.integration === undefined) setSummary('资料已整合，课程结构草案已更新。')
      } else {
        setSummary('资料已整合；稍后刷新课程可查看更新后的草案。')
        await props.onMaterialsChanged?.()
      }
    } catch (cause) {
      setError(describeError(cause))
      setStep('imported')
    } finally {
      setBusyLabel(undefined)
    }
  }

  return (
    <div className="ai-materials-panel">
      <div className="ai-sidebar-heading-row">
        <h3 className="ai-sidebar-heading">资料</h3>
        <button
          type="button"
          className="ai-small-button"
          disabled={props.busy}
          onClick={() => openModal('local')}
          aria-label="添加资料"
          title="添加本地文件或网页资料"
        >
          ＋ 添加资料
        </button>
      </div>
      {props.sources.length === 0 && <div className="ai-muted">尚未导入资料</div>}
      <div className="ai-materials-list">
        {props.sources.slice(0, 8).map(source => (
          <button
            key={source.id}
            type="button"
            className="ai-material-row"
            onClick={() => props.onOpenSource(source.id as string)}
            title={sourceDisplayLocation(source)}
          >
            <span className="ai-badge ai-material-origin" data-origin={sourceOriginLabel(source)}>
              {sourceOriginLabel(source)}
            </span>
            <span className="ai-grow ai-material-title">
              {source.missing === true ? '⚠ ' : ''}{source.title}
            </span>
          </button>
        ))}
      </div>
      {props.sources.length > 8 && (
        <button
          type="button"
          className="ai-link-button ai-materials-more"
          onClick={() => props.onShowAllSources?.()}
          disabled={props.onShowAllSources === undefined}
        >
          还有 {props.sources.length - 8} 份资料 · 查看全部
        </button>
      )}
      {step === 'imported' && (
        <div className="ai-banner" data-kind="info" role="status" style={{ marginTop: 6, borderRadius: 8 }}>
          <span>新资料已添加，整合到知识库</span>
          <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void integrateMaterials() }}>
            {busy ? '整合中…' : '整合到知识库'}
          </button>
        </div>
      )}
      {step === 'integrated' && summary !== undefined && (
        <div className="ai-muted" style={{ marginTop: 4 }}>{summary}</div>
      )}
      {(step === 'importing' || step === 'integrating') && busyLabel !== undefined && (
        <Spinner label={busyLabel} />
      )}

      {open && (
        <div
          className="ai-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="添加资料"
          onClick={(event) => { if (event.target === event.currentTarget) closeModal() }}
        >
          <div className="ai-modal ai-materials-modal">
            <h3>添加资料</h3>
            <div className="ai-materials-tabs" role="tablist" aria-label="添加资料方式">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'local'}
                className="ai-small-button"
                data-active={tab === 'local'}
                disabled={busy}
                onClick={() => setTab('local')}
              >
                本地文件
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'web'}
                className="ai-small-button"
                data-active={tab === 'web'}
                disabled={busy}
                onClick={() => setTab('web')}
              >
                网页 URL
              </button>
            </div>
            {tab === 'local' && (
              <div role="tabpanel" aria-label="本地文件">
                {props.onImportLocalPaths === undefined && (
                  <div className="ai-muted">当前界面未启用本地导入：需要 Workspace 提供 onImportLocalPaths 回调。</div>
                )}
                {props.onPickDirectory !== undefined && (
                  <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void pickLocal() }}>
                    选择文件或文件夹…
                  </button>
                )}
                <textarea
                  className="ai-planning-textarea"
                  value={localPaths}
                  disabled={busy}
                  aria-label="本地文件路径（每行一个）"
                  placeholder="本地文件/文件夹路径，每行一个"
                  onChange={event => setLocalPaths(event.target.value)}
                />
                <div className="ai-row">
                  <button type="button" className="ai-primary-button" disabled={busy || props.onImportLocalPaths === undefined}
                    onClick={() => { void importLocal() }}>
                    {busy ? '导入中…' : '导入本地资料'}
                  </button>
                  <button type="button" className="ai-small-button" disabled={busy} onClick={closeModal}>取消</button>
                </div>
              </div>
            )}
            {tab === 'web' && (
              <div role="tabpanel" aria-label="网页 URL">
                <p className="ai-muted">粘贴网页 URL（每行一个，仅 http/https）；抓取后会加入资料列表。</p>
                <textarea
                  className="ai-planning-textarea"
                  value={webUrls}
                  disabled={busy}
                  aria-label="网页 URL（每行一个）"
                  placeholder={'https://example.com/article\nhttps://example.org/page'}
                  onChange={event => setWebUrls(event.target.value)}
                />
                <div className="ai-row">
                  <button type="button" className="ai-primary-button" disabled={busy} onClick={() => { void importWeb() }}>
                    {busy ? '抓取中…' : '导入网页资料'}
                  </button>
                  <button type="button" className="ai-small-button" disabled={busy} onClick={closeModal}>取消</button>
                </div>
              </div>
            )}
            <p className="ai-muted" style={{ marginBottom: 0 }}>
              想按主题让 AI 联网找资料？请使用「AI 帮我规划并联网找资料」流程；这里先支持本地文件与网页 URL。
            </p>
            {error !== undefined && (
              <div className="ai-banner" data-kind="error" role="alert" style={{ borderRadius: 8 }}>
                <span>{error}</span>
              </div>
            )}
            {(step === 'importing' || step === 'integrating') && busyLabel !== undefined && (
              <Spinner label={busyLabel} />
            )}
            {step === 'imported' && (
              <div className="ai-banner" data-kind="info" role="status" style={{ borderRadius: 8 }}>
                <span>新资料已添加</span>
                <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void integrateMaterials() }}>
                  整合到知识库
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
