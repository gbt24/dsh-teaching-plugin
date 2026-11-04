/**
 * TeachingService 实现：一轮学生输入 → 流式教学事件。
 *
 * 模型调用只经过注入的 {@link ModelClient}（Host adapter 用宿主当前模型），
 * 本模块不联网、不 import Harness、不写持久状态。流程：
 *   1. 用纯函数策略选择讲解形式/骨架（strategy.ts）；
 *   2. 用集中模板构造提示（prompts.ts），流式接收正文，同时把尾部元数据
 *      缓冲起来不展示给学生；
 *   3. 解析/修复元数据（parse.ts）；解析失败只降级、不抛异常；
 *   4. 用 Host 提供的真实资料回填 EvidenceReference（不信任模型给的页码）；
 *   5. 校验活动提案，输出 evidence/activity/position/done。
 */
import type { ModelClient, ModelInfo, ModelRequest } from '../model/types.ts'
import type { ConceptId } from '../contracts/ids.ts'
import type { AppError } from '../contracts/result.ts'
import { isAbort, toAppError } from '../contracts/result.ts'
import type { EvidenceKind, ModelUsageRecord, TeachingTurnMeta } from '../contracts/session.ts'
import type {
  ActivityProposal, TeachingService, TeachingStreamEvent, TeachingTurnInput,
} from '../contracts/teaching.ts'
import {
  buildClassifySystemPrompt, buildClassifyUserPrompt, buildMetadataRepairPrompt,
  buildMetadataRepairSystemPrompt, buildTeachingSystemPrompt, buildTeachingUserPrompt,
  CLASSIFY_JSON, META_MARKER, REPAIR_JSON,
} from './prompts.ts'
import {
  buildCrossCourseRefs, buildEvidenceReferences, buildMaterialRefs, buildWebRefs,
  dedupeStrings, modelErrorToAppError, normalizeActivityProposal, parseTurnMetaObject,
  parseTurnMetaText, splitTurnOutput,
} from './parse.ts'
import type {
  CrossCourseRefView, MaterialRefView, ParsedTurnMeta, TeachingServiceOptions, WebRefView,
} from './types.ts'
import {
  activityCanBeIndependent, buildNextActions, decideNextPosition, detectRequestedForm,
  heuristicClassify, planTeachingTurn, resolveLanguage,
} from './strategy.ts'
import { nowIso } from '../contracts/ids.ts'

/** 取消判断放在函数里，避免可选链属性收窄在 await 之后失效。 */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal !== undefined && signal.aborted
}

/** 流式收集的结果：完整文本、已展示字符数、用量与错误。 */
interface ModelTurnResult {
  readonly text: string
  /** 已经作为 delta 发给学生的字符数（用于避免元数据泄漏/重复）。 */
  readonly emitted: number
  readonly usage?: ModelUsageRecord
  readonly error?: AppError
}

/** 从模型流中收集文本；元数据分隔符之后的内容不展示给学生。 */
async function* streamModelTurn(
  model: ModelClient,
  request: ModelRequest,
  signal: AbortSignal | undefined,
): AsyncGenerator<TeachingStreamEvent, ModelTurnResult, void> {
  let fullText = ''
  let emitted = 0
  let markerFound = false
  let usage: ModelUsageRecord | undefined
  let error: AppError | undefined
  const holdBack = Math.max(META_MARKER.length * 2, 96)

  try {
    for await (const event of model.stream(request, signal)) {
      if (isAborted(signal)) {
        error = { code: 'cancelled', message: '本轮教学已取消' }
        break
      }
      if (event.type === 'text') {
        fullText += event.text
        if (!markerFound) {
          const markerIndex = fullText.indexOf(META_MARKER)
          if (markerIndex !== -1) {
            markerFound = true
            if (markerIndex > emitted) {
              yield { type: 'delta', text: fullText.slice(emitted, markerIndex) }
              emitted = markerIndex
            }
          } else {
            const safeEnd = Math.max(emitted, fullText.length - holdBack)
            if (safeEnd > emitted) {
              yield { type: 'delta', text: fullText.slice(emitted, safeEnd) }
              emitted = safeEnd
            }
          }
        }
      } else if (event.type === 'usage') {
        usage = event.usage
      } else if (event.type === 'done') {
        if (fullText === '') fullText = event.text
        usage = event.usage
      } else {
        error = modelErrorToAppError(event.error.code, event.error.message)
        break
      }
    }
  } catch (cause) {
    error = isAbort(cause)
      ? { code: 'cancelled', message: '本轮教学已取消' }
      : toAppError(cause, '模型调用失败')
  }
  return {
    text: fullText,
    emitted,
    ...(usage === undefined ? {} : { usage }),
    ...(error === undefined ? {} : { error }),
  }
}

/** 安全读取模型能力；失败时按“能力未知”处理，不阻断教学。 */
async function safeModelInfo(model: ModelClient): Promise<ModelInfo | undefined> {
  try {
    return await model.info()
  } catch {
    return undefined
  }
}

/** 一次元数据修复调用（最多一次；失败即降级纯文本）。 */
async function repairTurnMeta(
  model: ModelClient,
  rawText: string,
  input: TeachingTurnInput,
  signal: AbortSignal | undefined,
): Promise<{ readonly meta?: ParsedTurnMeta; readonly error?: string }> {
  if (isAborted(signal)) return { error: '已取消' }
  try {
    const completion = await model.complete({
      system: buildMetadataRepairSystemPrompt(),
      messages: [{ role: 'user', text: buildMetadataRepairPrompt(rawText) }],
      json: REPAIR_JSON,
      sessionId: input.sessionId,
      purpose: 'other',
      language: resolveLanguage(input),
      maxTokens: 900,
      temperature: 0,
    }, signal)
    if (completion.json !== undefined) {
      const parsed = parseTurnMetaObject(completion.json)
      if (parsed.meta !== undefined) return parsed
    }
    if (completion.text.trim() !== '') return parseTurnMetaText(completion.text)
    return { error: completion.parseError ?? '修复调用没有返回内容' }
  } catch (cause) {
    if (isAbort(cause)) return { error: '已取消' }
    return { error: cause instanceof Error ? cause.message : String(cause) }
  }
}

/** 概念 id 只保留课程修订里真实存在的 id。 */
function filterConceptIds(input: TeachingTurnInput, ids: readonly string[] | undefined): ConceptId[] {
  if (ids === undefined || ids.length === 0) {
    return input.currentConceptId === undefined ? [] : [input.currentConceptId]
  }
  const allowed = new Set(input.courseRevision.concepts.map(concept => concept.id as string))
  const filtered: ConceptId[] = []
  for (const id of ids) {
    if (allowed.has(id)) filtered.push(id as ConceptId)
  }
  if (filtered.length === 0) {
    return input.currentConceptId === undefined ? [] : [input.currentConceptId]
  }
  return filtered
}

/** 把模型分类 JSON 合并到轻量规则结果；模型失败时完全用规则兜底。 */
function parseClassifyValue(value: unknown): {
  readonly intent?: TeachingTurnMeta['intent']
  readonly requestedForm?: string
  readonly conceptIds?: readonly string[]
  readonly wantsFullAnswer?: boolean
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const parsed = parseTurnMetaObject(record)
  const meta = parsed.meta
  const wantsFullAnswer = typeof record.wantsFullAnswer === 'boolean' ? record.wantsFullAnswer : undefined
  return {
    intent: meta?.intent,
    requestedForm: meta?.requestedForm,
    conceptIds: meta?.conceptIds,
    wantsFullAnswer,
  }
}

/** 创建 TeachingService；所有依赖通过参数注入，便于 Host 与测试复用。 */
export function createTeachingService(options: TeachingServiceOptions = {}): TeachingService {
  const maxMaterial = options.maxMaterial ?? 8
  const maxHistory = options.maxHistory ?? 8
  const excerptChars = options.excerptChars ?? 400
  const maxCrossCourse = options.maxCrossCourse ?? 3
  const maxWebResults = options.maxWebResults ?? 4
  const maxTokens = options.maxTokens ?? 1600
  const temperature = options.temperature ?? 0.6
  const clock = options.clock ?? nowIso

  return {
    async *respond(
      input: TeachingTurnInput,
      model: ModelClient,
      signal?: AbortSignal,
    ): AsyncGenerator<TeachingStreamEvent, void, void> {
      if (isAborted(signal)) {
        yield { type: 'error', error: { code: 'cancelled', message: '本轮教学已取消' } }
        return
      }

      const plan = planTeachingTurn(input)
      const materialRefs = buildMaterialRefs(input, maxMaterial, excerptChars)
      const crossCourseRefs = buildCrossCourseRefs(input, maxCrossCourse)
      const webRefs = buildWebRefs(input, maxWebResults)

      yield { type: 'phase', label: '分析目标、学情与资料' }
      const modelInfo = await safeModelInfo(model)
      if (isAborted(signal)) {
        yield { type: 'error', error: { code: 'cancelled', message: '本轮教学已取消' } }
        return
      }
      const promptCtx = {
        input,
        plan,
        materialRefs,
        crossCourseRefs,
        webRefs,
        ...(modelInfo === undefined ? {} : { modelInfo }),
        maxHistory,
        excerptChars,
      }
      const request: ModelRequest = {
        system: buildTeachingSystemPrompt(promptCtx),
        messages: [{ role: 'user', text: buildTeachingUserPrompt(promptCtx) }],
        sessionId: input.sessionId,
        purpose: 'chat',
        language: plan.language,
        maxTokens,
        temperature,
      }

      yield { type: 'phase', label: '生成讲解（含来源与活动整理）' }
      const turn = yield* streamModelTurn(model, request, signal)
      if (turn.error !== undefined) {
        // 已生成的部分内容保留在 details 中，Host 可显示“已完成内容 + 继续路径”。
        const partial = turn.text.trim()
        const error = partial === ''
          ? turn.error
          : {
            ...turn.error,
            details: { ...(turn.error.details ?? {}), partial: true, partialText: partial.slice(0, 2000) },
          }
        yield { type: 'error', error }
        return
      }

      // 切分正文与尾部元数据；元数据若已被流式展示，则不再用它切正文。
      const split = splitTurnOutput(turn.text)
      let body = split.body
      let parseFailure: string | undefined
      let metadataText = split.metadataText
      if (metadataText !== undefined && (split.metadataStart ?? 0) < turn.emitted) {
        parseFailure = '模型未按约定分隔元数据，部分元数据已被展示'
        metadataText = undefined
        body = turn.text.trimEnd()
      }

      let meta: ParsedTurnMeta | undefined
      if (metadataText !== undefined) {
        const parsed = parseTurnMetaText(metadataText)
        if (parsed.meta !== undefined) {
          meta = parsed.meta
        } else {
          parseFailure = parsed.error ?? '元数据解析失败'
          const repaired = await repairTurnMeta(model, turn.text, input, signal)
          if (repaired.meta !== undefined) meta = repaired.meta
          else if (parseFailure === undefined) parseFailure = repaired.error
        }
      } else if (parseFailure === undefined) {
        // 完全没有分隔符：先尝试一次修复调用，失败则纯文本降级。
        const repaired = await repairTurnMeta(model, turn.text, input, signal)
        if (repaired.meta !== undefined) meta = repaired.meta
        else parseFailure = repaired.error ?? '模型没有输出结构化元数据'
      }

      if (isAborted(signal)) {
        yield { type: 'error', error: { code: 'cancelled', message: '本轮教学已取消' } }
        return
      }

      // 补发正文剩余部分（尾部缓冲尚未展示）。
      if (body.length > turn.emitted) {
        yield { type: 'delta', text: body.slice(turn.emitted) }
      }

      const fallback = heuristicClassify(input)
      const intent = meta?.intent ?? fallback.intent
      const position = decideNextPosition(input, { intent, stage: meta?.stage })
      const conceptIds = filterConceptIds(input, meta?.conceptIds)
      const requestedForm = input.requestedForm
        ?? detectRequestedForm(input.studentText)?.label
        ?? meta?.requestedForm

      const evidence = buildEvidenceReferences(meta, {
        input, materialRefs, crossCourseRefs, webRefs, now: clock(),
      })
      const activityResult = normalizeActivityProposal(meta?.activity, {
        input,
        plan,
        evidenceRefs: evidence.refs,
        independent: activityCanBeIndependent(input, { intent }),
        conceptIds: input.courseRevision.concepts.map(concept => concept.id),
      })

      // 不确定性：模型声明 + 资料警告 + 冲突 + 引用/活动校验问题 + 解析降级。
      const uncertaintyParts: string[] = []
      if (meta?.uncertainty !== undefined) uncertaintyParts.push(...meta.uncertainty)
      for (const warning of input.materialWarnings) uncertaintyParts.push(`资料不确定：${warning}`)
      for (const conflict of meta?.conflicts ?? []) {
        const kindLabel = conflict.kind === 'convention'
          ? '约定差异，可能是符号/记法习惯不同，不一定是错误'
          : conflict.kind === 'substantive' ? '实质错误' : '未决疑问'
        const basis = conflict.basisRefs === undefined || conflict.basisRefs.length === 0
          ? '依据未提供'
          : `依据：${conflict.basisRefs.join('、')}`
        uncertaintyParts.push(`资料冲突（${kindLabel}）：${conflict.summary}（${basis}）`)
      }
      uncertaintyParts.push(...evidence.warnings)
      uncertaintyParts.push(...activityResult.warnings)
      if (parseFailure !== undefined) {
        uncertaintyParts.push(`结构化元数据解析失败（${parseFailure}）；本轮按纯文本讲解，未记录逐条来源或活动。`)
      }

      // 局限：资料不足、外部能力缺失、模型能力不足、解析降级。
      const limitations: string[] = []
      if (input.material.length === 0) {
        limitations.push('本轮未检索到可用的课程资料，讲解主要依据模型知识；关键定义请对照课程原文核对。')
      }
      if (input.webResults === undefined) {
        if (/联网|最新|外部|官网|核实|latest|external|current/i.test(input.studentText)) {
          limitations.push('本轮未使用联网核实（Host 未提供外部检索结果）；涉及最新/外部信息的陈述可能过时。')
        }
      } else if (input.webResults.length === 0) {
        limitations.push('外部检索已尝试但没有可用结果，本轮未使用外部来源。')
      }
      if (modelInfo?.imageInput === 'no'
        && input.materialWarnings.some(warning => /图|扫描|OCR|公式|figure|formula|scan/i.test(warning))) {
        limitations.push('当前模型不支持图像输入；图形/扫描内容仅依据资料抽取文本，可能不完整。')
      }
      if (parseFailure !== undefined) {
        limitations.push('本轮结构化元数据解析失败，已降级为纯文本讲解；未创建活动或未记录逐条来源。')
      }

      const uniqueUncertainty = dedupeStrings(uncertaintyParts)
      const uniqueLimitations = dedupeStrings(limitations)
      const nextActions = dedupeActions([
        ...(meta?.nextActions ?? []),
        ...buildNextActions(input, { intent, stage: position.stage }, plan),
      ])

      const metaOut: TeachingTurnMeta = {
        intent,
        stage: position.stage,
        conceptIds,
        ...(requestedForm === undefined ? {} : { requestedForm }),
        evidenceKinds: dedupeEvidenceKinds(evidence.refs),
        uncertainty: uniqueUncertainty,
        nextActions,
      }

      if (evidence.refs.length > 0) {
        yield { type: 'evidence', refs: evidence.refs }
      }
      if (activityResult.proposal !== undefined) {
        yield { type: 'activity', proposal: activityResult.proposal }
      }
      yield { type: 'position', stage: position.stage, conceptId: position.conceptId }

      let text = body.trim()
      if (text === '') {
        text = '（本轮模型没有返回可显示的讲解正文，请重试或换一种问法。）'
        uniqueUncertainty.push('模型返回正文为空。')
      }
      yield {
        type: 'done',
        text,
        meta: { ...metaOut, uncertainty: uniqueUncertainty },
        evidenceRefs: evidence.refs,
        uncertainty: uniqueUncertainty,
        limitations: uniqueLimitations,
      }
    },

    async classify(
      input: TeachingTurnInput,
      model: ModelClient,
      signal?: AbortSignal,
    ): Promise<TeachingTurnMeta> {
      const fallback = heuristicClassify(input)
      if (isAborted(signal)) return fallback
      try {
        const completion = await model.complete({
          system: buildClassifySystemPrompt(),
          messages: [{ role: 'user', text: buildClassifyUserPrompt(input) }],
          json: CLASSIFY_JSON,
          sessionId: input.sessionId,
          purpose: 'diagnosis',
          language: resolveLanguage(input),
          maxTokens: 300,
          temperature: 0,
        }, signal)
        let parsed = parseClassifyValue(completion.json)
        if (parsed.intent === undefined && parsed.requestedForm === undefined
          && parsed.conceptIds === undefined && parsed.wantsFullAnswer === undefined
          && completion.text.trim() !== '') {
          parsed = parseClassifyValue(parseTurnMetaText(completion.text).meta)
        }
        const wantsFullAnswer = parsed.wantsFullAnswer === true
          || input.wantsFullAnswer === true
          || fallback.intent === 'answer'
        const intent = wantsFullAnswer ? 'answer' : (parsed.intent ?? fallback.intent)
        const conceptIds = filterConceptIds(input, parsed.conceptIds)
        const requestedForm = parsed.requestedForm
          ?? (input.requestedForm !== undefined
            ? input.requestedForm
            : detectRequestedForm(input.studentText)?.label)
        return {
          intent,
          stage: input.stage,
          conceptIds: conceptIds.length > 0 ? conceptIds : (fallback.conceptIds ?? []),
          ...(requestedForm === undefined ? {} : { requestedForm }),
          nextActions: [],
        }
      } catch {
        // 分类失败不阻断教学流程：用规则兜底。
        return fallback
      }
    },
  }
}

/** 合并 nextActions 并按 id 去重（模型按钮在前，默认按钮在后）。 */
function dedupeActions(
  actions: readonly { readonly id: string; readonly label: string }[],
): readonly { readonly id: string; readonly label: string }[] {
  const seen = new Set<string>()
  const out: { id: string; label: string }[] = []
  for (const action of actions) {
    if (seen.has(action.id)) continue
    seen.add(action.id)
    out.push({ id: action.id, label: action.label })
  }
  return out.slice(0, 4)
}

/** 证据类型去重（用于 meta.evidenceKinds）。 */
function dedupeEvidenceKinds(refs: readonly { readonly kind: string }[]): TeachingTurnMeta['evidenceKinds'] {
  const seen = new Set<string>()
  const out: EvidenceKind[] = []
  for (const ref of refs) {
    const kind = ref.kind as EvidenceKind
    if (seen.has(kind)) continue
    seen.add(kind)
    out.push(kind)
  }
  return out
}
