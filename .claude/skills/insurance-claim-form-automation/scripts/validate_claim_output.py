#!/usr/bin/env python3
"""Validate privacy-safe structural properties of final claim PDF drafts."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as exc:  # pragma: no cover - environment-dependent
    raise SystemExit("Missing dependency: install pypdf before validation.") from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Require non-encrypted, first-page-only claim PDF drafts."
    )
    parser.add_argument(
        "--expected-count",
        type=int,
        help="Expected number of insurer PDF files.",
    )
    parser.add_argument(
        "--expected-pages",
        type=int,
        default=1,
        help=(
            "Exact page count required in every PDF. Defaults to 1. "
            "Raise it only for a form whose approved deliverable is more than one "
            "page (國泰學團險 = 本文 + 附件 = 2)."
        ),
    )
    parser.add_argument("pdfs", nargs="+", type=Path)
    return parser.parse_args()


def validate_pdf(path: Path, index: int, expected_pages: int = 1) -> dict[str, object]:
    result: dict[str, object] = {"index": index, "ok": False}

    if not path.is_file():
        result["error"] = "missing_file"
        return result
    if path.suffix.lower() != ".pdf":
        result["error"] = "not_pdf"
        return result

    data = path.read_bytes()
    result["bytes"] = len(data)
    result["sha256"] = hashlib.sha256(data).hexdigest()

    if not data.startswith(b"%PDF-"):
        result["error"] = "invalid_pdf_header"
        return result

    try:
        reader = PdfReader(path)
        if reader.is_encrypted:
            result["error"] = "encrypted_pdf"
            return result
        result["pages"] = len(reader.pages)
    except Exception:
        result["error"] = "unreadable_pdf"
        return result

    if result["pages"] != expected_pages:
        result["error"] = "not_first_page_only"
        return result

    result["ok"] = True
    return result


def main() -> int:
    args = parse_args()
    results = [
        validate_pdf(path, index, args.expected_pages)
        for index, path in enumerate(args.pdfs, start=1)
    ]

    count_ok = args.expected_count is None or len(args.pdfs) == args.expected_count
    payload = {
        "ok": count_ok and all(result["ok"] for result in results),
        "count": len(args.pdfs),
        "expected_count": args.expected_count,
        "files": results,
    }
    if not count_ok:
        payload["error"] = "unexpected_file_count"

    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
