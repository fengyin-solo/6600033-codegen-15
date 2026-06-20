import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface MCScenario {
  id: string
  name: string
  description: string
  params: Record<string, number>
  category: string
}

export interface MCResult {
  scenario: string
  iterations: number
  estimate: number
  trueValue?: number
  error?: number
  samples: number[]
  convergence: number[]
}

export interface HypTestResult {
  testType: string
  statistic: number
  pValue: number
  significant: boolean
  alpha: number
  df?: number
}

export interface StratumConfig {
  id: string
  name: string
  scenarioId: string
  weight: number
  sampleSize: number
  params: Record<string, number>
}

export interface StratumResult {
  stratumId: string
  stratumName: string
  weight: number
  sampleSize: number
  estimate: number
  variance: number
  stdError: number
  samples: number[]
  convergence: number[]
}

export interface StratifiedResult {
  overallEstimate: number
  overallVariance: number
  overallStdError: number
  totalSamples: number
  strata: StratumResult[]
}

function normalRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function runMC(scenario: MCScenario, n: number): MCResult {
  const samples: number[] = []
  const convergence: number[] = []

  if (scenario.id === 'pi') {
    let inside = 0
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1
      if (x * x + y * y <= 1) inside++
      samples.push(x * x + y * y <= 1 ? 1 : 0)
      convergence.push((inside / (i + 1)) * 4)
    }
    const estimate = (inside / n) * 4
    return { scenario: 'pi', iterations: n, estimate, trueValue: Math.PI, error: Math.abs(estimate - Math.PI), samples, convergence }
  }
  if (scenario.id === 'brownian') {
    let pos = 0
    const dt = scenario.params.dt || 0.01
    for (let i = 0; i < n; i++) { pos += normalRandom() * Math.sqrt(dt); samples.push(pos) }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'brownian', iterations: n, estimate: pos, samples, convergence }
  }
  if (scenario.id === 'option') {
    const { S0 = 100, K = 105, r = 0.05, sigma = 0.2, T = 1 } = scenario.params
    let payoffSum = 0
    for (let i = 0; i < n; i++) {
      const ST = S0 * Math.exp((r - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * normalRandom())
      const p = Math.max(ST - K, 0); payoffSum += p; samples.push(p)
      if ((i + 1) % 50 === 0) convergence.push((payoffSum / (i + 1)) * Math.exp(-r * T))
    }
    return { scenario: 'option', iterations: n, estimate: (payoffSum / n) * Math.exp(-r * T), samples, convergence }
  }
  if (scenario.id === 'random_walk') {
    let pos = 0
    for (let i = 0; i < n; i++) { pos += Math.random() > 0.5 ? 1 : -1; samples.push(pos) }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'random_walk', iterations: n, estimate: pos, samples, convergence }
  }
  if (scenario.id === 'diffusion') {
    const { D = 1, dt = 0.01 } = scenario.params
    let x = 0, y = 0
    for (let i = 0; i < n; i++) {
      x += normalRandom() * Math.sqrt(2 * D * dt); y += normalRandom() * Math.sqrt(2 * D * dt)
      samples.push(Math.sqrt(x * x + y * y))
    }
    convergence.push(...samples.slice(0, 200))
    return { scenario: 'diffusion', iterations: n, estimate: Math.sqrt(x * x + y * y), samples, convergence }
  }
  // gambler
  const { p = 0.45, bankroll = 50, goal = 100 } = scenario.params
  let ruinCount = 0
  for (let i = 0; i < n; i++) {
    let money = bankroll
    let steps = 0
    while (money > 0 && money < goal && steps < 10000) { money += Math.random() < p ? 1 : -1; steps++ }
    if (money <= 0) ruinCount++
    samples.push(money <= 0 ? 0 : 1)
    convergence.push(ruinCount / (i + 1))
  }
  return { scenario: 'gambler', iterations: n, estimate: ruinCount / n, samples, convergence }
}

function computeVariance(samples: number[], mean: number): number {
  if (samples.length < 2) return 0
  return samples.reduce((s, x) => s + (x - mean) ** 2, 0) / (samples.length - 1)
}

function getScenarioById(id: string): MCScenario | undefined {
  return SCENARIOS.find(s => s.id === id)
}

function runStratum(stratum: StratumConfig): StratumResult {
  const scenario = getScenarioById(stratum.scenarioId)
  if (!scenario) {
    return {
      stratumId: stratum.id,
      stratumName: stratum.name,
      weight: stratum.weight,
      sampleSize: 0,
      estimate: 0,
      variance: 0,
      stdError: 0,
      samples: [],
      convergence: []
    }
  }
  const mergedParams = { ...scenario.params, ...stratum.params }
  const mcResult = runMC({ ...scenario, params: mergedParams }, stratum.sampleSize)
  const variance = computeVariance(mcResult.samples, mcResult.estimate)
  return {
    stratumId: stratum.id,
    stratumName: stratum.name,
    weight: stratum.weight,
    sampleSize: stratum.sampleSize,
    estimate: mcResult.estimate,
    variance,
    stdError: Math.sqrt(variance / stratum.sampleSize),
    samples: mcResult.samples,
    convergence: mcResult.convergence
  }
}

function runStratifiedSampling(strata: StratumConfig[]): StratifiedResult {
  const stratumResults = strata.map(s => runStratum(s))
  const totalWeight = stratumResults.reduce((sum, s) => sum + s.weight, 0)
  let overallEstimate = 0
  let overallVariance = 0
  let totalSamples = 0
  stratumResults.forEach(s => {
    const w = totalWeight > 0 ? s.weight / totalWeight : 0
    overallEstimate += w * s.estimate
    overallVariance += w * w * (s.variance / s.sampleSize)
    totalSamples += s.sampleSize
  })
  return {
    overallEstimate,
    overallVariance,
    overallStdError: Math.sqrt(overallVariance),
    totalSamples,
    strata: stratumResults
  }
}

export const SCENARIOS: MCScenario[] = [
  { id: 'pi', name: '圆周率π估算', description: '随机投点估算π值，观察收敛过程', params: {}, category: '基础' },
  { id: 'brownian', name: '布朗运动模拟', description: '粒子热运动随机路径模拟', params: { dt: 0.01 }, category: '物理' },
  { id: 'option', name: '欧式期权定价', description: 'Black-Scholes期权价格蒙特卡洛估算', params: { S0: 100, K: 105, r: 0.05, sigma: 0.2, T: 1 }, category: '金融' },
  { id: 'random_walk', name: '随机游走', description: '一维离散随机游走轨迹模拟', params: {}, category: '基础' },
  { id: 'diffusion', name: '粒子扩散', description: '二维粒子随机扩散位移分析', params: { D: 1, dt: 0.01 }, category: '物理' },
  { id: 'gambler', name: '赌徒破产', description: '不利赌局下资金耗尽概率估算', params: { p: 0.45, bankroll: 50, goal: 100 }, category: '概率' }
]

export const DEFAULT_STRATA: StratumConfig[] = [
  { id: 'stratum-1', name: '层1 - 低价期权', scenarioId: 'option', weight: 0.4, sampleSize: 500, params: { S0: 90, K: 100, r: 0.05, sigma: 0.15, T: 1 } },
  { id: 'stratum-2', name: '层2 - 平价期权', scenarioId: 'option', weight: 0.35, sampleSize: 500, params: { S0: 100, K: 100, r: 0.05, sigma: 0.2, T: 1 } },
  { id: 'stratum-3', name: '层3 - 高价期权', scenarioId: 'option', weight: 0.25, sampleSize: 500, params: { S0: 115, K: 100, r: 0.05, sigma: 0.3, T: 1 } }
]

export const useMCStore = defineStore('mc', () => {
  const currentScenario = ref<MCScenario>(SCENARIOS[0])
  const iterations = ref(1000)
  const result = ref<MCResult | null>(null)
  const testResult = ref<HypTestResult | null>(null)
  const isRunning = ref(false)
  const strata = ref<StratumConfig[]>([...DEFAULT_STRATA])
  const stratifiedResult = ref<StratifiedResult | null>(null)
  const isStratifiedRunning = ref(false)

  function runSimulation() {
    isRunning.value = true
    setTimeout(() => { result.value = runMC(currentScenario.value, iterations.value); isRunning.value = false }, 10)
  }

  function runTest(g1: number[], g2: number[]) {
    const n1 = g1.length, n2 = g2.length
    const m1 = g1.reduce((a, b) => a + b, 0) / n1
    const m2 = g2.reduce((a, b) => a + b, 0) / n2
    const v1 = g1.reduce((s, x) => s + (x - m1) ** 2, 0) / (n1 - 1)
    const v2 = g2.reduce((s, x) => s + (x - m2) ** 2, 0) / (n2 - 1)
    const se = Math.sqrt(v1 / n1 + v2 / n2)
    const t = (m1 - m2) / se
    const df = Math.round((v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1)))
    const pValue = 2 * (1 - Math.min(0.9999, Math.abs(t) / (Math.abs(t) + Math.sqrt(df))))
    testResult.value = { testType: 'Welch T检验', statistic: Math.round(t * 1000) / 1000, pValue: Math.round(pValue * 10000) / 10000, significant: pValue < 0.05, alpha: 0.05, df }
  }

  function setScenario(s: MCScenario) { currentScenario.value = s; result.value = null }

  const convergenceData = computed(() => {
    if (!result.value) return [] as [number, number][]
    return result.value.convergence.slice(0, 200).map((v, i): [number, number] => [i, Math.round(v * 100000) / 100000])
  })

  const histogramData = computed(() => {
    if (!result.value) return { xAxis: [] as number[], data: [] as number[] }
    const s = result.value.samples.slice(0, 1000)
    const mn = Math.min(...s), mx = Math.max(...s)
    const bins = 20, bs = (mx - mn) / bins || 1
    const counts = new Array(bins).fill(0)
    s.forEach(v => { counts[Math.min(bins - 1, Math.floor((v - mn) / bs))]++ })
    return { xAxis: Array.from({ length: bins }, (_, i) => Math.round((mn + i * bs) * 100) / 100), data: counts }
  })

  function addStratum() {
    const id = `stratum-${Date.now()}`
    const scenario = SCENARIOS[0]
    strata.value.push({
      id,
      name: `新层 ${strata.value.length + 1}`,
      scenarioId: scenario.id,
      weight: 1 / (strata.value.length + 1),
      sampleSize: 500,
      params: { ...scenario.params }
    })
    normalizeWeights()
  }

  function removeStratum(id: string) {
    strata.value = strata.value.filter(s => s.id !== id)
    normalizeWeights()
  }

  function updateStratum(id: string, updates: Partial<StratumConfig>) {
    const stratum = strata.value.find(s => s.id === id)
    if (stratum) {
      Object.assign(stratum, updates)
    }
  }

  function normalizeWeights() {
    const total = strata.value.reduce((sum, s) => sum + s.weight, 0)
    if (total > 0) {
      strata.value.forEach(s => { s.weight = Math.round((s.weight / total) * 1000) / 1000 })
    }
  }

  function runStratifiedSimulation() {
    isStratifiedRunning.value = true
    setTimeout(() => {
      stratifiedResult.value = runStratifiedSampling(strata.value)
      isStratifiedRunning.value = false
    }, 10)
  }

  const stratifiedConvergenceData = computed(() => {
    if (!stratifiedResult.value) return [] as { name: string; data: [number, number][] }[]
    return stratifiedResult.value.strata.map(s => ({
      name: s.stratumName,
      data: s.convergence.slice(0, 200).map((v, i): [number, number] => [i, Math.round(v * 100000) / 100000])
    }))
  })

  const stratifiedHistogramData = computed(() => {
    if (!stratifiedResult.value) return [] as { name: string; xAxis: number[]; data: number[] }[]
    return stratifiedResult.value.strata.map(s => {
      const samples = s.samples.slice(0, 500)
      const mn = Math.min(...samples), mx = Math.max(...samples)
      const bins = 20, bs = (mx - mn) / bins || 1
      const counts = new Array(bins).fill(0)
      samples.forEach(v => { counts[Math.min(bins - 1, Math.floor((v - mn) / bs))]++ })
      return {
        name: s.stratumName,
        xAxis: Array.from({ length: bins }, (_, i) => Math.round((mn + i * bs) * 100) / 100),
        data: counts
      }
    })
  })

  return {
    currentScenario, iterations, result, testResult, isRunning,
    convergenceData, histogramData,
    strata, stratifiedResult, isStratifiedRunning,
    stratifiedConvergenceData, stratifiedHistogramData,
    runSimulation, runTest, setScenario, runMC,
    addStratum, removeStratum, updateStratum, runStratifiedSimulation
  }
})
