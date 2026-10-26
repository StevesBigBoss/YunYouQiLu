const FALLBACK_NO_DATA = '#E7EBE7'
const FALLBACK_NO_DATA_BORDER = '#D0D5D0'
const FALLBACK_FOCUS = '#00AF5C'
const FALLBACK_HEAT = ['#BFD9F2', '#6FC5C5', '#8CCE6E', '#EFD64E', '#E87B33', '#C6392F']

let cachedTheme = '\u0000'
const varCache = new Map<string, string>()

function themeKey(): string {
  return document.documentElement.dataset.theme ?? ''
}

function cssVar(name: string, fallback: string): string {
  const theme = themeKey()
  if (theme !== cachedTheme) {
    cachedTheme = theme
    varCache.clear()
  }
  const hit = varCache.get(name)
  if (hit !== undefined) return hit
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const value = raw === '' ? fallback : raw
  varCache.set(name, value)
  return value
}

export function mapNoDataColor(): string {
  return cssVar('--map-nodata', FALLBACK_NO_DATA)
}

export function mapNoDataBorder(): string {
  return cssVar('--map-nodata-border', FALLBACK_NO_DATA_BORDER)
}

export function mapFocusColor(): string {
  return cssVar('--map-focus', FALLBACK_FOCUS)
}

export function mapHeatFallback(): string {
  return FALLBACK_HEAT[0]
}

const CITY_CATEGORY_COLORS = [
  '#C4252A',
  '#C2531F',
  '#B07A1E',
  '#8F9C1E',
  '#5C9E1E',
  '#2C9E33',
  '#1E9E6B',
  '#1E9EA0',
  '#1E7BA0',
  '#1E55A0',
  '#3B3BA8',
  '#6B3BA8',
  '#9A3BA8',
  '#B0308A',
  '#B03060',
  '#B0303F',
]

const CITY_COLOR_ORDER = [
  '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁',
  '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
]

export function cityCategoryColor(city: string): string {
  const short = city.replace(/市$/, '')
  const idx = CITY_COLOR_ORDER.indexOf(short)
  return CITY_CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CITY_CATEGORY_COLORS.length]
}

export const CITY_RAINBOW = `linear-gradient(90deg, ${[0, 3, 5, 8, 11, 14]
  .map((i) => CITY_CATEGORY_COLORS[i])
  .join(', ')})`

export function isDeepColor(hex: string): boolean {
  const rgb = hexToRgbLocal(hex)
  if (!rgb) return true
  const [r, g, b] = rgb
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.62
}

function hexToRgbLocal(hex: string): [number, number, number] | null {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (full.length !== 6) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

let heatCacheTheme = '\u0000'
let heatCache: string[] | null = null

export function mapHeatColors(): string[] | null {
  const theme = themeKey()
  if (theme === heatCacheTheme) return heatCache
  heatCacheTheme = theme
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--map-heat').trim()
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(item))
  heatCache = list.length === 6 ? list : null
  return heatCache
}
