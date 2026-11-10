"""Reproduce the illustrative Qingdao revenue forecast used in the paper.

The script uses only the Python standard library for the model. Matplotlib is
imported only when ``--figure`` is supplied, so the model can be checked in a
minimal environment.

Example:
    python scripts/forecast_qingdao.py
    python scripts/forecast_qingdao.py --figure fig6_forecast.png
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.analytics.forecast import (  # noqa: E402
    baseline_metrics,
    evaluate_rolling,
    fit_series,
    load_series,
    metrics,
    prediction_interval,
)

DEFAULT_CSV = ROOT / "data" / "real" / "qingdao_tourism_revenue.csv"
EXCLUDED_YEARS = (2020, 2022)
HOLDOUT_YEARS = (2023, 2024)
FORECAST_YEARS = (2025, 2026)


def load_visitors(path: Path) -> dict[int, float]:
    return load_series(path, value_column="domestic_visitors_10k")


def run(csv_path: Path) -> dict:
    revenue = load_series(csv_path)
    visitors = load_visitors(csv_path)
    holdout = evaluate_rolling(revenue, HOLDOUT_YEARS, EXCLUDED_YEARS)
    model_metrics = metrics(holdout)
    naive_metrics = baseline_metrics(holdout)

    training_points = [
        (float(year), float(value))
        for year, value in sorted(revenue.items())
        if year not in EXCLUDED_YEARS
    ]
    final_model = fit_series(revenue, excluded_years=EXCLUDED_YEARS)
    forecasts = {}
    for year in FORECAST_YEARS:
        low, high = prediction_interval(final_model, training_points, float(year))
        forecasts[year] = {
            "value_100m_cny": round(final_model.predict(year), 2),
            "pi95_low_100m_cny": round(low, 2),
            "pi95_high_100m_cny": round(high, 2),
        }

    return {
        "csv": str(csv_path),
        "excluded_years": list(EXCLUDED_YEARS),
        "model": {
            "name": "ordinary least squares (OLS) trend",
            "slope": round(final_model.slope, 4),
            "intercept": round(final_model.intercept, 4),
        },
        "holdout": [
            {
                "year": item.year,
                "actual_100m_cny": round(item.actual, 2),
                "ols_forecast_100m_cny": round(item.predicted, 2),
                "ols_error_pct": round(item.error_pct, 2),
                "naive_forecast_100m_cny": round(item.baseline, 2),
                "naive_error_pct": round(item.baseline_error_pct, 2),
            }
            for item in holdout
        ],
        "metrics": {
            "ols": {
                "mae_100m_cny": round(model_metrics.mae, 2),
                "rmse_100m_cny": round(model_metrics.rmse, 2),
                "mape_pct": round(model_metrics.mape, 2),
            },
            "naive": {
                "mae_100m_cny": round(naive_metrics.mae, 2),
                "rmse_100m_cny": round(naive_metrics.rmse, 2),
                "mape_pct": round(naive_metrics.mape, 2),
            },
        },
        "forecasts": {str(year): value for year, value in forecasts.items()},
        "visitors": {str(year): value for year, value in sorted(visitors.items())},
    }


def draw_figure(result: dict, output: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 12,
            "axes.titlesize": 13,
            "axes.titleweight": "bold",
            "axes.spines.top": False,
            "axes.spines.right": False,
            "figure.dpi": 300,
        }
    )

    visitors = {int(year): value for year, value in result["visitors"].items()}
    revenue_rows = result["holdout"]
    # Historical revenue is reconstructed from the hold-out actuals and the
    # CSV-backed forecasts; the source values are embedded in the JSON output.
    csv_path = Path(result["csv"])
    revenue = load_series(csv_path)
    years = sorted(revenue)
    final_model = fit_series(revenue, excluded_years=EXCLUDED_YEARS)
    training_points = [(float(y), float(v)) for y, v in revenue.items() if y not in EXCLUDED_YEARS]

    fig, axes = plt.subplots(2, 2, figsize=(9.0, 6.6))
    ax1, ax2, ax3, ax4 = axes.ravel()

    # (a) annual visitors
    visitor_years = sorted(visitors)
    ax1.bar(visitor_years, [visitors[y] / 1000 for y in visitor_years], color="#4C78A8", width=0.65)
    for year in (2016, 2017):
        ax1.text(year, 0.4, "n.a.", ha="center", va="bottom", fontsize=10, color="#777777")
    ax1.set_title("(a) Qingdao domestic visitors")
    ax1.set_ylabel("Million person-trips")
    ax1.set_xticks(range(min(visitor_years), max(visitor_years) + 1))
    ax1.tick_params(axis="x", rotation=45)

    # (b) annual revenue
    colors = ["#E45756" if year in EXCLUDED_YEARS else "#4C78A8" for year in years]
    ax2.bar(years, [revenue[y] for y in years], color=colors, width=0.65)
    for year in (2016, 2017):
        ax2.text(year, 30, "n.a.", ha="center", va="bottom", fontsize=10, color="#777777")
    ax2.set_title("(b) Qingdao domestic tourism revenue")
    ax2.set_ylabel("100 million CNY")
    ax2.set_xticks(range(min(years), max(years) + 1))
    ax2.set_ylim(0, 2350)
    ax2.tick_params(axis="x", rotation=45)
    ax2.legend(
        handles=[Patch(facecolor="#E45756", label="Pandemic years (excluded)")],
        frameon=False,
        fontsize=9,
        loc="upper left",
    )

    # (c) final model forecasts with prediction intervals
    for year in years:
        ax3.scatter(year, revenue[year], color="#4C78A8", s=26, zorder=3)
    fitted_years = list(range(min(years), 2025))
    ax3.plot(fitted_years, [final_model.predict(y) for y in fitted_years], color="#4C78A8", lw=1.2, label="OLS fit")
    forecast_years = [2025, 2026]
    forecast_values = [final_model.predict(y) for y in forecast_years]
    ax3.plot([2024] + forecast_years, [revenue[2024]] + forecast_values, color="#F58518", lw=1.6, marker="o", label="OLS forecast")
    lows = [result["forecasts"][str(y)]["pi95_low_100m_cny"] for y in forecast_years]
    highs = [result["forecasts"][str(y)]["pi95_high_100m_cny"] for y in forecast_years]
    ax3.fill_between(
        forecast_years,
        lows,
        highs,
        color="#F58518",
        alpha=0.18,
        label="95% prediction interval",
    )
    ax3.set_title("(c) Revenue forecast, 2025-2026")
    ax3.set_ylabel("100 million CNY")
    ax3.set_xticks(fitted_years + forecast_years)
    ax3.tick_params(axis="x", rotation=45)
    ax3.legend(frameon=False, fontsize=10, loc="upper left")

    # (d) hold-out comparison
    labels = [str(item["year"]) for item in revenue_rows]
    actual = [item["actual_100m_cny"] for item in revenue_rows]
    ols = [item["ols_forecast_100m_cny"] for item in revenue_rows]
    naive = [item["naive_forecast_100m_cny"] for item in revenue_rows]
    positions = range(len(labels))
    width = 0.26
    ax4.bar([p - width for p in positions], actual, width=width, label="Actual", color="#4C78A8")
    ax4.bar(positions, ols, width=width, label="OLS", color="#F58518")
    ax4.bar([p + width for p in positions], naive, width=width, label="Naive", color="#BAB0AC")
    for p, item in zip(positions, revenue_rows):
        ax4.text(p, item["ols_forecast_100m_cny"] + 95,
                 f"OLS {item['ols_error_pct']:+.1f}%", ha="center", fontsize=10, color="#B35A00")
    ax4.set_ylim(0, max(max(actual), max(ols), max(naive)) * 1.22)
    ax4.set_title(
        "(d) Hold-out forecasts\nOLS MAPE %.2f%% | naive MAPE %.2f%%"
        % (result["metrics"]["ols"]["mape_pct"], result["metrics"]["naive"]["mape_pct"]),
        fontsize=12,
    )
    ax4.set_ylabel("100 million CNY")
    ax4.set_xticks(list(positions))
    ax4.set_xticklabels(labels)
    ax4.legend(
        frameon=False,
        fontsize=10,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.14),
        ncol=3,
    )

    fig.tight_layout()
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=300, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--figure", type=Path, default=None)
    args = parser.parse_args()

    result = run(args.csv)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text, encoding="utf-8")
        print(f"wrote {args.json}")
    else:
        print(text)
    if args.figure:
        draw_figure(result, args.figure)
        print(f"wrote {args.figure}")


if __name__ == "__main__":
    main()
