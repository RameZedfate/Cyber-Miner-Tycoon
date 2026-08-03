#!/usr/bin/env python3
"""從一張照片或一段影片，做出數字人要用的「去背主播」PNG。

    python3 tools/digital_human/make_presenter.py --video IMG_4667.mov --at 2.75
    python3 tools/digital_human/make_presenter.py --image me.jpg

輸出 assets/presenter-adam.png（RGBA，去背完成）。

⚠️ 用的是 u2net_human_seg 模型，它會把「畫面裡所有的人」都當成前景。
   背景有路人時會一起被留下來，而且常常跟你的頭髮連在一起、
   連通元件過濾切不開。這時候用 --cut 給一組多邊形座標手動切掉。
"""

import argparse
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "assets", "presenter-adam.png")

# 這組座標是針對 IMG_4667.mov 第 2.75 秒那一幀量出來的，
# 沿著髮際與耳廓把左後方的路人切掉。換素材就要重量。
DEFAULT_CUT = [(300, 360), (452, 378), (466, 470), (481, 548),
               (472, 602), (450, 652), (448, 860), (300, 860)]
# 髮緣殘留的白襯衫：只在這個範圍內，把很亮的像素去掉
BRIGHT_BAND = (425, 590, 448, 512)      # y0, y1, x0, x1
BRIGHT_MIN = 140


def grab_frame(video, at):
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    tmp = os.path.join(REPO, ".frame_tmp.jpg")
    subprocess.run([exe, "-v", "error", "-ss", str(at), "-i", video,
                    "-frames:v", "1", "-q:v", "2", "-y", tmp], check=True)
    im = Image.open(tmp).convert("RGB").copy()
    os.remove(tmp)
    return im


def cutout(im, cut_poly, bright_band):
    from rembg import remove, new_session
    sess = new_session("u2net_human_seg")
    out = remove(im, session=sess, alpha_matting=True,
                 alpha_matting_foreground_threshold=250,
                 alpha_matting_background_threshold=15,
                 alpha_matting_erode_size=8)
    a = np.array(out)

    # 1) 只留最大的一塊，掃掉零碎雜訊
    m = a[:, :, 3] > 40
    lab, n = ndimage.label(m)
    if n > 1:
        biggest = int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))) + 1
        a[:, :, 3] = np.where(lab == biggest, a[:, :, 3], 0)

    # 2) 手動多邊形，切掉跟你連在一起的路人
    if cut_poly:
        cut = Image.new("L", im.size, 0)
        ImageDraw.Draw(cut).polygon(cut_poly, fill=255)
        a[:, :, 3] = np.where(np.array(cut) > 0, 0, a[:, :, 3])

    # 3) 髮緣殘留的亮色布料
    if bright_band:
        y0, y1, x0, x1 = bright_band
        band = np.zeros(a.shape[:2], bool)
        band[y0:y1, x0:x1] = True
        kill = band & (a[:, :, :3].min(axis=2) > BRIGHT_MIN)
        kill = ndimage.binary_dilation(kill, iterations=2) & band
        a[:, :, 3] = np.where(kill, 0, a[:, :, 3])

    return Image.fromarray(a)


def main():
    p = argparse.ArgumentParser()
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--video")
    src.add_argument("--image")
    p.add_argument("--at", type=float, default=2.75, help="從影片第幾秒取幀")
    p.add_argument("--no-cut", action="store_true", help="不要套用預設的路人切割多邊形")
    p.add_argument("-o", "--out", default=OUT)
    a = p.parse_args()

    im = grab_frame(a.video, a.at) if a.video else Image.open(a.image).convert("RGB")
    print(f"· 來源尺寸 {im.size}")
    out = cutout(im, None if a.no_cut else DEFAULT_CUT,
                 None if a.no_cut else BRIGHT_BAND)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    out.save(a.out)
    print(f"✓ {a.out}  bbox={out.getbbox()}")
    print("  請開起來確認背景沒有殘留路人，需要的話調 DEFAULT_CUT。")


if __name__ == "__main__":
    sys.exit(main())
