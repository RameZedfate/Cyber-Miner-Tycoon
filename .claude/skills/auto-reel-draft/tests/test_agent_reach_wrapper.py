from pathlib import Path
import subprocess
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "run_agent_reach.ps1"


class AgentReachWrapperTests(unittest.TestCase):
    def test_wrapper_runs_agent_reach_with_dedicated_tool_path(self) -> None:
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
        )
        self.assertIn("Agent Reach v", completed.stdout)


if __name__ == "__main__":
    unittest.main()
