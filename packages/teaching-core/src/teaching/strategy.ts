/**
 * 教学策略（纯函数）：从学生目标、基础、当前概念、学情与资料状态推导
 * 本轮讲解形式、任务形态、讲解骨架与活动建议。
 *
 * 这里不做模型调用，Host 可先用它做界面提示，TeachingService 再用同一结果
 * 构造提示词。策略刻意按任务形态（概念/证明/程序/阅读/辨析/开放式论证/习题）
 * 分别给骨架，避免所有概念套同一模板。
 */
import type { ActivityKind } from '../contracts/activity.ts'
import type { Concept } from '../contracts/course.ts'
import type { ConceptId } from '../contracts/ids.ts'
import type {
  LanguagePreference, LearningStage, StudentProfile, TeachingTurnMeta,
} from '../contracts/session.ts'
import type { TeachingTurnInput } from '../contracts/teaching.ts'
import type { TaskShape, TeachingForm, TeachingPlan } from './types.ts'

/** 每种讲解形式的中文标签，用于提示词与进度展示。 */
export const FORM_LABELS: Readonly<Record<TeachingForm, string>> = {
  'intuition-first': '直觉优先（直觉→准确表述→适用条件→类比边界）',
  'formal': '严谨展开（定义、前提、证明骨架与依据）',
  'worked-example': '例题示范（逐步讲解并过渡到独立练习）',
  'socratic': '追问引导（用问题带学生自己推出结论）',
  'visual': '图形/可视化（用图或动画建立直观）',
  'code-experiment': '代码实验（可运行示例 + 观察 + 验证）',
  'reading-guided': '阅读引导（定位原文、给阅读任务与检查问题）',
  'concept-contrast': '概念辨析（对比判据、易混反例、应用判断）',
  'open-argument': '开放式论证（拆解问题、理由与反驳）',
  'diagnosis': '诊断（复述思路、定位误解、针对性追问）',
  'review': '复习（回顾、遮挡复述、变式检验）',
  'answer-first': '完整答案（学生要求先看答案，仍需独立重做）',
}

/** 每种讲解形式的骨架，按顺序写进提示词。 */
const OUTLINES: Readonly<Record<TeachingForm, readonly string[]>> = {
  'intuition-first': ['直觉入口', '准确表述', '适用条件', '类比边界'],
  'formal': ['直觉先行（一句话）', '命题与前提', '证明骨架', '关键步骤与依据', '边界/反例'],
  'worked-example': ['题目目标', '已知与未知', '分步求解', '每一步的依据', '换一题独立练习'],
  'socratic': ['复述学生当前理解', '一个关键追问', '根据回答继续追问', '由学生自己说出结论', '小结与检查'],
  'visual': ['图形直觉', '图中关键量与关系', '与正式定义的对应', '图形失效的边界'],
  'code-experiment': ['问题与最小示例', '可运行代码骨架', '运行观察', '参数/边界实验', '小结与验证'],
  'reading-guided': ['阅读目标', '原文定位', '要点提示', '阅读检查问题'],
  'concept-contrast': ['两个概念的直觉差异', '判据/定义对比', '易混反例', '应用时如何判断'],
  'open-argument': ['问题拆解', '立场与理由', '证据/反例', '可能的反驳与边界', '开放结论'],
  'diagnosis': ['复述学生思路', '定位具体误解', '针对性追问或诊断活动', '下一步'],
  'review': ['回顾关键结论', '遮挡复述', '变式检验', '迁移或进入下一概念'],
  'answer-first': ['完整答案', '关键依据', '为什么这样做', '独立复述检查'],
}

/** 任务形态的基础讲解形式（可被学生要求覆盖）。 */
const BASE_FORM: Readonly<Record<TaskShape, TeachingForm>> = {
  concept: 'intuition-first',
  proof: 'formal',
  procedure: 'code-experiment',
  reading: 'reading-guided',
  contrast: 'concept-contrast',
  'open-argument': 'open-argument',
  'problem-set': 'worked-example',
}

/** 学生要求切换形式时识别的关键词；顺序即优先级。 */
const FORM_PATTERNS: readonly {
  readonly form: TeachingForm
  readonly label: string
  readonly pattern: RegExp
}[] = [
  {
    form: 'answer-first',
    label: '直接给答案',
    pattern: /(完整|标准|正确)?答案|解答|直接(告诉|说|给)|别(讲|说)了|answer|solution|just (give|tell) me/i,
  },
  {
    form: 'formal',
    label: '严谨/证明',
    pattern: /严谨|严格|形式化|完整证明|证明|推导|公理|formal|rigorous|proof|derivation/i,
  },
  {
    form: 'visual',
    label: '画图/可视化',
    pattern: /画(个|一个|张)?图|图形|可视化|动画|画出来|示意|draw|graph|visuali[sz]|animation|diagram/i,
  },
  {
    form: 'intuition-first',
    label: '直觉解释',
    pattern: /直觉|直观(理解|解释)?|大白话|通俗|intuition|intuitive|plain language/i,
  },
  {
    form: 'worked-example',
    label: '例题示范',
    pattern: /例题|例子|示例|举个例子|带我(做|过)|演示|示范|worked example|walk me through|example/i,
  },
  {
    form: 'socratic',
    label: '追问引导',
    pattern: /提问|问我|引导我|苏格拉底|别直接说|给我?提示|一步步问|quiz me|socratic|guide me|hint/i,
  },
  {
    form: 'code-experiment',
    label: '代码实验',
    pattern: /代码|程序|编程|运行|跑一下|实验|code|program|implement|run it|experiment/i,
  },
  {
    form: 'concept-contrast',
    label: '概念辨析',
    pattern: /辨析|区别|区分|混淆|对比|比较|compare|contrast|difference|distinguish/i,
  },
  {
    form: 'open-argument',
    label: '开放式论证',
    pattern: /论证|讨论|开放(式|题)|观点|评价|essay|argue|argument|discuss|evaluate/i,
  },
  {
    form: 'reading-guided',
    label: '阅读引导',
    pattern: /阅读|读原文|读教材|看原文|reading|read the (text|chapter)/i,
  },
  {
    form: 'review',
    label: '复习',
    pattern: /复习|回顾|温习|review|revisit/i,
  },
  {
    form: 'diagnosis',
    label: '先诊断',
    pattern: /诊断|先考考我|先测|先问问我|diagnos/i,
  },
]

/** 任务形态识别关键词；顺序即优先级（先匹配更专门的形态）。 */
const SHAPE_PATTERNS: readonly { readonly shape: TaskShape; readonly pattern: RegExp }[] = [
  { shape: 'proof', pattern: /证明|证毕|定理|命题|引理|反证|归纳法|prove|proof|theorem|lemma|contradiction/i },
  { shape: 'procedure', pattern: /代码|程序|实现|编程|算法实现|调试|python|javascript|typescript|scheme|sicp|code|program|implement|debug|runtime/i },
  { shape: 'reading', pattern: /阅读|读原文|教材第|章节|论文|文献|reading|paper|chapter|textbook|literature/i },
  { shape: 'contrast', pattern: /辨析|区别|区分|混淆|对比|比较|compare|contrast|difference|versus|\bvs\.?\b/i },
  { shape: 'open-argument', pattern: /论证|开放(式|题)|讨论|评价|观点|essay|argue|argument|discuss|evaluate|open-ended/i },
  { shape: 'problem-set', pattern: /习题|练习|题目|做题|考研|真题|试卷|刷题|exercise|problem set|quiz|exam|practice question/i },
]

/** 判断文本是否像在提问（用于识别“练习中的临时追问”）。 */
export function isQuestionLike(text: string): boolean {
  return /[?？]|吗|呢|为什么|为啥|怎么|如何|什么是|是什么意思|what|why|how|which|where|explain/i.test(text)
}

/** 从学生原话或 Host 传入的 requestedForm 识别想切换的形式。 */
export function detectRequestedForm(text: string | undefined): { form: TeachingForm; label: string } | undefined {
  if (text === undefined || text.trim() === '') return undefined
  for (const entry of FORM_PATTERNS) {
    if (entry.pattern.test(text)) return { form: entry.form, label: text.trim().slice(0, 40) }
  }
  return undefined
}

/** 从目标、基础、概念与课程信息识别本轮任务形态。 */
export function detectTaskShape(input: TeachingTurnInput): TaskShape {
  const concept = currentConcept(input)
  const haystack = [
    input.requestedForm ?? '',
    input.studentText,
    input.profile.goals ?? '',
    input.profile.background ?? '',
    input.course.title,
    input.course.description,
    concept?.title ?? '',
    concept?.summary ?? '',
    ...input.courseRevision.goals,
  ].join('\n')
  for (const entry of SHAPE_PATTERNS) {
    if (entry.pattern.test(haystack)) return entry.shape
  }
  return 'concept'
}

/** 当前概念（未指定时返回 undefined）。 */
export function currentConcept(input: TeachingTurnInput): Concept | undefined {
  if (input.currentConceptId === undefined) return undefined
  return input.courseRevision.concepts.find(concept => concept.id === input.currentConceptId)
}

/** 学情里某个概念的等级。 */
function conceptLevel(input: TeachingTurnInput, conceptId: ConceptId | undefined): string | undefined {
  if (conceptId === undefined) return undefined
  return input.learning.find(item => item.conceptId === conceptId)?.level
}

/** 根据讲解形式与任务形态给出建议活动类型。 */
function activityKindHint(form: TeachingForm, shape: TaskShape, stage: LearningStage): ActivityKind {
  const practiceLike = stage === 'practice' || stage === 'transfer' || stage === 'review'
  if (shape === 'proof' || shape === 'open-argument') {
    return practiceLike ? 'proof-task' : 'derivation'
  }
  if (shape === 'procedure') return practiceLike ? 'code-run' : 'code-run'
  if (shape === 'reading') return practiceLike ? 'quiz' : 'reading-task'
  if (shape === 'contrast') return 'quiz'
  if (shape === 'problem-set') return 'quiz'
  if (form === 'visual') return practiceLike ? 'interactive-graph' : 'interactive-graph'
  if (form === 'review') return 'quiz'
  if (form === 'diagnosis') return 'quiz'
  return practiceLike ? 'quiz' : 'explanation'
}

/** 选择本轮教学计划（纯函数，可单测）。 */
export function planTeachingTurn(input: TeachingTurnInput): TeachingPlan {
  const concept = currentConcept(input)
  const shape = detectTaskShape(input)
  const language = input.language ?? input.profile.language
  const requested = input.requestedForm !== undefined
    ? detectRequestedForm(input.requestedForm)
    : detectRequestedForm(input.studentText)
  const level = conceptLevel(input, concept?.id)

  let form: TeachingForm
  let formReason: string
  if (input.wantsFullAnswer === true || requested?.form === 'answer-first') {
    form = 'answer-first'
    formReason = '学生要求直接给出完整答案：本轮给全答案并明确标注“已展示答案”，建议随后独立重做以形成证据。'
  } else if (requested !== undefined) {
    form = requested.form
    formReason = `学生要求切换为「${requested.label}」：切换呈现形式，但保留原有学习目标与进度。`
  } else if (input.stage === 'diagnosis') {
    form = 'diagnosis'
    formReason = '当前处于诊断阶段：先复述学生思路、定位误解，再决定讲解或练习。'
  } else if (level === 'mastered' && (input.stage === 'teaching' || input.stage === 'idle')) {
    form = 'review'
    formReason = '该概念已有掌握证据：本轮以复习/迁移检验为主，避免重复讲解。'
  } else {
    form = BASE_FORM[shape]
    formReason = `按任务形态「${shape}」选择「${FORM_LABELS[form]}」。`
  }

  return {
    form,
    taskShape: shape,
    formReason,
    outline: OUTLINES[form],
    language,
    activityKindHint: activityKindHint(form, shape, input.stage),
    keepGoal: requested !== undefined || input.wantsFullAnswer === true,
    diagnosisFirst: form === 'diagnosis',
  }
}

/** 本轮应使用哪种语言（Host 可覆盖，学生偏好兜底）。 */
export function resolveLanguage(input: TeachingTurnInput): LanguagePreference {
  return input.language ?? input.profile.language ?? 'zh'
}

/** 语言教学指令（中/英/双语 + 术语保留）。 */
export function languageInstruction(language: LanguagePreference, profile?: StudentProfile): string {
  const keepTerms = profile?.preferences.keepOriginalTerms !== false
  switch (language) {
    case 'en':
      return 'Answer in English. Keep the original terms used by the course material; add a short Chinese gloss only when it genuinely helps.'
    case 'bilingual':
      return '用双语讲解：每个要点先中文再英文（或中英对照排列），关键术语保留原文。'
    default:
      return keepTerms
        ? '用中文讲解；关键英文/原文术语首次出现时保留原文（例如 overfitting（过拟合）），之后可只用中文。'
        : '用中文讲解，术语可只给中文；必要时再补原文。'
  }
}

/** 推断本轮结束后的学习位置；练习中的临时追问要能回到原进度。 */
export function decideNextPosition(
  input: TeachingTurnInput,
  meta: Pick<TeachingTurnMeta, 'intent' | 'stage'>,
): { readonly stage: LearningStage; readonly conceptId?: ConceptId } {
  const stage = meta.stage ?? input.stage
  const conceptId = input.currentConceptId
  const sideQuestion = isSideQuestion(input, meta)

  if (sideQuestion) return { stage: input.stage, conceptId }
  if (meta.intent === 'practice' && (input.stage === 'teaching' || input.stage === 'goal-setting')) {
    return { stage: 'practice', conceptId }
  }
  if (meta.intent === 'diagnose') return { stage: 'diagnosis', conceptId }
  if (meta.intent === 'review') return { stage: 'review', conceptId }
  if (meta.intent === 'feedback') {
    return { stage: input.stage === 'transfer' ? 'transfer' : 'practice', conceptId }
  }
  if (meta.intent === 'explain' && input.stage === 'goal-setting') return { stage: 'teaching', conceptId }
  return { stage, conceptId }
}

/** 是否为“练习/迁移中插入的临时问题”（回答后应恢复原进度）。 */
export function isSideQuestion(
  input: TeachingTurnInput,
  meta: Pick<TeachingTurnMeta, 'intent' | 'stage'>,
): boolean {
  if (input.stage !== 'practice' && input.stage !== 'transfer') return false
  if (meta.intent !== 'explain' && meta.intent !== 'answer' && meta.intent !== 'switch-style') return false
  return isQuestionLike(input.studentText)
}

/** 默认下一步按钮；模型给出的 nextActions 会合并在其前。 */
export function buildNextActions(
  input: TeachingTurnInput,
  meta: Pick<TeachingTurnMeta, 'intent' | 'stage'>,
  plan: TeachingPlan,
): readonly { readonly id: string; readonly label: string }[] {
  const actions: { id: string; label: string }[] = []
  if (isSideQuestion(input, meta)) actions.push({ id: 'resume-current', label: '回到当前练习' })
  if (input.wantsFullAnswer === true) actions.push({ id: 'retry-independent', label: '独立重做一题' })

  const intent = meta.intent ?? 'explain'
  if (intent === 'practice' || intent === 'feedback') {
    actions.push({ id: 'hint', label: '给我一点提示' })
    actions.push({ id: 'show-answer', label: '看完整答案' })
    actions.push({ id: 'next-step', label: '继续下一步' })
  } else if (intent === 'diagnose') {
    actions.push({ id: 'start-practice', label: '做题检验' })
    actions.push({ id: 'explain-first', label: '先讲解' })
  } else if (intent === 'review') {
    actions.push({ id: 'start-review', label: '开始复习' })
    actions.push({ id: 'next-concept', label: '进入下一概念' })
  } else if (intent === 'answer') {
    actions.push({ id: 'retry-independent', label: '独立重做一题' })
    actions.push({ id: 'next-step', label: '继续下一步' })
  } else {
    actions.push({ id: 'start-practice', label: '开始练习' })
    actions.push({ id: 'ask-question', label: '我有问题' })
  }
  if (plan.taskShape === 'proof') actions.push({ id: 'show-derivation', label: '查看推导步骤' })
  // 去重（模型与默认按钮可能重名）。
  const seen = new Set<string>()
  return actions.filter(action => (seen.has(action.id) ? false : (seen.add(action.id), true)))
}

/** 活动类型是否适合本轮任务形态与阶段（活动要服务于学习目标）。 */
export function activityKindCompatible(plan: TeachingPlan, stage: LearningStage, kind: ActivityKind): boolean {
  const practiceLike = stage === 'practice' || stage === 'transfer'
  if (practiceLike && (kind === 'explanation' || kind === 'static-figure' || kind === 'experiment-note')) {
    return false
  }
  switch (plan.taskShape) {
    case 'proof':
      return ['proof-task', 'derivation', 'quiz', 'open-question', 'explanation'].includes(kind)
    case 'procedure':
      return ['code-run', 'quiz', 'interactive-graph', 'explanation', 'derivation'].includes(kind)
    case 'reading':
      return ['reading-task', 'quiz', 'open-question', 'explanation'].includes(kind)
    case 'contrast':
      return ['quiz', 'open-question', 'explanation', 'static-figure', 'interactive-graph'].includes(kind)
    case 'open-argument':
      return ['open-question', 'proof-task', 'explanation', 'reading-task'].includes(kind)
    case 'problem-set':
      return ['quiz', 'proof-task', 'code-run', 'open-question', 'explanation'].includes(kind)
    default:
      return true
  }
}

/** 本轮活动能否算独立证据（学生要求答案/已展示答案时不能）。 */
export function activityCanBeIndependent(
  input: TeachingTurnInput,
  meta: Pick<TeachingTurnMeta, 'intent'>,
): boolean {
  if (input.wantsFullAnswer === true) return false
  if (meta.intent === 'answer') return false
  return input.stage === 'practice' || input.stage === 'transfer' || input.stage === 'review'
}

/** 轻量规则分类：模型不可用/失败时的兜底，也用于校准模型分类结果。 */
export function heuristicClassify(input: TeachingTurnInput): TeachingTurnMeta {
  const requested = input.requestedForm !== undefined
    ? detectRequestedForm(input.requestedForm)
    : detectRequestedForm(input.studentText)
  const text = input.studentText
  let intent: NonNullable<TeachingTurnMeta['intent']> = 'explain'
  if (requested !== undefined) intent = requested.form === 'answer-first' ? 'answer' : 'switch-style'
  else if (input.wantsFullAnswer === true) intent = 'answer'
  else if (/诊断|先考考我|先测|diagnos/i.test(text)) intent = 'diagnose'
  else if (/复习|回顾|review/i.test(text)) intent = 'review'
  else if (/练习|出题|考我|做题|practice|quiz me/i.test(text)) intent = 'practice'
  else if ((input.stage === 'practice' || input.stage === 'transfer') && !isQuestionLike(text)) intent = 'feedback'
  else if (input.stage === 'review') intent = 'review'
  else if (input.stage === 'diagnosis') intent = 'diagnose'

  const meta: TeachingTurnMeta = {
    intent,
    stage: input.stage,
    conceptIds: input.currentConceptId === undefined ? [] : [input.currentConceptId],
    nextActions: [],
  }
  if (requested !== undefined) return { ...meta, requestedForm: requested.label }
  if (input.requestedForm !== undefined) return { ...meta, requestedForm: input.requestedForm }
  return meta
}

/** 按目标/基础/偏好调整讲解节奏与风格的提示片段。 */
export function styleGuidance(profile: StudentProfile): string[] {
  const hints: string[] = []
  if (profile.preferences.style !== undefined && profile.preferences.style.trim() !== '') {
    hints.push(`学生偏好教学风格：${profile.preferences.style}（在不牺牲准确性的前提下遵循）。`)
  }
  if (profile.preferences.pace !== undefined) {
    const label = profile.preferences.pace === 'slow' ? '慢一点、每步确认' : profile.preferences.pace === 'fast' ? '节奏快一些、少铺垫' : '正常节奏'
    hints.push(`学生偏好节奏：${label}。`)
  }
  if (profile.background !== undefined && profile.background.trim() !== '') {
    hints.push(`学生自述基础：${profile.background.trim().slice(0, 200)}。讲解难度以此为起点，不要居高临下。`)
  }
  if (profile.goals !== undefined && profile.goals.trim() !== '') {
    hints.push(`学生长期目标：${profile.goals.trim().slice(0, 200)}。`)
  }
  return hints
}
