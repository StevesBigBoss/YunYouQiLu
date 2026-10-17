/**
 * 市级总量 → 县区折算（演示口径）。
 *
 * 县区粒度没有公开的实时口径数据，这里把所选城市的市级总量按「稳定权重」拆分：
 * 城区（名带「区」）权重更高，其余按名称哈希取 0.55~1.15 的固定系数——
 * 同一城市每次渲染的县区数值完全一致，切换范围不会闪变。
 */
import type { CityTourismItem } from '../types'

export interface CountyStat {
  /** 县区全名，与 DataV 县界 properties.name 一致 */
  name: string
  /** 占全市客流的比例（0-1） */
  share: number
  /** 旅游热度，单位：万人次（近30日） */
  heat: number
  /** 实时客流，单位：人次 */
  flow: number
  /** 今日预警，单位：条 */
  warn: number
}

/** FNV-1a 变体：把县区名映射到 0~1 的固定系数 */
function nameHash(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/**
 * 县区权重：城区（名带「区」）更高，其余按名称哈希取 0.55~1.15 的固定系数。
 * 首页县区折算与其它功能页的县区粒度折算共用同一套权重，保证同一县区在不同页面的相对占比一致。
 */
export function countyWeight(name: string): number {
  return (name.endsWith('区') ? 1.5 : 1) * (0.55 + nameHash(name) * 0.6)
}

/**
 * 整数折算：把总量按权重拆成整数，合计严格等于总量（最大余数法）。
 * 逐项四舍五入会各算各的，市级 5 处可能摊出 7 个「1 处」，与右侧「共 5 处」对不上。
 */
export function splitIntByWeight(total: number, weights: number[]): number[] {
  const t = Math.max(0, Math.round(total))
  const sum = weights.reduce((s, w) => s + w, 0) || 1
  const exact = weights.map((w) => (t * w) / sum)
  const out = exact.map((v) => Math.floor(v))
  const rest = t - out.reduce((s, v) => s + v, 0)
  if (rest > 0) {
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < rest && k < order.length; k++) out[order[k].i] += 1
  }
  return out
}

export function splitCityToCounties(city: CityTourismItem, names: string[]): CountyStat[] {
  const weights = names.map((n) => countyWeight(n))
  const total = weights.reduce((s, w) => s + w, 0) || 1
  const rows: CountyStat[] = names.map((name, i) => {
    const share = weights[i] / total
    return {
      name,
      share,
      heat: Math.round(city.heat * share * 10) / 10,
      flow: Math.round(city.flow * share),
      warn: 0,
    }
  })
  // 预警逐条给权重最高的县区，保证县区预警之和与市级一致
  const order = rows.map((_, i) => i).sort((a, b) => weights[b] - weights[a])
  for (let k = 0; k < city.warn && k < order.length; k++) rows[order[k]].warn += 1
  return rows
}
