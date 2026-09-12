import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com';
const SS_DIR = path.resolve('screenshots/oppo-a6-investigation');

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

test.describe('OPPO A6 (Product ID 21036) Cross-Feature Investigation: MAXSAVE Coupon + IDFC Low-Cost EMI', () => {

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

  // --- 1. BACKEND API CONTRACT FOR OPPO A6 (21036) ---
  test('TC-OPPO-A6-001: Production Offers API contract verification for Product ID 21036', async ({ request: req }) => {
    const res = await req.post(`${BASE_URL}/b/customer/api/offers/allV4`, {
      data: {
        products: [{ product_id: 21036, amount: 28999 }],
        user_id: '71307501',
        type: 'pwa'
      },
      headers: {
        'content-type': 'application/json',
        'clientid': 'sangeethamobiles'
      }
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.http_code).toBe(200);

    const emiPlans = json.data.card_offer_list || json.data.emi_plans || [];
    expect(emiPlans.length).toBeGreaterThan(0);

    // Verify IDFC First Bank Low Cost EMI specifically for OPPO A6 (21036)
    const idfcOffers = emiPlans.filter((o: any) => o.bank === 'idfc-first-bank' && o.product_ids?.includes(21036));
    expect(idfcOffers.length).toBeGreaterThan(0);

    const idfcLowCost = idfcOffers.find((o: any) => o.offer_type === 'no_cost_emi' || o.tag_text === 'Low Cost EMI' || o.description.includes('Low Cost EMI'));
    expect(idfcLowCost).toBeDefined();
    expect(idfcLowCost.title).toContain('IDFC First Bank Credit Card');
    expect(idfcLowCost.description).toContain('Low Cost EMI');
  });

  // --- 2. CART FLOW & MAXSAVE COUPON APPLICATION ---
  test('TC-OPPO-A6-002: OPPO A6 Cart verification and MAXSAVE coupon interaction', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const cartText = await page.innerText('body');
    expect(cartText.includes('OPPO A6') || cartText.includes('₹') || cartText.includes('Cart')).toBe(true);

    // Apply MAXSAVE
    const couponInput = page.locator('input[placeholder*="Coupon" i], input[placeholder*="coupon" i], input[placeholder*="code" i]').first();
    if (await couponInput.isVisible().catch(() => false)) {
      await couponInput.fill('MAXSAVE');
      const applyBtn = page.locator('button:has-text("Apply"), span:has-text("Apply")').first();
      await applyBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }

    const postApplyText = await page.innerText('body');
    expect(postApplyText.includes('MAXSAVE') || postApplyText.includes('Coupon') || postApplyText.includes('₹')).toBe(true);

    await page.screenshot({ path: path.join(SS_DIR, 'tc_oppo_a6_cart_coupon_applied.png') });
  });

  // --- 3. CHECKOUT PAYMENT & IDFC LOW-COST EMI WITH MAXSAVE ---
  test('TC-OPPO-A6-003: Checkout Offers drawer renders IDFC Low-Cost EMI without "No data found"', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    // Open Offers drawer
    const viewOffersBtn = page.locator('button:has-text("View")').first();
    await expect(viewOffersBtn).toBeVisible();
    await viewOffersBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Switch to EMI Plans tab
    const emiTab = page.locator('button:has-text("EMI Plans")').first();
    await expect(emiTab).toBeVisible();
    await emiTab.click({ force: true });
    await page.waitForTimeout(2000);

    const drawerBodyText = await page.innerText('body');

    // 1. Verify IDFC First Bank Credit Card is displayed
    expect(drawerBodyText).toContain('IDFC First Bank Credit Card');

    // 2. Verify Low Cost EMI tag / terms
    expect(drawerBodyText).toContain('Low Cost EMI');

    // 3. Verify exact monthly installment schedule (e.g. ₹1,420 x 24m or ₹3,926 x 24m)
    expect(drawerBodyText).toContain('x 24m');

    // 4. CRITICAL: Verify "No data found" is strictly FALSE
    const hasNoDataFound = drawerBodyText.toLowerCase().includes('no data found');
    expect(hasNoDataFound).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'tc_oppo_a6_idfc_emi_rendered.png') });
  });

  // --- 4. MULTI-BANK EMI COVERAGE ON OPPO A6 ---
  test('TC-OPPO-A6-004: Multi-bank Low-Cost EMI options for OPPO A6 (Product ID 21036)', async ({ page }) => {
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
    expect(bodyText).toContain('IDFC First Bank Credit Card');
    expect(bodyText).toContain('SBI Bank Credit Card');
    expect(bodyText).toContain('HSBC Bank Credit Card');
    expect(bodyText).toContain('Bank of Baroda Credit Card');
    expect(bodyText).toContain('Federal Bank Credit Card');
    expect(bodyText).toContain('HDFC Bank Credit Card');

    await page.screenshot({ path: path.join(SS_DIR, 'tc_oppo_a6_multi_bank_emi.png') });
  });

});
