import { Page } from '@playwright/test';
import { dismissBlockingPopups } from './popup.helper';

// CONFIRMED against a live /cart page dump on 2026-08-13 (desktop, chromium-logged-in).
// Desktop structure: each item is a `.card_radius__blockPb-3.bg-white.mb-0` card containing
// `.shopping-cart__btn` with two buttons — the FIRST is Remove (class `btn-remove`),
// the SECOND is Save For Later (same shared classes, no `btn-remove`).
//
// CONFIRMED separately against a live mobile-emulated (Pixel 7) /cart dump the same day:
// mobile wraps each item in `.shopping-cart___wrap` instead of the desktop card class,
// but the Remove button itself is the SAME `button.btn-remove` in both layouts — only the
// item-container selector differs. Previous mobile clearCart() runs silently reported
// "cart already empty" / finalItemCount: 0 while the header badge showed real items,
// because CART_ITEM_CARD only matched the desktop container and never found anything to
// iterate on mobile. This was a selector gap, not an actual empty-cart or app bug.
//
// NOTE: the "My Cart (N)" heading (`.order__summary__h2 span`) does NOT reliably
// reflect actual item count — a live cart with 7 items rendered showed "(1)" in that
// heading, and a separate mobile session showed a header badge of "5" while the DOM
// briefly had only 1 item card. Do not use the heading/badge count to verify cart
// state; always count actual item container elements.
//
// CONFIRMED 2026-08-14: the page renders react-loading-skeleton placeholders for
// item cards before real content hydrates in. Code that runs before that swap sees
// skeleton markup (no btn-remove class, generic placeholder buttons) and misreads
// it as "no Remove button found" even though a real item is present underneath.
// A fixed setTimeout can't reliably outlast this since hydration time varies run
// to run — poll for skeletons to clear instead.

const CART_ITEM_CARD_DESKTOP = '.card_radius__blockPb-3.bg-white.mb-0';
const CART_ITEM_CARD_MOBILE = '.shopping-cart___wrap';
const REMOVE_BUTTON = 'button.btn-remove';
const EMPTY_CART_TEXT = ':text("cart is empty"), :text("Your cart is empty"), :text("no items in your cart")';
const SKELETON_SELECTOR = '.react-loading-skeleton';

/**
 * Waits until no react-loading-skeleton placeholders remain on the page (or
 * the timeout elapses), instead of trusting a single fixed delay after goto.
 * Polls on a short interval since hydration time varies run to run.
 */
async function waitForCartHydration(page: Page, timeoutMs = 10_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const skeletonCount = await page.locator(SKELETON_SELECTOR).count().catch(() => 0);
        if (skeletonCount === 0) return;
        await page.waitForTimeout(250);
    }
    console.log(`[clear-cart] waitForCartHydration timed out after ${timeoutMs}ms — skeletons may still be present.`);
}

// IMPORTANT: on desktop, .shopping-cart___wrap is NESTED INSIDE
// .card_radius__blockPb-3.bg-white.mb-0 for every item (confirmed via a live
// /cart dump on 2026-08-14) — it is not a separate mobile-only layout as
// originally assumed. A naive `"${DESKTOP}, ${MOBILE}"` combined CSS selector
// therefore matches BOTH the outer card and its inner wrapper for every
// single item on desktop, roughly doubling .count(). Resolve to exactly one
// selector per page instead of unioning them.
async function resolveCartItemSelector(page: Page): Promise<string> {
    const desktopCount = await page.locator(CART_ITEM_CARD_DESKTOP).count().catch(() => 0);
    const mobileCount = await page.locator(CART_ITEM_CARD_MOBILE).count().catch(() => 0);
    console.log(`[clear-cart] selector probe — desktop matches: ${desktopCount}, mobile matches: ${mobileCount}`);
    if (desktopCount > 0) return CART_ITEM_CARD_DESKTOP;
    return CART_ITEM_CARD_MOBILE;
}

export interface ClearCartResult {
    clearedCount: number;
    finalItemCount: number;
    success: boolean;
}

/**
 * Navigates to /cart and removes every item, so tests that depend on a
 * known starting cart state (e.g. badge-count assertions) aren't polluted
 * by items left over from previous runs on this shared, reused account.
 * Works on both desktop and mobile-emulated layouts — see selector notes above.
 */
export async function clearCart(page: Page, timeoutMs = 15_000): Promise<ClearCartResult> {
    const base = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';
    await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });
    await waitForCartHydration(page);
    await dismissBlockingPopups(page).catch(() => { });

    const emptyIndicator = page.locator(EMPTY_CART_TEXT).first();
    if (await emptyIndicator.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('[clear-cart] cart already empty.');
        return { clearedCount: 0, finalItemCount: 0, success: true };
    }

    const itemSelector = await resolveCartItemSelector(page);
    console.log(`[clear-cart] using item selector: ${itemSelector}`);

    let clearedCount = 0;
    const maxIterations = 20; // safety cap

    for (let i = 0; i < maxIterations; i++) {
        const itemCards = page.locator(itemSelector);
        const countBefore = await itemCards.count().catch(() => 0);
        if (countBefore === 0) break;

        // Re-check hydration each iteration — removing an item can trigger a
        // re-render that briefly reintroduces skeleton placeholders for the
        // remaining cards.
        await waitForCartHydration(page);

        const removeBtn = itemCards.first().locator(REMOVE_BUTTON).first();
        const removeVisible = await removeBtn.isVisible({ timeout: 2000 }).catch(() => false);
        if (!removeVisible) {
            console.log(`[clear-cart] item card present but no Remove button found on iteration ${i} — stopping.`);
            try {
                const fs = require('fs');
                fs.mkdirSync('scratch', { recursive: true });
                const matchedHtml = await itemCards.first().evaluate((el: Element) => el.outerHTML).catch(() => '(could not read outerHTML)');
                fs.writeFileSync('scratch/clear-cart-no-remove-btn-match.html', matchedHtml);
                console.log(`[clear-cart] wrote scratch/clear-cart-no-remove-btn-match.html (selector used: ${itemSelector}) for diagnosis.`);
            } catch (e) {
                console.log(`[clear-cart] failed to write diagnostic dump: ${e}`);
            }
            break;
        }

        await removeBtn.click().catch(() => { });

        // Poll instead of a fixed wait — the click registers and the nav
        // cart-count badge updates quickly, but the item card itself lags
        // behind (confirmed via a live run: badge dropped to the new count
        // while the DOM still showed the old card list). A short fixed
        // wait was reading the count before the card actually left the DOM.
        const removalWaitStart = Date.now();
        let countAfter = countBefore;
        while (Date.now() - removalWaitStart < 5000) {
            countAfter = await itemCards.count().catch(() => countBefore);
            if (countAfter < countBefore) break;
            await page.waitForTimeout(200);
        }

        // Confirm the card count actually decreased before counting it as removed —
        // a click that didn't register shouldn't be counted as a successful clear.
        if (countAfter < countBefore) {
            clearedCount++;
        } else {
            console.log(`[clear-cart] Remove click on iteration ${i} did not reduce item count (${countBefore} -> ${countAfter}) — stopping to avoid an infinite loop.`);
            break;
        }
    }

    const finalItemCount = await page.locator(itemSelector).count().catch(() => -1);
    console.log(`[clear-cart] removed ${clearedCount} item(s), ${finalItemCount} item(s) remain.`);

    return { clearedCount, finalItemCount, success: finalItemCount === 0 };
}

/** Returns true only if the cart is confirmed empty (0 item cards, not relying on the heading count). */
export async function isCartEmpty(page: Page): Promise<boolean> {
    const base = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';
    await page.goto(`${base}/cart`, { waitUntil: 'domcontentloaded' });
    await waitForCartHydration(page);
    const itemSelector = await resolveCartItemSelector(page);
    const count = await page.locator(itemSelector).count().catch(() => -1);
    return count === 0;
}

export { CART_ITEM_CARD_DESKTOP, CART_ITEM_CARD_MOBILE, REMOVE_BUTTON, waitForCartHydration };