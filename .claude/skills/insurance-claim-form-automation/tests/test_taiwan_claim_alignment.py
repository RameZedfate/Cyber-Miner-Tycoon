import sys
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject


ROOT = Path(__file__).resolve().parents[1]
SKILL_DIR = ROOT / "insurance-claim-form-automation"
sys.path.insert(0, str(SKILL_DIR / "scripts"))


class TaiwanClaimAlignmentTests(unittest.TestCase):
    def test_repair_keeps_basic_row_values_inside_their_value_cells(self):
        from taiwan_claim_alignment import repair_basic_row_alignment

        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.pdf"
            repaired = Path(tmp) / "repaired.pdf"

            writer = PdfWriter()
            page = writer.add_blank_page(width=595.32, height=841.92)
            stream = DecodedStreamObject()
            stream.set_data(
                b"BT 1 0 0 1 72 529.12 Tm (NAME) Tj ET\n"
                b"BT 1 0 0 1 215 529.62 Tm (ID) Tj ET\n"
                b"BT 1 0 0 1 362.274 528.87 Tm (66) Tj ET\n"
                b"BT 1 0 0 1 489 529.87 Tm (PHONE) Tj ET\n"
            )
            page[NameObject("/Contents")] = writer._add_object(stream)
            with source.open("wb") as handle:
                writer.write(handle)

            repair_basic_row_alignment(source, repaired)

            reader = PdfReader(repaired)
            matrices = []
            for operands, operator in reader.pages[0].get_contents().operations:
                if operator == b"Tm":
                    matrices.append(tuple(float(value) for value in operands))

            self.assertIn((1.0, 0.0, 0.0, 1.0, 80.0, 529.12), matrices)
            self.assertIn((1.0, 0.0, 0.0, 1.0, 222.0, 529.62), matrices)
            self.assertIn((1.0, 0.0, 0.0, 1.0, 496.0, 529.87), matrices)
            self.assertIn((1.0, 0.0, 0.0, 1.0, 362.274, 528.87), matrices)


if __name__ == "__main__":
    unittest.main()
