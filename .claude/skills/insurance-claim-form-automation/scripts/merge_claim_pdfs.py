#!/usr/bin/env python3
"""Merge approved claim-form PDFs into one document in the supplied order."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def merge_claim_pdfs(inputs: list[Path], output: Path) -> None:
    if not inputs:
        raise ValueError("at least one input PDF is required")

    output = output.resolve()
    writer = PdfWriter()
    for path in inputs:
        source = path.resolve()
        if source == output:
            raise ValueError("output PDF cannot also be an input")
        reader = PdfReader(source)
        if reader.is_encrypted:
            raise ValueError(f"encrypted input is not supported: {path.name}")
        if not reader.pages:
            raise ValueError(f"input PDF has no pages: {path.name}")
        for page in reader.pages:
            writer.add_page(page)

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp")
    try:
        with temporary.open("wb") as stream:
            writer.write(stream)
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("inputs", nargs="+", type=Path)
    args = parser.parse_args()
    merge_claim_pdfs(args.inputs, args.out)
    print(f"written: {args.out}")


if __name__ == "__main__":
    main()
