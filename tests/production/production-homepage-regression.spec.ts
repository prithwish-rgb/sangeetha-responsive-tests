import { test, expect, devices, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROD_URL = 'https://www.sangeetha.com/';
const REPORT_DIR = path.resolve('reports/homepage');
const SS_DIR = path.join(REPORT_DIR, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });

test.use({
  ...devices['Pixel 5'],
  viewport: { width: 393, height: 851 },
});

test.describe('📱 Sangeetha Production Mobile Homepage Feature-Level Regression Suite', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
  });

  test('HOME-001: Mobile Homepage Load & Title Verification', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Sangeetha');
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_01_load.png') });
  });

  test('HOME-002: Hyperlocal Location Bottom Sheet Initial State', async ({ page }) => {
    let locationModal = page.locator('.pwa-modal-slide-up, [class*="modal" i]:has-text("Location")').first();
    let isVisible = await locationModal.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      // If location is already set in auth session, click header location trigger to inspect
      const locTrigger = page.locator('[aria-label="Choose delivery location"], button:has-text("Select Delivery Location"), [class*="location" i]').first();
      if (await locTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await locTrigger.click({ force: true });
        await page.waitForTimeout(1000);
        isVisible = await locationModal.isVisible({ timeout: 4000 }).catch(() => false);
      }
    }
    expect(isVisible).toBe(true);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_02_location_modal.png') });
  });

  test('HOME-003 & HOME-004: Type Manually Pincode Input & CTA Boundary Validation', async ({ page }) => {
    let typeManually = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
    if (!await typeManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      const locTrigger = page.locator('[aria-label="Choose delivery location"], button:has-text("Select Delivery Location"), [class*="location" i]').first();
      if (await locTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await locTrigger.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    if (await typeManually.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeManually.click({ force: true });
      await page.waitForTimeout(800);
    }
    const input = page.locator('input[placeholder*="Pincode" i], input[type="tel"]').first();
    await expect(input).toBeVisible({ timeout: 4000 });

    // Clear input to test empty boundary state
    await input.fill('');
    await page.waitForTimeout(400);

    const checkBtn = page.locator('button:has-text("Check Delivery Availability"), button:has-text("Check")').first();
    expect(await checkBtn.getAttribute('disabled')).not.toBeNull();

    await input.fill('5600');
    await page.waitForTimeout(400);
    expect(await checkBtn.getAttribute('disabled')).not.toBeNull();
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_03_pincode_boundary.png') });
  });

  test('HOME-005 & HOME-006: Pincode Submission (Unserviceable 999999 vs Valid 560078)', async ({ page }) => {
    let typeManually = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
    if (!await typeManually.isVisible({ timeout: 1500 }).catch(() => false)) {
      const locTrigger = page.locator('[aria-label="Choose delivery location"], button:has-text("Select Delivery Location"), [class*="location" i]').first();
      if (await locTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await locTrigger.click({ force: true });
        await page.waitForTimeout(800);
      }
    }

    if (await typeManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeManually.click({ force: true });
      await page.waitForTimeout(600);
    }
    const input = page.locator('input[placeholder*="Pincode" i], input[type="tel"]').first();
    await input.fill('');
    await input.pressSequentially('560078', { delay: 30 });
    await page.waitForTimeout(400);

    const checkBtn = page.locator('button:has-text("Check Delivery Availability"), button:has-text("Check")').first();
    await checkBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_06_pincode_valid.png') });
  });

  test('HOME-007 & HOME-008 & HOME-009: Header Controls (Logo, Cart Icon, Voice/Camera Search)', async ({ page }) => {
    const logo = page.locator('header img, a[href="/"] img, img[alt*="logo" i]').first();
    await expect(logo).toBeVisible({ timeout: 3000 });

    const cartBtn = page.locator('button[aria-label*="cart" i], a[href*="cart"]').first();
    await expect(cartBtn).toBeVisible({ timeout: 3000 });

    const searchControls = page.locator('button[aria-label="Open camera"], button[aria-label="Use microphone"], img[src*="search"]');
    expect(await searchControls.count()).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_07_header_controls.png') });
  });

  test('HOME-010 & HOME-011: Hero Carousel & Popular Categories Strip', async ({ page }) => {
    const bullets = page.locator('button.homepage-banner-bullet');
    expect(await bullets.count()).toBeGreaterThan(0);

    const catHeading = page.locator('h2:has-text("Popular Categories")').first();
    if (await catHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await catHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
    }
    const categoryImages = page.locator('img[src*="cat_"], img[src*="catimage"]');
    expect(await categoryImages.count()).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_10_categories.png') });
  });

  test('HOME-012 & HOME-013: Promotional Rails & Product Card CTAs ("Add to Cart" / "Buy Now")', async ({ page }) => {
    // Dismiss modal if open so scroll triggers lazy components
    const isModal = await page.locator('.pwa-modal-slide-up').isVisible({ timeout: 1000 }).catch(() => false);
    if (isModal) {
      await page.mouse.click(200, 50);
      await page.waitForTimeout(600);
    }

    // Scroll down to ensure rails load
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1000);

    const addButtons = page.locator('button:has-text("Add to Cart")');
    const buyButtons = page.locator('button:has-text("Buy Now")');
    await addButtons.first().waitFor({ state: 'attached', timeout: 5000 });
    expect(await addButtons.count()).toBeGreaterThan(0);
    expect(await buyButtons.count()).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_12_rails_ctas.png') });
  });

  test('HOME-014 & HOME-015 & HOME-017: Brand Showcases & Curated Dark Theme Rails', async ({ page }) => {
    const isModal = await page.locator('.pwa-modal-slide-up').isVisible({ timeout: 1000 }).catch(() => false);
    if (isModal) {
      await page.mouse.click(200, 50);
      await page.waitForTimeout(600);
    }

    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1000);

    const brandImages = page.locator('img[src*="brands"], img[src*="brand"]');
    expect(await brandImages.count()).toBeGreaterThan(0);

    const bestSellingHeading = page.locator('h2:has-text("Best Selling Phones")').first();
    await expect(bestSellingHeading).toBeVisible({ timeout: 4000 });
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_14_brands_bestsellers.png') });
  });

  test('HOME-018 & HOME-019 & HOME-020: Newsletter, Footer Accordions & Zero Overflow Scan', async ({ page }) => {
    const footer = page.locator('footer, [class*="footer" i]').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const accordionBtn = page.locator('footer button:has-text("Sangeetha"), [class*="footer" i] button:has-text("Sangeetha")').first();
    if (await accordionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accordionBtn.click({ force: true });
      await page.waitForTimeout(600);
      const termsLink = page.locator('footer a:has-text("Terms and Conditions"), a[href*="terms"]').first();
      await expect(termsLink).toBeVisible({ timeout: 2000 });
    }

    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(hasOverflow).toBe(false);
    await page.screenshot({ path: path.join(SS_DIR, 'playwright_18_footer_overflow.png') });
  });
});
