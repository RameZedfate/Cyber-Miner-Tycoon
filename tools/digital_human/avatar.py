"""數字人 avatar 的向量繪製。

以扁平向量風格畫一個半身主播，配色沿用 brand-style.md 的模板 B（深藍 #0E2A47）。
所有形狀先以 SS 倍超取樣繪製再縮回，PIL 本身不做反鋸齒，這是唯一能拿到乾淨邊緣的做法。

對外只有兩個函式：
    build_body()                    -> RGBA 肩頸圖層
    build_head(eye_state, viseme)   -> RGBA 頭部圖層（3 種眼睛 x 6 種嘴型）

頭與身體分開，是為了讓 render.py 能各自套用點頭、擺動與呼吸的位移。
"""

import math

from PIL import Image, ImageDraw

# 超取樣倍率。3 倍在品質與記憶體之間剛好，再高看不出差別。
SS = 3

# avatar 畫布（scale 1 的座標系；render.py 會直接貼進 1080x1920 的版面）
BOX_W, BOX_H = 1080, 1500

# 臉部錨點，build_body 與 build_head 都靠這組座標對齊
HEAD_CX, HEAD_CY = 540, 700
HEAD_RX, HEAD_RY = 188, 250
NECK_TOP = 880

PALETTE = {
    "skin":        (233, 189, 156, 255),
    "skin_shade":  (214, 165, 130, 255),
    "skin_deep":   (196, 145, 112, 255),
    "hair":        (28, 20, 16, 255),
    "hair_hi":     (48, 36, 30, 255),
    "brow":        (34, 24, 19, 255),
    "eye_white":   (247, 243, 238, 255),
    "iris":        (49, 34, 26, 255),
    "pupil":       (18, 12, 9, 255),
    "glint":       (255, 255, 255, 255),
    "lip":         (188, 108, 96, 255),
    "lip_dark":    (156, 84, 74, 255),
    "mouth_in":    (77, 34, 42, 255),
    "teeth":       (245, 237, 228, 255),
    # 襯衫用比背景亮一階的藍，才不會跟 #0E2A47 糊在一起
    "shirt":       (26, 62, 100, 255),
    "shirt_shade": (20, 48, 78, 255),
    "collar":      (242, 235, 224, 255),   # 品牌米色 #F2EBE0，跟模板 A 呼應
    "collar_shade": (222, 213, 199, 255),
}

# 6 段嘴型，數值是「張開程度」與形狀傾向
VISEME_CLOSED, VISEME_S, VISEME_M, VISEME_L, VISEME_O, VISEME_WIDE = range(6)
EYE_OPEN, EYE_HALF, EYE_SHUT = range(3)


def _s(v):
    """scale-1 座標 -> 超取樣座標。"""
    if isinstance(v, (tuple, list)):
        return [x * SS for x in v]
    return v * SS


def _blank(w=BOX_W, h=BOX_H):
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def _superellipse(cx, cy, rx, ry, n=2.3, taper=0.0, steps=220):
    """回傳超橢圓輪廓點。taper > 0 會把下半部收窄，用來做下巴。"""
    pts = []
    for i in range(steps):
        t = 2.0 * math.pi * i / steps
        cs, sn = math.cos(t), math.sin(t)
        ex = math.copysign(abs(cs) ** (2.0 / n), cs)
        ey = math.copysign(abs(sn) ** (2.0 / n), sn)
        k = 1.0 - taper * max(0.0, ey)   # ey > 0 是下半部（y 軸向下）
        pts.append(((cx + rx * ex * k) * SS, (cy + ry * ey) * SS))
    return pts


def _ellipse(d, cx, cy, rx, ry, fill):
    d.ellipse([_s(cx - rx), _s(cy - ry), _s(cx + rx), _s(cy + ry)], fill=fill)


def _down(img):
    """縮回 scale 1，這一步負責反鋸齒。"""
    return img.resize((img.width // SS, img.height // SS), Image.LANCZOS)


# --------------------------------------------------------------------------
# 身體
# --------------------------------------------------------------------------

def build_body():
    """肩頸圖層。頭會蓋住脖子上緣，所以脖子畫高一點沒關係。"""
    img, d = _blank()

    # 脖子：上窄下寬，直筒會像柱子
    d.polygon(
        [(_s(540 - 62), _s(NECK_TOP - 120)), (_s(540 + 62), _s(NECK_TOP - 120)),
         (_s(540 + 88), _s(NECK_TOP + 190)), (_s(540 - 88), _s(NECK_TOP + 190))],
        fill=PALETTE["skin"],
    )
    # 下巴打在脖子上的陰影，少了這塊頭會像貼上去的
    d.ellipse(
        [_s(540 - 92), _s(NECK_TOP - 108), _s(540 + 92), _s(NECK_TOP + 44)],
        fill=PALETTE["skin_deep"],
    )

    # 肩膀：用超大圓角矩形，兩側切出斜肩線
    sh_top = 1024
    # 先鋪深色的整片肩線，再疊一片略小的亮色，邊緣自然形成一圈輪廓光
    d.rounded_rectangle(
        [_s(126), _s(sh_top), _s(954), _s(BOX_H + 120)],
        radius=_s(210), fill=PALETTE["shirt_shade"],
    )
    d.rounded_rectangle(
        [_s(126 + 18), _s(sh_top + 14), _s(954 - 18), _s(BOX_H + 120)],
        radius=_s(198), fill=PALETTE["shirt"],
    )

    # 領口：米色 V 領襯衫
    collar = [
        (540 - 150, sh_top + 6), (540 - 96, sh_top - 16),
        (540, sh_top + 122), (540 + 96, sh_top - 16),
        (540 + 150, sh_top + 6), (540 + 118, sh_top + 250),
        (540 - 118, sh_top + 250),
    ]
    d.polygon([(_s(x), _s(y)) for x, y in collar], fill=PALETTE["collar"])
    # 領片：左右各一片，做出交疊
    d.polygon(
        [(_s(x), _s(y)) for x, y in
         [(540 - 150, sh_top + 4), (540 - 92, sh_top - 18), (540 - 6, sh_top + 160),
          (540 - 74, sh_top + 196)]],
        fill=PALETTE["collar_shade"],
    )
    d.polygon(
        [(_s(x), _s(y)) for x, y in
         [(540 + 150, sh_top + 4), (540 + 92, sh_top - 18), (540 + 6, sh_top + 160),
          (540 + 74, sh_top + 196)]],
        fill=PALETTE["collar_shade"],
    )
    # V 領裡露出的一小塊脖子
    d.polygon(
        [(_s(x), _s(y)) for x, y in
         [(540 - 92, sh_top - 40), (540 + 92, sh_top - 40), (540, sh_top + 150)]],
        fill=PALETTE["skin_shade"],
    )
    return _down(img)


# --------------------------------------------------------------------------
# 頭
# --------------------------------------------------------------------------

def _draw_eye(d, cx, cy, state, flip=False):
    """單眼。state 決定睜開程度；flip 讓右眼的高光鏡射。"""
    w, h = 46, 30
    if state == EYE_SHUT:
        # 閉眼只留一條下彎的線
        d.line(
            [_s(cx - w + 4), _s(cy + 2), _s(cx), _s(cy + 11), _s(cx + w - 4), _s(cy + 2)],
            fill=PALETTE["brow"], width=_s(7), joint="curve",
        )
        return

    hh = h if state == EYE_OPEN else int(h * 0.46)
    # 眼白
    _ellipse(d, cx, cy, w, hh, PALETTE["eye_white"])
    # 虹膜與瞳孔（半眼時往上收，避免看起來像翻白眼）
    iy = cy if state == EYE_OPEN else cy - 4
    _ellipse(d, cx, iy, 21, 21, PALETTE["iris"])
    _ellipse(d, cx, iy, 10, 10, PALETTE["pupil"])
    gx = cx + (7 if not flip else -7)
    _ellipse(d, gx, iy - 8, 6, 6, PALETTE["glint"])

    # 上眼瞼壓在眼白上，做出雙眼皮的厚度
    d.arc(
        [_s(cx - w), _s(cy - hh - 3), _s(cx + w), _s(cy + hh)],
        start=182, end=358, fill=PALETTE["brow"], width=_s(6),
    )
    if state == EYE_HALF:
        # 半眼：用膚色把上半截蓋掉
        d.rectangle(
            [_s(cx - w - 4), _s(cy - hh - 20), _s(cx + w + 4), _s(cy - hh + 4)],
            fill=PALETTE["skin"],
        )


def _draw_mouth(d, cx, cy, viseme):
    """嘴型。每個 viseme 是一組（寬、高、圓潤度）。"""
    if viseme == VISEME_CLOSED:
        d.line(
            [_s(cx - 50), _s(cy - 4), _s(cx), _s(cy + 7), _s(cx + 50), _s(cy - 4)],
            fill=PALETTE["lip_dark"], width=_s(10), joint="curve",
        )
        return

    specs = {
        VISEME_S:    (40, 15),
        VISEME_M:    (46, 30),
        VISEME_L:    (52, 46),
        VISEME_O:    (30, 38),
        VISEME_WIDE: (68, 24),
    }
    rw, rh = specs[viseme]
    # 嘴唇外框
    _ellipse(d, cx, cy, rw + 8, rh + 8, PALETTE["lip"])
    # 口腔
    _ellipse(d, cx, cy, rw, rh, PALETTE["mouth_in"])
    # 上排牙齒：只有張得夠大才看得到，而且只露薄薄一條
    if rh >= 24:
        d.chord(
            [_s(cx - rw), _s(cy - rh), _s(cx + rw), _s(cy + rh)],
            start=180, end=360, fill=PALETTE["teeth"],
        )
        d.rectangle(
            [_s(cx - rw - 2), _s(cy - rh * 0.60), _s(cx + rw + 2), _s(cy + rh + 2)],
            fill=PALETTE["mouth_in"],
        )
        # 舌頭：填掉口腔下緣的死黑
        _ellipse(d, cx, cy + rh * 0.58, rw * 0.60, rh * 0.36, PALETTE["lip_dark"])


def build_head(eye_state=EYE_OPEN, viseme=VISEME_CLOSED):
    """整顆頭（含頭髮、五官）。眼睛與嘴型每種組合各出一張，貼圖時不必再處理透明度。"""
    img, d = _blank()

    # --- 後層頭髮：比頭大一圈，露出髮際輪廓 ---
    d.polygon(
        _superellipse(HEAD_CX, HEAD_CY - 26, HEAD_RX + 20, HEAD_RY + 16, n=2.4, taper=0.30),
        fill=PALETTE["hair"],
    )

    # --- 耳朵：畫在臉之前，往外推才不會被臉的輪廓吃掉 ---
    for sx in (-1, 1):
        _ellipse(d, HEAD_CX + sx * (HEAD_RX + 10), HEAD_CY + 30, 30, 48, PALETTE["skin"])
        _ellipse(d, HEAD_CX + sx * (HEAD_RX + 14), HEAD_CY + 30, 13, 24, PALETTE["skin_deep"])

    # --- 臉 ---
    d.polygon(
        _superellipse(HEAD_CX, HEAD_CY, HEAD_RX, HEAD_RY, n=2.3, taper=0.20),
        fill=PALETTE["skin"],
    )

    # --- 前額瀏海：側分，蓋掉臉的上緣 ---
    top = _superellipse(HEAD_CX, HEAD_CY - 22, HEAD_RX + 16, HEAD_RY + 12, n=2.4, taper=0.30)
    # 髮際線抓在眉毛之上，壓到眉毛就會變成西瓜皮
    hair_line = (HEAD_CY - HEAD_RY * 0.56) * SS
    upper = [p for p in top if p[1] <= hair_line]
    if upper:
        # 由左到右排序後，用一條起伏的髮際線收邊
        upper.sort(key=lambda p: p[0])
        fringe = list(upper)
        x0, x1 = upper[0][0], upper[-1][0]
        for i in range(41):
            u = i / 40.0
            x = x1 + (x0 - x1) * u
            # 右高左低的斜分瀏海，兩側鬢角自然往下收
            dip = math.sin(u * math.pi) ** 1.6 * 30 + (1.0 - u) * 26
            edge = max(0.0, abs(u - 0.5) * 2 - 0.72) * 300
            fringe.append((x, hair_line + (dip + edge) * SS))
        d.polygon(fringe, fill=PALETTE["hair"])
        # 髮絲高光
        d.arc(
            [_s(HEAD_CX - HEAD_RX + 24), _s(HEAD_CY - HEAD_RY - 6),
             _s(HEAD_CX + HEAD_RX - 70), _s(HEAD_CY + 40)],
            start=200, end=268, fill=PALETTE["hair_hi"], width=_s(9),
        )

    # --- 眉毛 ---
    for sx in (-1, 1):
        bx = HEAD_CX + sx * 76
        d.line(
            [_s(bx - sx * 40), _s(HEAD_CY - 88), _s(bx), _s(HEAD_CY - 96),
             _s(bx + sx * 36), _s(HEAD_CY - 90)],
            fill=PALETTE["brow"], width=_s(9), joint="curve",
        )

    # --- 眼睛 ---
    _draw_eye(d, HEAD_CX - 76, HEAD_CY - 16, eye_state, flip=False)
    _draw_eye(d, HEAD_CX + 76, HEAD_CY - 16, eye_state, flip=True)

    # --- 鼻子：扁平風格只用一小塊陰影加鼻頭 ---
    _ellipse(d, HEAD_CX + 2, HEAD_CY + 66, 26, 20, PALETTE["skin_shade"])
    d.line(
        [_s(HEAD_CX - 16), _s(HEAD_CY + 74), _s(HEAD_CX + 2), _s(HEAD_CY + 80),
         _s(HEAD_CX + 20), _s(HEAD_CY + 74)],
        fill=PALETTE["skin_deep"], width=_s(6), joint="curve",
    )

    # --- 嘴 ---
    _draw_mouth(d, HEAD_CX, HEAD_CY + 150, viseme)

    # --- 兩頰淡淡的紅暈 ---
    blush = Image.new("RGBA", img.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(blush)
    for sx in (-1, 1):
        bd.ellipse(
            [_s(HEAD_CX + sx * 122 - 34), _s(HEAD_CY + 70 - 19),
             _s(HEAD_CX + sx * 122 + 34), _s(HEAD_CY + 70 + 19)],
            fill=(206, 122, 104, 34),
        )
    img.alpha_composite(blush)

    return _down(img)


def build_all_heads():
    """回傳 {(eye_state, viseme): Image}，共 18 張。整支影片只算一次。"""
    return {
        (e, v): build_head(e, v)
        for e in (EYE_OPEN, EYE_HALF, EYE_SHUT)
        for v in range(6)
    }
