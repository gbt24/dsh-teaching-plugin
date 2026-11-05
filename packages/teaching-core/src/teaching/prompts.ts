/**
 * 教学提示词模板集中地。
 *
 * 提示词分三块：系统提示（角色、来源纪律、教学策略、输出格式）、用户提示
 * （本轮资料与学情）、以及元数据修复提示。所有提示都要求模型先输出面向
 * 学生的正文，再输出 `<<<TEACHING_META>>>` 分隔的结构化元数据；引擎据此
 * 只把正文流式展示给学生，并用真实资料对象回填引用（不信任模型给出的
 * 页码/原文）。
 */
import type { ModelInfo, ModelJsonRequest } from '../model/types.ts'
import type { ChatMessage } from '../contracts/session.ts'
import type { TeachingTurnInput } from '../contracts/teaching.ts'
import { activityKindCompatible, FORM_LABELS, heuristicClassify, languageInstruction, styleGuidance } from './strategy.ts'
import { formatList, formatLocator, truncate, truncatePreserveLines } from './format.ts'
import type {
  CrossCourseRefView, MaterialRefView, TeachingPlan, WebRefView,
} from './types.ts'

/** 正文与结构化元数据之间的分隔符；引擎按它切分流式输出。 */
export const META_MARKER = '<<<TEACHING_META>>>'

/** 构造系统提示所需上下文。 */
export interface TeachingPromptContext {
  readonly input: TeachingTurnInput
  readonly plan: TeachingPlan
  readonly materialRefs: readonly MaterialRefView[]
  readonly crossCourseRefs: readonly CrossCourseRefView[]
  readonly webRefs: readonly WebRefView[]
  readonly modelInfo?: ModelInfo
  readonly maxHistory: number
  readonly excerptChars: number
}

/** 结构化元数据的 JSON 要求（adapter 映射用；解析仍由本模块完成）。 */
export const TEACHING_META_JSON: ModelJsonRequest = {
  name: 'teaching_turn_meta',
  description: '教学回复尾部 JSON 元数据：意图、阶段、证据使用、活动提案、下一步与不确定性',
  fields: {
    intent: 'explain | diagnose | practice | feedback | review | switch-style | answer',
    stage: 'goal-setting | diagnosis | teaching | practice | transfer | review | idle',
    conceptIds: '字符串数组，只能使用课程修订中已有的概念 id',
    requestedForm: '学生要求切换的教学形式（没有则省略）',
    evidence: '{ usedMaterialRefs: M 编号数组, usedCrossCourseRefs: C 编号数组, usedWebRefs: W 编号数组, usedModelKnowledge: 布尔, derivations: [{label, premises: 编号数组}] }',
    conflicts: '[{kind: convention|substantive|unresolved, summary: 字符串, basisRefs: 编号数组}]',
    activity: '声明式活动对象或 null（kind 与 payload.type 必须匹配）',
    nextActions: '[{id: 字符串, label: 中文按钮文字}]',
    uncertainty: '字符串数组：学生需要知道的不确定性/待核对项',
    diagnosis: '{misconception, evidence, nextStep}，仅诊断时给出',
  },
}

/** 分类调用的 JSON 要求。 */
export const CLASSIFY_JSON: ModelJsonRequest = {
  name: 'teaching_turn_classification',
  description: '轻量判断学生意图、是否要求切换形式、是否想看答案',
  fields: {
    intent: 'explain | diagnose | practice | feedback | review | switch-style | answer',
    requestedForm: '学生要求的形式（原话短标签，没有则省略）',
    wantsFullAnswer: '布尔：学生是否在要完整答案',
    conceptIds: '字符串数组，只能使用课程已有的概念 id',
  },
}

/** 修复调用的 JSON 要求。 */
export const REPAIR_JSON: ModelJsonRequest = {
  name: 'teaching_turn_meta_repair',
  description: '从教学回复原文中提取/修复尾部 JSON 元数据',
  fields: {
    intent: 'explain | diagnose | practice | feedback | review | switch-style | answer',
    stage: 'goal-setting | diagnosis | teaching | practice | transfer | review | idle',
    conceptIds: '字符串数组',
    requestedForm: '字符串，可省略',
    evidence: '证据使用对象，可省略',
    conflicts: '冲突数组，可省略',
    activity: '活动对象或 null，可省略',
    nextActions: '按钮数组，可省略',
    uncertainty: '字符串数组，可省略',
  },
}

/** 活动 payload 的字段说明（按可用类型裁剪，控制提示长度）。 */
function activityPayloadReference(plan: TeachingPlan, stage: TeachingTurnInput['stage']): string {
  const all: readonly { readonly kind: string; readonly text: string }[] = [
    {
      kind: 'quiz',
      text: '{ "type":"quiz", "question":"题干", "options":[{"id":"a","label":"选项"}], "correctOptionIds":["a"], "multiple":false, "hint":"可选提示", "explanation":"可选解析" }',
    },
    {
      kind: 'open-question',
      text: '{ "type":"open-question", "prompt":"问题", "rubric":[{"id":"reasoning","label":"推理充分","weight":2,"description":"可观察标准"}], "referencePoints":["参考要点"] }',
    },
    {
      kind: 'proof-task',
      text: '{ "type":"proof-task", "claim":"要证明的命题", "assumptions":["前提"], "rubric":[{"id":"logic","label":"逻辑完整","weight":2}], "hint":"可选提示" }',
    },
    {
      kind: 'code-run',
      text: '{ "type":"code-run", "language":"python", "code":"可运行代码", "editable":true, "instructions":"任务说明", "tests":[{"name":"输出包含","type":"stdout-contains","value":"42"}] }',
    },
    {
      kind: 'derivation',
      text: '{ "type":"derivation", "claim":"结论", "steps":[{"id":"s1","latex":"a=b", "note":"依据", "dependsOn":[]}], "conclusion":"结论" }',
    },
    {
      kind: 'interactive-graph',
      text: '{ "type":"graph", "xRange":[-5,5], "yRange":[-5,5], "series":[{"id":"f","label":"f(x)","expr":"x^2"}], "params":[{"name":"a","label":"a","min":-2,"max":2,"step":0.1,"value":1}], "hint":"拖动参数观察" }',
    },
    {
      kind: 'static-figure',
      text: '{ "type":"figure", "variant":"concept-map", "nodes":[{"id":"n1","label":"概念"}], "edges":[{"from":"n1","to":"n2","label":"关系"}], "caption":"说明" }',
    },
    {
      kind: 'reading-task',
      text: '{ "type":"reading-task", "instructions":"阅读要求", "questions":["检查问题"] }（原文 anchors 由系统按 M 编号回填，不需要你提供）',
    },
    {
      kind: 'explanation',
      text: '{ "type":"explanation", "markdown":"讲解正文", "keyPoints":["要点"], "caveats":["边界"] }',
    },
    {
      kind: 'experiment-note',
      text: '{ "type":"experiment-note", "title":"实验记录", "markdown":"记录", "limitations":["局限"] }',
    },
  ]
  const usable = all.filter(entry => {
    const kind = entry.kind as Parameters<typeof activityKindCompatible>[2]
    return activityKindCompatible(plan, stage, kind)
  })
  return usable.map(entry => `- ${entry.text}`).join('\n')
}

/** 系统提示：角色、本轮计划、来源纪律、教学要求、输出格式。 */
export function buildTeachingSystemPrompt(ctx: TeachingPromptContext): string {
  const { input, plan, modelInfo } = ctx
  const requested = input.requestedForm
  const lines: string[] = [
    '你是「AI 知识库教学插件」的课程助教。你的目标是让学生最终能用自己的话解释概念、说明适用条件，并在新情境中独立迁移；不是只给出一个漂亮答案。',
    '',
    '## 本轮教学计划（必须执行，可随学生新信息微调）',
    `- 任务形态：${plan.taskShape}`,
    `- 讲解形式：${FORM_LABELS[plan.form]}`,
    `- 选择理由：${plan.formReason}`,
    `- 讲解骨架（按顺序覆盖，不要求标题照抄）：${plan.outline.map((item, index) => `${index + 1}) ${item}`).join(' ')}`,
    plan.diagnosisFirst ? '- 诊断优先：先复述学生当前理解并定位具体误解，再决定讲解或练习。' : '',
    plan.keepGoal ? '- 保留原目标：学生切换的是呈现形式，不是学习目标；请说明切换了什么、之后如何回到原进度。' : '',
    input.wantsFullAnswer === true ? '- 学生要求完整答案：给出完整答案，并明确标注“已展示答案”；不要把它当作学生独立完成。' : '- 默认逐层提示：先给方向性提示，不直接抛出完整答案；学生明确要求完整答案时才给全。',
    '',
    '## 来源纪律（必须遵守）',
    '1. 课程资料是课程主线。正文提到课程资料时只能使用下面给出的 M 编号（例如 [M1]）；不得编造页码、章节、原文或链接。',
    '2. 资料之外的知识要让学生能分辨：在正文中用“模型知识补充”或类似措辞说明；推导要写清依赖的前提。',
    '3. 外部网页只能使用 W 编号；没有 W 编号时不得声称已联网核实或给出“最新”结论，应把它列为不确定性。',
    '4. 资料不足或未检索到资料时明确说明，不得虚构出处；可以继续讲解模型知识，但要标注。',
    '5. 资料之间或资料与模型知识冲突时：区分「约定差异」（符号、记法、术语习惯不同，不是实质错误）与「实质错误」；给出依据（M 编号或推理），无法确定时保留为未决疑问，不要强行裁决。',
    '6. 下面列出的「资料不确定性」必须进入 uncertainty 元数据，并在正文中需要时向学生说明。',
    '7. 活动 sourceRefs 由系统按 M 编号回填；你不需要也不得提供 anchor。',
    '8. 若本轮提供「更早对话的压缩检查点」，它只是既定背景摘要：不要复述检查点本身；它不是课程资料证据，不能当作 M/C/W 引用来源；涉及资料事实时仍以本轮 M 编号与原文为准。',
    '',
    '## 教学行为要求',
    '- 概念讲解：直觉 → 准确表述 → 适用条件 → 类比边界；类比要说明在哪些地方会失效。',
    '- 证明/细节：按学生目标展开；先给证明骨架与每步依据，再补细节，不要跳步。',
    '- 程序/实验：给可运行的最小示例，说明预期输出与验证方式；区分“运行通过”和“结论正确”。',
    '- 阅读任务：把问题定位到原文（M 编号），给可检查的阅读问题，而不是复述整段。',
    '- 概念辨析：先给判据，再给易混反例，最后给应用判断；不要只给定义。',
    '- 开放式论证：拆解问题、给立场与理由、考虑反驳与边界，明确哪些是未决问题。',
    '- 诊断：当学生答案错误或含糊时，指出具体是哪一步/哪个前提出错（引用学生原话），给一个针对性追问或诊断活动，而不是只公布正确答案。',
    '- 学情适配：参考「学习状态」调整深度；已掌握的概念不要重复长篇讲解，未接触的概念先建直觉。',
    '- 下一步：用 nextActions 给出 1–3 个学生可点的下一步（如开始练习、看提示、看完整答案、回到当前练习）。',
    '',
    '## 可视化教学（Host 负责生成）',
    '- 先确定一个教学点：控制量（只主动改变一个参数）、观测量、不变量、结论与适用条件；能用一句话说明“改变什么，注意观察什么”。',
    '- 普通函数/简单数据图优先用声明式 graph/figure 活动。结构、几何、流程、交互演示等需要自定义绘制时，正文用一两句话说明图要展示的关系、观察重点和局限，**不要在主回复里写 SVG/HTML/Mermaid 源码，也不要声称已经画好**——Host 会调用专门的视觉生成步骤，把安全沙箱中的可视化显示在右侧教学区。',
    '- 视觉是直觉辅助，不是证明：不要声称“图证明了结论”；有限图/有限步只能展示趋势，结论仍需文字推理或证明；视觉活动不单独作为掌握证据。',
    '- 没有视觉收益时用文字/表格，不要为了凑图而要求可视化。',
    '',
    '## 活动提案规则（activity 字段）',
    '- 活动必须服务于本轮学习目标；kind 与 payload.type 必须匹配，payload 只能包含下列声明式字段。',
    '- practice/transfer 阶段优先给可检验的练习；学生已看答案或要求答案时 independent 必须为 false。',
    '- 题目要能被客观验证或按 rubric 评价：quiz 必须给 correctOptionIds（且是 options 子集）；开放/证明题必须给 rubric。',
    '- 不需要活动时 activity 为 null；不要为了凑活动而编造。',
    '可用 payload（按本轮形态裁剪）：',
    activityPayloadReference(plan, input.stage),
    '',
    '## 语言',
    `- ${languageInstruction(plan.language, input.profile)}`,
    ...styleGuidance(input.profile).map(item => `- ${item}`),
    '',
    '## 模型能力事实',
    modelInfo === undefined
      ? '- 当前模型能力未知：不要声称能看图、能联网或能运行代码；需要这些能力时列为不确定性。'
      : `- 当前模型：${modelInfo.provider}/${modelInfo.model}；图像输入：${modelInfo.imageInput}。${modelInfo.imageInput === 'yes' ? '' : '不要声称直接看过图片；图形内容只能依据文字抽取结果。'} 不要声称已联网（外部结果由 Host 提供）。`,
    '',
    '## 输出格式（必须严格遵守）',
    '1. 先输出面向学生的 Markdown 讲解正文。',
    `2. 正文结束后另起一行输出 ${META_MARKER}，紧接着输出一个 JSON 对象（不要代码围栏、不要 JSON 之外的文字）。`,
    '3. JSON 字段如下（没有内容的字段可省略或给空数组；activity 没有时给 null）：',
    '```json',
    '{',
    '  "intent": "explain | diagnose | practice | feedback | review | switch-style | answer",',
    '  "stage": "goal-setting | diagnosis | teaching | practice | transfer | review | idle",',
    '  "conceptIds": ["课程修订中已有的概念 id"],',
    '  "requestedForm": "学生要求的形式标签（可省略）",',
    '  "evidence": { "usedMaterialRefs": ["M1"], "usedCrossCourseRefs": [], "usedWebRefs": [], "usedModelKnowledge": false, "derivations": [{ "label": "推导名", "premises": ["M1"] }] },',
    '  "conflicts": [{ "kind": "convention | substantive | unresolved", "summary": "冲突说明", "basisRefs": ["M1"] }],',
    '  "activity": null,',
    '  "nextActions": [{ "id": "start-practice", "label": "开始练习" }],',
    '  "uncertainty": ["学生需要知道的不确定性"],',
    '  "diagnosis": { "misconception": "误解", "evidence": "学生原话/步骤", "nextStep": "下一步" }',
    '}',
    '```',
    '- evidence 只能引用本轮实际给出的 M/C/W 编号；没有使用课程资料时 usedMaterialRefs 为空数组，并把 usedModelKnowledge 设为 true。',
    requested !== undefined
      ? `- 学生本轮明确要求的形式是「${truncate(requested, 60)}」；在 requestedForm 字段回填它，并保留原学习目标。`
      : '',
  ]
  return lines.filter(line => line !== '').join('\n')
}

/** 压缩检查点摘要的字符上限（保留换行；超出时截断并标注）。 */
const CONTEXT_CHECKPOINT_SUMMARY_LIMIT = 6000

/**
 * 较早对话的压缩检查点（Host 在上下文被压缩时提供）。
 * 它是既定背景，不是资料证据：不能当作 M/C/W 引用来源，也不应被复述。
 */
function buildContextCheckpointLines(input: TeachingTurnInput): string[] {
  const checkpoint = input.contextCheckpoint
  if (checkpoint === undefined) return []
  const summary = truncatePreserveLines(checkpoint.summary, CONTEXT_CHECKPOINT_SUMMARY_LIMIT)
  return [
    '## 更早对话的压缩检查点',
    '（这是较早对话的摘要，作为既定背景继续教学；不要复述检查点本身。它只是上下文，不是课程资料证据，不能当作 M/C/W 引用来源；其中的事实仍需按来源纪律核对，涉及资料内容时以本轮资料编号与原文为准。）',
    ...(checkpoint.compactedAt === undefined ? [] : [`- 压缩时间：${checkpoint.compactedAt}`]),
    summary === '' ? '（检查点内容为空）' : summary,
    '',
  ]
}

/** 用户提示：本轮资料、学情、最近对话与资料不确定性。 */
export function buildTeachingUserPrompt(ctx: TeachingPromptContext): string {
  const { input, plan, materialRefs, crossCourseRefs, webRefs, excerptChars, maxHistory } = ctx
  const concept = input.currentConceptId === undefined
    ? undefined
    : input.courseRevision.concepts.find(item => item.id === input.currentConceptId)
  const learningLines = input.learning.length === 0
    ? ['（尚无已记录的学习状态）']
    : input.learning.map(item => {
      const title = input.courseRevision.concepts.find(conceptItem => conceptItem.id === item.conceptId)?.title
      const basis = item.basis.length === 0 ? '无依据记录' : truncate(item.basis.join('；'), 400)
      return `- ${item.conceptId}${title === undefined ? '' : `（${title}）`}：${item.level}；依据：${basis}`
    })

  const materialLines = materialRefs.length === 0
    ? ['（本轮没有检索到课程资料；讲解只能依据模型知识/推导，必须明确标注。）']
    : materialRefs.map(ref => [
      `[${ref.refId}] ${ref.documentTitle} · ${ref.label}（${ref.locator}；抽取置信度 ${ref.confidence}）`,
      `> ${truncate(ref.excerpt, excerptChars)}`,
    ].join('\n'))

  const crossLines = crossCourseRefs.length === 0
    ? ['（本轮没有允许使用的跨课程资料）']
    : crossCourseRefs.map(ref => {
      const anchors = ref.anchors.map(anchor => `${formatLocator(anchor.locator)}：${truncate(anchor.excerpt, Math.min(excerptChars, 160))}`)
      return `[${ref.refId}] 课程《${ref.courseTitle}》 · 关联原因：${ref.reason}${anchors.length === 0 ? '' : `\n  ${anchors.join('\n  ')}`}`
    })

  const webLines = webRefs.length === 0
    ? ['（本轮没有外部检索结果；不得声称已联网核实）']
    : webRefs.map(ref => `[${ref.refId}] ${ref.title} — ${ref.url}\n> ${truncate(ref.snippet, Math.min(excerptChars, 200))}`)

  const historyLines = input.history.length === 0
    ? ['（无）']
    : input.history.slice(-maxHistory).map(message => {
      const role = message.role === 'student' ? '学生' : message.role === 'teacher' ? '助教' : '系统'
      return `- ${role}（${message.kind}）：${truncate(message.text, 300)}`
    })

  const warningLines = input.materialWarnings.length === 0
    ? ['（无）']
    : input.materialWarnings.map(warning => `- ${truncate(warning, 300)}`)

  const lines: string[] = [
    '## 学生本轮消息',
    truncate(input.studentText, 2000),
    '',
    '## 学生档案',
    `- 语言偏好：${plan.language}（原文术语${input.profile.preferences.keepOriginalTerms === false ? '可省略' : '保留'}）`,
    ...(input.profile.goals === undefined ? [] : [`- 长期目标：${truncate(input.profile.goals, 300)}`]),
    ...(input.profile.background === undefined ? [] : [`- 自述基础：${truncate(input.profile.background, 300)}`]),
    ...(input.profile.preferences.style === undefined ? [] : [`- 教学风格偏好：${truncate(input.profile.preferences.style, 120)}`]),
    '',
    '## 课程',
    `- 课程：《${input.course.title}》`,
    ...(input.course.description.trim() === '' ? [] : [`- 课程描述：${truncate(input.course.description, 300)}`]),
    `- 课程修订：v${input.courseRevision.version}（${input.courseRevision.state}）`,
    ...(input.courseRevision.goals.length === 0 ? [] : [`- 课程目标：${input.courseRevision.goals.map(goal => truncate(goal, 160)).join('；')}`]),
    '',
    '## 当前概念',
    concept === undefined
      ? '- （未指定当前概念；请根据学生问题判断，并在 conceptIds 中回填课程修订里最相关的概念 id）'
      : [
        `- id：${concept.id}`,
        `- 标题：${concept.title}`,
        `- 摘要：${truncate(concept.summary, 400)}`,
        concept.difficulty === undefined ? '' : `- 难度：${concept.difficulty}`,
        concept.prerequisites.length === 0 ? '' : `- 先修概念：${concept.prerequisites.join('、')}`,
        concept.misconceptions === undefined || concept.misconceptions.length === 0
          ? ''
          : `- 常见误解：${concept.misconceptions.map(item => truncate(item, 160)).join('；')}`,
        concept.checkIdeas === undefined || concept.checkIdeas.length === 0
          ? ''
          : `- 可检验点：${concept.checkIdeas.map(item => truncate(item, 160)).join('；')}`,
      ].filter(line => line !== '').join('\n'),
    '',
    '## 学习状态（按概念）',
    ...learningLines,
    '',
    '## 本轮上下文',
    `- 学习阶段：${input.stage}`,
    `- 学生要求的形式：${input.requestedForm === undefined ? '（无）' : input.requestedForm}`,
    `- 是否要求完整答案：${input.wantsFullAnswer === true ? '是' : '否'}`,
    `- 本轮建议活动类型：${plan.activityKindHint}`,
    '',
    ...buildContextCheckpointLines(input),
    '## 最近对话（由旧到新）',
    ...historyLines,
    '',
    '## 课程资料（只能引用这些 M 编号）',
    ...materialLines,
    '',
    '## 跨课程资料（C 编号，仅在确实帮助理解时使用，并说明关联与来源）',
    ...crossLines,
    '',
    '## 外部检索结果（W 编号）',
    ...webLines,
    '',
    '## 资料不确定性（必须进入 uncertainty 元数据）',
    ...warningLines,
    '',
    '## 课程修订中的概念 id（conceptIds 只能从这里取）',
    input.courseRevision.concepts.length === 0
      ? '（课程修订没有概念）'
      : input.courseRevision.concepts.map(item => `- ${item.id}：${item.title}`).join('\n'),
  ]
  return lines.join('\n')
}

/** 分类系统提示（轻量、一次小调用）。 */
export function buildClassifySystemPrompt(): string {
  return [
    '你是教学流程的轻量分类器，只判断学生最新一句话的意图，不写讲解。',
    '判断：intent（explain/diagnose/practice/feedback/review/switch-style/answer）、是否要求切换教学形式（requestedForm）、是否在要完整答案（wantsFullAnswer）、涉及哪些已有概念 id。',
    `只输出一个 JSON 对象，不要代码围栏。字段：intent、requestedForm、wantsFullAnswer、conceptIds。`,
  ].join('\n')
}

/** 分类用户提示。 */
export function buildClassifyUserPrompt(input: TeachingTurnInput): string {
  const concept = input.currentConceptId === undefined
    ? undefined
    : input.courseRevision.concepts.find(item => item.id === input.currentConceptId)
  const history = input.history.slice(-4).map(message => `${message.role === 'student' ? '学生' : '助教'}：${truncate(message.text, 160)}`)
  const fallback = heuristicClassify(input)
  return [
    `学习阶段：${input.stage}`,
    `当前概念：${concept === undefined ? '（未指定）' : `${concept.id}（${concept.title}）`}`,
    `学生消息：${truncate(input.studentText, 800)}`,
    `最近对话：${history.length === 0 ? '（无）' : history.join(' / ')}`,
    `规则兜底参考：intent=${fallback.intent ?? 'explain'}${fallback.requestedForm === undefined ? '' : `，requestedForm=${fallback.requestedForm}`}`,
    `可用概念 id：${input.courseRevision.concepts.map(item => item.id).join('、') || '（无）'}`,
    '只输出 JSON。',
  ].join('\n')
}

/** 元数据修复系统提示。 */
export function buildMetadataRepairSystemPrompt(): string {
  return [
    '你是结构化数据修复器。给你一段教学回复原文（可能包含正文和格式错误的元数据）。',
    '请只提取/修复教学元数据，输出一个 JSON 对象，不要输出解释、不要代码围栏。',
    '无法确定的字段可以省略；activity 若无法解析为合法对象就设为 null，不要编造。',
  ].join('\n')
}

/** 元数据修复用户提示。 */
export function buildMetadataRepairPrompt(rawText: string): string {
  return [
    '以下是原始教学回复（最多 6000 字）：',
    '```',
    truncate(rawText, 6000),
    '```',
    '期望字段：intent、stage、conceptIds、requestedForm、evidence（usedMaterialRefs/usedCrossCourseRefs/usedWebRefs/usedModelKnowledge/derivations）、conflicts、activity、nextActions、uncertainty、diagnosis。',
    '只输出 JSON 对象。',
  ].join('\n')
}

/** 便于测试/诊断：把消息列表压成单行摘要（不发送给模型）。 */
export function summarizeHistory(messages: readonly ChatMessage[]): string {
  return formatList(messages.map(message => `${message.role}:${truncate(message.text, 40)}`), '（无）')
}
