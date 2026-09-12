import { test, expect } from '@playwright/test';

test.describe('Postman POC: Pincode ETA Flow Verification', () => {
  test('real UI pincode entry triggers POST /b/pims/data-model/pincode-eta-check with 30 Minutes ETA', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Open the Sangeetha website
    console.log('[Step 1] Navigating to https://www.sangeethamobiles.com ...');
    await page.goto('https://www.sangeethamobiles.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 2. Handle the cookie prompt if present
    const cookieAcceptBtn = page.locator('.modal.show button:has-text("Accept"), button:has-text("Accept")').first();
    if (await cookieAcceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Step 2] Cookie prompt detected. Clicking Accept...');
      await cookieAcceptBtn.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('[Step 2] No cookie prompt detected.');
    }

    // 3. Open the location/pincode flow if not already open
    const typeManuallyBtn = page.locator('button:has-text("Type manually"), button:has-text("Type Manually")').first();
    const isTypeManuallyVisible = await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isTypeManuallyVisible) {
      console.log('[Step 3] Location modal not open on load. Clicking header location trigger...');
      const locationTrigger = page.locator('.mega_menu_location, button:has-text("Select Location"), [class*="location" i]').first();
      if (await locationTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await locationTrigger.click();
        await page.waitForTimeout(1000);
      }
    }

    // 4. Select "Type manually"
    if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Step 4] Clicking "Type manually"...');
      await typeManuallyBtn.click();
      await page.waitForTimeout(1000);
    }

    // 5. Enter 560078 in the pincode field
    const pincodeInput = page.locator('input[placeholder*="Enter Pincode" i], input[placeholder*="pincode" i], input[type="number"]').first();
    await expect(pincodeInput, 'Pincode input should be visible in modal').toBeVisible({ timeout: 5000 });
    console.log('[Step 5] Entering pincode 560078...');
    await pincodeInput.fill('560078');
    await page.waitForTimeout(500);

    // 6 & 7. Set up response listener for the pincode-eta-check API and apply pincode
    console.log('[Step 6 & 7] Setting up response listener and clicking "Check"...');
    const etaResponsePromise = page.waitForResponse(
      response => response.url().includes('/b/pims/data-model/pincode-eta-check') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Click "Check" button
    const checkBtn = page.locator('button:has-text("Check"), button.btn-check-custom').first();
    await expect(checkBtn, 'Check button should be visible').toBeVisible({ timeout: 5000 });
    await checkBtn.click();

    const etaResponse = await etaResponsePromise;
    const etaRequest = etaResponse.request();

    // 8. Explicit validations
    console.log('\n[Step 8] Validating network request & response:');

    // Method
    const method = etaRequest.method();
    console.log(`  -> Request Method: ${method}`);
    expect(method).toBe('POST');

    // URL
    const url = etaResponse.url();
    console.log(`  -> Request URL: ${url}`);
    expect(url).toBe('https://www.sangeethamobiles.com/b/pims/data-model/pincode-eta-check');

    // Request Payload
    const postDataRaw = etaRequest.postData();
    console.log(`  -> Request Payload: ${postDataRaw}`);
    expect(postDataRaw).toBeDefined();
    const postData = JSON.parse(postDataRaw || '{}');
    expect(postData.pinCode).toBe('560078');

    // Response Status
    const status = etaResponse.status();
    console.log(`  -> Response Status: ${status}`);
    expect(status).toBe(200);

    // Response Body
    const responseJson = await etaResponse.json();
    console.log(`  -> Response Body:`, JSON.stringify(responseJson));
    expect(responseJson.http_code).toBe(200);
    expect(responseJson.data).toBeDefined();
    expect(responseJson.data.header_eta).toBe('30 Minutes');

    console.log('\n✅ Phase 1 Verification Succeeded: Real UI flow successfully triggered and observed Pincode ETA API with expected payload and response!');
  });
});
