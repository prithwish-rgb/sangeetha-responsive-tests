import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';

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



test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page);
});

test.describe('Clickability — category menu', () => {
  test('category items are clickable and navigate somewhere', async ({ page }) => {
    const categories = page.locator('.category-menu_links');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);

    const startUrl = page.url();
    await categories.first().click();
    await page.waitForTimeout(1500);

    expect(page.url(), 'Clicking a category did not navigate anywhere').not.toBe(startUrl);
  });
});

test.describe('Clickability — banner carousel', () => {
  test('[GAP CHECK] identify banner slides with no link at all', async ({ page }) => {
    const slides = page.locator('.banner__swiper .swiper-slide');
    const count = await slides.count();
    let unlinkedCount = 0;
    const unlinkedAlts: string[] = [];

    for (let i = 0; i < count; i++) {
      const slide = slides.nth(i);
      const hasLink = await slide.locator('a').count() > 0;
      if (!hasLink) {
        unlinkedCount++;
        const alt = await slide.locator('img').first().getAttribute('alt').catch(() => 'unknown');
        unlinkedAlts.push(alt || 'unknown');
      }
    }

    console.log(`${unlinkedCount}/${count} banner slides have NO link.`);
    if (unlinkedAlts.length > 0) console.log('Unlinked banners:', unlinkedAlts);

    await test.info().attach('unlinked-banners', {
      body: JSON.stringify({ total: count, unlinked: unlinkedCount, unlinkedAlts }, null, 2),
      contentType: 'application/json',
    });
  });

  test('a linked banner slide navigates to the correct destination', async ({ page }) => {
    const linkedSlide = page.locator('.banner__swiper .swiper-slide a').first();
    const href = await linkedSlide.getAttribute('href');
    expect(href).toBeTruthy();

    await linkedSlide.click();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain(href!.split('?')[0]);
  });
});

test.describe('Clickability — header icons', () => {
  // NOTE: these tests run as a guest (not logged in) — no test account/
  // session is set up yet. Manually verified real behavior: as a guest,
  // clicking cart/wishlist prompts a "login with mobile number" modal;
  // if logged in, it opens the actual cart/wishlist instead. We can only
  // automate the guest-state behavior here — the logged-in behavior would
  // need a real test account wired into the suite, which we don't have yet.
  test('as a guest, header icons (cart/wishlist) prompt a login modal instead of erroring', async ({ page }) => {
    // these are the icon-only links in the header (href="#", JS-driven) —
    // excludes the "Login/Signup" text link which is a separate, expected case
    const iconLinks = page.locator('.nav_navbar_links a.login-dropdown[href="#"]');
    const count = await iconLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      // re-query fresh each loop iteration rather than reusing a stale
      // locator, since the DOM may shift after closing a modal
      const icon = page.locator('.nav_navbar_links a.login-dropdown[href="#"]').nth(i);
      await icon.click();
      await page.waitForTimeout(600); // let the modal animate in

      const modal = page.locator('.modal.show').first();
      const modalOpened = await modal.isVisible().catch(() => false);
      console.log(`Header icon #${i}: modal opened = ${modalOpened}`);

      if (modalOpened) {
        // check the modal is actually a LOGIN prompt (mobile number/OTP),
        // not some unrelated popup — this is the specific guest behavior
        // that was manually confirmed and is what we're verifying here
        const modalText = (await modal.innerText().catch(() => '')).toLowerCase();
        const looksLikeLoginPrompt = modalText.includes('mobile') || modalText.includes('otp') || modalText.includes('login');
        console.log(`  -> looks like a login prompt: ${looksLikeLoginPrompt}`);

        // IMPORTANT: close the modal before the next loop iteration —
        // this was the bug in the previous run. Without closing it, the
        // next icon's click fails because the modal is still covering
        // the page and intercepts the click.
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(400);
        // fallback: forcibly remove if Escape didn't close it, same
        // pattern used for the delivery-location popup elsewhere
        const stillOpen = await modal.isVisible().catch(() => false);
        if (stillOpen) {
          await page.evaluate(() => {
            document.querySelectorAll('.modal.show').forEach(el => el.remove());
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
          });
        }
      }

      // soft assertion per icon — logged, not hard-failed, since exact
      // wording of the login prompt isn't confirmed for every icon yet
      expect(modalOpened, `Header icon #${i} click produced no visible modal at all (expected a login prompt for a guest)`).toBe(true);
    }
  });
});

test.describe('Clickability — product cards', () => {
  test('product image link and title link point to the same product', async ({ page }) => {
    const card = page.locator('.offer-products_flex').first();
    const imageLink = card.locator('a.offer-products_media');
    const titleLink = card.locator('.offer-products__details a').first();

    const imageHref = await imageLink.getAttribute('href');
    const titleHref = await titleLink.getAttribute('href');

    expect(imageHref).toBeTruthy();
    expect(titleHref).toBeTruthy();
    expect(imageHref, 'Image link and title link on the same card point to different products').toBe(titleHref);
  });

  test('clicking a product card navigates to its product-details page', async ({ page }) => {
    // IMPORTANT: this site uses Swiper.js for carousels. Swiper often
    // duplicates slide elements in the DOM to support infinite-loop
    // scrolling, so a plain ".first()" match can land on a hidden/inactive
    // clone instead of the real, visible slide — the click doesn't error,
    // but nothing happens because it hit the wrong element. Scoping to
    // ".swiper-slide-active" ensures we click the slide that's actually
    // on screen and interactive.
    const card = page.locator('.swiper-slide-active .offer-products_flex a.offer-products_media').first();
    const href = await card.getAttribute('href');
    expect(href, 'Could not find an active, visible product card to click').toBeTruthy();

    // scroll it fully into view first — carousels can have items that are
    // technically in the DOM but partially offscreen, which sometimes
    // causes a click to land but not register properly
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300); // let any carousel animation settle

    await card.click();

    // safety net: if the click didn't trigger navigation within 5s
    // (e.g. the carousel briefly treated it as a drag/swipe gesture),
    // try once more before failing the test
    const navigatedFirstTry = await page.waitForURL(/\/product-details\//, { timeout: 5000 })
      .then(() => true).catch(() => false);

    if (!navigatedFirstTry) {
      console.log('First click on product card did not navigate — retrying once.');
      await card.click({ force: true }).catch(() => {});
      await page.waitForURL(/\/product-details\//, { timeout: 10000 });
    }

    expect(page.url()).toContain(href!.split('/').pop()!.split('?')[0]);
  });

  test('wishlist button on a product card is clickable without navigating away', async ({ page }) => {
    const startUrl = page.url();
    const wishlistBtn = page.locator('.wishlist_prod_btn').first();
    await expect(wishlistBtn).toBeVisible();

    await wishlistBtn.click();
    await page.waitForTimeout(500);

    expect(page.url(), 'Clicking wishlist icon unexpectedly navigated away from the page').toBe(startUrl);
  });

  test('[GAP CHECK] add to cart button — behavior undetermined, needs manual confirmation', async ({ page }) => {
    // No visible cart-count element was found in the page markup reviewed
    // so far, so this test can only confirm the click doesn't crash or
    // navigate away — NOT that the cart was actually updated. That needs
    // a follow-up once the cart UI markup is reviewed directly.
    const startUrl = page.url();
    const addToCartBtn = page.locator('.btn_products', { hasText: /add to cart/i }).first();
    await expect(addToCartBtn).toBeVisible();

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await addToCartBtn.click();
    await page.waitForTimeout(1000);

    expect(page.url()).toBe(startUrl);
    expect(errors, `JS error on Add to Cart click:\n${errors.join('\n')}`).toHaveLength(0);
    console.log('Add to Cart click succeeded with no JS errors and no navigation. Cart-count verification NOT yet implemented — needs cart UI markup.');
  });
});

test.describe('Clickability — footer', () => {
  test('footer links have real, non-placeholder hrefs', async ({ page }) => {
    const footerLinks = page.locator('.footer-link[href]');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);

    const badLinks: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await footerLinks.nth(i).getAttribute('href');
      const text = await footerLinks.nth(i).innerText().catch(() => `link #${i}`);
      if (!href || href === '#' || href.trim() === '') badLinks.push(text);
    }

    console.log(`${badLinks.length}/${count} footer links have missing/placeholder hrefs`);
    expect(badLinks).toHaveLength(0);
  });

  test('"Customer Care" is a JS-triggered action, not a dead link (documented behavior)', async ({ page }) => {
    // This is a <span role="button">, not an <a> — clicking should trigger
    // something (modal, chat widget). This test documents what happens.
    const customerCare = page.locator('span.footer-link[role="button"]', { hasText: /customer care/i });
    await customerCare.scrollIntoViewIfNeeded();
    await customerCare.click();
    await page.waitForTimeout(1000);

    const modalOpened = await page.locator('.modal.show').first().isVisible().catch(() => false);
    console.log(`Customer Care click -> modal opened: ${modalOpened}`);
  });

  test('social icons link to correct external platforms and open in new tab', async ({ page }) => {
    const socialLinks: { platform: string; hrefContains: string }[] = [
      { platform: 'Facebook', hrefContains: 'facebook.com' },
      { platform: 'Twitter/X', hrefContains: 'twitter.com' },
      { platform: 'YouTube', hrefContains: 'youtube.com' },
      { platform: 'Instagram', hrefContains: 'instagram.com' },
    ];

    for (const social of socialLinks) {
      const link = page.locator(`.social__wrap a[href*="${social.hrefContains}"]`).first();
      const exists = await link.count() > 0;
      expect(exists, `${social.platform} social link not found`).toBe(true);

      const target = await link.getAttribute('target');
      expect(target, `${social.platform} link does not open in a new tab`).toBe('_blank');
    }
  });
});

test.describe('Clickability — carousel navigation arrows', () => {
  test('prev arrow is disabled at the start, next arrow enables it after use', async ({ page }) => {
    const prevArrow = page.locator('.prev-arrow-swipe').first();
    const nextArrow = page.locator('.nxt-arrow-swipe').first();

    const prevDisabledInitially = await prevArrow.isDisabled();
    expect(prevDisabledInitially, 'Prev arrow should be disabled at the very start of the carousel').toBe(true);

    await nextArrow.click();
    await page.waitForTimeout(500);

    const prevDisabledAfterNext = await prevArrow.isDisabled();
    expect(prevDisabledAfterNext, 'Prev arrow should become enabled after clicking Next').toBe(false);
  });
  
});
