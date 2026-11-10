from pathlib import Path
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from prepare_job import prepare_job, slugify


class PrepareJobTests(unittest.TestCase):
    def test_slugify_normalizes_ascii_project_names(self) -> None:
        self.assertEqual(slugify("  My Reel!! 2026  "), "my-reel-2026")

    def test_prepare_job_creates_editable_draft_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            result = prepare_job(
                Path(temp),
                "News Reel",
                ["https://example.com/reference"],
                "A short news brief",
                None,
                24.5,
            )
            project = Path(result["project_root"])
            job = json.loads((project / "job.json").read_text(encoding="utf-8"))

            self.assertEqual(project.name, "news-reel")
            self.assertEqual(job["project"]["draft_name"], "news-reel-editable")
            self.assertEqual(job["project"]["width"], 1080)
            self.assertEqual(job["project"]["height"], 1920)
            self.assertEqual(job["project"]["fps"], 30)
            self.assertEqual(job["project"]["duration_seconds"], 24.5)
            self.assertFalse(job["project"]["export_mp4"])
            for name in (
                "SOURCE_ANALYSIS.md",
                "SHOTLIST.md",
                "DESIGN.md",
                "asset-selection.json",
                "ASSET_MANIFEST.csv",
                "draft-plan.json",
            ):
                self.assertTrue((project / name).is_file(), name)
            for folder in ("video", "photos", "audio"):
                self.assertTrue((project / "assets" / folder).is_dir(), folder)

    def test_prepare_job_refuses_to_overwrite_non_empty_project(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp) / "existing"
            project.mkdir()
            (project / "keep.txt").write_text("keep", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                prepare_job(Path(temp), "existing", [], None, None, None)

    def test_drive_inbox_is_optional_without_a_configured_environment(self) -> None:
        with tempfile.TemporaryDirectory() as temp, patch.dict(
            os.environ, {"AUTO_REEL_DRIVE_INBOX": ""}, clear=False
        ):
            result = prepare_job(Path(temp), "portable", [], None, None, None)
            self.assertIsNone(result["job"]["drive_inbox"])


if __name__ == "__main__":
    unittest.main()
