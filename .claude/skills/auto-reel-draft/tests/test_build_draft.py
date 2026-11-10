from pathlib import Path
import json
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from build_draft import DraftBuildError, build_draft
from test_draft_contract import valid_plan


class Segment:
    def __init__(self) -> None:
        self.volume = 1.0


class RecordingProject:
    instances = []

    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.calls = []
        self.script = type("Script", (), {"fps": 0})()
        RecordingProject.instances.append(self)

    def add_clip(self, path, source_us, duration_us, start_us, track_name):
        segment = Segment()
        self.calls.append(("video", path, source_us, duration_us, start_us, track_name, segment))
        return segment

    def add_audio_safe(self, path, start_time, duration, track_name):
        self.calls.append(("audio", path, start_time, duration, track_name))
        return Segment()

    def add_text_simple(self, text, start_time, duration, track_name):
        self.calls.append(("text", text, start_time, duration, track_name))
        return Segment()

    def save(self):
        self.calls.append(("save",))
        return {"status": "SUCCESS", "draft_path": self.kwargs["drafts_root"]}


class Cp950Stream:
    def __init__(self) -> None:
        self.encoding = "cp950"
        self.buffer = []

    def write(self, value: str) -> int:
        value.encode(self.encoding)
        self.buffer.append(value)
        return len(value)

    def flush(self) -> None:
        return

    def reconfigure(self, *, encoding: str) -> None:
        self.encoding = encoding


class EmojiProject(RecordingProject):
    def save(self):
        print("✅ saved")
        return super().save()


class BuildDraftTests(unittest.TestCase):
    def setUp(self) -> None:
        RecordingProject.instances.clear()

    def test_builds_video_before_audio_and_text_without_export(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / "project"
            drafts = root / "drafts"
            project.mkdir()
            drafts.mkdir()
            path = project / "draft-plan.json"
            path.write_text(json.dumps(valid_plan(project)), encoding="utf-8")

            result = build_draft(path, drafts, RecordingProject)

            instance = RecordingProject.instances[0]
            self.assertEqual([call[0] for call in instance.calls], ["video", "audio", "text", "save"])
            self.assertEqual(instance.calls[0][-1].volume, 0.0)
            self.assertFalse(instance.kwargs["overwrite"])
            self.assertEqual(instance.script.fps, 30)
            self.assertEqual(result["video_segments"], 1)
            self.assertEqual(result["audio_segments"], 1)
            self.assertEqual(result["text_segments"], 1)
            self.assertFalse(result["exported_mp4"])

    def test_refuses_existing_or_locked_draft(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / "project"
            drafts = root / "drafts"
            project.mkdir()
            draft = drafts / "sample-editable"
            draft.mkdir(parents=True)
            path = project / "draft-plan.json"
            path.write_text(json.dumps(valid_plan(project)), encoding="utf-8")

            with self.assertRaises(DraftBuildError) as caught:
                build_draft(path, drafts, RecordingProject)
            self.assertEqual(caught.exception.code, "draft_exists")

            (draft / ".locked").write_text("locked", encoding="utf-8")
            with self.assertRaises(DraftBuildError) as caught:
                build_draft(path, drafts, RecordingProject)
            self.assertEqual(caught.exception.code, "draft_locked")

    def test_switches_cp950_stdout_to_utf8_before_jianying_save(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            project = root / "project"
            drafts = root / "drafts"
            project.mkdir()
            drafts.mkdir()
            path = project / "draft-plan.json"
            path.write_text(json.dumps(valid_plan(project)), encoding="utf-8")
            previous = sys.stdout
            stream = Cp950Stream()
            try:
                sys.stdout = stream
                result = build_draft(path, drafts, EmojiProject)
            finally:
                sys.stdout = previous
            self.assertTrue(result["ok"])
            self.assertEqual(stream.encoding, "utf-8")


if __name__ == "__main__":
    unittest.main()
