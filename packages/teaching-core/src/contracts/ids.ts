/**
 * Branded identifier helpers for every domain object in the teaching plugin.
 *
 * IDs are strings with a stable prefix (useful in logs, URLs and exports) and a
 * random suffix. A branded type still compiles down to `string`; the brand only
 * prevents accidental cross-assignment between ID kinds at compile time.
 */

/** Intersection brand: `Brand<string, 'CourseId'>` is a compile-time-only marker. */
export type Brand<T, K extends string> = T & { readonly __brand: K }

export type CourseId = Brand<string, 'CourseId'>
export type CourseRevisionId = Brand<string, 'CourseRevisionId'>
export type ConceptId = Brand<string, 'ConceptId'>
export type SourceId = Brand<string, 'SourceId'>
export type SourceRevisionId = Brand<string, 'SourceRevisionId'>
export type UnitId = Brand<string, 'UnitId'>
export type SessionId = Brand<string, 'SessionId'>
export type MessageId = Brand<string, 'MessageId'>
export type ActivityId = Brand<string, 'ActivityId'>
export type AttemptId = Brand<string, 'AttemptId'>
export type MasteryId = Brand<string, 'MasteryId'>
export type EnvironmentId = Brand<string, 'EnvironmentId'>
export type RunId = Brand<string, 'RunId'>
export type TaskId = Brand<string, 'TaskId'>
export type ExportId = Brand<string, 'ExportId'>
export type BackupId = Brand<string, 'BackupId'>

export type AnyId =
  | CourseId | CourseRevisionId | ConceptId | SourceId | SourceRevisionId | UnitId
  | SessionId | MessageId | ActivityId | AttemptId | MasteryId | EnvironmentId
  | RunId | TaskId | ExportId | BackupId

/* eslint-disable no-bitwise */
const RANDOM_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Lowercase base-36 token; `crypto.getRandomValues` when available. */
function randomToken(length: number): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto
  const bytes = new Uint8Array(length)
  if (cryptoApi?.getRandomValues !== undefined) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  let out = ''
  for (const byte of bytes) out += RANDOM_ALPHABET[byte % 36]
  return out
}

let counter = 0

/** Create one prefixed ID, e.g. `course-1a2b3c4d5e6f`. */
export function newId<B extends string>(prefix: string): Brand<string, B> {
  counter = (counter + 1) % 1296
  const stamp = Date.now().toString(36).slice(-6)
  return `${prefix}-${stamp}${counter.toString(36)}${randomToken(4)}` as Brand<string, B>
}

export const courseId = (): CourseId => newId('course')
export const courseRevisionId = (): CourseRevisionId => newId('crev')
export const conceptId = (): ConceptId => newId('concept')
export const sourceId = (): SourceId => newId('src')
export const sourceRevisionId = (): SourceRevisionId => newId('srev')
export const unitId = (): UnitId => newId('unit')
export const sessionId = (): SessionId => newId('sess')
export const messageId = (): MessageId => newId('msg')
export const activityId = (): ActivityId => newId('act')
export const attemptId = (): AttemptId => newId('try')
export const masteryId = (): MasteryId => newId('mst')
export const environmentId = (): EnvironmentId => newId('env')
export const runId = (): RunId => newId('run')
export const taskId = (): TaskId => newId('task')
export const exportId = (): ExportId => newId('exp')
export const backupId = (): BackupId => newId('bak')

/** ISO-8601 UTC timestamp. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Basic path/ID safety: no separators, no traversal, bounded length. */
export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160
    && /^[A-Za-z0-9._:-]+$/.test(value) && !value.includes('..') && !value.includes('/')
}
