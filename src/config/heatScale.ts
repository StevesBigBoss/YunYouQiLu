import { mapHeatColors, mapNoDataBorder, mapNoDataColor } from './mapPalette'

type RGB = [number, number, number]

const HEAT_STOPS: { stop: number; rgb: RGB }[] = [
  { stop: 0.0, rgb: [239, 230, 210] },
  { stop: 0.25, rgb: [230, 211, 168] },
  { stop: 0.45, rgb: [217, 183, 111] },
  { stop: 0.65, rgb: [198, 138, 69] },
  { stop: 0.85, rgb: [174, 90, 51] },
  { stop: 1.0, rgb: [140, 47, 34] },
]

export function NO_DATA_COLOR(): string {
  return mapNoDataColor()
}

export function NO_DATA_BORDER(): string {
  return mapNoDataBorder()
}

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

export function heatRatio(value: number, min: number, max: number): number {
  if (max <= min) return 1
  const raw = (value - min) / (max - min)
  return Math.min(1, MIN_VISIBLE + (1 - MIN_VISIBLE) * raw)
}

export function heatColor(value: number, min: number, max: number): string {
  return rampColor(heatRatio(value, min, max))
}

export function heatGradient(steps = 12): string {
  const colors: string[] = []
  for (let i = 0; i <= steps; i++) colors.push(rampColor(i / steps))
  return `linear-gradient(90deg, ${colors.join(', ')})`
}

const LEVELS = ['较低', '中等', '较高', '高', '极高'] as const

export function heatLevel(value: number, min: number, max: number): string {
  const ratio = heatRatio(value, min, max)
  const idx = Math.min(LEVELS.length - 1, Math.floor(((ratio - MIN_VISIBLE) / (1 - MIN_VISIBLE)) * LEVELS.length))
  return LEVELS[Math.max(0, idx)]
}
