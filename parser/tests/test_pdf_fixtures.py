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


def test_republic_digital_pdf():
    path = _require_pdf("replublic-bank.pdf")
    expected = json.loads((EXPECTED / "replublic-bank.json").read_text())
    txs = parse_statement(path)
    assert _strip_ids(txs) == expected["transactions"]
    assert round(sum(tx["amount"] for tx in txs), 2) == 4026.47


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract not installed")
def test_chase_scanned_pdf():
    path = _require_pdf("chase.pdf")
    expected = json.loads((EXPECTED / "chase.json").read_text())
    txs = parse_statement(path)
    assert len(txs) == len(expected["transactions"])
    assert round(sum(tx["amount"] for tx in txs), 2) == 2716.01
    assert _strip_ids(txs) == expected["transactions"]


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract not installed")
def test_boa_scanned_pdf():
    path = _require_pdf("boa.pdf")
    expected = json.loads((EXPECTED / "boa.json").read_text())
    txs = parse_statement(path)
    assert _strip_ids(txs) == expected["transactions"]


def test_missing_file_raises():
    with pytest.raises(ParseError, match="File not found"):
        parse_statement(Path("/tmp/does-not-exist-statement-ai.pdf"))
