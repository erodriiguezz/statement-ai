// Smoke walk of the main flow: consent → upload → parse → review → draft → download.
// Uses the invented statement in parser/fixtures/synthetic/ (never a real client PDF).
// test.sh runs the app with no OPENAI_API_KEY, so the draft comes from the local fallback.
import { join } from 'node:path';

import { expect, test } from './fixtures';

const SYNTHETIC_PDF = join(__dirname, '..', 'parser', 'fixtures', 'synthetic', 'moneymgr_synthetic.pdf');

test('upload a statement, review its transactions and download the draft', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');

  await page.getByRole('checkbox').check();
  await page.locator('input[type="file"]').setInputFiles(SYNTHETIC_PDF);
  await expect(page.getByText('moneymgr_synthetic.pdf')).toBeVisible();

  await page.getByRole('button', { name: 'Analyse 1 file' }).click();

  // Review step: every synthetic row parsed (signs are covered by the parser's pytest suite).
  const confirm = page.getByRole('button', { name: 'Confirm & generate draft' });
  await expect(confirm).toBeVisible({ timeout: 60_000 });
  const descriptions = page.getByPlaceholder('Transaction description');
  await expect(descriptions).toHaveCount(5);
  const values = await descriptions.evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
  expect(values).toEqual(
    expect.arrayContaining([
      'Deposit Internet Transfer from XXXX0001',
      'External Withdrawal ACME OFFICE SUPPLY - PAYMENT',
      'Check 101',
      'Descriptive Deposit Business Mobile Deposit',
      'Point Of Sale Withdrawal EXAMPLE SOFTWARE CO',
    ]),
  );

  await confirm.click();
  await expect(page.getByRole('heading', { name: 'Your draft is ready' })).toBeVisible({ timeout: 30_000 });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
});
