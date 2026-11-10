# Sample snapshot

This folder is a small, public snapshot for a fresh clone. Copy it into
`data/normalized/` before building the front end:

```bash
node scripts/use_sample_data.mjs
# or: cp -r data/sample/normalized data/normalized
```

The snapshot contains four files that the Vue build imports:

| File | Rows | Source | Status |
|---|---|---|---|
| `normalized/weather.json` | 16 cities | Open-Meteo (CC BY 4.0) | Real public data, fetched 2026-11-02 |
| `normalized/quake.json` | 20 events | USGS FDSN Event API | Real public data, fetched 2026-11-02 |
| `normalized/heritage.json` | 190 items | ihchina.cn national ICH list | Real public data, fetched 2026-11-02 |
| `normalized/news.json` | 79 headlines | Ministry of Culture and Tourism, Xinhua Shandong, Dazhong | Real public headlines, fetched 2026-11-02 |

The snapshot is intentionally limited to fields needed by the dashboard. It
does not include Douyin user profiles or comments. The `/flow`, `/industry`,
`/resource`, `/marketing`, `/disaster`, monthly heat, county split, and
water-level layers use synthetic/demo values in the front end; see the main
README and `PRIVACY_AND_DATA.md` for the full data provenance.

The 2024 city-level tourism statistics used by the homepage are in
`src/data/tourismStats.ts`, generated from the Shandong Statistical Yearbook
2025 (tables 6-20, 6-21, 6-25, 6-26). The annual Qingdao series used by the
illustrative forecast is in `data/real/qingdao_tourism_revenue.csv`.

The `count` in `manifest.json` is the number of records in the snapshot, not a
claim about the full source. Re-running the crawler will change these files.
