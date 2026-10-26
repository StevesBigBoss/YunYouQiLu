<template>
  <div class="opinion-parent">
    <FilterBar
      :model-value="filterState"
      show-platform
      show-sentiment
      @update:model-value="onFilterUpdate"
      @change="onFilterChange"
    />

    <div class="stat-row">
      <StatCard :title="t('报道条数（{scope}）', { scope: scopeLabel })" :value="scopeNewsTotal" :unit="t('条')" icon="news" />
      <StatCard :title="t('正面占比')" :value="scopeNewsSentiment.positive" :unit="t('%')" icon="happy" />
      <StatCard :title="t('中性占比')" :value="scopeNewsSentiment.neutral" :unit="t('%')" icon="neutral" />
      <StatCard :title="t('负面占比')" :value="scopeNewsSentiment.negative" :unit="t('%')" icon="sad" />
    </div>

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

    <router-view v-else />

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
}

const isOverview = computed(() => route.path === '/opinion')


const trend = scopeNewsDailyTrend(7)
const trendWindow = computed(() => ({
  from: trend.value[0]?.date ?? '—',
  to: trend.value[trend.value.length - 1]?.date ?? '—',
}))


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


const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

const scopeFilterNote = computed(() =>
  scope.value === 'all'
    ? t('{n} 条为省级 / 综合报道，标题未点明城市，不计入地图。', { n: scopeNewsNoCityCount.value })
    : t('范围口径：标题点明「{scope}」的属地报道 {direct} 条，另计入 {provincial} 条省级综合稿（标题未点市县，省内各范围通用）；地图只统计标题点明城市的报道。', { scope: scopeLabel.value, direct: scopeNewsDirectCount.value, provincial: scopeNewsNoCityCount.value }),
)

let opinionMap: L.Map | null = null
let cityLayer: L.LayerGroup | null = null
let chinaBounds: L.LatLngBounds | null = null
let riverLayer: L.LayerGroup | null = null

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
      duration: 750,
    })
  }
}

async function onMapReady(map: L.Map) {
  const national = await setupNationalBase(map)
  opinionMap = map
  chinaBounds = national.bounds
  map.setMaxBounds(national.bounds.pad(0.2))
  ensureRiverPane(map, 385)
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, riverLayer)
  riverLayer.addTo(map)
  drawCityMentions(map, true)
}


watch(scope, () => {
  if (opinionMap) drawCityMentions(opinionMap, false)
})

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
