#!/usr/bin/env python3
"""理賠申請書填表引擎（全球人壽／三商美邦／國泰人壽學團險）。

本檔案不含任何客戶資料。案件資料一律由外部 JSON 傳入。
輸出一律為未簽名草稿。

欄位規格一律以「頁索引」開頭，因此同一家保險公司可跨多頁填寫：
    checkboxes: 名稱 -> (page, x0, y0, x1, y1)
    grids     : 名稱 -> (page, x0, x1, 格數, baseline_y, 字級)
    texts     : 名稱 -> (page, x, baseline_y, 字型, 字級)
    output_pages: 交付時要輸出的頁索引（依序）
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz

CJK = "china-t"
ASC = "helv"
INK = (0, 0, 0)

LAYOUTS: dict[str, dict] = {
    "全球人壽": {
        "edition": "2026.03",
        "output_pages": [0],
        "checkboxes": {
            "同保單住所地址": (0, 124.7, 166.2, 135.7, 177.3),
            "個人保險": (0, 85.2, 200.7, 96.2, 211.7),
            "醫療": (0, 85.3, 283.8, 96.4, 294.9),
            "疾病": (0, 112.7, 314.7, 123.7, 325.7),
            "意外": (0, 175.3, 314.7, 186.4, 325.7),
            "關係_本人": (0, 283.7, 327.9, 293.6, 337.9),
            "關係_配偶": (0, 323.3, 327.9, 333.2, 337.9),
            "關係_子女": (0, 363.1, 327.9, 373.1, 337.9),
            "關係_父母": (0, 402.8, 327.9, 412.8, 337.9),
            "匯款": (0, 210.7, 396.8, 221.8, 407.8),
            "支票": (0, 253.2, 396.8, 264.2, 407.8),
            "給付_受益人": (0, 76.2, 411.9, 87.2, 422.9),
            "給付_法定代理人": (0, 296.4, 411.9, 307.4, 422.9),
        },
        "grids": {"身分證": (0, 225.2, 444.8, 10, 73, 11)},
        "texts": {
            "姓名": (0, 62, 73, CJK, 11),
            "職業及職務": (0, 155, 73, CJK, 9),
            "生日_年": (0, 478, 73, ASC, 10),
            "生日_月": (0, 511, 73, ASC, 10),
            "生日_日": (0, 539, 73, ASC, 10),
            "聯絡電話": (0, 175, 91, ASC, 11),
            "事故日_年": (0, 112, 338, ASC, 10),
            "事故日_月": (0, 155, 338, ASC, 10),
            "事故日_日": (0, 195, 338, ASC, 10),
            "經過1": (0, 30, 376, CJK, 8),
            "經過2": (0, 30, 385.5, CJK, 8),
            "法代身分證": (0, 487, 421, ASC, 9),
            "戶名": (0, 296, 437, CJK, 10),
            "銀行": (0, 80, 454, CJK, 10),
            "分行": (0, 200, 454, CJK, 10),
            "帳號": (0, 370, 454, ASC, 10),
            "法代簽章區_身分證": (0, 352, 777, ASC, 10),
            "法代簽章區_生日": (0, 497, 777, ASC, 10),
        },
    },
    "三商美邦": {
        "edition": "CL106C",
        "output_pages": [1],
        "checkboxes": {
            "險別_個人險": (1, 101.2, 177.8, 112.2, 188.6),
            "險別_團體險": (1, 161.7, 177.8, 172.7, 188.6),
            "理賠型態_醫療": (1, 101.2, 191.5, 112.2, 202.3),
            "事故原因_意外": (1, 46.7, 217.0, 57.7, 227.7),
            "事故原因_疾病": (1, 101.7, 217.0, 112.7, 227.7),
            "帳戶_同事故人": (1, 203.6, 317.5, 214.6, 328.3),
            "匯款帳戶_同前次": (1, 100.9, 333.7, 111.9, 344.4),
            "匯款帳戶_其他帳戶": (1, 100.9, 345.4, 111.9, 356.2),
            "聯絡地址_同收費地址": (1, 94.3, 393.5, 105.3, 404.3),
        },
        "grids": {
            "身分證": (1, 97.1, 306.8, 10, 122, 11),
            "生日_年": (1, 97.1, 166.2, 3, 143, 10),
            "生日_月": (1, 184.2, 228.7, 2, 143, 10),
            "生日_日": (1, 246.8, 291.3, 2, 143, 10),
            "受款人身分證": (1, 372.8, 552.8, 10, 328, 10),
            "帳號": (1, 271.0, 535.0, 16, 388, 9),
            "申請人身分證": (1, 107.4, 289.0, 10, 731, 10),
            "法代身分證": (1, 389.3, 570.9, 10, 731, 10),
        },
        "texts": {
            "姓名": (1, 99, 100, CJK, 11),
            "目前職業": (1, 96, 165, CJK, 8),
            "曾就診醫院": (1, 145, 239, CJK, 9),
            "經過詳情": (1, 100, 276, CJK, 9),
            "帳號戶名": (1, 99, 327, CJK, 10),
            "金融機構分行名稱": (1, 44, 387, CJK, 8),
            "行動電話": (1, 99, 430, ASC, 10),
        },
    },
    # 國泰學團險為兩頁交付：page 2 為本文（表單編號 303002），page 3 為附件（303004）
    "國泰人壽": {
        "edition": "303002/303004 學團險專用 114.12",
        "output_pages": [2, 3],
        "checkboxes": {
            "申請種類_疾病": (2, 90.6, 195.2, 100.6, 205.2),
            "申請種類_意外": (2, 199.5, 195.2, 209.5, 205.2),
            "專案補助": (2, 90.6, 224.1, 100.6, 234.1),
            "理賠類別_死亡": (2, 90.6, 239.0, 100.6, 249.0),
            "理賠類別_失能": (2, 134.4, 239.0, 144.4, 249.0),
            "理賠類別_醫療": (2, 315.5, 239.0, 325.5, 249.0),
            "領取_受益人帳戶": (2, 90.6, 270.8, 100.6, 280.8),
            "領取_法定代理人帳戶": (2, 195.6, 270.8, 205.6, 280.8),
            "領取_禁止背書轉讓支票": (2, 90.6, 328.7, 100.6, 338.6),
            "受益人關係_本人": (2, 135.1, 569.2, 145.1, 579.1),
            "受益人關係_父母": (2, 170.2, 569.2, 180.1, 579.1),
            "附件_領取_受益人帳戶": (3, 112.1, 99.0, 122.1, 108.9),
            "附件_領取_法定代理人帳戶": (3, 227.1, 99.0, 237.1, 108.9),
            "附件_領取_禁止背書轉讓支票": (3, 112.1, 115.3, 122.1, 125.2),
        },
        "grids": {
            "郵遞區號": (2, 90.6, 132.7, 3, 148, 10),
            "身分證": (2, 231.4, 369.7, 10, 128, 10),
            "受款人身分證": (2, 371.1, 571.1, 10, 295, 10),
            "附件_身分證": (3, 381.0, 571.1, 10, 76, 10),
            "附件_受款人身分證": (3, 417.3, 571.1, 10, 149, 10),
        },
        "texts": {
            "姓名": (2, 140, 128, CJK, 11),
            "生日_年": (2, 388, 128, ASC, 10),
            "生日_月": (2, 458, 128, ASC, 10),
            "生日_日": (2, 523, 128, ASC, 10),
            "縣市": (2, 140, 148, CJK, 10),
            "鄉鎮區": (2, 203, 148, CJK, 10),
            "街道地址": (2, 292, 148, CJK, 10),
            "手機": (2, 245, 167, ASC, 10),
            "事故原因": (2, 92, 218, CJK, 9),
            "事故日_年": (2, 428, 218, ASC, 10),
            "事故日_月": (2, 485, 218, ASC, 10),
            "事故日_日": (2, 538, 218, ASC, 10),
            "戶名": (2, 142, 295, CJK, 10),
            "金融機構": (2, 140, 315, CJK, 8),
            "帳號": (2, 396, 315, ASC, 10),
            "附件_姓名": (3, 200, 76, CJK, 11),
            "附件_戶名": (3, 116, 149, CJK, 10),
            "附件_金融機構": (3, 116, 169, CJK, 8),
            "附件_分行通匯代號": (3, 278, 169, ASC, 9),
            "附件_帳號": (3, 422, 169, ASC, 10),
        },
    },
}


def tick(page: fitz.Page, box) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    page.draw_line(fitz.Point(x0 + w * .18, y0 + h * .52),
                   fitz.Point(x0 + w * .42, y0 + h * .78), color=INK, width=1.1)
    page.draw_line(fitz.Point(x0 + w * .42, y0 + h * .78),
                   fitz.Point(x0 + w * .86, y0 + h * .18), color=INK, width=1.1)


def put_grid(page: fitz.Page, x0, x1, n, y, size, value: str) -> None:
    step = (x1 - x0) / n
    for i, ch in enumerate(value[:n]):
        page.insert_text((x0 + step * (i + .5) - size * .28, y),
                         ch, fontname=ASC, fontsize=size, color=INK)


def fill(src: Path, insurer: str, data: dict, out: Path) -> None:
    layout = LAYOUTS[insurer]
    doc = fitz.open(src)

    for name in data.get("checkboxes", []):
        page_no, *box = layout["checkboxes"][name]
        tick(doc[page_no], box)
    for name, value in data.get("grids", {}).items():
        if value:
            page_no, *spec = layout["grids"][name]
            put_grid(doc[page_no], *spec, value)
    for name, value in data.get("texts", {}).items():
        if value:
            page_no, x, y, font, size = layout["texts"][name]
            doc[page_no].insert_text((x, y), value, fontname=font, fontsize=size, color=INK)

    result = fitz.open()
    for page_no in layout["output_pages"]:
        result.insert_pdf(doc, from_page=page_no, to_page=page_no)
    result.save(out, garbage=4, deflate=True)
    result.close()
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
        pages = len(LAYOUTS[insurer]["output_pages"])
        print(f"written: {out}  ({pages} 頁)")


if __name__ == "__main__":
    main()
