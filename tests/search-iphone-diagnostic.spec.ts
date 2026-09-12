import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';
const SEARCH_INPUT = 'input.search__home';
const RESULT_ITEMS = '.searched-list';

// Narrowing down WHY "iPhone 17 Pro" returns zero results, by testing
// variants that isolate each possible cause: brand prefix, word order,
// number placement, partial terms.
const VARIANTS = [
  'iPhone 17 Pro',       // the original failing query
  'iPhone',              // just the brand word alone
  'iPhone 17',           // without "Pro"
  'Apple iPhone 17 Pro', // with the actual brand prefix from the real name
  'Apple',               // brand prefix alone
  '17 Pro',              // model number alone, no brand
  'Cosmic Orange',       // color variant, from the real product name
];

async function dismissBlockingPopups(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  const closeSelectors = [
    '.location-header-popup .close', '.location-header-popup .btn-close',
    '.modal.show .close', '.modal.show .btn-close',
    '[data-dismiss="modal"]', '[data-bs-dismiss="modal"]',
  ];
  for (const sel of closeSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  const stillBlocked = await page.locator('.modal.show').first().isVisible().catch(() => false);
  if (stillBlocked) {
    await page.evaluate(() => {
      document.querySelectorAll('.modal.show').forEach(el => el.remove());
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page);
});

test.describe('Diagnostic — why does "iPhone 17 Pro" return zero results', () => {
  for (const variant of VARIANTS) {
    test(`variant: "${variant}"`, async ({ page }) => {
      const input = page.locator(SEARCH_INPUT);
      await input.click();
      await input.fill(variant);

      const firstResult = page.locator(RESULT_ITEMS).first();
      const gotResults = await firstResult.waitFor({ state: 'visible', timeout: 6000 })
        .then(() => true).catch(() => false);

      const count = gotResults ? await page.locator(RESULT_ITEMS).count() : 0;
      const firstText = gotResults ? await firstResult.innerText().catch(() => '') : '(none)';

      console.log(`"${variant}" -> ${count} result(s). First: ${firstText.split('\n')[0]}`);

      await test.info().attach(`variant-${variant.replace(/\s+/g, '_')}`, {
        body: JSON.stringify({ variant, count, firstText }, null, 2),
        contentType: 'application/json',
      });
    });
  }
});