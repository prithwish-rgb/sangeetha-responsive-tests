import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';

export async function navigateToSangeethaHome(page: Page): Promise<void> {
  console.log(`[Cucumber] Navigating to ${BASE_URL} ...`);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

export async function handleCookiePromptIfPresent(page: Page): Promise<void> {
  const cookieAcceptBtn = page.locator('.modal.show button:has-text("Accept"), button:has-text("Accept")').first();
  if (await cookieAcceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[Cucumber] Cookie prompt detected. Clicking Accept...');
    await cookieAcceptBtn.click();
    await page.waitForTimeout(1000);
  } else {
    console.log('[Cucumber] No cookie prompt detected.');
  }
}

export async function openLocationFlowAndTypeManually(page: Page): Promise<void> {
  const typeManuallyBtn = page.locator('button:has-text("Type manually"), button:has-text("Type Manually")').first();
  const isTypeManuallyVisible = await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false);

  if (!isTypeManuallyVisible) {
    console.log('[Cucumber] Location modal not open on load. Clicking header location trigger...');
    const locationTrigger = page.locator('.mega_menu_location, button:has-text("Select Location"), [class*="location" i]').first();
    if (await locationTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locationTrigger.click();
      await page.waitForTimeout(1000);
    }
  }

  if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[Cucumber] Clicking "Type manually"...');
    await typeManuallyBtn.click();
    await page.waitForTimeout(1000);
  }
}

export async function enterPincode(page: Page, pincode: string): Promise<void> {
  const pincodeInput = page.locator('input[placeholder*="Enter Pincode" i], input[placeholder*="pincode" i], input[type="number"]').first();
  await pincodeInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log(`[Cucumber] Entering pincode ${pincode}...`);
  await pincodeInput.fill(pincode);
  await page.waitForTimeout(500);
}

export async function clickCheckAndTriggerETA(page: Page): Promise<{ status: number; body: any }> {
  console.log('[Cucumber] Setting up response listener and clicking "Check"...');
  const etaResponsePromise = page.waitForResponse(
    response => response.url().includes('/b/pims/data-model/pincode-eta-check') && response.request().method() === 'POST',
    { timeout: 15000 }
  );

  const checkBtn = page.locator('button:has-text("Check"), button.btn-check-custom').first();
  await checkBtn.waitFor({ state: 'visible', timeout: 5000 });
  await checkBtn.click();

  const etaResponse = await etaResponsePromise;
  const status = etaResponse.status();
  const body = await etaResponse.json();
  console.log(`[Cucumber] Received ETA response: Status ${status}, Body: ${JSON.stringify(body)}`);
  return { status, body };
}
