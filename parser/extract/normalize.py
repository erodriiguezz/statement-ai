"""Date, amount, and skip helpers for statement parsing."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

# A trailing "-" (e.g. "955.17-") is how some core-banking systems mark a
# debit, so the pattern accepts an optional minus on either end; parse_amount
# resolves the sign.
AMOUNT_PATTERN = re.compile(
    r"(?P<amount>"
    r"\(?-?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?"
    r"|"
    r"\(?-?\$?\s?\d+\.\d{2}\)?-?"
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
    # "Statement Closing Date 01/31/2025" / "Closing Date: 01/31/25" on card
    # statements.
    re.compile(
        r"closing\s+date\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})",
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
    # "Statement Dates 1/01/23 thru 1/31/23" — captures the period-end date.
    re.compile(
        r"statement\s+dates?\s*:?\s*\d{1,2}/\d{1,2}/\d{2,4}\s*"
        r"(?:thru|through|[-–to])+\s*(\d{1,2}/\d{1,2}/\d{2,4})",
        re.IGNORECASE,
    ),
]

MONTH_NAME_PERIOD = re.compile(
    r"(?P<month>january|february|march|april|may|june|july|august|september|"
    r"october|november|december)\s+\d{1,2},?\s+(?P<year>20\d{2})"
    r"(?:\s+through\s+\w+\s+\d{1,2},?\s+20\d{2})?",
    re.IGNORECASE,
)

# "Statement Period: Aug 01 2025-Aug 31 2025" (abbreviated month, no comma,
# dash-joined range with no spaces around the dash) — seen on TD Bank
# statements. Captures the period-end year.
STATEMENT_PERIOD_ABBR_MONTH = re.compile(
    r"statement\s+period\s*:?\s*"
    r"[A-Za-z]+\.?\s+\d{1,2}\s+\d{4}\s*[-–to]+\s*"
    r"(?P<month>[A-Za-z]+)\.?\s+\d{1,2}\s+(?P<year>\d{4})",
    re.IGNORECASE,
)

MONTH_ABBREVIATIONS = {
    name: index
    for index, name in enumerate(
        ("jan", "feb", "mar", "apr", "may", "jun",
         "jul", "aug", "sep", "oct", "nov", "dec"),
        start=1,
    )
}

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
    "your accounts at a glance",
    "current balance summary",
    "daily balance",
    "balance summary",
    "page total",
    "continued on next",
)

# Keywords that mark summary-box rows ("Interest Paid 1.25") but also appear in
# real dated transactions ("01/31 INTEREST PAID 1.25", "01/31 MONTHLY SERVICE
# CHARGES 15.00"). They only skip lines that carry no transaction date.
UNDATED_SKIP_KEYWORDS = (
    "interest paid",
    "service charges",
)

# "CR"/"DR" suffix after an amount, e.g. "300.00 CR" on card statements.
CREDIT_DEBIT_MARKER = re.compile(r"^\s*(?P<marker>CR|DR)\b", re.IGNORECASE)


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
    # Trailing-minus notation for debits, e.g. "955.17-".
    if cleaned.endswith("-"):
        negative = True
        cleaned = cleaned[:-1]
    try:
        value = round(float(cleaned), 2)
    except ValueError:
        return None
    if value == 0:
        return None
    return -abs(value) if negative else value


def printed_negative(raw: str) -> bool:
    """True when the amount token itself carries a minus: "-1.00", "(1.00)", "1.00-".

    A leading minus only counts when attached to the number: in
    "ACH - 500.00" the dash is a description separator, not a sign.
    """
    token = raw.strip()
    return bool(
        token.startswith("(") or re.match(r"-\$?\d", token) or token.endswith("-")
    )


def credit_debit_marker(line: str, raw: str) -> Optional[int]:
    """+1 for a "CR" suffix after amount ``raw`` in ``line``, -1 for "DR", else None."""
    position = line.find(raw)
    if position < 0:
        return None
    marker = CREDIT_DEBIT_MARKER.match(line[position + len(raw) :])
    if not marker:
        return None
    return 1 if marker.group("marker").upper() == "CR" else -1


def find_amounts(line: str) -> list[tuple[str, float]]:
    results: list[tuple[str, float]] = []
    for match in AMOUNT_PATTERN.finditer(line):
        raw = match.group("amount")
        value = parse_amount(raw)
        if value is not None:
            results.append((raw, value))
    return results


def normalize_date(
    raw: str,
    default_year: Optional[int] = None,
    period_end_month: Optional[int] = None,
) -> Optional[str]:
    """Normalize a statement date to ISO format.

    Short "MM/DD" dates take ``default_year`` (the statement period-end year).
    When ``period_end_month`` is known, a month well past the period end
    belongs to the previous year: "12/20" on a statement closing in January
    is December of the prior year. One month of slack keeps late postings
    ("02/01" on a January statement) in the period-end year.
    """
    raw = raw.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw

    if re.fullmatch(r"\d{1,2}/\d{1,2}", raw):
        if default_year is None:
            return None
        month, day = (int(part) for part in raw.split("/"))
        year = int(default_year)
        if period_end_month is not None and month > period_end_month + 1:
            year -= 1
        return _safe_iso(year, month, day)

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
    period_end = extract_statement_period_end(text)
    return period_end[0] if period_end else None


def extract_statement_period_end(
    text: str,
) -> Optional[tuple[int, Optional[int]]]:
    """Return (year, month) of the statement period end; month may be None."""
    for pattern in STATEMENT_DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        normalized = normalize_date(match.group(1))
        if normalized:
            return int(normalized[:4]), int(normalized[5:7])

    abbr_month_match = STATEMENT_PERIOD_ABBR_MONTH.search(text)
    if abbr_month_match:
        month = MONTH_ABBREVIATIONS.get(abbr_month_match.group("month")[:3].lower())
        return int(abbr_month_match.group("year")), month

    month_match = MONTH_NAME_PERIOD.search(text)
    if month_match:
        # The captured month may be the period start, so it is not reliable
        # enough for year rollover.
        return int(month_match.group("year")), None
    return None


LEADING_DATE_PATTERN = re.compile(r"^\s*(?P<date>\d{1,2}/\d{1,2}(?:/\d{2,4})?)")


def find_date_match(
    line: str,
    *,
    allow_short: bool = True,
    prefer_leading: bool = False,
) -> Optional[re.Match[str]]:
    # For layouts whose posting date leads the line, anchor on that date so an
    # embedded date later in the line (e.g. a purchase date) is not picked.
    if prefer_leading:
        leading = LEADING_DATE_PATTERN.match(line)
        if leading:
            return leading
    for pattern in DATE_FULL_PATTERNS:
        match = pattern.search(line)
        if match:
            return match
    if allow_short:
        return DATE_SHORT_PATTERN.search(line)
    return None


def should_skip_line(
    line: str,
    extra_patterns: tuple[str, ...] = (),
    *,
    dated: bool = False,
) -> bool:
    """True for summary/boilerplate lines that are never transactions.

    ``dated`` marks a line (or description) that belongs to a dated
    transaction row, which exempts it from UNDATED_SKIP_KEYWORDS.
    """
    lowered = line.lower()
    if any(keyword in lowered for keyword in DEFAULT_SKIP_KEYWORDS):
        return True
    if not dated and any(keyword in lowered for keyword in UNDATED_SKIP_KEYWORDS):
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
