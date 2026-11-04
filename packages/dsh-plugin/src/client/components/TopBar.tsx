/**
 * Top bar: current course/goal, model capability facts, language switch,
 * online state and the long-task progress strip.
 */
import React from 'react'
import type { BootstrapInfo, LanguagePreference, TaskSnapshot } from '@deepseek-teaching/core/contracts'
import { LANGUAGE_LABELS } from '../helpers.ts'
import { TaskProgressBar } from './Banner.tsx'

export interface TopBarProps {
  readonly bootstrap?: BootstrapInfo
  readonly courseTitle?: string
  readonly goals: readonly string[]
  readonly language: LanguagePreference
  readonly offline: boolean
  readonly busy: boolean
  readonly tasks: readonly TaskSnapshot[]
  readonly onLanguage: (language: LanguagePreference) => void
  readonly onCancelTask: (taskId: string) => void
}

export function TopBar(props: TopBarProps): React.ReactElement {
  const model = props.bootstrap?.model
  const imageCapability = model?.imageInput === 'yes' ? '可读图' : model?.imageInput === 'no' ? '不可读图' : '图像能力未知'
  return (
    <>
      <header className="ai-teaching-topbar">
        <div>
          <h2 className="ai-topbar-title">{props.courseTitle ?? 'AI 知识库教学'}</h2>
          {props.goals.length > 0 && (
            <div className="ai-topbar-goal" title={props.goals.join('；')}>
              目标：{props.goals.join('；')}
            </div>
          )}
        </div>
        <div className="ai-topbar-meta">
          {props.offline && <span className="ai-badge" style={{ color: '#b45309', borderColor: '#d97706' }}>离线</span>}
          {model !== undefined && (
            <span title={`模型：${model.provider}/${model.model}；${imageCapability}${model.note !== undefined ? `；${model.note}` : ''}`}>
              模型 {model.model} · {imageCapability}
            </span>
          )}
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
      {props.bootstrap !== undefined && props.bootstrap.warnings.length > 0 && (
        <div className="ai-banner" data-kind="warning" role="status">
          <span>能力提示：{props.bootstrap.warnings.join('；')}</span>
        </div>
      )}
    </>
  )
}
