import { computed } from 'vue'
import { CITY_CENTERS, CITY_COUNTIES, type CountyCenter } from './cityCounties'
import { scopeState, scopeCities, isCityScope, scopeShort, scopeText, type ScopeId } from './cityScope'
import { countyWeight } from './cityStats'
import { t } from './i18n'
import { mockHomeData, mockScenicSpots } from '../mock'
import type { ShandongCity } from './shandongRegions'


export const scope = computed<ScopeId>(() => scopeState.current)

export const scopeCity = computed<ShandongCity | null>(() =>
  isCityScope(scopeState.current) ? scopeState.current : null,
)

export function scopeDisplayName(scope: ScopeId): string {
  return isCityScope(scope) ? t('{city}市', { city: scope }) : t(scopeText(scope))
}

export const scopeLabel = computed(() => scopeDisplayName(scopeState.current))

export const scopeShortName = computed(() =>
  isCityScope(scopeState.current) ? t('{city}市', { city: scopeState.current }) : t(scopeShort(scopeState.current)),
)

export const scopeCitySet = computed(() => new Set<string>(scopeCities(scopeState.current) as readonly string[]))

export function normCity(name: string): string {
  return name.endsWith('市') ? name.slice(0, -1) : name
}

export function inScope(name: string): boolean {
  return scopeCitySet.value.has(normCity(name))
}

export function filterByCity<T extends { city: string }>(rows: T[]): T[] {
  return rows.filter((r) => inScope(r.city))
}


const FLOW_OF: Record<string, number> = Object.fromEntries(
  mockHomeData.cityTourism.map((t) => [t.city, t.flow]),
)

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

export const scopeShare = computed(() => {
  if (scopeState.current === 'river') return 1
  const cities = scopeCities(scopeState.current)
  return cities.reduce((s, c) => s + (FLOW_OF[c] ?? 0), 0) / FLOW_RIVER
})

export function jitter(key: string, amp = 0.1): number {
  return 1 + (fnv(`${scopeState.current}|${key}`) * 2 - 1) * amp
}

export function stableJitter(key: string, amp = 0.1): number {
  return 1 + (fnv(`fixed|${key}`) * 2 - 1) * amp
}

export function scaleNum(total: number, key: string, amp = 0.1): number {
  return Math.max(1, Math.round(total * scopeShare.value * jitter(key, amp)))
}

export function scaleVal(total: number, key: string, digits = 1, amp = 0.1): number {
  const v = total * scopeShare.value * jitter(key, amp)
  return Number(v.toFixed(digits))
}

export function scalePercent(base: number, key: string, amp = 0.08): number {
  const v = base * jitter(key, amp)
  return Math.min(99.9, Math.max(0.1, Number(v.toFixed(1))))
}

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


export interface ScopeUnit {
  key: string
  label: string
  city: ShandongCity
  county?: CountyCenter
  weight: number
}

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

export function unitValue(total: number, unit: ScopeUnit, key: string, digits = 0): number {
  const v = total * unit.weight * jitter(`${key}-${unit.key}`)
  return digits ? Number(v.toFixed(digits)) : Math.round(v)
}


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

export function pointInScope(lng: number, lat: number): boolean {
  return inScope(nearestCity(lng, lat))
}

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


const SPOT_CITY = new Map<string, string>()
mockScenicSpots.forEach((s) => SPOT_CITY.set(s.name, normCity(s.city)))
mockHomeData.resourcePoints.forEach((r) => SPOT_CITY.set(r.name, normCity(r.city)))

export function spotCityOf(name: string): string | null {
  if (SPOT_CITY.has(name)) return SPOT_CITY.get(name)!
  for (const key of SPOT_CITY.values()) {
    if (name.includes(key)) return key
  }
  return null
}

export function nameInScope(name: string): boolean {
  for (const city of scopeCitySet.value) {
    if (name.includes(city)) return true
  }
  const c = spotCityOf(name)
  return c ? inScope(c) : false
}
