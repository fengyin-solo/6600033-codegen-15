<template>
  <div class="min-h-screen bg-slate-900 text-slate-200">
    <header class="border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-cyan-400">蒙特卡洛模拟与统计假设检验平台</h1>
          <p class="text-sm text-slate-500 mt-1">随机采样模拟 · 6种MC场景 · 假设检验 · 分层抽样</p>
        </div>
        <div class="flex gap-3">
          <div @click="activeTab = 'standard'"
            :class="['cursor-pointer px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2', activeTab === 'standard' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200']">
            <span class="text-lg">🎲</span>
            <div>
              <div class="text-sm font-bold">标准模拟</div>
              <div class="text-xs opacity-70">单场景蒙特卡洛</div>
            </div>
          </div>
          <div @click="activeTab = 'stratified'"
            :class="['cursor-pointer px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2', activeTab === 'stratified' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200']">
            <span class="text-lg">📊</span>
            <div>
              <div class="text-sm font-bold">分层抽样</div>
              <div class="text-xs opacity-70">多分组汇总估计</div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div v-show="activeTab === 'standard'" class="flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-1/4 space-y-4">
        <div class="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 rounded-lg p-4 border border-emerald-700/50 cursor-pointer hover:border-emerald-500 transition-all" @click="activeTab = 'stratified'">
          <div class="flex items-start gap-3">
            <span class="text-2xl">✨</span>
            <div>
              <h3 class="text-sm font-bold text-emerald-400 mb-1">试试分层抽样</h3>
              <p class="text-xs text-slate-400">按不同样本分组分别建模，汇总得到更精确的总体估计结果 →</p>
            </div>
          </div>
        </div>
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
      <div class="lg:w-5/12 space-y-4">
        <div class="bg-gradient-to-br from-emerald-900/20 to-slate-800 rounded-lg p-4 border border-emerald-700/30">
          <div class="flex items-start gap-3">
            <span class="text-2xl">💡</span>
            <div>
              <h3 class="text-sm font-bold text-emerald-400 mb-1">什么是分层抽样？</h3>
              <p class="text-xs text-slate-400">将总体按某些特征分成若干层（组），每层独立进行蒙特卡洛模拟，最后按权重加权汇总，得到更精确的总体估计。</p>
            </div>
          </div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-bold text-slate-400 flex items-center gap-2">
              <span>📋</span> 分层配置
            </h3>
            <button @click="store.addStratum" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold flex items-center gap-1">
              <span>+</span> 添加分组
            </button>
          </div>
          <div class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            <div v-for="(stratum, idx) in store.strata" :key="stratum.id"
              :class="['rounded-lg p-3 border-2 transition-all',
                stratumResults[stratum.id]?.running
                  ? 'bg-amber-900/20 border-amber-500/50'
                  : stratumResults[stratum.id]?.result
                    ? 'bg-slate-900 border-emerald-500/30'
                    : 'bg-slate-900 border-slate-700']">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" :style="{background: STRATUM_COLORS[idx % STRATUM_COLORS.length] + '30', color: STRATUM_COLORS[idx % STRATUM_COLORS.length]}">
                    {{ idx + 1 }}
                  </span>
                  <input v-model="stratum.name" @input="updateStratumName(stratum.id, stratum.name)"
                    class="bg-transparent text-sm font-bold text-emerald-400 w-full focus:outline-none border-b border-transparent focus:border-emerald-500" />
                </div>
                <div class="flex items-center gap-1">
                  <button @click="runSingleStratum(stratum.id)"
                    :disabled="stratumResults[stratum.id]?.running"
                    class="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-xs font-bold" title="单独运行该层">
                    {{ stratumResults[stratum.id]?.running ? '⏳' : '▶' }}
                  </button>
                  <button @click="store.removeStratum(stratum.id)" class="text-red-400 hover:text-red-300 text-xs px-2 py-1" title="删除层">✕</button>
                </div>
              </div>
              <div class="space-y-2 text-xs">
                <div>
                  <label class="text-slate-500">模拟场景</label>
                  <select v-model="stratum.scenarioId" @change="updateStratumScenario(stratum.id, stratum.scenarioId)"
                    class="w-full mt-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500">
                    <option v-for="s in SCENARIOS" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-slate-500">权重: <span class="text-emerald-400 font-mono">{{ stratum.weight.toFixed(3) }}</span></label>
                    <input type="range" min="0.01" max="1" step="0.01" v-model.number="stratum.weight"
                      @change="updateStratumWeight(stratum.id, stratum.weight)"
                      class="w-full mt-1 accent-emerald-500" />
                  </div>
                  <div>
                    <label class="text-slate-500">样本量: <span class="text-cyan-400 font-mono">{{ stratum.sampleSize }}</span></label>
                    <input type="range" min="100" max="2000" step="50" v-model.number="stratum.sampleSize"
                      @change="updateStratumSampleSize(stratum.id, stratum.sampleSize)"
                      class="w-full mt-1 accent-emerald-500" />
                  </div>
                </div>
                <div v-if="stratumResults[stratum.id]?.result" class="bg-slate-800/50 rounded p-2 mt-2">
                  <div class="grid grid-cols-2 gap-1 text-xs">
                    <span class="text-slate-500">估计值:</span>
                    <span class="text-cyan-400 font-mono text-right">{{ stratumResults[stratum.id].result.estimate.toFixed(4) }}</span>
                    <span class="text-slate-500">标准误:</span>
                    <span class="text-orange-400 font-mono text-right">{{ stratumResults[stratum.id].result.stdError.toFixed(4) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="store.runStratifiedSimulation"
              :disabled="store.isStratifiedRunning || store.strata.length === 0"
              class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-sm font-bold flex items-center justify-center gap-2">
              {{ store.isStratifiedRunning ? '⏳ 运行中...' : '▶ 全部运行' }}
            </button>
            <button @click="clearStratifiedResults"
              class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold">
              重置
            </button>
          </div>
        </div>

        <div v-if="store.stratifiedResult" class="bg-slate-800 rounded-lg p-4 border border-emerald-500/30">
          <h3 class="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <span>📊</span> 总体估计结果
          </h3>
          <div class="space-y-3">
            <div class="bg-slate-900 rounded-lg p-3 text-center">
              <div class="text-xs text-slate-500 mb-1">总体加权估计值</div>
              <div class="text-2xl font-bold font-mono text-emerald-400">{{ store.stratifiedResult.overallEstimate.toFixed(6) }}</div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="bg-slate-900 rounded p-2 text-center">
                <div class="text-xs text-slate-500 mb-1">总样本量</div>
                <div class="font-mono text-slate-300">{{ store.stratifiedResult.totalSamples }}</div>
              </div>
              <div class="bg-slate-900 rounded p-2 text-center">
                <div class="text-xs text-slate-500 mb-1">分组数量</div>
                <div class="font-mono text-slate-300">{{ store.stratifiedResult.strata.length }}</div>
              </div>
              <div class="bg-slate-900 rounded p-2 text-center">
                <div class="text-xs text-slate-500 mb-1">标准误</div>
                <div class="font-mono text-orange-400">{{ store.stratifiedResult.overallStdError.toFixed(6) }}</div>
              </div>
              <div class="bg-slate-900 rounded p-2 text-center">
                <div class="text-xs text-slate-500 mb-1">方差</div>
                <div class="font-mono text-slate-400">{{ store.stratifiedResult.overallVariance.toFixed(8) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="store.stratifiedResult" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span>📈</span> 各层结果汇总
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-slate-700">
                  <th class="text-left py-2 px-2 text-slate-500">分组</th>
                  <th class="text-right py-2 px-2 text-slate-500">权重</th>
                  <th class="text-right py-2 px-2 text-slate-500">样本</th>
                  <th class="text-right py-2 px-2 text-slate-500">估计值</th>
                  <th class="text-right py-2 px-2 text-slate-500">标准误</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in store.stratifiedResult.strata" :key="s.stratumId" class="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td class="py-2 px-2">
                    <span class="font-bold text-emerald-400">{{ s.stratumName }}</span>
                  </td>
                  <td class="text-right py-2 px-2 font-mono text-slate-300">{{ s.weight.toFixed(3) }}</td>
                  <td class="text-right py-2 px-2 font-mono text-slate-300">{{ s.sampleSize }}</td>
                  <td class="text-right py-2 px-2 font-mono text-cyan-400">{{ s.estimate.toFixed(4) }}</td>
                  <td class="text-right py-2 px-2 font-mono text-orange-400">{{ s.stdError.toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="lg:w-7/12 space-y-4">
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span>📉</span> 各层收敛过程对比
          </h3>
          <div ref="stratifiedConvRef" class="w-full rounded" style="height:260px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span>📊</span> 各层样本分布对比
          </h3>
          <div ref="stratifiedHistRef" class="w-full rounded" style="height:240px;background:#0f172a;"></div>
        </div>
        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 class="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <span>🥧</span> 权重分布
          </h3>
          <div ref="weightChartRef" class="w-full rounded" style="height:200px;background:#0f172a;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useMCStore, SCENARIOS, runMC } from './store/mc'
import type { StratumConfig, StratumResult } from './store/mc'

const store = useMCStore()
const activeTab = ref<'standard' | 'stratified'>('stratified')
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

interface SingleStratumState {
  running: boolean
  result: StratumResult | null
}

const stratumResults = reactive<Record<string, SingleStratumState>>({})

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
    delete stratumResults[id]
  }
}

function updateStratumWeight(id: string, weight: number) {
  store.updateStratum(id, { weight })
}

function updateStratumSampleSize(id: string, sampleSize: number) {
  store.updateStratum(id, { sampleSize })
}

function runSingleStratum(id: string) {
  const stratum = store.strata.find(s => s.id === id)
  if (!stratum) return

  stratumResults[id] = { running: true, result: null }

  setTimeout(() => {
    const scenario = SCENARIOS.find(s => s.id === stratum.scenarioId)
    if (!scenario) {
      stratumResults[id] = { running: false, result: null }
      return
    }

    const mergedParams = { ...scenario.params, ...stratum.params }
    const mcResult = runMC({ ...scenario, params: mergedParams }, stratum.sampleSize)

    const mean = mcResult.estimate
    const variance = mcResult.samples.length > 1
      ? mcResult.samples.reduce((s: number, x: number) => s + (x - mean) ** 2, 0) / (mcResult.samples.length - 1)
      : 0
    const result: StratumResult = {
      stratumId: stratum.id,
      stratumName: stratum.name,
      weight: stratum.weight,
      sampleSize: stratum.sampleSize,
      estimate: mean,
      variance,
      stdError: Math.sqrt(variance / stratum.sampleSize),
      samples: mcResult.samples,
      convergence: mcResult.convergence
    }
    stratumResults[id] = { running: false, result }
  }, 50)
}

function clearStratifiedResults() {
  Object.keys(stratumResults).forEach(key => {
    delete stratumResults[key]
  })
  store.stratifiedResult = null
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
  setTimeout(() => {
    if (activeTab.value === 'stratified') {
      store.runStratifiedSimulation()
    }
  }, 500)
  window.addEventListener('resize', handleResize)
})

watch(() => store.result, () => updateCharts(), { deep: true })
watch(() => store.stratifiedResult, () => {
  updateStratifiedCharts()
  if (store.stratifiedResult) {
    store.stratifiedResult.strata.forEach(s => {
      stratumResults[s.stratumId] = { running: false, result: s }
    })
  }
}, { deep: true })
watch(() => store.strata, () => updateStratifiedCharts(), { deep: true })
watch(activeTab, () => {
  setTimeout(() => handleResize(), 50)
})
</script>
