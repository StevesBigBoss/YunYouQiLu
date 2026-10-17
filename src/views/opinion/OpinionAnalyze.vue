<template>
  <div class="opinion-analyze">
    <!-- 预警等级 -->
    <div class="common-card warning-card">
      <div class="warning-main">
        <span class="warning-label">{{ t('当前范围「{scope}」舆情预警等级：', { scope: scopeLabel }) }}</span>
        <span class="tag warning-tag" :class="warningTag">{{ t(scopeNewsWarning.label) }}</span>
      </div>
      <div class="warning-reason">{{ t(scopeNewsWarning.reason) }}</div>
    </div>

    <div class="chart-grid">
      <ChartCard :title="t('情感分析（词表口径）· {scope}', { scope: scopeLabel })" :option="sentimentPieOption" height="300px" />
      <ChartCard :title="t('来源渠道与情感倾向流向 · {scope}', { scope: scopeLabel })" :option="sankeyOption" height="300px" />
    </div>

    <div class="common-card">
      <div class="card-title">{{ t('来源渠道分布 · {scope}', { scope: scopeLabel }) }}</div>
      <div class="card-note">
        {{ t('传播路径与关键账号（粉丝数、转发量）需要平台侧数据，公开页面拿不到；') }}
        {{ t('这里改用可核对的来源渠道与情感构成：当前范围共 {n} 条报道，抓取于 {time}', { n: scopeNewsTotal, time: shortTime(dataFetchedAt.news) }) }}
      </div>
      <table class="common-table">
        <thead>
          <tr>
            <th>{{ t('来源渠道') }}</th>
            <th>{{ t('站点') }}</th>
            <th>{{ t('报道条数') }}</th>
            <th>{{ t('正 / 中 / 负') }}</th>
            <th style="width: 32%">{{ t('占比') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ch in scopeNewsByChannel" :key="ch.channel">
            <td>{{ tv(ch.channel) }}</td>
            <td class="host">{{ tv(ch.host) }}</td>
            <td class="num">{{ ch.count }}</td>
            <td class="num">{{ ch.positive }} / {{ ch.neutral }} / {{ ch.negative }}</td>
            <td>
              <div class="share-bar">
                <div class="share-fill" :style="{ width: (ch.count / maxChannelCount) * 100 + '%' }"></div>
                <span class="share-num">{{ ch.percent }}%</span>
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
import ChartCard from '../../components/common/ChartCard.vue'
import {
  dataFetchedAt, shortTime,
} from '../../api/crawled'
import {
  scopeNewsByChannel, scopeNewsSentiment, scopeNewsSentimentCount, scopeNewsTotal, scopeNewsWarning,
} from '../../config/scopeNews'
import { scopeLabel } from '../../config/scopeData'
import { themeLegend, themeTitle } from '../../config/theme'
import { t, tv } from '../../config/i18n'
import type { FilterState } from '../../types'

inject<FilterState>('filterState', {
  timeRange: '7d',
  region: 'all',
  platform: 'all',
  sentiment: 'all',
})

const maxChannelCount = computed(() => Math.max(...scopeNewsByChannel.value.map((c) => c.count), 1))

const warningTag = computed(() => {
  const map: Record<string, string> = {
    blue: 'tag-blue', yellow: 'tag-gold', orange: 'tag-orange', red: 'tag-red',
  }
  return map[scopeNewsWarning.value.level] ?? 'tag-blue'
})

// 情感分析饼图（真实值：按标题词表粗判，非人工标注；随范围过滤报道）
const sentimentPieOption = computed<Record<string, unknown>>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
  legend: { bottom: 0, textStyle: { color: themeLegend() } },
  series: [
    {
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '45%'],
      label: { color: themeTitle(), formatter: '{b}\n{c}%' },
      data: [
        { name: t('正面（{n} 条）', { n: scopeNewsSentimentCount.value.positive }), value: scopeNewsSentiment.value.positive, itemStyle: { color: '#00A052' } },
        { name: t('中性（{n} 条）', { n: scopeNewsSentimentCount.value.neutral }), value: scopeNewsSentiment.value.neutral, itemStyle: { color: '#3A7BD5' } },
        { name: t('负面（{n} 条）', { n: scopeNewsSentimentCount.value.negative }), value: scopeNewsSentiment.value.negative, itemStyle: { color: '#D94F4F' } },
      ],
    },
  ],
}))

// 桑基图：来源渠道 → 情感倾向（左右两列真实计数）
const sankeyOption = computed<Record<string, unknown>>(() => {
  const channels = scopeNewsByChannel.value
  const colorOf: Record<string, string> = { 正面: '#00A052', 中性: '#3A7BD5', 负面: '#D94F4F' }
  // 情感节点的显示名按当前语言译出；key 保留原始中文，用于取色，也保证节点与连线两端对得上
  const nodes: { name: string; key: string }[] = [
    ...channels.map((c) => ({ name: tv(c.channel), key: c.channel })),
    { name: t('正面'), key: '正面' },
    { name: t('中性'), key: '中性' },
    { name: t('负面'), key: '负面' },
  ]
  const links: { source: string; target: string; value: number }[] = []
  channels.forEach((c) => {
    if (c.positive) links.push({ source: tv(c.channel), target: t('正面'), value: c.positive })
    if (c.neutral) links.push({ source: tv(c.channel), target: t('中性'), value: c.neutral })
    if (c.negative) links.push({ source: tv(c.channel), target: t('负面'), value: c.negative })
  })
  return {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeWidth: 18,
        nodeGap: 12,
        data: nodes.map((n) => ({
          name: n.name,
          itemStyle: colorOf[n.key] ? { color: colorOf[n.key] } : undefined,
        })),
        links,
        label: { color: themeTitle() },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.5 },
      },
    ],
  }
})
</script>

<style scoped>
.opinion-analyze {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.warning-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.warning-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.warning-label {
  font-size: 14px;
  color: var(--text-secondary);
}
.warning-tag {
  font-size: 18px;
  padding: 6px 20px;
}
.warning-reason {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.card-note {
  margin: -4px 0 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}
.num {
  font-family: 'DIN', 'Arial', sans-serif;
}
.host {
  font-size: 12px;
  color: var(--text-muted);
}
.share-bar {
  position: relative;
  height: 18px;
  background: var(--bg-secondary);
  border-radius: 9px;
  overflow: hidden;
}
.share-fill {
  height: 100%;
  background: var(--gradient-gold);
  border-radius: 9px;
}
.share-num {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-primary);
}
</style>
