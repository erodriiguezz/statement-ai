#!/usr/bin/env node
// Delivery metrics for the release journal: one number per stage, so the weakest stage gets the next
// process change. Uses gh + git; every metric degrades to "n/a (reason)" instead of failing.
//   node scripts/sdlc/metrics.mjs [--since <tag|date>] [--until <ref>] [--md | --json]
// Definitions (approximations are labelled as such in the output):
//   lead time        median hours from a merged PR's first commit to its merge
//   change failure   hotfix/* or revert PRs merged ÷ other PRs merged (approximation of DORA CFR)
//   escaped defects  issues labelled bug opened in the window ÷ PRs merged (approximation)
//   gate coverage    merged PRs whose checks include every sdlc.json requiredChecks name (default pr-size)
//   gate flake rate  pull_request workflow runs that passed on a re-run attempt ÷ all such runs
//   evidence         merged PRs with a complete docs/evidence/<issue>.json ÷ merged PRs that have a plan
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, git, integrationBranch } from './lib.mjs';
import { missing } from './evidence.mjs';

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const gh = (a) => {
  try {
    return JSON.parse(execFileSync('gh', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) || '[]');
  } catch (e) {
    throw new Error(String(e.stderr || e.message).trim().split('\n')[0]);
  }
};
const cfg = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.claude', 'sdlc.json'), 'utf8'));
  } catch {
    return {};
  }
})();
const base = integrationBranch();
const required = cfg.requiredChecks ?? ['pr-size'];

// Window: --since accepts a tag/ref (its commit date) or a date; default = last v* tag, else 30 days.
const dateOf = (ref) => git(`log -1 --format=%cI ${ref}`);
let since = opt('since');
if (!since) {
  try {
    since = git('describe --tags --abbrev=0 --match "v*"');
  } catch {
    since = new Date(Date.now() - 30 * 864e5).toISOString();
  }
}
const sinceDate = /^\d{4}-\d{2}-\d{2}/.test(since) ? since : dateOf(since);
const untilDate = opt('until') ? dateOf(opt('until')) : new Date().toISOString();
const inWindow = (d) => d && d >= sinceDate && d <= untilDate;
const pct = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}% (${n}/${d})` : 'n/a (no data)');
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const safe = (fn) => {
  try {
    return fn();
  } catch (e) {
    return `n/a (${String(e.message).split('\n')[0].slice(0, 80)})`;
  }
};

let prs = [];
const prError = safe(() => {
  prs = gh(['pr', 'list', '--state', 'merged', '--base', base, '--limit', '300', '--search', `merged:>=${sinceDate.slice(0, 10)}`,
    '--json', 'number,title,headRefName,mergedAt,statusCheckRollup,closingIssuesReferences'])
    .filter((p) => inWindow(p.mergedAt));
  return null;
});
const fixes = prs.filter((p) => /^hotfix\//.test(p.headRefName) || /^revert/i.test(p.title));
const regular = prs.filter((p) => !fixes.includes(p));

const rows = [
  ['Lead time for changes (median, first commit → merge)', 'all', prError ?? safe(() => {
    // First commit per PR via REST: the GraphQL commits connection is too heavy for a list query.
    const h = prs
      .map((p) => {
        try {
          const d = execFileSync('gh', ['api', `repos/{owner}/{repo}/pulls/${p.number}/commits?per_page=1`, '--jq', '.[0].commit.author.date'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          return (Date.parse(p.mergedAt) - Date.parse(d)) / 36e5;
        } catch {
          return NaN;
        }
      })
      .filter((x) => x >= 0);
    const m = median(h);
    return m === null ? 'n/a (no merged PRs)' : `${m < 48 ? `${m.toFixed(1)} h` : `${(m / 24).toFixed(1)} d`} over ${h.length} PRs`;
  })],
  ['Change failure rate (hotfix/revert PRs ÷ other PRs, approx.)', 'Release', prError ?? pct(fixes.length, regular.length)],
  ['Escaped defects (bug issues opened ÷ PRs merged, approx.)', 'Test', prError ?? safe(() => {
    const bugs = gh(['issue', 'list', '--state', 'all', '--label', 'bug', '--limit', '300', '--search', `created:>=${sinceDate.slice(0, 10)}`, '--json', 'number,createdAt'])
      .filter((i) => inWindow(i.createdAt));
    return pct(bugs.length, prs.length);
  })],
  [`Gate coverage (merged PRs that ran ${required.join(', ')})`, 'Review', prError ?? pct(
    prs.filter((p) => required.every((r) => (p.statusCheckRollup ?? []).some((c) => (c.name ?? c.context) === r))).length,
    prs.length,
  )],
  ['Gate flake rate (PR runs passing only on a re-run)', 'Review', safe(() => {
    const runs = gh(['run', 'list', '--event', 'pull_request', '--limit', '500', '--json', 'attempt,conclusion,createdAt']).filter((r) => inWindow(r.createdAt));
    return pct(runs.filter((r) => r.attempt > 1 && r.conclusion === 'success').length, runs.length);
  })],
  ['Evidence completeness (complete docs/evidence/<issue>.json)', 'all', prError ?? safe(() => {
    const issues = prs.flatMap((p) => (p.closingIssuesReferences ?? []).map((i) => i.number));
    const withPlan = [...new Set(issues)];
    const ok = withPlan.filter((n) => {
      try {
        const raw = execFileSync('git', ['show', `origin/${base}:docs/evidence/${n}.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return missing(JSON.parse(raw)).length === 0;
      } catch {
        return false;
      }
    });
    return pct(ok.length, withPlan.length);
  })],
];

if (args.includes('--json')) {
  console.log(JSON.stringify({ since: sinceDate, until: untilDate, base, metrics: rows.map(([metric, stage, value]) => ({ metric, stage, value })) }, null, 2));
} else {
  console.log(`Window ${sinceDate.slice(0, 10)} → ${untilDate.slice(0, 10)} on ${base}${prError ? ` — ${prError}` : ''}\n`);
  console.log('| Metric | Stage | Value |\n| --- | --- | --- |');
  for (const [m, s, v] of rows) console.log(`| ${m} | ${s} | ${v} |`);
}
