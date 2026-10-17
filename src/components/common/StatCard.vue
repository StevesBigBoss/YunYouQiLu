<template>
  <div class="stat-card">
    <div class="stat-header">
      <span class="stat-title">{{ title }}</span>
      <AppIcon v-if="icon" class="stat-icon" :name="icon" :size="18" />
    </div>
    <div class="stat-value">{{ displayValue }}</div>
    <div class="stat-footer">
      <span v-if="yoy !== undefined" class="stat-change" :class="yoy >= 0 ? 'up' : 'down'">
        <AppIcon :name="yoy >= 0 ? 'trend-up' : 'trend-down'" :size="12" /> {{ t('同比') }} {{ Math.abs(yoy) }}%
      </span>
      <span v-if="mom !== undefined" class="stat-change" :class="mom >= 0 ? 'up' : 'down'">
        <AppIcon :name="mom >= 0 ? 'trend-up' : 'trend-down'" :size="12" /> {{ t('环比') }} {{ Math.abs(mom) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { t } from '../../config/i18n'

const props = withDefaults(defineProps<{
  title: string
  value: number | string
  unit?: string
  yoy?: number
  mom?: number
  icon?: string
  decimals?: number
}>(), {
  unit: '',
  decimals: 0,
})

const displayValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  const formatted = props.value.toLocaleString('zh-CN', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })
  return props.unit ? `${formatted}${props.unit}` : formatted
})
</script>

<style scoped>
.stat-card {
  background: var(--gradient-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px 18px;
  box-shadow: var(--shadow-card);
}
.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.stat-title {
  font-size: 13px;
  color: var(--text-secondary);
}
.stat-icon { color: var(--text-gold); }
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 8px;
  font-family: 'DIN', 'Arial', sans-serif;
}
.stat-footer {
  display: flex;
  gap: 14px;
}
.stat-change {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
}
.stat-change.up { color: var(--text-green); }
.stat-change.down { color: var(--status-danger); }
</style>
