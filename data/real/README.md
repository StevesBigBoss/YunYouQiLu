# 2024 city tourism indicators

`shandong_city_tourism_2024.csv` contains the 2024 domestic tourism indicators
for the 16 prefecture-level cities of Shandong. The values are copied from
`src/data/tourismStats.ts`, which records tables 6-20, 6-21, 6-25, and 6-26 of
the 2025 Shandong Statistical Yearbook.

Columns:

| Column | Unit | Meaning |
|---|---|---|
| `city` | — | Prefecture-level city |
| `visitors_10k` | 10,000 person-trips | Domestic visitors |
| `revenue_100m_cny` | 100 million CNY | Domestic tourism revenue |
| `visitors_yoy_pct` | percent | Year-on-year visitor growth |
| `revenue_yoy_pct` | percent | Year-on-year revenue growth |
| `inbound_visitors_10k` | 10,000 person-trips | Inbound visitors |
| `inbound_foreign_visitors_10k` | 10,000 person-trips | Inbound foreign visitors |
| `inbound_fx_10k_usd` | 10,000 USD | Inbound tourism foreign-exchange earnings |

The analytics script adds two derived columns at load time:

- `revenue_per_visitor_cny = revenue_100m_cny * 10,000 / visitors_10k`
- `inbound_share_pct = inbound_visitors_10k / visitors_10k * 100`

These are descriptive indicators for clustering, not causal variables. The
yearbook's city visitor counts are not additive to the provincial total; the
script does not sum them.

`scripts/run_city_analytics.py` reads this file with seed 42 and writes
`data/analytics/city_analytics.json` and `city_analytics.md`. The JSON records
the SHA-256 of the input used for a run.
