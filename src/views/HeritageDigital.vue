<template>
  <div class="heritage-page">
    <div class="main-row">
      <!-- 左侧资源列表 -->
      <aside class="left-list">
        <div class="list-search">
          <input v-model="keyword" type="search" :placeholder="t('搜索项目 / 申报地区 / 保护单位')" />
        </div>
        <div class="cat-tabs">
          <button
            v-for="c in categoryTabs"
            :key="c.name"
            class="cat-tab"
            :class="{ active: category === c.name }"
            @click="category = c.name"
          >{{ t(c.name) }}<em class="cat-count">{{ c.count }}</em></button>
        </div>
        <div class="heritage-list">
          <div class="list-total">
            {{ t('共 {n} 项 · {scope}', { n: filteredList.length, scope: scopeLabel }) }}
            <span class="list-hint">{{ t('点击项目定位到申报县区') }}</span>
          </div>
          <div
            v-for="h in filteredList"
            :key="h.id"
            class="heritage-item"
            :class="{ selected: selectedId === h.id }"
            @click="selectHeritage(h.id)"
          >
            <div class="item-head">
              <div class="item-name">{{ tv(h.name) }}</div>
              <button
                class="item-img-btn"
                type="button"
                :class="{ ai: itemImage(h.id)?.onlyAi }"
                :title="itemImage(h.id)?.onlyAi ? t('该项目暂无实景图，点开看 AI 生成配图') : t('用配图替换右侧项目简介')"
                @click.stop="selectHeritage(h.id, 'image')"
              >
                <AppIcon name="image" :size="12" />{{ t('查看图片') }}
              </button>
            </div>
            <div class="item-meta">
              <span class="tag" :class="catTag(h.category)">{{ t(h.category) }}</span>
              <span class="item-era">{{ t(h.batch) }}</span>
            </div>
            <div class="item-area" :title="tv(h.area)">{{ tv(h.area) }}</div>
          </div>

          <!-- 文化遗产配图：点缩略图看大图 -->
          <ImageGallery page="heritage" :title="t('文化遗产图集')" plain />
        </div>
      </aside>

      <!-- 右侧：只有地图，全部高度都给热力图 -->
      <div class="right-col">
        <div class="map-half">
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
              <div class="headline-title">{{ t('齐鲁文化遗产数字化地图 · {scope}', { scope: scopeLabel }) }}</div>
              <div class="headline-sub">
                {{ t('当前范围国家级非遗代表性项目 {n} 项 · 按申报地区归市统计 · 抓取 {time}', { n: scopeTotal, time: shortTime(dataFetchedAt.heritage) }) }}
              </div>
            </div>

            <!-- 左下：图例 -->
            <div class="map-legend">
              <div class="legend-head">{{ t('非遗项目数（项 · 按申报地区归市）· {scope}', { scope: scopeLabel }) }}</div>
              <div class="legend-bar" :style="{ background: countGradient }"></div>
              <div class="legend-axis">
                <span>0</span>
                <span class="legend-hint">{{ t('少') }} <AppIcon name="arrow-right" :size="11" /> {{ t('多') }}</span>
                <span>{{ maxCityCount }}</span>
              </div>
              <div class="legend-foot">
                <span class="legend-swatch no-data"></span>{{ t('无记录 / 不在分析范围') }}
              </div>
              <div class="legend-foot legend-bubble-foot">
                <span class="legend-bubble small"></span>
                <span class="legend-bubble big"></span>
                {{ t('圆点大小 = 县区项目数（按申报地区归属）') }}
              </div>
              <div class="legend-foot legend-source">
                {{ t('数据：') }}{{ tv(dataSources.heritage) }}{{ scopeNoCityNote }}
              </div>
            </div>
          </MapContainer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, watch } from 'vue'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import MapContainer from '../components/common/MapContainer.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import AppIcon from '../components/common/AppIcon.vue'
import { HERITAGE_ITEM_IMAGES } from '../mock/heritageItemImages'
import {
  dataFetchedAt, dataSources, heritageCategories, heritageCoords,
  heritageItems, heritageNoCity, shortTime,
} from '../api/crawled'
import type { HeritageRecord } from '../api/crawled'
import { inScope, scope, scopeCity, scopeLabel } from '../config/scopeData'
import { switchScopeToCity } from '../config/cityScope'
import { CITY_COUNTIES } from '../config/cityCounties'
import type { CountyCenter } from '../config/cityCounties'
import { loadCounties } from '../config/localGeo'
import type { CountyFeatureCollection } from '../config/localGeo'
import type { ShandongCity } from '../config/shandongRegions'
import { NO_DATA_BORDER, NO_DATA_COLOR, heatColor, heatGradient } from '../config/heatScale'
import { isDeepColor, mapFocusColor } from '../config/mapPalette'
import { createPressPicker } from '../config/cityPick'
import type { PressPicker } from '../config/cityPick'
import { t, tv, locale } from '../config/i18n'
import { themeAccentAlpha, themeColors } from '../config/theme'
import {
  CHINA_CENTER, CHINA_ZOOM, bindCityLabelZoom, bindRiverZoomEmphasis, buildYellowRiverLayer, ensureRiverPane,
  playNationalIntro, setupNationalBase,
} from '../config/chinaMap'
import type { AdminCityFeatureCollection } from '../types'

// ========== 列表：真实国家级非遗名录（190 项） ==========
// 全省口径用完整名录；选了城市/流域后按「申报地区归市」取子集，不做任何放大
const scopeItems = computed<HeritageRecord[]>(() =>
  scope.value === 'all' ? heritageItems : heritageItems.filter((h) => !!h.city && inScope(h.city)))
const scopeTotal = computed(() => scopeItems.value.length)

/** 省级申报项目（名录未标市县）无法归市，范围口径下需在脚注里说明去向 */
const scopeNoCityNote = computed(() => {
  if (!heritageNoCity.length) return ''
  const base = t('；{n} 项由省级单位申报，名录未标市县，不计入市级统计', { n: heritageNoCity.length })
  return scope.value === 'all' ? base : `${base}${t('，也不计入当前范围')}`
})

// 分类标签用名录自身的十大类别，条数按当前范围实时统计
const categoryTabs = computed(() => [
  { name: '全部', count: scopeTotal.value },
  ...heritageCategories.map((c) => ({
    name: c.name,
    count: scopeItems.value.filter((h) => h.category === c.name).length,
  })),
])
const category = ref('全部')
const keyword = ref('')

const selectedId = ref(scopeItems.value[0]?.id || '')

const filteredList = computed<HeritageRecord[]>(() => {
  const kw = keyword.value.trim()
  return scopeItems.value.filter((h) => {
    if (category.value !== '全部' && h.category !== category.value) return false
    if (!kw) return true
    return h.name.includes(kw) || h.area.includes(kw) || h.protectUnit.includes(kw)
  })
})

/** 十大类别各自的标签色 */
function catTag(c: string): string {
  const map: Record<string, string> = {
    民间文学: 'tag-gold', 传统音乐: 'tag-blue', 传统舞蹈: 'tag-green', 传统戏剧: 'tag-red',
    曲艺: 'tag-orange', '传统体育、游艺与杂技': 'tag-blue', 传统美术: 'tag-gold',
    传统技艺: 'tag-green', 传统医药: 'tag-red', 民俗: 'tag-orange',
  }
  return map[c] ?? 'tag-gold'
}

// ========== 遗产点分布口径 ==========
// 名录只给「申报地区」（多数到县），已在 src/api/crawled.ts 里归并到 16 个地级市，
// 并叠加县区历史沿革（莱芜→济南、胶南→青岛等）。这里直接用归并结果，
// 不再按最近质心猜测所属城市。

/** 当前分类/搜索条件下各市项目数（GeoJSON 的 name 带「市」字，这里统一成简称） */
const cityCount = computed(() => {
  const counts = new Map<string, number>()
  filteredList.value.forEach((h) => {
    if (!h.city) return
    counts.set(h.city, (counts.get(h.city) ?? 0) + 1)
  })
  return counts
})
const maxCityCount = computed(() => Math.max(1, ...[...cityCount.value.values()]))
const countGradient = heatGradient()

function shortName(name: string): string {
  return name.replace(/市$/, '')
}

function cityItems(name: string): HeritageRecord[] {
  const key = shortName(name)
  return filteredList.value.filter((h) => h.city === key)
}

// ========== 地图 ==========
// 无瓦片底图底色：跟随当前风格（--map-bg），兜底为米白
const PLAIN_BACKGROUND = 'var(--map-bg, radial-gradient(ellipse at 50% 42%, #FCFEFC 0%, #F1F6F1 46%, #E3EBE4 100%))'

// shallowRef：Leaflet 实例不需要深层响应式，且 ref 的深层解包会破坏 L.Map 的类型
const mapInst = shallowRef<L.Map | null>(null)
let choropleth: L.GeoJSON | null = null
let labelLayer: L.LayerGroup | null = null
/** 黄河干流：省外段 + 山东段，随全国底图常驻；常驻流动，无入场画出动画 */
let riverLayer: L.LayerGroup | null = null
let cancelIntro: (() => void) | null = null
let focusBounds: L.LatLngBounds | null = null
/** 市简称 → 市级多边形（点击切范围后的视野取景、县区细分都按它定位） */
const cityLayers = new Map<string, L.Polygon>()
/** 按下/抬起成对识别的点击器（见 cityPick.ts）：飞行动画途中也能收到地市点击 */
let pickCity: PressPicker<string> | null = null
/** 单市范围下的县界细分层（全省 / 沿黄范围时整层清空） */
let countyGroup: L.LayerGroup | null = null
/** 县界请求的竞态令牌：快速连点不同城市时只认最后一次 */
let countyToken = 0
let countyTimer: ReturnType<typeof setTimeout> | null = null

/** 点击某个市：顶栏「分析范围」直接切到该市（单次点击即切换，范围监听会带着着色、县界与视野一起走） */
function onClickCity(name: string) {
  const city = switchScopeToCity(name)
  if (!city) return
  if (scope.value === city) flyToScope()
}

/** 视野起飞：单市取该市轮廓，其余取当前范围各市的合并包围盒 */
function scopeBoundsOf(): L.LatLngBounds | null {
  const city = scopeCity.value
  if (city) {
    const poly = cityLayers.get(city)
    return poly ? L.latLngBounds(poly.getBounds().getSouthWest(), poly.getBounds().getNorthEast()) : null
  }
  return focusBounds
}

function flyToScope() {
  const map = mapInst.value
  if (!map) return
  const b = scopeBoundsOf()
  if (!b) return
  cancelIntro?.()
  map.flyToBounds(b, { paddingTopLeft: [24, 74], paddingBottomRight: [24, 24], duration: 0.7 })
}

/** 城市底色：本分类下有项目的市按数量着色，其余为中性米灰 */
function cityStyle(name: string): L.PathOptions {
  const count = cityCount.value.get(shortName(name)) ?? 0
  if (!count) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.9, color: NO_DATA_BORDER(), weight: 1, opacity: 1 }
  }
  return {
    fillColor: heatColor(count, 0, maxCityCount.value),
    fillOpacity: 0.92,
    color: themeAccentAlpha(0.45),
    weight: 1.2,
    opacity: 0.7,
  }
}

const TIP_LIMIT = 10

function cityTooltip(name: string): string {
  const items = cityItems(name)
  if (!items.length) {
    return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div>
      <div class="sd-tip-none">${t('本分类下暂无项目')}</div></div>`
  }
  const rows = items.slice(0, TIP_LIMIT)
    .map((h) => `<div class="sd-tip-row"><span>${t(h.category)}</span><b>${tv(h.name)}</b></div>`)
    .join('')
  const more = items.length > TIP_LIMIT
    ? `<div class="sd-tip-none">${t('…本分类共 {n} 项，点开城市查看全部', { n: items.length })}</div>`
    : ''
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(name)}<span class="sd-tip-tag">${t('非遗 {n} 项', { n: items.length })}</span></div>
    ${rows}${more}
    <div class="sd-tip-none">${t('单击该市：切换分析范围并细分县区')}</div>
  </div>`
}

/**
 * 「申报地区」→ 县区中心：在所属市的县区清单里找出现在申报地区文本中的县区名。
 *
 * 优先取全名匹配（「梁山县」），没有全名匹配时退回去掉「县/市/区」的短名（「东阿」），
 * 多个命中取名字最长的那个，避免「临邑县」被「临邑」以外的短名抢走。
 */
function countyCenterOf(h: HeritageRecord): CountyCenter | null {
  if (!h.city) return null
  const list = CITY_COUNTIES[h.city as ShandongCity] ?? []
  const area = h.area
  const full = list.filter((c) => area.includes(c.name))
  if (full.length) return full.reduce((a, b) => (a.name.length >= b.name.length ? a : b))
  const partial = list.filter((c) => {
    const bare = c.name.replace(/[县市区]$/, '')
    return bare.length >= 2 && area.includes(bare)
  })
  return partial.length ? partial.reduce((a, b) => (a.name.length >= b.name.length ? a : b)) : null
}

/** 县区 → 项目数（按申报地区归属，真实名录口径） */
function countyCountOf(city: string, county: string): number {
  return filteredList.value.filter((h) => h.city === city && countyCenterOf(h)?.name === county).length
}

// ===== 县区项目分布点位：圆点大小 = 该县区项目数（省级视野下也能看到县区粒度） =====
let bubbleLayer: L.LayerGroup | null = null

/** 当前筛选（范围/分类/搜索）下按县区聚合的项目：只统计能按申报地区归到县区的项目 */
const countyGroups = computed(() => {
  const groups = new Map<string, { city: string; county: string; lng: number; lat: number; items: HeritageRecord[] }>()
  filteredList.value.forEach((h) => {
    if (!h.city) return
    const center = countyCenterOf(h)
    if (!center) return
    const key = `${h.city}|${center.name}`
    const g = groups.get(key) ?? { city: h.city, county: center.name, lng: center.lng, lat: center.lat, items: [] }
    g.items.push(h)
    groups.set(key, g)
  })
  return [...groups.values()]
})

/** 圆点半径：按项目数分档（1 项最小，5 项及以上封顶） */
function bubbleRadius(count: number): number {
  return 4.5 + Math.min(4, count - 1) * 1.8
}

function bubblePopupHtml(g: { city: string; county: string; items: HeritageRecord[] }, total: number): string {
  const rows = g.items.slice(0, 8)
    .map((h) => `<div class="sd-popup-row"><span>${t(h.category)}</span><b>${tv(h.name)}</b></div>`)
    .join('')
  const more = g.items.length > 8
    ? `<div class="sd-popup-row"><span>${t('其余')}</span><b>${t('{n} 项，见左侧列表', { n: g.items.length - 8 })}</b></div>`
    : ''
  const share = total ? ((g.items.length / total) * 100).toFixed(1) : '0.0'
  return `<div class="sd-popup">
    <div class="sd-popup-title">${tv(g.county)}<span class="sd-tip-tag">${t('{city}市', { city: g.city })}</span></div>
    <div class="sd-popup-row"><span>${t('国家级非遗')}</span><b>${t('{n} 项', { n: g.items.length })}</b></div>
    <div class="sd-popup-row"><span>${t('占范围项目')}</span><b>${share}%</b></div>
    ${rows}${more}
    <div class="sd-popup-desc">${t('按名录「申报地区」归属到县区，圆点大小 = 项目数（仅统计能归到县区的项目）；点左侧清单里的项目可定位到该县区。')}</div>
  </div>`
}

/** 圆点层重建：分类/搜索/范围变化后调用（县区在几十个量级，全量重建够用） */
function syncBubbles() {
  const map = mapInst.value
  if (!map) return
  if (bubbleLayer) map.removeLayer(bubbleLayer)
  const groups = countyGroups.value
  if (!groups.length) { bubbleLayer = null; return }
  const color = themeColors()[5]
  const total = groups.reduce((s, g) => s + g.items.length, 0)
  const group = L.layerGroup()
  groups.forEach((g) => {
    const marker = L.circleMarker([g.lat, g.lng], {
      // className 只在创建时生效，放进选项里给「全国视野下整体隐藏」的样式用；
      // sd-px-dot：像素半径圆点在缩放动画期间隐去、落位后渐显（见 MapContainer 的 bindPixelDotFade）
      className: 'sd-bubble sd-px-dot',
      radius: bubbleRadius(g.items.length),
      fillColor: color,
      fillOpacity: 0.45,
      color,
      weight: 1.6,
      opacity: 0.9,
    })
    marker.bindTooltip(t('{county} · {city}市 · 非遗 {n} 项', { county: g.county, city: g.city, n: g.items.length }), {
      className: 'sd-tooltip', direction: 'top', offset: [0, -4],
    })
    // 悬停置顶：相邻县区的圆点重叠时也能明确点到自己
    marker.on('mouseover', () => marker.bringToFront())
    marker.bindPopup(bubblePopupHtml(g, total), { offset: [0, -4], maxWidth: 280 })
    marker.addTo(group)
  })
  bubbleLayer = group
  group.addTo(map)
}

/** 配图模式：'image' 用配图顶掉弹窗里的文字简介（左侧「查看图片」进入） */
type PopupMode = 'text' | 'image'

interface ItemImageView {
  /** 实景/代表图 */
  real?: string
  /** AI 生成配图 */
  ai?: string
  /** 只有 AI 图（没有实景图）时列表按钮与角标都要标注 */
  onlyAi: boolean
}

/** id → 配图：映射是静态对象，缓存一层避免模板每帧重建对象 */
const IMG_VIEWS = new Map<string, ItemImageView>()
function itemImage(id: string): ItemImageView | null {
  const raw = HERITAGE_ITEM_IMAGES[id]
  if (!raw || (!raw.real && !raw.ai)) return null
  let view = IMG_VIEWS.get(id)
  if (!view) {
    view = { real: raw.real, ai: raw.ai, onlyAi: !raw.real && !!raw.ai }
    IMG_VIEWS.set(id, view)
  }
  return view
}

/** 配图块：默认摆实景代表图；只有 AI 图时直接标注；两种都有时给「看 AI 配图」切换。
 *  data-zoom-caption 供全局双击放大（ImageZoomHost）取图注，切换时同步更新 */
function figureHtml(h: HeritageRecord, img: ItemImageView): string {
  const ai = !img.real
  const badge = ai ? t('AI 生成') : ''
  const capText = ai ? t('AI 生成 · 仅作示意') : t('实景图')
  return `<div class="sd-popup-figure" data-name="${h.name}" data-real="${img.real ?? ''}" data-ai="${img.ai ?? ''}" data-ai-now="${ai ? '1' : ''}">
    <img class="sd-popup-img" src="${img.real ?? img.ai ?? ''}" alt="${t('{name}项目配图', { name: h.name })}" title="${t('双击放大查看')}" data-zoom-caption="${capText}" loading="lazy" />
    <span class="sd-popup-ai${ai ? ' show' : ''}">${badge}</span>
    <div class="sd-popup-fig-foot">
      <span class="sd-popup-cap">${capText}</span>
      ${img.real && img.ai ? `<button class="sd-popup-switch" type="button">${t('看 AI 配图')}</button>` : ''}
    </div>
  </div>`
}

/** 实景图 ↔ AI 配图就地切换：只改图片与标注，弹窗不重开、地图不重飞 */
function bindFigureSwitch(el: HTMLElement) {
  const box = el.querySelector<HTMLElement>('.sd-popup-figure')
  const pic = box?.querySelector<HTMLImageElement>('.sd-popup-img')
  const tag = box?.querySelector<HTMLElement>('.sd-popup-ai')
  const cap = box?.querySelector<HTMLElement>('.sd-popup-cap')
  const btn = box?.querySelector<HTMLButtonElement>('.sd-popup-switch')
  if (!box || !pic || !tag || !cap || !btn) return
  btn.addEventListener('click', () => {
    const toAi = box.dataset.aiNow !== '1'
    const next = (toAi ? box.dataset.ai : box.dataset.real) ?? ''
    if (!next) return
    box.dataset.aiNow = toAi ? '1' : ''
    pic.src = next
    tag.classList.toggle('show', toAi)
    // AI 图必须挂着「AI 生成」标注，实景图则标明出处，避免两者混淆
    tag.textContent = toAi ? t('AI 生成') : ''
    cap.textContent = toAi ? t('AI 生成 · 仅作示意') : t('实景图')
    // 双击放大读的是这个属性，切换后别让图注停在旧值
    pic.dataset.zoomCaption = toAi ? t('AI 生成 · 仅作示意') : t('实景图')
    btn.textContent = toAi ? t('看实景图') : t('看 AI 配图')
  })
}

/** 弹窗顶边给地图标题浮层留的余量（.map-headline 占地图上沿 14~52px） */
const POPUP_TOP_RESERVE = 64
let popupSettleTimer = 0

/** 把弹窗按进可视区：弹窗自锚点向上生长，顶边被标题压住就整体下推，底部越界再收回 */
function settlePopup(map: L.Map, popup: L.Popup) {
  const box = popup.isOpen() ? popup.getElement() : undefined
  if (!box) return
  const m = map.getContainer().getBoundingClientRect()
  const b = box.getBoundingClientRect()
  const dy = b.top < m.top + POPUP_TOP_RESERVE
    ? m.top + POPUP_TOP_RESERVE - b.top
    : (b.bottom > m.bottom - 12 ? m.bottom - 12 - b.bottom : 0)
  if (Math.abs(dy) < 2) return
  // panBy 传的是视野位移：视野往上提，弹窗在地图上就往下走
  map.panBy([0, -dy], { animate: true, duration: 0.25 })
}

/** 视野稳住后再摆弹窗：飞行动画途中量出来的位置不作数，且 Leaflet 自带的 autoPan 也按旧视野算 */
function schedulePopupSettle(map: L.Map, popup: L.Popup) {
  window.clearTimeout(popupSettleTimer)
  const run = () => settlePopup(map, popup)
  // 视野不动时（同一项重复点开）没有 moveend，用兜底定时器
  popupSettleTimer = window.setTimeout(run, 800)
  map.once('moveend', () => {
    window.clearTimeout(popupSettleTimer)
    run()
    // 摆位本身会再推一次视野，跟一次确保收敛
    map.once('moveend', run)
  })
}

/** 左侧列表点选：直接定位到申报县区（名称取自「申报地区」文本），并打开项目弹窗 */
function openHeritagePopup(h: HeritageRecord, target?: L.LatLngExpression, mode: PopupMode = 'text') {
  const map = mapInst.value
  if (!map) return
  const ll = target ?? heritageCoords.get(h.id)
  // 7 项由省级单位申报、名录未标注市县，没有市级坐标：落点用省域视野中心，弹窗里写明
  const center = countyCenterOf(h)
  const point: L.LatLngExpression = ll ?? map.getCenter()
  const el = document.createElement('div')
  el.className = 'sd-popup'
  // 「查看图片」进入的图片模式：配图顶掉原文字简介；名录里两张图都没有时仍退回文字
  const img = mode === 'image' ? itemImage(h.id) : null
  // 简介可能上百字，先整段译好再截断，避免截在译文中间
  const desc = h.desc ? tv(h.desc) : ''
  el.innerHTML = `<div class="sd-popup-title">${tv(h.name)}<span class="sd-tip-tag">${t(h.category)}</span></div>
    <div class="sd-popup-row"><span>${t('名录批次')}</span><b>${t(h.batch)}（${h.batchYear}）</b></div>
    <div class="sd-popup-row"><span>${t('名录编号')}</span><b>${h.num}</b></div>
    <div class="sd-popup-row"><span>${t('申报地区')}</span><b>${tv(h.area)}</b></div>
    ${center ? `<div class="sd-popup-row"><span>${t('定位县区')}</span><b>${t('{city}市 {county}', { city: h.city ?? '', county: center.name })}</b></div>` : ''}
    <div class="sd-popup-row"><span>${t('保护单位')}</span><b>${tv(h.protectUnit || '—')}</b></div>
    <div class="sd-popup-row"><span>${t('项目类型')}</span><b>${t(h.categoryKind)}</b></div>
    ${img ? figureHtml(h, img) : `<div class="sd-popup-desc">${desc ? (desc.length > 110 ? desc.slice(0, 110) + '…' : desc) : t('名录未提供项目简介')}</div>`}
    ${ll ? '' : `<div class="sd-popup-note">${t('该项目由省级单位申报，名录未标注市县，此处仅示省域范围')}</div>`}`
  if (img) bindFigureSwitch(el)
  // 自己摆位（关掉 autoPan）：Leaflet 的 autoPan 在飞行动画里按旧视野算偏移，
  // 会把弹窗顶到地图上沿——标题被裁掉，右上角关闭按钮也点不到
  const popup = L.popup({ offset: [0, -8], maxWidth: 300, autoPan: false }).setLatLng(point).setContent(el)
  popup.openOn(map)
  schedulePopupSettle(map, popup)
}

/** 山东行政区底图：各市项目数着色 + 常驻市名（本分类下无记录的市只显示市名） */
function buildChoropleth(fc: AdminCityFeatureCollection): L.GeoJSON {
  // className / keyboard 是 Path 选项而非 GeoJSONOptions 的声明字段，但 Leaflet 会把整份
  // 选项透传给每个多边形（geometryToLayer → new Polygon(latlngs, options)），断言一次让类型放行
  const options = {
    pane: 'sd-heat',
    className: 'sd-grow-city',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) => cityStyle(String(feature?.properties?.name ?? '')),
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      const path = featLayer as L.Path
      cityLayers.set(shortName(name), path as L.Polygon)
      // 内容用函数：分类/范围切换后重新悬停时直接读到最新数据，无需重绑
      featLayer.bindTooltip(() => cityTooltip(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -4],
        sticky: true,
      })
      // 飞行未结束时按下/抬起会落在不同元素上（浏览器把 click 判给公共祖先，图层收不到），
      // 用按下/抬起配对识别兜住；紧随其后的真 click 由识别器内部去重
      pickCity?.(featLayer, name)
      featLayer.on('mouseover', () => {
        path.setStyle({ weight: 2.4, color: mapFocusColor(), opacity: 1, fillOpacity: 1 })
        path.bringToFront()
      })
      featLayer.on('mouseout', () => path.setStyle(cityStyle(name)))
    },
  } as unknown as L.GeoJSONOptions
  return L.geoJSON(fc as unknown as GeoJsonObject, options)
}

/** 市名标注：当前分类下有线目的市额外显示数量 */
function buildLabelLayer(fc: AdminCityFeatureCollection): L.LayerGroup {
  const group = L.layerGroup()
  fc.features.forEach((f) => {
    const name = f.properties.name
    const count = cityCount.value.get(shortName(name)) ?? 0
    const [lng, lat] = f.properties.centroid
    // 深色填充的市改用浅色字（按实际填充色的明暗判断），保证米白主题下的可读性
    const onDeep = count > 0 && isDeepColor(heatColor(count, 0, maxCityCount.value))
    const label = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'sd-city-label',
        html: count
          ? `<div class="sd-city-label-inner hot${onDeep ? ' on-deep' : ''}">
               <span class="sd-city-name">${t(shortName(name))}</span>
               <span class="sd-city-heat">${t('{n} 项', { n: count })}</span>
             </div>`
          : `<div class="sd-city-label-inner"><span class="sd-city-name">${t(shortName(name))}</span></div>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 600,
    })
    label.addTo(group)
  })
  return group
}

let adminCities: AdminCityFeatureCollection | null = null

/** 左侧分类/搜索变化：热力着色与市名数量同步刷新（县界细分也要跟着重算项目数） */
function syncCategory() {
  const map = mapInst.value
  if (!map || !choropleth || !adminCities) return
  choropleth.setStyle((feature) => cityStyle(String(feature?.properties?.name ?? '')))
  labelLayer?.removeFrom(map)
  labelLayer = buildLabelLayer(adminCities)
  labelLayer.addTo(map)
  scheduleCountyLayer()
}

// ===== 单市范围下的县界细分：县区项目数取自真实名录（按申报地区归属） =====
// 县界用白色虚线：压在同色系市域填充上也能一眼看出细分（实线白 = 市界，虚线白 = 县界）
function countyStyle(count: number, max: number): L.PathOptions {
  if (!count) {
    return { fillColor: NO_DATA_COLOR(), fillOpacity: 0.72, color: '#FFFFFF', weight: 1.2, opacity: 0.75, dashArray: '4 3' }
  }
  return {
    fillColor: heatColor(count, 0, Math.max(1, max)),
    fillOpacity: 0.85,
    color: '#FFFFFF',
    weight: 1.3,
    opacity: 0.9,
    dashArray: '4 3',
  }
}

function countyTooltip(county: string, city: string, count: number, total: number): string {
  const share = total ? ((count / total) * 100).toFixed(1) : '0.0'
  return `<div class="sd-tip">
    <div class="sd-tip-name">${tv(county)}<span class="sd-tip-tag">${t('{city}市', { city })}</span></div>
    <div class="sd-tip-row"><span>${t('国家级非遗')}</span><b>${t('{n} 项', { n: count })}</b></div>
    <div class="sd-tip-row"><span>${t('占全市')}</span><b>${share}%</b></div>
    <div class="sd-tip-none">${t('按名录「申报地区」归属到县区（真实名录口径）')}</div>
  </div>`
}

function clearCountyLayer() {
  const map = mapInst.value
  countyToken += 1
  if (countyGroup && map) map.removeLayer(countyGroup)
  countyGroup = null
}

/** 范围为单个城市时才铺县界：整层重建，避免残留上一个市的县区 */
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
  // 请求期间范围又变了（连点多个市）：这次结果作废
  if (token !== countyToken || !mapInst.value) return
  if (countyGroup) mapInst.value.removeLayer(countyGroup)

  const counts = new Map(fc.features.map((f) => [f.properties.name, countyCountOf(city, f.properties.name)]))
  const total = [...counts.values()].reduce((s, v) => s + v, 0)
  const max = Math.max(1, ...counts.values())
  const group = L.layerGroup()
  const options = {
    pane: 'sd-county',
    // className 只在图层创建时生效（Leaflet 的 _updateStyle 不管它），统一在这里给
    className: 'sd-grow',
    keyboard: false,
    style: (feature?: { properties?: { name?: string } }) =>
      countyStyle(counts.get(String(feature?.properties?.name ?? '')) ?? 0, max),
    onEachFeature: (feature: { properties?: { name?: string } }, featLayer: L.Layer) => {
      const name = String(feature?.properties?.name ?? '')
      featLayer.bindTooltip(countyTooltip(name, city, counts.get(name) ?? 0, total), {
        className: 'sd-tooltip', direction: 'top', offset: [0, -4], sticky: true,
      })
    },
  } as unknown as L.GeoJSONOptions
  L.geoJSON(fc as unknown as GeoJsonObject, options).addTo(group)
  countyGroup = group
  group.addTo(mapInst.value)
}

/** 视野与县界都跟着范围走：延迟一拍，等 scope 派生都刷新完再取数 */
function scheduleCountyLayer() {
  if (countyTimer) clearTimeout(countyTimer)
  countyTimer = setTimeout(() => { void syncCountyLayer() }, 0)
}

async function setupHeritageMap(map: L.Map) {
  const [national, res] = await Promise.all([
    setupNationalBase(map),
    fetch(`${import.meta.env.BASE_URL}shandong.json`),
  ])
  if (!res.ok) throw new Error(t('行政区划数据加载失败：{n}', { n: res.status }))
  const fc = (await res.json()) as AdminCityFeatureCollection
  adminCities = fc

  // 图面只留热力图：全国底图打底 + 山东分市热力着色 + 黄河干流 + 市名数量 + 县区项目分布点
  choropleth = buildChoropleth(fc)
  choropleth.addTo(map)
  labelLayer = buildLabelLayer(fc)
  labelLayer.addTo(map)
  // 黄河流向图：省外段只作上下文，山东段双层描边；常驻流动，无入场画出动画
  riverLayer = buildYellowRiverLayer()
  bindRiverZoomEmphasis(map, riverLayer)
  riverLayer.addTo(map)
  syncBubbles()

  // 全国底图 + 山东聚焦：可拖拽范围覆盖全国，但打开时由远及近落到山东
  focusBounds = choropleth.getBounds()
  map.setMaxBounds(national.bounds.pad(0.2))
  cancelIntro = playNationalIntro(map, {
    china: national.bounds,
    focus: focusBounds,
    paddingTopLeft: [24, 74],
    paddingBottomRight: [24, 24],
    // 推近时长与首页取齐（0.75s）
    duration: 750,
  })
  // 默认范围（潍坊）的县界先铺好：入场落位时就是「分市着色 + 该市县区」视图
  scheduleCountyLayer()
}

function onMapReady(map: L.Map) {
  mapInst.value = map
  // 市级热力（380）→ 黄河干流（385）→ 县区细分（390）→ 标注（600）：
  // 河道压在填色之上、县区气泡与标注之下
  map.createPane('sd-heat')
  map.createPane('sd-county')
  ;(map.getPane('sd-heat') as HTMLElement).style.zIndex = '380'
  ;(map.getPane('sd-county') as HTMLElement).style.zIndex = '390'
  ensureRiverPane(map, 385)
  // 全国视野下隐藏市名标注，飞入山东后再显示
  bindCityLabelZoom(map)
  // 地市点击：按下/抬起配对识别（飞行动画途中点别的市也能立刻切过去，见 config/cityPick.ts）
  pickCity = createPressPicker<string>(map, (name) => onClickCity(name))
  setupHeritageMap(map).catch((err) => console.error(err))
}

function selectHeritage(id: string, mode: PopupMode = 'text') {
  selectedId.value = id
  const h = heritageItems.find(item => item.id === id)
  if (!h) return
  const map = mapInst.value
  if (!map) return
  // 用户主动定位优先于入场动画
  cancelIntro?.()
  // 1) 优先按「申报地区」定位到县区中心：县区粒度才是需求里的「具体到各县市」
  const county = countyCenterOf(h)
  if (county) {
    // 缩放 9 = 县区级视野：能看清所属县与相邻县界，又不会放大到只剩街道；飞行时长与首页取齐（0.7s）
    map.flyTo([county.lat, county.lng], 9, { duration: 0.7 })
    openHeritagePopup(h, [county.lat, county.lng], mode)
    return
  }
  // 2) 名录只给到市级（或市级近似坐标）：退到市级点位
  const ll = heritageCoords.get(h.id)
  if (ll) {
    map.flyTo(ll, 9, { duration: 0.7 })
  } else if (focusBounds) {
    // 3) 省级申报项目没有市县坐标，退到省域视野，弹窗里写明
    map.flyToBounds(focusBounds, { duration: 0.7, padding: [24, 24] })
  }
  openHeritagePopup(h, undefined, mode)
}

watch(filteredList, () => {
  syncCategory()
  syncBubbles()
  // 选中项被筛掉时，自动落到列表首项，避免高亮丢失
  const list = filteredList.value
  if (list.length && !list.some((h) => h.id === selectedId.value)) {
    selectedId.value = list[0].id
  }
})

watch(scope, () => {
  // 范围切换后原分类可能在新范围内 0 条：退回「全部」，避免空列表（其余刷新交给上面的监听）
  if (category.value !== '全部' && !categoryTabs.value.find((c) => c.name === category.value)?.count) {
    category.value = '全部'
  }
  // 县界细分与视野跟着新范围走
  scheduleCountyLayer()
  flyToScope()
})

/** 换语言：市名/县区标注与气泡、弹窗都是建层时拼好的 HTML，整层重建换字（不重播入场动画） */
watch(locale, () => {
  mapInst.value?.closePopup()
  syncCategory()
  syncBubbles()
  scheduleCountyLayer()
})
</script>

<style scoped>
.heritage-page {
  height: calc(100vh - 56px - 32px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.main-row {
  flex: 1;
  display: flex;
  gap: 14px;
  min-height: 0;
}

/* 左侧列表 */
.left-list {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  background: var(--gradient-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.list-search {
  padding: 10px 10px 0;
}
.list-search input {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  outline: none;
}
.list-search input:focus {
  border-color: var(--color-gold);
}
.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
}
.cat-tab {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
}
.cat-count {
  margin-left: 4px;
  font-size: 10px;
  font-style: normal;
  color: var(--text-muted);
}
.cat-tab.active .cat-count { color: rgba(27, 58, 92, 0.75); }
.cat-tab.active {
  background: var(--gradient-gold);
  color: #1B3A5C;
  border-color: transparent;
  font-weight: 600;
}
.heritage-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.list-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 6px;
  font-size: 11px;
  color: var(--text-muted);
}
.list-hint { color: var(--text-gold); }
.heritage-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
}
.heritage-item:hover { background: var(--bg-card-hover); }
.heritage-item.selected {
  background: rgba(var(--rgb-gold), 0.12);
  border-color: var(--color-gold);
}
.item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.item-name {
  min-width: 0;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 「查看图片」：平时低调，悬停/选中行里才提亮，避免列表被按钮抢注意力 */
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
.item-img-btn:hover {
  color: var(--text-gold);
  border-color: var(--color-gold);
  background: rgba(var(--rgb-gold), 0.1);
}
.heritage-item.selected .item-img-btn { color: var(--text-gold); border-color: rgba(var(--rgb-gold), 0.55); }
/* 只有 AI 配图的项目：按钮上直接带 AI 字样，点开即标注 */
.item-img-btn.ai::after {
  content: 'AI';
  padding: 0 3px;
  font-size: 9px;
  line-height: 14px;
  color: #FFFFFF;
  background: rgba(var(--rgb-gold), 0.85);
  border-radius: 3px;
}
.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-meta .tag {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-era { font-size: 11px; color: var(--text-muted); }
.item-area {
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧 */
.right-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.map-half {
  /* 右侧只有地图：吃掉整列高度 */
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

/* ===== 地图浮层 ===== */
.map-headline {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  text-align: center;
  pointer-events: none;
}
.headline-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  /* 直接压在米白底图上，取比 --text-gold 更深的金棕以保证可读性 */
  color: var(--map-title);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.9);
}
.headline-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
}

.map-legend {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 1100;
  width: 244px;
  padding: 9px 12px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-card);
}
.legend-head {
  font-size: 12px;
  color: var(--text-gold);
  margin-bottom: 6px;
}
.legend-bar {
  height: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}
.legend-axis {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.legend-hint { display: inline-flex; align-items: center; gap: 3px; color: var(--text-muted); }
.legend-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
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
.legend-source {
  display: block;
  line-height: 1.5;
  /* 数据来源是补充说明，压到最小可读字号，不跟色阶抢视线 */
  font-size: 10px;
}
/* 县区项目分布点的大小图例：两个圆点示意「小 = 少、大 = 多」 */
.legend-bubble-foot { gap: 4px; }
.legend-bubble {
  display: inline-block;
  border-radius: 50%;
  background: var(--map-title);
  opacity: 0.5;
  border: 1px solid var(--map-title);
}
.legend-bubble.small { width: 8px; height: 8px; }
.legend-bubble.big { width: 15px; height: 15px; }

/* ===== 市名标注（内容由 Leaflet 注入，需 :deep 穿透作用域） ===== */
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
  line-height: 1.3;
  pointer-events: none;
}
:deep(.sd-city-label-inner .sd-city-name) {
  font-size: 11px;
  color: var(--map-label-name);
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-city-label-inner .sd-city-heat) {
  font-size: 11px;
  font-weight: 700;
  color: var(--map-label-value);
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.95), 0 1px 2px rgba(255, 255, 255, 0.9);
}
:deep(.sd-city-label-inner.hot .sd-city-name) {
  font-size: 12px;
  color: var(--map-label-hot);
}
:deep(.sd-city-label-inner.on-deep .sd-city-name),
:deep(.sd-city-label-inner.on-deep .sd-city-heat) {
  color: #FFFFFF;
  text-shadow: var(--map-label-strong-shadow);
}
/* 全国视野下地市标注会挤成一团，飞入山东后再显示 */
:deep(.sd-far-view .sd-city-label) { display: none; }
/* 全国视野下县区分布点同样收起：一堆圆点铺在全国图上只会糊成一片 */
:deep(.sd-far-view .sd-bubble) { display: none; }

/* 悬停提示 / 弹窗 */
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
  line-height: 1.8;
  color: var(--text-secondary);
}
:deep(.sd-tip-row b) {
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
:deep(.sd-popup-desc) {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-light);
  max-width: 276px;
  font-size: 11px;
  line-height: 1.65;
  color: var(--text-secondary);
}
/* 配图区：顶掉文字简介的位置，尺寸与 .sd-popup-desc 同宽，弹窗高度不跳 */
:deep(.sd-popup-figure) {
  position: relative;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--border-light);
  width: 276px;
}
:deep(.sd-popup-img) {
  display: block;
  width: 276px;
  height: 184px;
  object-fit: cover;
  border-radius: 5px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  cursor: zoom-in;
}
/* AI 标记：只在看 AI 图时出现，压在图片右上角 */
:deep(.sd-popup-ai) {
  display: none;
  position: absolute;
  top: 12px;
  right: 6px;
  padding: 1px 6px;
  font-size: 10px;
  line-height: 16px;
  letter-spacing: 0.4px;
  color: #FFFFFF;
  background: rgba(22, 24, 28, 0.62);
  border-radius: 4px;
}
:deep(.sd-popup-ai.show) { display: block; }
:deep(.sd-popup-fig-foot) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-muted);
}
:deep(.sd-popup-switch) {
  flex-shrink: 0;
  padding: 1px 7px;
  font-size: 11px;
  color: var(--text-gold);
  background: rgba(var(--rgb-gold), 0.1);
  border: 1px solid rgba(var(--rgb-gold), 0.4);
  border-radius: 4px;
  cursor: pointer;
}
:deep(.sd-popup-switch:hover) { background: rgba(var(--rgb-gold), 0.18); }
:deep(.sd-popup-note) {
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-gold);
}
</style>
