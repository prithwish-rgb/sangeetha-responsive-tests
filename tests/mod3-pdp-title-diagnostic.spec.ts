import { test, devices } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PDP_URL = 'https://smpl-new.bangalore2.com/product-details/mynm3hn-a/17818';
const PINCODE = '560078';

test.use({ ...devices['Pixel 5'] });

test('MOD3 PDP Title & Hydration Diagnostic', async ({ page }) => {
  test.setTimeout(120000);

  // ── 1. Inject pincode so the page is in a fully hydrated state ──
  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');

  // ── 2. Navigate directly to the PDP (SSR path → guaranteed full load) ──
  console.log(`\n[Diag] Navigating directly to PDP: ${PDP_URL}`);
  await page.goto(PDP_URL, { waitUntil: 'domcontentloaded' });

  // Wait for full JS hydration — poll for pincode badge or price element
  await page.waitForSelector('span:has-text("₹"), [class*="price"]', { timeout: 15000 }).catch(() => {
    console.log('[Diag] Price selector did not appear within 15s');
  });
  await page.waitForTimeout(2000); // extra buffer

  // ── 3. Heading audit ──
  const headingAudit = await page.evaluate(() => {
    const getAll = (sel: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(sel))
        .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 120), visible: e.offsetParent !== null }));

    return {
      h1: getAll('h1'),
      h2: getAll('h2'),
      h3: getAll('h3'),
      firstHeadingCombined: (() => {
        const el = document.querySelector<HTMLElement>('h1, h2, h3');
        return el ? { tag: el.tagName, text: (el.innerText || '').trim(), visible: el.offsetParent !== null } : null;
      })(),
      pageTitle: document.title,
    };
  });

  console.log('\n[Diag] HEADING AUDIT (SSR direct load):');
  console.log(JSON.stringify(headingAudit, null, 2));

  // ── 4. Price & Add to Cart audit ──
  const interactiveAudit = await page.evaluate(() => {
    const prices = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter(e => !e.children.length && (e.innerText || '').includes('\u20b9'))
      .map(e => ({ tag: e.tagName, className: e.className.slice(0, 60), text: (e.innerText || '').trim().slice(0, 80) }))
      .slice(0, 5);

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .map(b => ({ text: (b.innerText || '').trim().slice(0, 60), disabled: b.disabled, visible: b.offsetParent !== null }))
      .filter(b => b.text.length > 0)
      .slice(0, 10);

    const pdpAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
      .map(a => a.getAttribute('href') || '');

    return { prices, buttons, pdpAnchorCount: pdpAnchors.length, pdpAnchorsSample: pdpAnchors.slice(0, 5) };
  });

  console.log('\n[Diag] INTERACTIVE ELEMENTS AUDIT:');
  console.log(JSON.stringify(interactiveAudit, null, 2));

  // ── 5. Pincode state at PDP load time ──
  const lsState = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('setDefault') || 'null'); } catch { return null; }
  });
  const pincodeUIVisible = await page.locator(`button:has-text("${PINCODE}"), span:has-text("${PINCODE}")`).first().isVisible().catch(() => false);
  console.log(`\n[Diag] localStorage setDefault: ${JSON.stringify(lsState)}`);
  console.log(`[Diag] Pincode visible in UI: ${pincodeUIVisible}`);

  // ── 6. Screenshot ──
  fs.mkdirSync('screenshots/mod3-diag', { recursive: true });
  await page.screenshot({ path: 'screenshots/mod3-diag/pdp-full-hydrated.png', fullPage: true });
  console.log('[Diag] Screenshot saved: screenshots/mod3-diag/pdp-full-hydrated.png');

  // ── 7. Simulate CSR click from homepage ──
  console.log('\n[Diag] ── CSR CLICK SIMULATION FROM HOMEPAGE ──');
  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const lsStateHome = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('setDefault') || 'null'); } catch { return null; }
  });
  const pincodeUIHome = await page.locator(`button:has-text("${PINCODE}"), span:has-text("${PINCODE}")`).first().isVisible().catch(() => false);
  const anchorsOnHome = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]')).length
  );

  console.log(`[Diag/Home] localStorage: ${JSON.stringify(lsStateHome)}`);
  console.log(`[Diag/Home] Pincode visible in UI: ${pincodeUIHome}`);
  console.log(`[Diag/Home] PDP anchors on homepage: ${anchorsOnHome}`);

  await page.screenshot({ path: 'screenshots/mod3-diag/homepage-before-click.png' });

  // Click the first PDP card using waitForURL (correct for Next.js)
  const firstAnchor = page.locator('a[href*="/product-details/"]').first();
  const firstHref = await firstAnchor.getAttribute('href').catch(() => '');
  console.log(`[Diag/Home] Clicking first PDP anchor: ${firstHref}`);
  await firstAnchor.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  await Promise.all([
    page.waitForURL('**/product-details/**', { timeout: 15000 }).catch((e: Error) => console.log(`[Diag] waitForURL failed: ${e.message}`)),
    firstAnchor.click().catch((e: Error) => console.log(`[Diag] click failed: ${e.message}`))
  ]);

  await page.waitForTimeout(2000);
  const postClickUrl = page.url();
  console.log(`[Diag/Home] URL after click: ${postClickUrl}`);

  // Check heading on CSR-loaded PDP
  const csrHeadingAudit = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('h1, h2, h3');
    const allH = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3'))
      .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 100), visible: e.offsetParent !== null }));
    return {
      firstHeading: el ? { tag: el.tagName, text: (el.innerText || '').trim(), visible: el.offsetParent !== null } : null,
      allHeadings: allH,
    };
  });
  console.log(`[Diag/Home] Headings after CSR click: ${JSON.stringify(csrHeadingAudit, null, 2)}`);

  await page.screenshot({ path: 'screenshots/mod3-diag/after-csr-click.png' });
  console.log('[Diag] All screenshots saved. Diagnostic complete.');
});
