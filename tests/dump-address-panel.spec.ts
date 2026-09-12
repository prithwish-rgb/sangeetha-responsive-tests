import { test, devices, Page } from '@playwright/test';
import * as fs from 'fs';

// Uses the same session/viewport as pdp-clickability.spec.ts so we land on
// the exact same "no saved address" account/flow that test is exercising.
test.use({
    ...devices['Pixel 7'],
    storageState: 'auth.json',
});

const PRODUCT_URL = 'https://www.sangeethamobiles.com/product-details/oppo-a6c-4g-4gb-64gb-stone-brown-a6c-4g-4gb-64gb-sb/20723';

async function dismissBlockingPopups(page: Page) {
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(300);
    const closeSelectors = [
        '.close_freq_bout_tog',
        '.location-header-popup .close', '.location-header-popup .btn-close',
        '.modal.show .close', '.modal.show .btn-close',
        '[data-dismiss="modal"]', '[data-bs-dismiss="modal"]',
    ];
    for (const sel of closeSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible().catch(() => false)) {
            await btn.click({ timeout: 2000 }).catch(() => { });
            await page.waitForTimeout(300);
        }
    }
}

// Run with:
//   npx playwright test tests/dump-address-panel.spec.ts --project=chromium-logged-in --headed
//
// Walks PDP -> Buy Now -> Proceed and dumps whatever panel/modal appears
// right after, so real "Add New Address" field selectors can be captured
// instead of guessed from a screen-recording.
test('dump the Add New Address panel HTML', async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await dismissBlockingPopups(page);

    const buyNowBtn = page.getByRole('button', { name: /buy now/i }).first();
    await buyNowBtn.click();
    await page.waitForTimeout(1500);

    const addedToCartDrawerHeading = page.locator('.frq_cart__info h4:has-text("Added to cart")').first();
    const drawerVisible = await addedToCartDrawerHeading.isVisible({ timeout: 8000 }).catch(() => false);
    console.log('Added to cart drawer visible:', drawerVisible);

    const proceedBtn = page.locator('button:has-text("Proceed to checkout"), button:has-text("Proceed to Buy")').first();
    const proceedVisible = await proceedBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Proceed button visible:', proceedVisible);

    if (proceedVisible) {
        await proceedBtn.click();
    }

    // Give whatever panel/modal appears next time to fully render
    await page.waitForTimeout(2500);

    const html = await page.content();
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
    fs.writeFileSync('scratch/address-panel-dump.html', html, 'utf-8');

    console.log('URL after clicking Proceed:', page.url());
    console.log('Dumped full page HTML to scratch/address-panel-dump.html');

    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('\n--- First 800 chars of visible page text ---');
    console.log(bodyText.slice(0, 800));

    // Also try to isolate just the modal/panel area specifically, in case the
    // full-page dump is too large to work with easily
    const modalOrPanel = page.locator('.modal.show, .offcanvas.show, *:has-text("Add New Address")').first();
    const modalHtml = await modalOrPanel.evaluate((el) => el.outerHTML).catch(() => null);
    if (modalHtml) {
        fs.writeFileSync('scratch/address-panel-modal-only.html', modalHtml, 'utf-8');
        console.log('Also dumped isolated modal/panel HTML to scratch/address-panel-modal-only.html');
    } else {
        console.log('Could not isolate a modal/panel element specifically — check the full page dump.');
    }
});
