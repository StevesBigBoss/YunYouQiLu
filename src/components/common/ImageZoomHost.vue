<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ImageViewer from './ImageViewer.vue'
import type { ViewImage } from './ImageViewer.vue'
import { t } from '../../config/i18n'

const zoomed = ref<ViewImage | null>(null)

const MAP_INTERNAL = '.leaflet-tile-pane, .leaflet-marker-pane, .leaflet-shadow-pane, .leaflet-overlay-pane'

function onDblClick(e: MouseEvent) {
  const img = e.target
  if (!(img instanceof HTMLImageElement) || !img.src) return
  if (img.closest('.image-viewer') || img.closest(MAP_INTERNAL)) return

  e.preventDefault()
  e.stopPropagation()

  zoomed.value = {
    src: img.src,
    title: img.dataset.zoomTitle || img.alt || t('图片预览'),
    caption: img.dataset.zoomCaption ?? '',
    credit: img.dataset.zoomCredit ?? '',
  }
}

onMounted(() => document.addEventListener('dblclick', onDblClick, true))
onBeforeUnmount(() => document.removeEventListener('dblclick', onDblClick, true))
</script>

<template>
  <ImageViewer v-if="zoomed" :items="[zoomed]" :index="0" @close="zoomed = null" />
</template>
