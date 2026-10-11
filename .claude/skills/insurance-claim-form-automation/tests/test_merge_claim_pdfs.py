from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader, PdfWriter


SKILL_ROOT = Path(__file__).resolve().parents[1]


def write_blank_pdf(path: Path, widths: list[int]) -> None:
    writer = PdfWriter()
    for width in widths:
        writer.add_blank_page(width=width, height=842)
    with path.open("wb") as stream:
        writer.write(stream)


class MergeClaimPdfsTests(unittest.TestCase):
    def test_preserves_every_approved_page_in_input_order(self) -> None:
        script = SKILL_ROOT / "scripts" / "merge_claim_pdfs.py"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            first = temp_path / "first.pdf"
            second = temp_path / "second.pdf"
            output = temp_path / "combined.pdf"
            write_blank_pdf(first, [101])
            write_blank_pdf(second, [201, 202])

            completed = subprocess.run(
                [sys.executable, str(script), "--out", str(output), str(first), str(second)],
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(0, completed.returncode, completed.stderr)
            merged = PdfReader(output)
            widths = [round(float(page.mediabox.width)) for page in merged.pages]
            self.assertEqual([101, 201, 202], widths)


if __name__ == "__main__":
    unittest.main()
