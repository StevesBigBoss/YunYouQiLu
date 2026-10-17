/**
 * 礼貌请求封装：统一 UA、按域限速、超时重试、robots.txt 校验、GBK/UTF-8 解码。
 * 只依赖 Node 内置能力（Node 18+ 自带 fetch / TextDecoder），无需安装依赖。
 */
import { sleep } from './util.mjs'

// 保留爬虫身份（Mozilla/5.0 (compatible; ...) 是告诉服务器"我是机器人"的老写法），
// 但不能省掉 Mozilla/5.0 前缀：d1.weather.com.cn 只认这个前缀，写别的直接 403。
const UA = 'Mozilla/5.0 (compatible; ShandongYellowRiverDashboardBot/1.0; +local research crawler)'
const DEFAULT_DELAY = 1200
const DEFAULT_TIMEOUT = 20000
const DEFAULT_RETRIES = 2

/** 各域最小请求间隔（毫秒）。robots 里声明 Crawl-delay 时取两者较大值 */
const hostDelay = new Map()
const lastHit = new Map()
const robotsCache = new Map()

function hostOf(url) {
  return new URL(url).host
}

function decodeBody(buf, contentType) {
  const ct = contentType || ''
  if (/gb2312|gbk|gb18030/i.test(ct)) {
    try { return new TextDecoder('gbk').decode(buf) } catch { /* 回落到 utf8 */ }
  }
  const text = buf.toString('utf8')
  // 部分站点不带 charset 声明，用乱码特征判断
  if (text.includes('\uFFFD')) {
    try { return new TextDecoder('gbk').decode(buf) } catch { /* ignore */ }
  }
  return text
}

/** 解析 robots.txt：返回 { rules, crawlDelay }，只处理 User-agent: * 段 */
function parseRobots(text) {
  const rules = []
  let crawlDelay = 0
  let inStar = false
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const [rawKey, ...rest] = line.split(':')
    const key = rawKey.trim().toLowerCase()
    const value = rest.join(':').trim()
    if (key === 'user-agent') { inStar = value === '*'; continue }
    if (!inStar) continue
    if (key === 'disallow') rules.push({ allow: false, path: value })
    else if (key === 'allow') rules.push({ allow: true, path: value })
    else if (key === 'crawl-delay') crawlDelay = Math.round(Number(value) * 1000) || 0
  }
  return { rules, crawlDelay }
}

/** 取 robots.txt（4xx 视为无约束，5xx/超时保守视为不允许） */
async function loadRobots(url) {
  const host = hostOf(url)
  if (robotsCache.has(host)) return robotsCache.get(host)
  const robotsUrl = `${new URL(url).protocol}//${host}/robots.txt`
  let result
  try {
    const res = await rawFetch(robotsUrl, {}, 12000)
    if (res.status >= 400 && res.status < 500) result = { rules: [], crawlDelay: 0, note: `robots.txt ${res.status}，视为无约束` }
    else if (res.status >= 500) result = { rules: [{ allow: false, path: '/' }], crawlDelay: 0, note: `robots.txt ${res.status}，保守放弃` }
    else result = { ...parseRobots(res.text), note: 'ok' }
  } catch (err) {
    result = { rules: [{ allow: false, path: '/' }], crawlDelay: 0, note: `robots.txt 读取失败：${err.message}` }
  }
  robotsCache.set(host, result)
  return result
}

/** 按 robots 规则判断路径是否可抓（长路径优先，Allow 覆盖 Disallow） */
function robotsAllows(rules, pathname) {
  let verdict = true
  let best = -1
  for (const rule of rules) {
    if (!rule.path) continue
    if (pathname.startsWith(rule.path) && rule.path.length > best) {
      best = rule.path.length
      verdict = rule.allow
    }
  }
  return verdict
}

async function rawFetch(url, opts, timeout) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeout)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(opts.referer ? { Referer: opts.referer } : {}),
      },
      signal: ctl.signal,
      redirect: 'follow',
    })
    const buf = Buffer.from(await res.arrayBuffer())
    return { status: res.status, contentType: res.headers.get('content-type'), text: decodeBody(buf, res.headers.get('content-type')), bytes: buf.length, url: res.url || url }
  } finally {
    clearTimeout(timer)
  }
}

async function throttle(url) {
  const host = hostOf(url)
  const delay = hostDelay.get(host) ?? DEFAULT_DELAY
  const since = Date.now() - (lastHit.get(host) ?? 0)
  if (since < delay) await sleep(delay - since)
  lastHit.set(host, Date.now())
}

/**
 * 抓一个页面：先过 robots，再限速，失败按退避重试。
 * @returns {{status:number, text:string, bytes:number, contentType?:string, url:string}}
 */
export async function get(url, opts = {}) {
  const { referer, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES, ignoreRobots = false } = opts
  if (!ignoreRobots) {
    const robots = await loadRobots(url)
    if (robots.crawlDelay) {
      const host = hostOf(url)
      hostDelay.set(host, Math.max(hostDelay.get(host) ?? DEFAULT_DELAY, robots.crawlDelay))
    }
    if (!robotsAllows(robots.rules, new URL(url).pathname)) {
      throw new Error(`robots.txt 禁止抓取：${url}（${robots.note}）`)
    }
  }
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await throttle(url)
    try {
      const res = await rawFetch(url, { referer }, timeout)
      if (res.status >= 500 && attempt < retries) {
        await sleep(1000 * (attempt + 1))
        continue
      }
      return res
    } catch (err) {
      lastErr = err
      if (attempt < retries) await sleep(1200 * (attempt + 1))
    }
  }
  throw lastErr ?? new Error(`抓取失败：${url}`)
}

/** 抓 JSON（容错：部分接口返回 JSONP 或带 var 前缀，交给调用方用 pickJson 处理） */
export async function getJson(url, opts = {}) {
  const res = await get(url, opts)
  try {
    return JSON.parse(res.text)
  } catch {
    return null
  }
}

export const HTTP_UA = UA
