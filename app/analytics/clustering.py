"""A small deterministic K-means implementation with k-means++ seeding."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Sequence

Point = Sequence[float]


@dataclass(frozen=True)
class KMeansResult:
    k: int
    labels: tuple[int, ...]
    centroids: tuple[tuple[float, ...], ...]
    inertia: float
    silhouette: float
    iterations: int

    def members(self, names: Sequence[str]) -> tuple[tuple[str, ...], ...]:
        groups: list[list[str]] = [[] for _ in range(self.k)]
        for name, label in zip(names, self.labels):
            groups[label].append(name)
        return tuple(tuple(group) for group in groups)


def distance_squared(left: Point, right: Point) -> float:
    return sum((a - b) ** 2 for a, b in zip(left, right))


def _centroid(points: Sequence[Point]) -> tuple[float, ...]:
    count = len(points)
    width = len(points[0])
    return tuple(sum(point[col] for point in points) / count for col in range(width))


def _assign(points: Sequence[Point], centroids: Sequence[Point]) -> tuple[int, ...]:
    labels: list[int] = []
    for point in points:
        best = 0
        best_distance = distance_squared(point, centroids[0])
        for index in range(1, len(centroids)):
            distance = distance_squared(point, centroids[index])
            if distance < best_distance:
                best = index
                best_distance = distance
        labels.append(best)
    return tuple(labels)


def _inertia(points: Sequence[Point], centroids: Sequence[Point], labels: Sequence[int]) -> float:
    return sum(distance_squared(point, centroids[label]) for point, label in zip(points, labels))


def _kmeans_plus_plus(points: Sequence[Point], k: int, rng: random.Random) -> list[tuple[float, ...]]:
    centroids: list[tuple[float, ...]] = [tuple(points[rng.randrange(len(points))])]
    while len(centroids) < k:
        distances = [
            min(distance_squared(point, centroid) for centroid in centroids)
            for point in points
        ]
        total = sum(distances)
        if total <= 0:
            centroids.append(tuple(points[rng.randrange(len(points))]))
            continue
        threshold = rng.random() * total
        cumulative = 0.0
        chosen = len(points) - 1
        for index, distance in enumerate(distances):
            cumulative += distance
            if cumulative >= threshold:
                chosen = index
                break
        centroids.append(tuple(points[chosen]))
    return centroids


def _silhouette(points: Sequence[Point], labels: Sequence[int], k: int) -> float:
    count = len(points)
    if k < 2 or count <= k:
        return 0.0
    scores: list[float] = []
    for index, point in enumerate(points):
        own = labels[index]
        same = [j for j in range(count) if labels[j] == own and j != index]
        if not same:
            scores.append(0.0)
            continue
        a = sum(math.sqrt(distance_squared(point, points[j])) for j in same) / len(same)
        b = math.inf
        for cluster in range(k):
            if cluster == own:
                continue
            other = [j for j in range(count) if labels[j] == cluster]
            if not other:
                continue
            mean = sum(math.sqrt(distance_squared(point, points[j])) for j in other) / len(other)
            b = min(b, mean)
        if not math.isfinite(b) or max(a, b) == 0:
            scores.append(0.0)
        else:
            scores.append((b - a) / max(a, b))
    return sum(scores) / len(scores)


def run_kmeans(
    points: Sequence[Point],
    k: int,
    *,
    seed: int = 42,
    max_iterations: int = 300,
) -> KMeansResult:
    if len(points) < 2:
        raise ValueError("at least two points are required")
    if not 2 <= k < len(points):
        raise ValueError("k must be at least 2 and smaller than the number of points")
    rng = random.Random(seed)
    centroids = _kmeans_plus_plus(points, k, rng)
    labels: tuple[int, ...] = ()
    iterations = 0
    for iterations in range(1, max_iterations + 1):
        new_labels = _assign(points, centroids)
        groups: list[list[Point]] = [[] for _ in range(k)]
        for point, label in zip(points, new_labels):
            groups[label].append(point)
        for cluster in range(k):
            if groups[cluster]:
                centroids[cluster] = _centroid(groups[cluster])
            else:
                farthest = max(range(len(points)), key=lambda i: distance_squared(points[i], centroids[new_labels[i]]))
                centroids[cluster] = tuple(points[farthest])
        if new_labels == labels:
            labels = new_labels
            break
        labels = new_labels
    inertia = _inertia(points, centroids, labels)
    return KMeansResult(
        k=k,
        labels=labels,
        centroids=tuple(centroids),
        inertia=inertia,
        silhouette=_silhouette(points, labels, k),
        iterations=iterations,
    )


def select_k(
    points: Sequence[Point],
    *,
    min_k: int = 2,
    max_k: int | None = None,
    seed: int = 42,
) -> tuple[KMeansResult, tuple[KMeansResult, ...]]:
    """Run k=min_k..max_k and return the best silhouette plus all candidates."""
    upper = max_k if max_k is not None else min(6, len(points) - 1)
    candidates = tuple(
        run_kmeans(points, k, seed=seed)
        for k in range(min_k, upper + 1)
    )
    if not candidates:
        raise ValueError("no candidate values of k were run")
    best = max(candidates, key=lambda item: (item.silhouette, -item.k))
    return best, candidates
