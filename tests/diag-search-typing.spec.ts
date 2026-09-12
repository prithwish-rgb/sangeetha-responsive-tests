import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('DIAGNOSTIC: Test Search Overlay Typing & Suggestion Selection', async ({ page }) => {
  test.setTimeout(60000);
  fs.mkdirSync('screenshots/mod6-diag-strict', { recursive: true });

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 1. Open Search Overlay
  const pillLocator = page.locator('text=/Search or Ask for/i').first();
  await pillLocator.click();
  await page.waitForTimeout(1500);

  // 2. Type "Galaxy" into the search input
  const searchInput = page.locator('input[placeholder*="looking for" i]').first();
  console.log('Search Input visible in overlay:', await searchInput.isVisible());

  await searchInput.fill('Galaxy');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/07-search-typed-galaxy.png' });

  // 3. Press Enter to submit search
  console.log('Submitting search via Enter key...');
  await searchInput.press('Enter');
  await page.waitForTimeout(3500);
  console.log('Post-Enter URL:', page.url());
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/08-post-enter-results.png' });

  // 4. Test clicking a Recent Search Chip (e.g. "iphone")
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await pillLocator.click();
  await page.waitForTimeout(1500);

  const iphoneChip = page.locator('button, div, span').filter({ hasText: /^iphone$/i }).first();
  if (await iphoneChip.isVisible().catch(() => false)) {
    console.log('Clicking "iphone" recent search chip...');
    await iphoneChip.click();
    await page.waitForTimeout(3500);
    console.log('Post-Chip URL:', page.url());
    await page.screenshot({ path: 'screenshots/mod6-diag-strict/09-post-chip-results.png' });
  }
});
