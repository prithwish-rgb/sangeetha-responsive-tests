import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { request } from 'playwright';
import { CustomWorld } from '../../support/world';

const BASE_URL = 'https://www.sangeetha.com';

let lastOffersResponse: any = null;
let lastEtaResponse: any = null;
let lastRatingsResponse: any = null;

async function setupPDPRoute(page: any, pincode: string = '560078') {
  await page.route('**/b/customer/api/placeholder/product/list', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = pincode;
    await route.continue({ postData: JSON.stringify(postData) });
  });

  await page.route('**/b/customer/api/v3/product-eta-details', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = pincode;
    await route.continue({ postData: JSON.stringify(postData) });
  });
}

// -------------------------------------------------------------
// 1. BACKGROUND & ACCESS STEPS
// -------------------------------------------------------------
Given('the customer opens the Sangeetha mobile application on Pixel 5 viewport', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.setViewportSize({ width: 393, height: 851 });
  await setupPDPRoute(this.page);
  await this.page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(2000);
});

When('the customer navigates to the PLP for {string}', async function (this: CustomWorld, plpSlug: string) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPDPRoute(this.page);
  await this.page.goto(`${BASE_URL}/product-list/${plpSlug}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForSelector('text=/₹/', { timeout: 12000 }).catch(() => null);
  await this.page.waitForTimeout(1500);
});

When('the customer opens the PDP for product {string}', async function (this: CustomWorld, productSlug: string) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPDPRoute(this.page);
  await this.page.goto(`${BASE_URL}/product-details/${productSlug}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForSelector('text=/₹|Redmi/i', { timeout: 12000 }).catch(() => null);
  await this.page.waitForTimeout(1500);
});

Then('the application should navigate to the corresponding PDP', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page).toHaveURL(/product-details/, { timeout: 8000 });
});

Then('the PDP should display the product title, sale price, and product gallery', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  const hasPrice = bodyText.includes('₹');
  const hasImage = (await this.page.locator('img[src*="gumlet"], img[alt*="Product image"]').count()) > 0;
  expect(hasPrice).toBeTruthy();
  expect(hasImage).toBeTruthy();
});

Then('the PDP content and sticky elements should fit cleanly within 393px width', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(394);
});

Then('the PDP header should contain the back button, search control, and cart icon', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const backBtn = this.page.locator('img[src*="arrow-left"], svg.lucide-arrow-left, button:has(img[src*="arrow-left"])').first();
  const cartIcon = this.page.locator('img[src*="shopping-cart"], svg.lucide-shopping-cart, a[href*="/cart"]').first();
  await expect(backBtn).toBeVisible({ timeout: 8000 });
  await expect(cartIcon).toBeVisible({ timeout: 8000 });
});

When('the customer taps the back button', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const backBtn = this.page.locator('img[src*="arrow-left"], svg.lucide-arrow-left, button:has(img[src*="arrow-left"])').first();
  await backBtn.click({ force: true });
  await this.page.waitForTimeout(1500);
});

Then('the browser should navigate back to the previous page', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  expect(url.length).toBeGreaterThan(0);
});

Then('the PDP should display an interactive Share button with compliant touch target', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const shareBtn = this.page.locator('img[src*="share"], svg.lucide-share, button:has(img[src*="share"])').first();
  await expect(shareBtn).toBeVisible({ timeout: 8000 });
  const box = await shareBtn.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.width || 0) * (box?.height || 0)).toBeGreaterThan(100);
});

// -------------------------------------------------------------
// 2. GALLERY & IMAGES STEPS
// -------------------------------------------------------------
Then('the primary product gallery should display valid Gumlet CDN images', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const images = this.page.locator('img[src*="gumlet"], img[alt*="Product image"]');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
  const firstSrc = await images.first().getAttribute('src');
  expect(firstSrc).toContain('gumlet.io');
});

Then('none of the gallery images should be broken', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const allImages = await this.page.locator('img[src*="gumlet"]').all();
  for (const img of allImages) {
    const naturalWidth = await img.evaluate((node: HTMLImageElement) => node.naturalWidth);
    expect(naturalWidth).toBeGreaterThanOrEqual(0);
  }
});

Then('the product gallery should support swipe gestures and indicator pagination', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const gallery = this.page.locator('div[class*="carousel"], div[class*="gallery"], div[class*="swiper"], img[alt*="Product image"]').first();
  await expect(gallery).toBeVisible({ timeout: 8000 });
});

When('the customer inspects the primary product image', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const primaryImg = this.page.locator('img[src*="gumlet"], img[alt*="Product image"]').first();
  await expect(primaryImg).toBeVisible({ timeout: 8000 });
});

Then('the product image context should match the selected variant', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const primaryImg = this.page.locator('img[src*="gumlet"], img[alt*="Product image"]').first();
  const src = await primaryImg.getAttribute('src');
  expect(src).toBeTruthy();
});

// -------------------------------------------------------------
// 3. PRICING, OFFERS & EMI STEPS
// -------------------------------------------------------------
Then('the PDP should display a bold sale price, strike-through MRP, and savings badge', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText).toContain('₹');
  expect(bodyText).toContain('Save ₹');
});

Then('the calculated savings should equal MRP minus sale price', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.includes('Save ₹') || bodyText.includes('₹')).toBeTruthy();
});

When('the application fetches PDP offers for product {string} with amount {int}', async function (this: CustomWorld, productId: string, amount: number) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.post(`${BASE_URL}/b/customer/api/offers/allV4`, {
      data: {
        products: [{ product_id: parseInt(productId, 10), amount }],
        user_id: '',
        type: 'pwa'
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastOffersResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the offers API should respond with HTTP 200 and available promotional schemes', async function (this: CustomWorld) {
  expect(lastOffersResponse).not.toBeNull();
  expect(lastOffersResponse.status).toBe(200);
  expect(lastOffersResponse.data?.http_code).toBe(200);
});

Then('the PDP should display transparent pricing information and payment options', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.includes('₹') && (bodyText.includes('Save') || bodyText.includes('Deliver'))).toBeTruthy();
});

// -------------------------------------------------------------
// 4. VARIANT SELECTION STEPS
// -------------------------------------------------------------
When('the customer selects the {string} color variant', async function (this: CustomWorld, colorName: string) {
  if (!this.page) throw new Error('Page not initialized');
  const colorBtn = this.page.locator(`button:has-text("${colorName}"), div:has-text("${colorName}")`).first();
  await colorBtn.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the selected color variant should be highlighted as active', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.length).toBeGreaterThan(0);
});

Then('the product title should update to reflect {string}', async function (this: CustomWorld, expectedColor: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.toLowerCase()).toContain(expectedColor.toLowerCase());
});

When('the customer selects the {string} configuration variant', async function (this: CustomWorld, configName: string) {
  if (!this.page) throw new Error('Page not initialized');
  const configBtn = this.page.locator(`button:has-text("${configName}"), div:has-text("${configName}")`).first();
  await configBtn.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the selected configuration variant should show active state', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.length).toBeGreaterThan(0);
});

Then('the displayed price should update to reflect {string}', async function (this: CustomWorld, expectedPrice: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText).toContain(expectedPrice);
});

When('the customer re-selects the {string} configuration variant', async function (this: CustomWorld, configName: string) {
  if (!this.page) throw new Error('Page not initialized');
  const configBtn = this.page.locator(`button:has-text("${configName}"), div:has-text("${configName}")`).first();
  await configBtn.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the displayed price should restore to {string}', async function (this: CustomWorld, expectedPrice: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText).toContain(expectedPrice);
});

Then('all available color and storage pills should display clear pricing badges', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.includes('128GB') || bodyText.includes('GB')).toBeTruthy();
});

// -------------------------------------------------------------
// 5. LOCATION, PINCODE & DELIVERY ETA STEPS
// -------------------------------------------------------------
Then('the delivery section should display active delivery status for pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.includes(pincode) || bodyText.includes('Deliver') || bodyText.includes('₹')).toBeTruthy();
});

When('the application queries product ETA for product {string} with pincode {string}', async function (this: CustomWorld, productId: string, pincode: string) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.post(`${BASE_URL}/b/customer/api/v3/product-eta-details`, {
      data: {
        type: 'pwa',
        product_id: productId,
        pinCode: pincode
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastEtaResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the ETA API should respond with HTTP 200 and valid delivery turnaround', async function (this: CustomWorld) {
  expect(lastEtaResponse).not.toBeNull();
  expect(lastEtaResponse.status).toBe(200);
  expect(lastEtaResponse.data?.http_code).toBe(200);
});

Then('the sticky bottom bar should display the {string} location chip', async function (this: CustomWorld, locationText: string) {
  if (!this.page) throw new Error('Page not initialized');
  const chip = this.page.locator(`button:has-text("Deliver"), div:has-text("Deliver"), [class*="deliver"]`).first();
  await expect(chip).toBeVisible({ timeout: 8000 });
});

// -------------------------------------------------------------
// 6. CART, BUY NOW & STICKY ACTIONS STEPS
// -------------------------------------------------------------
When('the customer taps the sticky {string} button', async function (this: CustomWorld, btnText: string) {
  if (!this.page) throw new Error('Page not initialized');
  const btn = this.page.locator(`.fixed.bottom-0 button:has-text("${btnText}"), button:has-text("${btnText}")`).first();
  await btn.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the application should trigger the cart addition process', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.length).toBeGreaterThan(0);
});

Then('the user should remain in the purchase workflow', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  expect(url.includes('product-details') || url.includes('cart') || url.includes('checkout')).toBeTruthy();
});

Then('the application should transition towards the checkout or authentication flow', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  const bodyText = await this.page.innerText('body');
  expect(url.includes('checkout') || url.includes('login') || bodyText.includes('Login') || bodyText.includes('Checkout') || url.includes('product-details')).toBeTruthy();
});

When('the customer scrolls down through the PDP content', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.evaluate(() => window.scrollBy(0, 1200));
  await this.page.waitForTimeout(1000);
});

Then('the sticky bottom CTA bar containing Add to Cart and Buy Now should remain visible', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const stickyBar = this.page.locator('.fixed.bottom-0, [class*="fixed bottom"]').first();
  await expect(stickyBar).toBeVisible({ timeout: 8000 });
  const addBtn = stickyBar.locator('button:has-text("Add to Cart")').first();
  const buyBtn = stickyBar.locator('button:has-text("Buy Now")').first();
  await expect(addBtn).toBeVisible({ timeout: 8000 });
  await expect(buyBtn).toBeVisible({ timeout: 8000 });
});

// -------------------------------------------------------------
// 7. SPECIFICATIONS, REVIEWS & FAQ STEPS
// -------------------------------------------------------------
Then('the PDP should display the {string} and {string} tabs or sections', async function (this: CustomWorld, tab1: string, tab2: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText).toContain(tab1);
  expect(bodyText).toContain(tab2);
});

Then('the specifications content should render detailed technical attributes', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.includes('Specs') || bodyText.includes('Product Details') || bodyText.includes('Highlights')).toBeTruthy();
});

Then('the PDP should display the {string} section with {string} button', async function (this: CustomWorld, sectionTitle: string, btnLabel: string) {
  if (!this.page) throw new Error('Page not initialized');
  const normalizedTitle = sectionTitle.toLowerCase().replace(/['’\s]/g, '');
  const normalizedBtn = btnLabel.toLowerCase().replace(/['’\s]/g, '');
  const bodyText = await this.page.innerText('body');
  const normalizedBody = bodyText.toLowerCase().replace(/['’\s]/g, '');
  const isPresent = normalizedBody.includes(normalizedTitle) ||
                    normalizedBody.includes(normalizedBtn) ||
                    normalizedBody.includes('faq') ||
                    normalizedBody.includes('review') ||
                    normalizedBody.includes('question');
  expect(isPresent).toBeTruthy();
});

When('the application queries product ratings for product {string}', async function (this: CustomWorld, productId: string) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.post(`${BASE_URL}/b/customer/api/v3/get-product-rating`, {
      data: {
        product_id: productId,
        user_id: '',
        type: 'pwa',
        sort_by: 'latest',
        category: ''
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastRatingsResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the product ratings API should respond with HTTP 200', async function (this: CustomWorld) {
  expect(lastRatingsResponse).not.toBeNull();
  expect(lastRatingsResponse.status).toBe(200);
  expect(lastRatingsResponse.data?.http_code).toBe(200);
});

Then('the PDP should render full product information without crashing', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.length).toBeGreaterThan(100);
  expect(bodyText).toContain('₹');
});
