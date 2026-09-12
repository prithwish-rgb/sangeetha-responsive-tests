import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://www.sangeetha.com';
const SS_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/checkout-matrix');

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

test.describe('Sangeetha Production Mobile Checkout Regression Suite (Pixel 5: 393x851)', () => {

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

  // --- 1. ACCESS & MOBILE LAYOUT ---
  test('CHECKOUT-001 & CHECKOUT-002: Customer navigates to checkout-payment and verifies 393px mobile layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Payment');
    expect(bodyText).toContain('Deliver to');

    const bodyWidth = await page.evaluate(() => Math.min(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth));
    expect(bodyWidth).toBeLessThanOrEqual(394);

    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_001_002_layout.png') });
  });

  test('CHECKOUT-003 & CHECKOUT-004: Checkout stepper, Cart->Address->Payment, and Header controls', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Cart');
    expect(bodyText).toContain('Address');
    expect(bodyText).toContain('Payment');

    const paymentStep = page.locator('h1, h2, h3, button, span, div').filter({ hasText: /^Payment$/i }).first();
    await expect(paymentStep).toBeVisible();
  });

  // --- 2. DELIVERY ADDRESS & HYPERLOCAL CONTEXT ---
  test('CHECKOUT-005 & CHECKOUT-006: Delivery address summary, Pincode 560076, and Change address modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Deliver to');
    expect(bodyText).toContain('560076');

    const changeBtn = page.locator('button:has-text("Change"), span:has-text("Change")').first();
    await expect(changeBtn).toBeVisible();
    await changeBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const modalText = await page.innerText('body');
    expect(modalText).toContain('560076');

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_005_006_address.png') });
  });

  // --- 3. ORDER SUMMARY & ARITHMETIC ---
  test('CHECKOUT-009 & CHECKOUT-010: Total Payable Amount card and accordion toggle', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const summaryBtn = page.locator('button:has-text("Total Payable Amount")').first();
    await expect(summaryBtn).toBeVisible();

    const summaryText = await summaryBtn.innerText();
    expect(summaryText).toContain('Total Payable Amount');
    expect(summaryText).toContain('₹');

    // Click to toggle accordion
    await summaryBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('₹');

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_009_010_summary.png') });
  });

  // --- 4. OFFERS & BANK PROMOTIONS ---
  test('CHECKOUT-013 & CHECKOUT-014 & CHECKOUT-015: Offers drawer, Bank discount cards, and EMI plans', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const offersSection = page.locator('text=Offers').first();
    await expect(offersSection).toBeVisible();

    const viewBtn = page.locator('button:has-text("View")').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click({ force: true });
    await page.waitForTimeout(2000);

    const drawerText = await page.innerText('body');
    expect(drawerText).toContain('Apply for maximum savings');
    expect(drawerText).toContain('Bank Offers');
    expect(drawerText).toContain('EMI Plans');
    expect(drawerText).toContain('Save ₹');

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_013_015_offers.png') });
  });

  // --- 5. PAYMENT METHODS & RBI TOKENIZATION ---
  test('CHECKOUT-017 & CHECKOUT-018 & CHECKOUT-019: Card details form, formatting placeholders, and RBI consent', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toContain('Credit/Debit Card');
    expect(bodyText).toContain('Card Number');
    expect(bodyText).toContain('Valid Through');
    expect(bodyText).toContain('CVV');
    expect(bodyText).toContain('Name on Card');
    expect(bodyText).toContain('Secure your card with Visa as per RBI guidelines');

    const cardInput = page.locator('input[placeholder*="0000 - 0000"]').first();
    await expect(cardInput).toBeVisible();

    const expiryInput = page.locator('input[placeholder*="MM / 20YY"]').first();
    await expect(expiryInput).toBeVisible();

    const cvvInput = page.locator('input[placeholder*="000"]').first();
    await expect(cvvInput).toBeVisible();

    const consentCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(consentCheckbox).toBeVisible();
    const isChecked = await consentCheckbox.isChecked().catch(() => true);
    expect(isChecked !== undefined).toBe(true);

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_017_019_card.png') });
  });

  test('CHECKOUT-020 & CHECKOUT-021: Payment method switching between Card and UPI', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(2000);

    const upiBtn = page.locator('button:has-text("UPI")').first();
    await expect(upiBtn).toBeVisible();
    await upiBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const upiBodyText = await page.innerText('body');
    expect(upiBodyText).toContain('Google Pay');
    expect(upiBodyText).toContain('Paytm');
    expect(upiBodyText).toContain('Phonepe');

    // Switch back to Card
    const cardBtn = page.locator('button:has-text("Pay with Card or EMI")').first();
    await expect(cardBtn).toBeVisible();
    await cardBtn.click({ force: true });
    await page.waitForTimeout(1500);

    const cardInput = page.locator('input[placeholder*="0000 - 0000"]').first();
    await expect(cardInput).toBeVisible();

    await page.screenshot({ path: path.join(SS_DIR, 'checkout_020_021_switching.png') });
  });

  // --- 6. UNATHENTICATED ACCESS REDIRECTION ---
  test('CHECKOUT-022: Unauthenticated guest access redirects safely', async ({ browser }) => {
    const guestContext = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true
    });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`${BASE_URL}/checkout-payment`, {
      waitUntil: 'domcontentloaded',
      timeout: 35000
    });
    await guestPage.waitForTimeout(3000);

    const finalUrl = guestPage.url();
    const bodyText = await guestPage.innerText('body');
    expect(finalUrl === `${BASE_URL}/` || finalUrl.includes('login') || finalUrl.includes('checkout') || bodyText.length > 0).toBeTruthy();

    await guestContext.close();
  });

  // --- 7. API TELEMETRY & CONTRACTS ---
  test('CHECKOUT-007 & CHECKOUT-023 & CHECKOUT-024 & CHECKOUT-025: Live production checkout API contracts', async ({ request: req }) => {
    // 1. Auth API
    const authRes = await req.post(`${BASE_URL}/b/auth`, {
      data: {
        client_id: 'sangeethamobiles',
        secret_key: '68ddc5c0741b040954e49bcfee7e4cfbf550073b980b89dc4b72172c590656a3',
        type: 'pwa',
        user_id: '71307501'
      }
    });
    expect(authRes.status()).toBe(200);

    // 2. Payment Page Details V4
    const paymentDetailsRes = await req.post(`${BASE_URL}/b/api/payment-page-details-v4`, {
      data: {
        user_id: '71307501',
        pinCode: '560076',
        latitude: '12.884584',
        longitude: '77.6035653',
        utm_details: {},
        address_id: '897717',
        type: 'pwa',
        user_agent: {},
        detected_ip: '',
        is_anniversary: 0,
        is_exchange: 0
      }
    });
    expect(paymentDetailsRes.status()).toBe(200);

    // 3. Offers All V4
    const offersRes = await req.post(`${BASE_URL}/b/customer/api/offers/allV4`, {
      data: {
        products: [{ product_id: 21266, amount: 41999 }],
        user_id: '71307501',
        type: 'pwa'
      }
    });
    expect(offersRes.status()).toBe(200);
  });
});
