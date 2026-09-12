import { test, devices } from '@playwright/test';
import appleVariantsData from './data/apple-variants.json';
import pincodesData from './data/pincodes.json';
import { runEtaSweep } from './orchestrator/eta-sweep.orchestrator';
import { writeSweepSummary } from './helpers/logger.helper';
import { ProductVariant, Pincode, DEFAULT_CONFIG } from './types/hyperlocal.types';

// Delivery/pincode markup was captured on mobile — desktop serves a different layout.
test.use({ ...devices['Pixel 7'] });

/**
 * Thin Playwright entry point. All business logic lives in
 * orchestrator/eta-sweep.orchestrator.ts as a plain async function.
 *
 * Run:
 *   npx playwright test tests/hyperlocal/hyperlocal-eta.spec.ts --project=chromium-logged-in
 */
test('Hyperlocal delivery ETA sweep — 100 cycles', async ({ page }) => {
  test.setTimeout(0);

  const variants = appleVariantsData as ProductVariant[];
  const pincodePool = pincodesData as Pincode[];

  const summary = await runEtaSweep(page, variants, pincodePool, DEFAULT_CONFIG);

  const summaryFilePath = writeSweepSummary(summary);

  await test.info().attach('eta-sweep-summary', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  });

  console.log(`\nFull summary also saved to: ${summaryFilePath}`);
});
