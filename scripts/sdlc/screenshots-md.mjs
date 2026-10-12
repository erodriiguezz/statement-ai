#!/usr/bin/env node
// Builds the "For product" before/after table for the PR comment from a screenshots
// index.json (written by screenshots.mjs) and the base URL where the images were published.
//   node scripts/sdlc/screenshots-md.mjs <index.json> <imagesBaseUrl>
import { existsSync, readFileSync } from 'node:fs';

const [indexPath, base] = process.argv.slice(2);
if (!indexPath || !existsSync(indexPath)) process.exit(0);
const { shots } = JSON.parse(readFileSync(indexPath, 'utf8'));
const rows = new Map();
for (const s of shots.filter((x) => x.file)) {
  const key = `${s.route} · ${s.viewport}`;
  const r = rows.get(key) ?? { note: s.note ?? '' };
  r[s.when] = `<img src="${base}/${s.file}?raw=true" width="360">`;
  rows.set(key, r);
}
if (!rows.size) process.exit(0);
console.log('### For product — before / after\n');
console.log('| Screen | Before | After |\n| --- | --- | --- |');
for (const [key, r] of rows) console.log(`| ${key}${r.note ? `<br>${r.note}` : ''} | ${r.before ?? '—'} | ${r.after ?? '—'} |`);
