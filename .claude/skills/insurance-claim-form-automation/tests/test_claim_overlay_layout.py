import sys
import unittest
from pathlib import Path


# 上游 repo 把 tests/ 放在 repo 根目錄；這裡 tests/ 在 skill 資料夾內，故路徑不同。
SKILL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL_DIR / "scripts"))

from claim_overlay_layout import get_layout, validate_layout  # noqa: E402


class ClaimOverlayLayoutTests(unittest.TestCase):
    def test_all_layouts_keep_values_inside_declared_field_boxes(self):
        for insurer in (
            "shin_kong",
            "yuanta",
            "farglory",
            "fubon_114_11",
            "kgi",
            "hontai",
            "prudential",
        ):
            with self.subTest(insurer=insurer):
                self.assertEqual([], validate_layout(get_layout(insurer)))

    def test_reported_misaligned_targets_have_explicit_boxes(self):
        self.assertEqual((518, 75, 530, 87), get_layout("yuanta")["checks"]["personal_insurance"])
        self.assertEqual((55, 665, 70, 680), get_layout("farglory")["checks"]["same_policy_address"])
        self.assertEqual((420, 588, 520, 608), get_layout("kgi")["fields"]["beneficiary_identity"])
        self.assertEqual((92, 330, 190, 350), get_layout("hontai")["fields"]["occupation"])
        self.assertEqual("114.11", get_layout("fubon_114_11")["edition"])

    def test_segmented_fields_match_document_lengths(self):
        self.assertEqual(10, get_layout("shin_kong")["segments"]["identity"]["count"])
        self.assertEqual(10, get_layout("farglory")["segments"]["identity"]["count"])
        self.assertEqual(14, get_layout("kgi")["segments"]["account"]["count"])
        self.assertEqual(14, get_layout("farglory")["segments"]["account"]["count"])

    def test_skill_persists_the_seven_insurer_layout_contract(self):
        skill = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")
        contract = (SKILL_DIR / "references" /
                    "claim-contract.md").read_text(encoding="utf-8")
        self.assertIn("scripts/claim_overlay_layout.py", skill)
        for insurer in ("新光", "元大", "遠雄", "富邦", "凱基", "宏泰", "保誠"):
            with self.subTest(insurer=insurer):
                self.assertIn(insurer, contract)
        self.assertIn("144 DPI", contract)

    def test_latest_reported_alignment_regressions_are_fixed(self):
        kgi = get_layout("kgi")
        self.assertEqual((95, 257, 268, 281), kgi["fields"]["account_holder"])
        self.assertEqual((225, 171, 300, 191), kgi["fields"]["occupation"])

        yuanta = get_layout("yuanta")
        self.assertEqual("roc_text_centered", yuanta["formats"]["accident_date"])

        hontai = get_layout("hontai")
        self.assertEqual((105, 80, 260, 106), hontai["fields"]["identity"])

        prudential = get_layout("prudential")
        self.assertEqual((115, 61, 245, 82), prudential["fields"]["name"])
        self.assertEqual((487, 163, 499, 176), prudential["checks"]["other_cause"])

        fubon = get_layout("fubon_114_11")
        self.assertEqual((125, 376, 175, 400), fubon["fields"]["address_city"])
        self.assertEqual((480, 376, 507, 400), fubon["fields"]["address_number"])
        self.assertTrue(fubon["formats"]["city_district_full_names"])
        self.assertEqual("digits_only", fubon["formats"]["address_number"])

        shin = get_layout("shin_kong")
        self.assertEqual((145, 194, 177, 214), shin["fields"]["detail_year"])
        self.assertEqual((130, 592, 270, 612), shin["fields"]["signer_identity"])
        self.assertEqual((130, 608, 270, 628), shin["fields"]["signer_birth_nationality"])
        self.assertEqual((115, 624, 255, 644), shin["fields"]["mobile"])
        self.assertEqual((160, 645, 555, 665), shin["fields"]["address"])

        farglory = get_layout("farglory")
        self.assertEqual((110, 75, 280, 99), farglory["fields"]["name"])
        self.assertEqual((400, 194, 445, 211), farglory["fields"]["occupation"])
        self.assertEqual((105, 211, 135, 230), farglory["fields"]["accident_year"])


if __name__ == "__main__":
    unittest.main()
