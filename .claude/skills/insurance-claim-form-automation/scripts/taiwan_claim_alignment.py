#!/usr/bin/env python3
"""Repair the basic-information row alignment on Taiwan Life form 2025.02.

The legacy overlay placed three values a few points before their printed value
cells.  This post-processor moves only those three text matrices and preserves
every other content operation in the PDF.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject, NameObject


_POSITION_FIXES = {
    (72.0, 529.12): (80.0, 529.12),
    (215.0, 529.62): (222.0, 529.62),
    (489.0, 529.87): (496.0, 529.87),
}


def _same_position(actual_x: float, actual_y: float, expected: tuple[float, float]) -> bool:
    return abs(actual_x - expected[0]) < 0.01 and abs(actual_y - expected[1]) < 0.01


def repair_basic_row_alignment(source: Path, output: Path) -> None:
    """Move the name, identity, and mobile values into their printed cells."""
    source = Path(source)
    output = Path(output)
    reader = PdfReader(source)
    if not reader.pages:
        raise ValueError("Taiwan Life PDF has no pages")

    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    page = writer.pages[0]
    contents = page.get("/Contents")
    if contents is None:
        raise ValueError("Taiwan Life first page has no content stream")

    content = ContentStream(contents, writer)
    replaced: set[tuple[float, float]] = set()
    for operands, operator in content.operations:
        if operator != b"Tm" or len(operands) != 6:
            continue
        actual_x, actual_y = float(operands[4]), float(operands[5])
        for old_position, new_position in _POSITION_FIXES.items():
            if _same_position(actual_x, actual_y, old_position):
                operands[4] = FloatObject(str(new_position[0]))
                operands[5] = FloatObject(str(new_position[1]))
                replaced.add(old_position)
                break

    if replaced != set(_POSITION_FIXES):
        missing = sorted(set(_POSITION_FIXES) - replaced)
        raise ValueError(f"Expected legacy text matrices were not found: {missing}")

    page[NameObject("/Contents")] = writer._add_object(content)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f"{output.name}.tmp")
    try:
        with temporary.open("wb") as handle:
            writer.write(handle)
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    repair_basic_row_alignment(args.source, args.output)


if __name__ == "__main__":
    main()
