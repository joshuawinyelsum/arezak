import urllib.request
import re

html = urllib.request.urlopen('https://arezak-staging.vercel.app').read().decode('utf-8')
scripts = re.findall(r'<script src="(/_next/static/chunks/[^"]+\.js)"', html)

for s in scripts:
    url = f"https://arezak-staging.vercel.app{s}"
    try:
        content = urllib.request.urlopen(url).read().decode('utf-8')
        if 'arezak-production' in content:
            print(f"STALE URL FOUND IN {s}")
    except Exception as e:
        pass
print("Done checking.")

