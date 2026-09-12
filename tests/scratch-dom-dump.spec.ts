import { test, expect } from '@playwright/test';

test('DOM Dump for Header, Cart, Chips, Banners, Footer', async ({ page }) => {
  await page.goto('https://smpl-new.bangalore2.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Dismiss location modal if open
  const modalClose = page.locator('button.btn-close, .modal .close, button:has-text("×"), button:has-text("Type Manually"), button:has-text("Type manually")').first();
  if (await modalClose.isVisible({ timeout: 3000 }).catch(() => false)) {
    await modalClose.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  console.log('=== CART ICON LOCATORS ===');
  const cartElements = await page.locator('a[href*="cart"], button[aria-label*="cart" i], div[class*="cart" i], span[class*="cart" i], .bottom-nav a, .floating-cart, svg[class*="cart" i], nav a, header a').all();
  console.log(`Found ${cartElements.length} candidate elements`);
  for (let i = 0; i < cartElements.length; i++) {
    const text = await cartElements[i].innerText().catch(() => '');
    const href = await cartElements[i].getAttribute('href').catch(() => null);
    const html = await cartElements[i].evaluate(el => el.outerHTML.slice(0, 200)).catch(() => '');
    const vis = await cartElements[i].isVisible().catch(() => false);
    if (href || text || html.includes('cart')) {
      console.log(`Element #${i}: vis=${vis}, href=${href}, text="${text.trim()}", html=${html}`);
    }
  }

  console.log('=== HERO BANNERS ===');
  const banners = await page.locator('div[class*="swiper"] a[href], div[class*="banner"] a[href], .hero a[href]').all();
  console.log(`Found ${banners.length} hero banners`);
  for (let i = 0; i < Math.min(banners.length, 10); i++) {
    const href = await banners[i].getAttribute('href').catch(() => null);
    const target = await banners[i].getAttribute('target').catch(() => null);
    const vis = await banners[i].isVisible().catch(() => false);
    console.log(`Banner #${i}: vis=${vis}, href=${href}, target=${target}`);
  }

  console.log('=== CATEGORY CHIPS ===');
  const chips = await page.locator('a[href*="product-list"], a[href*="category"], div[class*="category"] a').all();
  console.log(`Found ${chips.length} category chips`);
  for (let i = 0; i < chips.length; i++) {
    const text = await chips[i].innerText().catch(() => '');
    const href = await chips[i].getAttribute('href').catch(() => null);
    console.log(`Chip #${i}: href=${href}, text="${text.trim().replace(/\n/g, ' ')}"`);
  }

  // Scroll down incrementally to load lazy sections
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500);
  }

  console.log('=== ALL CHIPS & LINKS AFTER SCROLL ===');
  const allLinks = await page.locator('a[href]').all();
  console.log(`Found ${allLinks.length} total links on page`);
  for (let i = 0; i < allLinks.length; i++) {
    const text = await allLinks[i].innerText().catch(() => '');
    const href = await allLinks[i].getAttribute('href').catch(() => null);
    const target = await allLinks[i].getAttribute('target').catch(() => null);
    const aria = await allLinks[i].getAttribute('aria-label').catch(() => null);
    const cleanText = text.trim().replace(/\s+/g, ' ');
    console.log(`Link #${i}: text="${cleanText}", aria="${aria}", href=${href}, target=${target}`);
  }

  console.log('=== ALL BUTTONS & CLICKABLES ===');
  const allBtns = await page.locator('button, div[role="button"], a[role="button"]').all();
  for (let i = 0; i < allBtns.length; i++) {
    const text = await allBtns[i].innerText().catch(() => '');
    const cleanText = text.trim().replace(/\s+/g, ' ');
    if (cleanText.toLowerCase().includes('deal') || cleanText.toLowerCase().includes('see all') || cleanText.toLowerCase().includes('view all') || cleanText.toLowerCase().includes('smartwatch')) {
      console.log(`Matched Button #${i}: text="${cleanText}"`);
    }
  }
});
