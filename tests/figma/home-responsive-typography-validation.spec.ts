import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { FIGMA_TOKENS, STAGING_BASE_URL } from '../helpers/figma/figma-home-tokens';
import {
  fontFamilyMatches,
  attachConsoleListener,
  DesignReport,
} from '../helpers/figma/style-comparison';

import { setPincodeViaLocalStorage } from '../pincode-injection.helper';

const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

test.use({ viewport: { width: 390, height: 844 } });

test.describe('🎨 Figma Module 4: Responsive Viewport & Global Typography', () => {
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
      path.join(REPORT_DIR, `figma-responsive-report-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaNode: '4681:131479',
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  test('TC-RSP-001: Mobile viewport width (390px) renders without horizontal scroll overflow', async ({ page }) => {
    const vw = await page.evaluate(() => window.innerWidth);
    expect(vw, 'Viewport width should be 390px').toBe(390);
    report.pass(`Viewport width verified: ${vw}px`);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));

    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      report.fail({
        element: 'Document Body',
        selector: 'body',
        viewport: '390x844',
        category: 'RESPONSIVE',
        severity: 'HIGH',
        property: 'horizontal overflow',
        figmaExpected: 'Zero horizontal scroll at 390px',
        stagingActual: `scrollWidth=${overflow.scrollWidth}px vs clientWidth=${overflow.clientWidth}px`,
        difference: `Horizontal overflow of ${overflow.scrollWidth - overflow.clientWidth}px`,
      });
    } else {
      report.pass(`No horizontal overflow (scrollWidth: ${overflow.scrollWidth}px)`);
    }
  });

  test('TC-RSP-002: Primary font "Outfit" is loaded and applied across document', async ({ page }) => {
    const isOutfitLoaded = await page.evaluate(() =>
      Array.from(document.fonts).some(f => f.family.toLowerCase().includes('outfit'))
    );

    if (isOutfitLoaded) {
      report.pass('Outfit font family loaded in document.fonts');
    } else {
      report.fail({
        element: 'document.fonts',
        selector: 'document',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'HIGH',
        property: 'font-loading',
        figmaExpected: 'Outfit font loaded in browser',
        stagingActual: 'Outfit not found in document.fonts',
        difference: 'Primary Figma font Outfit missing from document.fonts API',
      });
    }

    const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    if (!fontFamilyMatches(bodyFont, 'Outfit')) {
      report.fail({
        element: 'Body Font Family',
        selector: 'body',
        viewport: '390x844',
        category: 'DESIGN',
        severity: 'MEDIUM',
        property: 'fontFamily',
        figmaExpected: 'Outfit',
        stagingActual: bodyFont,
        difference: 'Body computed font does not begin with Outfit',
      });
    } else {
      report.pass(`Body computed font-family: ${bodyFont}`);
    }
  });

  test('TC-RSP-003: Above-the-fold content density & visual snapshot capture', async ({ page }) => {
    const ssPath = path.join(REPORT_DIR, `figma-home-module4-screenshot-${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: false, clip: { x: 0, y: 0, width: 390, height: 844 } });
    report.pass(`Screenshot captured: ${ssPath}`);

    const elementCount = await page.evaluate(() =>
      document.elementsFromPoint(195, 200).filter(el => el.tagName !== 'HTML' && el.tagName !== 'BODY').length
    );

    expect(elementCount, 'Above the fold must not be blank').toBeGreaterThanOrEqual(2);
    report.pass(`Above the fold has ${elementCount} interactive elements at viewport center`);
  });
});
