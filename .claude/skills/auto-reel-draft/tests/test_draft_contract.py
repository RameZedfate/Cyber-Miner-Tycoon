from pathlib import Path
import json
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from draft_contract import DraftPlanError, load_draft_plan


def valid_plan(project: Path) -> dict:
    video = project / "assets" / "video" / "clip.mp4"
    audio = project / "assets" / "audio" / "bgm.m4a"
    video.parent.mkdir(parents=True, exist_ok=True)
    audio.parent.mkdir(parents=True, exist_ok=True)
    video.write_bytes(b"video")
    audio.write_bytes(b"audio")
    return {
        "schema_version": 1,
        "project": {
            "slug": "sample",
            "draft_name": "sample-editable",
            "width": 1080,
            "height": 1920,
            "fps": 30,
            "duration_us": 5_000_000,
            "export_mp4": False,
        },
        "video": [{
            "asset_id": "v1", "path": "assets/video/clip.mp4", "source_us": 0,
            "start_us": 0, "duration_us": 5_000_000, "track_name": "Main Video",
            "muted": True,
        }],
        "audio": [{
            "asset_id": "a1", "path": "assets/audio/bgm.m4a", "source_us": 0,
            "start_us": 0, "duration_us": 5_000_000, "track_name": "BGM",
        }],
        "text": [{
            "text": "Hello", "start_us": 500_000, "duration_us": 1_000_000,
            "track_name": "Captions",
        }],
    }


class DraftContractTests(unittest.TestCase):
    def test_loads_and_normalizes_valid_editable_plan(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            plan_path = project / "draft-plan.json"
            plan_path.write_text(json.dumps(valid_plan(project)), encoding="utf-8")

            plan = load_draft_plan(plan_path, project)

            self.assertEqual(plan["project"]["draft_name"], "sample-editable")
            self.assertTrue(Path(plan["video"][0]["path"]).is_absolute())
            self.assertFalse(plan["project"]["export_mp4"])

    def test_rejects_wrong_canvas_and_export_request(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            plan = valid_plan(project)
            plan["project"]["width"] = 1920
            plan["project"]["export_mp4"] = True
            path = project / "draft-plan.json"
            path.write_text(json.dumps(plan), encoding="utf-8")
            with self.assertRaises(DraftPlanError) as caught:
                load_draft_plan(path, project)
            self.assertEqual(caught.exception.code, "invalid_project_contract")

    def test_rejects_media_outside_project(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / "project"
            project.mkdir()
            plan = valid_plan(project)
            outside = root / "outside.mp4"
            outside.write_bytes(b"outside")
            plan["video"][0]["path"] = str(outside)
            path = project / "draft-plan.json"
            path.write_text(json.dumps(plan), encoding="utf-8")
            with self.assertRaises(DraftPlanError) as caught:
                load_draft_plan(path, project)
            self.assertEqual(caught.exception.code, "media_outside_project")

    def test_rejects_unmuted_video_and_overflow(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project = Path(temp)
            plan = valid_plan(project)
            plan["video"][0]["muted"] = False
            path = project / "draft-plan.json"
            path.write_text(json.dumps(plan), encoding="utf-8")
            with self.assertRaises(DraftPlanError) as caught:
                load_draft_plan(path, project)
            self.assertEqual(caught.exception.code, "video_must_be_muted")

            plan = valid_plan(project)
            plan["text"][0]["start_us"] = 4_500_000
            plan["text"][0]["duration_us"] = 1_000_000
            path.write_text(json.dumps(plan), encoding="utf-8")
            with self.assertRaises(DraftPlanError) as caught:
                load_draft_plan(path, project)
            self.assertEqual(caught.exception.code, "segment_out_of_bounds")


if __name__ == "__main__":
    unittest.main()
