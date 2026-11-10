"""claim_overlay_fill 的行為測試。

不需要保險公司的空白表單：以宣告的頁面尺寸合成空白頁，驗證寫入結果一定
落在方框內、逐格欄位一格一字元、尺寸不符會提出警告。所有測試資料皆為虛構。
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import fitz

SKILL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL_DIR / "scripts"))

from claim_overlay_fill import fill, find_overlapping_fields  # noqa: E402
from claim_overlay_layout import LAYOUTS, get_layout  # noqa: E402

INSURERS = ("shin_kong", "yuanta", "farglory", "fubon_114_11",
            "kgi", "hontai", "prudential")


def fake_cells(count: int) -> str:
    """產生逐格欄位的假值。

    刻意避開真實身分證與長數字的樣式，否則 skill 的個資掃描測試會誤判——
    那個掃描分不出真假，這是它應有的保守行為。
    """
    return ("X9" * ((count + 1) // 2))[:count]


def blank_form(path: Path, size) -> None:
    doc = fitz.open()
    doc.new_page(width=size[0], height=size[1])
    doc.save(path)
    doc.close()


# 依各版面 formats 規定必須符合特定寫法的欄位（虛構值）
FORMAT_SAFE_VALUES = {
    "address_city": "高雄市",
    "address_district": "小港區",
    "address_number": "79",
}


def sample_case(insurer: str) -> dict:
    layout = get_layout(insurer)
    return {
        "checks": list(layout["checks"]),
        "segments": {name: fake_cells(config["count"])
                     for name, config in layout["segments"].items()},
        "fields": {name: FORMAT_SAFE_VALUES.get(name, "測試值")
                   for name in layout["fields"]},
    }


class ClaimOverlayFillTests(unittest.TestCase):
    def test_every_layout_fills_without_overflow(self) -> None:
        for insurer in INSURERS:
            with self.subTest(insurer=insurer), tempfile.TemporaryDirectory() as tmp:
                tmp_path = Path(tmp)
                form = tmp_path / "blank.pdf"
                blank_form(form, LAYOUTS[insurer]["page"])
                report = fill(form, insurer, sample_case(insurer), tmp_path / "out.pdf")
                self.assertTrue(report["page_size_match"])
                self.assertEqual([], report["warnings"])
                self.assertEqual(len(LAYOUTS[insurer]["checks"]), len(report["checks"]))

    def test_output_is_single_page(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, LAYOUTS["kgi"]["page"])
            out = tmp_path / "out.pdf"
            fill(form, "kgi", sample_case("kgi"), out)
            doc = fitz.open(out)
            self.assertEqual(1, doc.page_count)
            doc.close()

    def test_written_text_stays_inside_its_declared_box(self) -> None:
        """逐欄比對輸出文字的 bbox 是否落在版面宣告的方框內。"""
        layout = get_layout("hontai")
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, layout["page"])
            out = tmp_path / "out.pdf"
            case = {"checks": [], "segments": {},
                    "fields": {name: "ABCxyz" for name in layout["fields"]}}
            fill(form, "hontai", case, out)

            doc = fitz.open(out)
            # 用逐字 bbox，不用 words：相鄰欄位的字會被 words 合併成一個 bbox，
            # 看起來像溢出，其實是版面方框互相重疊。
            chars = [char
                     for block in doc[0].get_text("rawdict")["blocks"]
                     for line in block.get("lines", [])
                     for span in line.get("spans", [])
                     for char in span.get("chars", [])]
            doc.close()
            self.assertTrue(chars, "輸出頁面沒有任何文字")

            boxes = list(layout["fields"].values())
            for char in chars:
                x0, y0, x1, y1 = char["bbox"]
                inside = any(
                    left - 1 <= x0 and x1 <= right + 1 and top - 1 <= y0 and y1 <= bottom + 1
                    for left, top, right, bottom in boxes
                )
                self.assertTrue(inside, f"字元 {char['c']!r} bbox {(x0, y0, x1, y1)} 落在所有宣告方框之外")

    def test_overlapping_layout_boxes_are_detected(self) -> None:
        """方框重疊時兩欄的值會壓在一起，但各自檢查都「在框內」，需要另外偵測。

        這裡如實記錄 claim_overlay_layout.py 目前的重疊狀況。等上游修正座標後，
        本測試會失敗，屆時把已修好的項目從 KNOWN_OVERLAPS 移除即可。
        """
        known_overlaps = {
            # 宏泰：事故年右緣 395 壓到事故月左緣 390；銀行左緣 380 壓到受益人身分證右緣 395
            "hontai": {("accident_month", "accident_year"),
                       ("bank", "beneficiary_identity")},
            # 新光：申請人區三列的方框上下各壓到 4pt
            "shin_kong": {("mobile", "signer_birth_nationality"),
                          ("signer_birth_nationality", "signer_identity")},
        }
        for insurer in INSURERS:
            with self.subTest(insurer=insurer):
                found = set(find_overlapping_fields(get_layout(insurer)))
                self.assertEqual(known_overlaps.get(insurer, set()), found)

    def test_long_value_shrinks_instead_of_spilling(self) -> None:
        layout = get_layout("prudential")
        narrative = layout["fields"]["narrative"]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, layout["page"])
            out = tmp_path / "out.pdf"
            report = fill(form, "prudential", {
                "checks": [], "segments": {},
                "fields": {"narrative": "騎車自摔擦傷" * 12},
            }, out)
            self.assertEqual([], report["warnings"])
            self.assertLessEqual(report["fields"]["narrative"]["size"], 11.0)

            doc = fitz.open(out)
            block = doc[0].get_text("words")
            doc.close()
            bottom_used = max(w[3] for w in block)
            self.assertLessEqual(bottom_used, narrative[3] + 1)

    def test_segments_write_one_character_per_cell(self) -> None:
        layout = get_layout("shin_kong")
        rect = layout["segments"]["identity"]["rect"]
        count = layout["segments"]["identity"]["count"]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, layout["page"])
            out = tmp_path / "out.pdf"
            report = fill(form, "shin_kong", {
                "checks": [], "fields": {},
                "segments": {"identity": fake_cells(10)},
            }, out)
            self.assertEqual(count, report["segments"]["identity"]["written"])
            self.assertFalse(report["segments"]["identity"]["truncated"])

            doc = fitz.open(out)
            chars = [c for c in doc[0].get_text("rawdict")["blocks"]
                     for line in c.get("lines", [])
                     for span in line.get("spans", [])
                     for c in span.get("chars", [])]
            doc.close()
            self.assertEqual(count, len(chars))
            step = (rect[2] - rect[0]) / count
            for index, char in enumerate(chars):
                centre = (char["bbox"][0] + char["bbox"][2]) / 2
                expected = rect[0] + step * (index + 0.5)
                self.assertAlmostEqual(centre, expected, delta=step / 2)

    def test_oversized_value_is_reported_as_truncated(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, LAYOUTS["farglory"]["page"])
            report = fill(form, "farglory", {
                "checks": [], "fields": {},
                "segments": {"identity": fake_cells(14)},
            }, tmp_path / "out.pdf")
            self.assertTrue(report["segments"]["identity"]["truncated"])
            self.assertTrue(any("截斷" in w for w in report["warnings"]))

    def test_wrong_page_size_is_flagged(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            form = tmp_path / "blank.pdf"
            blank_form(form, (300, 400))
            report = fill(form, "yuanta", {"checks": [], "segments": {}, "fields": {}},
                          tmp_path / "out.pdf")
            self.assertFalse(report["page_size_match"])
            self.assertTrue(any("尺寸" in w for w in report["warnings"]))


if __name__ == "__main__":
    unittest.main()
