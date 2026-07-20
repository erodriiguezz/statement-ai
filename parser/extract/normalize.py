"""Date, amount, and skip helpers for statement parsing."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

AMOUNT_PATTERN = re.compile(
    r"(?P<amount>"
    r"\(?-?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?"
    r"|"
    r"\(?-?\$?\s?\d+\.\d{2}\)?"
    r")"
)

DATE_FULL_PATTERNS = [
    re.compile(r"\b(?P<date>\d{1,2}/\d{1,2}/\d{2,4})\b"),
    re.compile(r"\b(?P<date>\d{4}-\d{2}-\d{2})\b"),
    re.compile(r"\b(?P<date>\d{1,2}-\d{1,2}-\d{2,4})\b"),
]

DATE_SHORT_PATTERN = re.compile(r"\b(?P<date>\d{1,2}/\d{1,2})\b")

STATEMENT_DATE_PATTERNS = [
    re.compile(
        r"statement\s+date\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})",
        re.IGNORECASE,
    ),
    re.compile(
        r"statement\s+period\s*:?\s*\d{1,2}/\d{1,2}/\d{2,4}\s*[-–to]+\s*(\d{1,2}/\d{1,2}/\d{2,4})",
        re.IGNORECASE,
    ),
    re.compile(
        r"period\s+ending\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})",
        re.IGNORECASE,
    ),
    re.compile(
        r"ending\s+balance\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})",
        re.IGNORECASE,
    ),
]

MONTH_NAME_PERIOD = re.compile(
    r"(?P<month>january|february|march|april|may|june|july|august|september|"
    r"october|november|december)\s+\d{1,2},?\s+(?P<year>20\d{2})"
    r"(?:\s+through\s+\w+\s+\d{1,2},?\s+20\d{2})?",
    re.IGNORECASE,
)

DEFAULT_SKIP_KEYWORDS = (
    "beginning balance",
    "ending balance",
    "opening balance",
    "closing balance",
    "total deposits",
    "total withdrawals",
    "total checks",
    "total credits",
    "total debits",
    "account summary",
    "statement period",
    "average daily balance",
    "interest paid",
    "service charges",
    "your accounts at a glance",
    "current balance summary",
    "daily balance",
    "balance summary",
    "page total",
    "continued on next",
)


def clean_line(line: str) -> str:
    # OCR often glues underscores/noise to dates: "01/31__Zelle"
    line = line.replace("_", " ")
    line = re.sub(r"\s+", " ", line.strip())
    return line


def parse_amount(raw: str) -> Optional[float]:
    cleaned = raw.strip().replace("$", "").replace(",", "").replace(" ", "")
    negative = False
    if cleaned.startswith("(") and cleaned.endswith(")"):
        negative = True
        cleaned = cleaned[1:-1]
    if cleaned.startswith("-"):
        negative = True
        cleaned = cleaned[1:]
    try:
        value = round(float(cleaned), 2)
    except ValueError:
        return None
    if value == 0:
        return None
    return -abs(value) if negative else value


def find_amounts(line: str) -> list[tuple[str, float]]:
    results: list[tuple[str, float]] = []
    for match in AMOUNT_PATTERN.finditer(line):
        raw = match.group("amount")
        value = parse_amount(raw)
        if value is not None:
            results.append((raw, value))
    return results


def normalize_date(raw: str, default_year: Optional[int] = None) -> Optional[str]:
    raw = raw.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw

    if re.fullmatch(r"\d{1,2}/\d{1,2}", raw):
        if default_year is None:
            return None
        month, day = raw.split("/")
        return _safe_iso(int(default_year), int(month), int(day))

    parts = re.split(r"[/-]", raw)
    if len(parts) != 3:
        return None

    if len(parts[0]) == 4:
        year, month, day = parts
    else:
        month, day, year = parts
        if len(year) == 2:
            year = f"20{year}"

    return _safe_iso(int(year), int(month), int(day))


def _safe_iso(year: int, month: int, day: int) -> Optional[str]:
    try:
        return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_statement_year(text: str) -> Optional[int]:
    for pattern in STATEMENT_DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        normalized = normalize_date(match.group(1))
        if normalized:
            return int(normalized[:4])

    month_match = MONTH_NAME_PERIOD.search(text)
    if month_match:
        try:
            return int(month_match.group("year"))
        except ValueError:
            return None
    return None


def find_date_match(
    line: str,
    *,
    allow_short: bool = True,
) -> Optional[re.Match[str]]:
    for pattern in DATE_FULL_PATTERNS:
        match = pattern.search(line)
        if match:
            return match
    if allow_short:
        return DATE_SHORT_PATTERN.search(line)
    return None


def should_skip_line(line: str, extra_patterns: tuple[str, ...] = ()) -> bool:
    lowered = line.lower()
    if any(keyword in lowered for keyword in DEFAULT_SKIP_KEYWORDS):
        return True
    for pattern in extra_patterns:
        if re.search(pattern, line, re.IGNORECASE):
            return True
    # "Statement Date: 01/31/25 Page 1"
    if re.search(r"\bpage\s+\d+\b", lowered) and (
        "statement" in lowered or "account" in lowered
    ):
        return True
    if re.fullmatch(r"page\s+\d+", lowered):
        return True
    return False


def is_header_or_column_label(line: str) -> bool:
    lowered = line.lower().strip()
    labels = {
        "date description amount",
        "date description",
        "date amount balance",
        "date description amount balance",
        "date debit credit balance",
        "date description debit credit",
        "transaction detail",
        "date description withdrawals deposits balance",
    }
    return lowered in labels or lowered.startswith("date description")
