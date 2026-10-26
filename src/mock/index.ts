import type {
  HomeData, NatureReserve, SpeciesPoint, ScenicSpot, HeatPoint, WarningSpot,
  RealtimeFlow, VisitorProfile, FlowWarning, FlowTrend, MigrationData,
  IndustryKpi, CityIncome, ConsumeStruct, InvestTrend, SupplyItem, ReportItem,
  ResourceTreeNode, ResourceItem, ConflictItem,
  SentimentData, TrendItem, PlatformDist, TopicItem, OpinionAnalysis,
  WordCloudItem, CommentHeat,
  AccountItem, MarketingTopic, CityPromotion, BrandEvent,
  WaterInfo, WeatherWarn, GeoHazard, FlowWarn, VideoPoint,
  DisasterPredictions, DisasterWarning,
  HeritageItem, ThemeRoute,
  ReserveCityStat, ScenicCityStat,
  FoodItem,
} from '../types'

const CITY_COORDS: Record<string, { lng: number; lat: number }> = {
  '菏泽': { lng: 115.48, lat: 35.23 },
  '济宁': { lng: 116.59, lat: 35.41 },
  '泰安': { lng: 117.13, lat: 36.18 },
  '聊城': { lng: 115.98, lat: 36.45 },
  '德州': { lng: 116.36, lat: 37.45 },
  '济南': { lng: 117.12, lat: 36.65 },
  '淄博': { lng: 118.05, lat: 36.81 },
  '滨州': { lng: 117.97, lat: 37.38 },
  '东营': { lng: 118.67, lat: 37.43 },
}

export const mockHomeData: HomeData = {
  cityTourism: [
    { city: '济南', heat: 328.5, flow: 328500, warn: 2 },
    { city: '青岛', heat: 306.4, flow: 306400, warn: 3 },
    { city: '潍坊', heat: 248.3, flow: 248300, warn: 2 },
    { city: '烟台', heat: 232.7, flow: 232700, warn: 1 },
    { city: '泰安', heat: 215.6, flow: 215600, warn: 1 },
    { city: '临沂', heat: 189.5, flow: 189500, warn: 1 },
    { city: '济宁', heat: 178.3, flow: 178300, warn: 1 },
    { city: '威海', heat: 164.2, flow: 164200, warn: 0 },
    { city: '淄博', heat: 156.2, flow: 156200, warn: 1 },
    { city: '东营', heat: 134.8, flow: 134800, warn: 1 },
    { city: '日照', heat: 118.6, flow: 118600, warn: 1 },
    { city: '滨州', heat: 98.6, flow: 98600, warn: 1 },
    { city: '枣庄', heat: 92.4, flow: 92400, warn: 0 },
    { city: '聊城', heat: 86.4, flow: 86400, warn: 0 },
    { city: '德州', heat: 72.3, flow: 72300, warn: 0 },
    { city: '菏泽', heat: 65.8, flow: 65800, warn: 0 },
  ],
  resourcePoints: [
    { id: 'r001', name: '趵突泉景区', type: 'A级景区', city: '济南', lng: 117.01, lat: 36.66, flow: 18500, status: '繁忙' },
    { id: 'r002', name: '泰山风景区', type: 'A级景区', city: '泰安', lng: 117.10, lat: 36.25, flow: 32000, status: '预警' },
    { id: 'r003', name: '曲阜三孔', type: '文博场馆', city: '济宁', lng: 116.99, lat: 35.59, flow: 15200, status: '正常' },
    { id: 'r004', name: '黄河口生态旅游区', type: 'A级景区', city: '东营', lng: 118.98, lat: 37.76, flow: 8600, status: '正常' },
    { id: 'r005', name: '大明湖景区', type: 'A级景区', city: '济南', lng: 117.03, lat: 36.68, flow: 22000, status: '繁忙' },
    { id: 'r006', name: '千佛山', type: 'A级景区', city: '济南', lng: 117.04, lat: 36.63, flow: 9800, status: '正常' },
    { id: 'r007', name: '微山湖湿地', type: '湿地公园', city: '济宁', lng: 117.22, lat: 34.78, flow: 5600, status: '正常' },
    { id: 'r008', name: '水泊梁山', type: 'A级景区', city: '济宁', lng: 116.10, lat: 35.80, flow: 7200, status: '正常' },
    { id: 'r009', name: '孙子兵法城', type: '文博场馆', city: '滨州', lng: 117.58, lat: 37.38, flow: 3200, status: '正常' },
    { id: 'r010', name: '周村古商城', type: 'A级景区', city: '淄博', lng: 117.87, lat: 36.80, flow: 6800, status: '正常' },
    { id: 'r011', name: '黄河三角洲国家级自然保护区', type: '自然保护区', city: '东营', lng: 118.95, lat: 37.78, flow: 2100, status: '正常' },
    { id: 'r012', name: '东阿阿胶城', type: '非遗工坊', city: '聊城', lng: 116.24, lat: 36.32, flow: 4500, status: '正常' },
    { id: 'r013', name: '岱庙', type: '文博场馆', city: '泰安', lng: 117.13, lat: 36.19, flow: 6300, status: '正常' },
    { id: 'r014', name: '齐国故城遗址', type: '文博场馆', city: '淄博', lng: 118.34, lat: 36.93, flow: 3100, status: '正常' },
    { id: 'r015', name: '潭溪山景区', type: 'A级景区', city: '淄博', lng: 118.09, lat: 36.54, flow: 4400, status: '正常' },
    { id: 'r016', name: '东昌湖风景区', type: 'A级景区', city: '聊城', lng: 115.98, lat: 36.44, flow: 5800, status: '正常' },
    { id: 'r017', name: '魏氏庄园', type: '文博场馆', city: '滨州', lng: 117.52, lat: 37.46, flow: 2600, status: '正常' },
    { id: 'r018', name: '董子园景区', type: 'A级景区', city: '德州', lng: 116.29, lat: 37.44, flow: 4200, status: '正常' },
    { id: 'r019', name: '夏津黄河故道森林公园', type: '湿地公园', city: '德州', lng: 116.00, lat: 36.95, flow: 3800, status: '正常' },
    { id: 'r020', name: '曹州牡丹园', type: 'A级景区', city: '菏泽', lng: 115.43, lat: 35.29, flow: 9600, status: '繁忙' },
    { id: 'r021', name: '水浒好汉城', type: 'A级景区', city: '菏泽', lng: 115.94, lat: 35.60, flow: 5400, status: '正常' },
    { id: 'r022', name: '栈桥', type: 'A级景区', city: '青岛', lng: 120.32, lat: 36.06, flow: 21000, status: '繁忙' },
    { id: 'r023', name: '崂山风景区', type: 'A级景区', city: '青岛', lng: 120.62, lat: 36.19, flow: 18400, status: '预警' },
    { id: 'r024', name: '青岛啤酒博物馆', type: '文博场馆', city: '青岛', lng: 120.34, lat: 36.08, flow: 7600, status: '正常' },
    { id: 'r025', name: '蓬莱阁', type: 'A级景区', city: '烟台', lng: 120.76, lat: 37.81, flow: 15800, status: '繁忙' },
    { id: 'r026', name: '长岛风景区', type: 'A级景区', city: '烟台', lng: 120.73, lat: 37.91, flow: 6200, status: '正常' },
    { id: 'r027', name: '龙口南山旅游景区', type: 'A级景区', city: '烟台', lng: 120.48, lat: 37.60, flow: 5400, status: '正常' },
    { id: 'r028', name: '青州古城', type: 'A级景区', city: '潍坊', lng: 118.48, lat: 36.69, flow: 14200, status: '繁忙' },
    { id: 'r029', name: '沂山风景区', type: 'A级景区', city: '潍坊', lng: 118.63, lat: 36.31, flow: 6800, status: '正常' },
    { id: 'r030', name: '十笏园', type: '文博场馆', city: '潍坊', lng: 119.10, lat: 36.71, flow: 4100, status: '正常' },
    { id: 'r031', name: '刘公岛', type: 'A级景区', city: '威海', lng: 122.18, lat: 37.50, flow: 11800, status: '繁忙' },
    { id: 'r032', name: '成山头', type: 'A级景区', city: '威海', lng: 122.69, lat: 37.40, flow: 7300, status: '正常' },
    { id: 'r033', name: '赤山风景区', type: 'A级景区', city: '威海', lng: 122.43, lat: 36.93, flow: 4600, status: '正常' },
    { id: 'r034', name: '万平口海滨风景区', type: 'A级景区', city: '日照', lng: 119.56, lat: 35.41, flow: 12600, status: '繁忙' },
    { id: 'r035', name: '五莲山风景区', type: 'A级景区', city: '日照', lng: 119.34, lat: 35.74, flow: 5200, status: '正常' },
    { id: 'r036', name: '浮来山风景区', type: 'A级景区', city: '日照', lng: 118.80, lat: 35.53, flow: 3900, status: '正常' },
    { id: 'r037', name: '沂蒙山旅游区（蒙山）', type: 'A级景区', city: '临沂', lng: 117.92, lat: 35.52, flow: 13600, status: '繁忙' },
    { id: 'r038', name: '竹泉村', type: '乡村旅游', city: '临沂', lng: 118.33, lat: 35.62, flow: 6900, status: '正常' },
    { id: 'r039', name: '萤火虫水洞·地下大峡谷', type: 'A级景区', city: '临沂', lng: 118.45, lat: 35.72, flow: 7500, status: '正常' },
    { id: 'r040', name: '台儿庄古城', type: 'A级景区', city: '枣庄', lng: 117.73, lat: 34.56, flow: 19800, status: '预警' },
    { id: 'r041', name: '抱犊崮国家森林公园', type: '自然保护区', city: '枣庄', lng: 117.57, lat: 35.03, flow: 3400, status: '正常' },
    { id: 'r042', name: '微山湖红荷湿地', type: '湿地公园', city: '枣庄', lng: 117.10, lat: 34.92, flow: 5100, status: '正常' },
  ],
}

export const mockYellowRiverCourse: [number, number][] = [
  [35.26, 115.09],
  [35.40, 115.45],
  [35.65, 115.90],
  [35.85, 116.10],
  [36.20, 116.28],
  [36.52, 116.55],
  [36.75, 116.78],
  [36.98, 117.15],
  [37.25, 117.70],
  [37.52, 118.20],
  [37.76, 119.05],
]

export const mockYellowRiverFullCourse: [number, number][] = [
  [34.60, 96.20],
  [34.92, 97.60],
  [34.85, 98.20],
  [33.75, 99.70],
  [33.40, 101.50],
  [34.00, 102.10],
  [34.60, 102.50],
  [35.00, 102.90],
  [35.90, 103.20],
  [36.06, 103.80],
  [36.50, 104.20],
  [37.50, 105.20],
  [37.50, 105.70],
  [37.90, 106.00],
  [38.50, 106.30],
  [39.20, 106.40],
  [39.66, 106.80],
  [40.30, 107.00],
  [40.75, 107.40],
  [40.55, 109.80],
  [40.28, 111.20],
  [39.60, 111.20],
  [39.38, 111.15],
  [37.50, 110.75],
  [35.48, 110.45],
  [34.60, 110.30],
  [34.50, 110.90],
  [34.80, 111.40],
  [34.83, 112.40],
  [34.90, 113.60],
  [34.80, 114.30],
  [34.85, 114.80],
  [35.30, 115.10],
  [35.70, 115.00],
  [36.30, 116.20],
  [36.70, 116.80],
  [37.00, 117.20],
  [37.40, 117.90],
  [37.60, 118.30],
  [37.80, 118.95],
]

export const mockReserves: NatureReserve[] = [
  { id: 'n001', name: '黄河三角洲国家级自然保护区', level: '国家级', city: '东营市', area: 153000, lng: 118.95, lat: 37.78, species: ['东方白鹳', '黑嘴鸥', '丹顶鹤', '黄河刀鱼'], manager: '山东黄河三角洲国家级自然保护区管理委员会', lastMonitor: '2026-09-20' },
  { id: 'n002', name: '南四湖省级自然保护区', level: '省级', city: '济宁市', area: 127500, lng: 117.22, lat: 34.78, species: ['大天鹅', '鸳鸯', '中华秋沙鸭'], manager: '济宁市自然资源和规划局', lastMonitor: '2026-09-18' },
  { id: 'n003', name: '泰山省级自然保护区', level: '省级', city: '泰安市', area: 12800, lng: 117.10, lat: 36.25, species: ['赤松', '泰山韭', '螭霖鱼'], manager: '泰山风景名胜区管理委员会', lastMonitor: '2026-09-22' },
  { id: 'n004', name: '滨州贝壳堤岛与湿地国家级自然保护区', level: '国家级', city: '滨州市', area: 43500, lng: 117.88, lat: 38.20, species: ['文蛤', '四角蛤蜊', '黑嘴鸥'], manager: '滨州市自然资源和规划局', lastMonitor: '2026-09-15' },
  { id: 'n005', name: '东阿黄河国家湿地公园', level: '省级', city: '聊城市', area: 2860, lng: 116.24, lat: 36.32, species: ['白鹭', '苍鹭', '斑嘴鸭'], manager: '东阿县自然资源和规划局', lastMonitor: '2026-09-19' },
  { id: 'n006', name: '齐河黄河水乡国家湿地公园', level: '省级', city: '德州市', area: 3200, lng: 116.76, lat: 36.78, species: ['东方白鹳', '大天鹅', '灰鹤'], manager: '齐河县自然资源和规划局', lastMonitor: '2026-09-21' },
  { id: 'n007', name: '崂山省级自然保护区', level: '省级', city: '青岛市', area: 44000, lng: 120.60, lat: 36.20, species: ['赤松', '黑松', '崂山百合'], manager: '青岛市自然资源和规划局', lastMonitor: '2026-09-17' },
  { id: 'n008', name: '长岛国家级自然保护区', level: '国家级', city: '烟台市', area: 5300, lng: 120.73, lat: 37.95, species: ['斑海豹', '黄嘴白鹭', '蝮蛇'], manager: '长岛国家级自然保护区管理处', lastMonitor: '2026-09-16' },
  { id: 'n009', name: '昆嵛山国家级自然保护区', level: '国家级', city: '烟台市', area: 15400, lng: 121.75, lat: 37.30, species: ['赤松', '蝮蛇', '中华秋沙鸭'], manager: '昆嵛山国家级自然保护区管理局', lastMonitor: '2026-09-20' },
  { id: 'n010', name: '荣成大天鹅国家级自然保护区', level: '国家级', city: '威海市', area: 10500, lng: 122.55, lat: 37.30, species: ['大天鹅', '东方白鹳', '灰鹤'], manager: '荣成大天鹅国家级自然保护区管理处', lastMonitor: '2026-09-19' },
  { id: 'n011', name: '山旺古生物化石国家级自然保护区', level: '国家级', city: '潍坊市', area: 1200, lng: 118.65, lat: 36.55, species: ['山旺山东鸟化石', '中新世古生物化石群'], manager: '临朐县自然资源和规划局', lastMonitor: '2026-09-14' },
  { id: 'n012', name: '沂山省级自然保护区', level: '省级', city: '潍坊市', area: 15000, lng: 118.63, lat: 36.31, species: ['油松', '辽东栎', '沂山丹参'], manager: '潍坊市自然资源和规划局', lastMonitor: '2026-09-18' },
  { id: 'n013', name: '蒙山省级自然保护区', level: '省级', city: '临沂市', area: 36800, lng: 117.92, lat: 35.52, species: ['赤松', '蒙山鹅耳枥', '中华蜜蜂'], manager: '临沂市自然资源和规划局', lastMonitor: '2026-09-21' },
  { id: 'n014', name: '抱犊崮省级自然保护区', level: '省级', city: '枣庄市', area: 6300, lng: 117.57, lat: 35.03, species: ['青檀', '银杏', '杜鹃'], manager: '枣庄市自然资源和规划局', lastMonitor: '2026-09-15' },
  { id: 'n015', name: '五莲山省级自然保护区', level: '省级', city: '日照市', area: 7400, lng: 119.34, lat: 35.74, species: ['野生杜鹃', '赤松', '黄檀'], manager: '日照市自然资源和规划局', lastMonitor: '2026-09-17' },
  { id: 'n016', name: '柳埠省级自然保护区', level: '省级', city: '济南市', area: 6600, lng: 117.13, lat: 36.52, species: ['赤松', '侧柏', '白鹭'], manager: '济南市自然资源和规划局', lastMonitor: '2026-09-19' },
  { id: 'n017', name: '鲁山省级自然保护区', level: '省级', city: '淄博市', area: 13000, lng: 118.05, lat: 36.31, species: ['赤松', '油松', '中华蜜蜂'], manager: '淄博市自然资源和规划局', lastMonitor: '2026-09-20' },
  { id: 'n018', name: '菏泽黄河故道省级自然保护区', level: '省级', city: '菏泽市', area: 8900, lng: 115.72, lat: 34.85, species: ['白鹭', '苍鹭', '芦苇'], manager: '菏泽市自然资源和规划局', lastMonitor: '2026-09-18' },
]

export const mockReserveCityStats: ReserveCityStat[] = [
  { city: '青岛市', total: 12, national: 1, provincial: 3, county: 8 },
  { city: '烟台市', total: 11, national: 2, provincial: 3, county: 6 },
  { city: '临沂市', total: 10, national: 0, provincial: 4, county: 6 },
  { city: '威海市', total: 9, national: 1, provincial: 3, county: 5 },
  { city: '济宁市', total: 9, national: 1, provincial: 3, county: 5 },
  { city: '潍坊市', total: 8, national: 0, provincial: 3, county: 5 },
  { city: '济南市', total: 8, national: 0, provincial: 4, county: 4 },
  { city: '泰安市', total: 7, national: 0, provincial: 2, county: 5 },
  { city: '淄博市', total: 6, national: 0, provincial: 3, county: 3 },
  { city: '东营市', total: 6, national: 1, provincial: 2, county: 3 },
  { city: '滨州市', total: 5, national: 1, provincial: 2, county: 2 },
  { city: '德州市', total: 5, national: 0, provincial: 2, county: 3 },
  { city: '菏泽市', total: 5, national: 0, provincial: 2, county: 3 },
  { city: '聊城市', total: 4, national: 0, provincial: 2, county: 2 },
  { city: '日照市', total: 4, national: 0, provincial: 2, county: 2 },
  { city: '枣庄市', total: 4, national: 0, provincial: 2, county: 2 },
]

export const mockSpeciesPoints: SpeciesPoint[] = [
  { name: '东方白鹳', lng: 118.95, lat: 37.78, level: '国家一级' },
  { name: '黑嘴鸥', lng: 118.90, lat: 37.82, level: '国家一级' },
  { name: '丹顶鹤', lng: 118.88, lat: 37.75, level: '国家一级' },
  { name: '大天鹅', lng: 117.22, lat: 34.78, level: '国家二级' },
  { name: '中华秋沙鸭', lng: 117.18, lat: 34.82, level: '国家一级' },
  { name: '螭霖鱼', lng: 117.10, lat: 36.25, level: '国家二级' },
  { name: '白鹭', lng: 116.24, lat: 36.32, level: '国家三有' },
  { name: '灰鹤', lng: 116.76, lat: 36.78, level: '国家二级' },
]

export const mockRedLineGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '黄河三角洲生态红线' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[118.7, 37.6], [119.2, 37.6], [119.2, 38.0], [118.7, 38.0], [118.7, 37.6]]],
      },
    },
    {
      type: 'Feature',
      properties: { name: '南四湖生态红线' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[116.9, 34.5], [117.5, 34.5], [117.5, 35.0], [116.9, 35.0], [116.9, 34.5]]],
      },
    },
  ],
}

export const mockScenicSpots: ScenicSpot[] = [
  { id: 's001', name: '趵突泉景区', level: '5A', type: 'A级景区', city: '济南市', lng: 117.01, lat: 36.66, intro: '济南三大名胜之首，趵突泉居七十二名泉之冠，三窟并发、四季恒温，素有「天下第一泉」之称。', flow: 18500, capacity: 30000, trend: [12000, 14500, 16800, 18500, 17200, 15000, 13000], profile: { age: { '18-25': 25, '26-35': 35, '36-45': 25, '46+': 15 }, source: ['济南本地', '北京', '天津', '河北'] } },
  { id: 's002', name: '泰山风景区', level: '5A', type: 'A级景区', city: '泰安市', lng: 117.10, lat: 36.25, intro: '五岳之首，世界文化与自然双遗产，主峰玉皇顶海拔 1545 米，历代帝王封禅告祭之地。', flow: 32000, capacity: 35000, trend: [20000, 24000, 28000, 32000, 30000, 26000, 22000], profile: { age: { '18-25': 30, '26-35': 40, '36-45': 20, '46+': 10 }, source: ['山东', '北京', '江苏', '河南'] } },
  { id: 's003', name: '曲阜三孔', level: '5A', type: '文博场馆', city: '济宁市', lng: 116.99, lat: 35.59, intro: '孔庙、孔府、孔林合称「三孔」，世界文化遗产，是儒家文化最完整的实物遗存。', flow: 15200, capacity: 25000, trend: [10000, 12000, 14000, 15200, 14500, 13000, 11000], profile: { age: { '18-25': 15, '26-35': 30, '36-45': 35, '46+': 20 }, source: ['山东', '北京', '河北', '山西'] } },
  { id: 's004', name: '黄河口生态旅游区', level: '5A', type: 'A级景区', city: '东营市', lng: 118.98, lat: 37.76, intro: '黄河入海处的新生湿地，芦花飞雪、河海交汇，是东方白鹳、黑嘴鸥等珍禽的繁殖地。', flow: 8600, capacity: 15000, trend: [5000, 6500, 7800, 8600, 8000, 7000, 6000], profile: { age: { '18-25': 20, '26-35': 35, '36-45': 30, '46+': 15 }, source: ['山东', '北京', '天津'] } },
  { id: 's005', name: '大明湖景区', level: '5A', type: 'A级景区', city: '济南市', lng: 117.03, lat: 36.68, intro: '由济南众泉汇流而成的天然湖泊，「四面荷花三面柳，一城山色半城湖」即咏此处。', flow: 22000, capacity: 40000, trend: [15000, 18000, 20000, 22000, 21000, 19000, 17000], profile: { age: { '18-25': 28, '26-35': 38, '36-45': 22, '46+': 12 }, source: ['济南本地', '北京', '河北'] } },
  { id: 's006', name: '千佛山', level: '4A', type: 'A级景区', city: '济南市', lng: 117.04, lat: 36.63, intro: '济南三大名胜之一，古称历山，隋代崖壁造像千余尊，登顶可俯瞰泉城全景。', flow: 9800, capacity: 20000, trend: [6000, 7500, 8800, 9800, 9200, 8000, 7000], profile: { age: { '18-25': 22, '26-35': 32, '36-45': 28, '46+': 18 }, source: ['济南本地', '泰安', '淄博'] } },
  { id: 's007', name: '微山湖湿地', level: '4A', type: '湿地公园', city: '济宁市', lng: 117.22, lat: 34.78, intro: '南四湖中面积最大的湖泊湿地，荷花芦苇连片，也是南水北调东线的重要调蓄湖泊。', flow: 5600, capacity: 12000, trend: [3000, 4000, 5000, 5600, 5200, 4500, 3800], profile: { age: { '18-25': 18, '26-35': 30, '36-45': 32, '46+': 20 }, source: ['济宁', '徐州', '枣庄'] } },
  { id: 's008', name: '水泊梁山', level: '4A', type: 'A级景区', city: '济宁市', lng: 116.10, lat: 35.80, intro: '《水浒传》故事发生地，梁山寨、忠义堂等遗迹尚存，是水浒文化旅游的核心景区。', flow: 7200, capacity: 15000, trend: [4000, 5000, 6500, 7200, 6800, 5800, 5000], profile: { age: { '18-25': 25, '26-35': 35, '36-45': 25, '46+': 15 }, source: ['济宁', '菏泽', '河南'] } },
  { id: 's009', name: '周村古商城', level: '4A', type: 'A级景区', city: '淄博市', lng: 117.87, lat: 36.80, intro: '有「旱码头」之称的周村大街，保存完好的明清商业街市，瑞蚨祥等老字号的发源地。', flow: 6800, capacity: 12000, trend: [4000, 5000, 6000, 6800, 6500, 5500, 4800], profile: { age: { '18-25': 20, '26-35': 35, '36-45': 30, '46+': 15 }, source: ['淄博', '济南', '潍坊'] } },
  { id: 's010', name: '孙子兵法城', level: '4A', type: '文博场馆', city: '滨州市', lng: 117.58, lat: 37.38, intro: '以《孙子兵法》为主题的仿古建筑群，位于兵圣孙武故里惠民县，是鲁北文旅地标。', flow: 3200, capacity: 8000, trend: [2000, 2500, 3000, 3200, 3000, 2600, 2200], profile: { age: { '18-25': 15, '26-35': 25, '36-45': 35, '46+': 25 }, source: ['滨州', '东营', '德州'] } },
]

export const mockScenicCityStats: ScenicCityStat[] = [
  { city: '青岛市', total: 68, a5: 1, a4: 30 },
  { city: '烟台市', total: 62, a5: 2, a4: 28 },
  { city: '济南市', total: 55, a5: 1, a4: 26 },
  { city: '临沂市', total: 51, a5: 2, a4: 24 },
  { city: '潍坊市', total: 48, a5: 2, a4: 22 },
  { city: '济宁市', total: 45, a5: 2, a4: 20 },
  { city: '淄博市', total: 40, a5: 0, a4: 18 },
  { city: '泰安市', total: 38, a5: 1, a4: 17 },
  { city: '威海市', total: 33, a5: 2, a4: 15 },
  { city: '日照市', total: 30, a5: 0, a4: 13 },
  { city: '德州市', total: 26, a5: 0, a4: 11 },
  { city: '滨州市', total: 24, a5: 0, a4: 10 },
  { city: '东营市', total: 22, a5: 1, a4: 9 },
  { city: '聊城市', total: 21, a5: 0, a4: 9 },
  { city: '菏泽市', total: 20, a5: 0, a4: 8 },
  { city: '枣庄市', total: 19, a5: 1, a4: 8 },
]

export const mockHeatData: HeatPoint[] = [
  { lng: 117.01, lat: 36.66, value: 85 },
  { lng: 117.10, lat: 36.25, value: 95 },
  { lng: 116.99, lat: 35.59, value: 70 },
  { lng: 118.98, lat: 37.76, value: 45 },
  { lng: 117.03, lat: 36.68, value: 80 },
  { lng: 117.04, lat: 36.63, value: 55 },
  { lng: 117.22, lat: 34.78, value: 35 },
  { lng: 116.10, lat: 35.80, value: 40 },
]

export const mockWarningList: WarningSpot[] = [
  { id: 's002', name: '泰山风景区', flow: 32000, capacity: 35000 },
  { id: 's001', name: '趵突泉景区', flow: 18500, capacity: 30000 },
  { id: 's005', name: '大明湖景区', flow: 22000, capacity: 40000 },
]

export const mockRealtimeFlow: RealtimeFlow = {
  total: 1286453,
  yoy: 12.5,
  mom: 8.3,
}

export const mockProfile: VisitorProfile = {
  source: [
    { name: '山东省内', value: 45 },
    { name: '北京', value: 12 },
    { name: '河北', value: 10 },
    { name: '河南', value: 8 },
    { name: '江苏', value: 7 },
    { name: '天津', value: 6 },
    { name: '其他', value: 12 },
  ],
  age: [
    { name: '18岁以下', value: 8 },
    { name: '18-25岁', value: 22 },
    { name: '26-35岁', value: 35 },
    { name: '36-45岁', value: 22 },
    { name: '46-60岁', value: 10 },
    { name: '60岁以上', value: 3 },
  ],
  consume: [
    { name: '门票', value: 28 },
    { name: '餐饮', value: 32 },
    { name: '住宿', value: 25 },
    { name: '文创', value: 10 },
    { name: '交通', value: 5 },
  ],
}

export const mockFlowWarnings: FlowWarning[] = [
  { spot: '泰山风景区', flow: 32000, capacity: 35000, level: '橙色' },
  { spot: '趵突泉景区', flow: 18500, capacity: 30000, level: '黄色' },
  { spot: '大明湖景区', flow: 22000, capacity: 40000, level: '黄色' },
  { spot: '曲阜三孔', flow: 15200, capacity: 25000, level: '正常' },
  { spot: '千佛山', flow: 9800, capacity: 20000, level: '正常' },
]

const days = ['09-18', '09-19', '09-20', '09-21', '09-22', '09-23', '09-24']
export const mockFlowTrend: FlowTrend = {
  day: days.map((d, i) => ({ date: d, value: 980000 + i * 45000 + Math.floor(Math.random() * 20000) })),
  week: ['第36周', '第37周', '第38周', '第39周'].map((w, i) => ({ date: w, value: 6200000 + i * 180000 })),
  month: ['4月', '5月', '6月', '7月', '8月', '9月'].map((m, i) => ({ date: m, value: 25000000 + i * 3200000 })),
}

export const mockMigration: MigrationData = {
  in: [
    { city: '北京', value: 152000 },
    { city: '天津', value: 98000 },
    { city: '石家庄', value: 76000 },
    { city: '郑州', value: 65000 },
    { city: '徐州', value: 52000 },
  ],
  out: [
    { city: '北京', value: 85000 },
    { city: '天津', value: 62000 },
    { city: '青岛', value: 58000 },
    { city: '烟台', value: 45000 },
    { city: '威海', value: 38000 },
  ],
}

export const mockOvernightRate = 42.6

export const mockIndustryKpi: IndustryKpi = {
  income: 1286.5,
  visitors: 2.86,
  investment: 358.2,
  yoy: 15.8,
}

export const mockCityIncome: CityIncome[] = [
  { city: '济南', income: 328.5 },
  { city: '泰安', income: 215.6 },
  { city: '济宁', income: 178.3 },
  { city: '淄博', income: 156.2 },
  { city: '东营', income: 134.8 },
  { city: '滨州', income: 98.6 },
  { city: '聊城', income: 86.4 },
  { city: '德州', income: 72.3 },
  { city: '菏泽', income: 65.8 },
]

export const mockConsumeStruct: ConsumeStruct[] = [
  { type: '门票', value: 28 },
  { type: '餐饮', value: 32 },
  { type: '住宿', value: 25 },
  { type: '文创', value: 10 },
  { type: '交通', value: 5 },
]

export const mockInvestTrend: InvestTrend = {
  month: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月'],
  value: [22.5, 18.3, 35.6, 42.8, 38.5, 45.2, 52.6, 48.3, 54.4],
}

export const mockSupply: SupplyItem[] = [
  { type: 'A级景区', count: 286 },
  { type: '星级酒店', count: 412 },
  { type: '旅行社', count: 358 },
  { type: '民宿', count: 1256 },
  { type: '文博场馆', count: 186 },
]

export const mockReports: ReportItem[] = [
  { id: 'rep001', title: '2026年Q3沿黄文旅产业运行分析报告', period: '2026-Q3', url: '#' },
  { id: 'rep002', title: '2026年8月沿黄九市文旅收入月报', period: '2026-08', url: '#' },
  { id: 'rep003', title: '2026年暑期文旅消费专题报告', period: '2026-Summer', url: '#' },
  { id: 'rep004', title: '2025年度沿黄文旅产业发展白皮书', period: '2025-Annual', url: '#' },
]

export const mockResourceTree: ResourceTreeNode[] = [
  { type: 'A级景区', children: [{ name: '5A级', count: 12 }, { name: '4A级', count: 86 }, { name: '3A级', count: 188 }] },
  { type: '文博场馆', children: [{ name: '博物馆', count: 98 }, { name: '纪念馆', count: 45 }, { name: '文化馆', count: 43 }] },
  { type: '非遗项目', children: [{ name: '国家级', count: 56 }, { name: '省级', count: 238 }, { name: '市级', count: 512 }] },
  { type: '乡村旅游点', children: [{ name: '全国乡村旅游重点村', count: 32 }, { name: '省级乡村旅游特色村', count: 156 }] },
]

export const mockResourceList: ResourceItem[] = [
  { id: 'res001', name: '泰山风景区', type: 'A级景区', level: '5A', city: '泰安', status: '正常', updateTime: '2026-09-20' },
  { id: 'res002', name: '趵突泉景区', type: 'A级景区', level: '5A', city: '济南', status: '正常', updateTime: '2026-09-22' },
  { id: 'res003', name: '曲阜三孔', type: '文博场馆', level: '5A', city: '济宁', status: '正常', updateTime: '2026-09-18' },
  { id: 'res004', name: '黄河口生态旅游区', type: 'A级景区', level: '5A', city: '东营', status: '正常', updateTime: '2026-09-21' },
  { id: 'res005', name: '山东博物馆', type: '文博场馆', level: '一级', city: '济南', status: '正常', updateTime: '2026-09-19' },
  { id: 'res006', name: '淄博陶瓷琉璃博物馆', type: '文博场馆', level: '一级', city: '淄博', status: '维护中', updateTime: '2026-09-15' },
  { id: 'res007', name: '鲁绣', type: '非遗项目', level: '国家级', city: '济南', status: '正常', updateTime: '2026-09-10' },
  { id: 'res008', name: '阿胶制作技艺', type: '非遗项目', level: '国家级', city: '聊城', status: '正常', updateTime: '2026-09-12' },
  { id: 'res009', name: '泰山皮影戏', type: '非遗项目', level: '国家级', city: '泰安', status: '正常', updateTime: '2026-09-08' },
  { id: 'res010', name: '百花洲历史文化街区', type: '乡村旅游点', level: '省级', city: '济南', status: '正常', updateTime: '2026-09-23' },
  { id: 'res011', name: '微山岛旅游度假村', type: '乡村旅游点', level: '全国重点村', city: '济宁', status: '正常', updateTime: '2026-09-17' },
  { id: 'res012', name: '高青温泉慢城', type: 'A级景区', level: '4A', city: '淄博', status: '已关闭', updateTime: '2026-08-30' },
]

export const mockConflictList: ConflictItem[] = [
  { id: 'res012', name: '高青温泉慢城', reason: '位于黄河滩区生态保护红线范围内，建设项目与红线冲突' },
  { id: 'res008', name: '阿胶制作技艺工坊', reason: '工坊扩建区域涉及生态保护红线缓冲带' },
]

export const mockOpinionTotal = 286453
export const mockSentiment: SentimentData = { positive: 45, neutral: 38, negative: 17 }
export const mockTrend7d: TrendItem[] = days.map((d, i) => ({ date: d, value: 35000 + i * 2000 + Math.floor(Math.random() * 5000) }))
export const mockPlatformDist: PlatformDist[] = [
  { platform: '抖音', value: 35 },
  { platform: '微信', value: 25 },
  { platform: '微博', value: 18 },
  { platform: '新闻', value: 14 },
  { platform: '论坛', value: 8 },
]

export const mockTopics: TopicItem[] = [
  { name: '#沿着黄河遇见海#', heat: 985600, joins: 125000, trend: 'up' },
  { name: '#黄河入海口生态之美#', heat: 756300, joins: 89000, trend: 'up' },
  { name: '#泰山日出云海#', heat: 645200, joins: 76000, trend: 'flat' },
  { name: '#济南泉水文化节#', heat: 523800, joins: 62000, trend: 'up' },
  { name: '#黄河流域生态保护#', heat: 412500, joins: 48000, trend: 'down' },
  { name: '#淄博烧烤文旅热#', heat: 398700, joins: 55000, trend: 'down' },
  { name: '#曲阜儒家文化体验#', heat: 287600, joins: 32000, trend: 'flat' },
  { name: '#黄河非遗传承#', heat: 198500, joins: 21000, trend: 'up' },
]

export const mockOpinionAnalysis: OpinionAnalysis = {
  sentiment: { positive: 45, neutral: 38, negative: 17 },
  path: [
    { from: '微博大V', to: '抖音', value: 35 },
    { from: '新闻媒体', to: '微信', value: 28 },
    { from: '抖音KOL', to: '微博', value: 22 },
    { from: '论坛', to: '新闻', value: 15 },
  ],
  keyAccounts: [
    { name: '黄河文旅官方', platform: '抖音', followers: 2850000, influence: 95 },
    { name: '山东文旅发布', platform: '微博', followers: 1860000, influence: 88 },
    { name: '旅行摄影师老王', platform: '抖音', followers: 980000, influence: 76 },
    { name: '齐鲁晚报', platform: '微信', followers: 3200000, influence: 92 },
  ],
  warningLevel: '中等',
}

export const mockWordCloud: WordCloudItem[] = [
  { word: '黄河', count: 28650 },
  { word: '生态', count: 18920 },
  { word: '文旅', count: 15680 },
  { word: '泰山', count: 12450 },
  { word: '济南', count: 11230 },
  { word: '入海口', count: 9860 },
  { word: '非遗', count: 8750 },
  { word: '泉水', count: 7620 },
  { word: '湿地', count: 6890 },
  { word: '保护', count: 6540 },
  { word: '文化', count: 5980 },
  { word: '旅游', count: 5620 },
  { word: '沿黄', count: 5230 },
  { word: '遗产', count: 4860 },
  { word: '绿色', count: 4320 },
  { word: '发展', count: 3980 },
  { word: '景区', count: 3650 },
  { word: '美食', count: 3420 },
  { word: '民宿', count: 3180 },
  { word: '研学', count: 2950 },
]

export const mockCommentHeat: CommentHeat = {
  geo: [
    { lng: 117.01, lat: 36.66, value: 850 },
    { lng: 117.10, lat: 36.25, value: 720 },
    { lng: 116.99, lat: 35.59, value: 560 },
    { lng: 118.98, lat: 37.76, value: 420 },
    { lng: 117.03, lat: 36.68, value: 680 },
    { lng: 117.22, lat: 34.78, value: 310 },
    { lng: 116.10, lat: 35.80, value: 280 },
    { lng: 117.87, lat: 36.80, value: 350 },
  ],
  time: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    value: h >= 8 && h <= 22 ? Math.floor(200 + Math.sin((h - 8) / 14 * Math.PI) * 600 + Math.random() * 100) : Math.floor(50 + Math.random() * 80),
  })),
}

export const mockAccounts: AccountItem[] = [
  { platform: '抖音', name: '黄河文旅官方', fans: 2850000, interaction: 156000 },
  { platform: '抖音', name: '山东文旅发布', fans: 1920000, interaction: 98000 },
  { platform: '抖音', name: '泰山景区', fans: 860000, interaction: 72000 },
  { platform: '微信', name: '山东文旅公众号', fans: 1560000, interaction: 45000 },
  { platform: '微信', name: '济南市文化和旅游局', fans: 680000, interaction: 28000 },
  { platform: '微博', name: '@山东文旅', fans: 1860000, interaction: 32000 },
  { platform: '微博', name: '@泰山风景区', fans: 720000, interaction: 18000 },
]

export const mockMarketingTopics: MarketingTopic[] = [
  { name: '#沿着黄河遇见海#', read: 520000000, discuss: 1250000, trend: 'up' },
  { name: '#黄河入海口的秋天#', read: 180000000, discuss: 450000, trend: 'up' },
  { name: '#山东文旅好品#', read: 120000000, discuss: 320000, trend: 'flat' },
  { name: '#泉城济南#', read: 95000000, discuss: 280000, trend: 'down' },
  { name: '#非遗里的山东#', read: 68000000, discuss: 180000, trend: 'up' },
]

export const mockSpreadPath = [
  { from: '官方账号', to: 'KOL转发', value: 45 },
  { from: 'KOL转发', to: '用户互动', value: 68 },
  { from: '用户互动', to: '二次传播', value: 32 },
  { from: '媒体报道', to: 'KOL转发', value: 28 },
]

export const mockCityPromotion: CityPromotion[] = [
  { city: '北京', effect: 88 },
  { city: '天津', effect: 76 },
  { city: '石家庄', effect: 65 },
  { city: '郑州', effect: 58 },
  { city: '徐州', effect: 52 },
  { city: '南京', effect: 45 },
]

export const mockBrandEvents: BrandEvent[] = [
  { name: '沿着黄河遇见海', data: { 曝光量: 520000000, 互动量: 1250000, 转化率: 3.2, 带动收入: 8600 } },
  { name: '黄河文化旅游季', data: { 曝光量: 280000000, 互动量: 680000, 转化率: 2.8, 带动收入: 5200 } },
  { name: '山东非遗购物节', data: { 曝光量: 150000000, 互动量: 420000, 转化率: 4.1, 带动收入: 3800 } },
]

export const mockWaterInfo: WaterInfo = { level: 42.6, flow: 2850, flood: '正常' }

export const mockWeatherWarn: WeatherWarn[] = [
  { type: '暴雨', level: '蓝色', area: '菏泽、济宁' },
  { type: '大风', level: '黄色', area: '东营、滨州' },
  { type: '高温', level: '橙色', area: '济南、淄博' },
]

export const mockGeoHazards: GeoHazard[] = [
  { lng: 117.10, lat: 36.25, level: '中' },
  { lng: 117.87, lat: 36.80, level: '低' },
  { lng: 116.10, lat: 35.80, level: '中' },
]

export const mockFlowWarns: FlowWarn[] = [
  { spot: '泰山风景区', level: '橙色' },
  { spot: '趵突泉景区', level: '黄色' },
]

export const mockVideoPoints: VideoPoint[] = [
  { lng: 117.01, lat: 36.66, url: '#' },
  { lng: 117.10, lat: 36.25, url: '#' },
  { lng: 118.98, lat: 37.76, url: '#' },
  { lng: 116.99, lat: 35.59, url: '#' },
]

export const mockPredictions: DisasterPredictions = {
  flow: ['09-25', '09-26', '09-27', '09-28', '09-29', '09-30', '10-01'].map((d, i) => ({ date: d, value: 1350000 + i * 80000 })),
  flood: ['09-25', '09-26', '09-27', '09-28', '09-29', '09-30'].map((d, i) => ({ date: d, value: 35 + i * 2.5 })),
  capacity: [
    { spot: '泰山风景区', value: 92 },
    { spot: '趵突泉景区', value: 62 },
    { spot: '大明湖景区', value: 55 },
    { spot: '曲阜三孔', value: 61 },
  ],
}

export const mockDisasterWarnings: DisasterWarning[] = [
  { id: 'w001', level: '橙色', location: '泰山风景区', type: '客流超限', measure: '启动限流预案，建议分流至周边景区' },
  { id: 'w002', level: '黄色', location: '东营、滨州沿海', type: '大风预警', measure: '关闭海上旅游项目，加固户外设施' },
  { id: 'w003', level: '黄色', location: '趵突泉景区', type: '客流密集', measure: '加强人员疏导，增设临时出入口' },
  { id: 'w004', level: '蓝色', location: '菏泽、济宁', type: '暴雨预警', measure: '关注景区积水情况，做好排涝准备' },
  { id: 'w005', level: '橙色', location: '济南、淄博', type: '高温预警', measure: '景区增设遮阳点和饮水站，调整户外作业时间' },
]

export const mockHeritageList: HeritageItem[] = [
  { id: 'h001', name: '泰山', type: '不可移动文物', era: '世界自然与文化双重遗产', level: '世界遗产', lng: 117.10, lat: 36.25, desc: '泰山是中国五岳之首，有"天下第一山"之称，是世界文化与自然双重遗产。', images: [], model3d: undefined },
  { id: 'h002', name: '三孔（孔庙、孔府、孔林）', type: '不可移动文物', era: '春秋至清', level: '世界文化遗产', lng: 116.99, lat: 35.59, desc: '曲阜三孔是中国历代纪念孔子、推崇儒学的表征，以丰厚的文化积淀、悠久历史、宏大规模、丰富文物珍藏著称。', images: [], model3d: undefined },
  { id: 'h003', name: '齐长城遗址', type: '不可移动文物', era: '春秋战国', level: '全国重点文物保护单位', lng: 117.87, lat: 36.80, desc: '齐长城是中国现存有准确遗迹可考、保存状况较好、年代最早的古代长城之一。', images: [], model3d: undefined },
  { id: 'h004', name: '济南四门塔', type: '不可移动文物', era: '隋代', level: '全国重点文物保护单位', lng: 117.12, lat: 36.45, desc: '四门塔是中国现存唯一的隋代石塔，也是中国现存最早的单层庭阁式石塔。', images: [], model3d: undefined },
  { id: 'h005', name: '鲁绣', type: '非遗项目', era: '传统技艺', level: '国家级非遗', lng: 117.01, lat: 36.66, desc: '鲁绣是山东地区的传统刺绣，属于中国八大名绣之一，以"衣线绣"闻名。', images: [], model3d: undefined },
  { id: 'h006', name: '阿胶制作技艺', type: '非遗项目', era: '传统技艺', level: '国家级非遗', lng: 116.24, lat: 36.32, desc: '东阿阿胶制作技艺是山东省东阿县的传统手工技艺，国家级非物质文化遗产之一。', images: [], model3d: undefined },
  { id: 'h007', name: '泰山皮影戏', type: '非遗项目', era: '传统戏剧', level: '国家级非遗', lng: 117.10, lat: 36.25, desc: '泰山皮影戏是一种古老的传统民间艺术，被誉为"中国皮影活化石"。', images: [], model3d: undefined },
  { id: 'h008', name: '黄河大堤（山东段）', type: '水利水工遗产', era: '明清至今', level: '省级文物保护单位', lng: 118.67, lat: 37.43, desc: '黄河大堤是治理黄河的伟大工程，山东段是黄河下游防洪的重要屏障。', images: [], model3d: undefined },
  { id: 'h009', name: '戴村坝', type: '水利水工遗产', era: '明代', level: '全国重点文物保护单位', lng: 117.13, lat: 35.90, desc: '戴村坝是京杭大运河的重要水源工程，被誉为"运河之心"。', images: [], model3d: undefined },
  { id: 'h010', name: '山东大鼓', type: '非遗项目', era: '传统曲艺', level: '国家级非遗', lng: 116.98, lat: 36.45, desc: '山东大鼓是北方大鼓之鼻祖，中国北方地区现存最早的传统曲艺鼓书暨鼓曲形式。', images: [], model3d: undefined },
]

export const mockFoodList: FoodItem[] = [
  { id: 'f001', name: '把子肉', category: '地方名吃', city: '济南', county: '历下区', flavor: '咸鲜浓香、酱香厚重', dishes: ['把子肉配米饭', '四喜丸子', '虎皮鸡蛋'], desc: '把子肉是济南传统名吃，用蒲草捆扎五花肉加酱油慢炖，肥而不腻、入口即化，是泉城人最日常的一口荤香。' },
  { id: 'f002', name: '甜沫', category: '地方名吃', city: '济南', county: '市中区', flavor: '咸香微辣、糊香浓郁', dishes: ['甜沫配油条', '甜沫配油旋'], desc: '名为甜沫实为咸粥，小米面熬底，加花生、粉条、豆腐皮与胡椒，是济南早餐的代表，与油旋、油条最相配。' },
  { id: 'f003', name: '章丘大葱', category: '地理标志', city: '济南', county: '章丘区', flavor: '清甜脆嫩、葱白长', dishes: ['大葱蘸酱', '葱烧海参', '煎饼卷大葱'], desc: '章丘大葱以「高、长、脆、甜」著称，葱白可达半米以上，是鲁菜调味提鲜的核心食材，也是山东煎饼的灵魂搭配。' },
  { id: 'f004', name: '青岛啤酒', category: '非遗美食', city: '青岛', county: '市北区', flavor: '麦香浓郁、清爽回甘', dishes: ['原浆啤酒', '啤酒配蛤蜊', '啤酒炖海鲜'], desc: '青岛啤酒诞生于 1903 年，青岛啤酒博物馆与登州路啤酒街是城市夜生活的中心，「哈啤酒、吃蛤蜊」是青岛人的待客之道。' },
  { id: 'f005', name: '崂山绿茶', category: '地理标志', city: '青岛', county: '崂山区', flavor: '豆香清雅、汤色嫩绿', dishes: ['崂山绿茶', '茶香虾仁'], desc: '崂山绿茶是「南茶北引」的成果，海雾与山泉滋养出叶片厚、耐冲泡的北方绿茶，豌豆香鲜明。' },
  { id: 'f006', name: '流亭猪蹄', category: '地方名吃', city: '青岛', county: '城阳区', flavor: '酱香透骨、胶质软糯', dishes: ['流亭猪蹄', '猪蹄冻'], desc: '流亭猪蹄源于城阳流亭，老汤酱制、焖煮入味，冷吃成冻切片，是青岛人逢年过节的硬菜。' },
  { id: 'f007', name: '周村烧饼', category: '非遗美食', city: '淄博', county: '周村区', flavor: '酥香薄脆、芝麻香浓', dishes: ['甜味烧饼', '咸味烧饼'], desc: '周村烧饼以「薄如秋纸、酥似粉霜」闻名，手工贴炉烤制，全凭一双手控温，是国家级非物质文化遗产。' },
  { id: 'f008', name: '博山豆腐箱', category: '鲁菜名菜', city: '淄博', county: '博山区', flavor: '咸鲜醇厚、味型复合', dishes: ['豆腐箱', '博山酥锅', '博山烤肉'], desc: '博山豆腐箱是鲁中宴席名菜：豆腐切块炸制后挖空，填入三鲜肉馅再蒸，形似宝箱，是博山「三菜一汤」的核心。' },
  { id: 'f009', name: '淄博烧烤', category: '地方名吃', city: '淄博', county: '张店区', flavor: '炭火焦香、小饼卷食', dishes: ['小饼卷肉', '小葱蘸酱', '烤五花'], desc: '淄博烧烤以「小饼、小葱、小火炉」三件套出圈，自己动手卷饼把烧烤吃成了社交仪式，带动了城市的文旅热度。' },
  { id: 'f010', name: '菏泽单县羊肉汤', category: '地方名吃', city: '菏泽', county: '单县', flavor: '汤色乳白、鲜而不膻', dishes: ['羊肉汤配烧饼', '羊杂汤', '水煮羊肉'], desc: '单县羊肉汤被称为「中华第一汤」，用本地青山羊慢火熬至汤白似奶，配死面烧饼食用，是鲁西南早餐的主角。' },
  { id: 'f011', name: '曹州牡丹宴', category: '鲁菜名菜', city: '菏泽', county: '牡丹区', flavor: '清雅花馔、咸甜并用', dishes: ['牡丹花瓣羹', '牡丹虾仁', '牡丹银丝酥'], desc: '菏泽古称曹州，牡丹园中的花馔以可食用牡丹入菜，把观赏名花做成宴席，是花都独有的时令风味。' },
  { id: 'f012', name: '东营广饶肴驴肉', category: '非遗美食', city: '东营', county: '广饶县', flavor: '咸香醇正、筋络弹韧', dishes: ['肴驴肉', '驴肉拼盘'], desc: '广饶肴驴肉是省级非遗，老汤加十余味香料焖煮，色泽红润、咸香入味，是黄河口一带的传统熟食。' },
  { id: 'f013', name: '黄河口大闸蟹', category: '地理标志', city: '东营', county: '垦利区', flavor: '蟹黄饱满、清甜鲜香', dishes: ['清蒸大闸蟹', '蟹粉豆腐'], desc: '黄河入海口的弱碱水体养出青壳白肚、膏满黄肥的大闸蟹，与南方蟹相比更添一缕河海交汇的鲜甜。' },
  { id: 'f014', name: '福山大面', category: '非遗美食', city: '烟台', county: '福山区', flavor: '筋道爽滑、卤汁浓鲜', dishes: ['打卤面', '温卤面', '炸酱面'], desc: '福山大面又称福山拉面，以「溜、抻、摔」成条，条型可细可宽，配以海味打卤，是胶东面食的代表。' },
  { id: 'f015', name: '烟台苹果', category: '地理标志', city: '烟台', county: '栖霞市', flavor: '脆甜多汁、香气突出', dishes: ['鲜食苹果', '苹果醋', '拔丝苹果'], desc: '烟台是中国现代苹果栽培的发源地，栖霞的丘陵沙壤与昼夜温差造就了脆甜化渣的果肉，是山东果业的金字招牌。' },
  { id: 'f016', name: '蓬莱小面', category: '地方名吃', city: '烟台', county: '蓬莱区', flavor: '条细如丝、海味打卤', dishes: ['鱼卤小面', '海鲜小面'], desc: '蓬莱小面以真鲷熬汤打卤，面条细如发丝、入口滑爽，一碗面里能尝到黄海与渤海的交汇之鲜。' },
  { id: 'f017', name: '潍坊肉火烧', category: '地方名吃', city: '潍坊', county: '潍城区', flavor: '皮酥馅嫩、葱香扑鼻', dishes: ['肉火烧', '素火烧', '配豆腐脑'], desc: '潍坊肉火烧用土炉炭火烤制，皮薄酥脆、汁水饱满，与豆腐脑是本地最经典的早餐组合。' },
  { id: 'f018', name: '潍坊朝天锅', category: '鲁菜名菜', city: '潍坊', county: '奎文区', flavor: '汤清味厚、现煮现卷', dishes: ['朝天锅卷饼', '热汤', '猪杂拼盘'], desc: '朝天锅源于清代集市，锅无盖朝天而得名，卤汤煮猪下货现切现卷，就着热汤与咸菜，是潍坊的市井名片。' },
  { id: 'f019', name: '潍县萝卜', category: '地理标志', city: '潍坊', county: '寒亭区', flavor: '脆甜微辣、汁水充盈', dishes: ['生食萝卜', '萝卜丝拌海米'], desc: '「烟台苹果莱阳梨，不如潍县萝卜皮」，潍县萝卜皮薄肉绿、甜脆多汁，是山东人冬日的当家果蔬。' },
  { id: 'f020', name: '济宁甏肉干饭', category: '地方名吃', city: '济宁', county: '任城区', flavor: '酱香软糯、油而不腻', dishes: ['甏肉干饭', '面筋丸子', '油皮卷'], desc: '甏肉干饭用陶甏炖肉，加入面筋、丸子和海带同煮，浇在米饭上，是运河码头上流传百年的市井快餐。' },
  { id: 'f021', name: '曲阜熏豆腐', category: '非遗美食', city: '济宁', county: '曲阜市', flavor: '熏香浓郁、外韧内嫩', dishes: ['熏豆腐炖白菜', '熏豆腐炒辣椒'], desc: '熏豆腐以果木锯末熏制，色泽金黄、烟香入里，是孔府家常菜与地方集市小吃共同的常客。' },
  { id: 'f022', name: '泰山豆腐宴', category: '非遗美食', city: '泰安', county: '泰山区', flavor: '清素鲜醇、荤素两宜', dishes: ['泰山豆腐宴', '赤鳞鱼', '白菜豆腐水'], desc: '泰山水与本地黄豆点出的豆腐细嫩无腥，泰山豆腐宴以百种豆制品成席，素菜荤做，是登泰山前的传统待客席面。' },
  { id: 'f023', name: '泰安煎饼', category: '地方名吃', city: '泰安', county: '岱岳区', flavor: '粗粮醇香、薄韧耐嚼', dishes: ['玉米煎饼', '煎饼卷大葱', '菜煎饼'], desc: '山东煎饼以泰安一带最讲工艺，石磨糊子、鏊子摊薄，卷大葱蘸酱，是齐鲁大地最有辨识度的日常主食。' },
  { id: 'f024', name: '威海鲅鱼水饺', category: '地方名吃', city: '威海', county: '环翠区', flavor: '鲜嫩多汁、鱼香清甜', dishes: ['鲅鱼水饺', '鲅鱼丸子'], desc: '鲅鱼水饺是胶东渔家待客的头道主食，鱼肉加五花肉与韭菜搅打成馅，皮薄馅大、一口爆汁。' },
  { id: 'f025', name: '荣成海带', category: '地理标志', city: '威海', county: '荣成市', flavor: '厚韧脆嫩、海味清鲜', dishes: ['海带炖排骨', '凉拌海带丝'], desc: '荣成是中国海带之乡，冷流水海域养出的海带叶片宽厚，是中国海藻产业的核心产区。' },
  { id: 'f026', name: '日照绿茶', category: '地理标志', city: '日照', county: '东港区', flavor: '栗香高扬、耐泡浓醇', dishes: ['日照绿茶', '茶香熏鱼'], desc: '日照绿茶与崂山绿茶同为「南茶北引」的成果，生长周期长、内含物高，栗香与豌豆香明显。' },
  { id: 'f027', name: '临沂糁汤', category: '非遗美食', city: '临沂', county: '兰山区', flavor: '胡椒辛香、汤稠味厚', dishes: ['牛肉糁', '鸡肉糁', '配油条'], desc: '糁（sá）汤用牛骨或老母鸡熬汤，加麦仁与胡椒冲鸡蛋，是临沂人天亮就排队的一碗热汤。' },
  { id: 'f028', name: '沂蒙煎饼', category: '非遗美食', city: '临沂', county: '沂水县', flavor: '杂粮焦香、薄如纸页', dishes: ['小米煎饼', '煎饼卷咸菜', '煎饼卷炒鸡'], desc: '沂蒙煎饼以小米、玉米、高粱混合摊制，旧时是山区耐存的干粮，如今卷一切成为沂蒙味道的载体。' },
  { id: 'f029', name: '德州扒鸡', category: '非遗美食', city: '德州', county: '德城区', flavor: '五香脱骨、酥烂咸鲜', dishes: ['德州扒鸡', '扒鸡拌面'], desc: '德州扒鸡与符离集烧鸡、道口烧鸡并称中国三大名鸡，大锅焖煮至「热中一抖骨肉分」，是运河码头的百年手艺。' },
  { id: 'f030', name: '乐陵金丝小枣', category: '地理标志', city: '德州', county: '乐陵市', flavor: '肉厚核小、甜糯拉丝', dishes: ['干枣', '枣糕', '枣夹核桃'], desc: '乐陵金丝小枣掰开可见缕缕金丝，含糖量高、皮薄肉厚，是鲁北沙地千年枣林的结晶。' },
  { id: 'f031', name: '聊城魏氏熏鸡', category: '非遗美食', city: '聊城', county: '东昌府区', flavor: '熏香入骨、韧而不柴', dishes: ['熏鸡', '熏鸡丝拌黄瓜'], desc: '魏氏熏鸡用老汤焖煮后再以锯末熏制，皮色栗红、香透筋骨，是聊城东昌府的老字号名产。' },
  { id: 'f032', name: '高唐老豆腐', category: '地方名吃', city: '聊城', county: '高唐县', flavor: '嫩滑爽口、卤香微辣', dishes: ['老豆腐配油条', '卤汁豆腐'], desc: '高唐老豆腐比豆腐脑更紧实，浇上咸香微辣的卤子，是鲁西北清晨街头的第一缕热气。' },
  { id: 'f033', name: '滨州锅子饼', category: '地方名吃', city: '滨州', county: '滨城区', flavor: '皮韧馅香、荤素同卷', dishes: ['锅子饼', '素锅子饼'], desc: '锅子饼用两张薄饼夹馅烙制，馅料可荤可素，外皮筋道、内里鲜香，是滨州人从小吃到大的街边味。' },
  { id: 'f034', name: '阳信鸭梨', category: '地理标志', city: '滨州', county: '阳信县', flavor: '皮薄肉细、清甜多汁', dishes: ['鲜食鸭梨', '冰糖炖梨', '鸭梨膏'], desc: '阳信鸭梨形似鸭头，果肉细嫩无渣，是黄河冲积平原沙壤地上的传统名果。' },
  { id: 'f035', name: '枣庄石榴', category: '地理标志', city: '枣庄', county: '峄城区', flavor: '籽粒晶亮、酸甜适口', dishes: ['鲜食石榴', '石榴汁', '石榴酒'], desc: '峄城万亩榴园有 2000 余年栽培史，石榴籽大汁多、酸甜适中，是运河边的「石榴之乡」。' },
  { id: 'f036', name: '枣庄辣子鸡', category: '地方名吃', city: '枣庄', county: '市中区', flavor: '香辣浓郁、酱香微酸', dishes: ['辣子鸡', '辣子鸡拌面', '辣椒炒鸡蛋'], desc: '枣庄辣子鸡用本地薄皮辣椒与散养鸡同炒，酱香浓、辣味足，配汤汁泡馒头是当地待客的标配。' },
]

export const mockThemeRoutes: ThemeRoute[] = [
  { name: '大河印记·圣贤问道之旅', spots: ['曲阜三孔', '孟子故里', '泰山', '四门塔'] },
  { name: '大河印记·黄河入海之旅', spots: ['济南百里黄河', '东阿黄河', '黄河口生态旅游区'] },
  { name: '大河印记·非遗传承之旅', spots: ['鲁绣工坊', '阿胶博物馆', '泰山皮影', '淄博陶瓷'] },
  { name: '大河印记·水工智慧之旅', spots: ['戴村坝', '黄河大堤', '南旺分水枢纽'] },
]

export { CITY_COORDS }

export const mockCityComment: { city: string; value: number }[] = [
  { city: '济南', value: 2860 },
  { city: '泰安', value: 2140 },
  { city: '济宁', value: 1830 },
  { city: '淄博', value: 1520 },
  { city: '东营', value: 1280 },
  { city: '聊城', value: 1060 },
  { city: '德州', value: 890 },
  { city: '滨州', value: 740 },
  { city: '菏泽', value: 610 },
]