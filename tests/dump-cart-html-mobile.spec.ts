import { test, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://www.sangeethamobiles.com';

// NOTE: your playwright.config.ts only defines storageState: 'auth-state.json'
// for the 'chromium-logged-in' project. The mobile session with cart-qty: 5
// was on 'auth.json' — a different file. Run `ls *.json` in your project root
// to confirm both exist and are actually different sessions before trusting
// this. If they turn out to be the same session under two filenames, or if
// 'auth.json' doesn't exist, swap the line below to 'auth-state.json'.
test.use({
    storageState: 'auth.json',
    ...devices['Pixel 7'],
});

test('dump cart page HTML on mobile (Pixel 7 emulation)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });

    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });

    // Give any client-side cart hydration a moment to finish
    await page.waitForTimeout(1500);

    fs.mkdirSync('scratch', { recursive: true });

    // 1. Full page dump
    const fullHtml = await page.content();
    fs.writeFileSync(
        path.join('scratch', 'mobile-cart-full-dump.html'),
        fullHtml
    );

    // 2. Try to isolate just the cart item list / container, since that's
    //    almost certainly the piece that differs from the desktop dump.
    //    Try a few likely selectors — adjust once you see what's actually there.
    const candidateSelectors = [
        '[class*="cart-item"]',
        '[class*="cart-list"]',
        '[class*="CartItem"]',
        '[data-testid*="cart"]',
        'main',
    ];

    let isolatedHtml = '';
    let matchedSelector = '';
    for (const sel of candidateSelectors) {
        const count = await page.locator(sel).count();
        if (count > 0) {
            isolatedHtml = await page.locator(sel).first().evaluate((el) => el.outerHTML);
            matchedSelector = sel;
            break;
        }
    }

    if (isolatedHtml) {
        fs.writeFileSync(
            path.join('scratch', 'mobile-cart-isolated.html'),
            `<!-- matched selector: ${matchedSelector} -->\n${isolatedHtml}`
        );
    }

    // 3. Read the visible badge count directly, so we can compare it against
    //    whatever clearCart() thinks the count is.
    const badgeText = await page
        .locator('.cart-qty')
        .first()
        .textContent()
        .catch(() => null);

    console.log('=== MOBILE CART DUMP ===');
    console.log('cart-qty badge text:', badgeText);
    console.log('matched isolation selector:', matchedSelector || '(none matched — check full dump)');
    console.log('full dump: scratch/mobile-cart-full-dump.html');
    console.log('isolated dump: scratch/mobile-cart-isolated.html');
    console.log('=== JS/CONSOLE ERRORS ===');
    console.log(errors.length ? errors.join('\n') : '(none)');
});