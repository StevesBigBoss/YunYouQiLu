"""从山东省统计年鉴 2025 抓取分市旅游真实数据并写入 MySQL。

数据源（山东省统计局）：
- 山东省统计年鉴 2025：http://tjj.shandong.gov.cn/tjnj/nj2025/zk/indexch.htm
- 表 6-20 各市接待国内游客人数（万人次）
- 表 6-21 各市国内旅游收入（亿元）
- 表 6-25 各市接待入境游客人数（万人次）
- 表 6-26 各市入境旅游外汇收入（万美元）

说明：
- 年鉴同时提供 .xls 原表，脚本直接解析，不做 OCR。
- 分市数据按原表存储。原表分市“人次”与全省“游客人数”口径不完全一致，
  部分年份分市合计高于全省总计（2024 年分市合计 108176.79 万人次，
  全省 90815.00 万人次）。脚本只提示、不做平衡调整，也不建议直接相加。
- 原 tourism_heat 是首页模拟月度数据，本脚本不修改它，
  真实数据写入独立表 tourism_stats_real。

用法：
    python scripts/crawl_tourism_stats.py --dry-run
    python scripts/crawl_tourism_stats.py --year 2024
    python scripts/crawl_tourism_stats.py
"""

import argparse
import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path

import pymysql
import requests
import xlrd
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

YEARBOOK_EDITION = "2025"
YEARBOOK_INDEX_URL = f"http://tjj.shandong.gov.cn/tjnj/nj{YEARBOOK_EDITION}/zk/indexch.htm"
XLS_BASE_URL = f"http://tjj.shandong.gov.cn/tjnj/nj{YEARBOOK_EDITION}/zk/html/"
SOURCE_NAME = f"山东省统计年鉴{YEARBOOK_EDITION}"
RAW_DIR = ROOT / "data" / "raw" / f"tourism_yearbook_{YEARBOOK_EDITION}"
TABLE_NAME = "tourism_stats_real"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

CITIES = [
    "济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁",
    "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽",
]
CITY_SET = set(CITIES)

TABLES = [
    {
        "key": "domestic_visitors",
        "file": "06-20.xls",
        "label": "6-20 各市接待国内游客人数",
        "unit": "万人次",
        "paired": False,
    },
    {
        "key": "domestic_revenue",
        "file": "06-21.xls",
        "label": "6-21 各市国内旅游收入",
        "unit": "亿元",
        "paired": False,
    },
    {
        "key": "inbound_visitors",
        "file": "06-25.xls",
        "label": "6-25 各市接待入境游客人数",
        "unit": "万人次",
        "paired": True,
    },
    {
        "key": "inbound_foreign_exchange",
        "file": "06-26.xls",
        "label": "6-26 各市入境旅游外汇收入",
        "unit": "万美元",
        "paired": False,
    },
]

CREATE_SQL = f"""
CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stat_year SMALLINT UNSIGNED NOT NULL COMMENT '统计年份',
  city VARCHAR(32) NOT NULL COMMENT '城市（不含“市”字）',
  domestic_visitors DECIMAL(12,2) NULL COMMENT '接待国内游客（万人次）',
  domestic_visitors_yoy DECIMAL(7,2) NULL COMMENT '国内游客同比（%）',
  domestic_revenue DECIMAL(12,2) NULL COMMENT '国内旅游收入（亿元）',
  domestic_revenue_yoy DECIMAL(7,2) NULL COMMENT '国内旅游收入同比（%）',
  inbound_visitors DECIMAL(12,2) NULL COMMENT '接待入境游客（万人次）',
  inbound_foreign_visitors DECIMAL(12,2) NULL COMMENT '入境游客中的外国人（万人次）',
  inbound_foreign_exchange DECIMAL(12,2) NULL COMMENT '入境旅游外汇收入（万美元）',
  source_name VARCHAR(128) NOT NULL COMMENT '数据来源',
  source_url VARCHAR(512) NOT NULL COMMENT '来源地址',
  source_tables VARCHAR(64) NOT NULL COMMENT '来源表号',
  fetched_at DATETIME NOT NULL COMMENT '抓取时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_year_city (stat_year, city),
  KEY idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='山东统计年鉴分市旅游真实数据'
"""

REQUIRED_COLUMNS = {
    "id", "stat_year", "city",
    "domestic_visitors", "domestic_visitors_yoy",
    "domestic_revenue", "domestic_revenue_yoy",
    "inbound_visitors", "inbound_foreign_visitors",
    "inbound_foreign_exchange",
    "source_name", "source_url", "source_tables", "fetched_at",
}


def cell_text(sheet, row, col):
    return str(sheet.cell_value(row, col)).strip()


def cell_number(sheet, row, col):
    value = sheet.cell_value(row, col)
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_city(raw):
    name = re.sub(r"\s+", "", str(raw))
    if name.endswith("市"):
        name = name[:-1]
    return name if name in CITY_SET else None


def year_value(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = int(value)
        if 1900 <= number <= 2100 and float(number) == float(value):
            return number
        return None
    text = str(value).strip()
    if re.fullmatch(r"20\d{2}(\.0)?", text):
        return int(float(text))
    return None


def find_header_row(sheet):
    for row in range(min(sheet.nrows, 15)):
        texts = [cell_text(sheet, row, col) for col in range(sheet.ncols)]
        years = [year_value(sheet.cell_value(row, col)) for col in range(sheet.ncols)]
        if "Region" in texts and any(year is not None for year in years):
            return row
    raise RuntimeError("未找到表头行（Region + 年份）")


def year_columns(sheet, header_row):
    columns = {}
    for col in range(sheet.ncols):
        year = year_value(sheet.cell_value(header_row, col))
        if year is not None:
            columns[year] = col
    if not columns:
        raise RuntimeError("表头中未找到年份列")
    return columns


def parse_table(sheet, paired):
    header_row = find_header_row(sheet)
    years = year_columns(sheet, header_row)
    foreign_columns = {}
    if paired:
        for year, col in years.items():
            if col + 1 < sheet.ncols and "外国人" in cell_text(sheet, header_row + 1, col + 1):
                foreign_columns[year] = col + 1

    cities = {}
    totals = {}
    for row in range(header_row + 1, sheet.nrows):
        raw_city = cell_text(sheet, row, 0)
        if not raw_city:
            continue
        if "全省" in raw_city or cell_text(sheet, row, 1) == "Total":
            for year, col in years.items():
                totals[year] = {
                    "value": cell_number(sheet, row, col),
                    "foreign": cell_number(sheet, row, foreign_columns[year])
                    if year in foreign_columns else None,
                }
            continue

        city = normalize_city(raw_city)
        if not city:
            continue

        for year, col in years.items():
            value = cell_number(sheet, row, col)
            foreign = (
                cell_number(sheet, row, foreign_columns[year])
                if year in foreign_columns else None
            )
            if value is None and foreign is None:
                continue
            cities.setdefault(city, {})[year] = {"value": value, "foreign": foreign}

    return cities, totals, sorted(years)


def download_table(filename, offline):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / filename
    url = XLS_BASE_URL + filename

    if offline:
        if not path.exists():
            raise SystemExit(f"--offline 模式下缺少缓存文件: {path}")
        return path, url

    try:
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()
        if not response.content.startswith(b"\xd0\xcf\x11\xe0"):
            raise RuntimeError("返回内容不是有效的 .xls 文件")
        path.write_bytes(response.content)
        print(f"已下载: {url} -> {path.relative_to(ROOT)}")
    except Exception as exc:
        if path.exists():
            print(f"下载失败，改用本地缓存 {path.name}: {exc}")
        else:
            raise
    return path, url


def fetch_all(offline):
    parsed = {}
    totals = {}
    all_years = set()
    files = []

    for config in TABLES:
        path, url = download_table(config["file"], offline)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        files.append({
            "file": config["file"],
            "url": url,
            "sha256": digest,
            "bytes": path.stat().st_size,
        })

        workbook = xlrd.open_workbook(str(path))
        sheet = workbook.sheet_by_index(0)
        cities, table_totals, years = parse_table(sheet, config["paired"])
        parsed[config["key"]] = cities
        totals[config["key"]] = table_totals
        all_years.update(years)
        print(
            f"{config['label']}: {len(cities)} 市, "
            f"年份 {years[0]}-{years[-1]}（{len(years)} 个）, 单位 {config['unit']}"
        )

    manifest = {
        "source": SOURCE_NAME,
        "index_url": YEARBOOK_INDEX_URL,
        "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "files": files,
    }
    (RAW_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return parsed, totals, sorted(all_years)


def metric(parsed, key, city, year, sub="value"):
    return parsed[key].get(city, {}).get(year, {}).get(sub)


def yoy(current, previous):
    if current is None or previous in (None, 0):
        return None
    return round((current - previous) / previous * 100, 2)


def build_rows(parsed, years):
    rows = []
    for year in years:
        for city in CITIES:
            domestic_visitors = metric(parsed, "domestic_visitors", city, year)
            domestic_revenue = metric(parsed, "domestic_revenue", city, year)
            inbound_visitors = metric(parsed, "inbound_visitors", city, year)
            inbound_foreign = metric(parsed, "inbound_visitors", city, year, "foreign")
            inbound_fx = metric(parsed, "inbound_foreign_exchange", city, year)

            if domestic_visitors is None and inbound_visitors is None:
                continue

            source_tables = []
            if domestic_visitors is not None:
                source_tables.append("6-20")
            if domestic_revenue is not None:
                source_tables.append("6-21")
            if inbound_visitors is not None or inbound_foreign is not None:
                source_tables.append("6-25")
            if inbound_fx is not None:
                source_tables.append("6-26")

            rows.append({
                "stat_year": year,
                "city": city,
                "domestic_visitors": round(domestic_visitors, 2)
                if domestic_visitors is not None else None,
                "domestic_visitors_yoy": yoy(
                    domestic_visitors,
                    metric(parsed, "domestic_visitors", city, year - 1),
                ),
                "domestic_revenue": round(domestic_revenue, 2)
                if domestic_revenue is not None else None,
                "domestic_revenue_yoy": yoy(
                    domestic_revenue,
                    metric(parsed, "domestic_revenue", city, year - 1),
                ),
                "inbound_visitors": round(inbound_visitors, 2)
                if inbound_visitors is not None else None,
                "inbound_foreign_visitors": round(inbound_foreign, 2)
                if inbound_foreign is not None else None,
                "inbound_foreign_exchange": round(inbound_fx, 2)
                if inbound_fx is not None else None,
                "source_name": SOURCE_NAME,
                "source_url": YEARBOOK_INDEX_URL,
                "source_tables": ",".join(source_tables),
                "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
    return rows


def visitor_years(parsed, years):
    result = []
    for year in years:
        has_domestic = any(
            metric(parsed, "domestic_visitors", city, year) is not None
            for city in CITIES
        )
        has_inbound = any(
            metric(parsed, "inbound_visitors", city, year) is not None
            for city in CITIES
        )
        if has_domestic or has_inbound:
            result.append(year)
    return result


def validate(parsed, totals, years):
    problems = []
    notes = []
    years = visitor_years(parsed, years)

    for config in TABLES:
        key = config["key"]
        for year in years:
            values = [
                metric(parsed, key, city, year)
                for city in CITIES
            ]
            present = [value for value in values if value is not None]
            if not present:
                continue
            if len(present) != len(CITIES):
                missing = [
                    city for city, value in zip(CITIES, values)
                    if value is None
                ]
                problems.append(
                    f"{config['label']} {year} 缺城市: {', '.join(missing)}"
                )
                continue

            total = totals[key].get(year, {}).get("value")
            if total is None:
                continue
            diff = sum(present) - total
            if key in ("domestic_visitors", "domestic_revenue") and year in (2021, 2022):
                if abs(diff) > 0.1:
                    problems.append(
                        f"{config['label']} {year} 分市合计 {sum(present):.2f} "
                        f"与全省 {total:.2f} 不一致（校验年）"
                    )
            elif abs(diff) > 0.1:
                notes.append(
                    f"{config['label']} {year}: 分市合计 {sum(present):.2f} / "
                    f"全省 {total:.2f}，差异 {diff:+.2f}"
                )

    for year in years:
        values = [metric(parsed, "domestic_visitors", city, year) for city in CITIES]
        if all(value is None for value in values):
            continue
        missing = [city for city, value in zip(CITIES, values) if value is None]
        if missing:
            problems.append(
                f"{year} 国内游客数据缺城市: {', '.join(missing)}"
            )

    if problems:
        raise RuntimeError("数据校验失败:\n  - " + "\n  - ".join(problems))

    if notes:
        print("校验提示（原表口径差异，按原表存储）:")
        for note in notes:
            print(f"  - {note}")
    else:
        print("校验通过: 分市合计与全省总计一致")


def print_rows(rows):
    for row in rows:
        parts = [f"{row['stat_year']} {row['city']}"]
        if row["domestic_visitors"] is not None:
            parts.append(f"国内游客 {row['domestic_visitors']:.2f} 万人次")
            if row["domestic_visitors_yoy"] is not None:
                parts.append(f"同比 {row['domestic_visitors_yoy']:+.2f}%")
        if row["domestic_revenue"] is not None:
            parts.append(f"国内收入 {row['domestic_revenue']:.2f} 亿元")
            if row["domestic_revenue_yoy"] is not None:
                parts.append(f"同比 {row['domestic_revenue_yoy']:+.2f}%")
        if row["inbound_visitors"] is not None:
            parts.append(f"入境游客 {row['inbound_visitors']:.2f} 万人次")
        if row["inbound_foreign_exchange"] is not None:
            parts.append(f"入境外汇 {row['inbound_foreign_exchange']:.2f} 万美元")
        print(" | ".join(parts))


def dump_table(cursor, table, target):
    cursor.execute(f"SELECT * FROM `{table}`")
    columns = [item[0] for item in cursor.description]
    data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    target.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    return data


def write_mysql(rows, year_filter):
    if not DB_CONFIG["password"]:
        raise SystemExit("缺少 DB_PASSWORD，请先在 .env 中配置")

    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    try:
        cursor.execute(CREATE_SQL)
        cursor.execute(f"SHOW COLUMNS FROM {TABLE_NAME}")
        columns = {item[0] for item in cursor.fetchall()}
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise RuntimeError(f"{TABLE_NAME} 缺少字段: {', '.join(sorted(missing))}")

        cursor.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
        existing = cursor.fetchone()[0]
        if existing:
            backup = f"{TABLE_NAME}_bak_{stamp}"
            cursor.execute(f"CREATE TABLE `{backup}` AS SELECT * FROM {TABLE_NAME}")
            conn.commit()
            cursor.execute(f"SELECT COUNT(*) FROM `{backup}`")
            backup_count = cursor.fetchone()[0]
            if backup_count != existing:
                raise RuntimeError("备份行数与原表不一致")
            backup_dir = ROOT / "data" / "backup" / f"mysql-{stamp}"
            backup_dir.mkdir(parents=True, exist_ok=True)
            dump_table(cursor, backup, backup_dir / f"{TABLE_NAME}.json")
            print(f"已备份: {backup} ({backup_count} 行), {backup_dir / f'{TABLE_NAME}.json'}")

        conn.begin()
        if year_filter is None:
            cursor.execute(f"DELETE FROM {TABLE_NAME}")
        else:
            cursor.execute(
                f"DELETE FROM {TABLE_NAME} WHERE stat_year = %s",
                (year_filter,),
            )

        cursor.executemany(
            f"""INSERT INTO {TABLE_NAME}
                (stat_year, city, domestic_visitors, domestic_visitors_yoy,
                 domestic_revenue, domestic_revenue_yoy, inbound_visitors,
                 inbound_foreign_visitors, inbound_foreign_exchange,
                 source_name, source_url, source_tables, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [
                (
                    row["stat_year"], row["city"],
                    row["domestic_visitors"], row["domestic_visitors_yoy"],
                    row["domestic_revenue"], row["domestic_revenue_yoy"],
                    row["inbound_visitors"], row["inbound_foreign_visitors"],
                    row["inbound_foreign_exchange"],
                    row["source_name"], row["source_url"], row["source_tables"],
                    row["fetched_at"],
                )
                for row in rows
            ],
        )
        conn.commit()

        cursor.execute(
            f"""SELECT COUNT(*), COUNT(DISTINCT city), MIN(stat_year), MAX(stat_year)
                FROM {TABLE_NAME}"""
        )
        count, city_count, min_year, max_year = cursor.fetchone()
        print(
            f"写入完成: {count} 行, {city_count} 个城市, "
            f"年份 {min_year}-{max_year}"
        )

        for year in sorted({row["stat_year"] for row in rows}):
            cursor.execute(
                f"""SELECT COUNT(*), SUM(domestic_visitors), SUM(domestic_revenue),
                           SUM(inbound_visitors), SUM(inbound_foreign_exchange)
                    FROM {TABLE_NAME} WHERE stat_year = %s""",
                (year,),
            )
            year_count, visitors, revenue, inbound, foreign_exchange = cursor.fetchone()
            visitors_text = "—" if visitors is None else f"{float(visitors):.2f} 万人次"
            revenue_text = "—" if revenue is None else f"{float(revenue):.2f} 亿元"
            inbound_text = "—" if inbound is None else f"{float(inbound):.2f} 万人次"
            fx_text = "—" if foreign_exchange is None else f"{float(foreign_exchange):.2f} 万美元"
            print(
                f"  {year}: {year_count} 市, 国内游客 {visitors_text}, "
                f"国内收入 {revenue_text}, 入境游客 {inbound_text}, "
                f"入境外汇 {fx_text}"
            )

        print(f"\n2024 年分市数据（按国内游客降序）:")
        cursor.execute(
            f"""SELECT city, domestic_visitors, domestic_visitors_yoy,
                       domestic_revenue, domestic_revenue_yoy,
                       inbound_visitors, inbound_foreign_exchange
                FROM {TABLE_NAME}
                WHERE stat_year = 2024
                ORDER BY domestic_visitors DESC"""
        )
        for row in cursor.fetchall():
            print(row)
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, help="只写入指定年份；默认写入全部年份")
    parser.add_argument("--dry-run", action="store_true", help="只解析和校验，不写数据库")
    parser.add_argument("--offline", action="store_true", help="使用本地缓存的 .xls，不重新下载")
    args = parser.parse_args()

    print(f"数据源: {SOURCE_NAME}")
    print(f"年鉴目录: {YEARBOOK_INDEX_URL}")

    parsed, totals, years = fetch_all(args.offline)
    validate(parsed, totals, years)
    years = visitor_years(parsed, years)

    all_rows = build_rows(parsed, years)
    rows = [row for row in all_rows if args.year is None or row["stat_year"] == args.year]
    if not rows:
        raise SystemExit(f"没有找到 {args.year} 年的数据")

    print(
        f"\n解析完成: {len(all_rows)} 行, 年份 {', '.join(map(str, years))}; "
        f"本次写入 {len(rows)} 行"
    )
    if args.year is not None:
        print_rows(rows)
    else:
        print_rows([row for row in rows if row["stat_year"] == 2024])

    if args.dry_run:
        print("\n--dry-run: 未写入数据库")
        return

    write_mysql(rows, args.year)


if __name__ == "__main__":
    main()
