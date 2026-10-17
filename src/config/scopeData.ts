/**
 * 全局范围的数据派生层：所有功能页统一从这里取「按范围重算」的数值。
 *
 * 口径约定：
 * - 原始 mock 数值按「沿黄九市」为基准（平台本身是“云游齐鲁”沿黄文旅平台）；
 *   范围 = 沿黄九市时保持原始数值不变，范围 = 全省 16 市 或 单个城市时按客流占比缩放。
 * - 缩放带一个以「范围 + 用途」为种子的固定抖动，避免各页面数字完全等比例、看起来像复制；
 *   同一范围每次渲染结果一致，切换范围不会闪变。
 * - 具体城市范围下，市 → 县区 的粒度展开用 cityCounties 的静态县区表，
 *   权重与首页县区折算共用 countyWeight，保证同一个县区在首页与功能页的占比一致。
 */
import { computed } from 'vue'
import { CITY_CENTERS, CITY_COUNTIES, type CountyCenter } from './cityCounties'
import { scopeState, scopeCities, isCityScope, scopeShort, scopeText, type ScopeId } from './cityScope'
import { countyWeight } from './cityStats'
import { t } from './i18n'
import { mockHomeData, mockScenicSpots } from '../mock'
import type { ShandongCity } from './shandongRegions'

// ========== 范围基础 ==========

/** 当前范围（响应式） */
export const scope = computed<ScopeId>(() => scopeState.current)

/** 当前范围对应的城市；全省/沿黄范围为 null */
export const scopeCity = computed<ShandongCity | null>(() =>
  isCityScope(scopeState.current) ? scopeState.current : null,
)

/**
 * 范围名的展示写法：多市范围取词条（全省 / 沿黄九市…），单市范围用
 * 「城市名 + 当前语言的市后缀」合成（中文「潍坊市」，外语「Weifang City」）。
 */
export function scopeDisplayName(scope: ScopeId): string {
  return isCityScope(scope) ? t('{city}市', { city: scope }) : t(scopeText(scope))
}

/** 范围短名：全省 / 沿黄九市 / 潍坊市（展示口径，随语言切换） */
export const scopeLabel = computed(() => scopeDisplayName(scopeState.current))

/** 范围在页面小标签里的简称：全省 / 沿黄九市 / 潍坊市（展示口径，随语言切换） */
export const scopeShortName = computed(() =>
  isCityScope(scopeState.current) ? t('{city}市', { city: scopeState.current }) : t(scopeShort(scopeState.current)),
)

/** 范围内城市集合 */
export const scopeCitySet = computed(() => new Set<string>(scopeCities(scopeState.current) as readonly string[]))

/** 市名归一：'济南市' / '济南' → '济南' */
export function normCity(name: string): string {
  return name.endsWith('市') ? name.slice(0, -1) : name
}

/** 该市是否落在当前范围 */
export function inScope(name: string): boolean {
  return scopeCitySet.value.has(normCity(name))
}

/** 按 city 字段过滤列表（city 允许带「市」后缀） */
export function filterByCity<T extends { city: string }>(rows: T[]): T[] {
  return rows.filter((r) => inScope(r.city))
}

// ========== 缩放与抖动 ==========

const FLOW_OF: Record<string, number> = Object.fromEntries(
  mockHomeData.cityTourism.map((t) => [t.city, t.flow]),
)

/** 沿黄九市客流总量：缩放基准 */
const FLOW_RIVER = mockHomeData.cityTourism
  .filter((t) => ['菏泽', '济宁', '泰安', '聊城', '德州', '济南', '淄博', '滨州', '东营'].includes(t.city))
  .reduce((s, t) => s + t.flow, 0)

function fnv(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** 当前范围相对沿黄九市的总量倍率（沿黄 = 1） */
export const scopeShare = computed(() => {
  if (scopeState.current === 'river') return 1
  const cities = scopeCities(scopeState.current)
  return cities.reduce((s, c) => s + (FLOW_OF[c] ?? 0), 0) / FLOW_RIVER
})

/** 以「范围|用途」为种子的固定抖动系数，幅度 ±amp */
export function jitter(key: string, amp = 0.1): number {
  return 1 + (fnv(`${scopeState.current}|${key}`) * 2 - 1) * amp
}

/** 只跟键有关、与范围无关的固定抖动（承载量反推这类不该随范围变的值） */
export function stableJitter(key: string, amp = 0.1): number {
  return 1 + (fnv(`fixed|${key}`) * 2 - 1) * amp
}

/** 按范围缩放一个总量（整数，人次/条数/粉丝数这类） */
export function scaleNum(total: number, key: string, amp = 0.1): number {
  return Math.max(1, Math.round(total * scopeShare.value * jitter(key, amp)))
}

/** 按范围缩放一个带小数的数值（收入、水位、比例类） */
export function scaleVal(total: number, key: string, digits = 1, amp = 0.1): number {
  const v = total * scopeShare.value * jitter(key, amp)
  return Number(v.toFixed(digits))
}

/** 百分比类数值：围绕原始比例抖动，保持 0~100 */
export function scalePercent(base: number, key: string, amp = 0.08): number {
  const v = base * jitter(key, amp)
  return Math.min(99.9, Math.max(0.1, Number(v.toFixed(1))))
}

/**
 * 把一组占比数据按范围抖动后重新归一化到 100（保留 1 位小数，余数补给最大值），
 * 用于来源地/年龄/消费结构这类百分比饼图。
 */
export function normalizePercent(rows: { name: string; value: number }[], key: string): { name: string; value: number }[] {
  if (scopeShare.value === 1) return rows.map((r) => ({ ...r }))
  const raw = rows.map((r) => ({ name: r.name, value: Math.max(0.1, r.value * jitter(`${key}-${r.name}`)) }))
  const total = raw.reduce((s, r) => s + r.value, 0) || 1
  const out = raw.map((r) => ({ name: r.name, value: Math.round((r.value / total) * 1000) / 10 }))
  const diff = Math.round((100 - out.reduce((s, r) => s + r.value, 0)) * 10) / 10
  if (out.length) {
    let maxIdx = 0
    out.forEach((r, i) => { if (r.value > out[maxIdx].value) maxIdx = i })
    out[maxIdx].value = Math.round((out[maxIdx].value + diff) * 10) / 10
  }
  return out
}

// ========== 粒度单元：市（范围含多市）或县区（范围为单个城市） ==========

export interface ScopeUnit {
  /** 唯一键：市名 或 市-县区名 */
  key: string
  /** 图上显示的名字（含「市」后缀，或县区全名） */
  label: string
  city: ShandongCity
  county?: CountyCenter
  /** 在当前范围内的相对权重（合计为 1） */
  weight: number
}

/**
 * 当前粒度单元：
 * - 范围为单个城市 → 该市的县区（含中心点，可用于点位类图表）；
 * - 范围为全省/沿黄 → 范围内的市。
 */
export const scopeUnits = computed<ScopeUnit[]>(() => {
  const s = scopeState.current
  if (isCityScope(s)) {
    const list = CITY_COUNTIES[s]
    const weights = list.map((c) => countyWeight(c.name))
    const total = weights.reduce((a, b) => a + b, 0) || 1
    return list.map((c, i) => ({
      key: `${s}-${c.name}`,
      label: c.name,
      city: s,
      county: c,
      weight: weights[i] / total,
    }))
  }
  const cities = scopeCities(s)
  const weights = cities.map((c) => FLOW_OF[c] ?? 1)
  const total = weights.reduce((a, b) => a + b, 0) || 1
  return cities.map((c, i) => ({ key: c, label: `${c}市`, city: c, weight: weights[i] / total }))
})

/** 某个粒度单元在总量里的分项值（带抖动） */
export function unitValue(total: number, unit: ScopeUnit, key: string, digits = 0): number {
  const v = total * unit.weight * jitter(`${key}-${unit.key}`)
  return digits ? Number(v.toFixed(digits)) : Math.round(v)
}

// ========== 点位归属 ==========

/** 距给定坐标最近的市（16 市中心，粗粒度判定够用） */
export function nearestCity(lng: number, lat: number): ShandongCity {
  let best: ShandongCity = '济南'
  let bestD = Number.POSITIVE_INFINITY
  ;(Object.keys(CITY_CENTERS) as ShandongCity[]).forEach((c) => {
    const p = CITY_CENTERS[c]
    const d = (p.lng - lng) ** 2 + (p.lat - lat) ** 2
    if (d < bestD) {
      bestD = d
      best = c
    }
  })
  return best
}

/** 该坐标是否落在当前范围（按最近市判定） */
export function pointInScope(lng: number, lat: number): boolean {
  return inScope(nearestCity(lng, lat))
}

/**
 * 在某个市的县区中心附近生成确定性点位（用于补齐点位类数据的城市覆盖）。
 * 偏移量由「城市 + 序号」哈希决定，同一城市每次生成的位置一致。
 */
export function synthPoints(city: ShandongCity, count: number, salt: string): { lng: number; lat: number; county: CountyCenter }[] {
  const list = CITY_COUNTIES[city]
  if (!list.length) return []
  const out: { lng: number; lat: number; county: CountyCenter }[] = []
  for (let i = 0; i < count; i++) {
    const county = list[Math.floor(fnv(`${city}-${salt}-${i}`) * list.length) % list.length]
    const dx = (fnv(`dx-${city}-${salt}-${i}`) - 0.5) * 0.12
    const dy = (fnv(`dy-${city}-${salt}-${i}`) - 0.5) * 0.12
    out.push({ lng: Number((county.lng + dx).toFixed(4)), lat: Number((county.lat + dy).toFixed(4)), county })
  }
  return out
}

// ========== 名称 → 城市（用于只有名称的景区类数据） ==========

const SPOT_CITY = new Map<string, string>()
mockScenicSpots.forEach((s) => SPOT_CITY.set(s.name, normCity(s.city)))
mockHomeData.resourcePoints.forEach((r) => SPOT_CITY.set(r.name, normCity(r.city)))

/** 景区/资源点名称对应的城市；查不到返回 null（如「东营、滨州沿海」这类多市描述） */
export function spotCityOf(name: string): string | null {
  if (SPOT_CITY.has(name)) return SPOT_CITY.get(name)!
  // 名称里直接含市名的情况（"菏泽、济宁" / "济南、淄博"）
  for (const key of SPOT_CITY.values()) {
    if (name.includes(key)) return key
  }
  return null
}

/** 名称是否指向当前范围（多市描述只要命中一个市即算命中） */
export function nameInScope(name: string): boolean {
  for (const city of scopeCitySet.value) {
    if (name.includes(city)) return true
  }
  const c = spotCityOf(name)
  return c ? inScope(c) : false
}
