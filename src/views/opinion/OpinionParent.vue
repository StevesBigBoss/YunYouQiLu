<template>
  <div class="opinion-parent">
    <!-- 顶部统一筛选器 -->
    <FilterBar
      :model-value="filterState"
      show-platform
      show-sentiment
      @update:model-value="onFilterUpdate"
      @change="onFilterChange"
    />

    <!-- 总览指标卡片 -->
    <div class="stat-row">
      <StatCard :title="t('报道条数（{scope}）', { scope: scopeLabel })" :value="scopeNewsTotal" :unit="t('条')" icon="news" />
      <StatCard :title="t('正面占比')" :value="scopeNewsSentiment.positive" :unit="t('%')" icon="happy" />
      <StatCard :title="t('中性占比')" :value="scopeNewsSentiment.neutral" :unit="t('%')" icon="neutral" />
      <StatCard :title="t('负面占比')" :value="scopeNewsSentiment.negative" :unit="t('%')" icon="sad" />
    </div>

    <!-- 总览视图（无子路由时展示） -->
    <template v-if="isOverview">
      <div class="chart-grid">
        <ChartCard :title="t('情感倾向分布（词表口径）· {scope}', { scope: scopeLabel })" :option="sentimentPieOption" height="280px" />
        <ChartCard :title="t('近 7 日发布量（{scope}，{from} ~ {to}）', { scope: scopeLabel, from: trendWindow.from, to: trendWindow.to })" :option="trendLineOption" height="280px" />
      </div>
      <div class="chart-grid">
        <ChartCard :title="t('来源渠道分布 · {scope}', { scope: scopeLabel })" :option="platformBarOption" height="280px" />
        <div class="common-card map-card">
          <div class="card-title">{{ t('报道提及地区（标题中出现的地级市）· {scope}', { scope: scopeLabel }) }}</div>
          <div class="map-wrap">
            <MapContainer
              :center="CHINA_CENTER"
              :zoom="CHINA_ZOOM"
              :min-zoom="2.5"
              :max-zoom="9"
              :zoom-snap="0.25"
              :scroll-wheel-zoom="true"
              :base-map="false"
              :base-background="PLAIN_BACKGROUND"
              @ready="onMapReady"
            />
          </div>
        </div>
      </div>
      <div class="data-note">
        {{ t('数据源：{source}。', { source: dataSources.news }) }}
        {{ t('当前范围「{scope}」下共 {n} 条（{from} ~ {to}，抓取于 {time}）。', { scope: scopeLabel, n: scopeNewsTotal, from: trendWindow.from, to: trendWindow.to, time: shortTime(dataFetchedAt.news) }) }}
        {{ t('情感与关键词为标题词表统计口径，不是平台互动量；') }}
        {{ t('抖音 / 微博 / 微信的互动数据需开放平台密钥且其条款禁止抓取，故未纳入。') }}
        {{ scopeFilterNote }}
      </div>
    </template>

    <!-- 子路由视图 -->
    <router-view v-else />

    <!-- 生态环境治理场景配图：点缩略图看大图（4 个舆情子页共用同一套图） -->
    <ImageGallery page="opinion" :title="t('生态环境治理场景图集')" />
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import FilterBar from '../../components/common/FilterBar.vue'
import StatCard from '../../components/common/StatCard.vue'
import ChartCard from '../../components/common/ChartCard.vue'
import ImageGallery from '../../components/common/ImageGallery.vue'
import MapContainer from '../../components/common/MapContainer.vue'
import {
  dataFetchedAt, dataSources, shortTime,
} from '../../api/crawled'
import {
  scopeNewsByChannel, scopeNewsByCity, scopeNewsCityMax, scopeNewsDailyTrend, scopeNewsDirectCount,
  scopeNewsNoCityCount, scopeNewsSentiment, scopeNewsSentimentCount, scopeNewsTotal,
} from '../../config/scopeNews'
import { scopeLabel, scope } from '../../config/scopeData'
import {
  CHINA_CENTER, CHINA_ZOOM, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane, playNationalIntro, setupNationalBase,
} from '../../config/chinaMap'
import { themeAccent, themeLegend, themeTitle } from '../../config/theme'
import { t, tv, locale } from '../../config/i18n'
import type { FilterState } from '../../types'

const route = useRoute()

// 统一筛选状态（提升到父级，provide 给子分支）
const filterState = reactive<FilterState>({
  timeRange: '7d',
  region: 'all',
  platform: 'all',
  sentiment: 'all',
})
provide('filterState', filterState)

function onFilterUpdate(val: FilterState | undefined) {
  if (val) Object.assign(filterState, val)
}
function onFilterChange() {
  // 占位：筛选条件变化后触发数据刷新
}

const isOverview = computed(() => route.path === '/opinion')

// 近 7 日窗口（以范围内数据里最新日期为终点，空缺日补 0）
const trend = scopeNewsDailyTrend(7)
const trendWindow = computed(() => ({
  from: trend.value[0]?.date ?? '—',
  to: trend.value[trend.value.length - 1]?.date ?? '—',
}))

// 情感倾向饼图（真实值：按标题词表粗判，随范围过滤报道）
const sentimentPieOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
  legend: { bottom: 0, textStyle: { color: themeLegend() } },
  series: [
    {
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '45%'],
      label: { color: themeTitle(), formatter: '{b}\n{c}%' },
      data: [
        { name: t('正面（{n} 条）', { n: scopeNewsSentimentCount.value.positive }), value: scopeNewsSentiment.value.positive, itemStyle: { color: '#00A052' } },
        { name: t('中性（{n} 条）', { n: scopeNewsSentimentCount.value.neutral }), value: scopeNewsSentiment.value.neutral, itemStyle: { color: '#3A7BD5' } },
        { name: t('负面（{n} 条）', { n: scopeNewsSentimentCount.value.negative }), value: scopeNewsSentiment.value.negative, itemStyle: { color: '#D94F4F' } },
      ],
    },
  ],
}))

// 逐日发布量折线（空缺日补 0，故图上会出现 0 值断点，是真实情况）
const trendLineOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 55, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: trend.value.map((i) => i.date.slice(5)), boundaryGap: false },
  yAxis: { type: 'value', minInterval: 1, name: t('条') },
  series: [
    {
      name: t('发布量'),
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.25 },
      data: trend.value.map((i) => i.count),
    },
    {
      name: t('涉及渠道数'),
      type: 'line',
      smooth: true,
      symbolSize: 5,
      lineStyle: { type: 'dashed' },
      data: trend.value.map((i) => i.channels),
    },
  ],
}))

// 来源渠道分布柱状图（真实计数；不用百分比，条数更直观）
const platformBarOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis', formatter: t('{b}<br/>报道 {c} 条') },
  grid: { left: 45, right: 20, top: 20, bottom: 44 },
  xAxis: {
    type: 'category',
    data: scopeNewsByChannel.value.map((i) => tv(i.channel.replace(/^(文旅部|新华网|大众网)-/, ''))),
    axisLabel: { fontSize: 10, interval: 0, rotate: 18 },
  },
  yAxis: { type: 'value', name: t('条'), minInterval: 1 },
  series: [
    {
      type: 'bar',
      barWidth: '45%',
      data: scopeNewsByChannel.value.map((i) => i.count),
      itemStyle: { color: themeAccent() },
      label: { show: true, position: 'top', fontSize: 10, color: themeTitle() },
    },
  ],
}))

// 报道提及地区地图：真实按市计数；circleMarker 半径按提及条数
// 无瓦片底图底色跟随当前风格（--map-bg），兜底为米白
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

/** 口径说明随范围变：范围口径 = 属地报道 + 省级综合稿，两个数字都披露 */
const scopeFilterNote = computed(() =>
  scope.value === 'all'
    ? t('{n} 条为省级 / 综合报道，标题未点明城市，不计入地图。', { n: scopeNewsNoCityCount.value })
    : t('范围口径：标题点明「{scope}」的属地报道 {direct} 条，另计入 {provincial} 条省级综合稿（标题未点市县，省内各范围通用）；地图只统计标题点明城市的报道。', { scope: scopeLabel.value, direct: scopeNewsDirectCount.value, provincial: scopeNewsNoCityCount.value }),
)

let opinionMap: L.Map | null = null
let cityLayer: L.LayerGroup | null = null
let chinaBounds: L.LatLngBounds | null = null
/** 黄河干流：随全国底图常驻；常驻流动，无入场画出动画 */
let riverLayer: L.LayerGroup | null = null

/** 按当前范围绘制提及城市：范围切换时只重画点，不重播全国飞入动画 */
function drawCityMentions(map: L.Map, animate: boolean) {
  if (!cityLayer) cityLayer = L.layerGroup()
  cityLayer.clearLayers()
  if (!map.hasLayer(cityLayer)) cityLayer.addTo(map)
  const spots: L.LatLng[] = []
  const maxCount = scopeNewsCityMax.value
  scopeNewsByCity.value.filter((g) => g.count > 0).forEach((g) => {
    const ratio = g.count / maxCount
    const latlng = L.latLng(g.lat, g.lng)
    spots.push(latlng)
    L.circleMarker(latlng, {
      // 像素半径圆点：缩放动画期间隐去、落位后渐显（见 MapContainer 的 bindPixelDotFade）
      className: 'sd-px-dot',
      radius: 10 + ratio * 26,
      fillColor: themeAccent(),
      color: themeAccent(),
      weight: 1,
      fillOpacity: 0.45 + ratio * 0.45,
    })
      .addTo(cityLayer!)
      .bindTooltip(t('{city}市：{n} 条报道提及', { city: g.city, n: g.count }), { className: 'sd-tooltip', direction: 'top', offset: [0, -4] })
      .bindPopup(`<b>${t('{city}市', { city: g.city })}</b><br/>${t('标题提及该市的报道：{n} 条', { n: g.count })}`)
  })
  // 单市范围只有一个点，退化包围盒没法取景，手工撑开一点
  const bounds = L.latLngBounds(spots)
  if (spots.length === 1) {
    bounds.extend([spots[0].lat - 0.35, spots[0].lng - 0.35]).extend([spots[0].lat + 0.35, spots[0].lng + 0.35])
  }
  if (animate) {
    playNationalIntro(map, {
      china: chinaBounds!,
      focus: spots.length ? bounds.pad(0.35) : bounds,
      paddingTopLeft: [16, 16],
      paddingBottomRight: [16, 16],
      // 推近时长与首页取齐（0.75s）
      duration: 750,
    })
  }
}

async function onMapReady(map: L.Map) {
  const national = await setupNationalBase(map)
  opinionMap = map
  chinaBounds = national.bounds
  map.setMaxBounds(national.bounds.pad(0.2))
  // 黄河流向图：河道压在底图之上、提及城市圆点（默认覆盖面板）之下；常驻流动，无入场画出动画
  ensureRiverPane(map, 385)
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, riverLayer)
  riverLayer.addTo(map)
  // 由远及近：从全国视野飞入山东（报道提及的市全部分布在省内）
  drawCityMentions(map, true)
}

// 范围切换：重画提及城市（不重播飞入动画）
watch(scope, () => {
  if (opinionMap) drawCityMentions(opinionMap, false)
})

/** 换语言：提及城市的提示框与弹窗是建层时拼好的 HTML，重画一遍换字（视野不动） */
watch(locale, () => {
  opinionMap?.closePopup()
  if (opinionMap) drawCityMentions(opinionMap, false)
})
</script>

<style scoped>
.opinion-parent {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.map-card {
  display: flex;
  flex-direction: column;
}
.map-wrap {
  flex: 1;
  height: 280px;
  border-radius: 4px;
  overflow: hidden;
}
.data-note {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
