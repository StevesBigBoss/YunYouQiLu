/**
 * 数据源：Open-Meteo 天气 API —— 山东 16 市实时天气与今明预报。
 *
 * 为什么不用中国天气网 d1.weather.com.cn：
 *   实测该域的 robots.txt 是 `User-agent: * / Disallow: /`（整站禁止抓取），
 *   按本爬虫「robots 优先」的原则不能抓。Open-Meteo 是面向程序调用的开放 API，
 *   单次请求即可返回全部城市，数据 CC BY 4.0，注明来源即可使用。
 *
 * robots 说明：api.open-meteo.com 的 robots.txt 也写着 Disallow: /，那是挡搜索引擎收录
 *   接口地址（避免 API 被索引），不是禁止程序调用——该服务本身就是给软件调用的。
 *   这里显式 ignoreRobots 并只发 1 个请求/轮，属于有意的例外，已在 README 记录。
 */
import { get } from '../lib/http.mjs'
import { writeRaw } from '../lib/store.mjs'

export const id = 'weather'
export const title = '山东16市实时天气与预报（Open-Meteo）'

const API = 'https://api.open-meteo.com/v1/forecast'
const PARAMS = [
  'current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation',
  'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
  'forecast_days=2',
  'timezone=Asia%2FShanghai',
].join('&')

const CITIES = [
  { city: '济南', lat: 36.6512, lon: 117.1201 }, { city: '青岛', lat: 36.0671, lon: 120.3826 },
  { city: '淄博', lat: 36.8131, lon: 118.0548 }, { city: '枣庄', lat: 34.8107, lon: 117.3239 },
  { city: '东营', lat: 37.4340, lon: 118.6746 }, { city: '烟台', lat: 37.4638, lon: 121.4479 },
  { city: '潍坊', lat: 36.7069, lon: 119.1618 }, { city: '济宁', lat: 35.4149, lon: 116.5871 },
  { city: '泰安', lat: 36.1992, lon: 117.0879 }, { city: '威海', lat: 37.5130, lon: 122.1204 },
  { city: '日照', lat: 35.4164, lon: 119.5269 }, { city: '临沂', lat: 35.1045, lon: 118.3564 },
  { city: '德州', lat: 37.4355, lon: 116.3576 }, { city: '聊城', lat: 36.4568, lon: 115.9852 },
  { city: '滨州', lat: 37.3835, lon: 117.9707 }, { city: '菏泽', lat: 35.2333, lon: 115.4800 },
]

/** WMO 天气码 → 中文（Open-Meteo 用的是 WMO 4677 码表） */
const WMO = {
  0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
  45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '毛毛雨', 55: '密毛毛雨',
  56: '冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  66: '冻雨', 67: '冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
  80: '阵雨', 81: '中阵雨', 82: '强阵雨',
  85: '阵雪', 86: '强阵雪',
  95: '雷阵雨', 96: '雷阵雨伴冰雹', 99: '强雷阵雨伴冰雹',
}

/** 风向角度 → 中文风向（气象习惯：风从哪个方向来就叫什么风） */
const COMPASS = [
  [0, '北风'], [45, '东北风'], [90, '东风'], [135, '东南风'],
  [180, '南风'], [225, '西南风'], [270, '西风'], [315, '西北风'], [360, '北风'],
]

function windName(deg) {
  if (!Number.isFinite(deg)) return null
  const d = ((deg % 360) + 360) % 360
  let best = COMPASS[0]
  let bestDiff = 999
  for (const item of COMPASS) {
    const diff = Math.abs(d - item[0])
    if (diff < bestDiff) { bestDiff = diff; best = item }
  }
  return best[1]
}

/** 风速(km/h) → 蒲福风力等级，前端要的是"2级"这种写法 */
function beaufort(kmh) {
  const table = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]
  if (!Number.isFinite(kmh)) return null
  let level = 0
  while (level < table.length && kmh >= table[level]) level += 1
  return level
}

function weatherOf(code) {
  return WMO[code] ?? (code === undefined || code === null ? null : `未知(${code})`)
}

/** 取每日本地日期（API 已按 Asia/Shanghai 返回 YYYY-MM-DD） */
function dayAt(daily, i) {
  if (!daily || !Array.isArray(daily.time) || !daily.time[i]) return null
  return {
    date: daily.time[i],
    weather: weatherOf(daily.weather_code?.[i]),
    tempHigh: daily.temperature_2m_max?.[i] ?? null,
    tempLow: daily.temperature_2m_min?.[i] ?? null,
    precipitation: daily.precipitation_sum?.[i] ?? null,
    code: daily.weather_code?.[i] ?? null,
  }
}

export async function run(ctx) {
  const lats = CITIES.map((c) => c.lat).join(',')
  const lons = CITIES.map((c) => c.lon).join(',')
  // 一次请求取回 16 个点：返回结果是按坐标顺序排列的数组
  const url = `${API}?latitude=${lats}&longitude=${lons}&${PARAMS}`
  const res = await get(url, { ignoreRobots: true, retries: 3, timeout: 25000 })
  if (res.status !== 200) {
    writeRaw(id, `fail-${res.status}`, res.text, 'txt')
    return { records: 0, problems: [`Open-Meteo 返回 HTTP ${res.status}：${res.text.slice(0, 120)}`], data: null }
  }
  writeRaw(id, 'forecast', res.text, 'json')

  const payload = JSON.parse(res.text)
  const list = Array.isArray(payload) ? payload : [payload]
  if (list.length !== CITIES.length) {
    ctx.log(`注意：请求 ${CITIES.length} 个城市，返回 ${list.length} 条，按顺序对应`)
  }

  const problems = []
  const cities = CITIES.map((c, i) => {
    const one = list[i]
    if (!one || !one.current) {
      problems.push(`${c.city} 无返回数据`)
      return { city: c.city, lat: c.lat, lon: c.lon, realtime: null, forecast: null }
    }
    const cur = one.current
    const level = beaufort(cur.wind_speed_10m)
    return {
      city: c.city,
      lat: c.lat,
      lon: c.lon,
      // 接口回的是它自己插值到的格点坐标，留一份便于核对
      grid: { lat: one.latitude, lon: one.longitude, elevation: one.elevation },
      realtime: {
        temp: cur.temperature_2m ?? null,
        humidity: cur.relative_humidity_2m ?? null,
        windDirection: windName(cur.wind_direction_10m),
        windDegrees: cur.wind_direction_10m ?? null,
        windLevel: level === null ? null : `${level}级`,
        windSpeedKmh: cur.wind_speed_10m ?? null,
        precipitation: cur.precipitation ?? null,
        weather: weatherOf(cur.weather_code),
        weatherCode: cur.weather_code ?? null,
        observedAt: cur.time ?? null,
      },
      forecast: {
        updatedAt: cur.time ?? null,
        today: dayAt(one.daily, 0),
        tomorrow: dayAt(one.daily, 1),
      },
    }
  })

  const ok = cities.filter((c) => c.realtime && c.forecast?.today).length
  ctx.log(`实况+预报齐全 ${ok}/${CITIES.length} 市`)
  return {
    records: ok,
    problems,
    data: {
      source: 'Open-Meteo（https://open-meteo.com）',
      attribution: 'Weather data by Open-Meteo.com, CC BY 4.0',
      fetchedAt: new Date().toISOString(),
      cityCount: cities.length,
      cities,
    },
  }
}
