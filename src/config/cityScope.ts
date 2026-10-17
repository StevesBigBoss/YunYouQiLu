/**
 * 全局「分析范围」口径：全部（全省 16 市）/ 沿黄河流域（9 市）/ 具体城市。
 *
 * 顶栏的城市筛选器写入 scopeState，首页与所有功能页统一从这里取范围并按范围重算数据；
 * 本文件只放静态口径与全局状态，具体派生（折算系数、县区展开、点位归属）在 scopeData.ts。
 */
import { reactive } from 'vue'
import { YELLOW_RIVER_CITIES } from '../types'
import { SHANDONG_CITIES, type ShandongCity } from './shandongRegions'

/** 范围标识：全省 / 沿黄九市 / 单个地级市 */
export type ScopeId = 'all' | 'river' | ShandongCity

/** 默认范围：黄河流域（沿黄九市） */
export const DEFAULT_SCOPE: ScopeId = 'river'

/** 沿黄九市集合（供标签、着色判断） */
export const YELLOW_RIVER_SET = new Set<string>(YELLOW_RIVER_CITIES)

/** 市 → 行政区划代码，对应 public/geo/{counties,roads}/{adcode}.json */
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

/** 该范围参与统计的城市（市级口径） */
export function scopeCities(scope: ScopeId): readonly ShandongCity[] {
  if (scope === 'all') return SHANDONG_CITIES
  if (scope === 'river') return YELLOW_RIVER_CITIES
  return [scope]
}

/** 范围的短名（标题、图例、面板用） */
export function scopeShort(scope: ScopeId): string {
  if (scope === 'all') return '全省'
  if (scope === 'river') return '沿黄九市'
  return `${scope}市`
}

/** 范围在正文里的说法（顶栏标签、口径说明用） */
export function scopeText(scope: ScopeId): string {
  if (scope === 'all') return '全省 16 市'
  if (scope === 'river') return '沿黄河流域 9 市'
  return `${scope}市`
}

/**
 * 全局范围状态（顶栏筛选器写入，首页与各功能页读取）。
 *
 * 用模块级 reactive 单例而不是 provide/inject：页面级组件都已经 import 本模块，
 * 响应式引用能直接参与各页面的 computed 依赖收集。
 */
export const scopeState = reactive<{ current: ScopeId }>({ current: DEFAULT_SCOPE })

export function setScope(next: ScopeId) {
  scopeState.current = next
}

/** 只有具体城市需要县区粒度展开 */
export function currentCityOf(scope: ScopeId): ShandongCity | null {
  return isCityScope(scope) ? scope : null
}

/**
 * 地图上点击某个市：把顶栏「分析范围」切到该市（单次点击即切换）。
 *
 * 地图 GeoJSON 里的 name 带「市」后缀，这里统一归一；不是山东地市时返回 null，
 * 调用方据此决定要不要切换（如全国底图里的其他省份不参与筛选）。
 */
export function switchScopeToCity(name: string): ShandongCity | null {
  const short = name.trim().replace(/市$/, '')
  const city = SHANDONG_CITIES.find((c) => c === short)
  if (!city) return null
  if (scopeState.current !== city) setScope(city)
  return city
}
