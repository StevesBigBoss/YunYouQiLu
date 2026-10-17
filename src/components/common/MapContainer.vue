<template>
  <div class="map-container-wrapper" :class="{ 'satellite-mode': props.tileType === 'satellite' }">
    <div ref="mapRef" class="map-inner"></div>
    <div v-if="props.tileType === 'satellite'" class="map-satellite-mask"></div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { locale } from '../../config/i18n'

const props = withDefaults(defineProps<{
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  scrollWheelZoom?: boolean
  tileType?: 'vector' | 'satellite'
  /** 为 false 时不加载瓦片底图，用于行政区划风格地图 */
  baseMap?: boolean
  /** baseMap 为 false 时的地图底色（CSS background 值） */
  baseBackground?: string
  /** 缩放步进，行政区划地图可用 0.25 获得更贴合的初始视野 */
  zoomSnap?: number
}>(), {
  center: () => [36.5, 117.5],
  zoom: 6,
  minZoom: 3,
  maxZoom: 5,
  scrollWheelZoom: true,
  tileType: 'vector',
  baseMap: true,
  baseBackground: 'radial-gradient(ellipse at 50% 42%, #12304F 0%, #0B1B2E 46%, #060E1A 100%)',
  zoomSnap: 1,
})

const emit = defineEmits<{
  (e: 'ready', map: L.Map): void
}>()

const mapRef = ref<HTMLDivElement>()
let mapInstance: L.Map | null = null
let tileLayerRef: L.TileLayer | null = null

/**
 * 底图瓦片的高德只提供中英两套标注（lang=zh_cn / lang=en）：瓦片是位图，没法逐字翻译。
 * 简体/繁体中文用中文标注，其余语言一律取英文标注，地图上的地名跟着界面语言走。
 */
const tileLang = computed(() => (locale.value === 'zh-CN' || locale.value === 'zh-TW' ? 'zh_cn' : 'en'))

function tileUrl(lang: string): string {
  return props.tileType === 'satellite'
    // 卫星影像底图：无道路线、无文字标注，符合“删除道路”需求
    ? `https://wprd0{s}.is.autonavi.com/appmaptile?lang=${lang}&size=1&scale=2&style=6&x={x}&y={y}&z={z}`
    // 浅色矢量底图：使用高德地图瓦片（国内可访问、无需 API Key），scale=2 高清瓦片提升文字与地图清晰度
    : `https://webrd0{s}.is.autonavi.com/appmaptile?lang=${lang}&size=1&scale=2&style=8&x={x}&y={y}&z={z}`
}

function addTileLayer(map: L.Map, lang: string) {
  tileLayerRef = L.tileLayer(tileUrl(lang), {
    subdomains: '1234',
    maxZoom: 18,
  }).addTo(map)
}

function initMap() {
  if (!mapRef.value) return
  mapInstance = L.map(mapRef.value, {
    center: props.center,
    zoom: props.zoom,
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
    zoomSnap: props.zoomSnap,
    scrollWheelZoom: props.scrollWheelZoom,
    doubleClickZoom: true,
    dragging: true,
    zoomControl: false,
    attributionControl: false,
  })

  if (!props.baseMap) {
    // 行政区划风格：用纯色/渐变替代瓦片，内联 + important 以覆盖全局 .leaflet-container 背景
    mapInstance.getContainer().style.setProperty('background', props.baseBackground, 'important')
  } else {
    addTileLayer(mapInstance, tileLang.value)
  }

  // 缩放按钮放到右下角
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  bindPixelDotFade(mapInstance)

  emit('ready', mapInstance)
}

// 切语言后底图换标注语言：整层替换（旧的先去掉再上新层）
watch(tileLang, (lang) => {
  if (!mapInstance || !props.baseMap) return
  if (tileLayerRef) mapInstance.removeLayer(tileLayerRef)
  addTileLayer(mapInstance, lang)
})

let showDotFrame = 0

/**
 * 缩放动画期间收起「像素尺寸」的图元（白芯蓝环的小圆点这类，路径上带 sd-px-dot）。
 *
 * Leaflet 的缩放松开是把整块 SVG 按缩放比例放大：矢量位置是对的，但像素半径的小圆点会跟着
 * 一起胀大，落位重投影才缩回来——观感上就是「放大那一瞬间圆点变成大圆圈、随后弹回」。
 * 这里动画期间给地图容器挂上 sd-zooming，样式里把这批图元隐去；落位后摘掉，
 * 由样式里的透明度过渡渐显，观感是「缩放时先收起来，稳住之后再淡入」。
 */
function bindPixelDotFade(map: L.Map) {
  const container = map.getContainer()
  let settledZoom = map.getZoom()

  const hide = () => {
    window.cancelAnimationFrame(showDotFrame)
    container.classList.add('sd-zooming')
  }
  const show = () => {
    window.cancelAnimationFrame(showDotFrame)
    // 晚一帧再摘：zoomend 这一轮里 Leaflet 才做重投影与视角换算，早摘会露出还没归位的图元
    showDotFrame = window.requestAnimationFrame(() => container.classList.remove('sd-zooming'))
  }

  map.on('zoomstart', hide)
  // flyTo 与入场推近都是逐帧 _move：只广播 zoom/move、不发 zoomstart，这里按缩放值补一刀
  map.on('zoom', () => {
    if (Math.abs(map.getZoom() - settledZoom) > 1e-6) hide()
  })
  map.on('zoomend viewreset', () => {
    settledZoom = map.getZoom()
    show()
  })
  map.on('moveend', show)
}

// 暴露地图实例给父组件
defineExpose({
  getMap: () => mapInstance,
  invalidateSize: () => mapInstance?.invalidateSize(),
})

watch(() => props.center, (val) => {
  mapInstance?.setView(val, mapInstance.getZoom())
})

onMounted(() => {
  initMap()
  // 延迟刷新尺寸，确保容器已渲染
  setTimeout(() => mapInstance?.invalidateSize(), 100)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(showDotFrame)
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
.map-container-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.map-inner {
  width: 100%;
  height: 100%;
}
/* 瓦片加载动画期间避免白屏闪烁 */
.map-container-wrapper :deep(.leaflet-tile) {
  transition: opacity 0.2s;
}
/* 点击地市/县区后浏览器会给可聚焦的 SVG 图元画一圈默认焦点框（看着像黑方框）：
   各图层已统一 keyboard:false，这里再兜一层，两种途径都保证点完不留框 */
.map-container-wrapper :deep(svg path:focus) {
  outline: none;
}
/* 悬停微放大：以图元自身包围盒中心为原点，县区幅度略大于地市 */
.map-container-wrapper :deep(svg path.sd-grow),
.map-container-wrapper :deep(svg path.sd-grow-city) {
  transition: transform 0.18s ease-out;
  transform-box: fill-box;
  transform-origin: center;
}
/* 像素尺寸圆点：缩放动画期间收起（.sd-zooming 由 bindPixelDotFade 维护），落位后渐显。
   透明度只在「缩放中 ↔ 缩放后」这一处变化，不写死数值，图元自己的 opacity 选项不受影响 */
.map-container-wrapper :deep(svg path.sd-px-dot) {
  transition: opacity 0.42s ease-out 0.05s;
}
.map-container-wrapper :deep(.sd-zooming svg path.sd-px-dot) {
  opacity: 0;
  transition: none;
}
.map-container-wrapper :deep(svg path.sd-grow:hover) {
  transform: scale(1.03);
}
.map-container-wrapper :deep(svg path.sd-grow-city:hover) {
  transform: scale(1.02);
}
/* 视野飞行期间（sd-flying 由切范围运镜维护，见 chinaMap 的 flyScopeView）：图面是按整块 SVG 的
   CSS 缩放重绘的，这时的悬停放大跟底图不同步，两个图元轮廓会错开一瞬（鼠标点市时停在图上能看到，
   顶栏切换时鼠标在图外看不到）。飞行期间统一压掉悬停放大与过渡，落位后原样交还；
   只动样式不动交互，飞行途中按下的点选照旧生效。提示框在运镜里由 tooltipopen 收掉（同一处代码） */
.map-container-wrapper :deep(.leaflet-container.sd-flying svg path.sd-grow),
.map-container-wrapper :deep(.leaflet-container.sd-flying svg path.sd-grow-city) {
  transform: none;
  transition: none;
}
/* 卫星底图浅色化：提亮 + 降饱和 + 降低对比度，并叠加米白半透明遮罩 */
.map-satellite-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(247, 245, 240, 0.45);
  z-index: 500;
  pointer-events: none;
}
.map-container-wrapper.satellite-mode :deep(.leaflet-tile-pane) {
  filter: brightness(1.35) saturate(0.4) contrast(0.85);
}
</style>
