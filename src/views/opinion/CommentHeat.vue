<template>
  <div class="comment-heat">
    <div class="heat-layout">
      <div class="common-card heat-map">
        <div class="card-title">
          <span>{{ t('报道提及热度（按市）· {scope}', { scope: scopeLabel }) }}</span>
          <div class="legend-row">
            <span class="legend-label">{{ t('低') }}</span>
            <span class="legend-bar"></span>
            <span class="legend-label">{{ t('高') }}</span>
          </div>
        </div>
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

      <div class="heat-time">
        <ChartCard :title="t('各来源渠道发文量（按情感构成）· {scope}', { scope: scopeLabel })" :option="channelBarOption" height="480px" />
      </div>
    </div>

    <div class="data-note">
      {{ t('着色口径：标题中出现该市即计入一次（同一条报道提多个市则各计一次），当前范围「{scope}」共 {n} 条报道（属地报道 {direct} 条 + 省级综合稿 {provincial} 条），综合稿未点明城市、不参与着色；', { scope: scopeLabel, n: scopeNewsTotal, direct: scopeNewsDirectCount, provincial: scopeNewsNoCityCount }) }}
      {{ t('数据来源 {source}，抓取于 {time}。', { source: dataSources.news, time: shortTime(dataFetchedAt.news) }) }}
      {{ t('评论热度属平台互动量，公开页面无法获取，故此处改用可核对的公开报道提及量。') }}
    </div>
  </div>
</template>

﻿<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import ChartCard from '../../components/common/ChartCard.vue'
import MapContainer from '../../components/common/MapContainer.vue'
import {
  dataFetchedAt, dataSources, shortTime,
} from '../../api/crawled'
import { scopeNewsByChannel, scopeNewsByCity, scopeNewsDirectCount, scopeNewsNoCityCount, scopeNewsTotal } from '../../config/scopeNews'
import { inScope, jitter, scope, scopeCity, scopeLabel } from '../../config/scopeData'
import { scopeCities, switchScopeToCity } from '../../config/cityScope'
import {
  CHINA_CENTER, CHINA_ZOOM, bindCityLabelZoom, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane,
  playNationalIntro, setupNationalBase,
} from '../../config/chinaMap'
import { NO_DATA_COLOR } from '../../config/heatScale'
import { loadCounties, type CountyFeatureCollection } from '../../config/localGeo'
import { isDeepColor, mapHeatColors } from '../../config/mapPalette'
import { createPressPicker } from '../../config/cityPick'
import type { PressPicker } from '../../config/cityPick'
import { themeAccent, themeLegend } from '../../config/theme'
import { t, tv, locale } from '../../config/i18n'
import type { FilterState } from '../../types'
import shandongGeoJson from '../../mock/shandong_cities.json'

inject<FilterState>('filterState', {
  timeRange: '7d',
  region: 'all',
  platform: 'all',
  sentiment: 'all',
})

const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

const HEAT_COLORS_FALLBACK = ['#EDFBF2', '#CFF3DC', '#A8E7BE', '#74D79B', '#3EC57A']
const mentioned = computed(() => scopeNewsByCity.value.filter((c) => c.count > 0))
const maxValue = computed(() => Math.max(...mentioned.value.map((c) => c.count), 1))
const minValue = computed(() => Math.min(...mentioned.value.map((c) => c.count), maxValue.value))

function heatRatio(value: number): number {
  if (maxValue.value === minValue.value) return 1
  return (value - minValue.value) / (maxValue.value - minValue.value)
}

function heatColor(value: number): string {
  const HEAT_COLORS = mapHeatColors() ?? HEAT_COLORS_FALLBACK
  const idx = Math.min(HEAT_COLORS.length - 1, Math.floor(heatRatio(value) * HEAT_COLORS.length))
  return HEAT_COLORS[idx]
}

const cityValueMap = computed(() => {
  const m = new Map<string, number>()
  scopeNewsByCity.value.forEach((c) => { if (c.count > 0) m.set(c.city, c.count) })
  return m
})
const cityTitles = computed(() => {
  const m = new Map<string, string[]>()
  scopeNewsByCity.value.forEach((c) => { if (c.count > 0) m.set(c.city, c.titles) })
  return m
})

interface CityFeature {
  properties: { name?: string; centroid?: [number, number]; center?: [number, number] }
}

function buildCityLabels(): L.LayerGroup {
  const g = L.layerGroup()
  const features = (shandongGeoJson as unknown as { features: CityFeature[] }).features
  features.forEach((f) => {
    const name = String(f.properties.name ?? '').replace('市', '')
    const centroid = f.properties.centroid ?? f.properties.center
    if (!name || !centroid) return
    const [lng, lat] = centroid
    const v = cityValueMap.value.get(name)
    const onDeep = v !== undefined && isDeepColor(heatColor(v))
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sd-city-label',
        html: `<div class="sd-city-label-inner${onDeep ? ' on-deep' : ''}"><span class="sd-city-name">${tv(name)}</span></div>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 600,
    }).addTo(g)
  })
  return g
}

function cityPopup(name: string, v: number | undefined): string {
  if (!inScope(name)) {
    return `<div style="font-size:13px"><b style="color:var(--text-gold)">${tv(name)}</b><br/>
      ${t('不在当前分析范围内（{scope}）', { scope: scopeLabel.value })}</div>`
  }
  if (v === undefined) {
    return `<div style="font-size:13px"><b style="color:var(--text-gold)">${tv(name)}</b><br/>
      ${t('标题未提及该市')}<br/><span style="color:#8C8C8C;font-size:11px">${t('单击该市：切换分析范围')}</span></div>`
  }
  const list = (cityTitles.value.get(name) ?? []).slice(0, 3)
    .map((title) => `<div style="margin-top:3px;line-height:1.5;color:#5A5A5A">· ${tv(title)}</div>`)
    .join('')
  const more = v > 3 ? `<div style="margin-top:3px;color:#8C8C8C">${t('…共 {n} 条', { n: v })}</div>` : ''
  return `<div style="font-size:13px;max-width:240px">
    <b style="color:var(--text-gold)">${tv(name)}</b><br/>
    ${t('标题提及：')}<span style="font-weight:700">${v}</span> ${t('条')}
    ${list}${more}
    <div style="margin-top:3px;color:#8C8C8C;font-size:11px">${t('单击该市：切换分析范围')}</div>
  </div>`
}

function cityStyle(name: string) {
  const v = cityValueMap.value.get(name)
  return {
    color: '#FFFFFF',
    weight: 1.5,
    fillColor: v !== undefined ? heatColor(v) : NO_DATA_COLOR(),
    fillOpacity: 0.85,
  }
}

let heatMap: L.Map | null = null
let choroplethLayer: L.GeoJSON | null = null
let heatLabelLayer: L.LayerGroup | null = null
let riverLayer: L.LayerGroup | null = null
const cityPolygons = new Map<string, L.Polygon>()
let pickCity: PressPicker<string> | null = null

function onClickCity(name: string) {
  const city = switchScopeToCity(name)
  if (!city) return
  if (scope.value === city) flyToScope()
}

function scopeBounds(): L.LatLngBounds | null {
  const city = scopeCity.value
  if (city) return cityPolygons.get(city)?.getBounds() ?? null
  const polys = scopeCities(scope.value).map((c) => cityPolygons.get(c)).filter((p): p is L.Polygon => !!p)
  if (!polys.length) return null
  const bounds = L.latLngBounds([])
  polys.forEach((p) => bounds.extend(p.getBounds()))
  return bounds
}

function flyToScope() {
  if (!heatMap) return
  const target = scopeBounds() ?? choroplethLayer?.getBounds()
  if (target) heatMap.fitBounds(target, { padding: [24, 24], animate: true, duration: 0.7 })
}

let countyGroup: L.GeoJSON | null = null
let countyToken = 0
let countyTimer: ReturnType<typeof setTimeout> | null = null

function countyValueOf(city: string, county: string): number {
  const base = cityValueMap.value.get(city) ?? 0
  return Math.max(0, Math.round(base * jitter(`heat-${city}-${county}`, 0.3)))
}

function clearCountyLayer() {
  countyToken += 1
  if (countyGroup && heatMap) heatMap.removeLayer(countyGroup)
  countyGroup = null
}

async function syncCountyLayer() {
  if (!heatMap) return
  const city = scopeCity.value
  if (!city) { clearCountyLayer(); return }
  const token = ++countyToken
  let fc: CountyFeatureCollection
  try {
    fc = await loadCounties(city)
  } catch (err) {
    console.error(err)
    return
  }
  if (token !== countyToken || !heatMap || scopeCity.value !== city) return
  if (countyGroup) heatMap.removeLayer(countyGroup)

  const options = {
    pane: 'sd-county',
    className: 'sd-grow',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) => {
      const county = String(feature?.properties?.name ?? '')
      return {
        fillColor: heatColor(countyValueOf(city, county)),
        fillOpacity: 0.7,
        color: '#FFFFFF',
        weight: 1.3,
        opacity: 0.9,
        dashArray: '4 3',
      }
    },
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const county = String(feature?.properties?.name ?? '')
      featLayer.bindTooltip(t('{county}　提及约 {n} 条（按市级提及量分配，演示口径）', { county, n: countyValueOf(city, county) }), {
        className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
      })
    },
  } as unknown as L.GeoJSONOptions
  countyGroup = L.geoJSON(fc as unknown as GeoJsonObject, options).addTo(heatMap)
}

function scheduleCountyLayer() {
  if (countyTimer) clearTimeout(countyTimer)
  countyTimer = setTimeout(() => { countyTimer = null; void syncCountyLayer() }, 0)
}

function refreshHeatMap() {
  if (!heatMap || !choroplethLayer) return
  choroplethLayer.setStyle((feature) => cityStyle(String(feature?.properties?.name || '').replace('市', '')))
  choroplethLayer.eachLayer((layer) => {
    const name = String((layer as L.GeoJSON & { feature?: CityFeature }).feature?.properties?.name || '').replace('市', '')
    layer.bindTooltip(cityPopup(name, cityValueMap.value.get(name)), {
      className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
    })
  })
  if (heatLabelLayer) {
    heatMap.removeLayer(heatLabelLayer)
    heatLabelLayer = buildCityLabels().addTo(heatMap)
  }
}

async function onMapReady(map: L.Map) {
  const national = await setupNationalBase(map)
  heatMap = map
  pickCity = createPressPicker<string>(map, (name) => onClickCity(name))

  map.createPane('sd-county')
  ;(map.getPane('sd-county') as HTMLElement).style.zIndex = '410'
  ensureRiverPane(map, 405)
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, riverLayer)
  riverLayer.addTo(map)

  const options = {
    className: 'sd-grow-city',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) => cityStyle(String(feature?.properties?.name || '').replace('市', '')),
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = (feature?.properties?.name || '').replace('市', '')
      cityPolygons.set(name, featLayer as L.Polygon)
      featLayer.bindTooltip(cityPopup(name, cityValueMap.value.get(name)), {
        className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
      })
      pickCity?.(featLayer, name)
      featLayer.on({
        mouseover: (e) => {
          const l = e.target as L.Path
          l.setStyle({ fillOpacity: 1, weight: 2.5, color: themeAccent() })
          l.bringToFront()
        },
        mouseout: (e) => {
          const l = e.target as L.Path
          l.setStyle({ fillOpacity: 0.85, weight: 1.5, color: '#FFFFFF' })
        },
      })
    },
  } as unknown as L.GeoJSONOptions
  const choropleth = L.geoJSON(shandongGeoJson as unknown as GeoJsonObject, options).addTo(map)
  choroplethLayer = choropleth

  bindCityLabelZoom(map)
  heatLabelLayer = buildCityLabels().addTo(map)

  map.setMaxBounds(national.bounds.pad(0.2))
  playNationalIntro(map, {
    china: national.bounds,
    focus: choropleth.getBounds(),
    paddingTopLeft: [18, 18],
    paddingBottomRight: [18, 18],
    duration: 750,
  })

  scheduleCountyLayer()
}

watch(scope, () => {
  refreshHeatMap()
  scheduleCountyLayer()
  flyToScope()
})

watch(locale, () => {
  heatMap?.closePopup()
  refreshHeatMap()
  scheduleCountyLayer()
})


const channelBarOption = computed<Record<string, unknown>>(() => {
  const rows = [...scopeNewsByChannel.value].reverse()
  const seriesOf = (name: string, key: 'positive' | 'neutral' | 'negative', color: string) => ({
    name,
    type: 'bar',
    stack: 'total',
    barWidth: 22,
    itemStyle: { color },
    emphasis: { focus: 'series' },
    data: rows.map((r) => r[key]),
  })
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: themeLegend() } },
    grid: { left: 130, right: 30, top: 16, bottom: 54 },
    xAxis: { type: 'value', name: t('条'), minInterval: 1 },
    yAxis: {
      type: 'category',
      data: rows.map((r) => tv(r.channel)),
      axisLabel: { fontSize: 11 },
    },
    series: [
      seriesOf(t('正面'), 'positive', '#00A052'),
      seriesOf(t('中性'), 'neutral', '#3A7BD5'),
      seriesOf(t('负面'), 'negative', '#D94F4F'),
    ],
  }
})
</script>

<style scoped>
.comment-heat {
  display: flex;
  flex-direction: column;
}
.heat-layout {
  display: flex;
  gap: 14px;
  margin-bottom: 10px;
}
.heat-map {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
}
.heat-time {
  flex: 1;
  display: flex;
}
.heat-time > * {
  flex: 1;
}
.map-wrap {
  flex: 1;
  height: 480px;
  border-radius: 4px;
  overflow: hidden;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.legend-bar {
  width: 90px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--map-heat, #EDFBF2, #CFF3DC, #A8E7BE, #74D79B, #3EC57A));
}
.legend-label {
  font-size: 11px;
  color: var(--text-secondary);
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
:deep(.sd-city-label-inner.on-deep .sd-city-name) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
:deep(.sd-far-view .sd-city-label) { display: none; }

.data-note {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
