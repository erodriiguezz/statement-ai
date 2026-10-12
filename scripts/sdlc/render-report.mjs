#!/usr/bin/env node
// Renders the tech-lead review report (HTML with three <section class="page">) to a PDF
// and one PNG per page. Usage: node scripts/sdlc/render-report.mjs review/report.html review/
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [input = 'review/report.html', outDir = 'review'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(`file://${resolve(input)}`, { waitUntil: 'networkidle' });
const pages = page.locator('section.page');
const n = await pages.count();
for (let i = 0; i < n; i++) await pages.nth(i).screenshot({ path: join(outDir, `page-${i + 1}.png`) });
await page.pdf({ path: join(outDir, 'report.pdf'), format: 'Letter', printBackground: true });
await browser.close();
console.log(`Rendered ${n} page(s) + report.pdf → ${outDir}`);
