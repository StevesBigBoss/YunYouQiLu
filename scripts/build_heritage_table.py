# -*- coding: utf-8 -*-
"""从 data/normalized/heritage.json 提取每条非遗项目，解析市/县/区/分类，输出 CSV 与汇总。"""
import json, csv, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "normalized", "heritage.json")
OUT_CSV = os.path.join(ROOT, "data", "normalized", "heritage_table.csv")

# 行政区划代码前4位 -> 地级市
CITY = {
    "3701": "济南市", "3702": "青岛市", "3703": "淄博市", "3704": "枣庄市",
    "3705": "东营市", "3706": "烟台市", "3707": "潍坊市", "3708": "济宁市",
    "3709": "泰安市", "3710": "威海市", "3711": "日照市", "3712": "济南市(原莱芜市)",
    "3713": "临沂市", "3714": "德州市", "3715": "聊城市", "3716": "滨州市",
    "3717": "菏泽市",
}

def parse_region(province: str, code: str):
    s = province.replace("山东省", "").strip()
    # 省级
    if s in ("",):
        return "省直", "—（省级单位）"
    # 特殊：省级艺术院团
    if "吕剧院" in s or s.endswith("院") and code == "370112":
        return "济南市", "省直单位（山东省吕剧院）"
    # 自定义代码 990439 莱芜区
    if code == "990439":
        return "济南市", "莱芜区"
    # 异常代码 320482 实际为山东博兴
    if code == "320482":
        return "滨州市", "博兴县"
    # 形如 "济南市" / "济宁市"（市直）
    m = re.match(r"^(.+?市)$", s)
    if m and code.endswith("00"):
        city = m.group(1)
        return _fix_laiwu(city), "市辖区（市直）"
    # 形如 "青岛市市南区" / "潍坊市寒亭区"
    m = re.match(r"^(.+?市)(.+)$", s)
    if m:
        return _fix_laiwu(m.group(1)), m.group(2)
    # 形如 "莒县" / "滕州市" / "章丘市"（县级，无地级市前缀）-> 用代码前4位
    city = CITY.get(code[:4], "省直")
    return _fix_laiwu(city), s


def _fix_laiwu(city: str) -> str:
    return "济南市（原莱芜市）" if city == "莱芜市" else city

def main():
    d = json.load(open(SRC, encoding="utf-8"))
    rows = []
    for it in d["items"]:
        code = it["projectNum"].rsplit("_", 1)[-1].replace("*", "")
        city, county = parse_region(it.get("province", ""), code)
        rows.append({
            "项目名称": it["name"],
            "类别": it["category"],
            "批次": it["batch"],
            "年份": it["batchYear"],
            "市": city,
            "县/区": county,
            "申报地区/单位原文": it.get("province", ""),
            "保护单位": it.get("protectUnit", ""),
            "编号": it.get("num", ""),
        })

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    # 汇总：按市
    from collections import Counter, defaultdict
    by_city = Counter(r["市"] for r in rows)
    by_cat = Counter(r["类别"] for r in rows)
    print(f"总数: {len(rows)}")
    print("\n== 按市分布 ==")
    for c, n in sorted(by_city.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    print("\n== 按类别分布 ==")
    for c, n in sorted(by_cat.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    print(f"\nCSV -> {OUT_CSV}")

if __name__ == "__main__":
    main()
