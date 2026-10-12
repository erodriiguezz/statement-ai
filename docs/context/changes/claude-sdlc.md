# claude-sdlc

- Issue / PR: # (sdlc adoption PR)
- Affects: architecture | status

## What changes in the shared context
- architecture.md: "CI: GitHub Actions — `pr-size`, `conventions` (incl. no PDFs outside `parser/fixtures/synthetic/`), `secret-scan`, `runtime-checks` (runs `scripts/sdlc/test.sh --ci`), `claude-review`."
- architecture.md: "Test step: lint, tsc, parser pytest with lcov coverage, `next build`, app on :3100 in local-parser mode without `OPENAI_API_KEY`, API smoke (`e2e/api-smoke.json`), Playwright smoke (`e2e/upload-flow.spec.ts`) using `parser/fixtures/synthetic/moneymgr_synthetic.pdf`."
- status.md: "Claude SDLC adopted (bundle 1.3.0); parser fixes now go through plan → build → test → ship."

## Decisions
- [2026-10-11-claude-sdlc.md](../decisions/2026-10-11-claude-sdlc.md)
