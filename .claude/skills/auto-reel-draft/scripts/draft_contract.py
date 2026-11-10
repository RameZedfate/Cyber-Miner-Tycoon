from __future__ import annotations

import json
import os
from pathlib import Path


class DraftPlanError(ValueError):
    def __init__(self, code: str, detail: str = "") -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}" if detail else code)


def _is_within(path: Path, root: Path) -> bool:
    try:
        normalized_path = os.path.normcase(os.path.abspath(str(path)))
        normalized_root = os.path.normcase(os.path.abspath(str(root)))
        return os.path.commonpath([normalized_path, normalized_root]) == normalized_root
    except ValueError:
        return False


def _integer(item: dict, name: str, code: str) -> int:
    try:
        return int(item[name])
    except (KeyError, TypeError, ValueError) as error:
        raise DraftPlanError(code, name) from error


def _validate_timerange(item: dict, total_us: int, kind: str) -> None:
    start_us = _integer(item, "start_us", "invalid_timerange")
    duration_us = _integer(item, "duration_us", "invalid_timerange")
    if start_us < 0 or duration_us <= 0 or start_us + duration_us > total_us:
        raise DraftPlanError("segment_out_of_bounds", kind)
    if kind in {"video", "audio"} and _integer(item, "source_us", "invalid_timerange") < 0:
        raise DraftPlanError("invalid_timerange", kind)


def load_draft_plan(path: Path, project_root: Path) -> dict:
    plan_path = Path(path)
    root = Path(project_root).resolve()
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise DraftPlanError("invalid_plan_json", str(plan_path)) from error

    project = plan.get("project") or {}
    if (
        plan.get("schema_version") != 1
        or project.get("width") != 1080
        or project.get("height") != 1920
        or project.get("fps") != 30
        or project.get("export_mp4") is not False
        or not str(project.get("draft_name", "")).endswith("-editable")
    ):
        raise DraftPlanError("invalid_project_contract")
    total_us = _integer(project, "duration_us", "invalid_project_contract")
    if total_us <= 0:
        raise DraftPlanError("invalid_project_contract", "duration_us")

    normalized = {
        "schema_version": 1,
        "project": dict(project),
        "video": [],
        "audio": [],
        "text": [],
    }
    for kind in ("video", "audio"):
        items = plan.get(kind)
        if not isinstance(items, list):
            raise DraftPlanError("invalid_track_contract", kind)
        for source_item in items:
            item = dict(source_item)
            _validate_timerange(item, total_us, kind)
            media_path = Path(str(item.get("path", "")))
            if not media_path.is_absolute():
                media_path = root / media_path
            media_path = media_path.resolve()
            if not _is_within(media_path, root):
                raise DraftPlanError("media_outside_project", str(media_path))
            if not media_path.is_file():
                raise DraftPlanError("missing_media_file", str(media_path))
            if kind == "video" and item.get("muted") is not True:
                raise DraftPlanError("video_must_be_muted", str(media_path))
            item["path"] = str(media_path)
            normalized[kind].append(item)

    text_items = plan.get("text")
    if not isinstance(text_items, list):
        raise DraftPlanError("invalid_track_contract", "text")
    for source_item in text_items:
        item = dict(source_item)
        _validate_timerange(item, total_us, "text")
        if not str(item.get("text", "")).strip():
            raise DraftPlanError("empty_text_segment")
        normalized["text"].append(item)
    return normalized
