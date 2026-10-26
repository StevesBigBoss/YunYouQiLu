import L from 'leaflet'

const DEDUPE_MS = 300

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

  map.getContainer().addEventListener('mousedown', () => { pressed = null }, true)
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
