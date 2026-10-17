/**
 * 县级行政区划数据。
 *
 * - public/geo/counties/{adcode}.json：县（市、区）边界，来源阿里云 DataV.GeoAtlas，
 *   构建期统一简化（坐标 4 位小数，约 130 m 容差）；选中具体城市时按需拉取并按市缓存。
 *
 * 失败不缓存，便于重试。
 */
import type { GeoJsonObject } from 'geojson'
import type { ShandongCity } from './shandongRegions'
import { CITY_ADCODE } from './cityScope'

export interface CountyProperties {
  name: string
  adcode: number
  /** 所属地市简称 */
  city: ShandongCity
  /** 县区中心点（用于标注） */
  center: [number, number]
}

export interface CountyFeature {
  type: 'Feature'
  properties: CountyProperties
  geometry: GeoJsonObject
}

export interface CountyFeatureCollection {
  type: 'FeatureCollection'
  features: CountyFeature[]
}

const countyCache = new Map<ShandongCity, Promise<CountyFeatureCollection>>()

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}geo/${file}`)
  if (!res.ok) throw new Error(`地理数据加载失败：${file}（HTTP ${res.status}）`)
  return (await res.json()) as T
}

export function loadCounties(city: ShandongCity): Promise<CountyFeatureCollection> {
  let p = countyCache.get(city)
  if (!p) {
    p = fetchJson<CountyFeatureCollection>(`counties/${CITY_ADCODE[city]}.json`)
    countyCache.set(city, p)
    void p.catch(() => countyCache.delete(city))
  }
  return p
}
