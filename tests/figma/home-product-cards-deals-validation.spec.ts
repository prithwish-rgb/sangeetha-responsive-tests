import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { FIGMA_TOKENS, STAGING_BASE_URL, TOLERANCE } from '../helpers/figma/figma-home-tokens';
import {
  colorsMatch,
  fontFamilyMatches,
  dimensionClose,
  isVisible,
  attachConsoleListener,
  DesignReport,
} from '../helpers/figma/style-comparison';

import { setPincodeViaLocalStorage } from '../pincode-injection.helper';

const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

test.use({ viewport: { width: 390, height: 844 } });

test.describe('🎨 Figma Module 3: Product Cards, Deals & Banner Sections', () => {
  let report: DesignReport;
  let consoleErrors: ReturnType<typeof attachConsoleListener>;

  test.beforeEach(async ({ page }) => {
    report = new DesignReport();
    consoleErrors = attachConsoleListener(page);
    await setPincodeViaLocalStorage(page, '560078', 'Bengaluru');
    await page.goto(STAGING_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  });

  test.afterEach(async ({}, testInfo) => {
    fs.writeFileSync(
      path.join(REPORT_DIR, `figma-products-report-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaNode: '4681:131568',
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  test('TC-PRD-001: Horizontal product cards section renders with links to product-details', async ({ page }) => {
    // Scroll down slightly to trigger lazy-loaded sections
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1500);

    const productLinks = page.locator('a[href*="product-details"], a[href*="product"]');
    const count = await productLinks.count();

    expect(count, 'Should render multiple product cards on the homepage').toBeGreaterThan(0);
    report.pass(`Found ${count} product detail card links on mobile home`);
  });

  test('TC-PRD-002: Product cards use Outfit font and display Save Badge (Figma node 4681:131568)', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1500);

    const firstCard = page.locator('a[href*="product-details"]').first();
    if (await firstCard.isVisible().catch(() => false)) {
      const cardStyles = await firstCard.evaluate((el) => {
        const title = el.querySelector('p, span, h2, h3, div');
        const s = title ? window.getComputedStyle(title) : null;
        return {
          fontFamily: s ? s.fontFamily : '',
          fontWeight: s ? s.fontWeight : '',
        };
      });

      if (cardStyles.fontFamily && !fontFamilyMatches(cardStyles.fontFamily, 'Outfit')) {
        report.fail({
          element: 'Product Card Title',
          selector: 'a[href*="product-details"] p',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'MEDIUM',
          property: 'fontFamily',
          figmaExpected: 'Outfit',
          stagingActual: cardStyles.fontFamily,
          difference: 'Product card title not using Outfit font',
        });
      } else {
        report.pass(`Product card title uses Outfit font: ${cardStyles.fontFamily}`);
      }
    }

    // Check for "Save ₹..." badge presence on cards
    const hasSaveBadge = await page.evaluate(() =>
      document.body.innerText.toLowerCase().includes('save ₹') ||
      document.body.innerText.toLowerCase().includes('save rs')
    );
    if (hasSaveBadge) {
      report.pass('Price Drop "Save ₹..." badge is present on product cards');
    } else {
      report.fail({
        element: 'Price Drop Save Badge',
        selector: 'body',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'LOW',
        property: 'visibility',
        figmaExpected: '"Save ₹X,XXX" badge on product cards',
        stagingActual: 'badge text not found',
        difference: 'Save badge text missing or formatted differently',
      });
    }
  });

  test('TC-PRD-003: Category icon navigation chips are present on Home', async ({ page }) => {
    const categoryChips = page.locator(':text-matches("Smartphones", "i"), :text-matches("Smart Watches", "i"), :text-matches("Smart gadgets", "i")');
    const chipCount = await categoryChips.count();

    expect(chipCount, 'Category navigation chips must be visible').toBeGreaterThan(0);
    report.pass(`Found ${chipCount} category navigation elements (Smartphones, Smart Watches, etc.)`);
  });

  test('TC-PRD-004: "Deal of the Day" section verification (Figma node EL-562144ed)', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(1500);

    const dealText = page.locator(':text-matches("deal of the day", "i")').first();
    const isDealVisible = await dealText.isVisible({ timeout: 4000 }).catch(() => false);

    if (!isDealVisible) {
      report.fail({
        element: 'Deal of the Day Section',
        selector: ':text-matches("deal of the day", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: '"Deal of the day" section (Outfit 32px, Figma EL-562144ed)',
        stagingActual: 'Section heading not found',
        difference: 'Deal of the day section is missing from current staging home layout',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass('"Deal of the day" heading is visible');
    }
  });

  test('TC-PRD-005: "Download the Sangeetha App" banner verification (Figma node EL-9704b675)', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(1500);

    const dlBanner = page.locator(':text-matches("download.*sangeetha.*app", "i"), :text-matches("download.*app", "i")').first();
    const isDlVisible = await dlBanner.isVisible({ timeout: 4000 }).catch(() => false);

    if (!isDlVisible) {
      report.fail({
        element: 'App Download Banner',
        selector: ':text-matches("download the sangeetha app", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: '"Download the Sangeetha App" banner (Figma EL-9704b675, gradient bg, 192px height)',
        stagingActual: 'Banner not found on staging',
        difference: 'App download banner is not implemented on staging homepage',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass('"Download the Sangeetha App" banner is visible');
    }
  });
});
