"""Orchestrate digital text + OCR extraction into transactions."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import pdfplumber

from .bank import resolve_profile
from .detect import extract_digital_page_text, page_needs_ocr, page_text_char_counts
from .normalize import extract_statement_year
from .ocr import OcrUnavailableError, ocr_page
from .profiles import LayoutProfile
from .text import parse_transactions_from_text


class ParseError(RuntimeError):
    """Raised when a statement cannot be parsed into transactions."""


def extract_document_text(
    pdf_path: Path,
    *,
    force_ocr: bool = False,
) -> tuple[str, bool]:
    """
    Return (full_text, used_ocr).
    Uses per-page OCR when the text layer is sparse.
    If OCR deps are missing but other pages already have digital text,
    skip OCR pages instead of failing the whole document.
    """
    counts = page_text_char_counts(pdf_path)
    if not counts:
        raise ParseError("PDF has no pages.")

    pages: list[str] = []
    used_ocr = False
    ocr_error: OcrUnavailableError | None = None
    digital_chars = 0

    for index, char_count in enumerate(counts):
        needs_ocr = force_ocr or page_needs_ocr(char_count)
        if needs_ocr:
            try:
                page_text = ocr_page(pdf_path, index)
                used_ocr = True
            except OcrUnavailableError as exc:
                ocr_error = exc
                page_text = ""
        else:
            page_text = extract_digital_page_text(pdf_path, index)
            digital_chars += len((page_text or "").strip())
        pages.append(page_text or "")

    full_text = "\n".join(pages)
    if ocr_error and digital_chars < 40 and len(full_text.strip()) < 40:
        raise ocr_error

    return full_text, used_ocr


def parse_statement(
    pdf_path: Path,
    *,
    profile_id: Optional[str] = None,
    force_ocr: bool = False,
) -> list[dict]:
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise ParseError(f"File not found: {pdf_path}")

    try:
        text, _used_ocr = extract_document_text(pdf_path, force_ocr=force_ocr)
    except OcrUnavailableError as exc:
        raise ParseError(str(exc)) from exc

    if len(text.strip()) < 40:
        raise ParseError(
            "Could not extract readable text from this PDF. "
            "If it is scanned, ensure Tesseract is installed."
        )

    profile = resolve_profile(profile_id, text)
    year = extract_statement_year(text)
    transactions = parse_transactions_from_text(
        text, profile, default_year=year
    )

    # Secondary pass with generic profile if bank profile found nothing
    if not transactions and profile.id != "generic":
        from .profiles import GENERIC

        transactions = parse_transactions_from_text(
            text, GENERIC, default_year=year
        )

    if not transactions:
        raise ParseError(
            "No transactions found. The statement layout may be unsupported "
            "or OCR quality may be too low."
        )

    return _dedupe_keep_repeats(transactions)


def parse_text(
    text: str,
    *,
    profile_id: Optional[str] = None,
    profile: Optional[LayoutProfile] = None,
) -> list[dict]:
    """Parse pre-extracted / synthetic statement text (for tests)."""
    resolved = profile or resolve_profile(profile_id, text)
    year = extract_statement_year(text)
    transactions = parse_transactions_from_text(
        text, resolved, default_year=year
    )
    return _dedupe_keep_repeats(transactions)


def _dedupe_keep_repeats(transactions: list[dict]) -> list[dict]:
    """
    Remove only exact consecutive duplicates from dual extraction paths.
    Legitimate same-day identical txs (e.g. two mobile deposits) are kept.
    """
    if not transactions:
        return []

    result: list[dict] = []
    prev_key = None
    for tx in transactions:
        key = (tx["date"], tx["description"], tx["amount"])
        if key == prev_key:
            continue
        result.append(tx)
        prev_key = key
    return result


def page_count(pdf_path: Path) -> int:
    with pdfplumber.open(str(pdf_path)) as pdf:
        return len(pdf.pages)
