import { computed } from 'vue'
import { newsItems, type NewsChannel, type NewsCityStat, type NewsItem, type NewsWarning } from '../api/crawled'
import { keywordFrequency } from './textRules'
import { scopeCities, scopeState } from './cityScope'
import { t } from './i18n'
import { scopeLabel } from './scopeData'
import { CITY_CENTERS, type ShandongCity } from './shandongRegions'

function inScopeItem(n: NewsItem): boolean {
  if (scopeState.current === 'all') return true
  const cities = scopeCities(scopeState.current) as readonly ShandongCity[]
  return n.cities.some((c) => cities.includes(c))
}

export const scopeNewsDirect = computed<NewsItem[]>(() => {
  if (scopeState.current === 'all') return newsItems
  return newsItems.filter((n) => n.cities.length > 0 && inScopeItem(n))
})

const scopeNewsProvince = computed<NewsItem[]>(() => newsItems.filter((n) => n.cities.length === 0))
export const scopeNewsItems = computed<NewsItem[]>(() => {
  if (scopeState.current === 'all') return newsItems
  return [...scopeNewsDirect.value, ...scopeNewsProvince.value]
})

export const scopeNewsTotal = computed(() => scopeNewsItems.value.length)

export const scopeNewsDirectCount = computed(() => scopeNewsDirect.value.length)

export const scopeNewsNoCityCount = computed(() => scopeNewsProvince.value.length)

export const scopeNewsSentimentCount = computed(() => {
  const out = { positive: 0, neutral: 0, negative: 0, total: scopeNewsTotal.value }
  scopeNewsItems.value.forEach((n) => { out[n.sentiment] += 1 })
  return out
})

export const scopeNewsSentiment = computed(() => {  const c = scopeNewsSentimentCount.value
  const total = c.total || 1
  const positive = Math.round((c.positive / total) * 100)
  const neutral = Math.round((c.neutral / total) * 100)
  return { positive, neutral, negative: Math.max(0, 100 - positive - neutral) }
})

export const scopeNewsByChannel = computed<NewsChannel[]>(() => {
  const rows = scopeNewsItems.value
  const total = rows.length || 1
  return [...new Set(rows.map((n) => n.channel))]
    .map((channel) => {
      const list = rows.filter((n) => n.channel === channel)
      let host = '—'
      try {
        host = new URL(list[0]?.url ?? '').host
      } catch {
        host = '—'
      }
      return {
        channel,
        host,
        count: list.length,
        positive: list.filter((r) => r.sentiment === 'positive').length,
        neutral: list.filter((r) => r.sentiment === 'neutral').length,
        negative: list.filter((r) => r.sentiment === 'negative').length,
        percent: Math.round((list.length / total) * 100),
      }
    })
    .sort((a, b) => b.count - a.count)
})

export const scopeNewsByCity = computed<NewsCityStat[]>(() => {
  const target = (scopeCities(scopeState.current) as readonly ShandongCity[])
  const rows = scopeNewsItems.value
  return [...target]
    .map((city) => {
      const list = rows.filter((n) => n.cities.includes(city))
      const c = CITY_CENTERS[city]
      return { city, count: list.length, lng: c.lng, lat: c.lat, titles: list.map((r) => r.title) }
    })
    .sort((a, b) => b.count - a.count)
})

export const scopeNewsCityMax = computed(() =>
  Math.max(...scopeNewsByCity.value.map((c) => c.count), 1),
)

export function scopeNewsDailyTrend(days = 7) {
  return computed(() => {
    const dated = scopeNewsItems.value.map((n) => n.date).filter((d): d is string => !!d).sort()
    const end = dated[dated.length - 1]
    if (!end) return []
    const endTime = new Date(`${end}T00:00:00Z`).getTime()
    const out: { date: string; count: number; channels: number }[] = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(endTime - i * 86400000).toISOString().slice(0, 10)
      const list = scopeNewsItems.value.filter((n) => n.date === date)
      out.push({ date, count: list.length, channels: new Set(list.map((r) => r.channel)).size })
    }
    return out
  })
}

export const scopeNewsKeywords = computed(() => keywordFrequency(scopeNewsItems.value.map((n) => n.title), 40))

export const scopeNewsDateRange = computed(() => {
  const dates = scopeNewsItems.value.map((n) => n.date).filter((d): d is string => !!d).sort()
  return { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' }
})

export const scopeNewsWarning = computed<NewsWarning>(() => {
  const c = scopeNewsSentimentCount.value
  const total = scopeNewsTotal.value || 1
  const share = (c.negative / total) * 100
  const vars = { scope: scopeLabel.value, n: c.total, negative: c.negative, share: share.toFixed(1) }
  if (share >= 15 || c.negative >= 8) {
    return { level: 'red', label: '红色 · 高', reason: t('范围内（{scope}）近 {n} 条报道中，词表判定为负面的 {negative} 条（{share}%），达到高等级阈值（≥15% 或 ≥8 条）', vars) }
  }
  if (share >= 8 || c.negative >= 4) {
    return { level: 'orange', label: '橙色 · 中', reason: t('范围内（{scope}）近 {n} 条报道中，词表判定为负面的 {negative} 条（{share}%），达到中等级阈值（≥8% 或 ≥4 条）', vars) }
  }
  if (share >= 3 || c.negative >= 2) {
    return { level: 'yellow', label: '黄色 · 偏低', reason: t('范围内（{scope}）近 {n} 条报道中，词表判定为负面的 {negative} 条（{share}%），达到偏低阈值（≥3% 或 ≥2 条）', vars) }
  }
  return { level: 'blue', label: '蓝色 · 平稳', reason: t('范围内（{scope}）近 {n} 条报道中，词表判定为负面的 {negative} 条（{share}%），未达到分级阈值（<3% 且 <2 条）', vars) }
})

export const scopeNewsNegativeItems = computed(() => scopeNewsItems.value.filter((n) => n.sentiment === 'negative'))
