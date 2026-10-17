# -*- coding: utf-8 -*-
"""
黄河流域生态治理 - 抖音视频&评论爬虫
功能：
  1. 按关键词搜索抖音视频（标题、封面、分类、作者、点赞/评论/分享数）
  2. 爬取每个视频的评论（用户昵称、性别、省份、评论内容、点赞数）
  3. 写入 MySQL 数据库（Video + VideoComment 表）

使用方法：
  1. 先用浏览器登录抖音网页版，复制 Cookie 填入下方 COOKIE 变量
  2. 运行: python yellow_river_spider.py
  3. 如果真实爬取失败，脚本自动生成模拟数据（SEED_MODE=True）
"""

import requests
import json
import time
import random
import pymysql
from datetime import datetime

# ==================== 数据库配置 ====================
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "database": "dyinfo_schema",
    "charset": "utf8mb4",
}

# ==================== 爬取配置 ====================
KEYWORD = "黄河流域生态治理"
MAX_VIDEOS = 50          # 最多爬取视频数
COMMENTS_PER_VIDEO = 20  # 每个视频爬取评论数

# 浏览器 Cookie（登录抖音网页版后复制）
COOKIE = ""  # 例: "ttwid=xxx; msToken=xxx; sessionid=xxx;"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.douyin.com/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cookie": COOKIE,
}

# 沿黄九省
YELLOW_RIVER_PROVINCES = ["山东", "河南", "陕西", "山西", "内蒙古", "甘肃", "宁夏", "四川", "青海"]

# 视频分类
CATEGORIES = ["生态治理", "黄河保护", "节水灌溉", "水土保持", "湿地保护", "生物多样性", "防洪减灾", "水资源利用"]

# ==================== 模拟数据生成（用于无Cookie时） ====================
SEED_VIDEOS = [
    ("黄河三角洲湿地生态修复成效显著", "东营黄河入海口", "生态治理"),
    ("山东黄河滩区搬迁居民新生活", "济南黄河边", "黄河保护"),
    ("黄河流域水土保持治理纪实", "洛阳伊河", "水土保持"),
    ("宁夏黄河灌区节水改造工程", "银川平原", "节水灌溉"),
    ("河南黄河湿地公园候鸟栖息地", "郑州黄河湿地", "湿地保护"),
    ("山西黄河沿岸荒山变绿洲", "吕梁山区", "生态治理"),
    ("陕西黄河流域水质监测实况", "渭南黄河段", "水资源利用"),
    ("甘肃黄河上游水土保持小流域治理", "定西黄土高原", "水土保持"),
    ("内蒙古黄河防凌汛工作一线", "河套平原", "防洪减灾"),
    ("四川若尔盖湿地涵养黄河源头", "阿坝草原", "生物多样性"),
    ("青海三江源黄河源头生态保护", "玉树藏族自治州", "黄河保护"),
    ("济南百里黄河风景区建设", "济南槐荫区", "黄河保护"),
    ("黄河下游滩区生态修复最新进展", "滨州黄河段", "生态治理"),
    ("东营黄河口野生鸟类种群恢复", "东营自然保护区", "生物多样性"),
    ("郑州黄河生态文化公园建设", "郑州邙山", "黄河保护"),
    ("黄河流域跨省生态补偿机制探索", "三门峡水库", "生态治理"),
    ("兰州黄河百里风情线治理成效", "兰州黄河楼", "黄河保护"),
    ("银川黄河湿地植被恢复工程", "银川阅海", "湿地保护"),
    ("内蒙古黄河大峡谷生态旅游开发", "鄂尔多斯", "生态治理"),
    ("渭南黄河潼关古渡口生态修复", "潼关港口", "生态治理"),
]

SEED_COMMENTS = [
    "黄河生态越来越好，支持治理", "点赞山东治理黄河的成效", "保护母亲河人人有责",
    "我们老家的黄河水变清了", "生态治理是百年大计", "山东沿黄发展前途无量",
    "看到湿地恢复很感动", "节水灌溉真的很有必要", "水土保持不能放松",
    "黄河大堤修得很坚固", "希望黄河流域发展越来越好", "支持生态优先绿色发展",
    "黄河入海流，生态大文章", "小时候黄河水很浑，现在好多了", "治理成果看得见摸得着",
    "希望多建湿地公园", "生物多样性保护很重要", "防洪减灾不能掉以轻心",
    "黄河文化旅游带建设正当时", "母亲河养育了我们", "治理黄河重在保护要在治理",
    "山东走在黄河流域高质量发展前列", "生态补偿机制值得推广", "灌区改造惠及千万农民",
    "黄河三角洲越来越美了", "保护黄河就是保护未来", "看到变化真的很欣慰",
    "希望加大生态修复投入", "沿黄九省协同治理很关键", "绿水青山就是金山银山",
]

SEED_USERS = ["黄河守护者", "齐鲁大地", "大河上下", "母亲河卫士", "生态观察员",
              "山东本地人", "黄河边长大", "水利工作者", "环保志愿者", "旅游达人",
              "济南市民", "东营渔民", "河南老乡", "陕西老陕", "山西煤老板",
              "内蒙牧人", "甘肃学子", "宁夏花儿", "四川吃货", "青海牧民"]


def get_db_connection():
    return pymysql.connect(**DB_CONFIG)


def save_video(conn, video_data):
    """插入或更新视频"""
    cursor = conn.cursor()
    sql = """INSERT INTO Video (aweme_id, title, cover_url, category, author, author_gender,
             author_province, likes, comments_count, shares, publish_time)
             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
             ON DUPLICATE KEY UPDATE title=VALUES(title), likes=VALUES(likes)"""
    try:
        cursor.execute(sql, (
            video_data["aweme_id"], video_data["title"], video_data["cover_url"],
            video_data["category"], video_data["author"], video_data["author_gender"],
            video_data["author_province"], video_data["likes"],
            video_data["comments_count"], video_data["shares"], video_data["publish_time"]
        ))
        conn.commit()
        return cursor.lastrowid or video_data["aweme_id"]
    except Exception as e:
        conn.rollback()
        print(f"  [视频保存失败] {e}")
        return None


def save_comment(conn, video_id, comment_data):
    """插入评论"""
    cursor = conn.cursor()
    sql = """INSERT INTO VideoComment (video_id, user_name, gender, province, content, likes, publish_time)
             VALUES (%s,%s,%s,%s,%s,%s,%s)"""
    try:
        cursor.execute(sql, (
            video_id, comment_data["user_name"], comment_data["gender"],
            comment_data["province"], comment_data["content"],
            comment_data["likes"], comment_data["publish_time"]
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"  [评论保存失败] {e}")


def seed_mode(conn):
    """无Cookie时生成模拟数据"""
    print("=" * 60)
    print("进入模拟数据生成模式（无Cookie）")
    print("=" * 60)

    for idx, (title, location, category) in enumerate(SEED_VIDEOS):
        aweme_id = f"seed_{idx + 1:04d}"
        video_data = {
            "aweme_id": aweme_id,
            "title": f"【{KEYWORD}】{title}",
            "cover_url": f"/static/yellow_river/cover_{idx + 1:02d}.jpg",
            "category": category,
            "author": random.choice(SEED_USERS),
            "author_gender": random.choice(["男", "女"]),
            "author_province": random.choice(YELLOW_RIVER_PROVINCES),
            "likes": random.randint(500, 50000),
            "comments_count": random.randint(50, 2000),
            "shares": random.randint(20, 800),
            "publish_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        vid = save_video(conn, video_data)
        if vid is None:
            continue
        print(f"  视频[{idx + 1}] {title[:20]}... 点赞{video_data['likes']}")

        # 为每个视频生成评论
        for _ in range(random.randint(10, COMMENTS_PER_VIDEO)):
            comment_data = {
                "user_name": random.choice(SEED_USERS) + str(random.randint(1, 99)),
                "gender": random.choice(["男", "女"]),
                "province": random.choice(YELLOW_RIVER_PROVINCES + ["北京", "上海", "广东", "江苏", "浙江"]),
                "content": random.choice(SEED_COMMENTS),
                "likes": random.randint(0, 500),
                "publish_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
            }
            save_comment(conn, vid, comment_data)

        time.sleep(0.05)

    print(f"\n完成！共生成 {len(SEED_VIDEOS)} 个视频及其评论数据")


def scrape_mode(conn):
    """真实爬取抖音数据"""
    print("=" * 60)
    print("开始爬取抖音数据...")
    print("=" * 60)

    search_url = "https://www.douyin.com/aweme/v1/web/search/item/"
    offset = 0

    while offset < MAX_VIDEOS:
        params = {
            "keyword": KEYWORD,
            "count": 20,
            "offset": offset,
            "device_platform": "webapp",
            "aid": "6383",
        }
        try:
            resp = requests.get(search_url, params=params, headers=HEADERS, timeout=10)
            data = resp.json()
            items = data.get("data", [])
            if not items:
                print("  没有更多数据了")
                break

            for item in items:
                aweme = item.get("aweme_info", {})
                aweme_id = aweme.get("aweme_id", "")
                if not aweme_id:
                    continue

                video_data = {
                    "aweme_id": aweme_id,
                    "title": aweme.get("desc", ""),
                    "cover_url": aweme.get("video", {}).get("cover", {}).get("url_list", [""])[0],
                    "category": random.choice(CATEGORIES),
                    "author": aweme.get("author", {}).get("nickname", ""),
                    "author_gender": str(aweme.get("author", {}).get("gender", 0)),
                    "author_province": aweme.get("author", {}).get("country", "山东"),
                    "likes": aweme.get("statistics", {}).get("digg_count", 0),
                    "comments_count": aweme.get("statistics", {}).get("comment_count", 0),
                    "shares": aweme.get("statistics", {}).get("share_count", 0),
                    "publish_time": datetime.fromtimestamp(aweme.get("create_time", 0)).strftime("%Y-%m-%d %H:%M"),
                }
                vid = save_video(conn, video_data)
                print(f"  视频: {video_data['title'][:30]}...")

                # 爬取评论
                comment_url = "https://www.douyin.com/aweme/v1/web/comment/list/"
                c_params = {"aweme_id": aweme_id, "count": COMMENTS_PER_VIDEO, "cursor": 0}
                try:
                    c_resp = requests.get(comment_url, params=c_params, headers=HEADERS, timeout=10)
                    c_data = c_resp.json()
                    for c in c_data.get("comments", []):
                        comment_data = {
                            "user_name": c.get("user", {}).get("nickname", ""),
                            "gender": str(c.get("user", {}).get("gender", 0)),
                            "province": c.get("user", {}).get("country", ""),
                            "content": c.get("text", ""),
                            "likes": c.get("digg_count", 0),
                            "publish_time": datetime.fromtimestamp(c.get("create_time", 0)).strftime("%Y-%m-%d %H:%M"),
                        }
                        save_comment(conn, vid, comment_data)
                except Exception as e:
                    print(f"  [评论爬取失败] {e}")

                time.sleep(1)

            offset += 20
        except Exception as e:
            print(f"  [爬取失败] {e}")
            print("  切换到模拟数据模式...")
            seed_mode(conn)
            return


if __name__ == "__main__":
    conn = get_db_connection()
    print(f"数据库连接成功: {DB_CONFIG['database']}")
    print(f"关键词: {KEYWORD}")

    if COOKIE and len(COOKIE) > 50:
        scrape_mode(conn)
    else:
        seed_mode(conn)

    conn.close()
    print("\n全部完成！")
