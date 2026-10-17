<template>
  <div class="flow-monitor">
    <!-- 顶部筛选 -->
    <FilterBar v-model="filter" :show-platform="false" :show-sentiment="false" />

    <!-- 第一行：实时客流 + 来源地 + 年龄分布 -->
    <div class="grid grid-3">
      <StatCard
        :title="t('实时客流（今日）')"
        :value="realtime.total"
        :unit="t('人次')"
        :yoy="realtime.yoy"
        :mom="realtime.mom"
        icon="flow"
      />
      <ChartCard :title="t('游客来源地分布 · {scope}', { scope: scopeLabel })" :option="sourceOption" height="260px" />
      <ChartCard :title="t('游客年龄分布 · {scope}', { scope: scopeLabel })" :option="ageOption" height="260px" />
    </div>

    <!-- 第二行：承载量预警 + 消费偏好 -->
    <div class="grid grid-2">
      <div class="common-card">
        <div class="card-title">
          <span>{{ t('景区承载量预警 · {scope}', { scope: scopeLabel }) }}</span>
          <span class="tag tag-gold">{{ t('{n} 个景区', { n: flowWarnings.length }) }}</span>
        </div>
        <table class="common-table">
          <thead>
            <tr>
              <th>{{ t('景区名称') }}</th>
              <th>{{ t('当前客流') }}</th>
              <th>{{ t('承载量') }}</th>
              <th>{{ t('使用率') }}</th>
              <th>{{ t('预警等级') }}</th>
              <th>{{ t('操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(w, i) in flowWarnings" :key="i">
              <td>{{ tv(w.spot) }}</td>
              <td>{{ w.flow.toLocaleString() }}</td>
              <td>{{ w.capacity.toLocaleString() }}</td>
              <td>
                <div class="usage">
                  <div class="usage-bar">
                    <div class="usage-fill" :class="levelTag(w.level)" :style="{ width: usagePercent(w) + '%' }"></div>
                  </div>
                  <span class="usage-text">{{ usagePercent(w) }}%</span>
                </div>
              </td>
              <td><span class="tag" :class="levelTag(w.level)">{{ tv(w.level) }}</span></td>
              <td>
                <button class="btn" @click="emergency(w.spot)">{{ t('应急指挥') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ChartCard :title="t('游客消费偏好 · {scope}', { scope: scopeLabel })" :option="consumeOption" height="300px" />
    </div>

    <!-- 底部趋势图 -->
    <ChartCard :title="t('客流趋势 · {scope}', { scope: scopeLabel })" :option="trendOption" height="300px">
      <template #extra>
        <div class="btn-group">
          <button
            v-for="m in trendModes"
            :key="m.value"
            class="btn"
            :class="{ active: trendMode === m.value }"
            @click="trendMode = m.value"
          >{{ t(m.label) }}</button>
        </div>
      </template>
    </ChartCard>

    <!-- 迁入迁出 + 过夜游 -->
    <div class="grid grid-2">
      <ChartCard :title="t('迁入迁出客流对比 · {scope}', { scope: scopeLabel })" :option="migrationOption" height="280px" />
      <StatCard
        :title="t('过夜游客比例')"
        :value="overnightRate"
        unit="%"
        :decimals="1"
        icon="moon"
      />
    </div>

    <!-- 客流监测场景配图：点缩略图看大图 -->
    <ImageGallery page="flow" :title="t('客流监测场景图集')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import StatCard from '../components/common/StatCard.vue'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import FilterBar from '../components/common/FilterBar.vue'
import {
  mockRealtimeFlow,
  mockProfile,
  mockFlowTrend,
  mockMigration,
  mockOvernightRate,
  mockScenicSpots,
  mockHomeData,
} from '../mock'
import { themeLegend } from '../config/theme'
import { t, tv } from '../config/i18n'
import {
  filterByCity,
  normalizePercent,
  scaleNum,
  scalePercent,
  scopeLabel,
  stableJitter,
} from '../config/scopeData'
import type { FlowWarning } from '../types'

const filter = ref({ timeRange: '7d', region: 'all', platform: 'all', sentiment: 'all' })

// ===== 按顶栏分析范围重算：总量缩放，占比类抖动后重新归一化 =====
const realtime = computed(() => ({
  total: scaleNum(mockRealtimeFlow.total, 'flow-total'),
  yoy: scalePercent(mockRealtimeFlow.yoy, 'flow-yoy', 0.25),
  mom: scalePercent(mockRealtimeFlow.mom, 'flow-mom', 0.25),
}))

const profile = computed(() => ({
  source: normalizePercent(mockProfile.source, 'flow-source'),
  age: normalizePercent(mockProfile.age, 'flow-age'),
  consume: normalizePercent(mockProfile.consume, 'flow-consume'),
}))

const overnightRate = computed(() => scalePercent(mockOvernightRate, 'flow-overnight', 0.2))

/**
 * 承载量预警：按当前范围取景区（景点普查 + 首页资源点）。
 * 客流与承载量都是「单个景区」的量，不随范围缩放；范围只决定名单。
 * 资源点的承载量按固定使用率（62%×0.72~1.28）反推，等级与使用率同源，保证表内自洽。
 */
const ALL_SPOTS = [
  ...mockScenicSpots.map((s) => ({ name: s.name, city: s.city, flow: s.flow, capacity: s.capacity })),
  ...mockHomeData.resourcePoints.map((r) => ({
    name: r.name,
    city: r.city,
    flow: r.flow,
    capacity: Math.round(r.flow / (0.62 * stableJitter(`cap-${r.name}`, 0.28))),
  })),
]

function warnLevel(usage: number): FlowWarning['level'] {
  if (usage >= 0.92) return '红色'
  if (usage >= 0.85) return '橙色'
  if (usage >= 0.65) return '黄色'
  return '正常'
}

const flowWarnings = computed<FlowWarning[]>(() =>
  filterByCity(ALL_SPOTS)
    .map((s) => ({
      spot: s.name,
      flow: s.flow,
      capacity: s.capacity,
      level: warnLevel(s.flow / s.capacity),
    }))
    .sort((a, b) => b.flow / b.capacity - a.flow / a.capacity)
    .slice(0, 6),
)

// 来源地饼图
// 这张卡只有 298×260，7 个来源里 6 个挤在左半圈：环一大标注就放不下，ECharts 会丢掉放不下的、
// 截断放得下的（之前只画出 4 个，"天津"还变成"天..."）。缩小环、标注贴边从默认 25% 放到 2%、引线缩短后可全部显示
const sourceOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      type: 'pie',
      radius: ['32%', '52%'],
      center: ['50%', '46%'],
      label: { color: themeLegend(), fontSize: 11, edgeDistance: '2%' },
      labelLine: { length: 6, length2: 10 },
      data: profile.value.source.map((s) => ({ ...s, name: tv(s.name) })),
    },
  ],
}))

// 年龄柱状图
const ageOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: profile.value.age.map((a) => tv(a.name)) },
  yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
  series: [{ type: 'bar', barWidth: '45%', data: profile.value.age.map((a) => a.value) }],
}))

// 消费偏好饼图
const consumeOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '46%'],
      label: { color: themeLegend() },
      data: profile.value.consume.map((c) => ({ ...c, name: tv(c.name) })),
    },
  ],
}))

// 趋势切换
type TrendMode = 'day' | 'week' | 'month'
const trendMode = ref<TrendMode>('day')
const trendModes: { label: string; value: TrendMode }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]
const trendOption = computed<Record<string, unknown>>(() => {
  const mode = trendMode.value
  const data = mockFlowTrend[mode].map((d, i) => ({
    date: d.date,
    value: scaleNum(d.value, `trend-${mode}-${i}`, 0.05),
  }))
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 30, top: 20, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('客流量'),
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: data.map((d) => d.value),
      },
    ],
  }
})

// 迁入迁出对比（合并城市；数值随范围缩放，城市结构保持不变）
const migrationOption = computed<Record<string, unknown>>(() => {
  const cities = Array.from(
    new Set([...mockMigration.in.map((i) => i.city), ...mockMigration.out.map((o) => o.city)]),
  )
  const inMap = Object.fromEntries(mockMigration.in.map((i) => [i.city, scaleNum(i.value, `mig-in-${i.city}`, 0.12)]))
  const outMap = Object.fromEntries(mockMigration.out.map((o) => [o.city, scaleNum(o.value, `mig-out-${o.city}`, 0.12)]))
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: cities.map((c) => tv(c)) },
    yAxis: { type: 'value' },
    series: [
      { name: t('迁入'), type: 'bar', data: cities.map((c) => inMap[c] ?? 0) },
      { name: t('迁出'), type: 'bar', data: cities.map((c) => outMap[c] ?? 0) },
    ],
  }
})

// 预警等级 tag 样式
function levelTag(level: FlowWarning['level']): string {
  switch (level) {
    case '正常':
      return 'tag-green'
    case '黄色':
      return 'tag-orange'
    case '橙色':
      return 'tag-orange'
    case '红色':
      return 'tag-red'
    default:
      return 'tag-blue'
  }
}

function usagePercent(w: FlowWarning): number {
  return Math.round((w.flow / w.capacity) * 100)
}

function emergency(spot: string) {
  alert(t('正在为【{spot}】启动应急指挥调度...', { spot }))
}
</script>

<style scoped>
.flow-monitor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid {
  display: grid;
  gap: 14px;
}
.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}
.btn-group {
  display: inline-flex;
  gap: 6px;
}
.btn-group .btn.active {
  background: var(--gradient-gold);
  color: #1b3a5c;
  border: none;
  font-weight: 600;
}
.usage {
  display: flex;
  align-items: center;
  gap: 8px;
}
.usage-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}
.usage-fill {
  height: 100%;
  border-radius: 3px;
}
.usage-fill.tag-green {
  background: var(--text-green);
}
.usage-fill.tag-orange {
  background: var(--status-warning);
}
.usage-fill.tag-red {
  background: var(--status-danger);
}
.usage-text {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 38px;
}
</style>
