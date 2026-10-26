# YunYouQiLu (云游齐鲁)

YunYouQiLu is a dashboard for culture and tourism along the Yellow River in Shandong. It covers all 16 prefecture-level cities in the province; nine of them sit on the river and get most of the attention. Some pages are map-first: city heat, scenic spots, protected areas, heritage sites, and disaster risk. Others are chart-first: visitor flow, industry numbers, marketing, and public opinion. Weather and earthquake feeds are real; most of the tourism figures are not. The interface starts in Chinese; the top bar has a language menu with English and several other locales.

The front end is Vue 3 with TypeScript, Vite, ECharts, and Leaflet. The backend is Django 4.2 with MySQL. The two sides are loosely coupled: the dashboard imports four JSON snapshots at build time and does not call Django at runtime, so you can run the UI on its own. Django is there for the admin, the Douyin models, and a few account endpoints.

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

The Vue build imports `data/normalized/weather.json`, `quake.json`, `heritage.json`, and `news.json`. That folder is in `.gitignore`, so a fresh clone will not build until you create it. Run the crawler from the project root:

```bash
node scripts/crawler/crawl.mjs
```

It takes about 20 seconds on a normal connection. If one source fails, the others still get written and the process exits with code 2. Raw responses go to `data/raw/`, and `data/manifest.json` keeps the last 20 runs. The copy in `data/normalized` was fetched on 2026-09-27 and held 16 city weather records, 20 earthquakes, 190 heritage items, and 78 news headlines. Those numbers will change after the next crawl.

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

## Accounts

The Vue login is a front-end demo. The default account is `admin` and the password is `123456`. New accounts are saved in `localStorage` with a salted SHA-256 hash. That is convenient for a demo, but it is not access control. The guest button skips login entirely.

Django has its own `User` model and the `/login_user/`, `/reg_user/`, and `/change_password/` endpoints. These use Django's password hasher, but the Vue app does not call them. Use the Django admin with the superuser you created.

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
- The tourism, flow, industry, resource, marketing, water-level, and hazard figures are demo data. Some screens label them as such; a few, like flow and resource, do not.

## Repository layout

```
app/                    Django models, views, admin
tiktok_blogger_web/     settings and URL config
爬虫/                    Douyin spiders
src/                    Vue app
templates/              Django login and registration pages
scripts/                crawler, data build scripts, preview tunnel
data/                   crawler output (ignored)
public/                 GeoJSON and images
```

## A few things that are easy to trip over

- `data/` is not in git. Re-run the crawler after cloning, or copy a snapshot into `data/normalized/`.
- The JSON is bundled at build time. If you change a snapshot, run `npm run build` again.
- The Django login view redirects to `http://localhost:5173/`, so it assumes the Vite dev server is on that port.
- The Douyin web API changes often. Without a cookie, the spider intentionally falls back to seed data rather than failing.

## License

MIT. See [LICENSE](LICENSE).
