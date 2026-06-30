# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def f(sz): return ImageFont.truetype(FONT, sz)

# ---------- data ----------
title = "釜山五天四夜 9人 對帳表"
subtitle = "收款人：方翊華　（金額為每人要轉給方翊華的數字，單位 NT$）"

headers = ["姓名", "機票", "飯店", "交通", "SIM", "餐費", "應分攤", "已先付", "付給方翊華"]
# 交通 = 膠囊+PASS = 2067 ; 機票=7886 ; 飯店=7782.5 ; SIM=16.5 ; 餐費=1965
rows = [
    ["方翊華 (團主)", "—", "—", "—", "—", "—", "19,799.5", "全部先墊", "收款人"],
    ["方翊帆", "7,886", "7,782.5", "2,067", "99", "1,965", "19,799.5", "—", "19,799.5"],
    ["詹有貴", "7,886", "7,782.5", "2,067", "—", "1,965", "19,700.5", "16,635", "3,065.5"],
    ["陳錦雪", "7,886", "7,782.5", "2,067", "99", "1,965", "19,799.5", "—", "19,799.5"],
    ["周政平", "—", "—", "2,067", "99", "1,965", "4,131", "—", "4,131"],
    ["周虹儀", "—", "—", "2,067", "99", "1,965", "4,131", "—", "4,131"],
    ["周謙妤", "—", "—", "2,067", "99", "1,965", "4,131", "—", "4,131"],
    ["林冠州", "—", "7,782.5", "2,067", "—", "1,965", "11,814.5", "—", "11,814.5"],
    ["鐘婉婷", "—", "7,782.5", "2,067", "—", "1,965", "11,814.5", "—", "11,814.5"],
]
total_row = ["合計", "", "", "", "", "", "", "", "78,686.5"]

notes = [
    "● 機票：圖二 高雄↔釜山 4 人均分 31,544 → 每人 7,886",
    "● 飯店：圖一 6 人均分 46,695 → 每人 7,782.5（周家三人房另付、不在內）",
    "● 交通：膠囊 3,413 + 釜山PASS 15,190 = 18,603，9 人均分 → 每人 2,067",
    "● 餐費：詹有貴 16,635 + 方翊華 1,050 = 17,685，9 人均分 → 每人 1,965",
    "● SIM：一人一張、每張 99（方翊華/方翊帆/陳錦雪/周家3人 共6張；詹有貴自買、台北2人自用 不計）",
    "★ 詹有貴已先墊餐費 16,635，扣抵後只需付 3,065.5",
    "★ 林冠州、鐘婉婷 機票台北自付；周政平、周虹儀、周謙妤 機票+飯店已自付",
]

# ---------- layout ----------
col_w = [180, 95, 105, 90, 75, 90, 110, 100, 140]
W = sum(col_w) + 60
row_h = 52
header_h = 56
top = 30
title_h = 60
sub_h = 40
table_top = top + title_h + sub_h + 10
n_rows = len(rows)
table_h = header_h + (n_rows + 1) * row_h
notes_top = table_top + table_h + 30
H = notes_top + len(notes) * 34 + 30

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)

# colors
C_HEAD = (37, 99, 175)
C_HEAD_PAY = (198, 40, 40)
C_ROWA = (244, 248, 255)
C_ROWB = (255, 255, 255)
C_TOTAL = (255, 244, 214)
C_LINE = (180, 195, 215)
C_PAYCOL = (255, 235, 235)

# title
d.text((30, top), title, font=f(42), fill=(20, 30, 60))
d.text((30, top + title_h - 6), subtitle, font=f(22), fill=(90, 100, 120))

x0 = 30
# header
y = table_top
x = x0
for i, h in enumerate(headers):
    col = C_HEAD_PAY if i == len(headers) - 1 else C_HEAD
    d.rectangle([x, y, x + col_w[i], y + header_h], fill=col)
    fnt = f(24)
    bb = d.textbbox((0, 0), h, font=fnt)
    tw = bb[2] - bb[0]
    d.text((x + (col_w[i] - tw) / 2, y + (header_h - (bb[3]-bb[1])) / 2 - bb[1]), h, font=fnt, fill="white")
    x += col_w[i]

# data rows
y += header_h
for r_idx, row in enumerate(rows):
    base = C_ROWA if r_idx % 2 == 0 else C_ROWB
    x = x0
    for i, cell in enumerate(row):
        fill = base
        if i == len(row) - 1:
            fill = C_PAYCOL
        d.rectangle([x, y, x + col_w[i], y + row_h], fill=fill)
        fnt = f(23)
        bold_last = (i == len(row) - 1)
        col_txt = (170, 30, 30) if bold_last else (35, 40, 55)
        if i == 0:
            tx = x + 12
            bb = d.textbbox((0, 0), cell, font=fnt)
            d.text((tx, y + (row_h - (bb[3]-bb[1])) / 2 - bb[1]), cell, font=fnt, fill=col_txt)
        else:
            bb = d.textbbox((0, 0), cell, font=fnt)
            tw = bb[2] - bb[0]
            d.text((x + col_w[i] - tw - 14, y + (row_h - (bb[3]-bb[1])) / 2 - bb[1]), cell, font=fnt, fill=col_txt)
        x += col_w[i]
    y += row_h

# total row
x = x0
for i, cell in enumerate(total_row):
    d.rectangle([x, y, x + col_w[i], y + row_h], fill=C_TOTAL)
    if cell:
        fnt = f(26)
        col_txt = (170, 30, 30) if i == len(total_row) - 1 else (60, 50, 20)
        if i == 0:
            bb = d.textbbox((0, 0), cell, font=fnt)
            d.text((x + 12, y + (row_h - (bb[3]-bb[1])) / 2 - bb[1]), cell, font=fnt, fill=col_txt)
        else:
            bb = d.textbbox((0, 0), cell, font=fnt)
            tw = bb[2] - bb[0]
            d.text((x + col_w[i] - tw - 14, y + (row_h - (bb[3]-bb[1])) / 2 - bb[1]), cell, font=fnt, fill=col_txt)
    x += col_w[i]
y += row_h

# grid lines
table_bottom = y
x = x0
for i in range(len(col_w) + 1):
    d.line([x, table_top, x, table_bottom], fill=C_LINE, width=1)
    if i < len(col_w):
        x += col_w[i]
yy = table_top
d.line([x0, yy, x0 + sum(col_w), yy], fill=C_LINE, width=1)
yy += header_h
for _ in range(n_rows + 2):
    d.line([x0, yy, x0 + sum(col_w), yy], fill=C_LINE, width=1)
    yy += row_h

# notes
ny = notes_top
for note in notes:
    star = note.startswith("★")
    d.text((34, ny), note, font=f(20), fill=(150, 40, 40) if star else (70, 80, 95))
    ny += 34

img.save("/home/user/Cyber-Miner-Tycoon/釜山旅遊/釜山對帳表.jpg", "JPEG", quality=92)
print("saved", img.size)
