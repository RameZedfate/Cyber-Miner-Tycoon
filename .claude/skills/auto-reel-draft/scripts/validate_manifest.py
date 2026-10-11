from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path


FIELDNAMES = [
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


def _is_within(path: Path, root: Path) -> bool:
    try:
        normalized_path = os.path.normcase(os.path.abspath(str(path)))
        normalized_root = os.path.normcase(os.path.abspath(str(root)))
        return os.path.commonpath([normalized_path, normalized_root]) == normalized_root
    except ValueError:
        return False


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(manifest_path: Path, project_root: Path) -> dict:
    manifest_path = Path(manifest_path)
    root = Path(project_root).resolve()
    errors: list[dict] = []
    if not manifest_path.is_file():
        return {
            "ok": False,
            "errors": [{"code": "missing_manifest", "row": 0}],
            "assets": 0,
            "external_assets": 0,
            "local_assets": 0,
        }

    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = [name for name in FIELDNAMES if name not in (reader.fieldnames or [])]
        if missing:
            return {
                "ok": False,
                "errors": [{"code": "missing_columns", "row": 1, "fields": missing}],
                "assets": 0,
                "external_assets": 0,
                "local_assets": 0,
            }
        rows = list(reader)

    external_assets = 0
    local_assets = 0
    for row_number, row in enumerate(rows, start=2):
        origin = (row.get("origin") or "").strip()
        if origin == "external":
            external_assets += 1
            if not (row.get("source_page") or "").strip():
                errors.append({"code": "missing_source_page", "row": row_number})
        else:
            local_assets += 1

        if not (row.get("license_type") or "").strip():
            errors.append({"code": "missing_license", "row": row_number})

        raw_copy = (row.get("local_copy") or "").strip()
        copy_path = Path(raw_copy)
        if not copy_path.is_absolute():
            copy_path = root / copy_path
        copy_path = copy_path.resolve()
        if not _is_within(copy_path, root):
            errors.append({"code": "asset_outside_project", "row": row_number})
            continue
        if not copy_path.is_file():
            errors.append({"code": "missing_asset_file", "row": row_number})
            continue
        expected_hash = (row.get("sha256") or "").strip().lower()
        if not expected_hash or _sha256(copy_path) != expected_hash:
            errors.append({"code": "sha256_mismatch", "row": row_number})

    return {
        "ok": not errors,
        "errors": errors,
        "assets": len(rows),
        "external_assets": external_assets,
        "local_assets": local_assets,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate ASSET_MANIFEST.csv.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--project-root", type=Path, required=True)
    args = parser.parse_args()
    result = validate_manifest(args.manifest, args.project_root)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
