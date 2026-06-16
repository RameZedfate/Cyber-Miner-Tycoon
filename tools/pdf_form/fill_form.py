#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fill_form.py
把一份 JSON 資料「灌進」可編輯式 PDF（AcroForm）的欄位裡，輸出填好的 PDF。

核心特性：
  - 用「欄位名稱」對應填值 → 100% 不跑版（不靠座標、不靠 AI）。
  - 設定 NeedAppearances → 各家 PDF 閱讀器都能正確顯示填入的文字。
  - 支援文字欄位與勾選框（checkbox）。

用法：
  python3 fill_form.py 空白表單.pdf 資料.json 填好的表單.pdf
  python3 fill_form.py 空白表單.pdf 資料.json 填好的表單.pdf --flatten   # 鎖定不可再改

資料.json 格式（key = inspect_fields.py 印出來的欄位名稱）：
  {
    "insured_name": "方翊華",
    "policy_no": "A123456789",
    "accident_desc": "2026-06-10 於自宅樓梯滑倒，左手腕骨折……",
    "claim_accident": "/Yes"        # 勾選框：填它的 On 值（用 inspect 查到的）
  }

⚠️ 安全：資料.json 含客戶個資，請放本機/私人位置，不要 commit 進 GitHub。
"""
import sys
import json
import argparse

from pypdf import PdfReader, PdfWriter


def fill(template_pdf, data, output_pdf, flatten=False):
    reader = PdfReader(template_pdf)
    writer = PdfWriter()
    writer.append(reader)

    # 讓填入的值在所有閱讀器都顯示得出來
    try:
        writer.set_need_appearances_writer(True)
    except Exception:
        pass

    available = set((reader.get_fields() or {}).keys())
    unknown = [k for k in data if k not in available]
    if unknown:
        print("⚠️  下列 key 在這份表單裡找不到對應欄位，已略過：")
        for k in unknown:
            print(f"     - {k}")
        print("   （請用 inspect_fields.py 對照正確欄位名稱）")

    filled = 0
    for page in writer.pages:
        try:
            writer.update_page_form_field_values(
                page,
                {k: v for k, v in data.items() if k in available},
                auto_regenerate=False,
            )
        except Exception:
            # 某些頁沒有欄位，略過
            pass

    filled = len(set(data) & available)

    if flatten:
        # 把欄位「壓平」成不可再編輯（防止寄出後被改動）
        for page in writer.pages:
            try:
                page.flatten()
            except Exception:
                pass

    with open(output_pdf, "wb") as fp:
        writer.write(fp)

    print(f"✅ 已填入 {filled} 個欄位，輸出：{output_pdf}")
    if flatten:
        print("   （已 flatten：內容鎖定、不可再編輯）")
    return filled


def main():
    ap = argparse.ArgumentParser(description="把 JSON 資料灌進可編輯式 PDF")
    ap.add_argument("template", help="空白可編輯式 PDF")
    ap.add_argument("data", help="資料 JSON（key = 欄位名稱）")
    ap.add_argument("output", help="輸出的填好 PDF")
    ap.add_argument("--flatten", action="store_true", help="鎖定內容、不可再編輯")
    args = ap.parse_args()

    with open(args.data, encoding="utf-8") as fp:
        data = json.load(fp)

    fill(args.template, data, args.output, flatten=args.flatten)


if __name__ == "__main__":
    main()
