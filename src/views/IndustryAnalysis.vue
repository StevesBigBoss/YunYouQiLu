<template>
  <div class="industry-analysis">
    <!-- KPI 卡片行 -->
    <div class="grid grid-4">
      <StatCard
        :title="t('文旅总收入 · {scope}', { scope: scopeLabel })"
        :value="kpi.income"
        :unit="t('亿元')"
        :decimals="1"
        icon="coin"
      />
      <StatCard
        :title="t('接待游客总量')"
        :value="kpi.visitors"
        :unit="t('亿人次')"
        :decimals="2"
        icon="ticket"
      />
      <StatCard
        :title="t('文旅项目投资')"
        :value="kpi.investment"
        :unit="t('亿元')"
        :decimals="1"
        icon="build"
      />
      <StatCard
        :title="t('产业同比增长')"
        :value="kpi.yoy"
        unit="%"
        :decimals="1"
        :yoy="kpi.yoy"
        icon="trend-up"
      />
    </div>

    <!-- 时间维度切换 -->
    <div class="common-card dim-bar">
      <div class="btn-group">
        <button
          v-for="d in dimensions"
          :key="d"
          class="btn"
          :class="{ active: dimension === d }"
          @click="dimension = d"
        >{{ t(d) }}</button>
      </div>
      <span class="dim-tip">{{ t('当前统计口径：{period} · {scope}', { period: periodLabel, scope: scopeLabel }) }}</span>
    </div>

    <!-- 中部四图表 -->
    <div class="grid grid-2">
      <ChartCard :title="incomeTitle" :option="cityIncomeOption" height="300px" />
      <ChartCard :title="t('文旅消费结构 · {scope}', { scope: scopeLabel })" :option="consumeStructOption" height="300px" />
      <ChartCard :title="t('文旅投资趋势（亿元）· {scope}', { scope: scopeLabel })" :option="investTrendOption" height="300px" />
      <ChartCard :title="t('文旅供给能力 · {scope}', { scope: scopeLabel })" :option="supplyOption" height="300px" />
    </div>

    <!-- 研判报告区 -->
    <div class="common-card">
      <div class="card-title">
        <span>{{ t('研判报告') }}</span>
        <button class="btn" @click="showMsg(t('报告中心：正在加载全部历史报告...'))">{{ t('全部报告') }}</button>
      </div>
      <table class="common-table">
        <thead>
          <tr>
            <th>{{ t('报告名称') }}</th>
            <th>{{ t('统计周期') }}</th>
            <th>{{ t('发布时间') }}</th>
            <th style="width: 220px">{{ t('操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in mockReports" :key="r.id">
            <td>{{ tv(r.title) }}</td>
            <td><span class="tag tag-gold">{{ t(r.period) }}</span></td>
            <td>2026-09-24</td>
            <td>
              <button class="btn" @click="exportPdf(r)">{{ t('导出PDF') }}</button>
              <button class="btn" @click="exportExcel(r)">{{ t('导出Excel') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 文旅产业场景配图：点缩略图看大图 -->
    <ImageGallery page="industry" :title="t('文旅产业场景图集')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import StatCard from '../components/common/StatCard.vue'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import {
  mockIndustryKpi,
  mockConsumeStruct,
  mockInvestTrend,
  mockSupply,
  mockReports,
} from '../mock'
import { themeAccent, themeAccentAlpha, themeLegend } from '../config/theme'
import { t, tv } from '../config/i18n'
import {
  normalizePercent,
  scaleNum,
  scalePercent,
  scaleVal,
  scopeLabel,
  scopeUnits,
  unitValue,
} from '../config/scopeData'
import type { ReportItem } from '../types'

const dimension = ref('月度')
const dimensions = ['月度', '季度', '年度']

/** 当前统计口径文案（月度 / 季度 / 年度） */
const periodLabel = computed(() =>
  dimension.value === '月度' ? t('本月（2026-09）') : dimension.value === '季度' ? t('本季度（2026-Q3）') : t('本年度（2026）'),
)

/** 时间维度系数：把年度口径拆到月/季 */
const DIM_FACTOR: Record<string, number> = { 月度: 1 / 12, 季度: 1 / 4, 年度: 1 }

/** KPI：先按范围缩放，再按所选时间维度折算 */
const kpi = computed(() => {
  const f = DIM_FACTOR[dimension.value]
  return {
    income: Number((scaleVal(mockIndustryKpi.income, 'ind-income') * f).toFixed(1)),
    visitors: Number((scaleVal(mockIndustryKpi.visitors, 'ind-visitors', 2) * f).toFixed(2)),
    investment: Number((scaleVal(mockIndustryKpi.investment, 'ind-invest') * f).toFixed(1)),
    yoy: scalePercent(mockIndustryKpi.yoy, 'ind-yoy', 0.2),
  }
})

/** 范围粒度：多市时是各市收入，单市时展开成县区收入 */
const incomeRows = computed(() => {
  const total = scaleVal(mockIndustryKpi.income, 'ind-income-axis', 1)
  return scopeUnits.value.map((u) => ({ name: tv(u.label), value: unitValue(total, u, 'ind-unit', 1) }))
})

const incomeTitle = computed(() =>
  scopeUnits.value[0]?.county
    ? t('{city}市县区文旅收入对比（亿元）', { city: scopeUnits.value[0].city })
    : t('各市文旅收入对比（亿元）'),
)

// 收入柱状图：范围为单市时横轴是县区，多市时是范围内的市
const cityIncomeOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: incomeRows.value.map((c) => c.name), axisLabel: { interval: 0, fontSize: 10 } },
  yAxis: { type: 'value' },
  series: [
    {
      name: t('文旅收入'),
      type: 'bar',
      barWidth: '50%',
      data: incomeRows.value.map((c) => c.value),
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: themeAccent() },
            { offset: 1, color: themeAccentAlpha(0.2) },
          ],
        },
      },
    },
  ],
}))

// 消费结构饼图
const consumeStructOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
  legend: { bottom: 0, type: 'scroll' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '46%'],
      label: { color: themeLegend() },
      data: normalizePercent(
        mockConsumeStruct.map((c) => ({ name: tv(c.type), value: c.value })),
        'ind-consume',
      ),
    },
  ],
}))

// 投资趋势折线
const investTrendOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', boundaryGap: false, data: mockInvestTrend.month.map((m) => tv(m)) },
  yAxis: { type: 'value' },
  series: [
    {
      name: t('投资额'),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.15 },
      data: mockInvestTrend.value.map((v, i) => scaleVal(v, `ind-trend-${i}`, 1)),
    },
  ],
}))

// 供给能力柱状图
const supplyOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 40 },
  xAxis: { type: 'category', data: mockSupply.map((s) => tv(s.type)), axisLabel: { interval: 0 } },
  yAxis: { type: 'value' },
  series: [
    {
      name: t('数量'),
      type: 'bar',
      barWidth: '45%',
      data: mockSupply.map((s) => scaleNum(s.count, `ind-supply-${s.type}`)),
    },
  ],
}))

function showMsg(msg: string) { alert(msg) }
function exportPdf(r: ReportItem) {
  alert(t('正在导出报告【{title}】为 PDF ...', { title: r.title }))
}
function exportExcel(r: ReportItem) {
  alert(t('正在导出报告【{title}】为 Excel ...', { title: r.title }))
}
</script>

<style scoped>
.industry-analysis {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid {
  display: grid;
  gap: 14px;
}
.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}
.dim-bar {
  display: flex;
  align-items: center;
  gap: 16px;
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
.dim-tip {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
