#!/usr/bin/env node
// CI copy of the conventions the local hook enforces (branch names, commit subjects, PR title,
// no AI attribution), so the rules hold for any agent or editor, not only Claude Code.
//   node scripts/sdlc/conventions.mjs --base <ref> --head <sha> --branch <name> --title "<PR title>" [--body-file <path>]
import { existsSync, readFileSync } from 'node:fs';
import { git } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const BRANCH = /^(feat|bugfix|hotfix|chore|refactor)\/[a-z0-9]+(-[a-z0-9]+){2,4}(-p\d+(-[a-z0-9]+)+)?$/;
const RELEASE = /^release\/v?\d+\.\d+\.\d+(-[\w.]+)?$/;
const SUBJECT = /^(feat|fix|chore|refactor|docs|style|test|perf|ci|build): [a-z0-9`].*[^.\s]$/;
const ATTRIBUTION = /co-authored-by:\s*claude|generated with \[?claude|🤖 generated with|noreply@anthropic\.com/i;

const errors = [];
const branch = opt('branch');
if (branch && !BRANCH.test(branch) && !RELEASE.test(branch))
  errors.push(`branch "${branch}" must be <type>/<short-description> (feat, bugfix, hotfix, chore, refactor; kebab-case, 3-5 words).`);

const title = opt('title');
if (title !== undefined && (title.length > 72 || (!SUBJECT.test(title) && !/^chore: release v\d/.test(title))))
  errors.push(`PR title "${title}" must be "type: description", lowercase, no period, at most 72 characters.`);

const bodyFile = opt('body-file');
if (bodyFile && existsSync(bodyFile) && ATTRIBUTION.test(readFileSync(bodyFile, 'utf8')))
  errors.push('PR body contains AI attribution ("Generated with Claude" or a Co-Authored-By trailer). Remove it.');

const base = opt('base');
const head = opt('head') ?? 'HEAD';
if (base) {
  const log = git(`log --format=%H%x1f%s%x1f%B%x1e ${base}..${head}`);
  for (const rec of log.split('\x1e').map((r) => r.trim()).filter(Boolean)) {
    const [sha, subject, body] = rec.split('\x1f');
    if (/^(Merge|Revert) /.test(subject)) continue;
    if (subject.length > 72 || !SUBJECT.test(subject)) errors.push(`commit ${sha.slice(0, 7)} "${subject}" must be "type: description" (max 72 characters).`);
    if (ATTRIBUTION.test(body ?? '')) errors.push(`commit ${sha.slice(0, 7)} contains AI attribution.`);
  }

  // PROJECT: client statements must never be committed (README SOP: zero retention).
  // Only generated, invented PDFs under parser/fixtures/synthetic/ are allowed.
  const pdfs = git(`diff --name-only --diff-filter=AR ${base}...${head}`)
    .split('\n')
    .filter((p) => /\.pdf$/i.test(p) && !p.startsWith('parser/fixtures/synthetic/'));
  for (const p of pdfs) errors.push(`${p}: PDFs may only be committed under parser/fixtures/synthetic/ (never real statements).`);
}

if (errors.length) {
  for (const e of errors) console.log(`::error::${e}`);
  process.exit(1);
}
console.log('Conventions: branch, commits, PR title and attribution OK.');
