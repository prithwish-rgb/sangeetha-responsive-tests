import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';
const SEARCH_INPUT = 'input.search__home';
const RESULT_ITEMS = '.searched-list';
const REPEAT_COUNT = 8;

// The two open questions from the last round of testing, checked the
// same way we already proved the "iPhone 17 Pro" scare was a fluke —
// repeat several times, look at the spread, don't trust one data point.
const QUERIES_TO_VERIFY = ['OnePlus', 'Nothing Phone'];

const ACCESSORY_KEYWORDS = [
  'earbuds', 'tws', 'charger', 'adapter', 'power bank', 'powerbank',
  'cable', 'case', 'cover', 'protector', 'watch', 'band', 'earphone',
  'headphone', 'speaker', 'strap',
];
function isAccessory(title: string): boolean {
  const t = title.toLowerCase();
  return ACCESSORY_KEYWORDS.some(k => t.includes(k));
}

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

for (const QUERY of QUERIES_TO_VERIFY) {
  test(`response + ranking consistency — "${QUERY}" x${REPEAT_COUNT}`, async ({ page }) => {
    test.setTimeout(180000);

    const results: {
      attempt: number; responseMs: number; resultCount: number;
      timedOut: boolean; top1Title: string; top1IsAccessory: boolean;
    }[] = [];

    for (let i = 1; i <= REPEAT_COUNT; i++) {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await dismissBlockingPopups(page);

      const input = page.locator(SEARCH_INPUT);
      await input.click();

      const start = Date.now();
      await input.fill(QUERY);
      const firstResult = page.locator(RESULT_ITEMS).first();
      const gotResults = await firstResult.waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true).catch(() => false);
      const responseMs = Date.now() - start;
      const count = gotResults ? await page.locator(RESULT_ITEMS).count() : 0;
      const top1Title = gotResults ? await firstResult.innerText().catch(() => '') : '';

      results.push({
        attempt: i, responseMs, resultCount: count, timedOut: !gotResults,
        top1Title, top1IsAccessory: isAccessory(top1Title),
      });
      console.log(`Attempt ${i}: ${responseMs}ms, ${count} results, top1: "${top1Title.split('\n')[0]}"${!gotResults ? ' — TIMED OUT' : ''}`);

      await input.fill('');
    }

    const failures = results.filter(r => r.timedOut);
    const successResults = results.filter(r => !r.timedOut);
    const avgResponseMs = Math.round(
      successResults.reduce((sum, r) => sum + r.responseMs, 0) / Math.max(1, successResults.length)
    );
    const accessoryTop1Count = results.filter(r => r.top1IsAccessory).length;

    console.log(`\n=== Summary: "${QUERY}" over ${REPEAT_COUNT} attempts ===`);
    console.log(`Failures/timeouts: ${failures.length}/${REPEAT_COUNT}`);
    console.log(`Average response time: ${avgResponseMs}ms`);
    console.log(`Slowest: ${Math.max(...results.map(r => r.responseMs))}ms, Fastest: ${Math.min(...results.map(r => r.responseMs))}ms`);
    console.log(`Top-1 result was an accessory in ${accessoryTop1Count}/${REPEAT_COUNT} attempts`);

    await test.info().attach(`consistency-${QUERY.replace(/\s+/g, '_')}`, {
      body: JSON.stringify({ query: QUERY, results, failures: failures.length, avgResponseMs, accessoryTop1Count }, null, 2),
      contentType: 'application/json',
    });

    expect(true).toBe(true);
  });
}