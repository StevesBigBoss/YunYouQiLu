<template>
  <div class="word-cloud-page">
    <div class="common-card">
      <div class="card-title">{{ t('高频词云 · {scope}', { scope: scopeLabel }) }}</div>
      <div class="card-note">
        {{ t('来自当前范围「{scope}」的 {n} 条山东文旅公开报道标题（文旅部 / 新华网山东 / 大众网，抓取于 {time}）；', { scope: scopeLabel, n: scopeNewsTotal, time: shortTime(dataFetchedAt.news) }) }}
        {{ t('词语由领域词表切分，非平台热搜词') }}
      </div>
      <div class="cloud-wrap">
        <span
          v-for="(w, i) in sortedWords"
          :key="w.word"
          class="cloud-word"
          :style="wordStyle(w.count, i)"
        >{{ tv(w.word) }}</span>
      </div>
    </div>

    <div class="common-card">
      <div class="card-title">{{ t('词频统计 · {scope}', { scope: scopeLabel }) }}</div>
      <div class="card-note">{{ t('出现次数 = 命中该词的报道条数（同一条报道内重复出现只计一次）') }}</div>
      <table class="common-table">
        <thead>
          <tr>
            <th>{{ t('词语') }}</th>
            <th>{{ t('出现次数') }}</th>
            <th style="width: 40%">{{ t('占比') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in sortedWords" :key="w.word">
            <td>{{ tv(w.word) }}</td>
            <td class="num">{{ w.count.toLocaleString() }}</td>
            <td>
              <div class="freq-bar">
                <div class="freq-fill" :style="{ width: (w.count / maxCount) * 100 + '%' }"></div>
                <span class="freq-num">{{ ((w.count / totalCount) * 100).toFixed(1) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { dataFetchedAt, shortTime } from '../../api/crawled'
import { scopeNewsKeywords, scopeNewsTotal } from '../../config/scopeNews'
import { scopeLabel } from '../../config/scopeData'
import { themeColors } from '../../config/theme'
import { t, tv } from '../../config/i18n'
import type { FilterState } from '../../types'

inject<FilterState>('filterState', {
  timeRange: '7d',
  region: 'all',
  platform: 'all',
  sentiment: 'all',
})


const sortedWords = computed(() => [...scopeNewsKeywords.value].sort((a, b) => b.count - a.count))
const maxCount = computed(() => sortedWords.value[0]?.count || 1)
const totalCount = computed(() => sortedWords.value.reduce((s, w) => s + w.count, 0))

function wordStyle(count: number, index: number) {
  const size = 12 + (count / maxCount.value) * 22
  const palette = themeColors()
  const color = palette[index % palette.length]
  return {
    fontSize: size + 'px',
    color,
  }
}
</script>

<style scoped>
.word-cloud-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card-note {
  margin: -2px 0 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}
.cloud-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px 18px;
  padding: 24px 10px;
  min-height: 220px;
}
.cloud-word {
  font-weight: 600;
  line-height: 1.2;
  cursor: default;
  transition: transform 0.2s;
}
.cloud-word:hover {
  transform: scale(1.15);
}
.num {
  font-family: 'DIN', 'Arial', sans-serif;
}
.freq-bar {
  position: relative;
  height: 18px;
  background: var(--bg-secondary);
  border-radius: 9px;
  overflow: hidden;
}
.freq-fill {
  height: 100%;
  background: var(--gradient-gold);
  border-radius: 9px;
}
.freq-num {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-primary);
}
</style>
