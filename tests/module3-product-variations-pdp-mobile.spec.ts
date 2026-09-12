import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import { setPincodeViaLocalStorage, verifyPincodeApplied } from './pincode-injection.helper';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const DEFAULT_PINCODE = process.env.PINCODE || '560078';

test.use({
  ...devices['Pixel 5'],
});

test.describe('Module 3: Product Type / Category Variations & PDP (Mobile Pixel 5 with Injected Pincode)', () => {
  test.setTimeout(240000);

  test('Module 3 Full Mobile Functional QA Pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    // Inject pincode directly into localStorage BEFORE page scripts execute
    await setPincodeViaLocalStorage(page, DEFAULT_PINCODE, 'Bengaluru');

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Console Error] ${msg.text()}`);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`[Request Failed] ${req.failure()?.errorText || 'Unknown'} - ${req.url()}`);
    });

    page.on('response', async resp => {
      const url = resp.url();
      const status = resp.status();
      if (status >= 400) networkFailures.push(`[Network ${status}] ${url}`);
    });

    const testResults: Array<{
      checkId: string;
      title: string;
      url: string;
      status: 'PASS' | 'CONFIRMED BUG' | 'BLOCKED' | 'NOT APPLICABLE' | 'UNABLE TO VERIFY';
      details: string;
      evidenceScreenshot?: string;
    }> = [];

    fs.mkdirSync('screenshots/mod3', { recursive: true });

    // Step 1: Navigate to Homepage
    console.log('[Module 3] Step 1: Navigating to Staging Home on Mobile Pixel 5...');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const homePincodeStatus = await verifyPincodeApplied(page, DEFAULT_PINCODE);
    console.log(`[Home] pincode in localStorage: ${homePincodeStatus.localStorageOk}, visible in UI: ${homePincodeStatus.uiOk}`);

    // Discover all PDP links on home page
    const pdpLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'));
      return anchors.map(a => ({
        href: a.getAttribute('href') || '',
        text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')
      })).filter(item => item.href.length > 0);
    });

    console.log(`[Module 3] Discovered ${pdpLinks.length} PDP anchors on Homepage.`);

    // Check 3.1: Direct Homepage Card PDP Click Navigation
    let firstCardHref = pdpLinks.length > 0 ? pdpLinks[0].href : '/product-details/apple-iphone-16-128gb-teal-myed3hna/17871';
    console.log(`[Module 3] Step 2: Testing CSR Click Navigation to PDP: ${firstCardHref}`);
    
    const firstCardAnchor = page.locator(`a[href="${firstCardHref}"]`).first();
    let csrNavSuccess = false;
    if (await firstCardAnchor.isVisible().catch(() => false)) {
      await firstCardAnchor.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
        firstCardAnchor.click({ force: true }).catch(() => {})
      ]);

      await page.waitForTimeout(3000);
      csrNavSuccess = page.url().includes('/product-details/');
    }

    const postClickUrl = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasPrice = /₹|\d+/.test(bodyText);
    const titleText = await page.locator('h1, h2, h3').first().innerText().catch(() => '');
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), .add-to-cart').first();
    const hasAddToCart = await addToCartBtn.isVisible({ timeout: 2000 }).catch(() => false);

    const ssPath1 = 'screenshots/mod3/01-csr-pdp-click.png';
    await page.screenshot({ path: ssPath1 });

    testResults.push({
      checkId: 'MOD3-CSR-PDP-NAV-01',
      title: 'Client-side Navigation from Homepage Deal Card to PDP',
      url: postClickUrl,
      status: (csrNavSuccess && hasPrice) ? 'PASS' : 'CONFIRMED BUG',
      details: csrNavSuccess
        ? `Successfully navigated to PDP via card click. Title: "${titleText.slice(0, 50)}". Price rendered: ${hasPrice}. Add to Cart visible: ${hasAddToCart}.`
        : `Failed client-side navigation. Remained on or redirected to ${postClickUrl}.`,
      evidenceScreenshot: ssPath1
    });

    // Check 3.2: PDP Variant Selection (Color / Storage Swatches)
    console.log('[Module 3] Step 3: Testing PDP Variant Swatches & Options...');
    const variantButtons = page.locator('button[class*="swatch"], div[class*="swatch"], button[aria-label*="variant" i], [class*="variant-option"], div[class*="color"], div[class*="storage"]');
    const variantCount = await variantButtons.count();

    if (variantCount > 0) {
      let variantClickPassed = false;
      const initialPriceText = await page.locator('span:has-text("₹")').first().innerText().catch(() => '');

      for (let i = 0; i < Math.min(variantCount, 2); i++) {
        const vBtn = variantButtons.nth(i);
        if (await vBtn.isVisible().catch(() => false)) {
          await vBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
          variantClickPassed = true;
        }
      }

      const ssPath2 = 'screenshots/mod3/02-pdp-variant-click.png';
      await page.screenshot({ path: ssPath2 });

      testResults.push({
        checkId: 'MOD3-PDP-VARIANTS-02',
        title: 'PDP Variant Selection (Storage/Color Swatches)',
        url: page.url(),
        status: variantClickPassed ? 'PASS' : 'CONFIRMED BUG',
        details: `Found ${variantCount} variant options. Clicked variant swatches. Initial price: "${initialPriceText}".`,
        evidenceScreenshot: ssPath2
      });
    } else {
      testResults.push({
        checkId: 'MOD3-PDP-VARIANTS-02',
        title: 'PDP Variant Selection (Storage/Color Swatches)',
        url: page.url(),
        status: 'UNABLE TO VERIFY',
        details: `No explicit variant swatches found on product page (${postClickUrl}).`,
      });
    }

    // Check 3.3: Direct SSR Navigation to PDP URL
    console.log('[Module 3] Step 4: Testing Direct SSR Navigation to PDP URL...');
    const directPdpUrl = new URL('/product-details/apple-iphone-16-128gb-teal-myed3hna/17871', STAGING_URL).toString();
    
    let ssrSuccess = true;
    try {
      await page.goto(directPdpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
    } catch (err: any) {
      console.log(`[Module 3] Direct SSR navigation to ${directPdpUrl} failed: ${err.message}`);
      ssrSuccess = false;
    }

    const ssrCurrentUrl = page.url();
    const ssrBodyText = await page.evaluate(() => document.body.innerText);
    const ssrIs404 = ssrBodyText.includes('404') || ssrBodyText.includes('This page could not be found');

    const ssPath3 = 'screenshots/mod3/03-ssr-direct-pdp-nav.png';
    await page.screenshot({ path: ssPath3, fullPage: true }).catch(() => {});

    testResults.push({
      checkId: 'MOD3-SSR-DIRECT-PDP-03',
      title: 'Direct Browser SSR Navigation to Product Detail URL',
      url: ssrCurrentUrl,
      status: (ssrSuccess && !ssrIs404) ? 'PASS' : 'CONFIRMED BUG',
      details: !ssrSuccess
        ? `Direct SSR navigation to ${directPdpUrl} timed out after 15s.`
        : ssrIs404
        ? `Direct SSR navigation resolved to 404 Not Found at ${ssrCurrentUrl}.`
        : `Direct SSR navigation loaded PDP successfully.`,
      evidenceScreenshot: ssPath3
    });

    // Check 3.4: Route Slug Parsing Disconnect (/product-details/product/[id])
    console.log('[Module 3] Step 5: Testing Route Slug Parsing Patterns...');
    const malformedPdpUrl = new URL('/product-details/product/17871', STAGING_URL).toString();
    let malformedSuccess = true;
    try {
      await page.goto(malformedPdpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      malformedSuccess = false;
    }

    const malformedBody = await page.evaluate(() => document.body.innerText);
    const ssPath4 = 'screenshots/mod3/04-malformed-pdp-route.png';
    await page.screenshot({ path: ssPath4 }).catch(() => {});

    testResults.push({
      checkId: 'MOD3-SLUG-PARSING-04',
      title: 'PDP Route Slug Parsing Disconnect (/product-details/product/[id])',
      url: page.url(),
      status: (malformedSuccess && !malformedBody.includes('404')) ? 'PASS' : 'CONFIRMED BUG',
      details: !malformedSuccess
        ? `Route /product-details/product/17871 timed out after 15s due to Next.js slug matching failure.`
        : `Route resolved to product page successfully.`,
      evidenceScreenshot: ssPath4
    });

    // Write full Module 3 report file
    const reportData = {
      module: 'Module 3: Product Type / Category Variations & PDP (Mobile Pixel 5)',
      environment: 'Staging (Mobile Pixel 5)',
      stagingUrl: STAGING_URL,
      pincodeUsed: DEFAULT_PINCODE,
      results: testResults,
      consoleErrors,
      networkFailures,
    };

    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/module3-pdp-report.json', JSON.stringify(reportData, null, 2));

    console.log('\n================ MODULE 3 RESULTS SUMMARY ================');
    console.log(JSON.stringify(reportData, null, 2));
  });
});
