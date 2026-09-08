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

# Some core-banking systems render statements in a fixed-pitch font where each
# glyph sits in its own cell with a ~0pt gap and real spaces are literal space
# glyphs. pdfplumber then inserts a space between *every* character
# ("1 / 0 3   X X S O C ... 4 2 2 . 0 0"), which no date/amount regex can match.
# Raising x_tolerance doesn't help (the gaps aren't wide), so we detect this
# "shattered" output and fall back to PyMuPDF, which reads such pages cleanly.
SHATTERED_MIN_TOKENS = 20
SHATTERED_SINGLE_CHAR_RATIO = 0.6


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
        text = page.extract_text(x_tolerance=TEXT_X_TOLERANCE) or ""

    if _looks_shattered(text):
        repaired = _extract_page_text_pymupdf(pdf_path, page_index)
        if repaired and not _looks_shattered(repaired):
            return repaired
    return text


def _looks_shattered(text: str) -> bool:
    """True when extraction split most of the page into single-char tokens."""
    tokens = text.split()
    if len(tokens) < SHATTERED_MIN_TOKENS:
        return False
    single_char = sum(1 for token in tokens if len(token) == 1)
    return single_char / len(tokens) >= SHATTERED_SINGLE_CHAR_RATIO


def _extract_page_text_pymupdf(pdf_path: Path, page_index: int) -> str:
    """Re-extract one page with PyMuPDF, which handles fixed-pitch fonts."""
    from .ocr import _import_pymupdf

    fitz = _import_pymupdf()
    doc = fitz.open(str(pdf_path))
    try:
        if page_index < 0 or page_index >= doc.page_count:
            return ""
        return doc.load_page(page_index).get_text() or ""
    finally:
        doc.close()
