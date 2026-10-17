# -*- coding: utf-8 -*-
"""抓取 ihchina.cn 每个非遗项目详情页的主图并下载到 static/heritage/。"""
import json, os, re, time, ssl, urllib.request, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "normalized", "heritage.json")
IMG_DIR = os.path.join(ROOT, "static", "heritage")
OUT = os.path.join(ROOT, "data", "normalized", "heritage_images.json")
os.makedirs(IMG_DIR, exist_ok=True)

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
BASE = "http://www.ihchina.cn"

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": BASE})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.read()

def get_main_image(project_id):
    url = f"{BASE}/Project/info/id/{project_id}.html"
    html = fetch(url).decode("utf-8", "ignore")
    # 所有 Uploads/Picture 图片
    imgs = re.findall(r'<img[^>]+src=["\']([^"\']*?/Uploads/Picture/[^"\']+)["\']', html)
    # 去重保序
    seen = set(); uniq = []
    for x in imgs:
        if x not in seen:
            seen.add(x); uniq.append(x)
    return uniq

def download(img_path, project_id):
    ext = os.path.splitext(img_path)[1].split("?")[0] or ".jpg"
    if ext.lower() not in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"):
        ext = ".jpg"
    local = os.path.join(IMG_DIR, f"{project_id}{ext}")
    if os.path.exists(local) and os.path.getsize(local) > 1000:
        return local, f"{BASE}{img_path}"
    data = fetch(f"{BASE}{img_path}")
    with open(local, "wb") as f:
        f.write(data)
    return local, f"{BASE}{img_path}"

def main():
    d = json.load(open(SRC, encoding="utf-8"))
    items = d["items"]
    results = {}
    if os.path.exists(OUT):
        results = json.load(open(OUT, encoding="utf-8"))

    total = len(items)
    for i, it in enumerate(items, 1):
        pid = str(it["id"])
        if pid in results and results[pid].get("local"):
            print(f"[{i}/{total}] {pid} skip (already)")
            continue
        try:
            imgs = get_main_image(pid)
            if not imgs:
                results[pid] = {"name": it["name"], "images": [], "local": None, "src": None}
                print(f"[{i}/{total}] {pid} {it['name']} NO IMG")
            else:
                local, src = download(imgs[0], pid)
                results[pid] = {
                    "name": it["name"],
                    "images": [f"{BASE}{x}" for x in imgs],
                    "local": os.path.relpath(local, ROOT).replace("\\", "/"),
                    "src": src,
                }
                print(f"[{i}/{total}] {pid} {it['name']} -> {os.path.basename(local)} ({len(imgs)} imgs)")
        except Exception as e:
            results[pid] = {"name": it["name"], "error": repr(e)[:200]}
            print(f"[{i}/{total}] {pid} ERR {repr(e)[:120]}")
        # checkpoint
        if i % 10 == 0:
            json.dump(results, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.2)

    json.dump(results, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    ok = sum(1 for v in results.values() if v.get("local"))
    print(f"\nDONE. {ok}/{total} images downloaded -> {IMG_DIR}")

if __name__ == "__main__":
    main()
