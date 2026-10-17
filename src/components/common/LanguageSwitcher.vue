<template>
  <div ref="rootRef" class="lang-switcher">
    <button class="lang-btn" type="button" :title="`${t('语言')}：${current.native}`" @click="toggle">
      <AppIcon name="global" :size="15" />
      <span class="lang-text">
        <span class="lang-native" dir="auto">{{ current.native }}</span>
        <!-- 中文下面这行固定给英文提示词，任何语言下都认得出这是换语言的入口 -->
        <span class="lang-hint">language</span>
      </span>
      <span class="lang-caret" :class="{ open }"><AppIcon name="caret-down" :size="12" /></span>
    </button>

    <transition name="lang-pop">
      <div v-if="open" class="lang-panel">
        <div class="panel-title">{{ t('语言') }}</div>
        <div
          v-for="item in LOCALES"
          :key="item.id"
          class="lang-item"
          :class="{ active: item.id === locale }"
          @click="choose(item.id)"
        >
          <span class="meta">
            <span class="name" dir="auto">{{ item.native }}</span>
            <span class="sub">{{ item.zh }} · {{ item.en }}</span>
          </span>
          <span v-if="item.id === locale" class="check"><AppIcon name="check" :size="13" /></span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { LOCALES, currentLocaleMeta, locale, setLocale, t, type LocaleId } from '../../config/i18n'

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const current = computed(() => currentLocaleMeta.value)

function toggle() {
  open.value = !open.value
}

function choose(id: LocaleId) {
  setLocale(id)
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const el = rootRef.value
  if (el && event.target instanceof Node && !el.contains(event.target)) open.value = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
.lang-switcher {
  position: relative;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 11px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  color: var(--text-secondary);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.lang-btn:hover {
  border-color: var(--color-gold);
  color: var(--text-gold);
}
/* 两行小字：上行当前语言，下行固定的 language 提示 */
.lang-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.1;
}
.lang-native {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.lang-hint {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  white-space: nowrap;
}
.lang-btn:hover .lang-hint {
  color: var(--text-gold);
}
.lang-caret {
  display: inline-flex;
  transition: transform 0.2s;
}
.lang-caret.open {
  transform: rotate(180deg);
}

.lang-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 3000;
  width: 236px;
  /* 10 种语言一屏排完（约 480px），窗口再矮才出现滚动 */
  max-height: min(80vh, 500px);
  overflow-y: auto;
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}
.panel-title {
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 2px 8px;
}

.lang-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.lang-item:hover {
  background: var(--bg-card-hover);
}
.lang-item.active {
  border-color: var(--color-gold);
  background: rgba(var(--rgb-gold), 0.1);
}
.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.name {
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
}
.sub {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
}
.check {
  display: inline-flex;
  color: var(--text-gold);
}

.lang-pop-enter-active,
.lang-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.lang-pop-enter-from,
.lang-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
