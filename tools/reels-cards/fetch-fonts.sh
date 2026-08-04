#!/usr/bin/env bash
# 抓 Noto Sans TC（400/700/900）到 tools/reels-cards/fonts/。
# 字型檔約 7MB 一支，不進 git（見 .gitignore），換機器重跑這支就好。
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/fonts"
mkdir -p "$DIR"

curl -sS --max-time 30 -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900" -o "$DIR/.gf.css"

python3 - "$DIR" <<'PY'
import os, re, sys, urllib.request
d = sys.argv[1]
css = open(os.path.join(d, '.gf.css')).read()
seen = {}
for block in css.split('@font-face'):
    w = re.search(r'font-weight:\s*(\d+)', block)
    u = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+\.ttf)\)', block)
    if w and u and w.group(1) not in seen:
        seen[w.group(1)] = u.group(1)
if not seen:
    sys.exit('Google Fonts 回應裡找不到 ttf，字型沒抓到。')
for w, url in sorted(seen.items()):
    out = os.path.join(d, f'NotoSansTC-{w}.ttf')
    urllib.request.urlretrieve(url, out)
    print(f'  {w:>4}  {os.path.getsize(out):>10,} bytes  ->  {os.path.basename(out)}')
PY

rm -f "$DIR/.gf.css"
echo "字型就緒：$DIR"
