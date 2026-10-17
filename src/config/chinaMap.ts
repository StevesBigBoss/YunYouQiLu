// 全国底图与「由远及近」入场：每个功能块打开时先落到全国视野，再飞入山东省聚焦
import L from 'leaflet'
import type { Feature, GeoJsonObject, Geometry } from 'geojson'
import { NO_DATA_BORDER, NO_DATA_COLOR } from './heatScale'
import { mapFocusColor } from './mapPalette'
import { t, tv } from './i18n'
import { mockYellowRiverCourse, mockYellowRiverFullCourse } from '../mock'

/** 全国省级行政区划（含南海诸岛示意），静态资源随项目发布 */
export const CHINA_GEOJSON_URL = `${import.meta.env.BASE_URL}china.json`

/** 聚焦省份：山东省 */
export const FOCUS_ADCODE = 370000

/** 地图挂载时的初始视野（全国），随后由 playNationalIntro 由远及近飞入山东 */
export const CHINA_CENTER: [number, number] = [35.8, 105.3]
export const CHINA_ZOOM = 3.5

/** 全国视野下隐藏地市标注的缩放阈值：标注按屏幕像素渲染，远景会挤成一团 */
const FAR_VIEW_ZOOM = 5.6

/** 全国底图默认面板：层级低于各功能块的专题图层（sd-heat 380 / sd-river 420） */
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

/** 全国底图交付物：bounds 用于入场起点视野与可拖拽边界 */
export interface NationalBase {
  bounds: L.LatLngBounds
  layer: L.LayerGroup
}

export interface NationalBaseOptions {
  /** 全国底图所在面板，默认 sd-china */
  pane?: string
  paneZIndex?: number
}

export interface NationalIntroOptions {
  /** 全国范围（setupNationalBase 返回的 bounds），入场起点 */
  china: L.LatLngBounds
  /** 聚焦目标：页面里山东相关图层的范围 */
  focus: L.LatLngBounds
  /** 目标视野内为浮层面板预留的边距 */
  paddingTopLeft?: L.PointExpression
  paddingBottomRight?: L.PointExpression
  /** 全国视野停留时长（ms） */
  hold?: number
  /** 由远及近的飞行时长（ms） */
  duration?: number
  /**
   * 全国视野落定、停留阶段开始时回调一次。
   * 首页用它播「黄河从源头流向渤海」的入场小动画：这一段不推镜头，动画才看得清。
   */
  onHoldStart?: () => void
  /** 推近运镜的瞬间回调一次：入场小动画应在这里收尾，避免和推近叠在一起 */
  onDollyStart?: () => void
  /**
   * 入场结束（推近落位，或用户中途接管、组件切换）时回调一次。
   * 用来把入场期间临时关掉的图层放回来：推近时不铺专题图层，底图干净，看起来才像一次运镜。
   */
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

/** 全国范围（含南海诸岛的经纬度包围盒） */
export function chinaBounds(fc: ChinaProvinceFeatureCollection): L.LatLngBounds {
  const bounds = L.latLngBounds([])
  fc.features.forEach((f) => {
    const geometry = f.geometry as { coordinates?: unknown } | null
    eachCoordinate(geometry?.coordinates, (lng, lat) => bounds.extend([lat, lng]))
  })
  return bounds
}

/** 省级面要素样式：非聚焦省份统一中性米白，山东省留金色描边提示聚焦范围 */
function provinceStyle(feature?: Feature<Geometry>): L.PathOptions {
  const adcode = Number(feature?.properties?.adcode)
  const name = String(feature?.properties?.name ?? '')
  // 南海诸岛示意（十段线）无名称，只画线不铺面
  if (!name) return { stroke: true, color: NO_DATA_BORDER(), weight: 1.4, opacity: 0.9, fill: false }
  // 山东省内详情由各功能块的专题图层绘制，这里只描边，避免两层边界互相压色
  if (adcode === FOCUS_ADCODE) {
    const focus = mapFocusColor()
    return { color: focus, weight: 1.6, opacity: 0.95, fillColor: focus, fillOpacity: 0.1 }
  }
  return { color: NO_DATA_BORDER(), weight: 1, opacity: 1, fillColor: NO_DATA_COLOR(), fillOpacity: 0.85 }
}

/** 省名提示框：内容现拼，换语言后下次悬停即译（见 bindTooltip 的函数式 content） */
function provinceTooltip(name: string): string {
  return `<div class="sd-tip"><div class="sd-tip-name">${tv(name)}</div>
    <div class="sd-tip-none">${t('全国底图 · 非聚焦区域')}</div></div>`
}

/**
 * 构建全国底图：其余省份中性米白、只提示省名不参与点击，
 * 山东省留金边交给页面自己的专题图层。
 * 调用前需保证 pane 已存在（setupNationalBase 已处理）。
 */
function buildChinaBase(fc: ChinaProvinceFeatureCollection, pane: string): L.LayerGroup {
  const group = L.layerGroup()
  L.geoJSON(fc as unknown as GeoJsonObject, {
    pane,
    style: provinceStyle,
    onEachFeature: (feature, layer) => {
      const adcode = Number(feature?.properties?.adcode)
      const name = String(feature?.properties?.name ?? '')
      const path = layer as L.Path
      // 十段线与聚焦省份不参与交互：悬停/点击留给页面的山东专题图层
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

/** 加载并挂载全国底图，返回全国范围与图层组 */
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
  // 数据回来时页面可能已经切走：地图连同 pane 都已销毁，只算范围、不再往上叠图层
  if (map.getContainer()?.isConnected) layer.addTo(map)
  return { bounds: chinaBounds(fc), layer }
}

/** 黄河干流默认面板名：各功能块按自己的图元层级挑 z（见 ensureRiverPane 的调用处） */
export const RIVER_PANE = 'sd-river'

/** 全流域干流里「东明（入鲁）」的下标：省外段画到这里，再与山东段起点接龙 */
const RIVER_SD_ENTRY_INDEX = 32

/**
 * 黄河干流面板。Leaflet 的 createPane 不查重（重复调用会再造一个同名 div 并覆盖 _panes 记录），
 * 所以这里自己拦一道；z 由调用页给：河道要压在本页的填色之上、点位符号之下。
 */
export function ensureRiverPane(map: L.Map, zIndex: number): void {
  if (map.getPane(RIVER_PANE)) return
  map.createPane(RIVER_PANE)
  ;(map.getPane(RIVER_PANE) as HTMLElement).style.zIndex = String(zIndex)
}

/** 放大到该层级以上切换为「山东段高亮」：与首页同一阈值，落位视野约 7.5 级，一落位就是高亮态 */
const RIVER_EMPHASIS_ZOOM = 6.5

/** 黄河三段的线对象（缩放时按阈值切换配色） */
interface RiverHandles {
  outer: L.Polyline
  sd: L.Polyline
  sdGlow: L.Polyline
  emphasisOn: boolean | null
}
const riverHandles = new WeakMap<L.LayerGroup, RiverHandles>()

/**
 * 省外段 / 山东段的两套配色（与首页同一套画法，两段虚线周期同为 28，共用一条流动动画）：
 * 放大态——山东段亮蓝加粗并垫宽底光晕，省外段压暗压细只作整河上下文；
 * 全国视野——两段同款同虚实，看上去就是一条连通的黄河。
 */
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

/**
 * 黄河干流「流向图」：省外段压暗压细只作整河上下文，山东段双层描边（宽底 + 细芯）突出本省河段，
 * 两段在东明接龙成一条河道。虚线相位交给 CSS 动画（.sd-river-flow）常驻前移，任何层级下都在流动。
 *
 * 与首页的区别只在入场：首页另播一次「源头流向渤海」的一次性画出动画（sd-flow 面板 + 头部呼吸点），
 * 这里没有入场动画，河道落屏即成品、直接常流；配色与缩放联动与首页完全同一套。
 */
export function buildYellowRiverLayer(): L.LayerGroup {
  const g = L.layerGroup()
  const style = riverStyle(true)
  const flowClass = 'sd-river-flow'
  // 省外段画到东明（入鲁）为止，再接山东段起点：接缝重合、不在濮阳绕出一个回头弯
  const outer = L.polyline([...mockYellowRiverFullCourse.slice(0, RIVER_SD_ENTRY_INDEX + 1), mockYellowRiverCourse[0]], {
    pane: RIVER_PANE, className: flowClass, lineCap: 'round', interactive: false, ...style.outer,
  })
  outer.addTo(g)
  // 山东段：宽底光晕 + 亮芯（叠在最上层，放大后就是全场最亮的一段河道）
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

/**
 * 缩放联动（与首页同阈值）：抬头看全国时两段同款连通，俯视山东时本省段更亮。
 * 只在跨阈值时重写样式，缩放逐帧推进时不做无谓写入。
 */
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

/** 缓入缓出：起步稳、中段快、收尾缓，接近真实运镜的加减速 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * 地图输入锁：入场推近落位之前，整张地图不吃任何指针输入——拖拽、点选图元、滚轮缩放、
 * 缩放按钮全部失效（pointer-events:none 连子元素一起压住，Leaflet 的交互与页面自己的点选
 * 都收不到事件）。此前点一下地图会同时触发页面定位并打断运镜，观感就是「放大到一半卡住」；
 * 现在改为落位或交还视野之前不允许任何操作。样式见 style.css 的 .sd-map-locked。
 */
export function setMapInputLocked(map: L.Map, locked: boolean): void {
  map.getContainer().classList.toggle('sd-map-locked', locked)
}

/** 聚焦视野的落点：与 fitBounds 的内部算法一致（含浮层面板预留的边距），作为运镜终点 */
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

/**
 * 取逐帧推镜头的方法：Leaflet 内部的 _move（flyTo 逐帧用的就是它）。
 * cheap 为真表示只更新视野状态并广播 zoom/move，矢量图元按 zoom 事件改 CSS 变换、
 * 标注按 zoom 事件重定位，不会每帧重投影整份行政区划数据；
 * 取不到内部方法时退回 setView，视野结果一致，只是每帧重绘会慢一些（此时也不需要线宽补偿）。
 */
function cameraMover(map: L.Map): { move: (center: L.LatLng, zoom: number) => void; cheap: boolean } {
  const internal = map as L.Map & { _move?: (center: L.LatLng, zoom: number) => L.Map }
  if (typeof internal._move === 'function') {
    const move = internal._move.bind(map)
    return { move: (center, zoom) => void move(center, zoom), cheap: true }
  }
  return { move: (center, zoom) => void map.setView(center, zoom, { animate: false }), cheap: false }
}

/**
 * 补上 Leaflet 的 reset 选项（源码里 Map 构造器就是这么用的，@types 里没声明）。
 * 视野值没变时 setView/fitBounds 只会按平移处理（panBy），不广播 viewreset，矢量也就不会重新投影；
 * 而这段推近是靠整块 SVG 的 CSS 缩放放大的，图元始终停在起点缩放的投影上，
 * 所以落位/接管时必须带上 reset，强制按当前缩放重投影一次，否则底图会缩回推近前的全国视野。
 */
function withViewReset<T extends object>(options: T): T & { reset: true } {
  return { ...options, reset: true }
}

/** 按当前视野重绘一次（矢量按当前缩放重新投影、CSS 变换归位到 1:1），视野本身不变 */
function repaintView(map: L.Map): void {
  // setView 会按 zoomSnap 取整，这里临时关掉，避免接管时视野被吸到 0.25 的档位上
  const snap = map.options.zoomSnap
  map.options.zoomSnap = 0
  map.setView(map.getCenter(), map.getZoom(), withViewReset({ animate: false }))
  map.options.zoomSnap = snap
}

interface StrokeKeeper {
  apply: (scale: number) => void
  restore: () => void
}

/**
 * 线宽补偿：这段推近靠整块 SVG 的 CSS 变换放大，几何位置正确，但线宽会被一起放大
 * （推到最深处能粗好几倍）。按当前缩放反向写 stroke-width，屏幕上线宽保持原样；
 * 推近期间新挂上的图层（面板勾选）也随手补上。重绘后 Leaflet 不会自己写回，由 restore() 收尾。
 */
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

/**
 * 打开功能块时的「由远及近」：先把视野落到全国，稍作停留，再像摄像机推近一样缓入缓出地推进到聚焦范围。
 *
 * 这里不用 flyTo：它的节奏是「先横移、后缩放」——按它的双曲线路径，平移在头 20% 的时间里就走完 70%，
 * 缩放却一路拖到最后，观感是先猛地一窜、后半段再慢慢推；而且它靠 requestAnimationFrame 推进，
 * 容器没在绘制时（后台标签页、未绘制的容器）动画几乎不前进，只能靠兜底的强制 fitBounds 落位，
 * 于是变成「卡一会 + 突然放大」。改成按时间轴自行推进后：缓动单调递增（缩放只进不退），
 * 平移在投影坐标里走直线并与缩放同步，终点就是落点——落位只是按最终缩放重绘一次，不再有任何纠偏动作。
 *
 * 起点必须同步生效（animate:false）：走动画时若页面未在绘制，Leaflet 的过渡动画不会结束。
 * 返回取消函数：页面上的点选等主动定位应先取消入场，避免两段视野互相打断。
 */
export function playNationalIntro(map: L.Map, options: NationalIntroOptions): () => void {
  const hold = options.hold ?? 550
  const duration = options.duration ?? 2000
  const paddingTopLeft = L.point(options.paddingTopLeft ?? [24, 24])
  const paddingBottomRight = L.point(options.paddingBottomRight ?? [24, 24])
  const container = map.getContainer()

  /**
   * 运镜期间锁住滚轮缩放：推近是「按时间轴推视野」加「整块 SVG 做 CSS 缩放」两件事叠在一起，
   * 这时滚轮插进来改缩放，视觉上是在推近的缩放上再叠一层，画面会跳，落位视野也对不上。
   * 页面本来就是 scrollWheelZoom: true，落位或交还视野时按原样装回。
   */
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
  /** 跳帧补间时长：逐帧推进时保持 0（画面清晰），只在 rAF 被暂停、步进变成跳帧时才补 */
  let smoothing = 0

  /**
   * 入场期间吃掉滚轮：既是防缩放插进来，也防外层内容区跟着滚——输入锁生效后地图收不到
   * 指针事件、滚轮会落到地图下面的容器上，所以挂到 window 上挡；运镜结束即摘掉。
   */
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

  /** 交还滚轮缩放：运镜结束（落位或接管）后滚轮恢复缩放；卸载时地图正在销毁，不必再装回 */
  const releaseWheelZoom = (unmounting = false) => {
    if (wheelZoomLocked && !unmounting) wheelZoom?.enable()
  }

  /** 收线宽补偿：补偿是按「CSS 缩放还在」写的，重绘回 1:1 之后就必须一起收掉 */
  const settleStrokes = () => {
    if (!strokes) return
    strokes.restore()
    strokes = null
  }

  /**
   * 入场期间先把可拖拽边界松开。Leaflet 每次 moveend 后都会把视野矫正回 maxBounds，
   * 而这一步走的是 panTo —— 一次 250ms 的动画平移；入场里从挂载到落位之间的每个 moveend
   * （invalidateSize、fitBounds）都会触发它，画面于是先被推出去几个像素、再滑回来，
   * 看着就是「重进地图往右抖一下」。这里照 Leaflet 自己关掉边界的方式（置空 + 摘掉 moveend 矫正）
   * 临时松开，落位或交还视野时再装回。
   */
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
    // 卸载中地图正在销毁，只把配置还原；其余情况先无动画矫正到位，
    // 装回后那次立即矫正才不会再有位移（否则刚交还视野就抖一下）
    if (!unmounting) map.panInsideBounds(maxBounds, { animate: false })
    boundsKeeper.options.maxBounds = maxBounds
    map.on('moveend', boundsKeeper._panInsideMaxBounds)
  }

  /** 用户接管或组件卸载：停在当前视野，并把矢量重绘清晰，交还一张正常的地图 */
  const cancel = (unmounting = false) => {
    if (cancelled || finished) return
    cancelled = true
    const diving = panes.length > 0
    halt()
    settleStrokes()
    setMapInputLocked(map, false)
    // 边界在重绘前装回：矫正若带来位移，重绘就按最终视野来
    restoreBounds(unmounting)
    releaseWheelZoom(unmounting)
    // 只有推近途中被打断才需要重绘回 1:1：停留阶段视野还没动过，地图本来就是清晰的
    if (diving && container.isConnected) repaintView(map)
    // 卸载时地图正在销毁，图层不必再挂回来
    if (!unmounting) options.onFinish?.()
  }

  /** 落位：运镜终点就是落点，这里按终点重投影一次，让矢量回到清晰且正确的缩放上 */
  const land = () => {
    if (cancelled || finished) return
    finished = true
    halt()
    settleStrokes()
    setMapInputLocked(map, false)
    map.fitBounds(options.focus, withViewReset({ paddingTopLeft, paddingBottomRight, animate: false }))
    // 落位视野在边界内，这里装回只是恢复拖拽限制，矫正本身没有位移
    restoreBounds()
    releaseWheelZoom()
    // 回调放在重投影之后：此时视野已落定，挂回来的图层直接按落位缩放投影，不带任何 CSS 缩放
    options.onFinish?.()
  }

  /** 记下落位缩放：地市标注的显隐阈值取它（矮地图落位缩放更低，固定阈值会把标注一直藏住） */
  const recordLandingZoom = (): { center: L.LatLng; zoom: number } | null => {
    const view = focusView(map, options.focus, paddingTopLeft, paddingBottomRight)
    if (view) container.dataset.sdLandingZoom = String(view.zoom)
    return view
  }

  /** 运镜：按时间轴把镜头推到聚焦视野，缩放单调递增、平移与缩放同步（不会先横移后猛缩） */
  const dolly = (target: { center: L.LatLng; zoom: number }) => {
    options.onDollyStart?.()
    const { move, cheap } = cameraMover(map)
    const startZoom = map.getZoom()
    const from = map.project(map.getCenter(), target.zoom)
    const to = map.project(target.center, target.zoom)
    // 只有走 CSS 变换的路径才需要补偿线宽与补间：退回 setView 时每帧都按当前缩放重绘，本身就是对的
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
      // rAF 被暂停时步进会变成低频跳帧，这时给变换补一段过渡，让合成器把跳帧之间补成连续运镜
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
      // 终点与落位视野完全一致：先推到终点，再按终点重绘
      move(target.center, target.zoom)
      strokes?.apply(map.getZoomScale(target.zoom, startZoom))
      if (smoothing > 0) {
        // 补间还在路上，等它把最后一段走完再重绘：重绘结果与补间终点一致，看不出接缝
        guardTimer = window.setTimeout(land, smoothing + 60)
        return
      }
      land()
    }
    frame = requestAnimationFrame(step)
    // 兜底：容器不可见时 rAF 完全不前进，到点也要把视野落到聚焦范围上
    guardTimer = window.setTimeout(land, duration + 320)
  }

  /**
   * 入场起点：容器量到尺寸后再落全国视野。
   * 尺寸为 0 时 fitBounds 会把「全国范围铺满容器」算成退化值，图元会被裁到原点，
   * 全国底图与专题图层会整片消失（挂载瞬间容器还没参与布局时会出现），
   * 因此这里先等尺寸、并用一次 invalidateSize 让地图重新测量并重投影。
   */
  const begin = () => {
    if (cancelled || !container.isConnected) return
    const size = map.getSize()
    if (size.x < 2 || size.y < 2) {
      holdTimer = window.setTimeout(begin, 120)
      return
    }
    // 松开边界要赶在第一次广播 moveend 的动作（invalidateSize）之前
    releaseBounds()
    map.invalidateSize({ animate: false, pan: false })
    const target = recordLandingZoom()
    // 起点也重投影一次：推近靠 CSS 缩放放大整块 SVG，前提是图元就是按这个缩放投影的
    map.fitBounds(options.china, withViewReset({ animate: false, padding: L.point(8, 8) }))
    if (!target) {
      land()
      return
    }
    options.onHoldStart?.()
    holdTimer = window.setTimeout(() => dolly(target), hold)
  }
  // 推近落位之前整张地图不吃任何输入：起手就锁上，落位或交还视野时解开（见 setMapInputLocked）；
  // 滚轮在同一时段被吃掉（不缩放也不打断），落位或交还视野后才会还回去
  setMapInputLocked(map, true)
  window.addEventListener('wheel', swallowWheel, { passive: false })
  begin()

  map.once('unload', () => cancel(true))

  return cancel
}

/**
 * 远景隐藏地市标注：全国视野下标注会叠成一团，飞到省内再淡入。
 * 配合各页面样式里的 :deep(.sd-far-view .sd-city-label) { display: none }
 * 阈值优先取入场记录的落位缩放（容器越矮落位缩放越低，固定阈值会把标注一直藏住），
 * 没记录时退回全国/省内的经验分界值；用户手动缩回全国视野时标注会再次隐藏。
 */
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

/** 切范围运镜的选项：padding 与 duration 都和 Leaflet flyToBounds 的同名参数同义 */
export interface ScopeFlightOptions {
  /** 目标视野内为浮层面板预留的边距 */
  paddingTopLeft?: L.PointExpression
  paddingBottomRight?: L.PointExpression
  /** 运镜时长（秒） */
  duration?: number
}

/** 航迹采样点：某一时刻的镜头位置与缩放，t 为归一化时间（0 起飞、1 落位） */
interface ScopeFlightSample {
  center: L.LatLng
  zoom: number
  t: number
}

/**
 * 矢量渲染器在 Leaflet 内部的样子（@types 里没有这几个字段）：
 * 图元按「渲染器最后一次重投影」的视野投一次影，之后整块 SVG 只做 CSS 变换，
 * 而可见范围被 viewBox 锁在 _bounds 里 —— 这就是切到远处的市时「地图先缺一块、视角过去才出现」的根：
 * 飞行途中镜头已经走远，图元还停在起飞那一帧的裁剪窗口里。
 * 好消息是窗口与 CSS 变换都从 options.padding 现算（Renderer._update 与 _updateTransform），
 * 所以临时把 padding 调大就是「把窗口放宽」，几何位置不会偏；落位时 Leaflet 自己按原 padding 重算收回。
 */
interface SdVectorRenderer {
  options: { padding: number }
  _bounds: L.Bounds
  _container: SVGSVGElement
  _center: L.LatLng
  _zoom: number
  _update: () => void
  _updateTransform: (center: L.LatLng, zoom: number) => void
  /** 整套重投影：把冻结那一帧对齐到当前视野并按实际像素重算图元（Renderer._reset） */
  _reset: () => void
  /** 放宽前的原始 padding（Leaflet 不会自己改回来，收尾要按它还原） */
  _sdPad?: number
}

/** 窗口外多留几像素：落点算法与 Leaflet 一致，留点余量抵掉取整误差 */
const SCOPE_WINDOW_MARGIN = 8

/** 当前正在跑的切范围运镜：连点切市时后一次接管，先一次的收尾不摘后一次挂上的状态 */
let scopeFlightToken: symbol | null = null

/** 取地图上所有矢量渲染器（一个面板一个，切范围会动的图层都在其中某几个上） */
function vectorRenderers(map: L.Map): SdVectorRenderer[] {
  const layers = (map as unknown as { _layers?: Record<string, unknown> })._layers ?? {}
  const out: SdVectorRenderer[] = []
  Object.keys(layers).forEach((id) => {
    const l = layers[id] as SdVectorRenderer
    if (l && l._bounds instanceof L.Bounds && l._container && l._container.tagName === 'svg') out.push(l)
  })
  return out
}

/**
 * 复刻 flyTo 的双曲线航迹并按时间采样：窗口要放宽到盖住整条航段，就得先知道镜头怎么走。
 * w0/w1/u1/rho/r0/S 与源码一致；采样点只用来估窗口，末点用目标视野兜底（精确落点不靠它）。
 */
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
    // flyTo 的取帧是 s = easeOut(t) * S，这里按同一映射取点，缩放的谷底（中途最远的一刻）才采得到
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

/**
 * 把某个渲染器的裁剪窗口放宽到盖住航段的余下部分：只放宽不收窄（旧窗口还要盖住已经飞过的那段）。
 * 取景框中心就是窗口中心，所以按「航迹各点到中心的最大偏移 + 该时刻取景框半宽」算单边需求即可。
 */
function widenRenderer(map: L.Map, r: SdVectorRenderer, samples: ScopeFlightSample[], from: number): void {
  const size = map.getSize()
  const halfX = size.x / 2
  const halfY = size.y / 2
  if (halfX < 2 || halfY < 2) return
  const liveZoom = map.getZoom()
  // 图元停在渲染器自己那一层缩放上：现坐标系 → 渲染器冻结缩放的比值
  const kz = Math.pow(2, r._zoom - liveZoom)
  const base = map.latLngToLayerPoint(r._center)
  let needX = 0
  let needY = 0
  samples.forEach((s) => {
    if (s.t < from) return
    // 该时刻整块 SVG 的 CSS 缩放比例（相对冻结那一层）：图元尺寸乘它，窗口要跟着一起乘
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
  // _update 按新 padding 重算窗口、改元素尺寸与 viewBox，并广播 update 让图元按新窗口重新裁剪；
  // 但它顺手把 _center/_zoom 记成当前视野（图元并没有跟着重投影），这里原样放回，
  // 再按图元所在的那层缩放把 CSS 变换写一次 —— _update 里的 setPosition 会把缩放丢掉
  r._update()
  r._center = center
  r._zoom = zoom
  r._updateTransform(map.getCenter(), map.getZoom())
}

/** 收尾：padding 还原（窗口在下一次 moveend 的 _update 里自动收回原大小） */
function restoreRenderer(r: SdVectorRenderer): void {
  if (r._sdPad === undefined) return
  r.options.padding = r._sdPad
  delete r._sdPad
}

/**
 * 换帧：把渲染器的「冻结那一帧」对齐到当前视野，并让它名下的图元整套按实际像素重投影
 * （Renderer._reset = _update + 同帧变换 + 逐图元 _project/_update）。
 *
 * 飞行途中新建的图层若是加进起飞前就存在的渲染器上——切范围时县区图层复用的就是旧渲染器，
 * 它的冻结帧还停在起飞那一刻——新路径按当前视野投影，整块 SVG 却带着旧帧的 CSS 变换再缩放一次，
 * 画出来又小又偏，要等落位 zoomend 的重投影才归位（目标城市旁边先冒出一小块错位色斑）。
 * 换帧后几何与变换同帧，新图元当帧就地画对；已有图元的屏幕位置不变（两侧同时改写，正好抵消）。
 */
function reframeRenderer(r: SdVectorRenderer): void {
  r._reset()
}

/** 飞行开始先收掉已经打开的提示框：它挂在提示框面板里，不跟着整块 SVG 的缩放走 */
function closeLayerTooltips(map: L.Map): void {
  map.eachLayer((layer) => {
    const l = layer as L.Layer & { getTooltip?: () => L.Tooltip | undefined; closeTooltip?: () => void }
    const tip = l.getTooltip?.()
    if (tip?.isOpen() && l.closeTooltip) l.closeTooltip()
  })
}

/**
 * 切范围的运镜（点市、顶栏筛选、列表定位前的视野收拢都走这里）。
 *
 * 与直接 flyToBounds 的区别有三处，都是为了「飞行途中画面不掉链子」：
 * 1. 起飞前把每个矢量渲染器的裁剪窗口放宽到能盖住整条航段。Leaflet 的矢量图元只在开头
 *    按当时视野投影一次，之后整块 SVG 靠 CSS 缩放跟随镜头，窗口外的图元直接没有几何 ——
 *    切到远处的市时，目标区域整块落在窗口外，观感就是「地图没加载出来，视角移过去才出现」。
 *    放宽走的是渲染器自己的 padding（窗口与 CSS 变换都按它现算），几何不会偏，落位自动收回。
 * 2. 飞行期间新建的图层要换帧（见 reframeRenderer）：范围切过去后重建的县区图层会加在旧渲染器上，
 *    不换帧就会被旧帧的 CSS 变换再缩放一次，又小又偏地挂到落位才归位。
 * 3. 飞行期间压掉悬停放大与提示框：图面此刻是按整块 SVG 的 CSS 缩放重绘的，悬停高亮会与底图
 *    错开一瞬（鼠标停在图上时能看到，鼠标在图外时看不到）。点市与顶栏切换走同一段代码，样式一致。
 *
 * 返回的函数只负责收状态（窗口放宽、悬停抑制）；运镜本身由后来的 flyToBounds 接管打断。
 */
export function flyScopeView(map: L.Map, bounds: L.LatLngBounds, options: ScopeFlightOptions = {}): () => void {
  const paddingTopLeft = options.paddingTopLeft ?? [24, 24]
  const paddingBottomRight = options.paddingBottomRight ?? [24, 24]
  const duration = Math.max(120, (options.duration ?? 0.7) * 1000)
  const container = map.getContainer()
  // 落点用与 fitBounds 同一套算法先算出来：窗口放宽要按它估航迹（真正的落点还是交给 flyToBounds）
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
  /** 这一批新图层落在哪些渲染器上：换帧按渲染器做，一次会连着加好几个图层，合并到下一帧统一算 */
  const freshRenderers = new Set<SdVectorRenderer>()

  const widenAll = () => {
    const done = Math.min(1, (Date.now() - startedAt) / duration)
    vectorRenderers(map).forEach((r) => widenRenderer(map, r, samples, done))
  }
  const onLayerAdd = (ev: { layer: L.Layer }) => {
    // 飞行途中新建的图层（范围变了要重建的县区细分）要一并处理：先换帧把它落进当前视野，
    // 再把各渲染器的窗口放宽（新渲染器的窗口只盖住出生那一刻，旧渲染器的窗口还停在起飞那段）
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
  /** 悬停提示框：飞行期间图元会被 CSS 缩放搬走，这期间打开的提示框一律收掉（图元的点击不受影响） */
  const swallowTooltip = (ev: L.TooltipEvent) => {
    map.closeTooltip(ev.tooltip)
  }

  /** 收尾：落位（zoomend/moveend）、接管（卸载）与兜底定时都走这里，重复调用是空操作 */
  const settle = () => {
    if (settled) return
    settled = true
    window.clearTimeout(guardTimer)
    window.cancelAnimationFrame(hookFrame)
    freshRenderers.clear()
    map.off('layeradd', onLayerAdd)
    map.off('tooltipopen', swallowTooltip)
    vectorRenderers(map).forEach(restoreRenderer)
    // 连点切市时后一次已经接手：悬停状态留给后一次收，否则会在后一次的飞行途中把悬停放回来
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
  // 落位时 Leaflet 自己会按（已还原的）padding 重算窗口并重新裁剪，这里只收状态：
  // zoomend 早于 moveend，还原赶得上落位那次重算
  map.once('zoomend', settle)
  map.once('moveend', settle)
  map.once('unload', settle)
  // 兜底：页面没在绘制时 rAF 不前进，zoomend/moveend 可能永远不来，到点也要把状态收掉
  guardTimer = window.setTimeout(settle, duration + 400)
  return settle
}
