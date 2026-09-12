import { test, expect, devices } from '@playwright/test';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: undefined, // FRESH INCOGNITO SESSION (no cookies / no localStorage)
});

test.describe('Pincode & Location Persistence Verification (Fresh Incognito Mobile)', () => {
  test.setTimeout(180000);

  test('Execute 10-Step Incognito Verification Pass', async ({ page, context }) => {
    const stepLogs: Record<string, any> = {};
    const capturedApiRequests: Array<{ step: string; url: string; status: number; queryParams: string }> = [];

    // Listener for API requests
    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('placeholder/product/list') || url.includes('filter/sort-by')) {
        capturedApiRequests.push({
          step: page.url(),
          url,
          status: resp.status(),
          queryParams: new URL(url).search,
        });
        console.log(`[Captured API] ${url}`);
      }
    });

    fs.mkdirSync('screenshots/pincode-verify', { recursive: true });

    // STEP 1 & 2: Open Fresh Incognito Session & Navigate to Staging Home
    console.log('[STEP 1 & 2] Opening fresh incognito session and navigating to home...');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/pincode-verify/step2-home.png' });

    const step2Cookies = await context.cookies();
    const step2LocalStorage = await page.evaluate(() => ({ ...localStorage }));
    stepLogs.step1_2 = {
      navigatedUrl: page.url(),
      title: await page.title(),
      initialCookiesCount: step2Cookies.length,
      initialCookies: step2Cookies,
      initialLocalStorageKeys: Object.keys(step2LocalStorage),
    };

    // STEP 3: Confirm if "Enter Your Location" bottom sheet modal appears
    console.log('[STEP 3] Checking if Location modal appears on load...');
    const locationModal = page.locator('text="Enter Your Location"');
    const modalVisibleOnLoad = await locationModal.isVisible({ timeout: 4000 }).catch(() => false);
    await page.screenshot({ path: 'screenshots/pincode-verify/step3-modal.png' });

    stepLogs.step3 = {
      locationModalVisibleOnLoad: modalVisibleOnLoad,
    };

    // STEP 4: Click "Type Manually", enter 560078, submit
    console.log('[STEP 4] Entering pincode 560078...');
    let modalClosed = false;
    let pageReloaded = false;

    if (modalVisibleOnLoad) {
      const typeManuallyBtn = page.locator('button:has-text("Type Manually"), button:has-text("Type manually"), div:has-text("Type Manually")').first();
      if (await typeManuallyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeManuallyBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      const input = page.locator('input[placeholder*="pincode" i], input[placeholder*="location" i], input[type="text"], input[type="number"]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill('');
        await input.type(PINCODE, { delay: 100 });
        await page.waitForTimeout(500);

        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Apply"), button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click().catch(() => {});
        } else {
          await input.press('Enter').catch(() => {});
        }

        await page.waitForTimeout(3000);
        modalClosed = !(await locationModal.isVisible().catch(() => false));
      }
    }
    await page.screenshot({ path: 'screenshots/pincode-verify/step4-after-submit.png' });

    stepLogs.step4 = {
      pincodeEntered: PINCODE,
      modalClosed,
    };

    // STEP 5: Record Cookies & LocalStorage key/values after pincode submit
    console.log('[STEP 5] Inspecting Cookies & LocalStorage post-submit...');
    const postSubmitCookies = await context.cookies();
    const postSubmitLocalStorage = await page.evaluate(() => ({ ...localStorage }));

    stepLogs.step5 = {
      modalClosed,
      cookiesCount: postSubmitCookies.length,
      cookies: postSubmitCookies.map(c => ({ name: c.name, value: c.value, domain: c.domain, path: c.path })),
      localStorageKeys: Object.keys(postSubmitLocalStorage),
      localStorageValues: postSubmitLocalStorage,
    };

    // STEP 6 & 7: Navigate directly to Smartphones Category PLP
    console.log('[STEP 6 & 7] Navigating directly to Smartphones category...');
    const smartphonesUrl = new URL('/product-list/category-smartphones-308', STAGING_URL).toString();
    
    // Clear captured requests array before nav
    const smartphonesApiIndexStart = capturedApiRequests.length;

    await page.goto(smartphonesUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: 'screenshots/pincode-verify/step7-smartphones-plp.png' });

    const modalReappearedOnSmartphones = await locationModal.isVisible({ timeout: 2000 }).catch(() => false);
    const productCardsSmartphones = page.locator('a[href*="/product-details/"], div[class*="product-card"], div[class*="ProductCard"], div[class*="card"]');
    const cardCountSmartphones = await productCardsSmartphones.count();

    stepLogs.step6_7 = {
      urlTested: smartphonesUrl,
      locationModalReappeared: modalReappearedOnSmartphones,
      productCardCount: cardCountSmartphones,
      bodyTextSnippet: (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\s+/g, ' '),
    };

    // STEP 8: Inspect DevTools Network tab for placeholder/product/list & filter/sort-by
    const smartphonesApiCalls = capturedApiRequests.slice(smartphonesApiIndexStart);
    stepLogs.step8 = {
      capturedApiCallsCount: smartphonesApiCalls.length,
      calls: smartphonesApiCalls.map(c => ({
        url: c.url,
        queryParams: c.queryParams,
        pinCodeValueInUrl: new URL(c.url).searchParams.get('pinCode') || new URL(c.url).searchParams.get('pincode') || 'MISSING/EMPTY',
      })),
    };

    // STEP 9: Hard Refresh (Ctrl+Shift+R / reload) on Smartphones category page
    console.log('[STEP 9] Performing hard reload on Smartphones PLP...');
    const refreshApiIndexStart = capturedApiRequests.length;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: 'screenshots/pincode-verify/step9-after-reload.png' });

    const postReloadCookies = await context.cookies();
    const postReloadLocalStorage = await page.evaluate(() => ({ ...localStorage }));
    const reloadApiCalls = capturedApiRequests.slice(refreshApiIndexStart);

    stepLogs.step9 = {
      postReloadCookiesCount: postReloadCookies.length,
      postReloadLocalStorageKeys: Object.keys(postReloadLocalStorage),
      capturedReloadApiCallsCount: reloadApiCalls.length,
      reloadCalls: reloadApiCalls.map(c => ({
        url: c.url,
        queryParams: c.queryParams,
        pinCodeValueInUrl: new URL(c.url).searchParams.get('pinCode') || new URL(c.url).searchParams.get('pincode') || 'MISSING/EMPTY',
      })),
    };

    // STEP 10: Repeat steps 6–8 for Smart Watches Category
    console.log('[STEP 10] Navigating directly to Smart Watches category...');
    const smartwatchesUrl = new URL('/product-list/category-smart-watches-31', STAGING_URL).toString();
    const watchesApiIndexStart = capturedApiRequests.length;

    await page.goto(smartwatchesUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: 'screenshots/pincode-verify/step10-smartwatches-plp.png' });

    const modalReappearedOnWatches = await locationModal.isVisible({ timeout: 2000 }).catch(() => false);
    const productCardsWatches = page.locator('a[href*="/product-details/"], div[class*="product-card"], div[class*="ProductCard"], div[class*="card"]');
    const cardCountWatches = await productCardsWatches.count();
    const watchesApiCalls = capturedApiRequests.slice(watchesApiIndexStart);

    stepLogs.step10 = {
      urlTested: smartwatchesUrl,
      locationModalReappeared: modalReappearedOnWatches,
      productCardCount: cardCountWatches,
      bodyTextSnippet: (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\s+/g, ' '),
      capturedWatchesApiCallsCount: watchesApiCalls.length,
      calls: watchesApiCalls.map(c => ({
        url: c.url,
        queryParams: c.queryParams,
        pinCodeValueInUrl: new URL(c.url).searchParams.get('pinCode') || new URL(c.url).searchParams.get('pincode') || 'MISSING/EMPTY',
      })),
    };

    // Save master verification report
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/pincode-incognito-verification.json', JSON.stringify(stepLogs, null, 2));

    console.log('\n================ INCOGNITO VERIFICATION REPORT ================');
    console.log(JSON.stringify(stepLogs, null, 2));
  });
});
