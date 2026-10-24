import urllib.request
import re
import os

css_url = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Kalam:wght@700&family=Permanent+Marker&family=Shadows+Into+Light&display=swap'
req = urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0'})

os.makedirs('fonts_cache_handwriting', exist_ok=True)
try:
    with urllib.request.urlopen(req) as resp:
        css = resp.read().decode('utf-8')
    
    blocks = css.split('@font-face')
    for b in blocks:
        fam_m = re.search(r"font-family:\s*['\"]([^'\"]+)['\"]", b)
        url_m = re.search(r"src:\s*url\((https://[^)]+)\)", b)
        if fam_m and url_m:
            fam = fam_m.group(1).replace(' ', '_')
            furl = url_m.group(1)
            ext = '.font'
            target = os.path.join('fonts_cache_handwriting', f"{fam}{ext}")
            if not os.path.exists(target):
                print(f"Downloading {fam} from {furl}...")
                with urllib.request.urlopen(furl) as fresp, open(target, 'wb') as out:
                    out.write(fresp.read())
            print(f"Ready: {fam} -> {target} ({os.path.getsize(target)} bytes)")
except Exception as e:
    print("Error:", e)
