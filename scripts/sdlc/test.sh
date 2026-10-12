#!/usr/bin/env bash
# The Test step: Build → TEST → Iterate → Ship.
# Brings up the local stack, runs the full suite, checks acceptance-criteria coverage,
# and writes .claude/test-report.json for the current commit. /ship refuses without it.
#
#   ./scripts/sdlc/test.sh            local run
#   ./scripts/sdlc/test.sh --ci       CI run (no prompts; missing Playwright is a failure)
#   ./scripts/sdlc/test.sh --keep     leave the stack running afterwards
#   ./scripts/sdlc/test.sh --no-stack lint/typecheck/tests/build + coverage only
#   ./scripts/sdlc/test.sh --stop     stop a stack left running by --keep
#
# PROJECT: Next.js app + Python parser (parser/). No database. The app runs in local-parser mode
# (PARSER_SERVICE_URL empty → spawns parser/parse_statement.py) and with no OPENAI_API_KEY, so the
# Schedule C draft uses the deterministic fallback and nothing is sent to an external service.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
CI_MODE=0; KEEP=0; STACK=1
STOP=0
for a in "$@"; do case "$a" in --ci) CI_MODE=1;; --keep) KEEP=1;; --no-stack) STACK=0;; --stop) STOP=1;; esac; done

INTEGRATION_BRANCH="$(node -e 'try{process.stdout.write(require("./.claude/sdlc.json").integrationBranch||"main")}catch{process.stdout.write("main")}')"
BASE_REF="${SDLC_BASE:-origin/$INTEGRATION_BRANCH}"
BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || git rev-parse HEAD~1)"
BRANCH="${SDLC_BRANCH:-${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}}"
ART=".claude/artifacts"; mkdir -p "$ART"
# PROJECT: test web port (kept off 3000 so it never collides with `npm run dev`) and parser Python.
export SDLC_WEB_PORT="${SDLC_WEB_PORT:-3100}"
export E2E_BASE_URL="http://localhost:${SDLC_WEB_PORT}"
PY="${PYTHON_PATH:-$([[ -x parser/.venv/bin/python ]] && echo "$ROOT/parser/.venv/bin/python" || echo python3)}"
LOCK="${TMPDIR:-/tmp}/statement-ai-test-stack.lock"

# bash 3.2 compatible (macOS): results kept as "key=value" lines, no associative arrays.
RESULTS=""
fail=0
step() { echo; echo "━━ $1"; }
record() { RESULTS="${RESULTS}$1=$2"$'\n'; [[ "$2" == "fail" ]] && fail=1; return 0; }
result() { printf '%s' "$RESULTS" | grep "^$1=" | tail -1 | cut -d= -f2; }

stop_stack() {
  [[ -f "$ART/stack.pid" ]] && { pkill -P "$(cat "$ART/stack.pid")" 2>/dev/null; kill "$(cat "$ART/stack.pid")" 2>/dev/null; rm -f "$ART/stack.pid"; }
  rmdir "$LOCK" 2>/dev/null
}
if [[ $STOP -eq 1 ]]; then stop_stack; echo "stack stopped"; exit 0; fi

# 1. Lint, typecheck, parser tests (with lcov coverage for diff coverage).
step "1/7 lint + typecheck + parser tests"
unit=pass
npm run --silent lint || unit=fail
npx --no-install tsc --noEmit || unit=fail
mkdir -p parser/coverage
if "$PY" -c 'import pytest_cov' 2>/dev/null; then
  (cd parser && "$PY" -m pytest -q --cov=extract --cov-report=lcov:coverage/lcov.info) || unit=fail
  record coverage pass
else
  echo "pytest-cov not installed for $PY — running without coverage (pip install pytest-cov)"
  (cd parser && "$PY" -m pytest -q) || unit=fail
  [[ $CI_MODE -eq 1 ]] && record coverage fail || record coverage warn
fi
record unit "$unit"

# 2. Production build of the web app.
step "2/7 next build"
npm run --silent build >"$ART/build.log" 2>&1 && record build pass || { record build fail; tail -40 "$ART/build.log"; }

cleanup() {
  [[ $KEEP -eq 1 ]] && { echo "Stack left running on $E2E_BASE_URL (--keep). Stop: ./scripts/sdlc/test.sh --stop"; return; }
  stop_stack
}

if [[ $STACK -eq 1 && "$(result build)" == "pass" ]]; then
  # The web port is fixed, so only one worktree can run the stack at a time.
  if ! mkdir "$LOCK" 2>/dev/null; then
    echo "Another worktree is running the test stack. Wait for it, or remove $LOCK if stale."; exit 1
  fi
  trap cleanup EXIT

  step "3/7 local stack up (web :$SDLC_WEB_PORT, local parser via $PY)"
  # Empty values win over .env.local (Next never overrides variables already set).
  PARSER_SERVICE_URL= PARSER_API_KEY= OPENAI_API_KEY= PYTHON_PATH="$PY" \
    npx --no-install next start -p "$SDLC_WEB_PORT" >"$ART/stack.log" 2>&1 &
  echo $! > "$ART/stack.pid"
  ready=0
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "$E2E_BASE_URL/" 2>/dev/null && { ready=1; break; }
    sleep 1
  done
  if [[ $ready -eq 1 ]]; then record stack pass; else record stack fail; echo "Stack did not come up. Last log lines:"; tail -60 "$ART/stack.log"; fi

  if [[ $ready -eq 1 ]]; then
    # PROJECT: API checks live in e2e/api-smoke.json (URLs assume the default port 3100); browser tests in e2e/.
    step "4/7 API smoke (e2e/api-smoke.json)"
    node scripts/sdlc/api-smoke.mjs && record api pass || record api fail

    step "5/7 Playwright end-to-end"
    if [[ -x node_modules/.bin/playwright ]]; then
      npx --no-install playwright test && record e2e pass || record e2e fail
    else
      echo "Playwright not installed (see docs/claude-sdlc/SETUP.md)"; [[ $CI_MODE -eq 1 ]] && record e2e fail || record e2e skipped
    fi

    # PROJECT: frontend paths that trigger screenshots.
    if git diff --name-only "$BASE" | grep -qE '^(app|components)/'; then
      node scripts/sdlc/screenshots.mjs >/dev/null 2>&1 && record screenshots pass || record screenshots warn
    fi
  fi
elif [[ $STACK -eq 1 ]]; then
  record stack fail; echo "Skipping the stack: build failed."
else
  record stack skipped
fi

step "6/7 acceptance-criteria coverage"
node scripts/sdlc/ac-coverage.mjs && record ac pass || record ac fail

step "7/7 diff coverage"
node scripts/sdlc/diff-coverage.mjs "$BASE"; rc=$?
[[ $rc -eq 0 ]] && record diffcov pass || { [[ $rc -eq 3 ]] && record diffcov warn || record diffcov fail; }

# Report for /ship and the tech-lead review.
node -e '
  const fs = require("fs");
  const [commit, branch, failed, ...pairs] = process.argv.slice(1);
  const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
  const steps = Object.fromEntries(pairs.map((p) => p.split("=")));
  const report = { commit, branch, at: new Date().toISOString(), passed: failed === "0", steps,
    acceptanceCriteria: read(".claude/artifacts/ac-coverage.json"), diffCoverage: read(".claude/artifacts/diff-coverage.json"),
    api: read(".claude/artifacts/api-smoke.json") };
  fs.writeFileSync(".claude/test-report.json", JSON.stringify(report, null, 2));
 ' "$(git rev-parse HEAD)" "$BRANCH" "$fail" $RESULTS

echo; echo "━━ summary"; for k in unit coverage build stack api e2e screenshots ac diffcov; do v="$(result $k)"; [[ -n "$v" ]] && printf '  %-12s %s\n' "$k" "$v"; done
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "  note: uncommitted changes — commit, then re-run so the report matches HEAD."
fi
# Count the run for the plan's Actuals / journal scorecard (local runs only).
[[ $CI_MODE -eq 0 && -f "$HOME/.claude/sdlc/bin/budget.mjs" ]] && node "$HOME/.claude/sdlc/bin/budget.mjs" test-run "$([[ $fail -eq 0 ]] && echo pass || echo fail)" >/dev/null 2>&1
[[ $fail -eq 0 ]] && echo "✔ Test step passed" || echo "✖ Test step failed — iterate and re-run"
exit $fail
