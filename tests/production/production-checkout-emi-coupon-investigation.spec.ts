import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com';
const SS_DIR = path.resolve('screenshots/checkout-emi-probe');

test.beforeAll(() => {
  if (!fs.existsSync(SS_DIR)) {
    fs.mkdirSync(SS_DIR, { recursive: true });
  }
});

test.use({
  storageState: 'auth-state-sangeetha.json',
  viewport: { width: 393, height: 851 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
});

test.describe('Checkout Targeted Regression: MAXSAVE Coupon + IDFC Low-Cost EMI Investigation', () => {

  test.beforeEach(async ({ page }) => {
    const authFilePath = path.resolve('auth-state-sangeetha.json');
    if (fs.existsSync(authFilePath)) {
      try {
        const authData = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));
        if (authData?.origins?.[0]?.localStorage) {
          await page.addInitScript((entries) => {
            entries.forEach((item: any) => {
              try { localStorage.setItem(item.name, item.value); } catch (e) {}
            });
          }, authData.origins[0].localStorage);
        }
      } catch (e) {}
    }
  });

  test('TEST 1: Baseline IDFC Low-Cost EMI plans verification before coupon', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const viewOffersBtn = page.locator('button:has-text("View")').first();
    await expect(viewOffersBtn).toBeVisible();
    await viewOffersBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const emiTab = page.locator('button:has-text("EMI Plans")').first();
    await expect(emiTab).toBeVisible();
    await emiTab.click({ force: true });
    await page.waitForTimeout(1500);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('IDFC First Bank Credit Card');
    expect(bodyText).toContain('Low Cost EMI');
    expect(bodyText).toContain('₹82,499');

    // Confirm "No data found" is NOT present
    expect(bodyText.toLowerCase().includes('no data found')).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'test1_baseline_idfc_emi_plans.png') });
  });

  test('TEST 2 & TEST 3: MAXSAVE coupon application in Cart and verification in Checkout', async ({ page }) => {
    // Navigate to /cart
    await page.goto(`${BASE_URL}/cart`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const couponInput = page.locator('input[placeholder*="Coupon" i], input[placeholder*="coupon" i], input[placeholder*="code" i]').first();
    await expect(couponInput).toBeVisible();
    await couponInput.fill('MAXSAVE');
    await page.waitForTimeout(500);

    const applyBtn = page.locator('button:has-text("Apply"), span:has-text("Apply")').first();
    await applyBtn.click({ force: true });
    await page.waitForTimeout(2500);

    const cartText = await page.innerText('body');
    // Captures either coupon discount or customer eligibility message
    const isCouponProcessed = cartText.includes('MAXSAVE') || 
                              cartText.includes('not eligible') || 
                              cartText.includes('Applied') ||
                              cartText.includes('Coupon');
    expect(isCouponProcessed).toBe(true);

    await page.screenshot({ path: path.join(SS_DIR, 'test2_cart_coupon_state.png') });

    // Navigate to checkout-payment
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    // Open Offers & EMI Plans
    await page.locator('button:has-text("View")').first().click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("EMI Plans")').first().click({ force: true });
    await page.waitForTimeout(1500);

    const checkoutText = await page.innerText('body');
    expect(checkoutText).toContain('IDFC First Bank Credit Card');
    expect(checkoutText.toLowerCase().includes('no data found')).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'test3_checkout_post_coupon_emi.png') });
  });

  test('TEST 4 & TEST 5: Multi-bank EMI provider coverage under EMI Plans tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("View")').first().click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("EMI Plans")').first().click({ force: true });
    await page.waitForTimeout(1500);

    const bodyText = await page.innerText('body');
    // Verify multi-bank availability
    expect(bodyText).toContain('IDFC First Bank Credit Card');
    expect(bodyText).toContain('HDFC Bank Credit Card');
    expect(bodyText).toContain('SBI Bank Credit Card');
    expect(bodyText).toContain('HSBC Bank Credit Card');
    expect(bodyText).toContain('Federal Bank Credit Card');

    await page.screenshot({ path: path.join(SS_DIR, 'test4_5_multi_bank_emi.png') });
  });

  test('TEST 6: Production Network Contract for Offers and Coupon Verification', async ({ request: req }) => {
    // 1. Verify Offers All V4 API contract
    const offersRes = await req.post(`${BASE_URL}/b/customer/api/offers/allV4`, {
      data: {
        products: [
          { product_id: 20258, amount: 52999 },
          { product_id: 20628, amount: 84999 }
        ],
        user_id: '71307501',
        type: 'pwa'
      }
    });
    expect(offersRes.status()).toBe(200);
    const offersData = await offersRes.json();
    expect(offersData.http_code).toBe(200);
    expect(offersData.data.emi_plans.length).toBeGreaterThan(0);

    const idfcEmi = offersData.data.emi_plans.find((p: any) => p.bank === 'idfc-first-bank');
    expect(idfcEmi).toBeDefined();
    expect(idfcEmi.title).toContain('IDFC First Bank Credit Card');
    expect(idfcEmi.description).toContain('Low Cost EMI');
  });
});
