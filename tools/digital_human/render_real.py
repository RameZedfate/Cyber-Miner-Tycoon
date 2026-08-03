#!/usr/bin/env python3
"""真人版數字人：用 assets/presenter-adam.png（從你的影片去背抽出來的本人）當主播。

跟 render.py 共用同一套時間軸、字卡與版面規則，差別只在主播是照片不是向量圖。

用法：
    python3 tools/digital_human/render_real.py --day 15
    python3 tools/digital_human/render_real.py --day 15 --audio voice.wav
    python3 tools/digital_human/render_real.py --day 15 --no-mouth   # 關掉嘴部動畫

嘴部動畫是「下顎下沉 + 合成口內陰影」的 2D 變形，不是 AI 唇形同步。
在 Reels 的尺寸與播放速度下夠用，但放大看會露餡，所以幅度刻意壓小。
"""

import argparse
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R  # noqa: E402  共用背景、字卡、時間軸

W, H = R.W, R.H
FPS = R.FPS

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRESENTER = os.path.join(REPO, "assets", "presenter-adam.png")

# 這幾個座標是量出來的，換照片就要重新對
SRC_HEAD = (750, 650)        # 原圖裡的頭部中心
SRC_MOUTH = (712, 1042)      # 原圖裡的嘴巴中心
MOUTH_HALF_W = 132           # 嘴部變形的水平影響範圍
JAW_TOP = 1050               # 上唇線，從這裡開始往下拉
JAW_BOT = 1210               # 下巴底，變形在這裡收斂回 0

TARGET_HEAD = (540, 700)     # 頭部中心要落在畫面上的位置
BASE_SCALE = 1.06
PUSH_IN = 0.06               # 整支影片緩慢推近的幅度
PUSH_STEPS = 24              # 推近量化成幾段（避免每格重算縮放）
MAX_JAW = 22                 # 下顎最多下沉幾 px（原圖尺度）


def build_presenter_steps():
    """把主播圖預先縮放成 PUSH_STEPS 段，回傳每段的圖、貼上位置與嘴部座標。"""
    src = Image.open(PRESENTER).convert("RGBA")
    steps = []
    for k in range(PUSH_STEPS):
        s = BASE_SCALE * (1.0 + PUSH_IN * k / max(1, PUSH_STEPS - 1))
        im = src.resize((int(src.width * s), int(src.height * s)), Image.LANCZOS)
        ox = int(TARGET_HEAD[0] - SRC_HEAD[0] * s)
        oy = int(TARGET_HEAD[1] - SRC_HEAD[1] * s)
        steps.append(dict(
            img=im, ox=ox, oy=oy, s=s,
            mouth=(SRC_MOUTH[0] * s + ox, SRC_MOUTH[1] * s + oy),
            jaw_top=JAW_TOP * s + oy,
            jaw_bot=JAW_BOT * s + oy,
            half_w=MOUTH_HALF_W * s,
        ))
    return steps


def apply_jaw(frame, step, drop, dy=0):
    """在已合成好的畫面上，把下顎往下拉 drop px，並補一塊口內陰影。

    變形只發生在嘴巴周圍的小方框內，水平方向用餘弦權重收邊，避免出現接縫。
    """
    if drop < 0.5:
        return
    mx, my = step["mouth"][0], step["mouth"][1] + dy
    jt, jb = step["jaw_top"] + dy, step["jaw_bot"] + dy
    hw = step["half_w"]

    x0, x1 = int(mx - hw), int(mx + hw)
    y0, y1 = int(jt - 30), int(jb + 20)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x1), min(H, y1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return

    patch = np.asarray(frame.crop((x0, y0, x1, y1)), dtype=np.float32)
    h, w = patch.shape[:2]

    ys = np.arange(h, dtype=np.float32)[:, None] + y0
    xs = np.arange(w, dtype=np.float32)[None, :] + x0

    # 水平權重：中間最強，兩側平滑收到 0
    u = np.clip(np.abs(xs - mx) / hw, 0.0, 1.0)
    wx = 0.5 * (1.0 + np.cos(u * math.pi))

    # 垂直：上唇線以下整段拉長，下巴底收斂
    span = max(1.0, jb - jt)
    stretch = 1.0 + (drop * wx) / span
    src_y = np.where(ys >= jt, jt + (ys - jt) / stretch, ys)
    src_y = np.broadcast_to(src_y, (h, w)) - y0
    src_x = np.broadcast_to(xs, (h, w)) - x0

    out = np.empty_like(patch)
    for c in range(patch.shape[2]):
        out[:, :, c] = ndimage.map_coordinates(
            patch[:, :, c], [src_y, src_x], order=1, mode="nearest")

    frame.paste(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"), (x0, y0))
    # 這裡刻意不合成口內陰影。他這張照片是閉唇微笑又帶頭部傾斜，
    # 疊上去的暗部會變成臉上的一塊髒污，比不動嘴還糟。只留下顎位移。


def render(day, audio, stretch, use_mouth, out_path, fps=FPS):
    print("· 載入主播素材 …")
    steps = build_presenter_steps()
    bg = R.build_background()
    scrim = R.build_scrim()

    segs = [dict(s) for s in R.SEGMENTS]
    duration = R.DURATION
    if audio:
        env, adur = R.envelope_from_audio(audio, int(R.DURATION * fps))
        duration = adur
        n_frames = int(round(duration * fps))
        env, _ = R.envelope_from_audio(audio, n_frames)
        if stretch:
            k = duration / R.DURATION
            for s in segs:
                s["t0"] *= k
                s["t1"] *= k
            print(f"· 音檔 {duration:.1f}s，字卡時間軸等比例縮放 x{k:.2f}")
    else:
        n_frames = int(round(duration * fps))
        env = R.envelope_from_script(n_frames, segs)

    n_frames = int(round(duration * fps))
    if len(env) < n_frames:
        env = np.pad(env, (0, n_frames - len(env)))
    env = env[:n_frames]

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

    print(f"· 算圖 {n_frames} 格 …")
    for i in range(n_frames):
        t = i / fps
        lvl = float(env[i])
        k = min(PUSH_STEPS - 1, int(i / max(1, n_frames - 1) * (PUSH_STEPS - 1)))
        st = steps[k]

        breath = 3.0 * math.sin(2 * math.pi * t / 4.2)
        sway = 4.0 * math.sin(2 * math.pi * t / 6.8)
        dy = int(round(breath))

        frame = bg.copy()
        frame.alpha_composite(st["img"], (st["ox"] + int(round(sway)), st["oy"] + dy))
        if use_mouth:
            apply_jaw(frame, st, MAX_JAW * st["s"] * min(1.0, lvl), dy)
        frame.alpha_composite(scrim)

        R.draw_pill(frame, (56, 104), f"Day {day}／100", 40)
        flash = any(s.get("flash_badge") and s["t0"] <= t < s["t1"] for s in segs)
        R.draw_pill(frame, (-56, 104), "AI 生成", 34,
                    fg=R.YELLOW if flash else R.WHITE,
                    dot=R.YELLOW if flash else (150, 190, 225))

        for s in segs:
            if not (s["t0"] <= t < s["t1"]):
                continue
            if s.get("cap"):
                fi = R.ease((t - s["t0"]) / 0.28)
                fo = R.ease((s["t1"] - t) / 0.22)
                a = int(255 * min(fi, fo))
                if a > 4:
                    runs = [(txt.format(day=day), col) for txt, col in s["cap"]]
                    R.draw_runs(frame, runs, 1330 + int((1.0 - fi) * 26), 92, alpha=a)
            if s.get("cards"):
                R.draw_cards(frame, t - s["t0"], s["t1"] - s["t0"])

        proc.stdin.write(frame.convert("RGB").tobytes())
        if i % 150 == 0:
            print(f"  {i}/{n_frames}", flush=True)

    proc.stdin.close()
    err = proc.stderr.read().decode(errors="ignore")
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg 失敗：\n" + err[-2000:])
    print(f"✓ 完成：{out_path}")


def preview(day, out_dir):
    """輸出幾張測試圖，用來確認嘴部變形幅度會不會怪。"""
    steps = build_presenter_steps()
    bg = R.build_background()
    os.makedirs(out_dir, exist_ok=True)
    st = steps[0]
    for drop in (0, 8, 15, 22):
        frame = bg.copy()
        frame.alpha_composite(st["img"], (st["ox"], st["oy"]))
        apply_jaw(frame, st, drop * st["s"])
        frame.crop((380, 780, 800, 1180)).convert("RGB").save(
            os.path.join(out_dir, f"jaw_{drop:02d}.png"))
    print("預覽輸出於", out_dir)


def main():
    p = argparse.ArgumentParser(description="真人版數字人 Reels")
    p.add_argument("--day", type=int, default=15)
    p.add_argument("--audio")
    p.add_argument("--no-stretch", dest="stretch", action="store_false")
    p.add_argument("--no-mouth", dest="mouth", action="store_false",
                   help="關掉嘴部動畫，只留呼吸與推近")
    p.add_argument("--preview", metavar="DIR", help="只輸出嘴型測試圖")
    p.add_argument("-o", "--out")
    p.set_defaults(stretch=True, mouth=True)
    args = p.parse_args()

    if args.preview:
        preview(args.day, args.preview)
        return
    out = args.out or f"outputs/videos/day-{args.day:02d}-digital-human-real.mp4"
    render(args.day, args.audio, args.stretch, args.mouth, out)


if __name__ == "__main__":
    main()
