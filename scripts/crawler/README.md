# 数据采集脚本（山东黄河文旅大屏 · 真实数据）

用 Node 内置能力（`fetch` / `AbortController` / `TextDecoder`）写的轻量爬虫，**不依赖任何 npm 包**，
Node 18 以上直接跑。抓取结果落在项目根目录的 `data/`，前端可直接读。

---

## 一、怎么跑

```bash
# 在 tiktok_blogger_web 目录下执行
node scripts/crawler/crawl.mjs               # 跑全部 4 个数据源（约 20 秒）
node scripts/crawler/crawl.mjs weather       # 只跑天气
node scripts/crawler/crawl.mjs quake news    # 只跑指定的几个源
node scripts/crawler/crawl.mjs --list        # 列出所有数据源
```

退出码：全部源成功为 `0`，有源部分失败为 `2`（脚本里 `process.exitCode = 2`，方便挂定时任务时判断）。

---

## 二、抓到的数据放在哪（重点）

全部在 **`tiktok_blogger_web/data/`**，绝对路径：

```
D:\项目备份\云游齐鲁-山东沿黄文旅数智传播平台\tiktok_blogger_web\data
```

```
data/
├── normalized/                      ← 整理好的数据，前端直接用这个
│   ├── weather.json                 山东 16 市实时天气 + 今明预报
│   ├── quake.json                   山东及邻区地震目录
│   ├── heritage.json                山东国家级非遗代表性项目
│   └── news.json                    黄河/山东文旅公开新闻 + 关键词 + 情感分布
├── raw/                             ← 原始响应快照，按源分目录、文件名带时间戳
│   ├── weather/20260927-1036-forecast.json
│   ├── quake/20260927-1033-usgs-query.json
│   ├── heritage/20260927-1037-project-p1-limit50.json
│   └── news/20260927-1040-大众网-文旅频道.html
└── manifest.json                    ← 抓取清单：每次运行的时间、各源条数、状态、问题
```

- `normalized/*.json`：**每次运行覆盖写**，永远是最新一份；UTF-8、带缩进、可直接 `JSON.parse`。
- `raw/`：**只增不删**，用于复现和排查（比如某个源某天突然解析失败，可以拿快照对着改解析规则）。
- `manifest.json`：保留最近 20 次运行记录，字段为 `{ startedAt, sources: [{ id, title, status, records, problems, file, elapsedMs }] }`。

最近一次抓取结果：天气 16 条、地震 20 条、非遗 190 条、新闻 99 条，共 **325 条**。

---

## 三、四个数据源分别是什么

| 源 | 站点 / 接口 | 条数 | 对应大屏位置 |
|---|---|---|---|
| `weather` | Open-Meteo `api.open-meteo.com/v1/forecast` | 16 市 | 实时天气、预警 |
| `quake` | USGS FDSN `earthquake.usgs.gov/fdsnws/event/1/query` | 20 | 灾难监控与预测 |
| `heritage` | 中国非物质文化遗产网 `ihchina.cn` 目录接口 | 190 | 文化遗产 |
| `news` | 文旅部 / 新华网山东 / 大众网 列表页 | 77 | 舆情分析（话题 / 词云 / 情感） |

### weather.json

16 个地级市中心坐标一次性提交（`latitude`/`longitude` 用逗号拼接），返回按坐标顺序排列的数组。
字段：`realtime { temp, humidity, windDirection, windLevel, windSpeedKmh, weather, weatherCode, observedAt }`、
`forecast { updatedAt, today { date, weather, tempHigh, tempLow, precipitation, code }, tomorrow { ... } }`。
WMO 天气码已译成中文（`0 晴`、`3 阴`、`61 小雨`…），风向角度已译成 `西风`/`东北风`，风速已按蒲福风级折算成 `2级`。
数据许可 CC BY 4.0，文件里保留了 `attribution` 字段。

### quake.json

范围北纬 34–39°、东经 114–123°，震级 ≥3，2015 年至今，按时间倒序。
字段：`{ id, time, magnitude, place, depthKm, lng, lat, url }`，`bbox` / `minMagnitude` / `startTime` 记录在文件头部。

### heritage.json

按山东省代码 `370000` 拉取国家级非遗项目名录，共 190 项（接口声明的 `declaredTotal` 也是 190，已对齐）。
字段：`{ id, num, name, category, categoryKind, projectNum, batchYear, batch, province, unit, protectUnit, desc, url }`。
注意：接口不返回详情页链接，所以 `url` 目前统一为 `null`；`desc` 是从接口正文里清洗出来的，截断到 200 字。

### news.json

五个列表页，按标题去重、按日期倒序。**按山东 / 黄河相关性过滤过**：省级页面（文旅部·山东）整页收；
其余页面按「山东地名 / 黄河词」挑（大众网文旅频道虽是省级频道，首页混有转载的外省稿与其它频道稿，故一并按地名筛），
本地综合频道（新华网山东、大众网山东）按「文旅题材词」挑；全国性页面（文旅部全国联播）同样按「山东地名 / 黄河词」挑
——不筛的话，全国联播页会把安徽、广西、西藏等外省稿一起带进来。

字段：`items [{ title, url, date, channel }]`、`keywords [{ word, count }]`（前 40）、
`sentiment { total, positive, neutral, negative, raw }`（百分比 + 原始计数）、`datedCount`（能推出日期的条数）。
`keywords` 与 `sentiment` 是基于**标题**的词表统计，不是平台真实互动量，文件里的 `note` 已写明。

> 前端 `src/config/textRules.ts` 是 `lib/zh.mjs` 的同口径移植（页面需要逐条明细做排序与分渠道统计），
> 改词表时两边都要改。`src/config/shandongRegions.ts` 负责把 `province`（申报地区）和新闻标题里的地名归并到 16 个地级市。

---

## 四、合规与礼貌（重要）

脚本内置了 robots.txt 校验，**默认先读 robots 再决定抓不抓**：

- robots.txt 返回 4xx → 视为无约束；返回 5xx 或读取失败 → 保守放弃该域。
- 规则按「最长匹配路径优先，Allow 覆盖 Disallow」判断。
- robots 里声明了 `Crawl-delay` 时，取它与默认间隔的较大值。
- 默认每个域 1.2 秒一次请求；失败退避重试（最多 2 次）；20 秒超时。
- UA 为 `Mozilla/5.0 (compatible; ShandongYellowRiverDashboardBot/1.0; +local research crawler)`——保留爬虫身份，同时带上 `Mozilla/5.0 (compatible; ...)` 前缀（少数站点只认这个前缀，写别的直接 403）。

**因为 robots 被主动排除的源**（不是抓不到，是规则不允许，故放弃）：

| 站点 | robots 规则 | 处理 |
|---|---|---|
| 中国天气网 `d1.weather.com.cn` | `User-agent: * / Disallow: /` | 整站禁止，改用 Open-Meteo |
| 中国地震台网 `ceic.ac.cn` | `Disallow: /ajax/`、`/speedsearch` | 数据只能从被禁接口取，改用 USGS |
| 中国政府网搜索 | `Disallow: /` | 不使用 |
| 人民网 | `Crawl-delay: 120` | 间隔要求过长，不使用 |

**唯一的 robots 例外**：`api.open-meteo.com` 的 robots.txt 也写着 `Disallow: /`，但那是挡搜索引擎收录接口地址，
该 API 本身就是给程序调用的开放服务（数据 CC BY 4.0，注明来源即可用）。所以 `weather.mjs` 里显式传了
`ignoreRobots: true`，并注明理由；每轮只发 **1 个请求**，属于有意为之、有记录的例外。

另外，抖音 / 微博 / 微信没有可直接抓取的公开接口（需要开放平台密钥或登录态，且其条款禁止抓取），
所以平台维度的真实互动量拿不到，`news` 只落地公开新闻侧的数据。

---

## 五、怎么接到前端用

`data/` 不在 Vite 的 `public/` 目录里，所以有两种接法：

**接法 A：构建期直接 import（推荐，静态大屏够用）**

项目 tsconfig 已开 `resolveJsonModule`，JSON 能直接当模块引：

```ts
// src/api/crawled.ts
import weather from '../../data/normalized/weather.json'
import quake from '../../data/normalized/quake.json'
import heritage from '../../data/normalized/heritage.json'

export const cityWeather = weather.cities   // 16 条
export const quakeEvents = quake.events     // 20 条
export const heritageItems = heritage.items // 190 条
```

然后替换掉 `src/mock/index.ts` 里对应的 `mockXxx`。注意字段不完全对齐，需要做一层映射，例如
`heritage.json` 的 `items` 有 `name / category / batch / province / unit / desc`，而前端 `HeritageItem`
还要 `lng / lat / level / era`——`level` 可由 `categoryKind` 推、`era` 可用 `batchYear`，
`lng/lat` 需要另外补一张申报地区坐标表。重新抓数据后要重新构建才生效。

**接法 B：运行期 fetch（数据要能随时刷新时用）**

把 `data/normalized/` 整个复制到 `public/data/`，然后：

```ts
const res = await fetch('/data/normalized/weather.json')
const weather = await res.json()
```

重新抓完数据只需再复制一次 `public/data/`，不用重新构建。

---

## 六、已知限制

- 地震目录用的是 USGS，国内 3 级上下的小震在 USGS 收录不全，事件数偏少（当前 20 条）属正常。
- 天气是格点插值值（`grid` 字段记录了实际取到的坐标与海拔），与地面站实测会有小差异。
- 非遗 `desc` 截断 200 字，且接口无详情页链接。
- 新闻只取各列表页**当前首页**的标题（不翻页），所以是滚动窗口，条数在 90–120 之间浮动；没有正文和阅读量/互动量，
  舆情侧的走势只能用条数近似，不能当真实热度。
- 少数来源页自己把标题截断了（尾部带 `...`），这类标题会原样保留；当前 99 条里只有 1 条这样。
- 7 条新闻的 URL 里没有日期（如专题首页），`date` 为 `null`。
