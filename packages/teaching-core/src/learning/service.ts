/**
 * LearningService 实现：尝试 → 独立性/验证 → 掌握证据 → 复习建议。
 *
 * - 持久化只经注入的 {@link LearningRepository}（storage/repositories.ts）；
 * - 时间经注入的 clock（默认 Date.now），便于测试遗忘间隔；
 * - 客观验证（Host 传入的 quiz/run 结果）优先于模型 rubric 评分；
 * - rubric 评分器经 options.rubric 注入（Host 用 createModelRubricAssessor），
 *   失败/坏 JSON 降级为 unverified，不假装通过、不抛异常穿透；
 * - 争议/重检/资料变化只追加说明，不删除历史尝试与依据。
 */
import type { RubricCriterion } from '../contracts/activity.ts'
import type {
  AttemptOutcome, AttemptValidation, CourseLearningRecord, LearningAttempt, MasteryDispute,
  MasteryRecord, ReviewItem,
} from '../contracts/learning.ts'
import type { LearningService, SubmitAttemptInput } from '../contracts/learning-service.ts'
import type {
  AppErrorCode, Result,
} from '../contracts/result.ts'
import { err, ok } from '../contracts/result.ts'
import type { ActivityId, ConceptId, CourseId, CourseRevisionId, SessionId } from '../contracts/ids.ts'
import { newId, nowIso } from '../contracts/ids.ts'
import type { LearningRepository } from '../storage/repositories.ts'
import { classifyIndependence } from './independence.ts'
import type { RubricAssessor } from './rubric.ts'
import { degradedValidation } from './rubric.ts'
import { buildMasteryRecord, deriveMasteryLevel } from './mastery.ts'
import { computeReviewItems } from './review.ts'

/** Host 用活动 payload 解析 rubric（可以是同步/异步）。 */
export type RubricResolver = (
  input: SubmitAttemptInput,
) => readonly RubricCriterion[] | undefined | Promise<readonly RubricCriterion[] | undefined>

/** LearningService 的可选依赖。 */
export interface LearningServiceOptions {
  readonly repository: LearningRepository
  /** 注入时钟（默认 Date.now）；所有遗忘间隔/复习到期都以它为准。 */
  readonly clock?: () => Date
  /** 开放题/证明题的 rubric 评分路径；Host 用 createModelRubricAssessor 构造。 */
  readonly rubric?: {
    readonly resolve: RubricResolver
    readonly assess: RubricAssessor
  }
  /** 无学习记录时读取课程修订 id（Host 可传 CourseRepository 的 active revision）。 */
  readonly resolveRevisionId?: (
    courseId: CourseId,
  ) => CourseRevisionId | undefined | Promise<CourseRevisionId | undefined>
  /** 后续课程需要的概念（用于 upcoming-course-need 复习项）。 */
  readonly upcomingConceptIds?: (
    courseId: CourseId,
  ) => readonly ConceptId[] | Promise<readonly ConceptId[]>
  /** 复习建议的“即将到期”窗口，默认 7 天。 */
  readonly reviewHorizonDays?: number
}

/** 空学习记录（尚未产生任何尝试时 Host 也能渲染）。 */
export function emptyLearningRecord(
  courseId: CourseId,
  courseRevisionId: CourseRevisionId,
): CourseLearningRecord {
  return {
    courseId,
    courseRevisionId,
    attempts: [],
    mastery: [],
    review: [],
    notes: [],
    updatedAt: nowIso(),
  }
}

const VALIDATION_KINDS = new Set(['objective', 'quiz', 'rubric', 'open', 'unverified'])
const ASSESSORS = new Set(['objective-runner', 'model-rubric', 'student-self', 'none'])
const CONFIDENCE = new Set(['high', 'medium', 'low', 'unknown'])
const CHECK_STATUS = new Set(['pass', 'fail', 'not-run'])
const HELP_LEVELS = new Set<unknown>([0, 1, 2, 3, 'full-answer'])

/** 清洗 Host 传入的验证结果，防止越界分数/非法枚举进入学情。 */
export function normalizeValidation(validation: AttemptValidation): AttemptValidation {
  const kind = VALIDATION_KINDS.has(validation.kind) ? validation.kind : 'unverified'
  const confidence = CONFIDENCE.has(validation.confidence) ? validation.confidence : 'unknown'
  const assessedBy = validation.assessedBy !== undefined && ASSESSORS.has(validation.assessedBy)
    ? validation.assessedBy
    : 'none'
  const rubric = validation.rubric === undefined
    ? undefined
    : validation.rubric
      .filter(score => Number.isFinite(score.score) && Number.isFinite(score.maxScore) && score.maxScore > 0)
      .map(score => ({
        criterionId: score.criterionId,
        score: Math.max(0, Math.min(score.score, score.maxScore)),
        maxScore: score.maxScore,
        ...(score.note === undefined ? {} : { note: score.note }),
      }))
  const checks = validation.checks === undefined
    ? undefined
    : validation.checks.filter(check => CHECK_STATUS.has(check.status))
  const strings = (value: readonly string[] | undefined): string[] | undefined =>
    value === undefined ? undefined : value.filter(item => typeof item === 'string' && item.trim() !== '')
  const notes = strings(validation.notes)
  const evidence = strings(validation.evidence)
  const limits = strings(validation.limits)
  return {
    kind,
    ...(validation.passed === undefined ? {} : { passed: validation.passed }),
    ...(checks === undefined ? {} : { checks }),
    ...(rubric === undefined ? {} : { rubric }),
    ...(notes === undefined ? {} : { notes }),
    ...(evidence === undefined ? {} : { evidence }),
    assessedBy,
    confidence,
    ...(limits === undefined ? {} : { limits }),
    ...(validation.createdAt === undefined ? {} : { createdAt: validation.createdAt }),
  }
}

/** 尝试输入的最小校验；返回中文错误说明或 undefined。 */
function validateAttemptInput(input: SubmitAttemptInput): string | undefined {
  if (typeof input.sessionId !== 'string' || input.sessionId === '') return '缺少 sessionId'
  if (typeof input.courseId !== 'string' || input.courseId === '') return '缺少 courseId'
  if (typeof input.courseRevisionId !== 'string' || input.courseRevisionId === '') return '缺少 courseRevisionId'
  if (!Array.isArray(input.conceptIds)) return 'conceptIds 必须是数组'
  if (typeof input.prompt !== 'string') return 'prompt 必须是字符串'
  if (typeof input.answerText !== 'string') return 'answerText 必须是字符串'
  if (!HELP_LEVELS.has(input.helpLevel)) return 'helpLevel 不合法'
  if (typeof input.answerRevealed !== 'boolean') return 'answerRevealed 必须是布尔值'
  return undefined
}

/** 把 repository 抛出的错误转成 Result 失败（不把存储异常穿透到 Host）。 */
function errorResult<T>(cause: unknown): Result<T> {
  const appError = (cause as { appError?: { code?: string; message?: string; details?: Record<string, unknown> } })?.appError
  if (appError !== undefined && typeof appError.code === 'string' && typeof appError.message === 'string') {
    return err(appError.code as AppErrorCode, appError.message, {
      ...(appError.details === undefined ? {} : { details: appError.details }),
    })
  }
  return err('storage', '学习记录读写失败', {
    details: { message: cause instanceof Error ? cause.message : String(cause) },
    retryable: false,
  })
}

/** 创建 LearningService；依赖全部注入，Host 与测试使用同一实现。 */
export function createLearningService(options: LearningServiceOptions): LearningService {
  const repository = options.repository
  const clock = options.clock ?? (() => new Date())
  const reviewHorizonDays = options.reviewHorizonDays ?? 7
  const nowDate = (): Date => clock()
  const nowText = (): string => clock().toISOString()

  async function resolveRevision(courseId: CourseId): Promise<CourseRevisionId> {
    if (options.resolveRevisionId === undefined) return '' as CourseRevisionId
    try {
      return (await options.resolveRevisionId(courseId)) ?? ('' as CourseRevisionId)
    } catch {
      return '' as CourseRevisionId
    }
  }

  async function loadOrEmpty(courseId: CourseId): Promise<CourseLearningRecord> {
    const existing = await repository.get(courseId)
    if (existing !== undefined) return existing
    return emptyLearningRecord(courseId, await resolveRevision(courseId))
  }

  async function upcomingFor(courseId: CourseId): Promise<readonly ConceptId[]> {
    if (options.upcomingConceptIds === undefined) return []
    try {
      return await options.upcomingConceptIds(courseId)
    } catch {
      return []
    }
  }

  async function rebuildReview(record: CourseLearningRecord): Promise<ReviewItem[]> {
    return computeReviewItems({
      courseId: record.courseId,
      mastery: record.mastery,
      attempts: record.attempts,
      now: nowDate(),
      upcomingConceptIds: await upcomingFor(record.courseId),
      horizonDays: reviewHorizonDays,
    })
  }

  /** 解析本次尝试的验证结果；客观验证优先，rubric 仅在没有客观验证时使用。 */
  async function resolveValidation(
    input: SubmitAttemptInput,
    independence: ReturnType<typeof classifyIndependence>,
  ): Promise<AttemptValidation> {
    if (input.validation !== undefined) {
      const normalized = normalizeValidation(input.validation)
      // 客观验证（quiz/run）直接采用，绝不被模型评分覆盖。
      if (normalized.kind !== 'unverified') return normalized
      // Host 明确标为未验证时，才尝试 rubric 评分路径。
      const rubric = await assessWithRubric(input, independence)
      if (rubric !== undefined) {
        if (rubric.kind === 'rubric') return rubric
        return {
          ...normalized,
          limits: [
            ...(normalized.limits ?? []),
            ...(rubric.limits ?? []),
          ],
        }
      }
      return normalized
    }
    if (independence.independence === 'skipped') {
      return degradedValidation('本次跳过未作答，未进行评分')
    }
    const rubric = await assessWithRubric(input, independence)
    if (rubric !== undefined) return rubric
    if (input.runId !== undefined) {
      return {
        kind: 'unverified',
        notes: ['已提供运行记录，但没有客观验证结论'],
        evidence: [`runId: ${input.runId}`],
        assessedBy: 'none',
        confidence: 'unknown',
        limits: ['运行结果未提供验证结论，本次不计入掌握维度；请让 Host 传入 validation。'],
        createdAt: nowText(),
      }
    }
    return {
      kind: 'unverified',
      notes: ['本次尝试没有可用的客观验证或评分标准'],
      evidence: [],
      assessedBy: 'none',
      confidence: 'unknown',
      limits: ['没有可用的验证方式，本次不计入掌握维度。'],
      createdAt: nowText(),
    }
  }

  async function assessWithRubric(
    input: SubmitAttemptInput,
    independence: ReturnType<typeof classifyIndependence>,
  ): Promise<AttemptValidation | undefined> {
    if (options.rubric === undefined) return undefined
    if (independence.independence !== 'independent' && independence.independence !== 'assisted') {
      return undefined
    }
    let criteria: readonly RubricCriterion[] | undefined
    try {
      criteria = await options.rubric.resolve(input)
    } catch {
      return degradedValidation('读取 rubric 失败')
    }
    if (criteria === undefined || criteria.length === 0) return undefined
    try {
      return await options.rubric.assess({ input, rubric: criteria })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      return degradedValidation(`模型 rubric 评分失败：${message}`)
    }
  }

  return {
    async submitAttempt(input: SubmitAttemptInput): Promise<Result<AttemptOutcome>> {
      const invalid = validateAttemptInput(input)
      if (invalid !== undefined) return err('invalid-input', invalid)
      try {
        const independence = classifyIndependence(input)
        const validation = await resolveValidation(input, independence)
        const conceptIds = [...new Set(input.conceptIds)]
        const attempt: LearningAttempt = {
          id: newId('try'),
          sessionId: input.sessionId,
          courseId: input.courseId,
          courseRevisionId: input.courseRevisionId,
          conceptIds,
          ...(input.activityId === undefined ? {} : { activityId: input.activityId }),
          ...(input.activityRevision === undefined ? {} : { activityRevision: input.activityRevision }),
          prompt: input.prompt,
          answerText: input.answerText,
          ...(input.selectedOptionIds === undefined ? {} : { selectedOptionIds: input.selectedOptionIds }),
          helpExposure: independence.helpExposure,
          independence: independence.independence,
          ...(input.selfReport === undefined ? {} : { selfReport: input.selfReport }),
          ...(input.runId === undefined ? {} : { runId: input.runId }),
          validation,
          createdAt: input.createdAt ?? nowText(),
        }

        const record = await loadOrEmpty(input.courseId)
        const attempts = [...record.attempts, attempt]
        const mastery = [...record.mastery]
        const updatedMastery: MasteryRecord[] = []
        for (const conceptId of conceptIds) {
          const index = mastery.findIndex(item => item.conceptId === conceptId)
          const existing = index === -1 ? undefined : mastery[index]
          const conceptAttempts = attempts.filter(item => item.conceptIds.includes(conceptId))
          const updated = buildMasteryRecord({
            ...(existing === undefined ? {} : { existing }),
            courseId: input.courseId,
            courseRevisionId: input.courseRevisionId,
            conceptId,
            attempts: conceptAttempts,
            now: nowText(),
          })
          if (index === -1) mastery.push(updated)
          else mastery[index] = updated
          updatedMastery.push(updated)
        }

        const review = await rebuildReview({
          ...record,
          courseRevisionId: input.courseRevisionId,
          attempts,
          mastery,
          review: [],
          updatedAt: nowText(),
        })
        const nextRecord: CourseLearningRecord = {
          ...record,
          courseRevisionId: input.courseRevisionId,
          attempts,
          mastery,
          review,
          updatedAt: nowText(),
        }
        await repository.save(nextRecord)

        return ok({
          attempt,
          validation,
          mastery: updatedMastery,
          review: nextRecord.review,
          ...(independence.note === undefined ? {} : { independenceNote: independence.note }),
        })
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async getRecord(courseId: CourseId): Promise<Result<CourseLearningRecord>> {
      try {
        return ok(await loadOrEmpty(courseId))
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async listAttempts(query: {
      readonly sessionId?: SessionId
      readonly courseId?: CourseId
    }): Promise<Result<readonly LearningAttempt[]>> {
      try {
        let attempts: readonly LearningAttempt[]
        if (query.courseId !== undefined) {
          const record = await repository.get(query.courseId)
          attempts = record?.attempts ?? []
        } else {
          const records = await repository.listAll()
          attempts = records.flatMap(record => record.attempts)
        }
        const filtered = query.sessionId === undefined
          ? attempts
          : attempts.filter(attempt => attempt.sessionId === query.sessionId)
        return ok([...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async listMastery(courseId: CourseId): Promise<Result<readonly MasteryRecord[]>> {
      try {
        const record = await repository.get(courseId)
        return ok(record?.mastery ?? [])
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async listReview(courseId: CourseId): Promise<Result<readonly ReviewItem[]>> {
      try {
        const record = await loadOrEmpty(courseId)
        return ok(await rebuildReview(record))
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async dispute(
      courseId: CourseId,
      conceptId: ConceptId,
      reason: string,
    ): Promise<Result<MasteryRecord>> {
      if (reason.trim() === '') return err('invalid-input', '异议说明不能为空')
      try {
        const record = await repository.get(courseId)
        const index = record === undefined
          ? -1
          : record.mastery.findIndex(item => item.conceptId === conceptId)
        if (record === undefined || index === -1) {
          return err('not-found', '没有找到该概念的掌握记录，无法提出异议')
        }
        const current = record.mastery[index]
        if (current === undefined) return err('not-found', '没有找到该概念的掌握记录，无法提出异议')
        const dispute: MasteryDispute = {
          id: newId('dispute'),
          reason: reason.trim(),
          createdAt: nowText(),
          status: 'open',
        }
        const updated: MasteryRecord = {
          ...current,
          disputes: [...current.disputes, dispute],
          basis: [
            ...current.basis,
            `学生异议（${nowText()}）：${reason.trim().slice(0, 300)}；原判定与依据保留，等待重检。`,
          ].slice(-14),
          updatedAt: nowText(),
        }
        const mastery = [...record.mastery]
        mastery[index] = updated
        const review = await rebuildReview({ ...record, mastery, review: [] })
        const nextRecord: CourseLearningRecord = { ...record, mastery, review, updatedAt: nowText() }
        await repository.save(nextRecord)
        return ok(updated)
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async recheck(
      courseId: CourseId,
      conceptId: ConceptId,
    ): Promise<Result<{ readonly record: MasteryRecord; readonly plan: readonly string[] }>> {
      try {
        const record = await repository.get(courseId)
        const index = record === undefined
          ? -1
          : record.mastery.findIndex(item => item.conceptId === conceptId)
        if (record === undefined || index === -1) {
          return err('not-found', '没有找到该概念的掌握记录，无法重检')
        }
        const current = record.mastery[index]
        if (current === undefined) return err('not-found', '没有找到该概念的掌握记录，无法重检')
        const disputes = current.disputes.map(dispute => (dispute.status === 'open'
          ? { ...dispute, status: 'recheck-due' as const }
          : dispute))
        const updated: MasteryRecord = {
          ...current,
          disputes,
          basis: [
            ...current.basis,
            `已启动重检（${nowText()}）：重检结果将作为新证据追加，原记录不覆盖。`,
          ].slice(-14),
          updatedAt: nowText(),
        }
        const mastery = [...record.mastery]
        mastery[index] = updated
        const review = await rebuildReview({ ...record, mastery, review: [] })
        const nextRecord: CourseLearningRecord = { ...record, mastery, review, updatedAt: nowText() }
        await repository.save(nextRecord)
        return ok({ record: updated, plan: buildRecheckPlan(updated) })
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async markStaleForSources(
      courseId: CourseId,
      conceptIds: readonly ConceptId[],
      note: string,
    ): Promise<Result<readonly MasteryRecord[]>> {
      if (conceptIds.length === 0) return ok([])
      try {
        const record = await repository.get(courseId)
        if (record === undefined) return ok([])
        const affected = new Set(conceptIds.map(id => id as string))
        const updatedRecords: MasteryRecord[] = []
        const mastery = record.mastery.map(item => {
          if (!affected.has(item.conceptId as string)) return item
          const conceptAttempts = record.attempts.filter(attempt => attempt.conceptIds.includes(item.conceptId))
          // 资料变化后等级暂封顶（mastered → checked），复核后再恢复/更新；证据不删除。
          const level = deriveMasteryLevel({
            attempts: conceptAttempts,
            dimensions: item.dimensions,
            disputes: item.disputes,
            needsRecheck: true,
          })
          const updated: MasteryRecord = {
            ...item,
            level,
            needsRecheck: true,
            basis: [
              ...item.basis,
              `资料变化（${nowText()}）：${note.trim().slice(0, 300) || '相关资料修订已更新'}；历史依据保留，需复核。`,
              ...(level === item.level ? [] : [`等级因资料变化暂封顶为 ${level}，复核通过后可恢复。`]),
            ].slice(-14),
            updatedAt: nowText(),
          }
          updatedRecords.push(updated)
          return updated
        })
        const attempts = record.attempts.map(attempt => (
          attempt.conceptIds.some(conceptId => affected.has(conceptId as string))
            ? { ...attempt, needsRecheck: true }
            : attempt
        ))
        const review = await rebuildReview({ ...record, mastery, attempts, review: [] })
        const nextRecord: CourseLearningRecord = { ...record, mastery, attempts, review, updatedAt: nowText() }
        await repository.save(nextRecord)
        return ok(updatedRecords)
      } catch (cause) {
        return errorResult(cause)
      }
    },

    async saveNote(input: {
      readonly courseId: CourseId
      readonly id?: string
      readonly sessionId?: SessionId
      readonly conceptId?: ConceptId
      readonly activityId?: ActivityId
      readonly markdown: string
    }): Promise<Result<CourseLearningRecord['notes'][number]>> {
      if (input.markdown.trim() === '') return err('invalid-input', '笔记内容不能为空')
      try {
        const record = await loadOrEmpty(input.courseId)
        const now = nowText()
        if (input.id !== undefined) {
          const index = record.notes.findIndex(note => note.id === input.id)
          if (index === -1) return err('not-found', '要修改的笔记不存在')
          const current = record.notes[index]
          if (current === undefined) return err('not-found', '要修改的笔记不存在')
          const updated = {
            ...current,
            markdown: input.markdown,
            updatedAt: now,
          }
          const notes = [...record.notes]
          notes[index] = updated
          await repository.save({ ...record, notes, updatedAt: now })
          return ok(updated)
        }
        const note = {
          id: `note-${newId('note')}`,
          ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
          ...(input.conceptId === undefined ? {} : { conceptId: input.conceptId }),
          ...(input.activityId === undefined ? {} : { activityId: input.activityId }),
          markdown: input.markdown,
          createdAt: now,
          updatedAt: now,
        }
        await repository.save({ ...record, notes: [...record.notes, note], updatedAt: now })
        return ok(note)
      } catch (cause) {
        return errorResult(cause)
      }
    },
  }
}

/** 生成重检计划：按未覆盖维度给具体问题；全部覆盖时给综合/迁移检验。 */
export function buildRecheckPlan(record: MasteryRecord): readonly string[] {
  const plan: string[] = []
  if (record.uncovered.some(item => item.startsWith('explain'))) {
    plan.push('请用自己的话解释该概念的核心思想，并说明它解决什么问题。')
  }
  if (record.uncovered.some(item => item.startsWith('conditions'))) {
    plan.push('请说明该概念成立/适用的条件，并举一个不满足条件的反例。')
  }
  if (record.uncovered.some(item => item.startsWith('variants'))) {
    plan.push('请独立完成一道与之前不同的变式题，并写出关键步骤。')
  }
  if (record.uncovered.some(item => item.startsWith('transfer'))) {
    plan.push('请在一个新情境中应用该概念，并解释为什么适用。')
  }
  if (plan.length === 0) {
    plan.push('请向一个没学过该概念的人讲解它，并回答对方的追问。')
    plan.push('请比较它与相邻概念的区别，并各举一个例子。')
  }
  plan.push('重检结果会作为新证据追加；原判定与依据保留，不会删除。')
  return plan
}

/** 便于 Host 的错题本：过滤验证未通过的尝试。 */
export { failedAttempts, isFailedAttempt } from './mastery.ts'

/** 便于 Host 从活动 payload 取 rubric。 */
export { rubricFromActivityPayload } from './rubric.ts'
