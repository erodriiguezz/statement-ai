"""Detect whether a PDF page has a usable text layer."""

from __future__ import annotations

from pathlib import Path
from typing import List

import pdfplumber

# Pages below this character count are treated as scanned/image-only.
MIN_TEXT_CHARS = 40

# pdfplumber's default x_tolerance (3pt) is wider than the space glyph in
# some statement-generator fonts (seen on TD Bank statements), so adjacent
# words get glued together with no space at all ("TDZELLERECEIVED"). A
# tighter tolerance makes word-gap detection more sensitive without
# over-splitting normally-spaced text (verified against existing fixtures).
TEXT_X_TOLERANCE = 1.5


def page_text_char_counts(pdf_path: Path) -> List[int]:
    counts: List[int] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=TEXT_X_TOLERANCE) or ""
            counts.append(len(text.strip()))
    return counts


def page_needs_ocr(char_count: int) -> bool:
    return char_count < MIN_TEXT_CHARS


def extract_digital_page_text(pdf_path: Path, page_index: int) -> str:
    with pdfplumber.open(str(pdf_path)) as pdf:
        if page_index < 0 or page_index >= len(pdf.pages):
            return ""
        page = pdf.pages[page_index]
        return page.extract_text(x_tolerance=TEXT_X_TOLERANCE) or ""
