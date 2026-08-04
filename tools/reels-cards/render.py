#!/usr/bin/env python3
"""Reels 字卡產生器 — 用 HTML/CSS + 內建 Chromium 產 1080x1920 直式字卡。

為什麼不用 AI 生圖：字卡就是「純色底 + 中文大字 + 簡單圖形」，
AI 生圖每張 2 credits 而且中文字會寫錯；這支腳本一張 0 元、字永遠正確、
品牌色永遠精準，而且改一個字重跑只要幾秒。

用法：
    python3 tools/reels-cards/render.py <spec.json> [-o 輸出目錄]

卡片型別（type）：
    hook       本人照 + 痛點大字（可指定強調色詞）
    statement  純大字，無圖
    image      背景圖（AI 概念圖／螢幕截圖）+ 疊字
    closing    本人照 + 結論 + Day X／100

品牌規則（來自 context/brand-style.md，改那份就要同步改這裡）：
    底 #0E2A47 ／ 主字 #FFFFFF ／ 強調 #FFC72C（一支影片只准用一次）
    字卡一次最多 12 個中文字；下方 20% 是 IG UI 安全區，不放東西
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import mimetypes
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1080, 1920

NAVY = "#0E2A47"
WHITE = "#FFFFFF"
ACCENT = "#FFC72C"

SAFE_BOTTOM_PCT = 20  # IG 底部 UI 遮擋區，不放任何內容
MAX_HEADLINE_CHARS = 12

CHROME_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
]


def find_chrome() -> str:
    for path in CHROME_CANDIDATES:
        if Path(path).exists():
            return path
    for name in ("chromium", "chromium-browser", "google-chrome"):
        found = shutil.which(name)
        if found:
            return found
    sys.exit("找不到 Chromium。請設定 CHROME_CANDIDATES 或安裝 chromium。")


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def font_face_css(fonts_dir: Path | None) -> str:
    """字型內嵌成 data URI，這樣 HTML 不依賴系統字型也能跑。"""
    if not fonts_dir or not fonts_dir.is_dir():
        return ""
    blocks = []
    for weight in (400, 700, 900):
        for cand in (fonts_dir / f"NotoSansTC-{weight}.ttf",):
            if cand.exists():
                blocks.append(
                    "@font-face{font-family:'Noto Sans TC';font-style:normal;"
                    f"font-weight:{weight};src:url({data_uri(cand)}) format('truetype');}}"
                )
    return "".join(blocks)


def motif_svg(name: str) -> str:
    """概念圖形，全部用 SVG 畫。

    刻意不用 AI 生圖：一來每張 2 credits，二來 brand-style.md 第 225 行明令
    禁止「AI 生成的假辦公室情境圖」。這些圖形是抽象的、線條的、可重複的，
    改一次全部影片同步，而且永遠不會出現六根手指。
    """
    C = "rgba(120,190,255,.92)"   # 科技藍線條
    D = "rgba(120,190,255,.28)"   # 暗掉的線條
    W_ = "rgba(255,255,255,.95)"

    def rows(highlight: set[int] | None = None) -> str:
        highlight = highlight or set()
        out = []
        for i in range(9):
            y = 120 + i * 68
            on = i in highlight
            stroke = W_ if on else D
            width = 8 if on else 5
            length = 520 if i % 3 else 460
            out.append(
                f'<line x1="90" y1="{y}" x2="{90+length}" y2="{y}" '
                f'stroke="{stroke}" stroke-width="{width}" stroke-linecap="round"/>'
            )
            out.append(
                f'<line x1="700" y1="{y}" x2="790" y2="{y}" '
                f'stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" opacity="{1 if on else .55}"/>'
            )
            if on:
                out.append(
                    f'<ellipse cx="440" cy="{y}" rx="390" ry="30" fill="none" '
                    f'stroke="{ACCENT if False else W_}" stroke-width="4" opacity=".85"/>'
                )
        frame = (
            f'<rect x="50" y="50" width="780" height="680" rx="28" fill="none" '
            f'stroke="{D}" stroke-width="4"/>'
        )
        return frame + "".join(out)

    def core(cx: int = 440, cy: int = 390, r: int = 96) -> str:
        rays = []
        import math
        for i in range(14):
            a = math.radians(i * (360 / 14))
            x1, y1 = cx + math.cos(a) * (r + 26), cy + math.sin(a) * (r + 26)
            x2, y2 = cx + math.cos(a) * (r + 200), cy + math.sin(a) * (r + 200)
            rays.append(
                f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
                f'stroke="{C}" stroke-width="3" opacity=".5" stroke-linecap="round"/>'
            )
            rays.append(f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="6" fill="{C}" opacity=".65"/>')
        return (
            f'<defs><radialGradient id="g"><stop offset="0%" stop-color="#fff" stop-opacity="1"/>'
            f'<stop offset="55%" stop-color="#8fd0ff" stop-opacity=".85"/>'
            f'<stop offset="100%" stop-color="#8fd0ff" stop-opacity="0"/></radialGradient></defs>'
            + "".join(rays)
            + f'<circle cx="{cx}" cy="{cy}" r="{r*2.1:.0f}" fill="url(#g)" opacity=".35"/>'
            + f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#g)"/>'
        )

    def racks() -> str:
        out = []
        rw, step = 136, 172
        x0 = (880 - (4 * step + rw)) / 2
        for i in range(5):
            x = x0 + i * step
            on = i == 2
            stroke = W_ if on else D
            out.append(
                f'<rect x="{x:.0f}" y="60" width="{rw}" height="660" rx="16" fill="none" '
                f'stroke="{stroke}" stroke-width="{7 if on else 4}"/>'
            )
            for j in range(9):
                y = 108 + j * 72
                out.append(
                    f'<line x1="{x+24:.0f}" y1="{y}" x2="{x+rw-24:.0f}" y2="{y}" '
                    f'stroke="{stroke}" stroke-width="{6 if on else 3}" '
                    f'stroke-linecap="round" opacity="{.95 if on else .45}"/>'
                )
            if on:
                out.append(
                    f'<rect x="{x-18:.0f}" y="42" width="{rw+36}" height="696" rx="24" fill="none" '
                    f'stroke="#fff" stroke-width="3" opacity=".3"/>'
                )
        return "".join(out)

    def phone_locked() -> str:
        flows = []
        for i, y in enumerate((150, 250, 560, 660)):
            flows.append(
                f'<path d="M40 {y} C 260 {y-40}, 620 {y+40}, 840 {y}" fill="none" '
                f'stroke="{C}" stroke-width="4" opacity="{.55 - i*.06:.2f}" stroke-linecap="round"/>'
            )
        phone = (
            f'<rect x="330" y="230" width="220" height="400" rx="34" fill="rgba(0,0,0,.45)" '
            f'stroke="{D}" stroke-width="5"/>'
            f'<rect x="404" y="392" width="72" height="58" rx="10" fill="none" '
            f'stroke="{W_}" stroke-width="6"/>'
            f'<path d="M418 392 v-22 a22 22 0 0 1 44 0 v22" fill="none" '
            f'stroke="{W_}" stroke-width="6" stroke-linecap="round"/>'
        )
        return "".join(flows) + phone

    def envelope_core() -> str:
        trail = (
            f'<path d="M150 520 C 340 300, 560 300, 720 400" fill="none" stroke="{C}" '
            f'stroke-width="4" stroke-dasharray="14 16" opacity=".7" stroke-linecap="round"/>'
        )
        env = (
            f'<g transform="translate(90,440)">'
            f'<rect x="0" y="0" width="190" height="130" rx="14" fill="none" stroke="{W_}" stroke-width="7"/>'
            f'<path d="M6 12 L95 78 L184 12" fill="none" stroke="{W_}" stroke-width="7" stroke-linecap="round"/>'
            f'</g>'
        )
        return trail + env + core(cx=740, cy=400, r=62)

    band = {
        "rows": rows,
        "rows-circled": lambda: rows({2, 4, 7}),
        "core": core,
        "racks": racks,
        "phone-locked": phone_locked,
        "envelope-core": envelope_core,
    }.get(name)

    if band is None:
        sys.exit(f"未知的 motif：{name}（可用：rows, rows-circled, core, racks, phone-locked, envelope-core）")

    return (
        f'<svg class="motif" viewBox="0 0 880 780" xmlns="http://www.w3.org/2000/svg">{band()}</svg>'
    )


def headline_html(text: str, accent_word: str | None) -> str:
    """把強調詞包成 <em>，其餘照原文。強調色一支只准用一次，由呼叫端把關。"""
    esc = html.escape(text)
    if accent_word:
        esc_accent = html.escape(accent_word)
        if esc_accent in esc:
            esc = esc.replace(esc_accent, f"<em>{esc_accent}</em>", 1)
    return esc.replace("\n", "<br>")


HEADLINE_MAX_PX = 172
HEADLINE_BOX_W = W - 160  # 左右各留 80px


def _visual_width(line: str) -> float:
    """以「一個全形字 = 1」估算行寬；半形字算 0.55，標點算 0.5。"""
    total = 0.0
    for ch in line:
        if ch in "，。、！？：；":
            total += 0.5
        elif ord(ch) < 0x2E80:  # 拉丁、數字、空白
            total += 0.55
        else:
            total += 1.0
    return total


def headline_size(text: str) -> int:
    """依最長一行回推字級，確保不會斷在奇怪的地方。

    要控制斷行就在 spec 的 text 裡自己放 \\n —— 那比讓瀏覽器亂折可靠。
    """
    lines = text.split("\n")
    longest = max((_visual_width(l) for l in lines), default=1.0) or 1.0
    fitted = int(HEADLINE_BOX_W / longest)
    return max(72, min(HEADLINE_MAX_PX, fitted))


def build_html(card: dict, day_label: str | None, fonts_dir: Path | None, base: Path) -> str:
    ctype = card.get("type", "statement")
    text = card.get("text", "")
    accent = card.get("accent")
    sub = card.get("sub")

    def resolve(key: str) -> str | None:
        val = card.get(key)
        if not val:
            return None
        p = Path(val)
        if not p.is_absolute():
            p = base / p
        if not p.exists():
            sys.exit(f"找不到圖檔：{p}")
        return data_uri(p)

    photo = resolve("photo")
    bg = resolve("src")

    layers = []
    if bg:
        layers.append(f'<div class="bg" style="background-image:url({bg})"></div>')
        layers.append('<div class="scrim"></div>')
    else:
        layers.append('<div class="grid"></div>')

    if card.get("motif"):
        svg = motif_svg(card["motif"])
        if not text:
            # 沒有字卡時圖形往上移並放大，不然畫面上半部會空掉
            svg = svg.replace('class="motif"', 'class="motif" style="top:430px;height:1000px"')
        layers.append(svg)

    if photo:
        cls = "photo photo-closing" if ctype == "closing" else "photo"
        layers.append(f'<img class="{cls}" src="{photo}" alt="">')

    if day_label:
        layers.append(f'<div class="day">{html.escape(day_label)}</div>')

    if text:
        size = headline_size(text)
        layers.append(
            f'<div class="headline" style="font-size:{size}px">{headline_html(text, accent)}</div>'
        )
    if sub:
        layers.append(f'<div class="sub">{html.escape(sub)}</div>')

    layers.append('<div class="safe"></div>')

    return f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
{font_face_css(fonts_dir)}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{background:{NAVY};font-family:'Noto Sans TC','WenQuanYi Zen Hei',sans-serif;
  -webkit-font-smoothing:antialiased;position:relative}}
.bg{{position:absolute;inset:0;background-size:cover;background-position:center}}
.scrim{{position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(14,42,71,.92) 0%,rgba(14,42,71,.55) 45%,rgba(14,42,71,.95) 100%)}}
.grid{{position:absolute;inset:0;opacity:.16;
  background-image:
    linear-gradient(rgba(120,190,255,.55) 1px,transparent 1px),
    linear-gradient(90deg,rgba(120,190,255,.55) 1px,transparent 1px);
  background-size:120px 120px;
  mask-image:radial-gradient(ellipse 75% 55% at 50% 38%,#000 10%,transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse 75% 55% at 50% 38%,#000 10%,transparent 78%)}}
.motif{{position:absolute;left:60px;right:60px;top:770px;height:740px;
  width:calc(100% - 120px);overflow:visible}}
.photo{{position:absolute;right:-40px;bottom:{int(H*SAFE_BOTTOM_PCT/100)}px;
  height:1000px;object-fit:contain;object-position:bottom right;
  filter:drop-shadow(0 24px 60px rgba(0,0,0,.55))}}
.photo-closing{{right:50%;transform:translateX(50%);height:880px;object-position:bottom center}}
.day{{position:absolute;top:76px;left:80px;font-weight:700;font-size:40px;
  color:rgba(255,255,255,.72);letter-spacing:.04em}}
.headline{{position:absolute;top:250px;left:80px;right:80px;
  font-weight:900;line-height:1.26;color:{WHITE};letter-spacing:.01em;
  text-shadow:0 6px 28px rgba(0,0,0,.45)}}
.headline em{{font-style:normal;color:{ACCENT}}}
.sub{{position:absolute;left:80px;right:80px;top:auto;
  bottom:{int(H*SAFE_BOTTOM_PCT/100)+70}px;
  font-weight:700;font-size:46px;line-height:1.5;color:rgba(255,255,255,.82)}}
.safe{{position:absolute;left:0;right:0;bottom:0;height:{SAFE_BOTTOM_PCT}%}}
</style></head><body>{''.join(layers)}</body></html>"""


def render(spec_path: Path, out_dir: Path) -> list[Path]:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    base = spec_path.parent
    day_label = spec.get("day")
    fonts_dir = spec.get("fonts_dir")
    fonts = Path(fonts_dir) if fonts_dir else None
    if fonts and not fonts.is_absolute():
        fonts = base / fonts

    cards = spec.get("cards", [])
    if not cards:
        sys.exit("spec 裡沒有 cards。")

    # 品牌把關：強調色整支只准出現一次
    accent_cards = [c.get("id", "?") for c in cards if c.get("accent")]
    if len(accent_cards) > 1:
        sys.exit(
            f"強調色只准用在一張卡，但這幾張都指定了 accent：{', '.join(map(str, accent_cards))}\n"
            "（規則見 context/brand-style.md：到處都是重點 = 沒有重點）"
        )

    for c in cards:
        t = (c.get("text") or "").replace("\n", "")
        n = len(t)
        if n > MAX_HEADLINE_CHARS:
            print(f"  ⚠ 卡 {c.get('id','?')}：字卡 {n} 字，超過上限 {MAX_HEADLINE_CHARS} 字", file=sys.stderr)

    chrome = find_chrome()
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []

    with tempfile.TemporaryDirectory() as tmp:
        tmpd = Path(tmp)
        for c in cards:
            cid = str(c.get("id", len(written) + 1)).zfill(2)
            # closing 卡才掛 Day 標記，避免每張都出現
            label = day_label if c.get("type") == "closing" else c.get("day")
            page = tmpd / f"{cid}.html"
            page.write_text(build_html(c, label, fonts, base), encoding="utf-8")
            png = out_dir / f"card-{cid}.png"
            subprocess.run(
                [
                    chrome, "--headless", "--disable-gpu", "--no-sandbox",
                    "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={W},{H}",
                    f"--screenshot={png}", f"file://{page}",
                ],
                check=True, capture_output=True,
            )
            written.append(png)
            print(f"  ✓ {png.name}  {c.get('type','statement'):<9} {c.get('text','')[:20]}")

    return written


def main() -> None:
    ap = argparse.ArgumentParser(description="產 Reels 直式字卡（1080x1920）")
    ap.add_argument("spec", type=Path, help="卡片 JSON 規格檔")
    ap.add_argument("-o", "--out", type=Path, default=Path("outputs/cards"), help="輸出目錄")
    args = ap.parse_args()

    if not args.spec.exists():
        sys.exit(f"找不到 spec：{args.spec}")

    files = render(args.spec, args.out)
    print(f"\n完成 {len(files)} 張 → {args.out}")


if __name__ == "__main__":
    main()
