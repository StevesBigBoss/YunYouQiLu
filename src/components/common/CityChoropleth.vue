<template>
  <div class="city-choropleth">
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
    />

    <!-- 顶部标题：与灾难监控页同款（主标题 + 一行口径说明） -->
    <div v-if="headlineTitle" class="map-headline">
      <div class="headline-title">{{ t(headlineTitle) }}</div>
      <div v-if="headlineSub" class="headline-sub">{{ t(headlineSub) }}</div>
    </div>

    <!-- 图层开关：地市热力 / 地市名称 + 本页自己的点位分组，逐组显隐；
         全国远景先不出现（与首页「图层控制」同一套规则），放大落位后再淡入 -->
    <div class="layer-legend" :class="{ 'panel-idle': !layerPanelVisible }">
      <div class="legend-title">{{ t('图层') }}</div>
      <label v-for="row in layerRows" :key="row.key" class="legend-item">
        <input type="checkbox" :checked="row.on" @change="toggleLayer(row.key)" />
        <span
          class="legend-dot"
          :class="{ ring: row.ring }"
          :style="{ background: row.ring ? '#FFFFFF' : (row.dot || row.color), borderColor: row.color }"
        ></span>
        {{ row.label }}
      </label>
    </div>

    <!-- 图例：热力页是数量色阶条；分类配色页（饮食文化「五颜六色」）改成各市固定色块 -->
    <div class="choropleth-legend">
      <div class="legend-head">{{ t(legendTitle) }}</div>
      <template v-if="categorical">
        <div class="legend-chips">
          <span
            v-for="chip in cityChips"
            :key="chip.city"
            class="legend-chip"
            :class="{ dim: chip.value === undefined }"
          >
            <i class="legend-chip-dot" :style="{ background: chip.dot }"></i>{{ t(chip.name) }}<b>{{ chip.value === undefined ? '—' : chip.value }}</b>
          </span>
        </div>
        <div class="legend-axis">
          <span class="legend-hint">{{ t('十六市各有固定色，只作区分；范围外的市灰显，数量见图上数字与悬停提示') }}</span>
        </div>
      </template>
      <template v-else>
        <div class="legend-bar" :style="{ background: legendGradient }"></div>
        <div class="legend-axis">
          <span>{{ minValue }} {{ t(unit) }}</span>
          <span class="legend-hint">{{ t('少') }} <AppIcon name="arrow-right" :size="11" /> {{ t('多') }}</span>
          <span>{{ maxValue }} {{ t(unit) }}（{{ t(maxCity) }}）</span>
        </div>
      </template>
      <div class="legend-foot">
        <span class="legend-swatch heat"></span>
        <span v-if="selectedCity" class="legend-selected">
          {{ t('已选 {city} · {value} {unit}', { city: selectedCity, value: selectedValue, unit: t(unit) }) }}
        </span>
        <span v-else>{{ t('点击地市查看明细') }}</span>
      </div>
      <div class="legend-foot"><span class="legend-swatch no-data"></span>{{ noDataHint }}</div>
      <div class="legend-foot"><span class="legend-swatch china"></span>{{ t('其他省份 · 全国底图（非聚焦）') }}</div>
      <!-- 各页自己的点位图例（标记含义 / 分类色标），由页面注入 -->
      <slot name="legend-extra" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import AppIcon from './AppIcon.vue'
import MapContainer from './MapContainer.vue'
import { mapFocusColor, cityCategoryColor, isDeepColor, CITY_RAINBOW } from '../../config/mapPalette'
import {
  CHINA_CENTER, CHINA_ZOOM, bindCityLabelZoom, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane,
  flyScopeView, playNationalIntro, setupNationalBase,
} from '../../config/chinaMap'
import { createPressPicker } from '../../config/cityPick'
import type { PressPicker } from '../../config/cityPick'
import { themeAccent, themeAccentAlpha } from '../../config/theme'
import { t, tv, locale } from '../../config/i18n'
import {
  NO_DATA_BORDER, NO_DATA_COLOR, heatColor, heatGradient, heatLevel,
} from '../../config/heatScale'
import { countyWeight, splitIntByWeight } from '../../config/cityStats'
import { isCityScope, scopeCities, switchScopeToCity } from '../../config/cityScope'
import { scope } from '../../config/scopeData'
import { loadCounties } from '../../config/localGeo'
import type { CountyFeatureCollection } from '../../config/localGeo'
import { CITY_COUNTIES } from '../../config/cityCounties'
import { iconSvg } from '../../config/icons'
import type { ShandongCity } from '../../config/shandongRegions'
import { SHANDONG_CITIES } from '../../config/shandongRegions'
import type { AdminCityFeatureCollection, CityCountItem, MapPointGroup, MapSpotPoint } from '../../types'

const props = withDefaults(defineProps<{
  /** 各市统计数量，city 需与行政区数据名称一致（如「济南市」） */
  data: CityCountItem[]
  /** 数量单位，如「处」 */
  unit?: string
  /** 数量字段名，如「自然保护区数量」 */
  valueLabel?: string
  legendTitle?: string
  /** 顶部标题（与灾难监控页同款）：主标题 + 副标题口径说明，缺省不显示 */
  headlineTitle?: string
  headlineSub?: string
  /** 需要定位到的县区（列表点击「定位」时传入）：飞入县区中心并落一个标记点 */
  focus?: { city: string; county: string; label?: string } | null
  /**
   * 地图点位分组：每组对应右上角「图层」开关里的一行，可单独显隐；
   * 组内点位默认用分组给的图标与主色（点位自带时以点位为准）。
   */
  pointGroups?: MapPointGroup[]
  /**
   * 地市配色模式：
   * - heat：按数量热力着色（默认）
   * - categorical：各市固定彩色（饮食文化页「五颜六色」），色只作区分、不表示大小
   */
  colorMode?: 'heat' | 'categorical'
}>(), {
  unit: '处',
  valueLabel: '数量',
  legendTitle: '各市数量分布',
  headlineTitle: '',
  headlineSub: '',
  focus: null,
  pointGroups: () => [],
  colorMode: 'heat',
})

const emit = defineEmits<{
  (e: 'select', city: string): void
  /** 点击地图点位（回传点位 id，页面可据此联动右侧明细） */
  (e: 'point-select', id: string): void
}>()

/** 初始视野为全国（CHINA_CENTER/CHINA_ZOOM），打开时由远及近飞入山东；山东详情由本组件的专题图层绘制 */
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'
/** 视野占位：左下留给图例（含说明行）、右上留给图层开关 */
const VIEW_PADDING = {
  paddingTopLeft: [30, 24] as [number, number],
  paddingBottomRight: [30, 200] as [number, number],
}

/** 图层开关面板是否出现：全国远景先不显示（与首页「图层控制」同一套规则），放大落位后再淡入 */
const layerPanelVisible = ref(false)

const selectedCity = ref('')

const valueMap = computed(() => new Map(props.data.map((d) => [d.city, d])))
const minValue = computed(() => (props.data.length ? Math.min(...props.data.map((d) => d.value)) : 0))
const maxValue = computed(() => (props.data.length ? Math.max(...props.data.map((d) => d.value)) : 0))
const totalValue = computed(() => props.data.reduce((s, d) => s + d.value, 0))
const maxCity = computed(() => {
  const top = [...props.data].sort((a, b) => b.value - a.value)[0]
  return top ? shortCity(top.city) : '—'
})
const selectedValue = computed(() => valueMap.value.get(selectedCity.value)?.value ?? 0)
const rankMap = computed(() => {
  const order = [...props.data].sort((a, b) => b.value - a.value)
  return new Map(order.map((d, i) => [d.city, i + 1]))
})
const legendGradient = heatGradient()

// ===== 分类配色（饮食文化页）：每个市固定一个颜色，16 市各不相同 =====
const categorical = computed(() => props.colorMode === 'categorical')

/** 范围外地市的图例说明：两种配色模式现在都灰显，不再给分类配色页留淡色块 */
const noDataHint = computed(() =>
  categorical.value ? t('不在分析范围（灰显，不参与分类配色）') : t('不在分析范围（灰显）'),
)

/** 图例里的各市色块：十六市全部列出（色板固定），数量给当前范围内的；范围外给灰点、显示「—」并淡显 */
const cityChips = computed(() => {
  const values = new Map(props.data.map((d) => [shortCity(d.city), d.value]))
  return SHANDONG_CITIES.map((c) => {
    const value = values.get(c)
    return {
      city: c,
      name: c,
      color: cityCategoryColor(c),
      // 范围外的市图上已灰显，图例色点跟着换成中性灰，别让人以为它还留着本色
      dot: value === undefined ? NO_DATA_COLOR() : cityCategoryColor(c),
      value,
    }
  })
})

// ===== 图层开关（与灾难监控页同款）：地市热力 / 地市名称 + 各页点位分组，逐行显隐 =====
const HEAT_KEY = '__heat'
const LABEL_KEY = '__labels'
/** 黄河干流：图层面板开关（河道本身常驻流动，无入场画出动画） */
const RIVER_KEY = '__river'

const heatOn = ref(true)
const labelsOn = ref(true)
const riverOn = ref(true)
/** 点位分组显隐：没有记录（undefined）视为开 */
const groupOn = ref<Record<string, boolean>>({})

interface LayerRow {
  key: string
  label: string
  color: string
  /** 色点单独指定底色（分类配色时用「五颜六色」的彩虹点，而不是单一主色） */
  dot?: string
  /** 色点画成圆环：对应图上没有填充的圆环点位 */
  ring?: boolean
  on: boolean
}

const layerRows = computed<LayerRow[]>(() => {
  const rows: LayerRow[] = [
    categorical.value
      ? {
        key: HEAT_KEY,
        label: t('各市{label}（分类配色）', { label: t(props.valueLabel) }),
        color: mapFocusColor(),
        dot: CITY_RAINBOW,
        on: heatOn.value,
      }
      : { key: HEAT_KEY, label: t('各市{label}热力', { label: t(props.valueLabel) }), color: themeAccent(), on: heatOn.value },
    { key: LABEL_KEY, label: t('地市名称与数量'), color: mapFocusColor(), on: labelsOn.value },
    { key: RIVER_KEY, label: t('黄河干流'), color: '#7FA6C4', on: riverOn.value },
  ]
  props.pointGroups.forEach((g) => {
    rows.push({
      key: g.key,
      label: t(g.label),
      color: g.color || themeAccent(),
      ring: g.ring,
      on: groupOn.value[g.key] !== false,
    })
  })
  return rows
})

function toggleLayer(key: string) {
  if (key === HEAT_KEY) {
    heatOn.value = !heatOn.value
    if (map) {
      if (heatOn.value) choropleth?.addTo(map)
      else if (choropleth) map.removeLayer(choropleth)
    }
    return
  }
  if (key === LABEL_KEY) {
    labelsOn.value = !labelsOn.value
    if (map && labelLayer) {
      if (labelsOn.value && !map.hasLayer(labelLayer)) labelLayer.addTo(map)
      if (!labelsOn.value && map.hasLayer(labelLayer)) map.removeLayer(labelLayer)
    }
    return
  }
  if (key === RIVER_KEY) {
    riverOn.value = !riverOn.value
    if (map && riverLayer) {
      if (riverOn.value && !map.hasLayer(riverLayer)) riverLayer.addTo(map)
      if (!riverOn.value && map.hasLayer(riverLayer)) map.removeLayer(riverLayer)
    }
    return
  }
  // 点位分组：翻转后整层重建（点位数量在几十个量级，不值得做增量 diff）
  groupOn.value[key] = groupOn.value[key] === false
  rebuildPointLayer()
}

function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

function rowHtml(label: string, value: string, cls: 'sd-tip-row' | 'sd-popup-row', color?: string): string {
  return `<div class="${cls}"><span>${label}</span><b${color ? ` style="color:${color}"` : ''}>${value}</b></div>`
}

function tooltipHtml(name: string): string {
  const item = valueMap.value.get(name)
  if (!item) {
    return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div>
      <div class="sd-tip-none">${t('暂无该市统计数据')}</div></div>`
  }
  const color = categorical.value
    ? cityCategoryColor(name)
    : heatColor(item.value, minValue.value, maxValue.value)
  const rows = (item.rows ?? [])
    .map((r) => rowHtml(r.label, r.value, 'sd-tip-row'))
    .join('')
  const share = totalValue.value ? ((item.value / totalValue.value) * 100).toFixed(1) : '0.0'
  // 分类配色下色块不表大小，等级行换成色标说明
  const levelRow = categorical.value
    ? rowHtml(t('配色'), t('各市固定色'), 'sd-tip-row', color)
    : rowHtml(t('{label}等级', { label: t(props.valueLabel) }), t(heatLevel(item.value, minValue.value, maxValue.value)), 'sd-tip-row', color)
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(name)}<span class="sd-tip-tag">${item.value} ${t(props.unit)}</span></div>
    ${rows}
    ${levelRow}
    ${rowHtml(t('占全省比重'), `${share}%`, 'sd-tip-row')}
    ${rowHtml(t('全省排名'), t('第 {rank} / {total} 位', { rank: rankMap.value.get(name) ?? '', total: props.data.length }), 'sd-tip-row')}
    <div class="sd-tip-none">${t('单击该市：切换分析范围并细分县区')}</div>
  </div>`
}

let map: L.Map | null = null
let choropleth: L.GeoJSON | null = null
let geoFc: AdminCityFeatureCollection | null = null
let labelLayer: L.LayerGroup | null = null
/** 黄河干流：省外段 + 山东段，随全国底图常驻；常驻流动，图层面板可关 */
let riverLayer: L.LayerGroup | null = null
/** 按下/抬起成对识别的点击器（见 cityPick.ts）：地图动画中也能收到点击，onMapReady 时创建 */
let pickCity: PressPicker<string> | null = null
let pickPoint: PressPicker<string> | null = null
/** 取消入场运镜（页面上的主动定位先调用它，避免两段视野互相打断） */
let cancelIntro: (() => void) | null = null
/** 收掉上一段切范围运镜的状态（窗口放宽、悬停抑制）；见 flyScopeView */
let cancelScopeFlight: (() => void) | null = null

/** 市简称 / 全名 → 市级多边形图层（视野取景、县区细分都按它定位） */
const cityLayers = new Map<string, L.Polygon>()

/** 城市底色：在分析范围内的按数量着色（分类配色时用各市固定彩色）；范围外的一律灰显 */
function cityStyle(name: string): L.PathOptions {
  const item = valueMap.value.get(name)
  const active = name === selectedCity.value
  // 范围外地市两种配色模式都灰掉：跟旅游景点图、自然保护区图等热力页口径一致，
  // 一眼就能看出筛选掉了哪些市（分类配色页以前保留本色淡一档，跟没筛选一样花，已改掉）
  if (!item) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.9, color: NO_DATA_BORDER(), weight: 1, opacity: 1 }
  }
  return {
    fillColor: categorical.value
      ? cityCategoryColor(name)
      : heatColor(item.value, minValue.value, maxValue.value),
    fillOpacity: 0.95,
    color: active ? mapFocusColor() : themeAccentAlpha(0.45),
    weight: active ? 2.6 : 1.2,
    opacity: active ? 1 : 0.7,
  }
}

function selectCity(name: string) {
  selectedCity.value = name
  choropleth?.setStyle((f) => cityStyle(String(f?.properties?.name ?? '')))
  emit('select', name)
}

/** 点击某个市：本页明细 + 顶栏分析范围一起切过去（单次点击即切换，不再弹窗） */
function onClickCity(name: string) {
  const before = scope.value
  selectCity(name)
  switchScopeToCity(name)
  // 点的就是当前范围：范围没变就不会触发监听，这里直接把视野收回来
  if (scope.value === before) flyToScope()
}

// ===== 分析范围联动：范围落到单个市时，在地图上细分出该市的县区 =====

let countyGroup: L.LayerGroup | null = null
/** 建图层期间用户又切了范围：用 token 丢弃过期结果 */
let countyToken = 0
let countyTimer: number | null = null

/** 县区数值：该市总量按县区权重折成整数（最大余数法，合计与市级总量一致） */
function countyValuesOf(city: ShandongCity, fc: CountyFeatureCollection): Map<string, number> {
  const item = valueMap.value.get(`${city}市`) ?? valueMap.value.get(city)
  const names = fc.features.map((f) => f.properties.name)
  const values = splitIntByWeight(item?.value ?? 0, names.map((n) => countyWeight(n)))
  return new Map(names.map((n, i) => [n, values[i]]))
}

/** 县区底色：沿用同一套热力色带；县界用白色虚线，压在同色系市域填充上也能一眼看出细分 */
function countyStyle(value: number, max: number): L.PathOptions {
  return {
    fillColor: value > 0 ? heatColor(value, 0, max) : NO_DATA_COLOR(),
    fillOpacity: 0.78,
    color: '#FFFFFF',
    weight: 1.3,
    opacity: 0.9,
    dashArray: '4 3',
  }
}

function countyTooltip(name: string, value: number, total: number): string {
  const share = total ? ((value / total) * 100).toFixed(1) : '0.0'
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(name)}<span class="sd-tip-tag">${value} ${t(props.unit)}</span></div>
    <div class="sd-tip-row"><span>${t('占全市')}</span><b>${share}%</b></div>
    <div class="sd-tip-none">${t('按市级总量与县区权重折算（演示口径）')}</div>
  </div>`
}

/** 县区名与数量标注：跟县区图层一起进出；填充偏深时（色带橙红端）翻成浅色字保证可读 */
function buildCountyLabels(fc: CountyFeatureCollection, values: Map<string, number>, max: number): L.LayerGroup {
  const group = L.layerGroup()
  fc.features.forEach((f) => {
    const [lng, lat] = f.properties.center ?? []
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    const value = values.get(f.properties.name) ?? 0
    const deep = value > 0 && isDeepColor(heatColor(value, 0, max))
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sd-county-label',
        html: `<div class="sd-county-label-inner${deep ? ' on-deep' : ''}">
            <span class="sd-county-name">${tv(f.properties.name)}</span>
            <span class="sd-county-value">${value}</span>
          </div>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 650,
    }).addTo(group)
  })
  return group
}

function clearCountyLayer() {
  if (countyGroup && map) map.removeLayer(countyGroup)
  countyGroup = null
}

/** 当前范围是否需要县区细分：只有具体城市有；建好后不再随数据重建，只有范围/数据变化时重来 */
async function syncCountyLayer() {
  if (!map) return
  const city = scope.value
  const token = ++countyToken
  if (city === 'all' || city === 'river') {
    clearCountyLayer()
    return
  }
  let fc: CountyFeatureCollection
  try {
    fc = await loadCounties(city)
  } catch (err) {
    console.error(err)
    return
  }
  if (token !== countyToken || !map) return
  clearCountyLayer()
  const values = countyValuesOf(city, fc)
  const total = [...values.values()].reduce((s, v) => s + v, 0)
  const max = Math.max(1, ...values.values())
  const group = L.layerGroup()
  const options = {
    pane: 'sd-county',
    // className 只在图层创建时生效（Leaflet 的 _updateStyle 不管它），所以放在这里统一给
    className: 'sd-grow',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) =>
      countyStyle(values.get(String(feature?.properties?.name ?? '')) ?? 0, max),
    onEachFeature: (feature: { properties?: { name?: string } }, layer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const value = values.get(name) ?? 0
      const p = layer as L.Path
      layer.bindTooltip(countyTooltip(name, value, total), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      layer.on('mouseover', () => {
        p.setStyle({ weight: 2.4, color: mapFocusColor(), opacity: 1, fillOpacity: 1 })
        p.bringToFront()
      })
      layer.on('mouseout', () => p.setStyle(countyStyle(value, max)))
    },
  } as unknown as L.GeoJSONOptions
  L.geoJSON(fc as unknown as GeoJsonObject, options).addTo(group)
  buildCountyLabels(fc, values, max).addTo(group)
  countyGroup = group
  group.addTo(map)
}

/** 合并调度：范围与数据往往同一拍变化，压到一次重建 */
function scheduleCountyLayer() {
  if (countyTimer !== null) return
  countyTimer = window.setTimeout(() => {
    countyTimer = null
    void syncCountyLayer()
  }, 0)
}

/** 当前范围该落在哪个视野：单市 = 该市轮廓；沿黄 = 九市并集；全省 = 全部 */
function scopeBounds(): L.LatLngBounds | null {
  if (!choropleth) return null
  let union: L.LatLngBounds | null = null
  const add = (layer: L.Polygon | undefined) => {
    if (!layer) return
    // Leaflet 的 getBounds() 返回图层内部缓存对象本身，一律取副本再合并
    const b = layer.getBounds()
    const copy = L.latLngBounds(b.getSouthWest(), b.getNorthEast())
    union = union ? union.extend(copy) : copy
  }
  if (isCityScope(scope.value)) {
    add(cityLayers.get(scope.value))
  } else {
    ;(scopeCities(scope.value) as readonly string[]).forEach((name) => add(cityLayers.get(name)))
  }
  if (union) return union
  const all = choropleth.getBounds()
  return L.latLngBounds(all.getSouthWest(), all.getNorthEast())
}

function flyToScope() {
  if (!map) return
  const b = scopeBounds()
  if (!b) return
  // 主动定位先收掉入场运镜（已落位时是空操作）
  cancelIntro?.()
  // 顶栏筛选与地图点市都走这里：起飞前先把矢量渲染器的裁剪窗口放宽，飞行中途不会缺一块图；
  // duration 单位是秒而不是毫秒（见 flyScopeView）
  cancelScopeFlight?.()
  cancelScopeFlight = flyScopeView(map, b, {
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    duration: 0.7,
  })
}

// ===== 列表「定位到县区」：飞入县区中心并落一个带名称的标记点 =====
let focusMarker: L.Marker | null = null

function clearFocusMarker() {
  if (focusMarker && map) map.removeLayer(focusMarker)
  focusMarker = null
}

/** 落定位标记（名称与提示框按当前语言现拼）：视野不动，换语言时只换这一枚标注 */
function placeFocusMarker(f: { city: string; county: string; label?: string }) {
  if (!map) return
  const center = (CITY_COUNTIES[f.city as ShandongCity] ?? []).find((c) => c.name === f.county)
  if (!center) return
  focusMarker = L.marker([center.lat, center.lng], {
    icon: L.divIcon({
      className: 'sd-poi-pin',
      html: `<div class="sd-poi-pin-inner">${iconSvg('food', 14, 'sd-poi-icon')}<span>${tv(f.label ?? f.county)}</span></div>`,
      iconSize: [0, 0],
    }),
    keyboard: false,
    zIndexOffset: 800,
  })
  focusMarker.bindTooltip(() => `${tv(f.county)} · ${tv(f.label ?? '')}`, {
    className: 'sd-tooltip', direction: 'top', offset: [0, -12],
  })
  focusMarker.addTo(map)
}

function focusCounty(f: { city: string; county: string; label?: string }) {
  if (!map) return
  const center = (CITY_COUNTIES[f.city as ShandongCity] ?? []).find((c) => c.name === f.county)
  if (!center) return
  clearFocusMarker()
  placeFocusMarker(f)
  // 缩放 10：看得清县界与相邻县区，又不至于只见街道；主动定位同样先收掉入场运镜
  cancelIntro?.()
  map.flyTo([center.lat, center.lng], 10, { duration: 0.7 })
}

/** 列表点击定位：每次传入新的对象引用，即使还是同一个县区也会重新飞一次 */
watch(() => props.focus, (f) => {
  if (!f) clearFocusMarker()
  else focusCounty(f)
})

// ===== 地图点位（旅游景点图）：圆形点位 + 点击弹窗看名称与简介 =====
let pointLayer: L.LayerGroup | null = null

/** 点位弹窗：名称（带标签）+ 简介 + 明细行 */
function pointPopupHtml(p: MapSpotPoint): string {
  const rows = (p.rows ?? []).map((r) => rowHtml(tv(r.label), tv(String(r.value)), 'sd-popup-row')).join('')
  const tag = p.tag ? `<span class="sd-tip-tag">${tv(p.tag)}</span>` : ''
  const intro = p.intro ? `<p class="sd-popup-desc">${tv(p.intro)}</p>` : ''
  return `<div class="sd-popup">
    <div class="sd-popup-title">${tv(p.name)}${tag}</div>
    ${intro}
    ${rows}
  </div>`
}

/**
 * 重建点位层：默认是白芯蓝圈的小圆点；点位带主题（icon/color）时画成圆形徽标——
 * 各功能页因此各有各的点位语言（饮食文化的类别色美食标、自然保护的等级色叶形标）。
 * 关掉的分组不画。「图层」开关切换时也走这里，全量重建。
 */
function rebuildPointLayer() {
  if (!map) return
  if (pointLayer) map.removeLayer(pointLayer)
  const group = L.layerGroup()
  props.pointGroups.forEach((g) => {
    if (groupOn.value[g.key] === false) return
    g.points.forEach((p) => {
      const color = p.color || g.color
      const icon = p.icon || g.icon
      const layer: L.Layer = icon
        ? L.marker([p.lat, p.lng], {
          pane: 'sd-poi',
          icon: L.divIcon({
            className: 'sd-poi-mark-wrap',
            html: `<span class="sd-poi-mark" style="--mark-color:${color}">
              ${iconSvg(icon, 13)}
              ${p.count && p.count > 1 ? `<em class="sd-poi-count">${p.count}</em>` : ''}
            </span>`,
            iconSize: [0, 0],
          }),
          keyboard: false,
          zIndexOffset: 500,
        })
        : L.circleMarker([p.lat, p.lng], {
          pane: 'sd-poi',
          // 像素半径圆点：缩放动画期间整块 SVG 会被按比例放大，圆点会瞬间胀大，
          // 这里挂上 sd-px-dot，动画期间隐去、落位后渐显（见 MapContainer 的 bindPixelDotFade）
          className: 'sd-px-dot',
          radius: 5.5,
          fillColor: '#FFFFFF',
          color: color || '#2E6FA8',
          weight: 2,
          fillOpacity: 1,
        })
      layer.bindTooltip(tv(p.name), { className: 'sd-tooltip', direction: 'top', offset: [0, -8] })
      // 悬停置顶：与其它点位重叠时也能明确点到自己（徽标是 Marker、圆点是 Path，置顶手段不同）
      layer.on('mouseover', () => {
        if (layer instanceof L.Marker) layer.setZIndexOffset(1000)
        else (layer as L.Path).bringToFront()
      })
      // 飞行未结束时按下/抬起落在不同元素上，浏览器会把 click 判给公共祖先（图层收不到）；
      // 按下/抬起配对识别兜住这类点击（内部对紧随其后的真 click 去重，不会重复触发）
      pickPoint?.(layer, p.id)
      layer.bindPopup(pointPopupHtml(p), { offset: [0, -4] })
      layer.addTo(group)
    })
  })
  pointLayer = group
  group.addTo(map)
}

/** 点位随范围/数据变化重画（分组数组每次都是新引用，直接全量重建） */
watch(() => props.pointGroups, () => rebuildPointLayer())

/** 城市名与数量标注常驻；数量随数据变，抽成函数以便数据更新时重建 */
function buildLabelLayer(fc: AdminCityFeatureCollection): L.LayerGroup {
  const group = L.layerGroup()
  fc.features.forEach((f) => {
    const name = f.properties.name
    const item = valueMap.value.get(name)
    const [lng, lat] = f.properties.centroid
    // 处于深色底的城市改用浅色标注：热力模式看实际填充色的明暗，分类配色看该市固定色
    const onDeep = categorical.value
      ? isDeepColor(cityCategoryColor(name))
      : item ? isDeepColor(heatColor(item.value, minValue.value, maxValue.value)) : false
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sd-city-label',
        html: item
          ? `<div class="sd-city-label-inner hot${onDeep ? ' on-deep' : ''}">
               <span class="sd-city-name">${t(shortCity(name))}</span>
               <span class="sd-city-num">${item.value}</span>
             </div>`
          : `<div class="sd-city-label-inner"><span class="sd-city-name">${t(shortCity(name))}</span></div>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 600,
    }).addTo(group)
  })
  return group
}

function buildChoropleth(fc: AdminCityFeatureCollection): L.GeoJSON {
  // className / keyboard 是 Path 选项而非 GeoJSONOptions 的声明字段，但 Leaflet 会把
  // 整份选项透传给每个多边形（见 geometryToLayer → new Polygon(latlngs, options)），
  // 这里断言一次，让类型放行
  const options = {
    // 市级热力压在最底层，县区细分（390）与标注压在它上面
    pane: 'sd-heat',
    className: 'sd-grow-city',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) =>
      cityStyle(String(feature?.properties?.name ?? '')),
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const path = featLayer as L.Polygon
      cityLayers.set(name, path)
      cityLayers.set(shortCity(name), path)
      // 内容用函数：分析范围切换后重新悬停时直接读到最新数据，无需重绑
      featLayer.bindTooltip(() => tooltipHtml(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      pickCity?.(featLayer, name)
    },
  } as unknown as L.GeoJSONOptions

  return L.geoJSON(fc as unknown as GeoJsonObject, options)
}

/** 数据（分析范围）变化：重新着色 + 重标注数量 + 重建县区细分（标注被图层开关关掉时保持关闭） */
function refresh() {
  if (!map) return
  choropleth?.setStyle((f) => cityStyle(String(f?.properties?.name ?? '')))
  if (labelLayer && map.hasLayer(labelLayer)) map.removeLayer(labelLayer)
  labelLayer = geoFc ? buildLabelLayer(geoFc) : null
  if (labelLayer && labelsOn.value) labelLayer.addTo(map)
}

/** 数据变化（分类/筛选切换）：只刷新图面，不移动视野 */
watch(() => props.data, () => {
  refresh()
  scheduleCountyLayer()
})

/** 范围变化：刷新图面与县区细分，并把视野收到新范围（列表定位的标记点随范围作废） */
watch(scope, () => {
  clearFocusMarker()
  refresh()
  scheduleCountyLayer()
  flyToScope()
})

/** 换语言：地市/县区标注、点位弹窗与提示框都是现拼的 HTML，重建一遍换字（列表定位标记只换字、不重飞） */
watch(locale, () => {
  map?.closePopup()
  refresh()
  rebuildPointLayer()
  scheduleCountyLayer()
  if (props.focus) {
    clearFocusMarker()
    placeFocusMarker(props.focus)
  }
})

async function setup(m: L.Map) {
  // 全国底图（其他省份中性米白、不聚焦）与山东行政区数据并行取
  const [national, res] = await Promise.all([
    setupNationalBase(m),
    fetch(`${import.meta.env.BASE_URL}shandong.json`),
  ])
  // 取数期间用户可能已经切走页面：地图连同各 pane 都已销毁，再往上叠图层会报错
  if (map !== m) return
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  // 解析响应体同样是个 await：这期间也可能已经切走地图，叠层前再确认一次
  if (map !== m) return
  geoFc = fc

  choropleth = buildChoropleth(fc).addTo(m)
  labelLayer = buildLabelLayer(fc).addTo(m)
  // 黄河流向图：与首页同一条河道（省外段 + 山东段），常驻虚线流动；不做入场画出动画，落屏即流
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(m, riverLayer)
  if (riverOn.value) riverLayer.addTo(m)

  // 全国底图可拖拽的范围：东三省到南海诸岛，避免拖到空白海域
  m.setMaxBounds(national.bounds.pad(0.2))
  // 打开时先在全国视野停留，再由远及近推近当前范围（默认全省），落位视野与原先的全省取景一致
  cancelIntro = playNationalIntro(m, {
    china: national.bounds,
    focus: scopeBounds() ?? choropleth.getBounds(),
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    // 推近时长与首页取齐（0.75s）：几个功能块的地图开场节奏一致
    duration: 750,
  })
  // 首屏就把点位标出来（范围为具体城市时点位只有该市的）
  rebuildPointLayer()
  // 当前范围是具体城市时，开场就把该市的县区细分铺好
  void syncCountyLayer()
}

function onMapReady(m: L.Map) {
  map = m
  // 市级热力（380）→ 县区细分（390）→ 黄河干流（420）→ 点位（430）→ 标注（600）→ 提示框（650）
  m.createPane('sd-heat')
  m.createPane('sd-county')
  m.createPane('sd-poi')
  ;(m.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(m.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ;(m.getPane('sd-poi') as HTMLElement).style.zIndex = '430'
  // 黄河干流压在填色与县界之上、点位之下（画法与灾难监控页共用）
  ensureRiverPane(m, 420)
  // 全国视野下隐藏地市/县区标注与点位（全国底图看得清山东轮廓就够），飞入山东后再亮出来
  bindCityLabelZoom(m)
  bindLayerPanelTier(m)
  // 飞行动画途中按下/抬起若落在不同元素上，浏览器把 click 判给公共祖先，图层收不到点击，
  // 表现就是「上一个市还在放大时点别的市没反应、卡在放大状态」。换成按下/抬起配对识别
  // （见 config/cityPick.ts）：抬起即选中，动画期间点击照常生效。
  pickCity = createPressPicker<string>(m, (name) => onClickCity(name))
  pickPoint = createPressPicker<string>(m, (id, layer) => {
    emit('point-select', id)
    layer.openPopup()
  })
  setup(m).catch((err) => console.error(err))
}

/** 图层开关面板跟随远景/省内视野：bindCityLabelZoom 先跑（注册更早），这里读它刚写好的类 */
function bindLayerPanelTier(m: L.Map) {
  const sync = () => {
    layerPanelVisible.value = !m.getContainer().classList.contains('sd-far-view')
  }
  sync()
  m.on('zoom zoomend', sync)
}
</script>

<style scoped>
.city-choropleth {
  position: relative;
  width: 100%;
  height: 100%;
}

/* ===== 顶部标题（与灾难监控页同款） ===== */
.map-headline {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  max-width: 58%;
  text-align: center;
  pointer-events: none;
}
.headline-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 2px;
  /* 直接压在米白底图上，取比 --text-gold 更深的金棕以保证可读性 */
  color: var(--map-title);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
.headline-sub {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* ===== 图层开关（与灾难监控页同款） ===== */
.layer-legend {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1100;
  min-width: 148px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(94, 76, 48, 0.12);
}
.layer-legend .legend-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-gold);
  margin-bottom: 6px;
}
.layer-legend .legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}
.layer-legend .legend-item input { accent-color: var(--color-gold); }
.layer-legend .legend-dot {
  display: inline-block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
/* 圆环色点：对应图上没有填充的圆环点位（物种监测点） */
.layer-legend .legend-dot.ring {
  width: 10px;
  height: 10px;
  border: 2px solid var(--text-muted);
}
/* 图层开关面板的出入场：放大落位后淡入（稍等一拍，等地图稳住），缩回全国远景时先退再消失 */
.layer-legend {
  transition: opacity 0.45s ease-out 0.18s;
}
.layer-legend.panel-idle {
  opacity: 0;
  pointer-events: none;
}

/* ===== 图例（与灾难监控页同款：渐变条 + 带色块的说明行） ===== */
.choropleth-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 1100;
  width: 236px;
  padding: 8px 10px 9px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(94, 76, 48, 0.12);
  font-size: 12px;
  color: var(--text-secondary);
}
.legend-head {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 6px;
}
.legend-bar {
  height: 9px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
}
.legend-axis {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
}
.legend-hint {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
}
/* 分类配色（饮食文化）：各市固定色块的图例网格式排布，两列 */
.legend-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px 10px;
}
.legend-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.legend-chip-dot {
  display: inline-block;
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}
.legend-chip b {
  margin-left: auto;
  font-weight: 700;
  color: var(--text-primary);
}
/* 范围外地市：色点已换成灰点，整条再淡一档，与地图上的灰块对应 */
.legend-chip.dim {
  opacity: 0.55;
}
.legend-chip.dim b {
  font-weight: 400;
  color: var(--text-muted);
}
.legend-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-muted);
}
.legend-swatch {
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 8px;
  border-radius: 2px;
}
.legend-swatch.heat { background: linear-gradient(135deg, var(--map-heat, #EDFBF2, #00AF5C)); }
.legend-swatch.no-data {
  background: var(--map-nodata);
  border: 1px solid var(--map-nodata-border);
}
.legend-swatch.china {
  background: var(--map-nodata);
  border: 1px dashed var(--map-nodata-border);
}
.legend-selected { color: var(--text-gold); }

/* ===== 各页注入的点位说明行（legend-extra 插槽内容，需 :slotted 穿透） ===== */
:slotted(.map-mark-legend) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 9px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-muted);
}
:slotted(.map-mark-title) { flex: 0 0 100%; }
:slotted(.map-mark-item) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
:slotted(.map-mark-dot) {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
}
/* 物种监测点：白芯 + 深色圈，与保护区徽标区分层级（实际点位按保护等级上色） */
:slotted(.map-mark-ring) {
  display: inline-block;
  box-sizing: border-box;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 2px solid var(--text-muted);
}

/* ===== 城市标注 ===== */
/* 全国视野下地市名会挤成一团：先不出现，飞入山东后再亮出来（与首页同一套远端阈值开关） */
:deep(.sd-far-view .sd-city-label) { display: none; }
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
:deep(.sd-city-label-inner .sd-city-num) {
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
:deep(.sd-city-label-inner.on-deep .sd-city-num) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}

/* ===== 县区标注（分析范围为具体城市时） ===== */
/* 全国视野下县区名同样收起（点位与标注都按屏幕像素渲染，远景只会叠在一起） */
:deep(.sd-far-view .sd-county-label) { display: none; }
:deep(.sd-county-label) {
  background: transparent;
  border: none;
}
:deep(.sd-county-label-inner) {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  line-height: 1.25;
  pointer-events: none;
}
:deep(.sd-county-label-inner .sd-county-name) {
  font-size: 11px;
  color: var(--map-label-name);
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-county-label-inner .sd-county-value) {
  font-size: 11px;
  font-weight: 700;
  color: var(--map-label-value);
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
/* 深色填充的县区改用浅色字：色带橙红端上深绿/灰字看不清 */
:deep(.sd-county-label-inner.on-deep .sd-county-name),
:deep(.sd-county-label-inner.on-deep .sd-county-value) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}

/* ===== 主题点位徽标（带 icon 的点位：美食标、保护区标等） ===== */
/* 全国视野下点位徽标收起：远景看只剩一圈图标叠在一起，落位到山东后再亮出来 */
:deep(.sd-far-view .sd-poi-mark-wrap) { display: none; }
:deep(.sd-far-view svg path.sd-px-dot) { display: none; }
:deep(.sd-poi-mark-wrap) {
  background: transparent;
  border: none;
}
:deep(.sd-poi-mark) {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  color: #FFFFFF;
  background: var(--mark-color, var(--color-gold));
  border: 2px solid #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
/* 徽标角标：聚合数量（如县区项目数） */
:deep(.sd-poi-count) {
  position: absolute;
  right: -7px;
  top: -7px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  box-sizing: border-box;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
  color: var(--text-primary);
  background: #FFFFFF;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
}

/* ===== 列表定位标记（县区中心落点） ===== */
:deep(.sd-poi-pin) {
  background: transparent;
  border: none;
}
:deep(.sd-poi-pin-inner) {
  position: absolute;
  transform: translate(-50%, -100%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 6px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-gold);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  box-shadow: var(--shadow-card);
}
:deep(.sd-poi-pin-inner::after) {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  background: rgba(255, 255, 255, 0.96);
  border-right: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  transform: rotate(45deg);
}

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
/* 点位弹窗里的简介：换行排版，与明细行之间留出间距 */
:deep(.sd-popup-desc) {
  max-width: 260px;
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: normal;
}
:deep(.sd-popup) {
  max-width: 280px;
}
</style>
