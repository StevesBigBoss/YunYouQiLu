import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path

import pymysql
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": os.getenv("DB_PASSWORD"),
    "database": "dyinfo_schema",
    "charset": "utf8mb4",
}

PROVINCES = {
    "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
    "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
    "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
    "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "香港",
    "澳门", "台湾", "海外",
}

COUNT_RE = re.compile(r"^(\d+(?:\.\d+)?)(万|亿)?\+?$")
META_RE = re.compile(r"^(\d+(?:秒|分钟|小时|天|周|月|年)前|刚刚|昨天|前天)\s*·\s*([\u4e00-\u9fa5]{2,8})$")


def parse_count(text):
    text = str(text or "").strip().replace(",", "")
    match = COUNT_RE.match(text)
    if not match:
        return 0
    value = float(match.group(1))
    unit = match.group(2)
    if unit == "万":
        value *= 10000
    elif unit == "亿":
        value *= 100000000
    return int(value)


def parse_meta(meta):
    match = META_RE.match(str(meta or "").strip())
    if not match:
        return "", ""
    province = match.group(2)
    if province not in PROVINCES:
        province = ""
    return match.group(1), province


def parse_author(info):
    match = re.match(r"^(.+?)粉丝", str(info or "").strip())
    return match.group(1).strip() if match else ""


def parse_video_stats(info):
    numbers = []
    for line in str(info or "").splitlines():
        line = line.strip()
        if COUNT_RE.match(line):
            numbers.append(parse_count(line))
        if len(numbers) == 4:
            break
    while len(numbers) < 4:
        numbers.append(0)
    return numbers


def parse_publish(text):
    match = re.search(r"发布时间[：:]\s*(.+)$", str(text or "").strip())
    return match.group(1).strip() if match else ""


def load_payload(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    video = payload.get("video") or {}
    comments = payload.get("comments") or []
    if not video.get("url") or not video.get("title"):
        raise SystemExit("input JSON missing video.url or video.title")
    if not comments:
        raise SystemExit("input JSON contains no comments")

    aweme_match = re.search(r"/video/(\d+)", video["url"])
    if not aweme_match:
        raise SystemExit("cannot parse aweme_id from video.url")

    stats = parse_video_stats(video.get("info", ""))
    video_row = {
        "aweme_id": aweme_match.group(1),
        "title": video["title"],
        "cover_url": video.get("cover_url", ""),
        "category": "文旅",
        "author": parse_author(video.get("authorInfo", "")),
        "author_gender": "未知",
        "author_province": "未知",
        "likes": stats[0],
        "comments_count": stats[1],
        "shares": stats[2],
        "publish_time": parse_publish(video.get("publish", "") or video.get("info", "")),
    }
    if not video_row["author"]:
        raise SystemExit("cannot parse author from video.authorInfo")
    if not video_row["publish_time"]:
        raise SystemExit("cannot parse video publish time")

    comment_rows = []
    seen = set()
    for comment in comments:
        name = str(comment.get("name", "")).strip()
        content = str(comment.get("content", "")).strip()
        if not name or not content:
            continue
        key = (name, content)
        if key in seen:
            continue
        seen.add(key)
        publish_time, province = parse_meta(comment.get("meta", ""))
        comment_rows.append({
            "user_name": name,
            "gender": "未知",
            "province": province,
            "content": content,
            "likes": parse_count(comment.get("like", "")),
            "publish_time": publish_time,
        })
    if not comment_rows:
        raise SystemExit("no valid comments after cleaning")
    return video_row, comment_rows


def dump_table(cursor, table, target):
    cursor.execute(f"SELECT * FROM `{table}`")
    columns = [item[0] for item in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    Path(target).write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/real/douyin_comments_raw.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    video, comments = load_payload(args.input)
    print(json.dumps({"video": video, "comments": len(comments)}, ensure_ascii=False, indent=2))
    if args.dry_run:
        return

    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    video_backup = f"video_bak_{stamp}"
    comment_backup = f"videocomment_bak_{stamp}"
    backup_dir = Path("data") / "backup" / f"mysql-{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    try:
        cursor.execute(f"CREATE TABLE `{video_backup}` AS SELECT * FROM video")
        cursor.execute(f"CREATE TABLE `{comment_backup}` AS SELECT * FROM videocomment")
        conn.commit()

        cursor.execute(f"SELECT COUNT(*) FROM `{video_backup}`")
        video_backup_count = cursor.fetchone()[0]
        cursor.execute(f"SELECT COUNT(*) FROM `{comment_backup}`")
        comment_backup_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM video")
        video_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM videocomment")
        comment_count = cursor.fetchone()[0]
        if (video_backup_count, comment_backup_count) != (video_count, comment_count):
            raise RuntimeError("backup row counts do not match source tables")

        dump_table(cursor, video_backup, backup_dir / "video.json")
        dump_table(cursor, comment_backup, backup_dir / "videocomment.json")
        print(f"backup tables: {video_backup} ({video_backup_count}), {comment_backup} ({comment_backup_count})")
        print(f"backup files: {backup_dir}")

        conn.begin()
        cursor.execute("DELETE FROM videocomment")
        cursor.execute("DELETE FROM video")
        cursor.execute(
            """INSERT INTO video
               (aweme_id, title, cover_url, category, author, author_gender,
                author_province, likes, comments_count, shares, publish_time)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                video["aweme_id"], video["title"], video["cover_url"], video["category"],
                video["author"], video["author_gender"], video["author_province"],
                video["likes"], video["comments_count"], video["shares"], video["publish_time"],
            ),
        )
        video_id = cursor.lastrowid
        cursor.executemany(
            """INSERT INTO videocomment
               (video_id, user_name, gender, province, content, likes, publish_time)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            [
                (video_id, row["user_name"], row["gender"], row["province"],
                 row["content"], row["likes"], row["publish_time"])
                for row in comments
            ],
        )
        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM video")
        final_video_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM videocomment")
        final_comment_count = cursor.fetchone()[0]
        cursor.execute("SELECT id, aweme_id, title, author, likes, comments_count, shares, publish_time FROM video")
        final_video = cursor.fetchone()
        print(f"imported: video={final_video_count}, comments={final_comment_count}")
        print(f"video row: {final_video}")
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
