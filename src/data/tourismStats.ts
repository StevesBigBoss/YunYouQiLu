import type { CityTourismStat, CityTourismTrend } from '../types'

export const TOURISM_STATS_YEAR = 2024
export const TOURISM_STATS_SOURCE = '山东省统计年鉴2025'
export const TOURISM_STATS_URL = 'http://tjj.shandong.gov.cn/tjnj/nj2025/zk/indexch.htm'
export const TOURISM_STATS_FETCHED_AT = '2026-11-03 11:38:38'
export const TOURISM_TREND_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]

export const CITY_TOURISM_STATS: CityTourismStat[] = [
  { city: '济南', year: 2024, visitors: 12098.85, visitorsYoy: 13.81, revenue: 1263.8, revenueYoy: 11.55, inboundVisitors: 11.2, inboundForeignVisitors: 9.1, inboundFx: 6456 },
  { city: '青岛', year: 2024, visitors: 12085.84, visitorsYoy: 14.39, revenue: 1795.73, revenueYoy: 13.55, inboundVisitors: 42.8, inboundForeignVisitors: 34.8, inboundFx: 37666 },
  { city: '淄博', year: 2024, visitors: 6863.63, visitorsYoy: 12.24, revenue: 695.47, revenueYoy: 10.39, inboundVisitors: 1.6, inboundForeignVisitors: 1.3, inboundFx: 707 },
  { city: '枣庄', year: 2024, visitors: 2601.98, visitorsYoy: 10.16, revenue: 240.21, revenueYoy: 11.21, inboundVisitors: 1.1, inboundForeignVisitors: 0.9, inboundFx: 148 },
  { city: '东营', year: 2024, visitors: 2541.91, visitorsYoy: 12.96, revenue: 230.9, revenueYoy: 14.19, inboundVisitors: 0.5, inboundForeignVisitors: 0.4, inboundFx: 332 },
  { city: '烟台', year: 2024, visitors: 9808.44, visitorsYoy: 11.59, revenue: 1139.72, revenueYoy: 12.63, inboundVisitors: 25.4, inboundForeignVisitors: 20.7, inboundFx: 18353 },
  { city: '潍坊', year: 2024, visitors: 9645.7, visitorsYoy: 14.74, revenue: 938.79, revenueYoy: 12.12, inboundVisitors: 5.3, inboundForeignVisitors: 4.3, inboundFx: 1638 },
  { city: '济宁', year: 2024, visitors: 9440.27, visitorsYoy: 13.64, revenue: 874.64, revenueYoy: 13.96, inboundVisitors: 4.8, inboundForeignVisitors: 3.9, inboundFx: 1319 },
  { city: '泰安', year: 2024, visitors: 8628.31, visitorsYoy: 2.8, revenue: 838.66, revenueYoy: 5.74, inboundVisitors: 5.8, inboundForeignVisitors: 4.7, inboundFx: 2331 },
  { city: '威海', year: 2024, visitors: 6727.25, visitorsYoy: 13.9, revenue: 700.3, revenueYoy: 11.02, inboundVisitors: 7.7, inboundForeignVisitors: 6.3, inboundFx: 4378 },
  { city: '日照', year: 2024, visitors: 6151.11, visitorsYoy: 15.34, revenue: 392.92, revenueYoy: 11.09, inboundVisitors: 2.2, inboundForeignVisitors: 1.8, inboundFx: 977 },
  { city: '临沂', year: 2024, visitors: 9357.65, visitorsYoy: 12.66, revenue: 870.84, revenueYoy: 13.88, inboundVisitors: 3.4, inboundForeignVisitors: 2.7, inboundFx: 1671 },
  { city: '德州', year: 2024, visitors: 4117.66, visitorsYoy: 14.87, revenue: 246.27, revenueYoy: 13.7, inboundVisitors: 1.2, inboundForeignVisitors: 1, inboundFx: 233 },
  { city: '聊城', year: 2024, visitors: 3358.87, visitorsYoy: 15.05, revenue: 239.96, revenueYoy: 12.87, inboundVisitors: 1.6, inboundForeignVisitors: 1.3, inboundFx: 860 },
  { city: '滨州', year: 2024, visitors: 2039.51, visitorsYoy: 12.11, revenue: 166.17, revenueYoy: 13.5, inboundVisitors: 0.2, inboundForeignVisitors: 0.2, inboundFx: 88 },
  { city: '菏泽', year: 2024, visitors: 2709.81, visitorsYoy: 10.62, revenue: 244.86, revenueYoy: 13.15, inboundVisitors: 1, inboundForeignVisitors: 0.8, inboundFx: 216 },
]

export const CITY_TOURISM_TREND: CityTourismTrend[] = [
  { city: '济南', visitors: [6061.13, null, null, 7967.8, 10026, 6048.79, 8184, 6565.6, 10631.1, 12098.85], revenue: [670.52, null, null, 1054.7, 1285.93, 702.75, 983.9, 711.55, 1132.9, 1263.8] },
  { city: '青岛', visitors: [7322.02, null, null, 9848.9, 11302.84, 6312.32, 8198.9, 6581.28, 10565.7, 12085.84], revenue: [1132.51, null, null, 1651, 2005.6, 1019.29, 1411, 1006.42, 1581.4, 1795.73] },
  { city: '淄博', visitors: [4489.25, null, null, 5858, 6390.3, 3913.83, 4738.1, 3648.6, 6114.9, 6863.63], revenue: [442.6, null, null, 658.1, 746, 406.16, 552.5, 391.59, 630, 695.47] },
  { city: '枣庄', visitors: [1870.75, null, null, 2478.6, 2712, 1553.25, 1851.1, 1469.37, 2362, 2601.98], revenue: [143.83, null, null, 217.9, 245.39, 132.53, 177.1, 129.67, 216, 240.21] },
  { city: '东营', visitors: [1378.33, null, null, 1837, 2017.7, 1338.27, 1645.4, 1358.6, 2250.2, 2541.91], revenue: [109.8, null, null, 179.1, 205.7, 120.67, 171.1, 126.02, 202.2, 230.9] },
  { city: '烟台', visitors: [5942.33, null, null, 7937.6, 8689.45, 5349.91, 6501.2, 5310.42, 8790.1, 9808.44], revenue: [665.16, null, null, 982.4, 1148.5, 624.4, 859.2, 637.31, 1011.9, 1139.72] },
  { city: '潍坊', visitors: [5596.22, null, null, 7550.2, 8240.11, 5097.96, 6455, 5212.67, 8406.6, 9645.7], revenue: [552.95, null, null, 823.8, 917.61, 508.98, 716.1, 523.5, 837.3, 938.79] },
  { city: '济宁', visitors: [5618.71, null, null, 7341.7, 8040.8, 5015.46, 6372.2, 5083.02, 8307.5, 9440.27], revenue: [495.82, null, null, 728.9, 825.3, 453.1, 632.5, 466.63, 767.5, 874.64] },
  { city: '泰安', visitors: [5753.37, null, null, 7549.4, 8262.7, 5039.98, 6409.9, 5163.89, 8393.7, 8628.31], revenue: [553.69, null, null, 790, 906.1, 482.07, 650.5, 479.31, 793.1, 838.66] },
  { city: '威海', visitors: [3541.75, null, null, 4632, 5151.6, 3238.15, 4403.9, 3541.99, 5906.5, 6727.25], revenue: [422.03, null, null, 598.3, 692.59, 393.1, 533.5, 388.89, 630.8, 700.3] },
  { city: '日照', visitors: [3726.52, null, null, 4906.1, 5404.3, 3172.01, 3794.4, 3201.75, 5333, 6151.11], revenue: [263.24, null, null, 368.3, 425.61, 221.88, 288, 218.29, 353.7, 392.92] },
  { city: '临沂', visitors: [5646.01, null, null, 7487.6, 8169, 5028.38, 6386.9, 5112.8, 8305.9, 9357.65], revenue: [528.77, null, null, 795.1, 851.41, 475.64, 640.2, 467.39, 764.7, 870.84] },
  { city: '德州', visitors: [2304.34, null, null, 3062.5, 3396.06, 2171.54, 2674.2, 2161.14, 3584.7, 4117.66], revenue: [133.67, null, null, 199.2, 226.81, 131.51, 182.4, 131.97, 216.6, 246.27] },
  { city: '聊城', visitors: [1862.7, null, null, 2479.3, 2707.59, 1757.79, 2178.8, 1783.63, 2919.5, 3358.87], revenue: [130.2, null, null, 198.8, 226.78, 130.33, 180.9, 129.8, 212.6, 239.96] },
  { city: '滨州', visitors: [1389.54, null, null, 1832.7, 2003.61, 1133.44, 1338, 1091.83, 1819.2, 2039.51], revenue: [105.4, null, null, 159.2, 181.4, 93.05, 122.9, 88.37, 146.4, 166.17] },
  { city: '菏泽', visitors: [1581.56, null, null, 2139.2, 2367.2, 1551.29, 1920.2, 1522.05, 2449.7, 2709.81], revenue: [105.33, null, null, 185.9, 208.6, 124.25, 176.8, 129.61, 216.4, 244.86] },
]
