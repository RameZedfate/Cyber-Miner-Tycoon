from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "run_ytdlp.ps1"


class YtDlpWrapperTests(unittest.TestCase):
    def test_wrapper_uses_the_configured_python_without_a_machine_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            package = Path(temp_dir) / "yt_dlp"
            package.mkdir()
            (package / "__init__.py").write_text("", encoding="utf-8")
            (package / "__main__.py").write_text(
                "print('2099.01.01')\n", encoding="utf-8"
            )
            env = os.environ.copy()
            env["YTDLP_PYTHON"] = sys.executable
            env["PYTHONPATH"] = temp_dir
            completed = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(SCRIPT),
                    "--version",
                ],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                env=env,
            )
            self.assertEqual("2099.01.01", completed.stdout.strip())


if __name__ == "__main__":
    unittest.main()
