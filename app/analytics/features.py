"""Load and standardize the official city tourism indicators."""

from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


BASE_FEATURES = (
    "visitors_10k",
    "revenue_100m_cny",
    "visitors_yoy_pct",
    "revenue_yoy_pct",
    "inbound_visitors_10k",
    "inbound_foreign_visitors_10k",
    "inbound_fx_10k_usd",
)

DERIVED_FEATURES = (
    "revenue_per_visitor_cny",
    "inbound_share_pct",
)

FEATURE_NAMES = BASE_FEATURES + DERIVED_FEATURES


@dataclass(frozen=True)
class CityDataset:
    """A city-by-feature matrix in raw and standardized form."""

    cities: tuple[str, ...]
    feature_names: tuple[str, ...]
    raw: tuple[tuple[float, ...], ...]
    standardized: tuple[tuple[float, ...], ...]
    source_sha256: str

    @property
    def row_count(self) -> int:
        return len(self.raw)

    @property
    def column_count(self) -> int:
        return len(self.feature_names)

    def row_for(self, city: str) -> tuple[float, ...]:
        return self.raw[self.cities.index(city)]


def _read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError(f"no rows in {path}")
    return rows


def _number(row: dict[str, str], key: str) -> float:
    raw = (row.get(key) or "").strip()
    if not raw:
        raise ValueError(f"missing {key} for {row.get('city', '?')}")
    return float(raw)


def _standardize(rows: Sequence[Sequence[float]]) -> tuple[tuple[float, ...], ...]:
    count = len(rows)
    width = len(rows[0])
    means = [sum(row[col] for row in rows) / count for col in range(width)]
    scales: list[float] = []
    for col in range(width):
        variance = sum((row[col] - means[col]) ** 2 for row in rows) / max(1, count - 1)
        scale = variance ** 0.5
        scales.append(scale if scale > 0 else 1.0)
    return tuple(
        tuple((row[col] - means[col]) / scales[col] for col in range(width))
        for row in rows
    )


def load_city_dataset(path: str | Path) -> CityDataset:
    """Read the CSV and return raw plus z-score-standardized features."""
    source = Path(path)
    rows = _read_rows(source)
    cities: list[str] = []
    raw: list[tuple[float, ...]] = []
    for row in rows:
        city = (row.get("city") or "").strip()
        if not city:
            raise ValueError("city is required")
        visitors = _number(row, "visitors_10k")
        revenue = _number(row, "revenue_100m_cny")
        inbound = _number(row, "inbound_visitors_10k")
        if visitors <= 0:
            raise ValueError(f"{city}: visitors_10k must be positive")
        raw.append(
            (
                visitors,
                revenue,
                _number(row, "visitors_yoy_pct"),
                _number(row, "revenue_yoy_pct"),
                inbound,
                _number(row, "inbound_foreign_visitors_10k"),
                _number(row, "inbound_fx_10k_usd"),
                revenue * 10_000.0 / visitors,
                inbound / visitors * 100.0,
            )
        )
        cities.append(city)
    return CityDataset(
        cities=tuple(cities),
        feature_names=FEATURE_NAMES,
        raw=tuple(raw),
        standardized=_standardize(raw),
        source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    )


def scale_to_unit(rows: Sequence[Sequence[float]]) -> tuple[tuple[float, ...], ...]:
    """Min-max scale each column to the open interval used by the autoencoder."""
    count = len(rows)
    width = len(rows[0])
    mins = [min(row[col] for row in rows) for col in range(width)]
    maxs = [max(row[col] for row in rows) for col in range(width)]
    spans = [maxs[col] - mins[col] for col in range(width)]
    return tuple(
        tuple(
            0.05 + 0.90 * ((row[col] - mins[col]) / spans[col] if spans[col] else 0.5)
            for col in range(width)
        )
        for row in rows
    )
