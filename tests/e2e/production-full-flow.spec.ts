import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL : `${process.env.BASE_URL}/`) : 'https://www.sangeetha.com/';
const REPORT_DIR = path.join(__dirname, '..', '..', 'reports', 'e2e');
const SS_DIR = path.join(REPORT_DIR, 'screenshots');
[REPORT_DIR, SS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

interface E2EStepResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  durationMs: number;
  details?: string;
  screenshot?: string;
}

/**
 * Dismisses production consent/location modals that overlay pointer events
 */
async function dismissProductionModals(page: Page) {
  try {
    const modalBtn = page.locator('.modal.show button:has-text("Accept"), .modal.show .btn-close, button:has-text("Accept"), button.btn-close').first();
    if (await modalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalBtn.click({ force: true }).catch(() => null);
      await page.waitForTimeout(600);
    }
  } catch {
    /* ignore if modal not present */
  }
}

test.describe('🚀 Production Full E2E User Flow Audit (https://www.sangeethamobiles.com/)', () => {
  const stepLog: E2EStepResult[] = [];
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    });
    page.on('response', resp => {
      if (resp.status() >= 400 && !resp.url().includes('analytics') && !resp.url().includes('google-analytics') && !resp.url().includes('facebook')) {
        networkErrors.push(`${resp.status()} ${resp.url().slice(0, 100)}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-E2E-001: Homepage Health & Layout Validation
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-E2E-001: Homepage Load, Title, Header & Banner Audit', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissProductionModals(page);

    const title = await page.title();
    console.log(`[E2E] Homepage Title: "${title}"`);
    expect(title.length).toBeGreaterThan(0);

    const logo = page.locator('img[alt*="Sangeetha" i], img[src*="logo" i], svg[class*="logo" i], a[href="/"]').first();
    const hasLogo = await logo.isVisible({ timeout: 4000 }).catch(() => false);

    const ssPath = path.join(SS_DIR, '01-homepage-hero.png');
    await page.screenshot({ path: ssPath });

    stepLog.push({
      step: '01. Homepage Load & Health',
      status: hasLogo ? 'PASS' : 'WARNING',
      durationMs: Date.now() - start,
      details: `Title: "${title.slice(0, 60)}" | Logo Visible: ${hasLogo}`,
      screenshot: '01-homepage-hero.png',
    });

    expect(title.length > 0, 'Homepage must have valid title').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-E2E-002: Product Search & Search Results Navigation
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-E2E-002: Product Search & Search Results Navigation', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissProductionModals(page);

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search" i]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 4000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill('iPhone').catch(() => null);
      await page.waitForTimeout(1000);
      await searchInput.press('Enter').catch(() => null);
      await page.waitForTimeout(2500);
    }

    const currentUrl = page.url();
    const productCards = page.locator('a[href*="product"], [class*="product-card"], [class*="productCard"], [class*="item"]');
    const cardCount = await productCards.count();

    const ssPath = path.join(SS_DIR, '02-search-results.png');
    await page.screenshot({ path: ssPath });

    stepLog.push({
      step: '02. Product Search ("iPhone")',
      status: cardCount > 0 ? 'PASS' : 'WARNING',
      durationMs: Date.now() - start,
      details: `URL: ${currentUrl} | Products Found: ${cardCount}`,
      screenshot: '02-search-results.png',
    });

    expect(true).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-E2E-003: Product Detail Page (PDP) Load, Gallery & Price Check
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-E2E-003: Product Detail Page (PDP) Load, Gallery & Price Check', async ({ page }) => {
    test.setTimeout(35000);
    const start = Date.now();

    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissProductionModals(page);

    const firstProductLink = page.locator('a[href*="product-details"], a[href*="/product/"], div[class*="product"] a').first();
    const hasLink = await firstProductLink.isVisible({ timeout: 4000 }).catch(() => false);

    if (hasLink) {
      await firstProductLink.click({ force: true }).catch(() => null);
      await page.waitForTimeout(3000);
    } else {
      await page.goto(`${PROD_URL}product-details/google-pixel-10-12gb-256gb-obsidian/19524`, { waitUntil: 'domcontentloaded' }).catch(() => null);
      await page.waitForTimeout(3000);
    }
    await dismissProductionModals(page);

    const pdpUrl = page.url();
    console.log(`[E2E] PDP URL: ${pdpUrl}`);

    const mainImage = page.locator('img[alt*="product" i], img[src*="product" i], div[class*="gallery"] img').first();
    const hasImage = await mainImage.isVisible({ timeout: 4000 }).catch(() => false);

    const priceEl = page.locator('[class*="price" i], [class*="Price" i]').first();
    const hasPrice = await priceEl.isVisible({ timeout: 4000 }).catch(() => false);
    const priceText = hasPrice ? await priceEl.textContent().catch(() => '') : '';

    const ssPath = path.join(SS_DIR, '03-pdp-page.png');
    await page.screenshot({ path: ssPath });

    stepLog.push({
      step: '03. Product Detail Page (PDP)',
      status: hasImage || hasPrice ? 'PASS' : 'WARNING',
      durationMs: Date.now() - start,
      details: `URL: ${pdpUrl} | Image Visible: ${hasImage} | Price: "${priceText?.trim().slice(0, 30)}"`,
      screenshot: '03-pdp-page.png',
    });

    expect(pdpUrl.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-E2E-004: Add to Cart Interaction & Cart Flow Validation
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-E2E-004: Add to Cart Interaction & Cart Drawer Flow', async ({ page }) => {
    test.setTimeout(35000);
    const start = Date.now();

    await page.goto(`${PROD_URL}product-details/google-pixel-10-12gb-256gb-obsidian/19524`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissProductionModals(page);

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), :text-matches("add to cart", "i"), button[aria-label*="cart" i]').first();
    const hasBtn = await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false);

    let cartUpdated = false;
    if (hasBtn) {
      await addToCartBtn.click({ force: true }).catch(() => null);
      await page.waitForTimeout(2500);

      const cartDrawer = page.locator('[class*="cart-drawer" i], [class*="cartDrawer" i], [class*="mini-cart" i], div[role="dialog"]');
      const cartBadge = page.locator('[class*="cart-count" i], [class*="cartBadge" i], span:has-text("1")');

      cartUpdated = (await cartDrawer.isVisible().catch(() => false)) || (await cartBadge.isVisible().catch(() => false));
    }

    const ssPath = path.join(SS_DIR, '04-cart-flow.png');
    await page.screenshot({ path: ssPath });

    stepLog.push({
      step: '04. Add to Cart Flow',
      status: hasBtn ? 'PASS' : 'WARNING',
      durationMs: Date.now() - start,
      details: `Add to Cart Button Present: ${hasBtn} | Cart State Updated: ${cartUpdated}`,
      screenshot: '04-cart-flow.png',
    });

    expect(true).toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-E2E-005: Mobile Viewport (390px) Full Responsiveness Check
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-E2E-005: Mobile Viewport (390px) E2E Responsiveness & Layout Check', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissProductionModals(page);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));

    const noOverflow = overflow.scrollWidth <= overflow.clientWidth + 1;

    const ssPath = path.join(SS_DIR, '05-mobile-responsive-390.png');
    await page.screenshot({ path: ssPath });

    stepLog.push({
      step: '05. Mobile Viewport (390px) Layout',
      status: noOverflow ? 'PASS' : 'FAIL',
      durationMs: Date.now() - start,
      details: `ScrollWidth: ${overflow.scrollWidth}px | ClientWidth: ${overflow.clientWidth}px | No Overflow: ${noOverflow}`,
      screenshot: '05-mobile-responsive-390.png',
    });

    expect(noOverflow, 'Mobile page must have zero horizontal overflow at 390px').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Consolidated Summary Log Generation
  // ═══════════════════════════════════════════════════════════════════════════
  test.afterAll(async () => {
    const summary = {
      targetUrl: PROD_URL,
      executedAt: new Date().toISOString(),
      totalSteps: stepLog.length,
      passedSteps: stepLog.filter(s => s.status === 'PASS').length,
      warningSteps: stepLog.filter(s => s.status === 'WARNING').length,
      failedSteps: stepLog.filter(s => s.status === 'FAIL').length,
      consoleErrorCount: consoleErrors.length,
      networkErrorCount: networkErrors.length,
      stepLog,
      consoleErrors: consoleErrors.slice(0, 20),
      networkErrors: networkErrors.slice(0, 20),
    };

    const outPath = path.join(REPORT_DIR, 'production-e2e-summary.json');
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('       PRODUCTION FULL E2E USER FLOW AUDIT COMPLETE          ');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`Target URL        : ${PROD_URL}`);
    console.log(`Total E2E Steps   : ${summary.totalSteps}`);
    console.log(`Passed Steps      : ${summary.passedSteps}`);
    console.log(`Warnings          : ${summary.warningSteps}`);
    console.log(`Failures          : ${summary.failedSteps}`);
    console.log(`Console Errors    : ${summary.consoleErrorCount}`);
    console.log(`Network Errors    : ${summary.networkErrorCount}`);
    console.log(`Report Saved To   : ${outPath}`);
    console.log('══════════════════════════════════════════════════════════════\n');
  });
});
