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

test.describe('🎨 Figma Module 2: Search Component & Live Overlay Interaction (Node 4681:131532)', () => {
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
      path.join(REPORT_DIR, `figma-search-report-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaNode: '4681:131532',
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  test('TC-SRCH-001: Search pill container matches Figma styling (#FFFFFF bg, 12px radius)', async ({ page }) => {
    const searchPill = page.locator('div.cursor-pointer:has(img[alt="sparkle"]), div:has(img[alt="camera"])').first();
    expect(await searchPill.isVisible({ timeout: 5000 })).toBeTruthy();
    report.pass('Search pill is visible on homepage');

    const styles = await page.evaluate(() => {
      const el = document.querySelector('div.cursor-pointer') || document.querySelector('img[alt="sparkle"]')?.parentElement?.parentElement;
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        backgroundColor: s.backgroundColor,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
      };
    });

    if (styles) {
      if (!colorsMatch(styles.backgroundColor, FIGMA_TOKENS.colors.white)) {
        report.fail({
          element: 'Search Pill Container',
          selector: 'div.cursor-pointer',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'HIGH',
          property: 'backgroundColor',
          figmaExpected: FIGMA_TOKENS.colors.white,
          stagingActual: styles.backgroundColor,
          difference: 'Search pill background is not white',
        });
      } else {
        report.pass(`Search pill background is white: ${styles.backgroundColor}`);
      }

      const brNum = parseFloat(styles.borderRadius);
      const brCheck = dimensionClose(brNum, FIGMA_TOKENS.searchBar.borderRadius, TOLERANCE.pixelDimensions);
      if (!brCheck.pass) {
        report.fail({
          element: 'Search Pill Container',
          selector: 'div.cursor-pointer',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'LOW',
          property: 'borderRadius',
          figmaExpected: `${FIGMA_TOKENS.searchBar.borderRadius}px`,
          stagingActual: styles.borderRadius,
          difference: `Diff: ${brCheck.diff}px`,
        });
      } else {
        report.pass(`Search pill border-radius matches Figma: ${styles.borderRadius}`);
      }
    }
  });

  test('TC-SRCH-002: Search pill includes all 3 Figma icon assets (Sparkle, Camera, Mic)', async ({ page }) => {
    const sparkleVisible = await isVisible(page, 'img[alt="sparkle"]');
    const cameraVisible  = await isVisible(page, 'img[alt="camera"]');
    const micVisible     = await isVisible(page, 'img[alt="mic"], img[alt*="micro" i]');

    expect(sparkleVisible, 'Sparkle/Search icon must be visible in search pill').toBeTruthy();
    report.pass('Sparkle icon present (Figma node 4681:131534)');

    expect(cameraVisible, 'Camera icon must be visible in search pill').toBeTruthy();
    report.pass('Camera icon present (Figma node 4681:131545)');

    expect(micVisible, 'Microphone icon must be visible in search pill').toBeTruthy();
    report.pass('Microphone icon present (Figma node 4681:131546)');
  });

  test('TC-SRCH-003: Clicking search pill opens live Search Drawer Overlay', async ({ page }) => {
    // Click search trigger pill
    await page.evaluate(() => {
      const pill = document.querySelector('div.cursor-pointer') as HTMLElement;
      if (pill) pill.click();
    });
    await page.waitForTimeout(1500);

    // Verify search drawer input appears
    const searchInput = page.locator('input[placeholder*="looking for" i], input[type="text"]').first();
    const isInputVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isInputVisible, 'Search input field must appear in overlay').toBeTruthy();
    report.pass('Search drawer opened with active text input');
  });

  test('TC-SRCH-004: Typing query produces live suggestion chips and product cards', async ({ page }) => {
    // Open search overlay
    await page.evaluate(() => {
      const pill = document.querySelector('div.cursor-pointer') as HTMLElement;
      if (pill) pill.click();
    });
    await page.waitForTimeout(1500);

    const searchInput = page.locator('input[placeholder*="looking for" i], input[type="text"]').first();
    await searchInput.fill('iPhone 16');
    await page.waitForTimeout(3000);

    // Check for suggestions
    const suggestionCount = await page.locator(':text-matches("in Mobiles", "i")').count();
    report.pass(`Found ${suggestionCount} auto-complete suggestions for "iPhone 16"`);

    // Check for product results
    const productCount = await page.locator(':text-matches("in Smartphones", "i"), :text-matches("Apple iPhone 16", "i")').count();
    report.pass(`Found ${productCount} product matches in search drawer`);

    expect(suggestionCount + productCount, 'Search must return results for "iPhone 16"').toBeGreaterThan(0);
  });

  test('TC-SRCH-005: Auto-complete suggestion thumbnails must NOT be broken (naturalWidth > 0)', async ({ page }) => {
    // Open search overlay & type query
    await page.evaluate(() => {
      const pill = document.querySelector('div.cursor-pointer') as HTMLElement;
      if (pill) pill.click();
    });
    await page.waitForTimeout(1500);

    const searchInput = page.locator('input[placeholder*="looking for" i], input[type="text"]').first();
    await searchInput.fill('iPhone 16');
    await page.waitForTimeout(3500);

    // Audit all rendered suggestion images
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const broken: Array<{ alt: string; src: string; parentText: string }> = [];
      imgs.forEach(img => {
        // Exclude system icons like camera, mic, sparkle, location
        const isIcon = ['camera', 'mic', 'sparkle', 'location', 'close'].some(s => (img.alt || '').toLowerCase().includes(s));
        if (!isIcon && img.src && (img.src.includes('gumlet') || img.src.includes('product_img') || img.src.includes('brands'))) {
          if (img.complete && img.naturalWidth === 0) {
            broken.push({
              alt: img.alt || 'No alt text',
              src: img.src,
              parentText: img.parentElement?.innerText?.substring(0, 50)?.replace(/\n/g, ' ') || '',
            });
          }
        }
      });
      return broken;
    });

    if (brokenImages.length > 0) {
      brokenImages.forEach(bi => {
        report.fail({
          element: `Suggestion Thumbnail: ${bi.alt}`,
          selector: `img[src="${bi.src.substring(0, 50)}..."]`,
          viewport: '390x844',
          category: 'VISUAL',
          severity: 'HIGH',
          property: 'naturalWidth',
          figmaExpected: 'Valid product thumbnail image',
          stagingActual: `Broken Image (naturalWidth=0, 404 on CDN)`,
          difference: `Failed to load: ${bi.src}`,
          contentType: 'DYNAMIC_CONTENT_DIFFERENCE',
        });
      });
      console.warn(`⚠️ Detected ${brokenImages.length} broken thumbnail images in search suggestions!`);
    } else {
      report.pass('All suggestion thumbnail images rendered successfully with naturalWidth > 0');
    }
  });
});
