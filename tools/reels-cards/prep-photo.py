#!/usr/bin/env python3
"""把手機自拍處理成字卡可用的去背 PNG。

用法：
    pip install rembg onnxruntime pillow numpy
    python3 tools/reels-cards/prep-photo.py <原始照片> -o adam.png [--rotate -34]

做四件事：
    1. 套用 EXIF 方向（手機拍的常常是躺著的）
    2. 去背（rembg u2net）
    3. 旋轉扶正（自拍常常是斜的，--rotate 負值為順時針）
    4. 清掉背景色殘影（預設清紅色，例如春聯／紅布幔）

⚠️ 順序很重要：**先去背再旋轉**。反過來做的話，旋轉後的白色填充區會讓
模型把整張原圖矩形都當成前景（實測 u2net_human_seg 會整片失敗）。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def prep(
    src: Path,
    dst: Path,
    rotate: float,
    max_side: int,
    strip: str,
    strip_threshold: int,
    crop_top: int,
) -> None:
    import numpy as np
    from PIL import Image, ImageOps
    from rembg import new_session, remove

    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    print(f"  方向校正 → {im.size}")

    im.thumbnail((max_side, max_side), Image.LANCZOS)

    cut = remove(
        im,
        session=new_session("u2net"),
        post_process_mask=True,
        alpha_matting=True,
        alpha_matting_foreground_threshold=250,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=12,
    )
    print("  去背完成")

    if rotate:
        cut = cut.rotate(rotate, resample=Image.BICUBIC, expand=True)
        print(f"  旋轉 {rotate}°")

    if strip != "none":
        a = np.array(cut)
        rgb = a[:, :, :3].astype(int)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

        # 門檻要拉得夠高才不會咬到膚色與嘴唇：
        # 膚色的 R-G 大約 30-60，紅布幔／春聯大約 150 以上
        if strip == "red":
            mask = (r - g > strip_threshold) & (r - b > strip_threshold)
        elif strip == "green":
            mask = (g - r > strip_threshold) & (g - b > strip_threshold)
        elif strip == "blue":
            mask = (b - r > strip_threshold) & (b - g > strip_threshold)
        else:
            sys.exit(f"不認得的 --strip：{strip}")

        removed = mask.sum()
        a[:, :, 3] = np.where(mask, 0, a[:, :, 3])
        cut = Image.fromarray(a)
        print(f"  清掉 {strip} 殘影 {removed:,} 像素")

    bbox = cut.getbbox()
    if not bbox:
        sys.exit("去背後整張都是透明的，檢查來源照片。")
    cut = cut.crop(bbox)

    if crop_top:
        # 背景色若貼著髮頂（例如頭後面就是紅布幔），色鍵清不掉那一條，
        # 因為它跟深色頭髮的色差太接近。直接裁掉最上面幾列最乾淨。
        cut = cut.crop((0, crop_top, cut.width, cut.height))
        cut = cut.crop(cut.getbbox())
        print(f"  裁掉頂端 {crop_top}px")

    dst.parent.mkdir(parents=True, exist_ok=True)
    cut.save(dst)
    print(f"\n完成：{dst}  {cut.size[0]}x{cut.size[1]}")


def main() -> None:
    ap = argparse.ArgumentParser(description="自拍 → 字卡用去背 PNG")
    ap.add_argument("src", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument(
        "--rotate", type=float, default=0.0,
        help="扶正角度，負值為順時針（例：自拍歪 34 度就給 -34）",
    )
    ap.add_argument("--max-side", type=int, default=1600, help="處理前先縮到的最長邊")
    ap.add_argument(
        "--strip", default="red", choices=("red", "green", "blue", "none"),
        help="要清掉的背景色殘影，預設 red",
    )
    ap.add_argument(
        "--strip-threshold", type=int, default=95,
        help="色差門檻，越低清越兇但可能咬到膚色（預設 95）",
    )
    ap.add_argument(
        "--crop-top", type=int, default=0,
        help="裁掉頂端幾個像素，用來清掉貼著髮頂、色鍵清不掉的背景條",
    )
    args = ap.parse_args()

    if not args.src.exists():
        sys.exit(f"找不到照片：{args.src}")

    prep(args.src, args.out, args.rotate, args.max_side, args.strip,
         args.strip_threshold, args.crop_top)


if __name__ == "__main__":
    main()
