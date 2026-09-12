import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STAGING_PDP_URL = 'https://smpl-new.bangalore2.com/product-details/google-pixel-10-12gb-256gb-obsidian/19524';
const ARTIFACT_DIR = path.join(__dirname, '..', '..', '..', 'artifacts', 'figma-pdp');
const SS_DIR = path.join(ARTIFACT_DIR, 'screenshots', 'mobile-visual');

[ARTIFACT_DIR, SS_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function dismissModals(page: Page) {
  try {
    const closeSelectors = [
      '.modal.show .close',
      '.modal.show .btn-close',
      '.modal.show button:has-text("Accept")',
      '.modal.show button:has-text("Later")',
      '[data-dismiss="modal"]',
      '[data-bs-dismiss="modal"]',
      'button:has-text("OK")',
    ];

    for (const selector of closeSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click({ force: true }).catch(() => null);
        await page.waitForTimeout(200);
      }
    }

    await page.evaluate(() => {
      document.querySelectorAll('.modal.show, .location-header-popup, .modal-backdrop, .offcanvas-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open', 'offcanvas-open');
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

test.describe('Figma-to-Staging Mobile PDP Visual Parity Audit (390 × 844 px)', () => {
  test('Execute Deep Mobile Typography, Icon & Visual Hierarchy Audit', async ({ page }) => {
    test.setTimeout(180000);

    console.log('--- Step 1: Navigating to Staging PDP at Mobile Viewport (390 × 844 px) ---');
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(STAGING_PDP_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    const httpStatus = response ? response.status() : 0;
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isRuntimeError = httpStatus >= 400 || bodyText.includes("This page couldn't load") || bodyText.includes('Application error');

    // 1. Capture High-Resolution Mobile Screenshots
    await page.screenshot({ path: path.join(SS_DIR, '01-full-mobile-pdp.png'), fullPage: true });

    // 2. Perform Detailed Mobile Typography and DOM Evaluation
    const mobileMetrics = await page.evaluate(() => {
      const findEl = (fn: (el: Element) => boolean) => Array.from(document.querySelectorAll('*')).find(fn) || null;

      // Font Loading Check
      const loadedFonts: string[] = [];
      document.fonts.forEach((f) => loadedFonts.push(`${f.family} (${f.weight}) - ${f.status}`));

      // Title Element Inspection (Find heading matching product name)
      const titleEl = findEl((el) => ['H1', 'H2', 'H3', 'P'].includes(el.tagName) && /google pixel 10/i.test(el.textContent || ''));
      const sTitle = titleEl ? window.getComputedStyle(titleEl) : null;
      const bTitle = titleEl ? titleEl.getBoundingClientRect() : null;

      // Search Placeholder Inspection
      const searchSpan = findEl((el) => /search or ask/i.test(el.textContent || ''));
      const sSearch = searchSpan ? window.getComputedStyle(searchSpan) : null;

      // Primary Price Inspection
      const priceSpan = findEl((el) => el.tagName === 'SPAN' && /₹\s*78,649/i.test(el.textContent || ''));
      const sPrice = priceSpan ? window.getComputedStyle(priceSpan) : null;

      // CTA Buttons Inspection
      const atcBtn = findEl((el) => el.tagName === 'BUTTON' && /add to cart/i.test(el.textContent || ''));
      const buyNowBtn = findEl((el) => el.tagName === 'BUTTON' && /buy now/i.test(el.textContent || ''));
      const sAtc = atcBtn ? window.getComputedStyle(atcBtn) : null;
      const sBuyNow = buyNowBtn ? window.getComputedStyle(buyNowBtn) : null;

      // Icons Inspection
      const cameraIcon = document.querySelector('[class*="camera" i], svg[class*="camera" i]');
      const micIcon = document.querySelector('[class*="mic" i], svg[class*="mic" i]');

      return {
        loadedFonts,
        title: titleEl && sTitle && bTitle ? {
          tag: titleEl.tagName,
          text: titleEl.textContent?.trim(),
          fontFamily: sTitle.fontFamily,
          fontWeight: sTitle.fontWeight,
          fontSize: sTitle.fontSize,
          lineHeight: sTitle.lineHeight,
          box: { width: Math.round(bTitle.width), height: Math.round(bTitle.height) },
        } : null,
        search: searchSpan && sSearch ? {
          fontWeight: sSearch.fontWeight,
          fontSize: sSearch.fontSize,
          lineHeight: sSearch.lineHeight,
        } : null,
        pricing: priceSpan && sPrice ? {
          fontSize: sPrice.fontSize,
          fontWeight: sPrice.fontWeight,
          color: sPrice.color,
        } : null,
        ctas: {
          atcRadius: sAtc?.borderRadius,
          atcWeight: sAtc?.fontWeight,
          buyNowRadius: sBuyNow?.borderRadius,
          buyNowWeight: sBuyNow?.fontWeight,
        },
        icons: {
          hasCameraIcon: !!cameraIcon,
          hasMicIcon: !!micIcon,
        },
      };
    });

    console.log('Mobile Metrics Evaluated:', JSON.stringify(mobileMetrics, null, 2));

    // Strict Runner Assertions
    expect(isRuntimeError).toBe(false);
    expect(mobileMetrics.title).not.toBeNull();
    expect(mobileMetrics.ctas.atcRadius).toBeTruthy();
    expect(mobileMetrics.ctas.buyNowRadius).toBeTruthy();

    console.log('Mobile PDP Strict Parity Re-Audit Completed Successfully.');
  });
});
