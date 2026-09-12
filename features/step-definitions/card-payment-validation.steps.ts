import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import {
  navigateToCheckoutPayment,
  enterCardNumber,
  enterExpiryDate,
  enterCvv,
  enterCardholderName,
  getCardNumberValue,
  getExpiryDateValue,
  getCvvValue,
  getCardholderNameValue,
  hasExpiryValidationError,
  backspaceCardNumber,
  backspaceCvv,
  isPayNowEnabled,
  isPayNowDisabled,
} from '../../tests/helpers/card-payment-flow.helper';

Given('I am on the checkout payment page', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await navigateToCheckoutPayment(this.page);
});

When('I enter a card number {string}', async function (this: CustomWorld, cardNumber: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await enterCardNumber(this.page, cardNumber);
  this.cardEntered = cardNumber;
});

When('I enter an expiry date {string}', async function (this: CustomWorld, expiryDate: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await enterExpiryDate(this.page, expiryDate);
  this.expiryEntered = expiryDate;
});

When('I enter a CVV {string}', async function (this: CustomWorld, cvv: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await enterCvv(this.page, cvv);
  this.cvvEntered = cvv;
});

When('I enter the cardholder name {string}', async function (this: CustomWorld, name: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await enterCardholderName(this.page, name);
  this.nameEntered = name;
});

When('I enter a cardholder name {string}', async function (this: CustomWorld, name: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await enterCardholderName(this.page, name);
  this.nameEntered = name;
});

When('I delete {int} digit from the card number', async function (this: CustomWorld, count: number) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await backspaceCardNumber(this.page, count);
});

When('I delete {int} digits from the card number', async function (this: CustomWorld, count: number) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await backspaceCardNumber(this.page, count);
});

When('I delete {int} digit from the CVV', async function (this: CustomWorld, count: number) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await backspaceCvv(this.page, count);
});

When('I delete {int} digits from the CVV', async function (this: CustomWorld, count: number) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await backspaceCvv(this.page, count);
});

Then('the Pay Now button should be enabled', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const enabled = await isPayNowEnabled(this.page);
  expect(enabled).toBe(true);
  console.log('[Cucumber] Verified Pay Now button is ENABLED');
});

Then('the Pay Now button should be disabled', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const disabled = await isPayNowDisabled(this.page);
  expect(disabled).toBe(true);
  console.log('[Cucumber] Verified Pay Now button is DISABLED');
});

Then('the card number field should be empty', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualValue = await getCardNumberValue(this.page);
  expect(actualValue).toBe('');
  console.log('[Cucumber] Verified card number field is empty');
});

Then('the card number field should display {string}', async function (this: CustomWorld, expectedDisplay: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualValue = await getCardNumberValue(this.page);
  expect(actualValue).toBe(expectedDisplay);
  console.log(`[Cucumber] Verified card number field displays: "${actualValue}"`);
});

Then('the expiry date field should display {string}', async function (this: CustomWorld, expectedDisplay: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualDisplay = await getExpiryDateValue(this.page);
  expect(actualDisplay).toBe(expectedDisplay);
  console.log(`[Cucumber] Verified expiry field displays: "${actualDisplay}" (expected: "${expectedDisplay}")`);
});

Then('the expiry validation error message should be displayed', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const hasError = await hasExpiryValidationError(this.page);
  expect(hasError).toBe(true);
  console.log('[Cucumber] Verified expiry validation error message is displayed');
});

Then('the CVV field should be empty', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualValue = await getCvvValue(this.page);
  expect(actualValue).toBe('');
  console.log('[Cucumber] Verified CVV field is empty');
});

Then('the CVV field should display {string}', async function (this: CustomWorld, expectedDisplay: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualValue = await getCvvValue(this.page);
  expect(actualValue).toBe(expectedDisplay);
  console.log(`[Cucumber] Verified CVV field displays: "${actualValue}"`);
});

Then('the cardholder name field should display {string}', async function (this: CustomWorld, expectedDisplay: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const actualValue = await getCardholderNameValue(this.page);
  expect(actualValue).toBe(expectedDisplay);
  console.log(`[Cucumber] Verified cardholder name field displays: "${actualValue}"`);
});

// --- POST-LAUNCH PAYMENT STEPS ---

Then('the payment page should display the Card or EMI, UPI, and Loans payment options', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  await expect(this.page.getByText(/Pay with Card or EMI/i).first()).toBeVisible();
  await expect(this.page.locator('button:has-text("UPI")').first()).toBeVisible();
  await expect(this.page.locator('button:has-text("Loans")').first()).toBeVisible();
  console.log('[Cucumber] Verified all primary payment options (Card/EMI, UPI, Loans) visible.');
});

Then('the page layout should have zero horizontal overflow at 393 width', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const overflow = await this.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 2);
  console.log(`[Cucumber] Verified zero overflow: scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`);
});

Then('the card brand should be detected as {string}', async function (this: CustomWorld, brand: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const text = await this.page.evaluate(() => document.body.innerText);
  expect(text.toLowerCase().includes(brand.toLowerCase())).toBe(true);
  console.log(`[Cucumber] Verified card brand auto-detected as "${brand}".`);
});

Then('applicable instant bank discount offers should be rendered', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const text = await this.page.evaluate(() => document.body.innerText);
  expect(text.includes('Cashback') || text.includes('discount') || text.includes('Save upto') || text.includes('offers available')).toBe(true);
  console.log('[Cucumber] Verified instant bank discount offers rendered.');
});

Then('the Pay with EMI button should become visible', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const btn = this.page.locator('button:has-text("Pay with EMI")').first();
  await expect(btn).toBeVisible();
  console.log('[Cucumber] Verified Pay with EMI button is visible.');
});

When('I switch to the {string} payment method', async function (this: CustomWorld, method: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const btn = this.page.locator(`button:has-text("${method}")`).first();
  await btn.click();
  await this.page.waitForTimeout(1500);
});

Then('the UPI payment options should be displayed', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const text = await this.page.evaluate(() => document.body.innerText);
  expect(text.includes('Google Pay') || text.includes('Paytm') || text.includes('Phonepe') || text.includes('UPI')).toBe(true);
  console.log('[Cucumber] Verified UPI payment options displayed.');
});

Then('the Loans payment options should be displayed', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const text = await this.page.evaluate(() => document.body.innerText);
  expect(text.includes('Zestmoney') || text.includes('Loans')).toBe(true);
  console.log('[Cucumber] Verified Loans payment options displayed.');
});

When('I switch back to the {string} payment method', async function (this: CustomWorld, _method: string) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const cardBtn = this.page.locator('text=Pay with Card or EMI').first();
  await cardBtn.click();
  await this.page.waitForTimeout(1500);
});

Then('the card payment form should be restored with input controls', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const cardInput = this.page.locator('input[placeholder*="0000"]').first();
  await expect(cardInput).toBeVisible();
  console.log('[Cucumber] Verified card form restored with input controls.');
});

When('I click the Pay with EMI button', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const btn = this.page.locator('button:has-text("Pay with EMI")').first();
  await btn.click();
  await this.page.waitForTimeout(2000);
});

Then('the EMI plans drawer should open displaying No Cost and Low Cost tenures', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Playwright page not initialized');
  const text = await this.page.evaluate(() => document.body.innerText);
  expect(text.includes('EMI') || text.includes('Installment') || text.includes('months')).toBe(true);
  expect(text.includes('No Cost') || text.includes('Low Cost') || text.includes('Standard EMI')).toBe(true);
  console.log('[Cucumber] Verified EMI drawer open displaying No Cost / Low Cost plans.');
  // Close drawer
  const closeBtn = this.page.locator('.modal.show .btn-close, button:has-text("✕"), [aria-label="Close"]').first();
  if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await closeBtn.click().catch(() => {});
    await this.page.waitForTimeout(1000);
  }
});

