"""Dependency-free ordinary least-squares utilities for the demo forecast.

The module is intentionally small. It supports the annual Qingdao revenue
example used in the paper and gives reviewers a code path that can be run
without scikit-learn, PyTorch, or any other machine-learning framework.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from math import sqrt
from pathlib import Path
from typing import Iterable, Mapping, Sequence


@dataclass(frozen=True)
class LinearModel:
    """A fitted line y = slope * x + intercept."""

    slope: float
    intercept: float

    def predict(self, x: float) -> float:
        return self.slope * x + self.intercept


@dataclass(frozen=True)
class HoldoutResult:
    """One-step-ahead hold-out comparison for a single year."""

    year: int
    actual: float
    predicted: float
    baseline: float

    @property
    def error_pct(self) -> float:
        return (self.predicted - self.actual) / self.actual * 100.0

    @property
    def baseline_error_pct(self) -> float:
        return (self.baseline - self.actual) / self.actual * 100.0


@dataclass(frozen=True)
class Metrics:
    mae: float
    rmse: float
    mape: float


# Two-sided 95% t critical values for small samples. The table covers the
# degrees of freedom used by the example; larger samples fall back to 1.96.
_T95 = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.160,
    14: 2.145,
    15: 2.131,
    16: 2.120,
    17: 2.110,
    18: 2.101,
    19: 2.093,
    20: 2.086,
}


def fit_ols(points: Sequence[tuple[float, float]]) -> LinearModel:
    """Fit a least-squares line to ``(x, y)`` pairs."""
    if len(points) < 2:
        raise ValueError("at least two points are required")
    count = len(points)
    mean_x = sum(x for x, _ in points) / count
    mean_y = sum(y for _, y in points) / count
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    if sxx == 0:
        raise ValueError("x values must not all be equal")
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in points)
    slope = sxy / sxx
    return LinearModel(slope=slope, intercept=mean_y - slope * mean_x)


def _training_points(
    series: Mapping[int, float],
    before_year: int | None,
    excluded_years: Iterable[int],
) -> list[tuple[float, float]]:
    excluded = set(excluded_years)
    return [
        (float(year), float(value))
        for year, value in sorted(series.items())
        if (before_year is None or year < before_year) and year not in excluded
    ]


def fit_series(
    series: Mapping[int, float],
    excluded_years: Iterable[int] = (),
    through_year: int | None = None,
) -> LinearModel:
    """Fit a trend to annual observations, optionally excluding given years."""
    points = _training_points(series, None if through_year is None else through_year + 1, excluded_years)
    return fit_ols(points)


def _naive_baseline(series: Mapping[int, float], year: int) -> float:
    earlier = [value for key, value in sorted(series.items()) if key < year]
    if not earlier:
        raise ValueError(f"no observation before {year}")
    return earlier[-1]


def evaluate_rolling(
    series: Mapping[int, float],
    holdout_years: Sequence[int],
    excluded_years: Iterable[int] = (),
) -> list[HoldoutResult]:
    """Fit on earlier observations and compare each hold-out year with a naive baseline.

    The naive baseline predicts the most recent observed value before the
    hold-out year. It is the standard "random walk" comparison for a short
    annual series.
    """
    results: list[HoldoutResult] = []
    for year in holdout_years:
        points = _training_points(series, year, excluded_years)
        model = fit_ols(points)
        results.append(
            HoldoutResult(
                year=year,
                actual=float(series[year]),
                predicted=model.predict(year),
                baseline=_naive_baseline(series, year),
            )
        )
    return results


def metrics(results: Sequence[HoldoutResult]) -> Metrics:
    """Return MAE, RMSE, and MAPE for the model in ``results``."""
    if not results:
        raise ValueError("at least one hold-out result is required")
    errors = [item.predicted - item.actual for item in results]
    mae = sum(abs(error) for error in errors) / len(errors)
    rmse = sqrt(sum(error * error for error in errors) / len(errors))
    mape = sum(abs(error / item.actual) for error, item in zip(errors, results)) / len(results) * 100.0
    return Metrics(mae=mae, rmse=rmse, mape=mape)


def baseline_metrics(results: Sequence[HoldoutResult]) -> Metrics:
    """Return the same metrics for the naive baseline in ``results``."""
    swapped = [
        HoldoutResult(year=item.year, actual=item.actual, predicted=item.baseline, baseline=item.baseline)
        for item in results
    ]
    return metrics(swapped)


def prediction_interval(
    model: LinearModel,
    points: Sequence[tuple[float, float]],
    target_x: float,
    confidence: float = 0.95,
) -> tuple[float, float]:
    """Return a two-sided prediction interval for a new observation.

    Only the 95% level is tabulated; other requests use the normal
    approximation. The interval is wide for short annual series, which is
    the honest result for the demo data.
    """
    if len(points) < 3:
        raise ValueError("at least three points are required for a prediction interval")
    residuals = [y - model.predict(x) for x, y in points]
    residual_df = len(points) - 2
    residual_variance = sum(r * r for r in residuals) / residual_df
    residual_se = sqrt(residual_variance)
    mean_x = sum(x for x, _ in points) / len(points)
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    standard_error = residual_se * sqrt(1.0 + 1.0 / len(points) + (target_x - mean_x) ** 2 / sxx)
    critical = _T95.get(residual_df, 1.96) if confidence == 0.95 else 1.96
    predicted = model.predict(target_x)
    return predicted - critical * standard_error, predicted + critical * standard_error


def load_series(path: str | Path, value_column: str = "domestic_revenue_100m_cny") -> dict[int, float]:
    """Load a year/value CSV, skipping blank or missing values."""
    series: dict[int, float] = {}
    with Path(path).open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            raw = (row.get(value_column) or "").strip()
            if not raw or raw.lower() in {"na", "n/a", "null", "-", "—"}:
                continue
            series[int(row["year"])] = float(raw)
    return series
