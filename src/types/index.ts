// 山东沿黄九市
export const YELLOW_RIVER_CITIES = [
  '菏泽', '济宁', '泰安', '聊城', '德州', '济南', '淄博', '滨州', '东营'
] as const

export type CityName = typeof YELLOW_RIVER_CITIES[number]

// 通用坐标点
export interface GeoPoint {
  lng: number
  lat: number
}

// ========== 首页 ==========
export interface ResourcePoint {
  id: string
  name: string
  type: string
  /** 所属地市简称（无「市」后缀），用于随分析范围过滤 */
  city: string
  lng: number
  lat: number
  flow: number
  status: '正常' | '预警' | '繁忙'
}

/** 市级旅游数据（首页分析的原子口径，16 市全覆盖） */
export interface CityTourismItem {
  /** 地市简称（无「市」后缀），与 shandong_cities.json 的 name 去后缀后一致 */
  city: string
  /** 旅游热度指数，单位：万人次（近30日） */
  heat: number
  /** 实时客流，单位：人次 */
  flow: number
  /** 今日预警，单位：条 */
  warn: number
}

export interface HomeData {
  cityTourism: CityTourismItem[]
  resourcePoints: ResourcePoint[]
}

// 山东省行政区划 GeoJSON（市级，简化结构）
export interface AdminCityProperties {
  adcode: number
  name: string
  center: [number, number]
  centroid: [number, number]
  level: string
}

export interface AdminCityFeature {
  type: 'Feature'
  properties: AdminCityProperties
  geometry: unknown
}

export interface AdminCityFeatureCollection {
  type: 'FeatureCollection'
  features: AdminCityFeature[]
}

/** 行政区数量热力图的数据项（各市统计口径） */
export interface CityCountItem {
  /** 与行政区 GeoJSON 的 name 字段一致 */
  city: string
  /** 用于着色与标注的数量 */
  value: number
  /** 悬浮提示与弹窗中的明细行 */
  rows?: { label: string; value: string }[]
  /** 名称后的补充标签，如「重点监测」 */
  tag?: string
}

/** 各市自然保护区数量（普查口径，含国家级/省级/市县级） */
export interface ReserveCityStat {
  city: string
  total: number
  national: number
  provincial: number
  county: number
}

/** 各市 A 级旅游景区数量（普查口径） */
export interface ScenicCityStat {
  city: string
  total: number
  a5: number
  a4: number
}

// ========== 自然保护区 ==========
export interface NatureReserve {
  id: string
  name: string
  level: '国家级' | '省级'
  /** 所属地市，与行政区 GeoJSON 的 name 一致 */
  city: string
  area: number
  lng: number
  lat: number
  species: string[]
  manager: string
  lastMonitor: string
}

export interface SpeciesPoint {
  name: string
  lng: number
  lat: number
  level: string
}

// ========== 旅游景点 ==========
export interface ScenicSpot {
  id: string
  name: string
  level: string
  type: string
  /** 所属地市，与行政区 GeoJSON 的 name 一致 */
  city: string
  lng: number
  lat: number
  flow: number
  capacity: number
  trend: number[]
  /** 景点简介：地图点位弹窗与详情卡都用它 */
  intro: string
  profile: {
    age: Record<string, number>
    source: string[]
  }
}

/**
 * 地图上的点位（旅游景点图等）：点位坐标 + 点击弹窗内容。
 * 从页面抽象出来给 CityChoropleth 复用，弹窗只渲染这几个字段。
 */
export interface MapSpotPoint {
  id: string
  name: string
  lng: number
  lat: number
  /** 名称右侧的小标签，如「5A · A级景区」 */
  tag?: string
  /** 简介文本 */
  intro?: string
  /** 弹窗里的明细行 */
  rows?: { label: string; value: string }[]
  /** 主题标记：图标名（config/icons 的 iconSvg 名称）。给了就画成圆形徽标，不给仍是白芯圆点 */
  icon?: string
  /** 标记主色：徽标底色 / 圆点描边色（缺省用页面的 pointColor，再缺省沿用白芯蓝圈） */
  color?: string
  /** 徽标角标数量：> 1 时显示（如县区聚合后的项目数） */
  count?: number
}

/**
 * 地图点位分组：一组对应右上角「图层」开关里的一行，可单独显隐；
 * 分组还能给定默认图标与主色，页面因此不用逐点点色（如「按景区等级分组」）。
 */
export interface MapPointGroup {
  /** 分组标识（图层开关的 key） */
  key: string
  /** 图层开关里的名称，如「鲁菜名菜（4 项）」 */
  label: string
  /** 图层色点 / 组内点位的默认主色 */
  color?: string
  /** 图层色点画成圆环：对应图上没有填充的圆环点位（如物种监测点） */
  ring?: boolean
  /** 组内点位的默认图标；点位自带 icon 时以点位为准（缺省仍是白芯圆点） */
  icon?: string
  points: MapSpotPoint[]
}

export interface HeatPoint {
  lng: number
  lat: number
  value: number
}

export interface WarningSpot {
  id: string
  name: string
  flow: number
  capacity: number
}

// ========== 客流监测 ==========
export interface RealtimeFlow {
  total: number
  yoy: number
  mom: number
}

export interface VisitorProfile {
  source: { name: string; value: number }[]
  age: { name: string; value: number }[]
  consume: { name: string; value: number }[]
}

export interface FlowWarning {
  spot: string
  flow: number
  capacity: number
  level: '正常' | '黄色' | '橙色' | '红色'
}

export interface FlowTrend {
  day: { date: string; value: number }[]
  week: { date: string; value: number }[]
  month: { date: string; value: number }[]
}

export interface MigrationData {
  in: { city: string; value: number }[]
  out: { city: string; value: number }[]
}

// ========== 文旅产业 ==========
export interface IndustryKpi {
  income: number
  visitors: number
  investment: number
  yoy: number
}

export interface CityIncome {
  city: string
  income: number
}

export interface ConsumeStruct {
  type: string
  value: number
}

export interface InvestTrend {
  month: string[]
  value: number[]
}

export interface SupplyItem {
  type: string
  count: number
}

export interface ReportItem {
  id: string
  title: string
  period: string
  url: string
}

// ========== 文旅资源 ==========
export interface ResourceTreeNode {
  type: string
  children: { name: string; count: number }[]
}

export interface ResourceItem {
  id: string
  name: string
  type: string
  level: string
  city: string
  status: '正常' | '维护中' | '已关闭'
  updateTime: string
}

export interface ConflictItem {
  id: string
  name: string
  reason: string
}

// ========== 舆情 ==========
export interface SentimentData {
  positive: number
  neutral: number
  negative: number
}

export interface TrendItem {
  date: string
  value: number
}

export interface PlatformDist {
  platform: string
  value: number
}

export interface TopicItem {
  name: string
  heat: number
  joins: number
  trend: 'up' | 'down' | 'flat'
}

export interface OpinionAnalysis {
  sentiment: SentimentData
  path: { from: string; to: string; value: number }[]
  keyAccounts: { name: string; platform: string; followers: number; influence: number }[]
  warningLevel: string
}

export interface WordCloudItem {
  word: string
  count: number
}

export interface CommentHeat {
  geo: { lng: number; lat: number; value: number }[]
  time: { hour: number; value: number }[]
}

// ========== 智慧营销 ==========
export interface AccountItem {
  platform: string
  name: string
  fans: number
  interaction: number
}

export interface MarketingTopic {
  name: string
  read: number
  discuss: number
  trend: 'up' | 'down' | 'flat'
}

export interface CityPromotion {
  city: string
  effect: number
}

export interface BrandEvent {
  name: string
  data: Record<string, number>
}

// ========== 灾难监控 ==========
export interface WaterInfo {
  level: number
  flow: number
  flood: string
}

export interface WeatherWarn {
  type: string
  level: string
  area: string
}

export interface GeoHazard {
  lng: number
  lat: number
  level: string
}

export interface FlowWarn {
  spot: string
  level: string
}

export interface VideoPoint {
  lng: number
  lat: number
  url: string
}

export interface DisasterPredictions {
  flow: { date: string; value: number }[]
  flood: { date: string; value: number }[]
  capacity: { spot: string; value: number }[]
}

export interface DisasterWarning {
  id: string
  level: string
  location: string
  type: string
  measure: string
}

// ========== 文化遗产 ==========
export interface HeritageItem {
  id: string
  name: string
  type: string
  era: string
  level: string
  lng: number
  lat: number
  desc: string
  images: string[]
  model3d?: string
}

export interface ThemeRoute {
  name: string
  spots: string[]
}

// ========== 饮食文化 ==========
export interface FoodItem {
  id: string
  /** 美食名称，如「潍坊肉火烧」 */
  name: string
  /** 类别：鲁菜名菜 / 地方名吃 / 地理标志 / 非遗美食 */
  category: string
  /** 所属地市简称（无「市」后缀） */
  city: string
  /** 所属县区全名，与 CITY_COUNTIES 的名字一致（用于点击定位到县区） */
  county: string
  /** 风味流派或工艺特点 */
  flavor: string
  /** 代表菜品 / 吃法 */
  dishes: string[]
  /** 传承与介绍 */
  desc: string
}

// 统一筛选器
export interface FilterState {
  timeRange: string
  region: string
  platform: string
  sentiment: string
}
