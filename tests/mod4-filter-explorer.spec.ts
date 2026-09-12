import { test, devices } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const SMARTPHONES_PLP = 'https://smpl-new.bangalore2.com/product-list/category-smartphones-308';
const PINCODE = '560078';

test.use({ ...devices['Pixel 5'] });

test('MOD4 Filter/Sort DOM Explorer', async ({ page }) => {
  test.setTimeout(60000);

  await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
  await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const dom = await page.evaluate(() => {
    // Find filter/sort trigger buttons
    const allButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .map(b => ({
        text: (b.innerText || '').trim().slice(0, 60),
        className: b.className.slice(0, 80),
        id: b.id || '',
        visible: b.offsetParent !== null
      }))
      .filter(b => b.text.length > 0 && b.visible);

    // Find filter/sort related elements (divs, spans, labels)
    const filterKeywords = ['filter', 'sort', 'brand', 'price', 'refine'];
    const relatedEls = Array.from(document.querySelectorAll<HTMLElement>('div, span, a, label'))
      .filter(e => {
        const t = (e.innerText || '').toLowerCase().trim();
        const cls = (e.className || '').toLowerCase();
        return !e.children.length && filterKeywords.some(k => t.includes(k) || cls.includes(k)) && e.offsetParent !== null;
      })
      .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 60), className: e.className.slice(0, 80) }))
      .slice(0, 20);

    // Check for filter panel/drawer/sheet
    const filterPanel = document.querySelector('[class*="filter"], [id*="filter"], [class*="Filter"], [class*="drawer"], [class*="sheet"], [class*="sort"]');

    return {
      buttons: allButtons.slice(0, 20),
      relatedEls,
      filterPanelExists: !!filterPanel,
      filterPanelClass: filterPanel ? filterPanel.className.slice(0, 100) : '',
      pageText: document.body.innerText.slice(0, 500),
    };
  });

  console.log('\n[Explorer] BUTTONS ON PLP:');
  dom.buttons.forEach(b => console.log(`  [${b.text}] class="${b.className}"`));

  console.log('\n[Explorer] FILTER/SORT RELATED ELEMENTS:');
  dom.relatedEls.forEach(e => console.log(`  <${e.tag}> "${e.text}" class="${e.className}"`));

  console.log(`\n[Explorer] Filter panel in DOM: ${dom.filterPanelExists} | class="${dom.filterPanelClass}"`);
  console.log(`\n[Explorer] Page text snippet:\n${dom.pageText}`);

  await page.screenshot({ path: 'screenshots/mod4-plp-initial.png', fullPage: false });
  console.log('\n[Explorer] Screenshot: screenshots/mod4-plp-initial.png');

  // Now tap the first filter/sort button and see what opens
  const filterBtn = page.locator('button').filter({ hasText: /filter|sort/i }).first();
  const filterBtnCount = await filterBtn.count();
  console.log(`\n[Explorer] Filter/Sort button count: ${filterBtnCount}`);

  if (filterBtnCount > 0) {
    const btnText = await filterBtn.innerText().catch(() => '');
    console.log(`[Explorer] Tapping: "${btnText}"`);
    await filterBtn.tap().catch(() => filterBtn.click());
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/mod4-filter-panel-open.png', fullPage: false });
    console.log('[Explorer] Screenshot after tap: screenshots/mod4-filter-panel-open.png');

    // What appeared after tap?
    const afterTap = await page.evaluate(() => {
      const allVisible = Array.from(document.querySelectorAll<HTMLElement>('*'))
        .filter(e => {
          const t = (e.innerText || '').toLowerCase();
          return e.offsetParent !== null && !e.children.length &&
            (t.includes('brand') || t.includes('price') || t.includes('low to high') || t.includes('high to low') || t.includes('relevance') || t.includes('newest') || t.includes('apply') || t.includes('clear'));
        })
        .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 60), className: e.className.slice(0, 80) }))
        .slice(0, 30);
      return allVisible;
    });

    console.log('\n[Explorer] ELEMENTS VISIBLE AFTER TAP:');
    afterTap.forEach(e => console.log(`  <${e.tag}> "${e.text}" class="${e.className}"`));
  }
});
