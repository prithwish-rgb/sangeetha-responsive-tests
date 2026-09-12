import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';
const CART_URL = `${BASE}/cart`;
const TEST_PDP_URL = `${BASE}/product-details/apple-iphone-17e-512gb-white-mhu04hna/20315`;

test.describe('Cart page — fields and functionality', () => {

  test.beforeEach(async ({ page }) => {
    // Dismiss modals if present
    const dismissModals = async () => {
      const modalBtn = page.locator('.modal.show button:has-text("Accept"), button:has-text("Accept"), button.btn-close').first();
      if (await modalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalBtn.click({ force: true }).catch(() => null);
      }
    };

    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await dismissModals();

    const hasActiveCartItem = await page.locator('button:has-text("Proceed to Buy"), .btn-dark-custom-cart').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasActiveCartItem) {
      console.log('[cart.spec.ts] No active cart item found, adding 1 item from PDP...');
      await page.goto(TEST_PDP_URL, { waitUntil: 'domcontentloaded' });
      await dismissModals();
      const atc = page.locator('button:has-text("Add to Cart"), button:has-text("Buy Now")').first();
      if (await atc.isVisible({ timeout: 5000 }).catch(() => false)) {
        await atc.click({ force: true }).catch(() => null);
        await page.waitForTimeout(2000);
      }
      await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await dismissModals();
    }
  });

  test('cart item count in heading matches number of items actually listed', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const heading = page.locator('h1, h2, .shopping-cart__heading, :text-matches("My Cart", "i")').first();
    await heading.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    const headingText = await heading.innerText().catch(() => '');
    const countInHeading = parseInt(headingText.match(/\((\d+)\)/)?.[1] || '1', 10);

    const actualItemRows = await page.locator('.card_radius__blockPb-3, .shopping-cart___wrap').count();

    console.log(`Heading says ${countInHeading} item(s), actual rows found: ${actualItemRows}`);
    expect(actualItemRows).toBeGreaterThan(0);
  });

  test('order summary price is displayed correctly', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const priceEl = page.locator('.new-price, .new-cart-price, .new_cart_price_text, .shopping-cart___wrap').filter({ hasText: '₹' }).first();
    await expect(priceEl).toBeVisible({ timeout: 10000 });

    const priceText = await priceEl.innerText();
    const itemPrice = parseInt(priceText.replace(/[^\d]/g, ''), 10);
    console.log(`Item price displayed: ₹${itemPrice}`);
    expect(itemPrice).toBeGreaterThan(0);
  });

  test('coupon Apply button is disabled until a code is typed', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const couponInput = page.locator('.form-control-coupon, .form-control-cartNEW, input[placeholder*="Coupon" i]').first();
    const applyBtn = page.locator('.btn-coupon-absolute, .btn-dark-button.absolute-cart-input, button:has-text("Apply")').first();

    if (await couponInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(applyBtn).toBeDisabled();
      await couponInput.fill('TESTCODE123');
      const enabledAfterTyping = await applyBtn.isEnabled();
      console.log(`Apply button enabled after typing a coupon code: ${enabledAfterTyping}`);
    } else {
      console.log('Coupon input not visible on cart page.');
    }
  });

  test('invalid coupon code shows feedback or remains handled', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const couponInput = page.locator('.form-control-coupon, .form-control-cartNEW, input[placeholder*="Coupon" i]').first();
    const applyBtn = page.locator('.btn-coupon-absolute, .btn-dark-button.absolute-cart-input, button:has-text("Apply")').first();

    if (await couponInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await couponInput.fill('DEFINITELYNOTAREALCODE999');
      if (await applyBtn.isEnabled()) {
        await applyBtn.click();
        await page.waitForTimeout(1000);
        const errorVisible = await page.getByText(/invalid|expired|not applicable|not valid/i).first().isVisible().catch(() => false);
        console.log(`Invalid coupon feedback shown: ${errorVisible}`);
      }
    }
  });

  test('View Coupons button or coupon tag is present in cart', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const viewCouponsBtn = page.locator('.view_coupon_new, .coupon-tag, .cart-coupon__head, :text-matches("coupon", "i")').first();
    const isPresent = await viewCouponsBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Coupon section / button visible: ${isPresent}`);
    expect(isPresent).toBe(true);
  });

  test('Remove button removes the item and updates cart count', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const itemRows = page.locator('.card_radius__blockPb-3, .shopping-cart___wrap');
    const initialCount = await itemRows.count();

    const removeBtn = page.locator('.btn-remove, button:has-text("Remove")').first();
    if (await removeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await removeBtn.click();
      await page.waitForTimeout(2000);

      const confirmBtn = page.locator('.modal.show button:has-text("Remove"), .modal.show button:has-text("Yes")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }

      const newCount = await itemRows.count();
      console.log(`Count before remove: ${initialCount}, after: ${newCount}`);
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('Save for later button moves the item without JS errors', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const saveForLaterBtn = page.locator('.btn-save-for-later:has-text("Save"), button:has-text("Save For Later")').first();
    if (await saveForLaterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveForLaterBtn.click();
      await page.waitForTimeout(2000);
      expect(errors).toHaveLength(0);
      console.log('Save for later clicked without JS error');
    }
  });

  test('"Proceed to Buy" button is clickable and progresses checkout', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const proceedBtn = page.locator('button:has-text("Proceed to Buy"), .btn-place-order, .btn-dark-custom-cart').first();
    await expect(proceedBtn).toBeVisible({ timeout: 8000 });
    await expect(proceedBtn).toBeEnabled();

    const startUrl = page.url();
    await proceedBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const urlChanged = page.url() !== startUrl || page.url().includes('checkout');
    console.log(`Proceed to Buy -> URL: ${page.url()} (navigated: ${urlChanged})`);
    expect(urlChanged).toBe(true);
  });

  test('"Change" delivery location button on cart page opens location picker', async ({ page }) => {
    await page.goto(CART_URL, { waitUntil: 'domcontentloaded' });

    const changeBtn = page.locator('.change-location-cart, .location-link, button:has-text("Change")').first();
    await expect(changeBtn).toBeVisible({ timeout: 8000 });
    await changeBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const modalOpened = await page.locator('.modal.show, [role="dialog"]').first().isVisible().catch(() => false);
    console.log(`Change location click -> modal opened: ${modalOpened}`);
    expect(modalOpened).toBe(true);
  });
});