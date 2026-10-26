<template>
  <div class="home-page">
    <MapContainer
      :center="CHINA_CENTER"
      :zoom="CHINA_ZOOM"
      :min-zoom="3"
      :max-zoom="11"
      :zoom-snap="0.25"
      :scroll-wheel-zoom="true"
      :base-map="false"
      :base-background="PLAIN_BACKGROUND"
      @ready="onMapReady"
    >
      <div class="map-headline">
        <div class="headline-title">{{ headlineTitle }}</div>
        <div class="headline-sub">{{ headlineSub }}</div>
      </div>

      <div class="float-panel panel-tl" :class="{ collapsed: collapse.tl }">
        <div class="panel-head">
          <span class="panel-title">{{ t('实时概览') }}</span>
          <span class="panel-toggle" @click="collapse.tl = !collapse.tl">
            {{ collapse.tl ? '+' : '–' }}
          </span>
        </div>
        <div v-show="!collapse.tl" class="panel-body">
          <div class="scope-line">{{ t('范围：') }}{{ scopeText }}</div>
          <div class="kpi-row">
            <div class="kpi-label">{{ t('实时客流总量') }}</div>
            <div class="kpi-value gold">{{ formatNum(kpiFlow) }}</div>
            <div class="kpi-sub">{{ t('人次') }}</div>
          </div>
          <div class="kpi-row">
            <div class="kpi-label">{{ t('今日预警数') }}</div>
            <div class="kpi-value red">{{ kpiWarn }}</div>
            <div class="kpi-sub">{{ t('条') }}</div>
          </div>
          <div v-if="currentCity" class="scope-note">
            {{ t('县区数值按市级总量折算（演示口径）') }}
          </div>
        </div>
      </div>

      <Transition name="panel-fade">
        <div v-if="layerPanelVisible" class="float-panel panel-tr" :class="{ collapsed: collapse.tr }">
          <div class="panel-head">
            <span class="panel-title">{{ t('图层控制') }}</span>
            <span class="panel-toggle" @click="collapse.tr = !collapse.tr">
              {{ collapse.tr ? '+' : '–' }}
            </span>
          </div>
          <div v-show="!collapse.tr" class="panel-body">
          <label class="layer-item">
            <input type="checkbox" v-model="layers.heat" />
            <span class="dot" :style="{ background: legendGradient }"></span>{{ t('旅游热度着色') }}
          </label>
          <label class="layer-item">
            <input type="checkbox" v-model="layers.river" />
            <span class="dot" style="background:#7FA6C4"></span>{{ t('黄河干流') }}
          </label>
          <label class="layer-item">
            <input type="checkbox" v-model="layers.resource" />
            <span class="dot" style="background:var(--color-gold)"></span>{{ t('文旅资源点') }}
          </label>
          <label class="layer-item">
            <input type="checkbox" v-model="layers.nature" />
            <span class="dot" style="background:var(--color-green)"></span>{{ t('自然保护区') }}
          </label>
          <label class="layer-item">
            <input type="checkbox" v-model="layers.opinion" />
            <span class="dot" style="background:#4A7FBF"></span>{{ t('舆情') }}
          </label>
          <label class="layer-item">
            <input type="checkbox" v-model="layers.disaster" />
            <span class="dot" style="background:#C24B43"></span>{{ t('灾害') }}
          </label>
          <label v-if="currentCity" class="layer-item">
            <input type="checkbox" v-model="layers.county" />
            <span class="dot" style="background:var(--map-nodata-border)"></span>{{ t('县市分界线') }}
          </label>
          <div class="layer-note">
            {{ t('舆情 = 公开报道按市提及量（{n} 条，{time} 抓取）；', { n: newsTotal, time: shortTime(dataFetchedAt.news) }) }}
            {{ t('灾害 = USGS {since} 年以来 M≥{magnitude} 地震 {n} 条，其中 {inside} 条震中在山东境内及邻域。', { since: quakeSince.slice(0, 4), magnitude: quakeMinMagnitude, n: quakeEvents.length, inside: quakeInsideCount }) }}
          </div>
          <div v-if="currentCity" class="layer-note">
            {{ t('资源点、保护区随所选城市过滤；县界 © 阿里云 DataV.GeoAtlas。') }}
          </div>
          <div class="layer-note">
            {{ t('各市市区锚点常显：普通城市白底蓝环，省会济南加大加亮。') }}
          </div>
          <div class="layer-note">
            {{ t('黄河干流画整条黄河（源头 → 入海口），虚线常流；放大后山东段比省外段更亮。') }}
          </div>
          </div>
        </div>
      </Transition>

      <div class="float-panel panel-bl" :class="{ collapsed: collapse.bl }">
        <div class="panel-head">
          <span class="panel-title">{{ rankTitle }}</span>
          <span class="panel-toggle" @click="collapse.bl = !collapse.bl">
            {{ collapse.bl ? '+' : '–' }}
          </span>
        </div>
        <div v-show="!collapse.bl" class="panel-body">
          <div v-for="(item, idx) in rankRows" :key="item.name" class="rank-row">
            <span class="rank-no" :class="{ top: idx < 3 }">{{ idx + 1 }}</span>
            <span class="rank-city" :title="tv(item.name)">{{ tv(item.name) }}</span>
            <div class="rank-bar-wrap">
              <div class="rank-bar" :style="{ width: barWidth(item.flow) }"></div>
            </div>
            <span class="rank-flow">{{ formatNum(item.flow) }}</span>
          </div>
        </div>
      </div>

      <div class="heat-legend">
        <div class="legend-head">{{ legendHead }}</div>
        <div class="legend-bar" :style="{ background: legendGradient }"></div>
        <div class="legend-axis">
          <span>{{ heatMin.toFixed(1) }}</span>
          <span class="legend-hint">{{ t('低') }} <AppIcon name="arrow-right" :size="11" /> {{ t('高') }}</span>
          <span>{{ heatMax.toFixed(1) }}（{{ tv(legendMaxName) }}）</span>
        </div>
        <div class="legend-foot">
          <template v-if="currentCity">
            <span class="legend-swatch heat"></span>{{ t('县区') }}
            <span class="legend-swatch county"></span>{{ t('县市分界线') }}
            <span class="legend-swatch river"></span>{{ t('黄河干流（山东段）') }}
            <span class="legend-swatch anchor"></span>{{ t('市区锚点') }}
            <span class="legend-swatch anchor-cap"></span>{{ t('省会济南') }}
          </template>
          <template v-else>
            <span class="legend-swatch heat"></span>{{ scope === 'river' ? t('沿黄九市') : t('全省16市') }}
            <span class="legend-swatch no-data"></span>{{ scope === 'river' ? t('非沿黄城市') : t('其他省份（非聚焦）') }}
            <span class="legend-swatch river"></span>{{ t('黄河干流（山东段）') }}
            <span class="legend-swatch river-outer"></span>{{ t('黄河干流（省外段）') }}
            <span class="legend-swatch anchor"></span>{{ t('市区锚点') }}
            <span class="legend-swatch anchor-cap"></span>{{ t('省会济南') }}
          </template>
        </div>
        <div v-if="currentCity" class="legend-source">
          {{ t('县界 © 阿里云 DataV.GeoAtlas · 黄河干流为示意走向') }}
        </div>
      </div>

      <div class="float-panel panel-br" :class="{ collapsed: collapse.br }">
        <div class="panel-head">
          <span class="panel-title">{{ t('山东文旅图集') }}</span>
          <span class="panel-toggle" @click="collapse.br = !collapse.br">
            {{ collapse.br ? '+' : '–' }}
          </span>
        </div>
        <div v-show="!collapse.br" class="panel-body">
          <ImageGallery page="home" :title="t('山东文旅实景')" :hint="t('点击缩略图放大查看大图')" plain />
        </div>
      </div>
    </MapContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import MapContainer from '../components/common/MapContainer.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import AppIcon from '../components/common/AppIcon.vue'
import { iconSvg } from '../config/icons'
import { mockHomeData, mockReserves, mockYellowRiverCourse, mockYellowRiverFullCourse } from '../mock'
import {
  dataFetchedAt, newsByCity, newsCityMax, newsNoCityCount, newsTotal, quakeEvents, quakeInsideCount,
  quakeMinMagnitude, quakeSince, shortTime,
} from '../api/crawled'
import { NO_DATA_BORDER, NO_DATA_COLOR, heatColor, heatGradient, heatLevel } from '../config/heatScale'
import { isDeepColor, mapFocusColor } from '../config/mapPalette'
import { createPressPicker } from '../config/cityPick'
import type { PressPicker } from '../config/cityPick'
import { themeAccent, themeAccentAlpha, themeColors } from '../config/theme'
import { t, tv, locale } from '../config/i18n'
import {
  CHINA_CENTER, CHINA_ZOOM, bindCityLabelZoom, playNationalIntro, setupNationalBase,
} from '../config/chinaMap'
import { switchScopeToCity, YELLOW_RIVER_SET, isCityScope, scopeCities, scopeShort, scopeState } from '../config/cityScope'
import type { ScopeId } from '../config/cityScope'
import { splitCityToCounties, type CountyStat } from '../config/cityStats'
import {
  loadCounties,
  type CountyFeatureCollection, type CountyProperties,
} from '../config/localGeo'
import { CITY_CENTERS, SHANDONG_CITIES, type ShandongCity } from '../config/shandongRegions'
import type { AdminCityFeatureCollection, ResourcePoint } from '../types'

const router = useRouter()

const collapse = reactive({ tl: false, tr: false, bl: false, br: true })

const layerPanelVisible = ref(false)

const layers = reactive({
  heat: false,
  river: false,
  resource: false,
  nature: false,
  opinion: false,
  disaster: false,
  county: false,
})

function openDefaultLayers() {
  layers.heat = true
  layers.river = true
  layers.resource = true
  layers.county = true
}

const STATUS_COLOR: Record<ResourcePoint['status'], string> = {
  正常: '#4A9A6C',
  繁忙: '#C08A2E',
  预警: '#C24B43',
}

const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

const scope = computed<ScopeId>(() => scopeState.current)

const currentCity = computed<ShandongCity | null>(() =>
  isCityScope(scope.value) ? (scope.value as ShandongCity) : null,
)

const cityTourism = mockHomeData.cityTourism
const tourismMap = new Map(cityTourism.map((d) => [d.city, d]))
const tourismRank = new Map(
  [...cityTourism].sort((a, b) => b.heat - a.heat).map((d, i) => [d.city, i + 1]),
)

interface ScopeRow {
  name: string
  heat: number
  flow: number
  warn: number
}

const cityScopeRows = computed<ScopeRow[]>(() => {
  const rows: ScopeRow[] = []
  scopeCities(scope.value).forEach((c) => {
    const t = tourismMap.get(c)
    if (t) rows.push({ name: c, heat: t.heat, flow: t.flow, warn: t.warn })
  })
  return rows
})

const countyRows = ref<CountyStat[]>([])
const countyStatMap = computed(() => new Map(countyRows.value.map((r) => [r.name, r])))

const scopeRows = computed<ScopeRow[]>(() =>
  currentCity.value ? countyRows.value : cityScopeRows.value,
)

const rankRows = computed(() => [...scopeRows.value].sort((a, b) => b.flow - a.flow).slice(0, 5))
const rankTitle = computed(
  () => t('{scope}客流 TOP{n}', { scope: currentCity.value ? t('县区') : scopeShort(scope.value), n: rankRows.value.length }),
)

const kpiFlow = computed(() => {
  const c = currentCity.value
  if (c) return tourismMap.get(c)?.flow ?? 0
  return scopeRows.value.reduce((s, r) => s + r.flow, 0)
})
const kpiWarn = computed(() => {
  const c = currentCity.value
  if (c) return tourismMap.get(c)?.warn ?? 0
  return scopeRows.value.reduce((s, r) => s + r.warn, 0)
})

const scopeText = computed(() => {
  const c = currentCity.value
  if (c) return t('{city}市 · {n} 个县（市、区）', { city: c, n: countyRows.value.length })
  if (scope.value === 'river') return t('沿黄河流域 9 市')
  return t('全省 16 市')
})

const headlineTitle = computed(() => {
  const c = currentCity.value
  if (c) return t('{city}市旅游热度分析', { city: c })
  if (scope.value === 'river') return t('山东省沿黄九市旅游热度')
  return t('山东省 16 市旅游热度')
})
const headlineSub = computed(() => {
  const c = currentCity.value
  if (c) return t('{city}市 · 已叠加县市分界线与市区锚点 · 颜色越暖表示县区旅游热度越高 · 单位：万人次', { city: c })
  return t('全国底图 · 聚焦山东省 · 颜色越暖表示旅游热度越高 · 单位：万人次 · 统计周期：近30日')
})

const heatMin = computed(() => (scopeRows.value.length ? Math.min(...scopeRows.value.map((r) => r.heat)) : 0))
const heatMax = computed(() => (scopeRows.value.length ? Math.max(...scopeRows.value.map((r) => r.heat)) : 1))
const legendMaxName = computed(() => {
  const row = [...scopeRows.value].sort((a, b) => b.heat - a.heat)[0]
  if (!row) return ''
  return currentCity.value ? row.name : shortCity(row.name)
})
const legendHead = computed(() => {
  if (currentCity.value) return t('县区旅游热度热力（万人次）')
  if (scope.value === 'river') return t('沿黄九市旅游热度热力（万人次）')
  return t('全省 16 市旅游热度热力（万人次）')
})
const legendGradient = heatGradient()
const scopeSet = computed(() => new Set(scopeCities(scope.value) as string[]))

let map: L.Map | null = null
const layerGroups: Record<string, L.LayerGroup> = {}

function formatNum(n: number): string {
  return n.toLocaleString('zh-CN')
}

function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

function barWidth(flow: number): string {
  const max = rankRows.value[0]?.flow || 1
  return `${Math.max(8, (flow / max) * 100)}%`
}

function scopeResourcePoints(): ResourcePoint[] {
  const c = currentCity.value
  return c ? mockHomeData.resourcePoints.filter((p) => p.city === c) : mockHomeData.resourcePoints
}

function buildResourceLayer(): L.LayerGroup {
  const g = L.layerGroup()
  scopeResourcePoints().forEach((p) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      className: 'sd-px-dot',
      radius: 8,
      fillColor: STATUS_COLOR[p.status],
      color: '#FFFFFF',
      weight: 1.5,
      fillOpacity: 0.92,
    })
    marker.on('mouseover', () => marker.bringToFront())
    marker.on('click', () => openResourcePopup(p))
    marker.addTo(g)
  })
  return g
}

function openResourcePopup(p: ResourcePoint) {
  if (!map) return
  const el = document.createElement('div')
  el.className = 'sd-popup'
  el.innerHTML = `<div class="sd-popup-title">${tv(p.name)}</div>
    <div class="sd-popup-row"><span>${t('类型')}</span><b>${tv(p.type)}</b></div>
    <div class="sd-popup-row"><span>${t('实时客流')}</span><b>${t('{n} 人次', { n: formatNum(p.flow) })}</b></div>
    <div class="sd-popup-row"><span>${t('状态')}</span><b>
      <span class="sd-status-dot" style="background:${STATUS_COLOR[p.status]}"></span>${tv(p.status)}</b></div>
    <a class="sd-popup-link" href="javascript:;">${t('查看详情')}${iconSvg('arrow-right', 12, 'sd-popup-arrow')}</a>`
  el.querySelector('.sd-popup-link')?.addEventListener('click', (e) => {
    e.preventDefault()
    router.push('/scenic')
  })
  L.popup({ offset: [0, -6] }).setLatLng([p.lat, p.lng]).setContent(el).openOn(map)
}

const resourceKeys = new Set(
  mockHomeData.resourcePoints.map((p) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`),
)

function buildNatureLayer(): L.LayerGroup {
  const g = L.layerGroup()
  const city = currentCity.value
  const reserves = city ? mockReserves.filter((r) => r.city === `${city}市`) : mockReserves
  reserves.forEach((r) => {
    const accent = r.level === '国家级' ? themeAccent() : themeColors()[3]
    const popup = `<div class="sd-popup"><div class="sd-popup-title">${tv(r.name)}</div>
      <div class="sd-popup-row"><span>${t('等级')}</span><b>${tv(r.level)}</b></div>
      <div class="sd-popup-row"><span>${t('面积')}</span><b>${t('{n} 公顷', { n: formatNum(r.area) })}</b></div></div>`
    L.circle([r.lat, r.lng], {
      radius: Math.sqrt(r.area) * 120,
      color: accent,
      weight: 2,
      fillColor: accent,
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(g)
    const key = `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`
    const latlng: [number, number] = resourceKeys.has(key)
      ? [r.lat + 0.08, r.lng - 0.07]
      : [r.lat, r.lng]
    const pin = L.circleMarker(latlng, {
      className: 'sd-px-dot',
      radius: 6,
      fillColor: accent,
      color: '#FFFFFF',
      weight: 1.5,
      fillOpacity: 0.95,
    })
    pin.on('mouseover', () => pin.bringToFront())
    pin.bindPopup(popup).addTo(g)
  })
  return g
}

function buildOpinionLayer(): L.LayerGroup {
  const g = L.layerGroup()
  newsByCity.filter((c) => c.count > 0).forEach((c) => {
    const ratio = c.count / newsCityMax
    const list = c.titles.slice(0, 3)
      .map((title) => `<div class="sd-popup-row"><span style="line-height:1.6">· ${tv(title)}</span></div>`)
      .join('')
    const more = c.count > 3 ? `<div class="sd-tip-none">${t('…共 {n} 条', { n: c.count })}</div>` : ''
    L.circleMarker([c.lat, c.lng], {
      className: 'sd-px-dot',
      radius: 6 + ratio * 12,
      fillColor: '#4A7FBF',
      color: '#FFFFFF',
      weight: 1.2,
      fillOpacity: 0.35 + ratio * 0.5,
    })
      .on('mouseover', (e) => (e.target as L.CircleMarker).bringToFront())
      .bindPopup(`<div class="sd-popup"><div class="sd-popup-title">${t('{city}市 · 报道提及', { city: c.city })}</div>
        <div class="sd-popup-row"><span>${t('标题提及')}</span><b>${t('{n} 条', { n: c.count })}</b></div>${list}${more}
        <div class="sd-tip-none">${t('共 {total} 条山东题材报道（{time} 抓取），其中 {n} 条省级 / 综合稿未点明城市', { total: newsTotal, time: shortTime(dataFetchedAt.news), n: newsNoCityCount })}</div></div>`)
      .addTo(g)
  })
  return g
}

function buildDisasterLayer(): L.LayerGroup {
  const g = L.layerGroup()
  quakeEvents.forEach((q) => {
    L.circleMarker([q.lat, q.lng], {
      className: 'sd-px-dot',
      radius: Math.min(15, 4 + (q.magnitude - 3) * 3.6),
      fillColor: '#C24B43',
      color: '#FFFFFF',
      weight: 1.2,
      fillOpacity: q.insideShandong ? 0.85 : 0.45,
    })
      .on('mouseover', (e) => (e.target as L.CircleMarker).bringToFront())
      .bindPopup(`<div class="sd-popup"><div class="sd-popup-title">M${q.magnitude.toFixed(1)} ${t('地震')}</div>
        <div class="sd-popup-row"><span>${t('时间')}</span><b>${q.timeCn}</b></div>
        <div class="sd-popup-row"><span>${t('震源深度')}</span><b>${t('{n} 公里', { n: q.depthKm })}</b></div>
        <div class="sd-popup-row"><span>${t('最近城市')}</span><b>${t('{city}市约 {n} 公里', { city: q.nearestCity, n: Math.round(q.nearestCityKm) })}</b></div>
        <div class="sd-tip-none">${q.place} · USGS FDSN</div></div>`)
      .addTo(g)
  })
  return g
}

function cityStyle(name: string, heatOn: boolean): L.PathOptions {
  const short = shortCity(name)
  if (!scopeSet.value.has(short)) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.5, color: NO_DATA_BORDER(), weight: 1, opacity: 0.75 }
  }
  const item = tourismMap.get(short)
  if (currentCity.value || !heatOn || !item) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.9, color: NO_DATA_BORDER(), weight: 1, opacity: 1 }
  }
  return {
    fillColor: heatColor(item.heat, heatMin.value, heatMax.value),
    fillOpacity: 0.95,
    color: themeAccentAlpha(0.45),
    weight: 1.2,
    opacity: 0.7,
  }
}

function cityTooltip(name: string): string {
  const short = shortCity(name)
  const item = tourismMap.get(short)
  if (!item) {
    return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div>
      <div class="sd-tip-none">${t('暂无市级演示数据')}</div></div>`
  }
  const tag = YELLOW_RIVER_SET.has(short) ? `<span class="sd-tip-tag">${t('沿黄')}</span>` : ''
  if (currentCity.value) {
    const selected = short === currentCity.value
    return `<div class="sd-tip">
      <div class="sd-tip-name">${tv(name)}${tag}</div>
      <div class="sd-tip-row"><span>${t('市级热度')}</span><b>${t('{n} 万人次', { n: item.heat.toFixed(1) })}</b></div>
      <div class="sd-tip-row"><span>${t('实时客流')}</span><b>${t('{n} 人次', { n: formatNum(item.flow) })}</b></div>
      <div class="sd-tip-none">${selected ? t('已展开县区分界线，悬停县区查看明细') : t('不在当前分析范围（当前：{city}市）', { city: currentCity.value })}</div>
    </div>`
  }
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(name)}${tag}</div>
    <div class="sd-tip-row"><span>${t('旅游热度')}</span>
      <b style="color:${heatColor(item.heat, heatMin.value, heatMax.value)}">${t('{n} 万人次', { n: item.heat.toFixed(1) })}</b></div>
    <div class="sd-tip-row"><span>${t('热度等级')}</span><b>${t(heatLevel(item.heat, heatMin.value, heatMax.value))}</b></div>
    <div class="sd-tip-row"><span>${t('全省排名')}</span><b>${t('第 {rank} / {total} 位', { rank: tourismRank.get(short) ?? '', total: cityTourism.length })}</b></div>
  </div>`
}

function onClickCity(name: string) {
  const before = scope.value
  if (!switchScopeToCity(name)) return
  if (scope.value === before) flyToScope()
}

let choropleth: L.GeoJSON | null = null
const cityLayers = new Map<string, L.Polygon>()
let pickCity: PressPicker<string> | null = null
let adminBase: L.LayerGroup | null = null
let cityLabelLayer: L.LayerGroup | null = null
let adminFc: AdminCityFeatureCollection | null = null

function buildAdminLayers(fc: AdminCityFeatureCollection): L.LayerGroup {
  const base = L.layerGroup()
  adminFc = fc

  const options = {
    pane: 'sd-heat',
    className: 'sd-grow-city',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) =>
      cityStyle(String(feature?.properties?.name ?? ''), layers.heat),
    onEachFeature: (feature: { properties?: { name?: string } }, layer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const path = layer as L.Polygon
      cityLayers.set(shortCity(name), path)
      layer.bindTooltip(() => cityTooltip(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      pickCity?.(layer, name)
      layer.on('mouseover', () => {
        path.setStyle({ weight: 2.6, color: mapFocusColor(), opacity: 1, fillOpacity: 1 })
        path.bringToFront()
      })
      layer.on('mouseout', () => {
        path.setStyle(cityStyle(name, layers.heat))
      })
    },
  } as unknown as L.GeoJSONOptions
  choropleth = L.geoJSON(fc as unknown as GeoJsonObject, options)
  choropleth.addTo(base)
  buildCityAnchors().addTo(base)

  adminBase = base
  refreshCityLabels()

  return base
}

function refreshCityLabels() {
  if (!adminBase) return
  if (cityLabelLayer) {
    adminBase.removeLayer(cityLabelLayer)
    cityLabelLayer = null
  }
  cityLabelLayer = buildCityLabels()
  cityLabelLayer.addTo(adminBase)
}

function buildCityLabels(): L.LayerGroup {
  const g = L.layerGroup()
  const fc = adminFc
  if (!fc) return g
  const city = currentCity.value
  fc.features.forEach((f) => {
    const name = f.properties.name
    const short = shortCity(name)
    if (city && short === city) return
    const [lng, lat] = f.properties.centroid
    const item = tourismMap.get(short)
    const inScope = scopeSet.value.has(short)
    const withHeat = !!item && inScope && !city
    const onDeep = withHeat ? isDeepColor(heatColor(item!.heat, heatMin.value, heatMax.value)) : false
    const html = withHeat
      ? `<div class="sd-city-label-inner hot${onDeep ? ' on-deep' : ''}">
           <span class="sd-city-name">${t(short)}</span>
           <span class="sd-city-heat">${t('{n}万', { n: item!.heat.toFixed(1) })}</span>
         </div>`
      : `<div class="sd-city-label-inner${inScope ? '' : ' dim'}"><span class="sd-city-name">${t(short)}</span></div>`
    const label = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'sd-city-label', html, iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 600,
    })
    label.addTo(g)
  })
  return g
}

const CAPITAL_CITY: ShandongCity = '济南'

function buildCityAnchors(): L.LayerGroup {
  const g = L.layerGroup()
  SHANDONG_CITIES.forEach((city) => {
    const c = CITY_CENTERS[city]
    if (city === CAPITAL_CITY) {
      L.circleMarker([c.lat, c.lng], {
        pane: 'sd-anchor',
        className: 'sd-anchor-dot sd-anchor-cap sd-px-dot',
        radius: 11,
        stroke: false,
        fillColor: '#1B5E96',
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(g)
      L.circleMarker([c.lat, c.lng], {
        pane: 'sd-anchor',
        className: 'sd-anchor-dot sd-anchor-cap sd-px-dot',
        radius: 6.2,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#1B5E96',
        fillOpacity: 1,
        interactive: false,
      }).addTo(g)
      return
    }
    L.circleMarker([c.lat, c.lng], {
      pane: 'sd-anchor',
      className: 'sd-anchor-dot sd-px-dot',
      radius: 4.2,
      color: '#2E6FA8',
      weight: 1.8,
      opacity: 0.95,
      fillColor: '#FFFFFF',
      fillOpacity: 1,
      interactive: false,
    }).addTo(g)
  })
  return g
}

const RIVER_SD_ENTRY_INDEX = 32
const RIVER_EMPHASIS_ZOOM = 6.5

let riverOuter: L.Polyline | null = null
let riverSd: L.Polyline | null = null
let riverSdGlow: L.Polyline | null = null
let riverEmphasisOn: boolean | null = null

function riverStyle(emphasis: boolean): { outer: L.PathOptions; sd: L.PathOptions; sdGlow: L.PathOptions } {
  if (emphasis) {
    return {
      outer: { color: '#A9C3D6', weight: 2, opacity: 0.5, dashArray: '12 16' },
      sd: { color: '#3E7FB0', weight: 3.4, opacity: 0.98, dashArray: '12 16' },
      sdGlow: { color: '#7FA6C4', weight: 9, opacity: 0.3 },
    }
  }
  return {
    outer: { color: '#7FA6C4', weight: 2.6, opacity: 0.8, dashArray: '12 16' },
    sd: { color: '#7FA6C4', weight: 2.6, opacity: 0.8, dashArray: '12 16' },
    sdGlow: { color: '#7FA6C4', weight: 8, opacity: 0.16 },
  }
}

function buildRiverLayer(): L.LayerGroup {
  const g = L.layerGroup()
  riverEmphasisOn = map ? map.getZoom() >= RIVER_EMPHASIS_ZOOM : false
  const style = riverStyle(riverEmphasisOn)
  const flowClass = 'sd-river-flow'
  const outer = [
    ...mockYellowRiverFullCourse.slice(0, RIVER_SD_ENTRY_INDEX + 1),
    mockYellowRiverCourse[0],
  ]
  riverOuter = L.polyline(outer, {
    pane: 'sd-river',
    className: flowClass,
    lineCap: 'round',
    interactive: false,
    ...style.outer,
  })
  riverOuter.addTo(g)
  riverSdGlow = L.polyline(mockYellowRiverCourse, {
    pane: 'sd-river',
    className: 'sd-river-glow',
    lineCap: 'round',
    interactive: false,
    ...style.sdGlow,
  })
  riverSdGlow.addTo(g)
  riverSd = L.polyline(mockYellowRiverCourse, {
    pane: 'sd-river',
    className: flowClass,
    lineCap: 'round',
    interactive: false,
    ...style.sd,
  })
  riverSd.addTo(g)
  return g
}

function syncRiverEmphasis(force = false) {
  if (!map || !riverOuter || !riverSd || !riverSdGlow) return
  const on = map.getZoom() >= RIVER_EMPHASIS_ZOOM
  if (!force && on === riverEmphasisOn) return
  riverEmphasisOn = on
  const style = riverStyle(on)
  riverOuter.setStyle(style.outer)
  riverSd.setStyle(style.sd)
  riverSdGlow.setStyle(style.sdGlow)
}

const RIVER_FLOW_MS = 1000
let flowStop: (() => void) | null = null

function startRiverFlow(m: L.Map) {
  if (flowStop || !map) return
  const pane = 'sd-flow'
  if (!m.getPane(pane)) {
    m.createPane(pane)
    ;(m.getPane(pane) as HTMLElement).style.zIndex = '470'
  }
  const course = mockYellowRiverFullCourse
  const cum = [0]
  for (let i = 1; i < course.length; i++) {
    cum.push(cum[i - 1] + L.latLng(course[i - 1]).distanceTo(L.latLng(course[i])))
  }
  const total = cum[cum.length - 1]

  const group = L.layerGroup()
  const glow = L.polyline([], {
    pane, color: '#7FA6C4', weight: 10, opacity: 0.26, lineCap: 'round', interactive: false,
  }).addTo(group)
  const core = L.polyline([], {
    pane, color: '#3E7FB0', weight: 3.4, opacity: 0.95, dashArray: '12 16', lineCap: 'round', interactive: false,
  }).addTo(group)
  const head = L.marker(course[0], {
    pane,
    interactive: false,
    keyboard: false,
    zIndexOffset: 820,
    icon: L.divIcon({
      className: 'sd-flow-head',
      html: '<span class="sd-flow-pulse"></span><span class="sd-flow-core"></span>',
      iconSize: [0, 0],
    }),
  }).addTo(group)
  const tag = (cls: string, text: string, at: [number, number]) =>
    L.marker(at, {
      pane,
      interactive: false,
      keyboard: false,
      zIndexOffset: 830,
      icon: L.divIcon({ className: `sd-flow-tag ${cls}`, html: `<span>${text}</span>`, iconSize: [0, 0] }),
    }).addTo(group)
  const sourceTag = tag('at-source', t('黄河源头'), course[0])
  const seaTag = tag('at-sea', t('黄河入海 · 渤海'), course[course.length - 1])
  group.addTo(m)

  const startedAt = performance.now()
  const coreEl = (core as unknown as { _path?: SVGPathElement })._path
  let raf = 0
  let stopped = false

  const slice = (dist: number): [number, number][] => {
    const pts: [number, number][] = []
    let i = 1
    for (; i < course.length - 1 && cum[i] < dist; i++) pts.push(course[i - 1])
    const a = course[i - 1]
    const b = course[i]
    const seg = cum[i] - cum[i - 1] || 1
    const f = Math.max(0, Math.min(1, (dist - cum[i - 1]) / seg))
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
    return pts
  }

  const step = () => {
    if (stopped || !m.getContainer().isConnected) return
    const elapsed = performance.now() - startedAt
    const t = Math.min(1, elapsed / RIVER_FLOW_MS)
    const pts = slice(t * total)
    glow.setLatLngs(pts)
    core.setLatLngs(pts)
    head.setLatLng(pts[pts.length - 1])
    if (coreEl) coreEl.style.strokeDashoffset = String(-elapsed / 16)
    sourceTag.getElement()?.classList.toggle('out', t > 0.16)
    seaTag.getElement()?.classList.toggle('in', t > 0.9)
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)

  flowStop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    flowStop = null
    const paneEl = m.getPane(pane) as HTMLElement | undefined
    if (!paneEl) return
    paneEl.style.transition = 'opacity .5s ease-out'
    paneEl.style.opacity = '0'
    window.setTimeout(() => {
      if (map && map.hasLayer(group)) map.removeLayer(group)
      paneEl.style.transition = ''
      paneEl.style.opacity = ''
    }, 560)
  }
}

function stopRiverFlow() {
  flowStop?.()
}

interface CityGeo {
  city: ShandongCity
  countyGroup: L.LayerGroup
  countyPath: L.GeoJSON
  fc: CountyFeatureCollection
  labelGroup: L.LayerGroup
  labels: Map<string, L.Marker>
  rows: CountyStat[]
}

const cityGeoCache = new Map<ShandongCity, CityGeo>()
let cityGeo: CityGeo | null = null

function countyStyle(name: string, heatOn: boolean): L.PathOptions {
  const row = countyStatMap.value.get(name)
  if (!heatOn || !row) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.5, color: '#FFFFFF', weight: 1.2, opacity: 0.8, dashArray: '4 3' }
  }
  return {
    fillColor: heatColor(row.heat, heatMin.value, heatMax.value),
    fillOpacity: 0.95,
    color: '#FFFFFF',
    weight: 1.3,
    opacity: 0.9,
    dashArray: '4 3',
  }
}

function countyTooltip(name: string): string {
  const row = countyStatMap.value.get(name)
  if (!row) return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div></div>`
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(name)}</div>
    <div class="sd-tip-row"><span>${t('旅游热度')}</span>
      <b style="color:${heatColor(row.heat, heatMin.value, heatMax.value)}">${t('{n} 万人次', { n: row.heat.toFixed(1) })}</b></div>
    <div class="sd-tip-row"><span>${t('实时客流')}</span><b>${t('{n} 人次', { n: formatNum(row.flow) })}</b></div>
    <div class="sd-tip-row"><span>${t('占全市客流')}</span><b>${(row.share * 100).toFixed(1)}%</b></div>
    ${row.warn ? `<div class="sd-tip-row"><span>${t('今日预警')}</span><b>${t('{n} 条', { n: row.warn })}</b></div>` : ''}
    <div class="sd-tip-none">${t('按全市总量折算（演示口径）')}</div>
  </div>`
}

function openCountyPopup(name: string, city: ShandongCity, latlng: L.LatLng) {
  if (!map) return
  const row = countyStatMap.value.get(name)
  const el = document.createElement('div')
  el.className = 'sd-popup'
  if (!row) {
    el.innerHTML = `<div class="sd-popup-title">${tv(name)}</div>
      <div class="sd-tip-none">${t('暂无县区演示数据')}</div>`
  } else {
    el.innerHTML = `<div class="sd-popup-title">${tv(name)}<span class="sd-tip-tag">${t('{city}市', { city })}</span></div>
      <div class="sd-popup-row"><span>${t('旅游热度')}</span>
        <b style="color:${heatColor(row.heat, heatMin.value, heatMax.value)}">${t('{n} 万人次', { n: row.heat.toFixed(1) })}</b></div>
      <div class="sd-popup-row"><span>${t('实时客流')}</span><b>${t('{n} 人次', { n: formatNum(row.flow) })}</b></div>
      <div class="sd-popup-row"><span>${t('占全市客流')}</span><b>${(row.share * 100).toFixed(1)}%</b></div>
      <div class="sd-popup-row"><span>${t('今日预警')}</span><b>${t('{n} 条', { n: row.warn })}</b></div>
      <a class="sd-popup-link" href="javascript:;">${t('进入客流监测')}${iconSvg('arrow-right', 12, 'sd-popup-arrow')}</a>`
    el.querySelector('.sd-popup-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      router.push('/flow')
    })
  }
  L.popup({ className: 'sd-popup-wrap', offset: [0, -6] }).setLatLng(latlng).setContent(el).openOn(map)
}

function outerRingArea(geometry: GeoJsonObject): number {
  const geo = geometry as { type: string; coordinates: number[][][] | number[][][][] }
  const polys = geo.type === 'Polygon'
    ? [geo.coordinates as number[][][]]
    : (geo.coordinates as number[][][][])
  let best = 0
  for (const poly of polys) {
    const ring = poly[0]
    let sum = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    }
    best = Math.max(best, Math.abs(sum / 2))
  }
  return best
}

function buildCountyLabels(fc: CountyFeatureCollection): { group: L.LayerGroup; markers: Map<string, L.Marker> } {
  const group = L.layerGroup()
  const markers = new Map<string, L.Marker>()
  fc.features.forEach((f) => {
    const [lng, lat] = f.properties.center ?? []
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    const small = outerRingArea(f.geometry) < 0.035
    const label = L.marker([lat, lng], {
      icon: L.divIcon({
        className: `sd-county-label${small ? ' tier2' : ''}`,
        html: `<div class="sd-county-label-inner"><span class="sd-county-name">${tv(f.properties.name)}</span></div>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 650,
    })
    label.addTo(group)
    markers.set(f.properties.name, label)
  })
  return { group, markers }
}

function buildCountyLayer(fc: CountyFeatureCollection, city: ShandongCity) {
  const group = L.layerGroup()
  const options = {
    pane: 'sd-county',
    className: 'sd-grow',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) =>
      countyStyle(String(feature?.properties?.name ?? ''), layers.heat),
    onEachFeature: (feature: { properties?: { name?: string } }, layer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const p = layer as L.Path
      layer.bindTooltip(() => countyTooltip(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      layer.on('click', (e) => openCountyPopup(name, city, (e as L.LeafletMouseEvent).latlng))
      layer.on('mouseover', () => {
        p.setStyle({ weight: 2.4, color: mapFocusColor(), opacity: 1, fillOpacity: 1 })
        p.bringToFront()
      })
      layer.on('mouseout', () => {
        p.setStyle(countyStyle(name, layers.heat))
      })
    },
  } as unknown as L.GeoJSONOptions
  const path = L.geoJSON(fc as unknown as GeoJsonObject, options)
  path.addTo(group)
  const labels = buildCountyLabels(fc)
  labels.group.addTo(group)
  return { group, path, fc, labelGroup: labels.group, labels: labels.markers }
}

async function ensureCityGeo(city: ShandongCity): Promise<void> {
  if (cityGeo?.city === city) return
  let geo = cityGeoCache.get(city)
  if (!geo) {
    const countyFc = await loadCounties(city)
    const county = buildCountyLayer(countyFc, city)
    const t = tourismMap.get(city)
    geo = {
      city,
      countyGroup: county.group,
      countyPath: county.path,
      fc: countyFc,
      labelGroup: county.labelGroup,
      labels: county.labels,
      rows: t ? splitCityToCounties(t, countyFc.features.map((f) => f.properties.name)) : [],
    }
    cityGeoCache.set(city, geo)
  }
  if (scope.value !== city) return
  if (cityGeo && cityGeo.city !== city) {
    map?.removeLayer(cityGeo.countyGroup)
  }
  cityGeo = geo
  countyRows.value = geo.rows
}

const VIEW_PADDING = {
  paddingTopLeft: [240, 96] as [number, number],
  paddingBottomRight: [260, 140] as [number, number],
}

function scopeBounds(): L.LatLngBounds | null {
  if (!choropleth) return null
  const city = currentCity.value
  if (city) {
    const own = cityLayers.get(city)?.getBounds()
    return own ? L.latLngBounds(own.getSouthWest(), own.getNorthEast()) : null
  }
  let union: L.LatLngBounds | null = null
  ;(scopeCities(scope.value) as string[]).forEach((name) => {
    const layer = cityLayers.get(name)
    if (!layer) return
    const b = layer.getBounds()
    union = union ? union.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast())
  })
  if (union) return union
  const all = choropleth.getBounds()
  return L.latLngBounds(all.getSouthWest(), all.getNorthEast())
}

function flyToScope() {
  if (!map) return
  const b = scopeBounds()
  if (!b) return
  map.flyToBounds(b, { ...VIEW_PADDING, duration: 0.7 })
}

function rebuildScopeLayers() {
  if (layerGroups.resource) map?.removeLayer(layerGroups.resource)
  if (layerGroups.nature) map?.removeLayer(layerGroups.nature)
  layerGroups.resource = buildResourceLayer()
  layerGroups.nature = buildNatureLayer()
}

function syncCountyLabelTone() {
  if (!cityGeo) return
  cityGeo.labels.forEach((marker, name) => {
    const inner = marker.getElement()?.querySelector('.sd-county-label-inner')
    if (!inner) return
    const row = countyStatMap.value.get(name)
    const deep = layers.heat && !!row && isDeepColor(heatColor(row.heat, heatMin.value, heatMax.value))
    inner.classList.toggle('on-deep', deep)
  })
}

function syncLayers() {
  if (!map) return
  choropleth?.setStyle((f) => cityStyle(String(f?.properties?.name ?? ''), layers.heat))
  map.getContainer().classList.toggle('heat-off', !layers.heat)

  const city = currentCity.value
  const cityReady = !!city && cityGeo?.city === city
  if (cityReady && cityGeo) {
    cityGeo.countyPath.setStyle((f) =>
      countyStyle(String((f?.properties as CountyProperties | undefined)?.name ?? ''), layers.heat),
    )
  }

  const entries: [boolean, L.LayerGroup | undefined][] = [
    [layers.river, layerGroups.river],
    [layers.resource, layerGroups.resource],
    [layers.nature, layerGroups.nature],
    [layers.opinion, layerGroups.opinion],
    [layers.disaster, layerGroups.disaster],
    [layers.county && cityReady, cityGeo?.countyGroup],
  ]
  entries.forEach(([on, g]) => {
    if (!g) return
    if (on) {
      if (!map!.hasLayer(g)) g.addTo(map!)
    } else if (map!.hasLayer(g)) {
      map!.removeLayer(g)
    }
  })

  if (cityReady && cityGeo) syncCountyLabelTone()
}

function syncScopeView() {
  if (!map) return
  syncLayers()
  refreshCityLabels()
  rebuildScopeLayers()
  syncLayers()
}

async function applyScope(next: ScopeId) {
  if (!map) return
  try {
    if (isCityScope(next)) {
      await ensureCityGeo(next)
      if (scope.value !== next) return
    } else {
      countyRows.value = []
    }
  } catch (err) {
    console.error(err)
  }
  syncScopeView()
  flyToScope()
}

watch(scope, (next) => {
  void applyScope(next)
})

function refreshCountyLabelText() {
  cityGeoCache.forEach((geo) => {
    geo.countyGroup.removeLayer(geo.labelGroup)
    const labels = buildCountyLabels(geo.fc)
    labels.group.addTo(geo.countyGroup)
    geo.labelGroup = labels.group
    geo.labels = labels.markers
  })
  syncCountyLabelTone()
}

function rebuildLocaleLayers() {
  const m = map
  if (!m) return
  m.closePopup()
  ;(['resource', 'nature', 'opinion', 'disaster'] as const).forEach((key) => {
    const prev = layerGroups[key]
    if (prev) m.removeLayer(prev)
  })
  layerGroups.resource = buildResourceLayer()
  layerGroups.nature = buildNatureLayer()
  layerGroups.opinion = buildOpinionLayer()
  layerGroups.disaster = buildDisasterLayer()
  syncLayers()
}

watch(locale, () => {
  refreshCityLabels()
  refreshCountyLabelText()
  rebuildLocaleLayers()
})

function bindCountyLabelTier(m: L.Map) {
  const sync = () => {
    m.getContainer().classList.toggle('sd-county-zoom-low', m.getZoom() < 9.8)
  }
  sync()
  m.on('zoom zoomend', sync)
}

function bindLayerPanelTier(m: L.Map) {
  const sync = () => {
    layerPanelVisible.value = !m.getContainer().classList.contains('sd-far-view')
  }
  sync()
  m.on('zoom zoomend', sync)
}

async function setupAdminMap(m: L.Map) {
  const [national, res] = await Promise.all([
    setupNationalBase(m),
    fetch(`${import.meta.env.BASE_URL}shandong.json`),
  ])
  if (map !== m) return
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  if (map !== m) return

  buildAdminLayers(fc).addTo(m)
  layerGroups.river = buildRiverLayer()
  syncLayers()

  void prepareScopeGeo()

  m.setMaxBounds(national.bounds.pad(0.2))
  playNationalIntro(m, {
    china: national.bounds,
    focus: scopeBounds() ?? choropleth!.getBounds(),
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    hold: RIVER_FLOW_MS + 60,
    duration: 750,
    onHoldStart: () => startRiverFlow(m),
    onDollyStart: () => stopRiverFlow(),
    onFinish: () => {
      stopRiverFlow()
      openDefaultLayers()
      syncRiverEmphasis(true)
    },
  })
}

async function prepareScopeGeo() {
  const city = currentCity.value
  if (!city) return
  try {
    await ensureCityGeo(city)
    if (scope.value === city) syncScopeView()
  } catch (err) {
    console.error(err)
  }
}

function onMapReady(m: L.Map) {
  map = m
  m.createPane('sd-heat')
  m.createPane('sd-county')
  m.createPane('sd-anchor')
  m.createPane('sd-river')
  ;(m.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(m.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ;(m.getPane('sd-anchor') as HTMLElement).style.zIndex = '430'
  ;(m.getPane('sd-river') as HTMLElement).style.zIndex = '420'
  bindCityLabelZoom(m)
  bindCountyLabelTier(m)
  bindLayerPanelTier(m)
  m.on('zoom zoomend', () => syncRiverEmphasis())
  pickCity = createPressPicker<string>(m, (name) => onClickCity(name))

  layerGroups.resource = buildResourceLayer()
  layerGroups.nature = buildNatureLayer()
  layerGroups.opinion = buildOpinionLayer()
  layerGroups.disaster = buildDisasterLayer()
  syncLayers()

  setupAdminMap(m).catch((err) => {
    console.error(err)
    openDefaultLayers()
  })
}

watch(layers, syncLayers)

onBeforeUnmount(() => {
  map = null
})
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.map-headline {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  text-align: center;
  pointer-events: none;
}
.headline-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--map-title);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
.headline-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.heat-legend {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 1100;
  width: 300px;
  padding: 10px 14px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-card);
}
.legend-head {
  font-size: 12px;
  color: var(--text-gold);
  margin-bottom: 8px;
}
.legend-bar {
  height: 10px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
}
.legend-axis {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.legend-hint {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
}
.legend-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-muted);
}
.legend-swatch {
  display: inline-block;
  width: 12px;
  height: 8px;
  border-radius: 2px;
}
.legend-swatch.heat {
  background: linear-gradient(90deg, var(--map-heat, #EDFBF2, #00AF5C));
  border: 1px solid var(--map-nodata-border);
}
.legend-swatch.no-data {
  background: var(--map-nodata);
  border: 1px solid var(--map-nodata-border);
}
.legend-swatch.china {
  background: var(--map-nodata);
  border: 1px dashed var(--map-nodata-border);
  margin-left: 6px;
}
.legend-swatch.river {
  height: 3px;
  border-radius: 2px;
  background: #3E7FB0;
  margin-left: 6px;
}
.legend-swatch.river-outer {
  height: 3px;
  border-radius: 2px;
  background: #A9C3D6;
  margin-left: 6px;
}
.legend-swatch.county {
  background: var(--map-nodata);
  border: 1px solid var(--map-nodata-border);
  margin-left: 6px;
}
.legend-swatch.anchor {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1.5px solid #2E6FA8;
  margin-left: 6px;
}
.legend-swatch.anchor-cap {
  border-radius: 50%;
  background: #1B5E96;
  border: 2px solid #FFFFFF;
  box-shadow: 0 0 0 1.5px #1B5E96;
  width: 10px;
  height: 10px;
  margin-left: 6px;
}
.heat-legend .legend-foot { flex-wrap: wrap; row-gap: 4px; }
.legend-source {
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.85;
}

:deep(.sd-city-label) {
  background: transparent;
  border: none;
}
:deep(.sd-city-label-inner) {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  line-height: 1.35;
  pointer-events: none;
}
:deep(.sd-city-label-inner .sd-city-name) {
  font-size: 12px;
  color: var(--map-label-name);
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-city-label-inner .sd-city-heat) {
  font-size: 12px;
  font-weight: 700;
  color: var(--map-label-value);
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-city-label-inner.hot .sd-city-name) {
  font-size: 13px;
  color: var(--map-label-hot);
}
:deep(.sd-city-label-inner.on-deep .sd-city-name),
:deep(.sd-city-label-inner.on-deep .sd-city-heat) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
:deep(.heat-off .sd-city-heat) { display: none; }
:deep(.heat-off .sd-city-label-inner.hot .sd-city-name) {
  font-size: 12px;
  color: var(--map-label-name);
}
:deep(.sd-city-label-inner.dim .sd-city-name) {
  color: var(--text-muted);
  font-weight: 400;
}
:deep(.sd-far-view .sd-city-label) { display: none; }
:deep(.sd-far-view .sd-anchor-dot) { display: none; }

:deep(.sd-county-label) {
  background: transparent;
  border: none;
}
:deep(.sd-county-label-inner) {
  position: absolute;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  pointer-events: none;
}
:deep(.sd-county-label-inner .sd-county-name) {
  font-size: 11px;
  color: var(--map-label-name);
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-county-label.tier2 .sd-county-name) {
  font-size: 10px;
  color: var(--text-muted);
}
:deep(.sd-county-label-inner.on-deep .sd-county-name) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
:deep(.sd-far-view .sd-county-label) { display: none; }
:deep(.sd-county-zoom-low .sd-county-label.tier2) { display: none; }

:deep(.leaflet-tooltip.sd-tooltip) {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
  font-size: 12px;
}
:deep(.sd-tooltip.leaflet-tooltip-top::before) {
  border-top-color: #FFFFFF;
}
:deep(.sd-tooltip.leaflet-tooltip-bottom::before) {
  border-bottom-color: #FFFFFF;
}
:deep(.sd-tip-name) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 4px;
}
:deep(.sd-tip-tag) {
  padding: 0 4px;
  font-size: 10px;
  font-weight: 400;
  color: var(--map-title);
  background: rgba(var(--rgb-gold), 0.12);
  border: 1px solid rgba(var(--rgb-gold), 0.35);
  border-radius: 3px;
}
:deep(.sd-tip-row) {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  line-height: 1.9;
  color: var(--text-secondary);
}
:deep(.sd-popup-row) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  line-height: 1.9;
  color: var(--text-secondary);
}
:deep(.sd-popup-row b) {
  color: var(--text-primary);
  font-weight: 600;
}
:deep(.sd-tip-none) {
  font-size: 12px;
  color: var(--text-muted);
}
:deep(.sd-popup-title) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 6px;
}
:deep(.sd-popup-link) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-gold);
}
:deep(.sd-popup-link:hover) { text-decoration: underline; }
:deep(.sd-popup-arrow) { vertical-align: -0.16em; }
:deep(.sd-status-dot) {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

.float-panel {
  position: absolute;
  z-index: 1100;
  min-width: 220px;
  max-width: 280px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-card);
}
.panel-tl { top: 16px; left: 16px; }
.panel-tr { top: 16px; right: 16px; }
.panel-bl { bottom: 16px; left: 16px; }
.panel-br { bottom: 16px; right: 16px; }

.panel-fade-enter-active {
  transition: opacity 0.45s ease-out 0.18s, transform 0.45s ease-out 0.18s;
}
.panel-fade-leave-active {
  transition: opacity 0.22s ease-in, transform 0.22s ease-in;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gold);
}
.panel-toggle {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
}
.panel-toggle:hover { color: var(--text-gold); }

.panel-body { padding: 12px; }

.kpi-row { margin-bottom: 10px; }
.kpi-row:last-child { margin-bottom: 0; }
.kpi-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.kpi-value { font-size: 24px; font-weight: 700; font-family: 'DIN', sans-serif; }
.kpi-value.gold { color: var(--text-gold); }
.kpi-value.red { color: var(--status-danger); }
.kpi-sub { font-size: 11px; color: var(--text-muted); }
.scope-line {
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--text-gold);
}
.scope-note {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 0;
  cursor: pointer;
}
.layer-item input { accent-color: var(--color-gold); }
.layer-note {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  max-width: 210px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  display: inline-block;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}
.rank-row:last-child { margin-bottom: 0; }
.rank-no {
  width: 18px; height: 18px;
  border-radius: 3px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
}
.rank-no.top { background: var(--gradient-gold); color: #FFFFFF; font-weight: 700; }
.rank-city {
  width: 42px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}
.rank-bar {
  height: 100%;
  background: var(--gradient-gold);
  border-radius: 4px;
}
.rank-flow { width: 64px; text-align: right; color: var(--text-secondary); font-size: 11px; }
</style>
