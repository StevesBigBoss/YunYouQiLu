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

    <div v-if="headlineTitle" class="map-headline">
      <div class="headline-title">{{ t(headlineTitle) }}</div>
      <div v-if="headlineSub" class="headline-sub">{{ t(headlineSub) }}</div>
    </div>

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
  data: CityCountItem[]
  unit?: string
  valueLabel?: string
  legendTitle?: string
  headlineTitle?: string
  headlineSub?: string
  focus?: { city: string; county: string; label?: string } | null
  pointGroups?: MapPointGroup[]
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
  (e: 'point-select', id: string): void
}>()

const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'
const VIEW_PADDING = {
  paddingTopLeft: [30, 24] as [number, number],
  paddingBottomRight: [30, 200] as [number, number],
}

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

const categorical = computed(() => props.colorMode === 'categorical')

const noDataHint = computed(() =>
  categorical.value ? t('不在分析范围（灰显，不参与分类配色）') : t('不在分析范围（灰显）'),
)

const cityChips = computed(() => {
  const values = new Map(props.data.map((d) => [shortCity(d.city), d.value]))
  return SHANDONG_CITIES.map((c) => {
    const value = values.get(c)
    return {
      city: c,
      name: c,
      color: cityCategoryColor(c),
      dot: value === undefined ? NO_DATA_COLOR() : cityCategoryColor(c),
      value,
    }
  })
})

const HEAT_KEY = '__heat'
const LABEL_KEY = '__labels'
const RIVER_KEY = '__river'

const heatOn = ref(true)
const labelsOn = ref(true)
const riverOn = ref(true)
const groupOn = ref<Record<string, boolean>>({})

interface LayerRow {
  key: string
  label: string
  color: string
  dot?: string
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
let riverLayer: L.LayerGroup | null = null
let pickCity: PressPicker<string> | null = null
let pickPoint: PressPicker<string> | null = null
let cancelIntro: (() => void) | null = null
let cancelScopeFlight: (() => void) | null = null

const cityLayers = new Map<string, L.Polygon>()

function cityStyle(name: string): L.PathOptions {
  const item = valueMap.value.get(name)
  const active = name === selectedCity.value
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

function onClickCity(name: string) {
  const before = scope.value
  selectCity(name)
  switchScopeToCity(name)
  if (scope.value === before) flyToScope()
}


let countyGroup: L.LayerGroup | null = null
let countyToken = 0
let countyTimer: number | null = null

function countyValuesOf(city: ShandongCity, fc: CountyFeatureCollection): Map<string, number> {
  const item = valueMap.value.get(`${city}市`) ?? valueMap.value.get(city)
  const names = fc.features.map((f) => f.properties.name)
  const values = splitIntByWeight(item?.value ?? 0, names.map((n) => countyWeight(n)))
  return new Map(names.map((n, i) => [n, values[i]]))
}

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

function scheduleCountyLayer() {
  if (countyTimer !== null) return
  countyTimer = window.setTimeout(() => {
    countyTimer = null
    void syncCountyLayer()
  }, 0)
}

function scopeBounds(): L.LatLngBounds | null {
  if (!choropleth) return null
  let union: L.LatLngBounds | null = null
  const add = (layer: L.Polygon | undefined) => {
    if (!layer) return
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
  cancelIntro?.()
  cancelScopeFlight?.()
  cancelScopeFlight = flyScopeView(map, b, {
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    duration: 0.7,
  })
}

let focusMarker: L.Marker | null = null

function clearFocusMarker() {
  if (focusMarker && map) map.removeLayer(focusMarker)
  focusMarker = null
}

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
  cancelIntro?.()
  map.flyTo([center.lat, center.lng], 10, { duration: 0.7 })
}

watch(() => props.focus, (f) => {
  if (!f) clearFocusMarker()
  else focusCounty(f)
})

let pointLayer: L.LayerGroup | null = null

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
          className: 'sd-px-dot',
          radius: 5.5,
          fillColor: '#FFFFFF',
          color: color || '#2E6FA8',
          weight: 2,
          fillOpacity: 1,
        })
      layer.bindTooltip(tv(p.name), { className: 'sd-tooltip', direction: 'top', offset: [0, -8] })
      layer.on('mouseover', () => {
        if (layer instanceof L.Marker) layer.setZIndexOffset(1000)
        else (layer as L.Path).bringToFront()
      })
      pickPoint?.(layer, p.id)
      layer.bindPopup(pointPopupHtml(p), { offset: [0, -4] })
      layer.addTo(group)
    })
  })
  pointLayer = group
  group.addTo(map)
}

watch(() => props.pointGroups, () => rebuildPointLayer())

function buildLabelLayer(fc: AdminCityFeatureCollection): L.LayerGroup {
  const group = L.layerGroup()
  fc.features.forEach((f) => {
    const name = f.properties.name
    const item = valueMap.value.get(name)
    const [lng, lat] = f.properties.centroid
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
  const options = {
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

function refresh() {
  if (!map) return
  choropleth?.setStyle((f) => cityStyle(String(f?.properties?.name ?? '')))
  if (labelLayer && map.hasLayer(labelLayer)) map.removeLayer(labelLayer)
  labelLayer = geoFc ? buildLabelLayer(geoFc) : null
  if (labelLayer && labelsOn.value) labelLayer.addTo(map)
}

watch(() => props.data, () => {
  refresh()
  scheduleCountyLayer()
})

watch(scope, () => {
  clearFocusMarker()
  refresh()
  scheduleCountyLayer()
  flyToScope()
})

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
  const [national, res] = await Promise.all([
    setupNationalBase(m),
    fetch(`${import.meta.env.BASE_URL}shandong.json`),
  ])
  if (map !== m) return
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  if (map !== m) return
  geoFc = fc

  choropleth = buildChoropleth(fc).addTo(m)
  labelLayer = buildLabelLayer(fc).addTo(m)
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(m, riverLayer)
  if (riverOn.value) riverLayer.addTo(m)

  m.setMaxBounds(national.bounds.pad(0.2))
  cancelIntro = playNationalIntro(m, {
    china: national.bounds,
    focus: scopeBounds() ?? choropleth.getBounds(),
    paddingTopLeft: VIEW_PADDING.paddingTopLeft,
    paddingBottomRight: VIEW_PADDING.paddingBottomRight,
    duration: 750,
  })
  rebuildPointLayer()
  void syncCountyLayer()
}

function onMapReady(m: L.Map) {
  map = m
  m.createPane('sd-heat')
  m.createPane('sd-county')
  m.createPane('sd-poi')
  ;(m.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(m.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ;(m.getPane('sd-poi') as HTMLElement).style.zIndex = '430'
  ensureRiverPane(m, 420)
  bindCityLabelZoom(m)
  bindLayerPanelTier(m)
  pickCity = createPressPicker<string>(m, (name) => onClickCity(name))
  pickPoint = createPressPicker<string>(m, (id, layer) => {
    emit('point-select', id)
    layer.openPopup()
  })
  setup(m).catch((err) => console.error(err))
}

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
.layer-legend .legend-dot.ring {
  width: 10px;
  height: 10px;
  border: 2px solid var(--text-muted);
}
.layer-legend {
  transition: opacity 0.45s ease-out 0.18s;
}
.layer-legend.panel-idle {
  opacity: 0;
  pointer-events: none;
}

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
:slotted(.map-mark-ring) {
  display: inline-block;
  box-sizing: border-box;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 2px solid var(--text-muted);
}

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
:deep(.sd-city-label-inner.on-deep .sd-city-name),
:deep(.sd-city-label-inner.on-deep .sd-city-num) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}

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
:deep(.sd-county-label-inner.on-deep .sd-county-name),
:deep(.sd-county-label-inner.on-deep .sd-county-value) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}

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
