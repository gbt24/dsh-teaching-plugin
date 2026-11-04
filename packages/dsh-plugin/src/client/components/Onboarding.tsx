/**
 * First-run guide: create a course, import local material by path, let the Host
 * propose a course structure draft, then confirm it. The client cannot open a
 * native file picker without host UI services, so paths are entered explicitly;
 * the Host validates every path and never writes to the student's files.
 *
 * The wizard stays mounted until the structure is confirmed (or the student
 * chooses the ad-hoc "ask right away" path); task/course refreshes never switch
 * the workspace out from under the student, and a failed draft generation keeps
 * explicit retry/back/ad-hoc actions instead of a spinner dead end.
 */
import React, { useState } from 'react'
import type { AppError, BootstrapInfo, CourseDraftView, TaskSnapshot } from '@deepseek-teaching/core/contracts'
import { formatPercent } from '../helpers.ts'
import { Banner, Spinner, TaskProgressBar } from './Banner.tsx'
import { DraftReview } from './DraftReview.tsx'

/** Result of one wizard action; `error` is shown verbatim with a retry path. */
export interface WizardResult {
  readonly ok: boolean
  readonly error?: string
  readonly draft?: CourseDraftView
}

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
  readonly onImportPaths: (courseId: string, paths: readonly string[]) => Promise<WizardResult>
  readonly onGenerateDraft: (courseId: string) => Promise<WizardResult>
  readonly onConfirmDraft: (courseId: string, revisionId: string) => Promise<WizardResult>
  /** Ad-hoc start: confirm a minimal structure on the Host and open a session. */
  readonly onStartAdhoc: (courseId: string) => Promise<WizardResult>
  /** Whether there are existing courses to return to (adding a course case). */
  readonly canCancel?: boolean
  /** Leave the wizard without creating a course. */
  readonly onCancel?: () => void
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
  const [draftPhase, setDraftPhase] = useState<'idle' | 'running' | 'error'>('idle')
  const [draftError, setDraftError] = useState<string | undefined>(undefined)
  const [actionBusy, setActionBusy] = useState<string | undefined>(undefined)

  const paths = pathsText.split('\n').map(line => line.trim()).filter(line => line !== '')
  const importTasks = props.tasks.filter(task => task.kind.includes('import') || task.kind.includes('source'))
  const draftTasks = props.tasks.filter(task => task.kind.includes('draft') || task.kind.includes('course'))
  const importRunning = importTasks.some(task => task.status === 'running' || task.status === 'queued')
  const draftRunning = draftTasks.some(task => task.status === 'running' || task.status === 'queued')
  const busy = props.busy !== undefined || actionBusy !== undefined

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
    setActionBusy('导入资料…')
    const result = await props.onImportPaths(courseId, paths)
    setActionBusy(undefined)
    if (!result.ok) setLocalError(result.error ?? '资料导入失败')
  }

  const generateDraft = async (): Promise<void> => {
    setLocalError(undefined)
    setDraftError(undefined)
    if (courseId === undefined) return
    setStep('draft')
    setDraftPhase('running')
    const result = await props.onGenerateDraft(courseId)
    if (result.ok) {
      setDraftPhase('idle')
      setDraftError(undefined)
    } else {
      setDraftPhase('error')
      setDraftError(result.error ?? '课程草案生成失败')
    }
  }

  const confirmDraft = async (revisionId: string): Promise<void> => {
    if (courseId === undefined || revisionId === '') return
    setDraftError(undefined)
    setActionBusy('确认课程结构…')
    const result = await props.onConfirmDraft(courseId, revisionId)
    setActionBusy(undefined)
    if (!result.ok) setDraftError(result.error ?? '确认课程结构失败')
    // On success the workspace switches itself: the Host has an active revision.
  }

  const startAdhoc = async (): Promise<void> => {
    if (courseId === undefined) return
    setDraftError(undefined)
    setActionBusy('创建随问随学会话…')
    const result = await props.onStartAdhoc(courseId)
    setActionBusy(undefined)
    if (!result.ok) setDraftError(result.error ?? '随问随学会话创建失败')
  }

  return (
    <div className="ai-onboarding">
      <div className="ai-onboarding-heading">
        <h2 style={{ margin: 0 }}>{props.canCancel === true ? '添加新课程' : '开始你的学习'}</h2>
        {props.canCancel === true && props.onCancel !== undefined && (
          <button type="button" className="ai-small-button" onClick={() => props.onCancel?.()} aria-label="返回工作区">
            返回工作区
          </button>
        )}
      </div>
      <p>
        资料只保存在本机。教学以你的课程资料为依据；模型补充、外部网页与实验输出会分别标注来源。
        首次使用需要确认课程结构，之后可以随时提问或继续系统学习。
      </p>
      {props.bootstrap !== undefined && props.bootstrap.features.imageOcr === false && (
        <Banner kind="warning" message="当前未启用图片/扫描资料识别能力：扫描件与图片中的公式图表无法保证被读取，可在后续版本接入。" />
      )}
      {props.error !== undefined && <Banner kind="error" message={props.error.message} details={props.error.code} onDismiss={props.onDismissError} />}
      {localError !== undefined && <Banner kind="error" message={localError} onDismiss={() => setLocalError(undefined)} />}
      {busy && <div style={{ marginBottom: 10 }}><Spinner label={actionBusy ?? props.busy ?? '处理中…'} /></div>}
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
            <span className="ai-field-hint">目标会用于课程结构草案；之后也可以补充。</span>
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
          <button type="button" className="ai-primary-button" onClick={() => void createCourse()} disabled={busy}>
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
            <button type="button" className="ai-primary-button" onClick={() => void importSources()} disabled={busy || importRunning}>
              {importRunning ? '导入中…' : '导入资料'}
            </button>
            <button
              type="button"
              className="ai-small-button"
              onClick={() => void generateDraft()}
              disabled={busy || draftRunning}
            >
              {draftRunning ? '正在生成课程草案…' : '生成课程草案'}
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
          <div className="ai-muted" style={{ marginTop: 8 }}>
            想先开始提问？生成任务失败或资料还没准备好时，可以在下一步选择「先随便问问（随问随学）」。
          </div>
        </div>
      )}

      {step === 'draft' && (
        <div className="ai-onboarding-card">
          {props.draft !== undefined && (
            <DraftReview
              draft={props.draft}
              busy={busy}
              {...(draftError !== undefined ? { error: draftError } : {})}
              onConfirm={() => props.draft === undefined ? undefined : confirmDraft(props.draft.revision.id)}
              onRegenerate={() => void generateDraft()}
              onAdhoc={() => void startAdhoc()}
              onBack={() => setStep('import')}
            />
          )}
          {props.draft === undefined && (
            <div>
              <div className="ai-row" style={{ alignItems: 'baseline' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>课程结构草案</h3>
                {draftPhase === 'running' && <span className="ai-badge">生成中</span>}
                {draftPhase === 'error' && <span className="ai-badge" style={{ color: 'var(--dsw-alias-state-error-primary, #b91c1c)' }}>生成失败</span>}
              </div>
              {draftPhase === 'running' && <Spinner label="正在分析资料并生成课程结构…" />}
              {draftPhase === 'error' && (
                <>
                  <div className="ai-banner" data-kind="error" role="alert" style={{ margin: '8px 0', borderRadius: 8 }}>
                    <span>{draftError ?? '课程草案生成失败'}</span>
                  </div>
                  <div className="ai-muted">
                    可以重试生成、返回补充资料，或直接「先随便问问」用最小结构开始学习（之后仍可再生成完整草案）。
                  </div>
                </>
              )}
              {draftPhase === 'idle' && (
                <div className="ai-muted">草案还没有生成：点击下方按钮开始分析资料。</div>
              )}
              <div className="ai-row" style={{ marginTop: 10 }}>
                <button type="button" className="ai-primary-button" onClick={() => void generateDraft()} disabled={busy}>
                  {draftPhase === 'error' ? '重试生成草案' : '生成课程草案'}
                </button>
                <button type="button" className="ai-small-button" onClick={() => void startAdhoc()} disabled={busy}>
                  先随便问问（随问随学）
                </button>
                <button type="button" className="ai-link-button" onClick={() => setStep('import')} disabled={busy}>
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
