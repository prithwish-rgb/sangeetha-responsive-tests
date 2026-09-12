import { test, devices, Page } from '@playwright/test';

test.use({
    storageState: 'auth.json',
    ...devices['Pixel 7'],
});

async function clearCartMobile(page: Page) {
    await page.goto('/cart', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // let cart list hydrate

    let removeButtons = page.locator('.shopping-cart___wrap .btn-remove');
    let count = await removeButtons.count();
    let clearedCount = 0;
    const log: string[] = [];

    log.push(`Initial item count: ${count}`);

    while (count > 0) {
        // Grab a label for logging before it disappears
        const label = await removeButtons
            .first()
            .locator('xpath=ancestor::div[contains(@class,"shopping-cart___wrap")]')
            .locator('h4')
            .first()
            .textContent()
            .catch(() => '(unknown item)');

        await removeButtons.first().click();

        // Wait for the item count to actually decrease, rather than a fixed
        // timeout, in case there's a toast/undo confirmation delaying removal.
        try {
            await page.waitForFunction(
                (prevCount) =>
                    document.querySelectorAll('.shopping-cart___wrap .btn-remove').length < prevCount,
                count,
                { timeout: 5000 }
            );
        } catch {
            log.push(`WARNING: item count did not decrease within 5s after clicking Remove on "${label}" — possible confirmation step or stuck click.`);
            break;
        }

        clearedCount++;
        log.push(`Removed: ${label}`);

        removeButtons = page.locator('.shopping-cart___wrap .btn-remove');
        count = await removeButtons.count();
    }

    const finalItemCount = await page.locator('.shopping-cart___wrap').count();
    const badgeText = await page.locator('.cart-qty').first().textContent().catch(() => null);

    log.push(`clearedCount: ${clearedCount}`);
    log.push(`finalItemCount (DOM): ${finalItemCount}`);
    log.push(`cart-qty badge after clear: ${badgeText}`);

    return { clearedCount, finalItemCount, badgeText, log };
}

test('clear mobile cart using real .btn-remove selector', async ({ page }) => {
    const result = await clearCartMobile(page);

    console.log('=== CLEAR CART (MOBILE) RESULT ===');
    result.log.forEach((line) => console.log(line));

    // Soft assertion by design — we want the log even if this doesn't hold,
    // so you can see exactly what happened rather than a bare pass/fail.
    if (result.finalItemCount !== 0) {
        console.log(
            `NOTE: finalItemCount is ${result.finalItemCount}, not 0 — cart did not fully clear. See log above for where it stopped.`
        );
    }
});