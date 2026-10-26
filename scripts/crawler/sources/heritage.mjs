import { get } from '../lib/http.mjs'
import { absoluteUrl, cleanText } from '../lib/util.mjs'
import { writeRaw } from '../lib/store.mjs'

export const id = 'heritage'
export const title = '山东国家级非遗代表性项目（中国非物质文化遗产网）'

const PROVINCE_CODE = '370000'
const PER_PAGE = 50
const MAX_PAGES = 8
const BASE = 'https://www.ihchina.cn'
const REFERER = 'https://www.ihchina.cn/project.html'

function apiUrl(page) {
  return `${BASE}/Article/Index/getProject.html?province=${PROVINCE_CODE}&p=${page}&limit=${PER_PAGE}`
}

function mapItem(raw) {
  const text = (v) => (v == null ? null : String(v).trim())
  const link = text(raw.url || raw.link || raw.detail_url || raw.article_url)
  const rx = text(raw.rx_time) || ''
  const batchYear = /(\d{4})/.exec(rx)?.[1] ?? null
  const batchName = /[（(]([^）)]+)[）)]/.exec(rx)?.[1] ?? null
  return {
    id: text(raw.id || raw.auto_id),
    num: text(raw.num),
    name: text(raw.title || raw.name || raw.project_name || raw.projectName),
    category: text(raw.type || raw.category || raw.category_name || raw.class_name),
    categoryKind: text(raw.cate),
    projectNum: text(raw.project_num),
    batchYear: batchYear ? Number(batchYear) : null,
    batch: batchName,
    province: text(raw.province || raw.province_name || raw.area),
    unit: text(raw.unit),
    protectUnit: text(raw.protect_unit),
    desc: cleanText(text(raw.content) || '').replace(/^申报地区或单位：[^ ]*\s*/, '').slice(0, 200) || null,
    url: link ? absoluteUrl(link, BASE) : null,
  }
}

export async function run(ctx) {
  const items = []
  const problems = []
  let total = null
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await get(apiUrl(page), { referer: REFERER })
    if (page === 1) writeRaw(id, `project-p1-limit${PER_PAGE}`, res.text, 'json')
    const payload = JSON.parse(res.text)
    if (!payload || !Array.isArray(payload.list) || payload.list.length === 0) break
    total = payload.total ?? total
    for (const raw of payload.list) items.push(mapItem(raw))
    ctx.log(`第 ${page} 页 ${payload.list.length} 条（累计 ${items.length}）`)
    if (payload.list.length < PER_PAGE) break
  }
  const named = items.filter((i) => i.name)
  if (!named.length) problems.push('未解析出条目，检查接口字段名是否变化')
  return {
    records: named.length,
    problems,
    data: {
      source: '中国非物质文化遗产网 www.ihchina.cn（国家级非遗代表性项目名录）',
      fetchedAt: new Date().toISOString(),
      province: '山东省',
      provinceCode: PROVINCE_CODE,
      declaredTotal: total,
      count: named.length,
      items: named,
    },
  }
}
