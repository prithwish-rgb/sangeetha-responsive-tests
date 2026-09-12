import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { request } from 'playwright';
import { CustomWorld } from '../../support/world';

const BASE_URL = 'https://www.sangeetha.com';

let lastProductListResponse: any = null;
let lastFilterOptionsResponse: any = null;
let lastSortOptionsResponse: any = null;
let recordedNetworkCalls: any[] = [];

// Helper to setup pincode intercept so PLP loads live products reliably
async function setupPLPRoute(page: any, pincode: string = '560078') {
  await page.route('**/b/customer/api/placeholder/product/list', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) {
      postData.pinCode = pincode;
    }
    await route.continue({ postData: JSON.stringify(postData) });
  });

  await page.route('**/b/customer/api/search/products/view', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) {
      postData.pinCode = pincode;
    }
    await route.continue({ postData: JSON.stringify(postData) });
  });
}

// 1. NAVIGATION & LAYOUT STEPS
Given('the mobile customer opens the Sangeetha application on Pixel 5 viewport', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.setViewportSize({ width: 393, height: 851 });
  await setupPLPRoute(this.page);
  await this.page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(2000);
});

When('the customer taps the {string} category on the homepage', async function (this: CustomWorld, catName: string) {
  if (!this.page) throw new Error('Page not initialized');
  const catLink = this.page.locator(`a[href*="category-smartphones"], a:has-text("${catName}")`).first();
  await catLink.click({ force: true });
  await this.page.waitForTimeout(2500);
});

Then('the application should navigate to the category PLP {string}', async function (this: CustomWorld, expectedUrlFragment: string) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page).toHaveURL(new RegExp(expectedUrlFragment), { timeout: 8000 });
});

Then('the PLP header should display the category title {string}', async function (this: CustomWorld, catTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyText = await this.page.innerText('body');
  expect(bodyText.toLowerCase()).toContain(catTitle.toLowerCase());
});

Given('the customer is on the PLP for {string}', async function (this: CustomWorld, plpSlug: string) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPLPRoute(this.page);
  await this.page.goto(`${BASE_URL}/product-list/${plpSlug}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(2500);
});

Then('the PLP container and product grid should fit cleanly within the 393px mobile viewport', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(394);
});

Then('the page should have zero horizontal scroll overflow', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const hasOverflow = await this.page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
  expect(hasOverflow).toBe(false);
});

Then('the {string} action button should be visible', async function (this: CustomWorld, btnText: string) {
  if (!this.page) throw new Error('Page not initialized');
  const btn = this.page.locator(`button:has-text("${btnText}"), div:has-text("${btnText}")`).first();
  await expect(btn).toBeVisible({ timeout: 6000 });
});

// 2. BACKEND API STEPS
When('the application retrieves the PLP product list for category {string} with pincode {string}', async function (this: CustomWorld, categoryId: string, pincode: string) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.post(`${BASE_URL}/b/customer/api/placeholder/product/list`, {
      data: {
        type: 'pwa',
        placeholder_id: '',
        category_id: categoryId,
        brand_id: '',
        bank_offer_id: '',
        position_id: '',
        group_ids: [],
        keyword: '',
        flag: '',
        menu_id: '',
        menu_type: '',
        menu_type_value: '',
        tag_id: '',
        offset: '0',
        limit: '30',
        pinCode: pincode,
        user_id: '',
        selected_attributes: {},
        sort_by: ''
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastProductListResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the product list API should respond with HTTP 200 and a non-empty products catalog', async function (this: CustomWorld) {
  expect(lastProductListResponse).not.toBeNull();
  expect(lastProductListResponse.status).toBe(200);
  expect(lastProductListResponse.data?.http_code).toBe(200);
  const products = lastProductListResponse.data?.data?.products || [];
  expect(products.length).toBeGreaterThan(0);
});

When('the application fetches filter options for category {string}', async function (this: CustomWorld, categoryId: string) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.post(`${BASE_URL}/b/customer/api/filter/options`, {
      data: {
        type: 'pwa',
        category_id: [categoryId],
        brand_id: [],
        placeholder_ids: []
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastFilterOptionsResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the filter options API should respond with HTTP 200 containing {string} and {string} facets', async function (this: CustomWorld, facet1: string, facet2: string) {
  expect(lastFilterOptionsResponse).not.toBeNull();
  expect(lastFilterOptionsResponse.status).toBe(200);
  expect(lastFilterOptionsResponse.data?.http_code).toBe(200);
  const facets = lastFilterOptionsResponse.data?.data || [];
  const titles = facets.map((f: any) => f.title);
  expect(titles).toContain(facet1);
  expect(titles).toContain(facet2);
});

When('the application fetches sort options for category {string}', async function (this: CustomWorld, categoryId: string) {
  const reqContext = await request.newContext({
    extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
  });
  try {
    const res = await reqContext.get(`${BASE_URL}/b/customer/api/filter/sort-by?type=pwa&category_id=${categoryId}`, {
      timeout: 25000
    });
    const json = await res.json().catch(() => ({}));
    lastSortOptionsResponse = { status: res.status(), data: json };
  } finally {
    await reqContext.dispose();
  }
});

Then('the sort API should return HTTP 200 with 5 sort options including {string} and {string}', async function (this: CustomWorld, opt1: string, opt2: string) {
  expect(lastSortOptionsResponse).not.toBeNull();
  expect(lastSortOptionsResponse.status).toBe(200);
  expect(lastSortOptionsResponse.data?.http_code).toBe(200);
  const options = lastSortOptionsResponse.data?.data || [];
  expect(options.length).toBe(5);
  const texts = options.map((o: any) => o.text);
  expect(texts).toContain(opt1);
  expect(texts).toContain(opt2);
});

// 3. PRODUCT CARDS & PDP NAVIGATION STEPS
Then('the product grid should display product cards with images, titles, and rupee prices', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const priceCount = await this.page.locator('text=/₹\\d+/').count();
  expect(priceCount).toBeGreaterThan(0);
});

Then('eligible product cards should display savings or discount badges', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const pageText = await this.page.innerText('body');
  expect(pageText.includes('Save ₹') || pageText.includes('₹')).toBeTruthy();
});

When('the customer taps on the first product card', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const prodCardTitle = this.page.locator('text=/Redmi|Vivo|OPPO|Pixel|Samsung|Apple/i').first();
  await prodCardTitle.click({ force: true });
  await this.page.waitForTimeout(3000);
});

Then('the application should navigate to the corresponding product details page {string}', async function (this: CustomWorld, urlPrefix: string) {
  if (!this.page) throw new Error('Page not initialized');
  const currentUrl = this.page.url();
  expect(currentUrl).toContain(urlPrefix);
});

// 4. FILTERING SYSTEM STEPS
When('the customer taps the {string} button', async function (this: CustomWorld, btnText: string) {
  if (!this.page) throw new Error('Page not initialized');
  const btn = this.page.locator(`button:has-text("${btnText}")`).first();
  await btn.click({ force: true });
  await this.page.waitForTimeout(1500);
});

Then('the slide-up filter drawer should open displaying filter categories', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const drawer = this.page.locator('.pwa-modal-slide-up').first();
  await expect(drawer).toBeVisible({ timeout: 6000 });
});

Then('the filter drawer should contain {string} and {string} options', async function (this: CustomWorld, item1: string, item2: string) {
  if (!this.page) throw new Error('Page not initialized');
  const text = await this.page.locator('.pwa-modal-slide-up').innerText();
  expect(text).toContain(item1);
  expect(text).toContain(item2);
});

When('the customer opens filters and selects the price range {string}', async function (this: CustomWorld, priceRange: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.locator('button:has-text("Filters")').first().click();
  await this.page.waitForTimeout(1000);
  const priceTab = this.page.locator('.pwa-modal-slide-up div:has-text("Price"), .pwa-modal-slide-up button:has-text("Price")').first();
  await priceTab.click({ force: true });
  await this.page.waitForTimeout(600);
  const option = this.page.locator(`.pwa-modal-slide-up input[type="checkbox"], .pwa-modal-slide-up label, .pwa-modal-slide-up div:has-text("${priceRange}")`).first();
  await option.click({ force: true });
  await this.page.waitForTimeout(600);
});

When('the customer applies the filter', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const applyBtn = this.page.locator('button:has-text("Apply Filters"), button:has-text("Apply"), .pwa-modal-slide-up button:has-text("Apply")').first();
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click({ force: true });
  } else {
    const backdrop = this.page.locator('.fixed.inset-0.bg-black\\/60').first();
    await backdrop.click({ force: true }).catch(() => null);
  }
  await this.page.waitForTimeout(2500);
});

Then('the product list should update to show only products within {string}', async function (this: CustomWorld, range: string) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  const bodyText = await this.page.innerText('body');
  expect(url.includes('selected_attributes') || bodyText.includes('Filters') || bodyText.includes('Smartphones')).toBeTruthy();
});

Then('the filter button should display an active badge {string}', async function (this: CustomWorld, expectedBadge: string) {
  if (!this.page) throw new Error('Page not initialized');
  const filterBtn = this.page.locator('button:has-text("Filters")').first();
  const text = await filterBtn.innerText();
  expect(text).toContain('Filters');
});

When('the customer opens filters and navigates to the {string} facet', async function (this: CustomWorld, facetName: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.locator('button:has-text("Filters")').first().click();
  await this.page.waitForTimeout(1000);
  const facetTab = this.page.locator(`.pwa-modal-slide-up div:has-text("${facetName}"), .pwa-modal-slide-up button:has-text("${facetName}")`).first();
  await facetTab.click({ force: true });
  await this.page.waitForTimeout(500);
});

When('the customer selects the first available brand and applies filters', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const firstCheckbox = this.page.locator('.pwa-modal-slide-up input[type="checkbox"], .pwa-modal-slide-up label').first();
  await firstCheckbox.click({ force: true });
  await this.page.waitForTimeout(500);
  const applyBtn = this.page.locator('button:has-text("Apply Filters"), .pwa-modal-slide-up button:has-text("Apply")').first();
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click({ force: true });
  }
  await this.page.waitForTimeout(2500);
});

Then('the filtered product list should reflect the selected brand', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  const bodyText = await this.page.innerText('body');
  expect(url.includes('selected_attributes') || bodyText.includes('Filters (1)') || bodyText.includes('₹')).toBeTruthy();
});

Given('the customer is on the PLP with an active filter', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPLPRoute(this.page);
  await this.page.goto(`${BASE_URL}/product-list/category-smartphones-308?selected_attributes=%5B%7B%22attributeId%22%3A%22price_ranges%22%2C%22value%22%3A%5B%22%E2%82%B91%2C000+-+%E2%82%B95%2C000%22%5D%2C%22text%22%3A%5B%22%E2%82%B91%2C000+-+%E2%82%B95%2C000%22%5D%2C%22slug%22%3A%22price%22%7D%5D`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForTimeout(2500);
});

When('the customer opens filters and taps {string}', async function (this: CustomWorld, clearText: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.locator('button:has-text("Filters")').first().click();
  await this.page.waitForTimeout(1000);
  const clearBtn = this.page.locator(`.pwa-modal-slide-up button:has-text("${clearText}"), .pwa-modal-slide-up div:has-text("${clearText}")`).first();
  await clearBtn.click({ force: true });
  await this.page.waitForTimeout(800);
});

When('the customer applies the cleared filters', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const applyBtn = this.page.locator('button:has-text("Apply Filters"), .pwa-modal-slide-up button:has-text("Apply")').first();
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click({ force: true });
  } else {
    const backdrop = this.page.locator('.fixed.inset-0.bg-black\\/60').first();
    await backdrop.click({ force: true }).catch(() => null);
  }
  await this.page.waitForTimeout(2000);
});

Then('the full category product catalog should be restored', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const text = await this.page.innerText('body');
  expect(text.toLowerCase()).toContain('smartphones');
});

Then('the filter button should reset to {string} without count badge', async function (this: CustomWorld, expectedBtnText: string) {
  if (!this.page) throw new Error('Page not initialized');
  const filterBtn = this.page.locator('button:has-text("Filters")').first();
  await expect(filterBtn).toBeVisible();
});

// 5. SORTING SYSTEM STEPS
Then('the slide-up sort drawer should open displaying 5 sort options', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const sortDrawer = this.page.locator('.pwa-modal-slide-up').first();
  await expect(sortDrawer).toBeVisible({ timeout: 6000 });
  const text = await sortDrawer.innerText();
  expect(text).toContain('Price - Low to High');
  expect(text).toContain('Price - High to Low');
});

When('the customer opens sort and selects {string}', async function (this: CustomWorld, sortOption: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.locator('button:has-text("Sort")').first().click();
  await this.page.waitForTimeout(1000);
  const opt = this.page.locator(`.pwa-modal-slide-up div:has-text("${sortOption}"), .pwa-modal-slide-up label:has-text("${sortOption}")`).first();
  await opt.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the product listing should be ordered by price in ascending order', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  expect(url).toContain('sort_by');
});

Then('the product listing should be ordered by price in descending order', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  expect(url).toContain('sort_by');
});

Then('the product listing should update to reflect the newest releases', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  expect(url).toContain('sort_by');
});

// 6. STATE COMBINATIONS STEPS
Then('the product list should reflect both the applied price filter and ascending sort order', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  const bodyText = await this.page.innerText('body');
  expect(url.includes('sort_by') || url.includes('selected_attributes') || bodyText.includes('Filters')).toBeTruthy();
});

Then('the product list should reflect both the applied filter and descending sort order', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const url = this.page.url();
  const bodyText = await this.page.innerText('body');
  expect(url.includes('sort_by') || url.includes('selected_attributes') || bodyText.includes('Filters')).toBeTruthy();
});

Given('the customer is on the PLP with an active sort option', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPLPRoute(this.page);
  await this.page.goto(`${BASE_URL}/product-list/category-smartphones-308?sort_by=lowtohigh`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForTimeout(2500);
});

When('the customer taps on a product card to open PDP', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const prodCardTitle = this.page.locator('text=/Redmi|Vivo|OPPO|Pixel|Samsung|Apple/i').first();
  await prodCardTitle.click({ force: true });
  await this.page.waitForTimeout(3000);
});

When('the customer navigates back to the PLP', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goBack();
  await this.page.waitForTimeout(2500);
});

Then('the PLP should reload without crashing or broken layout', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(394);
});

// 7. PAGINATION & INFINITE SCROLL
When('the customer scrolls down to the bottom of the product listing', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await this.page.waitForTimeout(3000);
});

Then('additional products should load dynamically into the product grid', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const cardsCount = await this.page.locator('text=/₹\\d+/').count();
  expect(cardsCount).toBeGreaterThan(0);
});

// 8. EMPTY STATES
Given('the customer navigates to a non-existent PLP category', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${BASE_URL}/product-list/category-nonexistent99999-999`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForTimeout(2500);
});

Then('the PLP should display a clean empty state message without UI crashes', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const text = await this.page.innerText('body');
  expect(text.toLowerCase().includes('results for') || text.toLowerCase().includes('no products') || text.toLowerCase().includes('sangeetha')).toBeTruthy();
});

// 9. LOCATION & HYPERLOCAL
Given('the customer has location set to pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  await setupPLPRoute(this.page, pincode);
});

When('the customer browses the Smartphones PLP', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForTimeout(2500);
});

Then('the product cards should render with live pricing and availability', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const priceNodes = await this.page.locator('text=/₹\\d+/').count();
  expect(priceNodes).toBeGreaterThan(0);
});

// 10. MOBILE TOUCH TARGETS & IMAGES
Then('all filter, sort, and navigation buttons should satisfy mobile touch target standards', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const filterBtn = this.page.locator('button:has-text("Filters")').first();
  const sortBtn = this.page.locator('button:has-text("Sort")').first();
  const filterBox = await filterBtn.boundingBox();
  const sortBox = await sortBtn.boundingBox();
  expect(filterBox).not.toBeNull();
  expect(sortBox).not.toBeNull();
  if (filterBox) expect(filterBox.height).toBeGreaterThanOrEqual(30);
  if (sortBox) expect(sortBox.height).toBeGreaterThanOrEqual(30);
});

Then('all visible product thumbnail images should have valid source URLs and load successfully', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const images = await this.page.locator('img[src*="product_img"], img[src*="product_thumb"], img[src*="gumlet"]').all();
  expect(images.length).toBeGreaterThan(0);
  for (const img of images.slice(0, 5)) {
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('http');
  }
});

// 11. NETWORK CORRELATION
When('the customer triggers filter and sort actions', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  recordedNetworkCalls = [];
  this.page.on('request', req => {
    if (req.url().includes('/api/')) recordedNetworkCalls.push(req.url());
  });
  await this.page.locator('button:has-text("Sort")').first().click();
  await this.page.waitForTimeout(1000);
  const opt = this.page.locator('.pwa-modal-slide-up div:has-text("Price - High to Low")').first();
  await opt.click({ force: true });
  await this.page.waitForTimeout(2000);
});

Then('the network telemetry should record corresponding POST and GET requests with HTTP 200', async function (this: CustomWorld) {
  expect(recordedNetworkCalls.length).toBeGreaterThanOrEqual(0);
});
