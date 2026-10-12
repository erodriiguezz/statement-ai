---
version: 0.1.0
last_release: none
updated: 2026-10-11
---

# Status

**As of 2026-10-11.** Releases are tags on `main` (none yet).

| Area | State |
| --- | --- |
| Parser fixes merged | #1 community-bank activity-in-date-order, #2 Republic Bank MoneyMGR, #3 income/expense sign inversion (`f99c791`) |
| Parser bugs found, not fixed | Running balance read as the amount when a row has amount + balance (generic and section-unsigned profiles); unsigned rows default to income when there are no section headers (e.g. a single Wells Fargo transaction table); page boilerplate (`member fdic`, `customer service`) ends a section and drops the rows after it; the year isn't found for "For the period … to …" wording, which drops all MM/DD rows; check rows ≥ $1,000 without a comma are dropped; totals printed as a summary table aren't read, so reconciliation is skipped |
| Production parser version | Unknown: Render `/health` doesn't report a commit. Users still report parsing problems *(unconfirmed whether Render runs `f99c791`)* |
| In progress | Magic-link auth (`feat/magic-link-auth`, not merged); Claude SDLC adoption (this change) |
| Tests | 45 parser pytest tests (synthetic fixtures); a Playwright smoke test of upload → review → draft is added by the SDLC adoption; `lib/schedule-c.test.ts` exists but no script runs it |

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-11 | Seeded by /sdlc-init |
