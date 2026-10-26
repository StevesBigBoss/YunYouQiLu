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
  baseMap?: boolean
  baseBackground?: string
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


const tileLang = computed(() => (locale.value === 'zh-CN' || locale.value === 'zh-TW' ? 'zh_cn' : 'en'))

function tileUrl(lang: string): string {
  return props.tileType === 'satellite'
    ? `https://wprd0{s}.is.autonavi.com/appmaptile?lang=${lang}&size=1&scale=2&style=6&x={x}&y={y}&z={z}`
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
    mapInstance.getContainer().style.setProperty('background', props.baseBackground, 'important')
  } else {
    addTileLayer(mapInstance, tileLang.value)
  }

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  bindPixelDotFade(mapInstance)

  emit('ready', mapInstance)
}


watch(tileLang, (lang) => {
  if (!mapInstance || !props.baseMap) return
  if (tileLayerRef) mapInstance.removeLayer(tileLayerRef)
  addTileLayer(mapInstance, lang)
})


let showDotFrame = 0

function bindPixelDotFade(map: L.Map) {
  const container = map.getContainer()
  let settledZoom = map.getZoom()

  const hide = () => {
    window.cancelAnimationFrame(showDotFrame)
    container.classList.add('sd-zooming')
  }
  const show = () => {
    window.cancelAnimationFrame(showDotFrame)
    showDotFrame = window.requestAnimationFrame(() => container.classList.remove('sd-zooming'))
  }

  map.on('zoomstart', hide)
  map.on('zoom', () => {
    if (Math.abs(map.getZoom() - settledZoom) > 1e-6) hide()
  })
  map.on('zoomend viewreset', () => {
    settledZoom = map.getZoom()
    show()
  })
  map.on('moveend', show)
}


defineExpose({
  getMap: () => mapInstance,
  invalidateSize: () => mapInstance?.invalidateSize(),
})


watch(() => props.center, (val) => {
  mapInstance?.setView(val, mapInstance.getZoom())
})

onMounted(() => {
  initMap()
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
.map-container-wrapper :deep(.leaflet-tile) {
  transition: opacity 0.2s;
}
.map-container-wrapper :deep(svg path:focus) {
  outline: none;
}
.map-container-wrapper :deep(svg path.sd-grow),
.map-container-wrapper :deep(svg path.sd-grow-city) {
  transition: transform 0.18s ease-out;
  transform-box: fill-box;
  transform-origin: center;
}
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
.map-container-wrapper :deep(.leaflet-container.sd-flying svg path.sd-grow),
.map-container-wrapper :deep(.leaflet-container.sd-flying svg path.sd-grow-city) {
  transform: none;
  transition: none;
}
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
