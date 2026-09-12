import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('MOD6 Search & Bottom Nav DOM Exploration', async ({ page }) => {
  test.setTimeout(60000);

  fs.mkdirSync('screenshots/mod6-explore', { recursive: true });

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'screenshots/mod6-explore/01-homepage.png' });

  // 1. Inspect Search UI
  const searchAudit = await page.evaluate(() => {
    const searchPills = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter(el => !el.children.length && /search or ask/i.test(el.innerText || ''))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), className: el.className }));

    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
      .map(i => ({ type: i.type, placeholder: i.placeholder, visible: i.offsetParent !== null, className: i.className }));

    return { searchPills, inputs };
  });

  console.log('\n[MOD6 Explorer] Search triggers:', JSON.stringify(searchAudit));

  // 2. Inspect Bottom Navigation Bar
  const bottomNavAudit = await page.evaluate(() => {
    // Look for sticky/fixed bottom elements
    const fixedBottom = Array.from(document.querySelectorAll<HTMLElement>('nav, div, footer'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return (style.position === 'fixed' || style.position === 'sticky') &&
               (parseInt(style.bottom, 10) <= 20 || style.bottom === '0px');
      });

    const bottomItems = fixedBottom.flatMap(container =>
      Array.from(container.querySelectorAll<HTMLElement>('a, button, div'))
        .filter(e => e.offsetParent !== null && !e.children.length && (e.innerText || '').trim().length > 0)
        .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim(), href: e.closest('a')?.getAttribute('href') || null }))
    );

    return { containerCount: fixedBottom.length, bottomItems };
  });

  console.log('\n[MOD6 Explorer] Bottom Nav:', JSON.stringify(bottomNavAudit));

  // 3. Test Tapping Search Trigger
  const searchTrigger = page.locator('text=/Search or Ask/i').first();
  if (await searchTrigger.isVisible().catch(() => false)) {
    console.log('[MOD6 Explorer] Tapping Search Trigger...');
    await searchTrigger.tap().catch(() => searchTrigger.click());
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/mod6-explore/02-search-overlay.png' });

    const overlayAudit = await page.evaluate(() => {
      const activeInput = document.activeElement ? (document.activeElement as HTMLInputElement).placeholder || document.activeElement.tagName : 'NONE';
      const visibleInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
        .filter(i => i.offsetParent !== null)
        .map(i => ({ placeholder: i.placeholder, type: i.type, value: i.value }));

      const suggestions = Array.from(document.querySelectorAll<HTMLElement>('li, div, button, a'))
        .filter(e => e.offsetParent !== null && !e.children.length && (e.innerText || '').trim().length > 0)
        .map(e => (e.innerText || '').trim().slice(0, 40))
        .slice(0, 15);

      return { activeInput, visibleInputs, suggestions, url: location.href };
    });

    console.log('\n[MOD6 Explorer] Overlay State:', JSON.stringify(overlayAudit));
  }
});
