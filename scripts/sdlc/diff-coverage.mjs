#!/usr/bin/env node
// Diff coverage (Test step, part 2): share of changed, instrumented source lines that
// tests executed. Reads lcov.info files written by `turbo run test:coverage`.
// Exit 0 pass, 1 below threshold, 3 not measured (no lcov for the changed files).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ROOT, git, integrationBranch, walk } from './lib.mjs';

const base = process.argv[2] || git(`merge-base HEAD ${process.env.SDLC_BASE || `origin/${integrationBranch()}`}`);
const threshold = Number(process.env.SDLC_DIFF_COVERAGE ?? 80);
const out = join(ROOT, '.claude', 'artifacts', 'diff-coverage.json');
mkdirSync(dirname(out), { recursive: true });

// Changed lines per source file (added/modified lines only, tests excluded).
const changed = new Map();
let file = null;
for (const line of git(`diff -U0 ${base} -- '*.ts' '*.tsx' ':(exclude)**/*.test.*' ':(exclude)**/*.spec.*' ':(exclude)e2e/**'`).split('\n')) {
  if (line.startsWith('+++ ')) file = line.slice(4).replace(/^b\//, '');
  const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if (m && file && file !== '/dev/null') {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    const set = changed.get(file) ?? new Set();
    for (let i = start; i < start + count; i++) set.add(i);
    changed.set(file, set);
  }
}

// Line hits from every lcov.info in the repo.
const hits = new Map();
for (const lcov of walk(ROOT, (p) => p.endsWith('lcov.info'))) {
  let sf = null;
  for (const l of readFileSync(lcov, 'utf8').split('\n')) {
    if (l.startsWith('SF:')) {
      // Vitest writes SF paths relative to the package root (<pkg>/coverage/lcov.info).
      const p = l.slice(3);
      sf = p.startsWith('/') ? relative(ROOT, p) : relative(ROOT, join(dirname(dirname(lcov)), p));
      if (!hits.has(sf)) hits.set(sf, new Map());
    } else if (l.startsWith('DA:') && sf) {
      const [n, c] = l.slice(3).split(',').map(Number);
      hits.get(sf).set(n, (hits.get(sf).get(n) ?? 0) + c);
    }
  }
}

let total = 0;
let covered = 0;
const files = [];
for (const [f, lines] of changed) {
  const h = hits.get(f);
  if (!h) continue;
  let t = 0;
  let c = 0;
  const uncovered = [];
  for (const n of lines) {
    if (!h.has(n)) continue; // not an executable line
    t++;
    if (h.get(n) > 0) c++;
    else uncovered.push(n);
  }
  if (t) files.push({ file: f, covered: c, total: t, uncovered });
  total += t;
  covered += c;
}

if (!total) {
  console.log('Diff coverage: not measured (no coverage data for changed files). Vitest packages report it; node:test packages do not yet.');
  writeFileSync(out, JSON.stringify({ status: 'not-measured', threshold }, null, 2));
  process.exit(3);
}
const pct = Math.round((covered / total) * 1000) / 10;
for (const f of files) console.log(`${f.covered === f.total ? '✔' : '•'} ${f.file}  ${f.covered}/${f.total}${f.uncovered.length ? `  uncovered: L${f.uncovered.slice(0, 8).join(', L')}` : ''}`);
console.log(`Diff coverage ${pct}% (threshold ${threshold}%)`);
writeFileSync(out, JSON.stringify({ status: pct >= threshold ? 'pass' : 'fail', percent: pct, threshold, files }, null, 2));
process.exit(pct >= threshold ? 0 : 1);
