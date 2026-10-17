<template>
  <div class="filter-bar">
    <div class="filter-item">
      <label>{{ t('时间：') }}</label>
      <select v-model="local.timeRange" @change="emitChange">
        <option value="7d">{{ t('近7天') }}</option>
        <option value="30d">{{ t('近30天') }}</option>
        <option value="90d">{{ t('近90天') }}</option>
        <option value="year">{{ t('本年度') }}</option>
      </select>
    </div>
    <div class="filter-item">
      <label>{{ t('分析范围：') }}</label>
      <span class="filter-scope" :title="t('由顶栏「分析范围」统一筛选，本页数据随其重算')">{{ scopeLabel }}</span>
    </div>
    <div class="filter-item" v-if="showPlatform">
      <label>{{ t('平台：') }}</label>
      <select v-model="local.platform" @change="emitChange">
        <option value="all">{{ t('全部平台') }}</option>
        <option value="抖音">{{ t('抖音') }}</option>
        <option value="微信">{{ t('微信') }}</option>
        <option value="微博">{{ t('微博') }}</option>
        <option value="新闻">{{ t('新闻') }}</option>
        <option value="论坛">{{ t('论坛') }}</option>
      </select>
    </div>
    <div class="filter-item" v-if="showSentiment">
      <label>{{ t('情感：') }}</label>
      <select v-model="local.sentiment" @change="emitChange">
        <option value="all">{{ t('全部') }}</option>
        <option value="positive">{{ t('正面') }}</option>
        <option value="neutral">{{ t('中性') }}</option>
        <option value="negative">{{ t('负面') }}</option>
      </select>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { scopeLabel } from '../../config/scopeData'
import { t } from '../../config/i18n'

const props = withDefaults(defineProps<{
  modelValue?: {
    timeRange: string
    region: string
    platform: string
    sentiment: string
  }
  showPlatform?: boolean
  showSentiment?: boolean
}>(), {
  showPlatform: true,
  showSentiment: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: typeof props.modelValue): void
  (e: 'change', val: typeof props.modelValue): void
}>()

const local = reactive({
  timeRange: props.modelValue?.timeRange || '7d',
  region: props.modelValue?.region || 'all',
  platform: props.modelValue?.platform || 'all',
  sentiment: props.modelValue?.sentiment || 'all',
})

watch(() => props.modelValue, (val) => {
  if (val) {
    local.timeRange = val.timeRange
    local.region = val.region
    local.platform = val.platform
    local.sentiment = val.sentiment
  }
}, { deep: true })

function emitChange() {
  const val = { ...local }
  emit('update:modelValue', val)
  emit('change', val)
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 14px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-item label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.filter-item select {
  padding: 5px 10px;
  font-size: 13px;
  min-width: 100px;
}
.filter-scope {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-gold);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--rgb-gold), 0.12);
  white-space: nowrap;
}
</style>
