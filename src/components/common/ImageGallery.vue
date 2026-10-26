<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import ImageViewer from './ImageViewer.vue'
import type { ViewImage } from './ImageViewer.vue'
import { SITE_IMAGES } from '../../config/siteImages'
import { t, tv } from '../../config/i18n'

const props = withDefaults(defineProps<{
  page: string
  title?: string
  hint?: string
  plain?: boolean
}>(), {
  title: '功能区配图',
  hint: '点击缩略图放大查看（支持键盘 ← → 切图、Esc 关闭）',
  plain: false,
})

const items = computed<ViewImage[]>(() => (SITE_IMAGES[props.page] ?? []).map((im) => ({
  ...im,
  src: `${import.meta.env.BASE_URL}${im.src}`,
})))

const viewerIndex = ref(-1)
</script>

<template>
  <div v-if="items.length" class="image-gallery" :class="plain ? 'plain' : 'common-card'">
    <div class="card-title">
      {{ t(title) }}
      <span class="gallery-count">{{ t('{n} 张', { n: items.length }) }}</span>
    </div>
    <div class="gallery-grid">
      <button
        v-for="(im, i) in items"
        :key="im.src"
        class="gallery-thumb"
        :title="t('查看大图：{title}', { title: im.title })"
        @click="viewerIndex = i"
      >
        <img :src="im.src" :alt="tv(im.title)" loading="lazy" />
        <span class="gallery-thumb-name">
          <AppIcon name="scenic" :size="11" />{{ tv(im.title) }}
        </span>
      </button>
    </div>
    <div class="gallery-hint">{{ t(hint) }}</div>

    <ImageViewer
      v-if="viewerIndex >= 0"
      :items="items"
      :index="viewerIndex"
      @update:index="viewerIndex = $event"
      @close="viewerIndex = -1"
    />
  </div>
</template>

<style scoped>
.image-gallery.plain {
  padding: 0;
  background: none;
  border: none;
  box-shadow: none;
}
.image-gallery .gallery-count {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (max-width: 1500px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
}
.gallery-thumb {
  position: relative;
  display: block;
  padding: 0;
  overflow: hidden;
  font: inherit;
  color: inherit;
  background: var(--map-nodata);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.gallery-thumb:hover {
  border-color: var(--color-gold);
  box-shadow: var(--shadow-card);
}
.gallery-thumb img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: transform 0.25s ease;
}
.gallery-thumb:hover img { transform: scale(1.05); }
.gallery-thumb-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gallery-hint {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
}
</style>
