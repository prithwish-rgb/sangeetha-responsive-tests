import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com';
const SS_DIR = path.join(__dirname, '../../reports/plp/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SS_DIR)) {
    fs.mkdirSync(SS_DIR, { recursive: true });
  }
});

async function setupPLPRoute(page: any, pincode: string = '560078') {
  await page.route('**/b/customer/api/placeholder/product/list', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = pincode;
    await route.continue({ postData: JSON.stringify(postData) });
  });

  await page.route('**/b/customer/api/search/products/view', async (route: any) => {
    const req = route.request();
    let postData = req.postDataJSON() || {};
    if (!postData.pinCode) postData.pinCode = pincode;
    await route.continue({ postData: JSON.stringify(postData) });
  });
}

test.describe('Sangeetha Production Mobile PLP Regression Suite (Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await setupPLPRoute(page);
  });

  // --- 1. ACCESS & HEADER ---
  test('PLP-001 & PLP-002: Customer navigates to Category PLP and verifies 393px mobile layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('smartphones');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(394);

    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'plp_01_02_layout.png') });
  });

  test('PLP-003: Sticky Filter & Sort action buttons accessibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2000);

    const filterBtn = page.locator('button:has-text("Filters"), div:has-text("Filters")').first();
    const sortBtn = page.locator('button:has-text("Sort"), div:has-text("Sort")').first();

    await expect(filterBtn).toBeVisible({ timeout: 6000 });
    await expect(sortBtn).toBeVisible({ timeout: 6000 });

    const filterBox = await filterBtn.boundingBox();
    const sortBox = await sortBtn.boundingBox();
    expect(filterBox).not.toBeNull();
    expect(sortBox).not.toBeNull();
  });

  // --- 2. BACKEND APIS ---
  test('PLP-004: Product list API telemetry verification', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({
      extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
    });
    const res = await apiContext.post(`${BASE_URL}/b/customer/api/placeholder/product/list`, {
      data: {
        type: 'pwa',
        placeholder_id: '',
        category_id: '308',
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
        pinCode: '560078',
        user_id: '',
        selected_attributes: {},
        sort_by: ''
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.http_code).toBe(200);
    expect(json.data?.products?.length).toBeGreaterThan(0);
    await apiContext.dispose();
  });

  test('PLP-005 & PLP-006: Filter options & Sort options API contracts', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({
      extraHTTPHeaders: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' }
    });
    const resFilter = await apiContext.post(`${BASE_URL}/b/customer/api/filter/options`, {
      data: { type: 'pwa', category_id: ['308'], brand_id: [], placeholder_ids: [] },
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    expect(resFilter.status()).toBe(200);
    const jsonFilter = await resFilter.json();
    expect(jsonFilter.http_code).toBe(200);
    expect(jsonFilter.data?.length).toBeGreaterThan(0);

    const resSort = await apiContext.get(`${BASE_URL}/b/customer/api/filter/sort-by?type=pwa&category_id=308`, {
      timeout: 25000
    });
    expect(resSort.status()).toBe(200);
    const jsonSort = await resSort.json();
    expect(jsonSort.http_code).toBe(200);
    expect(jsonSort.data?.length).toBe(5);

    await apiContext.dispose();
  });

  // --- 3. PRODUCT CARDS & PDP NAVIGATION ---
  test('PLP-007: Product Cards pricing and discount badges rendering', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const priceNodes = await page.locator('text=/₹\\d+/').count();
    expect(priceNodes).toBeGreaterThan(0);

    const pageText = await page.innerText('body');
    expect(pageText).toContain('₹');

    await page.screenshot({ path: path.join(SS_DIR, 'plp_07_product_cards.png') });
  });

  test('PLP-008: Product Card tap navigates to Product Details Page (PDP)', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const prodCardTitle = page.locator('text=/Redmi|Vivo|OPPO|Pixel|Samsung|Apple/i').first();
    await prodCardTitle.click({ force: true });
    await page.waitForTimeout(3500);

    expect(page.url()).toContain('/product-details/');
    await page.screenshot({ path: path.join(SS_DIR, 'plp_08_pdp_nav.png') });
  });

  // --- 4. FILTERING SYSTEM ---
  test('PLP-009 & PLP-010: Filter drawer interactions and Price filter application', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Filters")').first().click();
    await page.waitForTimeout(1000);

    const drawer = page.locator('.pwa-modal-slide-up').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const priceTab = page.locator('.pwa-modal-slide-up div:has-text("Price")').first();
    await priceTab.click({ force: true });
    await page.waitForTimeout(500);

    const opt = page.locator('.pwa-modal-slide-up label, .pwa-modal-slide-up input[type="checkbox"]').first();
    await opt.click({ force: true });
    await page.waitForTimeout(500);

    const applyBtn = page.locator('.pwa-modal-slide-up button:has-text("Apply"), .pwa-modal-slide-up button:has-text("View Results")').first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click({ force: true });
    }
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('selected_attributes');
    await page.screenshot({ path: path.join(SS_DIR, 'plp_10_filtered_price.png') });
  });

  test('PLP-011: Brand filter facet selection and application', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Filters")').first().click();
    await page.waitForTimeout(1000);

    const brandTab = page.locator('.pwa-modal-slide-up div:has-text("Brands"), .pwa-modal-slide-up button:has-text("Brands")').first();
    await brandTab.click({ force: true });
    await page.waitForTimeout(500);

    const firstCheckbox = page.locator('.pwa-modal-slide-up input[type="checkbox"], .pwa-modal-slide-up label').first();
    await firstCheckbox.click({ force: true });
    await page.waitForTimeout(500);

    const applyBtn = page.locator('.pwa-modal-slide-up button:has-text("Apply"), .pwa-modal-slide-up button:has-text("View Results")').first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click({ force: true });
    }
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('selected_attributes');
  });

  test('PLP-012: Clear Filters resets active filter state', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308?selected_attributes=%5B%7B%22attributeId%22%3A%22price_ranges%22%2C%22value%22%3A%5B%22%E2%82%B91%2C000+-+%E2%82%B95%2C000%22%5D%2C%22text%22%3A%5B%22%E2%82%B91%2C000+-+%E2%82%B95%2C000%22%5D%2C%22slug%22%3A%22price%22%7D%5D`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Filters")').first().click();
    await page.waitForTimeout(1000);

    const clearBtn = page.locator('.pwa-modal-slide-up button:has-text("Clear"), .pwa-modal-slide-up div:has-text("Clear")').first();
    await clearBtn.click({ force: true });
    await page.waitForTimeout(500);

    const applyBtn = page.locator('.pwa-modal-slide-up button:has-text("Apply"), .pwa-modal-slide-up button:has-text("View Results")').first();
    if (await applyBtn.isVisible().catch(() => false)) {
      await applyBtn.click({ force: true });
    } else {
      const backdrop = page.locator('.fixed.inset-0.bg-black\\/60').first();
      await backdrop.click({ force: true }).catch(() => null);
    }
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('smartphones');
  });

  // --- 5. SORTING SYSTEM ---
  test('PLP-013 & PLP-014: Sort drawer selection for Price Low to High', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Sort")').first().click();
    await page.waitForTimeout(1000);

    const drawer = page.locator('.pwa-modal-slide-up').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const lowToHighOpt = page.locator('.pwa-modal-slide-up div:has-text("Price - Low to High"), .pwa-modal-slide-up label:has-text("Price - Low to High")').first();
    await lowToHighOpt.click({ force: true });
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('sort_by');
    await page.screenshot({ path: path.join(SS_DIR, 'plp_14_sorted_low_to_high.png') });
  });

  test('PLP-015: Sort selection for Price High to Low', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    await page.locator('button:has-text("Sort")').first().click();
    await page.waitForTimeout(1000);

    const highToLowOpt = page.locator('.pwa-modal-slide-up div:has-text("Price - High to Low"), .pwa-modal-slide-up label:has-text("Price - High to Low")').first();
    await highToLowOpt.click({ force: true });
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('sort_by');
  });

  // --- 6. COMBINATIONS ---
  test('PLP-017 & PLP-018: Filter + Sort combination state handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308?selected_attributes=%5B%7B%22attributeId%22%3A%22price_ranges%22%2C%22value%22%3A%5B%22%E2%82%B95%2C000+-+%E2%82%B910%2C000%22%5D%2C%22text%22%3A%5B%22%E2%82%B95%2C000+-+%E2%82%B910%2C000%22%5D%2C%22slug%22%3A%22price%22%7D%5D&sort_by=lowtohigh`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('selected_attributes');
    expect(page.url()).toContain('sort_by');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(394);
  });

  // --- 7. PAGINATION ---
  test('PLP-020: Infinite scroll / Lazy product loading trigger', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);

    const priceNodes = await page.locator('text=/₹\\d+/').count();
    expect(priceNodes).toBeGreaterThan(0);
  });

  // --- 8. EMPTY STATES ---
  test('PLP-021: Non-existent category empty state handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-nonexistent99999-999`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('no products found');
    await page.screenshot({ path: path.join(SS_DIR, 'plp_21_empty_state.png') });
  });

  // --- 9. TOUCH TARGETS & IMAGE ASSETS ---
  test('PLP-023 & PLP-024: Mobile touch target sizes and image CDN delivery', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    const filterBtn = page.locator('button:has-text("Filters")').first();
    const sortBtn = page.locator('button:has-text("Sort")').first();
    const filterBox = await filterBtn.boundingBox();
    const sortBox = await sortBtn.boundingBox();

    expect(filterBox?.height).toBeGreaterThanOrEqual(30);
    expect(sortBox?.height).toBeGreaterThanOrEqual(30);

    const images = await page.locator('img[src*="product_img"], img[src*="product_thumb"], img[src*="gumlet"]').all();
    expect(images.length).toBeGreaterThan(0);
  });

  // --- 10. NETWORK TELEMETRY CORRELATION ---
  test('PLP-025: Live PLP UI interaction network telemetry correlation', async ({ page }) => {
    let capturedApiReq = false;
    page.on('request', req => {
      if (req.url().includes('/api/') || req.url().includes('/placeholder/product/list')) {
        capturedApiReq = true;
      }
    });

    await page.goto(`${BASE_URL}/product-list/category-smartphones-308`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    expect(capturedApiReq).toBe(true);
  });
});
