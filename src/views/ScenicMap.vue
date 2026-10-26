<template>
  <div class="scenic-page">
    <div class="map-side">
      <CityChoropleth
        :data="choroplethData"
        :unit="t('处')"
        :value-label="t('A级景区数量')"
        :legend-title="t('各市A级景区数量（处）')"
        :headline-title="t('旅游景点地图 · {scope}', { scope: scopeLabel })"
        :headline-sub="t('全国底图 · 聚焦山东 · 各市 A 级景区数量热力（普查口径）+ 重点监测景点客流点位（圆点按景区等级着色）；点圆点看客流画像，单击地市切换分析范围并细分县区')"
        :point-groups="spotGroups"
        @select="onSelectCity"
        @point-select="onSelectSpot"
      >
        <template #legend-extra>
          <div class="map-mark-legend">
            <span class="map-mark-title">{{ t('圆点 = 重点监测景点（圈色按景区等级区分）') }}</span>
          </div>
        </template>
      </CityChoropleth>
    </div>

    <div class="panel-side">
      <div class="panel-scroll">
        <div class="stat-row">
          <StatCard :title="t('A级景区总数')" :value="totalScenic" :unit="t('处')" />
          <StatCard :title="t('今日接待量')" :value="todayFlow" :unit="t('人次')" :yoy="12.5" :mom="8.3" />
        </div>

        <div class="common-card">
          <div class="card-title">{{ t('搜索景点 · {scope}', { scope: scopeLabel }) }}</div>
          <div class="spot-search">
            <input v-model="spotKeyword" type="search" :placeholder="t('搜索景点名称 / 所在城市 / 等级')" />
          </div>
          <div class="spot-search-meta">
            {{ t('共 {n} 处', { n: searchSpots.length }) }}
            <span class="spot-search-hint">{{ t('点景点看客流画像，「查看图片」看实景') }}</span>
          </div>
          <div class="spot-result-list">
            <div
              v-for="s in searchSpots"
              :key="s.id"
              class="spot-result"
              :class="{ selected: selectedSpot?.id === s.id }"
              @click="focusSpot(s, false)"
            >
              <div class="spot-result-head">
                <span class="spot-result-name" :title="tv(s.name)">{{ tv(s.name) }}</span>
                <button
                  class="item-img-btn"
                  type="button"
                  :disabled="!spotImage(s.id)"
                  :title="spotImage(s.id) ? t('用景区实景图替换下方文字简介') : t('该景点暂无实景配图')"
                  @click.stop="focusSpot(s, true)"
                >
                  <AppIcon name="image" :size="12" />{{ t('查看图片') }}
                </button>
              </div>
              <div class="spot-result-meta">
                <span class="tag tag-gold">{{ tv(s.level) }}</span>
                <span class="tag tag-blue">{{ t(s.type) }}</span>
                <span class="spot-result-city">{{ t('{city}市 · 实时客流 {n}', { city: normCity(s.city), n: formatNum(s.flow) }) }}</span>
              </div>
            </div>
            <div v-if="!searchSpots.length" class="monitor-empty">{{ t('没有匹配的景点，换个关键词试试') }}</div>
          </div>
        </div>

        <div v-if="selectedCity" class="common-card">
          <div class="card-title">
            {{ t('{city} · 景区概况', { city: shortCity(selectedCity) }) }}
            <span class="close-detail" :title="t('关闭')" @click="selectedCity = ''"><AppIcon name="close" :size="12" /></span>
          </div>
          <div class="detail-row"><span>{{ t('A级景区数量') }}</span>
            <b>{{ t('{n} 处', { n: selectedStat?.total ?? 0 }) }}</b>
          </div>
          <div class="detail-row"><span>{{ t('5A 级') }}</span><span>{{ t('{n} 处', { n: selectedStat?.a5 ?? 0 }) }}</span></div>
          <div class="detail-row"><span>{{ t('4A 级') }}</span><span>{{ t('{n} 处', { n: selectedStat?.a4 ?? 0 }) }}</span></div>
          <div class="detail-row"><span>{{ t('其它 A 级') }}</span><span>{{ t('{n} 处', { n: otherLevelCount }) }}</span></div>
          <div class="sub-title">{{ t('县区分布（按市级总量折算）') }}</div>
          <table class="common-table">
            <thead>
              <tr><th>{{ t('县区') }}</th><th>{{ t('A 级景区（处）') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in countyScenicRows" :key="row.name">
                <td>{{ tv(row.name) }}</td>
                <td>{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
          <div class="sub-title">{{ t('重点监测景点（{n}）', { n: citySpots.length }) }}</div>
          <div
            v-for="s in citySpots"
            :key="s.id"
            class="monitor-item"
            @click="focusSpot(s, false)"
          >
            <span class="monitor-name">{{ tv(s.name) }}</span>
            <span class="tag tag-gold">{{ tv(s.level) }}</span>
          </div>
          <div v-if="!citySpots.length" class="monitor-empty">{{ t('该市暂无接入监测的重点景点') }}</div>
        </div>

        <ChartCard :title="topTitle" :option="topOption" height="280px" />

        <div class="common-card">
          <div class="card-title">{{ t('客流预警景点 · {scope}', { scope: scopeLabel }) }}</div>
          <div v-for="w in warningSpots" :key="w.id" class="warn-item" :class="{ over: w.flow / w.capacity > 0.8 }">
            <div class="warn-name">{{ tv(w.name) }}</div>
            <div class="warn-bar-wrap">
              <div class="warn-bar" :style="{ width: (w.flow / w.capacity * 100) + '%', background: warnColor(w.flow / w.capacity) }"></div>
            </div>
            <div class="warn-num">
              {{ formatNum(w.flow) }} / {{ formatNum(w.capacity) }}
              <span class="pct">{{ Math.round(w.flow / w.capacity * 100) }}%</span>
            </div>
          </div>
          <div v-if="!warningSpots.length" class="monitor-empty">{{ t('当前范围内没有承载量预警景点') }}</div>
        </div>

        <div v-if="selectedSpot" ref="spotDetailEl" class="common-card">
          <div class="card-title">
            {{ t('{name} · 客流画像', { name: selectedSpot.name }) }}
            <span class="close-detail" :title="t('关闭')" @click="closeSpot()"><AppIcon name="close" :size="12" /></span>
          </div>
          <div class="spot-level-row">
            <span class="tag tag-gold">{{ tv(selectedSpot.level) }}</span>
            <span class="tag tag-blue">{{ tv(selectedSpot.type) }}</span>
            <span class="cur-flow">{{ t('实时客流 {n}', { n: formatNum(selectedSpot.flow) }) }}</span>
          </div>
          <div v-if="spotImg" class="spot-figure">
            <img
              class="spot-figure-img"
              :src="spotImg"
              :alt="t('{name}景区配图', { name: selectedSpot.name })"
              :title="t('双击放大查看')"
              :data-zoom-caption="spotView?.caption ? tv(spotView.caption) : ''"
              :data-zoom-credit="spotView?.credit ? tv(spotView.credit) : ''"
              loading="lazy"
            />
            <div class="spot-figure-foot">
              <div class="spot-figure-text">
                <span class="spot-figure-cap">{{ spotView?.caption ? tv(spotView.caption) : '' }}</span>
                <span class="spot-figure-credit">{{ spotView?.credit ? tv(spotView.credit) : '' }}</span>
              </div>
              <button class="spot-figure-back" type="button" @click="spotFigure = false">{{ t('看简介') }}</button>
            </div>
          </div>
          <p v-else class="spot-intro">{{ tv(selectedSpot.intro) }}</p>

          <ChartCard :title="t('今日客流趋势')" :option="trendOption" height="160px" />

          <div class="profile-block">
            <div class="profile-title">{{ t('年龄分布') }}</div>
            <div v-for="(v, k) in selectedSpot.profile.age" :key="k" class="profile-row">
              <span class="profile-age">{{ tv(String(k)) }}</span>
              <div class="profile-bar-wrap"><div class="profile-bar" :style="{ width: v + '%' }"></div></div>
              <span class="profile-pct">{{ v }}%</span>
            </div>
          </div>

          <div class="profile-block">
            <div class="profile-title">{{ t('客源地 TOP') }}</div>
            <div class="source-tags">
              <span v-for="s in selectedSpot.profile.source" :key="s" class="tag tag-green">{{ tv(s) }}</span>
            </div>
          </div>

          <div class="opinion-summary">
            <div class="profile-title">{{ t('评价摘要') }}</div>
            <p class="summary-text">{{ t('游客整体评价较好，重点集中在景观体验、服务设施与交通便利性；高峰时段存在排队拥堵反馈。') }}</p>
            <button class="btn btn-primary opinion-btn" @click="router.push('/opinion/analyze')">
              {{ t('查看舆情') }} <AppIcon name="arrow-right" :size="12" />
            </button>
          </div>
        </div>

        <ImageGallery page="scenic" :title="t('重点景区实景图集')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import CityChoropleth from '../components/common/CityChoropleth.vue'
import StatCard from '../components/common/StatCard.vue'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import AppIcon from '../components/common/AppIcon.vue'
import { mockScenicSpots, mockScenicCityStats, mockHomeData } from '../mock'
import { SCENIC_SPOT_IMAGES, type ScenicSpotImage } from '../mock/scenicSpotImages'
import { themeAccent, themeAccentAlpha, themeColors } from '../config/theme'
import { t, tv } from '../config/i18n'
import { CITY_COUNTIES } from '../config/cityCounties'
import { countyWeight, splitIntByWeight } from '../config/cityStats'
import {
  filterByCity,
  inScope,
  normCity,
  scopeCity,
  scopeLabel,
  stableJitter,
} from '../config/scopeData'
import type { CityCountItem, MapPointGroup, MapSpotPoint, ScenicSpot } from '../types'

const router = useRouter()


const selectedCity = ref('')
const selectedSpot = ref<ScenicSpot | null>(null)

const spotKeyword = ref('')
const spotFigure = ref(false)
const spotDetailEl = ref<HTMLElement | null>(null)

watch(scopeCity, (city) => {
  selectedCity.value = city ? `${city}市` : ''
}, { immediate: true })

const scopeCityStats = computed(() => mockScenicCityStats.filter((c) => inScope(c.city)))

const scopeSpots = computed<ScenicSpot[]>(() => {
  const inRange = filterByCity(mockScenicSpots)
  if (inRange.length) return inRange
  const city = scopeCity.value
  if (!city) return []
  return mockHomeData.resourcePoints
    .filter((r) => normCity(r.city) === city)
    .map((r) => {
      const cap = Math.round(r.flow / (0.62 * stableJitter(`spotcap-${r.name}`, 0.28)))
      const level = r.flow >= 20000 ? '5A' : r.flow >= 10000 ? '4A' : '3A'
      return {
        id: r.id,
        name: r.name,
        level,
        type: r.type,
        city: r.city,
        lng: r.lng,
        lat: r.lat,
        flow: r.flow,
        capacity: cap,
        intro: t('{city}市重点文旅资源点（{type}），已接入实时客流监测。', { city: normCity(r.city), type: r.type }),
        trend: Array.from({ length: 7 }, (_, i) => Math.round(r.flow * (0.62 + i * 0.09) * stableJitter(`t-${r.name}-${i}`, 0.12))),
        profile: {
          age: {
            '18-25': Math.round(20 + (stableJitter(`a1-${r.name}`, 0.35) - 1) * 10),
            '26-35': Math.round(32 + (stableJitter(`a2-${r.name}`, 0.25) - 1) * 8),
            '36-45': Math.round(26 + (stableJitter(`a3-${r.name}`, 0.25) - 1) * 8),
            '46+': Math.round(18 + (stableJitter(`a4-${r.name}`, 0.3) - 1) * 6),
          },
          source: [t('{city}本地', { city }), t('省内其他'), t('北京'), t('河北')],
        },
      }
    })
})

const totalScenic = computed(() => scopeCityStats.value.reduce((s, c) => s + c.total, 0))
const todayFlow = computed(() => scopeSpots.value.reduce((s, x) => s + x.flow, 0))

const LEVEL_COLOR_INDEX: Record<string, number> = { '5A': 2, '4A': 1, '3A': 0 }
const LEVEL_ORDER = ['5A', '4A', '3A', '2A', '1A']

function levelColor(level: string): string {
  const colors = themeColors()
  return colors[LEVEL_COLOR_INDEX[level] ?? 3]
}

const spotGroups = computed<MapPointGroup[]>(() => {
  const order = new Map(LEVEL_ORDER.map((level, i) => [level, i]))
  const grouped = new Map<string, MapSpotPoint[]>()
  scopeSpots.value.forEach((s) => {
    const list = grouped.get(s.level) ?? []
    list.push({
      id: s.id,
      name: s.name,
      lng: s.lng,
      lat: s.lat,
      tag: `${t(s.level)} · ${t(s.type)}`,
      intro: s.intro,
      color: levelColor(s.level),
      rows: [
        { label: t('所属城市'), value: t('{city}市', { city: normCity(s.city) }) },
        { label: t('实时客流'), value: t('{n} 人次', { n: formatNum(s.flow) }) },
        { label: t('最大承载量'), value: t('{n} 人次', { n: formatNum(s.capacity) }) },
      ],
    })
    grouped.set(s.level, list)
  })
  return [...grouped.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
    .map(([level, points]) => ({
      key: `spot-level-${level}`,
      label: t('{level} 级景区（{n} 处）', { level, n: points.length }),
      color: levelColor(level),
      points,
    }))
})

function onSelectSpot(id: string) {
  const spot = scopeSpots.value.find((s) => s.id === id)
  if (spot) focusSpot(spot, false)
}

function spotImage(id: string): ScenicSpotImage | null {
  const raw = SCENIC_SPOT_IMAGES[id]
  return raw && (raw.real || raw.ai) ? raw : null
}

const searchSpots = computed<ScenicSpot[]>(() => {
  const kw = spotKeyword.value.trim()
  const order = new Map(LEVEL_ORDER.map((level, i) => [level, i]))
  return scopeSpots.value
    .filter((s) =>
      !kw ||
      s.name.includes(kw) ||
      s.type.includes(kw) ||
      s.level.includes(kw) ||
      normCity(s.city).includes(kw))
    .sort((a, b) => (order.get(a.level) ?? 99) - (order.get(b.level) ?? 99) || b.flow - a.flow)
})

const spotView = computed<ScenicSpotImage | null>(() =>
  selectedSpot.value ? spotImage(selectedSpot.value.id) : null,
)
const spotImg = computed(() => {
  const view = spotView.value
  return spotFigure.value && view ? view.real || view.ai || '' : ''
})

function focusSpot(spot: ScenicSpot, showImage: boolean) {
  selectedSpot.value = spot
  spotFigure.value = showImage && !!spotImage(spot.id)
  if (spotFigure.value) {
    void nextTick(() => spotDetailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
}

function closeSpot() {
  selectedSpot.value = null
  spotFigure.value = false
}


const selectedStat = computed(() =>
  mockScenicCityStats.find((c) => c.city === selectedCity.value && inScope(c.city)),
)
const otherLevelCount = computed(() => {
  const s = selectedStat.value
  return s ? s.total - s.a5 - s.a4 : 0
})
const citySpots = computed(() => scopeSpots.value.filter((s) => normCity(s.city) === normCity(selectedCity.value)))

const countyScenicRows = computed(() => {
  const stat = selectedStat.value
  if (!stat) return []
  const short = selectedCity.value.replace(/市$/, '') as keyof typeof CITY_COUNTIES
  const counties = CITY_COUNTIES[short]
  if (!counties) return []
  const values = splitIntByWeight(stat.total, counties.map((c) => countyWeight(c.name)))
  return counties
    .map((c, i) => ({ name: c.name, value: values[i] }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
})

const choroplethData = computed<CityCountItem[]>(() =>
  scopeCityStats.value.map((c) => ({
    city: c.city,
    value: c.total,
    tag: t('A级景区数量'),
    rows: [
      { label: t('5A 级'), value: t('{n} 处', { n: c.a5 }) },
      { label: t('4A 级'), value: t('{n} 处', { n: c.a4 }) },
      { label: t('其它 A 级'), value: t('{n} 处', { n: c.total - c.a5 - c.a4 }) },
    ],
  })),
)

const warningSpots = computed(() =>
  [...scopeSpots.value].sort((a, b) => b.flow / b.capacity - a.flow / a.capacity).slice(0, 6),
)


const topTitle = computed(() =>
  scopeCity.value
    ? t('{city}市重点监测景点客流 TOP10', { city: scopeCity.value })
    : t('重点监测景点客流 TOP10 · {scope}', { scope: scopeLabel.value }),
)

const topOption = computed(() => {
  const sorted = [...scopeSpots.value].sort((a, b) => b.flow - a.flow).slice(0, 10)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 30, top: 10, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => (v >= 10000 ? t('{n}万', { n: v / 10000 }) : `${v}`) },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((s) => tv(s.name)).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: sorted.map((s) => s.flow).reverse(),
      itemStyle: { color: themeAccent(), borderRadius: [0, 4, 4, 0] },
    }],
  }
})

const trendOption = computed(() => {
  if (!selectedSpot.value) return {}
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: [t('6时'), t('9时'), t('12时'), t('15时'), t('18时'), t('21时'), t('24时')] },
    yAxis: { type: 'value' },
    series: [{
      type: 'line',
      smooth: true,
      data: selectedSpot.value.trend,
      areaStyle: { color: themeAccentAlpha(0.2) },
      lineStyle: { color: themeAccent() },
      itemStyle: { color: themeAccent() },
    }],
  }
})


function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

function formatNum(n: number): string {
  return n.toLocaleString('zh-CN')
}

function warnColor(ratio: number): string {
  if (ratio > 0.8) return '#D94F4F'
  if (ratio > 0.6) return '#E8A838'
  return '#00A052'
}

function onSelectCity(city: string) {
  selectedCity.value = city
}
</script>

<style scoped>
.scenic-page {
  display: flex;
  height: calc(100vh - 56px - 32px);
  gap: 12px;
}
.map-side {
  position: relative;
  flex: 7;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.panel-side {
  flex: 3;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.stat-row {
  display: flex;
  gap: 12px;
}
.stat-row > * { flex: 1; min-width: 0; }

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 6px 0;
  border-bottom: 1px dashed var(--border-color);
}
.detail-row span:last-child { color: var(--text-primary); text-align: right; flex: 1; }

.sub-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 10px 0 6px;
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.monitor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.monitor-item:hover { background: var(--bg-card-hover); }
.monitor-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.monitor-empty { font-size: 12px; color: var(--text-muted); padding: 4px 0; }

.spot-search { padding-bottom: 8px; }
.spot-search input {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  outline: none;
}
.spot-search input:focus { border-color: var(--color-gold); }
.spot-search-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 6px;
  font-size: 11px;
  color: var(--text-muted);
}
.spot-search-hint { color: var(--text-gold); }
.spot-result-list { max-height: 236px; overflow-y: auto; }
.spot-result {
  padding: 7px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  margin-bottom: 4px;
}
.spot-result:hover { background: var(--bg-card-hover); }
.spot-result.selected {
  background: rgba(var(--rgb-gold), 0.12);
  border-color: var(--color-gold);
}
.spot-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.spot-result-name {
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-img-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}
.item-img-btn:hover:not(:disabled) {
  color: var(--text-gold);
  border-color: var(--color-gold);
  background: rgba(var(--rgb-gold), 0.1);
}
.spot-result.selected .item-img-btn:not(:disabled) {
  color: var(--text-gold);
  border-color: rgba(var(--rgb-gold), 0.55);
}
.item-img-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spot-result-meta { display: flex; align-items: center; gap: 6px; }
.spot-result-city {
  min-width: 0;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.warn-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-color);
}
.warn-item:last-child { border-bottom: none; }
.warn-name { font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
.warn-item.over .warn-name { color: var(--status-danger); font-weight: 600; }
.warn-bar-wrap {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.warn-bar { height: 100%; border-radius: 3px; }
.warn-num { font-size: 11px; color: var(--text-muted); }
.pct { margin-left: 6px; color: var(--text-secondary); }

.close-detail {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
}
.close-detail:hover { color: var(--text-gold); }
.opinion-btn { display: inline-flex; align-items: center; gap: 4px; }

.spot-level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.spot-intro {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.spot-figure { margin: 0 0 10px; }
.spot-figure-img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 5px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  cursor: zoom-in;
}
.spot-figure-foot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
}
.spot-figure-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.spot-figure-cap { color: var(--text-secondary); }
.spot-figure-credit { font-size: 10px; color: var(--text-muted); }
.spot-figure-back {
  flex-shrink: 0;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--text-gold);
  background: rgba(var(--rgb-gold), 0.1);
  border: 1px solid rgba(var(--rgb-gold), 0.4);
  border-radius: 4px;
  cursor: pointer;
}
.spot-figure-back:hover { background: rgba(var(--rgb-gold), 0.18); }
.cur-flow { margin-left: auto; font-size: 12px; color: var(--text-gold); }

.profile-block { margin-top: 12px; }
.profile-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.profile-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 6px;
}
.profile-age { width: 50px; color: var(--text-secondary); }
.profile-bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}
.profile-bar { height: 100%; background: var(--gradient-gold); }
.profile-pct { width: 36px; text-align: right; color: var(--text-primary); }

.source-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.opinion-summary { margin-top: 12px; }
.summary-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}
.opinion-btn { width: 100%; }
</style>
