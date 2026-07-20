from __future__ import annotations

from extract.normalize import (
    extract_statement_year,
    normalize_date,
    parse_amount,
    should_skip_line,
)


def test_parse_amount_parentheses_and_currency():
    assert parse_amount("($1,234.50)") == -1234.50
    assert parse_amount("$99.00") == 99.0
    assert parse_amount("1,000.00") == 1000.0


def test_normalize_short_date_uses_default_year():
    assert normalize_date("1/07", default_year=2025) == "2025-01-07"
    assert normalize_date("01/31/25") == "2025-01-31"


def test_extract_year_from_month_name_period():
    text = "January 01, 2025 through January 31, 2025"
    assert extract_statement_year(text) == 2025


def test_extract_year_from_statement_date():
    assert extract_statement_year("Statement Date: 01/31/25") == 2025


def test_skip_statement_page_false_positive():
    assert should_skip_line("Statement Date: 01/31/25 Page 1")
