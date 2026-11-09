/**
 * Guided AI course planning wizard ("AI 帮我规划并联网找资料").
 *
 * Flow: start (topic/language) → interview rounds (frontier questions, options,
 * recommended answers, free text) → editable PlanBrief → candidate web
 * materials → planning.fetch → planning.createCourse. All long-running Host
 * work is a task polled through `tasks.get`; the component reports the created
 * course through `onCourseCreated` so the workspace can open it.
 *
 * Resume: pass `initialPlan` (from `planning.get`); the next state is derived
 * from `plan.status`. The parent remounts this component when switching plans.
 */
import React, { useState } from 'react'
import type { CoursePlan, PlanBrief } from '@deepseek-teaching/core/contracts'
import { apiGet, apiPost, describeError } from '../api.ts'
import { waitForTask } from '../task-poll.ts'
import { Spinner } from './Banner.tsx'
import {
  MAX_PLAN_ROUNDS, PLAN_STATUS_LABELS, answersFromRecommendations, briefToDraft, buildRoundAnswers,
  defaultSelectedCandidateIds, draftToBrief, extractCourseId, interviewComplete, parseCandidates,
  planRoundProgress, recommendedAnswer, taskFailureMessage, toggleCandidateId, validateBriefDraft,
  type DraftAnswer, type PlanBriefDraft,
} from '../planning-helpers.ts'

export interface PlanningWizardProps {
  /** Resume an existing plan (usually `planning.get`'s plan). */
  readonly initialPlan?: CoursePlan
  readonly defaultLanguage?: PlanBrief['language']
  readonly busy?: boolean
  /** Host created the course from this plan; open it in the workspace. */
  readonly onCourseCreated: (courseId: string, plan: CoursePlan) => void | Promise<void>
  /** Leave the wizard (also after a successful cancel). */
  readonly onCancel: () => void
}

/** Derive the visible step from the plan lifecycle. */
function viewFor(plan: CoursePlan | undefined): 'start' | 'interview' | 'brief' | 'candidates' | 'status' {
  if (plan === undefined) return 'start'
  switch (plan.status) {
    case 'interviewing': return 'interview'
    case 'plan-ready': return 'brief'
    case 'materials-review': return plan.candidates !== undefined && plan.candidates.length > 0 ? 'candidates' : 'status'
    case 'searching':
    case 'importing':
    case 'building':
    case 'done':
    case 'cancelled': return 'status'
  }
}

const LANGUAGE_LABELS: Readonly<Record<PlanBrief['language'], string>> = {
  zh: '中文', en: 'English', bilingual: '中英双语',
}

export function PlanningWizard(props: PlanningWizardProps): React.ReactElement {
  const [plan, setPlan] = useState<CoursePlan | undefined>(props.initialPlan)
  const [topic, setTopic] = useState(props.initialPlan?.topic ?? '')
  const [language, setLanguage] = useState<PlanBrief['language']>(
    props.initialPlan?.brief?.language ?? props.defaultLanguage ?? 'zh',
  )
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(() =>
    props.initialPlan?.frontier !== undefined ? answersFromRecommendations(props.initialPlan.frontier) : {})
  /** Questions whose free-text "custom answer" editor is open. */
  const [customQuestions, setCustomQuestions] = useState<ReadonlySet<string>>(new Set())
  const [briefDraft, setBriefDraft] = useState<PlanBriefDraft>(() =>
    briefToDraft(props.initialPlan?.brief, props.initialPlan?.topic))
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(() =>
    props.initialPlan !== undefined ? defaultSelectedCandidateIds(props.initialPlan) : [])
  /** Candidate snippets expanded by the student (title/URL/purpose stay compact). */
  const [expandedCandidates, setExpandedCandidates] = useState<ReadonlySet<string>>(new Set())
  const [busyLabel, setBusyLabel] = useState<string | undefined>(props.busy === true ? '处理中…' : undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [fetched, setFetched] = useState(false)
  /** Full PlanBrief fields are hidden by default; only 3 light controls are shown. */
  const [advancedBrief, setAdvancedBrief] = useState(false)
  const busy = props.busy === true || busyLabel !== undefined

  // After a successful fetch the Host may still report `importing` until the
  // create-course step; keep the candidates/create view visible in that window.
  const view = fetched && plan !== undefined
    && (plan.status === 'importing' || plan.status === 'materials-review')
    ? 'candidates'
    : viewFor(plan)
  const frontier = plan?.frontier ?? []
  const progress = plan !== undefined ? planRoundProgress(plan) : undefined

  /** Adopt one plan (also resets the local editors derived from it). */
  const adoptPlan = (next: CoursePlan): void => {
    setPlan(next)
    setAnswers(next.frontier !== undefined ? answersFromRecommendations(next.frontier) : {})
    setCustomQuestions(new Set())
    setBriefDraft(briefToDraft(next.brief, next.topic))
    setSelectedIds(defaultSelectedCandidateIds(next))
  }

  const run = async (label: string, action: () => Promise<void>): Promise<void> => {
    setBusyLabel(label)
    setError(undefined)
    try {
      await action()
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setBusyLabel(undefined)
    }
  }

  const startPlan = (): void => {
    const trimmed = topic.trim()
    if (trimmed === '') {
      setError('请先填写想学的主题。')
      return
    }
    void run('正在开始规划…', async () => {
      const response = await apiPost('planning.start', { topic: trimmed, language })
      adoptPlan(response.plan)
    })
  }

  const startInterviewPlan = async (): Promise<void> => {
    if (plan === undefined) return
    const payload = buildRoundAnswers(frontier, answers)
    if (payload.length === 0) {
      setError('请至少回答一个问题，或点「全部按推荐」。')
      return
    }
    await run('正在提交本轮回答…', async () => {
      const response = await apiPost('planning.answer', { planId: plan.id, answers: payload })
      let next = response.plan
      // plan-ready only means the interview is complete; the Host generates the
      // detailed PlanBrief in a separate call. Do it automatically so the review
      // page never opens as a wall of empty fields.
      if (response.ready && next.brief === undefined) {
        setBusyLabel('AI 正在整理学习计划…')
        const briefResponse = await apiPost('planning.brief', { planId: next.id })
        next = briefResponse.plan
      }
      adoptPlan(next)
      setNote(response.ready ? 'AI 已生成学习计划，请确认后搜索资料。' : undefined)
    })
  }

  const fillRecommendations = (): void => {
    setAnswers(answersFromRecommendations(frontier))
    setCustomQuestions(new Set())
    setError(undefined)
  }

  const changeAnswer = (questionId: string, answer: string, usedRecommendation: boolean): void => {
    setAnswers(previous => ({ ...previous, [questionId]: { questionId, answer, usedRecommendation } }))
  }

  /** Clicking an option selects it; it never copies the option text into the editor. */
  const selectOption = (questionId: string, option: string, usedRecommendation: boolean): void => {
    setCustomQuestions(previous => {
      if (!previous.has(questionId)) return previous
      const next = new Set(previous)
      next.delete(questionId)
      return next
    })
    changeAnswer(questionId, option, usedRecommendation)
  }

  const enterCustomAnswer = (questionId: string): void => {
    setCustomQuestions(previous => new Set([...previous, questionId]))
    changeAnswer(questionId, '', false)
  }

  const leaveCustomAnswer = (questionId: string): void => {
    setCustomQuestions(previous => {
      if (!previous.has(questionId)) return previous
      const next = new Set(previous)
      next.delete(questionId)
      return next
    })
    changeAnswer(questionId, '', false)
  }

  /** Fill defaults so an incomplete AI brief never dead-ends on blank fields. */
  const filledBriefDraft = (): PlanBriefDraft => {
    const title = briefDraft.title.trim() || plan?.brief?.title || plan?.topic || '学习计划'
    const goals = briefDraft.goals.trim() === '' ? (plan?.brief?.goals ?? []).join('\n') : briefDraft.goals
    const searchTopics = briefDraft.searchTopics.trim() === ''
      ? (plan?.brief?.searchTopics ?? []).join('\n') || title
      : briefDraft.searchTopics
    const chapters = briefDraft.chapters.length === 0 || briefDraft.chapters.every(chapter => chapter.title.trim() === '')
      ? [{ title, topics: goals || title, prerequisites: '' }]
      : briefDraft.chapters
    return {
      ...briefDraft,
      title,
      goals: goals === '' ? plan?.topic ?? title : goals,
      searchTopics,
      chapters,
    }
  }

  const regenerateBrief = async (): Promise<void> => {
    if (plan === undefined) return
    await run('AI 正在补全学习计划…', async () => {
      const response = await apiPost('planning.brief', { planId: plan.id })
      adoptPlan(response.plan)
      setNote('学习计划已由 AI 重新补全，请确认。')
    })
  }

  const saveBrief = async (andSearch: boolean): Promise<void> => {
    if (plan === undefined) return
    const draft = filledBriefDraft()
    const validation = validateBriefDraft(draft)
    if (validation !== undefined) {
      setError(validation)
      return
    }
    if (draft !== briefDraft) setBriefDraft(draft)
    const brief = draftToBrief(draft)
    await run(andSearch ? '正在保存并搜索资料…' : '正在保存规划…', async () => {
      const response = await apiPost('planning.brief', { planId: plan.id, brief })
      setPlan(response.plan)
      if (!andSearch) {
        setNote('规划已保存。')
        return
      }
      await searchMaterials(response.plan.id)
    })
  }

  const applyPlanFromHost = async (planId: string): Promise<CoursePlan> => {
    const response = await apiGet('planning.get', { planId })
    adoptPlan(response.plan)
    return response.plan
  }

  const searchMaterials = async (planId: string): Promise<void> => {
    const { task } = await apiPost('planning.search', { planId })
    const snapshot = await waitForTask(task.id, {
      onProgress: current => setBusyLabel(`正在搜索资料…（${current.steps.find(step => step.status === 'running')?.label ?? '检索中'}）`),
    })
    const failure = taskFailureMessage(snapshot, '资料搜索')
    if (failure !== undefined) throw new Error(failure)
    const fresh = await applyPlanFromHost(planId)
    const fromTask = parseCandidates(snapshot.result)
    if (fromTask.length > 0 && (fresh.candidates === undefined || fresh.candidates.length === 0)) {
      adoptPlan({ ...fresh, candidates: fromTask, status: 'materials-review' })
    }
    setNote('请勾选要抓取的候选资料。')
  }

  const fetchSelected = (): void => {
    if (plan === undefined) return
    if (selectedIds.length === 0) {
      setError('请至少勾选一份候选资料。')
      return
    }
    void run('正在抓取所选网页…', async () => {
      const { task } = await apiPost('planning.fetch', { planId: plan.id, candidateIds: selectedIds })
      const snapshot = await waitForTask(task.id, {
        onProgress: current => setBusyLabel(`正在抓取资料…（${current.steps.find(step => step.status === 'running')?.label ?? '抓取中'}）`),
      })
      const failure = taskFailureMessage(snapshot, '资料抓取')
      if (failure !== undefined) throw new Error(failure)
      await applyPlanFromHost(plan.id)
      setFetched(true)
      setNote('所选资料已入库，可以创建课程。')
    })
  }

  const createCourseFromPlan = (): void => {
    if (plan === undefined) return
    void run('正在创建课程…', async () => {
      const { task } = await apiPost('planning.createCourse', { planId: plan.id })
      const snapshot = await waitForTask(task.id, {
        onProgress: current => setBusyLabel(`正在创建课程…（${current.steps.find(step => step.status === 'running')?.label ?? '生成课程草案'}）`),
      })
      const failure = taskFailureMessage(snapshot, '创建课程')
      if (failure !== undefined) throw new Error(failure)
      const fresh = await applyPlanFromHost(plan.id)
      const courseId = extractCourseId(snapshot.result) ?? fresh.courseId
      if (courseId === undefined) throw new Error('课程已创建但未返回课程 id，请返回课程列表刷新。')
      await props.onCourseCreated(courseId, fresh)
    })
  }

  const refreshPlan = (): void => {
    if (plan === undefined) return
    void run('正在刷新规划…', async () => {
      await applyPlanFromHost(plan.id)
    })
  }

  const cancelPlan = (): void => {
    if (plan === undefined) {
      props.onCancel()
      return
    }
    void run('正在取消规划…', async () => {
      try {
        await apiPost('planning.cancel', { planId: plan.id })
      } finally {
        props.onCancel()
      }
    })
  }

  return (
    <div className="ai-planning-wizard" aria-label="AI 规划课程向导">
      <div className="ai-planning-head">
        <h3 className="ai-planning-title">AI 帮我规划并联网找资料</h3>
        {progress !== undefined && (
          <div className="ai-planning-progress" aria-label={`规划进度 ${progress.label}`}>
            <span>{progress.label}</span>
            <span className="ai-planning-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((progress.round / MAX_PLAN_ROUNDS) * 100)}%` }} />
            </span>
          </div>
        )}
        {plan !== undefined && <span className="ai-badge">{PLAN_STATUS_LABELS[plan.status]}</span>}
      </div>

      {error !== undefined && (
        <div className="ai-banner" data-kind="error" role="alert"><span>{error}</span></div>
      )}
      {note !== undefined && (
        <div className="ai-banner" data-kind="info" role="status"><span>{note}</span></div>
      )}

      {view === 'start' && (
        <section className="ai-planning-card" aria-label="规划开始">
          <label className="ai-planning-field">
            <span>想学什么主题？</span>
            <input
              className="ai-edit-title"
              value={topic}
              disabled={busy}
              placeholder="例如：概率论中的条件期望"
              onChange={event => setTopic(event.target.value)}
            />
          </label>
          <label className="ai-planning-field">
            <span>讲解语言</span>
            <select
              className="ai-edit-title"
              value={language}
              disabled={busy}
              onChange={event => setLanguage(event.target.value as PlanBrief['language'])}
            >
              {(Object.keys(LANGUAGE_LABELS) as PlanBrief['language'][]).map(value => (
                <option key={value} value={value}>{LANGUAGE_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <p className="ai-muted">
            AI 会先用几轮问题确认目标、基础、时间与章节偏好，再联网搜索候选资料；资料也可以稍后在左侧资料区自行添加。
          </p>
          <div className="ai-row">
            <button type="button" className="ai-primary-button" disabled={busy} onClick={startPlan}>
              {busy ? '正在开始…' : '开始规划'}
            </button>
            <button type="button" className="ai-link-button" disabled={busy} onClick={props.onCancel}>返回</button>
          </div>
          {busy && <Spinner label={busyLabel ?? '处理中…'} />}
        </section>
      )}

      {view === 'interview' && plan !== undefined && (
        <section className="ai-planning-card" aria-label={`第 ${progress?.round ?? 1} 轮问题`}>
          {frontier.length === 0 ? (
            <>
              <p className="ai-muted">本轮问题正在准备中。可以刷新规划继续。</p>
              <div className="ai-row">
                <button type="button" className="ai-small-button" disabled={busy} onClick={refreshPlan}>刷新规划</button>
                <button type="button" className="ai-link-button" onClick={cancelPlan}>取消规划</button>
              </div>
            </>
          ) : (
            <>
              <div className="ai-row" style={{ justifyContent: 'space-between' }}>
                <span className="ai-muted">回答越具体，课程结构越贴合；也可以直接采用建议。</span>
                <button type="button" className="ai-small-button" disabled={busy} onClick={fillRecommendations}>
                  全部按推荐
                </button>
              </div>
              <div className="ai-planning-questions">
                {frontier.map((question, index) => {
                  const draft = answers[question.id] ?? { questionId: question.id, answer: '', usedRecommendation: false }
                  const recommended = recommendedAnswer(question)
                  return (
                    <fieldset className="ai-planning-question" key={question.id}>
                      <legend>{index + 1}. {question.title}</legend>
                      <div className="ai-muted">{question.body}</div>
                      {(() => {
                        const options = question.options ?? []
                        const hasOptions = options.length > 0
                        const custom = customQuestions.has(question.id)
                        const optionSelected = hasOptions && options.includes(draft.answer)
                        const selectedLabel = optionSelected
                          ? draft.answer
                          : draft.usedRecommendation && !custom && draft.answer !== '' ? draft.answer : undefined
                        return (
                          <>
                            {hasOptions && !custom && (
                              <div className="ai-planning-options" role="radiogroup" aria-label={`问题 ${index + 1} 选项`}>
                                {options.map(option => (
                                  <button
                                    key={option}
                                    type="button"
                                    className="ai-planning-option"
                                    data-active={draft.answer === option}
                                    disabled={busy}
                                    aria-pressed={draft.answer === option}
                                    onClick={() => selectOption(question.id, option, option === recommended)}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}
                            {hasOptions && !custom && selectedLabel !== undefined && (
                              <div className="ai-planning-answer-state" data-ai={draft.usedRecommendation === true ? 'true' : undefined}>
                                {draft.usedRecommendation ? 'AI 建议（已采用）：' : '已选择：'}
                                {selectedLabel.length > 140 ? `${selectedLabel.slice(0, 140)}…` : selectedLabel}
                              </div>
                            )}
                            {hasOptions && !custom && selectedLabel === undefined && (
                              <div className="ai-planning-answer-state">未选择；可选择上方选项，或使用自定义回答。</div>
                            )}
                            {recommended !== undefined && draft.answer !== recommended && !custom && (
                              <button
                                type="button"
                                className="ai-link-button"
                                disabled={busy}
                                onClick={() => selectOption(question.id, recommended, true)}
                              >
                                采用建议：{recommended}
                              </button>
                            )}
                            {hasOptions && (
                              <button
                                type="button"
                                className="ai-link-button ai-planning-custom-toggle"
                                disabled={busy}
                                onClick={() => custom ? leaveCustomAnswer(question.id) : enterCustomAnswer(question.id)}
                              >
                                {custom ? '返回选项' : '自定义回答'}
                              </button>
                            )}
                            {(!hasOptions || custom) && (
                              <textarea
                                className="ai-planning-textarea"
                                value={draft.answer}
                                disabled={busy}
                                aria-label={`问题 ${index + 1} 的回答`}
                                placeholder="请填写你的回答…"
                                onChange={event => changeAnswer(question.id, event.target.value, false)}
                              />
                            )}
                          </>
                        )
                      })()}
                    </fieldset>
                  )
                })}
              </div>
              <div className="ai-row">
                <button type="button" className="ai-primary-button" disabled={busy} onClick={() => { void startInterviewPlan() }}>
                  {busy ? '正在提交…' : interviewComplete(plan) ? '完成访谈' : '提交并进入下一轮'}
                </button>
                <button type="button" className="ai-small-button" disabled={busy} onClick={refreshPlan}>刷新</button>
                <button type="button" className="ai-link-button" onClick={cancelPlan}>取消规划</button>
              </div>
            </>
          )}
          {busy && <Spinner label={busyLabel ?? '处理中…'} />}
        </section>
      )}

      {view === 'brief' && plan !== undefined && briefDraft !== undefined && (
        <section className="ai-planning-card" aria-label="确认课程规划">
          <p className="ai-muted">
            AI 已根据访谈生成学习计划。默认只需确认标题、目标和每周投入；章节与检索主题由 AI 负责，需要时可展开高级编辑。
          </p>
          <div className="ai-plan-summary" aria-label="AI 学习计划摘要">
            <h4>{plan.brief?.title ?? briefDraft.title ?? plan.topic}</h4>
            {(plan.brief?.goals ?? []).length > 0 && (
              <>
                <div className="ai-muted">学习目标</div>
                <ul>{(plan.brief?.goals ?? []).slice(0, 4).map(goal => <li key={goal}>{goal}</li>)}</ul>
                {(plan.brief?.goals ?? []).length > 4 && (
                  <div className="ai-muted">还有 {(plan.brief?.goals ?? []).length - 4} 条目标（在高级编辑中可查看完整计划）</div>
                )}
              </>
            )}
            {(plan.brief?.chapters ?? []).length > 0 && (
              <>
                <div className="ai-muted">章节安排</div>
                <ul className="ai-plan-chapters">
                  {(plan.brief?.chapters ?? []).slice(0, 4).map(chapter => (
                    <li key={chapter.title}>
                      <strong>{chapter.title}</strong>
                      {chapter.topics.length > 0 ? `：${chapter.topics.slice(0, 3).join('、')}` : ''}
                    </li>
                  ))}
                </ul>
                {(plan.brief?.chapters ?? []).length > 4 && (
                  <div className="ai-muted">还有 {(plan.brief?.chapters ?? []).length - 4} 章（在高级编辑中可查看完整计划）</div>
                )}
              </>
            )}
            {(plan.brief?.searchTopics ?? []).length > 0 && (
              <div className="ai-muted">检索主题：{(plan.brief?.searchTopics ?? []).slice(0, 3).join('；')}</div>
            )}
            {plan.brief === undefined && (
              <div className="ai-banner" data-kind="warning" role="status">
                <span>AI 计划字段不完整；可直接确认默认值，或重新补全计划。</span>
                <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void regenerateBrief() }}>
                  重新补全计划
                </button>
              </div>
            )}
          </div>

          <div className="ai-planning-grid">
            <label className="ai-planning-field"><span>课程标题</span>
              <input className="ai-edit-title" value={briefDraft.title} disabled={busy}
                placeholder="AI 已生成标题，可修改"
                onChange={event => setBriefDraft({ ...briefDraft, title: event.target.value })} /></label>
            <label className="ai-planning-field"><span>每周投入</span>
              <input className="ai-edit-title" value={briefDraft.weeklyHours} disabled={busy}
                placeholder={plan.brief?.weeklyHours ?? '可留空，由 AI 默认'}
                onChange={event => setBriefDraft({ ...briefDraft, weeklyHours: event.target.value })} /></label>
            <label className="ai-planning-field"><span>学习周期</span>
              <input className="ai-edit-title" value={briefDraft.duration} disabled={busy}
                placeholder={plan.brief?.duration ?? '可留空，由 AI 默认'}
                onChange={event => setBriefDraft({ ...briefDraft, duration: event.target.value })} /></label>
          </div>
          <label className="ai-planning-field"><span>学习目标（每行一个；已由 AI 填写）</span>
            <textarea className="ai-planning-textarea" rows={5} value={briefDraft.goals} disabled={busy}
              placeholder={plan.brief?.goals?.join('\n') ?? '可留空，提交时使用计划摘要中的目标'}
              onChange={event => setBriefDraft({ ...briefDraft, goals: event.target.value })} />
          </label>

          <button type="button" className="ai-link-button" disabled={busy}
            onClick={() => setAdvancedBrief(!advancedBrief)}>
            {advancedBrief ? '收起高级编辑' : '高级编辑（章节、检索主题、背景等）'}
          </button>
          {advancedBrief && (
            <div className="ai-plan-advanced">
              <div className="ai-planning-grid">
                <label className="ai-planning-field"><span>基础水平</span>
                  <input className="ai-edit-title" value={briefDraft.level} disabled={busy}
                    placeholder={plan.brief?.level ?? 'AI 未提供'}
                    onChange={event => setBriefDraft({ ...briefDraft, level: event.target.value })} /></label>
                <label className="ai-planning-field"><span>语言</span>
                  <select className="ai-edit-title" value={briefDraft.language} disabled={busy}
                    onChange={event => setBriefDraft({ ...briefDraft, language: event.target.value as PlanBrief['language'] })}>
                    {(Object.keys(LANGUAGE_LABELS) as PlanBrief['language'][]).map(value => (
                      <option key={value} value={value}>{LANGUAGE_LABELS[value]}</option>
                    ))}
                  </select></label>
              </div>
              <label className="ai-planning-field"><span>背景说明</span>
                <textarea className="ai-planning-textarea" value={briefDraft.background} disabled={busy}
                  placeholder={plan.brief?.background ?? 'AI 未提供'}
                  onChange={event => setBriefDraft({ ...briefDraft, background: event.target.value })} /></label>
              <div className="ai-planning-chapters">
                <div className="ai-row" style={{ justifyContent: 'space-between' }}>
                  <span className="ai-muted">章节安排</span>
                  <button type="button" className="ai-small-button" disabled={busy}
                    onClick={() => setBriefDraft({ ...briefDraft, chapters: [...briefDraft.chapters, { title: '', topics: '', prerequisites: '' }] })}>
                    ＋ 添加章节
                  </button>
                </div>
                {briefDraft.chapters.map((chapter, index) => (
                  <div className="ai-planning-chapter" key={index}>
                    <input className="ai-edit-title" value={chapter.title} disabled={busy} placeholder={`第 ${index + 1} 章标题`}
                      aria-label={`第 ${index + 1} 章标题`}
                      onChange={event => setBriefDraft({
                        ...briefDraft,
                        chapters: briefDraft.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                      })} />
                    <textarea className="ai-planning-textarea" value={chapter.topics} disabled={busy}
                      aria-label={`第 ${index + 1} 章主题`} placeholder="主题（每行一个）"
                      onChange={event => setBriefDraft({
                        ...briefDraft,
                        chapters: briefDraft.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, topics: event.target.value } : item),
                      })} />
                    <button type="button" className="ai-danger-button" disabled={busy}
                      onClick={() => setBriefDraft({ ...briefDraft, chapters: briefDraft.chapters.filter((_, itemIndex) => itemIndex !== index) })}>
                      删除本章
                    </button>
                  </div>
                ))}
              </div>
              <label className="ai-planning-field"><span>资料检索主题（每行一个）</span>
                <textarea className="ai-planning-textarea" value={briefDraft.searchTopics} disabled={busy}
                  placeholder={plan.brief?.searchTopics?.join('\n') ?? 'AI 未提供；提交时会用课程标题补全'}
                  onChange={event => setBriefDraft({ ...briefDraft, searchTopics: event.target.value })} /></label>
              <label className="ai-planning-field"><span>练习偏好</span>
                <input className="ai-edit-title" value={briefDraft.practiceStyle} disabled={busy}
                  placeholder={plan.brief?.practiceStyle ?? 'AI 未提供'}
                  onChange={event => setBriefDraft({ ...briefDraft, practiceStyle: event.target.value })} /></label>
              <label className="ai-planning-field"><span>排除内容（每行一个）</span>
                <textarea className="ai-planning-textarea" value={briefDraft.exclusions} disabled={busy}
                  placeholder={(plan.brief?.exclusions ?? []).join('\n') || 'AI 未提供'}
                  onChange={event => setBriefDraft({ ...briefDraft, exclusions: event.target.value })} /></label>
            </div>
          )}

          <div className="ai-row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="ai-primary-button" disabled={busy} onClick={() => { void saveBrief(true) }}>
              {busy ? '处理中…' : '确认计划并搜索资料'}
            </button>
            <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void saveBrief(false) }}>
              仅保存
            </button>
            <button type="button" className="ai-small-button" disabled={busy} onClick={() => { void createCourseFromPlan() }}>
              按计划直接建课（无资料）
            </button>
            <button type="button" className="ai-link-button" disabled={busy} onClick={() => { void regenerateBrief() }}>
              AI 重新生成计划
            </button>
            <button type="button" className="ai-link-button" onClick={cancelPlan}>取消规划</button>
          </div>
          {busy && <Spinner label={busyLabel ?? '处理中…'} />}
        </section>
      )}

      {view === 'candidates' && plan !== undefined && (
        <section className="ai-planning-card" aria-label="候选资料">
          <p className="ai-muted">
            以下是从网络检索到的候选资料。勾选要抓取入库的页面；也可以稍后在左侧「资料」区手动添加本地文件或网页 URL。
          </p>
          {plan.warnings !== undefined && plan.warnings.length > 0 && (
            <ul className="ai-warning-list">{plan.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
          )}
          <div className="ai-planning-candidate-toolbar">
            <span className="ai-muted">已选 {selectedIds.length} / {(plan.candidates ?? []).length} 条</span>
            <button type="button" className="ai-small-button" disabled={busy || (plan.candidates ?? []).length === 0}
              onClick={() => setSelectedIds((plan.candidates ?? []).map(candidate => candidate.id))}>
              全选
            </button>
            <button type="button" className="ai-small-button" disabled={busy || selectedIds.length === 0}
              onClick={() => setSelectedIds([])}>
              清空
            </button>
          </div>
          <div className="ai-planning-candidates">
            {(plan.candidates ?? []).map(candidate => {
              const selected = selectedIds.includes(candidate.id)
              const expanded = expandedCandidates.has(candidate.id)
              return (
                <article className="ai-planning-candidate" data-selected={selected} key={candidate.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={busy}
                    aria-label={`选择资料 ${candidate.title}`}
                    onChange={() => setSelectedIds(previous => toggleCandidateId(previous, candidate.id))}
                  />
                  <div className="ai-planning-candidate-main">
                    <div className="ai-planning-candidate-top">
                      <span className="ai-planning-candidate-title" title={candidate.title}>{candidate.title}</span>
                      <span className="ai-planning-candidate-status" data-status={candidate.status}>
                        {candidate.status === 'fetched' ? '已抓取' : candidate.status === 'failed' ? '失败' : candidate.status === 'selected' ? '已选' : '候选'}
                      </span>
                    </div>
                    <div className="ai-planning-candidate-source">
                      <span className="ai-badge ai-planning-source-badge">{candidate.domain || '未知来源'}</span>
                      <a href={candidate.url} target="_blank" rel="noopener noreferrer"
                        className="ai-planning-candidate-url" title={candidate.url}>
                        {candidate.url}
                      </a>
                    </div>
                    <div className="ai-planning-candidate-purpose">
                      用途：{candidate.purpose ?? (candidate.sourceQuery !== undefined ? `检索「${candidate.sourceQuery}」` : '未标注')}
                      {candidate.score !== undefined ? ` · 可信度评分 ${candidate.score}` : ''}
                    </div>
                    <div className="ai-planning-candidate-snippet" data-expanded={expanded}>
                      {candidate.snippet !== '' ? candidate.snippet : '（无摘要）'}
                    </div>
                    <div className="ai-planning-candidate-actions">
                      {candidate.snippet.length > 120 && (
                        <button type="button" className="ai-link-button" disabled={busy}
                          onClick={() => setExpandedCandidates(previous => {
                            const next = new Set(previous)
                            if (next.has(candidate.id)) next.delete(candidate.id)
                            else next.add(candidate.id)
                            return next
                          })}>
                          {expanded ? '收起摘要' : '展开摘要'}
                        </button>
                      )}
                      <a className="ai-link-button" href={candidate.url} target="_blank" rel="noopener noreferrer">打开原网页</a>
                    </div>
                    {candidate.reason !== undefined && <div className="ai-planning-candidate-reason">说明：{candidate.reason}</div>}
                  </div>
                </article>
              )
            })}
            {(plan.candidates ?? []).length === 0 && <div className="ai-muted">没有检索到候选资料，可以直接创建课程，或稍后在资料区添加。</div>}
          </div>
          <div className="ai-row">
            <button type="button" className="ai-primary-button" disabled={busy || selectedIds.length === 0}
              onClick={fetchSelected}>
              {busy ? '处理中…' : `抓取所选资料（${selectedIds.length}）`}
            </button>
            <button type="button" className="ai-small-button" disabled={busy} onClick={createCourseFromPlan}>
              直接创建课程
            </button>
            <button type="button" className="ai-link-button" onClick={cancelPlan}>取消规划</button>
          </div>
          {fetched && <div className="ai-banner" data-kind="info" role="status"><span>资料已入库，请继续创建课程。</span></div>}
          {busy && <Spinner label={busyLabel ?? '处理中…'} />}
        </section>
      )}

      {view === 'status' && plan !== undefined && (
        <section className="ai-planning-card" aria-label="规划状态">
          <div className="ai-row">
            <span className="ai-badge">{PLAN_STATUS_LABELS[plan.status]}</span>
            {plan.status === 'searching' && <span className="ai-muted">AI 正在联网检索候选资料…</span>}
            {plan.status === 'importing' && <span className="ai-muted">正在抓取网页资料…</span>}
            {plan.status === 'building' && <span className="ai-muted">正在创建课程与课程结构草案…</span>}
            {plan.status === 'done' && <span className="ai-muted">课程已创建，可以进入学习了。</span>}
            {plan.status === 'cancelled' && <span className="ai-muted">规划已取消，可以返回重新开始。</span>}
          </div>
          {plan.warnings !== undefined && plan.warnings.length > 0 && (
            <ul className="ai-warning-list">{plan.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
          )}
          <div className="ai-row">
            {plan.status === 'materials-review' && plan.brief !== undefined && (
              <>
                <button type="button" className="ai-primary-button" disabled={busy} onClick={createCourseFromPlan}>
                  按学习计划直接创建课程（无资料）
                </button>
                <span className="ai-muted">当前没有可用联网资料；课程概念会标为无资料锚点，可稍后在左侧资料区添加并整合。</span>
              </>
            )}
            {plan.status === 'importing' && (plan.importedSourceIds ?? []).length > 0 && (
              <button type="button" className="ai-primary-button" disabled={busy} onClick={createCourseFromPlan}>
                创建课程
              </button>
            )}
            {plan.status === 'done' && plan.courseId !== undefined && (
              <button type="button" className="ai-primary-button" disabled={busy}
                onClick={() => { void props.onCourseCreated(plan.courseId as string, plan) }}>
                进入课程
              </button>
            )}
            <button type="button" className="ai-small-button" disabled={busy} onClick={refreshPlan}>刷新状态</button>
            <button type="button" className="ai-link-button" onClick={cancelPlan}>关闭</button>
          </div>
          {busy && <Spinner label={busyLabel ?? '处理中…'} />}
        </section>
      )}
    </div>
  )
}
