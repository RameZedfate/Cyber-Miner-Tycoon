from pathlib import Path
import csv
import hashlib
import json
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from validate_draft import validate_saved_draft
from validate_manifest import FIELDNAMES
from test_draft_contract import valid_plan


def write_manifest(project: Path) -> Path:
    rows = []
    for asset_id, media_type, relative in (
        ("v1", "video", "assets/video/clip.mp4"),
        ("a1", "audio", "assets/audio/bgm.m4a"),
    ):
        path = project / relative
        rows.append({
            "asset_id": asset_id, "purpose": asset_id, "media_type": media_type,
            "origin": "adam_owned", "source_page": "", "download_url": "",
            "local_source": str(path), "local_copy": relative,
            "license_type": "adam_owned", "attribution": "", "query": "",
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    manifest = project / "ASSET_MANIFEST.csv"
    with manifest.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    return manifest


def saved_content(project: Path) -> dict:
    video_path = str((project / "assets" / "video" / "clip.mp4").resolve())
    audio_path = str((project / "assets" / "audio" / "bgm.m4a").resolve())
    return {
        "canvas_config": {"width": 1080, "height": 1920},
        "fps": 30,
        "duration": 5_000_000,
        "tracks": [
            {"type": "video", "segments": [{
                "material_id": "mv", "volume": 0.0,
                "target_timerange": {"start": 0, "duration": 5_000_000},
                "source_timerange": {"start": 0, "duration": 5_000_000},
            }]},
            {"type": "audio", "segments": [{
                "material_id": "ma",
                "target_timerange": {"start": 0, "duration": 5_000_000},
                "source_timerange": {"start": 0, "duration": 5_000_000},
            }]},
            {"type": "text", "segments": [{
                "material_id": "mt",
                "target_timerange": {"start": 500_000, "duration": 1_000_000},
            }]},
        ],
        "materials": {
            "videos": [{"id": "mv", "path": video_path}],
            "audios": [{"id": "ma", "path": audio_path}],
            "texts": [{"id": "mt", "content": json.dumps({"text": "Hello"})}],
        },
    }


class ValidateDraftTests(unittest.TestCase):
    def make_fixture(self, root: Path):
        project = root / "project"
        project.mkdir()
        plan = valid_plan(project)
        plan_path = project / "draft-plan.json"
        plan_path.write_text(json.dumps(plan), encoding="utf-8")
        manifest = write_manifest(project)
        draft = root / "drafts" / "sample-editable"
        draft.mkdir(parents=True)
        (draft / "draft_meta_info.json").write_text("{}", encoding="utf-8")
        (draft / "draft_content.json").write_text(
            json.dumps(saved_content(project)), encoding="utf-8"
        )
        return project, plan_path, manifest, draft

    def test_valid_plan_aligned_draft_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project, plan, manifest, draft = self.make_fixture(Path(temp))

            result = validate_saved_draft(draft, plan, project, manifest)

            self.assertTrue(result["ok"])
            self.assertEqual(result["counts"], {"video": 1, "audio": 1, "text": 1})
            self.assertFalse(result["exported_mp4"])

    def test_missing_content_or_meta_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project, plan, manifest, draft = self.make_fixture(Path(temp))
            (draft / "draft_content.json").unlink()
            result = validate_saved_draft(draft, plan, project, manifest)
            self.assertIn("missing_draft_content", result["errors"])

            (draft / "draft_content.json").write_text("{}", encoding="utf-8")
            (draft / "draft_meta_info.json").unlink()
            result = validate_saved_draft(draft, plan, project, manifest)
            self.assertIn("missing_draft_meta", result["errors"])

    def test_wrong_canvas_track_and_timerange_are_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project, plan, manifest, draft = self.make_fixture(Path(temp))
            content = saved_content(project)
            content["canvas_config"]["width"] = 1920
            content["tracks"][1]["type"] = "video"
            content["tracks"][0]["segments"][0]["target_timerange"]["start"] = -1
            (draft / "draft_content.json").write_text(json.dumps(content), encoding="utf-8")

            result = validate_saved_draft(draft, plan, project, manifest)

            self.assertIn("width", result["errors"])
            self.assertIn("segment_counts", result["errors"])
            self.assertIn("video_timeline", result["errors"])

    def test_non_muted_video_and_missing_material_are_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project, plan, manifest, draft = self.make_fixture(Path(temp))
            content = saved_content(project)
            content["tracks"][0]["segments"][0]["volume"] = 1.0
            content["materials"]["audios"] = []
            (draft / "draft_content.json").write_text(json.dumps(content), encoding="utf-8")

            result = validate_saved_draft(draft, plan, project, manifest)

            self.assertIn("video_not_muted", result["errors"])
            self.assertIn("audio_timeline", result["errors"])


if __name__ == "__main__":
    unittest.main()
