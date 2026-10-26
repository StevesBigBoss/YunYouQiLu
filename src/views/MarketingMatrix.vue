<template>
  <div class="marketing-page">
    <div class="filter-bar">
      <div class="filter-item">
        <label>{{ t('平台：') }}</label>
        <select v-model="platformFilter">
          <option value="all">{{ t('全部') }}</option>
          <option value="抖音">{{ t('抖音') }}</option>
          <option value="微信">{{ t('微信') }}</option>
          <option value="微博">{{ t('微博') }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>{{ t('时间：') }}</label>
        <select v-model="timeRange">
          <option value="7d">{{ t('近7天') }}</option>
          <option value="30d">{{ t('近30天') }}</option>
          <option value="90d">{{ t('近90天') }}</option>
          <option value="year">{{ t('本年度') }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>{{ t('分析范围：') }}</label>
        <span class="filter-scope" :title="t('由顶栏「分析范围」统一筛选，本页数据随其重算')">{{ scopeLabel }}</span>
      </div>
      <button class="btn btn-primary">{{ t('查询') }}</button>
    </div>

    <div class="common-card">
      <div class="card-title">
        {{ t('账号矩阵 · {scope}', { scope: scopeLabel }) }}
        <span class="card-subnote">{{ t('账号为省级 / 景区官方公开账号，粉丝与互动量按当前分析范围折算') }}</span>
      </div>
      <div v-for="group in groupedAccounts" :key="group.platform" class="platform-group">
        <div class="platform-label">
          <span class="platform-icon"><AppIcon :name="platformIcon(group.platform)" :size="15" /></span>
          <span>{{ t(group.platform) }}</span>
          <span class="platform-count">{{ t('{n} 个账号', { n: group.list.length }) }}</span>
        </div>
        <div class="account-grid">
          <div v-for="acc in group.list" :key="acc.name" class="account-item">
            <div class="account-name">{{ tv(acc.name) }}</div>
            <div class="account-meta">
              <span class="meta-num">{{ formatNum(acc.fans) }} <em>{{ t('粉丝') }}</em></span>
              <span class="meta-num">{{ formatNum(acc.interaction) }} <em>{{ t('互动') }}</em></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="common-card">
        <div class="card-title">{{ t('话题热度 · {scope}', { scope: scopeLabel }) }}</div>
        <div class="topic-list">
          <div
            v-for="topic in scopedTopics"
            :key="topic.name"
            class="topic-item"
            @click="toggleTopic(topic.name)"
          >
            <div class="topic-row">
              <span class="topic-name">{{ tv(topic.name) }}</span>
              <span class="topic-trend" :class="topic.trend">
                <AppIcon :name="trendIcon(topic.trend)" :size="12" />{{ trendText(topic.trend) }}
              </span>
            </div>
            <div class="topic-row">
              <span class="topic-stat">{{ t('阅读 {n}', { n: formatNum(topic.read) }) }}</span>
              <span class="topic-stat">{{ t('讨论 {n}', { n: formatNum(topic.discuss) }) }}</span>
            </div>
            <div v-if="expandedTopic === topic.name" class="topic-detail">
              {{ t('话题详情：该话题在「{scope}」范围内近 7 天阅读量 {read}，讨论量 {discuss}，', { scope: scopeLabel, read: formatNum(topic.read), discuss: formatNum(topic.discuss) }) }}
              {{ t('主要传播平台为抖音与微博，用户情感以正面为主。（数据为演示占位）') }}
            </div>
          </div>
        </div>
      </div>

      <ChartCard :title="t('传播路径图 · {scope}', { scope: scopeLabel })" :option="sankeyOption" height="320px" />
    </div>

    <div class="common-card">
      <div class="card-title">{{ t('重点客源城市定向推广效果 · 投放目的地：{target}', { target: targetLabel }) }}</div>
      <div class="promo-wrap">
        <div class="promo-map">
          <MapContainer
            :center="CHINA_CENTER"
            :zoom="CHINA_ZOOM"
            :min-zoom="3"
            :max-zoom="9"
            :zoom-snap="0.25"
            :scroll-wheel-zoom="true"
            :base-map="false"
            :base-background="PLAIN_BACKGROUND"
            @ready="onPromoMapReady"
          >
            <div class="promo-hint">{{ t('圆点大小 = 推广效果指数 · 虚线 = 定向投放方向') }}</div>
          </MapContainer>
        </div>
        <div class="promo-chart">
          <ChartCard :title="t('城市推广效果指数')" :option="cityBarOption" height="280px" />
        </div>
      </div>
    </div>

    <div class="common-card">
      <div class="card-title">{{ t('品牌活动 · {scope}', { scope: scopeLabel }) }}</div>
      <div class="event-grid">
        <div v-for="ev in scopedEvents" :key="ev.name" class="event-card">
          <div class="event-name">{{ tv(ev.name) }}</div>
          <div class="event-metrics">
            <div v-for="(val, key) in ev.data" :key="key" class="event-metric">
              <div class="metric-value">{{ formatEventMetric(key as string, val) }}</div>
              <div class="metric-label">{{ t(key as string) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ImageGallery page="marketing" :title="t('新媒体营销场景图集')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import L from 'leaflet'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import MapContainer from '../components/common/MapContainer.vue'
import AppIcon from '../components/common/AppIcon.vue'
import {
  mockAccounts, mockMarketingTopics, mockSpreadPath,
  mockCityPromotion, mockBrandEvents,
} from '../mock'
import { CITY_CENTERS } from '../config/shandongRegions'
import { scaleNum, scalePercent, scaleVal, scopeCity, scopeLabel } from '../config/scopeData'
import {
  CHINA_CENTER, CHINA_ZOOM, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane, playNationalIntro, setupNationalBase,
} from '../config/chinaMap'
import { mapFocusColor } from '../config/mapPalette'
import { themeAccent, themeTitle } from '../config/theme'
import { t, tv, locale } from '../config/i18n'
import type { AccountItem } from '../types'

const platformFilter = ref('all')
const timeRange = ref('30d')
const expandedTopic = ref('')

const platformIcons: Record<string, string> = {
  '抖音': 'music',
  '微信': 'opinion',
  '微博': 'fire',
}
function platformIcon(p: string) {
  return platformIcons[p] || 'phone'
}

function formatNum(n: number): string {
  if (n >= 1e8) return t('{n}亿', { n: (n / 1e8).toFixed(1) })
  if (n >= 1e4) return t('{n}万', { n: (n / 1e4).toFixed(1) })
  return n.toLocaleString('zh-CN')
}

function trendIcon(t: string): string {
  if (t === 'up') return 'trend-up'
  if (t === 'down') return 'trend-down'
  return 'trend-flat'
}

function trendText(trend: string): string {
  if (trend === 'up') return t('上升')
  if (trend === 'down') return t('下降')
  return t('持平')
}

function toggleTopic(name: string) {
  expandedTopic.value = expandedTopic.value === name ? '' : name
}

interface AccountGroup { platform: string; list: AccountItem[] }
const groupedAccounts = computed<AccountGroup[]>(() => {
  const filtered = platformFilter.value === 'all'
    ? mockAccounts
    : mockAccounts.filter(a => a.platform === platformFilter.value)
  const order = ['抖音', '微信', '微博']
  const map = new Map<string, AccountItem[]>()
  filtered.forEach(a => {
    const rows = map.get(a.platform) ?? []
    rows.push({
      ...a,
      fans: scaleNum(a.fans, `acc-fans-${a.name}`),
      interaction: scaleNum(a.interaction, `acc-inter-${a.name}`),
    })
    map.set(a.platform, rows)
  })
  return order.filter(p => map.has(p)).map(p => ({ platform: p, list: map.get(p)! }))
})

const scopedTopics = computed(() =>
  mockMarketingTopics.map((t) => ({
    ...t,
    read: scaleNum(t.read, `topic-read-${t.name}`),
    discuss: scaleNum(t.discuss, `topic-discuss-${t.name}`),
  })),
)

const sankeyOption = computed<Record<string, unknown>>(() => {
  const nodes = new Set<string>()
  mockSpreadPath.forEach(p => { nodes.add(tv(p.from)); nodes.add(tv(p.to)) })
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'sankey',
      left: 20, right: 80, top: 20, bottom: 20,
      nodeWidth: 18,
      data: Array.from(nodes).map(name => ({ name })),
      links: mockSpreadPath.map(p => ({
        source: tv(p.from),
        target: tv(p.to),
        value: scaleNum(p.value, `spread-${p.from}-${p.to}`),
      })),
      label: { color: themeTitle() },
      lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.5 },
    }],
  }
})

const PROMO_CITY_COORDS: Record<string, { lng: number; lat: number }> = {
  '北京': { lng: 116.40, lat: 39.90 },
  '天津': { lng: 117.20, lat: 39.13 },
  '石家庄': { lng: 114.51, lat: 38.04 },
  '郑州': { lng: 113.62, lat: 34.75 },
  '徐州': { lng: 117.18, lat: 34.26 },
  '南京': { lng: 118.80, lat: 32.06 },
}

const promoTarget = computed<[number, number]>(() => {
  const city = scopeCity.value
  if (city) {
    const c = CITY_CENTERS[city]
    return [c.lat, c.lng]
  }
  return [36.65, 117.12]
})
const targetLabel = computed(() => (scopeCity.value ? t('{city}市', { city: scopeCity.value }) : t('山东沿黄（济南）')))

const scopedPromotion = computed(() =>
  mockCityPromotion.map((item) => ({
    ...item,
    effect: scalePercent(item.effect, `promo-${item.city}`, 0.12),
  })),
)

const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

let promoMap: L.Map | null = null
let promoLayer: L.LayerGroup | null = null
let promoRiver: L.LayerGroup | null = null

function drawPromo() {
  if (!promoMap) return
  if (!promoLayer) promoLayer = L.layerGroup()
  promoLayer.clearLayers()
  if (!promoMap.hasLayer(promoLayer)) promoLayer.addTo(promoMap)

  const target = L.latLng(promoTarget.value)
  const spots: L.LatLng[] = []
  scopedPromotion.value.forEach(item => {
    const c = PROMO_CITY_COORDS[item.city]
    if (!c) return
    const latlng = L.latLng(c.lat, c.lng)
    spots.push(latlng)
    L.polyline([latlng, target], {
      color: themeAccent(), weight: 1.2, opacity: 0.5, dashArray: '4 6', interactive: false,
    }).addTo(promoLayer!)
    const marker = L.circleMarker(latlng, {
      className: 'sd-px-dot',
      radius: Math.max(7, item.effect / 2.6),
      color: '#FFFFFF',
      weight: 1.5,
      fillColor: themeAccent(),
      fillOpacity: 0.9,
    })
    marker.on('mouseover', () => marker.bringToFront())
    marker.bindTooltip(t('{city} · 推广效果指数 {n}', { city: item.city, n: item.effect }), {
      className: 'sd-tooltip',
      direction: 'top',
      offset: [0, -8],
    })
    marker.bindPopup(`<div class="sd-popup"><div class="sd-popup-title">${tv(item.city)}</div>
      <div class="sd-popup-row"><span>${t('推广效果指数')}</span><b>${item.effect}</b></div>
      <div class="sd-popup-row"><span>${t('投放方向')}</span><b>${targetLabel.value}</b></div></div>`)
    marker.addTo(promoLayer!)
  })

  L.circleMarker(target, {
    className: 'sd-px-dot',
    radius: 9, color: mapFocusColor(), weight: 2, fillColor: themeAccent(), fillOpacity: 0.95,
  })
    .bindTooltip(t('定向推广目的地 · {target}', { target: targetLabel.value }), { className: 'sd-tooltip', direction: 'top', offset: [0, -8] })
    .addTo(promoLayer!)
}

async function onPromoMapReady(map: L.Map) {
  const national = await setupNationalBase(map)
  promoMap = map
  ensureRiverPane(map, 385)
  promoRiver = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, promoRiver)
  promoRiver.addTo(map)
  drawPromo()

  map.setMaxBounds(national.bounds.pad(0.2))
  const spots: L.LatLng[] = []
  scopedPromotion.value.forEach(item => {
    const c = PROMO_CITY_COORDS[item.city]
    if (c) spots.push(L.latLng(c.lat, c.lng))
  })
  playNationalIntro(map, {
    china: national.bounds,
    focus: L.latLngBounds([L.latLng(promoTarget.value), ...spots]),
    paddingTopLeft: [24, 24],
    paddingBottomRight: [24, 40],
    duration: 750,
  })
}

watch(promoTarget, () => drawPromo())

watch(locale, () => {
  promoMap?.closePopup()
  drawPromo()
})

const cityBarOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: scopedPromotion.value.map(c => tv(c.city)) },
  yAxis: { type: 'value', max: 100 },
  series: [{
    type: 'bar',
    data: scopedPromotion.value.map(c => c.effect),
    itemStyle: { color: themeAccent() },
    barWidth: 18,
  }],
}))

const scopedEvents = computed(() =>
  mockBrandEvents.map((ev) => ({
    name: ev.name,
    data: {
      曝光量: scaleNum(ev.data.曝光量 ?? 0, `ev-exp-${ev.name}`),
      互动量: scaleNum(ev.data.互动量 ?? 0, `ev-int-${ev.name}`),
      转化率: scalePercent(ev.data.转化率 ?? 0, `ev-cvr-${ev.name}`, 0.15),
      带动收入: scaleVal(ev.data.带动收入 ?? 0, `ev-inc-${ev.name}`, 0),
    },
  })),
)

function formatEventMetric(key: string, val: number): string {
  if (key === '转化率') return val.toFixed(1) + '%'
  if (key === '带动收入') return t('{n} 万元', { n: val.toLocaleString('zh-CN') })
  return formatNum(val)
}
</script>

<style scoped>
.marketing-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-item label {
  font-size: 13px;
  color: var(--text-secondary);
}
.filter-scope {
  padding: 3px 10px;
  font-size: 12px;
  color: var(--on-accent, #1B3A5C);
  font-weight: 600;
  background: var(--gradient-gold);
  border-radius: 999px;
}
.card-subnote {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}

.platform-group { margin-bottom: 14px; }
.platform-group:last-child { margin-bottom: 0; }
.platform-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-gold);
  margin-bottom: 8px;
  font-weight: 600;
}
.platform-count {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 12px;
}
.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.account-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  transition: all 0.2s;
}
.account-item:hover {
  border-color: var(--color-gold);
  background: var(--bg-card-hover);
}
.account-name {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.account-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-secondary);
}
.meta-num { color: var(--text-gold); font-weight: 600; }
.meta-num em { color: var(--text-muted); font-style: normal; font-weight: 400; }

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.topic-list { display: flex; flex-direction: column; gap: 4px; }
.topic-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}
.topic-item:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-color);
}
.topic-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.topic-name { font-size: 13px; color: var(--text-primary); }
.topic-stat { font-size: 12px; color: var(--text-secondary); }
.topic-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
}
.topic-trend.up { color: var(--text-green); }
.topic-trend.down { color: var(--status-danger); }
.topic-trend.flat { color: var(--text-muted); }
.topic-detail {
  margin-top: 8px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.promo-wrap {
  display: flex;
  gap: 14px;
  height: 320px;
}
.promo-map {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.promo-hint {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 1100;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  pointer-events: none;
}
:deep(.sd-popup-title) {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 6px;
}
:deep(.sd-popup-row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  line-height: 1.8;
  color: var(--text-secondary);
}
:deep(.sd-popup-row b) {
  color: var(--text-primary);
  font-weight: 600;
}
.promo-chart { flex: 1; }

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.event-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 14px;
}
.event-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-gold);
  margin-bottom: 12px;
}
.event-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'DIN', 'Arial', sans-serif;
}
.metric-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
