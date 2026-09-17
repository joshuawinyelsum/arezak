import urllib.request
import re

html = urllib.request.urlopen('https://arezak-staging.vercel.app').read().decode('utf-8')
scripts = re.findall(r'<script src="(/_next/static/chunks/[^"]+\.js)"', html)
for s in scripts:
    url = f"https://arezak-staging.vercel.app{s}"
    try:
        content = urllib.request.urlopen(url).read().decode('utf-8')
        if 'arezak-staging-c496' in content:
            print(f"Found old Railway URL in {s}")
        if '/api/v1' in content:
            print(f"Found /api/v1 in {s}")
    except Exception as e:
        pass

