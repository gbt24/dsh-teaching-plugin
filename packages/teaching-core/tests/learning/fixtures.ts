/**
 * learning 测试夹具：临时 LocalState + 真实 LearningRepository、固定时钟、
 * 尝试输入与验证结果构造。
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalState } from '../../src/storage/local-state.ts'
import { LearningRepository } from '../../src/storage/repositories.ts'
import type { SubmitAttemptInput } from '../../src/contracts/learning-service.ts'
import type { AttemptValidation, MasteryRecord } from '../../src/contracts/learning.ts'
import {
  conceptId, courseId, courseRevisionId, nowIso, sessionId,
} from '../../src/contracts/ids.ts'

/** 一套互相关联的课程/概念/会话 id。 */
export interface LearningIds {
  readonly courseId: ReturnType<typeof courseId>
  readonly courseRevisionId: ReturnType<typeof courseRevisionId>
  readonly conceptId: ReturnType<typeof conceptId>
  readonly sessionId: ReturnType<typeof sessionId>
}

/** 生成一套新 id（默认同一概念）。 */
export function makeIds(): LearningIds {
  return {
    courseId: courseId(),
    courseRevisionId: courseRevisionId(),
    conceptId: conceptId(),
    sessionId: sessionId(),
  }
}

/** 临时数据目录 + 已打开的 LocalState + 真实 LearningRepository。 */
export interface TempRepository {
  readonly dir: string
  readonly state: LocalState
  readonly repository: LearningRepository
  readonly cleanup: () => Promise<void>
}

export async function makeTempRepository(): Promise<TempRepository> {
  const dir = await mkdtemp(join(tmpdir(), 'teaching-learning-test-'))
  const state = new LocalState({ dataDir: dir })
  await state.open()
  const repository = new LearningRepository(state)
  return {
    dir,
    state,
    repository,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true })
    },
  }
}

/** 固定时钟（遗忘间隔测试用）。 */
export function fixedClock(iso: string): () => Date {
  return () => new Date(iso)
}

/** 尝试输入夹具。 */
export function makeAttemptInput(
  ids: LearningIds,
  overrides: Partial<SubmitAttemptInput> = {},
): SubmitAttemptInput {
  return {
    sessionId: ids.sessionId,
    courseId: ids.courseId,
    courseRevisionId: ids.courseRevisionId,
    conceptIds: [ids.conceptId],
    prompt: '过拟合的直接表现是什么？',
    answerText: '训练误差很低，但验证误差变高。',
    helpLevel: 0,
    answerRevealed: false,
    createdAt: nowIso(),
    ...overrides,
  }
}

/** 客观验证夹具。 */
export function objectiveValidation(passed: boolean): AttemptValidation {
  return {
    kind: 'objective',
    passed,
    checks: [{ name: 'stdout-contains', status: passed ? 'pass' : 'fail' }],
    evidence: ['运行输出：训练误差 0.01，验证误差 0.42'],
    assessedBy: 'objective-runner',
    confidence: 'high',
    createdAt: nowIso(),
  }
}

/** quiz 验证夹具。 */
export function quizValidation(passed: boolean): AttemptValidation {
  return {
    kind: 'quiz',
    passed,
    evidence: ['学生选择 b，正确选项 b'],
    assessedBy: 'objective-runner',
    confidence: 'high',
    createdAt: nowIso(),
  }
}

/** 便于构造轻量 review 输入。 */
export function makeMasteryFixture(overrides: {
  readonly conceptId: ReturnType<typeof conceptId>
  readonly courseId: ReturnType<typeof courseId>
  readonly level: 'exposed' | 'practiced' | 'checked' | 'mastered'
  readonly needsRecheck?: boolean
}): MasteryRecord {
  return {
    id: `mst-${overrides.conceptId}` as MasteryRecord['id'],
    courseId: overrides.courseId,
    courseRevisionId: courseRevisionId(),
    conceptId: overrides.conceptId,
    level: overrides.level,
    dimensions: { explain: 0, conditions: 0, variants: 0, transfer: 0 },
    evidenceAttemptIds: [],
    basis: [],
    uncovered: ['explain（用自己的话解释）'],
    disputes: [],
    updatedAt: nowIso(),
    ...(overrides.needsRecheck === undefined ? {} : { needsRecheck: overrides.needsRecheck }),
  }
}
