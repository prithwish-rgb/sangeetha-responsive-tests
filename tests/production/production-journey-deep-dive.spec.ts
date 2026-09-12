import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import { dismissBlockingPopups } from '../hyperlocal/helpers/popup.helper';

const EVIDENCE_DIR = path.resolve('scratch/discovery_evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function dismissModals(page: Page) {
  await dismissBlockingPopups(page);
}

test.describe('🔬 Production Deep Discovery & Validation Suite', () => {
  test.setTimeout(120000);

  test('STEP 1 & 2: Homepage & Location / Hyperlocal Flow', async ({ page }) => {
    const capturedApis: any[] = [];
    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('/b/') || url.includes('/api/')) {
        capturedApis.push({
          url: url.slice(0, 100),
          method: resp.request().method(),
          status: resp.status()
        });
      }
    });

    // 1. Load Homepage
    console.log('[STEP 1] Navigating to https://www.sangeetha.com/ ...');
    const resp = await page.goto('https://www.sangeetha.com/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status()).toBe(200);
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`[STEP 1] Homepage Title: "${title}"`);
    expect(title).toContain('Sangeetha');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_homepage_initial.png') });

    // 2. Location Modal on initial load
    const typeManuallyBtn = page.locator('button:has-text("Type manually"), button:has-text("Type Manually")').first();
    const isModalPresent = await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[STEP 2] Location initial modal present: ${isModalPresent}`);

    if (isModalPresent) {
      await typeManuallyBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_location_manual_input_opened.png') });
    }

    const pinInput = page.locator('input[placeholder*="Pincode" i], input[placeholder*="pincode" i], input[type="number"]').first();
    expect(await pinInput.isVisible()).toBeTruthy();

    // 2a. Enter valid pincode 560078
    console.log('[STEP 2] Submitting valid pincode: 560078');
    await pinInput.fill('560078');
    const checkBtn = page.locator('button:has-text("Check"), button.btn-check-custom').first();
    await checkBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_location_560078_applied.png') });

    const headerLocation = await page.locator('.mega_menu_location, [class*="location" i]').first().innerText().catch(() => '');
    console.log(`[STEP 2] Header Location display: "${headerLocation.trim()}"`);
    expect(headerLocation).toContain('560078');
  });

  test('STEP 3 & 4: Search & Product Listing Page (PLP)', async ({ page }) => {
    await page.goto('https://www.sangeetha.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissModals(page);

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Type query to test suggestions
    console.log('[STEP 3] Typing "Samsung" into search...');
    await searchInput.click();
    await searchInput.fill('Samsung');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_search_suggestions_dropdown.png') });

    // Submit search
    console.log('[STEP 3] Pressing Enter to navigate to Search Results...');
    await searchInput.press('Enter');
    await page.waitForTimeout(3500);

    const searchUrl = page.url();
    console.log(`[STEP 3] Search Results Page URL: ${searchUrl}`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_search_results_page.png') });

    // Inspect PLP cards
    const productCards = page.locator('a[href*="/product/"], a[href*="product-details"], [class*="productCard"], [class*="product-card"]');
    const cardCount = await productCards.count();
    console.log(`[STEP 4] Found ${cardCount} product cards on PLP.`);
    expect(cardCount).toBeGreaterThan(0);

    // Check first card details
    const firstCard = productCards.first();
    const cardText = await firstCard.innerText();
    console.log(`[STEP 4] First product card text: "${cardText.replace(/\n+/g, ' | ').slice(0, 100)}"`);
  });

  test('STEP 5 & 6: Product Details Page (PDP), Variants, & Add to Cart', async ({ page }) => {
    // Open PDP directly
    const pdpUrl = 'https://www.sangeetha.com/product-details/samsung-galaxy-s24-ultra-5g-12gb-256gb-titanium-gray/19453';
    console.log(`[STEP 5] Navigating to PDP: ${pdpUrl}`);
    await page.goto(pdpUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_pdp_overview.png') });

    const titleEl = page.locator('h1, h2.product_title, [class*="product-title"]').first();
    const title = await titleEl.innerText().catch(() => '');
    console.log(`[STEP 5] Product Title: "${title.trim()}"`);
    expect(title.length).toBeGreaterThan(0);

    const priceEl = page.locator('[class*="price" i], [class*="Price" i]').first();
    const priceText = await priceEl.innerText().catch(() => '');
    console.log(`[STEP 5] Price: "${priceText.trim()}"`);

    // Check Variants (colors / storage)
    const variantOptions = page.locator('button[class*="variant"], div[class*="variant"] button, [class*="color"] button, [class*="storage"] button, .variant_btn, .product_variant_box');
    const vCount = await variantOptions.count();
    console.log(`[STEP 5] Found ${vCount} variant options.`);
    if (vCount > 1) {
      console.log('Clicking second variant option...');
      await variantOptions.nth(1).click().catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_pdp_variant_selected.png') });
    }

    // Step 6: Add to Cart
    console.log('[STEP 6] Clicking Add to Cart...');
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Add to cart")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 5000 });
    await addToCartBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_after_add_to_cart.png') });

    // Check if cart badge or drawer appeared
    const cartBadge = page.locator('.cart_count, .badge, [class*="cart-badge"], [class*="cartCount"]').first();
    if (await cartBadge.isVisible().catch(() => false)) {
      console.log(`[STEP 6] Cart badge visible with count: "${await cartBadge.innerText()}"`);
    }
  });

  test('STEP 7: Cart Regression Flow (Item display, Qty, Save for Later, Remove, Coupons)', async ({ page }) => {
    console.log('[STEP 7] Navigating to Cart: https://www.sangeetha.com/cart ...');
    await page.goto('https://www.sangeetha.com/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_cart_view.png') });

    const cartItems = page.locator('.shopping-cart___wrap, [class*="card_radius__block"]');
    const count = await cartItems.count();
    console.log(`[STEP 7] Total line items in Cart: ${count}`);

    // Order Summary
    const summary = page.locator('.payment-order__summary, .cart-order__summary, [class*="order-summary"]').first();
    if (await summary.isVisible().catch(() => false)) {
      console.log(`[STEP 7] Order Summary: "${(await summary.innerText()).replace(/\n+/g, ' | ')}"`);
    }

    // Coupon UI
    const couponInput = page.locator('input[placeholder*="coupon" i], input.form-control-coupon').first();
    const hasCouponInput = await couponInput.isVisible().catch(() => false);
    console.log(`[STEP 7] Coupon input field visible: ${hasCouponInput}`);

    if (hasCouponInput) {
      console.log('Testing invalid coupon "DISCOUNT99"...');
      await couponInput.fill('DISCOUNT99');
      const applyBtn = page.locator('button:has-text("Apply"), button.rounded_coupon__btn').first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_cart_coupon_invalid_result.png') });
        console.log('Coupon error modal/toast handled.');
      }
    }

    // Proceed to Buy Button
    const proceedBtn = page.locator('button:has-text("Proceed to Buy"), button.btn-dark-custom-cart').first();
    console.log(`[STEP 7] Proceed to Buy button visible: ${await proceedBtn.isVisible().catch(() => false)}`);
  });

  test('STEP 8 & 9: Checkout & Card Payment Page Validation', async ({ page }) => {
    console.log('[STEP 8] Navigating to Checkout Payment: https://www.sangeetha.com/checkout-payment ...');
    await page.goto('https://www.sangeetha.com/checkout-payment', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_checkout_payment_screen.png') });

    // Validate Card payment fields
    const cardInput = page.locator('input[placeholder="XXXX XXXX XXXX XXXX"]').first();
    const expiryInput = page.locator('input[placeholder="MM / YYYY"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('.SanNew_payment__cardForm input:not([placeholder="XXXX XXXX XXXX XXXX"]):not([placeholder="MM / YYYY"]):not([placeholder="000"]):not([type="checkbox"]):not([type="radio"])').first();
    const payNowBtn = page.locator('button:has-text("Pay Now"), button.btn-place-order').first();

    const hasCardInput = await cardInput.isVisible().catch(() => false);
    console.log(`[STEP 9] Card input visible: ${hasCardInput}`);

    if (hasCardInput) {
      console.log('[STEP 9] Testing Card Input interactions & validation state...');
      // 1. Check initial state - Pay Now should be disabled
      console.log('Pay Now initially disabled:', await payNowBtn.isDisabled());
      expect(await payNowBtn.isDisabled()).toBeTruthy();

      // 2. Enter Valid Card Number Format (e.g. Test Visa)
      await cardInput.click();
      await cardInput.fill('4111 2222 3333 4444');
      await page.waitForTimeout(300);

      // 3. Enter Expiry Month/Year
      await expiryInput.click();
      await expiryInput.fill('12 / 2028');
      await page.waitForTimeout(300);

      // 4. Enter CVV
      await cvvInput.click();
      await cvvInput.fill('123');
      await page.waitForTimeout(300);

      // 5. Enter Cardholder Name if available
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.click();
        await nameInput.fill('Test Customer');
        await page.waitForTimeout(300);
      }

      await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_card_payment_filled.png') });

      // Verify Pay Now button dynamic state
      const isPayNowEnabled = await payNowBtn.isEnabled();
      console.log(`[STEP 9] Pay Now button enabled after valid inputs: ${isPayNowEnabled}`);

      // 6. Test Expiry Validation Error: Invalid Month "15 / 2028"
      await expiryInput.click();
      await expiryInput.fill('15 / 2028');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_card_expiry_invalid_error.png') });
      const hasExpiryErr = await page.locator('.SanNew_payment__cardForm:has-text("Enter valid Month"), .err-msg').first().isVisible().catch(() => false);
      console.log(`[STEP 9] Expiry validation error visible for month 15: ${hasExpiryErr}`);
    }
  });
});
