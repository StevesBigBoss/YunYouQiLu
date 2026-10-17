<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <slot name="extra" />
    </div>
    <div class="chart-body" ref="chartRef">
      <div v-if="loading" class="chart-loading">{{ t('加载中...') }}</div>
      <div v-else-if="isEmpty" class="chart-empty">{{ t('暂无数据') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { CHART_THEME_NAME } from '../../config/theme'
import { t } from '../../config/i18n'

const props = withDefaults(defineProps<{
  title: string
  option?: Record<string, unknown>
  loading?: boolean
  height?: string
}>(), {
  loading: false,
  height: '280px',
})

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

const isEmpty = ref(false)

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value, CHART_THEME_NAME)
  if (props.option) {
    chartInstance.setOption(props.option)
  }
}

function updateChart() {
  if (!chartInstance) return
  if (props.option) {
    chartInstance.setOption(props.option, true)
    isEmpty.value = false
  } else {
    isEmpty.value = true
  }
}

function resize() {
  chartInstance?.resize()
}

defineExpose({ resize, getInstance: () => chartInstance })

watch(() => props.option, () => {
  nextTick(updateChart)
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.chart-card {
  background: var(--gradient-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.chart-body {
  flex: 1;
  width: 100%;
  position: relative;
  min-height: v-bind(height);
}
.chart-loading, .chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
