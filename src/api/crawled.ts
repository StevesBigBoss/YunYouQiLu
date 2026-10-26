import weatherJson from '../../data/normalized/weather.json'
import quakeJson from '../../data/normalized/quake.json'
import heritageJson from '../../data/normalized/heritage.json'
import newsJson from '../../data/normalized/news.json'
import { CITY_CENTERS, cityOfArea, citiesInText, distanceKm } from '../config/shandongRegions'
import type { ShandongCity } from '../config/shandongRegions'
import { keywordFrequency, keywordsOf, sentimentOf } from '../config/textRules'
import type { Sentiment } from '../config/textRules'


interface RawWeatherReal {
  temp: number
  humidity: number
  windDirection: string
  windDegrees: number
  windLevel: string
  windSpeedKmh: number
  precipitation: number
  weather: string
  weatherCode: number
  observedAt: string
}
interface RawWeatherDay {
  date: string
  weather: string
  tempHigh: number
  tempLow: number
  precipitation: number
  code: number
}
interface RawWeatherCity {
  city: string
  lat: number
  lon: number
  grid: { lat: number; lon: number; elevation: number }
  realtime: RawWeatherReal
  forecast: { updatedAt: string; today: RawWeatherDay; tomorrow: RawWeatherDay }
}
interface RawWeatherFile {
  source: string
  attribution: string
  fetchedAt: string
  cityCount: number
  cities: RawWeatherCity[]
}

interface RawQuakeEvent {
  id: string
  time: string
  magnitude: number
  place: string
  depthKm: number
  lng: number
  lat: number
  url: string | null
}
interface RawQuakeFile {
  source: string
  note: string
  fetchedAt: string
  bbox: Record<string, number>
  minMagnitude: number
  startTime: string
  count: number
  events: RawQuakeEvent[]
}

interface RawHeritageItem {
  id: string
  num: string
  name: string
  category: string
  categoryKind: string
  projectNum: string
  batchYear: number
  batch: string
  province: string
  unit: string
  protectUnit: string
  desc: string
  url: string | null
}
interface RawHeritageFile {
  source: string
  fetchedAt: string
  declaredTotal: number
  count: number
  items: RawHeritageItem[]
}

interface RawNewsItem {
  title: string
  url: string
  date: string | null
  channel: string
}
interface RawNewsFile {
  source: string
  note: string
  fetchedAt: string
  pages: { name: string; url: string; filter: string; status: number; picked: number }[]
  count: number
  datedCount: number
  items: RawNewsItem[]
  keywords: { word: string; count: number }[]
  sentiment: { total: number; positive: number; neutral: number; negative: number }
}


export const dataFetchedAt = {
  weather: (weatherJson as unknown as RawWeatherFile).fetchedAt,
  quake: (quakeJson as unknown as RawQuakeFile).fetchedAt,
  heritage: (heritageJson as unknown as RawHeritageFile).fetchedAt,
  news: (newsJson as unknown as RawNewsFile).fetchedAt,
}

export const dataSources = {
  weather: (weatherJson as unknown as RawWeatherFile).source,
  weatherAttribution: (weatherJson as unknown as RawWeatherFile).attribution,
  quake: (quakeJson as unknown as RawQuakeFile).source,
  quakeNote: (quakeJson as unknown as RawQuakeFile).note,
  heritage: (heritageJson as unknown as RawHeritageFile).source,
  news: (newsJson as unknown as RawNewsFile).source,
  newsNote: (newsJson as unknown as RawNewsFile).note,
}

export function shortTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[2]}-${m[3]} ${m[4]}:${m[5]}` : iso
}


export interface CityWeather {
  city: string
  lng: number
  lat: number
  temp: number
  humidity: number
  weather: string
  weatherCode: number
  windDirection: string
  windSpeedKmh: number
  windLevel: string
  precipitation: number
  observedAt: string
  today: RawWeatherDay
  tomorrow: RawWeatherDay
  tempDrop: number
}

const weatherFile = weatherJson as unknown as RawWeatherFile

export const cityWeather: CityWeather[] = weatherFile.cities.map((c) => ({
  city: c.city,
  lng: c.lon,
  lat: c.lat,
  temp: c.realtime.temp,
  humidity: c.realtime.humidity,
  weather: c.realtime.weather,
  weatherCode: c.realtime.weatherCode,
  windDirection: c.realtime.windDirection,
  windSpeedKmh: c.realtime.windSpeedKmh,
  windLevel: c.realtime.windLevel,
  precipitation: c.realtime.precipitation,
  observedAt: c.realtime.observedAt,
  today: c.forecast.today,
  tomorrow: c.forecast.tomorrow,
  tempDrop: Math.round((c.forecast.today.tempLow - c.forecast.tomorrow.tempLow) * 10) / 10,
}))

export const weatherByCity = new Map(cityWeather.map((w) => [w.city, w]))

export const weatherObservedAt = cityWeather[0]?.observedAt ?? ''

export const WEATHER_ALERT_RULES = [
  '暴雨：日累计降水 ≥50mm 蓝、≥100mm 黄、≥150mm 橙、≥200mm 红',
  '高温：日最高气温 ≥35℃ 黄、≥37℃ 橙、≥40℃ 红',
  '大风：实况风速 ≥39km/h 蓝、≥62 黄、≥88 橙、≥118 红（6/8/10/12 级）',
  '寒潮：24 小时最低气温降幅 ≥8℃ 蓝、≥10 黄、≥12 橙、≥16 红',
  '大雾：WMO 天气码 45/48；雷电：95/96/99',
] as const

export type AlertLevel = '蓝色' | '黄色' | '橙色' | '红色'

function levelBy(value: number, thresholds: [number, AlertLevel][]): AlertLevel | null {
  let hit: AlertLevel | null = null
  for (const [min, level] of thresholds) if (value >= min) hit = level
  return hit
}

export interface WeatherAlert {
  id: string
  city: string
  type: string
  level: AlertLevel
  detailKey: string
  detailVars: Record<string, string | number>
}

export const weatherAlerts: WeatherAlert[] = []
cityWeather.forEach((w) => {
  const push = (type: string, level: AlertLevel | null, detailKey: string, detailVars: Record<string, string | number>) => {
    if (level) weatherAlerts.push({ id: `${w.city}-${type}`, city: w.city, type, level, detailKey, detailVars })
  }
  push('暴雨', levelBy(w.today.precipitation, [[50, '蓝色'], [100, '黄色'], [150, '橙色'], [200, '红色']]),
    '日累计降水 {n}mm', { n: w.today.precipitation })
  push('高温', levelBy(w.today.tempHigh, [[35, '黄色'], [37, '橙色'], [40, '红色']]),
    '日最高气温 {n}℃', { n: w.today.tempHigh })
  push('大风', levelBy(w.windSpeedKmh, [[39, '蓝色'], [62, '黄色'], [88, '橙色'], [118, '红色']]),
    '实况风速 {n}km/h（{level}）', { n: w.windSpeedKmh, level: w.windLevel })
  push('寒潮', levelBy(w.tempDrop, [[8, '蓝色'], [10, '黄色'], [12, '橙色'], [16, '红色']]),
    '24 小时最低气温降幅 {n}℃', { n: w.tempDrop })
  if ([45, 48].includes(w.weatherCode)) push('大雾', '黄色', '实况天气：{weather}', { weather: w.weather })
  if ([95, 96, 99].includes(w.weatherCode)) push('雷电', '黄色', '实况天气：{weather}', { weather: w.weather })
})

export function weatherScore(w: CityWeather): number {
  const rain = w.today.precipitation * 2 + w.precipitation * 4
  const wind = Math.max(0, w.windSpeedKmh - 20) * 0.4
  const heat = Math.max(0, w.today.tempHigh - 32) * 2
  const cold = Math.max(0, 0 - w.today.tempLow) * 1.5
  const drop = Math.max(0, w.tempDrop) * 0.8
  return Math.round(rain + wind + heat + cold + drop)
}


const COMPASS_CN: Record<string, string> = {
  N: '正北', NNE: '北东北', NE: '东北', ENE: '东东北', E: '正东', ESE: '东东南',
  SE: '东南', SSE: '南东南', S: '正南', SSW: '南西南', SW: '西南', WSW: '西西南',
  W: '正西', WNW: '西西北', NW: '西北', NNW: '北西北',
}

export interface QuakeEvent {
  id: string
  time: string
  timeCn: string
  magnitude: number
  place: string
  directionKm: number
  direction: string
  depthKm: number
  lng: number
  lat: number
  url: string
  nearestCity: ShandongCity
  nearestCityKm: number
  insideShandong: boolean
}

function beijingTime(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return iso
  const cn = new Date(t.getTime() + 8 * 3600 * 1000)
  return `${cn.toISOString().slice(0, 10)} ${cn.toISOString().slice(11, 16)}`
}

function nearestShandongCity(lat: number, lng: number): { city: ShandongCity; km: number } {
  let best: ShandongCity = '济南'
  let bestKm = Number.POSITIVE_INFINITY
  ;(Object.keys(CITY_CENTERS) as ShandongCity[]).forEach((city) => {
    const c = CITY_CENTERS[city]
    const km = distanceKm(lat, lng, c.lat, c.lng)
    if (km < bestKm) { bestKm = km; best = city }
  })
  return { city: best, km: bestKm }
}

const quakeFile = quakeJson as unknown as RawQuakeFile

export const quakeEvents: QuakeEvent[] = quakeFile.events
  .map((e) => {
    const near = nearestShandongCity(e.lat, e.lng)
    const m = e.place.match(/^(\d+(?:\.\d+)?)\s*km\s+([NSEW]{1,3})\s+of\s+(.+)$/i)
    const dir = m ? COMPASS_CN[m[2].toUpperCase()] ?? m[2].toUpperCase() : ''
    return {
      id: e.id,
      time: e.time,
      timeCn: beijingTime(e.time),
      magnitude: e.magnitude,
      place: e.place,
      directionKm: m ? Number(m[1]) : 0,
      direction: dir,
      depthKm: e.depthKm,
      lng: e.lng,
      lat: e.lat,
      url: e.url ?? '',
      nearestCity: near.city,
      nearestCityKm: near.km,
      insideShandong: near.km <= 120,
    }
  })
  .sort((a, b) => (a.time < b.time ? 1 : -1))

export const quakeSince = quakeFile.startTime
export const quakeMinMagnitude = quakeFile.minMagnitude
export const quakeInsideCount = quakeEvents.filter((e) => e.insideShandong).length
export const quakeMaxMagnitude = quakeEvents.length
  ? Math.max(...quakeEvents.map((e) => e.magnitude))
  : 0


export interface HeritageRecord {
  id: string
  name: string
  category: string
  categoryKind: string
  batch: string
  batchYear: number
  num: string
  area: string
  city: ShandongCity | null
  protectUnit: string
  desc: string
}

const heritageFile = heritageJson as unknown as RawHeritageFile

function spread(index: number): { dx: number; dy: number } {
  const angle = index * 2.399963
  const radius = 0.055 * Math.sqrt(index + 1)
  return {
    dx: Number((radius * Math.cos(angle)).toFixed(4)),
    dy: Number((radius * Math.sin(angle)).toFixed(4)),
  }
}

export const heritageItems: HeritageRecord[] = heritageFile.items.map((it) => {
  const city = cityOfArea(it.province) ?? cityOfArea(it.protectUnit)
  return {
    id: it.id,
    name: it.name,
    category: it.category,
    categoryKind: it.categoryKind,
    batch: it.batch,
    batchYear: it.batchYear,
    num: it.num,
    area: it.province,
    city,
    protectUnit: it.protectUnit,
    desc: it.desc,
  }
})

export const heritageTotal = heritageFile.count
export const heritageDeclaredTotal = heritageFile.declaredTotal

export const heritageByCity: { city: ShandongCity; count: number; items: HeritageRecord[] }[] = (
  Object.keys(CITY_CENTERS) as ShandongCity[]
).map((city) => {
  const items = heritageItems.filter((h) => h.city === city)
  return { city, count: items.length, items }
}).sort((a, b) => b.count - a.count)

export const heritageCoords = new Map<string, [number, number]>()
heritageByCity.forEach(({ city, items }) => {
  const center = CITY_CENTERS[city]
  items.forEach((h, idx) => {
    const { dx, dy } = spread(idx)
    heritageCoords.set(h.id, [Number((center.lat + dy).toFixed(4)), Number((center.lng + dx).toFixed(4))])
  })
})

const CATEGORY_ORDER = [
  '民间文学', '传统音乐', '传统舞蹈', '传统戏剧', '曲艺',
  '传统体育、游艺与杂技', '传统美术', '传统技艺', '传统医药', '民俗',
]
export const heritageCategories = CATEGORY_ORDER
  .map((name) => ({ name, count: heritageItems.filter((h) => h.category === name).length }))
  .filter((c) => c.count > 0)

export const heritageBatches = [...new Set(heritageItems.map((h) => h.batch))]
  .sort((a, b) => heritageItems.find((h) => h.batch === a)!.batchYear - heritageItems.find((h) => h.batch === b)!.batchYear)
  .map((batch) => ({ batch, count: heritageItems.filter((h) => h.batch === batch).length }))

export const heritageNoCity = heritageItems.filter((h) => !h.city)
export const heritageMaxCityCount = Math.max(...heritageByCity.map((c) => c.count), 1)


const newsFile = newsJson as unknown as RawNewsFile

export interface NewsItem {
  title: string
  url: string
  date: string | null
  channel: string
  keywords: string[]
  cities: ShandongCity[]
  sentiment: Sentiment
}

export const newsItems: NewsItem[] = newsFile.items.map((it) => ({
  title: it.title,
  url: it.url,
  date: it.date,
  channel: it.channel,
  keywords: keywordsOf(it.title),
  cities: citiesInText(it.title),
  sentiment: sentimentOf(it.title),
}))

export const newsTotal = newsItems.length
export const newsDatedCount = newsItems.filter((n) => n.date).length

const newsDates = newsItems.map((n) => n.date).filter((d): d is string => !!d).sort()
export const newsDateRange = {
  from: newsDates[0] ?? '',
  to: newsDates[newsDates.length - 1] ?? '',
}

export const newsKeywords = keywordFrequency(newsItems.map((n) => n.title), 40)

const sentimentCount = { positive: 0, neutral: 0, negative: 0 }
newsItems.forEach((n) => { sentimentCount[n.sentiment] += 1 })

export const newsSentimentCount = { ...sentimentCount, total: newsTotal }

export const newsSentiment = {
  positive: Math.round((sentimentCount.positive / (newsTotal || 1)) * 100),
  neutral: Math.round((sentimentCount.neutral / (newsTotal || 1)) * 100),
  negative: Math.max(0, 100 - Math.round((sentimentCount.positive / (newsTotal || 1)) * 100) - Math.round((sentimentCount.neutral / (newsTotal || 1)) * 100)),
}

export interface NewsChannel {
  channel: string
  host: string
  count: number
  positive: number
  neutral: number
  negative: number
  percent: number
}
export const newsByChannel: NewsChannel[] = [...new Set(newsItems.map((n) => n.channel))]
  .map((channel) => {
    const rows = newsItems.filter((n) => n.channel === channel)
    let host = '—'
    try {
      host = new URL(rows[0]?.url ?? '').host
    } catch {
      host = '—'
    }
    return {
      channel,
      host,
      count: rows.length,
      positive: rows.filter((r) => r.sentiment === 'positive').length,
      neutral: rows.filter((r) => r.sentiment === 'neutral').length,
      negative: rows.filter((r) => r.sentiment === 'negative').length,
      percent: Math.round((rows.length / (newsTotal || 1)) * 100),
    }
  })
  .sort((a, b) => b.count - a.count)

export interface NewsWarning {
  level: 'blue' | 'yellow' | 'orange' | 'red'
  label: string
  reason: string
}
function warningOf(): NewsWarning {
  const neg = newsSentimentCount.negative
  const share = (neg / (newsTotal || 1)) * 100
  const base = `近 ${newsTotal} 条山东文旅报道中，词表判定为负面的 ${neg} 条（${share.toFixed(1)}%）`
  if (share >= 15 || neg >= 8) return { level: 'red', label: '红色 · 高', reason: base + '，达到高等级阈值（≥15% 或 ≥8 条）' }
  if (share >= 8 || neg >= 4) return { level: 'orange', label: '橙色 · 中', reason: base + '，达到中等级阈值（≥8% 或 ≥4 条）' }
  if (share >= 3 || neg >= 2) return { level: 'yellow', label: '黄色 · 偏低', reason: base + '，达到偏低阈值（≥3% 或 ≥2 条）' }
  return { level: 'blue', label: '蓝色 · 平稳', reason: base + '，未达到分级阈值（<3% 且 <2 条）' }
}
export const newsWarning = warningOf()

export function newsDailyTrend(days = 7): { date: string; count: number; channels: number }[] {
  const end = newsDateRange.to
  if (!end) return []
  const endTime = new Date(`${end}T00:00:00Z`).getTime()
  const out: { date: string; count: number; channels: number }[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(endTime - i * 86400000).toISOString().slice(0, 10)
    const rows = newsItems.filter((n) => n.date === date)
    out.push({ date, count: rows.length, channels: new Set(rows.map((r) => r.channel)).size })
  }
  return out
}

export interface NewsCityStat {
  city: ShandongCity
  count: number
  lng: number
  lat: number
  titles: string[]
}
export const newsByCity: NewsCityStat[] = (Object.keys(CITY_CENTERS) as ShandongCity[])
  .map((city) => {
    const rows = newsItems.filter((n) => n.cities.includes(city))
    const c = CITY_CENTERS[city]
    return { city, count: rows.length, lng: c.lng, lat: c.lat, titles: rows.map((r) => r.title) }
  })
  .sort((a, b) => b.count - a.count)

export const newsCityMax = Math.max(...newsByCity.map((c) => c.count), 1)
export const newsNoCityCount = newsItems.filter((n) => n.cities.length === 0).length
export const newsTopCity = newsByCity[0]

export const newsByRelevance: NewsItem[] = [...newsItems].sort(
  (a, b) => b.keywords.length - a.keywords.length || String(b.date ?? '').localeCompare(String(a.date ?? '')),
)

export const newsNegativeItems = newsItems.filter((n) => n.sentiment === 'negative')
