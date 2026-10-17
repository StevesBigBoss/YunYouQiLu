/** 小工具 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 本地时间戳，形如 20260927-1042 */
export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`
}

/** 从 JSONP / var xxx= 文本里抠出 JSON 对象 */
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

/**
 * HTML 反转义 + 去标签，用于把标题、简介清干净。
 * 先解实体再去标签：ihchina 这类站点把 `<br />` 存成了 `&lt;br /&gt;`，
 * 顺序反了会剩下一串 `&lt;br /&gt;` 留在正文里。
 */
export function cleanText(html) {
  let s = String(html)
  for (let i = 0; i < 3; i += 1) {
    // 少数站点是多重转义的，解到不再变化为止（最多 3 轮）
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

/** 绝对化链接 */
export function absoluteUrl(href, base) {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}

/** 202609/t20260924_967252.htm、20260926/xxx/c.html 之类的路径里取日期 */
export function dateFromUrl(url) {
  const m = url.match(/(20\d{2})(\d{2})\/t?(20\d{2})(\d{2})(\d{2})/) || url.match(/(20\d{2})(\d{2})(\d{2})\//)
  if (!m) return null
  // 第一种写法年月日在 m[1]m[2]m[5]（m[3]m[4] 是重复的年月），第二种在 m[1]m[2]m[3]
  const [y, mo, d] = m.length >= 6 ? [m[1], m[2], m[5]] : [m[1], m[2], m[3]]
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(mo) || !/^\d{2}$/.test(d)) return null
  return `${y}-${mo}-${d}`
}
