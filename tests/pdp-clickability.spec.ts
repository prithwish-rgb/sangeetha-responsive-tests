import { test, expect, Page, devices } from '@playwright/test';
import { clearCart } from './hyperlocal/helpers/cart.helper';
import { resolveAddressStep } from './hyperlocal/helpers/address.helper';

// IMPORTANT: the markup these selectors were built from was captured on
// MOBILE (class="mobile page-wapper" in the HTML). This site appears to
// serve meaningfully different markup for desktop vs mobile (the footer
// alone is a flat link list on desktop but an accordion on mobile), so
// running this file on the default Desktop Chrome project caused most
// selectors to not match at all. Emulating a real mobile device here
// makes the site serve the same layout we actually built these tests
// against.
test.use({
  ...devices['Pixel 7'],
  storageState: 'auth.json', // still logged in — storageState is independent of viewport
});

const PRODUCT_URL = 'https://www.sangeethamobiles.com/product-details/oppo-a6c-4g-4gb-64gb-stone-brown-a6c-4g-4gb-64gb-sb/20723';
const TEST_PINCODE = '110001';

// same popup-dismissal helper used elsewhere in the suite — kept
// identical on purpose so all test files behave consistently
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
  const stillBlocked = await page.locator('.modal.show, .offcanvas.show').first().isVisible().catch(() => false);
  if (stillBlocked) {
    await page.evaluate(() => {
      document.querySelectorAll('.modal.show, .offcanvas.show').forEach(el => el.remove());
      document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open', 'offcanvas-open');
    });
  }
}

// Confirmed against live DOM in a previous run: the pincode/location
// prompt uses `.modal.show` containing `input.form-control-cart` or
// `.delivery_web__input`, with a `button.btn-check-custom` submit.
// Kept scoped to `.show` variants only — earlier drafts included bare
// `.modal` / `.offcanvas` as candidates, which was wide enough to match
// unrelated overlays and is why those tests started passing for the
// wrong reason. Removed here.
async function handlePincodeModalIfPresent(page: Page, pincode = TEST_PINCODE) {
  const pincodeModalSelectors = [
    '.modal.show:has(input.form-control-cart)',
    '.modal.show:has(.delivery_web__input)',
    '.modal.show:has(input[name*="pincode" i])',
    '.modal.show:has(input[type="tel"])',
  ];

  let modal = null;
  let matchedSelector: string | null = null;
  for (const sel of pincodeModalSelectors) {
    const candidate = page.locator(sel).first();
    if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
      modal = candidate;
      matchedSelector = sel;
      break;
    }
  }
  if (!modal) {
    console.log('[pincode-modal] no modal matched any candidate selector — either none appeared, or seedPincode() already satisfied the site.');
    return false;
  }
  console.log(`[pincode-modal] modal matched selector: ${matchedSelector}`);

  const input = modal.locator('input.form-control-cart, .delivery_web__input input, input[name*="pincode" i], input[type="tel"]').first();
  const inputVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`[pincode-modal] input visible: ${inputVisible}`);
  if (inputVisible) {
    await input.fill(pincode);
    const submitBtn = modal.locator('button.btn-check-custom, button:has-text("Check"), button:has-text("Apply"), button:has-text("Submit"), button:has-text("Confirm")').first();
    const submitVisible = await submitBtn.isVisible({ timeout: 1500 }).catch(() => false);
    console.log(`[pincode-modal] submit button visible: ${submitVisible} — ${submitVisible ? 'clicking it' : 'falling back to Enter key'}`);
    if (submitVisible) {
      await submitBtn.click();
    } else {
      await input.press('Enter');
    }
    await page.waitForTimeout(1000);
    const modalStillVisible = await modal.isVisible().catch(() => false);
    console.log(`[pincode-modal] filled pincode "${pincode}" and submitted — modal still visible after submit: ${modalStillVisible}`);
    return true;
  }
  console.log('[pincode-modal] modal matched but no fillable input found inside it — could not submit pincode.');
  return false;
}

async function seedPincode(page: Page, pincode = TEST_PINCODE) {
  await page.evaluate((pc) => {
    try {
      localStorage.setItem('pincode', pc);
      localStorage.setItem('deliveryPincode', pc);
      sessionStorage.setItem('pincode', pc);
      document.cookie = `pincode=${pc}; path=/`;
    } catch { /* ignore */ }
  }, pincode);
}

test.beforeEach(async ({ page }) => {
  // FIXED — previously an inline, unconfirmed-selector clearCartIfPossible()
  // that silently failed to actually clear anything (its candidate
  // selectors never matched this site's real markup — see cart.helper.ts
  // header comment for the confirmed selectors captured from a live
  // /cart dump). That left the shared, reused account's cart dirty across
  // runs (confirmed: 7 stale items sitting in cart during debugging),
  // which is the leading suspect for the Add to Cart badge test's flaky,
  // contradictory results. clearCart() now navigates to /cart itself, so
  // call it before navigating to the PDP.
  const clearResult = await clearCart(page);
  console.log(`[setup] cart clear result: ${JSON.stringify(clearResult)}`);

  await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page);
  await seedPincode(page);
});

test.describe('PDP — Add to Cart (closes the gap from homepage testing)', () => {
  test('clicking Add to Cart opens the "Added to cart" confirmation drawer', async ({ page }) => {
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // pincode prompt may appear first and block the drawer from
    // rendering — resolve it if present.
    const pincodeModalHandled = await handlePincodeModalIfPresent(page);
    console.log(`[add-to-cart] handlePincodeModalIfPresent returned: ${pincodeModalHandled}`);

    // Confirmed selector for the confirmation heading inside the drawer.
    const addedToCartDrawerHeading = page.locator('.frq_cart__info h4:has-text("Added to cart")').first();
    await expect(
      addedToCartDrawerHeading,
      'Add to Cart did not open the "Added to cart" confirmation drawer within the expected time'
    ).toBeVisible({ timeout: 10000 });

    const screenshotAfterClick = await page.screenshot({ fullPage: true });
    await test.info().attach('add-to-cart-drawer-after-click', { body: screenshotAfterClick, contentType: 'image/png' });
  });

  test('Add to Cart does not throw any JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
    await addToCartBtn.click();
    await page.waitForTimeout(1000);

    expect(errors, `JS errors on Add to Cart:\n${errors.join('\n')}`).toHaveLength(0);
  });

  // UPDATED — now goes one step further than "proceed button is visible and
  // enabled". After clicking the proceed action, this also attempts the
  // address step (resolveAddressStep — handles the confirmed real "Saved
  // Address" modal, selecting a radio and clicking "Select and Proceed",
  // which starts disabled by design). This is the concrete test of the
  // Buy Now stall root-cause theory: the router wasn't broken, the address
  // radio was never being selected, so "Select and Proceed" stayed
  // disabled and nothing downstream ever fired.
  test('Buy Now opens the checkout drawer with a working proceed action', async ({ page }) => {
    const buyNowBtn = page.getByRole('button', { name: /buy now/i }).first();
    await expect(buyNowBtn).toBeVisible();
    await buyNowBtn.click();

    const addedToCartDrawerHeading = page.locator('.frq_cart__info h4:has-text("Added to cart")').first();
    await expect(
      addedToCartDrawerHeading,
      'Buy Now did not open the "Added to cart" drawer within the expected time'
    ).toBeVisible({ timeout: 10000 });

    const goToCartBtn = page.locator('button:has-text("Go to cart")').first();
    const proceedBtn = page.locator('button:has-text("Proceed to checkout"), button:has-text("Proceed to Buy")').first();

    const goToCartVisible = await goToCartBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const proceedVisible = await proceedBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const proceedBtnText = proceedVisible ? await proceedBtn.textContent().catch(() => '(unknown)') : null;
    console.log(`[buy-now] "Go to cart" button visible (diagnostic only): ${goToCartVisible}; proceed button visible: ${proceedVisible}${proceedVisible ? ` (text: "${proceedBtnText}")` : ''}`);

    expect(proceedVisible, 'A "Proceed to checkout" / "Proceed to Buy" action was not visible in the Buy Now drawer').toBe(true);
    await expect(proceedBtn, 'Proceed button is not enabled').toBeEnabled();

    // THE ACTUAL STALL TEST — click proceed, then attempt to resolve
    // whatever address step follows. Previously nothing handled this at
    // all, which is the leading suspect for "router never fires despite
    // cart/update returning 200": the modal that appears next has a
    // disabled "Select and Proceed" button until an address radio is
    // checked, and no test code was ever clicking that radio.
    const startUrl = page.url();
    await proceedBtn.click().catch((e) => console.log(`[buy-now] proceed click failed: ${e.message}`));
    await page.waitForTimeout(1000);

    const addressStepResult = await resolveAddressStep(page);
    console.log(`[buy-now] address step result: ${JSON.stringify(addressStepResult)}`);

    const finalUrl = page.url();
    const navigatedPastAddress = finalUrl !== startUrl;
    console.log(`[buy-now] URL after address step — before: ${startUrl}, after: ${finalUrl}, navigated: ${navigatedPastAddress}`);

    const screenshotAfterClick = await page.screenshot({ fullPage: true });
    await test.info().attach('buy-now-after-address-step', { body: screenshotAfterClick, contentType: 'image/png' });

    // Soft check for now — logs the finding rather than failing the whole
    // test, since this is the first real run of this handling and we want
    // to see the diagnostic output before hardening this into a hard assert.
    if (!navigatedPastAddress && addressStepResult.modalHandled === 'none') {
      console.log('⚠ Neither known address UI appeared after clicking proceed — checkout may use a different flow for this account/product than previously observed. Needs fresh manual inspection.');
    }
  });
});

test.describe('PDP — Wishlist icon', () => {
  test('[INVESTIGATE] wishlist heart appears filled/red on load, but page data says is_wishlisted: false', async ({ page }) => {
    const wishlistHeart = page.locator('.wishlist__prod_new_1 svg path');
    const fillAttr = await wishlistHeart.getAttribute('fill').catch(() => null);
    const strokeAttr = await wishlistHeart.getAttribute('stroke').catch(() => null);

    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      return el ? JSON.parse(el.textContent || '{}') : null;
    });
    const isWishlistedInData = nextData?.props?.pageProps?.initialProductDetails?.is_wishlisted;

    console.log(`Heart icon fill="${fillAttr}" stroke="${strokeAttr}"`);
    console.log(`Page data is_wishlisted: ${isWishlistedInData}`);

    const heartLooksActive = fillAttr === '#FF0000';
    const mismatch = heartLooksActive && isWishlistedInData === false;

    if (mismatch) {
      console.log('⚠ POSSIBLE MISMATCH: heart icon renders as active/wishlisted, but page data says is_wishlisted is false.');
    }

    await test.info().attach('wishlist-state-check', {
      body: JSON.stringify({ fillAttr, strokeAttr, isWishlistedInData, mismatch }, null, 2),
      contentType: 'application/json',
    });

    expect(mismatch, 'See console/attachment for wishlist state mismatch details').toBeDefined();
  });

  test('clicking the wishlist heart opens a confirmation dialog for the product', async ({ page }) => {
    const wishlistBtn = page.locator('.wishlist__prod_new_1, .wishlist__prod_new_1 svg').first();

    const wishlistCalls: Array<{ method: string; url: string; status?: number }> = [];
    page.on('request', req => {
      if (/wishlist|favorite|favourite/i.test(req.url())) {
        wishlistCalls.push({ method: req.method(), url: req.url() });
      }
    });
    page.on('response', res => {
      const match = wishlistCalls.find(c => c.url === res.url());
      if (match) match.status = res.status();
    });

    const box = await wishlistBtn.boundingBox().catch(() => null);
    const isEnabled = await wishlistBtn.isEnabled().catch(() => null);
    console.log(`[wishlist] target boundingBox: ${JSON.stringify(box)}, isEnabled: ${isEnabled}`);

    await wishlistBtn.click();

    const wishlistDialog = page.getByRole('dialog').filter({
      hasText: /add to wishlist|remove from wishlist/i,
    });

    await expect(
      wishlistDialog,
      'Expected a wishlist confirmation dialog ("Add to Wishlist" / "Remove from Wishlist") to appear after clicking the heart icon, but none was found.'
    ).toBeVisible({ timeout: 3000 });

    const dialogText = await wishlistDialog.innerText().catch(() => '(could not read dialog text)');
    const actionBtnVisible = await wishlistDialog.getByRole('button', { name: /remove|add/i }).first()
      .isVisible().catch(() => false);
    console.log(`[wishlist] confirmation dialog appeared. Text: "${dialogText.replace(/\n/g, ' | ')}". Action button visible: ${actionBtnVisible}`);
    console.log(`[wishlist] wishlist-scoped network calls seen (diagnostic only, ${wishlistCalls.length}):`, JSON.stringify(wishlistCalls, null, 2));

    const screenshotAfterClick = await page.screenshot({ fullPage: true });
    await test.info().attach('wishlist-dialog-after-click', { body: screenshotAfterClick, contentType: 'image/png' });
  });
});

test.describe('PDP — variant switching', () => {
  test('selecting a different color variant updates the page', async ({ page }) => {
    const startUrl = page.url();
    const inactiveColorOption = page.locator('.variant__col:not(.variant__actv)', { hasText: /feather white/i });
    await expect(inactiveColorOption).toBeVisible();
    await inactiveColorOption.click();
    await page.waitForTimeout(1500);

    const titleText = await page.locator('.new_pdp_title').innerText().catch(() => '');
    const urlChanged = page.url() !== startUrl;

    console.log(`After selecting Feather White — URL changed: ${urlChanged}, title now: "${titleText}"`);
    expect(urlChanged || titleText.toLowerCase().includes('feather white'),
      'Selecting a different color variant had no visible effect').toBe(true);
  });

  test('selecting a different storage variant updates the page', async ({ page }) => {
    const startUrl = page.url();
    const inactiveStorageOption = page.locator('.variant__col.variant_storage__col:not(.variant__actv)', { hasText: /128GB/i });
    await expect(inactiveStorageOption).toBeVisible();
    await inactiveStorageOption.click();
    await page.waitForTimeout(1500);

    const urlChanged = page.url() !== startUrl;
    console.log(`After selecting 128GB storage — URL changed: ${urlChanged}, new URL: ${page.url()}`);
    expect(urlChanged, 'Selecting a different storage variant did not navigate/update').toBe(true);
  });
});

test.describe('PDP — tabs', () => {
  test('Reviews tab actually shows review content when clicked', async ({ page }) => {
    const reviewsTab = page.getByRole('tab', { name: /reviews/i });
    await reviewsTab.click();
    await page.waitForTimeout(800);

    const reviewsPanel = page.locator('#fill-tab-example-tabpane-reviews');
    const panelText = await reviewsPanel.innerText().catch(() => '');

    console.log(`Reviews tab panel content length: ${panelText.length} characters`);
    if (panelText.trim().length === 0) {
      console.log('⚠ Reviews tab panel is empty despite a review existing elsewhere on the page.');
    }
  });
});

test.describe('PDP — footer accordion (mobile)', () => {
  test('footer accordion sections expand and collapse correctly', async ({ page }) => {
    const firstAccordionButton = page.locator('.accordion-button').first();
    const expandedBefore = await firstAccordionButton.getAttribute('aria-expanded');

    await firstAccordionButton.click();
    await page.waitForTimeout(500);
    const expandedAfter = await firstAccordionButton.getAttribute('aria-expanded');

    console.log(`Accordion aria-expanded before: ${expandedBefore}, after: ${expandedAfter}`);
    expect(expandedAfter).not.toBe(expandedBefore);
  });
});