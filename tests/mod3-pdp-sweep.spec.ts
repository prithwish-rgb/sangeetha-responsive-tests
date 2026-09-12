import { test, devices } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({ ...devices['Pixel 5'] });

test('MOD3 PDP Sweep — Check all homepage PDP links', async ({ page }) => {
  test.setTimeout(300000);

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Collect all unique PDP hrefs from homepage
  const pdpHrefs: string[] = await page.evaluate(() => {
    const seen = new Set<string>();
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
      .forEach(a => {
        const h = a.getAttribute('href') || '';
        if (h) seen.add(h);
      });
    return Array.from(seen);
  });

  console.log(`\n[Sweep] Found ${pdpHrefs.length} unique PDP links on homepage.`);

  const results: Array<{
    href: string;
    title: string;
    hasPrice: boolean;
    priceText: string;
    addToCartVisible: boolean;
    addToCartDisabled: boolean;
    variantCount: number;
    pageLoaded: boolean;
    status: string;
  }> = [];

  // Test every unique PDP
  for (let i = 0; i < pdpHrefs.length; i++) {
    const href = pdpHrefs[i];
    const fullUrl = new URL(href, STAGING_URL).toString();
    console.log(`\n[Sweep ${i + 1}/${pdpHrefs.length}] ${href}`);

    try {
      await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Wait for price or Add to Cart to appear (confirms hydration)
      await page.waitForSelector('button:has-text("Add to Cart"), button:has-text("Add to Bag"), span:has-text("₹")', {
        timeout: 10000
      }).catch(() => {});
      await page.waitForTimeout(1000);

      const audit = await page.evaluate(() => {
        // Title: try h1, h2 (first non-empty), then fall back to page title
        const headings = Array.from(document.querySelectorAll<HTMLElement>('h1, h2'));
        const titleEl = headings.find(h => (h.innerText || '').trim().length > 0);
        const titleText = titleEl ? (titleEl.innerText || '').trim().slice(0, 80) : '';

        // Price
        const priceEl = Array.from(document.querySelectorAll<HTMLElement>('*'))
          .find(e => !e.children.length && (e.innerText || '').includes('₹'));
        const priceText = priceEl ? (priceEl.innerText || '').trim().slice(0, 30) : '';

        // Add to Cart button
        const atcBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
          .find(b => /add to cart|add to bag/i.test(b.innerText || ''));

        // Variant swatches
        const variantEls = document.querySelectorAll('[class*="swatch"], [class*="variant"], [class*="color-opt"], [class*="storage-opt"]');

        return {
          title: titleText,
          hasPrice: !!priceEl,
          priceText,
          addToCartVisible: atcBtn ? atcBtn.offsetParent !== null : false,
          addToCartDisabled: atcBtn ? atcBtn.disabled : false,
          variantCount: variantEls.length,
          pageIs404: document.body.innerText.includes('404') || document.body.innerText.includes('page could not be found'),
        };
      });

      const pageUrl = page.url();
      const pageLoaded = pageUrl.includes('/product-details/') && !audit.pageIs404;
      const isBroken = !audit.title || !audit.hasPrice || (audit.addToCartVisible && audit.addToCartDisabled);

      const status = !pageLoaded ? 'LOAD FAILED'
        : (!audit.title && !audit.hasPrice) ? 'BROKEN — no title/price'
        : !audit.title ? 'WARN — empty title'
        : !audit.hasPrice ? 'WARN — no price'
        : (audit.addToCartVisible && audit.addToCartDisabled) ? 'WARN — Add to Cart disabled'
        : 'PASS';

      console.log(`  title="${audit.title}" | price=${audit.priceText} | ATC=${audit.addToCartVisible}(disabled=${audit.addToCartDisabled}) | status=${status}`);

      results.push({ href, title: audit.title, hasPrice: audit.hasPrice, priceText: audit.priceText, addToCartVisible: audit.addToCartVisible, addToCartDisabled: audit.addToCartDisabled, variantCount: audit.variantCount, pageLoaded, status });

    } catch (err: any) {
      console.log(`  ERROR: ${err.message?.slice(0, 100)}`);
      results.push({ href, title: '', hasPrice: false, priceText: '', addToCartVisible: false, addToCartDisabled: false, variantCount: 0, pageLoaded: false, status: `ERROR: ${err.message?.slice(0, 60)}` });
    }
  }

  // Summary
  const passing = results.filter(r => r.status === 'PASS').length;
  const broken = results.filter(r => r.status.startsWith('BROKEN')).length;
  const warned = results.filter(r => r.status.startsWith('WARN')).length;
  const failed = results.filter(r => r.status.startsWith('LOAD FAILED') || r.status.startsWith('ERROR')).length;

  console.log(`\n\n======= PDP SWEEP SUMMARY =======`);
  console.log(`Total PDPs tested : ${results.length}`);
  console.log(`✅ PASS           : ${passing}`);
  console.log(`⚠️  WARN           : ${warned}`);
  console.log(`❌ BROKEN         : ${broken}`);
  console.log(`💥 LOAD FAILED    : ${failed}`);

  console.log(`\n--- Non-passing PDPs ---`);
  results.filter(r => r.status !== 'PASS').forEach(r => {
    console.log(`  [${r.status}] ${r.href} | title="${r.title}" | price="${r.priceText}"`);
  });

  // Write report
  const report = {
    module: 'Module 3 Extension: PDP Sweep (All Homepage PDP Links)',
    environment: 'Staging Mobile Pixel 5',
    pincodeUsed: PINCODE,
    totalTested: results.length,
    summary: { pass: passing, warn: warned, broken, failed },
    results,
  };

  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/module3-pdp-sweep.json', JSON.stringify(report, null, 2));
  console.log(`\n[Sweep] Report saved: reports/module3-pdp-sweep.json`);
});
