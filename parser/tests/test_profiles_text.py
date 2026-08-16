from __future__ import annotations

import json
from pathlib import Path

import pytest

from extract.bank import detect_bank
from extract.pipeline import parse_text
from tests.conftest import EXPECTED, TEXT_FIXTURES


def _strip_ids(transactions: list[dict]) -> list[dict]:
    return [
        {
            "date": tx["date"],
            "description": tx["description"],
            "amount": tx["amount"],
        }
        for tx in transactions
    ]


@pytest.mark.parametrize(
    "stem",
    [
        "wells_fargo",
        "citibank",
        "us_bank",
        "capital_one",
        "pnc",
        "truist",
        "td_bank",
        "td_bank_business",
        "generic_regional",
    ],
)
def test_synthetic_bank_profiles(stem: str):
    text_path = TEXT_FIXTURES / f"{stem}.txt"
    expected_path = EXPECTED / f"{stem}.json"
    assert text_path.exists(), text_path
    assert expected_path.exists(), expected_path

    text = text_path.read_text()
    expected = json.loads(expected_path.read_text())

    profile = detect_bank(text)
    assert profile.id == expected["profile_id"]

    transactions = parse_text(text)
    assert _strip_ids(transactions) == expected["transactions"]


def test_td_bank_checks_paid_dual_column():
    """TD's 'Checks Paid' table lists two checks per line; both must survive."""
    text = (TEXT_FIXTURES / "td_bank_business.txt").read_text()
    txs = parse_text(text)
    checks = {tx["description"]: tx["amount"] for tx in txs if tx["description"].startswith("Check #")}
    assert checks == {
        "Check #1001": -300.0,
        "Check #1002": -250.0,
        "Check #1003": -500.0,
        "Check #1004": -500.0,
    }


def test_td_bank_business_reconciles_to_statement_totals():
    """Debits/credits should match the statement's own Account Summary totals."""
    text = (TEXT_FIXTURES / "td_bank_business.txt").read_text()
    txs = parse_text(text)
    total_debits = round(sum(tx["amount"] for tx in txs if tx["amount"] < 0), 2)
    total_credits = round(sum(tx["amount"] for tx in txs if tx["amount"] > 0), 2)
    # Checks Paid 1,550.00 + Electronic Payments 300.00 + Other Withdrawals 100.00
    assert total_debits == -1950.0
    # Deposits 2,000.00 + Electronic Deposits 500.00 + Other Credits 50.00
    assert total_credits == 2550.0


def test_republic_style_multiline_and_signs():
    text = (TEXT_FIXTURES / "generic_regional.txt").read_text()
    txs = parse_text(text)
    assert len(txs) == 4
    assert txs[0]["amount"] < 0
    assert any(tx["amount"] > 0 for tx in txs)
    # Balance summary dates must not become transactions
    assert all(not tx["description"].lower().startswith("balance") for tx in txs)
