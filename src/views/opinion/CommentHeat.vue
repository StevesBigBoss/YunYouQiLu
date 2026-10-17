<template>
  <div class="comment-heat">
    <div class="heat-layout">
      <!-- 左：按市划分的颜色深浅热力地图 60% -->
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

      <!-- 右：各渠道发文量与情感构成 40% -->
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

// 无瓦片行政区底图的底色：跟随当前风格（--map-bg），兜底为米白
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

// ===== 按市划分的分级热力图（choropleth） =====
// 颜色由浅到深：极浅绿 → 深绿，被提及越多颜色越深
const HEAT_COLORS_FALLBACK = ['#EDFBF2', '#CFF3DC', '#A8E7BE', '#74D79B', '#3EC57A']
// 色阶上下限按「当前范围内有提及的城市」取，未提及的城市统一走无数据色
const mentioned = computed(() => scopeNewsByCity.value.filter((c) => c.count > 0))
const maxValue = computed(() => Math.max(...mentioned.value.map((c) => c.count), 1))
const minValue = computed(() => Math.min(...mentioned.value.map((c) => c.count), maxValue.value))

/** 提及量在色阶上的位置（0~1）：配色与标注深浅共用 */
function heatRatio(value: number): number {
  if (maxValue.value === minValue.value) return 1
  return (value - minValue.value) / (maxValue.value - minValue.value)
}

function heatColor(value: number): string {
  const HEAT_COLORS = mapHeatColors() ?? HEAT_COLORS_FALLBACK
  const idx = Math.min(HEAT_COLORS.length - 1, Math.floor(heatRatio(value) * HEAT_COLORS.length))
  return HEAT_COLORS[idx]
}

/** 当前范围下各市的提及条数与标题（范围切换后重算） */
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

/** 市名标注：位置取数据里的 centroid，类名与首页一致（全国视野下先藏起来，推近落位后再显示） */
function buildCityLabels(): L.LayerGroup {
  const g = L.layerGroup()
  const features = (shandongGeoJson as unknown as { features: CityFeature[] }).features
  features.forEach((f) => {
    const name = String(f.properties.name ?? '').replace('市', '')
    const centroid = f.properties.centroid ?? f.properties.center
    if (!name || !centroid) return
    const [lng, lat] = centroid
    // 深色填充的市改用浅色字（按实际填充色的明暗判断，否则米白主题下读不出来）
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

/** 弹窗内容：提及条数 + 前 3 条报道标题（真实数据，便于核对） */
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

/** 单个市的填充样式（范围切换后重设用） */
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
/** 黄河干流：随全国底图常驻；常驻流动，无入场画出动画 */
let riverLayer: L.LayerGroup | null = null
/** 市简称 → 市级多边形（点击切范围后的视野取景用） */
const cityPolygons = new Map<string, L.Polygon>()
/** 按下/抬起成对识别的点击器（见 cityPick.ts）：飞行动画途中也能收到地市点击 */
let pickCity: PressPicker<string> | null = null

/** 点击某个市：顶栏「分析范围」直接切到该市（单次点击即切换，不再弹窗） */
function onClickCity(name: string) {
  const city = switchScopeToCity(name)
  if (!city) return
  // 点到已选中的市时范围没变，手动飞一次
  if (scope.value === city) flyToScope()
}

/** 当前范围的视野：单市取该市，其余取范围内各市的合并包围盒 */
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

// ===== 单市范围下的县界细分（演示口径：市域提及量按县区小幅分配） =====
let countyGroup: L.GeoJSON | null = null
let countyToken = 0
let countyTimer: ReturnType<typeof setTimeout> | null = null

/** 县区粒度提及量：以市域提及量为基准，按县区名取固定小幅偏移，保证每次一致 */
function countyValueOf(city: string, county: string): number {
  const base = cityValueMap.value.get(city) ?? 0
  return Math.max(0, Math.round(base * jitter(`heat-${city}-${county}`, 0.3)))
}

function clearCountyLayer() {
  countyToken += 1
  if (countyGroup && heatMap) heatMap.removeLayer(countyGroup)
  countyGroup = null
}

/** 范围为单个城市时才铺县界：整层重建，避免残留上一个市的县区 */
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
  // 请求期间范围又变了（连点多个市）：这次结果作废
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
        // 县界用白色虚线：压在同色系市域填充上也能一眼看出细分（实线白 = 市界，虚线白 = 县界）
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

/** 合并同一轮内的多次触发（连点城市 / 范围与数据同时变） */
function scheduleCountyLayer() {
  if (countyTimer) clearTimeout(countyTimer)
  countyTimer = setTimeout(() => { countyTimer = null; void syncCountyLayer() }, 0)
}

/** 范围切换：只重设填充色与标注，不重播飞入动画 */
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
  // 1) 全国底图：其他省份中性米白（不聚焦），山东省由下面的专题底图绘制
  const national = await setupNationalBase(map)
  heatMap = map
  // 地市点击：按下/抬起配对识别（入场动画/飞行途中点别的市也能立刻切过去，见 config/cityPick.ts）
  pickCity = createPressPicker<string>(map, (name) => onClickCity(name))

  // 县界专用面板：市级面在本图走默认覆盖面板（400），县界压在其上才可见
  map.createPane('sd-county')
  ;(map.getPane('sd-county') as HTMLElement).style.zIndex = '410'
  // 黄河流向图：河道压在市级填色（400）之上、县界（410）之下；常驻流动，无入场画出动画
  ensureRiverPane(map, 405)
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, riverLayer)
  riverLayer.addTo(map)

  // 2) 加载山东地市边界，按市填充颜色深浅
  // className 只在图元创建时应用（_initPath），keyboard:false 去掉 tabindex，点完不留浏览器焦点框
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
      // 飞行/入场动画未结束时按下/抬起会落在不同元素上（浏览器把 click 判给公共祖先，
      // 图层收不到），用按下/抬起配对识别兜住；紧随其后的真 click 由识别器内部去重
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

  // 3) 市名标注：跟首页同一套样式，全国视野下藏起来，推近落位后再显示
  bindCityLabelZoom(map)
  heatLabelLayer = buildCityLabels().addTo(map)

  // 4) 全国底图可拖拽范围 + 由远及近飞入山东（推近时长与首页取齐：0.75s 推到位）
  map.setMaxBounds(national.bounds.pad(0.2))
  playNationalIntro(map, {
    china: national.bounds,
    focus: choropleth.getBounds(),
    paddingTopLeft: [18, 18],
    paddingBottomRight: [18, 18],
    duration: 750,
  })

  // 5) 默认范围（潍坊）直接铺县界，与其它页保持一致
  scheduleCountyLayer()
}

// 范围切换：热力色阶与标注随范围内提及量重算，视野跟着切到该范围，县界跟着重建
watch(scope, () => {
  refreshHeatMap()
  scheduleCountyLayer()
  flyToScope()
})

/** 换语言：市名/县区标注与悬停弹窗都是建层时拼好的 HTML，重设一遍换字（不重置视野） */
watch(locale, () => {
  heatMap?.closePopup()
  refreshHeatMap()
  scheduleCountyLayer()
})

// 各来源渠道发文量（横向堆叠条，按情感构成拆分）
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

/* ===== 城市标注（与首页同一套类名，样式一并复制） ===== */
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
/* 深色填充的市改用浅色字，保证可读性 */
:deep(.sd-city-label-inner.on-deep .sd-city-name) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
/* 全国视野下地市标注会挤成一团，飞入山东后再显示 */
:deep(.sd-far-view .sd-city-label) { display: none; }

.data-note {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
