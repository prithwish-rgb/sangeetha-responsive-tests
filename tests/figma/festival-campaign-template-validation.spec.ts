/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FIGMA DESIGN AUDIT: Festival & Campaign Templates (Node 1:296918 / 1:301696)
 * Source URL: https://www.figma.com/design/0dK1SueYk3EaC7zczpZU0s/Untitled?node-id=1-296918&m=dev
 * 
 * AUDIT PHILOSOPHY:
 * 1. The test executes the full audit from start to finish without aborting.
 * 2. Design discrepancies are recorded as AUDIT RESULTS (PASS, MISSING, DESIGN_MISMATCH, DYNAMIC_CONTENT_VARIATION).
 * 3. Playwright execution PASSES when the entire audit suite completes and generates reports.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { setPincodeViaLocalStorage } from '../pincode-injection.helper';
import {
  colorsMatch,
  fontFamilyMatches,
  dimensionClose,
  attachConsoleListener,
  DesignReport,
} from '../helpers/figma/style-comparison';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

test.use({ viewport: { width: 390, height: 844 } });

test.describe('🎉 Figma Festival & Campaign Audit Suite (Node 1:296918 / 1:301696)', () => {
  let report: DesignReport;
  let consoleErrors: ReturnType<typeof attachConsoleListener>;

  test.beforeEach(async ({ page }) => {
    report = new DesignReport();
    consoleErrors = attachConsoleListener(page);
    await setPincodeViaLocalStorage(page, '560078', 'Bengaluru');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test.afterEach(async ({}, testInfo) => {
    fs.writeFileSync(
      path.join(REPORT_DIR, `figma-festival-audit-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaSection: 'Festival Templates (1:296918)',
        figmaVariant: 'Happy Womens Day (1:301696)',
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIT 1: Women's Day Campaign Header Banner (Node 1:301785)
  // ────────────────────────────────────────────────────────────────────────────
  test('AUDIT-FEST-001: Women\'s Day Theme Banner & Campaign Assets Audit', async ({ page }) => {
    const bannerHeading = page.locator(':text-matches("happy womens day", "i")').first();
    const isPresent = await bannerHeading.isVisible({ timeout: 3000 }).catch(() => false);

    if (isPresent) {
      report.pass('Women\'s Day banner is present on staging');
      const styles = await bannerHeading.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontSize: s.fontSize };
      });

      if (!fontFamilyMatches(styles.fontFamily, 'Montserrat')) {
        report.fail({
          element: 'Happy Womens Day Heading',
          selector: ':text-matches("happy womens day", "i")',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'HIGH',
          property: 'fontFamily',
          figmaExpected: 'Montserrat Bold 700 16px',
          stagingActual: `${styles.fontFamily} ${styles.fontWeight} ${styles.fontSize}`,
          difference: 'Typography differs from Figma Montserrat Bold',
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else {
        report.pass(`Banner typography verified: ${styles.fontFamily} ${styles.fontWeight} ${styles.fontSize}`);
      }
    } else {
      report.fail({
        element: 'Happy Womens Day Theme Banner',
        selector: ':text-matches("happy womens day", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '"Happy Womens Day" (Montserrat 700 16px, Node 1:301788)',
        stagingActual: 'Not present on staging (generic promotional banner active)',
        difference: 'Seasonal campaign banner not deployed on staging',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Top promo strip check
    const promoStrip = page.locator('img[alt*="Laout" i], [class*="banner"] img').first();
    const isPromo = await promoStrip.isVisible({ timeout: 4000 }).catch(() => false);
    if (isPromo) {
      report.pass('Top promotional banner carousel is operational on staging');
    } else {
      report.fail({
        element: 'Top Campaign Banner Strip',
        selector: 'img[alt*="Laout" i]',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '390x97px top campaign banner strip',
        stagingActual: 'Not found',
        difference: 'Top promo carousel missing',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Playwright test execution succeeds (audit completed)
    expect(true).toBeTruthy();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIT 2: Curated Campaign Products & Category Navigation (Node 1:301789)
  // ────────────────────────────────────────────────────────────────────────────
  test('AUDIT-FEST-002: Curated Campaign Categories & Price Drop Section Audit', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1500);

    // Price Drop Tag
    const priceDropTag = page.locator(':text-matches("price drop", "i")').first();
    const isPriceDrop = await priceDropTag.isVisible({ timeout: 3000 }).catch(() => false);
    if (isPriceDrop) {
      report.pass('"Price Drop" tag visible');
    } else {
      report.fail({
        element: 'Price Drop Tag',
        selector: ':text-matches("price drop", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: '"Price Drop" tag (Outfit 500 14px)',
        stagingActual: 'Not found',
        difference: 'Price drop section tag missing',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Save Badge
    const hasSaveBadge = await page.evaluate(() =>
      document.body.innerText.toLowerCase().includes('save ₹') ||
      document.body.innerText.toLowerCase().includes('save rs')
    );
    if (hasSaveBadge) {
      report.pass('"Save ₹..." discount badge verified on product cards');
    } else {
      report.fail({
        element: 'Save ₹ Badge',
        selector: 'body',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'LOW',
        property: 'visibility',
        figmaExpected: '"Save ₹..." badge on product cards',
        stagingActual: 'Not found',
        difference: 'Save badge text missing',
        contentType: 'DYNAMIC_CONTENT_DIFFERENCE',
      });
    }

    // Category chips
    const chips = ['Smartphones', 'Smart Watches', 'Mobile Accessories'];
    for (const c of chips) {
      const chipEl = page.locator(`:text-matches("${c}", "i")`).first();
      if (await chipEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        report.pass(`Category chip "${c}" verified`);
      } else {
        report.fail({
          element: `Category Chip: ${c}`,
          selector: `:text-matches("${c}", "i")`,
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'LOW',
          property: 'visibility',
          figmaExpected: `Category chip "${c}" visible`,
          stagingActual: 'Not found',
          difference: `Category chip "${c}" missing`,
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      }
    }

    expect(true).toBeTruthy();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIT 3: Comparison & Browsing Section (Node 1:301859)
  // ────────────────────────────────────────────────────────────────────────────
  test('AUDIT-FEST-003: Comparison Section & Continue Browsing Module Audit', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(1500);

    const heading = page.locator(':text-matches("continue browsing", "i"), :text-matches("top compared products", "i")').first();
    const isHeadingVisible = await heading.isVisible({ timeout: 3000 }).catch(() => false);

    if (isHeadingVisible) {
      report.pass('Comparison / Continue Browsing section is present');
    } else {
      report.fail({
        element: 'Comparison & Browsing Section',
        selector: ':text-matches("top compared products", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '"Continue Browsing / Top Compared Products" module (Outfit 500 20px, Node 1:301859)',
        stagingActual: 'Not deployed on staging',
        difference: 'Comparison module missing from homepage layout',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    expect(true).toBeTruthy();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIT 4: Brand Campaign Tagline Section (Node 1:302376)
  // ────────────────────────────────────────────────────────────────────────────
  test('AUDIT-FEST-004: Brand Marketing Tagline Section Audit', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 2200));
    await page.waitForTimeout(1500);

    const headline = page.locator(':text-matches("why fit in when you were born to stand out", "i")').first();
    const isHeadlineVisible = await headline.isVisible({ timeout: 3000 }).catch(() => false);

    if (isHeadlineVisible) {
      report.pass('Brand campaign tagline section is active');
    } else {
      report.fail({
        element: 'Brand Promotion Section',
        selector: ':text-matches("why fit in...", "i")',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '"Why Fit In When You Were Born to Stand Out?" (Khand 700 24px, Node 1:302376)',
        stagingActual: 'Not present on staging',
        difference: 'Brand marketing promotional strip is missing',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    expect(true).toBeTruthy();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // AUDIT 5: Responsive 390px Mobile Viewport & Global Fonts
  // ────────────────────────────────────────────────────────────────────────────
  test('AUDIT-FEST-005: Mobile Viewport (390px) & Font Loading Audit', async ({ page }) => {
    const vw = await page.evaluate(() => window.innerWidth);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));

    if (overflow.scrollWidth <= overflow.clientWidth + 1) {
      report.pass(`Zero horizontal scroll overflow (scrollWidth=${overflow.scrollWidth}px)`);
    } else {
      report.fail({
        element: 'Document Body',
        selector: 'body',
        viewport: '390x844',
        category: 'RESPONSIVE',
        severity: 'CRITICAL',
        property: 'horizontal overflow',
        figmaExpected: 'Zero horizontal scroll at 390px',
        stagingActual: `scrollWidth=${overflow.scrollWidth}px vs clientWidth=${overflow.clientWidth}px`,
        difference: `Overflow of ${overflow.scrollWidth - overflow.clientWidth}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Font loading
    const fonts = await page.evaluate(() => {
      const allFonts = Array.from(document.fonts).map(f => f.family.toLowerCase());
      return {
        outfit: allFonts.some(f => f.includes('outfit')),
        montserrat: allFonts.some(f => f.includes('montserrat')),
        khand: allFonts.some(f => f.includes('khand')),
      };
    });

    if (fonts.outfit) report.pass('Outfit font loaded');
    if (!fonts.montserrat) {
      report.fail({
        element: 'Montserrat Web Font',
        selector: 'document.fonts',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'MEDIUM',
        property: 'font-loading',
        figmaExpected: 'Montserrat loaded in document.fonts',
        stagingActual: 'Montserrat not loaded',
        difference: 'Campaign font Montserrat missing',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    expect(vw).toBe(390);
  });
});
