#!/usr/bin/env node
// PR size standard (Layer 4). Counts changed lines between two refs, skipping the
// patterns in .github/pr-size-ignore (tests, lockfiles, generated code).
//   node scripts/sdlc/pr-size.mjs <base> <head> [--labels "a,b"] [--json]
// Exit 1 when a single PR is over 400 lines, unless labelled size-exception or
// feature-release (the feature branch → develop PR; its phases were already reviewed).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, git, integrationBranch } from './lib.mjs';

const [base = `origin/${integrationBranch()}`, head = 'HEAD'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const labelsArg = process.argv.indexOf('--labels');
const labels = labelsArg > 0 ? process.argv[labelsArg + 1].split(',').map((s) => s.trim()) : [];

const globToRe = (g) =>
  new RegExp(
    `^${g
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '\u0001')
      .replace(/\*\*/g, '\u0002')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\u0001/g, '(?:.*/)?')
      .replace(/\u0002/g, '.*')}$`,
  );
const ignoreFile = join(ROOT, '.github', 'pr-size-ignore');
const ignores = existsSync(ignoreFile)
  ? readFileSync(ignoreFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(globToRe)
  : [];

let added = 0, removed = 0, testLines = 0, files = 0;
const perFile = [];
for (const line of git(`diff --numstat ${git(`merge-base ${base} ${head}`)} ${head}`).split('\n').filter(Boolean)) {
  const [a, r, path] = line.split('\t');
  const n = (a === '-' ? 0 : Number(a)) + (r === '-' ? 0 : Number(r));
  if (ignores.some((re) => re.test(path))) {
    testLines += n;
    continue;
  }
  files++;
  added += a === '-' ? 0 : Number(a);
  removed += r === '-' ? 0 : Number(r);
  perFile.push({ path, added: Number(a) || 0, removed: Number(r) || 0 });
}
const total = added + removed;
const label = total <= 50 ? 'size/XS' : total <= 200 ? 'size/S' : total <= 400 ? 'size/M' : total <= 800 ? 'size/L' : 'size/XL';
const exempt = labels.includes('size-exception') || labels.includes('feature-release');
const result = { label, total, added, removed, files, ignoredLines: testLines, exempt, perFile };

if (process.argv.includes('--json')) console.log(JSON.stringify(result));
else {
  console.log(`${label}: ${files} files · +${added} / −${removed} = ${total} counted lines (${testLines} test/generated lines not counted)`);
  if (total > 400 && !exempt)
    console.log('Over 400 lines. Split it into phases on a feature branch and ship them as a gh stack (docs/claude-sdlc/SETUP.md → "Big features").');
}
process.exit(total > 400 && !exempt ? 1 : 0);
