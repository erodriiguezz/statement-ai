#!/usr/bin/env bash
# Fast checks (Build step). Run by the Stop hook and by /verify.
#   --changed   skip the web or parser checks when nothing in that half changed since the base branch
#   (no flag)   whole repo
# Base branch: $SDLC_BASE, else origin/<integrationBranch from .claude/sdlc.json>.
# PROJECT: Next.js app (ESLint + tsc) and the Python parser in parser/ (pytest).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

INTEGRATION_BRANCH="$(node -e 'try{process.stdout.write(require("./.claude/sdlc.json").integrationBranch||"main")}catch{process.stdout.write("main")}')"
BASE_REF="${SDLC_BASE:-origin/$INTEGRATION_BRANCH}"
PY="${PYTHON_PATH:-$([[ -x parser/.venv/bin/python ]] && echo "$PWD/parser/.venv/bin/python" || echo python3)}"

WEB=1; PARSER=1
if [[ "${1:-}" == "--changed" ]] && git rev-parse --verify -q "$BASE_REF" >/dev/null; then
  changed="$( { git diff --name-only "$(git merge-base HEAD "$BASE_REF")"; git ls-files --others --exclude-standard; } | sort -u)"
  echo "$changed" | grep -qvE '^parser/' || WEB=0
  echo "$changed" | grep -qE '^parser/' || PARSER=0
fi

fail=0
if [[ $WEB -eq 1 ]]; then
  echo "▶ lint"
  npm run --silent lint || fail=1
  echo "▶ typecheck"
  npx --no-install tsc --noEmit || fail=1
fi
if [[ $PARSER -eq 1 ]]; then
  echo "▶ parser tests"
  (cd parser && "$PY" -m pytest -q) || fail=1
fi

# Product-scope guardrail on uncommitted + committed changes vs base (same list as CI).
if git rev-parse --verify -q "$BASE_REF" >/dev/null; then
  # Optional project scope guardrail: .claude/sdlc.json → scopeGuardrail.keywords (regex alternatives).
  KW="$(node -e 'try{const k=require("./.claude/sdlc.json").scopeGuardrail?.keywords||[];process.stdout.write(k.join("|"))}catch{}')"
  if [[ -n "$KW" ]]; then
    added="$(git diff "$(git merge-base HEAD "$BASE_REF")" -- . ':(exclude).github/**' ':(exclude)docs/claude-sdlc/**' ':(exclude).claude/sdlc.json' | grep -E '^\+[^+]' || true)"
    if echo "$added" | grep -inE "$KW" >/dev/null; then
      echo "✖ scope guardrail: added lines match .claude/sdlc.json scopeGuardrail.keywords (see CLAUDE.md)"
      echo "$added" | grep -inE "$KW" | head -10
      fail=1
    fi
  fi
fi

if [[ $fail -eq 0 ]]; then echo "✔ verify green"; else echo "✖ verify failed"; fi
exit $fail
