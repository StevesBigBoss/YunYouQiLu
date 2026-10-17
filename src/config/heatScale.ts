// 旅游热度热力色带：默认米白→绛红，风格里给出 --map-heat 时改用风格色带
import { mapHeatColors, mapNoDataBorder, mapNoDataColor } from './mapPalette'

type RGB = [number, number, number]

const HEAT_STOPS: { stop: number; rgb: RGB }[] = [
  { stop: 0.0, rgb: [239, 230, 210] }, // 米白（最低）
  { stop: 0.25, rgb: [230, 211, 168] }, // 浅麦金
  { stop: 0.45, rgb: [217, 183, 111] }, // 暖金
  { stop: 0.65, rgb: [198, 138, 69] },  // 赭石
  { stop: 0.85, rgb: [174, 90, 51] },   // 砖红
  { stop: 1.0, rgb: [140, 47, 34] },    // 绛红（最高）
]

// 非沿黄城市填充色（不参与热力着色），取全局 --map-nodata / --map-nodata-border
export function NO_DATA_COLOR(): string {
  return mapNoDataColor()
}

export function NO_DATA_BORDER(): string {
  return mapNoDataBorder()
}

// 热力值下限对应的最低可见色阶，保证最低值仍能看清色阶
const MIN_VISIBLE = 0.2

function toHex(rgb: RGB): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function hexToRgb(hex: string): RGB | null {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  if (full.length !== 6) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

let customSource: string[] | null = null
let stopsCache = HEAT_STOPS

/** 当前风格生效的色带：风格自定义 6 色时只换颜色，色阶位置沿用内置比例 */
function activeStops(): { stop: number; rgb: RGB }[] {
  const custom = mapHeatColors()
  if (custom !== customSource) {
    customSource = custom
    stopsCache = custom
      ? HEAT_STOPS.map((s, i) => ({ stop: s.stop, rgb: hexToRgb(custom[i]) ?? s.rgb }))
      : HEAT_STOPS
  }
  return stopsCache
}

/** 取色带在 0~1 位置上的颜色 */
export function rampColor(t: number): string {
  const stops = activeStops()
  const v = Math.min(1, Math.max(0, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const cur = stops[i]
    const next = stops[i + 1]
    if (v <= next.stop) {
      const local = (v - cur.stop) / (next.stop - cur.stop)
      return toHex(mixRgb(cur.rgb, next.rgb, local))
    }
  }
  return toHex(stops[stops.length - 1].rgb)
}

/** 按 min~max 归一化数值，返回带最小可见度的色阶位置 */
export function heatRatio(value: number, min: number, max: number): number {
  if (max <= min) return 1
  const raw = (value - min) / (max - min)
  return Math.min(1, MIN_VISIBLE + (1 - MIN_VISIBLE) * raw)
}

/** 数值 → 热力色 */
export function heatColor(value: number, min: number, max: number): string {
  return rampColor(heatRatio(value, min, max))
}

/** 图例渐变条用的 CSS 渐变 */
export function heatGradient(steps = 12): string {
  const colors: string[] = []
  for (let i = 0; i <= steps; i++) colors.push(rampColor(i / steps))
  return `linear-gradient(90deg, ${colors.join(', ')})`
}

const LEVELS = ['较低', '中等', '较高', '高', '极高'] as const

/** 热力等级文案 */
export function heatLevel(value: number, min: number, max: number): string {
  const ratio = heatRatio(value, min, max)
  const idx = Math.min(LEVELS.length - 1, Math.floor(((ratio - MIN_VISIBLE) / (1 - MIN_VISIBLE)) * LEVELS.length))
  return LEVELS[Math.max(0, idx)]
}
