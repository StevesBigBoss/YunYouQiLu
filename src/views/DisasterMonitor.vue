<template>
  <div class="disaster-page">
    <div class="map-side">
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
          <div class="headline-title">{{ t('灾难监控与预测 · {scope}', { scope: scopeLabel }) }}</div>
          <div class="headline-sub">
            {{ t('范围内灾害风险指数 = 气象实况 + 近十年地震活动（两项为真实抓取数据）+ 地灾隐患 / 人流预警 / 水情监测（演示）') }}
          </div>
        </div>

        <div class="layer-legend">
          <div class="legend-title">{{ t('图层') }}</div>
          <label v-for="(label, key) in layerLabels" :key="key" class="legend-item">
            <input type="checkbox" v-model="layers[key as LayerKey]" />
            <span class="legend-dot" :style="{ background: layerColors[key as LayerKey] }"></span>
            {{ label }}
          </label>
        </div>

        <div class="basin-legend">
          <div class="legend-head">{{ t('灾害风险指数 · {scope}', { scope: scopeLabel }) }}</div>
          <div class="legend-bar" :style="{ background: riskGradient }"></div>
          <div class="legend-axis">
            <span>{{ minRisk }}</span>
            <span class="legend-hint">{{ t('低') }} <AppIcon name="arrow-right" :size="11" /> {{ t('高') }}</span>
            <span>{{ maxRisk }}</span>
          </div>
          <div class="legend-foot"><span class="legend-swatch no-data"></span>{{ t('不在分析范围 · 不参与着色') }}</div>
          <div class="legend-foot"><span class="legend-swatch china"></span>{{ t('其他省份 · 全国底图（非聚焦）') }}</div>
          <div class="legend-foot"><span class="legend-swatch quake"></span>{{ t('地震：实心在山东境内，虚线在邻省') }}</div>
        </div>
      </MapContainer>
    </div>

    <div class="panel-side">
      <div class="common-card">
        <div class="card-title"><span>{{ t('水情概览 · {scope}', { scope: scopeLabel }) }}</span><span class="card-title-note">{{ t('演示数据') }}</span></div>
        <template v-if="scopeHasWater">
          <div class="water-row">
            <div class="water-item">
              <div class="water-value">{{ waterLevel }}<em> {{ t('米') }}</em></div>
              <div class="water-label">{{ t('当前水位') }}</div>
            </div>
            <div class="water-item">
              <div class="water-value">{{ waterFlow.toLocaleString('zh-CN') }}<em> m³/s</em></div>
              <div class="water-label">{{ t('流量') }}</div>
            </div>
            <div class="water-item">
              <span class="tag tag-green">{{ t(mockWaterInfo.flood) }}</span>
              <div class="water-label">{{ t('汛情状态') }}</div>
            </div>
          </div>
        </template>
        <div v-else class="warn-empty">
          <div class="warn-empty-head">{{ t('当前范围（{scope}）未接入黄河干流水情监测', { scope: scopeLabel }) }}</div>
          <div class="warn-empty-sub">{{ t('干流水位 / 流量是河道断面读数，只对沿黄城市有意义。') }}</div>
        </div>
        <div class="card-note">
          {{ t('黄河水位与流量属水文监测数据，山东水文网未提供公开接口，此处沿用演示值。') }}
        </div>
      </div>

      <div class="common-card">
        <div class="card-title">
          <span>{{ t('实时预警 · {scope}', { scope: scopeLabel }) }}</span>
          <span class="card-title-note">{{ t('{time} 实况 · 阈值推导', { time: shortTime(weatherObservedAt) }) }}</span>
        </div>
        <div class="warn-list">
          <div v-if="!scopeAlerts.length" class="warn-empty">
            <div class="warn-empty-head">{{ t('当前范围内（{scope}）无城市达到预警阈值', { scope: scopeLabel }) }}</div>
            <div class="warn-empty-sub">{{ t('判定口径（对实况与今日预报逐项比对）：') }}</div>
            <div v-for="rule in WEATHER_ALERT_RULES" :key="rule" class="warn-rule">· {{ t(rule) }}</div>
          </div>
          <div
            v-for="w in scopeAlerts"
            :key="w.id"
            class="warn-item"
            @click="locateWarning(w)"
          >
            <div class="warn-head">
              <span class="tag" :class="levelTag(w.level)">{{ t(w.level) }}</span>
              <span class="warn-type">{{ t('{type}预警', { type: w.type }) }}</span>
            </div>
            <div class="warn-loc"><AppIcon name="pin" :size="12" /> {{ t('{city}市 · {detail}', { city: w.city, detail: t(w.detailKey, w.detailVars) }) }}</div>
            <div class="warn-measure" v-if="expandedWarn === w.id">
              {{ t('处置建议：{detail}', { detail: adviceFor(w) }) }}
            </div>
            <div class="warn-expand" @click.stop="expandedWarn = expandedWarn === w.id ? '' : w.id">
              <template v-if="expandedWarn === w.id">{{ t('收起') }} <AppIcon name="caret-up" :size="11" /></template>
              <template v-else>{{ t('查看处置建议') }} <AppIcon name="caret-down" :size="11" /></template>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-note">
        {{ t('以下三项预测暂无公开数据接口，为演示口径（随分析范围「{scope}」缩放）；', { scope: scopeLabel }) }}
        {{ t('上方气象实况与阈值预警、地图上的气象实况点位与地震活动为真实抓取数据。') }}
      </div>
      <ChartCard :title="t('客流预测 · 未来 7 天（演示 · {scope}）', { scope: scopeLabel })" :option="flowPredOption" height="180px" />
      <ChartCard :title="t('汛期风险预测 · 黄河干流水位（演示）')" :option="floodPredOption" height="180px" />
      <ChartCard :title="t('景区承载量超限预测 %（演示 · {scope}）', { scope: scopeLabel })" :option="capacityPredOption" height="180px" />

      <button
        class="btn btn-primary notify-btn"
        :disabled="!scopeAlerts.length"
        @click="showModal = true"
      >
        {{ scopeAlerts.length ? t('一键通知应急指挥（{n} 条预警）', { n: scopeAlerts.length }) : t('当前无预警，无需通知') }}
      </button>

      <div class="data-note">
        {{ t('气象实况：当前范围 {n} 市（全省共 {count} 市）来自 {from}，观测于 {time}，抓取于 {to}（{detail}）；', { n: scopeWeather.length, count: cityWeather.length, from: dataSources.weather, time: shortTime(weatherObservedAt), to: shortTime(dataFetchedAt.weather), detail: dataSources.weatherAttribution }) }}
        {{ t('地震活动：范围内震中近邻市 {n} 条（全省口径 {count} 条，{since} 年以来 M≥{magnitude}）来自 {from}，抓取于 {time}。', { n: scopeQuakes.length, count: quakeEvents.length, since: quakeSince.slice(0, 4), magnitude: quakeMinMagnitude, from: dataSources.quake, time: shortTime(dataFetchedAt.quake) }) }}
        {{ tv(dataSources.quakeNote) }}
      </div>

      <ImageGallery page="disaster" :title="t('灾害监测场景图集')" />
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-title">{{ t('确认通知') }}</div>
        <div class="modal-body">
          {{ t('即将向应急指挥中心推送当前范围（{scope}）全部 {n} 条预警及处置建议，是否确认发送？', { scope: scopeLabel, n: scopeAlerts.length }) }}
        </div>
        <div class="modal-actions">
          <button class="btn" @click="showModal = false">{{ t('取消') }}</button>
          <button class="btn btn-primary" @click="confirmNotify">{{ t('确认发送') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import MapContainer from '../components/common/MapContainer.vue'
import AppIcon from '../components/common/AppIcon.vue'
import {
  mockWaterInfo, mockGeoHazards, mockFlowWarns,
  mockVideoPoints, mockPredictions, mockHomeData, CITY_COORDS,
} from '../mock'
import {
  WEATHER_ALERT_RULES, cityWeather, dataFetchedAt, dataSources, quakeEvents,
  quakeMinMagnitude, quakeSince, shortTime, weatherAlerts, weatherByCity, weatherObservedAt, weatherScore,
} from '../api/crawled'
import type { QuakeEvent, WeatherAlert } from '../api/crawled'
import { scopeCities, switchScopeToCity } from '../config/cityScope'
import { loadCounties } from '../config/localGeo'
import type { CountyFeatureCollection } from '../config/localGeo'
import {
  inScope, jitter, normCity, scaleNum, scalePercent, scope, scopeCity, scopeLabel, spotCityOf, synthPoints,
} from '../config/scopeData'
import type { ShandongCity } from '../config/shandongRegions'
import { NO_DATA_BORDER, NO_DATA_COLOR, heatColor, heatGradient, heatLevel } from '../config/heatScale'
import { isDeepColor, mapFocusColor } from '../config/mapPalette'
import { createPressPicker } from '../config/cityPick'
import type { PressPicker } from '../config/cityPick'
import { themeAccent, themeAccentAlpha } from '../config/theme'
import { t, tv, locale } from '../config/i18n'
import {
  CHINA_CENTER, CHINA_ZOOM, bindCityLabelZoom, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane,
  playNationalIntro, setupNationalBase,
} from '../config/chinaMap'
import type { AdminCityFeatureCollection } from '../types'

type LayerKey = 'river' | 'water' | 'weather' | 'quake' | 'geo' | 'flow' | 'video'

const layerLabels = computed<Record<LayerKey, string>>(() => ({
  river: t('黄河干流'),
  water: scopeWaterCities.value.length
    ? t('黄河水情（演示，{n} 市）', { n: scopeWaterCities.value.length })
    : t('黄河水情（演示，当前范围未接入）'),
  weather: t('气象实况（{n} 市）', { n: scopeWeather.value.length }),
  quake: t('地震活动（{since} 起 M≥{magnitude}，范围内 {n} 条）', {
    since: quakeSince.slice(0, 4), magnitude: quakeMinMagnitude, n: scopeQuakes.value.length,
  }),
  geo: t('地质灾害隐患（演示）'),
  flow: t('景区人流预警（演示）'),
  video: t('视频监控点（演示）'),
}))
const layerColors: Record<LayerKey, string> = {
  river: '#7FA6C4',
  water: '#3A7BD5',
  weather: '#E8A838',
  quake: '#9B2C2C',
  geo: '#D94F4F',
  flow: '#E07B39',
  video: '#5BA3D9',
}

const layers = ref<Record<LayerKey, boolean>>({
  river: false,
  water: false,
  weather: false,
  quake: false,
  geo: false,
  flow: false,
  video: false,
})

function openDefaultLayers() {
  layers.value.river = true
  layers.value.water = true
  layers.value.weather = true
  layers.value.quake = true
}

let cancelIntro: (() => void) | null = null
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

const BASIN_CITIES = ['菏泽', '济宁', '泰安', '聊城', '德州', '济南', '淄博', '滨州', '东营']
const WATER_CITIES = ['济南', '聊城', '滨州', '东营', '菏泽']

const riskCities = computed<string[]>(() => [...scopeCities(scope.value)])
const scopeWeather = computed(() => cityWeather.filter((w) => inScope(w.city)))
const scopeQuakes = computed(() => quakeEvents.filter((q) => inScope(q.nearestCity)))
const scopeAlerts = computed(() => weatherAlerts.filter((a) => inScope(a.city)))
const scopeWaterCities = computed(() => WATER_CITIES.filter((c) => inScope(c)))
const scopeHasWater = computed(() => scopeWaterCities.value.length > 0)
const waterLevel = computed(() => Number((mockWaterInfo.level * jitter('water-level', 0.01)).toFixed(1)))
const waterFlow = computed(() => Math.round(mockWaterInfo.flow * scopeWaterCities.value.length / WATER_CITIES.length) || mockWaterInfo.flow)

const FLOW_SPOT_COORDS: Record<string, { lng: number; lat: number }> = {
  '泰山风景区': { lng: 117.10, lat: 36.25 },
  '趵突泉景区': { lng: 117.01, lat: 36.66 },
}

const GEO_W: Record<string, number> = { 低: 6, 中: 12, 高: 20 }
const FLOW_W: Record<string, number> = { 蓝色: 8, 黄色: 12, 橙色: 18, 红色: 24 }
const WATER_W = 4
const QUAKE_W = 6

const ALERT_ADVICE: Record<string, string> = {
  暴雨: '排查景区低洼路段与山洪沟道，涉水项目视情关停，必要时组织游客转移',
  高温: '景区增设遮阳与饮水点，调整户外作业时段，向游客提示防暑',
  大风: '索道、游船等户外项目视情关停，加固围挡与临时设施，疏导高空区域游客',
  寒潮: '提示游客添衣保暖，检查景区供暖，山区道路注意结冰、视情限流',
  大雾: '码头、索道与临水临崖路段视情暂停，加强交通引导与能见度提示',
  雷电: '暂停户外大型活动与高空项目，疏导游客进入室内场馆避险',
}

function adviceFor(w: WeatherAlert): string {
  return t(ALERT_ADVICE[w.type] ?? '按等级启动相应应急响应，加强值班值守与信息报送')
}

function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

function nearestBasinCity(lat: number, lng: number): string {
  let best = BASIN_CITIES[0]
  let bestDist = Number.POSITIVE_INFINITY
  BASIN_CITIES.forEach((city) => {
    const c = CITY_COORDS[city]
    if (!c) return
    const dist = (c.lat - lat) ** 2 + (c.lng - lng) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = city
    }
  })
  return best
}

interface CityRisk {
  obs: (typeof cityWeather)[number] | undefined
  obsScore: number
  alerts: WeatherAlert[]
  quakes: QuakeEvent[]
  geo: number
  flow: number
  water: boolean
  index: number
}

function geoPointsOf(city: string): { lng: number; lat: number; level: string }[] {
  const base = mockGeoHazards.filter((g) => nearestBasinCity(g.lat, g.lng) === city)
  if (base.length) return base
  const n = 1 + Math.floor(jitter(`geo-n-${city}`, 0.5) * 3)
  return synthPoints(city as ShandongCity, n, 'geo').map((p, i) => ({
    lng: p.lng,
    lat: p.lat,
    level: jitter(`geo-lv-${city}-${i}`, 0.6) > 1 ? '中' : '低',
  }))
}

function flowWarnsOf(city: string): { spot: string; level: string }[] {
  const base = mockFlowWarns.filter((f) => {
    const c = FLOW_SPOT_COORDS[f.spot]
    return c ? nearestBasinCity(c.lat, c.lng) === city : false
  })
  if (base.length) return base
  const pts = mockHomeData.resourcePoints
    .filter((p) => normCity(p.city) === city)
    .sort((a, b) => b.flow - a.flow)
  const n = Math.min(pts.length, 1 + Math.floor(jitter(`flow-n-${city}`, 0.5) * 2))
  return pts.slice(0, n).map((p, i) => ({
    spot: p.name,
    level: jitter(`flow-lv-${city}-${i}`, 0.6) > 1 ? '橙色' : '黄色',
  }))
}

function cityRisk(city: string): CityRisk {
  const obs = weatherByCity.get(city)
  const obsScore = obs ? weatherScore(obs) : 0
  const alerts = weatherAlerts.filter((a) => a.city === city)
  const quakes = quakeEvents.filter((q) => q.nearestCity === city)
  const geos = geoPointsOf(city)
  const flow = flowWarnsOf(city)
  const water = WATER_CITIES.includes(city) || jitter(`water-${city}`, 0.5) > 0.66
  const index =
    obsScore +
    quakes.length * QUAKE_W +
    geos.reduce((sum, g) => sum + (GEO_W[g.level] ?? 6), 0) +
    flow.reduce((sum, f) => sum + (FLOW_W[f.level] ?? 10), 0) +
    (water ? WATER_W : 0)
  return { obs, obsScore, alerts, quakes, geo: geos.length, flow: flow.length, water, index }
}

const riskMap = computed(() => new Map(riskCities.value.map((c) => [c, cityRisk(c)])))
const riskValues = computed(() => riskCities.value.map((c) => riskMap.value.get(c)!.index))
const maxRisk = computed(() => Math.max(...riskValues.value, 1))
const minRisk = computed(() => (riskValues.value.length ? Math.min(...riskValues.value) : 0))
const riskGradient = heatGradient()

const mapInst = shallowRef<L.Map | null>(null)
const layerGroups: Partial<Record<LayerKey, L.LayerGroup>> = {}
let choropleth: L.GeoJSON | null = null
let riskLabelLayer: L.LayerGroup | null = null
let basinFc: AdminCityFeatureCollection | null = null
const cityLayers = new Map<string, L.Polygon>()
let pickCity: PressPicker<string> | null = null
let countyGroup: L.LayerGroup | null = null
let countyToken = 0
let countyTimer: ReturnType<typeof setTimeout> | null = null

function riskOf(city: string): CityRisk | undefined {
  return riskMap.value.get(city)
}

function cityStyle(name: string): L.PathOptions {
  const risk = riskOf(shortCity(name))
  if (!risk) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.9, color: NO_DATA_BORDER(), weight: 1, opacity: 1 }
  }
  return {
    fillColor: heatColor(risk.index, minRisk.value, maxRisk.value),
    fillOpacity: 0.92,
    color: themeAccentAlpha(0.45),
    weight: 1.2,
    opacity: 0.7,
  }
}

function cityTooltip(name: string): string {
  const city = shortCity(name)
  const risk = riskOf(city)
  const obs = weatherByCity.get(city)
  const quakes = quakeEvents.filter((q) => q.nearestCity === city)
  const rows: string[] = []
  if (obs) {
    rows.push(`<div class="sd-tip-row"><span>${t('气象实况')}</span><b>${t(obs.weather)} ${obs.temp}℃</b></div>`)
    rows.push(`<div class="sd-tip-row"><span>${t('风 / 湿度')}</span><b>${t(obs.windDirection)}${t(obs.windLevel)} · ${obs.humidity}%</b></div>`)
  }
  if (risk) {
    rows.push(`<div class="sd-tip-row"><span>${t('风险指数')}</span>
      <b style="color:${heatColor(risk.index, minRisk.value, maxRisk.value)}">${risk.index}（${t(heatLevel(risk.index, minRisk.value, maxRisk.value))}）</b></div>`)
    rows.push(`<div class="sd-tip-row"><span>${t('阈值预警')}</span>
      <b>${risk.alerts.length ? risk.alerts.map((a) => t(a.type) + t(a.level)).join('、') : t('无')}</b></div>`)
  }
  rows.push(`<div class="sd-tip-row"><span>${t('近十年地震')}</span><b>${t('{n} 次', { n: quakes.length })}</b></div>`)
  const head = `<div class="sd-tip-name">${tv(name)}${risk ? `<span class="sd-tip-tag">${t('范围内')}</span>` : ''}</div>`
  const foot = risk
    ? `<div class="sd-tip-none">${t('单击该市：切换分析范围并细分县区')}</div>`
    : `<div class="sd-tip-none">${t('不在当前分析范围 · 不参与风险着色')}</div>`
  return `<div class="sd-tip">${head}${rows.join('')}${foot}</div>`
}

function onClickCity(name: string) {
  const city = switchScopeToCity(name)
  if (!city) return
  if (scope.value === city) flyToScope()
}

function flyToScope() {
  const map = mapInst.value
  if (!map) return
  cancelIntro?.()
  const city = scopeCity.value
  if (city) {
    const poly = cityLayers.get(city)
    if (poly) {
      map.fitBounds(poly.getBounds(), { paddingTopLeft: [30, 74], paddingBottomRight: [168, 56], animate: true, duration: 0.7 })
      return
    }
  }
  blurToProvince()
}

function blurToProvince() {
  const map = mapInst.value
  const layer = choropleth
  if (!map || !layer) return
  cancelIntro?.()
  map.fitBounds(layer.getBounds(), { paddingTopLeft: [30, 74], paddingBottomRight: [168, 56], animate: true, duration: 0.7 })
}

function buildBasinBase(fc: AdminCityFeatureCollection): L.LayerGroup {
  const base = L.layerGroup()

  const options = {
    pane: 'sd-heat',
    className: 'sd-grow-city',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) => cityStyle(String(feature?.properties?.name ?? '')),
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const path = featLayer as L.Path
      cityLayers.set(shortCity(name), path as L.Polygon)
      featLayer.bindTooltip(() => cityTooltip(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      pickCity?.(featLayer, name)
      featLayer.on('mouseover', () => {
        path.setStyle({ weight: 2.6, color: mapFocusColor(), opacity: 1, fillOpacity: 1 })
        path.bringToFront()
      })
      featLayer.on('mouseout', () => {
        path.setStyle(cityStyle(name))
      })
    },
  } as unknown as L.GeoJSONOptions
  choropleth = L.geoJSON(fc as unknown as GeoJsonObject, options)
  choropleth.addTo(base)

  riskLabelLayer = L.layerGroup()
  fc.features.forEach((f) => {
    labelLayerOf(f).addTo(riskLabelLayer!)
  })
  riskLabelLayer.addTo(base)

  return base
}

function labelLayerOf(f: AdminCityFeatureCollection['features'][number]): L.Marker {
  const name = f.properties.name
  const [lng, lat] = f.properties.centroid
  const risk = riskOf(shortCity(name))
  const onDeep = risk ? isDeepColor(heatColor(risk.index, minRisk.value, maxRisk.value)) : false
  return L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'sd-city-label',
      html: risk
        ? `<div class="sd-city-label-inner hot${onDeep ? ' on-deep' : ''}">
             <span class="sd-city-name">${t(shortCity(name))}</span>
             <span class="sd-city-risk">${risk.index}</span>
           </div>`
        : `<div class="sd-city-label-inner"><span class="sd-city-name">${t(shortCity(name))}</span></div>`,
      iconSize: [0, 0],
    }),
    interactive: false,
    keyboard: false,
    zIndexOffset: 600,
  })
}

function refreshScopeView() {
  const map = mapInst.value
  if (!map) return
  if (choropleth) {
    choropleth.setStyle((feature) => cityStyle(String(feature?.properties?.name ?? '')))
    choropleth.eachLayer((layer) => {
      const name = String((layer as L.GeoJSON & { feature?: { properties?: { name?: string } } }).feature?.properties?.name ?? '')
      layer.bindTooltip(() => cityTooltip(name), {
        className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
      })
    })
  }
  if (basinFc) {
    if (riskLabelLayer) map.removeLayer(riskLabelLayer)
    riskLabelLayer = L.layerGroup()
    basinFc.features.forEach((f) => { labelLayerOf(f).addTo(riskLabelLayer!) })
    riskLabelLayer.addTo(map)
  }
  rebuildMonitorLayers()
}

function countyIndex(city: string, base: number, county: string): number {
  return Math.max(1, Math.round(base * jitter(`risk-${city}-${county}`, 0.16)))
}

function countyStyle(value: number): L.PathOptions {
  return {
    pane: 'sd-county',
    fillColor: heatColor(value, minRisk.value, maxRisk.value),
    fillOpacity: 0.78,
    color: '#FFFFFF',
    weight: 1.3,
    opacity: 0.9,
    dashArray: '4 3',
  }
}

function countyTooltip(county: string, city: string, value: number): string {
  const level = heatLevel(value, minRisk.value, maxRisk.value)
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(county)}<span class="sd-tip-tag">${t('{city}市', { city })}</span></div>
    <div class="sd-tip-row"><span>${t('灾害风险指数')}</span><b style="color:${heatColor(value, minRisk.value, maxRisk.value)}">${value}（${t(level)}）</b></div>
    <div class="sd-tip-none">${t('县区粒度按市域风险指数分配（演示口径）')}</div>
  </div>`
}

function clearCountyLayer() {
  const map = mapInst.value
  countyToken += 1
  if (countyGroup && map) map.removeLayer(countyGroup)
  countyGroup = null
}

async function syncCountyLayer() {
  const map = mapInst.value
  const city = scopeCity.value
  if (!map || !city) { clearCountyLayer(); return }
  const token = ++countyToken
  let fc: CountyFeatureCollection
  try {
    fc = await loadCounties(city)
  } catch (err) {
    console.error(err)
    return
  }
  if (token !== countyToken || !mapInst.value) return
  if (countyGroup) mapInst.value.removeLayer(countyGroup)

  const base = riskOf(city)?.index ?? minRisk.value
  const values = new Map<string, number>()
  fc.features.forEach((f) => {
    values.set(f.properties.name, countyIndex(city, base, f.properties.name))
  })

  const options = {
    pane: 'sd-county',
    className: 'sd-grow',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) => {
      const name = String(feature?.properties?.name ?? '')
      return countyStyle(values.get(name) ?? base)
    },
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const value = values.get(name) ?? base
      featLayer.bindTooltip(countyTooltip(name, city, value), {
        className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
      })
    },
  } as unknown as L.GeoJSONOptions
  const group = L.layerGroup()
  L.geoJSON(fc as unknown as GeoJsonObject, options).addTo(group)
  countyGroup = group
  group.addTo(mapInst.value)
}

function scheduleCountyLayer() {
  if (countyTimer) clearTimeout(countyTimer)
  countyTimer = setTimeout(() => { void syncCountyLayer() }, 0)
}

function buildRiverLayer(map: L.Map): L.LayerGroup {
  const g = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, g)
  return g
}

async function setupBasinBase(map: L.Map) {
  const [national, res] = await Promise.all([
    setupNationalBase(map),
    fetch(`${import.meta.env.BASE_URL}shandong.json`),
  ])
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  basinFc = fc

  buildBasinBase(fc).addTo(map)
  scheduleCountyLayer()

  map.setMaxBounds(national.bounds.pad(0.2))
  cancelIntro = playNationalIntro(map, {
    china: national.bounds,
    focus: choropleth!.getBounds(),
    paddingTopLeft: [24, 74],
    paddingBottomRight: [168, 56],
    duration: 750,
    onFinish: openDefaultLayers,
  })
}

function weatherColor(code: number): string {
  if (code >= 95) return '#D94F4F'
  if (code >= 85) return '#7FB3D5'
  if (code >= 80) return '#3A7BD5'
  if (code >= 71) return '#7FB3D5'
  if (code >= 51) return '#3A7BD5'
  if (code === 45 || code === 48) return '#8C8578'
  if (code === 3) return '#9AA7B5'
  if (code === 2) return '#C8A45C'
  return '#E8A838'
}

function levelColor(level: string): string {
  if (level === '红色') return '#D94F4F'
  if (level === '橙色') return '#E07B39'
  if (level === '黄色') return '#E8A838'
  return '#3A7BD5'
}

function obsPopup(w: (typeof cityWeather)[number]): string {
  const hits = weatherAlerts.filter((a) => a.city === w.city)
  const alertText = hits.length
    ? hits.map((a) => t('{type}预警（{level}）：{detail}', { type: a.type, level: a.level, detail: t(a.detailKey, a.detailVars) })).join('<br/>')
    : t('未触发阈值')
  return `<div style="font-size:13px;max-width:250px;line-height:1.75">
    <b style="color:var(--map-title)">${t('气象实况 · {city}市', { city: w.city })}</b><br/>
    ${t(w.weather)} ${w.temp}℃ · ${t('湿度')} ${w.humidity}%<br/>
    ${t(w.windDirection)}${t(w.windLevel)}（${w.windSpeedKmh}km/h）<br/>
    ${t('实况降水')} ${w.precipitation}mm<br/>
    ${t('今日：')}${t(w.today.weather)} ${w.today.tempLow}~${w.today.tempHigh}℃ · ${t('降水')} ${w.today.precipitation}mm<br/>
    ${t('明日：')}${t(w.tomorrow.weather)} ${w.tomorrow.tempLow}~${w.tomorrow.tempHigh}℃<br/>
    <span style="color:var(--map-title)">${t('阈值预警')}</span>：${alertText}<br/>
    <span style="color:var(--map-label-name);font-size:11px">${t('观测')} ${shortTime(w.observedAt)} · Open-Meteo</span>
  </div>`
}

function quakePopup(q: QuakeEvent): string {
  const link = q.url
    ? `<a href="${q.url}" target="_blank" rel="noopener" style="color:#3A7BD5">${t('USGS 事件页')}</a>`
    : ''
  return `<div style="font-size:13px;max-width:250px;line-height:1.75">
    <b style="color:#8C2F22">M${q.magnitude.toFixed(1)} ${t('地震')}</b><br/>
    ${q.timeCn}${t('（北京时间）')}<br/>
    ${t('震中：')}${q.place}${q.direction ? `（${t('{n} 公里 {dir}', { n: q.directionKm, dir: q.direction })}）` : ''}<br/>
    ${t('震源深度：')}${q.depthKm} ${t('公里')}<br/>
    ${t('最近地级市：')}${t('{city}市约 {n} 公里', { city: q.nearestCity, n: Math.round(q.nearestCityKm) })}<br/>
    ${q.insideShandong ? t('震中在山东境内及邻域') : t('震中在邻省，山东境外')}${link ? '<br/>' + link : ''}
  </div>`
}

function buildWaterLayer(): L.LayerGroup {
  const waterLayer = L.layerGroup()
  scopeWaterCities.value.forEach(city => {
    const c = CITY_COORDS[city]
    if (!c) return
    const marker = L.circleMarker([c.lat, c.lng], {
      className: 'sd-px-dot',
      radius: 8, color: '#3A7BD5', fillColor: '#3A7BD5', fillOpacity: 0.7, weight: 1,
    })
    marker.on('mouseover', () => marker.bringToFront())
    marker.addTo(waterLayer).bindPopup(`<b>${t('黄河水情 · {city}', { city })}</b><br/>${t('水位：{n} 米', { n: waterLevel.value })}`)
  })
  return waterLayer
}

function buildWeatherLayer(): L.LayerGroup {
  const weatherLayer = L.layerGroup()
  scopeWeather.value.forEach((w) => {
    const alert = weatherAlerts.find((a) => a.city === w.city)
    const marker = L.circleMarker([w.lat, w.lng], {
      className: 'sd-px-dot',
      radius: 7,
      color: alert ? levelColor(alert.level) : '#FFFFFF',
      weight: alert ? 2.6 : 1.2,
      fillColor: weatherColor(w.weatherCode),
      fillOpacity: 0.78,
    })
    marker.on('mouseover', () => marker.bringToFront())
    marker.addTo(weatherLayer).bindPopup(obsPopup(w))
  })
  return weatherLayer
}

function buildQuakeLayer(): L.LayerGroup {
  const quakeLayer = L.layerGroup()
  scopeQuakes.value.forEach((q) => {
    const marker = L.circleMarker([q.lat, q.lng], {
      className: 'sd-px-dot',
      radius: Math.min(14, 4 + (q.magnitude - 3) * 3.4),
      color: q.insideShandong ? '#9B2C2C' : '#C08A6A',
      weight: 1.4,
      dashArray: q.insideShandong ? undefined : '3 3',
      fillColor: q.insideShandong ? '#9B2C2C' : '#C08A6A',
      fillOpacity: q.insideShandong ? 0.5 : 0.22,
    })
    marker.on('mouseover', () => marker.bringToFront())
    marker.addTo(quakeLayer).bindPopup(quakePopup(q))
  })
  return quakeLayer
}

function buildGeoLayer(): L.LayerGroup {
  const geoLayer = L.layerGroup()
  riskCities.value.forEach((city) => {
    geoPointsOf(city).forEach((g) => {
      const color = g.level === '中' ? '#D94F4F' : '#E8A838'
      const marker = L.circleMarker([g.lat, g.lng], {
        className: 'sd-px-dot',
        radius: 9, color, fillColor: color, fillOpacity: 0.8, weight: 1,
      })
      marker.on('mouseover', () => marker.bringToFront())
      marker.addTo(geoLayer).bindPopup(`<b>${t('地质灾害隐患点 · {city}', { city })}</b><br/>${t('风险等级：{level}', { level: g.level })}<br/>${t('演示数据')}`)
    })
  })
  return geoLayer
}

function buildFlowLayer(): L.LayerGroup {
  const flowLayer = L.layerGroup()
  riskCities.value.forEach((city) => {
    flowWarnsOf(city).forEach((f) => {
      const c = FLOW_SPOT_COORDS[f.spot]
        ?? mockHomeData.resourcePoints.find((p) => p.name === f.spot)
      if (!c) return
      const level = f.level
      const radius = level === '橙色' ? 10 : 8
      const color = level === '橙色' ? '#E07B39' : '#E8A838'
      const marker = L.circleMarker([c.lat, c.lng], {
        className: 'sd-px-dot',
        radius, color, fillColor: color, fillOpacity: 0.7, weight: 1,
      })
      marker.on('mouseover', () => marker.bringToFront())
      marker.addTo(flowLayer).bindPopup(`<b>${f.spot}</b><br/>${t('人流预警：{level}', { level })}<br/>${t('演示数据')}`)
    })
  })
  return flowLayer
}

function buildVideoLayer(): L.LayerGroup {
  const videoLayer = L.layerGroup()
  const videoIcon = L.divIcon({
    className: 'sd-video-pin',
    html: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9.4" fill="#FFFFFF" stroke="#5BA3D9" stroke-width="1.5"/>
      <rect x="6.4" y="8.6" width="7.6" height="6" rx="1.4" fill="#5BA3D9"/>
      <path d="M14.6 10.9 18 9.2v4.6l-3.4-1.7Z" fill="#5BA3D9"/>
    </svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
  riskCities.value.forEach((city) => {
    const base = mockVideoPoints.filter((v) => nearestBasinCity(v.lat, v.lng) === city)
    const pts: { lat: number; lng: number }[] = base.length
      ? base
      : synthPoints(city as ShandongCity, 2, 'video')
    pts.forEach((v) => {
      L.marker([v.lat, v.lng], { icon: videoIcon })
        .addTo(videoLayer).bindPopup(`<b>${t('视频监控接入点 · {city}', { city })}</b><br/>${t('设备在线，可点击调阅')}`)
    })
  })
  return videoLayer
}

function rebuildMonitorLayers() {
  const map = mapInst.value
  const builders: [LayerKey, () => L.LayerGroup][] = [
    ['water', buildWaterLayer],
    ['weather', buildWeatherLayer],
    ['quake', buildQuakeLayer],
    ['geo', buildGeoLayer],
    ['flow', buildFlowLayer],
    ['video', buildVideoLayer],
  ]
  builders.forEach(([key, build]) => {
    const old = layerGroups[key]
    if (old && map?.hasLayer(old)) map.removeLayer(old)
    layerGroups[key] = build()
  })
  applyLayers()
}

function onMapReady(map: L.Map) {
  mapInst.value = map
  map.createPane('sd-heat')
  map.createPane('sd-county')
  ;(map.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(map.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ensureRiverPane(map, 420)
  bindCityLabelZoom(map)
  pickCity = createPressPicker<string>(map, (name) => onClickCity(name))

  layerGroups.river = buildRiverLayer(map)

  layerGroups.water = buildWaterLayer()
  layerGroups.weather = buildWeatherLayer()
  layerGroups.quake = buildQuakeLayer()
  layerGroups.geo = buildGeoLayer()
  layerGroups.flow = buildFlowLayer()
  layerGroups.video = buildVideoLayer()

  applyLayers()
  setupBasinBase(map).catch((err) => {
    console.error(err)
    openDefaultLayers()
  })
}

function applyLayers() {
  const map = mapInst.value
  if (!map) return
  const keys = Object.keys(layerGroups) as LayerKey[]
  keys.forEach(key => {
    const g = layerGroups[key]
    if (!g) return
    if (layers.value[key]) {
      if (!map.hasLayer(g)) map.addLayer(g)
    } else {
      if (map.hasLayer(g)) map.removeLayer(g)
    }
  })
}

watch(layers, () => applyLayers(), { deep: true })


function levelTag(level: string): string {
  if (level === '红色') return 'tag-red'
  if (level === '橙色') return 'tag-orange'
  if (level === '黄色') return 'tag-gold'
  return 'tag-blue'
}

const expandedWarn = ref('')
function locateWarning(w: WeatherAlert) {
  const c = weatherByCity.get(w.city)
  cancelIntro?.()
  mapInst.value?.setView([c?.lat ?? 36.65, c?.lng ?? 117.12], 8)
}

const flowPredOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 16, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: mockPredictions.flow.map(p => p.date) },
  yAxis: { type: 'value', name: t('人次') },
  series: [{
    type: 'line', smooth: true,
    data: mockPredictions.flow.map(p => scaleNum(p.value, `pred-flow-${p.date}`)),
    lineStyle: { color: themeAccent() }, itemStyle: { color: themeAccent() },
    areaStyle: { color: themeAccentAlpha(0.15) },
  }],
}))

const floodPredOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 16, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: mockPredictions.flood.map(p => p.date) },
  yAxis: { type: 'value', name: t('米'), min: 40 },
  series: [{
    type: 'line', smooth: true,
    data: mockPredictions.flood.map(p => Number((p.value * jitter(`flood-${p.date}`, 0.01)).toFixed(1))),
    lineStyle: { color: '#3A7BD5' }, itemStyle: { color: '#3A7BD5' },
  }],
}))

const capacitySpots = computed(() => {
  const listed = mockPredictions.capacity.filter((c) => {
    const city = spotCityOf(c.spot)
    return city ? inScope(city) : false
  })
  if (listed.length) return listed
  const city = scopeCity.value
  if (!city) return mockPredictions.capacity
  return mockHomeData.resourcePoints
    .filter((p) => normCity(p.city) === city)
    .sort((a, b) => b.flow - a.flow)
    .slice(0, 3)
    .map((p) => ({ spot: p.name, value: Math.round(p.flow / 400) }))
})

const capacityPredOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 16, top: 16, bottom: 30 },
  xAxis: { type: 'category', data: capacitySpots.value.map(c => tv(c.spot)), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', max: 100 },
  series: [{
    type: 'bar',
    data: capacitySpots.value.map(c => {
      const v = scalePercent(c.value, `cap-${c.spot}`, 0.15)
      return { value: v, itemStyle: { color: v >= 80 ? '#D94F4F' : v >= 60 ? '#E8A838' : '#00A052' } }
    }),
    barWidth: 16,
  }],
}))

watch(scope, () => {
  refreshScopeView()
  scheduleCountyLayer()
  flyToScope()
})

watch(locale, () => {
  mapInst.value?.closePopup()
  refreshScopeView()
  scheduleCountyLayer()
})

const showModal = ref(false)
function confirmNotify() {
  showModal.value = false
  alert(t('已向应急指挥中心发送通知（演示占位）'))
}
</script>

<style scoped>
.disaster-page {
  display: flex;
  gap: 14px;
  height: calc(100vh - 56px - 32px);
}
.map-side {
  flex: 0 0 70%;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.panel-side {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 2px;
}

.map-headline {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
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
  color: var(--text-muted);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}

.layer-legend {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1100;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  min-width: 130px;
}
.legend-title {
  font-size: 12px;
  color: var(--text-gold);
  margin-bottom: 6px;
  font-weight: 600;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 2px 0;
  cursor: pointer;
}
.legend-item input { accent-color: var(--color-gold); }
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.basin-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 1100;
  width: 214px;
  padding: 8px 10px 9px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(94, 76, 48, 0.12);
}
.legend-head {
  font-size: 12px;
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
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.legend-hint { display: inline-flex; align-items: center; gap: 3px; color: var(--text-muted); }
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
  width: 12px;
  height: 8px;
  border-radius: 2px;
}
.legend-swatch.no-data {
  background: var(--map-nodata);
  border: 1px solid var(--map-nodata-border);
}
.legend-swatch.china {
  background: var(--map-nodata);
  border: 1px dashed var(--map-nodata-border);
}
.legend-swatch.quake {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9B2C2C;
  opacity: 0.6;
}

:deep(.sd-city-label) {
  background: transparent;
  border: none;
}
:deep(.sd-far-view .sd-city-label) { display: none; }
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
:deep(.sd-city-label-inner .sd-city-risk) {
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
:deep(.sd-city-label-inner.on-deep .sd-city-risk) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}

:deep(.sd-video-pin) {
  background: transparent;
  border: none;
}

:deep(.leaflet-tooltip.sd-tooltip) {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(94, 76, 48, 0.12);
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
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
:deep(.sd-tip-tag) {
  display: inline-block;
  margin-left: 6px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 400;
  color: var(--text-gold);
  background: rgba(var(--rgb-gold), 0.16);
  border-radius: 8px;
}
:deep(.sd-tip-row) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
:deep(.sd-tip-none) {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}
:deep(.sd-popup) {
  max-width: 272px;
}
:deep(.sd-popup-title) {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gold);
  margin-bottom: 6px;
}
:deep(.sd-popup-row) {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
}
:deep(.sd-popup-row b) {
  color: var(--text-primary);
  font-weight: 600;
}

.water-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.water-item { text-align: center; }
.water-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-gold);
  font-family: 'DIN', 'Arial', sans-serif;
}
.water-value em { font-size: 12px; font-style: normal; color: var(--text-muted); }
.water-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.warn-list { display: flex; flex-direction: column; gap: 8px; }
.warn-empty {
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  padding: 10px;
}
.warn-empty-head {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.warn-empty-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.warn-rule {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.warn-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
}
.warn-item:hover { border-color: var(--color-gold); }
.warn-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.warn-type { font-size: 13px; color: var(--text-primary); }
.warn-loc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.warn-measure {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-gold);
  background: rgba(var(--rgb-gold), 0.08);
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.5;
}
.warn-expand {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}
.warn-expand:hover { color: var(--text-gold); }

.notify-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
}
.notify-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card-title-note {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}
.card-note {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}
.panel-note {
  padding: 8px 10px;
  background: rgba(var(--rgb-gold), 0.08);
  border-left: 3px solid var(--color-gold);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.data-note {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-box {
  width: 360px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
}
.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-gold);
  margin-bottom: 12px;
}
.modal-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
