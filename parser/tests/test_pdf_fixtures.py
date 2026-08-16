from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from extract.pipeline import ParseError, parse_statement
from tests.conftest import EXPECTED, RAW_PDFS


def _strip_ids(transactions: list[dict]) -> list[dict]:
    return [
        {
            "date": tx["date"],
            "description": tx["description"],
            "amount": tx["amount"],
        }
        for tx in transactions
    ]


def _require_pdf(name: str) -> Path:
    path = RAW_PDFS / name
    if not path.exists():
        pytest.skip(f"Missing fixture PDF: {path}")
    return path


def test_digital_text_pdf():
    """A PDF with a real embedded text layer (generic regional-bank layout)."""
    path = _require_pdf("sample_digital_statement.pdf")
    expected = json.loads((EXPECTED / "sample_digital_statement.json").read_text())
    txs = parse_statement(path)
    assert _strip_ids(txs) == expected["transactions"]
    assert round(sum(tx["amount"] for tx in txs), 2) == 544.50


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract not installed")
def test_scanned_image_pdf():
    """An image-only PDF (no text layer) that must go through the OCR path."""
    path = _require_pdf("sample_scanned_statement.pdf")
    expected = json.loads((EXPECTED / "sample_scanned_statement.json").read_text())
    txs = parse_statement(path)
    assert len(txs) == len(expected["transactions"])
    assert round(sum(tx["amount"] for tx in txs), 2) == 524.75
    assert _strip_ids(txs) == expected["transactions"]


def test_missing_file_raises():
    with pytest.raises(ParseError, match="File not found"):
        parse_statement(Path("/tmp/does-not-exist-statement-ai.pdf"))
