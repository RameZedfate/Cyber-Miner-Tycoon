# -*- coding: utf-8 -*-
# 產生 7 張 1280x720 透明底的中文標語字卡 PNG（疊在對應影片段上）
from PIL import Image, ImageDraw, ImageFilter

FONT = "notosanstc.ttf"
W, H = 1280, 720

CARDS = [
    ("2026・世界的舞台", 60, "bottom"),
    ("上半場，我們拼過", 60, "bottom"),
    ("比數，不代表結局", 60, "bottom"),
    ("下半場，是全新的比賽", 60, "bottom"),
    ("每一步，都是團隊的力量", 60, "bottom"),
    ("把目標，踢進球門！", 60, "bottom"),
    ("下半場，開賽！", 110, "center"),
]

from PIL import ImageFont

def make_card(idx, text, size, pos):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    font = ImageFont.truetype(FONT, size)
    # 先在暫存層畫字，做陰影
    txt_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt_layer)
    bbox = d.textbbox((0, 0), text, font=font, stroke_width=max(4, size // 14))
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (W - tw) // 2 - bbox[0]
    if pos == "bottom":
        y = H - th - 74 - bbox[1]
    else:
        y = (H - th) // 2 - bbox[1]
    # 柔和黑色光暈（投影幕上更好讀）
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    dg.text((x, y), text, font=font, fill=(0, 0, 0, 235),
            stroke_width=max(6, size // 9), stroke_fill=(0, 0, 0, 235))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(glow)
    # 金色描邊 + 白字（世足獎盃金）
    d2 = ImageDraw.Draw(img)
    d2.text((x, y), text, font=font, fill=(255, 255, 255, 255),
            stroke_width=max(3, size // 18), stroke_fill=(212, 175, 55, 255))
    # 底部金色細線裝飾（置底字卡才加）
    if pos == "bottom":
        line_y = H - 46
        d2.rectangle([W // 2 - 160, line_y, W // 2 + 160, line_y + 5],
                     fill=(212, 175, 55, 220))
    img.save(f"card{idx}.png")
    print(f"card{idx}.png OK: {text}")

for i, (t, s, p) in enumerate(CARDS, 1):
    make_card(i, t, s, p)
