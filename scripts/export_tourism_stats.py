"""把 tourism_stats_real 导出为前端可直接引用的 TypeScript 快照。"""

import argparse
import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": os.getenv("DB_PASSWORD"),
    "database": "dyinfo_schema",
    "charset": "utf8mb4",
}

CITIES = [
    "济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁",
    "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽",
]

OUTPUT = ROOT / "src" / "data" / "tourismStats.ts"


def number(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    text = f"{float(value):.2f}".rstrip("0").rstrip(".")
    return text or "0"


def load_rows(cursor):
    cursor.execute(
        """SELECT stat_year, city, domestic_visitors, domestic_visitors_yoy,
                  domestic_revenue, domestic_revenue_yoy, inbound_visitors,
                  inbound_foreign_visitors, inbound_foreign_exchange,
                  source_name, source_url, fetched_at
           FROM tourism_stats_real
           ORDER BY stat_year, city"""
    )
    columns = [item[0] for item in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def build(rows, year):
    by_key = {(row["stat_year"], row["city"]): row for row in rows}
    years = sorted({row["stat_year"] for row in rows})
    if year not in years:
        raise SystemExit(f"tourism_stats_real 中没有 {year} 年数据")

    missing = [city for city in CITIES if (year, city) not in by_key]
    if missing:
        raise SystemExit(f"{year} 年缺少城市: {', '.join(missing)}")

    years = list(range(min(years), max(years) + 1))
    current_rows = [by_key[(year, city)] for city in CITIES]
    source_names = {row["source_name"] for row in current_rows}
    source_urls = {row["source_url"] for row in current_rows}
    if len(source_names) != 1 or len(source_urls) != 1:
        raise SystemExit("同年数据来源不一致，无法生成快照")

    fetched_at = max(row["fetched_at"] for row in current_rows)
    lines = [
        "import type { CityTourismStat, CityTourismTrend } from '../types'",
        "",
        f"export const TOURISM_STATS_YEAR = {year}",
        f"export const TOURISM_STATS_SOURCE = '{next(iter(source_names))}'",
        f"export const TOURISM_STATS_URL = '{next(iter(source_urls))}'",
        f"export const TOURISM_STATS_FETCHED_AT = '{fetched_at.strftime('%Y-%m-%d %H:%M:%S')}'",
        f"export const TOURISM_TREND_YEARS = [{', '.join(str(y) for y in years)}]",
        "",
        "export const CITY_TOURISM_STATS: CityTourismStat[] = [",
    ]
    for row in current_rows:
        city = row["city"]
        visitors = number(row["domestic_visitors"])
        visitors_yoy = number(row["domestic_visitors_yoy"])
        revenue = number(row["domestic_revenue"])
        revenue_yoy = number(row["domestic_revenue_yoy"])
        inbound = number(row["inbound_visitors"])
        inbound_foreign = number(row["inbound_foreign_visitors"])
        inbound_fx = number(row["inbound_foreign_exchange"])
        lines.append(
            f"  {{ city: '{city}', year: {year}, visitors: {visitors}, "
            f"visitorsYoy: {visitors_yoy}, revenue: {revenue}, "
            f"revenueYoy: {revenue_yoy}, inboundVisitors: {inbound}, "
            f"inboundForeignVisitors: {inbound_foreign}, inboundFx: {inbound_fx} }},"
        )
    lines.extend([
        "]",
        "",
        "export const CITY_TOURISM_TREND: CityTourismTrend[] = [",
    ])
    for city in CITIES:
        visitors = []
        revenue = []
        for item_year in years:
            row = by_key.get((item_year, city))
            visitors.append(number(row["domestic_visitors"]) if row else "null")
            revenue.append(number(row["domestic_revenue"]) if row else "null")
        lines.append(
            f"  {{ city: '{city}', visitors: [{', '.join(visitors)}], "
            f"revenue: [{', '.join(revenue)}] }},"
        )
    lines.extend(["]", ""])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not DB_CONFIG["password"]:
        raise SystemExit("缺少 DB_PASSWORD，请先在 .env 中配置")

    conn = pymysql.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()
        rows = load_rows(cursor)
        cursor.close()
    finally:
        conn.close()

    content = build(rows, args.year)
    if args.dry_run:
        print(content)
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(content, encoding="utf-8")
    print(f"已生成 {OUTPUT} ({len(rows)} 行源数据, {args.year} 年快照)")


if __name__ == "__main__":
    main()
