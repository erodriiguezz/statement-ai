---
version: 0.1.0
last_release: none
updated: 2026-10-11
---

# Domain

| Term | Meaning |
| --- | --- |
| Transaction | `{ id, date (YYYY-MM-DD), description, amount, category? }` (`lib/types.ts`) |
| Amount sign | Cash flow: **negative = money out**, positive = money in, on bank and card statements alike |
| Layout profile | Per-bank parsing rules in `parser/extract/profiles.py`: match keywords, debit/credit/ignore/checks section headers, amount mode, date rules |
| Amount mode | `section_unsigned` (sign from the section header), `signed` (sign printed on the amount), `debit_credit_columns`, `amount_balance_columns` (first amount is the transaction, last is the running balance) |
| Section | The statement block a row sits in (debit, credit, checks, ignore, neutral); it decides the sign of unsigned amounts |
| Reconciliation | Comparing parsed rows with the statement's printed beginning/ending balance and total deposits/withdrawals; mismatches are user-facing warnings, not errors |
| Credit card statement | Detected by "minimum payment" plus a card keyword; card charges print positive and payments negative, so signs are flipped to cash flow |
| Schedule C line | IRS Schedule C line a transaction is categorized to (`lib/schedule-c-lines.ts`), or `exclude` |

**Supported layouts:**
- Bank profiles: Chase, Bank of America, Wells Fargo, Citibank, U.S. Bank, Capital One, PNC, Truist, TD Bank, Republic Bank (MoneyMGR).
- Community-bank "Activity in Date Order" statements.
- A generic fallback for everything else.
- Fixtures: `parser/fixtures/text/*.txt` paired with `parser/fixtures/expected/*.json`. All of them are synthetic.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-11 | Seeded by /sdlc-init |
