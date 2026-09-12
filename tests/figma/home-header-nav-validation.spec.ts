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

test.describe('🎨 Figma Module 1: Header, Navigation & Location Bar (Node 4681:131483)', () => {
  let report: DesignReport;
  let consoleErrors: ReturnType<typeof attachConsoleListener>;

  test.beforeEach(async ({ page }) => {
    report = new DesignReport();
    consoleErrors = attachConsoleListener(page);
    await setPincodeViaLocalStorage(page, '560078', 'Bengaluru');
    await page.goto(STAGING_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test.afterEach(async ({}, testInfo) => {
    fs.writeFileSync(
      path.join(REPORT_DIR, `figma-header-report-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaNode: '4681:131483',
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  test('TC-HDR-001: Header container renders without JavaScript runtime errors', async ({ page }) => {
    const resp = await page.goto(STAGING_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(resp?.status()).toBe(200);
    report.pass('HTTP 200 OK');

    const pageErrors = consoleErrors.filter(e => e.type === 'pageerror');
    if (pageErrors.length > 0) {
      report.fail({
        element: 'Header Container',
        selector: 'window',
        viewport: '390x844',
        category: 'RUNTIME',
        severity: 'CRITICAL',
        property: 'JS errors',
        figmaExpected: '0 runtime errors',
        stagingActual: `${pageErrors.length} errors`,
        difference: pageErrors.map(e => e.text).join('; '),
      });
    } else {
      report.pass('Zero runtime JS errors on Header load');
    }
  });

  test('TC-HDR-002: Sangeetha Brand Logo matches Figma node 4681:131496', async ({ page }) => {
    const logo = page.locator('img[alt="Sangeetha logo"], img[src*="logo_mobile"]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
    report.pass('Brand Logo is visible');

    const logoBox = await logo.boundingBox();
    if (logoBox) {
      expect(logoBox.width, 'Logo width should be greater than 60px').toBeGreaterThan(60);
      expect(logoBox.height, 'Logo height should be greater than 20px').toBeGreaterThan(20);
      report.pass(`Logo rendered with bounding box: ${Math.round(logoBox.width)}x${Math.round(logoBox.height)}px`);
    }
  });

  test('TC-HDR-003: Cart button matches Figma node 4681:131512 (40x40px, 12px radius)', async ({ page }) => {
    const cartData = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => {
        const r = b.getBoundingClientRect();
        return r.top < 120 && r.width > 28 && r.width < 52 && Math.abs(r.width - r.height) < 8;
      });
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      const s = window.getComputedStyle(btn);
      return {
        width: r.width,
        height: r.height,
        borderRadius: s.borderRadius,
        hasSvg: !!btn.querySelector('svg'),
      };
    });

    expect(cartData, 'Cart button must exist in header').not.toBeNull();
    report.pass('Cart button found in header area');

    if (cartData) {
      const wCheck = dimensionClose(cartData.width, FIGMA_TOKENS.header.cartButtonSize.width, TOLERANCE.pixelDimensions);
      if (!wCheck.pass) {
        report.fail({
          element: 'Cart Button',
          selector: 'header button',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'LOW',
          property: 'width',
          figmaExpected: `${FIGMA_TOKENS.header.cartButtonSize.width}px`,
          stagingActual: `${Math.round(cartData.width)}px`,
          difference: `Diff: ${wCheck.diff}px`,
        });
      } else {
        report.pass(`Cart button width matches Figma: ${Math.round(cartData.width)}px`);
      }

      const hCheck = dimensionClose(cartData.height, FIGMA_TOKENS.header.cartButtonSize.height, TOLERANCE.pixelDimensions);
      if (!hCheck.pass) {
        report.fail({
          element: 'Cart Button',
          selector: 'header button',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'LOW',
          property: 'height',
          figmaExpected: `${FIGMA_TOKENS.header.cartButtonSize.height}px`,
          stagingActual: `${Math.round(cartData.height)}px`,
          difference: `Diff: ${hCheck.diff}px`,
        });
      } else {
        report.pass(`Cart button height matches Figma: ${Math.round(cartData.height)}px`);
      }

      const brNum = parseFloat(cartData.borderRadius);
      const brCheck = dimensionClose(brNum, FIGMA_TOKENS.header.cartButtonRadius, TOLERANCE.pixelDimensions);
      if (!brCheck.pass) {
        report.fail({
          element: 'Cart Button',
          selector: 'header button',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'LOW',
          property: 'borderRadius',
          figmaExpected: `${FIGMA_TOKENS.header.cartButtonRadius}px`,
          stagingActual: cartData.borderRadius,
          difference: `Diff: ${brCheck.diff}px`,
        });
      } else {
        report.pass(`Cart button border-radius matches Figma: ${cartData.borderRadius}`);
      }
    }
  });

  test('TC-HDR-004: Delivery Location Bar matches Figma node 4681:131523', async ({ page }) => {
    const locIcon = page.locator('img[alt="location"], img[src*="location"]').first();
    await expect(locIcon).toBeVisible({ timeout: 10000 });
    report.pass('Location icon is present');

    const locText = await page.evaluate(() => {
      const img = document.querySelector('img[alt="location"]');
      if (!img || !img.parentElement) return null;
      const textNode = img.parentElement.querySelector('span, p, div');
      if (!textNode) return null;
      const s = window.getComputedStyle(textNode);
      return { text: textNode.innerText.trim(), fontFamily: s.fontFamily, fontSize: s.fontSize };
    });

    if (locText?.fontFamily) {
      if (!fontFamilyMatches(locText.fontFamily, FIGMA_TOKENS.locationBar.fontFamily)) {
        report.fail({
          element: 'Location text',
          selector: 'header location text',
          viewport: '390x844',
          category: 'DESIGN',
          severity: 'MEDIUM',
          property: 'fontFamily',
          figmaExpected: FIGMA_TOKENS.locationBar.fontFamily,
          stagingActual: locText.fontFamily,
          difference: 'Location text font family mismatch',
        });
      } else {
        report.pass(`Location text uses ${FIGMA_TOKENS.locationBar.fontFamily} font`);
      }
    }
  });
});
