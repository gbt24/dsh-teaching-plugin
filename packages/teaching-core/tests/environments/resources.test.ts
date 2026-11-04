/**
 * Resource assessment and reduced-scale substitutes (R32 / AC12).
 *
 * The substitute plans are not descriptions only: each one is executed for real
 * in Python or JavaScript and checked against its own objective checks.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryBudgetMb, readHostFacts } from '../../src/environments/index.ts'
import { withContext } from './helpers.ts'

const FIXED_HOST = {
  platform: 'test',
  arch: 'arm64',
  cpuCount: 8,
  totalMemoryMb: 16_384,
  freeMemoryMb: 4_096,
  gpuAvailable: 'no' as const,
}

test('a fitting experiment is not replaced and has no fallback', async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '小规模数值实验',
      kind: 'numerical',
      language: 'python',
      declared: { memoryMb: 256, runtimeMs: 5_000 },
    })
    assert.equal(assessment.status, 'fits')
    assert.deepEqual(assessment.reasons, [])
    assert.equal(assessment.fallback, undefined)
    // Budget is derived from measured host facts, never a hard-coded promise.
    assert.equal(memoryBudgetMb(manager.hostFacts()), memoryBudgetMb({
      ...readHostFacts(),
      ...manager.hostFacts(),
    }))
  }, { hostFacts: FIXED_HOST })
})

test('large-memory training gets a reduced, runnable overfitting demo with stated differences', { timeout: 60_000 }, async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '在真实大数据集上训练大模型并观察过拟合',
      kind: 'training',
      language: 'python',
      declared: {
        memoryMb: 64_000,
        runtimeMs: 3_600_000,
        datasetMb: 20_000,
        modelParameters: 7_000_000_000,
        gpu: true,
        description: '完整训练实验',
      },
    })
    assert.equal(assessment.status, 'reduced')
    assert.ok(assessment.reasons.length >= 3)
    const fallback = assessment.fallback
    assert.ok(fallback !== undefined)
    if (fallback === undefined) return
    assert.match(fallback.description, /超出本机资源/u)
    assert.ok(fallback.knownDifferences.length >= 3)
    assert.ok(fallback.knownDifferences.some(line => line.includes('闭式解') || line.includes('迭代')))
    assert.ok(fallback.fullExperimentRequirements.some(line => line.includes('内存')))
    assert.ok(fallback.caveats.some(line => line.includes('不能')))
    const reduced = fallback.reducedExperiment
    assert.ok(reduced !== undefined)
    if (reduced === undefined) return
    assert.equal(reduced.language, 'python')
    assert.ok(reduced.scaleNote.length > 0)
    // The substitute really runs and passes its own objective checks.
    const run = await manager.run({
      language: reduced.language,
      code: reduced.code,
      checks: reduced.checks,
      timeoutMs: reduced.timeoutMs,
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.verification, 'objective')
    assert.deepEqual(run.checks?.map(check => check.status), ['pass', 'pass', 'pass'])
    assert.match(run.stdout, /REDUCED-SCALE/u)
    assert.match(run.stdout, /overfit\(degree=15\)/u)
    // The substitute is honest that it is not the full experiment.
    assert.match(run.stdout, /10 训练点 \+ 30 验证点/u)
  }, { hostFacts: FIXED_HOST })
})

test('a long-running experiment is reduced because one interactive run is capped', async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '长时间训练实验',
      kind: 'training',
      language: 'python',
      declared: { runtimeMs: 3_600_000 },
    })
    assert.equal(assessment.status, 'reduced')
    assert.ok(assessment.reasons.some(reason => reason.includes('超过单次交互运行上限')))
    assert.ok(assessment.fallback?.knownDifferences.length)
  }, { hostFacts: FIXED_HOST })
})

test('GPU-only experiments are reduced with an explicit unknown-capability note', async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '需要 GPU 并行计算',
      kind: 'training',
      language: 'python',
      declared: { gpu: true, memoryMb: 1_024 },
    })
    assert.equal(assessment.status, 'reduced')
    assert.ok(assessment.reasons.some(reason => reason.includes('GPU')))
    assert.match(assessment.fallback?.description ?? '', /GPU/u)
  }, { hostFacts: { ...FIXED_HOST, gpuAvailable: 'unknown' } })
})

test('simulation substitutes are labelled simulated and really execute', { timeout: 60_000 }, async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '模拟大规模人群传播过程',
      kind: 'simulation',
      language: 'python',
      declared: { runtimeMs: 900_000, datasetMb: 10_000 },
    })
    assert.equal(assessment.status, 'simulated')
    const reduced = assessment.fallback?.reducedExperiment
    assert.ok(reduced !== undefined)
    if (reduced === undefined) return
    assert.match(reduced.scaleNote, /确定性|平均场/u)
    const run = await manager.run({
      language: reduced.language,
      code: reduced.code,
      checks: reduced.checks,
      timeoutMs: reduced.timeoutMs,
    })
    assert.equal(run.status, 'succeeded')
    assert.match(run.stdout, /SIMULATED/u)
    const differences = (assessment.fallback?.knownDifferences ?? []).join('\n')
    assert.match(differences, /确定性/u)
    assert.match(differences, /统计显著性/u)
  }, { hostFacts: FIXED_HOST })
})

test('an unknown experiment kind reports no automatic runnable substitute', async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '无法分类的重型实验',
      kind: 'other',
      language: 'python',
      declared: { memoryMb: 64_000 },
    })
    assert.equal(assessment.status, 'none')
    assert.equal(assessment.fallback?.reducedExperiment, undefined)
    assert.match(assessment.fallback?.description ?? '', /没有自动生成的可运行替代/u)
    assert.ok(assessment.fallback?.caveats.some(line => line.includes('未自动生成')))
  }, { hostFacts: FIXED_HOST })
})

test('JavaScript declarations get an executable JavaScript substitute', { timeout: 60_000 }, async () => {
  await withContext(async ({ manager }) => {
    const assessment = manager.assessResources({
      goal: '数值导数验证',
      kind: 'numerical',
      language: 'javascript',
      declared: { runtimeMs: 3_600_000 },
    })
    assert.equal(assessment.status, 'reduced')
    const reduced = assessment.fallback?.reducedExperiment
    assert.ok(reduced !== undefined)
    if (reduced === undefined) return
    assert.equal(reduced.language, 'javascript')
    const run = await manager.run({
      language: 'javascript',
      code: reduced.code,
      checks: reduced.checks,
      timeoutMs: reduced.timeoutMs,
    })
    assert.equal(run.status, 'succeeded')
    assert.equal(run.verification, 'objective')
    assert.match(run.stdout, /max_abs_error=/u)
    assert.match(run.stdout, /REDUCED-SCALE/u)
  }, { hostFacts: FIXED_HOST })
})

test('host facts are measured, with GPU capability reported as unknown by default', () => {
  const facts = readHostFacts()
  assert.ok(facts.cpuCount >= 1)
  assert.ok(facts.totalMemoryMb > 0)
  assert.equal(facts.gpuAvailable, 'unknown')
  assert.match(facts.note ?? '', /GPU/u)
  assert.equal(readHostFacts({ gpuAvailable: 'no' }).gpuAvailable, 'no')
})
