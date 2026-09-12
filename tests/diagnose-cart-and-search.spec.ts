import { test, devices } from '@playwright/test';
import fs from 'fs';
import { getClickableResults } from './hyperlocal/helpers/search.helper';

test.use({
    ...devices['Desktop Chrome'],
    storageState: 'auth-state.json',
});

test('DIAGNOSE: cart card markup + iPhone 17 search results', async ({ page }) => {
    fs.mkdirSync('scratch', { recursive: true });

    // ---------- Part 1: real cart card markup on this account ----------
    await page.goto('https://www.sangeethamobiles.com/cart', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const CART_ITEM_CARD_DESKTOP = '.card_radius__blockPb-3.bg-white.mb-0';
    const card = page.locator(CART_ITEM_CARD_DESKTOP).first();
    const cardCount = await page.locator(CART_ITEM_CARD_DESKTOP).count();
    console.log(`[diagnose] cart item cards found: ${cardCount}`);

    if (cardCount > 0) {
        const cardHtml = await card.evaluate((el) => el.outerHTML);
        fs.writeFileSync('scratch/cart-card-outerhtml.html', cardHtml);
        console.log('[diagnose] wrote scratch/cart-card-outerhtml.html');

        // Also check the card's PARENT, in case Remove is a sibling of the card
        // rather than a child of it (the pattern we already saw on mobile).
        const parentHtml = await card.evaluate((el) => el.parentElement?.outerHTML ?? '(no parent)');
        fs.writeFileSync('scratch/cart-card-parent-outerhtml.html', parentHtml);
        console.log('[diagnose] wrote scratch/cart-card-parent-outerhtml.html');

        const removeBtnCount = await page.locator('button.btn-remove').count();
        console.log(`[diagnose] button.btn-remove count anywhere on page: ${removeBtnCount}`);
    }

    // ---------- Part 2: what iPhone 17 variants actually exist ----------
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input.search__home').first();
    await searchInput.click().catch(() => { });
    await searchInput.fill('').catch(() => { });
    await searchInput.pressSequentially('iPhone 17', { delay: 40 }).catch(() => { });
    await page.waitForTimeout(2000);

    const results = getClickableResults(page);
    const count = await results.count();
    console.log(`[diagnose] "iPhone 17" search — ${count} results found:`);

    const texts: string[] = [];
    for (let i = 0; i < Math.min(count, 15); i++) {
        const text = (await results.nth(i).innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
        texts.push(text);
        console.log(`  [${i}] "${text}"`);
    }

    fs.writeFileSync('scratch/iphone17-search-results.json', JSON.stringify(texts, null, 2));
    console.log('[diagnose] wrote scratch/iphone17-search-results.json');
});