#!/usr/bin/env python3
"""Generate the synthetic statement PDF used by the e2e upload test.

Everything in it is invented: business, account number, payees and amounts.
Real client statements must never be committed (README SOP); the conventions
check only allows PDFs under this folder.

    parser/.venv/bin/python parser/fixtures/synthetic/make_pdf.py
"""

from __future__ import annotations

from pathlib import Path

import pymupdf

OUT = Path(__file__).with_name("moneymgr_synthetic.pdf")

# Beginning 1,000.00 + deposits 2,750.00 - withdrawals 1,312.40 = ending 2,437.60
LINES = [
    "Page: 1 of 1",
    "Statement Date: 03/01/2025 thru 03/31/2025",
    "Primary Account: ****0000",
    "EXAMPLE WIDGETS LLC",
    "Summary of Account(s)",
    "Account Type Beginning Balance Deposits Interest Paid* Withdrawals Fees Ending Balance",
    "****0000 CK $1,000.00 $2,750.00 $0.00 $1,312.40 $0.00 $2,437.60",
    "Account Details MoneyMGR Free Business ****0000",
    "Deposits",
    "Date Description Amount",
    "03/03/2025 Deposit Internet Transfer from XXXX0001 $1,500.00",
    "03/14/2025 Descriptive Deposit Business Mobile Deposit $1,250.00",
    "Withdrawals",
    "Date Description Amount",
    "03/05/2025 External Withdrawal ACME OFFICE SUPPLY - PAYMENT -$212.40",
    "03/10/2025 Check 101 -$600.00",
    "03/20/2025 Point Of Sale Withdrawal EXAMPLE SOFTWARE CO -$500.00",
]


def main() -> None:
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    y = 60
    for line in LINES:
        page.insert_text((40, y), line, fontname="helv", fontsize=9)
        y += 16
    doc.save(str(OUT), garbage=4, deflate=True)
    doc.close()
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
