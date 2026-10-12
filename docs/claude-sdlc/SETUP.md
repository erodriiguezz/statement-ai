# Claude SDLC — setup guide (statement-ai)

How this project ships with AI agents. Problems and feedback become intents. A plan is approved from one screen. Agents build tests-first, and evidence comes out of the work. A tech-lead review ends in a 2-minute human approval. Each release measures the pipeline and proposes its own improvements.

```
Observe ─▶ Define ─▶ Plan ─▶ Build ─▶ Test ─▶ Ship ─▶ Review ─▶ Merge ─▶ Release ─▶ Learn ─┐
"triage    (intent)  "plan    "build   "test   "ship   CI +      2-min    "cut a     lessons │
feedback"            issue N" it"      it"     it"     claude-   read     release"   + metrics│
   ▲                                                   review                                 │
   └──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Where things live

| Level | What | Where |
| --- | --- | --- |
| Any agent or human | Process rules (portable) | `AGENTS.md` (Claude Code reads it through `@AGENTS.md` in `CLAUDE.md`) |
| Each developer | Skills you trigger by talking (plan, build, test, ship, release, context, triage, verify), `/whatchanged`, subagents, local hooks | `~/.claude` (Claude SDLC bundle) |
| This project | Settings, token estimates, required checks | `.claude/sdlc.json`, `.claude/settings.json` |
| This project | Test step and CI scripts | `scripts/sdlc/`, `e2e/`, `compose.test.yml`, `playwright.config.ts` |
| This project | GitHub (the control point) | `.github/workflows/` (conventions + secret-scan, pr-size, claude-review, claude-on-demand, release), `.github/sdlc/tech-lead-review/`, PR template |
| This project | Plans, evidence, memory | `.claude/plans/`, `docs/evidence/`, `docs/context/` (product, architecture, domain, status, lessons, decisions, journal, changes), `docs/releases/` |

Local hooks only act in projects that have `.claude/sdlc.json`. CI enforces the same rules for everyone, whatever agent or editor they use.

## One-time setup

**1. Each developer installs the bundle** (once per machine): clone the bundle repo, then `./install.sh`. Check with `/hooks` in Claude Code.

**2. Install project tools.**
```bash
npm ci
npx playwright install chromium
python3 -m venv parser/.venv && parser/.venv/bin/pip install -r parser/requirements.txt pytest-cov
gh extension install github/gh-stack      # gh 2.90.0+, for stacked PRs
```

**3. GitHub settings (repo admin).**
- Secret `ANTHROPIC_API_KEY`; optional variable `STAGING_WEB_URL` for "before" screenshots.
- Actions → General → Workflow permissions: **Read and write** (report images go to the `review-assets` branch).
- Rulesets for `main` and `feat/**`: require a PR, conversation resolution, no force pushes, and these checks: `pr-size`, `conventions`, `secret-scan`, `runtime-checks`, `claude-review`. No approval rule while there is a single maintainer (GitHub doesn't let you approve your own PR); add one when a second reviewer joins. Make `runtime-checks` and `claude-review` required after they pass on a few PRs.
- `.github/CODEOWNERS`: set the owner and enable "Require review from Code Owners". Owners also feed the impact set in plans and triage.
- Labels: `bug`, `incident`, `support`, `feedback` (triage inputs), `triaged`, `process`.

**4. First run:** run `./scripts/sdlc/test.sh --no-stack`, then `./scripts/sdlc/test.sh`.

## Daily flow

| Step | You say | Gate |
| --- | --- | --- |
| Observe → Define | "triage feedback": ranked clusters of bugs and support signals → issues with a drafted Intent | You pick which clusters become issues |
| Plan | "plan issue 47": refreshes context, reads lessons, asks you once, writes one plan file | You approve its **Approval summary** (≤ 25 lines) |
| Build | "build it": the developer agent writes tests first, then code; the main session reviews as tech lead | Fast checks green (loop breaker hands off if stuck) |
| Test → Iterate | "test it" | Every check green, every criterion covered |
| Ship | "ship it": evidence gate, reviewer pass, Evidence + Retro in the plan, `docs/evidence/<issue>.json`, draft PR | Plan approved, report green for HEAD, criteria covered |
| Review | CI: conventions, secret scan, size, runtime checks, three-page claude-review | Required checks |
| Merge | 2-minute read: page 3 verdict → summary + Before merging → page 2 if risk ≥ Medium | Your approval |
| Release | "cut a release": changelog, PM updates, journal with scorecard, **delivery metrics**, lessons → `process` proposals | Release PR approval |

Cost (tokens, tool calls) is **measured, never capped**: agents must not skip steps to save tokens. The plan's Evidence shows estimate vs actual, and the journal calibrates future estimates.

Big features (over 400 lines) go on `feat/<short-description>` as a `gh stack` of phases; the feature branch merges to `main` as a `feature-release` PR, where Claude also walks the Foot Traffic Review in a real browser.

API changes are **contract-first**: the plan's Spec holds the contract diff and impacted consumers. Smoke entries in `e2e/api-smoke.json` (and a mock, if there's an OpenAPI spec) come before the code.

## Labels

`size-exception` (one PR over 400 lines, say why) · `feature-release` (feature branch → integration branch; integration review + browser walk) · `review-override` (pass despite blocking findings; give the reason) · `no-plan` (skip acceptance-criteria check) · `process` (proposed process change from lessons; a human approves) · `triaged` (issue drafted by triage). `@claude fix F1` in a PR comment pushes a fix (max 2 per PR).

## Keeping it current

"update context from <branch / PR / folder / URL / notes>", "refresh context" or "initiate context" keep `docs/context/` honest. "update the sdlc" regenerates the files listed under `generated` in `.claude/sdlc.json` from the installed bundle, shows a diff per file and keeps project customizations. `/whatchanged` gives a one-screen catch-up.
