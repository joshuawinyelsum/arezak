import urllib.request
import re

html = urllib.request.urlopen('https://arezak-staging.vercel.app').read().decode('utf-8')
scripts = re.findall(r'<script src="(/_next/static/chunks/app/.*?.js)"', html)

found_api = False
for s in scripts:
    url = f"https://arezak-staging.vercel.app{s}"
    try:
        content = urllib.request.urlopen(url).read().decode('utf-8')
        if 'arezak' in content:
            print(f"Found in {s}:")
            matches = re.findall(r'https://arezak[^\'"]+', content)
            print(matches)
            found_api = True
    except Exception as e:
        print(f"Error fetching {s}: {e}")

if not found_api:
    print("Could not find any API URL in the app chunks.")

