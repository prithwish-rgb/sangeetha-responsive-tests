import { test } from '@playwright/test';

// ONE-TIME SETUP SCRIPT — run this manually whenever the saved session
// expires or doesn't exist yet. It opens a real, visible browser, pauses
// so YOU can log in by hand (enter your number, receive the OTP on your
// phone, type it in), then saves the resulting logged-in session to a
// file. All other test files can then load that file and start already
// authenticated — no OTP automation needed at all.
//
// Run with: npx playwright test tests/setup-auth.spec.ts --headed --project=chromium
test('one-time manual login — saves session for reuse', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes — gives you plenty of time to log in by hand

  await page.goto('https://www.sangeethamobiles.com');
  console.log('\n>>> Browser is open. Manually log in now (enter number, then OTP).');
  console.log('>>> Once you see yourself logged in, come back to this terminal and press Resume in the Playwright Inspector window that will appear.\n');

  // this pauses test execution and opens the Playwright Inspector —
  // you interact with the browser normally, then click "Resume" when done
  await page.pause();

  // after you resume, save the logged-in session to disk
  await page.context().storageState({ path: 'auth-state.json' });
  console.log('\n>>> Session saved to auth-state.json. Future tests can now reuse this login.\n');
});