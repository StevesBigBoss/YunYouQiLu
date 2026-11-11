# 2024 city tourism analytics

Source: `data/real/shandong_city_tourism_2024.csv`

Seed: `42`. Features: `visitors_10k`, `revenue_100m_cny`, `visitors_yoy_pct`, `revenue_yoy_pct`, `inbound_visitors_10k`, `inbound_foreign_visitors_10k`, `inbound_fx_10k_usd`, `revenue_per_visitor_cny`, `inbound_share_pct`.

## K-means

Selected k = **2** by the highest mean silhouette (0.5562); within-cluster sum of squares = 65.51.

| Cluster | Cities | Mean visitors (10k) | Mean revenue (100m CNY) |
|---:|---|---:|---:|
| 0 | 济南、淄博、枣庄、东营、潍坊、济宁、泰安、威海、日照、临沂、德州、聊城、滨州、菏泽 | 6163.04 | 567.41 |
| 1 | 青岛、烟台 | 10947.14 | 1467.72 |

Candidate k values:

| k | Silhouette | Inertia |
|---:|---:|---:|
| 2 | 0.5562 | 65.51 |
| 3 | 0.2567 | 52.30 |
| 4 | 0.2399 | 41.08 |
| 5 | 0.1343 | 38.71 |
| 6 | 0.2452 | 13.75 |

## Self-organizing map

Grid: **4×4**, epochs = 1000. Quantization error = 0.1580; topographic error = 0.2500.

| City | Node | Row | Column |
|---|---:|---:|---:|
| 济南 | 11 | 2 | 3 |
| 青岛 | 3 | 0 | 3 |
| 淄博 | 5 | 1 | 1 |
| 枣庄 | 4 | 1 | 0 |
| 东营 | 8 | 2 | 0 |
| 烟台 | 2 | 0 | 2 |
| 潍坊 | 14 | 3 | 2 |
| 济宁 | 15 | 3 | 3 |
| 泰安 | 0 | 0 | 0 |
| 威海 | 10 | 2 | 2 |
| 日照 | 13 | 3 | 1 |
| 临沂 | 15 | 3 | 3 |
| 德州 | 12 | 3 | 0 |
| 聊城 | 12 | 3 | 0 |
| 滨州 | 8 | 2 | 0 |
| 菏泽 | 8 | 2 | 0 |

## Sparse autoencoder

Architecture: 9-4-9 with sigmoid activations, KL sparsity target 0.05, weight 0.1, and 3000 epochs.

| Metric | Value |
|---|---:|
| Reconstruction MSE | 0.033307 |
| Baseline MSE | 0.056127 |
| MSE reduction | 40.66% |
| Mean hidden activation | 0.0808 |
| Active fraction (> 0.1) | 0.4062 |
| Downstream K-means silhouette (k=2) | 0.7329 |

## Reproduce

```bash
python scripts/run_city_analytics.py
```

The script uses only the Python standard library. It writes `data/analytics/city_analytics.json` and this file. The input contains official 2024 yearbook indicators; the clusters are descriptive and should not be read as causal estimates or policy recommendations.
