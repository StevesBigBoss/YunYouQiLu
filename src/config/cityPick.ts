/**
 * 地图「按下 → 抬起」点击容错。
 *
 * 地图飞行（放大）还没结束时按下鼠标，抬起前动画已经把图元从光标下移开，
 * 按下与抬起命中的是两个不同元素，浏览器就把 click 判给它们的公共祖先（通常是地图容器），
 * Leaflet 收不到图元上的 click —— 表现为「点了别的地市没反应、地图卡在放大状态」。
 *
 * 这里把点击改成两步确认：按下时记住目标（mousedown 一定命中图元），抬起时确认一次点击；
 * 只要按下那一刻压在目标上就算数，中途地图/图元怎么移都不影响；真正的拖动（dragstart）作废。
 * 同一次点击可能同时走「抬起确认」与 Leaflet 的 click 两条路，用时间窗去重，只会触发一次。
 */
import L from 'leaflet'

/** 去重窗口：抬起确认与浏览器 click 之间只差几毫秒，300ms 足够，也不会挡住快速重点同一个目标 */
const DEDUPE_MS = 300

/** 绑定器：把一个图层与它的键交给它，点击（含飞行途中的点击）都会回调 onPick */
export type PressPicker<T> = (layer: L.Layer, key: T) => void

export function createPressPicker<T>(
  map: L.Map,
  onPick: (key: T, layer: L.Layer) => void,
): PressPicker<T> {
  let pressed: { key: T; layer: L.Layer } | null = null
  let lastKey: T | null = null
  let lastAt = 0

  function fire(key: T, layer: L.Layer) {
    const now = Date.now()
    if (key === lastKey && now - lastAt < DEDUPE_MS) return
    lastKey = key
    lastAt = now
    onPick(key, layer)
  }

  // 捕获阶段先清空：每次按下都从干净状态开始（Leaflet 的图层监听在冒泡阶段才执行）
  map.getContainer().addEventListener('mousedown', () => { pressed = null }, true)
  // 真拖动地图时作废（超过拖动容差的位移由 Leaflet 判成 dragstart）
  map.on('dragstart', () => { pressed = null })
  map.on('mouseup', () => {
    if (!pressed) return
    const p = pressed
    pressed = null
    fire(p.key, p.layer)
  })

  return (layer: L.Layer, key: T) => {
    layer.on('mousedown', () => { pressed = { key, layer } })
    layer.on('click', () => fire(key, layer))
  }
}
