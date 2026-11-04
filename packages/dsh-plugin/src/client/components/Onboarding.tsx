/**
 * First-run guide: create a course, import local material by path, let the Host
 * propose a course structure draft, then confirm it. The client cannot open a
 * native file picker without host UI services, so paths are entered explicitly;
 * the Host validates every path and never writes to the student's files.
 */
import React, { useState } from 'react'
import type { AppError, BootstrapInfo, CourseDraftView, TaskSnapshot } from '@deepseek-teaching/core/contracts'
import { formatPercent } from '../helpers.ts'
import { Banner, Spinner, TaskProgressBar } from './Banner.tsx'

export interface OnboardingProps {
  readonly bootstrap?: BootstrapInfo
  readonly busy?: string
  readonly error?: AppError
  readonly tasks: readonly TaskSnapshot[]
  readonly draft?: CourseDraftView
  readonly courseId?: string
  readonly onDismissError: () => void
  readonly onCancelTask: (taskId: string) => void
  readonly onCreateCourse: (input: {
    readonly title: string
    readonly description?: string
    readonly goals?: readonly string[]
    readonly language?: 'zh' | 'en' | 'bilingual'
  }) => Promise<string | undefined>
  readonly onImportPaths: (courseId: string, paths: readonly string[]) => Promise<void>
  readonly onGenerateDraft: (courseId: string) => Promise<void>
  readonly onConfirmDraft: (courseId: string, revisionId: string) => Promise<void>
  readonly onFinish: () => void
}

type Step = 'course' | 'import' | 'draft'

const STEP_LABELS: Readonly<Record<Step, string>> = {
  course: '1. 建立课程',
  import: '2. 导入本地资料',
  draft: '3. 确认课程结构',
}

export function Onboarding(props: OnboardingProps): React.ReactElement {
  const [step, setStep] = useState<Step>('course')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [language, setLanguage] = useState<'zh' | 'en' | 'bilingual'>('zh')
  const [pathsText, setPathsText] = useState('')
  const [localError, setLocalError] = useState<string | undefined>(undefined)
  const [courseId, setCourseId] = useState<string | undefined>(props.courseId)

  const paths = pathsText.split('\n').map(line => line.trim()).filter(line => line !== '')
  const importTasks = props.tasks.filter(task => task.kind.includes('import') || task.kind.includes('source'))
  const draftTasks = props.tasks.filter(task => task.kind.includes('draft') || task.kind.includes('course'))
  const importRunning = importTasks.some(task => task.status === 'running' || task.status === 'queued')
  const draftRunning = draftTasks.some(task => task.status === 'running' || task.status === 'queued')

  const createCourse = async (): Promise<void> => {
    setLocalError(undefined)
    if (title.trim() === '') {
      setLocalError('请先填写课程名称。')
      return
    }
    const created = await props.onCreateCourse({
      title: title.trim(),
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      goals: goals.split(/[；;\n]/u).map(goal => goal.trim()).filter(goal => goal !== ''),
      language,
    })
    if (created !== undefined) {
      setCourseId(created)
      setStep('import')
    }
  }

  const importSources = async (): Promise<void> => {
    setLocalError(undefined)
    if (courseId === undefined) return
    if (paths.length === 0) {
      setLocalError('请至少填写一个本地文件或目录路径。')
      return
    }
    await props.onImportPaths(courseId, paths)
  }

  const generateDraft = async (): Promise<void> => {
    setLocalError(undefined)
    if (courseId === undefined) return
    await props.onGenerateDraft(courseId)
    setStep('draft')
  }

  const confirmDraft = async (): Promise<void> => {
    if (courseId === undefined || props.draft === undefined) return
    await props.onConfirmDraft(courseId, props.draft.revision.id)
    props.onFinish()
  }

  return (
    <div className="ai-onboarding">
      <h2>开始你的学习</h2>
      <p>
        资料只保存在本机。教学以你的课程资料为依据；模型补充、外部网页与实验输出会分别标注来源。
        首次使用需要确认课程结构，之后可以随时提问或继续系统学习。
      </p>
      {props.bootstrap !== undefined && props.bootstrap.features.imageOcr === false && (
        <Banner kind="warning" message="当前未启用图片/扫描资料识别能力：扫描件与图片中的公式图表无法保证被读取，可在后续版本接入。" />
      )}
      {props.error !== undefined && <Banner kind="error" message={props.error.message} details={props.error.code} onDismiss={props.onDismissError} />}
      {localError !== undefined && <Banner kind="error" message={localError} onDismiss={() => setLocalError(undefined)} />}
      {props.busy !== undefined && <div style={{ marginBottom: 10 }}><Spinner label={props.busy} /></div>}
      <TaskProgressBar tasks={props.tasks} onCancel={props.onCancelTask} />

      <div className="ai-row" style={{ margin: '12px 0 6px' }}>
        {(Object.keys(STEP_LABELS) as Step[]).map(key => (
          <span key={key} className="ai-badge" style={{ opacity: step === key ? 1 : 0.55 }}>{STEP_LABELS[key]}</span>
        ))}
      </div>

      {step === 'course' && (
        <div className="ai-onboarding-card">
          <div className="ai-field">
            <label htmlFor="ai-course-title">课程名称</label>
            <input
              id="ai-course-title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="例如：SICP 计算机程序的构造与解释"
            />
          </div>
          <div className="ai-field">
            <label htmlFor="ai-course-goals">学习目标（用分号分隔）</label>
            <input
              id="ai-course-goals"
              value={goals}
              onChange={event => setGoals(event.target.value)}
              placeholder="例如：理解递归与高阶函数；能独立分析未见程序"
            />
          </div>
          <div className="ai-field">
            <label htmlFor="ai-course-desc">课程说明（可选）</label>
            <textarea id="ai-course-desc" rows={2} value={description} onChange={event => setDescription(event.target.value)} />
          </div>
          <div className="ai-field">
            <label htmlFor="ai-course-language">默认讲解语言</label>
            <select id="ai-course-language" value={language} onChange={event => setLanguage(event.target.value as 'zh' | 'en' | 'bilingual')}>
              <option value="zh">中文（保留英文术语）</option>
              <option value="bilingual">中英双语</option>
              <option value="en">English</option>
            </select>
          </div>
          <button type="button" className="ai-primary-button" onClick={() => void createCourse()} disabled={props.busy !== undefined}>
            建立课程并继续
          </button>
        </div>
      )}

      {step === 'import' && (
        <div className="ai-onboarding-card">
          <div className="ai-field">
            <label htmlFor="ai-source-paths">本地资料路径（每行一个文件或目录）</label>
            <textarea
              id="ai-source-paths"
              rows={4}
              value={pathsText}
              onChange={event => setPathsText(event.target.value)}
              placeholder={'/Users/you/Documents/SICP.pdf\n/Users/you/Documents/课程笔记.md\n/Users/you/Documents/代码实验'}
            />
            <span className="ai-field-hint">
              支持 Markdown/文本/PDF/Word/PPT/代码/Notebook。扫描件的公式图表识别取决于本机能力，导入后会列出问题清单。
            </span>
          </div>
          <div className="ai-row">
            <button type="button" className="ai-primary-button" onClick={() => void importSources()} disabled={props.busy !== undefined || importRunning}>
              {importRunning ? '导入中…' : '导入资料'}
            </button>
            <button
              type="button"
              className="ai-small-button"
              onClick={() => void generateDraft()}
              disabled={props.busy !== undefined || draftRunning}
            >
              {importRunning ? '导入完成后生成课程草案' : '生成课程草案'}
            </button>
            {importRunning && <span className="ai-muted">正在导入；完成后可生成课程草案。</span>}
          </div>
          {importTasks.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {importTasks.map(task => (
                <div className="ai-muted" key={task.id}>
                  {task.label}：{task.status}{formatPercent(task.progress) !== '' ? ` ${formatPercent(task.progress)}` : ''}
                  {task.error !== undefined ? `（${task.error.message}）` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'draft' && (
        <div className="ai-onboarding-card">
          {props.draft === undefined && (
            <div>
              <Spinner label={draftRunning ? '正在生成课程结构草案…' : '正在读取课程草案…'} />
              <div className="ai-muted" style={{ marginTop: 6 }}>
                草案会列出识别到的资料、概念与学习顺序；确认前不会用于系统学习。
              </div>
            </div>
          )}
          {props.draft !== undefined && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>课程结构草案（v{props.draft.revision.version}）</h3>
              <div className="ai-muted">
                来源覆盖：{props.draft.coverage.length} 份资料 · 概念 {props.draft.revision.concepts.length} 个
                · 学习顺序 {props.draft.revision.sequence.length} 步
              </div>
              {props.draft.warnings.length > 0 && (
                <ul className="ai-warning-list">
                  {props.draft.warnings.map(warning => <li key={warning}>{warning}</li>)}
                </ul>
              )}
              <ol className="ai-checklist">
                {props.draft.revision.sequence.map(conceptId => {
                  const concept = props.draft?.revision.concepts.find(item => item.id === conceptId)
                  return concept === undefined ? null : (
                    <li key={concept.id}>
                      <strong>{concept.title}</strong>
                      {concept.summary !== '' ? ` — ${concept.summary}` : ''}
                      {concept.sourceAnchors.length === 0 ? '（仅模型知识，无资料依据）' : ''}
                    </li>
                  )
                })}
              </ol>
              {props.draft.coverage.length > 0 && (
                <div className="ai-muted" style={{ marginTop: 6 }}>
                  资料：{props.draft.coverage.map(item => `${item.title}（${item.status}，${item.usedUnits} 单元${item.issues > 0 ? `，${item.issues} 个问题` : ''}）`).join('；')}
                </div>
              )}
              <div className="ai-row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="ai-primary-button"
                  onClick={() => void confirmDraft()}
                  disabled={props.busy !== undefined}
                >
                  确认结构并开始学习
                </button>
                <button
                  type="button"
                  className="ai-small-button"
                  onClick={() => void generateDraft()}
                  disabled={props.busy !== undefined || draftRunning}
                >
                  重新生成草案
                </button>
                <button type="button" className="ai-link-button" onClick={() => setStep('import')}>
                  返回补充资料
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
