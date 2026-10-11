from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = SKILL_ROOT.parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "preflight.ps1"


class PreflightTests(unittest.TestCase):
    def test_json_report_has_required_keys_without_secret_values(self) -> None:
        env = os.environ.copy()
        secret_values = {
            "PEXELS_API_KEY": "pexels-secret-value",
            "UNSPLASH_ACCESS_KEY": "unsplash-secret-value",
            "PIXABAY_API_KEY": "pixabay-secret-value",
        }
        env.update(secret_values)
        completed = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(SCRIPT),
                "-Workspace",
                str(WORKSPACE),
                "-Json",
            ],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
        )
        report = json.loads(completed.stdout)
        for key in (
            "ok",
            "python",
            "jianying_skill",
            "jianying_drafts_root",
            "agent_reach",
            "assetseeker",
            "asset_sources",
            "drive_inbox",
            "api_keys",
            "missing",
            "warnings",
        ):
            self.assertIn(key, report)
        for secret in secret_values.values():
            self.assertNotIn(secret, completed.stdout)
        self.assertTrue(report["api_keys"]["pexels"])
        self.assertTrue(report["api_keys"]["unsplash"])
        self.assertTrue(report["api_keys"]["pixabay"])
        self.assertIn("youtube_backend_available", report["agent_reach"])
        self.assertIsInstance(report["drive_inbox"]["available"], bool)
        if not report["drive_inbox"]["available"]:
            self.assertIn("drive_inbox_unavailable", report["warnings"])

    def test_explicit_environment_paths_override_machine_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            jianying = root / "jianying-editor"
            (jianying / "scripts").mkdir(parents=True)
            (jianying / "scripts" / "jy_wrapper.py").write_text("", encoding="utf-8")
            assetseeker = root / "seek_assets.py"
            assetseeker.write_text("raise SystemExit(0)\n", encoding="utf-8")
            agent_reach = root / "agent-reach.exe"
            agent_reach.write_bytes(b"")
            drive_inbox = root / "drive-inbox"
            drive_inbox.mkdir()
            drafts_root = root / "drafts"
            drafts_root.mkdir()

            env = os.environ.copy()
            env.update(
                {
                    "AUTO_REEL_PYTHON": sys.executable,
                    "JY_SKILL_ROOT": str(jianying),
                    "ASSETSEEKER_SCRIPT": str(assetseeker),
                    "AGENT_REACH_EXE": str(agent_reach),
                    "AUTO_REEL_DRIVE_INBOX": str(drive_inbox),
                    "JY_PROJECTS_ROOT": str(drafts_root),
                }
            )
            completed = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(SCRIPT),
                    "-Workspace",
                    str(WORKSPACE),
                    "-Json",
                ],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                env=env,
            )
            report = json.loads(completed.stdout)

            self.assertEqual(str(jianying), report["jianying_skill"]["path"])
            self.assertEqual(str(assetseeker), report["assetseeker"]["path"])
            self.assertEqual(str(agent_reach), report["agent_reach"]["path"])
            self.assertEqual(str(drive_inbox), report["drive_inbox"]["path"])


if __name__ == "__main__":
    unittest.main()
