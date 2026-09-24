"""Regression tests for income/expense sign resolution and related misreads.

Each case reproduces a statement shape that used to flip an expense into
income (or the reverse), drop a real transaction, or misdate one.
"""

from __future__ import annotations

from extract.pipeline import parse_text
from extract.profiles import (
    BANK_OF_AMERICA,
    CAPITAL_ONE,
    CITIBANK,
    GENERIC,
    REPUBLIC_BANK,
)
from extract.reconcile import (
    StatementTotals,
    extract_statement_totals,
    is_credit_card_statement,
    reconcile,
)
from extract.text import detect_section

PERIOD = "Statement Period: 01/01/2025 - 01/31/2025\n"


def _amounts(transactions: list[dict]) -> dict[str, float]:
    return {tx["description"]: tx["amount"] for tx in transactions}


def test_unlisted_debit_header_ends_credit_section():
    text = (
        PERIOD
        + "Deposits and Credits\n01/05 CLIENT PAYMENT 500.00\n"
        + "ATM & Debit Card Withdrawals\n01/07 HOME DEPOT 42.10\n"
    )
    assert _amounts(parse_text(text, profile=GENERIC)) == {
        "CLIENT PAYMENT": 500.0,
        "HOME DEPOT": -42.1,
    }


def test_payments_and_credits_header_is_credit():
    assert detect_section("Payments and Credits", CAPITAL_ONE) == "credit"


def test_dated_row_with_header_words_is_a_transaction():
    text = (
        PERIOD
        + "Withdrawals and Debits\n"
        + "01/06 ATM WITHDRAWALS FEE REFUND 3.00\n01/09 CARD PURCHASES ADJ 10.00\n"
    )
    assert _amounts(parse_text(text, profile=GENERIC)) == {
        "ATM WITHDRAWALS FEE REFUND": -3.0,
        "CARD PURCHASES ADJ": -10.0,
    }


def test_summary_row_with_amount_does_not_switch_section():
    assert detect_section("Deposits and other credits 5 1,234.00", GENERIC) is None


def test_citi_empty_debit_cell_uses_section_sign():
    text = PERIOD + "DEPOSITS\n01/05 CLIENT PAYMENT 500.00 1,500.00\n"
    assert _amounts(parse_text(text, profile=CITIBANK)) == {"CLIENT PAYMENT": 500.0}


def test_running_balance_signs_neutral_rows():
    text = (
        PERIOD
        + "Beginning balance on 01/01/2025 1,000.00\n"
        + "01/05 CLIENT PAYMENT 500.00 1,500.00\n"
        + "01/07 HOME DEPOT 42.10 1,457.90\n"
    )
    assert _amounts(parse_text(text, profile=BANK_OF_AMERICA)) == {
        "CLIENT PAYMENT": 500.0,
        "HOME DEPOT": -42.1,
    }


def test_printed_minus_wins_over_credit_section():
    text = PERIOD + "Deposits\n01/05 CLIENT 500.00\n01/07 HOME DEPOT -$42.10\n"
    assert _amounts(parse_text(text, profile=REPUBLIC_BANK))["HOME DEPOT"] == -42.1


def test_trailing_minus_wins_over_credit_section():
    text = PERIOD + "Deposits and Credits\n01/07 HOME DEPOT 42.10-\n"
    assert _amounts(parse_text(text, profile=GENERIC)) == {"HOME DEPOT": -42.1}


def test_spaced_dash_is_not_a_minus_sign():
    text = PERIOD + "Deposits and Credits\n01/05 ACH CLIENT - 500.00\n"
    assert _amounts(parse_text(text, profile=GENERIC)) == {"ACH CLIENT": 500.0}


CARD_STATEMENT = (
    "Statement Closing Date 01/31/2025\n"
    "Minimum Payment Due $35.00\nPayment Due Date 02/25/2025\n"
    "Previous Balance $300.00\nNew Balance $17.10\n"
    "Transactions\n"
    "01/07 HOME DEPOT 42.10\n"
    "01/09 PAYMENT THANK YOU -300.00\n"
    "01/12 REFUND OFFICE DEPOT 20.00 CR\n"
    "Payments and Credits\n"
    "01/15 LOYALTY REWARD 5.00\n"
)


def test_credit_card_charges_are_expenses_and_payments_are_credits():
    assert is_credit_card_statement(CARD_STATEMENT)
    assert _amounts(parse_text(CARD_STATEMENT, profile=GENERIC)) == {
        "HOME DEPOT": -42.1,
        "PAYMENT THANK YOU": 300.0,
        "REFUND OFFICE DEPOT": 20.0,
        "LOYALTY REWARD": 5.0,
    }


def test_bank_statement_is_not_credit_card():
    text = PERIOD + "Overdraft line of credit\nAvailable credit $500.00\n"
    assert not is_credit_card_statement(text)


def test_year_rollover_for_december_rows_on_january_statement():
    text = (
        "Statement Period: 12/15/2024 - 01/14/2025\n"
        + "Deposits and Credits\n12/20 CLIENT A 1,000.00\n01/03 CLIENT B 200.00\n"
    )
    dates = {tx["description"]: tx["date"] for tx in parse_text(text, profile=GENERIC)}
    assert dates == {"CLIENT A": "2024-12-20", "CLIENT B": "2025-01-03"}


def test_late_posting_after_period_end_keeps_period_year():
    text = PERIOD + "Deposits and Credits\n02/01 CLIENT 10.00\n"
    assert parse_text(text, profile=GENERIC)[0]["date"] == "2025-02-01"


def test_dated_interest_and_service_charge_rows_are_kept():
    text = (
        PERIOD
        + "Deposits and Credits\n01/31 INTEREST PAID 1.25\n"
        + "Withdrawals and Debits\n01/31 MONTHLY SERVICE CHARGES 15.00\n"
    )
    assert _amounts(parse_text(text, profile=GENERIC)) == {
        "INTEREST PAID": 1.25,
        "MONTHLY SERVICE CHARGES": -15.0,
    }


def test_undated_interest_summary_row_is_still_skipped():
    text = PERIOD + "Deposits and Credits\nInterest Paid 1.25\n01/05 CLIENT 10.00\n"
    assert _amounts(parse_text(text, profile=GENERIC)) == {"CLIENT": 10.0}


def test_reconcile_flags_flipped_row():
    totals = StatementTotals(
        beginning_balance=1000.0,
        ending_balance=1457.90,
        total_deposits=500.0,
        total_withdrawals=42.10,
    )
    flipped = [{"amount": 500.0}, {"amount": 42.10}]
    reconciled, warnings = reconcile(flipped, totals)
    assert reconciled is False
    assert len(warnings) == 3

    correct = [{"amount": 500.0}, {"amount": -42.10}]
    assert reconcile(correct, totals) == (True, [])


def test_reconcile_without_printed_totals_is_unknown():
    assert reconcile([{"amount": 1.0}], StatementTotals()) == (None, [])


def test_reconcile_credit_card_balance_moves_opposite_cash_flow():
    # 300.00 owed + 42.10 charge - 300.00 payment - 20.00 refund - 5.00 credit
    txs = parse_text(CARD_STATEMENT, profile=GENERIC)
    totals = extract_statement_totals(CARD_STATEMENT)
    assert (totals.beginning_balance, totals.ending_balance) == (300.0, 17.10)
    assert reconcile(txs, totals, credit_card=True) == (True, [])
