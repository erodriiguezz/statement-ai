#!/usr/bin/env node
// Before/after screenshots for the PM handoff (Layer 6).
// Screens come from the plan's "## Screens" section ("- /pricing — price cards").
// After = the local stack (:3002). Before = BEFORE_URL (staging, which runs develop), if set.
// Output: .claude/artifacts/screenshots/<issue>/ + index.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { ROOT, issueNumber, readPlan, section } from './lib.mjs';

const plan = readPlan();
const routes = (plan ? section(plan.text, 'Screens') : [])
  .map((l) => l.match(/^\s*-\s*(\/\S*)\s*(?:[—-]\s*(.*))?/))
  .filter(Boolean)
  .map(([, path, note]) => ({ path, note: note?.trim() ?? '' }));
if (!routes.length) {
  console.log('No "## Screens" in the plan — nothing to capture.');
  process.exit(0);
}

const after = process.env.AFTER_URL ?? 'http://localhost:3002';
const before = process.env.BEFORE_URL ?? '';
const widths = [
  ['desktop', 1280, 800],
  ['mobile', 390, 844],
];
const dir = join(ROOT, '.claude', 'artifacts', 'screenshots', issueNumber() ?? 'misc');
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const shots = [];
for (const r of routes) {
  const slug = r.path.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'home';
  for (const [label, width, height] of widths) {
    for (const [when, origin] of [['before', before], ['after', after]]) {
      if (!origin) continue;
      const page = await browser.newPage({ viewport: { width, height } });
      const file = `${slug}-${label}-${when}.png`;
      try {
        await page.goto(origin + r.path, { waitUntil: 'networkidle' });
        await page.screenshot({ path: join(dir, file), fullPage: true });
        shots.push({ route: r.path, note: r.note, viewport: label, when, file });
      } catch (e) {
        shots.push({ route: r.path, viewport: label, when, error: String(e.message).slice(0, 200) });
      }
      await page.close();
    }
  }
}
await browser.close();
writeFileSync(join(dir, 'index.json'), JSON.stringify({ after, before: before || null, shots }, null, 2));
console.log(`${shots.filter((s) => s.file).length} screenshots → ${dir}`);
