import { test, devices } from '@playwright/test';
import fs from 'fs';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const SEARCH_TERM = process.env.SEARCH_TERM || 'iPhone 16';
const PINCODE = process.env.PINCODE || '560078';

test.use({
  ...devices['Desktop Chrome'],
  storageState: fs.existsSync('auth-state.json') ? 'auth-state.json' : undefined,
});

test.setTimeout(120_000);

test('STAGING EXPLORE: home -> search -> pdp -> location-modal -> cart -> checkout -> payment', async ({ page }) => {
  const report: Record<string, any> = {
    environment: 'staging',
    stagingUrl: STAGING_URL,
    variant: { searchTerm: SEARCH_TERM, pincode: PINCODE },
    stages: {},
    newDesignObservations: []
  };

  fs.mkdirSync('scratch', { recursive: true });

  // ========== 1. HOME ==========
  console.log(`[1/7 home] Navigating to staging home: ${STAGING_URL}`);
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const homeTitle = await page.title();
  const homeReached = page.url().includes('smpl-new.bangalore2.com');
  report.stages.home = { reached: homeReached, url: page.url(), title: homeTitle };
  console.log(`[1/7 home] reached=${homeReached}`);

  // ========== 2. SEARCH ==========
  console.log(`[2/7 search] Searching for "${SEARCH_TERM}" on staging...`);
  const searchBox = page.locator('.live-search__input, input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]').first();
  await searchBox.fill('');
  await searchBox.type(SEARCH_TERM, { delay: 80 });
  await page.waitForTimeout(3000);

  const dropdownVisible = await page.locator('.header-filtered__result, .searched-list').first().isVisible().catch(() => false);
  
  const dropdownItems = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.header-filtered__result a[href*="/product-details/"], .searched-list a[href*="/product-details/"]'));
    return links.slice(0, 5).map(a => ({
      href: a.getAttribute('href'),
      text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')
    }));
  });

  report.stages.search = { term: SEARCH_TERM, dropdownVisible, itemsFound: dropdownItems.length, sampleItems: dropdownItems };
  console.log(`[2/7 search] dropdownVisible=${dropdownVisible} itemsFound=${dropdownItems.length}`);

  // ========== 3. PDP ==========
  console.log('[3/7 pdp] Opening targeted search result on staging...');
  // Find link containing search term or take first search result in dropdown
  let targetHref = dropdownItems.length ? dropdownItems[0].href : null;
  if (!targetHref) {
    const fallbackLink = page.locator('a[href*="/product-details/"]').first();
    targetHref = await fallbackLink.getAttribute('href').catch(() => null);
  }

  console.log(`[3/7 pdp] Target href: ${targetHref}`);

  if (targetHref) {
    const fullPdpUrl = new URL(targetHref, STAGING_URL).toString();
    await page.goto(fullPdpUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  }

  const pdpReached = page.url().includes('/product-details/');
  const pdpTitle = await page.title();
  report.stages.pdp = { reached: pdpReached, pdpUrl: page.url(), title: pdpTitle };
  console.log(`[3/7 pdp] reached=${pdpReached} url=${page.url()}`);

  fs.writeFileSync('scratch/staging-after-pdp.html', await page.content());

  // ========== 4. PINCODE (NEW STAGING DESIGN: LOCATION MODAL) ==========
  console.log(`[4/7 pincode] Interacting with Staging Location Modal for pincode ${PINCODE}...`);
  
  const pincodeContainer = page.locator('.delivery_web__inputBox, .delivery_web__input').first();
  const isPincodeContainerVisible = await pincodeContainer.isVisible({ timeout: 5000 }).catch(() => false);

  let modalTriggered = false;
  let etaText = null;

  if (isPincodeContainerVisible) {
    await pincodeContainer.click().catch(() => {});
    await page.waitForTimeout(1500);

    const typeManuallyBtn = page.locator('button:has-text("Type manually"), .btn_fill_block:has-text("Type manually")').first();
    if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      modalTriggered = true;
      report.newDesignObservations.push('Location Modal detected ("To Deliver fastest, we need your location") -> "Type manually" option.');
      await typeManuallyBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    const modalInput = page.locator('div[class*="modal"] input, div[class*="location"] input, input[placeholder*="pincode"], input[placeholder*="Pincode"], input[type="text"]').first();
    if (await modalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalInput.fill(PINCODE);
      await page.waitForTimeout(500);

      const submitBtn = page.locator('div[class*="modal"] button:has-text("Submit"), div[class*="modal"] button:has-text("Apply"), div[class*="modal"] button[type="submit"]').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      } else {
        await modalInput.press('Enter');
      }
      await page.waitForTimeout(3000);
    }

    etaText = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.details-text, .delivery_web__block, div[class*="delivery"]');
      if (el) return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
      return null;
    });
  }

  report.stages.pincode = {
    pincodeContainerVisible: isPincodeContainerVisible,
    modalTriggered,
    pincodeEntered: PINCODE,
    etaText
  };
  console.log(`[4/7 pincode] modalTriggered=${modalTriggered} etaText="${etaText}"`);

  // ========== 5. CART ==========
  console.log('[5/7 cart] Adding item to cart on staging...');
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
  console.log(`[5/7 cart] cartPageReached=${cartReached} url=${page.url()}`);

  // ========== 6. CHECKOUT ==========
  console.log('[6/7 checkout] Checking checkout trigger on staging cart...');
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
  console.log(`[6/7 checkout] checkoutVisible=${checkoutVisible} checkoutNavigated=${checkoutNavigated}`);

  // ========== 7. PAYMENT ==========
  console.log('[7/7 payment] Observing payment options on staging...');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery', 'COD', 'EMI', 'Net Banking', 'Wallet']
    .filter(m => new RegExp(m, 'i').test(bodyText));

  report.stages.payment = {
    methodsObserved: paymentMethods,
    pageUrl: page.url()
  };
  console.log(`[7/7 payment] methodsObserved: ${paymentMethods.length ? paymentMethods.join(', ') : 'none'}`);

  console.log('\n=== STAGING E2E EXPLORATION REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  const reportPath = `reports/staging-e2e-report-${Date.now()}.json`;
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${reportPath}`);
});
