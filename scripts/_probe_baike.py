import urllib.request, ssl, re, gzip, io
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    'Accept-Encoding':'gzip, deflate'}

def fetch(url):
    req=urllib.request.Request(url, headers=UA)
    r=urllib.request.urlopen(req, timeout=20, context=ctx)
    raw=r.read()
    if r.headers.get('Content-Encoding')=='gzip':
        raw=gzip.decompress(raw)
    return raw.decode('utf-8','ignore')

for name in ['潍坊风筝','吕剧','泰山皮影戏','梁祝传说']:
    try:
        import urllib.parse, json
        kw=urllib.parse.quote(name)
        url=f'https://baike.baidu.com/item/{kw}'
        body=fetch(url)
        og=re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', body)
        title=re.search(r'<title>([^<]+)</title>', body)
        print(name, '->', title.group(1) if title else '?', '| og:image:', og.group(1) if og else None)
    except Exception as e:
        print(name, 'ERR', repr(e)[:150])
