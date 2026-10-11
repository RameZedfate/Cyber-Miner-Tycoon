from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Callable

from draft_contract import DraftPlanError, load_draft_plan


class DraftBuildError(RuntimeError):
    def __init__(self, code: str, detail: str = "") -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}" if detail else code)


def _ensure_utf8_stdout() -> None:
    stream = sys.stdout
    encoding = str(getattr(stream, "encoding", "") or "").lower().replace("-", "")
    if encoding != "utf8" and hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")


def _load_jianying_runtime(workspace: Path):
    env_root = os.getenv("JY_SKILL_ROOT", "").strip()
    candidates = [
        Path(env_root) if env_root else None,
        workspace / ".agents" / "skills" / "jianying-editor",
        workspace / ".agent" / "skills" / "jianying-editor",
        workspace / "skills" / "jianying-editor",
    ]
    scripts = next(
        (
            candidate / "scripts"
            for candidate in candidates
            if candidate and (candidate / "scripts" / "jy_wrapper.py").is_file()
        ),
        None,
    )
    if scripts is None:
        raise DraftBuildError("jianying_skill_missing")
    if str(scripts) not in sys.path:
        sys.path.insert(0, str(scripts))
    from jy_wrapper import JyProject, get_default_drafts_root

    return JyProject, get_default_drafts_root


def build_draft(
    plan_path: Path,
    drafts_root: Path | None = None,
    project_factory: Callable | None = None,
) -> dict:
    _ensure_utf8_stdout()
    plan_path = Path(plan_path).resolve()
    project_root = plan_path.parent
    try:
        plan = load_draft_plan(plan_path, project_root)
    except DraftPlanError:
        raise

    factory = project_factory
    default_root = None
    if factory is None:
        workspace = next(
            (parent for parent in project_root.parents if (parent / ".agents").exists()),
            project_root,
        )
        factory, default_root = _load_jianying_runtime(workspace)
    root = Path(drafts_root or default_root()).resolve()
    root.mkdir(parents=True, exist_ok=True)
    project_name = str(plan["project"]["draft_name"])
    saved_draft = root / project_name
    if saved_draft.exists():
        if (saved_draft / ".locked").exists():
            raise DraftBuildError("draft_locked", str(saved_draft))
        raise DraftBuildError("draft_exists", str(saved_draft))

    project = factory(
        project_name=project_name,
        width=1080,
        height=1920,
        drafts_root=str(root),
        overwrite=False,
    )
    if hasattr(project, "script"):
        project.script.fps = 30

    for item in plan["video"]:
        segment = project.add_clip(
            item["path"],
            item["source_us"],
            item["duration_us"],
            item["start_us"],
            track_name=item.get("track_name", "Main Video"),
        )
        if segment is None:
            raise DraftBuildError("video_import_failed", item["path"])
        segment.volume = 0.0

    for item in plan["audio"]:
        segment = project.add_audio_safe(
            item["path"],
            start_time=item["start_us"],
            duration=item["duration_us"],
            track_name=item.get("track_name", "Audio"),
        )
        if segment is None:
            raise DraftBuildError("audio_import_failed", item["path"])

    for item in plan["text"]:
        segment = project.add_text_simple(
            item["text"],
            start_time=item["start_us"],
            duration=item["duration_us"],
            track_name=item.get("track_name", "Captions"),
        )
        if segment is None:
            raise DraftBuildError("text_import_failed", item["text"])

    save_result = project.save()
    if not isinstance(save_result, dict) or save_result.get("status") != "SUCCESS":
        raise DraftBuildError("draft_save_failed", json.dumps(save_result, ensure_ascii=False))
    return {
        "ok": True,
        "project_name": project_name,
        "draft_path": save_result.get("draft_path", str(saved_draft)),
        "video_segments": len(plan["video"]),
        "audio_segments": len(plan["audio"]),
        "text_segments": len(plan["text"]),
        "duration_us": plan["project"]["duration_us"],
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "exported_mp4": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build an editable JianYing Reel draft.")
    parser.add_argument("plan", type=Path)
    parser.add_argument("--drafts-root", type=Path)
    args = parser.parse_args()
    try:
        result = build_draft(args.plan, args.drafts_root)
    except (DraftBuildError, DraftPlanError) as error:
        print(json.dumps({"ok": False, "error": error.code, "detail": error.detail}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
