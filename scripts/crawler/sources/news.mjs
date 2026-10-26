import { get } from '../lib/http.mjs'
import { absoluteUrl, cleanText, dateFromUrl } from '../lib/util.mjs'
import { writeRaw } from '../lib/store.mjs'
import { keywordFrequency, sentimentDistribution } from '../lib/zh.mjs'

export const id = 'news'
export const title = '黄河·山东文旅公开新闻（文旅部 / 新华网 / 大众网）'

const PAGES = [
  { name: '文旅部-全国文化信息联播·山东', url: 'https://www.mct.gov.cn/whzx/qgwhxxlb/sd/', filter: 'none' },
  { name: '文旅部-全国文化信息联播', url: 'https://www.mct.gov.cn/whzx/qgwhxxlb/', filter: 'region' },
  { name: '新华网-山东频道', url: 'http://sd.news.cn/', filter: 'topic' },
  { name: '大众网-文旅频道', url: 'https://tour.dzwww.com/', filter: 'region' },
  { name: '大众网-山东频道', url: 'https://sd.dzwww.com/', filter: 'topic' },
]

const RELEVANT = ['黄河', '文旅', '文化和旅游', '文化', '旅游', '游客', '遗产', '非遗', '文物', '博物馆', '景区', '民宿', '研学', '生态', '湿地', '假期', '消费', '泉城', '泰山', '齐鲁', '沿黄']

const REGION = [
  '山东', '黄河', '齐鲁', '泉城', '泰山', '海岱', '沿黄', '儒家', '大运河', '齐长城',
  '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照',
  '临沂', '德州', '聊城', '滨州', '菏泽',
  '曲阜', '邹城', '滕州', '台儿庄', '微山', '梁山', '兖州', '临清', '蓬莱', '荣成', '文登',
  '青州', '诸城', '寿光', '安丘', '龙口', '莱州', '招远', '栖霞', '海阳', '章丘', '莱芜',
  '莒县', '五莲', '郯城', '沂蒙', '沂水', '齐河', '乐陵', '禹城', '阳谷', '东阿', '惠民县',
  '无棣', '博兴', '邹平', '曹县', '单县', '郓城', '广饶', '利津', '平阴', '商河', '肥城',
  '新泰', '东平县', '汶上', '金乡', '嘉祥', '泗水', '临朐', '高密', '昌邑', '昌乐', '桓台',
  '高青', '沂源', '博山', '临淄', '周村', '张店', '长清', '济阳', '钢城',
  '趵突泉', '大明湖', '千佛山', '明湖', '刘公岛', '蓬莱阁', '微山湖', '水泊梁山', '黄河口',
]

const NAV_NOISE = /^(首页|上一页|下一页|更多|返回|登录|注册|网站地图|联系我们|版权声明|关于我们|English|繁体|简体|无障碍|长者版)/

function keeps(title, mode) {
  if (mode === 'none') return true
  if (mode === 'region') return REGION.some((kw) => title.includes(kw))
  return RELEVANT.some((kw) => title.includes(kw))
}

function extractLinks(html, base, mode) {
  const out = []
  const seen = new Set()
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    if (!href || /^(javascript:|#|mailto:|tel:)/i.test(href)) continue
    const text = cleanText(m[2])
    if (text.length < 6 || text.length > 60) continue
    if (NAV_NOISE.test(text)) continue
    if (!/[\u4e00-\u9fa5]/.test(text)) continue
    if (!/\.(htm|html)$/i.test(href)) continue
    if (!keeps(text, mode)) continue
    const url = absoluteUrl(href, base)
    if (seen.has(url)) continue
    seen.add(url)
    out.push({ title: text, url, date: dateFromUrl(url) })
  }
  return out
}

export async function run(ctx) {
  const items = []
  const usedSources = []
  const problems = []
  for (const page of PAGES) {
    try {
      const res = await get(page.url)
      writeRaw(id, page.name.replace(/[\\/:*?"<>|·]/g, '_'), res.text, 'html')
      const links = extractLinks(res.text, page.url, page.filter)
      for (const l of links) items.push({ ...l, channel: page.name })
      usedSources.push({ name: page.name, url: page.url, filter: page.filter, status: res.status, picked: links.length })
      ctx.log(`${page.name}：${links.length} 条`)
    } catch (err) {
      problems.push(`${page.name} 抓取失败：${err.message}`)
      usedSources.push({ name: page.name, url: page.url, status: 'FAIL', picked: 0, error: err.message })
    }
  }
  const dedup = []
  const seen = new Set()
  for (const it of items) {
    if (seen.has(it.title)) continue
    seen.add(it.title)
    dedup.push(it)
  }
  dedup.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  const texts = dedup.map((i) => i.title)
  const keywords = keywordFrequency(texts, 40)
  const sentiment = sentimentDistribution(texts)
  const noDate = dedup.filter((i) => !i.date).length
  if (!dedup.length) problems.push('未取到新闻条目，检查列表页结构是否改版')
  if (noDate > dedup.length / 2) problems.push(`${noDate}/${dedup.length} 条推不出日期，检查列表页链接格式是否改版`)
  return {
    records: dedup.length,
    problems,
    data: {
      source: '文化和旅游部 www.mct.gov.cn、新华网山东频道 sd.news.cn、大众网文旅/山东频道 dzwww.com（公开列表页）',
      note: '已按山东/黄河相关性过滤，全部为山东题材稿；关键词与情感分布为基于标题的词表统计结果，非平台互动量；抖音/微博/微信需开放平台密钥，未纳入',
      fetchedAt: new Date().toISOString(),
      pages: usedSources,
      count: dedup.length,
      datedCount: dedup.length - noDate,
      items: dedup,
      keywords,
      sentiment,
    },
  }
}
