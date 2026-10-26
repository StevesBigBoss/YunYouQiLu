import L from 'leaflet'
import type { Feature, GeoJsonObject, Geometry } from 'geojson'
import { NO_DATA_BORDER, NO_DATA_COLOR } from './heatScale'
import { mapFocusColor } from './mapPalette'
import { t, tv } from './i18n'
import { mockYellowRiverCourse, mockYellowRiverFullCourse } from '../mock'

export const CHINA_GEOJSON_URL = `${import.meta.env.BASE_URL}china.json`

export const FOCUS_ADCODE = 370000

export const CHINA_CENTER: [number, number] = [35.8, 105.3]
export const CHINA_ZOOM = 3.5

const FAR_VIEW_ZOOM = 5.6

const CHINA_PANE = 'sd-china'
const CHINA_PANE_Z_INDEX = 350

export interface ChinaProvinceProperties {
  adcode: number | string
  name: string
  center?: [number, number]
  centroid?: [number, number]
}

export interface ChinaProvinceFeature {
  type: 'Feature'
  properties: ChinaProvinceProperties
  geometry: unknown
}

export interface ChinaProvinceFeatureCollection {
  type: 'FeatureCollection'
  features: ChinaProvinceFeature[]
}

export interface NationalBase {
  bounds: L.LatLngBounds
  layer: L.LayerGroup
}

export interface NationalBaseOptions {
  pane?: string
  paneZIndex?: number
}

export interface NationalIntroOptions {
  china: L.LatLngBounds
  focus: L.LatLngBounds
  paddingTopLeft?: L.PointExpression
  paddingBottomRight?: L.PointExpression
  hold?: number
  duration?: number
  onHoldStart?: () => void
  onDollyStart?: () => void
  onFinish?: () => void
}


export async function loadChinaProvinces(): Promise<ChinaProvinceFeatureCollection> {
  const res = await fetch(CHINA_GEOJSON_URL)
  if (!res.ok) throw new Error(`全国行政区划数据加载失败：${res.status}`)
  return (await res.json()) as ChinaProvinceFeatureCollection
}

function eachCoordinate(coords: unknown, visit: (lng: number, lat: number) => void): void {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    visit(coords[0] as number, coords[1] as number)
    return
  }
  ;(coords as unknown[]).forEach((c) => eachCoordinate(c, visit))
}

export function chinaBounds(fc: ChinaProvinceFeatureCollection): L.LatLngBounds {
  const bounds = L.latLngBounds([])
  fc.features.forEach((f) => {
    const geometry = f.geometry as { coordinates?: unknown } | null
    eachCoordinate(geometry?.coordinates, (lng, lat) => bounds.extend([lat, lng]))
  })
  return bounds
}

function provinceStyle(feature?: Feature<Geometry>): L.PathOptions {
  const adcode = Number(feature?.properties?.adcode)
  const name = String(feature?.properties?.name ?? '')
  if (!name) return { stroke: true, color: NO_DATA_BORDER(), weight: 1.4, opacity: 0.9, fill: false }
  if (adcode === FOCUS_ADCODE) {
    const focus = mapFocusColor()
    return { color: focus, weight: 1.6, opacity: 0.95, fillColor: focus, fillOpacity: 0.1 }
  }
  return { color: NO_DATA_BORDER(), weight: 1, opacity: 1, fillColor: NO_DATA_COLOR(), fillOpacity: 0.85 }
}

function provinceTooltip(name: string): string {
  return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div>
    <div class="sd-tip-none">${t('全国底图 · 非聚焦区域')}</div></div>`
}

function buildChinaBase(fc: ChinaProvinceFeatureCollection, pane: string): L.LayerGroup {
  const group = L.layerGroup()
  L.geoJSON(fc as unknown as GeoJsonObject, {
    pane,
    style: provinceStyle,
    onEachFeature: (feature, layer) => {
      const adcode = Number(feature?.properties?.adcode)
      const name = String(feature?.properties?.name ?? '')
      const path = layer as L.Path
      if (!name || adcode === FOCUS_ADCODE) {
        path.options.interactive = false
        return
      }
      layer.bindTooltip(() => provinceTooltip(name), {
        className: 'sd-tooltip',
        direction: 'top',
        offset: [0, -2],
        sticky: true,
      })
      layer.on('mouseover', () => path.setStyle({ weight: 1.8, color: mapFocusColor() }))
      layer.on('mouseout', () => path.setStyle(provinceStyle(feature)))
    },
  }).addTo(group)
  return group
}

export async function setupNationalBase(
  map: L.Map,
  options: NationalBaseOptions = {},
): Promise<NationalBase> {
  const pane = options.pane ?? CHINA_PANE
  if (!map.getPane(pane)) {
    map.createPane(pane)
    ;(map.getPane(pane) as HTMLElement).style.zIndex = String(options.paneZIndex ?? CHINA_PANE_Z_INDEX)
  }
  const fc = await loadChinaProvinces()
  const layer = buildChinaBase(fc, pane)
  if (map.getContainer()?.isConnected) layer.addTo(map)
  return { bounds: chinaBounds(fc), layer }
}


export const RIVER_PANE = 'sd-river'

const RIVER_SD_ENTRY_INDEX = 32

export function ensureRiverPane(map: L.Map, zIndex: number): void {
  if (map.getPane(RIVER_PANE)) return
  map.createPane(RIVER_PANE)
  ;(map.getPane(RIVER_PANE) as HTMLElement).style.zIndex = String(zIndex)
}

const RIVER_EMPHASIS_ZOOM = 6.5

interface RiverHandles {
  outer: L.Polyline
  sd: L.Polyline
  sdGlow: L.Polyline
  emphasisOn: boolean | null
}
const riverHandles = new WeakMap<L.LayerGroup, RiverHandles>()

function riverStyle(emphasis: boolean): { outer: L.PathOptions; sd: L.PathOptions; sdGlow: L.PathOptions } {
  if (emphasis) {
    return {
      outer: { color: '#A9C3D6', weight: 2, opacity: 0.5, dashArray: '12 16' },
      sd: { color: '#3E7FB0', weight: 3.4, opacity: 0.98, dashArray: '12 16' },
      sdGlow: { color: '#7FA6C4', weight: 9, opacity: 0.3 },
    }
  }
  return {
    outer: { color: '#7FA6C4', weight: 2.6, opacity: 0.8, dashArray: '12 16' },
    sd: { color: '#7FA6C4', weight: 2.6, opacity: 0.8, dashArray: '12 16' },
    sdGlow: { color: '#7FA6C4', weight: 8, opacity: 0.16 },
  }
}

export function buildYellowRiverLayer(): L.LayerGroup {
  const g = L.layerGroup()
  const style = riverStyle(true)
  const flowClass = 'sd-river-flow'
  const outer = L.polyline([...mockYellowRiverFullCourse.slice(0, RIVER_SD_ENTRY_INDEX + 1), mockYellowRiverCourse[0]], {
    pane: RIVER_PANE, className: flowClass, lineCap: 'round', interactive: false, ...style.outer,
  })
  outer.addTo(g)
  const sdGlow = L.polyline(mockYellowRiverCourse, {
    pane: RIVER_PANE, className: 'sd-river-glow', lineCap: 'round', interactive: false, ...style.sdGlow,
  })
  sdGlow.addTo(g)
  const sd = L.polyline(mockYellowRiverCourse, {
    pane: RIVER_PANE, className: flowClass, lineCap: 'round', interactive: false, ...style.sd,
  })
  sd.addTo(g)
  riverHandles.set(g, { outer, sd, sdGlow, emphasisOn: true })
  return g
}

export function bindRiverZoomEmphasis(map: L.Map, layer: L.LayerGroup): void {
  const h = riverHandles.get(layer)
  if (!h) return
  const sync = (force = false) => {
    const on = map.getZoom() >= RIVER_EMPHASIS_ZOOM
    if (!force && on === h.emphasisOn) return
    h.emphasisOn = on
    const s = riverStyle(on)
    h.outer.setStyle(s.outer)
    h.sd.setStyle(s.sd)
    h.sdGlow.setStyle(s.sdGlow)
  }
  sync(true)
  map.on('zoom zoomend', () => sync())
}


function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function setMapInputLocked(map: L.Map, locked: boolean): void {
  map.getContainer().classList.toggle('sd-map-locked', locked)
}

function focusView(
  map: L.Map,
  bounds: L.LatLngBounds,
  paddingTopLeft: L.Point,
  paddingBottomRight: L.Point,
): { center: L.LatLng; zoom: number } | null {
  const zoom = map.getBoundsZoom(bounds, false, paddingTopLeft.add(paddingBottomRight))
  if (!Number.isFinite(zoom)) return null
  const offset = paddingBottomRight.subtract(paddingTopLeft).divideBy(2)
  const center = map.unproject(
    map
      .project(bounds.getSouthWest(), zoom)
      .add(map.project(bounds.getNorthEast(), zoom))
      .divideBy(2)
      .add(offset),
    zoom,
  )
  return { center, zoom }
}

function cameraMover(map: L.Map): { move: (center: L.LatLng, zoom: number) => void; cheap: boolean } {
  const internal = map as L.Map & { _move?: (center: L.LatLng, zoom: number) => L.Map }
  if (typeof internal._move === 'function') {
    const move = internal._move.bind(map)
    return { move: (center, zoom) => void move(center, zoom), cheap: true }
  }
  return { move: (center, zoom) => void map.setView(center, zoom, { animate: false }), cheap: false }
}

function withViewReset<T extends object>(options: T): T & { reset: true } {
  return { ...options, reset: true }
}

function repaintView(map: L.Map): void {
  const snap = map.options.zoomSnap
  map.options.zoomSnap = 0
  map.setView(map.getCenter(), map.getZoom(), withViewReset({ animate: false }))
  map.options.zoomSnap = snap
}

interface StrokeKeeper {
  apply: (scale: number) => void
  restore: () => void
}

function freezeStrokes(map: L.Map, container: HTMLElement): StrokeKeeper {
  const items = new Map<SVGPathElement, number>()
  const absorb = () => {
    container.querySelectorAll<SVGPathElement>('path[stroke-width]').forEach((el) => {
      if (!items.has(el)) items.set(el, Number(el.getAttribute('stroke-width')) || 0)
    })
  }
  absorb()
  map.on('layeradd', absorb)
  const write = (scale: number) => {
    items.forEach((width, el) => {
      if (width > 0) el.setAttribute('stroke-width', String(width / scale))
    })
  }
  return {
    apply: (scale: number) => {
      if (scale > 0) write(scale)
    },
    restore: () => {
      map.off('layeradd', absorb)
      write(1)
      items.clear()
    },
  }
}

export function playNationalIntro(map: L.Map, options: NationalIntroOptions): () => void {
  const hold = options.hold ?? 550
  const duration = options.duration ?? 2000
  const paddingTopLeft = L.point(options.paddingTopLeft ?? [24, 24])
  const paddingBottomRight = L.point(options.paddingBottomRight ?? [24, 24])
  const container = map.getContainer()

  const wheelZoom = map.scrollWheelZoom
  const wheelZoomLocked = wheelZoom?.enabled() ?? false
  if (wheelZoomLocked) wheelZoom?.disable()

  let holdTimer = 0
  let guardTimer = 0
  let frame = 0
  let cancelled = false
  let finished = false
  let strokes: StrokeKeeper | null = null
  let panes: SVGSVGElement[] = []
  let smoothing = 0

  const swallowWheel = (event: WheelEvent) => event.preventDefault()

  const clearSmoothing = () => {
    smoothing = 0
    panes.forEach((el) => {
      el.style.transition = ''
    })
    panes = []
  }

  const halt = () => {
    window.clearTimeout(holdTimer)
    window.clearTimeout(guardTimer)
    cancelAnimationFrame(frame)
    window.removeEventListener('wheel', swallowWheel)
    clearSmoothing()
  }

  const releaseWheelZoom = (unmounting = false) => {
    if (wheelZoomLocked && !unmounting) wheelZoom?.enable()
  }

  const settleStrokes = () => {
    if (!strokes) return
    strokes.restore()
    strokes = null
  }

  const boundsKeeper = map as unknown as {
    options: { maxBounds?: L.LatLngBoundsExpression | null }
    _panInsideMaxBounds: L.LeafletEventHandlerFn
  }
  const maxBounds = map.options.maxBounds ?? null
  const releaseBounds = () => {
    if (!maxBounds) return
    boundsKeeper.options.maxBounds = null
    map.off('moveend', boundsKeeper._panInsideMaxBounds)
  }
  const restoreBounds = (unmounting = false) => {
    if (!maxBounds || boundsKeeper.options.maxBounds) return
    if (!unmounting) map.panInsideBounds(maxBounds, { animate: false })
    boundsKeeper.options.maxBounds = maxBounds
    map.on('moveend', boundsKeeper._panInsideMaxBounds)
  }

  const cancel = (unmounting = false) => {
    if (cancelled || finished) return
    cancelled = true
    const diving = panes.length > 0
    halt()
    settleStrokes()
    setMapInputLocked(map, false)
    restoreBounds(unmounting)
    releaseWheelZoom(unmounting)
    if (diving && container.isConnected) repaintView(map)
    if (!unmounting) options.onFinish?.()
  }

  const land = () => {
    if (cancelled || finished) return
    finished = true
    halt()
    settleStrokes()
    setMapInputLocked(map, false)
    map.fitBounds(options.focus, withViewReset({ paddingTopLeft, paddingBottomRight, animate: false }))
    restoreBounds()
    releaseWheelZoom()
    options.onFinish?.()
  }

  const recordLandingZoom = (): { center: L.LatLng; zoom: number } | null => {
    const view = focusView(map, options.focus, paddingTopLeft, paddingBottomRight)
    if (view) container.dataset.sdLandingZoom = String(view.zoom)
    return view
  }

  const dolly = (target: { center: L.LatLng; zoom: number }) => {
    options.onDollyStart?.()
    const { move, cheap } = cameraMover(map)
    const startZoom = map.getZoom()
    const from = map.project(map.getCenter(), target.zoom)
    const to = map.project(target.center, target.zoom)
    if (cheap) {
      strokes = freezeStrokes(map, container)
      panes = Array.from(container.querySelectorAll<SVGSVGElement>('.leaflet-pane svg'))
    }
    const startedAt = Date.now()
    let lastTick = startedAt

    const step = () => {
      if (cancelled || finished || !container.isConnected) return
      const now = Date.now()
      const gap = now - lastTick
      lastTick = now
      const want = gap > 45 ? Math.min(900, Math.round(gap * 1.15)) : 0
      if (cheap && Math.abs(want - smoothing) > 40) {
        smoothing = want
        const css = want ? `transform ${want}ms linear` : ''
        panes.forEach((el) => {
          el.style.transition = css
        })
      }
      const t = Math.min(1, (now - startedAt) / duration)
      if (t < 1) {
        const eased = easeInOutCubic(t)
        const zoom = startZoom + (target.zoom - startZoom) * eased
        move(map.unproject(from.add(to.subtract(from).multiplyBy(eased)), target.zoom), zoom)
        strokes?.apply(map.getZoomScale(zoom, startZoom))
        frame = requestAnimationFrame(step)
        return
      }
      move(target.center, target.zoom)
      strokes?.apply(map.getZoomScale(target.zoom, startZoom))
      if (smoothing > 0) {
        guardTimer = window.setTimeout(land, smoothing + 60)
        return
      }
      land()
    }
    frame = requestAnimationFrame(step)
    guardTimer = window.setTimeout(land, duration + 320)
  }

  const begin = () => {
    if (cancelled || !container.isConnected) return
    const size = map.getSize()
    if (size.x < 2 || size.y < 2) {
      holdTimer = window.setTimeout(begin, 120)
      return
    }
    releaseBounds()
    map.invalidateSize({ animate: false, pan: false })
    const target = recordLandingZoom()
    map.fitBounds(options.china, withViewReset({ animate: false, padding: L.point(8, 8) }))
    if (!target) {
      land()
      return
    }
    options.onHoldStart?.()
    holdTimer = window.setTimeout(() => dolly(target), hold)
  }
  setMapInputLocked(map, true)
  window.addEventListener('wheel', swallowWheel, { passive: false })
  begin()

  map.once('unload', () => cancel(true))

  return cancel
}

export function bindCityLabelZoom(map: L.Map, fallback = FAR_VIEW_ZOOM): void {
  const sync = () => {
    const container = map.getContainer()
    const landing = Number(container.dataset.sdLandingZoom)
    const threshold = landing > 0 ? landing - 0.3 : fallback
    container.classList.toggle('sd-far-view', map.getZoom() < threshold)
  }
  sync()
  map.on('zoom zoomend', sync)
}


export interface ScopeFlightOptions {
  paddingTopLeft?: L.PointExpression
  paddingBottomRight?: L.PointExpression
  duration?: number
}

interface ScopeFlightSample {
  center: L.LatLng
  zoom: number
  t: number
}

interface SdVectorRenderer {
  options: { padding: number }
  _bounds: L.Bounds
  _container: SVGSVGElement
  _center: L.LatLng
  _zoom: number
  _update: () => void
  _updateTransform: (center: L.LatLng, zoom: number) => void
  _reset: () => void
  _sdPad?: number
}

const SCOPE_WINDOW_MARGIN = 8

let scopeFlightToken: symbol | null = null

function vectorRenderers(map: L.Map): SdVectorRenderer[] {
  const layers = (map as unknown as { _layers?: Record<string, unknown> })._layers ?? {}
  const out: SdVectorRenderer[] = []
  Object.keys(layers).forEach((id) => {
    const l = layers[id] as SdVectorRenderer
    if (l && l._bounds instanceof L.Bounds && l._container && l._container.tagName === 'svg') out.push(l)
  })
  return out
}

function scopeFlightPath(map: L.Map, target: { center: L.LatLng; zoom: number }): ScopeFlightSample[] {
  const size = map.getSize()
  const startZoom = map.getZoom()
  const from = map.project(map.getCenter(), startZoom)
  const to = map.project(target.center, startZoom)
  const w0 = Math.max(size.x, size.y)
  const w1 = w0 * map.getZoomScale(startZoom, target.zoom)
  const u1 = to.distanceTo(from) || 1
  const rho = 1.42
  const rho2 = rho * rho
  const sinh = (n: number) => (Math.exp(n) - Math.exp(-n)) / 2
  const cosh = (n: number) => (Math.exp(n) + Math.exp(-n)) / 2
  const curve = (end: boolean) => {
    const t1 = w1 * w1 - w0 * w0 + (end ? -1 : 1) * rho2 * rho2 * u1 * u1
    const b = t1 / (2 * (end ? w1 : w0) * rho2 * u1)
    const sq = Math.sqrt(b * b + 1) - b
    return sq < 1e-9 ? -18 : Math.log(sq)
  }
  const r0 = curve(false)
  const span = (curve(true) - r0) / rho
  const steps = 36
  const samples: ScopeFlightSample[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const s = (1 - Math.pow(1 - t, 1.5)) * span
    const den = cosh(r0 + rho * s)
    const w = (w0 * cosh(r0)) / den
    const u = (w0 * (cosh(r0) * (sinh(r0 + rho * s) / den) - sinh(r0))) / rho2
    samples.push({
      center: map.unproject(from.add(to.subtract(from).multiplyBy(u / u1)), startZoom),
      zoom: startZoom + Math.log2(w0 / w),
      t,
    })
  }
  samples[steps] = { center: target.center, zoom: target.zoom, t: 1 }
  return samples
}

function widenRenderer(map: L.Map, r: SdVectorRenderer, samples: ScopeFlightSample[], from: number): void {
  const size = map.getSize()
  const halfX = size.x / 2
  const halfY = size.y / 2
  if (halfX < 2 || halfY < 2) return
  const liveZoom = map.getZoom()
  const kz = Math.pow(2, r._zoom - liveZoom)
  const base = map.latLngToLayerPoint(r._center)
  let needX = 0
  let needY = 0
  samples.forEach((s) => {
    if (s.t < from) return
    const k = kz * Math.pow(2, liveZoom - s.zoom)
    const p = map.latLngToLayerPoint(s.center)
    needX = Math.max(needX, Math.abs((p.x - base.x) * kz) + (halfX + SCOPE_WINDOW_MARGIN) * k)
    needY = Math.max(needY, Math.abs((p.y - base.y) * kz) + (halfY + SCOPE_WINDOW_MARGIN) * k)
  })
  const need = Math.max(needX / halfX - 1, needY / halfY - 1) / 2
  const applied = r.options.padding
  if (need <= applied + 1e-3) return
  if (r._sdPad === undefined) r._sdPad = applied
  const center = r._center
  const zoom = r._zoom
  r.options.padding = need
  r._update()
  r._center = center
  r._zoom = zoom
  r._updateTransform(map.getCenter(), map.getZoom())
}

function restoreRenderer(r: SdVectorRenderer): void {
  if (r._sdPad === undefined) return
  r.options.padding = r._sdPad
  delete r._sdPad
}

function reframeRenderer(r: SdVectorRenderer): void {
  r._reset()
}

function closeLayerTooltips(map: L.Map): void {
  map.eachLayer((layer) => {
    const l = layer as L.Layer & { getTooltip?: () => L.Tooltip | undefined; closeTooltip?: () => void }
    const tip = l.getTooltip?.()
    if (tip?.isOpen() && l.closeTooltip) l.closeTooltip()
  })
}

export function flyScopeView(map: L.Map, bounds: L.LatLngBounds, options: ScopeFlightOptions = {}): () => void {
  const paddingTopLeft = options.paddingTopLeft ?? [24, 24]
  const paddingBottomRight = options.paddingBottomRight ?? [24, 24]
  const duration = Math.max(120, (options.duration ?? 0.7) * 1000)
  const container = map.getContainer()
  const target = focusView(map, bounds, L.point(paddingTopLeft), L.point(paddingBottomRight))
  if (!target || !container.isConnected) {
    map.fitBounds(bounds, { paddingTopLeft, paddingBottomRight, animate: false })
    return () => {}
  }

  const samples = scopeFlightPath(map, target)
  const startedAt = Date.now()
  const token = Symbol('sd-scope-flight')
  scopeFlightToken = token
  let hookFrame = 0
  let guardTimer = 0
  let settled = false
  const freshRenderers = new Set<SdVectorRenderer>()

  const widenAll = () => {
    const done = Math.min(1, (Date.now() - startedAt) / duration)
    vectorRenderers(map).forEach((r) => widenRenderer(map, r, samples, done))
  }
  const onLayerAdd = (ev: { layer: L.Layer }) => {
    const renderer = (ev.layer as L.Path & { _renderer?: SdVectorRenderer })._renderer
    if (renderer) freshRenderers.add(renderer)
    if (hookFrame) return
    hookFrame = window.requestAnimationFrame(() => {
      hookFrame = 0
      freshRenderers.forEach(reframeRenderer)
      freshRenderers.clear()
      widenAll()
    })
  }
  const swallowTooltip = (ev: L.TooltipEvent) => {
    map.closeTooltip(ev.tooltip)
  }

  const settle = () => {
    if (settled) return
    settled = true
    window.clearTimeout(guardTimer)
    window.cancelAnimationFrame(hookFrame)
    freshRenderers.clear()
    map.off('layeradd', onLayerAdd)
    map.off('tooltipopen', swallowTooltip)
    vectorRenderers(map).forEach(restoreRenderer)
    if (scopeFlightToken !== token) return
    scopeFlightToken = null
    container.classList.remove('sd-flying')
  }

  widenAll()
  map.on('layeradd', onLayerAdd)
  map.on('tooltipopen', swallowTooltip)
  closeLayerTooltips(map)
  container.classList.add('sd-flying')

  map.flyToBounds(bounds, { paddingTopLeft, paddingBottomRight, duration: options.duration ?? 0.7 })
  map.once('zoomend', settle)
  map.once('moveend', settle)
  map.once('unload', settle)
  guardTimer = window.setTimeout(settle, duration + 400)
  return settle
}
