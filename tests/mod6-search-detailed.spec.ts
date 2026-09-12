import { test, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const PINCODE = '560078';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('MOD6 Detailed Search Explorer', async ({ page }) => {
  test.setTimeout(60000);

  fs.mkdirSync('screenshots/mod6-explore', { recursive: true });

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  
  // Wait for header elements to hydrate
  const searchPill = page.locator('span, div, p').filter({ hasText: /Search or Ask/i }).first();
  await searchPill.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshots/mod6-explore/01-home-hydrated.png' });
  console.log('Search Pill visible:', await searchPill.isVisible());

  if (await searchPill.isVisible()) {
    console.log('Tapping search pill...');
    await searchPill.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/mod6-explore/02-search-opened.png' });

    // Look for active search input
    const inputAudit = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
        .map(i => ({
          type: i.type,
          placeholder: i.placeholder,
          visible: i.offsetParent !== null,
          outerHTML: i.outerHTML.slice(0, 150),
        }));
      return { inputs, url: location.href };
    });
    console.log('Input Audit:', JSON.stringify(inputAudit));

    // Try typing "iPhone"
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      console.log('Typing "iPhone" into search input...');
      await searchInput.fill('iPhone');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'screenshots/mod6-explore/03-search-typed.png' });

      // Check for suggestions / search results dropdown
      const suggestions = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll<HTMLElement>('li, a, div'))
          .filter(e => e.offsetParent !== null && !e.children.length && (e.innerText || '').toLowerCase().includes('iphone'))
          .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 60), href: e.closest('a')?.getAttribute('href') || null }))
          .slice(0, 10);
        return items;
      });
      console.log('Suggestions:', JSON.stringify(suggestions));

      // Press Enter to submit search
      console.log('Pressing Enter...');
      await searchInput.press('Enter');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/mod6-explore/04-search-submitted.png' });
      console.log('Post-submit URL:', page.url());
    }
  }
});
