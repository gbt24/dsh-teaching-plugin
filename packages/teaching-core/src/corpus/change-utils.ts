/**
 * 资料变化检测的纯逻辑：单元级 diff 与受影响引用解析。
 *
 * diff 以「单元内容键」（kind + locator + 归一化文本）对齐新旧修订：
 * locator 相同而文本不同视为修改；新键不存在于旧修订视为新增；旧键消失视为删除。
 * 受影响概念/活动优先用 Host 注入的引用索引（能精确到单元），
 * 缺省实现从课程修订的 concept.sourceAnchors 反查（只覆盖概念，活动需 Host 注入）。
 */
import type { CourseRepository } from '../storage/repositories.ts'
import type { SourceAnchor, SourceUnit } from '../contracts/source.ts'
import type { SourceId } from '../contracts/ids.ts'
import type { CorpusReferenceHooks } from './types.ts'

/** 新旧修订的单元级差异。 */
export interface UnitDiff {
  /** 新增单元数。 */
  readonly added: number
  /** 旧修订中已消失的单元 id。 */
  readonly removedUnitIds: readonly string[]
  /** locator 相同但文本改变的旧单元 id。 */
  readonly modifiedUnitIds: readonly string[]
  /** 所有受影响（删除或修改）的旧单元 id。 */
  readonly affectedUnitIds: readonly string[]
  /** 旧单元总数。 */
  readonly totalOldUnits: number
  /** 受影响单元占旧单元的比例（0..1）。 */
  readonly changedRatio: number
  /** 是否涉及标题结构。 */
  readonly structureChanged: boolean
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function locatorKey(unit: SourceUnit): string {
  const locator = unit.locator
  const ordered: Record<string, unknown> = {}
  for (const key of Object.keys(locator).sort()) {
    const value = (locator as Record<string, unknown>)[key]
    if (value !== undefined) ordered[key] = value
  }
  return `${unit.kind}|${JSON.stringify(ordered)}`
}

/** 比较旧修订单元与新修订单元。 */
export function diffUnits(oldUnits: readonly SourceUnit[], newUnits: readonly SourceUnit[]): UnitDiff {
  const oldByKey = new Map<string, SourceUnit>()
  for (const unit of oldUnits) {
    // 同 locator 只保留第一个，避免重复单元互相覆盖
    if (!oldByKey.has(locatorKey(unit))) oldByKey.set(locatorKey(unit), unit)
  }
  const newByKey = new Map<string, SourceUnit>()
  for (const unit of newUnits) {
    if (!newByKey.has(locatorKey(unit))) newByKey.set(locatorKey(unit), unit)
  }
  const removedUnitIds: string[] = []
  const modifiedUnitIds: string[] = []
  let structureChanged = false
  for (const [key, oldUnit] of oldByKey) {
    const newUnit = newByKey.get(key)
    if (newUnit === undefined) {
      removedUnitIds.push(oldUnit.id)
      if (oldUnit.kind === 'heading') structureChanged = true
      continue
    }
    if (normalizeText(oldUnit.text) !== normalizeText(newUnit.text)) {
      modifiedUnitIds.push(oldUnit.id)
      if (oldUnit.kind === 'heading' || newUnit.kind === 'heading') structureChanged = true
    }
  }
  let added = 0
  for (const key of newByKey.keys()) {
    if (!oldByKey.has(key)) {
      added += 1
      if (newByKey.get(key)?.kind === 'heading') structureChanged = true
    }
  }
  const affectedUnitIds = [...removedUnitIds, ...modifiedUnitIds]
  const totalOldUnits = oldUnits.length
  return {
    added,
    removedUnitIds,
    modifiedUnitIds,
    affectedUnitIds,
    totalOldUnits,
    changedRatio: totalOldUnits === 0 ? (added > 0 ? 1 : 0) : affectedUnitIds.length / totalOldUnits,
    structureChanged,
  }
}

/** 受影响引用解析结果。 */
export interface ReferenceResolution {
  readonly affectedConceptIds: readonly string[]
  readonly affectedActivityIds: readonly string[]
}

interface ReferenceDeps {
  readonly courses: CourseRepository
  readonly references?: CorpusReferenceHooks
}

async function callHook<T>(value: Promise<readonly T[]> | readonly T[]): Promise<readonly T[]> {
  return await Promise.resolve(value)
}

/** 从课程修订的 concept.sourceAnchors 反查引用了该文档的概念。 */
export async function defaultConceptReferences(
  courses: CourseRepository,
  documentId: SourceId,
  unitIds?: readonly string[],
): Promise<string[]> {
  const unitSet = unitIds !== undefined ? new Set(unitIds) : undefined
  const conceptIds = new Set<string>()
  let coursesList
  try {
    coursesList = await courses.list()
  } catch {
    return []
  }
  for (const course of coursesList) {
    let revisions
    try {
      revisions = await courses.listRevisions(course.id)
    } catch {
      continue
    }
    for (const revision of revisions) {
      for (const concept of revision.concepts) {
        const matched = concept.sourceAnchors.some((anchor: SourceAnchor) => {
          if (anchor.documentId !== documentId) return false
          if (unitSet === undefined) return true
          return unitSet.has(anchor.unitId as string)
        })
        if (matched) conceptIds.add(concept.id as string)
      }
    }
  }
  return [...conceptIds]
}

/** 解析受影响的 concept/activity id；优先使用注入的引用索引。 */
export async function resolveReferences(
  deps: ReferenceDeps,
  documentId: SourceId,
  unitIds: readonly string[] | undefined,
): Promise<ReferenceResolution> {
  const hooks = deps.references
  let affectedConceptIds: readonly string[] = []
  if (hooks?.conceptsForUnits !== undefined && unitIds !== undefined) {
    affectedConceptIds = await callHook(hooks.conceptsForUnits(documentId, unitIds))
  } else if (hooks?.conceptsForDocument !== undefined) {
    affectedConceptIds = await callHook(hooks.conceptsForDocument(documentId))
  } else {
    affectedConceptIds = await defaultConceptReferences(deps.courses, documentId, unitIds)
  }
  let affectedActivityIds: readonly string[] = []
  if (hooks?.activitiesForUnits !== undefined && unitIds !== undefined) {
    affectedActivityIds = await callHook(hooks.activitiesForUnits(documentId, unitIds))
  } else if (hooks?.activitiesForDocument !== undefined) {
    affectedActivityIds = await callHook(hooks.activitiesForDocument(documentId))
  }
  return {
    affectedConceptIds: [...new Set(affectedConceptIds.map(String))].sort(),
    affectedActivityIds: [...new Set(affectedActivityIds.map(String))].sort(),
  }
}

/** 组装 SourceChange.effects。 */
export function buildEffects(input: {
  readonly references: ReferenceResolution
  readonly summary: string
  readonly needsConfirmation: boolean
}): {
  affectedConceptIds: readonly string[]
  affectedActivityIds: readonly string[]
  needsConfirmation: boolean
  summary: string
} {
  return {
    affectedConceptIds: input.references.affectedConceptIds,
    affectedActivityIds: input.references.affectedActivityIds,
    needsConfirmation: input.needsConfirmation,
    summary: input.summary,
  }
}

/** 生成中文变化摘要。 */
export function describeDiff(diff: UnitDiff, conceptCount: number, activityCount: number): string {
  const parts = [
    `新增 ${diff.added} 个单元`,
    `删除/替换 ${diff.removedUnitIds.length} 个`,
    `修改 ${diff.modifiedUnitIds.length} 个`,
    `涉及 ${conceptCount} 个概念、${activityCount} 个活动`,
  ]
  if (diff.structureChanged) parts.push('包含标题/结构变化，建议确认课程结构')
  return `资料内容更新：${parts.join('，')}`
}
