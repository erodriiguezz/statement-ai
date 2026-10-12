#!/usr/bin/env node
// Acceptance-criteria coverage (Test step, part 2).
// Criteria live in the plan as "- AC-47.1: <criterion>". Tests prove one by carrying its
// ID in the test name or a tag: it('rejects a 6th login in a minute [AC-47.2]') or
// test('…', { tag: '@AC-47.2' }). Fails if any criterion has no test, or a test names
// a criterion of this issue that the plan doesn't define.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, branch, issueNumber, readPlan, section, walk } from './lib.mjs';

const plan = readPlan();
const issue = issueNumber();
const out = join(ROOT, '.claude', 'artifacts', 'ac-coverage.json');
mkdirSync(join(ROOT, '.claude', 'artifacts'), { recursive: true });

if (!plan) {
  console.log(`No plan in .claude/plans/ lists branch ${branch()} — acceptance-criteria check skipped (plan feature work first: "plan issue <n>").`);
  writeFileSync(out, JSON.stringify({ status: 'no-plan' }, null, 2));
  // A branch no plan claims (tooling, docs) passes; PRs labelled no-plan pass too.
  process.exit(0);
}

// Plan v2 keeps criteria in the Approval summary; older plans have an "## Acceptance criteria" section.
const acLines = section(plan.text, 'Acceptance criteria');
const seen = new Set();
const criteria = (acLines.length ? acLines : section(plan.text, 'Approval summary'))
  .map((l) => l.match(/\b(AC-\d+\.\d+)\s*[:—-]\s*(.+)/))
  .filter((m) => m && !seen.has(m[1]) && seen.add(m[1]))
  .map(([, id, text]) => ({ id, text: text.trim(), tests: [] }));

if (!criteria.length) {
  console.log(`${relative(ROOT, plan.path)} has no "- AC-${issue}.N: …" lines in its Approval summary (or "## Acceptance criteria").`);
  writeFileSync(out, JSON.stringify({ status: 'no-criteria', plan: relative(ROOT, plan.path) }, null, 2));
  process.exit(1);
}

// PROJECT: parser tests are pytest files (parser/tests/test_*.py); tag them with the AC id in the
// test name or docstring.
const isTest = (p) =>
  /\.(test|spec)\.(ts|tsx|mjs|js)$/.test(p) || p.endsWith('api-smoke.json') || /parser\/tests\/test_[^/]+\.py$/.test(p);
const files = walk(ROOT, isTest);
const known = new Set(criteria.map((c) => c.id));
const unknown = [];
const idRe = new RegExp(`AC-${issue}\\.\\d+`, 'g');

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const id of line.match(idRe) ?? []) {
      const ref = `${relative(ROOT, f)}:${i + 1}`;
      const c = criteria.find((x) => x.id === id);
      if (c) c.tests.push(ref);
      else if (!known.has(id)) unknown.push({ id, ref });
    }
  });
}

const missing = criteria.filter((c) => !c.tests.length);
for (const c of criteria) console.log(`${c.tests.length ? '✔' : '✖'} ${c.id}  ${c.text}${c.tests.length ? `  (${c.tests.slice(0, 3).join(', ')})` : '  — no test'}`);
for (const u of unknown) console.log(`✖ ${u.id} referenced at ${u.ref} but not defined in the plan`);

writeFileSync(out, JSON.stringify({ status: missing.length || unknown.length ? 'fail' : 'pass', plan: relative(ROOT, plan.path), criteria, unknown }, null, 2));
process.exit(missing.length || unknown.length ? 1 : 0);
