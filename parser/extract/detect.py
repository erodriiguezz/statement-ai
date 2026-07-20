"""Detect whether a PDF page has a usable text layer."""

from __future__ import annotations

from pathlib import Path
from typing import List

import pdfplumber

# Pages below this character count are treated as scanned/image-only.
MIN_TEXT_CHARS = 40


def page_text_char_counts(pdf_path: Path) -> List[int]:
    counts: List[int] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            counts.append(len(text.strip()))
    return counts


def page_needs_ocr(char_count: int) -> bool:
    return char_count < MIN_TEXT_CHARS


def extract_digital_page_text(pdf_path: Path, page_index: int) -> str:
    with pdfplumber.open(str(pdf_path)) as pdf:
        if page_index < 0 or page_index >= len(pdf.pages):
            return ""
        return pdf.pages[page_index].extract_text() or ""
