import { test, devices } from '@playwright/test';
import fs from 'fs';
import { searchFor, waitForSearchResults, openResult } from './hyperlocal/helpers/search.helper';
import { applyPincodeAndReadEta } from './hyperlocal/helpers/pincode.helper';
import { clearCart, isCartEmpty, waitForCartHydration } from './hyperlocal/helpers/cart.helper';
import { resolveAddressStep } from './hyperlocal/helpers/address.helper';
import { dismissBlockingPopups } from './hyperlocal/helpers/popup.helper';

// SINGLE ENTRY POINT for the whole home -> checkout flow: give a product
// search term and a pincode, nothing else changes. Run e.g.:
//   $env:SEARCH_TERM="Samsung Galaxy A27"; $env:PINCODE="600001"; npx playwright test tests/explore-checkout-payment.spec.ts --project=chromium-logged-in --headed
const SEARCH_TERM = process.env.SEARCH_TERM || 'iPhone';
const PINCODE = process.env.PINCODE || '560078'; // this account's actual set delivery location, per cart page header
const BASE = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';
const HOME_URL = `${BASE}/`;

test.use({
    ...devices['Desktop Chrome'],
    storageState: 'auth-state.json', // logged-in account, per playwright.config.ts's chromium-logged-in project
});

test('EXPLORE: home -> search -> pdp -> pincode -> cart -> checkout -> payment', async ({ page }) => {
    const report: Record<string, any> = { stages: {}, variant: { searchTerm: SEARCH_TERM, pincode: PINCODE } };
    fs.mkdirSync('scratch', { recursive: true });

    // ---------- Setup (not a tracked stage): start from a known-clean cart ----------
    // Runs and returns to home before the numbered flow below begins, so a
    // leftover item from a prior run never shows up as part of "the flow".
    const clearResult = await clearCart(page);
    report.setup = { preClear: clearResult };
    console.log(`[setup] pre-clear: cleared=${clearResult.clearedCount}, remaining=${clearResult.finalItemCount}`);

    // ========== 1. HOME ==========
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
    await dismissBlockingPopups(page).catch(() => { });
    const homeReached = page.url() === HOME_URL;
    report.stages.home = { reached: homeReached, url: page.url() };
    console.log(`[1/7 home] reached=${homeReached}`);

    // ========== 2. SEARCH ==========
    const searchResult = await searchFor(page, SEARCH_TERM);
    const resultsState = await waitForSearchResults(page);
    report.stages.search = { term: SEARCH_TERM, ...searchResult, ...resultsState };
    console.log(`[2/7 search] gotResults=${searchResult.gotResults}`);

    // ========== 3. PDP ==========
    const openState = await openResult(page, 0, 15_000, SEARCH_TERM);
    report.stages.pdp = openState;
    console.log(`[3/7 pdp] navigated=${openState.navigated} url=${openState.pageUrl}`);

    if (!openState.navigated) {
        console.log('[explore] STOPPING — PDP not reached. See report below.');
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    // ========== 4. PINCODE ==========
    const etaResult = await applyPincodeAndReadEta(page, PINCODE);
    report.stages.pincode = etaResult;
    console.log(`[4/7 pincode] ${PINCODE} success=${etaResult.success} eta="${etaResult.rawEtaText}"`);

    // ========== 5. CART (add from PDP, then land on the cart page) ==========
    await dismissBlockingPopups(page).catch(() => { });
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    const addToCartVisible = await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (addToCartVisible) {
        await addToCartBtn.click({ timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1500);
    }
    fs.writeFileSync('scratch/after-add-to-cart-dump.html', await page.content());

    const cartEmptyAfterAdd = await isCartEmpty(page);

    await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
    // Was a fixed 1200ms timeout — replaced with a hydration poll. The page
    // renders skeleton placeholders before real buttons swap in, so a fixed
    // delay could catch the checkout trigger before it exists in real form.
    await waitForCartHydration(page);
    await dismissBlockingPopups(page).catch(() => { });

    report.stages.cart = {
        addToCartButtonVisible: addToCartVisible,
        cartEmptyAfterAdd, // expect false
        cartPageReached: page.url().includes('/cart'),
    };
    console.log(`[5/7 cart] addToCartButtonVisible=${addToCartVisible} cartEmptyAfterAdd=${cartEmptyAfterAdd} (expect false)`);

    // ========== 6. CHECKOUT ==========
    const checkoutTriggers = [
        'button:has-text("Proceed to Buy")',
        'button:has-text("Checkout")',
        'button:has-text("Proceed to Checkout")',
        'a:has-text("Proceed to Buy")',
    ];

    let checkoutClicked = false;
    let checkoutNavigated = false;
    for (const sel of checkoutTriggers) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`[6/7 checkout] clicking trigger: ${sel}`);
            await btn.click({ timeout: 5000 }).catch(() => { });
            checkoutClicked = true;
            break;
        }
    }

    if (checkoutClicked) {
        // "Proceed to Buy" triggers a client-side (SPA) route change to
        // /checkout-payment rather than a full page load — a flat timeout
        // can catch the DOM mid-transition. Wait for the URL itself instead.
        try {
            await page.waitForURL(/checkout-payment/, { timeout: 10_000 });
            checkoutNavigated = true;
        } catch {
            console.log('[6/7 checkout] URL never changed to /checkout-payment within 10s.');
        }
    }
    await page.waitForTimeout(1000);
    fs.writeFileSync('scratch/after-checkout-click-dump.html', await page.content());

    // NOTE: on this account no "Saved Address" modal / "Add New Address"
    // panel ever appears — checkout goes straight from cart to payment,
    // presumably because a default address is already set on the account.
    // modalHandled: "none" here is expected, not an error.
    const addressResult = await resolveAddressStep(page);

    report.stages.checkout = { triggerClicked: checkoutClicked, navigated: checkoutNavigated, address: addressResult };
    console.log(`[6/7 checkout] navigated=${checkoutNavigated} address=${JSON.stringify(addressResult)}`);

    // ========== 7. PAYMENT (read-only, nothing clicked) ==========
    // Wait for the payment section's skeleton placeholders to clear before
    // reading it — same hydration pattern as the cart page.
    const paymentSkeletonSelector = '.cart-payment__wrap .react-loading-skeleton';
    const paymentHydrationStart = Date.now();
    while (Date.now() - paymentHydrationStart < 10_000) {
        const remaining = await page.locator(paymentSkeletonSelector).count().catch(() => 0);
        if (remaining === 0) break;
        await page.waitForTimeout(250);
    }
    fs.writeFileSync('scratch/after-address-step-dump.html', await page.content());

    const paymentCandidates = [
        'text=/UPI/i',
        'text=/Credit Card|Debit Card/i',
        'text=/Cash on Delivery|COD/i',
        'text=/EMI/i',
        'text=/Net Banking/i',
        'text=/Wallet/i',
    ];

    const paymentMethodsObserved: string[] = [];
    for (const sel of paymentCandidates) {
        const loc = page.locator(sel).first();
        if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
            paymentMethodsObserved.push(sel);
        }
    }
    report.stages.payment = { methodsObserved: paymentMethodsObserved };
    console.log('[7/7 payment] === METHODS OBSERVED (read-only, nothing clicked) ===');
    console.log(paymentMethodsObserved.length ? paymentMethodsObserved.join(', ') : '(none matched — check scratch/after-address-step-dump.html)');

    console.log('\n=== FULL EXPLORATION REPORT (home -> search -> pdp -> pincode -> cart -> checkout -> payment) ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('\nDumps written to scratch/*.html at each stage boundary.');
});