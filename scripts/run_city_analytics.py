"""Run the reproducible city clustering, SOM, and sparse-autoencoder demo."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.analytics.autoencoder import train_sparse_autoencoder  # noqa: E402
from app.analytics.clustering import KMeansResult, run_kmeans, select_k  # noqa: E402
from app.analytics.features import (  # noqa: E402
    FEATURE_NAMES,
    CityDataset,
    load_city_dataset,
    scale_to_unit,
)
from app.analytics.som import train_som  # noqa: E402


DEFAULT_CSV = ROOT / "data" / "real" / "shandong_city_tourism_2024.csv"
DEFAULT_OUT = ROOT / "data" / "analytics"


def _cluster_profiles(dataset: CityDataset, result: KMeansResult) -> list[dict]:
    profiles = []
    for cluster in range(result.k):
        members = [index for index, label in enumerate(result.labels) if label == cluster]
        profile = {
            "cluster": cluster,
            "cities": [dataset.cities[index] for index in members],
            "mean_raw": {
                name: round(
                    sum(dataset.raw[index][feature] for index in members) / len(members),
                    2,
                )
                for feature, name in enumerate(dataset.feature_names)
            },
        }
        profiles.append(profile)
    return profiles


def _assignments(dataset: CityDataset, labels: tuple[int, ...]) -> dict[str, int]:
    return {city: label for city, label in zip(dataset.cities, labels)}


def run(csv_path: Path, out_dir: Path, seed: int, hidden_dim: int, sae_epochs: int, som_epochs: int) -> dict:
    dataset = load_city_dataset(csv_path)
    best, candidates = select_k(dataset.standardized, seed=seed)
    som = train_som(
        dataset.standardized,
        rows=4,
        columns=4,
        epochs=som_epochs,
        sigma=2.0,
        seed=seed,
    )
    scaled = scale_to_unit(dataset.raw)
    autoencoder = train_sparse_autoencoder(
        scaled,
        hidden_dim=hidden_dim,
        epochs=sae_epochs,
        sparsity=0.05,
        sparsity_weight=0.1,
        seed=seed,
    )
    downstream = run_kmeans(autoencoder.codes, best.k, seed=seed)

    try:
        source_label = csv_path.relative_to(ROOT).as_posix()
    except ValueError:
        source_label = str(csv_path)
    result = {
        "source": source_label,
        "source_sha256": dataset.source_sha256,
        "seed": seed,
        "features": list(FEATURE_NAMES),
        "cities": list(dataset.cities),
        "kmeans": {
            "selected_k": best.k,
            "silhouette": round(best.silhouette, 4),
            "inertia": round(best.inertia, 4),
            "iterations": best.iterations,
            "assignments": _assignments(dataset, best.labels),
            "clusters": _cluster_profiles(dataset, best),
            "candidates": [
                {
                    "k": item.k,
                    "silhouette": round(item.silhouette, 4),
                    "inertia": round(item.inertia, 4),
                }
                for item in candidates
            ],
        },
        "som": {
            "grid_rows": som.rows,
            "grid_columns": som.columns,
            "epochs": som.epochs,
            "learning_rate": som.learning_rate,
            "sigma": som.sigma,
            "quantization_error": round(som.quantization_error, 4),
            "topographic_error": round(som.topographic_error, 4),
            "assignments": {
                city: {"node": node, "row": row, "column": column}
                for city, node, row, column in som.city_nodes(dataset.cities)
            },
            "hit_counts": list(som.hit_counts),
        },
        "sparse_autoencoder": {
            "hidden_dim": autoencoder.hidden_dim,
            "epochs": autoencoder.epochs,
            "sparsity_target": 0.05,
            "sparsity_weight": 0.1,
            "final_loss": round(autoencoder.final_loss, 6),
            "reconstruction_mse": round(autoencoder.reconstruction_mse, 6),
            "baseline_mse": round(autoencoder.baseline_mse, 6),
            "reconstruction_reduction_pct": round(
                (1.0 - autoencoder.reconstruction_mse / autoencoder.baseline_mse) * 100.0,
                2,
            ),
            "mean_hidden_activation": round(autoencoder.mean_hidden_activation, 4),
            "active_fraction": round(autoencoder.active_fraction, 4),
            "codes": {
                city: [round(value, 4) for value in code]
                for city, code in zip(dataset.cities, autoencoder.codes)
            },
            "downstream_kmeans": {
                "k": downstream.k,
                "silhouette": round(downstream.silhouette, 4),
                "inertia": round(downstream.inertia, 4),
                "assignments": _assignments(dataset, downstream.labels),
                "clusters": _cluster_profiles(dataset, downstream),
            },
        },
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "city_analytics.json"
    json_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "city_analytics.md").write_text(_markdown(result), encoding="utf-8")
    return result


def _markdown(result: dict) -> str:
    lines = [
        "# 2024 city tourism analytics",
        "",
        f"Source: `{result['source']}`",
        "",
        f"Seed: `{result['seed']}`. Features: " + ", ".join(f"`{name}`" for name in result["features"]) + ".",
        "",
        "## K-means",
        "",
        f"Selected k = **{result['kmeans']['selected_k']}** by the highest mean silhouette "
        f"({result['kmeans']['silhouette']:.4f}); within-cluster sum of squares = "
        f"{result['kmeans']['inertia']:.2f}.",
        "",
        "| Cluster | Cities | Mean visitors (10k) | Mean revenue (100m CNY) |",
        "|---:|---|---:|---:|",
    ]
    for cluster in result["kmeans"]["clusters"]:
        lines.append(
            f"| {cluster['cluster']} | {'、'.join(cluster['cities'])} | "
            f"{cluster['mean_raw']['visitors_10k']:.2f} | {cluster['mean_raw']['revenue_100m_cny']:.2f} |"
        )
    lines.extend(
        [
            "",
            "Candidate k values:",
            "",
            "| k | Silhouette | Inertia |",
            "|---:|---:|---:|",
        ]
    )
    for candidate in result["kmeans"]["candidates"]:
        lines.append(
            f"| {candidate['k']} | {candidate['silhouette']:.4f} | {candidate['inertia']:.2f} |"
        )
    lines.extend(
        [
            "",
            "## Self-organizing map",
            "",
            f"Grid: **{result['som']['grid_rows']}×{result['som']['grid_columns']}**, "
            f"epochs = {result['som']['epochs']}. Quantization error = "
            f"{result['som']['quantization_error']:.4f}; topographic error = "
            f"{result['som']['topographic_error']:.4f}.",
            "",
            "| City | Node | Row | Column |",
            "|---|---:|---:|---:|",
        ]
    )
    for city, node in result["som"]["assignments"].items():
        lines.append(f"| {city} | {node['node']} | {node['row']} | {node['column']} |")
    lines.extend(
        [
            "",
            "## Sparse autoencoder",
            "",
            f"Architecture: {len(result['features'])}-{result['sparse_autoencoder']['hidden_dim']}-"
            f"{len(result['features'])} with sigmoid activations, KL sparsity target "
            f"{result['sparse_autoencoder']['sparsity_target']}, weight "
            f"{result['sparse_autoencoder']['sparsity_weight']}, and {result['sparse_autoencoder']['epochs']} epochs.",
            "",
            "| Metric | Value |",
            "|---|---:|",
            f"| Reconstruction MSE | {result['sparse_autoencoder']['reconstruction_mse']:.6f} |",
            f"| Baseline MSE | {result['sparse_autoencoder']['baseline_mse']:.6f} |",
            f"| MSE reduction | {result['sparse_autoencoder']['reconstruction_reduction_pct']:.2f}% |",
            f"| Mean hidden activation | {result['sparse_autoencoder']['mean_hidden_activation']:.4f} |",
            f"| Active fraction (> 0.1) | {result['sparse_autoencoder']['active_fraction']:.4f} |",
            f"| Downstream K-means silhouette (k={result['sparse_autoencoder']['downstream_kmeans']['k']}) "
            f"| {result['sparse_autoencoder']['downstream_kmeans']['silhouette']:.4f} |",
            "",
            "## Reproduce",
            "",
            "```bash",
            "python scripts/run_city_analytics.py",
            "```",
            "",
            "The script uses only the Python standard library. It writes "
            "`data/analytics/city_analytics.json` and this file. The input contains "
            "official 2024 yearbook indicators; the clusters are descriptive and "
            "should not be read as causal estimates or policy recommendations.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--hidden-dim", type=int, default=4)
    parser.add_argument("--sae-epochs", type=int, default=3000)
    parser.add_argument("--som-epochs", type=int, default=1000)
    args = parser.parse_args()
    result = run(
        args.csv,
        args.out_dir,
        args.seed,
        args.hidden_dim,
        args.sae_epochs,
        args.som_epochs,
    )
    print("kmeans k", result["kmeans"]["selected_k"], "silhouette", result["kmeans"]["silhouette"])
    print("som quantization", result["som"]["quantization_error"], "topographic", result["som"]["topographic_error"])
    print(
        "sae reconstruction",
        result["sparse_autoencoder"]["reconstruction_mse"],
        "baseline",
        result["sparse_autoencoder"]["baseline_mse"],
        "reduction",
        result["sparse_autoencoder"]["reconstruction_reduction_pct"],
    )
    print("wrote", args.out_dir / "city_analytics.json")


if __name__ == "__main__":
    main()
