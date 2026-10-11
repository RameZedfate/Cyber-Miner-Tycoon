from pathlib import Path
import json
import sys
import tempfile
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from acquire_assets import acquire_assets
from build_draft import build_draft
from prepare_job import prepare_job
from validate_draft import validate_saved_draft
from validate_manifest import validate_manifest
from test_build_draft import RecordingProject


class EndToEndTests(unittest.TestCase):
    def test_local_asset_to_validated_editable_draft_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source_root = root / "adam-media"
            projects_root = root / "projects"
            drafts_root = root / "drafts"
            source_root.mkdir()
            drafts_root.mkdir()
            source = source_root / "clip.mp4"
            source.write_bytes(b"tiny-video-fixture")

            prepared = prepare_job(
                projects_root,
                "Integration Reel",
                ["https://example.test/reference"],
                "brief",
                source_root,
                2.0,
            )
            project = Path(prepared["project_root"])
            selection = {
                "schema_version": 1,
                "assets": [{
                    "asset_id": "clip", "media_type": "video", "acquisition": "local",
                    "local_source": str(source), "download_url": "", "source_page": "",
                    "license_type": "adam_owned", "attribution": "", "query": "",
                    "purpose": "hook",
                }],
            }
            (project / "asset-selection.json").write_text(
                json.dumps(selection), encoding="utf-8"
            )
            acquired = acquire_assets(project / "asset-selection.json", project, [source_root])
            self.assertTrue(acquired["ok"])
            self.assertTrue(validate_manifest(project / "ASSET_MANIFEST.csv", project)["ok"])

            plan = {
                "schema_version": 1,
                "project": {
                    "slug": "integration-reel", "draft_name": "integration-reel-editable",
                    "width": 1080, "height": 1920, "fps": 30,
                    "duration_us": 2_000_000, "export_mp4": False,
                },
                "video": [{
                    "asset_id": "clip", "path": "assets/video/clip.mp4",
                    "source_us": 0, "start_us": 0, "duration_us": 2_000_000,
                    "track_name": "Main Video", "muted": True,
                }],
                "audio": [],
                "text": [],
            }
            plan_path = project / "draft-plan.json"
            plan_path.write_text(json.dumps(plan), encoding="utf-8")
            build_result = build_draft(plan_path, drafts_root, RecordingProject)
            self.assertTrue(build_result["ok"])
            self.assertFalse(build_result["exported_mp4"])

            draft = drafts_root / "integration-reel-editable"
            draft.mkdir()
            (draft / "draft_meta_info.json").write_text("{}", encoding="utf-8")
            copied = str((project / "assets" / "video" / "clip.mp4").resolve())
            content = {
                "canvas_config": {"width": 1080, "height": 1920},
                "fps": 30,
                "duration": 2_000_000,
                "tracks": [{"type": "video", "segments": [{
                    "material_id": "mv", "volume": 0.0,
                    "target_timerange": {"start": 0, "duration": 2_000_000},
                    "source_timerange": {"start": 0, "duration": 2_000_000},
                }]}],
                "materials": {
                    "videos": [{"id": "mv", "path": copied}],
                    "audios": [],
                    "texts": [],
                },
            }
            (draft / "draft_content.json").write_text(json.dumps(content), encoding="utf-8")
            validation = validate_saved_draft(
                draft,
                plan_path,
                project,
                project / "ASSET_MANIFEST.csv",
                write_report=True,
            )

            self.assertTrue(validation["ok"])
            self.assertTrue((project / "DRAFT_VALIDATION.json").is_file())
            self.assertEqual(list(root.rglob("*.mp4")), [source, project / "assets" / "video" / "clip.mp4"])


if __name__ == "__main__":
    unittest.main()
