import { test } from '@playwright/test';

// ONE-TIME SETUP — logs you into the STAGING site specifically.
// Run: npx playwright test tests/setup-auth-staging.spec.ts --headed --project=chromium
//
// Steps:
// 1. Browser opens staging homepage
// 2. Manually tap/click the user icon → Log In → enter phone number → OTP
// 3. Once you see yourself logged in, come back and press Resume in the Inspector
// 4. Session saved to auth-staging-fresh.json — reused by Module 5 tests

test('one-time manual login on STAGING — saves staging session', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes

  await page.goto('https://smpl-new.bangalore2.com/', { waitUntil: 'commit' });
  await page.waitForTimeout(2000);

  console.log('\n>>> Browser opened on STAGING: https://smpl-new.bangalore2.com/');
  console.log('>>> Log in now: tap the user/profile icon, enter your phone number, enter the OTP.');
  console.log('>>> Once you see yourself logged in, come back here and press Resume.\n');

  await page.pause(); // Opens Playwright Inspector — click Resume when done

  // Save the logged-in session
  await page.context().storageState({ path: 'auth-staging-fresh.json' });

  // Verify: check that userAuthTokenData is in localStorage
  const hasToken = await page.evaluate(() => !!localStorage.getItem('userAuthTokenData'));
  console.log(`\n>>> Session saved to auth-staging-fresh.json`);
  console.log(`>>> Auth token in localStorage: ${hasToken}`);
  console.log(`>>> You can now re-run Module 5: npx playwright test tests/module5-cart-checkout-mobile.spec.ts --project=chromium\n`);
});
