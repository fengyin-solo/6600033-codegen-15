<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4">
      <h1 class="text-2xl font-bold text-cyan-400">蒙特卡洛模拟与统计假设检验平台</h1>
      <p class="text-sm text-slate-500 mt-1">随机采样模拟 · 6种MC场景 · 假设检验 · 分层抽样</p>
    </header>
    <div class="border-b border-slate-700 px-6 py-2 bg-slate-800/50">
      <div class="flex gap-2">
        <button @click="activeTab = 'standard'"
          :class="['px-4 py-2 text-sm font-bold rounded-t transition-all', activeTab === 'standard' ? 'bg-slate-900 text-cyan-400 border border-b-0 border-slate-700' : 'text-slate-400 hover:text-slate-200']">
          标准模拟
        </button>
        <button @click="activeTab = 'stratified'"
          :class="['px-4 py-2 text-sm font-bold rounded-t transition-all', activeTab === 'stratified' ? 'bg-slate-900 text-emerald-400 border border-b-0 border-slate-700' : 'text-slate-400 hover:text-slate-200']">
          分层抽样
        </button>
      </div>
    </div>

    <div v-show="activeTab === 'standard'" class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">模拟场景</h3>
          <div class="space-y-1">
            <div v-for="s in SCENARIOS" :key="s.id" @click="store.setScenario(s)"
              :class="['cursor-pointer p-2 rounded border text-sm transition-all', store.currentScenario.id === s.id ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400' : 'border-slate-700 text-slate-300 hover:border-slate-500']">
              <div class="font-bold">{{ s.name }}</div>
              <div class="text-xs text-slate-500 mt-0.5">{{ s.description }}</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">参数控制</h3>
          <label class="text-xs text-slate-500">迭代次数: {{ store.iterations }}</label>
          <input type="range" min="100" max="5000" step="100" v-model.number="store.iterations" class="w-full mt-1 mb-3 accent-cyan-500" />
          <button @click="store.runSimulation" :disabled="store.isRunning" class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-sm font-bold">
            {{ store.isRunning ? '运行中...' : '▶ 开始模拟' }}
          </button>
        </div>
        <div v-if="store.result" class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm">
          <h3 class="text-sm font-bold text-slate-400 mb-3">模拟结果</h3>
          <div class="space-y-2">
            <div class="flex justify-between"><span class="text-slate-500">估算值</span><span class="text-cyan-400 font-bold font-mono">{{ store.result.estimate.toFixed(6) }}</span></div>
            <div v-if="store.result.trueValue !== undefined" class="flex justify-between"><span class="text-slate-500">真实值</span><span class="text-green-400 font-mono">{{ store.result.trueValue.toFixed(6) }}</span></div>
            <div v-if="store.result.error !== undefined" class="flex justify-between"><span class="text-slate-500">误差</span><span class="text-orange-400 font-mono">{{ store.result.error.toFixed(6) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">样本数</span><span class="text-slate-300">{{ store.result.iterations }}</span></div>
          </div>
        </div>
      </div>
      <div class="lg:w-3/4 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">收敛过程</h3>
          <div ref="convergenceRef" class="w-full rounded" style="height:240px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">样本分布直方图</h3>
          <div ref="histogramRef" class="w-full rounded" style="height:220px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">假设检验 (独立样本 T 检验)</h3>
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label class="text-xs text-slate-500">样本组A (逗号分隔)</label>
              <textarea v-model="group1Input" rows="2" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-none"></textarea>
            </div>
            <div>
              <label class="text-xs text-slate-500">样本组B (逗号分隔)</label>
              <textarea v-model="group2Input" rows="2" class="w-full mt-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500 resize-none"></textarea>
            </div>
          </div>
          <button @click="runTest" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm">执行T检验</button>
          <div v-if="store.testResult" class="mt-3 grid grid-cols-4 gap-3 text-sm">
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">统计量 t</div><div class="text-cyan-400 font-bold font-mono">{{ store.testResult.statistic }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">p 值</div><div class="font-bold font-mono" :class="store.testResult.significant ? 'text-red-400' : 'text-green-400'">{{ store.testResult.pValue }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">自由度 df</div><div class="text-slate-300 font-mono">{{ store.testResult.df }}</div></div>
            <div class="bg-slate-900 rounded p-2 text-center"><div class="text-xs text-slate-500 mb-1">显著性</div><div class="text-xs font-bold" :class="store.testResult.significant ? 'text-red-400' : 'text-green-400'">{{ store.testResult.significant ? '显著(p<0.05)' : '不显著' }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'stratified'" class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/3 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-bold text-slate-400">分层配置</h3>
            <button @click="store.addStratum" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold">+ 添加层</button>
          </div>
          <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div v-for="(stratum, idx) in store.strata" :key="stratum.id" class="bg-slate-900 rounded-lg p-3 border border-slate-700">
              <div class="flex justify-between items-center mb-2">
                <input v-model="stratum.name" @input="updateStratumName(stratum.id, stratum.name)" class="bg-transparent text-sm font-bold text-emerald-400 w-full focus:outline-none border-b border-transparent focus:border-emerald-500" />
                <button @click="store.removeStratum(stratum.id)" class="text-red-400 hover:text-red-300 text-xs ml-2" title="删除层">✕</button>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <label class="text-slate-500">场景</label>
                  <select v-model="stratum.scenarioId" @change="updateStratumScenario(stratum.id, stratum.scenarioId)"
                    class="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500">
                    <option v-for="s in SCENARIOS" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-slate-500">权重: {{ stratum.weight.toFixed(3) }}</label>
                    <input type="range" min="0.01" max="1" step="0.01" v-model.number="stratum.weight"
                      @change="updateStratumWeight(stratum.id, stratum.weight)"
                      class="w-full mt-1 accent-emerald-500" />
                  </div>
                  <div>
                    <label class="text-slate-500">样本量: {{ stratum.sampleSize }}</label>
                    <input type="range" min="100" max="2000" step="50" v-model.number="stratum.sampleSize"
                      @change="updateStratumSampleSize(stratum.id, stratum.sampleSize)"
                      class="w-full mt-1 accent-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button @click="store.runStratifiedSimulation" :disabled="store.isStratifiedRunning || store.strata.length === 0"
            class="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-sm font-bold">
            {{ store.isStratifiedRunning ? '运行中...' : '▶ 开始分层抽样' }}
          </button>
        </div>

        <div v-if="store.stratifiedResult" class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm">
          <h3 class="text-sm font-bold text-slate-400 mb-3">总体估计结果</h3>
          <div class="space-y-2">
            <div class="flex justify-between"><span class="text-slate-500">总体估计值</span><span class="text-emerald-400 font-bold font-mono">{{ store.stratifiedResult.overallEstimate.toFixed(6) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">总样本量</span><span class="text-slate-300">{{ store.stratifiedResult.totalSamples }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">标准误</span><span class="text-orange-400 font-mono">{{ store.stratifiedResult.overallStdError.toFixed(6) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">方差</span><span class="text-slate-300 font-mono">{{ store.stratifiedResult.overallVariance.toFixed(8) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">层数</span><span class="text-slate-300">{{ store.stratifiedResult.strata.length }}</span></div>
          </div>
        </div>

        <div v-if="store.stratifiedResult" class="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm">
          <h3 class="text-sm font-bold text-slate-400 mb-3">各层结果详情</h3>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div v-for="s in store.stratifiedResult.strata" :key="s.stratumId" class="bg-slate-900 rounded p-2">
              <div class="font-bold text-emerald-400 text-xs mb-1">{{ s.stratumName }}</div>
              <div class="grid grid-cols-2 gap-1 text-xs text-slate-400">
                <span>权重: {{ s.weight.toFixed(3) }}</span>
                <span>样本: {{ s.sampleSize }}</span>
                <span>估计: <span class="text-cyan-400 font-mono">{{ s.estimate.toFixed(4) }}</span></span>
                <span>标准误: <span class="text-orange-400 font-mono">{{ s.stdError.toFixed(4) }}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:w-2/3 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">各层收敛过程对比</h3>
          <div ref="stratifiedConvRef" class="w-full rounded" style="height:260px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">各层样本分布对比</h3>
          <div ref="stratifiedHistRef" class="w-full rounded" style="height:240px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3">权重分布</h3>
          <div ref="weightChartRef" class="w-full rounded" style="height:200px;background:#0f172a;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useMCStore, SCENARIOS } from './store/mc'
import type { StratumConfig } from './store/mc'

const store = useMCStore()
const activeTab = ref<'standard' | 'stratified'>('standard')
const convergenceRef = ref<HTMLDivElement | null>(null)
const histogramRef = ref<HTMLDivElement | null>(null)
const stratifiedConvRef = ref<HTMLDivElement | null>(null)
const stratifiedHistRef = ref<HTMLDivElement | null>(null)
const weightChartRef = ref<HTMLDivElement | null>(null)
const group1Input = ref('5.1,4.8,5.3,4.9,5.2,5.0,4.7,5.1,5.4,4.8')
const group2Input = ref('4.6,4.2,4.9,4.3,4.5,4.7,4.4,4.8,4.1,4.6')
let convChart: echarts.ECharts | null = null
let histChart: echarts.ECharts | null = null
let stratifiedConvChart: echarts.ECharts | null = null
let stratifiedHistChart: echarts.ECharts | null = null
let weightChart: echarts.ECharts | null = null

const STRATUM_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function initCharts() {
  if (convergenceRef.value) convChart = echarts.init(convergenceRef.value, 'dark')
  if (histogramRef.value) histChart = echarts.init(histogramRef.value, 'dark')
  if (stratifiedConvRef.value) stratifiedConvChart = echarts.init(stratifiedConvRef.value, 'dark')
  if (stratifiedHistRef.value) stratifiedHistChart = echarts.init(stratifiedHistRef.value, 'dark')
  if (weightChartRef.value) weightChart = echarts.init(weightChartRef.value, 'dark')
}

function updateCharts() {
  if (convChart && store.convergenceData.length > 0) {
    convChart.setOption({
      backgroundColor: '#0f172a',
      grid: { top: 20, bottom: 35, left: 65, right: 20 },
      xAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series: [{ type: 'line', data: store.convergenceData, smooth: true, lineStyle: { color: '#06b6d4', width: 2 }, areaStyle: { color: 'rgba(6,182,212,0.1)' }, symbol: 'none' }],
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
  if (histChart && store.histogramData.xAxis.length > 0) {
    histChart.setOption({
      backgroundColor: '#0f172a',
      grid: { top: 15, bottom: 40, left: 55, right: 15 },
      xAxis: { type: 'category', data: store.histogramData.xAxis, axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series: [{ type: 'bar', data: store.histogramData.data, itemStyle: { color: '#8b5cf6' } }],
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
}

function updateStratifiedCharts() {
  if (stratifiedConvChart && store.stratifiedConvergenceData.length > 0) {
    const series = store.stratifiedConvergenceData.map((s, i) => ({
      name: s.name,
      type: 'line' as const,
      data: s.data,
      smooth: true,
      lineStyle: { width: 2, color: STRATUM_COLORS[i % STRATUM_COLORS.length] },
      symbol: 'none'
    }))
    stratifiedConvChart.setOption({
      backgroundColor: '#0f172a',
      legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { top: 30, bottom: 35, left: 65, right: 20 },
      xAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series,
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
  if (stratifiedHistChart && store.stratifiedHistogramData.length > 0) {
    const series = store.stratifiedHistogramData.map((s, i) => ({
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      itemStyle: { color: STRATUM_COLORS[i % STRATUM_COLORS.length] }
    }))
    const xAxisData = store.stratifiedHistogramData[0]?.xAxis || []
    stratifiedHistChart.setOption({
      backgroundColor: '#0f172a',
      legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { top: 30, bottom: 40, left: 55, right: 15 },
      xAxis: { type: 'category', data: xAxisData, axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 } },
      series,
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569' }
    })
  }
  if (weightChart && store.strata.length > 0) {
    const pieData = store.strata.map((s, i) => ({
      value: s.weight,
      name: s.name,
      itemStyle: { color: STRATUM_COLORS[i % STRATUM_COLORS.length] }
    }))
    weightChart.setOption({
      backgroundColor: '#0f172a',
      legend: { right: 10, top: 'center', orient: 'vertical' as const, textStyle: { color: '#94a3b8', fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        data: pieData,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } }
      }],
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#475569', formatter: '{b}: {d}%' }
    })
  }
}

function updateStratumName(id: string, name: string) {
  store.updateStratum(id, { name })
}

function updateStratumScenario(id: string, scenarioId: string) {
  const scenario = SCENARIOS.find(s => s.id === scenarioId)
  if (scenario) {
    store.updateStratum(id, { scenarioId, params: { ...scenario.params } })
  }
}

function updateStratumWeight(id: string, weight: number) {
  store.updateStratum(id, { weight })
}

function updateStratumSampleSize(id: string, sampleSize: number) {
  store.updateStratum(id, { sampleSize })
}

function runTest() {
  const g1 = group1Input.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  const g2 = group2Input.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  if (g1.length > 1 && g2.length > 1) store.runTest(g1, g2)
}

function handleResize() {
  convChart?.resize()
  histChart?.resize()
  stratifiedConvChart?.resize()
  stratifiedHistChart?.resize()
  weightChart?.resize()
}

onMounted(() => {
  initCharts()
  store.runSimulation()
  window.addEventListener('resize', handleResize)
})

watch(() => store.result, () => updateCharts(), { deep: true })
watch(() => store.stratifiedResult, () => updateStratifiedCharts(), { deep: true })
watch(() => store.strata, () => updateStratifiedCharts(), { deep: true })
watch(activeTab, () => {
  setTimeout(() => handleResize(), 50)
})
</script>
