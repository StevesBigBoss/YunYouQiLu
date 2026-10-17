<script setup lang="ts">
/**
 * 全局图片双击放大：页面上任意图片（美食/景区/文化遗产配图、图集缩略图、头像……）
 * 双击即用灯箱（ImageViewer）展开放大，点背景 / Esc 关闭。
 *
 * 图注优先取图片上的 data-zoom-title / data-zoom-caption / data-zoom-credit，
 * 没写就退回 alt 文本，再退回「图片预览」——所以各处配图想带上图注与署名，
 * 只要给 <img> 挂上这几个 data 属性即可。
 *
 * 两类图不接管：Leaflet 自己渲染的瓦片与标记（接管会顶掉地图的双击缩放）、
 * 以及灯箱里的大图本身（避免层层套娃）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ImageViewer from './ImageViewer.vue'
import type { ViewImage } from './ImageViewer.vue'
import { t } from '../../config/i18n'

/** 当前双击打开的图片；null = 灯箱未开 */
const zoomed = ref<ViewImage | null>(null)

/** Leaflet 内部图层：瓦片、标记、阴影、覆盖物都不参与双击放大 */
const MAP_INTERNAL = '.leaflet-tile-pane, .leaflet-marker-pane, .leaflet-shadow-pane, .leaflet-overlay-pane'

function onDblClick(e: MouseEvent) {
  const img = e.target
  if (!(img instanceof HTMLImageElement) || !img.src) return
  if (img.closest('.image-viewer') || img.closest(MAP_INTERNAL)) return

  // 接管后掐断事件，不让它继续冒泡到地图容器（Leaflet 的双击是缩放）
  e.preventDefault()
  e.stopPropagation()

  zoomed.value = {
    src: img.src,
    title: img.dataset.zoomTitle || img.alt || t('图片预览'),
    caption: img.dataset.zoomCaption ?? '',
    credit: img.dataset.zoomCredit ?? '',
  }
}

// 捕获阶段监听：比 Leaflet 挂在容器上的 dblclick 处理器先拿到事件
onMounted(() => document.addEventListener('dblclick', onDblClick, true))
onBeforeUnmount(() => document.removeEventListener('dblclick', onDblClick, true))
</script>

<template>
  <ImageViewer v-if="zoomed" :items="[zoomed]" :index="0" @close="zoomed = null" />
</template>
