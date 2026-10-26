
export const YELLOW_RIVER_CITIES = [
  '菏泽', '济宁', '泰安', '聊城', '德州', '济南', '淄博', '滨州', '东营'
] as const

export type CityName = typeof YELLOW_RIVER_CITIES[number]

export interface GeoPoint {
  lng: number
  lat: number
}

export interface ResourcePoint {
  id: string
  name: string
  type: string
  city: string
  lng: number
  lat: number
  flow: number
  status: '正常' | '预警' | '繁忙'
}

export interface CityTourismItem {
  city: string
  heat: number
  flow: number
  warn: number
}

export interface HomeData {
  cityTourism: CityTourismItem[]
  resourcePoints: ResourcePoint[]
}

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

export interface CityCountItem {
  city: string
  value: number
  rows?: { label: string; value: string }[]
  tag?: string
}

export interface ReserveCityStat {
  city: string
  total: number
  national: number
  provincial: number
  county: number
}

export interface ScenicCityStat {
  city: string
  total: number
  a5: number
  a4: number
}

export interface NatureReserve {
  id: string
  name: string
  level: '国家级' | '省级'
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

export interface ScenicSpot {
  id: string
  name: string
  level: string
  type: string
  city: string
  lng: number
  lat: number
  flow: number
  capacity: number
  trend: number[]
  intro: string
  profile: {
    age: Record<string, number>
    source: string[]
  }
}

export interface MapSpotPoint {
  id: string
  name: string
  lng: number
  lat: number
  tag?: string
  intro?: string
  rows?: { label: string; value: string }[]
  icon?: string
  color?: string
  count?: number
}

export interface MapPointGroup {
  key: string
  label: string
  color?: string
  ring?: boolean
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

export interface FoodItem {
  id: string
  name: string
  category: string
  city: string
  county: string
  flavor: string
  dishes: string[]
  desc: string
}

export interface FilterState {
  timeRange: string
  region: string
  platform: string
  sentiment: string
}
