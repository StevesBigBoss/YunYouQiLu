
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`
}

export function pickJson(text, startIndex = 0) {
  const first = text.indexOf('{', startIndex)
  const last = text.lastIndexOf('}')
  if (first < 0 || last <= first) return null
  try {
    return JSON.parse(text.slice(first, last + 1))
  } catch {
    return null
  }
}

export function cleanText(html) {
  let s = String(html)
  for (let i = 0; i < 3; i += 1) {
    const before = s
    s = s
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    if (s === before) break
  }
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function absoluteUrl(href, base) {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}

export function dateFromUrl(url) {
  const m = url.match(/(20\d{2})(\d{2})\/t?(20\d{2})(\d{2})(\d{2})/) || url.match(/(20\d{2})(\d{2})(\d{2})\//)
  if (!m) return null
  const [y, mo, d] = m.length >= 6 ? [m[1], m[2], m[5]] : [m[1], m[2], m[3]]
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(mo) || !/^\d{2}$/.test(d)) return null
  return `${y}-${mo}-${d}`
}
