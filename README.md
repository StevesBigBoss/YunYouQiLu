# YunYouQiLu

Wandering Qilu is a cultural and tourism dashboard for Shandong's Yellow River region. It covers all 16 prefecture-level cities in the province; 9 of them are along the Yellow River and get most of the attention. Some pages are map-focused: city popularity, attractions, protected areas, heritage sites, and disaster risks. Other pages are chart-focused: visitor flow, industry data, marketing, and public opinion. Weather and earthquake data are real; most of the tourism data isn’t. The interface defaults to Chinese; there’s a language menu in the top bar with English and a few other languages. 

The frontend uses Vue 3, TypeScript, Vite, ECharts, and Leaflet. The backend uses Django 4.2 and MySQL. The two sides are loosely coupled: the dashboard imports four JSON snapshots at build time and doesn’t call Django at runtime, so you can run the UI on its own. Django is used for the admin panel, Douyin models, and a few account endpoints.

## Data authenticity

The platform mixes real public data with clearly labeled demo data. 
The paper and PRIVACY_AND_DATA.md use the same distinction:

| Data | Source | Status |
|------|--------|--------|
| Weather | Open-Meteo (CC BY 4.0) | Real, refreshed by crawler |
| Earthquake | USGS FDSN Event API | Real, refreshed by crawler |
| 190 National-level Intangible Cultural Heritage | ihchina.cn | Real, publicly listed |
| News Headlines | Ministry of Culture and Tourism, Xinhua Shandong, Dazhong | Real, publicly available headlines |
| 2024 City Tourism Totals | "Shandong Statistical Yearbook 2025", Tables 6-20/6-21/6-25/6-26 | Official statistics, located in `src/data/tourismStats.ts` |
| Visitor Flow, Monthly Popularity, Industry, Marketing, Resources, Water Levels, Disasters | Frontend fixed data | Synthetic/demo data |
| County-level Breakdown | Allocated from city totals | Synthetic allocation, not official county data |
| Disaster Prediction and Capacity Alert | Rule-based fixed data | Synthetic/demo data |
| Douyin Data/Comments | Local collector output | Public platform content; no longer distributed |

The global header and the landing page label the demo environment. Do not cite
the `/flow`, `/industry`, `/resource`, `/marketing`, `/disaster`, monthly heat,
or county-split values as observations.

## Background

The repo started as a Douyin blogger data exercise. The Django models and admin still use that vocabulary: `TiktokUser`, `Video`, `VideoComment`, and an admin title that says 抖音博主数据分析系统后台. The dashboard then grew into a broader Shandong tourism project. Renaming the models would mean new migrations and admin changes without changing anything users see, so the old names stayed.

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

Vue 3.5 and TypeScript do the UI. ECharts handles charts, Leaflet handles maps, and Vite 8 builds it. The Django side runs on 4.2 LTS, uses django-simpleui for the admin, and talks to MySQL 8 through PyMySQL. The Douyin spiders are Python. The Node crawler for public weather, earthquake, heritage, and news data has no npm dependencies.

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

The sample was fetched on 2026-11-02 and contains 16 city weather records, 20 earthquakes, 190 heritage items, and 79 news headlines. It contains no Douyin user data. To refresh it from the sources instead, run the crawler from the project root:

```bash
node scripts/crawler/crawl.mjs
```

The crawler takes about 20 seconds on a normal connection. If one source fails, the others still get written and the process exits with code 2. Raw responses go to `data/raw/`, and `data/manifest.json` keeps the last 20 runs. The full crawler output is not committed because it is large and may contain personal data.

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

### 4. Douyin data (optional)

Put a Douyin web cookie in `TIKTOK_COOKIE` if you have one. Then run:

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

## Tests and CI

```bash
python manage.py test --settings=tiktok_blogger_web.settings_test
npm run data:sample
npm run check:snapshots
npm run build
```

The test settings use SQLite in memory and do not need MySQL or a `.env` file.
The GitHub Actions workflow in `.github/workflows/ci.yml` runs the Django tests,
the forecast script, the snapshot check, and the production build.

## Versioning and reproducibility

The `package.json` version is `1.0.0`, and the release used in the paper is tagged
`v1.0.0` in the repository. Cite that tag rather than the moving `master` branch.
The two inputs needed to rebuild the results are:

- the commit or tag, which fixes the front-end source and the sample snapshot;
- `data/real/qingdao_tourism_revenue.csv` plus `scripts/forecast_qingdao.py`,
  which reproduce every number and the optional forecast figure.

No environment variable or database is needed for the forecast. The Django tests
run against SQLite in memory. The front-end build is deterministic apart from
Vite's content hashes, and `npm ci` uses the committed `package-lock.json`.
Absolute timestamps in the UI come from `TOURISM_STATS_FETCHED_AT`, not from the
clock, so two builds of the same commit show the same date.

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
- The Douyin collector stores public video and comment records in a local MySQL
  database. It is not part of the public snapshot, is not redistributed, and
  should not be run against accounts or content that the platform terms forbid.
  The crawler honours `robots.txt` where one is published, but platform terms and
  local law take precedence; review them before enabling it.
- Usernames, avatars, and comment text can identify people even when they are
  public. Before publishing any derived dataset, remove or hash user identifiers
  and paraphrase quoted comments. The repository's `data/sample/` deliberately
  contains no Douyin records.
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
- The four snapshots are static build-time inputs. There is no live scheduler,
  no database-backed API for the dashboard, and no automatic refresh.
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
| `TIKTOK_COOKIE` | no | Douyin cookie; empty means seed data |
| `DEBUG` | no | `True` for local debugging; defaults to `False` |
| `ALLOWED_HOSTS` | no | Comma-separated hosts; defaults to `127.0.0.1,localhost` |

## Data and credits

- Weather comes from Open-Meteo (CC BY 4.0).
- Earthquakes come from the USGS FDSN API. The query is M3 or higher in a box around Shandong, starting in 2015.
- Heritage items come from ihchina.cn. The API does not expose detail-page URLs, so the `url` field is null.
- News headlines come from the Ministry of Culture and Tourism, Xinhua Shandong, and Dazhong. Keywords and sentiment are based on titles only, not on platform engagement.
- Photos come from Wikimedia Commons. The `credit` fields keep the author and license. Some heritage entries have no free photo; those use AI-generated images and are marked in the UI.
- The homepage's 2024 per-city tourism figures come from the Shandong Statistical Yearbook 2025 (tables 6-20, 6-21, 6-25, and 6-26) and are stored in `tourism_stats_real`. The county split, monthly heat table, flow, industry, resource, marketing, water-level, and hazard figures remain demo data.
- The Qingdao annual series used by the illustrative forecast is in `data/real/qingdao_tourism_revenue.csv`. It records the yearbook table and a `note` column for missing years (2016-2017). No values are imputed.
- To refresh the homepage data, run `python scripts/crawl_tourism_stats.py --year 2024`, then `python scripts/export_tourism_stats.py`, and rebuild the frontend. The generated snapshot is `src/data/tourismStats.ts`.
- The yearbook's city visitor counts are not additive to the provincial total, while city tourism revenue is. The homepage labels the multi-city KPI as a sum of city figures and shows the source caveat.

## Repository layout

```
app/                    Django models, views, admin
app/analytics/          dependency-free OLS and evaluation utilities
app/tests.py            unit tests for the model, accounts, and forecast
tiktok_blogger_web/     settings and URL config
tiktok_blogger_web/settings_test.py  SQLite test settings
爬虫/                    Douyin spiders
src/                    Vue app
templates/              Django login and registration pages
scripts/                crawler, data build scripts, preview tunnel,
                        forecast demo, architecture figure
data/sample/            committed public snapshot (weather, quake, heritage, news)
data/real/              source CSV for the forecast demo
public/                 GeoJSON and images
.github/workflows/      CI (Django tests, forecast, snapshot check, build)
```

The crawler output under `data/raw/`, `data/normalized/` (except the sample), and
the raw Douyin collection are ignored. `data/sample/` and
`data/real/qingdao_tourism_revenue.csv` are committed on purpose so a fresh clone
can build and reproduce the paper's numbers.

## A few things that are easy to trip over

- `data/normalized/` and `data/raw/` are not in git. Run `npm run data:sample` after cloning, or copy a snapshot into `data/normalized/`.
- The JSON is bundled at build time. If you change a snapshot, run `npm run build` again.
- The Django login view redirects to `http://localhost:5173/`, so it assumes the Vite dev server is on that port.
- The Douyin web API changes often. Without a cookie, the spider intentionally falls back to seed data rather than failing.

## License

MIT. See [LICENSE](LICENSE).
