---
version: 0.1.0
last_release: none
updated: 2026-10-11
---

# Product

Statement.AI turns bank and credit-card statement PDFs into a reviewed transaction list and a draft **IRS Schedule C** (profit or loss from business), exported as `.xlsx`.

**Users:** small-business owners or the staff preparing their Schedule C *(unconfirmed: the README SOP talks about "clients" and "staff and contractors", which suggests an accounting practice, while the UI addresses the business owner directly)*.

**Flow (3 steps in the UI):**
| Step | What happens |
| --- | --- |
| Upload | The user ticks consent, adds one or more PDFs, and the app parses them into transactions |
| Review | The user edits dates, descriptions, amounts and categories; parser reconciliation warnings are shown here |
| Results | A Schedule C draft (AI categorization when `OPENAI_API_KEY` is set, otherwise a local fallback) with an `.xlsx` download |

**Non-negotiable constraints (README SOP):**
- Explicit consent before upload.
- Zero retention: PDFs, extracted text and summaries are deleted right after processing, and nothing is stored long-term.
- Raw PDFs are never sent to AI services; only verified transaction text may go to an AI provider that guarantees no retention and no training.
- Authentication is required for all access and client data is isolated per user. *Not yet on `main`: magic-link auth is in progress (unconfirmed timeline).*

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-11 | Seeded by /sdlc-init |
