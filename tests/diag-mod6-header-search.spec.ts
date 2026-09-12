import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('DIAGNOSTIC: Module 6 Header Elements, Search, and Cart Interactions', async ({ page }) => {
  test.setTimeout(120000);
  fs.mkdirSync('screenshots/mod6-diag-strict', { recursive: true });

  console.log('\n===============================================================');
  console.log('STEP 1: Load Homepage & Isolate Header DOM');
  console.log('===============================================================');
  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  await page.screenshot({ path: 'screenshots/mod6-diag-strict/01-homepage-initial.png' });

  // Dump all interactive elements in top 220px of the viewport (the mobile header zone)
  const headerElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        const cls = (el.getAttribute('class') || '').toLowerCase();
        return rect.top >= 0 && rect.bottom <= 220 && el.offsetParent !== null &&
          (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT' || el.getAttribute('role') === 'button' || el.onclick !== null ||
           cls.includes('cursor') || cls.includes('pill') || cls.includes('search') || cls.includes('cart'));
      });

    return all.map((el, idx) => ({
      index: idx,
      tag: el.tagName,
      text: (el.innerText || '').trim().replace(/\n/g, ' '),
      href: el.getAttribute('href') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      className: (el.getAttribute('class') || '').slice(0, 80),
      outerHTML: el.outerHTML.slice(0, 160),
      rect: { top: Math.round(el.getBoundingClientRect().top), left: Math.round(el.getBoundingClientRect().left), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }
    }));
  });

  console.log(`[Diagnostic] Found ${headerElements.length} elements in header zone (top 220px):`);
  headerElements.forEach(e => {
    console.log(`  #${e.index} <${e.tag}> text="${e.text}" href="${e.href}" rect=[top:${e.rect.top}, left:${e.rect.left}, w:${e.rect.width}, h:${e.rect.height}] html="${e.outerHTML}"`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: HEADER CART ICON
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('STEP 2: Header Cart Icon Actionability & Navigation');
  console.log('===============================================================');
  
  // Locate the cart button: top-right area (left > 300, top < 80)
  const cartElement = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll<HTMLElement>('button, a, div'))
      .find(e => {
        const r = e.getBoundingClientRect();
        return r.top >= 0 && r.top <= 60 && r.left >= 300 && e.offsetParent !== null && (e.querySelector('svg') !== null || (e.className || '').includes('cart'));
      });
    return el ? { tag: el.tagName, outerHTML: el.outerHTML.slice(0, 200), rect: el.getBoundingClientRect() } : null;
  });

  console.log('[Diagnostic] Cart Icon DOM Isolation:', JSON.stringify(cartElement));

  const urlBeforeCart = page.url();
  console.log(`[Diagnostic] URL Before Cart Click: ${urlBeforeCart}`);

  // Perform natural click on cart icon via position or locator
  const cartLocator = page.locator('button').filter({ has: page.locator('svg') }).filter({
    hasNot: page.locator('text=/Search|Specs|Highlights|filter|sort/i')
  }).last();

  const isCartVisible = await cartLocator.isVisible().catch(() => false);
  const isCartEnabled = await cartLocator.isEnabled().catch(() => false);
  console.log(`[Diagnostic] Cart locator: visible=${isCartVisible}, enabled=${isCartEnabled}`);

  if (isCartVisible) {
    console.log('[Diagnostic] Clicking Cart Icon...');
    await cartLocator.click({ timeout: 5000 });
    await page.waitForTimeout(3000);
  }

  const urlAfterCart = page.url();
  console.log(`[Diagnostic] URL After Cart Click: ${urlAfterCart}`);
  console.log(`[Diagnostic] Cart Navigated Successfully: ${urlAfterCart.includes('/cart')}`);
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/02-after-cart-click.png' });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: HEADER SEARCH PILL
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('STEP 3: Header Search Pill Actionability & Navigation');
  console.log('===============================================================');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const searchPillData = await page.evaluate(() => {
    // Search pill is the white pill with text "Search or Ask for..."
    const pill = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .find(e => /search or ask for/i.test(e.innerText || '') && e.offsetParent !== null && e.getBoundingClientRect().height < 60);

    return pill ? {
      tag: pill.tagName,
      text: pill.innerText.trim(),
      outerHTML: pill.outerHTML.slice(0, 300),
      parentTag: pill.parentElement?.tagName,
      parentHtml: pill.parentElement?.outerHTML.slice(0, 300),
      rect: pill.getBoundingClientRect()
    } : null;
  });

  console.log('[Diagnostic] Search Pill DOM Isolation:', JSON.stringify(searchPillData, null, 2));

  const urlBeforeSearchPill = page.url();
  console.log(`[Diagnostic] URL Before Search Pill Click: ${urlBeforeSearchPill}`);

  const pillLocator = page.locator('text=/Search or Ask for/i').first();
  const isPillVis = await pillLocator.isVisible().catch(() => false);
  const isPillEn = await pillLocator.isEnabled().catch(() => false);
  console.log(`[Diagnostic] Pill locator: visible=${isPillVis}, enabled=${isPillEn}`);

  if (isPillVis) {
    console.log('[Diagnostic] Clicking Search Pill...');
    await pillLocator.click({ timeout: 5000 });
    await page.waitForTimeout(3500);
  }

  const urlAfterSearchPill = page.url();
  console.log(`[Diagnostic] URL After Search Pill Click: ${urlAfterSearchPill}`);
  console.log(`[Diagnostic] Search Pill Navigated: ${urlAfterSearchPill !== urlBeforeSearchPill}`);
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/03-after-search-pill-click.png' });

  // Check if any modal / input opened instead of URL change
  const inputsAfterPill = await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLInputElement>('input'))
      .map(i => ({ type: i.type, placeholder: i.placeholder, visible: i.offsetParent !== null }));
  });
  console.log(`[Diagnostic] Inputs present after search pill click:`, JSON.stringify(inputsAfterPill));

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: LOCATION BADGE MODAL
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('STEP 4: Location Badge / Modal Trigger');
  console.log('===============================================================');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const locationTrigger = page.locator('text=/Select Delivery Location|560078|Bengaluru/i').first();
  const isLocVis = await locationTrigger.isVisible().catch(() => false);
  console.log(`[Diagnostic] Location Trigger visible: ${isLocVis}`);

  if (isLocVis) {
    console.log('[Diagnostic] Clicking Location Trigger...');
    await locationTrigger.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  }

  const modalState = await page.evaluate(() => {
    const modal = document.querySelector<HTMLElement>('[class*="modal"], [role="dialog"], [class*="drawer"], div.fixed.inset-0');
    return {
      modalFound: !!modal,
      modalText: modal ? modal.innerText.slice(0, 200).replace(/\n/g, ' ') : 'NO_MODAL',
      modalHtml: modal ? modal.outerHTML.slice(0, 300) : 'NONE',
    };
  });
  console.log(`[Diagnostic] Modal State after Location Click:`, JSON.stringify(modalState, null, 2));
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/04-location-modal.png' });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: PLP TOP-RIGHT SPARKLE ICON vs BACK BUTTON
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('STEP 5: PLP Sparkle/AI Icon vs Back Button Mapping');
  console.log('===============================================================');
  await page.goto('https://smpl-new.bangalore2.com/product-list/category-smartphones-308', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const plpHeaderIcons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('div.sticky button, header button, div.flex button'))
      .filter(b => b.offsetParent !== null && b.getBoundingClientRect().top < 80)
      .map((b, i) => ({
        index: i,
        outerHTML: b.outerHTML.slice(0, 150),
        rect: b.getBoundingClientRect()
      }));
    return buttons;
  });
  console.log(`[Diagnostic] PLP Header Icons found (top < 80px):`, JSON.stringify(plpHeaderIcons, null, 2));

  // Click Top-Right Sparkle Icon specifically
  const topRightIcon = page.locator('button').filter({ has: page.locator('svg') }).last();
  const urlBeforeSparkle = page.url();
  if (await topRightIcon.isVisible().catch(() => false)) {
    console.log(`[Diagnostic] Clicking Top-Right Icon on PLP...`);
    await topRightIcon.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const urlAfterSparkle = page.url();
  console.log(`[Diagnostic] URL Before Sparkle: ${urlBeforeSparkle} | After Sparkle: ${urlAfterSparkle}`);
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/05-after-plp-sparkle.png' });

  // Click Back Button on PLP
  const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
  const urlBeforeBack = page.url();
  if (await backButton.isVisible().catch(() => false)) {
    console.log(`[Diagnostic] Clicking Back Button (←) on PLP...`);
    await backButton.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const urlAfterBack = page.url();
  console.log(`[Diagnostic] URL Before Back: ${urlBeforeBack} | After Back: ${urlAfterBack}`);
  await page.screenshot({ path: 'screenshots/mod6-diag-strict/06-after-plp-back.png' });

  console.log('\n===============================================================');
  console.log('DIAGNOSTIC COMPLETE');
  console.log('===============================================================');
});
