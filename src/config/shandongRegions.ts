/**
 * 山东省行政区划对照表：16 个地级市 + 县（市、区）→ 所属地级市。
 *
 * 用途有两个：
 * 1. cityOfArea()：把非遗名录里的「申报地区」字段（形如「山东省济宁市梁山县」，
 *    粒度到县，且带历史上已撤销的旧地名）归并到地级市；
 * 2. citiesInText()：从新闻标题里识别提到的山东城市。
 *
 * 历史沿革按现行区划归并：莱芜市（含莱城区）→ 济南市，胶南市 → 青岛市，
 * 即墨市/章丘市/济阳县/沾化县/定陶县/文登市/蓬莱市/长岛县/苍山县等旧名一并保留映射。
 */

/** 16 个地级市（无「市」后缀，与 data/normalized/weather.json 的 city 字段一致） */
export const SHANDONG_CITIES = [
  '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁',
  '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
] as const

export type ShandongCity = (typeof SHANDONG_CITIES)[number]

/** 地级市中心经纬度（取自 data/normalized/weather.json 的站点定位，作为市级近似坐标） */
export const CITY_CENTERS: Record<ShandongCity, { lng: number; lat: number }> = {
  济南: { lng: 117.1201, lat: 36.6512 },
  青岛: { lng: 120.3826, lat: 36.0671 },
  淄博: { lng: 118.0548, lat: 36.8131 },
  枣庄: { lng: 117.3237, lat: 34.8107 },
  东营: { lng: 118.6748, lat: 37.4341 },
  烟台: { lng: 121.3914, lat: 37.5393 },
  潍坊: { lng: 119.1070, lat: 36.7093 },
  济宁: { lng: 116.5871, lat: 35.4149 },
  泰安: { lng: 117.1290, lat: 36.1949 },
  威海: { lng: 122.1162, lat: 37.5128 },
  日照: { lng: 119.5269, lat: 35.4164 },
  临沂: { lng: 118.3564, lat: 35.1047 },
  德州: { lng: 116.3575, lat: 37.4340 },
  聊城: { lng: 115.9804, lat: 36.4561 },
  滨州: { lng: 117.9707, lat: 37.3816 },
  菏泽: { lng: 115.4807, lat: 35.2333 },
}

/**
 * 县（市、区）全名 → 地级市。键可带旧称，值是地级市简称。
 * 只做「名字里出现该键」的匹配，不做行政区划合法性校验。
 */
const COUNTY_TO_CITY: Record<string, ShandongCity> = {
  // 济南市
  历下区: '济南', 市中区: '济南', 槐荫区: '济南', 天桥区: '济南', 历城区: '济南',
  长清区: '济南', 章丘区: '济南', 章丘市: '济南', 章丘: '济南', 济阳区: '济南',
  济阳县: '济南', 莱芜区: '济南', 莱城区: '济南', 钢城区: '济南', 莱芜市: '济南',
  莱芜: '济南', 平阴县: '济南', 平阴: '济南', 商河县: '济南', 商河: '济南',
  // 青岛市
  市南区: '青岛', 市北区: '青岛', 黄岛区: '青岛', 崂山区: '青岛', 李沧区: '青岛',
  城阳区: '青岛', 即墨区: '青岛', 即墨市: '青岛', 即墨: '青岛', 胶州市: '青岛',
  胶州: '青岛', 平度市: '青岛', 平度: '青岛', 莱西市: '青岛', 莱西: '青岛',
  胶南市: '青岛', 胶南: '青岛',
  // 淄博市
  淄川区: '淄博', 张店区: '淄博', 博山区: '淄博', 临淄区: '淄博', 周村区: '淄博',
  桓台县: '淄博', 桓台: '淄博', 高青县: '淄博', 高青: '淄博', 沂源县: '淄博', 沂源: '淄博',
  // 枣庄市
  薛城区: '枣庄', 峄城区: '枣庄', 台儿庄区: '枣庄', 台儿庄: '枣庄', 山亭区: '枣庄', 滕州市: '枣庄', 滕州: '枣庄',
  // 东营市
  东营区: '东营', 河口区: '东营', 垦利区: '东营', 垦利: '东营', 利津县: '东营', 利津: '东营',
  广饶县: '东营', 广饶: '东营',
  // 烟台市
  芝罘区: '烟台', 福山区: '烟台', 牟平区: '烟台', 莱山区: '烟台', 蓬莱区: '烟台',
  蓬莱市: '烟台', 蓬莱: '烟台', 龙口市: '烟台', 龙口: '烟台', 莱阳市: '烟台', 莱阳: '烟台',
  莱州市: '烟台', 莱州: '烟台', 招远市: '烟台', 招远: '烟台', 栖霞市: '烟台', 栖霞: '烟台',
  海阳市: '烟台', 海阳: '烟台', 长岛县: '烟台', 长岛: '烟台',
  // 潍坊市
  潍城区: '潍坊', 寒亭区: '潍坊', 坊子区: '潍坊', 奎文区: '潍坊', 临朐县: '潍坊', 临朐: '潍坊',
  昌乐县: '潍坊', 昌乐: '潍坊', 青州市: '潍坊', 青州: '潍坊', 诸城市: '潍坊', 诸城: '潍坊',
  寿光市: '潍坊', 寿光: '潍坊', 安丘市: '潍坊', 安丘: '潍坊', 高密市: '潍坊', 高密: '潍坊',
  昌邑市: '潍坊', 昌邑: '潍坊',
  // 济宁市
  任城区: '济宁', 兖州区: '济宁', 兖州: '济宁', 微山县: '济宁', 微山: '济宁',
  鱼台县: '济宁', 鱼台: '济宁', 金乡县: '济宁', 金乡: '济宁', 嘉祥县: '济宁', 嘉祥: '济宁',
  汶上县: '济宁', 汶上: '济宁', 泗水县: '济宁', 泗水: '济宁', 梁山县: '济宁', 梁山: '济宁',
  曲阜市: '济宁', 曲阜: '济宁', 邹城市: '济宁', 邹城: '济宁',
  // 泰安市
  泰山区: '泰安', 岱岳区: '泰安', 宁阳县: '泰安', 宁阳: '泰安', 东平县: '泰安', 东平: '泰安',
  新泰市: '泰安', 新泰: '泰安', 肥城市: '泰安', 肥城: '泰安',
  // 威海市
  环翠区: '威海', 文登区: '威海', 文登市: '威海', 文登: '威海', 荣成市: '威海', 荣成: '威海',
  乳山市: '威海', 乳山: '威海',
  // 日照市
  东港区: '日照', 岚山区: '日照', 五莲县: '日照', 五莲: '日照', 莒县: '日照',
  // 临沂市
  兰山区: '临沂', 罗庄区: '临沂', 河东区: '临沂', 沂南县: '临沂', 沂南: '临沂',
  郯城县: '临沂', 郯城: '临沂', 沂水县: '临沂', 沂水: '临沂', 兰陵县: '临沂', 兰陵: '临沂',
  苍山县: '临沂', 苍山: '临沂', 费县: '临沂', 平邑县: '临沂', 平邑: '临沂',
  莒南县: '临沂', 莒南: '临沂', 蒙阴县: '临沂', 蒙阴: '临沂', 临沭县: '临沂', 临沭: '临沂',
  // 德州市
  德城区: '德州', 陵城区: '德州', 陵县: '德州', 宁津县: '德州', 宁津: '德州',
  庆云县: '德州', 庆云: '德州', 临邑县: '德州', 临邑: '德州', 齐河县: '德州', 齐河: '德州',
  平原县: '德州', 夏津县: '德州', 夏津: '德州', 武城县: '德州', 武城: '德州',
  乐陵市: '德州', 乐陵: '德州', 禹城市: '德州', 禹城: '德州',
  // 聊城市
  东昌府区: '聊城', 茌平区: '聊城', 茌平: '聊城', 阳谷县: '聊城', 阳谷: '聊城',
  莘县: '聊城', 东阿县: '聊城', 东阿: '聊城', 冠县: '聊城', 高唐县: '聊城', 高唐: '聊城',
  临清市: '聊城', 临清: '聊城',
  // 滨州市
  滨城区: '滨州', 沾化区: '滨州', 沾化县: '滨州', 沾化: '滨州', 惠民县: '滨州',
  阳信县: '滨州', 阳信: '滨州', 无棣县: '滨州', 无棣: '滨州', 博兴县: '滨州', 博兴: '滨州',
  邹平市: '滨州', 邹平: '滨州',
  // 菏泽市
  牡丹区: '菏泽', 定陶区: '菏泽', 定陶县: '菏泽', 定陶: '菏泽', 曹县: '菏泽',
  单县: '菏泽', 成武县: '菏泽', 成武: '菏泽', 巨野县: '菏泽', 巨野: '菏泽',
  郓城县: '菏泽', 郓城: '菏泽', 鄄城县: '菏泽', 鄄城: '菏泽', 东明县: '菏泽', 东明: '菏泽',
}

/** 地级市名（含「市」）→ 简称；同时覆盖「山东」这种省级前缀带来的误判 */
const CITY_FULL_TO_SHORT: Record<string, ShandongCity> = Object.fromEntries(
  SHANDONG_CITIES.map((c) => [`${c}市`, c]),
) as Record<string, ShandongCity>

/** 匹配表：先长后短，保证「曲阜市」优先于「曲阜」这类包含关系 */
const AREA_KEYS: { key: string; city: ShandongCity }[] = [
  ...Object.entries(CITY_FULL_TO_SHORT).map(([key, city]) => ({ key, city })),
  ...Object.entries(COUNTY_TO_CITY).map(([key, city]) => ({ key, city })),
].sort((a, b) => b.key.length - a.key.length)

/**
 * 把「申报地区」之类的行政区文本归并到地级市。
 * 规则：所有命中里取**出现位置最靠前**的（同一位置取更长的），
 * 这样「山东省莱芜市莱城区」→ 莱芜市（济南市），「山东省青岛市市南区」→ 青岛市，
 * 「山东省莒县」（只到县级）也能落到日照市；省级/机构名（如「山东省吕剧院」）返回 null。
 */
export function cityOfArea(area: string | null | undefined): ShandongCity | null {
  const text = String(area ?? '')
  if (!text) return null
  let best: { key: string; city: ShandongCity; at: number } | null = null
  for (const { key, city } of AREA_KEYS) {
    const at = text.indexOf(key)
    if (at < 0) continue
    if (!best || at < best.at || (at === best.at && key.length > best.key.length)) {
      best = { key, city, at }
    }
  }
  return best ? best.city : null
}

/**
 * 标题/正文里提到的山东城市（去重，按首次出现顺序）。
 * 既认「济宁市」也认光杆「济宁」——新闻标题通常不带「市」字。
 * 刻意排除了易误判的词：惠民（惠民活动）、平原（平原地区）、牡丹（牡丹花）、
 * 钢城、城区、陵县；「日照」既是地名也是常用词，但在文旅稿里基本都是市名，保留。
 */
const TEXT_KEYS: { key: string; city: ShandongCity }[] = [
  ...SHANDONG_CITIES.map((c) => ({ key: c as string, city: c })),
  ...Object.entries(CITY_FULL_TO_SHORT).map(([key, city]) => ({ key, city })),
  ...Object.entries(COUNTY_TO_CITY).map(([key, city]) => ({ key, city })),
].filter(({ key }) => {
  if (['惠民', '平原', '牡丹', '钢城', '城区', '陵县'].includes(key)) return false
  return true
}).sort((a, b) => b.key.length - a.key.length)

export function citiesInText(text: string | null | undefined): ShandongCity[] {
  const raw = String(text ?? '')
  if (!raw) return []
  // 一个市可能被多个键命中（「济宁市」和「济宁」），只保留最靠前的那次命中
  const best = new Map<ShandongCity, { at: number; len: number }>()
  for (const { key, city } of TEXT_KEYS) {
    const at = raw.indexOf(key)
    if (at < 0) continue
    const prev = best.get(city)
    if (!prev || at < prev.at || (at === prev.at && key.length > prev.len)) {
      best.set(city, { at, len: key.length })
    }
  }
  return [...best.entries()]
    .sort((a, b) => a[1].at - b[1].at || b[1].len - a[1].len)
    .map(([city]) => city)
}

/** 两个经纬度点的球面距离（公里） */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
