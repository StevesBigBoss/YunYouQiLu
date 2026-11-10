"""Draw the revised four-layer CCV architecture figure.

The figure matches the released code: the service layer contains a rule-based
Chinese text analyser and an offline OLS forecast utility, not a sparse
autoencoder or a SOM/K-means pipeline.

The four layers are laid out as a 2 x 2 snake so the text remains legible when
the figure is printed at a single-column width.

Run:
    python scripts/draw_architecture.py --out fig1_architecture.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch


LAYERS = [
    {
        "number": 1,
        "title": "Data acquisition layer",
        "title_fill": "#D9EAD3",
        "title_edge": "#6AA84F",
        "body_fill": "#EEF6EA",
        "body_edge": "#A8C89B",
        "text": "#274E13",
        "items": [
            "Node.js crawler (native fetch)",
            "Python targeted crawler",
            "Multi-source collection",
            "Normalized JSON storage",
            "robots.txt, rate limit, user agent",
        ],
    },
    {
        "number": 2,
        "title": "Data processing layer",
        "title_fill": "#FFF2CC",
        "title_edge": "#D6B656",
        "body_fill": "#FFF9E6",
        "body_edge": "#E3CD8A",
        "text": "#5C4400",
        "items": [
            "Data cleaning",
            "Format conversion",
            "Data fusion",
            "Statistics and aggregation",
            "Data and JSON cache",
        ],
    },
    {
        "number": 3,
        "title": "Service layer",
        "title_fill": "#DDEBF7",
        "title_edge": "#6FA8DC",
        "body_fill": "#EDF5FB",
        "body_edge": "#9FC5E8",
        "text": "#17365D",
        "items": [
            "Django service framework",
            "Data models and admin",
            "Demo account endpoints",
            "Rule-based Chinese text analysis",
            "OLS forecast (offline utility)",
        ],
    },
    {
        "number": 4,
        "title": "Presentation layer",
        "title_fill": "#FCE5CD",
        "title_edge": "#E69138",
        "body_fill": "#FDF1E6",
        "body_edge": "#F0B27A",
        "text": "#783F04",
        "items": [
            "Vue 3 and TypeScript",
            "Apache ECharts charts",
            "Leaflet interactive map",
            "Multilingual i18n (10 languages)",
            "Dashboard and layer switching",
        ],
    },
]


def rounded_box(ax, x, y, w, h, facecolor, edgecolor, linewidth=1.2, rounding=0.8, zorder=2):
    patch = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle=f"round,pad=0.02,rounding_size={rounding}",
        facecolor=facecolor,
        edgecolor=edgecolor,
        linewidth=linewidth,
        zorder=zorder,
    )
    ax.add_patch(patch)
    return patch


def draw_panel(ax, layer, x, y, width, height):
    header_height = 6.0
    rounded_box(
        ax,
        x,
        y,
        width,
        height,
        facecolor=layer["body_fill"],
        edgecolor=layer["body_edge"],
        linewidth=1.4,
        rounding=1.2,
        zorder=2,
    )
    rounded_box(
        ax,
        x,
        y + height - header_height,
        width,
        header_height,
        facecolor=layer["title_fill"],
        edgecolor=layer["title_edge"],
        linewidth=1.4,
        rounding=1.0,
        zorder=3,
    )
    badge = Circle(
        (x + 3.4, y + height - header_height / 2),
        radius=1.55,
        facecolor="white",
        edgecolor=layer["title_edge"],
        linewidth=1.2,
        zorder=5,
    )
    ax.add_patch(badge)
    ax.text(
        x + 3.4,
        y + height - header_height / 2,
        str(layer["number"]),
        ha="center",
        va="center",
        fontsize=9.0,
        fontweight="bold",
        color=layer["text"],
        zorder=6,
    )
    ax.text(
        x + width / 2 + 2.0,
        y + height - header_height / 2,
        layer["title"],
        ha="center",
        va="center",
        fontsize=11.5,
        fontweight="bold",
        color=layer["text"],
        zorder=6,
    )

    item_x = x + 2.4
    item_width = width - 4.8
    item_height = 5.1
    item_gap = 1.1
    item_y = y + height - header_height - 2.4 - item_height
    for item in layer["items"]:
        rounded_box(
            ax,
            item_x,
            item_y,
            item_width,
            item_height,
            facecolor="white",
            edgecolor=layer["body_edge"],
            linewidth=0.9,
            rounding=0.55,
            zorder=4,
        )
        ax.text(
            x + width / 2,
            item_y + item_height / 2,
            item,
            ha="center",
            va="center",
            fontsize=9.0,
            color="#1F2430",
            zorder=5,
        )
        item_y -= item_height + item_gap


def draw(ax) -> None:
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")

    width = 44.0
    height = 44.0
    left_x = 2.0
    right_x = 54.0
    top_y = 53.0
    bottom_y = 3.0

    positions = [
        (left_x, top_y),
        (right_x, top_y),
        (right_x, bottom_y),
        (left_x, bottom_y),
    ]
    for layer, (x, y) in zip(LAYERS, positions):
        draw_panel(ax, layer, x, y, width, height)

    arrow_color = "#7F8C8D"
    ax.add_patch(
        FancyArrowPatch(
            (left_x + width + 0.7, top_y + height / 2),
            (right_x - 0.7, top_y + height / 2),
            arrowstyle="-|>",
            mutation_scale=18,
            linewidth=1.8,
            color=arrow_color,
            zorder=1,
        )
    )
    ax.add_patch(
        FancyArrowPatch(
            (right_x + width / 2, top_y - 0.7),
            (right_x + width / 2, bottom_y + height + 0.7),
            arrowstyle="-|>",
            mutation_scale=18,
            linewidth=1.8,
            color=arrow_color,
            zorder=1,
        )
    )
    ax.add_patch(
        FancyArrowPatch(
            (right_x - 0.7, bottom_y + height / 2),
            (left_x + width + 0.7, bottom_y + height / 2),
            arrowstyle="-|>",
            mutation_scale=18,
            linewidth=1.8,
            color=arrow_color,
            zorder=1,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=Path("fig1_architecture.png"))
    args = parser.parse_args()

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(8.2, 7.6), dpi=300)
    draw(ax)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.out, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
