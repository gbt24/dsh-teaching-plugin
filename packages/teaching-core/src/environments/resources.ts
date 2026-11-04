/**
 * Resource assessment and reduced-scale / simulated substitutes (AC12 / R32).
 *
 * Full-scale experiments (large-memory training, long runs, GPU work, online
 * simulations) often exceed a personal desktop. The manager never pretends they
 * ran: it compares the *declared* envelope with measured host facts and returns
 * a citable explanation plus, when possible, a runnable small-scale experiment
 * that keeps the teaching principle. Every substitute states what it does not
 * prove.
 */
import { arch, cpus, freemem, platform, totalmem } from 'node:os'
import type {
  DeclaredResourceEnvelope, HostFacts, ReducedExperiment, ResourceAssessment,
  ResourceFallback, ResourceRequest, ResourceRequestKind,
} from './types.ts'

/** Fraction of free memory the plugin is willing to plan around. */
const FREE_MEMORY_RATIO = 0.5
/** Fraction of total memory that stays a hard planning ceiling. */
const TOTAL_MEMORY_RATIO = 0.25
/** Lower bound for the planning budget so tiny free-memory readings do not zero it. */
const MIN_MEMORY_BUDGET_MB = 128
/** One interactive run may not block the teaching session longer than this. */
const INTERACTIVE_RUNTIME_BUDGET_MS = 120_000
/** Rough bytes per parameter for weights + gradients + optimizer state. */
const BYTES_PER_PARAMETER = 16

/** Read real host facts; overrides exist for tests and host-specific tuning. */
export function readHostFacts(overrides: Partial<HostFacts> = {}): HostFacts {
  const facts: HostFacts = {
    platform: platform(),
    arch: arch(),
    cpuCount: cpus().length,
    totalMemoryMb: Math.round(totalmem() / (1024 * 1024)),
    freeMemoryMb: Math.round(freemem() / (1024 * 1024)),
    gpuAvailable: 'unknown',
    note: 'GPU 加速能力未经探测（未知），CPU/内存来自 node:os 实测；其他进程占用会使可用资源更少。',
    ...overrides,
  }
  return facts
}

/** Memory the plugin plans to use, in MiB, derived from real measurements. */
export function memoryBudgetMb(host: HostFacts): number {
  const byFree = Math.floor(host.freeMemoryMb * FREE_MEMORY_RATIO)
  const byTotal = Math.floor(host.totalMemoryMb * TOTAL_MEMORY_RATIO)
  return Math.max(MIN_MEMORY_BUDGET_MB, Math.min(byFree, byTotal))
}

/** One-line summary of the declared envelope, for teaching text and exports. */
export function describeDeclaredResources(declared: DeclaredResourceEnvelope | undefined): string {
  if (declared === undefined) return '未声明资源需求'
  const parts: string[] = []
  if (declared.memoryMb !== undefined) parts.push(`内存 ${declared.memoryMb} MiB`)
  if (declared.runtimeMs !== undefined) parts.push(`运行 ${Math.round(declared.runtimeMs / 1000)}s`)
  if (declared.datasetMb !== undefined) parts.push(`数据集 ${declared.datasetMb} MiB`)
  if (declared.modelParameters !== undefined) parts.push(`参数 ${declared.modelParameters}`)
  if (declared.gpu === true) parts.push('需要 GPU')
  if (declared.description !== undefined && declared.description !== '') parts.push(declared.description)
  return parts.length === 0 ? '未声明资源需求' : parts.join('；')
}

/** Compare a declared envelope with the host; attach a fallback when it does not fit. */
export function assessResourceRequest(request: ResourceRequest, host: HostFacts): ResourceAssessment {
  const declared = request.declared
  const reasons: string[] = []
  const budget = memoryBudgetMb(host)
  if (declared?.memoryMb !== undefined && declared.memoryMb > budget) {
    reasons.push(
      `实验声明需要约 ${declared.memoryMb} MiB 内存，超过本机规划预算 ${budget} MiB`
      + `（空闲 ${host.freeMemoryMb} MiB / 总量 ${host.totalMemoryMb} MiB，按保守比例留出余量）`,
    )
  }
  if (declared?.modelParameters !== undefined && declared.modelParameters > 0) {
    const estimatedMb = Math.ceil((declared.modelParameters * BYTES_PER_PARAMETER) / (1024 * 1024))
    if (estimatedMb > budget) {
      reasons.push(
        `按参数规模估算训练内存约 ${estimatedMb} MiB（${declared.modelParameters} 参数 × ${BYTES_PER_PARAMETER} B/参数），超过规划预算 ${budget} MiB`,
      )
    }
  }
  if (declared?.runtimeMs !== undefined && declared.runtimeMs > INTERACTIVE_RUNTIME_BUDGET_MS) {
    reasons.push(
      `实验声明运行 ${Math.round(declared.runtimeMs / 1000)}s，超过单次交互运行上限 ${INTERACTIVE_RUNTIME_BUDGET_MS / 1000}s`,
    )
  }
  if (declared?.gpu === true && host.gpuAvailable !== 'yes') {
    reasons.push(`实验声明需要 GPU 加速，本机 GPU 可用状态为 ${host.gpuAvailable === 'no' ? '不可用' : '未探测到可用的加速运行时'}`)
  }
  if (reasons.length === 0) {
    return {
      status: 'fits',
      goal: request.goal,
      reasons: [],
      ...(declared !== undefined ? { declared } : {}),
      host,
    }
  }
  const fallback = buildResourceFallback(request, reasons, host)
  const status = fallback.reducedExperiment === undefined
    ? 'none'
    : request.kind === 'simulation'
      ? 'simulated'
      : 'reduced'
  return {
    status,
    goal: request.goal,
    reasons,
    ...(declared !== undefined ? { declared } : {}),
    host,
    fallback,
  }
}

/** Build the citable fallback description + runnable substitute. */
export function buildResourceFallback(
  request: ResourceRequest,
  reasons: readonly string[],
  host: HostFacts,
): ResourceFallback {
  const requirements: string[] = []
  const declared = request.declared
  if (declared?.memoryMb !== undefined) requirements.push(`内存：${declared.memoryMb} MiB（本机规划预算 ${memoryBudgetMb(host)} MiB）`)
  if (declared?.runtimeMs !== undefined) requirements.push(`运行时长：${Math.round(declared.runtimeMs / 1000)}s（单次交互上限 ${INTERACTIVE_RUNTIME_BUDGET_MS / 1000}s）`)
  if (declared?.datasetMb !== undefined) requirements.push(`数据集：${declared.datasetMb} MiB`)
  if (declared?.modelParameters !== undefined) requirements.push(`模型参数：${declared.modelParameters}`)
  if (declared?.gpu === true) requirements.push('GPU 加速（本机未探测到可用加速运行时）')
  if (requirements.length === 0) requirements.push('声明的资源规模超出本机可交互执行的预算')

  const reduced = buildReducedExperiment(request)
  const knownDifferences = differencesFor(request.kind, reduced, declared)
  const description = reduced === undefined
    ? `该实验超出本机资源：${reasons.join('；')}。当前没有自动生成的可运行替代，教学应改用人工推导/伪代码演示并明确标注“未真实运行”，或按下面的替代建议重新设计小实验。`
    : `该实验超出本机资源：${reasons.join('；')}。替代方案「${reduced.title}」保留了实验的核心原理，但规模显著缩小（${reduced.scaleNote}）；它可真实运行，但结果不能直接当作完整实验的结论。`
  const caveats = [
    '替代实验只用于教学演示原理，不能用于声称复现完整实验的数值或性能结论。',
    '替代实验使用的是合成数据/简化模型/缩小规模，与真实实验的分布、噪声和规模不同。',
    '若课程目标本身要求完整规模结果，需要更强硬件或外部计算资源；第一版不管理远端计算资源。',
    ...(reduced === undefined ? ['未自动生成可运行替代；不得把伪代码演示报告为“已运行”。'] : []),
  ]
  return {
    description,
    knownDifferences,
    fullExperimentRequirements: requirements,
    ...(reduced !== undefined ? { reducedExperiment: reduced } : {}),
    caveats,
  }
}

/** Differences between the full experiment and the substitute for one kind. */
function differencesFor(
  kind: ResourceRequestKind,
  reduced: ReducedExperiment | undefined,
  declared: DeclaredResourceEnvelope | undefined,
): readonly string[] {
  const scale = reduced?.scaleNote ?? '未生成替代实验'
  const header = `完整实验规模：${describeDeclaredResources(declared)}；替代实验规模：${scale}。`
  if (kind === 'training') {
    return [
      header,
      '替代实验用闭式解/极少量样本代替多轮迭代训练：没有 epoch、学习率、优化器状态与真实数据管线的行为。',
      '参数量与数据量缩小若干数量级，训练/验证差距只用于观察“容量与泛化”的方向，不代表真实模型的绝对精度。',
      '数据为合成数据，与真实课程数据的噪声、类别分布不同，指标不可直接对比。',
    ]
  }
  if (kind === 'numerical') {
    return [
      header,
      '替代实验的网格点数、迭代次数与步长远小于完整实验，只验证误差方向和公式正确性。',
      '未覆盖完整实验中的数值稳定性/收敛性分析；极端参数下的行为可能不同。',
    ]
  }
  if (kind === 'simulation') {
    return [
      header,
      '替代实验用确定性平均场/简化规则模拟代替真实随机系统，时间步与样本量缩小。',
      '不声称统计显著性、不覆盖真实系统的随机波动与交互复杂性。',
    ]
  }
  return [
    header,
    '未自动生成可运行替代：需教学者提供保留核心原理的小实验，并明确标注与完整实验的差别。',
  ]
}

/** Pick and build the runnable reduced experiment for a request kind. */
function buildReducedExperiment(request: ResourceRequest): ReducedExperiment | undefined {
  const language = request.language === 'javascript' ? 'javascript' : 'python'
  if (request.kind === 'training') {
    return language === 'javascript' ? javascriptTraining() : pythonTraining()
  }
  if (request.kind === 'numerical') {
    return language === 'javascript' ? javascriptNumerical() : pythonNumerical()
  }
  if (request.kind === 'simulation') {
    return language === 'javascript' ? javascriptSimulation() : pythonSimulation()
  }
  return undefined
}

/** Python: overfitting in a tiny model with a closed-form least-squares fit. */
function pythonTraining(): ReducedExperiment {
  return {
    title: '小规模过拟合演示：容量与泛化',
    language: 'python',
    scaleNote: '10 个训练点 + 30 个验证点、2 个模型（1 次与 15 次多项式）、闭式最小二乘解',
    timeoutMs: 10_000,
    expectedStdout: 'REDUCED-SCALE',
    checks: [
      { name: '替代实验真实运行', type: 'stdout-contains', value: 'overfit(degree=15)' },
      { name: '标记降规模事实', type: 'stdout-contains', value: 'REDUCED-SCALE' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `# T06 降规模替代：小样本 + 小模型，观察训练/验证差异（保留"容量与泛化"原理）
import random
random.seed(11)

def poly_features(x, degree):
    return [x ** k for k in range(degree + 1)]

def solve(a, b):
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-12:
            continue
        m[col], m[pivot] = m[pivot], m[col]
        pv = m[col][col]
        m[col] = [v / pv for v in m[col]]
        for r in range(n):
            if r != col:
                f = m[r][col]
                m[r] = [m[r][c] - f * m[col][c] for c in range(n + 1)]
    return [m[i][n] for i in range(n)]

def fit(train, degree, ridge=1e-8):
    size = degree + 1
    xtx = [[0.0] * size for _ in range(size)]
    xty = [0.0] * size
    for x, y in train:
        features = poly_features(x, degree)
        for i in range(size):
            xty[i] += features[i] * y
            for j in range(size):
                xtx[i][j] += features[i] * features[j]
    for i in range(size):
        xtx[i][i] += ridge
    return solve(xtx, xty)

def mse(coeffs, rows):
    total = 0.0
    for x, y in rows:
        pred = sum(c * x ** k for k, c in enumerate(coeffs))
        total += (pred - y) ** 2
    return total / len(rows)

def sample(n, jitter):
    rows = []
    for i in range(n):
        x = -1.0 + 2.0 * i / (n - 1)
        y = 0.6 * x ** 3 - x + random.uniform(-jitter, jitter)
        rows.append((x, y))
    return rows

train = sample(10, 0.3)
holdout = sample(30, 0.3)
under = fit(train, 1)
over = fit(train, 15)
print(f"underfit(degree=1): train={mse(under, train):.4f} holdout={mse(under, holdout):.4f}")
print(f"overfit(degree=15): train={mse(over, train):.4f} holdout={mse(over, holdout):.4f}")
print("REDUCED-SCALE: 10 训练点 + 30 验证点、纯 Python 闭式解；观察容量与泛化的差异")
`,
  }
}

/** JavaScript variant of the tiny overfitting demonstration. */
function javascriptTraining(): ReducedExperiment {
  return {
    title: '小规模过拟合演示：容量与泛化（JavaScript）',
    language: 'javascript',
    scaleNote: '10 个训练点 + 30 个验证点、1 次与 9 次多项式、闭式解',
    timeoutMs: 10_000,
    expectedStdout: 'REDUCED-SCALE',
    checks: [
      { name: '替代实验真实运行', type: 'stdout-contains', value: 'overfit(degree=9)' },
      { name: '标记降规模事实', type: 'stdout-contains', value: 'REDUCED-SCALE' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `// T06 降规模替代：小样本 + 小模型，观察训练/验证差异（保留"容量与泛化"原理）
let state = 11
function random() { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648 }

function sample(n, jitter) {
  const rows = []
  for (let i = 0; i < n; i += 1) {
    const x = -1 + (2 * i) / (n - 1)
    const y = 0.6 * x ** 3 - x + (random() * 2 - 1) * jitter
    rows.push([x, y])
  }
  return rows
}
function solve(a, b) {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let r = col + 1; r < n; r += 1) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    if (Math.abs(m[pivot][col]) < 1e-12) continue
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    const pv = m[col][col]
    for (let c = col; c <= n; c += 1) m[col][c] /= pv
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const f = m[r][col]
      for (let c = col; c <= n; c += 1) m[r][c] -= f * m[col][c]
    }
  }
  return m.map(row => row[n])
}
function fit(rows, degree) {
  const size = degree + 1
  const xtx = Array.from({ length: size }, () => new Array(size).fill(0))
  const xty = new Array(size).fill(0)
  for (const [x, y] of rows) {
    const f = Array.from({ length: size }, (_, k) => x ** k)
    for (let i = 0; i < size; i += 1) { xty[i] += f[i] * y; for (let j = 0; j < size; j += 1) xtx[i][j] += f[i] * f[j] }
  }
  return solve(xtx, xty)
}
function mse(coeffs, rows) {
  let total = 0
  for (const [x, y] of rows) {
    let pred = 0
    for (let k = 0; k < coeffs.length; k += 1) pred += coeffs[k] * x ** k
    total += (pred - y) ** 2
  }
  return total / rows.length
}
const train = sample(10, 0.3)
const holdout = sample(30, 0.3)
const under = fit(train, 1)
const over = fit(train, 9)
console.log('underfit(degree=1): train=' + mse(under, train).toFixed(4) + ' holdout=' + mse(under, holdout).toFixed(4))
console.log('overfit(degree=9):  train=' + mse(over, train).toFixed(4) + ' holdout=' + mse(over, holdout).toFixed(4))
console.log('REDUCED-SCALE: 10 训练点 + 30 验证点、纯 JavaScript 闭式解；观察容量与泛化的差异')
`,
  }
}

/** Python: finite differences vs analytic derivative on a small grid. */
function pythonNumerical(): ReducedExperiment {
  return {
    title: '小规模数值验证：差分近似与解析解对比',
    language: 'python',
    scaleNote: '4 个采样点 + 3 个步长的中心差分，闭式解析导数对照',
    timeoutMs: 10_000,
    expectedStdout: 'REDUCED-SCALE',
    checks: [
      { name: '替代实验真实运行', type: 'stdout-contains', value: 'max_abs_error=' },
      { name: '标记降规模事实', type: 'stdout-contains', value: 'REDUCED-SCALE' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `# T06 降规模替代：用少量点与步长的中心差分验证导数的数值近似
import math

def f(x):
    return math.sin(x) * x

def df(x):
    return math.cos(x) * x + math.sin(x)

for h in (0.1, 0.01, 0.001):
    errors = [abs((f(x + h) - f(x - h)) / (2 * h) - df(x)) for x in (-1.0, -0.2, 0.3, 1.1)]
    print(f"h={h:<6} max_abs_error={max(errors):.3e}")
print("REDUCED-SCALE: 4 个点 + 3 个步长的中心差分；观察精度与步长的关系（未做完整稳定性分析）")
`,
  }
}

/** JavaScript variant of the finite-difference demonstration. */
function javascriptNumerical(): ReducedExperiment {
  return {
    title: '小规模数值验证：差分近似与解析解对比（JavaScript）',
    language: 'javascript',
    scaleNote: '4 个采样点 + 3 个步长的中心差分，闭式解析导数对照',
    timeoutMs: 10_000,
    expectedStdout: 'REDUCED-SCALE',
    checks: [
      { name: '替代实验真实运行', type: 'stdout-contains', value: 'max_abs_error=' },
      { name: '标记降规模事实', type: 'stdout-contains', value: 'REDUCED-SCALE' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `// T06 降规模替代：用少量点与步长的中心差分验证导数的数值近似
const f = (x) => Math.sin(x) * x
const df = (x) => Math.cos(x) * x + Math.sin(x)
for (const h of [0.1, 0.01, 0.001]) {
  const xs = [-1.0, -0.2, 0.3, 1.1]
  const errors = xs.map((x) => Math.abs((f(x + h) - f(x - h)) / (2 * h) - df(x)))
  console.log('h=' + String(h).padEnd(6) + ' max_abs_error=' + Math.max(...errors).toExponential(3))
}
console.log('REDUCED-SCALE: 4 个点 + 3 个步长的中心差分；观察精度与步长的关系（未做完整稳定性分析）')
`,
  }
}

/** Python: deterministic mean-field SIR simulation. */
function pythonSimulation(): ReducedExperiment {
  return {
    title: '小规模模拟：确定性 SIR 平均场模型',
    language: 'python',
    scaleNote: '200 人、60 天、确定性平均场递推（无随机性与真实数据）',
    timeoutMs: 10_000,
    expectedStdout: 'SIMULATED',
    checks: [
      { name: '模拟真实运行', type: 'stdout-contains', value: 'peak_infected=' },
      { name: '标记模拟事实', type: 'stdout-contains', value: 'SIMULATED' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `# T06 降规模替代：确定性 SIR 平均场模拟（保留传染/恢复机制，不做真实数据仿真）
N = 200
beta = 0.35
gamma = 0.12
susceptible, infected, recovered = N - 1, 1, 0
peak = 0.0
for day in range(60):
    new_infections = beta * susceptible * infected / N
    new_recoveries = gamma * infected
    susceptible -= new_infections
    infected += new_infections - new_recoveries
    recovered += new_recoveries
    peak = max(peak, infected)
print(f"peak_infected={peak:.1f} final_recovered={recovered:.1f}")
print("SIMULATED: 确定性 SIR 平均场（200 人、60 天）；非真实数据、非随机个体模型")
`,
  }
}

/** JavaScript variant of the deterministic SIR simulation. */
function javascriptSimulation(): ReducedExperiment {
  return {
    title: '小规模模拟：确定性 SIR 平均场模型（JavaScript）',
    language: 'javascript',
    scaleNote: '200 人、60 天、确定性平均场递推（无随机性与真实数据）',
    timeoutMs: 10_000,
    expectedStdout: 'SIMULATED',
    checks: [
      { name: '模拟真实运行', type: 'stdout-contains', value: 'peak_infected=' },
      { name: '标记模拟事实', type: 'stdout-contains', value: 'SIMULATED' },
      { name: '正常退出', type: 'exit-code', value: 0 },
    ],
    code: `// T06 降规模替代：确定性 SIR 平均场模拟（保留传染/恢复机制，不做真实数据仿真）
const N = 200
const beta = 0.35
const gamma = 0.12
let susceptible = N - 1
let infected = 1
let recovered = 0
let peak = 0
for (let day = 0; day < 60; day += 1) {
  const newInfections = (beta * susceptible * infected) / N
  const newRecoveries = gamma * infected
  susceptible -= newInfections
  infected += newInfections - newRecoveries
  recovered += newRecoveries
  peak = Math.max(peak, infected)
}
console.log('peak_infected=' + peak.toFixed(1) + ' final_recovered=' + recovered.toFixed(1))
console.log('SIMULATED: 确定性 SIR 平均场（200 人、60 天）；非真实数据、非随机个体模型')
`,
  }
}
