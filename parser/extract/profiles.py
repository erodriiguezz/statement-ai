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
    # Sections that list two transactions per line in a repeating
    # "date serial# amount date serial# amount" layout (e.g. TD Bank's
    # "Checks Paid" table). Parsed with a dedicated dual-entry line parser
    # instead of the single-amount-per-line logic.
    checks_section_headers: tuple[str, ...] = ()
    ignore_section_headers: tuple[str, ...] = ()
    amount_mode: AmountMode = "section_unsigned"
    allow_short_dates: bool = True
    multiline_descriptions: bool = True
    skip_line_patterns: tuple[str, ...] = ()
    # When True, unsigned amounts in a neutral section stay as-is (may be wrong);
    # prefer section headers or signed/column modes.
    require_section_for_unsigned: bool = False
    # When True, the posting date is the date at the start of the line; any
    # later date on the line (e.g. a purchase date embedded in the description)
    # is ignored. Needed for single-column "activity in date order" layouts
    # whose debit lines read "1/03 DBT CRD 2043 12/29/22 ... 2.32-".
    prefer_leading_date: bool = False


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
        "other withdrawals",
        "withdrawals",
        "fees",
    ),
    credit_section_headers=(
        "electronic deposits",
        "other credits",
        "deposits",
        "credits",
    ),
    # "Checks Paid" lists two checks per line: DATE SERIAL# AMOUNT DATE SERIAL# AMOUNT
    checks_section_headers=("checks paid", "checks"),
    ignore_section_headers=GENERIC_IGNORE,
    amount_mode="amount_balance_columns",
    allow_short_dates=True,
    multiline_descriptions=True,
    skip_line_patterns=(
        r"^posting\s+date\s+description",
        r"^subtotal:",
        r"^call\s+1-800",
        r"fdic insured",
    ),
)

# Single-column "Activity in Date Order" statements produced by several
# community-bank core systems (e.g. "YOU 1ST BUSINESS CHECKING" image
# statements). Debits and credits share one date-ordered list with no
# debit/credit section headers; debits carry a trailing minus ("2.32-") and
# credits are unsigned. Each line begins with the posting date, but debit
# descriptions embed a second (purchase) date, so leading-date anchoring is
# required. The trailing "DAILY BALANCE INFORMATION" grid is dated balance
# rows that must be ignored rather than parsed as transactions.
ACTIVITY_DATE_ORDER = LayoutProfile(
    id="activity_date_order",
    match_keywords=("activity in date order",),
    # "Summary by Check Number" packs two checks per line, like TD's table:
    # "1/03 1183 684.95 1/04 1186* 243.00".
    checks_section_headers=("summary by check number",),
    ignore_section_headers=GENERIC_IGNORE + ("daily balance information",),
    amount_mode="signed",
    allow_short_dates=True,
    multiline_descriptions=True,
    prefer_leading_date=True,
    skip_line_patterns=(
        r"^date\s+description",
        r"activity in date order",
        r"account number",
        r"checking account",
        r"business checking",
        r"image statement",
        r"\(continued\)",
        r"page\s+\d+\s+of\s+\d+",
    ),
)

# Republic Bank & Trust ("MoneyMGR" business checking). Transactions sit under
# bare "Deposits" / "Withdrawals" headers; withdrawals carry an explicit
# "-$200.00" and deposits are unsigned. The account-summary column row
# ("... Deposits Interest Paid* Withdrawals Fees Ending Balance") and the fee
# summary would hijack GENERIC's "fees" debit header, so this profile only
# keys sections on "deposits" / "withdrawals". Page 1's text layer never says
# "Republic Bank" (only the scanned back page does), so detection also keys on
# the routing number and product name.
REPUBLIC_BANK = LayoutProfile(
    id="republic_bank",
    match_keywords=("republic bank", "083001314", "moneymgr"),
    debit_section_headers=("withdrawals",),
    credit_section_headers=("deposits",),
    # "Checks Paid" (already in GENERIC_IGNORE) repeats checks listed under
    # Withdrawals ("Check 115 -$480.00"), so it stays ignored to avoid
    # duplicates. "Daily Balance" is followed by the headerless check-image
    # page, which the ignore section also swallows.
    ignore_section_headers=GENERIC_IGNORE
    + (
        "summary of account",
        "summary of insufficient funds",
        "daily balance",
    ),
    amount_mode="signed",
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
    ACTIVITY_DATE_ORDER,
    REPUBLIC_BANK,
    GENERIC,
)

PROFILES_BY_ID = {profile.id: profile for profile in PROFILES}


def get_profile(profile_id: Optional[str]) -> LayoutProfile:
    if not profile_id:
        return GENERIC
    return PROFILES_BY_ID.get(profile_id, GENERIC)
