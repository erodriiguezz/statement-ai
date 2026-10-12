---
name: tech-lead-review
description: Technical-lead review of a pull request in three phases (Map, Analyze, Narrate) that produces a three-page review report and a verdict. Used by the claude-review workflow; can also be run locally on a branch.
---

# Tech-lead review

The review judges a PR the way a technical lead would. The Test step already proved it works, and CI re-ran the same checks, so you **don't hunt for failing tests**. You judge scope, design, risk and test quality, and you make the merge decision fast for a human.

Inputs: the PR diff, the plan (`.claude/plans/<issue>-*.md`), `review/test-report.json` (from the runtime-checks job), `review/foot-traffic.md` (feature release PRs), screenshots index (`review/screenshots/index.json`), CLAUDE.md, `docs/context/`, ADRs in `docs/context/decisions/`.

CI runs a vendored copy of this skill from `.github/sdlc/tech-lead-review/`; "update the sdlc" (`sdlc-update`) refreshes it.

## Phase 1 · Map — "What changed?" (Sonnet)

Group changed files into 2–6 logical clusters. Write `review/clusters.json`:

```json
{
  "pr": { "number": 0, "title": "", "author": "", "files": 0, "added": 0, "removed": 0, "stack": { "position": 2, "of": 4 } },
  "atAGlance": "2-3 plain sentences",
  "clusters": [
    { "id": "A", "name": "Rate-limit core", "files": ["src/…"], "added": 120, "removed": 0, "newSymbols": ["loginRateLimiter"], "sharedWith": ["services/…/sessionService.ts"] }
  ],
  "graph": "mermaid flowchart LR source: changed files, their calls, unchanged neighbours marked :::unchanged, indirectly affected marked :::affected"
}
```

## Phase 2 · Analyze — "Why does it matter?" (Opus)

Read `clusters.json` and only the code it points to. Judge, as the technical lead:

1. **Right problem** — matches the issue and plan; flag scope creep.
2. **Right design** — fits architecture, ADRs and every rule in the project's CLAUDE.md (security, scope and compliance rules first).
3. **Right risk** — security, reliability, performance, blast radius.
4. **Right tests** — do the AC-tagged tests prove each criterion? Use the test report's criteria table and diff coverage.
5. **Ready for the next person** — naming, non-obvious comments, a context fragment when context changed.

Write `review/risks.json`:

```json
{
  "mergeRisk": "Low|Medium|High",
  "atAGlance": "2 sentences on the real risks",
  "flow": "mermaid sequenceDiagram of the main request path with the PR's new steps highlighted",
  "heatmap": [{ "cluster": "A", "security": "High", "reliability": "Med", "speed": "Low", "tests": "Low" }],
  "findings": [
    { "id": "F1", "severity": "High", "blocking": true, "file": "path", "line": 34, "title": "", "consequence": "one sentence", "fix": "one sentence" }
  ],
  "blastRadius": { "direct": [], "indirect": [], "notAffected": [] },
  "evidence": { "tests": "from test-report.json", "acceptanceCriteria": [], "diffCoverage": null }
}
```

Only High findings can be blocking. A finding without file:line is not a finding.

## Integration mode (PRs labelled `feature-release`)

The feature branch → integration branch PR. Every line was already reviewed in a phase, so don't re-review hunks. Instead: link each phase's review (from the phase PRs' sticky comments), and judge only (1) how the phases fit together end to end, (2) anything changed after a phase was reviewed (diff the phase PR heads against the feature branch head), (3) conflicts or drift against the latest integration branch, (4) whether the Foot Traffic walk (`review/foot-traffic.md`) passed. The verdict always requires a human approval.

## Phase 3 · Narrate — "How should I review it?" (Sonnet)

1. Copy the `template.html` next to this SKILL.md (`.github/sdlc/tech-lead-review/` in CI, `~/.claude/skills/tech-lead-review/` locally) to `review/report.html` and fill every `{{…}}` from the two JSON files. Keep the three `<section class="page">` blocks — one per phase. Mermaid sources go inside `<pre class="mermaid">`.
2. Page 3 holds: verdict (Approve / Request changes / Needs a decision), plain-English summary, suggested review path (files in reading order, minutes each, riskiest early), questions for the author, what's good, Before merging checklist.
3. Write `review/comment.md` — the sticky PR comment:

```markdown
<!-- claude-tech-lead-review -->
## {{verdict}} · Merge risk {{risk}} · {{n}} blocking · ~{{minutes}} min review
Runtime: {{api}} API checks · {{flows}} browser flows · {{errors}} console errors · AC {{covered}}/{{total}} · diff coverage {{pct}}

{{2-sentence summary}}

**Before merging**
- [ ] …

![Page 3 — How to review]({{PAGE3_URL}})

{{FOR_PRODUCT}}
{{FOOT_TRAFFIC}}
[Page 1 — What changed]({{PAGE1_URL}}) · [Page 2 — Why it matters]({{PAGE2_URL}}) · [PDF]({{PDF_URL}})
```

## Human approval — the 2-minute read

The approver reads page 3's banner (15 s), then the summary and Before merging list (45 s), then page 2's findings only if risk ≥ Medium or a blocking item was dismissed (60 s), then decides.

## Project rules

Apply every naming, wording, scope and compliance rule in the project's CLAUDE.md. A violation of a stated scope or compliance rule is a High finding.

`{{FOR_PRODUCT}}` (screenshots table) and `{{FOOT_TRAFFIC}}` (walk result) are filled by the workflow; leave them as literal placeholders.
