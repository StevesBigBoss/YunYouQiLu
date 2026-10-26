
export interface IconPrim {
  tag: 'path' | 'circle' | 'rect' | 'line'
  attrs: Record<string, string | number>
}

const dot = (cx: number, cy: number, r: number): IconPrim => ({
  tag: 'circle',
  attrs: { cx, cy, r, style: 'fill:currentColor;stroke:none' },
})

export const ICONS: Record<string, IconPrim[]> = {
  home: [
    { tag: 'path', attrs: { d: 'M3.6 10.4 12 3.9l8.4 6.5' } },
    { tag: 'path', attrs: { d: 'M5.8 9.6v9.9h12.4V9.6' } },
    { tag: 'path', attrs: { d: 'M9.9 19.5v-4.9h4.2v4.9' } },
  ],
  leaf: [
    {
      tag: 'path',
      attrs: {
        d: 'M20 4.6c.3 8.6-4.4 13.9-9.5 14.2-3.3.2-5.6-1.9-5.6-5C4.9 8.5 11.4 4.9 20 4.6Z',
      },
    },
    { tag: 'path', attrs: { d: 'M4.9 19.6c2.4-3.6 5.3-6.4 9.2-8.7' } },
  ],
  scenic: [
    { tag: 'path', attrs: { d: 'M3.4 19.2 10 8.4l4.3 6.9' } },
    { tag: 'path', attrs: { d: 'M12.9 19.2l3.1-4.5 4.8 4.5' } },
    { tag: 'circle', attrs: { cx: 17.8, cy: 6.8, r: 2.2 } },
  ],
  food: [
    { tag: 'path', attrs: { d: 'M3.8 11.8h16.4a8.2 8.2 0 0 1-8.2 8.2 8.2 8.2 0 0 1-8.2-8.2Z' } },
    { tag: 'path', attrs: { d: 'M9.4 20.2 8.6 21.2' } },
    { tag: 'path', attrs: { d: 'M15.2 4.4 18.3 10.5' } },
    { tag: 'path', attrs: { d: 'M17.7 5 20.6 10.9' } },
  ],
  flow: [
    { tag: 'circle', attrs: { cx: 8.6, cy: 8, r: 2.4 } },
    { tag: 'path', attrs: { d: 'M3.8 19.2c0-3 2.2-5.2 4.8-5.2s4.8 2.2 4.8 5.2' } },
    { tag: 'circle', attrs: { cx: 16.6, cy: 9, r: 1.9 } },
    { tag: 'path', attrs: { d: 'M14 19.2c0-2.6 1.3-4.5 2.6-4.5s2.6 1.9 2.6 4.5' } },
  ],
  industry: [
    { tag: 'path', attrs: { d: 'M4.4 4.8v14.4h15.2' } },
    { tag: 'path', attrs: { d: 'M8.6 16.6v-4.8' } },
    { tag: 'path', attrs: { d: 'M12 16.6V9' } },
    { tag: 'path', attrs: { d: 'M15.4 16.6v-7.2' } },
  ],
  resource: [
    { tag: 'path', attrs: { d: 'M12 4 3.9 8.2 12 12.4l8.1-4.2Z' } },
    { tag: 'path', attrs: { d: 'M3.9 12.4 12 16.6l8.1-4.2' } },
    { tag: 'path', attrs: { d: 'M3.9 16.4 12 20.6l8.1-4.2' } },
  ],
  opinion: [
    { tag: 'rect', attrs: { x: 3.4, y: 4.4, width: 17.2, height: 10.6, rx: 2.4 } },
    { tag: 'path', attrs: { d: 'M8.4 15v3.6l3.8-3.6' } },
    dot(8.6, 9.7, 1.25),
    dot(12, 9.7, 1.25),
    dot(15.4, 9.7, 1.25),
  ],
  marketing: [
    { tag: 'path', attrs: { d: 'M3.8 10.2h2.6l8.8-4.8v13.2l-8.8-4.8H3.8Z' } },
    { tag: 'path', attrs: { d: 'M7.4 13.8v2.6a2.2 2.2 0 0 0 4.4 0v-.9' } },
    { tag: 'path', attrs: { d: 'M18.2 8.6a5.6 5.6 0 0 1 0 6.8' } },
  ],
  disaster: [
    { tag: 'path', attrs: { d: 'M12 4.4 21.2 19.6H2.8Z' } },
    { tag: 'path', attrs: { d: 'M12 9.6v4.4' } },
    dot(12, 17, 1.15),
  ],
  heritage: [
    { tag: 'path', attrs: { d: 'M3.6 9.4 12 4.4l8.4 5' } },
    { tag: 'path', attrs: { d: 'M5.6 9.4h12.8' } },
    { tag: 'path', attrs: { d: 'M7.2 11.4v6.4' } },
    { tag: 'path', attrs: { d: 'M12 11.4v6.4' } },
    { tag: 'path', attrs: { d: 'M16.8 11.4v6.4' } },
    { tag: 'path', attrs: { d: 'M4.8 19.6h14.4' } },
  ],

  chevron: [{ tag: 'path', attrs: { d: 'M10.2 6.6 15.4 12l-5.2 5.4' } }],
  'caret-right': [{ tag: 'path', attrs: { d: 'M10.4 6.8 15.6 12l-5.2 5.2' } }],
  'caret-down': [{ tag: 'path', attrs: { d: 'M7.8 10.4 12 14.6l4.2-4.2' } }],
  'caret-up': [{ tag: 'path', attrs: { d: 'M7.8 13.6 12 9.4l4.2 4.2' } }],
  'chevrons-left': [
    { tag: 'path', attrs: { d: 'M11.6 6.8 6.4 12l5.2 5.2' } },
    { tag: 'path', attrs: { d: 'M17.8 6.8 12.6 12l5.2 5.2' } },
  ],
  'chevrons-right': [
    { tag: 'path', attrs: { d: 'M9.4 6.8 14.6 12l-5.2 5.2' } },
    { tag: 'path', attrs: { d: 'M15.4 6.8 20.6 12l-5.2 5.2' } },
  ],
  'arrow-right': [
    { tag: 'path', attrs: { d: 'M4.4 12h14.2' } },
    { tag: 'path', attrs: { d: 'M14.2 7.6 18.6 12l-4.4 4.4' } },
  ],
  check: [{ tag: 'path', attrs: { d: 'M5.6 12.8 10.2 17.4 18.6 7.6' } }],
  close: [
    { tag: 'path', attrs: { d: 'M6.6 6.6 17.4 17.4' } },
    { tag: 'path', attrs: { d: 'M17.4 6.6 6.6 17.4' } },
  ],
  warn: [
    { tag: 'path', attrs: { d: 'M12 4.4 21.2 19.6H2.8Z' } },
    { tag: 'path', attrs: { d: 'M12 9.6v4.4' } },
    dot(12, 17, 1.15),
  ],
  pin: [
    {
      tag: 'path',
      attrs: { d: 'M12 21.4c4.2-4.7 6.4-8 6.4-11.1a6.4 6.4 0 1 0-12.8 0c0 3.1 2.2 6.4 6.4 11.1Z' },
    },
    { tag: 'circle', attrs: { cx: 12, cy: 10.2, r: 2.3 } },
  ],

  'trend-up': [
    { tag: 'path', attrs: { d: 'M3.8 16.8 9.4 11.2l3.2 3.2 6.8-6.8' } },
    { tag: 'path', attrs: { d: 'M15.2 7.6h4.2v4.2' } },
  ],
  'trend-down': [
    { tag: 'path', attrs: { d: 'M3.8 7.2 9.4 12.8l3.2-3.2 6.8 6.8' } },
    { tag: 'path', attrs: { d: 'M15.2 16.4h4.2v-4.2' } },
  ],
  'trend-flat': [
    { tag: 'path', attrs: { d: 'M4.2 12h14' } },
    { tag: 'path', attrs: { d: 'M14.2 7.8 18.4 12l-4.2 4.2' } },
  ],

  coin: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.4 } },
    { tag: 'path', attrs: { d: 'M9.2 9.4 12 13.2l2.8-3.8' } },
    { tag: 'path', attrs: { d: 'M12 13.2v4' } },
    { tag: 'path', attrs: { d: 'M9.4 14.4h5.2' } },
    { tag: 'path', attrs: { d: 'M9.4 16.2h5.2' } },
  ],
  ticket: [
    { tag: 'rect', attrs: { x: 3.2, y: 6.4, width: 17.6, height: 11.2, rx: 2.2 } },
    { tag: 'path', attrs: { d: 'M14.4 6.4v11.2' } },
    { tag: 'circle', attrs: { cx: 17.6, cy: 12, r: 1.2 } },
  ],
  build: [
    { tag: 'path', attrs: { d: 'M3.6 20.6h11.6' } },
    { tag: 'path', attrs: { d: 'M6.4 20.6V6.2' } },
    { tag: 'path', attrs: { d: 'M3.9 6.2h14.4' } },
    { tag: 'path', attrs: { d: 'M18.3 6.2v3.6' } },
    { tag: 'path', attrs: { d: 'M16.9 9.8h2.8' } },
    { tag: 'path', attrs: { d: 'M6.4 6.2 10.2 3.8' } },
  ],
  news: [
    { tag: 'rect', attrs: { x: 3.6, y: 5.4, width: 16.8, height: 13.2, rx: 1.8 } },
    { tag: 'path', attrs: { d: 'M6.6 9.4h6.4' } },
    { tag: 'path', attrs: { d: 'M6.6 12.4h10.8' } },
    { tag: 'path', attrs: { d: 'M6.6 15.4h10.8' } },
  ],
  moon: [
    {
      tag: 'path',
      attrs: { d: 'M19.6 14.8A7.9 7.9 0 0 1 9.2 4.4a7.9 7.9 0 1 0 10.4 10.4Z' },
    },
  ],

  happy: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.6 } },
    dot(9.2, 10.2, 1.05),
    dot(14.8, 10.2, 1.05),
    { tag: 'path', attrs: { d: 'M8.4 14.2a4.6 4.6 0 0 0 7.2 0' } },
  ],
  neutral: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.6 } },
    dot(9.2, 10.2, 1.05),
    dot(14.8, 10.2, 1.05),
    { tag: 'path', attrs: { d: 'M8.8 15.2h6.4' } },
  ],
  sad: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.6 } },
    dot(9.2, 10.2, 1.05),
    dot(14.8, 10.2, 1.05),
    { tag: 'path', attrs: { d: 'M8.6 16.4a4.6 4.6 0 0 1 6.8 0' } },
  ],

  music: [
    { tag: 'path', attrs: { d: 'M9.6 17.4V6.8l8.2-1.9v10.1' } },
    { tag: 'circle', attrs: { cx: 7.5, cy: 17.4, r: 2.1 } },
    { tag: 'circle', attrs: { cx: 15.7, cy: 15, r: 2.1 } },
  ],
  fire: [
    {
      tag: 'path',
      attrs: {
        d: 'M12 3.6c3.6 3.6 5.8 6.6 5.8 9.6a5.8 5.8 0 0 1-11.6 0c0-1.7.7-3.2 2-4.7.4 1.3 1 2.2 1.9 2.6-.5-2.7.2-5 1.9-7.5Z',
      },
    },
  ],
  image: [
    { tag: 'rect', attrs: { x: 3.4, y: 5, width: 17.2, height: 14, rx: 2.4 } },
    { tag: 'circle', attrs: { cx: 8.6, cy: 9.9, r: 1.6 } },
    { tag: 'path', attrs: { d: 'M4.6 17.6 9.6 12l3.7 4.1' } },
    { tag: 'path', attrs: { d: 'M11.6 16.2l3.1-3.1 5.3 4.5' } },
  ],
  phone: [
    { tag: 'rect', attrs: { x: 6.6, y: 3, width: 10.8, height: 18, rx: 2.4 } },
    { tag: 'path', attrs: { d: 'M10.4 18.2h3.2' } },
    { tag: 'path', attrs: { d: 'M9.8 6.2h4.4' } },
  ],
  global: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.6 } },
    { tag: 'path', attrs: { d: 'M3.4 12h17.2' } },
    {
      tag: 'path',
      attrs: {
        d: 'M12 3.4c2.9 2.3 4.4 5.2 4.4 8.6s-1.5 6.3-4.4 8.6c-2.9-2.3-4.4-5.2-4.4-8.6S9.1 5.7 12 3.4Z',
      },
    },
  ],
}

function attrsToStr(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')
}

export function iconSvg(name: string, size = 14, cls = 'app-icon'): string {
  const prims = ICONS[name] ?? []
  const body = prims.map((p) => `<${p.tag}${attrsToStr(p.attrs)} />`).join('')
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}
