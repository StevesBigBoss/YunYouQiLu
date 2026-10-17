# -*- coding: utf-8 -*-
import urllib.request, ssl, json, urllib.parse
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={'User-Agent':'TikTokBloggerBot/1.0 (educational project; contact@example.com)'}

def wiki_summary(title):
    url='https://zh.wikipedia.org/api/rest_v1/page/summary/'+urllib.parse.quote(title)
    req=urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            d=json.loads(r.read().decode('utf-8'))
            return d.get('thumbnail',{}).get('source') or d.get('originalimage',{}).get('source')
    except Exception as e:
        return f'ERR {repr(e)[:80]}'

for name in ['潍坊风筝','吕剧','泰山皮影戏','梁祝传说','山东大鼓','胶州秧歌']:
    print(name, '->', wiki_summary(name))
