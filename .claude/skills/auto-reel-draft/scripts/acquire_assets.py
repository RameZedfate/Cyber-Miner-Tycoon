from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from validate_manifest import FIELDNAMES, validate_manifest


MEDIA_FOLDERS = {"video": "video", "photo": "photos", "audio": "audio"}
DEFAULT_SUFFIXES = {"video": ".mp4", "photo": ".jpg", "audio": ".mp3"}


class AssetAcquisitionError(RuntimeError):
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


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _safe_id(value: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    if not safe:
        raise AssetAcquisitionError("invalid_asset_id", value)
    return safe.lower()


def _suffix(item: dict) -> str:
    source = item.get("local_source") or item.get("download_url") or ""
    suffix = Path(urlparse(str(source)).path).suffix.lower()
    return suffix or DEFAULT_SUFFIXES[item["media_type"]]


def _download(url: str, destination: Path, timeout_seconds: int) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise AssetAcquisitionError("unsupported_download_scheme", parsed.scheme)
    partial = destination.with_suffix(destination.suffix + ".part")
    try:
        request = Request(url, headers={"User-Agent": "auto-reel-draft/1.0"})
        with urlopen(request, timeout=timeout_seconds) as response, partial.open("wb") as handle:
            shutil.copyfileobj(response, handle)
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise


def _write_manifest(path: Path, rows: list[dict]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(path)


def acquire_assets(
    selection_path: Path,
    project_root: Path,
    allowed_local_roots: list[Path],
    timeout_seconds: int = 30,
) -> dict:
    root = Path(project_root).resolve()
    selection = json.loads(Path(selection_path).read_text(encoding="utf-8"))
    if selection.get("schema_version") != 1 or not isinstance(selection.get("assets"), list):
        raise AssetAcquisitionError("invalid_selection_schema")

    allowed_roots = [Path(path).resolve() for path in allowed_local_roots]
    rows: list[dict] = []
    acquired: list[dict] = []
    paths_by_hash: dict[str, Path] = {}

    for item in selection["assets"]:
        media_type = str(item.get("media_type", ""))
        if media_type not in MEDIA_FOLDERS:
            raise AssetAcquisitionError("unsupported_media_type", media_type)
        acquisition = str(item.get("acquisition", ""))
        asset_id = _safe_id(str(item.get("asset_id", "")))
        destination_dir = root / "assets" / MEDIA_FOLDERS[media_type]
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = destination_dir / f"{asset_id}{_suffix(item)}"

        if acquisition == "external":
            if not str(item.get("source_page", "")).strip() or not str(
                item.get("license_type", "")
            ).strip():
                raise AssetAcquisitionError("missing_external_provenance", asset_id)
            _download(str(item.get("download_url", "")), destination, timeout_seconds)
            origin = "external"
        elif acquisition == "local":
            source = Path(str(item.get("local_source", ""))).resolve()
            if not any(_is_within(source, allowed) for allowed in allowed_roots):
                raise AssetAcquisitionError("local_source_outside_allowed_roots", str(source))
            if not source.is_file():
                raise AssetAcquisitionError("missing_local_source", str(source))
            shutil.copy2(source, destination)
            origin = "adam_owned"
        else:
            raise AssetAcquisitionError("unsupported_acquisition", acquisition)

        digest = _sha256(destination)
        if digest in paths_by_hash:
            destination.unlink()
            destination = paths_by_hash[digest]
        else:
            paths_by_hash[digest] = destination

        row = {
            "asset_id": asset_id,
            "purpose": str(item.get("purpose", "")),
            "media_type": media_type,
            "origin": origin,
            "source_page": str(item.get("source_page", "")),
            "download_url": str(item.get("download_url", "")),
            "local_source": str(item.get("local_source", "")),
            "local_copy": str(destination.relative_to(root)).replace("\\", "/"),
            "license_type": str(item.get("license_type", "")),
            "attribution": str(item.get("attribution", "")),
            "query": str(item.get("query", "")),
            "sha256": digest,
        }
        rows.append(row)
        acquired.append({**row, "local_copy": str(destination)})

    manifest_path = root / "ASSET_MANIFEST.csv"
    _write_manifest(manifest_path, rows)
    validation = validate_manifest(manifest_path, root)
    if not validation["ok"]:
        raise AssetAcquisitionError("manifest_validation_failed", json.dumps(validation["errors"]))
    return {"ok": True, "assets": acquired, "manifest": str(manifest_path)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Acquire selected Reel assets.")
    parser.add_argument("selection", type=Path)
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--allow-local-root", type=Path, action="append", default=[])
    parser.add_argument("--timeout", type=int, default=30)
    args = parser.parse_args()
    try:
        result = acquire_assets(
            args.selection,
            args.project_root,
            args.allow_local_root,
            args.timeout,
        )
    except AssetAcquisitionError as error:
        print(json.dumps({"ok": False, "error": error.code, "detail": error.detail}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
