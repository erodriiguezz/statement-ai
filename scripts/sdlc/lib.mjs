// Shared helpers for scripts/sdlc/*.mjs.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
export const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();
// CI checks out a detached SHA, so prefer the PR's head branch name when available.
// Integration branch from .claude/sdlc.json (default develop).
export function integrationBranch() {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.claude', 'sdlc.json'), 'utf8')).integrationBranch || 'develop';
  } catch {
    return 'develop';
  }
}

export const branch = () => process.env.SDLC_BRANCH || process.env.GITHUB_HEAD_REF || git('rev-parse --abbrev-ref HEAD');

// Plans are named by issue (.claude/plans/61-add-pricing-cards.md) and list their branches in
// front matter (`branch:`, `feature_branch:`) and in the PR split table (stack phases).
// Branch names don't carry the issue number; it's found through the plan.
export function planPath(name = branch()) {
  const dir = join(ROOT, '.claude', 'plans');
  if (!existsSync(dir)) return null;
  const plans = readdirSync(dir).filter((f) => /^\d+-.+\.md$/.test(f));
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentions = new RegExp(`(^(branch|feature_branch):\\s*${esc}\\s*$)|(\\|\\s*\`?${esc}\`?\\s*\\|)`, 'm');
  const hit = plans.find((f) => mentions.test(readFileSync(join(dir, f), 'utf8')));
  if (hit) return join(dir, hit);
  const n = name.match(/(?:^|\/)(\d+)(?:-|$)/); // legacy: issue number in the branch name
  const legacy = n && plans.find((f) => f.startsWith(`${n[1]}-`));
  return legacy ? join(dir, legacy) : null;
}

export function issueNumber(name = branch()) {
  const p = planPath(name);
  return p ? p.split('/').pop().match(/^(\d+)-/)[1] : null;
}

export function readPlan(name) {
  const p = planPath(name);
  return p ? { path: p, text: readFileSync(p, 'utf8') } : null;
}

// Lines under a "## <heading>" section of the plan.
// Lines under a plan heading. Matches ## to #### and numbered headings ("## 1. Approval summary"),
// and stops at the next heading of the same or a higher level.
export function section(text, heading) {
  const lines = text.split('\n');
  const re = /^(#{2,4})\s+(?:\d+\.\s+)?(.*)$/;
  const h = heading.toLowerCase();
  const start = lines.findIndex((l) => l.trim().match(re)?.[2].toLowerCase().startsWith(h));
  if (start < 0) return [];
  const level = lines[start].trim().match(re)[1].length;
  const out = [];
  for (const l of lines.slice(start + 1)) {
    const m = l.trim().match(/^(#{1,6})\s/);
    if (m && m[1].length <= level) break;
    out.push(l);
  }
  return out;
}

export function baseRef() {
  const ref = process.env.SDLC_BASE || `origin/${integrationBranch()}`;
  try {
    return git(`merge-base HEAD ${ref}`);
  } catch {
    return git('rev-parse HEAD~1');
  }
}

export function walk(dir, match, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', '.turbo', '.git', '.wrangler', '.worktrees'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, match, out);
    else if (match(p)) out.push(p);
  }
  return out;
}
