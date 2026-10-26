<template>
  <div class="scope-bar">
    <span class="scope-label">{{ t('分析范围') }}</span>
    <button
      class="scope-chip"
      :class="{ active: scope === 'all' }"
      @click="pick('all')"
    >{{ t('全部') }}</button>
    <button
      class="scope-chip"
      :class="{ active: scope === 'river' }"
      @click="pick('river')"
    >{{ t('沿黄河流域') }}</button>
    <select class="scope-select" :value="selectValue" @change="onSelect">
      <option value="" disabled>{{ t('选择城市') }}</option>
      <option v-for="c in SHANDONG_CITIES" :key="c" :value="c">{{ cityOptionLabel(c) }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SHANDONG_CITIES } from '../../config/shandongRegions'
import { isCityScope, setScope, scopeState, type ScopeId } from '../../config/cityScope'
import { t } from '../../config/i18n'

const scope = computed<ScopeId>(() => scopeState.current)
const selectValue = computed(() => (isCityScope(scope.value) ? scope.value : ''))

function cityOptionLabel(city: string) {
  return t('{city}市', { city })
}

function pick(next: ScopeId) {
  setScope(next)
}

function onSelect(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  if (value) setScope(value as ScopeId)
}
</script>

<style scoped>
.scope-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.scope-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-muted);
  white-space: nowrap;
}
.scope-chip {
  padding: 3px 10px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-glass-strong, rgba(255, 255, 255, 0.9));
  border: 1px solid var(--border-light);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.scope-chip:hover {
  color: var(--text-gold);
  border-color: rgba(var(--rgb-gold), 0.5);
}
.scope-chip.active {
  color: var(--on-accent, #1b3a5c);
  background: var(--gradient-gold);
  border-color: transparent;
  font-weight: 600;
}
.scope-select {
  padding: 3px 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--surface-glass-strong, rgba(255, 255, 255, 0.9));
  border: 1px solid var(--border-light);
  border-radius: 999px;
  cursor: pointer;
}
.scope-select:focus {
  outline: none;
  border-color: rgba(var(--rgb-gold), 0.6);
}
</style>
