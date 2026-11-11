# YunYouQiLu (云游齐鲁)

YunYouQiLu is a dashboard for culture and tourism along the Yellow River in Shandong. It covers all 16 prefecture-level cities in the province; nine of them sit on the river and get most of the attention. Some pages are map-first: city heat, scenic spots, protected areas, heritage sites, and disaster risk. Others are chart-first: visitor flow, industry numbers, marketing, and public opinion. Weather and earthquake feeds are real; most of the tourism figures are not. The interface starts in Chinese; the top bar has a language menu with English and several other locales.

The front end is Vue 3 with TypeScript, Vite, ECharts, and Leaflet. The backend is Django 4.2 with MySQL. The two sides are loosely coupled: the dashboard imports four JSON snapshots at build time and does not call Django at runtime, so you can run the UI on its own. Django is there for the admin, the TikTok models, a few account endpoints, and an optional read-only snapshot API.

## Data authenticity

The platform mixes real public data with clearly labeled demo data. The same
distinction is used in the paper and in `PRIVACY_AND_DATA.md`:

| Data | Source | Status |
|---|---|---|
| Weather | Open-Meteo (CC BY 4.0) | Real, refreshed by the crawler |
| Earthquakes | USGS FDSN Event API | Real, refreshed by the crawler |
| 190 national ICH items | ihchina.cn | Real public list |
| News headlines | Ministry of Culture and Tourism, Xinhua Shandong, Dazhong | Real public headlines |
| 2024 city tourism totals | Shandong Statistical Yearbook 2025, tables 6-20/6-21/6-25/6-26 | Official statistics in `src/data/tourismStats.ts` |
| 2024 city analytics | Same yearbook tables, exported to `data/real/shandong_city_tourism_2024.csv` | Official indicators; reproducible K-means/SOM/SAE results |
| Visitor flow, monthly heat, industry, marketing, resource, water level, hazards | Front-end fixtures | Synthetic/demo data |
| County splits | Fixed allocation from city totals | Demo allocation, not official county data |
| Disaster predictions and capacity warnings | Rule-based fixtures | Synthetic/demo data |
| TikTok profiles/comments | Local collector output | Public platform content; not redistributed |

The global header and the landing page label the demo environment. Do not cite
the `/flow`, `/industry`, `/resource`, `/marketing`, `/disaster`, monthly heat,
or county-split values as observations.

## Background

The repo started as a TikTok blogger data exercise. The Django models and admin still use the older naming: `TiktokUser`, `Video`, `VideoComment`, and an admin title that says 抖音博主数据分析系统后台. The dashboard then grew into a broader Shandong tourism project. Renaming the models would mean new migrations and admin changes without changing anything users see, so the old names stayed.

## Pages

- `/` is the landing page. It has a rotating topic line, a photo strip, a guest button, and a link to the login page.
- `/dashboard` is the main map. It shows city heat, the whole Yellow River course, resource points, and layers for nature reserves, public opinion, and disasters.
- `/nature` maps protected areas and species monitoring points. Click a city to narrow the scope.
- `/scenic` maps A-level scenic spots. Each spot has a visitor profile and a photo.
- `/food` lists 36 Shandong dishes with photos and short notes. Some photos are stand-ins from Wikimedia Commons when no free shot of the dish was available.
- `/flow` shows current visitor numbers, capacity warnings, visitor profiles, and a short trend. The numbers are synthetic.
- `/industry` covers revenue, visitor totals, investment, spending mix, and supply capacity. The figures are demo values.
- `/resource` is a resource ledger with a category tree, a table, and a red-line conflict list. The table is seeded with demo records.
- `/opinion/topic`, `/opinion/analyze`, `/opinion/wordcloud`, and `/opinion/heat` are the public-opinion pages. Headlines and keywords come from the crawler; sentiment is calculated from titles, not from likes or shares.
- `/marketing` shows an account matrix, content topics, city campaigns, and brand events. This page is mostly mock data.
- `/disaster` combines real weather and earthquake data with demo water levels, geological hazards, and flow warnings.
- `/heritage` maps 190 national intangible cultural heritage items by application area. Photos come from Wikimedia Commons; where no free image exists, the UI uses an AI-generated placeholder and marks it.

## Stack

Vue 3.5 and TypeScript do the UI. ECharts handles charts, Leaflet handles maps, and Vite 8 builds it. The Django side runs on 4.2 LTS, uses django-simpleui for the admin, and talks to MySQL 8 through PyMySQL. The TikTok spiders are Python. The Node crawler for public weather, earthquake, heritage, and news data has no npm dependencies.

## Running it

It was built and tested with Python 3.8 and Node 22. Vite 8 requires Node 20.19+ on the 20.x line, or 22.12+. If you only want to look at the dashboard, you can skip the Django steps; you need Node and the JSON snapshots.

### 1. Django and MySQL

```bash
python -m venv .venv
source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and set `DB_PASSWORD` and `SECRET_KEY`. Both are read from the environment, and `SECRET_KEY` has no fallback, so an empty value will stop the server. You can generate a key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Create a database named `dyinfo_schema`:

```sql
CREATE DATABASE dyinfo_schema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run the migrations and the server:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

The admin is at `http://127.0.0.1:8000/admin/`.

### 2. Data snapshots

The Vue build imports `data/normalized/weather.json`, `quake.json`, `heritage.json`, and `news.json`. A small public snapshot is committed under `data/sample/normalized/`, so a fresh clone can build without running the crawler:

```bash
npm run data:sample
npm run check:snapshots
```

The sample was fetched on 2026-11-02 and contains 16 city weather records, 20 earthquakes, 190 heritage items, and 79 news headlines. It contains no TikTok user data. To refresh it from the sources instead, run the crawler from the project root:

```bash
node scripts/crawler/crawl.mjs
```

The crawler takes about 20 seconds on a normal connection. If one source fails, the others still get written and the process exits with code 2. Raw responses go to `data/raw/`, and `data/manifest.json` keeps the last 20 runs. The full crawler output is not committed because it is large and may contain personal data.

#### Optional runtime API and refresh command

The build-time import remains the default, so the dashboard still works without
Django. When the backend is running, the same files are available through a
read-only, allow-listed API:

```text
GET /api/snapshots/            status, sizes, SHA-256, freshness, last run
GET /api/snapshots/weather/    one snapshot with ETag and Last-Modified
GET /api/snapshots/quake/
GET /api/snapshots/heritage/
GET /api/snapshots/news/
```

The detail endpoints support `If-None-Match` and `If-Modified-Since` and return
`304 Not Modified` when appropriate. Paths outside the four names return `404`,
and missing or corrupt files return `503` rather than a stack trace.

Refresh uses the existing Node crawler through a management command:

```bash
python manage.py refresh_snapshots --check
python manage.py refresh_snapshots --run --source weather --source quake
```

The repository does not bundle an always-on scheduler. Run the command from
cron, a systemd timer, or Windows Task Scheduler; the API reports the resulting
file timestamps and a `stale` flag. For example, on a Unix host:

```cron
0 */6 * * * cd /srv/yunyouqilu && .venv/bin/python manage.py refresh_snapshots --run >> /var/log/yunyouqilu-snapshots.log 2>&1
```

There is still no database-backed dashboard API and no automatic browser
polling: the Vue app continues to read its bundled snapshot until it is rebuilt.

### 3. Frontend

```bash
npm install
npm run dev
```

The dev server listens on `http://localhost:5173/`. For a production build:

```bash
npm run build
npm run preview
```

The preview server uses port 4173. `node scripts/serve-public.mjs` wraps the same steps, starts a Cloudflare quick tunnel if `cloudflared.exe` is around, and writes the public URL to `公网地址.txt` (gitignored).

### 4. TikTok data (optional)

Put a TikTok web cookie in `TIKTOK_COOKIE` if you have one. Then run:

```bash
python 爬虫/yellow_river_spider.py
```

It collects videos and comments for the keyword 黄河流域生态治理 (Yellow River basin ecological governance). Without a cookie it writes a set of seed videos and comments instead. The older `python 爬虫/spider.py` fills the `TiktokUser` table with generated users. Note the database names: the Yellow River spider uses `dyinfo_schema`, while `spider.py` uses `tiktok_blogger_web`. Create both schemas if you plan to run both scripts.

### 5. Illustrative forecast (optional)

The annual Qingdao revenue series and the OLS demo are separate from the front
end. They run on the standard library only:

```bash
python scripts/forecast_qingdao.py
```

The script prints the hold-out errors, the naive baseline, and the 2025-2026
projections with 95% prediction intervals. `data/real/qingdao_tourism_revenue.csv`
records the source yearbook table. This is a demonstration, not an operational
forecasting model. Adding `--figure fig6.png` requires matplotlib from
`requirements-dev.txt`.

### 6. City analytics: K-means, SOM, and sparse autoencoder (optional)

The three previously unimplemented methods are now available as dependency-free
Python modules under `app/analytics/`. They run on the standard library, use a
fixed seed, and consume the official 2024 indicators for all 16 cities:

```bash
python scripts/run_city_analytics.py
```

The input is `data/real/shandong_city_tourism_2024.csv`. It records the yearbook
tables, units, and a SHA-256 of the file. Seven reported indicators are used,
plus two derived ratios: revenue per visitor and inbound-visitor share, for nine
features in total. The runner writes `data/analytics/city_analytics.json` and a
readable `data/analytics/city_analytics.md`.

- **K-means** uses k-means++ seeding and Lloyd iterations, reports inertia and
  the mean silhouette score, and selects k from 2 to 6 by silhouette.
- **Self-organizing map** uses a 4×4 grid, a Gaussian neighbourhood, and
  exponentially decaying learning rate and radius. It reports quantization
  error and topographic error.
- **Sparse autoencoder** is a 9-4-9 sigmoid network trained with Adam, a
  KL-divergence sparsity target of 0.05, and L2 regularization. It reports
  reconstruction MSE against the mean baseline, mean hidden activation, and the
  fraction of active hidden units. A downstream K-means is fitted to the 4-D
  codes so the representation can be compared with the raw-feature clustering.

With the committed seed (`42`) the current outputs are:

| Method | Result |
|---|---|
| K-means on raw features | k = 2, silhouette 0.5562, inertia 65.5081; 青岛 and 烟台 form one group and the other 14 cities the other |
| SOM | 4×4, 1,000 epochs; quantization error 0.1580, topographic error 0.2500 |
| Sparse autoencoder | 3,000 epochs; reconstruction MSE 0.033307 vs baseline 0.056127 (40.66% lower); mean hidden activation 0.0808; active fraction 0.4062 |
| K-means on SAE codes | k = 2, silhouette 0.7329 |

Treat these as a reproducible cross-sectional description, not a validated
model. There are only 16 samples and no held-out evaluation set; cluster labels
are arbitrary; the yearbook's city visitor counts are not additive to the
provincial total. The methods are implemented for the paper's technical
validation, not for operational segmentation.

## Tests and CI

```bash
python manage.py test --settings=tiktok_blogger_web.settings_test
python scripts/run_city_analytics.py
npm run data:sample
npm run check:snapshots
npm run build
```

The Django suite now has 23 tests: the original OLS, account, and cascade tests;
the snapshot API and refresh-command tests; and the K-means, SOM, and sparse
autoencoder tests. The test settings use SQLite in memory and do not need MySQL
or a `.env` file. The GitHub Actions workflow in `.github/workflows/ci.yml` runs
the Django tests, the forecast script, the city analytics script, the snapshot
check, and the production build.

## Versioning and reproducibility

The `package.json` version is `1.1.0`, and the release used in the paper is tagged
`v1.1.0` in the repository. Cite that tag rather than the moving `master` branch.
The inputs needed to rebuild the results are:

- the commit or tag, which fixes the front-end source and the sample snapshot;
- `data/real/qingdao_tourism_revenue.csv` plus `scripts/forecast_qingdao.py`,
  which reproduce every forecast number and the optional figure;
- `data/real/shandong_city_tourism_2024.csv` plus
  `scripts/run_city_analytics.py`, which reproduce the K-means, SOM, and sparse
  autoencoder metrics in `data/analytics/`.

No environment variable or database is needed for the forecast or the city
analytics. The Django tests run against SQLite in memory. The front-end build is
deterministic apart from Vite's content hashes, and `npm ci` uses the committed
`package-lock.json`. Absolute timestamps in the UI come from
`TOURISM_STATS_FETCHED_AT`, not from the clock, so two builds of the same commit
show the same date.

To archive the release, use the Zenodo-GitHub integration (or deposit the tagged
ZIP) and put the resulting DOI in the paper's Data availability statement. The
repository itself does not yet mint a DOI.

## Accounts

The Vue login is a front-end demo. The default account is `admin` and the password is `123456`. New accounts are saved in `localStorage` with a salted SHA-256 hash. That is convenient for a demo, but it is not access control. The guest button skips login entirely. The interface is a read-only public-dashboard prototype: nothing behind the login is confidential, and the demo credentials are printed in this README on purpose.

Django has its own `User` model and the `/login_user/`, `/reg_user/`, and `/change_password/` endpoints. These use Django's password hasher and never store plaintext, but the Vue app does not call them. Use the Django admin with the superuser you created. For a real deployment, replace both the demo localStorage login and the Django endpoints with a standard session or OIDC provider, and put the admin behind the same gate.

## Ethics, privacy, and platform terms

`PRIVACY_AND_DATA.md` has the detailed inventory. In short:

- The dashboard collects no visitor accounts, no location traces, and no analytics
  identifiers. The login demo stores only a username and a salted hash in the
  browser's `localStorage`.
- The TikTok collector stores public video and comment records in a local MySQL
  database. It is not part of the public snapshot, is not redistributed, and
  should not be run against accounts or content that the platform terms forbid.
  The crawler honours `robots.txt` where one is published, but platform terms and
  local law take precedence; review them before enabling it.
- Usernames, avatars, and comment text can identify people even when they are
  public. Before publishing any derived dataset, remove or hash user identifiers
  and paraphrase quoted comments. The repository's `data/sample/` deliberately
  contains no TikTok records.
- Weather, earthquake, heritage, and news snapshots are public facts or public
  list items. Photo credits and licences are kept in the JSON and shown in the
  UI. AI-generated placeholder images are labelled and must not be presented as
  photographs of the real site.
- The project involved no human-subjects intervention and no personal data
  collection beyond public platform content, so it did not require ethics
  approval. If you extend it to interviews, surveys, or user tracking, obtain
  ethics review and informed consent first.

## Known limitations

- The front end is a demonstration, not an operational early-warning or
  decision-support system. Flow, capacity, industry, marketing, resource,
  water-level, and hazard values are fixtures. Do not use them for safety,
  investment, or policy decisions.
- The four snapshots are still imported at build time. A read-only API and a
  `refresh_snapshots` command now expose and refresh the same files, but there
  is no bundled always-on scheduler, no database-backed dashboard API, and no
  automatic browser polling. A deployment must schedule the refresh command and
  rebuild or otherwise reload the UI.
- The city analytics use only 16 observations and nine features from one year,
  with no held-out evaluation set. The K-means, SOM, and autoencoder results are
  descriptive and reproducible, not validated predictive models.
- The forecast is a single-variable OLS illustration with six annual
  observations (2015, 2018, 2019, 2021, 2023, and 2024). 2016-2017 are not
  published in the source series, and 2020/2022 are excluded as pandemic years.
  Its 95% prediction intervals are wide. It is not a causal model and should not
  be read as a tourism demand forecast for policy.
- The sentiment labels are computed from headlines only. They are a coarse
  keyword heuristic, not a validated NLP model.
- The city visitor counts in the yearbook are not additive to the provincial
  total; only revenue is. The UI states this, but downstream users may still sum
  the wrong column.
- The interface has Chinese, English, and several machine-assisted translations.
  Non-Chinese strings have not been professionally proofread.
- Accessibility has not been audited. Colour contrast, keyboard navigation, and
  screen-reader labels need a dedicated pass before public-sector deployment.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `DB_PASSWORD` | yes | MySQL root password |
| `SECRET_KEY` | yes | Django signing key; generate a random one |
| `TIKTOK_COOKIE` | no | TikTok cookie; empty means seed data |
| `DEBUG` | no | `True` for local debugging; defaults to `False` |
| `ALLOWED_HOSTS` | no | Comma-separated hosts; defaults to `127.0.0.1,localhost` |
| `SNAPSHOT_DIR` | no | Directory for normalized snapshots; defaults to `<BASE_DIR>/data/normalized` |
| `SNAPSHOT_MANIFEST` | no | Manifest path; defaults to the parent of `SNAPSHOT_DIR` plus `manifest.json` |
| `NODE_BINARY` | no | Node executable used by `refresh_snapshots`; defaults to `node` |

## Data and credits

- Weather comes from Open-Meteo (CC BY 4.0).
- Earthquakes come from the USGS FDSN API. The query is M3 or higher in a box around Shandong, starting in 2015.
- Heritage items come from ihchina.cn. The API does not expose detail-page URLs, so the `url` field is null.
- News headlines come from the Ministry of Culture and Tourism, Xinhua Shandong, and Dazhong. Keywords and sentiment are based on titles only, not on platform engagement.
- Photos come from Wikimedia Commons. The `credit` fields keep the author and license. Some heritage entries have no free photo; those use AI-generated images and are marked in the UI.
- The homepage's 2024 per-city tourism figures come from the Shandong Statistical Yearbook 2025 (tables 6-20, 6-21, 6-25, and 6-26) and are stored in `tourism_stats_real`. The county split, monthly heat table, flow, industry, resource, marketing, water-level, and hazard figures remain demo data.
- The Qingdao annual series used by the illustrative forecast is in `data/real/qingdao_tourism_revenue.csv`. It records the yearbook table and a `note` column for missing years (2016-2017). No values are imputed.
- `data/real/shandong_city_tourism_2024.csv` is a direct export of the 16-city 2024 indicators, with the source tables and units documented in `data/real/README.md`. The K-means, SOM, and sparse autoencoder results in `data/analytics/` are computed only from this file.
- To refresh the homepage data, run `python scripts/crawl_tourism_stats.py --year 2024`, then `python scripts/export_tourism_stats.py`, and rebuild the frontend. The generated snapshot is `src/data/tourismStats.ts`.
- The yearbook's city visitor counts are not additive to the provincial total, while city tourism revenue is. The homepage labels the multi-city KPI as a sum of city figures and shows the source caveat.

## Repository layout

```
app/                    Django models, views, admin
app/analytics/          dependency-free OLS, K-means, SOM, and sparse autoencoder
app/snapshots.py        allow-listed snapshot reader and freshness metadata
app/snapshot_views.py   read-only /api/snapshots/ endpoints
app/tests.py            unit tests for models, accounts, forecast, and analytics
app/test_snapshots.py   snapshot API and refresh-command tests
app/management/         refresh_snapshots management command
tiktok_blogger_web/     settings and URL config
tiktok_blogger_web/settings_test.py  SQLite test settings
爬虫/                    TikTok spiders
src/                    Vue app
templates/              Django login and registration pages
scripts/                crawler, data build scripts, preview tunnel,
                        forecast and city analytics demos, architecture figure
data/sample/            committed public snapshot (weather, quake, heritage, news)
data/real/              source CSVs for the forecast and city analytics
data/analytics/         reproducible K-means/SOM/SAE outputs
public/                 GeoJSON and images
.github/workflows/      CI (Django tests, forecast, analytics, snapshot check, build)
```

The crawler output under `data/raw/`, `data/normalized/` (except the sample), and
the raw TikTok collection are ignored. `data/sample/`, `data/real/*.csv`, and
`data/analytics/` are committed on purpose so a fresh clone can build and
reproduce the paper's numbers. The raw export keeps the source URLs recorded at
collection time; only its file name and display labels use the TikTok name.

## A few things that are easy to trip over

- `data/normalized/` and `data/raw/` are not in git. Run `npm run data:sample` after cloning, or copy a snapshot into `data/normalized/`.
- The JSON is bundled at build time. If you change a snapshot, run `npm run build` again. The `/api/snapshots/` endpoints serve the same files but do not rebuild the Vue app.
- The sample files must exist before running the Django snapshot tests or API; `SNAPSHOT_DIR` and `SNAPSHOT_MANIFEST` can point at another directory.
- The Django login view redirects to `http://localhost:5173/`, so it assumes the Vite dev server is on that port.
- The upstream short-video API changes often. Without a cookie, the spider intentionally falls back to seed data rather than failing.

## License

MIT. See [LICENSE](LICENSE).
