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
      <!-- 顶部：标题（分析范围由顶栏统一筛选） -->
      <div class="map-headline">
        <div class="headline-title">{{ headlineTitle }}</div>
        <div class="headline-sub">{{ headlineSub }}</div>
      </div>

      <!-- 左上：实时客流 / 预警 -->
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

      <!-- 右上：图层切换（全国远景先不出现，放大落位后再淡入，见 layerPanelVisible） -->
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

      <!-- 左下：客流排名 TOP5 -->
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

      <!-- 底部中央：热度图例 -->
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

      <!-- 右下：山东文旅图集（默认收起，展开后点缩略图看大图） -->
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

/**
 * 图层控制面板是否出现：地图放大（落位到省内视野）之前不显示——全国远景还在运镜，
 * 先把画面留给地图本身；放大后淡入，缩回全国远景再收起。
 * 显隐直接跟随 chinaMap 维护的 sd-far-view（与地市标注、市区锚点同一套阈值，见 bindCityLabelZoom）。
 */
const layerPanelVisible = ref(false)

// 入场推近期间六个图层全关：不铺专题图层，全国底图干净，运镜才看得清；
// 推近落位后再由 openDefaultLayers 打开（旅游热度着色 / 黄河干流 / 文旅资源点）；
// 选中具体城市时再叠加县市分界线（用户口径：具体城市要画县界）
const layers = reactive({
  heat: false,
  river: false,
  resource: false,
  nature: false,
  opinion: false,
  disaster: false,
  county: false,
})

/** 默认打开的图层 */
function openDefaultLayers() {
  layers.heat = true
  layers.river = true
  layers.resource = true
  // 县界开关与图层都按「当前是否选中具体城市」门控，
  // 这里无条件置真：默认范围是黄河流域，之后切到具体城市必须能看到县界
  layers.county = true
}

const STATUS_COLOR: Record<ResourcePoint['status'], string> = {
  正常: '#4A9A6C',
  繁忙: '#C08A2E',
  预警: '#C24B43',
}

// 简约米白：无瓦片行政区底图的底色
// 无瓦片底图底色：跟随当前风格（--map-bg），兜底为米白
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

// ========== 分析范围（顶栏全局筛选：全部 / 沿黄河流域 / 具体城市） ==========
/** 当前范围来自顶栏的城市筛选器；本页只负责按范围重算数据与视图 */
const scope = computed<ScopeId>(() => scopeState.current)

/** 选中具体城市时的市级汇总（用于范围说明与县区折算） */
const currentCity = computed<ShandongCity | null>(() =>
  isCityScope(scope.value) ? (scope.value as ShandongCity) : null,
)

const cityTourism = mockHomeData.cityTourism
const tourismMap = new Map(cityTourism.map((d) => [d.city, d]))
/** 16 市热度排名（1 起） */
const tourismRank = new Map(
  [...cityTourism].sort((a, b) => b.heat - a.heat).map((d, i) => [d.city, i + 1]),
)

/** 范围内参与统计的市级行 */
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

/** 县区折算结果（选中具体城市后由县界数据生成，其余范围为空） */
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

// ========== 旅游热力数据（随范围重算） ==========
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
/** 范围内城市集合（用于着色与标注判断） */
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

// ========== 图层构建 ==========
/** 资源点随范围过滤：选中具体城市时只留本市点位 */
function scopeResourcePoints(): ResourcePoint[] {
  const c = currentCity.value
  return c ? mockHomeData.resourcePoints.filter((p) => p.city === c) : mockHomeData.resourcePoints
}

function buildResourceLayer(): L.LayerGroup {
  const g = L.layerGroup()
  scopeResourcePoints().forEach((p) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      // 像素半径圆点：缩放动画期间隐去、落位后渐显（见 MapContainer 的 bindPixelDotFade）
      className: 'sd-px-dot',
      radius: 8,
      fillColor: STATUS_COLOR[p.status],
      color: '#FFFFFF',
      weight: 1.5,
      fillOpacity: 0.92,
    })
    // 悬停置顶：与其它点位重叠时也能明确点到自己
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

/** 文旅资源点坐标（保留三位小数），用于识别与之完全重合的保护区 */
const resourceKeys = new Set(
  mockHomeData.resourcePoints.map((p) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`),
)

function buildNatureLayer(): L.LayerGroup {
  const g = L.layerGroup()
  const city = currentCity.value
  // 保护区随范围过滤：选中具体城市时只留本市（mockReserves.city 带「市」后缀）
  const reserves = city ? mockReserves.filter((r) => r.city === `${city}市`) : mockReserves
  reserves.forEach((r) => {
    const accent = r.level === '国家级' ? themeAccent() : themeColors()[3]
    const popup = `<div class="sd-popup"><div class="sd-popup-title">${tv(r.name)}</div>
      <div class="sd-popup-row"><span>${t('等级')}</span><b>${tv(r.level)}</b></div>
      <div class="sd-popup-row"><span>${t('面积')}</span><b>${t('{n} 公顷', { n: formatNum(r.area) })}</b></div></div>`
    // 范围圆只作示意、不接收鼠标事件，避免圈内的文旅资源点被挡住点不到
    L.circle([r.lat, r.lng], {
      radius: Math.sqrt(r.area) * 120,
      color: accent,
      weight: 2,
      fillColor: accent,
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(g)
    // 保护区本身用定位点承载点击；与资源点完全重合时错开一点，两个点都能点到
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
  // 真实公开报道的按市提及量：标题里出现该市即计入一次，点大小与不透明度随条数
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
  // 真实地震活动：USGS 近十年 M≥3，半径随震级，实心为山东境内及邻域
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

// ========== 行政区热力图层 ==========
/** 城市底色：范围内按热度着色；范围外压暗；选中具体城市时市级只留浅底（县区层负责着色） */
function cityStyle(name: string, heatOn: boolean): L.PathOptions {
  const short = shortCity(name)
  if (!scopeSet.value.has(short)) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.5, color: NO_DATA_BORDER(), weight: 1, opacity: 0.75 }
  }
  const item = tourismMap.get(short)
  if (currentCity.value || !heatOn || !item) {
    // 选中具体城市时县区层会铺满全市，市级底只留浅色，避免压住县界
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

/** 点击某个市：切换顶栏分析范围（单次点击即切换，随后由范围监听带着县界与视野一起走） */
function onClickCity(name: string) {
  const before = scope.value
  if (!switchScopeToCity(name)) return
  // 点的就是当前范围：范围没变不会触发监听，这里直接把视野收回来
  if (scope.value === before) flyToScope()
}

let choropleth: L.GeoJSON | null = null
/** 市简称 → 市级多边形图层（范围缩放用） */
const cityLayers = new Map<string, L.Polygon>()
/** 按下/抬起成对识别的点击器（见 cityPick.ts）：飞行动画途中也能收到地市点击 */
let pickCity: PressPicker<string> | null = null
/** 行政区底图组与市级标注层（标注随范围重建） */
let adminBase: L.LayerGroup | null = null
let cityLabelLayer: L.LayerGroup | null = null
let adminFc: AdminCityFeatureCollection | null = null

/** 依赖外部的行政区划数据，构建「常驻行政区底图」：着色与热度数值由热力开关控制 */
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
      // 飞行未结束时按下/抬起会落在不同元素上（浏览器把 click 判给公共祖先，图层收不到），
      // 用按下/抬起配对识别兜住；紧随其后的真 click 由识别器内部去重
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
  // 市区锚点跟着行政区底图常驻：16 市各一个，不随范围与图层开关变化
  buildCityAnchors().addTo(base)

  adminBase = base
  refreshCityLabels()

  return base
}

/** 重建市级标注：范围内展示热度数值，范围外只留名称；选中城市自身交给县区标注 */
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
    // 选中城市自身由县区标注承担，市级标注隐藏
    if (city && short === city) return
    const [lng, lat] = f.properties.centroid
    const item = tourismMap.get(short)
    const inScope = scopeSet.value.has(short)
    const withHeat = !!item && inScope && !city
    // 处于深色填充的城市改用浅色标注（按实际填充色的明暗判断，保证浅色主题下的可读性）
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

// ========== 各市市区锚点：16 市市区中心，省会济南加大加亮 ==========
/** 省会：锚点加大并配外圈光晕，其余城市白底蓝环小点 */
const CAPITAL_CITY: ShandongCity = '济南'

/**
 * 市区锚点常驻（不随图层开关、不随范围过滤）：普通城市白底蓝环小点，济南换成实心大点 + 淡光晕。
 * 锚点一律 interactive: false——点选仍落到下面的市域色块上（点市切范围），锚点只做定位参照。
 */
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

// ========== 黄河干流：整条黄河常驻显示，放大后山东段更亮 ==========
/** 山东段起点（东明入鲁）在整河示意线上的下标：省外段画到这里为止，再接上山东段起点 */
const RIVER_SD_ENTRY_INDEX = 32
/** 放大到该层级以上切换为「山东段高亮」：沿黄九市落位视野约 7.5 级，一落位就是高亮态 */
const RIVER_EMPHASIS_ZOOM = 6.5

/** 黄河两段的线对象（缩放时按阈值切换配色） */
let riverOuter: L.Polyline | null = null
let riverSd: L.Polyline | null = null
let riverSdGlow: L.Polyline | null = null
/** 当前是否处于「山东段高亮」态：只在跨阈值时重排样式，缩放逐帧推进时不做无谓写入 */
let riverEmphasisOn: boolean | null = null

/**
 * 省外段 / 山东段的两套配色（两段虚线周期都是 28，共用一条流动动画，接缝处相位连续）：
 * 放大态——山东段亮蓝加粗并垫宽底光晕，省外段压暗压细只作整河上下文；
 * 全国视野——两段同款同虚实，看上去就是一条连通的黄河。
 */
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

/**
 * 黄河干流：整条黄河（源头 → 入海口）常驻——省外段一条、山东段一条，两者在东明接龙成一条河道。
 * 虚线相位交给 CSS 动画（.sd-river-flow）常驻前移，任何缩放层级下都在流动，不依赖逐帧脚本。
 * 放大到 RIVER_EMPHASIS_ZOOM 以上时山东段换成更亮更粗的一套色、省外段压暗，突出本省河段。
 */
function buildRiverLayer(): L.LayerGroup {
  const g = L.layerGroup()
  riverEmphasisOn = map ? map.getZoom() >= RIVER_EMPHASIS_ZOOM : false
  const style = riverStyle(riverEmphasisOn)
  const flowClass = 'sd-river-flow'
  // 省外段：源头 → 东明（入鲁），再把山东段起点接上，两段之间不留缝；先画，压在高亮的山东段之下
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
  // 山东段：宽底光晕 + 亮芯（叠在最上层，放大后就是全场最亮的一段河道）
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

/**
 * 缩放联动：放大后山东段更高亮，缩回全国视野两段同款。
 * force 用于入场落位后强制重写一次属性（落位前这些线还没上图层，属性只在真正上屏时才会写成）。
 */
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

// ========== 入场：黄河从源头流向渤海，随后镜头推近山东黄河流域 ==========
/** 源头 → 入海口 的流动时长（ms）：整段入场（流动 + 推近）压在 2 秒以内，这里取 1 秒 */
const RIVER_FLOW_MS = 1000
/** 入场水线的收尾句柄（推近开始 / 用户接管 / 落位时调用，幂等） */
let flowStop: (() => void) | null = null

/**
 * 全国视野停留期间播「黄河奔流」：从源头逐帧画到渤海入海口，头部一枚呼吸点，
 * 虚线相位沿河道前移做出流动感；源头与入海口各挂一枚地名标签。
 * 推近开始时整体淡出，把画面让给山东黄河流域。
 */
function startRiverFlow(m: L.Map) {
  // 离开首页后 map 会被清掉：此时水位画不上屏，也不能再去碰已销毁的地图
  if (flowStop || !map) return
  const pane = 'sd-flow'
  if (!m.getPane(pane)) {
    m.createPane(pane)
    // 入场水线要压在山东一切专题图层之上（热度 380 / 县界 390 / 干道 400 / 干流 420）：
    // 之前是 360，河水一流进山东就被省级多边形盖住，这里抬到 470
    ;(m.getPane(pane) as HTMLElement).style.zIndex = '470'
  }
  const course = mockYellowRiverFullCourse
  // 按累计里程推进：经纬度步长不均，直接按点走会忽快忽慢
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

  /** 已画出的河道：按里程取整点，段内线性插值出头部 */
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
    // 虚线相位前移 = 水在流（该属性 Leaflet 不管，直接写 style）
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

/** 停掉入场水线（推近开始 / 用户接管 / 落位，幂等） */
function stopRiverFlow() {
  flowStop?.()
}

// ========== 县市分界线（选中具体城市时）与整省铁路线网 ==========
interface CityGeo {
  city: ShandongCity
  countyGroup: L.LayerGroup
  countyPath: L.GeoJSON
  /** 县区原始数据：换语言时按它整组重建县区名标注 */
  fc: CountyFeatureCollection
  /** 县区名标注组：换语言时整组换掉 */
  labelGroup: L.LayerGroup
  /** 县区名标注按名称索引：数值后到，深浅字色要等数据齐了再统一刷（见 syncCountyLabelTone） */
  labels: Map<string, L.Marker>
  /** 市级总量折算到本市县区的结果（与市绑定，来回切换范围不重算） */
  rows: CountyStat[]
}

/** 每个市的县界图层只构建一次，来回切换范围直接复用 */
const cityGeoCache = new Map<ShandongCity, CityGeo>()
let cityGeo: CityGeo | null = null

/** 县区底色：随热力开关着色，关闭热力时留浅色底但保留县界（白色虚线，压在同色系填充上也看得清） */
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

/** 外环面积（平方度，仅用于区分「小城区」标注层级） */
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

/** 县区名标注：市辖区这类小面积县区在县城落位时互相压盖，放大后再显示；深底浅字由 syncCountyLabelTone 统一更新 */
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
    // 县区图元统一带悬停微放大类；keyboard 关掉，点完不会留浏览器焦点框
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

/** 懒加载并缓存所选城市的县界，构建图层；只有仍停在该市时才切换为当前 */
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
  // 取数期间用户可能又切走了：只有仍停在该市时才真正切换
  if (scope.value !== city) return
  if (cityGeo && cityGeo.city !== city) {
    map?.removeLayer(cityGeo.countyGroup)
  }
  cityGeo = geo
  countyRows.value = geo.rows
}

/** 视野占位：左上「实时概览」、顶部标题与范围条、右下角留白 */
const VIEW_PADDING = {
  paddingTopLeft: [240, 96] as [number, number],
  paddingBottomRight: [260, 140] as [number, number],
}

/** 当前范围该落在哪个视野：全部 = 全省；沿黄 = 九市并集；具体城市 = 该市轮廓 */
function scopeBounds(): L.LatLngBounds | null {
  if (!choropleth) return null
  const city = currentCity.value
  if (city) {
    // 注意：Leaflet 的 getBounds() 返回图层内部缓存的 LatLngBounds 本身（不是副本），
    // 直接拿去 extend 会把该市的轮廓范围永久改写，这里一律取副本
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
  // 注意：Leaflet 的 duration 单位是秒而不是毫秒，0.7 表示 0.7 秒
  map.flyToBounds(b, { ...VIEW_PADDING, duration: 0.7 })
}

/** 资源点 / 保护区随范围过滤：范围一变就重建这两个组 */
function rebuildScopeLayers() {
  if (layerGroups.resource) map?.removeLayer(layerGroups.resource)
  if (layerGroups.nature) map?.removeLayer(layerGroups.nature)
  layerGroups.resource = buildResourceLayer()
  layerGroups.nature = buildNatureLayer()
}

/** 县区名深浅：填充偏深时翻成浅色字（按实际填充色的明暗判断），深灰字压在深色块上看不清 */
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
  // 行政区底图常驻：热力开关只切换各市着色与热度数值，避免关闭后地图变空白
  choropleth?.setStyle((f) => cityStyle(String(f?.properties?.name ?? ''), layers.heat))
  map.getContainer().classList.toggle('heat-off', !layers.heat)

  const city = currentCity.value
  const cityReady = !!city && cityGeo?.city === city
  if (cityReady && cityGeo) {
    // 县区色块与市级同开关：关掉热力时保留县界、填充转中性浅色
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

  // 县区标注的深浅字：县区数值是建层之后才注入的，统一放在这里按最新数据刷新
  if (cityReady && cityGeo) syncCountyLabelTone()
}

/** 按当前范围刷新地图：着色、市级标注、随范围过滤的资源/保护区、县区与干道层 */
function syncScopeView() {
  if (!map) return
  syncLayers()
  refreshCityLabels()
  rebuildScopeLayers()
  syncLayers()
}

/** 范围切换：取数（具体城市）→ 刷新视图与图层 → 视野飞向该范围 */
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

// 范围由顶栏的统一筛选器维护，本页监听全局状态做取数与取景
watch(scope, (next) => {
  void applyScope(next)
})

/** 换语言：县区名标注是建层时写死的 HTML，按缓存的县区数据整组重建（不动视野与县界） */
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

/** 换语言：资源/保护区/舆情/灾害的弹窗内容都是建层时拼好的 HTML，整组重建 */
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

/** 换语言：市名/县区名标注与地图弹窗都是建层时写死的 HTML，这里只换字、不重置视野 */
watch(locale, () => {
  refreshCityLabels()
  refreshCountyLabelText()
  rebuildLocaleLayers()
})

/** 县区小城区标注（如奎文区）互相压盖：落位视野先隐藏，放大到更高层级再显示 */
function bindCountyLabelTier(m: L.Map) {
  const sync = () => {
    m.getContainer().classList.toggle('sd-county-zoom-low', m.getZoom() < 9.8)
  }
  sync()
  m.on('zoom zoomend', sync)
}

/** 图层控制面板跟随远景/省内视野：bindCityLabelZoom 先跑（注册更早），这里读它刚写好的类 */
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
  // 取数期间用户可能已经离开首页：地图连同各 pane 都已销毁，再往上叠图层会报错
  if (map !== m) return
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  // 解析响应体同样是个 await：这期间也可能已经切走地图，叠层前再确认一次
  if (map !== m) return

  buildAdminLayers(fc).addTo(m)
  layerGroups.river = buildRiverLayer()
  syncLayers()

  // 默认范围的县界在入场动画期间拉好，落位时直接亮起来
  void prepareScopeGeo()

  // 全国底图可拖拽的范围：东三省到南海诸岛，避免拖到空白海域
  m.setMaxBounds(national.bounds.pad(0.2))
  // 打开首页：先在全国视野看黄河从源头流到入海口，再推近当前范围（默认黄河流域）
  playNationalIntro(m, {
    china: national.bounds,
    focus: scopeBounds() ?? choropleth!.getBounds(),
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    // 停留时长与「黄河奔流」对齐，流到入海口立刻推近：流动 1.0s + 推近 0.75s ≈ 1.8s 落位
    hold: RIVER_FLOW_MS + 60,
    duration: 750,
    onHoldStart: () => startRiverFlow(m),
    onDollyStart: () => stopRiverFlow(),
    // 放大完成后再把图层打开：热度着色、黄河干流、资源点一起亮起来
    onFinish: () => {
      stopRiverFlow()
      openDefaultLayers()
      // 落位缩放决定黄河两段的高亮关系，强制按落位后的缩放重写一次
      syncRiverEmphasis(true)
    },
  })
}

/** 首屏把当前范围的县界先拉好（不移动视野，落位由入场动画负责） */
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
  // 行政区热力层需要更低的层级，避免盖住资源点与标注；
  // 县界（390）压在热力之上，河流 420、市区锚点 430、点位与标注更高
  m.createPane('sd-heat')
  m.createPane('sd-county')
  m.createPane('sd-anchor')
  m.createPane('sd-river')
  ;(m.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(m.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ;(m.getPane('sd-anchor') as HTMLElement).style.zIndex = '430'
  ;(m.getPane('sd-river') as HTMLElement).style.zIndex = '420'
  // 全国视野下隐藏市名/县名标注，飞入山东后再淡入；县区小城区标注等放大后再显示
  bindCityLabelZoom(m)
  bindCountyLabelTier(m)
  bindLayerPanelTier(m)
  // 黄河山东段高亮：跨过缩放阈值时切换配色，缩放到任何层级河流都保持流动
  m.on('zoom zoomend', () => syncRiverEmphasis())
  // 地市点击：按下/抬起配对识别（运镜/飞行动画途中点别的市也能立刻切过去，见 config/cityPick.ts）
  pickCity = createPressPicker<string>(m, (name) => onClickCity(name))

  layerGroups.resource = buildResourceLayer()
  layerGroups.nature = buildNatureLayer()
  layerGroups.opinion = buildOpinionLayer()
  layerGroups.disaster = buildDisasterLayer()
  syncLayers()

  setupAdminMap(m).catch((err) => {
    console.error(err)
    // 入场没跑起来就收不到 onFinish，这里补一次，避免地图停在「图层全关」的空状态
    openDefaultLayers()
  })
}

watch(layers, syncLayers)

// 离开首页时 Leaflet 的地图连同 pane 一起销毁，但入场动画、县界取数这些异步回调
// 可能还在路上；不清引用它们回来叠图层就会撞上已销毁的 pane 而报错。清掉之后各处
// 已有的 if (!map) return 就是天然的截断。
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

/* ===== 顶部标题 ===== */
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
  /* 直接压在米白底图上，取比 --text-gold 更深的金棕以保证可读性 */
  color: var(--map-title);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
.headline-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== 热度图例 ===== */
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
  /* 省外段：同一色系压暗，表示是整河的上下文段 */
  background: #A9C3D6;
  margin-left: 6px;
}
.legend-swatch.county {
  background: var(--map-nodata);
  border: 1px solid var(--map-nodata-border);
  margin-left: 6px;
}
/* 市区锚点：普通城市白底蓝环小圆点 */
.legend-swatch.anchor {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1.5px solid #2E6FA8;
  margin-left: 6px;
}
/* 省会济南：实心大圆点 + 白环，图例里也放大一圈 */
.legend-swatch.anchor-cap {
  border-radius: 50%;
  background: #1B5E96;
  border: 2px solid #FFFFFF;
  box-shadow: 0 0 0 1.5px #1B5E96;
  width: 10px;
  height: 10px;
  margin-left: 6px;
}
/* 城市模式下图例项更多，允许换行；数据来源另起一行小字 */
.heat-legend .legend-foot { flex-wrap: wrap; row-gap: 4px; }
.legend-source {
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.85;
}

/* ===== 城市标注 ===== */
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
/* 深色填充的城市改用浅色字，保证可读性 */
:deep(.sd-city-label-inner.on-deep .sd-city-name),
:deep(.sd-city-label-inner.on-deep .sd-city-heat) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
/* 关闭热力着色后：隐藏热度数值，九市名称回落到普通灰字 */
:deep(.heat-off .sd-city-heat) { display: none; }
:deep(.heat-off .sd-city-label-inner.hot .sd-city-name) {
  font-size: 12px;
  color: var(--map-label-name);
}
/* 范围外的城市只留一个淡名，避免抢范围内城市的信息 */
:deep(.sd-city-label-inner.dim .sd-city-name) {
  color: var(--text-muted);
  font-weight: 400;
}
/* 全国视野下地市标注会挤成一团，飞入山东后再显示 */
:deep(.sd-far-view .sd-city-label) { display: none; }
/* 市区锚点与市名标注同一套显隐：全国视野下先不出现，落位后再亮出来 */
:deep(.sd-far-view .sd-anchor-dot) { display: none; }

/* ===== 县区标注（选中具体城市时） ===== */
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
/* 市辖区这类小面积县区：标注略小略淡，避免与相邻县区名挤在一起 */
:deep(.sd-county-label.tier2 .sd-county-name) {
  font-size: 10px;
  color: var(--text-muted);
}
/* 深色填充的县区改用浅色字：热力色带橙红端上灰色县区名看不清 */
:deep(.sd-county-label-inner.on-deep .sd-county-name) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
/* 全国视野下隐藏县区名；小城区标注等放大到更高层级再出现 */
:deep(.sd-far-view .sd-county-label) { display: none; }
:deep(.sd-county-zoom-low .sd-county-label.tier2) { display: none; }

/* ===== 悬停提示 / 弹窗（内容由 Leaflet 注入，需用 :deep 穿透作用域） ===== */
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

/* 图层控制面板的出入场：落位后淡入（稍等一拍，等地图稳住），缩回远景时先退再消失 */
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
