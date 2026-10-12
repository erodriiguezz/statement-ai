#!/usr/bin/env node
// Evidence record per change (docs/evidence/<issue>.json), written by the ship step from the plan,
// the test report and the cost tally, so an audit or a release journal is a query, not a scramble.
//   node scripts/sdlc/evidence.mjs write <plan file> [--reviewer "<verdict line>"]
//   node scripts/sdlc/evidence.mjs check <issue>     exit 1 and list what's missing
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, branch, git } from './lib.mjs';

const [cmd, arg, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const read = (f) => {
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};
const frontMatter = (text) =>
  Object.fromEntries(
    (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '')
      .split('\n')
      .map((l) => l.match(/^(\w+):\s*(.*?)\s*(#.*)?$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v]),
  );
const dir = join(ROOT, 'docs', 'evidence');

// What a complete record must contain. Shared by `check` and scripts/sdlc/metrics.mjs.
export function missing(e) {
  const m = [];
  if (!e) return ['evidence file'];
  if (!e.approval?.by || !e.approval?.at) m.push('plan approval (approved_by / approved_at)');
  if (!e.tests?.passed) m.push('green test report');
  if (e.tests?.commit && e.commit && e.tests.commit !== e.commit) m.push('test report for the shipped commit');
  if (e.tests?.acceptanceCriteria !== 'pass') m.push('every acceptance criterion covered');
  if (!e.review?.local) m.push('local reviewer verdict');
  return m;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (!isMain) {
  // imported for missing()
} else if (cmd === 'write') {
  if (!arg || !existsSync(arg)) {
    console.error('usage: evidence.mjs write <plan file> [--reviewer "<verdict>"]');
    process.exit(1);
  }
  const fm = frontMatter(readFileSync(arg, 'utf8'));
  const report = read(join(ROOT, '.claude', 'test-report.json'));
  const cost = read(join(ROOT, '.claude', 'budget', `${branch().replace(/[^\w.-]+/g, '_')}.json`));
  const tokens = cost
    ? Object.values(cost.sessions ?? {}).reduce((n, s) => n + (s.input ?? 0) + (s.output ?? 0) + (s.cacheWrite ?? 0) + (s.cacheRead ?? 0), 0)
    : null;
  const e = {
    issue: Number(fm.issue) || fm.issue,
    title: fm.title,
    branch: branch(),
    commit: git('rev-parse HEAD'),
    plan: relative(ROOT, arg),
    size: fm.size,
    touchesApi: fm.touches_api === 'true',
    approval: { by: fm.approved_by || null, at: fm.approved_at || null },
    tests: report && {
      commit: report.commit,
      at: report.at,
      passed: report.passed,
      steps: report.steps,
      acceptanceCriteria: report.acceptanceCriteria?.status ?? null,
      criteria: (report.acceptanceCriteria?.criteria ?? []).map((c) => ({ id: c.id, tests: c.tests?.length ?? 0 })),
      diffCoverage: report.diffCoverage?.percent ?? report.diffCoverage?.status ?? null,
      api: report.api?.status ?? null,
    },
    review: { local: flag('reviewer') ?? null },
    cost: { estTokens: cost?.estTokens ?? (Number(fm.est_tokens) || null), actualTokens: tokens, toolCalls: cost?.toolCalls ?? null, handoff: cost?.handoff ?? false },
    writtenAt: new Date().toISOString(),
  };
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${e.issue}.json`);
  writeFileSync(out, `${JSON.stringify(e, null, 2)}\n`);
  const gaps = missing(e);
  console.log(`${relative(ROOT, out)} written${gaps.length ? ` — incomplete: ${gaps.join(', ')}` : ' — complete'}`);
  process.exit(gaps.length ? 1 : 0);
} else if (cmd === 'check') {
  const gaps = missing(read(join(dir, `${arg}.json`)));
  console.log(gaps.length ? `#${arg} evidence incomplete: ${gaps.join(', ')}` : `#${arg} evidence complete`);
  process.exit(gaps.length ? 1 : 0);
} else if (cmd) {
  console.error('usage: evidence.mjs write <plan file> [--reviewer "<verdict>"] | check <issue>');
  process.exit(1);
}
