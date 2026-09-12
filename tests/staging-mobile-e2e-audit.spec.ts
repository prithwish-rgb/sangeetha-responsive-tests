import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const SEARCH_TERM = 'iPhone 16';
const PINCODE = '560078';

interface StageResult {
  reached: boolean;
  passed: boolean;
  failureReason: string | null;
  details?: Record<string, any>;
}

interface UserFlowReport {
  userType: 'Guest' | 'LoggedIn';
  timestamp: string;
  viewport: string;
  targetUrl: string;
  stages: {
    home: StageResult;
    search: StageResult;
    pdp: StageResult;
    pincode: StageResult;
    addToCart: StageResult;
    cart: StageResult;
    checkout: StageResult;
    address: StageResult;
    payment: StageResult;
  };
  authApiErrors: Array<{ url: string; status: number; body: string }>;
  paymentMethodsObserved: string[];
}

test.describe('STAGING MOBILE E2E SHOPPING AUDIT (PIXEL 5)', () => {
  test.setTimeout(180_000);

  // =========================================================================
  // TEST 1: NEW / GUEST USER FLOW (Clean Context)
  // =========================================================================
  test('1. Guest User Flow — Mobile E2E Shopping Audit', async ({ browser }) => {
    console.log('\n================================================================');
    console.log('STARTING GUEST USER MOBILE E2E SHOPPING AUDIT (Pixel 5)');
    console.log('================================================================\n');

    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: undefined // Clean context, no cookies/localStorage
    });
    const page = await context.newPage();

    const report: UserFlowReport = {
      userType: 'Guest',
      timestamp: new Date().toISOString(),
      viewport: '393x851 (Pixel 5)',
      targetUrl: STAGING_URL,
      stages: {
        home: { reached: false, passed: false, failureReason: null },
        search: { reached: false, passed: false, failureReason: null },
        pdp: { reached: false, passed: false, failureReason: null },
        pincode: { reached: false, passed: false, failureReason: null },
        addToCart: { reached: false, passed: false, failureReason: null },
        cart: { reached: false, passed: false, failureReason: null },
        checkout: { reached: false, passed: false, failureReason: null },
        address: { reached: false, passed: false, failureReason: null },
        payment: { reached: false, passed: false, failureReason: null }
      },
      authApiErrors: [],
      paymentMethodsObserved: []
    };

    page.on('response', async res => {
      const url = res.url();
      if ((url.includes('/auth') || url.includes('/crm/') || url.includes('/authenticate')) && res.status() >= 400) {
        try {
          const body = await res.text();
          report.authApiErrors.push({ url, status: res.status(), body: body.slice(0, 500) });
        } catch (e) {}
      }
    });

    fs.mkdirSync('screenshots/guest-flow', { recursive: true });

    try {
      // ---------------------------------------------------------------------
      // Stage 1: Home Page
      // ---------------------------------------------------------------------
      console.log('[1/9 GUEST] Navigating to Home...');
      report.stages.home.reached = true;
      await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'screenshots/guest-flow/1-home.png' });
      const title = await page.title();
      expect(title, 'Page title must contain Sangeetha').toContain('Sangeetha');
      report.stages.home.passed = true;

      // Dismiss initial Location Modal if popping up on load
      const typeManuallyBtn = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
      if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeManuallyBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
        const pInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
        if (await pInput.isVisible().catch(() => false)) {
          await pInput.fill(PINCODE);
          await pInput.press('Enter').catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // ---------------------------------------------------------------------
      // Stage 2: Mobile Search Pill & Results
      // ---------------------------------------------------------------------
      console.log('[2/9 GUEST] Testing Mobile Search Pill & Results...');
      report.stages.search.reached = true;

      const searchPill = page.locator('span:has-text("Search or Ask for"), div:has-text("Search or Ask for")').first();
      const searchPillVisible = await searchPill.isVisible({ timeout: 5000 }).catch(() => false);
      expect(searchPillVisible, 'Search pill must be visible on Mobile Home').toBe(true);

      await searchPill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      const productLinks = page.locator('a[href*="/product-details/"], a[href*="/product-list/"]');
      const resultsCount = await productLinks.count();
      console.log(`  Search / Product Links Found: ${resultsCount}`);
      
      expect(resultsCount, 'Mobile search must expose product links').toBeGreaterThan(0);
      const sampleHref = await productLinks.first().getAttribute('href');
      expect(sampleHref, 'First product link href must not be null').toBeTruthy();

      await page.screenshot({ path: 'screenshots/guest-flow/2-search-results.png' });
      report.stages.search.passed = true;
      report.stages.search.details = { searchPillVisible, resultsCount, sampleHref };

      // ---------------------------------------------------------------------
      // Stage 3: Product Detail Page (PDP)
      // ---------------------------------------------------------------------
      console.log('[3/9 GUEST] Navigating to Product Detail Page...');
      report.stages.pdp.reached = true;

      let pdpHref = sampleHref;
      if (!pdpHref || !pdpHref.includes('/product-details/')) {
        pdpHref = '/product-details/apple-iphone-16-128gb-teal-myed3hna/17871';
      }

      const fullPdpUrl = new URL(pdpHref, STAGING_URL).toString();
      await page.goto(fullPdpUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/guest-flow/3-pdp.png' });
      expect(page.url(), 'Current URL must be on Product Detail Page').toContain('/product-details/');
      report.stages.pdp.passed = true;

      // ---------------------------------------------------------------------
      // Stage 4: Pincode & Delivery ETA Check on Mobile PDP
      // ---------------------------------------------------------------------
      console.log('[4/9 GUEST] Testing Pincode & Delivery ETA update...');
      report.stages.pincode.reached = true;

      const pincodeBar = page.locator('p:has-text("Deliver to"), button:has-text("Deliver to"), div[class*="delivery"]').first();
      if (await pincodeBar.isVisible({ timeout: 4000 }).catch(() => false)) {
        await pincodeBar.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);

        const tmBtn = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
        if (await tmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tmBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
        }

        const pincodeInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
        if (await pincodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await pincodeInput.fill(PINCODE);
          await pincodeInput.press('Enter').catch(() => {});
          await page.waitForTimeout(3000);
        }
      }

      await page.screenshot({ path: 'screenshots/guest-flow/4-pincode-updated.png' });
      const pdpBodyText = await page.evaluate(() => document.body.innerText);
      const hasEta = /min|hr|day|deliver|560078/i.test(pdpBodyText);
      expect(hasEta, 'PDP must display location/delivery ETA info').toBe(true);
      report.stages.pincode.passed = true;

      // ---------------------------------------------------------------------
      // Stage 5: Add to Cart
      // ---------------------------------------------------------------------
      console.log('[5/9 GUEST] Clicking Add to Cart / Buy Now...');
      report.stages.addToCart.reached = true;

      const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Buy Now")').first();
      await expect(addToCartBtn, 'Add to Cart / Buy Now button must be visible on PDP').toBeVisible({ timeout: 8000 });
      await addToCartBtn.click({ force: true });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/guest-flow/5-add-to-cart.png' });
      report.stages.addToCart.passed = true;

      // ---------------------------------------------------------------------
      // Stage 6: Mobile Cart Page State & Item Persistence
      // ---------------------------------------------------------------------
      console.log('[6/9 GUEST] Opening Cart Page & Checking Item Persistence...');
      report.stages.cart.reached = true;
      await page.goto(new URL('/cart', STAGING_URL).toString(), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/guest-flow/6-cart-page.png' });
      expect(page.url(), 'Cart page URL must be /cart').toContain('/cart');

      const cartBodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      const hasCartItems = !cartBodyText.toLowerCase().includes('your cart is empty');
      report.stages.cart.details = { cartBodySnippet: cartBodyText.slice(0, 300), hasCartItems };
      
      if (!hasCartItems) {
        report.stages.cart.failureReason = 'Guest session cart persistence failed: Cart body reads "Your cart is empty" after Add to Cart action.';
        report.stages.cart.passed = false;
      } else {
        report.stages.cart.passed = true;
      }

      // ---------------------------------------------------------------------
      // Stage 7: Checkout Reachability & Route Guard Check for Guest User
      // ---------------------------------------------------------------------
      console.log('[7/9 GUEST] Testing Checkout Reachability...');
      report.stages.checkout.reached = true;

      const proceedBtn = page.locator('button:has-text("Proceed"), button:has-text("PROCEED"), button:has-text("Checkout"), a[href*="checkout"]').first();
      if (await proceedBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await proceedBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
      } else {
        await page.goto(new URL('/checkout', STAGING_URL).toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }

      await page.screenshot({ path: 'screenshots/guest-flow/7-checkout-result.png' });
      const checkoutUrl = page.url();
      const redirectedToHome = checkoutUrl === STAGING_URL;

      report.stages.checkout.details = { finalUrl: checkoutUrl, redirectedToHome };
      if (redirectedToHome) {
        report.stages.checkout.failureReason = 'Guest User Checkout Blocked: Next.js route guard redirected unauthenticated user session back to Home page (HTTP 307 redirect from /checkout).';
        report.stages.checkout.passed = false;
      } else {
        report.stages.checkout.passed = checkoutUrl.includes('/checkout');
      }

      // Guest User cannot reach Address/Payment because route guard blocks guest checkout
      report.stages.address.failureReason = 'Blocked: Guest user cannot reach Address stage because Checkout route guard redirects unauthenticated sessions.';
      report.stages.payment.failureReason = 'Blocked: Guest user cannot reach Payment stage because Checkout route guard redirects unauthenticated sessions.';

    } catch (err: any) {
      console.error('Guest Flow Error:', err.message);
      Object.keys(report.stages).forEach(stageKey => {
        const s = (report.stages as any)[stageKey];
        if (s.reached && !s.passed && !s.failureReason) {
          s.failureReason = err.message;
        }
      });
    } finally {
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync('reports/guest-user-mobile-audit.json', JSON.stringify(report, null, 2));
      console.log('\n=== GUEST USER MOBILE AUDIT REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      await context.close();

      // Top-level Playwright test assertion: Ensure failure if any stage failed!
      const failedStages = Object.entries(report.stages).filter(([_, s]) => !s.passed);
      if (failedStages.length > 0) {
        const stageFailures = failedStages.map(([k, s]) => `${k}: ${s.failureReason}`).join(' | ');
        expect.soft(failedStages.length, `Guest User Flow failed on ${failedStages.length} stage(s): ${stageFailures}`).toBe(0);
      }
    }
  });

  // =========================================================================
  // TEST 2: EXISTING / LOGGED-IN USER FLOW (Saved Real Auth State)
  // =========================================================================
  test('2. Logged-in User Flow — Mobile E2E Shopping Audit', async ({ browser }) => {
    console.log('\n================================================================');
    console.log('STARTING LOGGED-IN USER MOBILE E2E SHOPPING AUDIT (Pixel 5)');
    console.log('================================================================\n');

    const authFile = fs.existsSync('auth-staging.json') ? 'auth-staging.json' : (fs.existsSync('auth-state.json') ? 'auth-state.json' : null);
    
    const report: UserFlowReport = {
      userType: 'LoggedIn',
      timestamp: new Date().toISOString(),
      viewport: '393x851 (Pixel 5)',
      targetUrl: STAGING_URL,
      stages: {
        home: { reached: false, passed: false, failureReason: null },
        search: { reached: false, passed: false, failureReason: null },
        pdp: { reached: false, passed: false, failureReason: null },
        pincode: { reached: false, passed: false, failureReason: null },
        addToCart: { reached: false, passed: false, failureReason: null },
        cart: { reached: false, passed: false, failureReason: null },
        checkout: { reached: false, passed: false, failureReason: null },
        address: { reached: false, passed: false, failureReason: null },
        payment: { reached: false, passed: false, failureReason: null }
      },
      authApiErrors: [],
      paymentMethodsObserved: []
    };

    if (!authFile) {
      const authErr = 'BLOCKER: No real saved auth session (auth-staging.json / auth-state.json) found. Real OTP login is required on staging.';
      report.stages.home.failureReason = authErr;
      fs.writeFileSync('reports/logged-in-user-mobile-audit.json', JSON.stringify(report, null, 2));
      expect(authFile, authErr).toBeTruthy();
      return;
    }

    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: authFile
    });
    const page = await context.newPage();

    page.on('response', async res => {
      const url = res.url();
      if ((url.includes('/auth') || url.includes('/crm/') || url.includes('/authenticate')) && res.status() >= 400) {
        try {
          const body = await res.text();
          report.authApiErrors.push({ url, status: res.status(), body: body.slice(0, 500) });
        } catch (e) {}
      }
    });

    fs.mkdirSync('screenshots/auth-flow', { recursive: true });

    try {
      // ---------------------------------------------------------------------
      // Stage 1: Authenticated Home Page
      // ---------------------------------------------------------------------
      console.log('[1/9 LOGGED-IN] Navigating to Authenticated Home...');
      report.stages.home.reached = true;
      await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'screenshots/auth-flow/1-home.png' });
      expect(await page.title(), 'Page title must contain Sangeetha').toContain('Sangeetha');
      report.stages.home.passed = true;

      // ---------------------------------------------------------------------
      // Stage 2: Mobile Search Pill & Product Results
      // ---------------------------------------------------------------------
      console.log('[2/9 LOGGED-IN] Testing Mobile Search Pill & Product Links...');
      report.stages.search.reached = true;

      const searchPill = page.locator('span:has-text("Search or Ask for"), div:has-text("Search or Ask for")').first();
      const searchPillVisible = await searchPill.isVisible({ timeout: 5000 }).catch(() => false);
      expect(searchPillVisible, 'Search pill must be visible on Mobile Home').toBe(true);

      await searchPill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      const productLinks = page.locator('a[href*="/product-details/"], a[href*="/product-list/"]');
      const resultsCount = await productLinks.count();
      console.log(`  Product Links Found: ${resultsCount}`);
      expect(resultsCount, 'Mobile page must expose product links').toBeGreaterThan(0);

      const sampleHref = await productLinks.first().getAttribute('href');
      expect(sampleHref, 'First product link href must not be null').toBeTruthy();

      await page.screenshot({ path: 'screenshots/auth-flow/2-search-results.png' });
      report.stages.search.passed = true;
      report.stages.search.details = { searchPillVisible, resultsCount, sampleHref };

      // ---------------------------------------------------------------------
      // Stage 3: Product Detail Page (PDP)
      // ---------------------------------------------------------------------
      console.log('[3/9 LOGGED-IN] Opening PDP...');
      report.stages.pdp.reached = true;

      let pdpHref = sampleHref;
      if (!pdpHref || !pdpHref.includes('/product-details/')) {
        pdpHref = '/product-details/apple-iphone-16-128gb-teal-myed3hna/17871';
      }

      const fullPdpUrl = new URL(pdpHref, STAGING_URL).toString();
      await page.goto(fullPdpUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/auth-flow/3-pdp.png' });
      expect(page.url(), 'Current URL must be on PDP').toContain('/product-details/');
      report.stages.pdp.passed = true;

      // ---------------------------------------------------------------------
      // Stage 4: Pincode & Delivery ETA Check
      // ---------------------------------------------------------------------
      console.log('[4/9 LOGGED-IN] Setting Pincode & Checking ETA...');
      report.stages.pincode.reached = true;

      const pincodeBar = page.locator('p:has-text("Deliver to"), button:has-text("Deliver to"), div[class*="delivery"]').first();
      if (await pincodeBar.isVisible({ timeout: 4000 }).catch(() => false)) {
        await pincodeBar.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);

        const tmBtn = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
        if (await tmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tmBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
        }

        const pincodeInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
        if (await pincodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await pincodeInput.fill(PINCODE);
          await pincodeInput.press('Enter').catch(() => {});
          await page.waitForTimeout(3000);
        }
      }

      await page.screenshot({ path: 'screenshots/auth-flow/4-pincode.png' });
      const pdpText = await page.evaluate(() => document.body.innerText);
      const hasEta = /min|hr|day|deliver|560078/i.test(pdpText);
      expect(hasEta, 'PDP must display delivery location info').toBe(true);
      report.stages.pincode.passed = true;

      // ---------------------------------------------------------------------
      // Stage 5: Add to Cart
      // ---------------------------------------------------------------------
      console.log('[5/9 LOGGED-IN] Clicking Add to Cart...');
      report.stages.addToCart.reached = true;

      const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Buy Now")').first();
      await expect(addToCartBtn, 'Add to Cart / Buy Now button must be visible on PDP').toBeVisible({ timeout: 8000 });
      await addToCartBtn.click({ force: true });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/auth-flow/5-add-to-cart.png' });
      report.stages.addToCart.passed = true;

      // ---------------------------------------------------------------------
      // Stage 6: Authenticated Cart Page State & Persistence Assertion Fix!
      // ---------------------------------------------------------------------
      console.log('[6/9 LOGGED-IN] Opening Cart Page & Asserting Item Persistence...');
      report.stages.cart.reached = true;
      await page.goto(new URL('/cart', STAGING_URL).toString(), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/auth-flow/6-cart-page.png' });
      expect(page.url(), 'Cart page URL must be /cart').toContain('/cart');

      const cartBody = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      const hasCartItems = !cartBody.toLowerCase().includes('your cart is empty');
      report.stages.cart.details = { cartBodySnippet: cartBody.slice(0, 300), hasCartItems };

      // FIX 1: Strict Assertion on hasCartItems === true!
      if (!hasCartItems) {
        report.stages.cart.failureReason = 'Logged-In session cart persistence failed: Cart body reads "Your cart is empty" despite active userAuthTokenData session.';
        report.stages.cart.passed = false;
      } else {
        report.stages.cart.passed = true;
      }

      // ---------------------------------------------------------------------
      // Stage 7: Checkout Route Guard & Exact Failure Reason Logging
      // ---------------------------------------------------------------------
      console.log('[7/9 LOGGED-IN] Testing Checkout Flow & Capture Failure Reason...');
      report.stages.checkout.reached = true;

      const proceedBtn = page.locator('button:has-text("Proceed"), button:has-text("PROCEED"), button:has-text("Checkout"), a[href*="checkout"]').first();
      let clickAttempted = false;
      if (await proceedBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        clickAttempted = true;
        await proceedBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
      } else {
        await page.goto(new URL('/checkout', STAGING_URL).toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }

      await page.screenshot({ path: 'screenshots/auth-flow/7-checkout-step.png' });
      const currentUrl = page.url();
      const checkoutReached = currentUrl.includes('/checkout');
      const redirectedToHome = currentUrl === STAGING_URL;

      report.stages.checkout.details = { finalUrl: currentUrl, clickAttempted, checkoutReached, redirectedToHome };
      
      // FIX 2: Detailed Failure Reason for Checkout!
      if (!checkoutReached) {
        report.stages.checkout.passed = false;
        if (redirectedToHome) {
          report.stages.checkout.failureReason = 'Logged-In Checkout Blocked: Client-side router / Next.js middleware issued a HTTP 307 redirect back to Home page (https://smpl-new.bangalore2.com/).';
        } else {
          report.stages.checkout.failureReason = `Logged-In Checkout Blocked: Navigation ended at '${currentUrl}' instead of '/checkout'.`;
        }
      }

      // ---------------------------------------------------------------------
      // Stage 8: Address Selection / Form & Diagnostic Inspection
      // ---------------------------------------------------------------------
      console.log('[8/9 LOGGED-IN] Inspecting Address Selection Stage...');
      report.stages.address.reached = true;

      const currentAddressUrl = page.url();
      const addressFormLocator = page.locator('form, input[placeholder*="Address" i], div[class*="address"]').first();
      const hasAddressForm = await addressFormLocator.isVisible({ timeout: 4000 }).catch(() => false);

      let matchedElementInfo: any = null;
      if (hasAddressForm) {
        matchedElementInfo = await addressFormLocator.evaluate(el => ({
          tagName: el.tagName,
          className: el.className,
          outerHTMLSnippet: el.outerHTML.slice(0, 200),
          isInsideCheckoutRoute: window.location.pathname.includes('/checkout')
        })).catch(() => null);
      }

      await page.screenshot({ path: 'screenshots/auth-flow/8-address-diagnostic.png' });

      console.log(`\n  === STAGE 8 ADDRESS DIAGNOSTIC INFO ===`);
      console.log(`  Current Page URL           : ${currentAddressUrl}`);
      console.log(`  Matched Selector Element   : ${matchedElementInfo ? `${matchedElementInfo.tagName}.${matchedElementInfo.className}` : 'None'}`);
      console.log(`  Matched OuterHTML Snippet  : ${matchedElementInfo ? matchedElementInfo.outerHTMLSnippet : 'None'}`);
      console.log(`  Is Inside Checkout Route   : ${matchedElementInfo ? matchedElementInfo.isInsideCheckoutRoute : false}`);
      console.log(`  =========================================\n`);

      // Address stage passes ONLY if we are inside the /checkout route AND a checkout address form/modal is visible!
      const realCheckoutAddressPassed = hasAddressForm && currentAddressUrl.includes('/checkout');
      report.stages.address.passed = realCheckoutAddressPassed;

      report.stages.address.details = {
        currentUrl: currentAddressUrl,
        matchedElement: matchedElementInfo,
        realCheckoutAddressPassed
      };

      if (!realCheckoutAddressPassed) {
        if (!currentAddressUrl.includes('/checkout')) {
          report.stages.address.failureReason = `False-Positive Prevented: Stage evaluated on unrelated URL (${currentAddressUrl}) because selector matched a footer/page element outside checkout. Address stage is unreachable while /checkout redirects to Home.`;
        } else {
          report.stages.address.failureReason = 'Address stage failed: Address form inputs not rendered inside checkout view.';
        }
      }

      // ---------------------------------------------------------------------
      // Stage 9: Payment Methods List & Failure Reason
      // ---------------------------------------------------------------------
      console.log('[9/9 LOGGED-IN] Inspecting Payment Methods...');
      report.stages.payment.reached = true;

      const bodyText = await page.evaluate(() => document.body.innerText);
      const observedMethods = ['UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery', 'COD', 'EMI', 'Net Banking', 'Wallet']
        .filter(m => new RegExp(m, 'i').test(bodyText));

      report.paymentMethodsObserved = observedMethods;
      report.stages.payment.passed = observedMethods.length > 0;
      await page.screenshot({ path: 'screenshots/auth-flow/9-payment-methods.png' });

      if (observedMethods.length === 0) {
        report.stages.payment.failureReason = report.stages.checkout.passed 
          ? 'Payment stage failed: No payment gateways or options rendered on page.' 
          : 'Blocked: Payment stage unreachable because Checkout route guard blocked navigation.';
      }

    } catch (err: any) {
      console.error('Logged-In Flow Error:', err.message);
      Object.keys(report.stages).forEach(stageKey => {
        const s = (report.stages as any)[stageKey];
        if (s.reached && !s.passed && !s.failureReason) {
          s.failureReason = err.message;
        }
      });
    } finally {
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync('reports/logged-in-user-mobile-audit.json', JSON.stringify(report, null, 2));
      console.log('\n=== LOGGED-IN USER MOBILE AUDIT REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      await context.close();

      // FIX 3: Top-level Playwright assertion forces RED fail when any stage fails!
      const failedStages = Object.entries(report.stages).filter(([_, s]) => !s.passed);
      if (failedStages.length > 0) {
        const stageFailures = failedStages.map(([k, s]) => `[${k}: ${s.failureReason}]`).join('\n  -> ');
        expect.soft(failedStages.length, `Logged-In User Flow failed on ${failedStages.length} stage(s):\n  -> ${stageFailures}`).toBe(0);
      }
    }
  });
});
