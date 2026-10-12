# ADR: Adopt the Claude SDLC (bundle 1.3.0)

- Date: 2026-10-11
- Status: accepted
- Issue / PR: # (this PR)

## Context
Three parser fixes (#1–#3) shipped without CI, acceptance criteria or a reconciliation check against real layouts, and users still report missing transactions and wrong signs. Before fixing the remaining parser bugs we want every change to start from an approved plan, prove its criteria with tests, and pass the same Test step locally and in CI.

## Options
1. **Adopt the Claude SDLC as generated**: plans, AC-tagged tests, CI gates (`pr-size`, `conventions`, `secret-scan`, `runtime-checks`, `claude-review`), shared context in `docs/context/`.
2. **Keep the ad-hoc flow and add only a pytest workflow**: cheaper, but no plan or evidence gate and no browser check of the upload flow.

## Decision
Option 1, with these deviations from the reference setup:
- **One branch:** `main` is both the integration and production branch, and releases are tags.
- **No compose and no database** in the Test step: `main` has no database. Revisit when magic-link auth (Neon Postgres) merges.
- **No formatter**, to avoid a repo-wide reformat diff.
- **Python parser tests count for acceptance criteria:** `ac-coverage.mjs` also scans `parser/tests/test_*.py`. Coverage comes from pytest-cov lcov written to `parser/coverage/lcov.info`.
- **Test stack:** port **3100** in local-parser mode with no `OPENAI_API_KEY`, so tests never call Render or an AI provider.
- **Client-data guard:** `conventions.mjs` fails a PR that adds a PDF outside `parser/fixtures/synthetic/`, and `.gitignore` ignores `*.pdf`. Agents may still read PDFs locally (commit-only guard, by choice).
- **No approval rule** on `main` while there is a single maintainer.

## Consequences
- `scripts/sdlc/ac-coverage.mjs` and `conventions.mjs` carry project edits marked `PROJECT:`. `sdlc-update` will show a diff for them, so keep those edits when it does.
- The Test step needs `@playwright/test` installed, and `npx tsc --noEmit` type-checks `e2e/` and `playwright.config.ts`, so verify fails until Playwright is installed.
- CI runs `claude-review` on every PR. It needs the `ANTHROPIC_API_KEY` repo secret and sends diffs (never client data, per AGENTS.md) to Anthropic.
