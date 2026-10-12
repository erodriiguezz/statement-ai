#!/usr/bin/env bash
# Context refresh (Define step, and every SessionStart).
# Fetches, fast-forwards the integration branch, and prints what other developers
# merged since this branch last synced, so Claude re-reads what changed.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
INTEGRATION_BRANCH="$(node -e 'try{process.stdout.write(require("./.claude/sdlc.json").integrationBranch||"develop")}catch{process.stdout.write("develop")}')"
INTEGRATION="${SDLC_INTEGRATION_BRANCH:-$INTEGRATION_BRANCH}"
quiet=""; [[ "${1:-}" == "--quiet-fetch" ]] && quiet="-q"

git fetch $quiet --prune origin 2>/dev/null || echo "(fetch failed — working from the last fetched state)"

cur="$(git rev-parse --abbrev-ref HEAD)"
base="$(git merge-base HEAD "origin/$INTEGRATION" 2>/dev/null || true)"
echo "## Context refresh — branch $cur vs origin/$INTEGRATION"

if [[ -z "$base" ]]; then echo "No common base with origin/$INTEGRATION."; exit 0; fi

behind="$(git rev-list --count HEAD..origin/"$INTEGRATION")"
echo "- $behind commit(s) landed on $INTEGRATION since this branch's base."
if [[ "$behind" -gt 0 ]]; then
  echo "- Merged since then:"
  git log --oneline --no-merges "$base..origin/$INTEGRATION" | head -15 | sed 's/^/  - /'
  changed_ctx="$(git diff --name-only "$base" "origin/$INTEGRATION" -- CLAUDE.md AGENTS.md docs/context .claude | head -30)"
  if [[ -n "$changed_ctx" ]]; then
    echo "- Shared context changed — re-read these before planning:"
    echo "$changed_ctx" | sed 's/^/  - /'
  fi
  mine="$(git diff --name-only "$base" HEAD)"
  theirs="$(git diff --name-only "$base" "origin/$INTEGRATION")"
  overlap="$(comm -12 <(echo "$mine" | sort -u) <(echo "$theirs" | sort -u) | head -20)"
  [[ -n "$overlap" ]] && { echo "- Files changed on both sides (likely conflicts):"; echo "$overlap" | sed 's/^/  - /'; }
  echo "- Suggested: git merge origin/$INTEGRATION (or gh stack sync on a stack) before building."
fi

if command -v gh >/dev/null 2>&1; then
  open_prs="$(gh pr list --state open --json number,title,files --limit 30 2>/dev/null || true)"
  if [[ -n "$open_prs" && -n "$(git diff --name-only "$base" HEAD)" ]]; then
    node -e '
      const prs = JSON.parse(process.argv[1] || "[]"); const mine = new Set(process.argv[2].split("\n").filter(Boolean));
      const hits = prs.map(p => ({ p, f: (p.files||[]).map(x=>x.path).filter(x=>mine.has(x)) })).filter(x=>x.f.length);
      if (hits.length) { console.log("- Open PRs touching the same files:"); for (const {p,f} of hits) console.log(`  - #${p.number} ${p.title} (${f.slice(0,3).join(", ")})`); }
    ' "$open_prs" "$(git diff --name-only "$base" HEAD)" 2>/dev/null || true
  fi
fi

pending="$(ls docs/context/changes/*.md 2>/dev/null | grep -v -e README -e TEMPLATE | wc -l | tr -d ' ')"
[[ "$pending" -gt 0 ]] && echo "- $pending unreleased context fragment(s) in docs/context/changes/ — read them for recent decisions."
exit 0
