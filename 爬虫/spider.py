import os
from dotenv import load_dotenv
import random
from faker import Faker
import pymysql
from datetime import datetime

load_dotenv()

conn = pymysql.connect(host="127.0.0.1",port = 3306,user="root",password=os.getenv("DB_PASSWORD"),database="tiktok_blogger_web",charset="utf8mb4",)
cursor = conn.cursor()

header = {
    'authority':'www.xhs.com',
    'method':'GET',
    'path':f'/api/pc/list/feed?channel_id=23423&min_behot_time=1432342342342&offset=0&refresh_count=1&category=pc_profile_channel&client_extra_params=%7B%22short_video_item%22:%22filter%22%7D&aid=24&app_name=toutiao_web&_signature=_02B4Z6wo009015uETRwAAIDApi1XgS-hAauboEmAAIMIJ1csXu3V1KXb8WsSPi7V4uS5Vvid66s8n28TwBw7Vit85ktybQLaLsWAu2-6SgcfSERBixn4ZONJlsfMekmbommhIxzThZtwkqDkba',
    'scheme':'https',
    'Accept-Language':'zh-CN,zh;q=0.9',
    'Cache-Control':'no-cache',
    'Cookie': os.getenv("TIKTOK_COOKIE", ""),
    'Pragma':'no-cache',
    'Referer':'https://www.xhs.com/?source=m_redirect&W2atIF=1',
    'Sec-Ch-Ua':'"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile':'?0',
    'Sec-Ch-Ua-Platform':'"Windows"',
    'Sec-Fetch-Dest':'empty',
    'Sec-Fetch-Mode':'cors',
    'Sec-Fetch-Site':'same-origin',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}


Territory_li = ["香港","上海","台湾","广东","四川","天津","陕西","福建","云南","湖南","河南","甘肃","内蒙古","江苏","北京","浙江","江西","湖北","山西","山东","广西",
               "贵州","新疆","辽宁","河北","安徽","海南","青海","澳门","宁夏","黑龙江","西藏","重庆","吉林"]
category_li = ["美妆","护肤","美食","时尚","生活","母婴","数码","旅游","科技"]
content_li = ["帅哥","时尚","我","男神","美女","生活","美好","希望","宝妈","宝马","学生","3年","每天","想","收入",
              "大家","爱你","饭","野路子","闷声","太香了","努力","真的","日常","存钱","搬砖","今日","网站","整理"]
f=Faker(locale='zh_CN')
for i in range(3000):
    nkname  = f.user_name()+f.word()
    gender = random.choice(["男","女"])
    age = str(random.randint(18, 85))
    category = random.choice(category_li)
    like_count = str(random.randint(1000, 100000))
    province = random.choice(Territory_li)
    follow_count = str(random.randint(1000, 1000000))
    fans_count = str(random.randint(1000, 1000000))
    received_likes = str(random.randint(1000, 1000000))
    is_vip = random.choice(["是","否"])
    commentsLen = str(random.randint(1000, 1000000))
    detailIntro = "".join(random.sample(content_li,8))

    try:
        sql = "INSERT INTO TiktokUser(nkname,gender,age,category,like_count,province,follow_count,fans_count,received_likes,is_vip,commentsLen,detailIntro) VALUES ('%s','%s','%s', '%s',  '%s',  '%s','%s', '%s',  '%s','%s', '%s',  '%s')" % (
            nkname,gender,age,category,like_count,province,follow_count,fans_count,received_likes,is_vip,commentsLen,detailIntro)

        cursor.execute(sql)
        conn.commit()
        print(nkname)
    except Exception as e:
        print(e)
        pass
cursor.close()
conn.close()