"""Profile-driven section-aware transaction line parser."""

from __future__ import annotations

import re
import uuid
from typing import Literal, Optional

from .normalize import (
    clean_line,
    extract_statement_year,
    find_amounts,
    find_date_match,
    is_header_or_column_label,
    normalize_date,
    should_skip_line,
)
from .profiles import LayoutProfile

SectionKind = Literal["debit", "credit", "ignore", "neutral"]


def parse_transactions_from_text(
    text: str,
    profile: LayoutProfile,
    *,
    default_year: Optional[int] = None,
) -> list[dict]:
    year = default_year or extract_statement_year(text)
    section: SectionKind = "neutral"
    transactions: list[dict] = []
    current: Optional[dict] = None

    for raw_line in text.splitlines():
        line = clean_line(raw_line)
        if not line:
            continue

        next_section = detect_section(line, profile)
        if next_section is not None:
            if current:
                transactions.append(current)
                current = None
            section = next_section
            continue

        if section == "ignore":
            continue

        if should_skip_line(line, profile.skip_line_patterns):
            continue

        if is_header_or_column_label(line):
            continue

        parsed = parse_transaction_line(line, profile, year, section)
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

    return _finalize(transactions)


def detect_section(line: str, profile: LayoutProfile) -> Optional[SectionKind]:
    # Strip common OCR bracket/noise prefixes: "[DEPOSITS AND ADDITIONS"
    lowered = re.sub(r"^[\W_]+", "", line.lower()).strip()
    # Prefer longer / more specific headers by sorting descending length
    ignore = sorted(profile.ignore_section_headers, key=len, reverse=True)
    for header in ignore:
        if header in lowered:
            return "ignore"

    debit = sorted(profile.debit_section_headers, key=len, reverse=True)
    for header in debit:
        if header in lowered:
            return "debit"

    credit = sorted(profile.credit_section_headers, key=len, reverse=True)
    for header in credit:
        if header in lowered:
            return "credit"

    return None


def parse_transaction_line(
    line: str,
    profile: LayoutProfile,
    default_year: Optional[int],
    section: SectionKind,
) -> Optional[dict]:
    date_match = find_date_match(line, allow_short=profile.allow_short_dates)
    if not date_match:
        return None

    date_raw = date_match.group("date")
    date_iso = normalize_date(date_raw, default_year=default_year)
    if not date_iso:
        return None

    remainder = line[date_match.end() :].strip(" -|:")
    amounts = find_amounts(remainder)
    if not amounts:
        return None

    amount = _pick_amount(remainder, amounts, profile, section)
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
    if profile.amount_mode in ("debit_credit_columns", "amount_balance_columns"):
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

    return {
        "id": str(uuid.uuid4()),
        "date": date_iso,
        "description": description[:160],
        "amount": amount,
    }


def _pick_amount(
    remainder: str,
    amounts: list[tuple[str, float]],
    profile: LayoutProfile,
    section: SectionKind,
) -> Optional[float]:
    values = [value for _, value in amounts]

    if profile.amount_mode == "debit_credit_columns":
        # Typically: description debit credit [balance]
        if len(values) >= 2:
            debit, credit = values[0], values[1]
            if abs(debit) > 0 and abs(credit) == 0:
                return -abs(debit)
            if abs(credit) > 0 and abs(debit) == 0:
                return abs(credit)
            # Both present — prefer first non-zero as signed by column order
            if abs(debit) > 0:
                return -abs(debit)
            return abs(credit)
        value = values[0]
        return _apply_section_sign(abs(value), section, profile)

    if profile.amount_mode == "amount_balance_columns":
        # First amount is the transaction; last is often running balance
        value = values[0] if len(values) >= 1 else None
        if value is None:
            return None
        # Preserve explicit sign/parentheses; otherwise use section
        raw0 = amounts[0][0]
        if raw0.strip().startswith("(") or raw0.strip().startswith("-"):
            return -abs(value)
        if section in ("debit", "credit"):
            return _apply_section_sign(abs(value), section, profile)
        # Chase/BoA often show withdrawals as positive in Amount column
        # with context from section; without section keep signed value
        return value

    # section_unsigned / signed
    value = values[-1]
    raw = amounts[-1][0]
    if raw.strip().startswith("(") or (
        profile.amount_mode == "signed" and value < 0
    ):
        return -abs(value) if section != "credit" else abs(value)

    if section in ("debit", "credit"):
        return _apply_section_sign(abs(value), section, profile)

    if profile.require_section_for_unsigned:
        return None

    # Neutral section with unsigned amount: keep as-is (may be deposit-heavy)
    return value


def _apply_section_sign(
    magnitude: float, section: SectionKind, profile: LayoutProfile
) -> float:
    if section == "debit":
        return -abs(magnitude)
    if section == "credit":
        return abs(magnitude)
    return magnitude


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
        desc = tx["description"].lower()
        if should_skip_line(desc):
            continue
        if _is_weak_description(tx["description"]):
            continue
        cleaned.append(tx)
    return sorted(cleaned, key=lambda tx: (tx["date"], tx["description"]))
