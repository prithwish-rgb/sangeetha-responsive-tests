import { test } from '@playwright/test';
import { dismissBlockingPopups } from './hyperlocal/helpers/popup.helper';
import * as fs from 'fs';

// Run with:
//   npx playwright test tests/dump-cart-html.spec.ts --project=chromium-logged-in --headed
//
// Dumps the real /cart page HTML (the item-list page, not the payment step)
// to scratch/cart-page-dump.html so real Remove/quantity/line-item selectors
// can be captured instead of guessed.

test('dump real /cart page HTML', async ({ page }) => {
    await page.goto('https://www.sangeethamobiles.com/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissBlockingPopups(page).catch(() => { });

    // Give any lazy client-side rendering a moment to settle
    await page.waitForTimeout(1500);

    const html = await page.content();
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
    fs.writeFileSync('scratch/cart-page-dump.html', html, 'utf-8');

    console.log('URL:', page.url());
    console.log('Dumped full page HTML to scratch/cart-page-dump.html');

    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('\n--- First 500 chars of visible page text ---');
    console.log(bodyText.slice(0, 500));
});