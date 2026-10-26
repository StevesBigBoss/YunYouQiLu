import { reactive } from 'vue'
import { YELLOW_RIVER_CITIES } from '../types'
import { SHANDONG_CITIES, type ShandongCity } from './shandongRegions'

export type ScopeId = 'all' | 'river' | ShandongCity

export const DEFAULT_SCOPE: ScopeId = 'river'

export const YELLOW_RIVER_SET = new Set<string>(YELLOW_RIVER_CITIES)

export const CITY_ADCODE: Record<ShandongCity, number> = {
  济南: 370100,
  青岛: 370200,
  淄博: 370300,
  枣庄: 370400,
  东营: 370500,
  烟台: 370600,
  潍坊: 370700,
  济宁: 370800,
  泰安: 370900,
  威海: 371000,
  日照: 371100,
  临沂: 371300,
  德州: 371400,
  聊城: 371500,
  滨州: 371600,
  菏泽: 371700,
}

export function isCityScope(scope: ScopeId): scope is ShandongCity {
  return scope !== 'all' && scope !== 'river'
}

export function scopeCities(scope: ScopeId): readonly ShandongCity[] {
  if (scope === 'all') return SHANDONG_CITIES
  if (scope === 'river') return YELLOW_RIVER_CITIES
  return [scope]
}

export function scopeShort(scope: ScopeId): string {
  if (scope === 'all') return '全省'
  if (scope === 'river') return '沿黄九市'
  return `${scope}市`
}

export function scopeText(scope: ScopeId): string {
  if (scope === 'all') return '全省 16 市'
  if (scope === 'river') return '沿黄河流域 9 市'
  return `${scope}市`
}

export const scopeState = reactive<{ current: ScopeId }>({ current: DEFAULT_SCOPE })

export function setScope(next: ScopeId) {
  scopeState.current = next
}

export function currentCityOf(scope: ScopeId): ShandongCity | null {
  return isCityScope(scope) ? scope : null
}

export function switchScopeToCity(name: string): ShandongCity | null {
  const short = name.trim().replace(/市$/, '')
  const city = SHANDONG_CITIES.find((c) => c === short)
  if (!city) return null
  if (scopeState.current !== city) setScope(city)
  return city
}
