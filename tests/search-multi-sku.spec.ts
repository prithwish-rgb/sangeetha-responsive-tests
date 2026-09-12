import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';
const SEARCH_INPUT = 'input.search__home';
const RESULT_ITEMS = '.searched-list';

// category added — lets us check not just "does the brand name appear"
// but "does the TOP result actually match what a phone-brand search
// implies," which is what caught the Nothing Phone -> earbuds mismatch
const SKUS = [
  { query: 'iPhone 17 Pro', expectKeyword: 'iphone', category: 'phone' },
  { query: 'Samsung', expectKeyword: 'samsung', category: 'phone' },
  { query: 'OnePlus', expectKeyword: 'oneplus', category: 'phone' },
  { query: 'Google Pixel', expectKeyword: 'pixel', category: 'phone' },
  { query: 'Nothing Phone', expectKeyword: 'nothing', category: 'phone' },
  { query: 'Realme', expectKeyword: 'realme', category: 'phone' },
  { query: 'OPPO', expectKeyword: 'oppo', category: 'phone' },
];

// Keywords that indicate a result is an ACCESSORY, not a phone —
// used to catch cases like "Nothing Phone" search surfacing earbuds
// as the top result, which a plain keyword-match check would miss.
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

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page);
});

test.describe('Search — multi-SKU coverage, response logging, result quality', () => {

  for (const sku of SKUS) {
    test(`SKU: "${sku.query}"`, async ({ page }) => {
      const input = page.locator(SEARCH_INPUT);
      await input.click();

      const searchStart = Date.now();
      await input.fill(sku.query);
      const firstResult = page.locator(RESULT_ITEMS).first();
      const gotResults = await firstResult.waitFor({ state: 'visible', timeout: 8000 })
        .then(() => true).catch(() => false);
      const searchResponseMs = Date.now() - searchStart;

      const results = page.locator(RESULT_ITEMS);
      const resultCount = gotResults ? await results.count() : 0;

      let relevantCount = 0;
      let brokenImageCount = 0;
      const hrefsSeen = new Set<string>();
      let duplicateCount = 0;

      // category check — look at top 5 results specifically, since
      // ranking quality matters most at the top of the list
      const topN = Math.min(5, resultCount);
      let topNAccessoryCount = 0;
      let top1Title = '';
      let top1IsAccessory = false;

      for (let i = 0; i < resultCount; i++) {
        const item = results.nth(i);
        const text = (await item.innerText().catch(() => '')).toLowerCase();
        if (text.includes(sku.expectKeyword)) relevantCount++;

        const href = await item.getAttribute('href').catch(() => null);
        if (href) {
          if (hrefsSeen.has(href)) duplicateCount++;
          hrefsSeen.add(href);
        }

        const img = item.locator('img').first();
        const src = await img.getAttribute('src').catch(() => null);
        const imgClass = await img.getAttribute('class').catch(() => '');
        if (!src || imgClass?.includes('imgloading')) brokenImageCount++;

        if (i === 0) {
          top1Title = text;
          top1IsAccessory = sku.category === 'phone' && isAccessory(text);
        }
        if (i < topN && sku.category === 'phone' && isAccessory(text)) {
          topNAccessoryCount++;
        }
      }

      let navigationMs: number | null = null;
      let finalUrl: string | null = null;
      let navigationSucceeded = false;

      if (gotResults) {
        const clickStart = Date.now();
        await firstResult.click();
        navigationSucceeded = await page.waitForURL(/\/product-details\//, { timeout: 15000 })
          .then(() => true).catch(() => false);
        navigationMs = Date.now() - clickStart;
        finalUrl = page.url();
      }

      const report = {
        query: sku.query,
        searchResponseMs,
        resultCount,
        relevantCount,
        relevanceRate: resultCount > 0 ? `${Math.round((relevantCount / resultCount) * 100)}%` : 'N/A',
        top1Title,
        top1IsAccessory,
        topNAccessoryCount: `${topNAccessoryCount}/${topN}`,
        brokenImageCount,
        duplicateResults: duplicateCount,
        navigationMs,
        navigationSucceeded,
        finalUrl,
      };

      console.log(`\n[SKU: "${sku.query}"]`, JSON.stringify(report, null, 2));
      await test.info().attach(`sku-report-${sku.query.replace(/\s+/g, '_')}`, {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      });

      expect(gotResults, `No results appeared for "${sku.query}"`).toBe(true);
      expect(resultCount, `Zero results for "${sku.query}"`).toBeGreaterThan(0);
      expect(relevantCount, `None of the ${resultCount} results for "${sku.query}" mention "${sku.expectKeyword}"`).toBeGreaterThan(0);
      expect(navigationSucceeded, `Clicking first result for "${sku.query}" did not navigate to a product page`).toBe(true);

      // soft flags — logged, not hard-failed, since one occurrence needs
      // a repeat-check before being called a confirmed bug
      if (top1IsAccessory) {
        console.log(`⚠ RANKING: "${sku.query}" (a phone-brand search) surfaced an accessory as the #1 result: "${top1Title}"`);
      }
      if (brokenImageCount > 0) {
        console.log(`⚠ ${brokenImageCount}/${resultCount} result(s) for "${sku.query}" have missing/unloaded images`);
      }
      if (duplicateCount > 0) {
        console.log(`⚠ ${duplicateCount} duplicate result(s) found for "${sku.query}"`);
      }
    });
  }
});