#!/usr/bin/env node
// API integration smoke (Test step, part 1). Runs the checks in e2e/api-smoke.json against
// the running local stack. /plan adds a check per changed endpoint; tag it with "ac"
// when it proves an acceptance criterion.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const { checks } = JSON.parse(readFileSync(join(ROOT, 'e2e', 'api-smoke.json'), 'utf8'));
const results = [];
for (const c of checks) {
  const started = Date.now();
  let status = 0;
  let body = '';
  try {
    const res = await fetch(c.url, { method: c.method ?? 'GET', headers: c.headers, body: c.body ? JSON.stringify(c.body) : undefined });
    status = res.status;
    body = (await res.text()).slice(0, 500);
  } catch (e) {
    body = String(e.message);
  }
  const expected = [].concat(c.expectStatus ?? 200);
  const ok = expected.includes(status) && (!c.expectBodyIncludes || body.includes(c.expectBodyIncludes));
  results.push({ name: c.name, ac: c.ac, method: c.method ?? 'GET', url: c.url, status, ok, ms: Date.now() - started, sample: ok ? undefined : body });
  console.log(`${ok ? '✔' : '✖'} ${c.name}  ${c.method ?? 'GET'} ${c.url} → ${status || 'no response'}${ok ? '' : `  (expected ${expected.join('/')})`}`);
}
mkdirSync(join(ROOT, '.claude', 'artifacts'), { recursive: true });
writeFileSync(join(ROOT, '.claude', 'artifacts', 'api-smoke.json'), JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
