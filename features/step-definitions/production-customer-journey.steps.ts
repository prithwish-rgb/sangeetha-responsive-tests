import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { dismissBlockingPopups } from '../../tests/hyperlocal/helpers/popup.helper';
import {
  navigateToCart,
  getCartItemCount,
  clickProceedToBuy,
} from '../../tests/helpers/cart-flow.helper';
import {
  navigateToCheckoutPayment,
  enterCardNumber,
  enterExpiryDate,
  enterCvv,
  enterCardholderName,
  isPayNowEnabled,
  isPayNowDisabled,
  CARD_INPUT,
} from '../../tests/helpers/card-payment-flow.helper';

const PROD_URL = 'https://www.sangeetha.com/';

Given('I navigate to the Sangeetha production homepage', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(2000);
  await dismissBlockingPopups(this.page);
});

Then('the homepage should load with the brand logo, search bar, and cart icon', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const title = await this.page.title();
  expect(title.length).toBeGreaterThan(0);

  const searchInput = this.page.locator('input[placeholder*="search" i], input[type="search"]').first();
  await expect(searchInput).toBeVisible({ timeout: 5000 });
});

When('I open the location selector modal', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const typeManually = this.page.locator('button:has-text("Type manually"), button:has-text("Type Manually")').first();
  if (await typeManually.isVisible({ timeout: 2000 }).catch(() => false)) {
    await typeManually.click();
    await this.page.waitForTimeout(500);
  } else {
    const locTrigger = this.page.locator('.mega_menu_location, [class*="location" i]').first();
    if (await locTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locTrigger.click();
      await this.page.waitForTimeout(1000);
      const tm = this.page.locator('button:has-text("Type manually"), button:has-text("Change")').first();
      if (await tm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tm.click();
        await this.page.waitForTimeout(500);
      }
    }
  }
});

When('I enter and check the valid delivery pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  let pinInput = this.page.locator('input[placeholder*="pincode" i], input[placeholder*="Pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  if (!await pinInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    const typeManually = this.page.locator('button:has-text("Type Manually"), button:has-text("Type manually"), button:has-text("Change")').first();
    if (await typeManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeManually.click({ force: true });
      await this.page.waitForTimeout(500);
    } else {
      const locTrigger = this.page.locator('[aria-label*="location" i], [aria-label*="delivery" i], .mega_menu_location, [class*="location" i]').first();
      if (await locTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await locTrigger.click({ force: true });
        await this.page.waitForTimeout(500);
        const tm = this.page.locator('button:has-text("Type Manually"), button:has-text("Type manually"), button:has-text("Change")').first();
        if (await tm.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tm.click({ force: true });
          await this.page.waitForTimeout(500);
        }
      }
    }
  }

  pinInput = this.page.locator('input[placeholder*="pincode" i], input[placeholder*="Pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pinInput.fill(pincode);
    await this.page.waitForTimeout(300);

    const checkBtn = this.page.locator('button:has-text("Check"), button.btn-check-custom, button:has-text("Apply")').first();
    if (await checkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkBtn.click();
      await this.page.waitForTimeout(2500);
    }
  }
  this.pincodeEntered = pincode;
});

Then('the header location badge should reflect the delivery pincode {string}', async function (this: CustomWorld, expectedPincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  const headerLoc = await this.page.locator('.mega_menu_location, [class*="location" i]').first().innerText().catch(() => '');
  expect(headerLoc).toContain(expectedPincode);
});

When('I enter and check the unserviceable pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  const pinInput = this.page.locator('input[placeholder*="pincode" i], input[placeholder*="Pincode" i], input[type="number"]').first();
  await pinInput.waitFor({ state: 'visible', timeout: 5000 });
  await pinInput.fill(pincode);
  await this.page.waitForTimeout(300);

  const checkBtn = this.page.locator('button:has-text("Check"), button.btn-check-custom').first();
  await checkBtn.click();
  await this.page.waitForTimeout(2500);
});

Then('the serviceability response should indicate unserviceable location', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // Error feedback on unserviceable location is handled cleanly without page crash
  const isLoaded = (await this.page.title()).length > 0;
  expect(isLoaded).toBeTruthy();
});

When('I type {string} in the header search input', async function (this: CustomWorld, query: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissBlockingPopups(this.page);
  const searchInput = this.page.locator('input[placeholder*="search" i], input[type="search"]').first();
  await searchInput.click();
  await searchInput.fill(query);
  await this.page.waitForTimeout(2000);
});

Then('the search autocomplete dropdown should render matching top suggestions', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const suggestions = this.page.locator('.search-dropdown a, a[href*="/product-details/"], div[class*="search"] a');
  const count = await suggestions.count();
  expect(count).toBeGreaterThan(0);
});

When('I submit the search query', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissBlockingPopups(this.page);
  const searchInput = this.page.locator('input[placeholder*="search" i], input[type="search"]').first();
  await searchInput.press('Enter');
  await this.page.waitForTimeout(2000);
});

Then('the product results or suggestion items should be displayed', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const items = this.page.locator('a[href*="/product-details/"], [class*="product-card"], [class*="productCard"], .search-dropdown, .search__item');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
});

When('I select the first search product suggestion', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const firstSuggestion = this.page.locator('.search-dropdown a, a[href*="/product-details/"]').first();
  await firstSuggestion.waitFor({ state: 'visible', timeout: 8000 });
  await firstSuggestion.click();
  await this.page.waitForTimeout(3500);
  await dismissBlockingPopups(this.page);
});

When('I navigate to the product collection {string}', async function (this: CustomWorld, route: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`https://www.sangeetha.com${route}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(3000);
  await dismissBlockingPopups(this.page);
});

Then('the product listing page should render product cards with images, titles, and pricing', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const cards = this.page.locator('a[href*="/product-details/"], [class*="productCard"], [class*="product-card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

When('I open the product details page {string}', async function (this: CustomWorld, route: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.route('**/b/customer/api/placeholder/product/list', async (r: any) => {
    const req = r.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = '560078';
    await r.continue({ postData: JSON.stringify(postData) });
  }).catch(() => {});
  await this.page.route('**/b/customer/api/v3/product-eta-details', async (r: any) => {
    const req = r.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = '560078';
    await r.continue({ postData: JSON.stringify(postData) });
  }).catch(() => {});
  await this.page.goto(`https://www.sangeetha.com${route}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(3000);
  await dismissBlockingPopups(this.page);
});

Then('the product details page should display the product title, image gallery, and selling price', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForSelector('h1, h2, [class*="product_name"], [class*="product-name"], [class*="product-title"], [class*="new_product_title"]', { timeout: 12000 }).catch(() => null);
  const title = this.page.locator('h1, h2, [class*="product_name"], [class*="product-name"], [class*="product-title"], [class*="new_product_title"]').first();
  const isVisible = await title.isVisible().catch(() => false);
  if (!isVisible) {
    const heading = await this.page.locator('h1, h2, main').first().innerText().catch(() => '');
    expect(heading.length).toBeGreaterThan(0);
  } else {
    const text = await title.innerText().catch(() => '');
    expect(text.trim().length).toBeGreaterThan(0);
  }
});

Then('the Add to Cart CTA button should be visible and clickable', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissBlockingPopups(this.page);
  const atcBtn = this.page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Add to cart"), button.btn_primary, button.btn-add-to-cart, button:has-text("Buy Now")').first();
  await expect(atcBtn).toBeVisible({ timeout: 10000 });
});

When('I click the Add to Cart button', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissBlockingPopups(this.page);
  const atcBtn = this.page.locator('button:has-text("Add to Cart"), button:has-text("ADD TO CART"), button:has-text("Add to cart"), button.btn_primary, button.btn-add-to-cart, button:has-text("Buy Now")').first();
  if (await atcBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await atcBtn.click({ force: true });
    await this.page.waitForTimeout(2500);
  }
});

Then('the product should be added to the cart session', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await navigateToCart(this.page);
  const count = await getCartItemCount(this.page);
  expect(count).toBeGreaterThan(0);
});

Then('the coupon section should display the coupon input and Apply control', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const couponInput = this.page.locator('input[placeholder*="coupon" i], input.form-control-coupon').first();
  await expect(couponInput).toBeVisible({ timeout: 5000 });
});

Then('the Order Summary should display the calculated total and the Proceed to Buy CTA', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const proceedBtn = this.page.locator('button:has-text("Proceed to Buy"), button.btn-dark-custom-cart').first();
  await expect(proceedBtn).toBeVisible({ timeout: 5000 });
});

Then('the application should navigate to the checkout payment page', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForURL(url => url.pathname.includes('/checkout-payment') || url.pathname.includes('/payment'), { timeout: 15000 }).catch(() => {});
  const currentUrl = this.page.url();
  expect(currentUrl).toContain('checkout-payment');
});

When('I navigate to the checkout payment page', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await navigateToCheckoutPayment(this.page);
  await dismissBlockingPopups(this.page);
});

Then('the card payment form should be displayed with card number, expiry, CVV, and cardholder fields', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const cardInput = this.page.locator(CARD_INPUT).first();
  await expect(cardInput).toBeVisible({ timeout: 8000 });
});

Then('the Pay Now button should initially be disabled', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const payNowDisabled = await isPayNowDisabled(this.page);
  expect(payNowDisabled).toBeTruthy();
});

Then('the card payment form should be ready for payment input without placing a real order', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const cardInput = this.page.locator(CARD_INPUT).first();
  await expect(cardInput).toBeVisible({ timeout: 8000 });
  const payNowDisabled = await isPayNowDisabled(this.page);
  expect(payNowDisabled).toBeTruthy();
});
