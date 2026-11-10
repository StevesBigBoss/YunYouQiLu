"""将首页 16 市旅游热度按月写入 MySQL。

口径：
- 本月人次：HomeMapView.vue 中 monthlyFlowOf() 在目标月份的取值。
- 同上月人数增长：目标月份与上一个月的人次环比。
- 旅游收益：本月人次 * 450 元/人次 / 1e8，单位亿元。
  450 元/人次来自 mockIndustryKpi（1286.5 亿元 / 2.86 亿人次）。
- 收益增长：沿用 mockIndustryKpi.yoy = 15.8%，为全省同比口径。
  项目没有分市收益增速，因此各市使用同一增速。
"""

import argparse
import json
import math
import os
from datetime import datetime
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

CITY_DATA = [
    ("济南", 328.5, 328500),
    ("青岛", 306.4, 306400),
    ("潍坊", 248.3, 248300),
    ("烟台", 232.7, 232700),
    ("泰安", 215.6, 215600),
    ("临沂", 189.5, 189500),
    ("济宁", 178.3, 178300),
    ("威海", 164.2, 164200),
    ("淄博", 156.2, 156200),
    ("东营", 134.8, 134800),
    ("日照", 118.6, 118600),
    ("滨州", 98.6, 98600),
    ("枣庄", 92.4, 92400),
    ("聊城", 86.4, 86400),
    ("德州", 72.3, 72300),
    ("菏泽", 65.8, 65800),
]

MONTH_FACTORS = [0.58, 0.73, 0.65, 0.87, 1.16, 0.93, 1.24, 1.31, 0.96, 1.27, 0.72, 0.63]
PER_CAPITA_SPEND = 450.0
REVENUE_GROWTH_YOY = 15.8

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS tourism_heat (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stat_month CHAR(7) NOT NULL COMMENT '统计月份 YYYY-MM',
  city VARCHAR(32) NOT NULL COMMENT '城市',
  heat DECIMAL(10,1) NOT NULL COMMENT '首页旅游热度（万人次）',
  month_visitors INT UNSIGNED NOT NULL COMMENT '本月人次（人次）',
  visitor_growth DECIMAL(6,2) NOT NULL COMMENT '同上月人数增长（%，环比）',
  tourism_revenue DECIMAL(12,2) NOT NULL COMMENT '旅游收益（亿元）',
  revenue_growth DECIMAL(6,2) NOT NULL COMMENT '收益增长（%，同比，全省口径）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_month_city (stat_month, city),
  KEY idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='首页旅游热度月度数据'
"""

REQUIRED_COLUMNS = {
    "id", "stat_month", "city", "heat", "month_visitors",
    "visitor_growth", "tourism_revenue", "revenue_growth",
}


def seeded_unit(key):
    h = 2166136261
    for ch in key:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h / 4294967295


def js_round(value):
    return math.floor(value + 0.5)


def monthly_series(city, flow):
    return [
        js_round(flow * 30 * factor * (0.9 + seeded_unit(f"{city}-{i + 1}") * 0.2))
        for i, factor in enumerate(MONTH_FACTORS)
    ]


def parse_month(value):
    try:
        parsed = datetime.strptime(value, "%Y-%m")
    except ValueError:
        raise SystemExit("--month 必须是 YYYY-MM 格式")
    return parsed.strftime("%Y-%m")


def build_rows(stat_month):
    month_index = int(stat_month[5:7]) - 1
    prev_index = (month_index - 1) % 12
    rows = []
    for city, heat, flow in CITY_DATA:
        series = monthly_series(city, flow)
        current = series[month_index]
        previous = series[prev_index]
        visitor_growth = round((current - previous) / previous * 100, 2) if previous else 0.0
        revenue = round(current * PER_CAPITA_SPEND / 1e8, 2)
        rows.append({
            "stat_month": stat_month,
            "city": city,
            "heat": heat,
            "month_visitors": current,
            "visitor_growth": visitor_growth,
            "tourism_revenue": revenue,
            "revenue_growth": REVENUE_GROWTH_YOY,
        })
    return rows


def print_rows(rows):
    for row in rows:
        print(
            f"{row['stat_month']} {row['city']}: "
            f"热度 {row['heat']:.1f} 万人次, "
            f"本月 {row['month_visitors']:,} 人次, "
            f"环比 {row['visitor_growth']:+.2f}%, "
            f"收益 {row['tourism_revenue']:.2f} 亿元, "
            f"收益增长(同比) {row['revenue_growth']:+.2f}%"
        )
    print(
        f"合计: {sum(r['month_visitors'] for r in rows):,} 人次, "
        f"{sum(r['tourism_revenue'] for r in rows):.2f} 亿元"
    )


def dump_table(cursor, table, target):
    cursor.execute(f"SELECT * FROM `{table}`")
    columns = [item[0] for item in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    target.write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", default=datetime.now().strftime("%Y-%m"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    stat_month = parse_month(args.month)
    rows = build_rows(stat_month)
    print(
        f"口径: {stat_month}, {len(rows)} 个城市, "
        f"人均消费 {PER_CAPITA_SPEND:.2f} 元/人次, "
        f"收益同比 {REVENUE_GROWTH_YOY:.2f}%"
    )
    print_rows(rows)
    if args.dry_run:
        return

    if not DB_CONFIG["password"]:
        raise SystemExit("缺少 DB_PASSWORD，请先在 .env 中配置")

    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    try:
        cursor.execute(CREATE_SQL)
        cursor.execute("SHOW COLUMNS FROM tourism_heat")
        columns = {item[0] for item in cursor.fetchall()}
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise RuntimeError(f"tourism_heat 缺少字段: {', '.join(sorted(missing))}")

        cursor.execute("SELECT COUNT(*) FROM tourism_heat")
        existing = cursor.fetchone()[0]
        if existing:
            backup = f"tourism_heat_bak_{stamp}"
            cursor.execute(f"CREATE TABLE `{backup}` AS SELECT * FROM tourism_heat")
            conn.commit()
            cursor.execute(f"SELECT COUNT(*) FROM `{backup}`")
            backup_count = cursor.fetchone()[0]
            if backup_count != existing:
                raise RuntimeError("备份行数与原表不一致")
            backup_dir = ROOT / "data" / "backup" / f"mysql-{stamp}"
            backup_dir.mkdir(parents=True, exist_ok=True)
            dump_table(cursor, backup, backup_dir / "tourism_heat.json")
            print(f"已备份: {backup} ({backup_count} 行), {backup_dir / 'tourism_heat.json'}")

        conn.begin()
        cursor.execute("DELETE FROM tourism_heat WHERE stat_month = %s", (stat_month,))
        cursor.executemany(
            """INSERT INTO tourism_heat
               (stat_month, city, heat, month_visitors, visitor_growth, tourism_revenue, revenue_growth)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            [
                (
                    row["stat_month"], row["city"], row["heat"], row["month_visitors"],
                    row["visitor_growth"], row["tourism_revenue"], row["revenue_growth"],
                )
                for row in rows
            ],
        )
        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM tourism_heat WHERE stat_month = %s", (stat_month,))
        count = cursor.fetchone()[0]
        cursor.execute(
            "SELECT SUM(month_visitors), SUM(tourism_revenue) FROM tourism_heat WHERE stat_month = %s",
            (stat_month,),
        )
        total_visitors, total_revenue = cursor.fetchone()
        print(f"写入完成: {stat_month} 共 {count} 行")
        print(f"校验合计: {int(total_visitors):,} 人次, {float(total_revenue):.2f} 亿元")

        cursor.execute(
            """SELECT city, heat, month_visitors, visitor_growth, tourism_revenue, revenue_growth
               FROM tourism_heat WHERE stat_month = %s ORDER BY month_visitors DESC""",
            (stat_month,),
        )
        for row in cursor.fetchall():
            print(row)
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
