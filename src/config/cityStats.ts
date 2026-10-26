import type { CityTourismItem } from '../types'

export interface CountyStat {
  name: string
  share: number
  heat: number
  flow: number
  warn: number
}

function nameHash(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function countyWeight(name: string): number {
  return (name.endsWith('区') ? 1.5 : 1) * (0.55 + nameHash(name) * 0.6)
}

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
  const order = rows.map((_, i) => i).sort((a, b) => weights[b] - weights[a])
  for (let k = 0; k < city.warn && k < order.length; k++) rows[order[k]].warn += 1
  return rows
}
