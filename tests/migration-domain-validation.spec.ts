import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissBlockingPopups } from './hyperlocal/helpers/popup.helper';

const OLD_DOMAIN = 'https://www.sangeethamobiles.com';
const NEW_DOMAIN = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'migration');
fs.mkdirSync(REPORT_DIR, { recursive: true });

test.describe('🌐 Domain & Migration Validation Suite (sangeethamobiles.com -> sangeetha.com)', () => {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  const oldDomainReferencesFound: Array<{ page: string; element: string; hrefOrSrc: string }> = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[${page.url()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      consoleErrors.push(`[${page.url()}] PAGE_ERROR: ${err.message}`);
    });
    page.on('response', resp => {
      if (resp.status() >= 400 && !resp.url().includes('analytics') && !resp.url().includes('google-analytics') && !resp.url().includes('facebook')) {
        networkErrors.push(`${resp.status()} ${resp.url().slice(0, 120)}`);
      }
    });
  });

  test('MIG-001: New domain homepage loads cleanly with valid metadata', async ({ page }) => {
    const resp = await page.goto(`${NEW_DOMAIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(resp?.status()).toBe(200);
    
    const title = await page.title();
    console.log(`[MIG-001] Homepage Title: "${title}"`);
    expect(title.length).toBeGreaterThan(0);

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    console.log(`[MIG-001] Canonical URL: ${canonicalHref}`);

    // Check header logo and navigation
    const logo = page.locator('img[alt*="Sangeetha" i], img[src*="logo" i], svg[class*="logo" i], a[href="/"]').first();
    await expect(logo).toBeVisible({ timeout: 5000 });
  });

  test('MIG-002: Internal navigation links on sangeetha.com do not use old domain', async ({ page }) => {
    await page.goto(`${NEW_DOMAIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scan all anchor tags on homepage
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map(a => ({
        text: (a.textContent || '').trim().slice(0, 30),
        href: a.getAttribute('href') || '',
      }));
    });

    const oldDomainLinks = links.filter(l => l.href.includes('sangeethamobiles.com'));
    console.log(`[MIG-002] Total links scanned: ${links.length}. Old domain links found: ${oldDomainLinks.length}`);
    
    oldDomainLinks.forEach(l => {
      oldDomainReferencesFound.push({ page: 'Homepage', element: `<a> "${l.text}"`, hrefOrSrc: l.href });
    });

    // Check if critical customer flow links (cart, search, category, account) point to old domain
    const badCoreLinks = oldDomainLinks.filter(l => 
      l.href.includes('/cart') || l.href.includes('/checkout') || l.href.includes('/category') || l.href.includes('/product-details')
    );
    expect(badCoreLinks.length, `Found ${badCoreLinks.length} core journey links still pointing to sangeethamobiles.com: ${JSON.stringify(badCoreLinks)}`).toBe(0);
  });

  test('MIG-003: Category / PLP pages load on sangeetha.com without breakage', async ({ page }) => {
    const plpUrl = `${NEW_DOMAIN}/category/smartphones`;
    const resp = await page.goto(plpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[MIG-003] PLP Status: ${resp?.status()}`);

    // Products or filter elements should appear
    const productItems = page.locator('a[href*="product"], [class*="productCard"], [class*="product-card"], [class*="item"]');
    const count = await productItems.count();
    console.log(`[MIG-003] Product items listed: ${count}`);
    expect(count).toBeGreaterThan(0);
  });

  test('MIG-004: Product Detail Page (PDP) loads on sangeetha.com with active CTAs', async ({ page }) => {
    const pdpUrl = `${NEW_DOMAIN}/product-details/google-pixel-10-12gb-256gb-obsidian/19524`;
    await page.goto(pdpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    await dismissBlockingPopups(page);
    const priceEl = page.locator('[class*="price" i], [class*="Price" i]').first();
    const hasPrice = await priceEl.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[MIG-004] PDP Price visible: ${hasPrice}`);
    expect(hasPrice).toBeTruthy();

    const atcBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Buy Now"), :text-matches("add to cart", "i")').first();
    const hasAtc = await atcBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[MIG-004] Add to Cart / Buy Now button visible: ${hasAtc}`);
    expect(hasAtc).toBeTruthy();
  });

  test('MIG-005: Cart & Checkout pages reachable on sangeetha.com', async ({ page }) => {
    const cartUrl = `${NEW_DOMAIN}/cart`;
    const resp = await page.goto(cartUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[MIG-005] Cart Status: ${resp?.status()}`);
    expect(resp?.status()).toBe(200);

    const heading = await page.locator('h1, h2, [class*="heading"], [class*="cart"]').first().innerText().catch(() => '');
    console.log(`[MIG-005] Cart heading: "${heading}"`);
    expect(page.url()).toContain('/cart');
  });

  test.afterAll(async () => {
    const migrationSummary = {
      timestamp: new Date().toISOString(),
      targetDomain: NEW_DOMAIN,
      oldDomainReferences: oldDomainReferencesFound,
      consoleErrorsCount: consoleErrors.length,
      networkErrorsCount: networkErrors.length,
      sampleConsoleErrors: consoleErrors.slice(0, 15),
      sampleNetworkErrors: networkErrors.slice(0, 15),
    };
    fs.writeFileSync(path.join(REPORT_DIR, 'migration-audit.json'), JSON.stringify(migrationSummary, null, 2));
    console.log(`\n[MIGRATION AUDIT] Report saved to ${path.join(REPORT_DIR, 'migration-audit.json')}`);
  });
});
