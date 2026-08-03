#!/usr/bin/env python3
"""把 Day 15 腳本算成一支 9:16 的 Reels 影片。

用法：
    python3 tools/digital_human/render.py --day 15
    python3 tools/digital_human/render.py --day 15 --audio voice.wav

有給 --audio 時，嘴型會依實際音量包絡跑（真唇形同步），
影片長度改成跟音檔一樣長，字卡時間點等比例縮放去對齊；
不想縮放（自己照秒數錄的）就加 --no-stretch。

版面規則來自 context/brand-style.md：
  - 深藍 #0E2A47 底（模板 B）
  - 黃色 #FFC72C 整支只准出現在一個地方
  - 字卡一次最多 12 個中文字，置中偏上
  - 下方 20%（y > 1536）留給 IG 的 UI，不放重要內容
"""

import argparse
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import avatar as A  # noqa: E402

W, H = 1080, 1920
FPS = 30
SAFE_BOTTOM = 1536          # 這條線以下會被 IG 的 UI 蓋住

NAVY = (14, 42, 71)         # #0E2A47
YELLOW = (255, 199, 44)     # #FFC72C
WHITE = (255, 255, 255)
CREAM = (242, 235, 224)     # #F2EBE0

FONT_PATH = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_TC = 3                 # Noto Sans CJK TC Bold

AV_SCALE = 1.16
HEAD_TARGET_Y = 830         # 頭部中心在畫面上的位置


def font(size):
    return ImageFont.truetype(FONT_PATH, size, index=FONT_TC)


# --------------------------------------------------------------------------
# 腳本時間軸（對應 outputs/scripts/day-15-digital-human.md）
# --------------------------------------------------------------------------
# speak 只用來在沒有音檔時推算嘴型節奏（字數 / 秒數 = 音節速率）
SEGMENTS = [
    dict(t0=0.0,  t1=3.0,  speak="你現在看到的這個人，不是我",
         cap=[("這不是我", WHITE)]),
    dict(t0=3.0,  t1=7.0,  speak="但是講話的內容跟聲音，是我", cap=None),
    dict(t0=7.0,  t1=13.0, speak="我錄一支三十秒的影片，平均要重錄十一次",
         cap=[("重錄 ", WHITE), ("11 次", YELLOW)]),          # ← 全片唯一的黃色
    dict(t0=13.0, t1=18.0, speak="吃螺絲、燈太暗、背後有人走過去", cap=None),
    dict(t0=18.0, t1=25.0, speak="所以我乾脆做了一個不會 NG 的我", cap=None),
    dict(t0=25.0, t1=32.0, speak="一張圖、一段稿、一個聲音檔，剩下的全部自動跑完",
         cap=None, cards=True),
    dict(t0=32.0, t1=37.0, speak="這支就是它做的，我從頭到尾沒有開過鏡頭",
         cap=[("沒開過鏡頭", WHITE)]),
    dict(t0=37.0, t1=41.0, speak="但我不會拿它冒充真人，它出現的每一支，右上角都會有這個標",
         cap=None, flash_badge=True),
    dict(t0=41.0, t1=42.0, speak="", cap=[("Day {day}／100", WHITE)]),
]
DURATION = SEGMENTS[-1]["t1"]

CARDS = ["圖", "稿", "聲音"]


# --------------------------------------------------------------------------
# 背景
# --------------------------------------------------------------------------

def build_background():
    """深藍底 + 頭部後方的光暈 + 極淡的科技感格線。整支影片只算一次。"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # 以頭為中心的徑向光暈
    dist = np.sqrt(((xx - W / 2) / 760.0) ** 2 + ((yy - 760) / 900.0) ** 2)
    glow = np.clip(1.0 - dist, 0.0, 1.0) ** 1.7
    base = np.zeros((H, W, 3), np.float32)
    for i, c in enumerate(NAVY):
        base[:, :, i] = c
    lift = np.array([16.0, 30.0, 46.0], np.float32)
    base += glow[:, :, None] * lift
    # 四角壓暗，把視線收進中間
    vig = np.clip(1.0 - (np.sqrt(((xx - W / 2) / 900.0) ** 2 +
                                 ((yy - H / 2) / 1250.0) ** 2) - 0.55) * 0.55, 0.72, 1.0)
    base *= vig[:, :, None]

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W + 1, 72):
        gd.line([(x, 0), (x, H)], fill=(120, 180, 235, 12), width=2)
    for y in range(0, H + 1, 72):
        gd.line([(0, y), (W, y)], fill=(120, 180, 235, 12), width=2)
    img.alpha_composite(grid)
    return img


def build_scrim():
    """下半部的漸層壓暗。白襯衫遇上白字卡會整段讀不出來，這層是必要的。

    疊在人物之上、字卡之下，同時也讓 IG 底部 UI 那一塊看起來是設計過的。
    """
    top, full = 1120, 1560
    a = np.zeros((H, W), np.float32)
    ramp = np.clip((np.arange(H, dtype=np.float32) - top) / (full - top), 0.0, 1.0)
    a[:, :] = (ramp ** 1.4)[:, None] * 196.0
    lay = np.zeros((H, W, 4), np.uint8)
    lay[:, :, 0], lay[:, :, 1], lay[:, :, 2] = 6, 18, 32
    lay[:, :, 3] = a.astype(np.uint8)
    return Image.fromarray(lay, "RGBA")


# --------------------------------------------------------------------------
# 嘴型驅動
# --------------------------------------------------------------------------

def envelope_from_audio(path, n_frames):
    """把音檔解成每格的音量包絡。回傳 0..1 的陣列與音檔長度（秒）。"""
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.run(
        [exe, "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True, check=True,
    )
    pcm = np.frombuffer(proc.stdout, np.int16).astype(np.float32) / 32768.0
    if pcm.size == 0:
        raise RuntimeError(f"讀不到音訊內容：{path}")
    dur = pcm.size / 16000.0

    hop = 16000.0 / FPS
    env = np.zeros(n_frames, np.float32)
    for i in range(n_frames):
        a, b = int(i * hop), int((i + 1) * hop)
        chunk = pcm[a:b]
        env[i] = float(np.sqrt(np.mean(chunk ** 2))) if chunk.size else 0.0

    # 用 95 百分位正規化，避免單一爆音把整條壓扁
    ref = np.percentile(env, 95)
    env = env / ref if ref > 1e-6 else env
    env = np.clip(env, 0.0, 1.4)
    # 輕微平滑，去掉逐格抖動
    k = np.array([0.25, 0.5, 0.25], np.float32)
    env = np.convolve(env, k, mode="same")
    return env, dur


def envelope_from_script(n_frames, segs):
    """沒有音檔時，依逐字稿的字數推算音節脈衝。"""
    env = np.zeros(n_frames, np.float32)
    for s in segs:
        text = s["speak"]
        if not text:
            continue
        n_syl = max(1, len([c for c in text if c.strip() and c not in "，、。"]))
        dur = s["t1"] - s["t0"]
        rate = n_syl / dur                      # 每秒音節數
        for j in range(n_syl):
            # 每個音節一個升餘弦脈衝
            centre = s["t0"] + (j + 0.5) / rate
            width = 0.5 / rate
            lo = max(0, int((centre - width) * FPS))
            hi = min(n_frames, int((centre + width) * FPS) + 1)
            for f in range(lo, hi):
                u = (f / FPS - centre) / width
                if abs(u) < 1.0:
                    env[f] = max(env[f], 0.5 * (1.0 + math.cos(u * math.pi)))
        # 句子的頭尾稍微收一點，聽起來像有換氣
        env[int(s["t0"] * FPS):int(s["t0"] * FPS) + 2] *= 0.3
    return np.clip(env * 1.05, 0.0, 1.2)


def visemes_from_envelope(env):
    """音量 -> 嘴型序列。加一點形狀變化，不然只會像下巴在開合。"""
    n = len(env)
    out = np.zeros(n, np.int32)
    hold = -99
    cur = A.VISEME_CLOSED
    for i in range(n):
        lvl = env[i]
        # 每 2 格才准換一次，避免閃爍
        if i - hold >= 2:
            r = ((i // 3) * 2654435761 % 1000) / 1000.0    # 決定性的偽亂數
            if lvl < 0.08:
                nxt = A.VISEME_CLOSED
            elif lvl < 0.20:
                nxt = A.VISEME_S
            elif lvl < 0.38:
                nxt = A.VISEME_M if r < 0.70 else A.VISEME_O
            elif lvl < 0.62:
                nxt = A.VISEME_WIDE if r < 0.50 else A.VISEME_M
            else:
                nxt = A.VISEME_L if r < 0.75 else A.VISEME_O
            if nxt != cur:
                cur, hold = nxt, i
        out[i] = cur
    return out


def blink_track(n_frames, seed=7):
    """每 2.4-5.2 秒眨一次，一次 4 格：半 -> 閉 -> 閉 -> 半。"""
    rng = np.random.default_rng(seed)
    track = np.full(n_frames, A.EYE_OPEN, np.int32)
    t = int(FPS * 1.2)
    while t < n_frames - 4:
        track[t] = A.EYE_HALF
        track[t + 1] = A.EYE_SHUT
        track[t + 2] = A.EYE_SHUT
        track[t + 3] = A.EYE_HALF
        t += int(FPS * rng.uniform(2.4, 5.2))
    return track


# --------------------------------------------------------------------------
# 文字
# --------------------------------------------------------------------------

def draw_runs(img, runs, cy, size, alpha=255, shadow=True):
    """把 [(文字, 顏色)] 畫成一行置中的字，回傳實際佔的高度。"""
    f = font(size)
    d = ImageDraw.Draw(img)
    widths = [d.textlength(t, font=f) for t, _ in runs]
    total = sum(widths)
    if total > W - 120 and size > 28:          # 太寬就縮字級重來
        return draw_runs(img, runs, cy, max(28, int(size * (W - 120) / total)), alpha, shadow)

    asc, desc = f.getmetrics()
    x = (W - total) / 2.0
    y = cy - (asc + desc) / 2.0
    for (text, colour), wdt in zip(runs, widths):
        if shadow:
            d.text((x + 4, y + 5), text, font=f, fill=(6, 18, 32, int(alpha * 0.55)))
        d.text((x, y), text, font=f, fill=colour + (alpha,))
        x += wdt
    return asc + desc


def draw_pill(img, xy, text, size, fg=WHITE, dot=None):
    """左上 Day 編號、右上 AI 標示共用的小膠囊。xy 是左上角或右上角。"""
    f = font(size)
    d = ImageDraw.Draw(img)
    tw = d.textlength(text, font=f)
    asc, desc = f.getmetrics()
    pad_x, pad_y = 26, 14
    bw = tw + pad_x * 2 + (26 if dot else 0)
    bh = asc + desc + pad_y * 2
    x, y = xy
    if x < 0:                                  # 負數代表從右邊算
        x = W + x - bw
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=bh / 2,
                        fill=(6, 20, 36, 150), outline=(255, 255, 255, 46), width=2)
    tx = x + pad_x
    if dot:
        d.ellipse([tx, y + bh / 2 - 7, tx + 14, y + bh / 2 + 7], fill=dot + (255,))
        tx += 26
    d.text((tx, y + pad_y), text, font=f, fill=fg + (255,))
    return bw, bh


def ease(u):
    """0..1 的 ease-out，字卡進場用。"""
    u = max(0.0, min(1.0, u))
    return 1.0 - (1.0 - u) ** 3


# --------------------------------------------------------------------------
# 主流程
# --------------------------------------------------------------------------

def build_sprites():
    """身體 + 18 種頭（裁到 bounding box，旋轉才不會拖慢）。"""
    body = A.build_body()
    body = body.resize((int(body.width * AV_SCALE), int(body.height * AV_SCALE)), Image.LANCZOS)

    heads = {}
    for key, im in A.build_all_heads().items():
        im = im.resize((int(im.width * AV_SCALE), int(im.height * AV_SCALE)), Image.LANCZOS)
        bbox = im.getbbox()
        heads[key] = (im.crop(bbox), bbox[0], bbox[1])
    return body, heads


def render(day, audio, stretch, out_path, fps=FPS):
    print("· 產生數字人素材 …")
    body, heads = build_sprites()
    bg = build_background()
    scrim = build_scrim()

    # --- 決定長度與時間軸 ---
    segs = [dict(s) for s in SEGMENTS]
    duration = DURATION
    env = None
    if audio:
        probe_frames = int(DURATION * fps)
        env, adur = envelope_from_audio(audio, probe_frames)
        duration = adur
        n_frames = int(round(duration * fps))
        env, _ = envelope_from_audio(audio, n_frames)
        if stretch:
            k = duration / DURATION
            for s in segs:
                s["t0"] *= k
                s["t1"] *= k
            print(f"· 音檔 {duration:.1f}s，字卡時間軸等比例縮放 x{k:.2f}")
        else:
            print(f"· 音檔 {duration:.1f}s，字卡時間軸維持腳本秒數")
    else:
        n_frames = int(round(duration * fps))
        env = envelope_from_script(n_frames, segs)

    n_frames = int(round(duration * fps))
    if len(env) < n_frames:
        env = np.pad(env, (0, n_frames - len(env)))
    env = env[:n_frames]

    vis = visemes_from_envelope(env)
    blinks = blink_track(n_frames)

    # --- 預先合成「背景 + 身體」的 7 種呼吸位移，省下每格重貼身體 ---
    head_cx = int(A.HEAD_CX * AV_SCALE)
    head_cy = int(A.HEAD_CY * AV_SCALE)
    ax = W // 2 - head_cx
    ay = HEAD_TARGET_Y - head_cy

    print("· 預先合成背景圖層 …")
    bg_body = {}
    for off in range(-3, 4):
        layer = bg.copy()
        layer.alpha_composite(body, (ax, ay + off))
        bg_body[off] = layer

    # --- 開 ffmpeg ---
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    cmd = [exe, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(fps), "-i", "-"]
    if audio:
        cmd += ["-i", audio]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    if audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += [out_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
                            stderr=subprocess.PIPE)

    day_label = f"Day {day}"
    print(f"· 算圖 {n_frames} 格 …")
    for i in range(n_frames):
        t = i / fps
        lvl = float(env[i])

        breath = int(round(3.0 * math.sin(2 * math.pi * t / 4.0)))
        frame = bg_body[max(-3, min(3, breath))].copy()

        # 頭部：左右擺 + 上下點 + 說話時的小反彈 + 極輕微旋轉
        sway = 5.0 * math.sin(2 * math.pi * t / 6.3) + 3.0 * math.sin(2 * math.pi * t / 2.7)
        bob = 4.0 * math.sin(2 * math.pi * t / 3.1) + 3.0 * lvl
        rot = 1.1 * math.sin(2 * math.pi * t / 7.9)

        head, hx, hy = heads[(int(blinks[i]), int(vis[i]))]
        if abs(rot) > 0.02:
            head = head.rotate(rot, resample=Image.BICUBIC, expand=False,
                               center=(head.width / 2, head.height * 0.92))
        frame.alpha_composite(head, (ax + hx + int(round(sway)), ay + hy + int(round(bob))))
        frame.alpha_composite(scrim)

        # --- 常駐標示 ---
        draw_pill(frame, (56, 104), f"{day_label}／100", 40)
        badge_flash = any(s.get("flash_badge") and s["t0"] <= t < s["t1"] for s in segs)
        draw_pill(frame, (-56, 104), "AI 生成", 34,
                  fg=YELLOW if badge_flash else WHITE,
                  dot=YELLOW if badge_flash else (150, 190, 225))

        # --- 字卡 ---
        for s in segs:
            if not (s["t0"] <= t < s["t1"]):
                continue
            if s.get("cap"):
                fade_in = ease((t - s["t0"]) / 0.28)
                fade_out = ease((s["t1"] - t) / 0.22)
                a = int(255 * min(fade_in, fade_out))
                if a > 4:
                    rise = int((1.0 - fade_in) * 26)
                    runs = [(txt.format(day=day), col) for txt, col in s["cap"]]
                    draw_runs(frame, runs, 1330 + rise, 92, alpha=a)
            if s.get("cards"):
                draw_cards(frame, t - s["t0"], s["t1"] - s["t0"])

        proc.stdin.write(frame.convert("RGB").tobytes())
        if i % 120 == 0:
            print(f"  {i}/{n_frames}", flush=True)

    proc.stdin.close()
    err = proc.stderr.read().decode(errors="ignore")
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg 失敗：\n" + err[-2000:])
    print(f"✓ 完成：{out_path}")


def draw_cards(frame, u, seg_dur):
    """25-32 秒那段的「圖 ＋ 稿 ＋ 聲音」三張卡，最後合成一張。"""
    cw, ch, cy = 268, 200, 1330
    xs = [W / 2 - 300, W / 2, W / 2 + 300]
    merge_at = seg_dur - 1.8
    d = ImageDraw.Draw(frame)
    f_lab = font(64)
    f_small = font(30)

    merged = ease((u - merge_at) / 1.2) if u > merge_at else 0.0

    for idx, (label, cx) in enumerate(zip(CARDS, xs)):
        appear = ease((u - 0.15 - idx * 0.42) / 0.45)
        if appear <= 0.01:
            continue
        a = int(230 * appear * (1.0 - merged))
        if a <= 4:
            continue
        # 合併時往中間收並縮小
        x = cx + (W / 2 - cx) * merged
        scale = (0.86 + 0.14 * appear) * (1.0 - 0.22 * merged)
        hw, hh = cw * scale / 2, ch * scale / 2
        y = cy + (1.0 - appear) * 24

        card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([x - hw, y - hh, x + hw, y + hh], radius=28,
                             fill=(20, 58, 96, a), outline=(120, 175, 225, min(255, a)), width=3)
        bb = cd.textbbox((0, 0), label, font=f_lab)
        cd.text((x - (bb[2] - bb[0]) / 2 - bb[0], y - (bb[3] - bb[1]) / 2 - bb[1] - 12),
                label, font=f_lab, fill=WHITE + (a,))
        frame.alpha_composite(card)

    if merged > 0.02:
        a = int(240 * merged)
        card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        hw, hh = 210, 118
        cd.rounded_rectangle([W / 2 - hw, cy - hh, W / 2 + hw, cy + hh], radius=30,
                             fill=(20, 58, 96, a), outline=(150, 200, 240, a), width=3)
        cd.polygon([(W / 2 - 22, cy - 30), (W / 2 - 22, cy + 30), (W / 2 + 30, cy)],
                   fill=WHITE + (a,))
        bb = cd.textbbox((0, 0), "一支影片", font=f_small)
        cd.text((W / 2 - (bb[2] - bb[0]) / 2 - bb[0], cy + 52), "一支影片",
                font=f_small, fill=(200, 222, 244, a))
        frame.alpha_composite(card)


def main():
    p = argparse.ArgumentParser(description="產生 Day N 的數字人 Reels 影片")
    p.add_argument("--day", type=int, default=15, help="連載編號，會印在左上角")
    p.add_argument("--audio", help="你的口白音檔（wav/m4a/mp3），嘴型會自動同步")
    p.add_argument("--no-stretch", dest="stretch", action="store_false",
                   help="不要把字卡時間軸縮放到音檔長度")
    p.add_argument("-o", "--out", help="輸出路徑")
    p.set_defaults(stretch=True)
    args = p.parse_args()

    out = args.out or f"outputs/videos/day-{args.day:02d}-digital-human.mp4"
    render(args.day, args.audio, args.stretch, out)


if __name__ == "__main__":
    main()
