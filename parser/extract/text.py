"""Profile-driven section-aware transaction line parser."""

from __future__ import annotations

import re
import uuid
from typing import Literal, Optional

from .normalize import (
    clean_line,
    credit_debit_marker,
    extract_statement_period_end,
    find_amounts,
    find_date_match,
    is_header_or_column_label,
    normalize_date,
    parse_amount,
    printed_negative,
    should_skip_line,
)
from .profiles import (
    CARD_CREDIT_HEADERS,
    CARD_DEBIT_HEADERS,
    UNIVERSAL_CREDIT_HEADERS,
    UNIVERSAL_DEBIT_HEADERS,
    LayoutProfile,
)
from .reconcile import extract_statement_totals, is_credit_card_statement

SectionKind = Literal["debit", "credit", "ignore", "neutral", "checks"]

# Layouts whose last amount on a row is the running balance.
BALANCE_COLUMN_MODES = ("debit_credit_columns", "amount_balance_columns")

# Matches TD Bank-style "Checks Paid" rows, which pack two check entries
# side by side: "08/04 1506 750.00 08/20 1518 750.00". The second entry is
# optional since a section with an odd number of checks ends with a lone
# entry on its last line.
CHECK_ROW_PATTERN = re.compile(
    r"^(?P<date1>\d{1,2}/\d{1,2})\s+(?P<serial1>\d{2,7}\*?)\s+"
    r"(?P<amount1>\d{1,3}(?:,\d{3})*\.\d{2})"
    r"(?:\s+(?P<date2>\d{1,2}/\d{1,2})\s+(?P<serial2>\d{2,7}\*?)\s+"
    r"(?P<amount2>\d{1,3}(?:,\d{3})*\.\d{2}))?\s*$"
)


def parse_transactions_from_text(
    text: str,
    profile: LayoutProfile,
    *,
    default_year: Optional[int] = None,
) -> list[dict]:
    period_end = extract_statement_period_end(text)
    year = default_year or (period_end[0] if period_end else None)
    period_end_month = period_end[1] if period_end else None
    credit_card = is_credit_card_statement(text)
    section: SectionKind = "neutral"
    transactions: list[dict] = []
    current: Optional[dict] = None

    for raw_line in text.splitlines():
        line = clean_line(raw_line)
        if not line:
            continue

        next_section = detect_section(line, profile, credit_card=credit_card)
        if next_section is not None:
            if current:
                transactions.append(current)
                current = None
            section = next_section
            continue

        if section == "ignore":
            continue

        dated = find_date_match(line, allow_short=True) is not None
        if should_skip_line(line, profile.skip_line_patterns, dated=dated):
            continue

        if is_header_or_column_label(line):
            continue

        if section == "checks":
            if current:
                transactions.append(current)
                current = None
            transactions.extend(parse_check_row_line(line, year, period_end_month))
            continue

        parsed = parse_transaction_line(
            line,
            profile,
            year,
            section,
            period_end_month=period_end_month,
            credit_card=credit_card,
        )
        if parsed:
            if current:
                transactions.append(current)
            current = parsed
            continue

        if (
            current
            and profile.multiline_descriptions
            and _looks_like_continuation(line)
        ):
            current["description"] = _merge_description(
                current["description"], line
            )

    if current:
        transactions.append(current)

    if not credit_card:
        _apply_balance_deltas(
            transactions, extract_statement_totals(text).beginning_balance
        )
    return _finalize(transactions)


def detect_section(
    line: str,
    profile: LayoutProfile,
    *,
    credit_card: bool = False,
) -> Optional[SectionKind]:
    # A dated line is a transaction row, never a header, even when its
    # description contains header words ("01/06 ATM WITHDRAWALS FEE REFUND").
    if find_date_match(line, allow_short=True):
        return None

    # Strip common OCR bracket/noise prefixes: "[DEPOSITS AND ADDITIONS"
    lowered = re.sub(r"^[\W_]+", "", line.lower()).strip()
    has_amount = bool(find_amounts(line))

    # checks_section_headers is an explicit per-profile opt-in (a bank whose
    # "Checks Paid" table actually lists per-check amounts), so it takes
    # priority over the generic ignore list, which treats "checks paid" as
    # a no-amount check-image section by default.
    if not has_amount and _longest_leading_header(lowered, profile.checks_section_headers):
        return "checks"

    ignore = sorted(profile.ignore_section_headers, key=len, reverse=True)
    for header in ignore:
        if header in lowered:
            return "ignore"

    # Summary rows ("Deposits 2,000.00") carry amounts; real headers don't.
    if has_amount:
        return None

    if credit_card:
        debit_headers = CARD_DEBIT_HEADERS
        credit_headers = CARD_CREDIT_HEADERS
    else:
        debit_headers = profile.debit_section_headers + UNIVERSAL_DEBIT_HEADERS
        credit_headers = profile.credit_section_headers + UNIVERSAL_CREDIT_HEADERS

    # Debit and credit compete on match length, so "Payments and Credits"
    # is a credit section even though it starts with "payments".
    debit = _longest_leading_header(lowered, debit_headers)
    credit = _longest_leading_header(lowered, credit_headers)
    if debit is None and credit is None:
        return None
    if credit is None or (debit is not None and len(debit) >= len(credit)):
        return "debit"
    return "credit"


def _longest_leading_header(
    lowered: str, headers: tuple[str, ...]
) -> Optional[str]:
    """Longest header the line starts with, as a whole word or phrase."""
    best: Optional[str] = None
    for header in headers:
        if re.match(rf"{re.escape(header)}(?![a-z])", lowered):
            if best is None or len(header) > len(best):
                best = header
    return best


def parse_check_row_line(
    line: str,
    default_year: Optional[int],
    period_end_month: Optional[int] = None,
) -> list[dict]:
    """Parse a "Checks Paid" row that may hold one or two check entries."""
    match = CHECK_ROW_PATTERN.match(line)
    if not match:
        return []

    results: list[dict] = []
    for idx in (1, 2):
        date_raw = match.group(f"date{idx}")
        if not date_raw:
            continue
        date_iso = normalize_date(
            date_raw, default_year=default_year, period_end_month=period_end_month
        )
        amount = parse_amount(match.group(f"amount{idx}"))
        if not date_iso or amount is None:
            continue
        serial = match.group(f"serial{idx}").rstrip("*")
        results.append(
            {
                "id": str(uuid.uuid4()),
                "date": date_iso,
                "description": f"Check #{serial}",
                "amount": -abs(amount),
            }
        )
    return results


def parse_transaction_line(
    line: str,
    profile: LayoutProfile,
    default_year: Optional[int],
    section: SectionKind,
    *,
    period_end_month: Optional[int] = None,
    credit_card: bool = False,
) -> Optional[dict]:
    date_match = find_date_match(
        line,
        allow_short=profile.allow_short_dates,
        prefer_leading=profile.prefer_leading_date,
    )
    if not date_match:
        return None

    date_raw = date_match.group("date")
    date_iso = normalize_date(
        date_raw, default_year=default_year, period_end_month=period_end_month
    )
    if not date_iso:
        return None

    # Strip separators around the description but keep a trailing "-" — it is a
    # debit sign in trailing-minus layouts and must survive for find_amounts.
    remainder = line[date_match.end() :].lstrip(" -|:").rstrip(" |:")
    amounts = find_amounts(remainder)
    if not amounts:
        return None

    amount = _pick_amount(
        remainder, amounts, profile, section, credit_card=credit_card
    )
    if amount is None:
        return None

    # Description is text before the first amount used (roughly last amount token)
    amount_raw = amounts[-1][0]
    if profile.amount_mode == "debit_credit_columns" and len(amounts) >= 2:
        # Prefer the non-balance amount: first of debit/credit pair
        amount_raw = amounts[0][0]
    elif profile.amount_mode == "amount_balance_columns" and len(amounts) >= 2:
        amount_raw = amounts[0][0]

    desc_end = remainder.rfind(amount_raw)
    if profile.amount_mode in BALANCE_COLUMN_MODES:
        desc_end = remainder.find(amounts[0][0])

    description = remainder[:desc_end].strip(" -|:") if desc_end >= 0 else remainder
    description = _clean_description(description)
    if not description or _is_weak_description(description):
        if section == "credit":
            description = "Deposit"
        elif section == "debit":
            description = "Withdrawal"
        else:
            return None

    transaction = {
        "id": str(uuid.uuid4()),
        "date": date_iso,
        "description": description[:160],
        "amount": amount,
    }
    if profile.amount_mode in BALANCE_COLUMN_MODES and len(amounts) >= 2:
        # Internal only: lets _apply_balance_deltas verify the sign.
        transaction["_balance"] = amounts[-1][1]
    return transaction


def _pick_amount(
    remainder: str,
    amounts: list[tuple[str, float]],
    profile: LayoutProfile,
    section: SectionKind,
    *,
    credit_card: bool = False,
) -> Optional[float]:
    """Signed cash-flow amount: negative is money out, positive is money in.

    Sign sources, strongest first: a sign printed on the amount, the section
    header, then layout-specific column conventions.
    """
    if profile.amount_mode in BALANCE_COLUMN_MODES:
        # First amount is the transaction; last is often running balance
        raw, value = amounts[0]
    else:
        raw, value = amounts[-1]
    magnitude = abs(value)

    # "CR"/"DR" already describe cash flow on both bank and card statements.
    marker = credit_debit_marker(remainder, raw)
    if marker is not None:
        return marker * magnitude

    if printed_negative(raw):
        # Card statements print credits negative, the reverse of cash flow.
        return magnitude if credit_card else -magnitude

    if section in ("debit", "credit"):
        return _apply_section_sign(magnitude, section)

    if credit_card:
        # Unsigned rows on a card statement are charges.
        return -magnitude

    if profile.amount_mode == "debit_credit_columns" and len(amounts) >= 2:
        # Typically: description debit credit [balance]. Zero cells are
        # dropped by find_amounts, so this is a best guess that
        # _apply_balance_deltas corrects when a running balance is present.
        debit, credit = amounts[0][1], amounts[1][1]
        if abs(credit) > 0 and abs(debit) == 0:
            return abs(credit)
        return -abs(debit)

    if profile.require_section_for_unsigned:
        return None

    # Neutral section with unsigned amount: keep as-is (may be deposit-heavy)
    return magnitude


def _apply_section_sign(magnitude: float, section: SectionKind) -> float:
    if section == "debit":
        return -abs(magnitude)
    if section == "credit":
        return abs(magnitude)
    return magnitude


def _apply_balance_deltas(
    transactions: list[dict], beginning_balance: Optional[float]
) -> None:
    """Re-sign rows using the running balance column, in statement order.

    When a row's balance moved by exactly its amount since the previous row,
    the direction of that move is the true sign, overriding section or column
    guesses. Rows without a printed balance break the chain, since the
    previous balance can no longer be trusted.
    """
    previous = beginning_balance
    for tx in transactions:
        balance = tx.get("_balance")
        if balance is None:
            previous = None
            continue
        if previous is not None:
            delta = round(balance - previous, 2)
            if delta != 0 and abs(abs(delta) - abs(tx["amount"])) < 0.005:
                tx["amount"] = delta
        previous = balance


def _clean_description(description: str) -> str:
    description = re.sub(r"\s+", " ", description).strip(" -|:")
    description = re.sub(r"^[_\W]+", "", description)
    description = re.sub(r"[_\W]+$", "", description)
    description = description.replace("_", " ")
    description = re.sub(r"\s+", " ", description).strip(" -|:")
    # Drop trailing column junk
    description = re.sub(r"\s+(debit|credit|balance)$", "", description, flags=re.I)
    return description.strip()


def _is_weak_description(description: str) -> bool:
    lowered = description.lower().strip()
    if lowered in {"page", "date", "amount", "balance", "total", "p"}:
        return True
    if re.fullmatch(r"\d+", lowered):
        return True
    if len(lowered) < 2:
        return True
    return False


_CONTINUATION_BLOCKLIST = (
    "checkbook",
    "balance your",
    "should equal",
    "outstanding",
    "member fdic",
    "customer service",
    "continued",
    "total",
)


def _looks_like_continuation(line: str) -> bool:
    if find_date_match(line, allow_short=True):
        return False
    if find_amounts(line):
        return False
    if should_skip_line(line):
        return False
    lowered = line.lower()
    if any(token in lowered for token in _CONTINUATION_BLOCKLIST):
        return False
    # Continuations are short payee / memo lines, not paragraphs
    if len(line) > 60:
        return False
    return len(line) >= 2


def _merge_description(existing: str, addition: str) -> str:
    merged = f"{existing} {addition}".strip()
    return merged[:120]


def _finalize(transactions: list[dict]) -> list[dict]:
    """Drop summary-like leftovers and stable-sort by date."""
    cleaned: list[dict] = []
    for tx in transactions:
        tx.pop("_balance", None)
        desc = tx["description"].lower()
        if should_skip_line(desc, dated=True):
            continue
        if _is_weak_description(tx["description"]):
            continue
        cleaned.append(tx)
    return sorted(cleaned, key=lambda tx: (tx["date"], tx["description"]))
