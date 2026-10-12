# AGENTS.md — statement-ai

Next.js app that parses bank-statement PDFs (Python parser in `parser/`), lets the user review transactions and drafts a Schedule C. See `docs/context/` for product, architecture and domain.

<!-- claude-sdlc:start (bundle 1.3.0) -->
## Delivery process (any agent or human)

This repo follows the Claude SDLC. The rules below are portable: any coding agent or person must follow them, and CI enforces them (`conventions`, `secret-scan`, `pr-size`, `runtime-checks`, `claude-review`). Claude Code adds local hooks on top, but those are a convenience, not the control point. Setup and details: [docs/claude-sdlc/SETUP.md](docs/claude-sdlc/SETUP.md).

- **Branches:** integration and production are both `main` (releases are tags). Work branches are `<type>/<short-description>` (feat, bugfix, hotfix, chore, refactor; kebab-case, 3-5 words). Never commit to or force-push the integration or production branch.
- **Commits and PR titles:** `type: description` (feat, fix, chore, refactor, docs, style, test, perf, ci, build), lowercase imperative, ≤ 72 characters, no period. No AI attribution in commits or PRs.
- **Plan first:** behavior changes start from a plan in `.claude/plans/<issue>-<short-description>.md` (template: the bundle's `plan.md`). A human approves its Approval summary before code is written. Tickets: GitHub Issues.
- **Tests prove criteria:** every acceptance criterion `AC-<issue>.N` has a test carrying its ID. API changes add their `e2e/api-smoke.json` entries before the implementation. Never skip, mute or weaken a check to go green.
- **Checks:** fast checks `./scripts/sdlc/verify.sh`; full Test step `./scripts/sdlc/test.sh` (ESLint, tsc, parser pytest with coverage, `next build`, the app on :3100 in local-parser mode, API smoke and Playwright). Ask a human before starting the local stack.
- **PR size:** ≤ 400 counted lines and one purpose per PR. Bigger work is a stack of phases on a feature branch.
- **Evidence:** every shipped change has `docs/evidence/<issue>.json` (`node scripts/sdlc/evidence.mjs`).
- **Shared context:** read `docs/context/` (including `lessons.md`) before planning. On feature branches never edit `docs/context/*.md`; add a fragment in `docs/context/changes/`.
- **Secrets:** never read, print or commit `.env*` (except `.env.example`), keys, credentials or tokens.
- **Process changes:** agents propose them in a `process` PR; they never change these rules, CI or hooks on their own.
**This project (statement-ai):**
- **Client data (README SOP — zero retention):** never commit, paste into tickets/PRs, or send to an AI service a real client statement or text extracted from one. PDFs may only be committed under `parser/fixtures/synthetic/` (CI `conventions` enforces it); fixtures are invented or fully redacted. Raw PDFs are parsed locally or on the parser server, never sent to an AI provider.
- **Sign convention:** transaction `amount` is cash flow — negative is money out, positive is money in — on bank and card statements alike.
- **Parser changes:** every existing fixture in `parser/fixtures/expected/` must produce identical output unless the approved plan lists the expected change for that fixture. New layouts get a synthetic text fixture plus expected JSON.
- **Two halves, two deploys:** the Next.js app deploys to Vercel and the parser (`parser/`, Docker) to Render; a parser fix is only live after the Render service redeploys.
- **AI categorization is optional:** without `OPENAI_API_KEY` the Schedule C draft uses the local fallback; tests run that way and must not depend on an AI provider.
<!-- claude-sdlc:end -->
