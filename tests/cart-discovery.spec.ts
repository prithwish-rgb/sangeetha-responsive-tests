import { test, Page } from '@playwright/test';

// same helper used everywhere else in the suite — forgot to include it
// in this diagnostic script, which is why test 1 timed out: the
// delivery-location popup was almost certainly blocking the click.
async function dismissBlockingPopups(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  const closeSelectors = [
    '.location-header-popup .close', '.location-header-popup .btn-close',
    '.modal.show .close', '.modal.show .btn-close',
    '[data-dismiss="modal"]', '[data-bs-dismiss="modal"]',
  ];
  for (const sel of closeSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  const stillBlocked = await page.locator('.modal.show').first().isVisible().catch(() => false);
  if (stillBlocked) {
    await page.evaluate(() => {
      document.querySelectorAll('.modal.show').forEach(el => el.remove());
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });
  }
}

test('discover the real cart URL and page structure (logged in, desktop)', async ({ page }) => {
  await page.goto('https://www.sangeethamobiles.com');
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page); // <-- this was missing, likely the actual cause of the timeout

  const cartIcon = page.locator('.nav_navbar_links a.login-dropdown[href="#"]').nth(1); // adjust index if needed
  await cartIcon.click();
  await page.waitForTimeout(2000);

  console.log('URL after clicking cart icon (desktop):', page.url());
  console.log('Page wrapper class found:', await page.locator('#total-page-wapper').getAttribute('class').catch(() => 'NOT FOUND'));

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('First 300 chars of visible page text:', bodyText.slice(0, 300));
});

test('discover cart behavior under MOBILE emulation (logged in)', async ({ browser }) => {
  // separate mobile context — tests whether the mobile template really
  // differs from desktop, using the same logged-in session
  const context = await browser.newContext({
    storageState: 'auth-state.json',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  await page.goto('https://www.sangeethamobiles.com');
  await page.waitForTimeout(1500);

  console.log('Page wrapper class found (mobile):', await page.locator('#total-page-wapper').getAttribute('class').catch(() => 'NOT FOUND'));

  // on mobile, the cart icon may be in a different location (bottom nav,
  // hamburger menu, etc.) — log what's actually clickable
  const allIconLinks = await page.locator('a[role="button"], button[aria-label]').all();
  console.log(`Found ${allIconLinks.length} icon-like clickable elements on mobile homepage`);

  await context.close();
});