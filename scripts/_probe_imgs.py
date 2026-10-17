# -*- coding: utf-8 -*-
import urllib.request, ssl, re
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
url='http://www.ihchina.cn/Project/info/id/12190.html'
req=urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Referer':'http://www.ihchina.cn'})
body=urllib.request.urlopen(req, timeout=20, context=ctx).read().decode('utf-8','ignore')
# 所有 img 标签完整属性
for m in re.finditer(r'<img[^>]+>', body):
    tag=m.group(0)
    src=re.search(r'src=["\']([^"\']+)["\']', tag)
    alt=re.search(r'alt=["\']([^"\']*)["\']', tag)
    print(src.group(1) if src else '?', '| alt=', alt.group(1) if alt else '')
