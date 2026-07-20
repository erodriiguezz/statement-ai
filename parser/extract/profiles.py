"""Declarative layout profiles for top US retail banks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

AmountMode = Literal[
    "section_unsigned",
    "signed",
    "debit_credit_columns",
    "amount_balance_columns",
]


@dataclass(frozen=True)
class LayoutProfile:
    id: str
    match_keywords: tuple[str, ...]
    debit_section_headers: tuple[str, ...] = ()
    credit_section_headers: tuple[str, ...] = ()
    ignore_section_headers: tuple[str, ...] = ()
    amount_mode: AmountMode = "section_unsigned"
    allow_short_dates: bool = True
    multiline_descriptions: bool = True
    skip_line_patterns: tuple[str, ...] = ()
    # When True, unsigned amounts in a neutral section stay as-is (may be wrong);
    # prefer section headers or signed/column modes.
    require_section_for_unsigned: bool = False


GENERIC_IGNORE = (
    "current balance summary",
    "daily balance summary",
    "balance summary",
    "account summary",
    "important information",
    "overdraft protection",
    "fees summary",
    "service fee summary",
    "interest summary",
    "checks paid",
    "images of checks",
    "to balance your checkbook",
    "how to balance",
    "balancing your account",
    "customer service",
    "member fdic",
)

GENERIC = LayoutProfile(
    id="generic",
    match_keywords=(),
    debit_section_headers=(
        "checks & other debits",
        "checks and other debits",
        "other debits",
        "withdrawals and debits",
        "withdrawals/debits",
        "electronic withdrawals",
        "card purchases",
        "purchases and adjustments",
        "atm withdrawals",
        "fees",
    ),
    credit_section_headers=(
        "deposits & other credits",
        "deposits and other credits",
        "other credits",
        "deposits and credits",
        "deposits/credits",
        "electronic deposits",
        "credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="section_unsigned",
    allow_short_dates=True,
    multiline_descriptions=True,
    skip_line_patterns=(
        r"^date\s+description",
        r"^account\s+#",
        r"address service requested",
    ),
)

CHASE = LayoutProfile(
    id="chase",
    match_keywords=(
        "jpmorgan chase",
        "chase bank",
        "chase.com",
        "jp morgan chase",
    ),
    debit_section_headers=(
        "electronic withdrawals",
        "atm & debit card withdrawals",
        "atm and debit card withdrawals",
        "fees",
        "checks paid",
        "other withdrawals",
    ),
    credit_section_headers=(
        "deposits and additions",
        "electronic deposits",
        "other additions",
    ),
    ignore_section_headers=GENERIC_IGNORE
    + (
        "chase total checking",
        "balances at a glance",
        "transaction detail",
        "daily ending balance",
        "checking summary",
        "in case of errors",
        "customer service information",
    ),
    amount_mode="section_unsigned",
    allow_short_dates=True,
    multiline_descriptions=True,
    skip_line_patterns=(
        r"beginning balance",
        r"ending balance",
        r"^date\s+description",
        r"^total deposits",
        r"^total electronic",
        r"^total withdrawals",
    ),
)

BANK_OF_AMERICA = LayoutProfile(
    id="bank_of_america",
    match_keywords=(
        "bank of america",
        "bankofamerica.com",
    ),
    debit_section_headers=(
        "withdrawals and other debits",
        "checks",
        "service fees",
        "card account",
    ),
    credit_section_headers=(
        "deposits and other credits",
        "deposits and credits",
    ),
    ignore_section_headers=GENERIC_IGNORE
    + (
        "account summary",
        "daily ledger balances",
    ),
    amount_mode="amount_balance_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
)

WELLS_FARGO = LayoutProfile(
    id="wells_fargo",
    match_keywords=("wells fargo", "wellsfargo.com"),
    debit_section_headers=(
        "withdrawals / debits",
        "withdrawals/debits",
        "electronic withdrawals",
        "checks paid",
        "fees charged",
    ),
    credit_section_headers=(
        "deposits / credits",
        "deposits/credits",
        "electronic deposits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="section_unsigned",
    allow_short_dates=True,
    multiline_descriptions=True,
)

CITIBANK = LayoutProfile(
    id="citibank",
    match_keywords=("citibank", "citi bank", "citibank.com", "citi.com"),
    debit_section_headers=(
        "withdrawals",
        "purchases",
        "fees and charges",
        "checks",
    ),
    credit_section_headers=(
        "deposits",
        "payments and credits",
        "credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="debit_credit_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
)

US_BANK = LayoutProfile(
    id="us_bank",
    match_keywords=("u.s. bank", "us bank", "usbank.com"),
    debit_section_headers=(
        "other withdrawals",
        "checks paid",
        "card purchases",
        "fees",
    ),
    credit_section_headers=(
        "deposits",
        "other deposits",
        "credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="amount_balance_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
)

CAPITAL_ONE = LayoutProfile(
    id="capital_one",
    match_keywords=("capital one", "capitalone.com"),
    debit_section_headers=(
        "withdrawals",
        "purchases",
        "fees",
        "payments",
    ),
    credit_section_headers=(
        "deposits",
        "credits",
        "payments and credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="section_unsigned",
    allow_short_dates=True,
    multiline_descriptions=True,
)

PNC = LayoutProfile(
    id="pnc",
    match_keywords=("pnc bank", "pnc.com", "pnc bank, national"),
    debit_section_headers=(
        "withdrawals and debits",
        "checks",
        "fees",
    ),
    credit_section_headers=(
        "deposits and credits",
        "deposits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="amount_balance_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
)

TRUIST = LayoutProfile(
    id="truist",
    match_keywords=("truist", "truist.com", "bb&t", "suntrust"),
    debit_section_headers=(
        "withdrawals",
        "checks",
        "fees",
        "other debits",
    ),
    credit_section_headers=(
        "deposits",
        "other credits",
        "credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="section_unsigned",
    allow_short_dates=True,
    multiline_descriptions=True,
)

TD_BANK = LayoutProfile(
    id="td_bank",
    match_keywords=("td bank", "tdbank.com", "america's most convenient bank"),
    debit_section_headers=(
        "electronic payments",
        "withdrawals",
        "checks",
        "fees",
    ),
    credit_section_headers=(
        "electronic deposits",
        "deposits",
        "credits",
    ),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="amount_balance_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
)

PROFILES: tuple[LayoutProfile, ...] = (
    CHASE,
    BANK_OF_AMERICA,
    WELLS_FARGO,
    CITIBANK,
    US_BANK,
    CAPITAL_ONE,
    PNC,
    TRUIST,
    TD_BANK,
    GENERIC,
)

PROFILES_BY_ID = {profile.id: profile for profile in PROFILES}


def get_profile(profile_id: Optional[str]) -> LayoutProfile:
    if not profile_id:
        return GENERIC
    return PROFILES_BY_ID.get(profile_id, GENERIC)
