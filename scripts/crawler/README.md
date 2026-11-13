# Data collection scripts (Shandong Yellow River cultural tourism dashboard, real data)

Lightweight crawlers built only on Node built-ins (`fetch` / `AbortController` / `TextDecoder`).
They have **no npm dependencies** and run directly on Node 18 or newer. Output is written to
`data/` in the project root, where the front end reads it.

---

## 1. How to run

```bash
# run from the project root
node scripts/crawler/crawl.mjs               # all four sources (about 20 seconds)
node scripts/crawler/crawl.mjs weather       # weather only
node scripts/crawler/crawl.mjs quake news    # only the listed sources
node scripts/crawler/crawl.mjs --list        # list every source
```

Exit code: `0` when all sources succeed, `2` when at least one source partially fails (the script
sets `process.exitCode = 2` so scheduled jobs can detect the difference).

---

## 2. Where the data goes

Everything is written under `data/` in the project root:

```
data/
├── normalized/                      ← cleaned data, read directly by the front end
│   ├── weather.json                 current weather plus today/tomorrow forecast for the 16 Shandong cities
│   ├── quake.json                   earthquake catalogue for Shandong and neighbouring regions
│   ├── heritage.json                national-level intangible cultural heritage items in Shandong
│   └── news.json                    public Yellow River / Shandong tourism news + keywords + sentiment
├── raw/                             ← raw response snapshots, one folder per source, timestamped names
│   ├── weather/20260927-1036-forecast.json
│   ├── quake/20260927-1033-usgs-query.json
│   ├── heritage/20260927-1037-project-p1-limit50.json
│   └── news/20260927-1040-dazhongwang-tourism.html
└── manifest.json                    ← run manifest: start time, record counts, status and problems per source
```

- `normalized/*.json`: **overwritten on every run**, so they always hold the newest snapshot. UTF-8,
  indented, and directly `JSON.parse`-able.
- `raw/`: **append-only**, used for reproducibility and debugging (for example, if a source starts
  failing to parse on some day, the snapshot can be compared against the parser).
- `manifest.json`: keeps the last 20 runs, with fields
  `{ startedAt, sources: [{ id, title, status, records, problems, file, elapsedMs }] }`.

Latest run: 16 weather records, 20 earthquake records, 190 heritage records and 99 news records,
**325 records** in total.

---

## 3. The four sources

| Source | Site / endpoint | Records | Dashboard area |
|---|---|---|---|
| `weather` | Open-Meteo `api.open-meteo.com/v1/forecast` | 16 cities | Live weather, warnings |
| `quake` | USGS FDSN `earthquake.usgs.gov/fdsnws/event/1/query` | 20 | Disaster monitoring and forecasting |
| `heritage` | China Intangible Cultural Heritage network `ihchina.cn` catalogue API | 190 | Cultural heritage |
| `news` | Ministry of Culture and Tourism / Xinhua Shandong / Dazhongwang list pages | 77 | Opinion analysis (topics / word cloud / sentiment) |

### weather.json

The centre coordinates of the 16 prefecture-level cities are submitted in one request
(`latitude`/`longitude` joined by commas), and the response array follows the coordinate order.
Fields: `realtime { temp, humidity, windDirection, windLevel, windSpeedKmh, weather, weatherCode, observedAt }`,
`forecast { updatedAt, today { date, weather, tempHigh, tempLow, precipitation, code }, tomorrow { ... } }`.
WMO weather codes are translated to Chinese labels (`0 晴`, `3 阴`, `61 小雨`, ...), wind directions to
`西风`/`东北风`, and wind speeds to Beaufort levels such as `2级`.
The data is CC BY 4.0 licensed and the `attribution` field is kept in the file.

### quake.json

Latitude 34-39 degrees north, longitude 114-123 degrees east, magnitude 3 or above, 2015 to present,
newest first. Fields: `{ id, time, magnitude, place, depthKm, lng, lat, url }`; `bbox`, `minMagnitude`
and `startTime` are recorded in the file header.

### heritage.json

Pulls the national intangible cultural heritage catalogue for Shandong province (code `370000`):
190 items, which matches the `declaredTotal` returned by the API. Fields:
`{ id, num, name, category, categoryKind, projectNum, batchYear, batch, province, unit, protectUnit, desc, url }`.
The API does not return detail-page links, so `url` is currently `null` for every item; `desc` is cleaned
from the response body and truncated to 200 characters.

### news.json

Five list pages, de-duplicated by title and sorted newest first. **Filtered for Shandong / Yellow River
relevance**: provincial pages (Ministry of Culture and Tourism, Shandong) are taken in full; the other
pages are filtered by Shandong place names or Yellow River keywords (the Dazhongwang tourism channel is
provincial but its front page mixes reposted stories from other provinces and other channels, so it is
filtered by place name as well); local general channels (Xinhua Shandong, Dazhongwang Shandong) are
filtered by tourism subject words; national pages (the Ministry's national feed) are filtered the same
way, because otherwise the feed would also bring in stories from Anhui, Guangxi, Tibet and elsewhere.

Fields: `items [{ title, url, date, channel }]`, `keywords [{ word, count }]` (top 40),
`sentiment { total, positive, neutral, negative, raw }` (percentages plus raw counts), and
`datedCount` (number of items whose date could be derived). `keywords` and `sentiment` are computed from
**titles**, not from platform interaction data; the `note` field in the file says so.

> The front end has `src/config/textRules.ts`, a port of `lib/zh.mjs` with the same rules (the pages need
> per-item detail for sorting and per-channel counts). When the word lists change, both places must change.
> `src/config/shandongRegions.ts` maps `province` (declaration region) and place names in news titles onto
> the 16 prefecture-level cities.

---

## 4. Compliance and politeness (important)

The scripts check robots.txt and **read it before deciding whether to crawl**:

- robots.txt returning 4xx means no restriction; 5xx or a failed read means the domain is skipped conservatively.
- Rules follow the longest matching path, with `Allow` overriding `Disallow`.
- When `Crawl-delay` is declared, the larger of that value and the default interval is used.
- Default rate is one request per 1.2 seconds per domain, with backoff retries (at most 2) and a 20 second timeout.
- The user agent is `Mozilla/5.0 (compatible; ShandongYellowRiverDashboardBot/1.0; +local research crawler)`:
  it keeps the crawler identity while carrying the `Mozilla/5.0 (compatible; ...)` prefix that a few sites
  require (other values are rejected with 403).

**Sources deliberately excluded because of robots.txt** (not unreachable, but disallowed):

| Site | robots rule | Handling |
|---|---|---|
| China Weather `d1.weather.com.cn` | `User-agent: * / Disallow: /` | Whole site disallowed; Open-Meteo is used instead |
| China Earthquake Networks `ceic.ac.cn` | `Disallow: /ajax/`, `/speedsearch` | Data is only available through disallowed endpoints; USGS is used instead |
| Chinese government search | `Disallow: /` | Not used |
| People's Daily Online | `Crawl-delay: 120` | Interval requirement is too long; not used |

**The only robots.txt exception**: `api.open-meteo.com` also publishes `Disallow: /`, but that rule exists
to keep the endpoint out of search engines, while the API itself is a public service meant to be called by
programs (CC BY 4.0 data, attribution required). `weather.mjs` therefore passes `ignoreRobots: true`
explicitly, with the reason documented, and sends only **one request** per run. This is a deliberate,
recorded exception.

In addition, Douyin / Weibo / WeChat have no public endpoints that can be crawled directly (they need
open-platform keys or a logged-in session, and their terms prohibit crawling), so platform-level
interaction volumes are not available and `news` only covers the public news side.

---

## 5. Connecting the data to the front end

`data/` is not inside Vite's `public/` directory, so there are two options:

**Option A: import at build time (recommended, enough for a static dashboard)**

`resolveJsonModule` is already enabled in the project tsconfig, so the JSON files can be imported as modules:

```ts
// src/api/crawled.ts
import weather from '../../data/normalized/weather.json'
import quake from '../../data/normalized/quake.json'
import heritage from '../../data/normalized/heritage.json'

export const cityWeather = weather.cities   // 16 records
export const quakeEvents = quake.events     // 20 records
export const heritageItems = heritage.items // 190 records
```

Then replace the corresponding `mockXxx` exports in `src/mock/index.ts`. The fields do not line up exactly,
so a mapping layer is needed: `heritage.json` items carry `name / category / batch / province / unit / desc`,
while the front-end `HeritageItem` also needs `lng / lat / level / era`. `level` can be derived from
`categoryKind`, `era` from `batchYear`, and `lng`/`lat` require a separate coordinate table for the
declaration regions. A rebuild is needed after new data is crawled.

**Option B: fetch at run time (when the data must be refreshed without rebuilding)**

Copy `data/normalized/` into `public/data/`, then:

```ts
const res = await fetch('/data/normalized/weather.json')
const weather = await res.json()
```

After re-crawling, only `public/data/` needs to be copied again; no rebuild is required.

---

## 6. Known limitations

- The earthquake catalogue comes from USGS, which does not fully cover small events around magnitude 3 in
  China, so the record count is on the low side (20 at present); this is expected.
- Weather values are interpolated grid values (the `grid` field records the actual coordinates and elevation
  used) and may differ slightly from ground station measurements.
- Heritage `desc` is truncated to 200 characters, and the API provides no detail-page links.
- News only takes the titles on **the current front page** of each list page (no pagination), so the window
  moves and the record count fluctuates between roughly 90 and 120. There is no article body and no
  read/interaction counts, so the opinion trend can only be approximated by record counts, not treated as
  real popularity.
- A few source pages truncate titles themselves (with a trailing `...`); such titles are kept as-is.
  Currently only 1 of the 99 records is affected.
- Seven news URLs contain no date (for example topic home pages), so their `date` is `null`.
