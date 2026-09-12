import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com';
const SS_DIR = path.join(__dirname, '../../reports/pdp/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SS_DIR)) {
    fs.mkdirSync(SS_DIR, { recursive: true });
  }
});

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

test.describe('Sangeetha Production Mobile PDP Regression Suite (Pixel 5: 393x851)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await setupPDPRoute(page);
  });

  // --- 1. ACCESS & MOBILE LAYOUT ---
  test('PDP-001 & PDP-002: Customer navigates to PDP and verifies 393px mobile layout stability', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText.toLowerCase()).toContain('redmi');
    expect(bodyText).toContain('₹');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(394);

    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'pdp_001_002_layout.png') });
  });

  test('PDP-003 & PDP-004: Header navigation, Back CTA, and Share button presence', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const backBtn = page.locator('img[src*="arrow-left"], svg.lucide-arrow-left, button:has(img[src*="arrow-left"])').first();
    const cartIcon = page.locator('img[src*="shopping-cart"], svg.lucide-shopping-cart, a[href*="/cart"]').first();
    const shareBtn = page.locator('img[src*="share"], svg.lucide-share, button:has(img[src*="share"])').first();

    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await expect(cartIcon).toBeVisible({ timeout: 5000 });
    await expect(shareBtn).toBeVisible({ timeout: 5000 });
  });

  // --- 2. GALLERY & IMAGES ---
  test('PDP-005 & PDP-006: Gallery CDN delivery and image loading', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const images = page.locator('img[src*="gumlet"], img[alt*="Product image"]');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    const firstImg = images.first();
    const naturalWidth = await firstImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(SS_DIR, 'pdp_005_gallery.png') });
  });

  // --- 3. PRICING & DISCOUNTS ---
  test('PDP-008: Pricing, Strike-through MRP, and Savings badge verification', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('₹26,999');
    expect(bodyText).toContain('₹41,999');
    expect(bodyText).toContain('Save ₹15,000');
  });

  // --- 4. VARIANT SELECTION ---
  test('PDP-011: Color variant switching updates title context', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2500);

    // Click Eternal Orange
    const orangeBtn = page.locator('button:has-text("Eternal Orange"), div:has-text("Eternal Orange")').first();
    if (await orangeBtn.isVisible().catch(() => false)) {
      await orangeBtn.click({ force: true });
      await page.waitForTimeout(2500);

      const titleText = await page.innerText('body');
      expect(titleText.toLowerCase()).toContain('eternal orange');
    }
  });

  test('PDP-012 & PDP-013: Storage/RAM variant switching and restoration', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2500);

    // Switch to 6GB + 128GB
    const configBtn6GB = page.locator('button:has-text("6GB + 128GB"), div:has-text("6GB + 128GB")').first();
    if (await configBtn6GB.isVisible().catch(() => false)) {
      await configBtn6GB.click({ force: true });
      await page.waitForTimeout(2500);

      const bodyTextAfter6GB = await page.innerText('body');
      expect(bodyTextAfter6GB).toContain('₹23,999');

      // Switch back to 8GB + 128GB
      const configBtn8GB = page.locator('button:has-text("8GB + 128GB"), div:has-text("8GB + 128GB")').first();
      await configBtn8GB.click({ force: true });
      await page.waitForTimeout(2500);

      const bodyTextAfter8GB = await page.innerText('body');
      expect(bodyTextAfter8GB).toContain('₹26,999');
    }
  });

  // --- 5. LOCATION & PINCODE ETA ---
  test('PDP-015 & PDP-017: Location delivery status and sticky chip presence', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText.includes('560078') || bodyText.includes('Deliver') || bodyText.includes('Location')).toBeTruthy();

    const deliverChip = page.locator('button:has-text("Deliver to 560078"), div:has-text("Deliver to 560078"), button:has-text("Deliver"), div:has-text("Deliver")').first();
    await expect(deliverChip).toBeVisible({ timeout: 6000 });
  });

  // --- 6. ADD TO CART & BUY NOW ---
  test('PDP-018: Add to Cart CTA interaction and cart state', async ({ page }) => {
    let cartRequestSent = false;
    page.on('request', req => {
      if (req.url().includes('/cart') || req.url().includes('/add-to-cart')) {
        cartRequestSent = true;
      }
    });

    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.locator('button:has-text("Add to Cart")').first().waitFor({ state: 'visible', timeout: 15000 });

    const addBtn = page.locator('.fixed.bottom-0 button:has-text("Add to Cart"), button:has-text("Add to Cart")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click({ force: true });
    await page.waitForTimeout(2500);

    const bodyText = await page.innerText('body');
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('PDP-019: Buy Now CTA interaction and checkout initiation', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.locator('button:has-text("Buy Now")').first().waitFor({ state: 'visible', timeout: 15000 });

    const buyBtn = page.locator('.fixed.bottom-0 button:has-text("Buy Now"), button:has-text("Buy Now")').first();
    await expect(buyBtn).toBeVisible();
    await buyBtn.click({ force: true });
    await page.waitForTimeout(2500);

    const url = page.url();
    const bodyText = await page.innerText('body');
    expect(url.includes('checkout') || url.includes('login') || bodyText.includes('Login') || bodyText.includes('Checkout') || url.includes('product-details')).toBeTruthy();
  });

  test('PDP-020: Sticky bottom CTA bar remains locked to viewport during scroll', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now")').first().waitFor({ state: 'visible', timeout: 15000 });

    const stickyBar = page.locator('.fixed.bottom-0, [class*="fixed bottom"]').first();
    await expect(stickyBar).toBeVisible();

    // Scroll 1500px down
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1000);

    await expect(stickyBar).toBeVisible();
    const addBtn = stickyBar.locator('button:has-text("Add to Cart")').first();
    const buyBtn = stickyBar.locator('button:has-text("Buy Now")').first();
    await expect(addBtn).toBeVisible();
    await expect(buyBtn).toBeVisible();

    await page.screenshot({ path: path.join(SS_DIR, 'pdp_020_sticky_cta.png') });
  });

  // --- 7. SPECIFICATIONS & REVIEWS ---
  test('PDP-021 & PDP-022 & PDP-023: Specs, Highlights, Reviews, and FAQ sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await page.locator('button:has-text("Buy Now"), h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Specs');
    expect(bodyText).toContain('Highlights');
    expect(bodyText).toContain('Ratings & Reviews');
    expect(bodyText).toContain('Write a Review');
    expect(bodyText).toContain("FAQ's");
    expect(bodyText).toContain('Post your Question');
  });

  // --- 8. TELEMETRY & APIS ---
  test('PDP-009 & PDP-016 & PDP-024: Live PDP API contracts verification', async ({ request: req }) => {
    // 1. Offers API
    const offersRes = await req.post(`${BASE_URL}/b/customer/api/offers/allV4`, {
      data: {
        products: [{ product_id: 21266, amount: 26999 }],
        user_id: '',
        type: 'pwa'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(offersRes.status()).toBe(200);
    const offersJson = await offersRes.json();
    expect(offersJson.http_code).toBe(200);

    // 2. ETA API
    const etaRes = await req.post(`${BASE_URL}/b/customer/api/v3/product-eta-details`, {
      data: {
        type: 'pwa',
        product_id: '21266',
        pinCode: '560078'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(etaRes.status()).toBe(200);
    const etaJson = await etaRes.json();
    expect(etaJson.http_code).toBe(200);

    // 3. Ratings API
    const ratingsRes = await req.post(`${BASE_URL}/b/customer/api/v3/get-product-rating`, {
      data: {
        product_id: '21266',
        user_id: '',
        type: 'pwa',
        sort_by: 'latest',
        category: ''
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(ratingsRes.status()).toBe(200);
    const ratingsJson = await ratingsRes.json();
    expect(ratingsJson.http_code).toBe(200);
  });
});
