from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfWriter


# 上游 repo 把 tests/ 放在 repo 根目錄；這裡 tests/ 在 skill 資料夾內，故路徑不同。
SKILL_ROOT = Path(__file__).resolve().parents[1]


class ClaimFormSkillContractTests(unittest.TestCase):
    def test_required_skill_files_exist(self) -> None:
        required = (
            "SKILL.md",
            "agents/openai.yaml",
            "references/claim-contract.md",
            "scripts/validate_claim_output.py",
        )
        missing = [path for path in required if not (SKILL_ROOT / path).is_file()]
        self.assertEqual([], missing, f"missing required skill files: {missing}")

    def test_skill_contains_the_durable_claim_rules(self) -> None:
        text = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        required_phrases = (
            "name: insurance-claim-form-automation",
            "Use when",
            "全球人壽",
            "台灣人壽",
            "只交付第 1 頁",
            "不要求保單號碼",
            "不詢問或填寫地址",
            "事故經過",
            "不自動簽名、蓋章或送件",
            "SHA-256",
            "快速填寫模式",
        )
        missing = [phrase for phrase in required_phrases if phrase not in text]
        self.assertEqual([], missing, f"missing contract phrases: {missing}")

    def test_openai_interface_invokes_the_skill(self) -> None:
        text = (SKILL_ROOT / "agents" / "openai.yaml").read_text(encoding="utf-8")
        self.assertIn('display_name: "理賠申請書自動化"', text)
        self.assertIn("$insurance-claim-form-automation", text)

    def test_public_skill_has_no_obvious_customer_or_machine_secrets(self) -> None:
        text_files = [
            path
            for path in SKILL_ROOT.rglob("*")
            if path.is_file() and path.suffix.lower() in {".md", ".py", ".yaml", ".yml", ".json"}
        ]
        combined = "\n".join(path.read_text(encoding="utf-8") for path in text_files)
        forbidden_patterns = {
            "Taiwan ID": r"(?<![A-Z0-9])[A-Z][12]\d{8}(?!\d)",
            "Taiwan mobile": r"(?<!\d)09\d{8}(?!\d)",
            "long bank-like number": r"(?<!\d)\d{10,}(?!\d)",
            "Windows absolute path": r"(?i)(?<![A-Z0-9])[A-Z]:\\",
            "Google Drive folder URL": r"https://drive\.google\.com/drive/folders/",
        }
        findings = [
            label
            for label, pattern in forbidden_patterns.items()
            if re.search(pattern, combined)
        ]
        self.assertEqual([], findings, f"possible sensitive material found: {findings}")

    def test_output_validator_accepts_one_page_and_rejects_two_pages(self) -> None:
        validator = SKILL_ROOT / "scripts" / "validate_claim_output.py"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            one_page = temp_path / "one.pdf"
            two_pages = temp_path / "two.pdf"

            writer = PdfWriter()
            writer.add_blank_page(width=595, height=842)
            with one_page.open("wb") as stream:
                writer.write(stream)

            writer = PdfWriter()
            writer.add_blank_page(width=595, height=842)
            writer.add_blank_page(width=595, height=842)
            with two_pages.open("wb") as stream:
                writer.write(stream)

            accepted = subprocess.run(
                [sys.executable, str(validator), str(one_page)],
                check=False,
                capture_output=True,
                text=True,
            )
            rejected = subprocess.run(
                [sys.executable, str(validator), str(two_pages)],
                check=False,
                capture_output=True,
                text=True,
            )

        self.assertEqual(0, accepted.returncode, accepted.stderr)
        self.assertNotEqual(0, rejected.returncode)


if __name__ == "__main__":
    unittest.main()
