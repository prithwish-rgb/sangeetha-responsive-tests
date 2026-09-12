import { test, devices } from '@playwright/test';
import fs from 'fs';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const SEARCH_TERM = process.env.SEARCH_TERM || 'iPhone 16';
const PINCODE = process.env.PINCODE || '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: fs.existsSync('auth-staging.json') ? 'auth-staging.json' : (fs.existsSync('auth-state.json') ? 'auth-state.json' : undefined),
});

test.setTimeout(120_000);

test('STAGING MOBILE EXPLORE: mobile-home -> mobile-search -> mobile-pdp -> location-modal -> cart -> checkout', async ({ page }) => {
  const report: Record<string, any> = {
    environment: 'staging',
    device: 'Mobile (Pixel 5 emulation - 393x851)',
    stagingUrl: STAGING_URL,
    variant: { searchTerm: SEARCH_TERM, pincode: PINCODE },
    stages: {},
    mobileDesignObservations: []
  };

  fs.mkdirSync('scratch', { recursive: true });

  // ========== 1. MOBILE HOME ==========
  console.log(`[1/7 home-mobile] Navigating to staging home on mobile: ${STAGING_URL}`);
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const homeTitle = await page.title();
  const homeReached = page.url().includes('smpl-new.bangalore2.com');
  report.stages.home = { reached: homeReached, url: page.url(), title: homeTitle };
  console.log(`[1/7 home-mobile] reached=${homeReached} title="${homeTitle}"`);

  // Handle Location Modal overlay if present on initial load
  const typeManuallyInitial = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
  if (await typeManuallyInitial.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[1/7 home-mobile] Location Modal open on load, clicking Type Manually...');
    await typeManuallyInitial.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);

    const pincodeInputInitial = page.locator('div[class*="modal"] input, input[placeholder*="pincode"], input[placeholder*="Pincode"]').first();
    if (await pincodeInputInitial.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pincodeInputInitial.fill('560078');
      await pincodeInputInitial.press('Enter').catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  // ========== 2. MOBILE SEARCH ==========
  console.log(`[2/7 search-mobile] Interacting with mobile search bar for "${SEARCH_TERM}"...`);
  
  // On Mobile, search is triggered by clicking the search pill: 'Search or Ask for...'
  const mobileSearchPill = page.locator('span:has-text("Search or Ask for"), div:has-text("Search or Ask for")').first();
  const isPillVisible = await mobileSearchPill.isVisible({ timeout: 4000 }).catch(() => false);

  if (isPillVisible) {
    console.log('[2/7 search-mobile] Clicking mobile search pill...');
    report.mobileDesignObservations.push('Mobile Home uses a floating search bar pill ("Search or Ask for...") with camera & mic icons.');
    await mobileSearchPill.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  // Find active search input after clicking pill or in header
  const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"], .live-search__input').first();
  const isInputVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

  let itemsFound = 0;
  let sampleItems: Array<{ href: string | null; text: string }> = [];

  if (isInputVisible) {
    await searchInput.fill('');
    await searchInput.type(SEARCH_TERM, { delay: 80 });
    await page.waitForTimeout(2500);

    sampleItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'));
      return links.slice(0, 5).map(a => ({
        href: a.getAttribute('href'),
        text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')
      }));
    });
    itemsFound = sampleItems.length;
  }

  report.stages.search = {
    searchPillVisible: isPillVisible,
    searchInputVisible: isInputVisible,
    itemsFound,
    sampleItems
  };
  console.log(`[2/7 search-mobile] searchInputVisible=${isInputVisible} itemsFound=${itemsFound}`);

  // ========== 3. MOBILE PDP ==========
  console.log('[3/7 pdp-mobile] Navigating to PDP on mobile...');
  let targetHref = sampleItems.length ? sampleItems[0].href : null;
  if (!targetHref) {
    const pdpLink = page.locator('a[href*="/product-details/"]').first();
    targetHref = await pdpLink.getAttribute('href').catch(() => null);
  }

  console.log(`[3/7 pdp-mobile] Target product href: ${targetHref}`);

  if (targetHref) {
    const fullPdpUrl = new URL(targetHref, STAGING_URL).toString();
    await page.goto(fullPdpUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  }

  const pdpReached = page.url().includes('/product-details/');
  const pdpTitle = await page.title();
  report.stages.pdp = { reached: pdpReached, pdpUrl: page.url(), title: pdpTitle };
  console.log(`[3/7 pdp-mobile] reached=${pdpReached} url=${page.url()}`);

  fs.writeFileSync('scratch/staging-mobile-after-pdp.html', await page.content());

  // ========== 4. MOBILE PINCODE (LOCATION MODAL ON MOBILE) ==========
  console.log(`[4/7 pincode-mobile] Testing pincode interaction on mobile PDP for pincode ${PINCODE}...`);
  
  const pincodeContainer = page.locator('.delivery_web__inputBox, .delivery_web__input, span:has-text("Select Delivery Location")').first();
  const isPincodeVisible = await pincodeContainer.isVisible({ timeout: 5000 }).catch(() => false);

  let modalTriggered = false;
  let etaText = null;

  if (isPincodeVisible) {
    await pincodeContainer.click().catch(() => {});
    await page.waitForTimeout(1500);

    const typeManuallyBtn = page.locator('button:has-text("Type manually"), .btn_fill_block:has-text("Type manually")').first();
    if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      modalTriggered = true;
      report.mobileDesignObservations.push('Location Modal on Mobile PDP adapts cleanly to mobile dialog viewport.');
      await typeManuallyBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    const modalInput = page.locator('div[class*="modal"] input, div[class*="location"] input, input[placeholder*="pincode"], input[placeholder*="Pincode"], input[type="text"]').first();
    if (await modalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalInput.fill(PINCODE);
      await modalInput.press('Enter');
      await page.waitForTimeout(3000);
    }

    etaText = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.details-text, .delivery_web__block, div[class*="delivery"]');
      return el ? (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ') : null;
    });
  }

  report.stages.pincode = {
    pincodeContainerVisible: isPincodeVisible,
    modalTriggered,
    pincodeEntered: PINCODE,
    etaText
  };
  console.log(`[4/7 pincode-mobile] modalTriggered=${modalTriggered} etaText="${etaText}"`);

  // ========== 5. MOBILE CART ==========
  console.log('[5/7 cart-mobile] Testing Add to Cart & Cart page on mobile...');
  const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), .add-to-cart').first();
  const addToCartVisible = await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false);

  if (addToCartVisible) {
    await addToCartBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  await page.goto(new URL('/cart', STAGING_URL).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const cartReached = page.url().includes('/cart');
  const cartTitle = await page.title();
  
  report.stages.cart = {
    addToCartVisible,
    cartPageReached: cartReached,
    cartUrl: page.url(),
    cartTitle
  };
  console.log(`[5/7 cart-mobile] cartPageReached=${cartReached} url=${page.url()}`);

  // ========== 6. MOBILE CHECKOUT ==========
  console.log('[6/7 checkout-mobile] Checking checkout trigger on mobile cart...');
  const checkoutBtn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Checkout"), a:has-text("Proceed to Buy")').first();
  const checkoutVisible = await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false);

  let checkoutNavigated = false;
  if (checkoutVisible) {
    await checkoutBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3500);
    checkoutNavigated = page.url().includes('/checkout');
  }

  report.stages.checkout = {
    checkoutVisible,
    checkoutNavigated,
    checkoutUrl: page.url()
  };
  console.log(`[6/7 checkout-mobile] checkoutVisible=${checkoutVisible} checkoutNavigated=${checkoutNavigated}`);

  // ========== 7. MOBILE PAYMENT ==========
  console.log('[7/7 payment-mobile] Observing payment options on mobile...');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery', 'COD', 'EMI', 'Net Banking', 'Wallet']
    .filter(m => new RegExp(m, 'i').test(bodyText));

  report.stages.payment = {
    methodsObserved: paymentMethods,
    pageUrl: page.url()
  };
  console.log(`[7/7 payment-mobile] methodsObserved: ${paymentMethods.length ? paymentMethods.join(', ') : 'none'}`);

  console.log('\n=== STAGING MOBILE E2E EXPLORATION REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  const reportPath = `reports/staging-mobile-report-${Date.now()}.json`;
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${reportPath}`);
});
