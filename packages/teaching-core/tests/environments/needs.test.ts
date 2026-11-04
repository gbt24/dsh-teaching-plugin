/**
 * Requirement classification: injected declarations are classified against the
 * real runner probes and the host PATH. Nothing is guessed or installed here.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withContext } from './helpers.ts'
import { approvalAdapter } from './helpers.ts'

test('first-version languages and a real lightweight runtime are classified as available', async () => {
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      { language: 'python', reason: '课程需要 Python 实验', source: 'course' },
      { language: 'javascript', reason: '交互演示', source: 'activity' },
      { language: 'ruby', reason: '课程资料要求 Ruby 示例', source: 'material' },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.value.length, 3)
    const [python, javascript, ruby] = result.value
    assert.equal(python?.status, 'available')
    assert.equal(python?.nextAction, 'prepare')
    assert.match(python?.detail ?? '', /Python \d+\.\d+/u)
    assert.equal(javascript?.status, 'available')
    assert.equal(ruby?.status, 'available')
    // Real probe on this host: a version read from the interpreter, not guessed.
    assert.match(ruby?.version ?? '', /^\d+\.\d+\.\d+$/u)
    assert.equal(ruby?.kind, 'managed')
  })
})

test('a missing runtime that needs a system change is needs-approval and never executed', async () => {
  const { adapter, plan } = approvalAdapter('t06-missing-tool')
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      { language: 't06-missing-tool', reason: '课程需要一个未安装的运行时', source: 'course' },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    const need = result.value[0]
    assert.equal(need?.status, 'needs-approval')
    assert.equal(need?.nextAction, 'request-approval')
    assert.equal(need?.approval?.kind, 'system-change')
    assert.equal(need?.approval?.executableByPlugin, false)
    assert.ok((need?.approval?.description ?? '').length > 0)
    assert.ok((need?.approval?.impact.length ?? 0) > 0)
    assert.ok((need?.approval?.alternatives.length ?? 0) > 0)
    assert.match(need?.detail ?? '', /未在宿主 PATH 探测到/u)
  }, { adapters: [adapter], installPlans: [plan] })
})

test('an unknown language is unsupported and explicitly not guessed', async () => {
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      { language: 'fortran', reason: '课程需要 Fortran', source: 'course' },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.value[0]?.status, 'unsupported')
    assert.equal(result.value[0]?.nextAction, 'none')
    assert.match(result.value[0]?.detail ?? '', /不会猜测/u)
    assert.equal(result.value[0]?.approval, undefined)
  })
})

test('declared third-party dependencies are needs-approval because installation needs network consent', async () => {
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      { language: 'python', reason: '课程需要 NumPy', source: 'course', dependencies: ['numpy'] },
      { language: 'ruby', reason: '资料需要 nokogiri', source: 'material', dependencies: ['nokogiri'] },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    for (const need of result.value) {
      assert.equal(need.status, 'needs-approval')
      assert.equal(need.approval?.kind, 'network-install')
      assert.equal(need.approval?.executableByPlugin, false)
      assert.match(need.approval?.description ?? '', /numpy|nokogiri/u)
      assert.ok((need.approval?.alternatives.length ?? 0) > 0)
    }
  })
})

test('a declaration whose resource envelope exceeds the host gets a reduced-scale fallback', async () => {
  // Deterministic host facts so the classification is stable on any machine.
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      {
        language: 'python',
        reason: '在大数据集上训练神经网络观察过拟合',
        source: 'course',
        experimentKind: 'training',
        resources: { memoryMb: 64_000, runtimeMs: 3_600_000, modelParameters: 7_000_000_000, gpu: true },
      },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    const need = result.value[0]
    assert.equal(need?.status, 'available', 'runtime itself is available')
    assert.equal(need?.resources?.status, 'reduced')
    assert.ok((need?.resources?.reasons.length ?? 0) > 0)
    assert.ok((need?.resources?.fallback?.knownDifferences.length ?? 0) > 0)
    assert.equal(need?.resources?.fallback?.reducedExperiment?.language, 'python')
    assert.ok((need?.resources?.fallback?.description ?? '').includes('超出本机资源'))
  }, { hostFacts: { totalMemoryMb: 16_384, freeMemoryMb: 4_096, gpuAvailable: 'no', cpuCount: 8 } })
})

test('declarations with a fitting resource envelope carry no fallback', async () => {
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([
      {
        language: 'python',
        reason: '小规模数据处理',
        source: 'activity',
        experimentKind: 'numerical',
        resources: { memoryMb: 128, runtimeMs: 2_000 },
      },
    ])
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.value[0]?.status, 'available')
    assert.equal(result.value[0]?.resources, undefined, 'a fitting experiment gets no substitute')
  }, { hostFacts: { totalMemoryMb: 16_384, freeMemoryMb: 8_192, gpuAvailable: 'no', cpuCount: 8 } })
})

test('invalid declarations are rejected with invalid-input instead of being guessed', async () => {
  await withContext(async ({ manager }) => {
    const noLanguage = await manager.detectNeeds([{ language: '', reason: 'x', source: 'course' }])
    assert.equal(noLanguage.ok, false)
    if (!noLanguage.ok) assert.equal(noLanguage.error.code, 'invalid-input')
    const noReason = await manager.detectNeeds([{ language: 'python', reason: '  ', source: 'course' }])
    assert.equal(noReason.ok, false)
    if (!noReason.ok) assert.equal(noReason.error.code, 'invalid-input')
    const badSource = await manager.detectNeeds([
      { language: 'python', reason: 'x', source: 'guess' as never },
    ])
    assert.equal(badSource.ok, false)
    if (!badSource.ok) assert.equal(badSource.error.code, 'invalid-input')
    const badResources = await manager.detectNeeds([
      { language: 'python', reason: 'x', source: 'course', resources: { memoryMb: -1 } },
    ])
    assert.equal(badResources.ok, false)
    if (!badResources.ok) assert.equal(badResources.error.code, 'invalid-input')
  })
})

test('a code-run payload language becomes a declared need without inference', async () => {
  const { declaredNeedFromRunPayload } = await import('../../src/environments/index.ts')
  const declaration = declaredNeedFromRunPayload({
    language: 'ruby',
    reason: '活动声明使用 Ruby',
    activityId: 'act-test' as never,
    dependencies: ['json'],
  })
  assert.equal(declaration.language, 'ruby')
  assert.equal(declaration.source, 'activity')
  assert.equal(declaration.reason, '活动声明使用 Ruby')
  assert.deepEqual(declaration.dependencies, ['json'])
  await withContext(async ({ manager }) => {
    const result = await manager.detectNeeds([declaration])
    assert.equal(result.ok, true)
    if (!result.ok) return
    // Ruby is present on this host; the payload only states the language.
    assert.equal(result.value[0]?.language, 'ruby')
    assert.equal(result.value[0]?.activityId, 'act-test')
    assert.equal(result.value[0]?.approval?.kind, 'network-install')
  })
})
