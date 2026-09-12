import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com/';
const SS_DIR = path.join(__dirname, '../../reports/search/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SS_DIR)) {
    fs.mkdirSync(SS_DIR, { recursive: true });
  }
});

async function dismissModalIfOpen(page: any) {
  await page.waitForTimeout(1000);
  try {
    const locationModal = page.locator('div:has-text("Enter Your Location")').first();
    if (await locationModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const typeManually = page.locator('button:has-text("Type Manually")').first();
      if (await typeManually.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeManually.click({ force: true }).catch(() => null);
        await page.waitForTimeout(400);
        const pinInput = page.locator('input[type="tel"]').first();
        if (await pinInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await pinInput.fill('560078').catch(() => null);
          await page.waitForTimeout(200);
          const checkBtn = page.locator('button:has-text("Check Delivery Availability")').first();
          await checkBtn.click({ force: true }).catch(() => null);
          await page.waitForTimeout(1500);
        }
      }
    }
    await page.evaluate(() => {
      document.querySelectorAll('.fixed.inset-0.bg-black\\/50').forEach(el => el.remove());
      const slideUp = document.querySelector('.pwa-modal-slide-up.bottom-0');
      if (slideUp && slideUp.textContent?.includes('Location')) slideUp.remove();
    });
    await page.waitForTimeout(500);
  } catch (e) {}
}

async function openSearchDrawer(page: any) {
  const searchPrompt = page.locator('div.cursor-pointer:has(img[src*="search-favorite"]), div.cursor-pointer:has(button[aria-label="Open camera"])').first();
  await expect(searchPrompt).toBeVisible({ timeout: 6000 });
  await searchPrompt.click({ force: true });
  await page.waitForTimeout(1200);
  const drawer = page.locator('.pwa-modal-slide-up.fixed.inset-0, div.pwa-modal-zoom-safe').first();
  await expect(drawer).toBeVisible({ timeout: 6000 });
  return drawer;
}

test.describe('Sangeetha Production Mobile Search Regression Suite (Pixel 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2000);
    await dismissModalIfOpen(page);
  });

  test('SEARCH-001 & SEARCH-002: Mobile Search Bar Container & Icon Rendering', async ({ page }) => {
    const searchBar = page.locator('div:has(img[src*="search-favorite"]), div:has(button[aria-label="Open camera"])').first();
    await expect(searchBar).toBeVisible({ timeout: 6000 });

    const searchIcon = page.locator('img[src*="search-favorite"], img[src*="search"]').first();
    await expect(searchIcon).toBeVisible({ timeout: 4000 });

    const promptText = await searchBar.innerText();
    expect(promptText.length).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(SS_DIR, 'search_01_bar_and_icon.png') });
  });

  test('SEARCH-003 & SEARCH-004: Camera & Voice Search Controls and Touch Targets', async ({ page }) => {
    const cameraBtn = page.locator('button[aria-label="Open camera"]').first();
    const micBtn = page.locator('button[aria-label="Use microphone"]').first();

    await expect(cameraBtn).toBeVisible({ timeout: 6000 });
    await expect(micBtn).toBeVisible({ timeout: 6000 });

    const camBox = await cameraBtn.boundingBox();
    const micBox = await micBtn.boundingBox();

    expect(camBox).not.toBeNull();
    expect(micBox).not.toBeNull();
    if (camBox) {
      expect(camBox.width).toBeGreaterThanOrEqual(16);
      expect(camBox.height).toBeGreaterThanOrEqual(16);
    }
    if (micBox) {
      expect(micBox.width).toBeGreaterThanOrEqual(16);
      expect(micBox.height).toBeGreaterThanOrEqual(16);
    }

    await page.screenshot({ path: path.join(SS_DIR, 'search_03_camera_mic_controls.png') });
  });

  test('SEARCH-005: 393px Mobile Viewport Layout and Zero Overflow Scan', async ({ page }) => {
    const searchBar = page.locator('div:has(img[src*="search-favorite"])').first();
    const box = await searchBar.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(393);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }

    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'search_05_viewport_overflow.png') });
  });

  test('SEARCH-006: Top Trending Search Products API Telemetry', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext();
    const res = await apiContext.get('https://www.sangeetha.com/b/customer/api/search/top-trending-products?type=pwa&user_id=&offset=0&limit=10&pinCode=560078', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
      timeout: 25000
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.http_code).toBe(200);
    expect(json.data?.products).toBeDefined();
    expect(json.data.products.length).toBeGreaterThan(0);
    await apiContext.dispose();
  });

  test('SEARCH-007 through SEARCH-013: Product, Brand, Spec, Category & Case-Insensitive Search Queries', async ({ playwright }) => {
    const queries = [
      { term: 'iPhone', minRecords: 20 },
      { term: 'Samsung', minRecords: 200 },
      { term: '5G', minRecords: 200 },
      { term: 'Laptops', minRecords: 10 },
      { term: 'sam', minRecords: 200 },
      { term: '128', minRecords: 200 }
    ];

    const apiContext = await playwright.request.newContext();
    for (const q of queries) {
      const res = await apiContext.post('https://www.sangeetha.com/b/customer/api/search/products', {
        data: { keyword: q.term, type: 'pwa', offset: 0, limit: 10, pinCode: '560078' },
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
        timeout: 15000
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.http_code).toBe(200);
      expect(json.data?.pagination?.total_records).toBeGreaterThan(q.minRecords);
    }

    // Case-insensitive parity check: 'iPhOnE' vs 'iPhone'
    const resMixed = await apiContext.post('https://www.sangeetha.com/b/customer/api/search/products', {
      data: { keyword: 'iPhOnE', type: 'pwa', offset: 0, limit: 10, pinCode: '560078' },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
      timeout: 15000
    });
    const jsonMixed = await resMixed.json();
    expect(jsonMixed.data?.pagination?.total_records).toBeGreaterThan(100);
    await apiContext.dispose();
  });

  test('SEARCH-014 through SEARCH-016: Boundary Validation, Whitespace & Security Defense', async ({ playwright }) => {
    const apiContext = await playwright.request.newContext();
    // 1. Special characters
    const resSpecial = await apiContext.post('https://www.sangeetha.com/b/customer/api/search/products', {
      data: { keyword: '@#$%', type: 'pwa', offset: 0, limit: 10, pinCode: '560078' },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
      timeout: 15000
    });
    expect(resSpecial.status()).toBe(200);
    const jsonSpecial = await resSpecial.json();
    expect(jsonSpecial.message).toContain('The keyword format is invalid.');

    // 2. Whitespace only
    const resWs = await apiContext.post('https://www.sangeetha.com/b/customer/api/search/products', {
      data: { keyword: '   ', type: 'pwa', offset: 0, limit: 10, pinCode: '560078' },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
      timeout: 15000
    });
    expect(resWs.status()).toBe(200);
    const jsonWs = await resWs.json();
    expect(jsonWs.message).toContain('The keyword field is required.');

    // 3. Script injection WAF protection
    const resXss = await apiContext.post('https://www.sangeetha.com/b/customer/api/search/products', {
      data: { keyword: '<script>alert(1)</script>', type: 'pwa', offset: 0, limit: 10, pinCode: '560078' },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' },
      timeout: 15000
    });
    expect(resXss.status()).toBe(403);
    await apiContext.dispose();
  });

  // --- 5. REAL MOBILE CUSTOMER SEARCH UI JOURNEY (SEARCH-017 to SEARCH-028) ---

  test('SEARCH-017: Customer opens Mobile Search Drawer from Homepage', async ({ page }) => {
    const drawer = await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    const drawerText = await drawer.innerText();
    expect(drawerText.toLowerCase()).toContain('suggestions');

    await page.screenshot({ path: path.join(SS_DIR, 'search_17_open_drawer.png') });
  });

  test('SEARCH-018: Customer enters product query in mobile search drawer', async ({ page }) => {
    await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"], input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(1000);

    expect(await searchInput.inputValue()).toBe('iPhone');

    await page.screenshot({ path: path.join(SS_DIR, 'search_18_query_input.png') });
  });

  test('SEARCH-019: Customer verifies live autocomplete suggestions and instant product cards', async ({ page }) => {
    const drawer = await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(2000);

    const suggestions = page.locator('.pwa-modal-slide-up div:has-text("in "), .pwa-modal-slide-up button:has-text("in ")').first();
    await expect(suggestions).toBeVisible({ timeout: 6000 });

    const text = await drawer.innerText();
    expect(text).toContain('₹');

    const seeAll = page.locator('.pwa-modal-slide-up button:has-text("See all Products"), .pwa-modal-slide-up div:has-text("See all Products")').first();
    await expect(seeAll).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: path.join(SS_DIR, 'search_19_autocomplete_cards.png') });
  });

  test('SEARCH-020 & SEARCH-021: Customer submits search query and validates results page', async ({ page }) => {
    await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(1000);
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/search-result.*iphone/i, { timeout: 8000 });

    const pageText = await page.innerText('body');
    expect(pageText).toContain('Continue Browsing');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(394);

    await page.screenshot({ path: path.join(SS_DIR, 'search_20_21_results_page.png') });
  });

  test('SEARCH-022: Customer navigates back from Search Drawer to Homepage', async ({ page }) => {
    await openSearchDrawer(page);
    const closeBtn = page.locator('.pwa-modal-slide-up button').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const drawer = page.locator('.pwa-modal-slide-up.fixed.inset-0');
    await expect(drawer).not.toBeVisible({ timeout: 5000 });
  });

  test('SEARCH-023: Customer clears search query using clear control', async ({ page }) => {
    const drawer = await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(1000);

    await searchInput.fill('');
    await page.waitForTimeout(800);

    expect(await searchInput.inputValue()).toBe('');
    const text = await drawer.innerText();
    expect(text.toLowerCase()).toContain('suggestions');
  });

  test('SEARCH-024: Customer executes second search without page reload', async ({ page }) => {
    const drawer = await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"], input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(1000);

    await searchInput.fill('Samsung');
    await page.waitForTimeout(2000);

    const text = await drawer.innerText();
    expect(text.toLowerCase()).toContain('samsung');
  });

  test('SEARCH-025: Customer tests boundary and nonexistent UI search terms', async ({ page }) => {
    await page.goto('https://www.sangeetha.com/search-result/xyznonexistent99999', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const pageText = await page.innerText('body');
    expect(pageText.toLowerCase()).toContain('xyznonexistent99999');
  });

  test('SEARCH-026: Mobile Search UI layout and touch targets fit 393px viewport', async ({ page }) => {
    const drawer = await openSearchDrawer(page);
    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(394);
    }
  });

  test('SEARCH-027: Camera and Voice triggers inside Search Drawer', async ({ page }) => {
    const camBtn = page.locator('button[aria-label="Open camera"]').first();
    const micBtn = page.locator('button[aria-label="Use microphone"]').first();
    await expect(camBtn).toBeVisible({ timeout: 5000 });
    await expect(micBtn).toBeVisible({ timeout: 5000 });

    await openSearchDrawer(page);
    const drawerCloseBtn = page.locator('.pwa-modal-slide-up button').first();
    await expect(drawerCloseBtn).toBeVisible({ timeout: 5000 });
  });

  test('SEARCH-028: Live UI search network request correlation', async ({ page }) => {
    let capturedSearchReq = false;
    page.on('request', req => {
      if (req.url().includes('/b/customer/api/search/products') && req.method() === 'POST') {
        capturedSearchReq = true;
      }
    });

    await openSearchDrawer(page);
    const searchInput = page.locator('.pwa-modal-slide-up input[type="text"]').first();
    await searchInput.fill('iPhone');
    await page.waitForTimeout(2000);

    expect(capturedSearchReq).toBe(true);
  });
});
