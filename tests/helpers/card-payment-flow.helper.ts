import { Page, expect } from '@playwright/test';

export const CARD_INPUT = 'input[placeholder*="0000"], input[placeholder="XXXX XXXX XXXX XXXX"]';
export const EXPIRY_INPUT = 'input[placeholder*="MM"], input[placeholder="MM / YYYY"], input[placeholder="MM / 20YY"]';
export const CVV_INPUT = 'input[placeholder="000"]';
export const NAME_INPUT = 'input:not([placeholder*="0000"]):not([placeholder*="MM"]):not([placeholder="000"]):not([type="checkbox"]):not([type="radio"]):not([placeholder*="coupon" i]):not([placeholder*="search" i])';
export const PAY_NOW_BTN = 'button:has-text("Pay Now"), button.btn-place-order';
export const PAY_WITH_EMI_BTN = 'button:has-text("Pay with EMI")';
export const UPI_BTN = 'button:has-text("UPI")';
export const LOANS_BTN = 'button:has-text("Loans")';

const BASE_URL = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';

/**
 * Navigates directly to the checkout payment page and ensures the card payment form is hydrated.
 */
export async function navigateToCheckoutPayment(page: Page): Promise<void> {
  console.log(`[CardPaymentHelper] Navigating to ${BASE_URL}/checkout-payment ...`);
  await page.goto(`${BASE_URL}/checkout-payment`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(2000);

  // Handle cookie prompt if present
  const cookieAcceptBtn = page.locator('.modal.show button:has-text("Accept"), button:has-text("Accept")').first();
  if (await cookieAcceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieAcceptBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // If redirected to cart or empty, add item and proceed
  if (page.url().includes('/cart')) {
    console.log('[CardPaymentHelper] On cart page, checking proceed to buy...');
    const proceedBtn = page.locator('button:has-text("Proceed to Buy")').first();
    if (await proceedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await proceedBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  // Wait for card input to be ready
  const cardInputLoc = page.locator(CARD_INPUT).first();
  await cardInputLoc.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  console.log('[CardPaymentHelper] Checkout payment card form is ready.');
}

/**
 * Enters a card number by clearing and typing the digits sequentially.
 */
export async function enterCardNumber(page: Page, cardNumber: string): Promise<void> {
  const input = page.locator(CARD_INPUT).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.click();
  await input.fill('');
  const cleanDigits = cardNumber.replace(/\s+/g, '');
  if (cleanDigits.length > 0) {
    await input.pressSequentially(cleanDigits, { delay: 10 });
  }
  await page.waitForTimeout(300);
  console.log(`[CardPaymentHelper] Entered card number: "${cardNumber}"`);
}

/**
 * Enters an expiry date (e.g., "12 / 2028", "15 / 2028", "12 / 0000").
 */
export async function enterExpiryDate(page: Page, expiryDate: string): Promise<void> {
  const input = page.locator(EXPIRY_INPUT).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.click();
  await input.fill('');
  const cleanDigits = expiryDate.replace(/[^0-9]/g, '');
  if (cleanDigits.length > 0) {
    await input.pressSequentially(cleanDigits, { delay: 10 });
  }
  await page.waitForTimeout(300);
  console.log(`[CardPaymentHelper] Entered expiry: "${expiryDate}" (raw digits: "${cleanDigits}")`);
}

/**
 * Enters CVV digits.
 */
export async function enterCvv(page: Page, cvv: string): Promise<void> {
  const input = page.locator(CVV_INPUT).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.click();
  await input.fill('');
  if (cvv.length > 0) {
    await input.pressSequentially(cvv, { delay: 10 });
  }
  await page.waitForTimeout(300);
  console.log(`[CardPaymentHelper] Entered CVV: "${cvv}"`);
}

/**
 * Enters the cardholder name.
 */
export async function enterCardholderName(page: Page, name: string): Promise<void> {
  const input = page.locator(NAME_INPUT).first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.click();
    await input.fill('');
    if (name.length > 0) {
      await input.pressSequentially(name, { delay: 10 });
    }
    await page.waitForTimeout(300);
    console.log(`[CardPaymentHelper] Entered cardholder name: "${name}"`);
  }
}

/**
 * Reads the actual value displayed in the card number input field.
 */
export async function getCardNumberValue(page: Page): Promise<string> {
  const input = page.locator(CARD_INPUT).first();
  return (await input.inputValue()).trim();
}

/**
 * Reads the actual value displayed in the expiry date input field.
 */
export async function getExpiryDateValue(page: Page): Promise<string> {
  const input = page.locator(EXPIRY_INPUT).first();
  return (await input.inputValue()).trim();
}

/**
 * Reads the actual value displayed in the CVV input field.
 */
export async function getCvvValue(page: Page): Promise<string> {
  const input = page.locator(CVV_INPUT).first();
  return (await input.inputValue()).trim();
}

/**
 * Reads the actual value displayed in the Cardholder Name input field.
 */
export async function getCardholderNameValue(page: Page): Promise<string> {
  const input = page.locator(NAME_INPUT).first();
  return (await input.inputValue()).trim();
}

/**
 * Checks whether the expiry validation error message is displayed.
 */
export async function hasExpiryValidationError(page: Page): Promise<boolean> {
  const msgLocator = page.locator('text=Enter valid Month, text=Invalid, .err-msg');
  return await msgLocator.first().isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Simulates pressing backspace on the card number field.
 */
export async function backspaceCardNumber(page: Page, count = 1): Promise<void> {
  const input = page.locator(CARD_INPUT).first();
  await input.click();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
  }
}

/**
 * Simulates pressing backspace on the CVV field.
 */
export async function backspaceCvv(page: Page, count = 1): Promise<void> {
  const input = page.locator(CVV_INPUT).first();
  await input.click();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
  }
}

/**
 * Returns true if the Pay Now button is enabled or rendered.
 */
export async function isPayNowEnabled(page: Page): Promise<boolean> {
  const btn = page.locator(PAY_NOW_BTN).first();
  const isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
  if (!isVisible) return false;
  return await btn.isEnabled();
}

/**
 * Returns true if the Pay Now button is disabled or not present.
 */
export async function isPayNowDisabled(page: Page): Promise<boolean> {
  const btn = page.locator(PAY_NOW_BTN).first();
  const isVisible = await btn.isVisible({ timeout: 1500 }).catch(() => false);
  if (!isVisible) return true;
  return await btn.isDisabled();
}
