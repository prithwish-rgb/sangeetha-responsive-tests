import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('MOD6 Global Nav & Search Mechanism Deep Probe', async ({ page }) => {
  test.setTimeout(120000);

  fs.mkdirSync('screenshots/mod6-deep', { recursive: true });

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 1. Header Structure
  const headerAudit = await page.evaluate(() => {
    const header = document.querySelector('header') || document.querySelector('nav') || document.querySelector('div.sticky, div.fixed');
    const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('header a, nav a, div[class*="header"] a'))
      .map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim(), ariaLabel: a.getAttribute('aria-label') || '' }));

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('header button, nav button, div[class*="header"] button'))
      .map(b => ({ text: (b.innerText || '').trim(), ariaLabel: b.getAttribute('aria-label') || '', className: b.className.slice(0, 60) }));

    return { allLinks, buttons };
  });

  console.log('[MOD6 Header Audit]:', JSON.stringify(headerAudit));

  // 2. Direct Search URL tests (query params)
  const searchUrls = [
    'https://smpl-new.bangalore2.com/search?q=iPhone',
    'https://smpl-new.bangalore2.com/search?search=iPhone',
    'https://smpl-new.bangalore2.com/product-list/search-iphone',
  ];

  for (const url of searchUrls) {
    console.log(`\nTesting search URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2500);
    const pageTitle = await page.title();
    const currentUrl = page.url();
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 150));
    console.log(`URL: ${currentUrl} | Title: ${pageTitle} | Snippet: ${bodySnippet.replace(/\n/g, ' ')}`);
  }

  // 3. Test Sparkle / AI Search Icon on PDP/PLP
  await page.goto('https://smpl-new.bangalore2.com/product-list/layout-22-1-684', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const sparkleBtn = page.locator('button:has(svg), a:has(svg)').filter({ has: page.locator('svg') }).last();
  if (await sparkleBtn.isVisible().catch(() => false)) {
    console.log('\nTapping top-right icon on PLP...');
    await sparkleBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/mod6-deep/03-sparkle-clicked.png' });
    console.log('Post-sparkle URL:', page.url());
  }

  // 4. Test Header Back Button
  const backBtn = page.locator('button:has-text("←"), button svg.lucide-arrow-left, button').first();
  if (await backBtn.isVisible().catch(() => false)) {
    console.log('\nTapping Back button on PLP...');
    await backBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    console.log('Post-back URL:', page.url());
  }
});
