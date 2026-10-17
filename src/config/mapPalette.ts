// 地图配色取自当前风格的 CSS 变量（见 style.css 的 [data-theme] 块），
// Leaflet 的 SVG 路径颜色由 JS 绘制，这里按主题做一层缓存读取
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

/** 非沿黄城市填充色 */
export function mapNoDataColor(): string {
  return cssVar('--map-nodata', FALLBACK_NO_DATA)
}

/** 非沿黄城市描边色 */
export function mapNoDataBorder(): string {
  return cssVar('--map-nodata-border', FALLBACK_NO_DATA_BORDER)
}

/** 聚焦省份（山东）主色 */
export function mapFocusColor(): string {
  return cssVar('--map-focus', FALLBACK_FOCUS)
}

/** 热力色带的低端色，用于图例等处的兜底 */
export function mapHeatFallback(): string {
  return FALLBACK_HEAT[0]
}

/**
 * 地市「五颜六色」的分类配色（饮食文化页用）：按市名固定取色，不随数值/筛选变。
 * 全部取中间调（明度 45%~60%），地名标注统一改白色加阴影，浅色底图与深色底图上都读得清。
 */
const CITY_CATEGORY_COLORS = [
  '#C4252A', // 红
  '#C2531F', // 橙红
  '#B07A1E', // 金橙
  '#8F9C1E', // 黄绿
  '#5C9E1E', // 草绿
  '#2C9E33', // 翠绿
  '#1E9E6B', // 青绿
  '#1E9EA0', // 青
  '#1E7BA0', // 蓝青
  '#1E55A0', // 蓝
  '#3B3BA8', // 靛
  '#6B3BA8', // 紫
  '#9A3BA8', // 紫红
  '#B0308A', // 洋红
  '#B03060', // 玫红
  '#B0303F', // 深红
]

/** 山东 16 市的固定顺序（决定各市拿到哪个色） */
const CITY_COLOR_ORDER = [
  '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁',
  '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
]

/** 市名（可带「市」后缀）→ 固定分类色 */
export function cityCategoryColor(city: string): string {
  const short = city.replace(/市$/, '')
  const idx = CITY_COLOR_ORDER.indexOf(short)
  return CITY_CATEGORY_COLORS[(idx < 0 ? 0 : idx) % CITY_CATEGORY_COLORS.length]
}

/** 分类配色的彩虹点（图例/图层开关用）：取 6 个代表色拼成一条渐变色带 */
export const CITY_RAINBOW = `linear-gradient(90deg, ${[0, 3, 5, 8, 11, 14]
  .map((i) => CITY_CATEGORY_COLORS[i])
  .join(', ')})`

/** 分类色是否偏深（用于决定标注用白字） */
export function isDeepColor(hex: string): boolean {
  const rgb = hexToRgbLocal(hex)
  if (!rgb) return true
  const [r, g, b] = rgb
  // 感知亮度（ITU-R BT.601），< 0.62 视为深色底
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

/**
 * 风格自定义的热力色带：--map-heat 需给出低→高 6 个颜色（逗号分隔），
 * 未定义或格式不符时返回 null，此时沿用 heatScale 内置的米白→绛红色带。
 */
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
