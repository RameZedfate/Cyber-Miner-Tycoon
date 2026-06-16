#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inspect_fields.py
看一份「可編輯式 PDF（AcroForm）」裡面有哪些可填欄位。

用途：
  - 確認這份表單是不是「可編輯式」（有欄位 = 是；沒欄位 = 掃描檔，要走座標疊字那條路）。
  - 把所有欄位名稱、型別印出來，方便你建立「資料 → 欄位名稱」的對應設定檔（mapping）。

用法：
  python3 inspect_fields.py 你的表單.pdf
  python3 inspect_fields.py 你的表單.pdf --json 欄位清單.json   # 另存成 JSON 範本

注意：請用「空白」表單（沒有客戶個資）來檢查，產出的欄位清單可安全放進 repo。
"""
import sys
import json
import argparse

from pypdf import PdfReader


FIELD_TYPE_NAMES = {
    "/Tx": "文字 (text)",
    "/Btn": "按鈕/勾選 (checkbox/radio)",
    "/Ch": "下拉/清單 (choice)",
    "/Sig": "簽名 (signature)",
}


def inspect(pdf_path):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    if not fields:
        print("⚠️  這份 PDF 沒有偵測到任何可填欄位。")
        print("   => 它很可能是『掃描檔/平面 PDF』，請改用『座標疊字』的做法，不要用本工具。")
        return []

    result = []
    print(f"✅ 偵測到 {len(fields)} 個可填欄位：\n")
    for name, f in fields.items():
        ftype = f.get("/FT")
        type_label = FIELD_TYPE_NAMES.get(ftype, str(ftype))
        # checkbox/radio 的可選值（On 狀態叫什麼）
        states = None
        if ftype == "/Btn":
            states = sorted({str(s) for s in (f.get("/_States_") or []) if str(s) != "/Off"})
        entry = {
            "field_name": name,
            "type": type_label,
            "current_value": str(f.get("/V")) if f.get("/V") is not None else "",
        }
        if states:
            entry["checkbox_on_values"] = states
        result.append(entry)
        line = f"  • {name}  [{type_label}]"
        if states:
            line += f"  勾選值: {states}"
        print(line)
    return result


def main():
    ap = argparse.ArgumentParser(description="列出可編輯式 PDF 的所有欄位")
    ap.add_argument("pdf", help="要檢查的 PDF 路徑")
    ap.add_argument("--json", help="把欄位清單另存成 JSON（可當 mapping 範本）")
    args = ap.parse_args()

    fields = inspect(args.pdf)

    if args.json and fields:
        # 產出一份「空白對應範本」：把欄位名稱當 key，值留空，給你/AI 之後填對應
        template = {item["field_name"]: "" for item in fields}
        with open(args.json, "w", encoding="utf-8") as fp:
            json.dump(template, fp, ensure_ascii=False, indent=2)
        print(f"\n📝 已輸出對應範本到：{args.json}")
        print("   （把每個欄位的值填上，或交給 AI 草擬後，再用 fill_form.py 灌進去）")


if __name__ == "__main__":
    main()
