#!/usr/bin/env python3
"""理賠申請書填表引擎（全球人壽／三商美邦／國泰人壽學團險）。

本檔案不含任何客戶資料。案件資料一律由外部 JSON 傳入。
輸出一律為未簽名草稿，且每家保險公司只輸出其表單的第 1 頁。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz

CJK = "china-t"
ASC = "helv"
INK = (0, 0, 0)

# ---------------------------------------------------------------------------
# 版面定義
#   page      : 該保險公司表單在來源 PDF 中的頁索引
#   checkboxes: 名稱 -> (x0, y0, x1, y1)
#   grids     : 名稱 -> (x0, x1, 格數, baseline_y, 字級)
#   texts     : 名稱 -> (x, baseline_y, 字型, 字級)
# ---------------------------------------------------------------------------
LAYOUTS: dict[str, dict] = {
    "全球人壽": {
        "page": 0,
        "edition": "2026.03",
        "checkboxes": {
            "同保單住所地址": (124.7, 166.2, 135.7, 177.3),
            "個人保險": (85.2, 200.7, 96.2, 211.7),
            "醫療": (85.3, 283.8, 96.4, 294.9),
            "疾病": (112.7, 314.7, 123.7, 325.7),
            "意外": (175.3, 314.7, 186.4, 325.7),
            "關係_本人": (283.7, 327.9, 293.6, 337.9),
            "關係_配偶": (323.3, 327.9, 333.2, 337.9),
            "關係_子女": (363.1, 327.9, 373.1, 337.9),
            "關係_父母": (402.8, 327.9, 412.8, 337.9),
            "匯款": (210.7, 396.8, 221.8, 407.8),
            "支票": (253.2, 396.8, 264.2, 407.8),
            "給付_受益人": (76.2, 411.9, 87.2, 422.9),
            "給付_法定代理人": (296.4, 411.9, 307.4, 422.9),
        },
        "grids": {"身分證": (225.2, 444.8, 10, 73, 11)},
        "texts": {
            "姓名": (62, 73, CJK, 11),
            "職業及職務": (155, 73, CJK, 9),
            "生日_年": (478, 73, ASC, 10),
            "生日_月": (511, 73, ASC, 10),
            "生日_日": (539, 73, ASC, 10),
            "聯絡電話": (175, 91, ASC, 11),
            "事故日_年": (112, 338, ASC, 10),
            "事故日_月": (155, 338, ASC, 10),
            "事故日_日": (195, 338, ASC, 10),
            "經過1": (30, 376, CJK, 8),
            "經過2": (30, 385.5, CJK, 8),
            "法代身分證": (487, 421, ASC, 9),
            "戶名": (296, 437, CJK, 10),
            "銀行": (80, 454, CJK, 10),
            "分行": (200, 454, CJK, 10),
            "帳號": (370, 454, ASC, 10),
            "法代簽章區_身分證": (352, 777, ASC, 10),
            "法代簽章區_生日": (497, 777, ASC, 10),
        },
    },
    "三商美邦": {
        "page": 1,
        "edition": "CL106C",
        "checkboxes": {
            "險別_個人險": (101.2, 177.8, 112.2, 188.6),
            "險別_團體險": (161.7, 177.8, 172.7, 188.6),
            "理賠型態_醫療": (101.2, 191.5, 112.2, 202.3),
            "事故原因_意外": (46.7, 217.0, 57.7, 227.7),
            "事故原因_疾病": (101.7, 217.0, 112.7, 227.7),
            "帳戶_同事故人": (203.6, 317.5, 214.6, 328.3),
            "匯款帳戶_同前次": (100.9, 333.7, 111.9, 344.4),
            "匯款帳戶_其他帳戶": (100.9, 345.4, 111.9, 356.2),
            "聯絡地址_同收費地址": (94.3, 393.5, 105.3, 404.3),
        },
        "grids": {
            "身分證": (97.1, 306.8, 10, 122, 11),
            "生日_年": (97.1, 166.2, 3, 143, 10),
            "生日_月": (184.2, 228.7, 2, 143, 10),
            "生日_日": (246.8, 291.3, 2, 143, 10),
            "受款人身分證": (372.8, 552.8, 10, 328, 10),
            "帳號": (271.0, 535.0, 16, 388, 9),
            "申請人身分證": (107.4, 289.0, 10, 731, 10),
            "法代身分證": (389.3, 570.9, 10, 731, 10),
        },
        "texts": {
            "姓名": (99, 100, CJK, 11),
            "目前職業": (96, 165, CJK, 8),
            "曾就診醫院": (145, 239, CJK, 9),
            "經過詳情": (100, 276, CJK, 9),
            "帳號戶名": (99, 327, CJK, 10),
            "金融機構分行名稱": (44, 387, CJK, 8),
            "行動電話": (99, 430, ASC, 10),
        },
    },
    "國泰人壽": {
        "page": 2,
        "edition": "303002 學團險專用",
        "checkboxes": {
            "申請種類_疾病": (90.6, 195.2, 100.6, 205.2),
            "申請種類_意外": (199.5, 195.2, 209.5, 205.2),
            "專案補助": (90.6, 224.1, 100.6, 234.1),
            "理賠類別_死亡": (90.6, 239.0, 100.6, 249.0),
            "理賠類別_失能": (134.4, 239.0, 144.4, 249.0),
            "理賠類別_醫療": (315.5, 239.0, 325.5, 249.0),
            "領取_受益人帳戶": (90.6, 270.8, 100.6, 280.8),
            "領取_法定代理人帳戶": (195.6, 270.8, 205.6, 280.8),
            "領取_禁止背書轉讓支票": (90.6, 328.7, 100.6, 338.6),
            "受益人關係_本人": (135.1, 569.2, 145.1, 579.1),
            "受益人關係_父母": (170.2, 569.2, 180.1, 579.1),
        },
        "grids": {"郵遞區號": (90.6, 132.7, 3, 148, 10)},
        "texts": {
            "姓名": (140, 128, CJK, 11),
            "身分證": (265, 128, ASC, 11),
            "生日_年": (388, 128, ASC, 10),
            "生日_月": (458, 128, ASC, 10),
            "生日_日": (523, 128, ASC, 10),
            "縣市": (140, 148, CJK, 10),
            "鄉鎮區": (203, 148, CJK, 10),
            "街道地址": (292, 148, CJK, 10),
            "手機": (245, 167, ASC, 10),
            "事故原因": (92, 218, CJK, 9),
            "事故日_年": (428, 218, ASC, 10),
            "事故日_月": (485, 218, ASC, 10),
            "事故日_日": (538, 218, ASC, 10),
            "戶名": (130, 295, CJK, 10),
            "受款人身分證": (366, 295, ASC, 10),
            "金融機構": (138, 315, CJK, 8),
            "帳號": (396, 315, ASC, 10),
        },
    },
}


def tick(page: fitz.Page, box: tuple[float, float, float, float]) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    page.draw_line(fitz.Point(x0 + w * .18, y0 + h * .52),
                   fitz.Point(x0 + w * .42, y0 + h * .78), color=INK, width=1.1)
    page.draw_line(fitz.Point(x0 + w * .42, y0 + h * .78),
                   fitz.Point(x0 + w * .86, y0 + h * .18), color=INK, width=1.1)


def put_grid(page: fitz.Page, spec, value: str) -> None:
    x0, x1, n, y, size = spec
    step = (x1 - x0) / n
    for i, ch in enumerate(value[:n]):
        page.insert_text((x0 + step * (i + .5) - size * .28, y),
                         ch, fontname=ASC, fontsize=size, color=INK)


def fill(src: Path, insurer: str, data: dict, out: Path) -> None:
    layout = LAYOUTS[insurer]
    doc = fitz.open(src)
    page = doc[layout["page"]]

    for name in data.get("checkboxes", []):
        tick(page, layout["checkboxes"][name])
    for name, value in data.get("grids", {}).items():
        if value:
            put_grid(page, layout["grids"][name], value)
    for name, value in data.get("texts", {}).items():
        if value:
            x, y, font, size = layout["texts"][name]
            page.insert_text((x, y), value, fontname=font, fontsize=size, color=INK)

    single = fitz.open()
    single.insert_pdf(doc, from_page=layout["page"], to_page=layout["page"])
    single.save(out, garbage=4, deflate=True)
    single.close()
    doc.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--form", required=True, type=Path)
    ap.add_argument("--case", required=True, type=Path)
    ap.add_argument("--outdir", required=True, type=Path)
    args = ap.parse_args()

    case = json.loads(args.case.read_text(encoding="utf-8"))
    args.outdir.mkdir(parents=True, exist_ok=True)
    for insurer, data in case["insurers"].items():
        out = args.outdir / f"{insurer}_理賠申請書_草稿.pdf"
        fill(args.form, insurer, data, out)
        print(f"written: {out}")


if __name__ == "__main__":
    main()
