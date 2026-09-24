"""Statement-level checks: credit-card detection and totals reconciliation.

A misread row (wrong sign, dropped, duplicated) is otherwise silent, so the
parsed transactions are checked against the balances and totals the statement
prints about itself. Mismatches become user-facing warnings, not errors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .normalize import clean_line, find_amounts

# Card statements print charges as positive and payments/credits as negative
# (or "CR"), the opposite of our cash-flow convention. "minimum payment" is
# required so an overdraft line of credit on a bank statement does not qualify.
CREDIT_CARD_REQUIRED_KEYWORD = "minimum payment"
CREDIT_CARD_KEYWORDS = (
    "credit limit",
    "available credit",
    "payment due date",
    "new balance",
)

BEGINNING_BALANCE_KEYWORDS = (
    "beginning balance",
    "opening balance",
    "previous balance",
    "starting balance",
)
ENDING_BALANCE_KEYWORDS = (
    "ending balance",
    "closing balance",
    "new balance",
)
TOTAL_DEPOSITS_KEYWORDS = (
    "total deposits",
    "total credits",
    "total additions",
)
TOTAL_WITHDRAWALS_KEYWORDS = (
    "total withdrawals",
    "total debits",
    "total subtractions",
)

TOLERANCE = 0.01


@dataclass(frozen=True)
class StatementTotals:
    beginning_balance: Optional[float] = None
    ending_balance: Optional[float] = None
    total_deposits: Optional[float] = None
    total_withdrawals: Optional[float] = None


def is_credit_card_statement(text: str) -> bool:
    sample = text[:8000].lower()
    if CREDIT_CARD_REQUIRED_KEYWORD not in sample:
        return False
    return any(keyword in sample for keyword in CREDIT_CARD_KEYWORDS)


def extract_statement_totals(text: str) -> StatementTotals:
    lines = [clean_line(line) for line in text.splitlines()]
    return StatementTotals(
        beginning_balance=_first_amount_after(lines, BEGINNING_BALANCE_KEYWORDS),
        ending_balance=_first_amount_after(lines, ENDING_BALANCE_KEYWORDS),
        total_deposits=_first_amount_after(lines, TOTAL_DEPOSITS_KEYWORDS, absolute=True),
        total_withdrawals=_first_amount_after(
            lines, TOTAL_WITHDRAWALS_KEYWORDS, absolute=True
        ),
    )


def _first_amount_after(
    lines: list[str],
    keywords: tuple[str, ...],
    *,
    absolute: bool = False,
) -> Optional[float]:
    """First amount printed after any keyword, on the first line that has one."""
    for line in lines:
        lowered = line.lower()
        for keyword in keywords:
            position = lowered.find(keyword)
            if position < 0:
                continue
            amounts = find_amounts(line[position + len(keyword) :])
            if amounts:
                value = amounts[0][1]
                return abs(value) if absolute else value
    return None


def reconcile(
    transactions: list[dict],
    totals: StatementTotals,
    *,
    credit_card: bool = False,
) -> tuple[Optional[bool], list[str]]:
    """Compare parsed transactions with the statement's own totals.

    Returns (reconciled, warnings). ``reconciled`` is None when the statement
    prints nothing to check against.
    """
    warnings: list[str] = []
    checked = False

    net = round(sum(tx["amount"] for tx in transactions), 2)
    if totals.beginning_balance is not None and totals.ending_balance is not None:
        checked = True
        # Card balances are money owed, so they move opposite to cash flow.
        expected_net = totals.ending_balance - totals.beginning_balance
        if credit_card:
            expected_net = -expected_net
        if abs(net - expected_net) > TOLERANCE:
            warnings.append(
                "Transactions don't add up to the statement balances: "
                f"beginning {_money(totals.beginning_balance)}, ending "
                f"{_money(totals.ending_balance)}, but parsed transactions net "
                f"{_money(net)} (off by {_money(abs(net - expected_net))}). "
                "Some rows may be missing or have the wrong sign."
            )

    if not credit_card:
        deposits = round(sum(tx["amount"] for tx in transactions if tx["amount"] > 0), 2)
        withdrawals = round(
            -sum(tx["amount"] for tx in transactions if tx["amount"] < 0), 2
        )
        if totals.total_deposits is not None:
            checked = True
            if abs(deposits - totals.total_deposits) > TOLERANCE:
                warnings.append(
                    f"Parsed deposits total {_money(deposits)}, but the statement "
                    f"shows {_money(totals.total_deposits)}. Check income rows "
                    "for missing entries or wrong signs."
                )
        if totals.total_withdrawals is not None:
            checked = True
            if abs(withdrawals - totals.total_withdrawals) > TOLERANCE:
                warnings.append(
                    f"Parsed withdrawals total {_money(withdrawals)}, but the "
                    f"statement shows {_money(totals.total_withdrawals)}. Check "
                    "expense rows for missing entries or wrong signs."
                )

    if not checked:
        return None, warnings
    return not warnings, warnings


def _money(value: float) -> str:
    sign = "-" if value < 0 else ""
    return f"{sign}${abs(value):,.2f}"
