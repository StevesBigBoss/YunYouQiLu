# -*- coding: utf-8 -*-
"""根据 heritage_image_map.json 下载每个项目的代表图片到 static/heritage/。
按 heritage.json 中的 item.id 命名；同名项目共享同一张图（缓存避免重复下载）。"""
import json, os, time, shutil, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "static", "heritage")
os.makedirs(IMG_DIR, exist_ok=True)

# 清空旧图
for f in os.listdir(IMG_DIR):
    try:
        os.remove(os.path.join(IMG_DIR, f))
    except Exception:
        pass

heritage = json.load(open(os.path.join(ROOT, "data/normalized/heritage.json"), encoding="utf-8"))
img_map = json.load(open(os.path.join(ROOT, "data/normalized/heritage_image_map.json"), encoding="utf-8"))

opener = urllib.request.build_opener()
opener.addheaders = [("User-Agent", "Mozilla/5.0")]
urllib.request.install_opener(opener)
ok, fail = 0, 0
name_cache = {}

for item in heritage["items"]:
    pid = str(item["id"])
    name = item["name"]
    url = img_map.get(name)
    local = os.path.join(IMG_DIR, f"{pid}.jpg")
    if not url:
        print(f"[NO URL] {pid} {name}")
        fail += 1
        continue
    if name in name_cache:
        shutil.copyfile(name_cache[name], local)
        ok += 1
        print(f"[COPY] {pid} {name} <- {os.path.basename(name_cache[name])}")
        continue
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = resp.read()
        with open(local, "wb") as f:
            f.write(data)
        name_cache[name] = local
        ok += 1
        print(f"[OK] {pid} {name} ({len(data)//1024}KB)")
    except Exception as e:
        print(f"[FAIL] {pid} {name}: {e}")
        fail += 1
    time.sleep(0.15)

print(f"\nDone. ok={ok} fail={fail} files_on_disk={len(os.listdir(IMG_DIR))}")
