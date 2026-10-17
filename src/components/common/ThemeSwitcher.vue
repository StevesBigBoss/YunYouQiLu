<template>
  <div ref="rootRef" class="theme-switcher">
    <button class="theme-btn" type="button" :title="t('当前风格：{name}', { name: t(current.name) })" @click="toggle">
      <span class="theme-dot" :style="{ background: current.swatches[0] }"></span>
      <span class="theme-label">{{ t(current.name) }}</span>
      <span class="theme-caret" :class="{ open }"><AppIcon name="caret-down" :size="12" /></span>
    </button>

    <transition name="theme-pop">
      <div v-if="open" class="theme-panel">
        <div class="panel-title">{{ t('切换风格') }}</div>
        <div
          v-for="theme in APP_THEMES"
          :key="theme.id"
          class="theme-item"
          :class="{ active: theme.id === currentThemeId }"
          @click="choose(theme.id)"
        >
          <span class="swatches">
            <i v-for="(color, i) in theme.swatches" :key="i" :style="{ background: color }"></i>
          </span>
          <span class="meta">
            <span class="name">{{ t(theme.name) }}</span>
            <span class="desc">{{ t(theme.desc) }}</span>
          </span>
          <span v-if="theme.id === currentThemeId" class="check"><AppIcon name="check" :size="13" /></span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { APP_THEMES, applyAppTheme, currentThemeId, findAppTheme } from '../../config/appTheme'
import { t } from '../../config/i18n'

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const current = computed(() => findAppTheme(currentThemeId.value))

function toggle() {
  open.value = !open.value
}

function choose(id: string) {
  applyAppTheme(id)
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const el = rootRef.value
  if (el && event.target instanceof Node && !el.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-btn:hover {
  border-color: var(--color-gold);
  color: var(--text-gold);
}
.theme-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--border-light);
}
.theme-label { white-space: nowrap; }
.theme-caret {
  display: inline-flex;
  transition: transform 0.2s;
}
.theme-caret.open { transform: rotate(180deg); }

.theme-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 3000;
  width: 240px;
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

.theme-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-item:hover { background: var(--bg-card-hover); }
.theme-item.active {
  border-color: var(--color-gold);
  background: rgba(var(--rgb-gold), 0.1);
}
.swatches {
  display: flex;
  flex-shrink: 0;
}
.swatches i {
  display: block;
  width: 12px;
  height: 18px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.swatches i + i { margin-left: -3px; }
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
.desc {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.check {
  display: inline-flex;
  color: var(--text-gold);
}

.theme-pop-enter-active,
.theme-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.theme-pop-enter-from,
.theme-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
