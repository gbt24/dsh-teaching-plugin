/**
 * Human-facing labels shared by the client components. Kept separate from the
 * components so tests and future surfaces use one vocabulary.
 */
import type {
  ActivityVerification, EvidenceKind, LearningStage, MasteryLevel, ReviewItem,
  TaskStatus,
} from '@deepseek-teaching/core/contracts'

/** Where the student is in the teaching loop. */
export const STAGE_LABELS: Readonly<Record<LearningStage, string>> = {
  'goal-setting': '设定目标',
  diagnosis: '诊断基础',
  teaching: '讲解',
  practice: '练习',
  transfer: '迁移检验',
  review: '复习',
  idle: '空闲',
}

/** Mastery levels shown beside concepts. */
export const MASTERY_LABELS: Readonly<Record<MasteryLevel, string>> = {
  unseen: '未接触',
  exposed: '已接触',
  practiced: '练习过',
  checked: '已检验',
  mastered: '已掌握',
}

/** Why a review item was suggested. */
export const REVIEW_REASON_LABELS: Readonly<Record<ReviewItem['reason'], string>> = {
  'low-mastery': '掌握偏弱',
  spaced: '间隔复习',
  'upcoming-course-need': '后续课程需要',
  'after-dispute': '争议后复检',
}

/** Provenance kinds shown on evidence chips. */
export const EVIDENCE_KIND_LABELS: Readonly<Record<EvidenceKind, string>> = {
  'course-source': '课程资料',
  'other-course': '其他课程',
  'external-web': '外部网页',
  'model-knowledge': '模型补充',
  derivation: '推导',
  experiment: '实验输出',
}

/** Task state labels. */
export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  queued: '等待中',
  running: '进行中',
  completed: '已完成',
  partial: '部分完成',
  failed: '失败',
  cancelled: '已取消',
}

/** Activity verification badge text. */
export function verificationLabel(verification: ActivityVerification | undefined): string {
  if (verification === undefined) return '无自动校验'
  switch (verification.kind) {
    case 'objective': return '客观校验（真实运行）'
    case 'rubric': return '按评分标准评价'
    case 'open': return '开放评价（保留不确定性）'
    default: return '无自动校验'
  }
}

/** Format an ISO time as local HH:mm. */
export function formatTime(iso: string | undefined): string {
  if (iso === undefined) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Format a relative day label (今天/昨天/日期). */
export function formatDay(iso: string | undefined): string {
  if (iso === undefined) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  if (sameDay) return '今天'
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/** Language preference labels. */
export const LANGUAGE_LABELS = { zh: '中文', en: 'English', bilingual: '中英双语' } as const

/** Format a task progress 0..1 as a percentage string. */
export function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return ''
  return `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`
}

/** Truncate long text for chips/buttons. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
