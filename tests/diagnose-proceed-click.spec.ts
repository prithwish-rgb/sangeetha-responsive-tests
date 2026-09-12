import { test, devices, Page } from '@playwright/test';
import * as fs from 'fs';

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

test('diagnose Proceed to Buy click with JS error capture', async ({ page }) => {
    const jsErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('pageerror', (err) => jsErrors.push(err.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
        failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });
    page.on('response', (res) => {
        if (res.url().includes('/cart') && res.request().method() !== 'GET') {
            console.log(`[network] ${res.request().method()} ${res.url()} -> ${res.status()}`);
        }
    });

    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await dismissBlockingPopups(page);

    const buyNowBtn = page.getByRole('button', { name: /buy now/i }).first();
    await buyNowBtn.click();
    await page.waitForTimeout(1500);

    const proceedBtn = page.locator('button:has-text("Proceed to checkout"), button:has-text("Proceed to Buy")').first();
    const proceedVisible = await proceedBtn.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Proceed button visible:', proceedVisible);

    if (proceedVisible) {
        await proceedBtn.scrollIntoViewIfNeeded().catch(() => { });
        const box = await proceedBtn.boundingBox().catch(() => null);
        const enabled = await proceedBtn.isEnabled().catch(() => null);
        console.log('Proceed button boundingBox:', JSON.stringify(box), 'enabled:', enabled);

        const urlBeforeClick = page.url();
        await proceedBtn.click({ timeout: 5000 }).catch((e) => console.log('Click threw:', e.message));

        // Wait longer this time, and poll for ANY change every 500ms up to 6s
        for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(500);
            const currentUrl = page.url();
            const modalCount = await page.locator('.modal.show, .offcanvas.show').count().catch(() => 0);
            if (currentUrl !== urlBeforeClick) {
                console.log(`[poll ${i}] URL changed to: ${currentUrl}`);
                break;
            }
            if (i === 11) {
                console.log(`[poll ${i}] No URL change after 6s. Modal/offcanvas count: ${modalCount}`);
            }
        }
    }

    console.log('\n=== JS ERRORS ===');
    console.log(jsErrors.length ? jsErrors.join('\n---\n') : '(none)');

    console.log('\n=== CONSOLE ERRORS ===');
    console.log(consoleErrors.length ? consoleErrors.join('\n---\n') : '(none)');

    console.log('\n=== FAILED REQUESTS ===');
    console.log(failedRequests.length ? failedRequests.join('\n') : '(none)');

    const html = await page.content();
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
    fs.writeFileSync('scratch/proceed-click-diagnostic.html', html, 'utf-8');
    console.log('\nDumped final page state to scratch/proceed-click-diagnostic.html');
});