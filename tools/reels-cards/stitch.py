#!/usr/bin/env python3
"""把字卡串成 9:16 影片，含免費的緩推鏡（Ken Burns）。

為什麼不用 AI 影片模型：字卡要的動態就是「慢慢推近」或「慢慢平移」，
本機算得出來而且完全免費；`kling3_0_turbo` 一段 5 秒要 7.5 credits，
一支影片 4 段就 30 credits，每天發一支等於一個月 900 credits——整個方案的額度。

用法：
    pip install imageio-ffmpeg pillow
    python3 tools/reels-cards/stitch.py <spec.json> [-o 輸出.mp4]

spec 的每張卡可加 duration（秒，預設 4）與 motion：
    push   緩推近（預設）
    pull   緩拉遠
    left   往左緩慢平移
    right  往右緩慢平移
    still  完全不動
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30
DEFAULT_DURATION = 4.0
ZOOM_MAX = 1.12          # 推鏡幅度：再大就像廉價幻燈片
SUPERSAMPLE = 1.3        # 來源放大倍率，給推鏡留解析度餘裕
MOTIONS = ("push", "pull", "left", "right", "still")


def find_ffmpeg() -> str:
    """要一個「完整」的 ffmpeg。

    ⚠️ 不要用 /opt/pw-browsers/ffmpeg-*/ffmpeg-linux —— 那是 Playwright 用來錄螢幕的
    精簡版，只有 VP8、沒有 libx264，連 PNG 都讀不進去。
    """
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass

    found = shutil.which("ffmpeg")
    if found:
        return found

    sys.exit("找不到完整的 ffmpeg。請先執行：pip install imageio-ffmpeg")


def ease(p: float) -> float:
    """ease-in-out。等速推鏡看起來像投影片自動播放，加了緩動才像運鏡。"""
    return p * p * (3.0 - 2.0 * p)


def crop_box(motion: str, p: float, sw: int, sh: int) -> tuple[int, int, int, int]:
    """回傳這一格要從放大圖上裁下來的範圍。"""
    e = ease(p)

    if motion == "push":
        zoom = 1.0 + (ZOOM_MAX - 1.0) * e
    elif motion == "pull":
        zoom = ZOOM_MAX - (ZOOM_MAX - 1.0) * e
    else:
        zoom = (1.0 + ZOOM_MAX) / 2.0

    # 裁切框相對於「剛好填滿輸出」的基準尺寸
    base_w = sw / SUPERSAMPLE
    base_h = sh / SUPERSAMPLE
    cw = min(sw, base_w / (zoom / SUPERSAMPLE))
    ch = min(sh, base_h / (zoom / SUPERSAMPLE))

    slack_x, slack_y = sw - cw, sh - ch
    if motion == "left":
        x = slack_x * (1.0 - e)
    elif motion == "right":
        x = slack_x * e
    else:
        x = slack_x / 2.0
    y = slack_y / 2.0

    return (int(x), int(y), int(x + cw), int(y + ch))


def build(spec_path: Path, out_path: Path) -> None:
    from PIL import Image

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    base = spec_path.parent
    cards = spec.get("cards", [])
    if not cards:
        sys.exit("spec 裡沒有 cards。")

    for c in cards:
        m = c.get("motion", "push")
        if m not in MOTIONS:
            sys.exit(f"卡 {c.get('id','?')} 的 motion「{m}」不認得（可用：{', '.join(MOTIONS)}）")

    ffmpeg = find_ffmpeg()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 單一 ffmpeg 程序吃完所有格數，不必分段再 concat
    proc = subprocess.Popen(
        [
            ffmpeg, "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(out_path),
        ],
        stdin=subprocess.PIPE, stderr=subprocess.PIPE,
    )

    total_frames = 0
    total_secs = 0.0

    try:
        for card in cards:
            cid = str(card.get("id", "?")).zfill(2)
            png = base / f"card-{cid}.png"
            if not png.exists():
                proc.stdin.close()
                proc.wait()
                sys.exit(f"找不到 {png} —— 先跑 render.py 產字卡。")

            dur = float(card.get("duration", DEFAULT_DURATION))
            motion = card.get("motion", "push")
            frames = max(1, int(round(dur * FPS)))

            with Image.open(png) as im:
                src = im.convert("RGB")
                if motion == "still":
                    flat = src.resize((W, H), Image.LANCZOS).tobytes()
                    for _ in range(frames):
                        proc.stdin.write(flat)
                else:
                    big = src.resize(
                        (int(W * SUPERSAMPLE), int(H * SUPERSAMPLE)), Image.LANCZOS
                    )
                    sw, sh = big.size
                    for i in range(frames):
                        p = i / max(1, frames - 1)
                        frame = big.resize((W, H), Image.BILINEAR, crop_box(motion, p, sw, sh))
                        proc.stdin.write(frame.tobytes())

            total_frames += frames
            total_secs += dur
            print(f"  ✓ 卡 {cid}  {dur:>4.1f}s  {motion:<5}  {frames} 格")

        proc.stdin.close()
    except BrokenPipeError:
        pass

    err = proc.stderr.read().decode("utf-8", "replace")
    if proc.wait() != 0:
        sys.exit(f"ffmpeg 編碼失敗：\n{err[-800:]}")

    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\n完成：{out_path}")
    print(f"      {total_secs:.1f} 秒  {total_frames} 格  {size_mb:.1f} MB  {W}x{H} @ {FPS}fps")
    print("下一步：把這支丟進剪映／CapCut，對上你自己的口白與背景音樂。")


def main() -> None:
    ap = argparse.ArgumentParser(description="把字卡串成 9:16 影片")
    ap.add_argument("spec", type=Path)
    ap.add_argument("-o", "--out", type=Path, default=None)
    args = ap.parse_args()

    if not args.spec.exists():
        sys.exit(f"找不到 spec：{args.spec}")

    build(args.spec, args.out or args.spec.parent / "video.mp4")


if __name__ == "__main__":
    main()
