# -*- coding: utf-8 -*-
import urllib.request, ssl, re, sys
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
urls = [
    'http://www.ihchina.cn/Project/info/id/12190.html',
    'https://www.ihchina.cn/Project/info/id/12190.html',
    'http://www.ihchina.cn/Project/info?Id=12190',
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        r = urllib.request.urlopen(req, timeout=15, context=ctx)
        body = r.read().decode('utf-8','ignore')
        print(url, r.status, len(body))
        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', body)
        print(' imgs:', imgs[:15])
        # also look for og:image
        og = re.findall(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', body)
        print(' og:image:', og)
        break
    except Exception as e:
        print(url, 'ERR', repr(e)[:200])
