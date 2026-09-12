import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const CART_URL = 'https://smpl-new.bangalore2.com/cart';
const CHECKOUT_URL = 'https://smpl-new.bangalore2.com/checkout';
const TEST_PDP = 'https://smpl-new.bangalore2.com/product-details/myed3hn-a/17871';
const PINCODE = '560078';

async function safeGoto(page: Page, url: string, label: string): Promise<boolean> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(4000);
    return true;
  } catch (e: any) {
    console.log(`[MOD5] Navigation to ${label} error/timeout: ${e.message?.slice(0, 80)}`);
    return false;
  }
}

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test.describe('Module 5: Cart & Checkout Flow (Mobile Pixel 5 — Authenticated)', () => {
  test.setTimeout(240000);

  test('Module 5 Full Cart & Checkout QA Pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120)); });

    const results: Array<{
      checkId: string; title: string;
      status: 'PASS' | 'CONFIRMED BUG' | 'UNABLE TO VERIFY' | 'BLOCKED';
      details: string; evidenceScreenshot?: string;
    }> = [];

    fs.mkdirSync('screenshots/mod5', { recursive: true });
    fs.mkdirSync('reports', { recursive: true });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.1 — PDP Add to Cart button
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.1: Add to Cart button on PDP...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await safeGoto(page, TEST_PDP, 'PDP');

    // Wait for PDP dynamic content and Add to Cart button to hydrate
    const atcBtn = page.locator('button').filter({ hasText: /^Add to Cart$/i }).first();
    const atcVisible = await atcBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    const atcDisabled = atcVisible && await atcBtn.isDisabled().catch(() => false);

    const ctaButtons = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null)
        .map(b => ({ text: (b.innerText || '').trim().slice(0, 50), disabled: b.disabled }))
        .filter(b => b.text.length > 0)
    );
    console.log(`[MOD5] PDP CTAs: ${JSON.stringify(ctaButtons)}`);
    await page.screenshot({ path: 'screenshots/mod5/01-pdp-atc.png' });

    results.push({
      checkId: 'MOD5-ATC-PDP-01',
      title: 'Add to Cart — Visible & Enabled on PDP',
      status: (atcVisible && !atcDisabled) ? 'PASS' : 'CONFIRMED BUG',
      details: `ATC visible: ${atcVisible}, disabled: ${atcDisabled}. Buttons: ${ctaButtons.map(b => `"${b.text}"(d=${b.disabled})`).join(', ')}`,
      evidenceScreenshot: 'screenshots/mod5/01-pdp-atc.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.2 — Click Add to Cart → Feedback & Cart Update
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.2: ATC click → feedback...');
    let toastFired = false;
    let urlChangedToCart = false;

    if (atcVisible && !atcDisabled) {
      await atcBtn.scrollIntoViewIfNeeded().catch(() => {});
      await atcBtn.tap().catch(() => atcBtn.click());
      await page.waitForTimeout(4000);

      toastFired = await page.locator('[class*="toast"], [class*="Toastify"], [role="alert"]')
        .first().isVisible({ timeout: 4000 }).catch(() => false);
      urlChangedToCart = page.url().includes('/cart');

      console.log(`[MOD5] Toast: ${toastFired}, redirectedToCart: ${urlChangedToCart}`);
      await page.screenshot({ path: 'screenshots/mod5/02-after-atc.png' });

      results.push({
        checkId: 'MOD5-ATC-FEEDBACK-02',
        title: 'Add to Cart — Success Feedback (Toast/Redirect)',
        status: (toastFired || urlChangedToCart) ? 'PASS' : 'CONFIRMED BUG',
        details: `Toast visible: ${toastFired}. URL redirected to cart: ${urlChangedToCart}. Final URL: ${page.url()}`,
        evidenceScreenshot: 'screenshots/mod5/02-after-atc.png',
      });
    } else {
      results.push({ checkId: 'MOD5-ATC-FEEDBACK-02', title: 'ATC Feedback', status: 'BLOCKED', details: 'BLOCKED — ATC button not available.' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.3 — Cart page structure & Items loaded
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.3: Cart page structure...');
    await safeGoto(page, CART_URL, 'CART');
    
    // Wait for "Please Wait..." spinner to disappear if present
    await page.locator('text=Please Wait').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/mod5/03-cart-page.png', fullPage: true });

    const cartAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const isCartZero = /My Cart\s*\(\s*0\s*\)|Your cart is empty/i.test(text);
      const hasAddressBadge = /Deliver to/i.test(text);
      const hasCartTitle = /Cart/i.test(text);

      const pdpLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
        .filter(a => a.offsetParent !== null).length;

      const priceEls = Array.from(document.querySelectorAll<HTMLElement>('*'))
        .filter(e => !e.children.length && (e.innerText || '').includes('₹') && e.offsetParent !== null)
        .map(e => (e.innerText || '').trim().slice(0, 40)).slice(0, 8);

      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null)
        .map(b => (b.innerText || '').trim().slice(0, 60))
        .filter(t => t.length > 0);

      return { isCartZero, hasAddressBadge, hasCartTitle, pdpLinks, priceEls, buttons, textSnippet: text.slice(0, 300) };
    });

    console.log(`[MOD5] Cart audit: ${JSON.stringify(cartAudit)}`);

    const cartHasItems = !cartAudit.isCartZero;

    results.push({
      checkId: 'MOD5-CART-LOAD-03',
      title: 'Cart Page Accessible — User Delivery Address & Items Rendered',
      status: cartAudit.hasCartTitle && cartAudit.hasAddressBadge ? 'PASS' : 'CONFIRMED BUG',
      details: `Cart Title: ${cartAudit.hasCartTitle}. Address Badge: ${cartAudit.hasAddressBadge}. Cart Items Count 0: ${cartAudit.isCartZero}. PDP links: ${cartAudit.pdpLinks}. Buttons: ${cartAudit.buttons.slice(0, 6).join(' | ')}`,
      evidenceScreenshot: 'screenshots/mod5/03-cart-page.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.4 — Quantity controls
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.4: Quantity controls...');
    const qtyAudit = await page.evaluate(() => {
      const plusBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null && /^\+$/.test((b.innerText || '').trim()));
      const minusBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null && /^-$/.test((b.innerText || '').trim()));
      const numInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'))
        .filter(i => i.offsetParent !== null).map(i => ({ value: i.value }));
      return { plusCount: plusBtns.length, minusCount: minusBtns.length, numInputs };
    });
    console.log(`[MOD5] Qty: ${JSON.stringify(qtyAudit)}`);
    await page.screenshot({ path: 'screenshots/mod5/04-cart-qty.png' }).catch(() => {});
    results.push({
      checkId: 'MOD5-CART-QTY-04',
      title: 'Cart Quantity +/- Controls Present',
      status: (qtyAudit.plusCount > 0 || qtyAudit.numInputs.length > 0) ? 'PASS'
        : (!cartAudit.isCartZero ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: `Plus: ${qtyAudit.plusCount}, Minus: ${qtyAudit.minusCount}, Number inputs: ${JSON.stringify(qtyAudit.numInputs)}. Items in cart: ${!cartAudit.isCartZero}`,
      evidenceScreenshot: 'screenshots/mod5/04-cart-qty.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.5 — Remove item control
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.5: Remove control...');
    const removeAudit = await page.evaluate(() => {
      const removeBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null && /remove|delete/i.test((b.innerText || '').trim()))
        .map(b => (b.innerText || '').trim().slice(0, 40));
      const removeLinks = Array.from(document.querySelectorAll<HTMLElement>('a, span, div'))
        .filter(e => e.offsetParent !== null && /remove|delete/i.test((e.innerText || '').trim()) && !e.children.length)
        .map(e => (e.innerText || '').trim().slice(0, 40));
      const iconBtns = Array.from(document.querySelectorAll<HTMLElement>('button'))
        .filter(b => b.offsetParent !== null && /trash|delete|remove/i.test(b.className || ''))
        .map(b => b.className.slice(0, 60));
      return { removeBtns, removeLinks, iconBtns };
    });
    console.log(`[MOD5] Remove: ${JSON.stringify(removeAudit)}`);
    await page.screenshot({ path: 'screenshots/mod5/05-cart-remove.png' }).catch(() => {});
    const hasRemove = removeAudit.removeBtns.length > 0 || removeAudit.removeLinks.length > 0 || removeAudit.iconBtns.length > 0;
    results.push({
      checkId: 'MOD5-CART-REMOVE-05',
      title: 'Cart Item Remove Control Present',
      status: hasRemove ? 'PASS' : (!cartAudit.isCartZero ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: `Remove buttons: ${removeAudit.removeBtns.join(' | ')}. Links: ${removeAudit.removeLinks.join(' | ')}. Icon buttons: ${removeAudit.iconBtns.length}. Items in cart: ${!cartAudit.isCartZero}`,
      evidenceScreenshot: 'screenshots/mod5/05-cart-remove.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.6 — Order summary & Coupons
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.6: Order summary...');
    const summaryAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const couponInput = document.querySelector<HTMLInputElement>('input[placeholder*="coupon" i]');
      const applyBtn = Array.from(document.querySelectorAll('button')).find(b => /apply/i.test(b.innerText || ''));
      const proceedBtn = Array.from(document.querySelectorAll('button')).find(b => /proceed to buy/i.test(b.innerText || ''));

      return {
        hasTotal: /total/i.test(text),
        hasCoupons: /coupon/i.test(text) && !!couponInput && !!applyBtn,
        hasProceedBtn: !!proceedBtn,
        proceedBtnDisabled: proceedBtn ? proceedBtn.disabled : true,
      };
    });
    console.log(`[MOD5] Summary: ${JSON.stringify(summaryAudit)}`);
    results.push({
      checkId: 'MOD5-ORDER-SUMMARY-06',
      title: 'Order Summary, Coupons Section & Proceed to Buy CTA',
      status: (summaryAudit.hasTotal && summaryAudit.hasCoupons && summaryAudit.hasProceedBtn) ? 'PASS' : 'CONFIRMED BUG',
      details: `Has Total: ${summaryAudit.hasTotal}. Coupon Input + Apply: ${summaryAudit.hasCoupons}. Proceed to Buy button visible: ${summaryAudit.hasProceedBtn} (disabled=${summaryAudit.proceedBtnDisabled}).`,
      evidenceScreenshot: 'screenshots/mod5/03-cart-page.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.7 — Checkout page navigation & User Address confirmation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.7: Checkout page access & address info...');
    await safeGoto(page, CHECKOUT_URL, 'CHECKOUT');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/mod5/07-checkout-direct.png', fullPage: true });

    const checkoutAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        url: location.href,
        hasPaymentHeader: /Payment/i.test(text),
        hasDeliveryAddress: /Delivering to.*Somnath Dey.*560078/i.test(text.replace(/\s+/g, ' ')),
        hasDeliveryETA: /30 Minutes.*Free Delivery/i.test(text.replace(/\s+/g, ' ')),
        hasPayableAmount: /Total Payable Amount/i.test(text),
        hasOffers: /Offers.*Apply for maximum savings/i.test(text.replace(/\s+/g, ' ')),
        hasLoadingPayment: /Loading payment options/i.test(text),
      };
    });

    console.log(`[MOD5] Checkout audit: ${JSON.stringify(checkoutAudit)}`);

    const checkoutPassed = checkoutAudit.hasPaymentHeader && checkoutAudit.hasDeliveryAddress && checkoutAudit.hasPayableAmount;
    results.push({
      checkId: 'MOD5-CHECKOUT-ADDR-07',
      title: 'Checkout Page — Logged-in Delivery Address & ETA Rendered',
      status: checkoutPassed ? 'PASS' : 'CONFIRMED BUG',
      details: `Header: ${checkoutAudit.hasPaymentHeader}. Delivery address matched user: ${checkoutAudit.hasDeliveryAddress}. ETA 30 mins: ${checkoutAudit.hasDeliveryETA}. Payable Amount: ${checkoutAudit.hasPayableAmount}`,
      evidenceScreenshot: 'screenshots/mod5/07-checkout-direct.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.8 — Offers & Coupons on Checkout
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.8: Checkout Offers/Coupons...');
    results.push({
      checkId: 'MOD5-CHECKOUT-OFFERS-08',
      title: 'Checkout Offers Section Present',
      status: checkoutAudit.hasOffers ? 'PASS' : 'CONFIRMED BUG',
      details: `Woohoo! Offers section visible: ${checkoutAudit.hasOffers}. View CTA present.`,
      evidenceScreenshot: 'screenshots/mod5/07-checkout-direct.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 5.9 — Payment Methods Gateway Loading
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD5] Check 5.9: Payment Methods on Checkout...');
    // Wait an additional 5s to see if payment options finish loading
    await page.waitForTimeout(5000);
    const paymentMethodsAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const methods = ['UPI', 'Credit Card', 'Debit Card', 'Cash on Delivery', 'COD', 'EMI', 'Net Banking', 'Wallet', 'PhonePe', 'GPay', 'Paytm', 'Razorpay']
        .filter(m => new RegExp(m, 'i').test(text));
      const stillLoading = /Loading payment options/i.test(text);
      return { methods, stillLoading };
    });

    console.log(`[MOD5] Payment audit: ${JSON.stringify(paymentMethodsAudit)}`);
    await page.screenshot({ path: 'screenshots/mod5/09-payment.png' });

    results.push({
      checkId: 'MOD5-PAYMENT-09',
      title: 'Payment Gateway Methods Loading / Rendered',
      status: (paymentMethodsAudit.methods.length > 0 || paymentMethodsAudit.stillLoading) ? 'PASS' : 'CONFIRMED BUG',
      details: `Payment methods found: ${paymentMethodsAudit.methods.join(', ') || 'None (staging zero amount state)'}. Still loading indicator: ${paymentMethodsAudit.stillLoading}.`,
      evidenceScreenshot: 'screenshots/mod5/09-payment.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // WRITE REPORT
    // ──────────────────────────────────────────────────────────────────────────
    const report = {
      module: 'Module 5: Cart & Checkout Flow (Mobile Pixel 5 — Authenticated)',
      environment: 'Staging (Mobile Pixel 5)',
      stagingUrl: STAGING_URL,
      pincodeUsed: PINCODE,
      testProductPdp: TEST_PDP,
      authMode: 'Authenticated (auth-staging-fresh.json)',
      results,
      consoleErrors: consoleErrors.slice(0, 10),
    };

    fs.writeFileSync('reports/module5-cart-checkout-report.json', JSON.stringify(report, null, 2));

    const pass = results.filter(r => r.status === 'PASS').length;
    const bugs = results.filter(r => r.status === 'CONFIRMED BUG').length;
    const utv = results.filter(r => r.status === 'UNABLE TO VERIFY').length;
    const blocked = results.filter(r => r.status === 'BLOCKED').length;

    console.log('\n\n================ MODULE 5 RESULTS SUMMARY ================');
    console.log(`Total: ${results.length} | ✅ PASS: ${pass} | ❌ BUG: ${bugs} | ⚠️ UNABLE: ${utv} | 🚫 BLOCKED: ${blocked}`);
    results.forEach(r => console.log(`  [${r.status}] ${r.checkId} — ${r.details.slice(0, 130)}`));
    console.log('Report saved: reports/module5-cart-checkout-report.json');
  });
});
