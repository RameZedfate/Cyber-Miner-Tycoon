from __future__ import annotations

import argparse
import csv
import json
import os
import re
import unicodedata
from pathlib import Path


MANIFEST_FIELDS = [
    "asset_id",
    "purpose",
    "media_type",
    "origin",
    "source_page",
    "download_url",
    "local_source",
    "local_copy",
    "license_type",
    "attribution",
    "query",
    "sha256",
]


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not slug:
        raise ValueError("slug must contain at least one ASCII letter or digit")
    return slug


def _write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def prepare_job(
    projects_root: Path,
    slug: str,
    references: list[str],
    source_text: str | None,
    drive_inbox: Path | None,
    duration_seconds: float | None,
) -> dict:
    normalized_slug = slugify(slug)
    project_root = Path(projects_root).resolve() / normalized_slug
    if project_root.exists() and any(project_root.iterdir()):
        raise FileExistsError(f"project is not empty: {project_root}")

    project_root.mkdir(parents=True, exist_ok=True)
    for folder in ("video", "photos", "audio"):
        (project_root / "assets" / folder).mkdir(parents=True, exist_ok=True)

    configured_drive = str(drive_inbox) if drive_inbox else os.getenv(
        "AUTO_REEL_DRIVE_INBOX", ""
    ).strip()
    resolved_drive = Path(configured_drive) if configured_drive else None
    job = {
        "schema_version": 1,
        "project": {
            "slug": normalized_slug,
            "draft_name": f"{normalized_slug}-editable",
            "width": 1080,
            "height": 1920,
            "fps": 30,
            "duration_seconds": duration_seconds,
            "export_mp4": False,
        },
        "references": list(references),
        "source_text": source_text,
        "drive_inbox": str(resolved_drive) if resolved_drive else None,
    }
    _write_json(project_root / "job.json", job)
    _write_json(project_root / "asset-selection.json", {"schema_version": 1, "assets": []})
    _write_json(
        project_root / "draft-plan.json",
        {
            "schema_version": 1,
            "project": job["project"],
            "video": [],
            "audio": [],
            "text": [],
        },
    )

    templates = {
        "SOURCE_ANALYSIS.md": "# Source Analysis\n\n",
        "SHOTLIST.md": "# Shot List\n\n",
        "DESIGN.md": "# Design\n\n",
    }
    for filename, content in templates.items():
        (project_root / filename).write_text(content, encoding="utf-8")

    with (project_root / "ASSET_MANIFEST.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS).writeheader()

    return {"ok": True, "project_root": str(project_root), "job": job}


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an auto-reel-draft job.")
    parser.add_argument("--projects-root", type=Path, required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--reference", action="append", default=[])
    parser.add_argument("--source-text")
    parser.add_argument("--drive-inbox", type=Path)
    parser.add_argument("--duration", type=float)
    args = parser.parse_args()
    result = prepare_job(
        args.projects_root,
        args.slug,
        args.reference,
        args.source_text,
        args.drive_inbox,
        args.duration,
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
