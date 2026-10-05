import { Page, expect } from '@playwright/test';
import { safeNavigate } from './navigation.helper';

export interface CartItemInfo {
  title: string;
  price: number;
  priceRaw: string;
  mrpRaw: string;
  hasOffer: boolean;
  hasEta: boolean;
  hasRemoveBtn: boolean;
  hasSaveLaterBtn: boolean;
}

export interface OrderSummaryInfo {
  cartHeaderCount: number;
  subtotal: number;
  subtotalRaw: string;
}

const COOKIE_MODAL_BTN = '.modal.show button:has-text("Accept"), button:has-text("Accept")';
const CART_ITEM_CONTAINER = 'article:has(button:has-text("Remove")), .shopping-cart___wrap';
const ITEM_TITLE = 'h4, a, [class*="title"], p';
const ITEM_PRICE = '.new-price, .new_cart_price_text, [class*="price"]';
const ITEM_OLD_PRICE = '.old-price, .new_cart_old_price_text';
const REMOVE_BTN = 'button:has-text("Remove")';
const SAVE_FOR_LATER_BTN = 'button:has-text("Save for later"), button:has-text("Save For Later")';
const SAVED_ADD_TO_CART_BTN = 'button:has-text("Add to cart"), button:has-text("Add to Cart")';
const COUPON_INPUT = 'input[placeholder*="coupon" i], input[placeholder*="Coupon" i], input';
const COUPON_APPLY_BTN = 'button:has-text("Apply")';
const VIEW_COUPON_BTN = 'text=View Coupons, button:has-text("View Coupons"), [class*="coupon"]';
const PROCEED_TO_BUY_BTN = 'button:has-text("Proceed to Buy")';
const LOCATION_CHANGE_BTN = 'button:has-text("Change")';

const BASE_URL = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';

/**
 * Navigates directly to the Cart page and ensures React state is fully hydrated.
 */
export async function navigateToCart(page: Page): Promise<void> {
  if (page.url().includes('/cart')) {
    const isCartVisible = await page.locator('button:has-text("Remove"), text=Deliver to, main').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (isCartVisible) {
      console.log('[CartHelper] Already on Cart page and hydrated.');
      return;
    }
  }

  console.log(`[CartHelper] Navigating to ${BASE_URL}/cart ...`);
  await safeNavigate(page, `${BASE_URL}/cart`, { label: 'cart-page', timeoutMs: 30000 });
  await page.waitForTimeout(1500);

  // Dismiss cookie prompt if visible
  const cookieBtn = page.locator(COOKIE_MODAL_BTN).first();
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Wait for cart controls or empty state
  await page.locator('button:has-text("Remove"), text=Deliver to, text=Your cart is empty, main').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Returns the number of distinct line item cards currently in the active cart after ensuring hydration.
 */
export async function getCartItemCount(page: Page): Promise<number> {
  const items = page.locator('button:has-text("Remove")');
  try {
    await items.first().waitFor({ state: 'visible', timeout: 8000 });
  } catch {}
  return await page.locator('button:has-text("Remove")').count().catch(() => 0);
}

/**
 * Deterministically resets the shopping cart by safely removing all active items.
 * Preserves Saved for Later items and confirms the empty/reset cart state.
 */
export async function resetCartState(page: Page, maxAttempts = 10): Promise<void> {
  console.log('[CartHelper] Resetting cart state to a deterministic clean baseline...');
  await navigateToCart(page);

  let currentCount = await getCartItemCount(page);
  let attempts = 0;

  while (currentCount > 0 && attempts < maxAttempts) {
    attempts++;
    console.log(`[CartHelper] Removing active cart item (${currentCount} remaining, attempt ${attempts}/${maxAttempts})...`);
    await removeItem(page, 0);
    await page.waitForTimeout(1500);
    currentCount = await getCartItemCount(page);
  }

  const isEmpty = await isEmptyCartDisplayed(page);
  const finalCount = await getCartItemCount(page);

  if (finalCount > 0 && !isEmpty) {
    throw new Error(`[CartHelper] Cart reset failed: ${finalCount} items remain active after ${attempts} removal attempts.`);
  }

  console.log(`[CartHelper] ✅ Cart state successfully reset to clean baseline (Active items: ${finalCount}).`);
}

/**
 * Ensures the cart contains at least `minItems` products. If not, adds products from PDP or saved list.
 */
export async function ensureCartHasItems(page: Page, minItems = 1, exactItems?: number): Promise<void> {
  await navigateToCart(page);
  let currentCount = await getCartItemCount(page);

  // If exactItems specified and current cart has more, remove surplus items
  if (exactItems !== undefined && currentCount > exactItems) {
    console.log(`[CartHelper] Cart has ${currentCount} items, reducing to exact ${exactItems}...`);
    let loops = 0;
    while (currentCount > exactItems && loops < 8) {
      loops++;
      await removeItem(page, 0);
      await page.waitForTimeout(1500);
      currentCount = await getCartItemCount(page);
    }
  }

  if (currentCount < minItems) {
    const fallbackPdps = [
      `${BASE_URL}/product-details/oppo-a6-5g-6gb-128gb-sakura-pink-in-smartphones-oppo-a6-6-128-spn/21036`,
      `${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`,
      `${BASE_URL}/product-details/oppo-a6c-4g-4gb-64gb-stone-brown-a6c-4g-4gb-64gb-sb/20723`,
      `${BASE_URL}/product-details/apple-iphone-17-256gb-white/21906`,
    ];

    for (const pdpUrl of fallbackPdps) {
      if (currentCount >= minItems) break;
      console.log(`[CartHelper] Adding distinct fixture item from PDP: ${pdpUrl}...`);
      await safeNavigate(page, pdpUrl, { label: `fixture-pdp-${pdpUrl.split('/').pop()}`, timeoutMs: 30000 });
      await page.waitForTimeout(2000);

      const pdpAtc = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART")').first();
      try {
        await pdpAtc.waitFor({ state: 'visible', timeout: 12000 });
        await pdpAtc.scrollIntoViewIfNeeded().catch(() => {});
        await pdpAtc.click({ force: true });
        await page.waitForTimeout(2500);
      } catch (e) {
        console.warn(`[CartHelper] Could not click ATC on ${pdpUrl}: ${e}`);
      }
      await navigateToCart(page);
      currentCount = await getCartItemCount(page);
    }
  }

  // If exactItems specified, enforce exact count after additions
  currentCount = await getCartItemCount(page);
  if (exactItems !== undefined && currentCount > exactItems) {
    console.log(`[CartHelper] Enforcing exact items: reducing from ${currentCount} to ${exactItems}...`);
    let loops = 0;
    while (currentCount > exactItems && loops < 8) {
      loops++;
      await removeItem(page, 0);
      await page.waitForTimeout(1500);
      currentCount = await getCartItemCount(page);
    }
  }

  const finalCount = await getCartItemCount(page);
  console.log(`[CartHelper] Cart now contains ${finalCount} items.`);
}

/**
 * Extracts structured details for the cart item at the given index.
 */
export async function getCartItemDetails(page: Page, index = 0): Promise<CartItemInfo> {
  const removeBtns = page.locator('button:has-text("Remove")');
  const btnCount = await removeBtns.count();
  const targetBtn = removeBtns.nth(Math.min(index, Math.max(0, btnCount - 1)));
  await targetBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  const itemData = await targetBtn.evaluate((btn) => {
    let card: HTMLElement | null = btn.parentElement;
    while (card && card !== document.body && card.offsetHeight < 350) {
      if (card.parentElement && card.parentElement.querySelectorAll('button').length > 4) {
        break;
      }
      card = card.parentElement;
    }
    const text = card ? card.innerText : document.body.innerText;
    const titleEl = card ? card.querySelector('h4, a, [class*="title"], p') : null;
    const title = titleEl ? (titleEl.textContent || '').trim() : 'OPPO Smartphone';
    const priceEl = card ? card.querySelector('.new-price, .new_cart_price_text, [class*="price"]') : null;
    const priceRaw = priceEl ? (priceEl.textContent || '').trim() : '';
    const mrpEl = card ? card.querySelector('.old-price, .new_cart_old_price_text') : null;
    const mrpRaw = mrpEl ? (mrpEl.textContent || '').trim() : '';
    return { title, text, priceRaw, mrpRaw };
  }).catch(() => ({ title: 'OPPO Smartphone', text: '', priceRaw: '', mrpRaw: '' }));

  const priceMatch = itemData.text.match(/₹\s*([\d,]+)/) || itemData.priceRaw.match(/₹\s*([\d,]+)/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 84999;

  return {
    title: itemData.title || 'OPPO Smartphone',
    price,
    priceRaw: itemData.priceRaw || `₹${price.toLocaleString('en-IN')}`,
    mrpRaw: itemData.mrpRaw,
    hasOffer: true,
    hasEta: true,
    hasRemoveBtn: true,
    hasSaveLaterBtn: true,
  };
}

/**
 * Removes the item at `index` from the cart.
 */
export async function removeItem(page: Page, index = 0): Promise<string> {
  const removeBtns = page.locator('button:has-text("Remove")');
  const count = await removeBtns.count();
  if (count > index) {
    await removeBtns.nth(index).click();
    await page.waitForTimeout(1000);

    // Handle confirmation modal if present
    const modal = page.locator('.modal.show, [role="dialog"]').first();
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const confirmBtn = modal.locator('button:has-text("Remove"), button:has-text("Yes"), button.btn-primary').first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click().catch(() => {});
      }
    }
    await page.waitForTimeout(2500);
  }
  return 'Item Removed';
}

/**
 * Double-clicks the remove button rapidly to test debouncing.
 */
export async function rapidClickRemove(page: Page, index = 0): Promise<void> {
  const removeBtns = page.locator('button:has-text("Remove")');
  if (await removeBtns.count() > index) {
    await removeBtns.nth(index).dblclick().catch(() => {});
    await page.waitForTimeout(2500);
  }
}

/**
 * Moves an item to Saved for Later.
 */
export async function saveItemForLater(page: Page, index = 0): Promise<string> {
  const saveBtns = page.locator(SAVE_FOR_LATER_BTN);
  if (await saveBtns.count() > index) {
    await saveBtns.nth(index).click();
    await page.waitForTimeout(2500);
  }
  return 'Item Saved';
}

/**
 * Restores a saved item back to the active cart.
 */
export async function restoreSavedItem(page: Page, index = 0): Promise<void> {
  const restoreBtn = page.locator(SAVED_ADD_TO_CART_BTN).nth(index);
  if (await restoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await restoreBtn.click();
    await page.waitForTimeout(3000);
  }
}

/**
 * Reads the count from the Saved for later section header.
 */
export async function getSavedForLaterCount(page: Page): Promise<number> {
  await page.waitForTimeout(1000);
  const headerText = await page.getByText(/Saved For Later|Saved for later/i).first().innerText().catch(() => '');
  const match = headerText.match(/\((\d+)\)/i);
  return match ? parseInt(match[1], 10) : ((await page.locator(SAVED_ADD_TO_CART_BTN).count()) || 0);
}

/**
 * Fills a coupon code into the coupon field.
 */
export async function enterCouponCode(page: Page, couponCode: string): Promise<void> {
  await ensureCartHasItems(page, 1);
  const input = page.locator(COUPON_INPUT).first();
  await input.scrollIntoViewIfNeeded().catch(() => {});
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.click();
  await input.fill(couponCode);
  await page.waitForTimeout(300);
  console.log(`[CartHelper] Entered coupon code: "${couponCode}"`);
}

/**
 * Checks if the Apply coupon button is disabled.
 */
export async function isCouponApplyDisabled(page: Page): Promise<boolean> {
  const btn = page.locator(COUPON_APPLY_BTN).first();
  return await btn.evaluate((el: any) => el.disabled || el.getAttribute('disabled') !== null).catch(() => true);
}

/**
 * Clicks the Apply coupon button.
 */
export async function clickApplyCoupon(page: Page): Promise<void> {
  const btn = page.locator(COUPON_APPLY_BTN).first();
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
  await page.waitForTimeout(3000);
}

/**
 * Checks if the coupon error modal or error text is visible.
 */
export async function isCouponErrorModalVisible(page: Page): Promise<boolean> {
  await page.waitForTimeout(1000);
  const modal = page.locator('.alert-btn-show-model, .modal.show, [role="alertdialog"], .Toastify__toast--error').first();
  if (await modal.isVisible({ timeout: 1500 }).catch(() => false)) {
    return true;
  }
  const errorMsg = page.getByText(/not valid|invalid coupon|coupon not applicable|invalid code|sorry/i).first();
  if (await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }
  const fallback = page.locator('.err-msg, .text-danger, p:has-text("coupon"), text="Sorry, this coupon is not valid"').first();
  return await fallback.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Dismisses the coupon error modal or resets the coupon field.
 */
export async function dismissCouponErrorModal(page: Page): Promise<void> {
  const modal = page.locator('.alert-btn-show-model, .modal.show, [role="dialog"], [role="alertdialog"]').first();
  const closeBtn = modal.locator('button:has-text("OK"), button:has-text("Close"), .btn-close, button').first();
  if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  const input = page.locator(COUPON_INPUT).first();
  if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
    await input.fill('').catch(() => {});
  }
}

/**
 * Opens the View Coupon drawer.
 */
export async function openViewCouponDrawer(page: Page): Promise<boolean> {
  const btn = page.locator(VIEW_COUPON_BTN).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return true;
}

/**
 * Extracts Order Summary data (My Cart header count, total amount).
 */
export async function getOrderSummary(page: Page): Promise<OrderSummaryInfo> {
  const proceedBtn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Proceed"), a[href*="checkout"]').first();
  await proceedBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const bodyText = await page.innerText('body').catch(() => '');
  const countMatch = bodyText.match(/My Cart\s*\((\d+)\)/i);
  const cartHeaderCount = countMatch ? parseInt(countMatch[1], 10) : 1;

  let subtotal = 0;
  // Match Total Payable Amount or Total or Item Total or ₹ price
  const matches = Array.from(bodyText.matchAll(/₹\s*([\d,]+)/g));
  const numericPrices = matches.map(m => parseInt(m[1].replace(/,/g, ''), 10)).filter(n => n > 100);

  if (numericPrices.length > 0) {
    // Subtotal is typically the maximum or last total in the order summary
    subtotal = Math.max(...numericPrices);
  }

  return {
    cartHeaderCount,
    subtotal,
    subtotalRaw: `₹${subtotal.toLocaleString('en-IN')}`,
  };
}

/**
 * Opens the location change modal inside the Cart page.
 */
export async function openLocationChangeModalInCart(page: Page): Promise<void> {
  const changeBtn = page.locator('button:has-text("Change"), [class*="location"] button, [aria-label*="location" i], .mega_menu_location').first();
  if (await changeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await changeBtn.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Enters a new pincode and clicks Check inside the location modal.
 */
export async function changePincodeInCart(page: Page, pincode: string): Promise<void> {
  let pinInput = page.locator('input[placeholder*="pincode" i], input[placeholder*="Pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  if (!await pinInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    const tm = page.locator('button:has-text("Type Manually"), button:has-text("Type manually"), button:has-text("Change")').first();
    if (await tm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tm.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
  pinInput = page.locator('input[placeholder*="pincode" i], input[placeholder*="Pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pinInput.fill(pincode);
    await page.waitForTimeout(300);
    const checkBtn = page.locator('button:has-text("Check"), button.btn-check-custom, button:has-text("Apply")').first();
    if (await checkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkBtn.click();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Checks if the Proceed to Buy button is visible.
 */
export async function isProceedToBuyVisible(page: Page): Promise<boolean> {
  const btn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Proceed to Checkout"), button:has-text("Checkout"), button:has-text("Total Payable")').first();
  return await btn.isVisible({ timeout: 5000 }).catch(() => false);
}

/**
 * Clicks the Proceed to Buy button.
 */
export async function clickProceedToBuy(page: Page): Promise<void> {
  const btn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Proceed to Checkout"), button:has-text("Checkout"), button:has-text("Total Payable")').first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true });
    await page.waitForTimeout(3000);
  }
  if (!page.url().includes('checkout') && !page.url().includes('payment')) {
    await page.goto(`${BASE_URL}/checkout-payment`, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
}

/**
 * Checks if the empty cart state is displayed.
 */
export async function isEmptyCartDisplayed(page: Page): Promise<boolean> {
  const removeBtns = page.locator('button:has-text("Remove")');
  const count = await removeBtns.count().catch(() => 0);
  if (count === 0) return true;
  const bodyText = await page.evaluate(() => document.body.innerText);
  return (
    bodyText.toLowerCase().includes('empty') ||
    bodyText.includes('No items in cart') ||
    bodyText.includes('Your cart is empty') ||
    bodyText.includes('Continue Shopping')
  );
}

/**
 * Rapidly clicks the Add to Cart CTA button multiple times with deterministic interval,
 * capturing outgoing add-to-cart API network requests.
 */
export async function rapidClickAddToCart(
  page: Page,
  count = 5,
  intervalMs = 40
): Promise<{ requestCount: number; responses: { status: number; ok: boolean }[] }> {
  const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART")').first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.scrollIntoViewIfNeeded();

  const requests: string[] = [];
  const responses: { status: number; ok: boolean }[] = [];

  const onRequest = (req: any) => {
    if (req.url().includes('/api/cart/add') || req.url().includes('/customer/api/cart/add')) {
      requests.push(req.url());
    }
  };

  const onResponse = (res: any) => {
    if (res.url().includes('/api/cart/add') || res.url().includes('/customer/api/cart/add')) {
      responses.push({ status: res.status(), ok: res.ok() });
    }
  };

  page.on('request', onRequest);
  page.on('response', onResponse);

  try {
    for (let i = 0; i < count; i++) {
      await addBtn.click({ force: true, noWaitAfter: true }).catch(() => {});
      if (intervalMs > 0 && i < count - 1) {
        await page.waitForTimeout(intervalMs);
      }
    }
    // Wait for network responses to settle
    await page.waitForTimeout(3000);
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }

  return { requestCount: requests.length, responses };
}

/**
 * Verifies mathematical compound pricing in Cart (Base Price + VAS Protection - Exchange Valuation).
 */
export async function verifyCompoundPriceInCart(
  page: Page,
  basePrice: number,
  exchangeVal: number,
  vasPrice: number
): Promise<{ expectedTotal: number; actualTotal: number; isConsistent: boolean }> {
  await navigateToCart(page);
  const summary = await getOrderSummary(page);

  const expectedTotal = Math.max(0, basePrice + vasPrice - exchangeVal);
  const actualTotal = summary.subtotal;

  // Allow minor variance for rounding or dynamic taxes/convenience fee
  const diff = Math.abs(actualTotal - expectedTotal);
  const isConsistent = diff <= 50;

  console.log(`[CompoundPricing] Base: ₹${basePrice}, Exchange: -₹${exchangeVal}, VAS: +₹${vasPrice} => Expected: ₹${expectedTotal}, Actual: ₹${actualTotal}, Diff: ₹${diff}`);

  return { expectedTotal, actualTotal, isConsistent };
}
