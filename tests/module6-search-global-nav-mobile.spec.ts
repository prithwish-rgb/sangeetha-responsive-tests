import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test.describe('Module 6: Search & Global Navigation (Mobile Pixel 5)', () => {
  test.setTimeout(180000);

  test('Module 6 Full Search & Global Navigation QA Pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120)); });

    const results: Array<{
      checkId: string; title: string;
      status: 'PASS' | 'CONFIRMED BUG' | 'UNABLE TO VERIFY' | 'INCONCLUSIVE';
      details: string; evidenceScreenshot?: string;
    }> = [];

    fs.mkdirSync('screenshots/mod6', { recursive: true });
    fs.mkdirSync('reports', { recursive: true });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.1 — Header Search Pill Presence & Text
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.1: Header search pill presence...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const searchPill = page.locator('span, p').filter({ hasText: /^Search or Ask for/i }).first();
    const isPillVisible = await searchPill.isVisible().catch(() => false);
    const pillText = isPillVisible ? (await searchPill.innerText().catch(() => '')) : '';

    console.log(`[MOD6] Search pill visible: ${isPillVisible}, text: "${pillText}"`);
    await page.screenshot({ path: 'screenshots/mod6/01-header-search-pill.png' });

    results.push({
      checkId: 'MOD6-SEARCH-PILL-01',
      title: 'Header Search Pill — Visible & Rendered',
      status: isPillVisible ? 'PASS' : 'CONFIRMED BUG',
      details: `Search Pill visible: ${isPillVisible}. Text rendered: "${pillText}".`,
      evidenceScreenshot: 'screenshots/mod6/01-header-search-pill.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.2 — Search Pill Tap & Navigation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.2: Search pill tap action...');
    let pillNavigated = false;
    let postPillUrl = '';

    if (isPillVisible) {
      await searchPill.click();
      await page.waitForTimeout(3000);
      postPillUrl = page.url();
      pillNavigated = postPillUrl.includes('/product-list/') || postPillUrl.includes('/search');
      console.log(`[MOD6] Post-pill URL: ${postPillUrl}, Navigated: ${pillNavigated}`);
      await page.screenshot({ path: 'screenshots/mod6/02-search-pill-navigation.png' });

      results.push({
        checkId: 'MOD6-SEARCH-PILL-NAV-02',
        title: 'Search Pill Tap — Navigates to Catalog View',
        status: pillNavigated ? 'PASS' : 'CONFIRMED BUG',
        details: `Tapped search pill. Navigated: ${pillNavigated}. Destination URL: ${postPillUrl}`,
        evidenceScreenshot: 'screenshots/mod6/02-search-pill-navigation.png',
      });
    } else {
      results.push({ checkId: 'MOD6-SEARCH-PILL-NAV-02', title: 'Search Pill Tap', status: 'INCONCLUSIVE', details: 'Search pill was not visible.' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.3 — Arbitrary Keyword Search Input on Mobile
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.3: Testing live text search input capability...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const hasLiveSearchInput = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="search"], input:not([type="hidden"]):not([type="email"])'));
      const visibleInputs = inputs.filter(i => i.offsetParent !== null && i.placeholder.toLowerCase().includes('search'));
      return { count: visibleInputs.length, placeholders: visibleInputs.map(i => i.placeholder) };
    });

    console.log(`[MOD6] Live search inputs on mobile home:`, JSON.stringify(hasLiveSearchInput));
    await page.screenshot({ path: 'screenshots/mod6/03-mobile-search-input-audit.png' });

    const hasSearchTypingCapability = hasLiveSearchInput.count > 0;
    results.push({
      checkId: 'MOD6-MOBILE-SEARCH-INPUT-03',
      title: 'Mobile Header Arbitrary Text Search Input',
      status: hasSearchTypingCapability ? 'PASS' : 'CONFIRMED BUG',
      details: hasSearchTypingCapability
        ? `Search input available with placeholder: "${hasLiveSearchInput.placeholders.join(', ')}"`
        : `Mobile header renders a static clickable pill ("Search or Ask for...") which only navigates to hardcoded layout routes. There is no active text input or search modal allowing users to type custom keywords on mobile.`,
      evidenceScreenshot: 'screenshots/mod6/03-mobile-search-input-audit.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.4 — Standard Direct Search Route (`/search?q=...`)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.4: Standard /search route handling...');
    await page.goto('https://smpl-new.bangalore2.com/search?q=iPhone', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const searchRouteAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const is404 = /404|could not be found|page not found/i.test(text);
      return { is404, url: location.href, snippet: text.slice(0, 150) };
    });

    console.log(`[MOD6] /search route audit:`, JSON.stringify(searchRouteAudit));
    await page.screenshot({ path: 'screenshots/mod6/04-search-route-404.png' });

    results.push({
      checkId: 'MOD6-SEARCH-ROUTE-404-04',
      title: 'Direct /search?q= Route Handling',
      status: !searchRouteAudit.is404 ? 'PASS' : 'CONFIRMED BUG',
      details: searchRouteAudit.is404
        ? `Navigating to standard /search?q=iPhone returns HTTP/SPA 404 ("This page could not be found"). Application lacks a dedicated /search route.`
        : `Search route rendered results successfully.`,
      evidenceScreenshot: 'screenshots/mod6/04-search-route-404.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.5 — PLP Search Slug Route (`/product-list/search-[term]`)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.5: Dynamic PLP search slug route...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto('https://smpl-new.bangalore2.com/product-list/search-iphone', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const plpSearchAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const cards = Array.from(document.querySelectorAll('a[href*="/product-details/"]')).filter(a => (a as HTMLElement).offsetParent !== null).length;
      const hasHeading = /Search Iphone/i.test(text);
      return { cards, hasHeading, snippet: text.slice(0, 200) };
    });

    console.log(`[MOD6] PLP search slug audit:`, JSON.stringify(plpSearchAudit));
    await page.screenshot({ path: 'screenshots/mod6/05-search-slug-plp.png' });

    results.push({
      checkId: 'MOD6-SEARCH-SLUG-PLP-05',
      title: 'Dynamic Search Slug PLP Route (/product-list/search-[term])',
      status: (plpSearchAudit.cards > 0 && plpSearchAudit.hasHeading) ? 'PASS' : 'CONFIRMED BUG',
      details: `Route /product-list/search-iphone rendered ${plpSearchAudit.cards} product cards with heading: "${plpSearchAudit.hasHeading}".`,
      evidenceScreenshot: 'screenshots/mod6/05-search-slug-plp.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.6 — Header Pincode / Location Badge & Modal Trigger
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.6: Header location badge & modal trigger...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const locationTrigger = page.locator('text=/Select Delivery Location|560078|Bengaluru/i').first();
    const isLocationVisible = await locationTrigger.isVisible().catch(() => false);
    let modalOpened = false;

    if (isLocationVisible) {
      await locationTrigger.click();
      await page.waitForTimeout(2000);
      modalOpened = await page.evaluate(() => {
        const text = document.body.innerText;
        const modalEl = document.querySelector('[class*="modal"], [role="dialog"], [class*="drawer"]');
        return /location|pincode|delivery/i.test(text) && !!modalEl;
      });
      await page.screenshot({ path: 'screenshots/mod6/06-location-modal-triggered.png' });
    }

    console.log(`[MOD6] Location trigger visible: ${isLocationVisible}, modal triggered: ${modalOpened}`);

    results.push({
      checkId: 'MOD6-HEADER-PINCODE-06',
      title: 'Header Delivery Pincode Badge & Location Modal Trigger',
      status: (isLocationVisible && modalOpened) ? 'PASS' : 'CONFIRMED BUG',
      details: `Location trigger visible: ${isLocationVisible}. Tapping trigger opens location modal: ${modalOpened}.`,
      evidenceScreenshot: 'screenshots/mod6/06-location-modal-triggered.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.7 — Header Cart Icon Navigation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.7: Header cart icon navigation...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Click cart icon (top right)
    const cartButton = page.locator('button:has(svg)').last();
    let cartNavigated = false;
    let postCartClickUrl = '';

    if (await cartButton.isVisible().catch(() => false)) {
      await cartButton.click();
      await page.waitForTimeout(3000);
      postCartClickUrl = page.url();
      cartNavigated = postCartClickUrl.includes('/cart');
      console.log(`[MOD6] Cart Icon Click URL: ${postCartClickUrl}, Navigated: ${cartNavigated}`);
      await page.screenshot({ path: 'screenshots/mod6/07-cart-icon-nav.png' });
    }

    results.push({
      checkId: 'MOD6-HEADER-CART-NAV-07',
      title: 'Header Cart Icon — Navigates to /cart',
      status: cartNavigated ? 'PASS' : 'CONFIRMED BUG',
      details: `Cart icon clicked. Navigated to /cart: ${cartNavigated}. Post-click URL: ${postCartClickUrl}`,
      evidenceScreenshot: 'screenshots/mod6/07-cart-icon-nav.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 6.8 — Global Sub-page Back Navigation (←)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD6] Check 6.8: Global sub-page back navigation...');
    await page.goto('https://smpl-new.bangalore2.com/product-list/category-smartphones-308', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left, svg') }).first();
    let backNavigated = false;
    let postBackUrl = '';

    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(3000);
      postBackUrl = page.url();
      backNavigated = postBackUrl === STAGING_URL || postBackUrl.endsWith('bangalore2.com/');
      console.log(`[MOD6] Back button clicked. Post-back URL: ${postBackUrl}, Navigated: ${backNavigated}`);
      await page.screenshot({ path: 'screenshots/mod6/08-back-nav.png' });
    }

    results.push({
      checkId: 'MOD6-GLOBAL-BACK-NAV-08',
      title: 'Sub-page Header Back Navigation (←)',
      status: backNavigated ? 'PASS' : 'CONFIRMED BUG',
      details: `Back button clicked on PLP. Navigated back to previous page / home: ${backNavigated}. URL: ${postBackUrl}`,
      evidenceScreenshot: 'screenshots/mod6/08-back-nav.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // COMPILE & WRITE REPORT
    // ──────────────────────────────────────────────────────────────────────────
    const report = {
      module: 'Module 6: Search & Global Navigation (Mobile Pixel 5)',
      environment: 'Staging (Mobile Pixel 5)',
      stagingUrl: STAGING_URL,
      pincodeUsed: PINCODE,
      results,
      consoleErrors: consoleErrors.slice(0, 10),
    };

    fs.writeFileSync('reports/module6-search-global-nav-report.json', JSON.stringify(report, null, 2));

    const pass = results.filter(r => r.status === 'PASS').length;
    const bugs = results.filter(r => r.status === 'CONFIRMED BUG').length;
    const inconclusive = results.filter(r => r.status === 'INCONCLUSIVE').length;

    console.log('\n\n================ MODULE 6 RESULTS SUMMARY ================');
    console.log(`Total: ${results.length} | ✅ PASS: ${pass} | ❌ BUG: ${bugs} | ⚠️ INCONCLUSIVE: ${inconclusive}`);
    results.forEach(r => console.log(`  [${r.status}] ${r.checkId} — ${r.details.slice(0, 130)}`));
    console.log('Report saved: reports/module6-search-global-nav-report.json');
  });
});
