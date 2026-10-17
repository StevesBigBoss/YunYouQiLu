<template>
  <div class="topic-list">
    <!-- 数据口径说明 -->
    <div class="filter-info common-card">
      <span class="info-label">{{ t('数据源：') }}</span>
      <span class="tag tag-blue">{{ tv(dataSources.news) }}</span>
      <span class="info-note">
        {{ t('当前范围「{scope}」共 {n} 条报道（{from} ~ {to}，抓取于 {time}）', { scope: scopeLabel, n: scopeNewsTotal, from: scopeNewsDateRange.from, to: scopeNewsDateRange.to, time: shortTime(dataFetchedAt.news) }) }}{{ scopeDirectNote }}{{ t('。抖音/微博/微信互动量需开放平台密钥且条款禁止抓取，故本页按「关键词命中数」排序，不展示热度值与参与量。') }}
      </span>
    </div>

    <div class="common-card">
      <div class="card-title">
        <span>{{ t('报道排行（{n} 条）· {scope}', { n: sortedNews.length, scope: scopeLabel }) }}</span>
        <div class="sort-btns">
          <button
            class="btn"
            :class="{ 'btn-primary': sortKey === 'hits' }"
            @click="sortKey = 'hits'"
          >{{ t('按关键词命中') }}</button>
          <button
            class="btn"
            :class="{ 'btn-primary': sortKey === 'date' }"
            @click="sortKey = 'date'"
          >{{ t('按发布时间') }}</button>
        </div>
      </div>

      <div class="topic-row topic-head">
        <span class="col-rank">{{ t('排名') }}</span>
        <span class="col-name">{{ t('报道标题') }}</span>
        <span class="col-num">{{ t('关键词命中') }}</span>
        <span class="col-channel">{{ t('来源渠道') }}</span>
        <span class="col-date">{{ t('发布日期') }}</span>
        <span class="col-sent">{{ t('情感') }}</span>
      </div>

      <div
        v-for="(item, idx) in sortedNews"
        :key="item.url"
        class="topic-item"
        @click="toggle(item.url)"
      >
        <div class="topic-row">
          <span class="col-rank">
            <span class="rank-badge" :class="rankClass(idx)">{{ idx + 1 }}</span>
          </span>
          <span class="col-name topic-name" :title="tv(item.title)">{{ tv(item.title) }}</span>
          <span class="col-num num-gold">{{ item.keywords.length }}</span>
          <span class="col-channel">{{ tv(item.channel) }}</span>
          <span class="col-date num">{{ item.date || '—' }}</span>
          <span class="col-sent">
            <span class="tag" :class="sentTag(item.sentiment)">{{ sentLabel(item.sentiment) }}</span>
          </span>
        </div>
        <div v-if="expanded === item.url" class="topic-detail">
          <div class="detail-block">
            <span class="detail-label">{{ t('命中关键词') }}</span>
            <span class="detail-tags">
              <span v-for="k in item.keywords" :key="k" class="tag tag-gold">{{ tv(k) }}</span>
              <span v-if="!item.keywords.length" class="detail-none">{{ t('无') }}</span>
            </span>
          </div>
          <div class="detail-block">
            <span class="detail-label">{{ t('提及城市') }}</span>
            <span class="detail-tags">
              <span v-for="c in item.cities" :key="c" class="tag tag-green">{{ t('{city}市', { city: c }) }}</span>
              <span v-if="!item.cities.length" class="detail-none">{{ t('标题未点明城市（省级/综合报道）') }}</span>
            </span>
          </div>
          <div class="detail-meta">
            <span class="detail-label">{{ t('原文') }}</span>
            <a class="detail-link" :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.url }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { dataFetchedAt, dataSources, shortTime } from '../../api/crawled'
import type { NewsItem } from '../../api/crawled'
import { scopeNewsDateRange, scopeNewsDirectCount, scopeNewsItems, scopeNewsNoCityCount, scopeNewsTotal } from '../../config/scopeNews'
import { scope, scopeLabel } from '../../config/scopeData'
import { t, tv } from '../../config/i18n'
import type { FilterState } from '../../types'

inject<FilterState>('filterState', {
  timeRange: '7d',
  region: 'all',
  platform: 'all',
  sentiment: 'all',
})

type SortKey = 'hits' | 'date'
const sortKey = ref<SortKey>('hits')
const expanded = ref<string | null>(null)

/** 口径组成：全省范围内两个数字重合，就不再啰嗦 */
const scopeDirectNote = computed(() =>
  scope.value === 'all'
    ? ''
    : t('（其中标题点明「{scope}」的属地报道 {direct} 条、省级综合稿 {provincial} 条）', { scope: scopeLabel.value, direct: scopeNewsDirectCount.value, provincial: scopeNewsNoCityCount.value }),
)

const sortedNews = computed<NewsItem[]>(() => {
  const list = [...scopeNewsItems.value]
  if (sortKey.value === 'hits') {
    return list.sort((a, b) =>
      b.keywords.length - a.keywords.length ||
      String(b.date ?? '').localeCompare(String(a.date ?? '')),
    )
  }
  return list.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
})

function toggle(url: string) {
  expanded.value = expanded.value === url ? null : url
}

function rankClass(idx: number): string {
  return idx < 3 ? 'rank-top' : ''
}

function sentLabel(s: NewsItem['sentiment']): string {
  return s === 'positive' ? t('正面') : s === 'negative' ? t('负面') : t('中性')
}
function sentTag(s: NewsItem['sentiment']): string {
  return s === 'positive' ? 'tag-green' : s === 'negative' ? 'tag-red' : 'tag-blue'
}
</script>

<style scoped>
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.filter-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.info-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.info-note {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
.sort-btns {
  display: flex;
  gap: 8px;
}
.topic-row {
  display: grid;
  grid-template-columns: 56px 1fr 96px 150px 96px 76px;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}
.topic-head {
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 13px;
}
.topic-item {
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.2s;
}
.topic-item:hover {
  background: var(--bg-card-hover);
}
.col-rank {
  text-align: center;
}
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}
.rank-badge.rank-top {
  background: var(--gradient-gold);
  color: #1B3A5C;
  font-weight: 700;
}
.topic-name {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-num {
  text-align: right;
  font-family: 'DIN', 'Arial', sans-serif;
}
.num-gold {
  color: var(--text-gold);
  font-weight: 600;
}
.col-channel {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-date {
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
}
.col-sent {
  text-align: center;
}
.topic-detail {
  padding: 10px 14px 14px 70px;
  background: rgba(0, 0, 0, 0.15);
}
.detail-block {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.detail-label {
  flex: 0 0 64px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 20px;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-none {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 20px;
}
.detail-meta {
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.detail-link {
  font-size: 12px;
  color: var(--text-gold);
  word-break: break-all;
}
</style>
