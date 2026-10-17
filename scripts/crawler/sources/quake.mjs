/**
 * 数据源：USGS 地震目录（earthquake.usgs.gov，公开开放数据 API）。
 * 取山东及邻区（北纬 34–39、东经 114–123）震级 ≥3 的地震事件，用于「灾难监控和预测」页。
 * 备注：中国地震台网（ceic.ac.cn）的 robots.txt 明确 Disallow /ajax/ 与 /speedsearch，
 * 其数据只能从被禁接口取，故本项目不抓取该站。
 */
import { get } from '../lib/http.mjs'
import { writeRaw } from '../lib/store.mjs'

export const id = 'quake'
export const title = '山东及邻区地震目录（USGS）'

const BBOX = { minlatitude: 34, maxlatitude: 39, minlongitude: 114, maxlongitude: 123 }
const URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2015-01-01&minmagnitude=3&orderby=time&limit=300&minlatitude=${BBOX.minlatitude}&maxlatitude=${BBOX.maxlatitude}&minlongitude=${BBOX.minlongitude}&maxlongitude=${BBOX.maxlongitude}`

export async function run() {
  const res = await get(URL)
  writeRaw(id, 'usgs-query', res.text, 'json')
  const json = JSON.parse(res.text)
  const events = (json.features || []).map((f) => ({
    id: f.id,
    time: new Date(f.properties.time).toISOString(),
    magnitude: f.properties.mag,
    place: f.properties.place,
    depthKm: f.geometry.coordinates[2],
    lng: Number(f.geometry.coordinates[0].toFixed(4)),
    lat: Number(f.geometry.coordinates[1].toFixed(4)),
    url: f.properties.url,
  }))
  return {
    records: events.length,
    problems: events.length ? [] : ['未取到事件，检查接口参数或网络'],
    data: {
      source: 'USGS FDSN Event API（公开数据）',
      note: '中国地震台网 ceic.ac.cn 的 robots.txt 禁止其接口，故改用 USGS；国内 3 级上下小震在 USGS 收录不全',
      fetchedAt: new Date().toISOString(),
      bbox: BBOX,
      minMagnitude: 3,
      startTime: '2015-01-01',
      count: events.length,
      events,
    },
  }
}
