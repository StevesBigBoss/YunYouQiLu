# YunYouQiLu (云游齐鲁)

YunYouQiLu is a Vue 3 + Django dashboard for culture and tourism along the Yellow River in Shandong. It covers all 16 prefecture-level cities; nine sit on the river. Weather and earthquake feeds are real; most tourism figures are labeled demo data. The interface starts in Chinese, with other languages in the top-bar menu.

## Running it

Double-click **`Start-Site.bat`** in the project folder and the browser opens at `http://localhost:4173/`. The launcher installs Node.js 22 if needed, installs the npm packages, copies the sample snapshots, builds the site, and starts the local server. If SmartScreen appears, choose "More info" and then "Run anyway". Running it again reuses the live server.

That is the only required step. Manual PowerShell setup, the Django admin and MySQL backend, and the optional tooling are documented under [Extensions](#extensions-optional) below.

## Requirements

The dashboard needs only this:

| Component | Version | Notes |
|---|---|---|
| Windows 10/11 with PowerShell | any recent build | the launcher is `Start-Site.bat` |
| Node.js | 20.19+ (20.x line) or 22.12+ | installed automatically with `winget` if missing or too old |
| npm | ships with Node.js | used on the first run to install the front-end packages |
| Internet access | first run only | to download Node.js and the npm packages |

The optional backend in [Extensions](#extensions-optional) additionally needs:

| Component | Version |
|---|---|---|
| Python | 3.8+ (3.12 recommended) |
| pip | ships with Python |
| MySQL Server | 8.x |
| MySQL client (`mysql`) | on `PATH`, or use the "MySQL 8.0 Command Line Client" entry |

Nothing else has to be installed: the Node crawler and the forecast/analytics scripts use only their language standard libraries, and the dashboard reads the committed JSON snapshots at build time. Which data is real and which is demo is described in `PRIVACY_AND_DATA.md`.

## Background

The repo started as a Douyin blogger data exercise. The Django models and admin still use the older English naming: `TiktokUser`, `Video`, `VideoComment`, and an admin title that says 抖音博主数据分析系统后台. The dashboard then grew into a broader Shandong tourism project. Renaming the models would mean new migrations and admin changes without changing anything users see, so the old names stayed.

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

Vue 3.5 and TypeScript do the UI. ECharts handles charts, Leaflet handles maps, and Vite 8 builds it. The Django side runs on 4.2 LTS, uses django-simpleui for the admin, and talks to MySQL 8 through PyMySQL. The Douyin spiders are Python. The Node crawler for public weather, earthquake, heritage, and news data has no npm dependencies. The dashboard imports four JSON snapshots at build time and does not call Django at runtime, so the UI runs on its own; Django adds the admin, the Douyin models, a few account endpoints, and an optional read-only snapshot API.

## Extensions (optional)

Nothing in this section is needed to open the website. It documents the same setup as manual Windows commands, the Django admin and MySQL backend, the crawl and snapshot workflow, the build/preview pipeline, and the analytics scripts.

### 0. Manual setup (Windows PowerShell), steps 1-16

**Steps 1-6 open the dashboard in a browser** and need only Node.js plus the committed data snapshot. **Steps 7-16 (section 0b) add the Django admin, MySQL, and the snapshot API.** Use this path only if you cannot use the launcher.

Open PowerShell and paste the blocks below **in order, in the same window**.

1. Go to the project root, the folder that contains `manage.py` (adjust the path to where you extracted the archive):

**Windows (PowerShell)**

```powershell
Set-Location "$env:USERPROFILE\Downloads\YunYouQiLu-1.1.1"
```

**Windows (PowerShell)**

```powershell
Get-ChildItem manage.py, package.json
```

If the second command errors, you are in the wrong folder; `Set-Location` into the extracted folder and continue from step 2.

2. Install Node.js 22:

**Windows (PowerShell)**

```powershell
winget install OpenJS.NodeJS.LTS -e
```

Node 20.19+ or 22.12+ is required. Close and reopen PowerShell after installing, so the new `node` and `npm` are on `PATH`.

3. Copy the committed sample snapshots:

**Windows (PowerShell)**

```powershell
npm run data:sample
```

4. Install the front-end dependencies:

**Windows (PowerShell)**

```powershell
npm install
```

If the download stalls or fails with a network error, switch to a mirror and retry:

**Windows (PowerShell)**

```powershell
npm config set registry https://registry.npmmirror.com
```

**Windows (PowerShell)**

```powershell
npm install
```

5. Start the dev server:

**Windows (PowerShell)**

```powershell
npm run dev -- --host
```

The server stays in the foreground: leave this window open and use a second PowerShell window for the remaining steps.

6. Open the dashboard:

**Windows (PowerShell)**

```powershell
Start-Process "http://localhost:5173/"
```

The dev server prints `VITE v8.x ready` and `Local: http://localhost:5173/`. **That is the system dashboard, and it needs no database.** Because of `--host`, other devices on the same network can reach it at `http://<this-PC-IP>:5173/`; `ipconfig` shows the address. Port 4173 only exists while `npm run preview` runs, and it binds to 127.0.0.1.

Press `Ctrl+C` in the dev-server window to stop it.

### 0b. Django admin and MySQL (Windows PowerShell)

Steps 7-16 add the Django admin at port 8000, the MySQL database, and the read-only snapshot API. The dashboard works without them, so skip the section if you only need the pages.

7. Install Python 3.12:

**Windows (PowerShell)**

```powershell
winget install --id Python.Python.3.12 -e
```

Close and reopen PowerShell afterwards. Python 3.8 or newer is required.

8. Create and activate the virtual environment:

**Windows (PowerShell)**

```powershell
python -m venv .venv
```

**Windows (PowerShell)**

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell refuses to run the script, allow it for the current window:

**Windows (PowerShell)**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

9. Install the Python dependencies:

**Windows (PowerShell)**

```powershell
pip install -r requirements.txt
```

10. Install MySQL Server 8 with the MySQL Installer from <https://dev.mysql.com/downloads/installer/> and choose a root password during setup. Open "MySQL 8.0 Command Line Client" from the Start menu, or add `C:\Program Files\MySQL\MySQL Server 8.0\bin` to `PATH` so `mysql` works in PowerShell.

11. Create the database from the MySQL shell:

**Windows (PowerShell)**

```powershell
mysql -u root -p
```

**MySQL shell**

```sql
CREATE DATABASE dyinfo_schema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**MySQL shell**

```bash
exit
```

12. Write `.env` with that password and a freshly generated `SECRET_KEY`, without opening an editor:

**Windows (PowerShell)**

```powershell
"DB_PASSWORD=123456`nSECRET_KEY=$((python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())').Trim())`nDEBUG=True`nALLOWED_HOSTS=*" | Set-Content -Encoding utf8 .env
```

13. Create the database tables:

**Windows (PowerShell)**

```powershell
python manage.py migrate
```

14. Create the admin account `admin` / `admin123456` without prompts:

**Windows (PowerShell)**

```powershell
$env:DJANGO_SUPERUSER_USERNAME="admin"
```

**Windows (PowerShell)**

```powershell
$env:DJANGO_SUPERUSER_EMAIL="admin@example.com"
```

**Windows (PowerShell)**

```powershell
$env:DJANGO_SUPERUSER_PASSWORD="admin123456"
```

**Windows (PowerShell)**

```powershell
python manage.py createsuperuser --noinput
```

15. Start Django:

**Windows (PowerShell)**

```powershell
python manage.py runserver 0.0.0.0:8000
```

`runserver` is a foreground process and does not return to the prompt; leave it running and press `Ctrl+C` to stop it. Use a second PowerShell window for the front-end commands.

16. Open the admin panel:

**Windows (PowerShell)**

```powershell
Start-Process "http://127.0.0.1:8000/admin/"
```

The admin is at `http://127.0.0.1:8000/admin/` (`admin` / `admin123456`). A `staticfiles.W004 ... 'static' ... does not exist` warning is harmless and does not stop the server.

The demo passwords above are local values, not secrets, and `.env` is gitignored. To restart after reopening PowerShell: repeat step 1, the activation command from step 8, step 5, and step 15.

### 1. Django and MySQL notes (Windows)

The steps above are the full procedure. The details they rely on:

- `.env` is read through `python-dotenv`; `DB_PASSWORD` and `SECRET_KEY` have no fallback, so an empty value stops the server.
- Generate a key with:

**Windows (PowerShell)**

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

- `mysql` and the password must stay adjacent (`-p123456`, no space); with a space MySQL treats the password as a database name.
- `exit` is a MySQL command typed at the `mysql>` prompt. A `python` command typed there is treated as SQL and appears to hang.
- Create an admin interactively instead of step 14 if you prefer:

**Windows (PowerShell)**

```powershell
python manage.py createsuperuser
```

The admin is at `http://127.0.0.1:8000/admin/`.

### 2. Data snapshots

The Vue build imports `data/normalized/weather.json`, `quake.json`, `heritage.json`, and `news.json`. A small public snapshot is committed under `data/sample/normalized/`, so a fresh clone can build without running the crawler:

**Windows (PowerShell)**

```powershell
npm run data:sample
```

**Windows (PowerShell)**

```powershell
npm run check:snapshots
```

The sample was fetched on 2026-11-02 and contains 16 city weather records, 20 earthquakes, 190 heritage items, and 79 news headlines. It contains no Douyin user data. To refresh it from the sources instead, run the crawler from the project root:

**Windows (PowerShell)**

```powershell
node scripts/crawler/crawl.mjs
```

The crawler takes about 20 seconds on a normal connection. If one source fails, the others still get written and the process exits with code 2. Raw responses go to `data/raw/`, and `data/manifest.json` keeps the last 20 runs. The full crawler output is not committed because it is large and may contain personal data.

#### Optional runtime API and refresh command

The build-time import remains the default, so the dashboard still works without
Django. When the backend is running, the same files are available through a
read-only, allow-listed API:

**HTTP**

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

**Windows (PowerShell)**

```powershell
python manage.py refresh_snapshots --check
```

**Windows (PowerShell)**

```powershell
python manage.py refresh_snapshots --run --source weather --source quake
```

The repository does not bundle an always-on scheduler. On Windows, point Task Scheduler at the refresh command:

**Windows (PowerShell)**

```powershell
schtasks /Create /SC HOURLY /MO 6 /TN "YunYouQiLu snapshots" /TR "powershell -NoProfile -Command \"cd 'C:\path\to\yunyouqilu'; .venv\Scripts\python.exe manage.py refresh_snapshots --run\"" /F
```

The API reports the resulting file timestamps and a `stale` flag. There is still no database-backed dashboard API and no automatic browser polling: the Vue app continues to read its bundled snapshot until it is rebuilt.

### 3. Frontend

Install the front-end dependencies:

**Windows (PowerShell)**

```powershell
npm install
```

Start the dev server:

**Windows (PowerShell)**

```powershell
npm run dev -- --host
```

The dev server listens on `http://localhost:5173/`. For a production build, build the bundle first:

**Windows (PowerShell)**

```powershell
npm run build
```

Then serve it:

**Windows (PowerShell)**

```powershell
npm run preview
```

The preview server uses port 4173 and binds to 127.0.0.1, so `http://localhost:4173/` works only on this PC. `node scripts/serve-public.mjs` wraps the same steps, starts a Cloudflare quick tunnel if `cloudflared.exe` is around, and writes the public URL to `公网地址.txt` (gitignored).

### 4. Douyin data (optional)

Put a Douyin web cookie in `TIKTOK_COOKIE` if you have one. Then run:

**Windows (PowerShell)**

```powershell
python spiders/yellow_river_spider.py
```

It collects videos and comments for the keyword 黄河流域生态治理 (Yellow River basin ecological governance). Without a cookie it writes a set of seed videos and comments instead. The older `python spiders/spider.py` fills the `TiktokUser` table with generated users. Note the database names: the Yellow River spider uses `dyinfo_schema`, while `spider.py` uses `tiktok_blogger_web`. Create both schemas if you plan to run both scripts.

### 5. Illustrative forecast (optional)

The annual Qingdao revenue series and the OLS demo are separate from the front
end. They run on the standard library only:

**Windows (PowerShell)**

```powershell
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

**Windows (PowerShell)**

```powershell
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

**Windows (PowerShell)**

```bash
python manage.py test --settings=tiktok_blogger_web.settings_test
```

**Windows (PowerShell)**

```bash
python scripts/run_city_analytics.py
```

**Windows (PowerShell)**

```bash
npm run data:sample
```

**Windows (PowerShell)**

```bash
npm run check:snapshots
```

**Windows (PowerShell)**

```bash
npm run build
```

The Django suite now has 23 tests: the original OLS, account, and cascade tests;
the snapshot API and refresh-command tests; and the K-means, SOM, and sparse
autoencoder tests. The test settings use SQLite in memory and do not need MySQL
or a `.env` file. The GitHub Actions workflow in `.github/workflows/ci.yml` runs
the Django tests, the forecast script, the city analytics script, the snapshot
check, and the production build.

## Versioning and reproducibility

The `package.json` version is `1.1.1`, and the release used in the paper is tagged
`v1.1.1` in the repository. Cite that tag rather than the moving `master` branch.
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
| `TIKTOK_COOKIE` | no | Douyin cookie; empty means seed data |
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
spiders/                 Douyin spiders
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
the raw Douyin collection are ignored. `data/sample/`, `data/real/*.csv`, and
`data/analytics/` are committed on purpose so a fresh clone can build and
reproduce the paper's numbers.

## A few things that are easy to trip over

- `data/normalized/` and `data/raw/` are not in git. Run `npm run data:sample` after cloning, or copy a snapshot into `data/normalized/`.
- The JSON is bundled at build time. If you change a snapshot, run `npm run build` again. The `/api/snapshots/` endpoints serve the same files but do not rebuild the Vue app.
- The sample files must exist before running the Django snapshot tests or API; `SNAPSHOT_DIR` and `SNAPSHOT_MANIFEST` can point at another directory.
- The Django login view redirects to `http://localhost:5173/`, so it assumes the Vite dev server is on that port.
- The upstream short-video API changes often. Without a cookie, the spider intentionally falls back to seed data rather than failing.

## License

MIT. See [LICENCE.txt](LICENCE.txt).
