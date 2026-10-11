from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from draft_contract import DraftPlanError, load_draft_plan
from validate_manifest import validate_manifest


CONTENT_FILENAMES = ("draft_info.json", "draft_content.json")


def _timerange(segment: dict, name: str = "target_timerange") -> tuple[int, int]:
    timerange = segment.get(name) or {}
    try:
        return int(timerange.get("start", -1)), int(timerange.get("duration", -1))
    except (TypeError, ValueError):
        return -1, -1


def _same_path(left: str, right: str) -> bool:
    return os.path.normcase(os.path.abspath(left)) == os.path.normcase(os.path.abspath(right))


def _text(material: dict) -> str:
    try:
        return str(json.loads(material.get("content", "{}"))["text"])
    except (KeyError, TypeError, json.JSONDecodeError):
        return ""


def validate_saved_draft(
    draft_path: Path,
    plan_path: Path,
    project_root: Path,
    manifest_path: Path,
    *,
    write_report: bool = False,
) -> dict:
    draft = Path(draft_path).resolve()
    project = Path(project_root).resolve()
    plan = load_draft_plan(plan_path, project)
    errors: list[str] = []
    content_path = next(
        (draft / name for name in CONTENT_FILENAMES if (draft / name).is_file()),
        None,
    )
    if content_path is None:
        return {
            "ok": False,
            "errors": ["missing_draft_content"],
            "draft_path": str(draft),
            "exported_mp4": False,
        }
    if not (draft / "draft_meta_info.json").is_file():
        errors.append("missing_draft_meta")
    try:
        content = json.loads(content_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {
            "ok": False,
            "errors": ["invalid_draft_json"],
            "draft_path": str(draft),
            "content_path": str(content_path),
            "exported_mp4": False,
        }

    manifest = validate_manifest(manifest_path, project)
    if not manifest["ok"]:
        errors.append("manifest_invalid")

    canvas = content.get("canvas_config") or {}
    width = int(canvas.get("width", 0) or 0)
    height = int(canvas.get("height", 0) or 0)
    fps = int(content.get("fps", 0) or 0)
    duration_us = int(content.get("duration", 0) or 0)
    if width != 1080:
        errors.append("width")
    if height != 1920:
        errors.append("height")
    if fps != 30:
        errors.append("fps")
    if duration_us != int(plan["project"]["duration_us"]):
        errors.append("duration")

    tracks = content.get("tracks") or []
    grouped = {
        kind: [track for track in tracks if track.get("type") == kind]
        for kind in ("video", "audio", "text")
    }
    segments = {
        kind: sorted(
            [segment for track in grouped[kind] for segment in (track.get("segments") or [])],
            key=lambda segment: _timerange(segment)[0],
        )
        for kind in grouped
    }
    counts = {kind: len(segments[kind]) for kind in segments}
    expected_counts = {kind: len(plan[kind]) for kind in ("video", "audio", "text")}
    if counts != expected_counts:
        errors.append("segment_counts")

    materials = content.get("materials") or {}
    video_materials = {item.get("id"): item for item in (materials.get("videos") or [])}
    audio_materials = {item.get("id"): item for item in (materials.get("audios") or [])}
    text_materials = {item.get("id"): item for item in (materials.get("texts") or [])}

    for segment, expected in zip(segments["video"], plan["video"]):
        material = video_materials.get(segment.get("material_id")) or {}
        expected_range = (int(expected["start_us"]), int(expected["duration_us"]))
        expected_source = (int(expected["source_us"]), int(expected["duration_us"]))
        if (
            _timerange(segment) != expected_range
            or _timerange(segment, "source_timerange") != expected_source
            or not _same_path(str(material.get("path", "")), expected["path"])
        ):
            errors.append("video_timeline")
            break
        if float(segment.get("volume", 1.0)) != 0.0:
            errors.append("video_not_muted")
            break

    for segment, expected in zip(segments["audio"], plan["audio"]):
        material = audio_materials.get(segment.get("material_id")) or {}
        expected_range = (int(expected["start_us"]), int(expected["duration_us"]))
        expected_source = (int(expected["source_us"]), int(expected["duration_us"]))
        if (
            _timerange(segment) != expected_range
            or _timerange(segment, "source_timerange") != expected_source
            or not _same_path(str(material.get("path", "")), expected["path"])
        ):
            errors.append("audio_timeline")
            break

    for segment, expected in zip(segments["text"], plan["text"]):
        material = text_materials.get(segment.get("material_id")) or {}
        expected_range = (int(expected["start_us"]), int(expected["duration_us"]))
        if _timerange(segment) != expected_range or _text(material) != expected["text"]:
            errors.append("text_timeline")
            break

    result = {
        "ok": not errors,
        "errors": list(dict.fromkeys(errors)),
        "counts": counts,
        "duration_us": duration_us,
        "width": width,
        "height": height,
        "fps": fps,
        "draft_path": str(draft),
        "content_path": str(content_path),
        "manifest": manifest,
        "exported_mp4": False,
    }
    if write_report:
        (project / "DRAFT_VALIDATION.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate an editable JianYing draft.")
    parser.add_argument("draft", type=Path)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = validate_saved_draft(
            args.draft,
            args.plan,
            args.project_root,
            args.manifest,
            write_report=True,
        )
    except DraftPlanError as error:
        print(json.dumps({"ok": False, "error": error.code, "detail": error.detail}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
