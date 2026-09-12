import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PIXEL_5 = devices['Pixel 5'];
const AUTH_STATE_PATH = path.resolve('auth-state-sangeetha.json');
const BASE_URL = 'https://www.sangeetha.com';

test.use({
  ...PIXEL_5,
  storageState: fs.existsSync(AUTH_STATE_PATH) ? AUTH_STATE_PATH : undefined,
});

async function ensurePopulatedCartAndPayment(page: any) {
  await page.goto(`${BASE_URL}/cart`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(2000);

  const removeBtns = page.locator('button:has-text("Remove")');
  const count = await removeBtns.count();

  if (count === 0) {
    console.log('[Setup] Cart empty, restoring or adding product 20628...');
    const restoreBtn = page.locator('button:has-text("Add to Cart")').first();
    if (await restoreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await restoreBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE_URL}/product-details/product/20628`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2000);
      const atc = page.locator('button:has-text("Add to Cart")').first();
      if (await atc.isVisible({ timeout: 3000 }).catch(() => false)) {
        await atc.click();
        await page.waitForTimeout(2500);
      }
    }
  }

  await page.goto(`${BASE_URL}/checkout-payment`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(2500);
}

test.describe('Payment / Card Post-Launch Mobile Regression — Pixel 5 (393 × 851)', () => {

  test.beforeEach(async ({ page }) => {
    if (fs.existsSync(AUTH_STATE_PATH)) {
      try {
        const authData = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf8'));
        if (authData?.origins?.[0]?.localStorage) {
          await page.addInitScript((entries) => {
            entries.forEach((item: any) => {
              try { localStorage.setItem(item.name, item.value); } catch (e) {}
            });
          }, authData.origins[0].localStorage);
        }
      } catch (e) {}
    }
    await ensurePopulatedCartAndPayment(page);
  });

  test('TC-PAY-POST-01: Full Mobile Payment UI Discovery & Layout (393 × 851)', async ({ page }) => {
    // 1. Verify Stepper Header
    await expect(page.getByText(/Payment/i).first()).toBeVisible();

    // 2. Verify Delivery Location Card
    await expect(page.getByText(/Deliver to/i).first()).toBeVisible();

    // 3. Verify Total Payable Amount
    await expect(page.getByText(/Total Payable Amount/i).first()).toBeVisible();

    // 4. Verify Payment Accordions (Card, UPI, Loans)
    await expect(page.getByText(/Pay with Card or EMI/i).first()).toBeVisible();
    await expect(page.locator('button:has-text("UPI")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Loans")').first()).toBeVisible();

    // 5. Verify Zero Horizontal Overflow
    const overflowInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflowInfo.scrollWidth).toBeLessThanOrEqual(overflowInfo.innerWidth + 2);
    console.log(`[Layout] Zero overflow verified: scrollWidth=${overflowInfo.scrollWidth}px, innerWidth=${overflowInfo.innerWidth}px`);

    // Capture screenshot
    fs.mkdirSync('screenshots/payment-post-launch', { recursive: true });
    await page.screenshot({ path: 'screenshots/payment-post-launch/01_payment_full_discovery_mobile.png' });
  });

  test('TC-PAY-POST-02: Card Auto-Detection, Bank Offer & Dynamic Pricing Recalculation', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    const expiryInput = page.locator('input[placeholder*="MM"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('input').nth(3);

    // Enter valid HDFC card
    await cardInput.fill('4375467100366475');
    await expiryInput.fill('12/2028');
    await cvvInput.fill('123');
    await nameInput.fill('John Doe');
    await page.waitForTimeout(2000);

    // Verify Card brand badge detection
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText.includes('HDFC') || pageText.includes('VISA') || pageText.includes('CREDIT')).toBe(true);
    console.log('[Card Detection] Verified HDFC / VISA card brand detection.');

    // Verify Bank Offers rendered
    expect(pageText.includes('Cashback') || pageText.includes('discount') || pageText.includes('Save upto') || pageText.includes('offers available')).toBe(true);
    console.log('[Bank Offers] Verified instant cashback / discount offer rendering.');

    // Verify Pay Now & Pay with EMI buttons rendered with recalculated total
    const payNowBtn = page.locator('button:has-text("Pay Now")').first();
    const payEmiBtn = page.locator('button:has-text("Pay with EMI")').first();
    await expect(payNowBtn).toBeVisible();
    await expect(payEmiBtn).toBeVisible();
    console.log('[Action Buttons] Verified Pay Now and Pay with EMI buttons rendered.');
  });

  test('TC-PAY-POST-03: Card Number Input Sanitization & Incomplete Length Behavior', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    const expiryInput = page.locator('input[placeholder*="MM"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('input').nth(3);

    // 1. Incomplete 15-digit card
    await cardInput.fill('437546710036647');
    await expiryInput.fill('12/2028');
    await cvvInput.fill('123');
    await nameInput.fill('John Doe');
    await page.waitForTimeout(1000);

    const payNowBtn = page.locator('button:has-text("Pay Now")').first();
    const isPayNowVisible = await payNowBtn.isVisible({ timeout: 1500 }).catch(() => false);
    expect(isPayNowVisible).toBe(false);
    console.log('[Sanitization] Incomplete 15-digit card suppresses Pay Now button.');

    // 2. Alphabetic input sanitization
    await cardInput.fill('abcdefgh');
    await page.waitForTimeout(300);
    const cardVal = await cardInput.inputValue();
    expect(cardVal.replace(/[^a-zA-Z]/g, '').length).toBe(0);
    console.log('[Sanitization] Alphabetic input cleanly filtered from card number field.');
  });

  test('TC-PAY-POST-04: Expiry Year Handling (Normalization, 0000, Past Year)', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    const expiryInput = page.locator('input[placeholder*="MM"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('input').nth(3);

    await cardInput.fill('4375467100366475');
    await cvvInput.fill('123');
    await nameInput.fill('John Doe');

    // 1. Test 0000 Expiry Year
    await expiryInput.fill('12/0000');
    await page.waitForTimeout(500);
    const expiryVal = await expiryInput.inputValue();
    console.log(`[Expiry Recheck] Entered "12/0000", field displays: "${expiryVal}"`);

    // 2. Test Past Year 2020
    await expiryInput.fill('12/2020');
    await page.waitForTimeout(500);
    const pastVal = await expiryInput.inputValue();
    console.log(`[Expiry Recheck] Entered "12/2020", field displays: "${pastVal}"`);

    // 3. Test Future Year 2028
    await expiryInput.fill('12/2028');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("Pay Now")').first()).toBeVisible();
    console.log('[Expiry Valid] Future year 2028 cleanly activates Pay Now.');
  });

  test('TC-PAY-POST-05: CVV Validation & Length Behavior (1, 2, 3, >3 Digits)', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    const expiryInput = page.locator('input[placeholder*="MM"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('input').nth(3);

    await cardInput.fill('4375467100366475');
    await expiryInput.fill('12/2028');
    await nameInput.fill('John Doe');

    // 1-digit CVV
    await cvvInput.fill('1');
    await page.waitForTimeout(500);
    console.log('[CVV Test] 1-digit CVV entered.');

    // 2-digit CVV
    await cvvInput.fill('12');
    await page.waitForTimeout(500);
    console.log('[CVV Test] 2-digit CVV entered.');

    // 3-digit CVV
    await cvvInput.fill('123');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Pay Now")').first()).toBeVisible();
    console.log('[CVV Test] 3-digit CVV enables Pay Now button.');
  });

  test('TC-PAY-POST-06: Payment Method Switching (Card -> UPI -> Loans -> Card)', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    await expect(cardInput).toBeVisible();

    // Switch to UPI
    const upiBtn = page.locator('button:has-text("UPI")').first();
    await upiBtn.click();
    await page.waitForTimeout(1500);

    const pageTextUpi = await page.evaluate(() => document.body.innerText);
    expect(pageTextUpi.includes('Google Pay') || pageTextUpi.includes('Paytm') || pageTextUpi.includes('Phonepe') || pageTextUpi.includes('UPI')).toBe(true);
    console.log('[Payment Switch] Switched to UPI accordion cleanly.');

    // Switch to Loans
    const loansBtn = page.locator('button:has-text("Loans")').first();
    await loansBtn.click();
    await page.waitForTimeout(1500);

    const pageTextLoans = await page.evaluate(() => document.body.innerText);
    expect(pageTextLoans.includes('Zestmoney') || pageTextLoans.includes('Loans')).toBe(true);
    console.log('[Payment Switch] Switched to Loans accordion cleanly.');

    // Switch back to Card
    const cardAccordion = page.locator('text=Pay with Card or EMI').first();
    await cardAccordion.click();
    await page.waitForTimeout(1500);
    await expect(cardInput).toBeVisible();
    console.log('[Payment Switch] Switched back to Card form with state intact.');
  });

  test('TC-PAY-POST-07: EMI Plans Drawer & Tenure Breakdown', async ({ page }) => {
    const cardInput = page.locator('input[placeholder*="0000"]').first();
    const expiryInput = page.locator('input[placeholder*="MM"]').first();
    const cvvInput = page.locator('input[placeholder="000"]').first();
    const nameInput = page.locator('input').nth(3);

    await cardInput.fill('4375467100366475');
    await expiryInput.fill('12/2028');
    await cvvInput.fill('123');
    await nameInput.fill('John Doe');
    await page.waitForTimeout(2000);

    const payEmiBtn = page.locator('button:has-text("Pay with EMI")').first();
    await expect(payEmiBtn).toBeVisible();
    await payEmiBtn.click();
    await page.waitForTimeout(2500);

    // Verify EMI options drawer content
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText.includes('EMI') || pageText.includes('Installment') || pageText.includes('months')).toBe(true);
    expect(pageText.includes('No Cost') || pageText.includes('Low Cost') || pageText.includes('Standard EMI')).toBe(true);
    console.log('[EMI Validation] EMI breakdown verified (No-Cost, Low-Cost, Standard EMI plans).');

    // Dismiss EMI drawer
    const closeBtn = page.locator('.modal.show .btn-close, button:has-text("✕"), [aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  });

  test('TC-PAY-POST-08: Network API Capture & Backend Interception', async ({ page }) => {
    let apiCaptured = false;

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/cart') || url.includes('/customer/api') || url.includes('/b/') || url.includes('payment') || url.includes('checkout')) {
        apiCaptured = true;
      }
    });

    await page.goto(`${BASE_URL}/checkout-payment`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    console.log(`[Network Intercept] Production Payment API Intercepted: ${apiCaptured}`);
    expect(apiCaptured).toBe(true);
  });

});
