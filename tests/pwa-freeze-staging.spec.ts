import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STAGING_URL = process.env.STAGING_URL || 'https://stage-web.sangeethamobiles.in/';

interface ViewportReading {
  width: number;
  height: number;
  overflowPx: number;
  jsResponseTimeMs: number;
  frozen: boolean;
  mobileHeaderVisible: boolean;
  desktopHeaderVisible: boolean;
  searchBarClickable: boolean;
  pincodeClickable: boolean;
}

test.describe('PWA Freeze & Responsive Breakpoint Audit (~700px)', () => {
  test.setTimeout(180_000);

  test('Audit PWA Freeze & Responsiveness around 700px viewport on Staging', async ({ page }) => {
    console.log('================================================================');
    console.log(`RUNNING STANDARDIZED PWA FREEZE AUDIT AROUND 700px HORIZONTAL MARK`);
    console.log(`Target URL: ${STAGING_URL}`);
    console.log('================================================================\n');

    const report: {
      targetUrl: string;
      sweepRange: string;
      timestamp: string;
      freezeDetected: boolean;
      worstOverflow: { width: number; overflow: number };
      readings: ViewportReading[];
      freezePoints: number[];
      observations: string[];
    } = {
      targetUrl: STAGING_URL,
      sweepRange: '650px to 750px (step: 5px)',
      timestamp: new Date().toISOString(),
      freezeDetected: false,
      worstOverflow: { width: 700, overflow: 0 },
      readings: [],
      freezePoints: [],
      observations: []
    };

    console.log('[1/4] Loading staging site...');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const MIN_WIDTH = 650;
    const MAX_WIDTH = 750;
    const STEP = 5;

    console.log(`[2/4] Executing fine viewport sweep from ${MIN_WIDTH}px to ${MAX_WIDTH}px...`);

    for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += STEP) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(150);

      // Measure JS response time (detect if main thread freezes/lags)
      const startTime = Date.now();
      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        
        const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
        const clientWidth = docEl.clientWidth;
        const overflow = scrollWidth - clientWidth;

        const mobileHeader = document.querySelector('.md\\:hidden, div[class*="mobile"]');
        const desktopHeader = document.querySelector('.hidden.md\\:block, header input, .live-search__input');

        const searchInput = document.querySelector('input[placeholder*="Search" i], input[type="search"]') || Array.from(document.querySelectorAll('span')).find(el => /search/i.test(el.textContent || ''));
        const pincodeInput = document.querySelector('.delivery_web__inputBox, .delivery_web__input') || Array.from(document.querySelectorAll('span, div')).find(el => /location/i.test(el.textContent || ''));

        return {
          overflowPx: Math.max(0, overflow),
          mobileHeaderVisible: !!mobileHeader && window.getComputedStyle(mobileHeader).display !== 'none',
          desktopHeaderVisible: !!desktopHeader && window.getComputedStyle(desktopHeader).display !== 'none',
          searchPresent: !!searchInput,
          pincodePresent: !!pincodeInput
        };
      });

      const jsResponseTimeMs = Date.now() - startTime;
      const isFrozen = jsResponseTimeMs > 500;

      if (isFrozen) {
        report.freezeDetected = true;
        report.freezePoints.push(w);
      }

      if (metrics.overflowPx > report.worstOverflow.overflow) {
        report.worstOverflow = { width: w, overflow: metrics.overflowPx };
      }

      const reading: ViewportReading = {
        width: w,
        height: 900,
        overflowPx: metrics.overflowPx,
        jsResponseTimeMs,
        frozen: isFrozen,
        mobileHeaderVisible: metrics.mobileHeaderVisible,
        desktopHeaderVisible: metrics.desktopHeaderVisible,
        searchBarClickable: metrics.searchPresent,
        pincodeClickable: metrics.pincodePresent
      };

      report.readings.push(reading);
      console.log(`  Width: ${w}px | Overflow: ${metrics.overflowPx}px | JS Delay: ${jsResponseTimeMs}ms | Frozen: ${isFrozen}`);
    }

    // [3/4] Capture screenshots at key points around 700px
    console.log('\n[3/4] Capturing responsive screenshots around ~700px...');
    fs.mkdirSync('screenshots', { recursive: true });

    const keyWidths = [680, 700, 720, 768];
    for (const kw of keyWidths) {
      await page.setViewportSize({ width: kw, height: 900 });
      await page.waitForTimeout(300);
      const screenshotPath = `screenshots/pwa-freeze-${kw}px.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Saved screenshot for ${kw}px -> ${screenshotPath}`);
    }

    // [4/4] Analyze Findings
    if (report.freezePoints.length > 0) {
      report.observations.push(`PWA Freeze / Thread Lock detected at widths: ${report.freezePoints.join(', ')}px (Response time > 500ms).`);
    } else {
      report.observations.push('No hard main-thread freeze (>500ms delay) detected between 650px and 750px.');
    }

    if (report.worstOverflow.overflow > 5) {
      report.observations.push(`Horizontal Layout Overflow detected: ${report.worstOverflow.overflow}px overflow at ${report.worstOverflow.width}px width.`);
    } else {
      report.observations.push('No severe horizontal scrollbar overflow detected in the 650px-750px range.');
    }

    // Check header transition around 700px
    const reading700 = report.readings.find(r => r.width === 700);
    if (reading700) {
      report.observations.push(`At 700px horizontal mark: Mobile Header Visible = ${reading700.mobileHeaderVisible}, Desktop Header Visible = ${reading700.desktopHeaderVisible}.`);
    }

    console.log('\n================================================================');
    console.log('PWA FREEZE AUDIT SUMMARY REPORT (~700px)');
    console.log('================================================================');
    console.log(JSON.stringify(report, null, 2));

    fs.mkdirSync('reports', { recursive: true });
    const reportPath = `reports/pwa-freeze-report-700px-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report written to ${reportPath}`);

    expect(report.freezeDetected).toBe(false);
  });
});
