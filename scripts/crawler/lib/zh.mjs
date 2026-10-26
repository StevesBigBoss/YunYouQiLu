
export const DOMAIN_WORDS = [
  '黄河流域生态保护和高质量发展', '黄河国家文化公园', '黄河入海口', '黄河三角洲',
  '沿黄', '黄河', '齐鲁', '山东', '泰山', '济南', '青岛', '淄博', '枣庄', '东营', '烟台',
  '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽', '曲阜',
  '文旅融合', '文旅', '文化和旅游', '文化', '旅游', '游客', '客流', '假期', '假日', '中秋',
  '国庆', '春节', '五一', '非遗', '传承', '遗产', '文物', '博物馆', '美术馆', '图书馆',
  '景区', '景点', '5A', '度假区', '民宿', '露营', '研学', '康养', '夜游', '演艺', '音乐节',
  '生态', '保护', '绿色发展', '低碳', '湿地', '鸟类', '水质', '环境', '自然保护',
  '高质量发展', '农文旅融合', '农文旅', '乡村振兴', '研学旅游', '文化遗产',
  '消费', '营收', '收入', '增长', '同比', '客流高峰', '免票', '门票', '优惠', '补贴',
  '乡村游', '县域游', '深度体验', 'city不city', '打卡', '短视频', '直播', '电商',
  '泉城', '泉水', '明湖', '趵突泉', '千佛山', '三孔', '齐长城', '大运河', '海岱',
]

const POSITIVE = ['增长', '提升', '火热', '热力', '升温', '丰富', '创新', '优质', '好评', '欢迎', '热销', '亮眼', '新高的', '突破', '获奖', '入选', '成功', '启动', '亮相', '惠民', '免费', '火爆', '同比增长', '创下', '位居前列', '示范', '复苏', '强劲']
const NEGATIVE = ['下降', '减少', '投诉', '隐患', '事故', '处罚', '违规', '滞留', '拥堵', '暴雨', '大风', '高温', '洪水', '预警', '风险', '整改', '受损', '关闭', '暂停', '取消', '纠纷', '差评', '亏损', '同比下降', '疫情', '台风', '地震', '滑坡']

const STOP = new Set(['记者', '报道', '近日', '日前', '据悉', '日电', '新华社', '中国', '相关', '进行', '工作', '要求', '推进', '加强', '进一步', '方面', '情况', '有关', '通过', '实现', '开展', '组织', '以及', '同时', '但是', '因为', '所以', '目前'])

function normalize(text) {
  return String(text || '')
    .replace(/【[^】]*】/g, ' ')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, ' ')
}

function matchWord(cleaned, pos, sorted) {
  for (const word of sorted) {
    if (cleaned.startsWith(word, pos)) return word
  }
  return null
}

export function tokenize(text) {
  const cleaned = normalize(text)
  const tokens = []
  const sorted = [...DOMAIN_WORDS].filter((w) => w.length > 1).sort((a, b) => b.length - a.length)
  let i = 0
  while (i < cleaned.length) {
    if (cleaned[i] === ' ') { i += 1; continue }
    const hit = matchWord(cleaned, i, sorted)
    if (hit) {
      tokens.push(hit)
      i += hit.length
      continue
    }
    let next = -1
    for (let j = i + 1; j <= Math.min(i + 3, cleaned.length - 1); j += 1) {
      if (matchWord(cleaned, j, sorted)) { next = j; break }
    }
    const end = next === -1 ? Math.min(i + 2, cleaned.length) : next
    for (let k = i; k + 2 <= end; k += 2) {
      const pair = cleaned.slice(k, k + 2)
      if (/^[\u4e00-\u9fa5A-Za-z0-9]{2}$/.test(pair)) tokens.push(pair)
    }
    i = end > i ? end : i + 1
  }
  return tokens
}

export function keywordFrequency(texts, limit = 40) {
  const counter = new Map()
  const domain = new Set(DOMAIN_WORDS)
  for (const text of texts) {
    const seen = new Set()
    for (const token of tokenize(text)) {
      if (STOP.has(token) || token.length < 2) continue
      if (/\d/.test(token)) continue
      if (!domain.has(token) && token.length !== 2) continue
      if (seen.has(token)) continue
      seen.add(token)
      counter.set(token, (counter.get(token) || 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function sentimentOf(text) {
  const raw = String(text || '')
  let pos = 0
  let neg = 0
  for (const w of POSITIVE) if (raw.includes(w)) pos += 1
  for (const w of NEGATIVE) if (raw.includes(w)) neg += 1
  if (pos > neg) return 'positive'
  if (neg > pos) return 'negative'
  return 'neutral'
}

export function sentimentDistribution(texts) {
  const stat = { positive: 0, neutral: 0, negative: 0 }
  for (const t of texts) stat[sentimentOf(t)] += 1
  const total = texts.length || 1
  return {
    total: texts.length,
    positive: Math.round((stat.positive / total) * 100),
    neutral: Math.round((stat.neutral / total) * 100),
    negative: Math.max(0, 100 - Math.round((stat.positive / total) * 100) - Math.round((stat.neutral / total) * 100)),
    raw: stat,
  }
}
