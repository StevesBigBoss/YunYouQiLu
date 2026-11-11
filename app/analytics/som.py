"""A compact deterministic self-organizing map for the city demonstration."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Sequence

from app.analytics.clustering import distance_squared

Point = Sequence[float]


@dataclass(frozen=True)
class SOMResult:
    rows: int
    columns: int
    weights: tuple[tuple[tuple[float, ...], ...], ...]
    assignments: tuple[int, ...]
    hit_counts: tuple[int, ...]
    quantization_error: float
    topographic_error: float
    epochs: int
    learning_rate: float
    sigma: float

    def node_for(self, index: int) -> tuple[int, int]:
        return divmod(index, self.columns)

    def city_nodes(self, names: Sequence[str]) -> tuple[tuple[str, int, int, int], ...]:
        return tuple(
            (name, node, *self.node_for(node))
            for name, node in zip(names, self.assignments)
        )


def _bmu(point: Point, weights: Sequence[Sequence[Point]]) -> tuple[int, int]:
    best_row = 0
    best_column = 0
    best_distance = math.inf
    for row, line in enumerate(weights):
        for column, weight in enumerate(line):
            distance = distance_squared(point, weight)
            if distance < best_distance:
                best_row, best_column, best_distance = row, column, distance
    return best_row, best_column


def _decay(value: float, epoch: int, epochs: int, rate: float = 3.0) -> float:
    return value * math.exp(-rate * epoch / max(1, epochs))


def train_som(
    points: Sequence[Point],
    *,
    rows: int = 4,
    columns: int = 4,
    epochs: int = 1000,
    learning_rate: float = 0.5,
    sigma: float = 2.0,
    seed: int = 42,
) -> SOMResult:
    if len(points) < 2:
        raise ValueError("at least two points are required")
    if rows < 1 or columns < 1:
        raise ValueError("grid dimensions must be positive")
    rng = random.Random(seed)
    weights: list[list[list[float]]] = [
        [
            [value + rng.gauss(0.0, 0.01) for value in points[rng.randrange(len(points))]]
            for _ in range(columns)
        ]
        for _ in range(rows)
    ]
    order = list(range(len(points)))
    for epoch in range(epochs):
        current_rate = _decay(learning_rate, epoch, epochs)
        current_sigma = _decay(sigma, epoch, epochs)
        rng.shuffle(order)
        for index in order:
            point = points[index]
            best_row, best_column = _bmu(point, weights)
            for row in range(rows):
                for column in range(columns):
                    grid_distance = (row - best_row) ** 2 + (column - best_column) ** 2
                    influence = math.exp(-grid_distance / (2.0 * current_sigma ** 2))
                    step = current_rate * influence
                    weight = weights[row][column]
                    for feature in range(len(point)):
                        weight[feature] += step * (point[feature] - weight[feature])

    assignments: list[int] = []
    quantization: list[float] = []
    topographic_errors = 0
    hits = [0] * (rows * columns)
    for point in points:
        best_row, best_column = _bmu(point, weights)
        node = best_row * columns + best_column
        assignments.append(node)
        hits[node] += 1
        quantization.append(math.sqrt(distance_squared(point, weights[best_row][best_column])))
        second_distance = math.inf
        second_node = node
        for row in range(rows):
            for column in range(columns):
                if (row, column) == (best_row, best_column):
                    continue
                distance = distance_squared(point, weights[row][column])
                if distance < second_distance:
                    second_distance = distance
                    second_node = row * columns + column
        second_row, second_column = divmod(second_node, columns)
        if abs(second_row - best_row) + abs(second_column - best_column) > 1:
            topographic_errors += 1

    return SOMResult(
        rows=rows,
        columns=columns,
        weights=tuple(tuple(tuple(weight) for weight in line) for line in weights),
        assignments=tuple(assignments),
        hit_counts=tuple(hits),
        quantization_error=sum(quantization) / len(quantization),
        topographic_error=topographic_errors / len(points),
        epochs=epochs,
        learning_rate=learning_rate,
        sigma=sigma,
    )
