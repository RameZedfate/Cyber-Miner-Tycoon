#!/usr/bin/env python3
"""以矩形版面（claim_overlay_layout.py）填寫理賠申請書第一頁。

claim_overlay_layout.py 只提供欄位方框座標，沒有寫入邏輯；本模組是它與實際
輸出之間的轉接層，負責把值放進方框內並保證不越界。

與 claim_forms.py 的分工：
- claim_forms.py       單點座標，用於全球人壽／三商美邦／國泰學團險（已實案驗證）
- claim_overlay_fill.py 矩形座標，用於 claim_overlay_layout.py 收錄的七家

本檔案不含任何客戶資料。案件資料一律由外部 JSON 傳入。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parent))
from claim_overlay_layout import get_layout, validate_layout  # noqa: E402

CJK = "china-t"
ASC = "helv"
INK = (0, 0, 0)

PADDING = 1.5          # 方框內縮，避免壓到印刷格線
MAX_SIZE = 11.0
MIN_SIZE = 5.5
LINE_RATIO = 1.18      # 行距＝字級 × 此值
CJK_START = 0x2E80     # 由此碼位起視為全形字


def _is_cjk(text: str) -> bool:
    return any(ord(ch) >= CJK_START for ch in text)


def _text_width(text: str, size: float, font: str) -> float:
    """用真實字型度量。估算會低估大寫字母，導致寫出方框外。"""
    return fitz.get_text_length(text, fontname=font, fontsize=size)


def _wrap(text: str, size: float, max_width: float, font: str) -> list[str]:
    """逐字斷行。中文沒有空白可斷，只能按字寬切。"""
    lines: list[str] = []
    current = ""
    for ch in text:
        if ch == "\n":
            lines.append(current)
            current = ""
            continue
        if _text_width(current + ch, size, font) > max_width and current:
            lines.append(current)
            current = ch
        else:
            current += ch
    lines.append(current)
    return lines


def _fit(text: str, box_w: float, box_h: float, font: str) -> tuple[float, list[str]]:
    """由大到小試字級，回傳第一個「寬高都放得下」的字級與斷行結果。"""
    size = MAX_SIZE
    while size >= MIN_SIZE:
        lines = _wrap(text, size, box_w, font)
        if (len(lines) * size * LINE_RATIO <= box_h
                and max(_text_width(line, size, font) for line in lines) <= box_w):
            return size, lines
        size -= 0.5
    return MIN_SIZE, _wrap(text, MIN_SIZE, box_w, font)


def find_overlapping_fields(layout: dict) -> list[tuple[str, str]]:
    """找出互相重疊的欄位方框。

    claim_overlay_layout.validate_layout 只檢查方框有沒有超出頁面，不檢查彼此
    是否重疊。方框重疊時，兩欄的值會壓在一起，但每一欄各自看又都「在框內」。
    """
    items = sorted(layout.get("fields", {}).items())
    overlaps: list[tuple[str, str]] = []
    for i, (name_a, a) in enumerate(items):
        for name_b, b in items[i + 1:]:
            if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                overlaps.append((name_a, name_b))
    return overlaps


def tick(page: fitz.Page, rect) -> None:
    """以向量筆畫畫勾，字型缺字也不會消失。"""
    left, top, right, bottom = rect
    w, h = right - left, bottom - top
    page.draw_line(fitz.Point(left + w * .18, top + h * .52),
                   fitz.Point(left + w * .42, top + h * .78), color=INK, width=1.1)
    page.draw_line(fitz.Point(left + w * .42, top + h * .78),
                   fitz.Point(left + w * .86, top + h * .18), color=INK, width=1.1)


def put_box(page: fitz.Page, rect, value: str, align: str = "left") -> dict:
    """把值放進方框，字級自動縮到放得下為止。回傳這個欄位的處理結果。"""
    left, top, right, bottom = rect
    box_w = right - left - PADDING * 2
    box_h = bottom - top - PADDING * 2
    font = CJK if _is_cjk(value) else ASC
    size, lines = _fit(value, box_w, box_h, font)

    block_h = len(lines) * size * LINE_RATIO
    first_baseline = top + PADDING + (box_h - block_h) / 2 + size * 0.82

    overflow = False
    for i, line in enumerate(lines):
        line_w = _text_width(line, size, font)
        if line_w > box_w + 0.5:
            overflow = True
        x = left + PADDING
        if align == "center":
            x = left + (right - left - line_w) / 2
        page.insert_text((x, first_baseline + i * size * LINE_RATIO),
                         line, fontname=font, fontsize=size, color=INK)

    if block_h > box_h + 0.5:
        overflow = True
    return {"size": round(size, 1), "lines": len(lines), "overflow": overflow}


def put_segments(page: fitz.Page, rect, count: int, value: str) -> dict:
    """逐格填寫（身分證、帳號）：一格一字元。"""
    left, top, right, bottom = rect
    step = (right - left) / count
    size = min(MAX_SIZE, (bottom - top) * 0.62, step * 0.95)
    while size > MIN_SIZE and max(
            (_text_width(ch, size, ASC) for ch in value[:count]), default=0) > step * 0.92:
        size -= 0.25
    baseline = top + (bottom - top) / 2 + size * 0.36
    for i, ch in enumerate(value[:count]):
        cx = left + step * (i + .5)
        page.insert_text((cx - _text_width(ch, size, ASC) / 2, baseline),
                         ch, fontname=ASC, fontsize=size, color=INK)
    return {"size": round(size, 1), "written": min(len(value), count),
            "cells": count, "truncated": len(value) > count}


def fill(form: Path, insurer: str, data: dict, out: Path,
         page_index: int = 0) -> dict:
    layout = get_layout(insurer)
    issues = validate_layout(layout)
    if issues:
        raise SystemExit(f"版面座標有問題，停止填寫：{issues}")

    doc = fitz.open(form)
    page = doc[page_index]
    declared = layout["page"]
    actual = (round(page.rect.width, 2), round(page.rect.height, 2))
    report: dict = {
        "insurer": insurer,
        "declared_page": list(declared),
        "actual_page": list(actual),
        "page_size_match": abs(declared[0] - actual[0]) < 2 and abs(declared[1] - actual[1]) < 2,
        "fields": {}, "segments": {}, "checks": [], "warnings": [],
        "layout_overlaps": [list(pair) for pair in find_overlapping_fields(layout)],
    }
    if not report["page_size_match"]:
        report["warnings"].append(
            f"表單頁面尺寸 {actual} 與版面宣告的 {tuple(declared)} 不符，座標可能整體偏移，請人工確認")

    formats = layout.get("formats", {})
    for name in data.get("checks", []):
        tick(page, layout["checks"][name])
        report["checks"].append(name)

    for name, value in data.get("segments", {}).items():
        if not value:
            continue
        config = layout["segments"][name]
        result = put_segments(page, config["rect"], config["count"], str(value))
        report["segments"][name] = result
        if result["truncated"]:
            report["warnings"].append(f"{name}：值長度超過 {result['cells']} 格，已截斷")

    for name, value in data.get("fields", {}).items():
        if not value:
            continue
        value = str(value)
        align = "center" if formats.get(name) == "roc_text_centered" else "left"
        result = put_box(page, layout["fields"][name], value, align)
        report["fields"][name] = result
        if result["overflow"]:
            report["warnings"].append(f"{name}：即使縮到最小字級仍超出方框，請人工確認")
        if formats.get("address_number") == "digits_only" and name == "address_number":
            if not value.isdigit():
                report["warnings"].append("address_number 依版面規定只應填數字，表單已印「號」")

    if formats.get("city_district_full_names"):
        fields = data.get("fields", {})
        if fields.get("address_city") and not str(fields["address_city"]).endswith(("市", "縣")):
            report["warnings"].append("address_city 需填全名並含「市」或「縣」，例如「高雄市」")
        if fields.get("address_district") and not str(fields["address_district"]).endswith(
                ("區", "鄉", "鎮", "市")):
            report["warnings"].append("address_district 需填全名並含「區」「鄉」「鎮」或「市」，例如「小港區」")

    single = fitz.open()
    single.insert_pdf(doc, from_page=page_index, to_page=page_index)
    single.save(out, garbage=4, deflate=True)
    single.close()
    doc.close()
    report["output"] = str(out)
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description="以矩形版面填寫理賠申請書第一頁草稿。")
    ap.add_argument("--form", required=True, type=Path, help="空白表單 PDF")
    ap.add_argument("--insurer", required=True, help="claim_overlay_layout.LAYOUTS 的鍵值")
    ap.add_argument("--case", required=True, type=Path, help="案件資料 JSON（含個資，勿進版控）")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--page", type=int, default=0)
    args = ap.parse_args()

    data = json.loads(args.case.read_text(encoding="utf-8"))
    report = fill(args.form, args.insurer, data, args.out, args.page)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["warnings"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
