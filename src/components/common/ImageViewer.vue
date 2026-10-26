<script lang="ts">
export interface ViewImage {
  src: string
  title: string
  caption: string
  credit: string
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { t, tv } from '../../config/i18n'


const props = defineProps<{
  items: ViewImage[]
  index: number
}>()

const emit = defineEmits<{
  (e: 'update:index', index: number): void
  (e: 'close'): void
}>()


const loaded = ref(false)
const failed = ref(false)
const zoomed = ref(false)
const origin = ref('50% 50%')

const current = computed(() => props.items[props.index])

const openedAt = Date.now()
const CLICK_GRACE = 400


function closeByBackdrop() {
  if (Date.now() - openedAt < CLICK_GRACE) return
  emit('close')
}

function step(delta: number) {
  const total = props.items.length
  if (!total) return
  emit('update:index', (props.index + delta + total) % total)
}

function toggleZoom(e: MouseEvent) {
  if (Date.now() - openedAt < CLICK_GRACE) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  origin.value = `${x.toFixed(1)}% ${y.toFixed(1)}%`
  zoomed.value = !zoomed.value
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'ArrowRight') {
    step(1)
    return
  }
  if (e.key === 'ArrowLeft') step(-1)
}


watch(() => props.index, () => {
  zoomed.value = false
  loaded.value = false
  failed.value = false
})

const prevOverflow = document.body.style.overflow

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.body.style.overflow = prevOverflow
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div class="image-viewer" @click.self="closeByBackdrop">
      <button v-if="items.length > 1" class="viewer-nav prev" :title="t('上一张（←）')" @click.stop="step(-1)">
        <AppIcon name="chevrons-left" :size="18" />
      </button>
      <button v-if="items.length > 1" class="viewer-nav next" :title="t('下一张（→）')" @click.stop="step(1)">
        <AppIcon name="chevrons-right" :size="18" />
      </button>
      <button class="viewer-close" :title="t('关闭（Esc）')" @click.stop="emit('close')">
        <AppIcon name="close" :size="18" />
      </button>

      <figure class="viewer-figure" @click.self="closeByBackdrop">
        <div class="viewer-stage" :class="{ zoomed }" @click.self="closeByBackdrop">
          <div v-if="!loaded && !failed" class="viewer-tip">{{ t('图片加载中…') }}</div>
          <div v-else-if="failed" class="viewer-tip">{{ t('图片加载失败，请检查 public/{src} 是否存在', { src: current?.src }) }}</div>
          <img
            :src="current?.src"
            :alt="current ? tv(current.title) : ''"
            class="viewer-img"
            :class="{ zoomed, hidden: !loaded }"
            :style="{ transformOrigin: origin }"
            @load="loaded = true"
            @error="loaded = false; failed = true"
            @click.stop="toggleZoom"
          />
        </div>
        <figcaption class="viewer-caption">
          <div class="viewer-head">
            <span class="viewer-title">{{ current ? tv(current.title) : '' }}</span>
            <span v-if="items.length > 1" class="viewer-count">{{ index + 1 }} / {{ items.length }}</span>
          </div>
          <p v-if="current?.caption" class="viewer-desc">{{ tv(current.caption) }}</p>
          <div class="viewer-foot">
            <span v-if="current?.credit" class="viewer-credit">{{ tv(current.credit) }}</span>
            <span class="viewer-tip-inline">{{ t('点图片放大 / 缩小 · Esc 关闭') }}{{ items.length > 1 ? t(' · ← → 切图') : '' }}</span>
          </div>
        </figcaption>
      </figure>
    </div>
  </Teleport>
</template>

<style scoped>
.image-viewer {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 58px;
  box-sizing: border-box;
  background: rgba(12, 14, 12, 0.82);
  backdrop-filter: blur(3px);
}

.viewer-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  max-height: 100%;
  margin: 0;
}

.viewer-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
}

.viewer-img {
  max-width: 86vw;
  max-height: 74vh;
  border-radius: 4px;
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.5);
  cursor: zoom-in;
  transition: transform 0.22s ease;
}
.viewer-img.zoomed {
  transform: scale(1.8);
  cursor: zoom-in;
}
.viewer-img.hidden { visibility: hidden; }

.viewer-tip {
  padding: 60px 30px;
  font-size: 13px;
  color: #E8E8E8;
}

.viewer-caption {
  width: min(86vw, 780px);
  padding: 8px 12px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 6px;
  color: var(--text-secondary);
}
.viewer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.viewer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-gold);
}
.viewer-count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.viewer-desc {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.viewer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-muted);
}
.viewer-credit { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.viewer-tip-inline { flex-shrink: 0; }

.viewer-nav,
.viewer-close {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease;
}
.viewer-nav:hover,
.viewer-close:hover { background: rgba(255, 255, 255, 0.3); }
.viewer-nav { top: 50%; margin-top: -19px; }
.viewer-nav.prev { left: 14px; }
.viewer-nav.next { right: 14px; }
.viewer-close { top: 14px; right: 14px; }
</style>
