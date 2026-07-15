#!/usr/bin/env python3
"""Extract transactions from bank statement PDFs."""

from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path

import pdfplumber

DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b"),
    re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"),
    re.compile(r"\b(\d{1,2}-\d{1,2}-\d{2,4})\b"),
]

AMOUNT_PATTERN = re.compile(
    r"(-?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\))"
)

SKIP_KEYWORDS = (
    "beginning balance",
    "ending balance",
    "opening balance",
    "closing balance",
    "total deposits",
    "total withdrawals",
    "page ",
    "account summary",
    "statement period",
)


def normalize_date(raw: str) -> str:
    raw = raw.strip()
    if re.match(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    parts = re.split(r"[/-]", raw)
    if len(parts) != 3:
        return raw
    month, day, year = parts
    if len(year) == 2:
        year = f"20{year}"
    return f"{year}-{int(month):02d}-{int(day):02d}"


def parse_amount(raw: str) -> float | None:
    cleaned = raw.strip().replace("$", "").replace(",", "").replace(" ", "")
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = f"-{cleaned[1:-1]}"
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


def should_skip(description: str) -> bool:
    lowered = description.lower()
    return any(keyword in lowered for keyword in SKIP_KEYWORDS)


def extract_from_line(line: str) -> dict | None:
    line = re.sub(r"\s+", " ", line.strip())
    if len(line) < 8:
        return None

    date_match = None
    for pattern in DATE_PATTERNS:
        date_match = pattern.search(line)
        if date_match:
            break
    if not date_match:
        return None

    amounts = AMOUNT_PATTERN.findall(line)
    if not amounts:
        return None

    amount = parse_amount(amounts[-1])
    if amount is None or amount == 0:
        return None

    description = line[date_match.end() : line.rfind(amounts[-1])].strip(" -|")
    if not description or should_skip(description):
        return None

    return {
        "id": str(uuid.uuid4()),
        "date": normalize_date(date_match.group(1)),
        "description": description[:120],
        "amount": amount,
    }


def extract_from_tables(pdf_path: Path) -> list[dict]:
    transactions: list[dict] = []
    seen: set[tuple] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    if not row:
                        continue
                    cells = [str(cell or "").strip() for cell in row]
                    row_text = " | ".join(cell for cell in cells if cell)
                    tx = extract_from_line(row_text)
                    if not tx:
                        continue
                    key = (tx["date"], tx["description"], tx["amount"])
                    if key in seen:
                        continue
                    seen.add(key)
                    transactions.append(tx)

    return transactions


def extract_from_text(pdf_path: Path) -> list[dict]:
    transactions: list[dict] = []
    seen: set[tuple] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                tx = extract_from_line(line)
                if not tx:
                    continue
                key = (tx["date"], tx["description"], tx["amount"])
                if key in seen:
                    continue
                seen.add(key)
                transactions.append(tx)

    return transactions


def parse_statement(pdf_path: Path) -> list[dict]:
    table_results = extract_from_tables(pdf_path)
    if table_results:
        return sorted(table_results, key=lambda tx: tx["date"])

    text_results = extract_from_text(pdf_path)
    return sorted(text_results, key=lambda tx: tx["date"])


def main() -> None:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: parse_statement.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    try:
        transactions = parse_statement(pdf_path)
        print(json.dumps({"transactions": transactions}))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
