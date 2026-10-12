---
version: 0.1.0
last_release: none
updated: 2026-10-11
---

# Architecture

| Part | Tech | Where it runs |
| --- | --- | --- |
| Web app | Next.js 16 (App Router, React 19, Tailwind 4), TypeScript | Vercel (`vercel.json`: `/api/parse` maxDuration 120 s) |
| Parser service | Python 3.12, FastAPI (`parser/server.py`), pdfplumber + PyMuPDF, Tesseract OCR | Render free tier, Docker (`render.yaml`, `parser/Dockerfile`) |
| AI categorization | OpenAI, optional (`lib/schedule-c.ts`) | External; skipped when `OPENAI_API_KEY` is unset |

**Request flow:**
1. `components/steps/UploadStep.tsx` posts the PDFs to `POST /api/parse`.
2. `lib/parse-pdf.ts` either:
   - calls the Render service (`PARSER_SERVICE_URL` + `PARSER_API_KEY`; wakes it via `/health`, retries 502/503/504, 120 s timeout), or
   - when `PARSER_SERVICE_URL` is unset, spawns `python3 parser/parse_statement.py` locally (`PYTHON_PATH` overrides the interpreter).
3. It returns `{ transactions, warnings }`.
4. Review edits happen client-side. `POST /api/analyze` validates the transactions and builds the Schedule C (`lib/analyze.ts` → `lib/schedule-c.ts`). `lib/export-schedule-c.ts` writes the `.xlsx` in the browser.
5. `GET /api/parser-health` reports the parser mode and the Render `/health` result.

**Parser pipeline (`parser/extract/`):**
1. `detect.py` chooses a text layer per page, falling back to PyMuPDF for "shattered" fixed-pitch text.
2. `ocr.py` handles sparse pages.
3. `bank.py` picks a layout profile by keyword (`profiles.py`).
4. `text.py` runs a section-aware line parser.
5. `normalize.py` holds the date, amount and skip rules.
6. `reconcile.py` checks the parsed rows against the statement's printed totals and turns mismatches into warnings.

**State:** none persisted. Temporary files are deleted after parsing. There's no database on `main` (the magic-link work adds Neon Postgres + Drizzle + better-auth + Resend; *unconfirmed until merged*).

**Deploys:** the Vercel app and the Render parser deploy separately; Render auto-deploy settings are not in the repo *(unconfirmed)*.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-11 | Seeded by /sdlc-init |
