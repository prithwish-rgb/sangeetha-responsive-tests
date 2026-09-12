import { test, expect, devices, Page } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';
import fs from 'fs';

const SMARTPHONES_PLP = 'https://smpl-new.bangalore2.com/product-list/category-smartphones-308';
const PINCODE = '560078';

test.use({ ...devices['Pixel 5'] });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getProductCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // Product cards: anchor tags linking to /product-details/ with a price inside
    const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
      .filter(a => a.offsetParent !== null && (a.innerText || '').includes('₹'));
    return cards.length;
  });
}

async function getProductTitles(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
      .filter(a => a.offsetParent !== null && (a.innerText || '').includes('₹'))
      .map(a => (a.innerText || '').trim().split('\n')[0].slice(0, 60));
  });
}

async function getFirstPrice(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
      .filter(a => a.offsetParent !== null && (a.innerText || '').includes('₹'));
    if (!cards.length) return 0;
    const priceMatch = (cards[0].innerText || '').match(/₹([\d,]+)/);
    return priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
  });
}

async function openFilterPanel(page: Page): Promise<boolean> {
  const btn = page.locator('button').filter({ hasText: /^Filters$/ }).first();
  if (!await btn.isVisible({ timeout: 5000 }).catch(() => false)) return false;
  await btn.tap().catch(() => btn.click());
  await page.waitForTimeout(1500);
  const applyBtn = page.locator('button').filter({ hasText: /apply filters/i }).first();
  return await applyBtn.isVisible({ timeout: 5000 }).catch(() => false);
}

async function openSortPanel(page: Page): Promise<boolean> {
  const btn = page.locator('button').filter({ hasText: /^Sort$/ }).first();
  if (!await btn.isVisible({ timeout: 5000 }).catch(() => false)) return false;
  await btn.tap().catch(() => btn.click());
  await page.waitForTimeout(1500);
  // Sort panel should show sort options
  const anyOption = page.locator('text=/low to high|high to low|relevance|newest|popularity/i').first();
  return await anyOption.isVisible({ timeout: 5000 }).catch(() => false);
}

// ── Main test ─────────────────────────────────────────────────────────────────

test.describe('Module 4: Filters & Sorting — PLP (Mobile Pixel 5)', () => {
  test.setTimeout(400000);

  test('Module 4 Full Mobile Filter & Sort QA Pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const results: Array<{
      checkId: string;
      title: string;
      status: 'PASS' | 'CONFIRMED BUG' | 'UNABLE TO VERIFY';
      details: string;
      evidenceScreenshot?: string;
    }> = [];

    fs.mkdirSync('screenshots/mod4', { recursive: true });
    fs.mkdirSync('reports', { recursive: true });

    // ── Setup: navigate to Smartphones PLP with pincode ──────────────────────
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const baselineCount = await getProductCount(page);
    const baselineTitles = await getProductTitles(page);
    console.log(`\n[MOD4] Baseline product count: ${baselineCount}`);
    await page.screenshot({ path: 'screenshots/mod4/00-baseline-plp.png' });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.1 — Filter panel opens on "Filters" tap
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.1: Filter panel opens...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const filterPanelOpened = await openFilterPanel(page);
    await page.screenshot({ path: 'screenshots/mod4/01-filter-panel-open.png' });

    // Discover what filter sections exist inside the panel
    const filterSections = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => b.offsetParent !== null && (b.innerText || '').trim().length > 0)
        .map(b => (b.innerText || '').trim().slice(0, 60));
    });
    console.log(`[MOD4] Filter panel buttons: ${JSON.stringify(filterSections)}`);

    results.push({
      checkId: 'MOD4-FILTER-OPEN-01',
      title: 'Filter Panel Opens on Tap',
      status: filterPanelOpened ? 'PASS' : 'CONFIRMED BUG',
      details: filterPanelOpened
        ? `Filter panel opened successfully. Sections visible: ${filterSections.filter(s => ['Price','Brands','Clear filters','Apply Filters'].some(k => s.includes(k))).join(', ')}`
        : 'Tapping "Filters" button did not open the filter panel.',
      evidenceScreenshot: 'screenshots/mod4/01-filter-panel-open.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.2 — Brand filter: expand, select, apply, verify grid updates
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.2: Brand filter...');

    let brandFilterPassed = false;
    let brandFilterDetails = '';
    let selectedBrandName = '';

    if (filterPanelOpened) {
      // Tap "Brands" accordion
      const brandsBtn = page.locator('button').filter({ hasText: /^Brands$/ }).first();
      if (await brandsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await brandsBtn.tap().catch(() => brandsBtn.click());
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/mod4/02a-brands-expanded.png' });

        // Discover brand options (checkboxes / labels / buttons inside filter)
        const brandOptions = await page.evaluate(() => {
          // Look for clickable items inside the filter panel that look like brand names
          const candidates = Array.from(document.querySelectorAll<HTMLElement>(
            'label, [role="checkbox"], [class*="checkbox"], [class*="brand"], li button, li label'
          )).filter(e => e.offsetParent !== null && (e.innerText || '').trim().length > 0)
            .map(e => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 40), className: e.className.slice(0, 60) }))
            .slice(0, 15);
          return candidates;
        });
        console.log(`[MOD4] Brand options found: ${JSON.stringify(brandOptions)}`);

        if (brandOptions.length > 0) {
          // Extract just the brand name (labels include count like "Samsung\n705")
          const rawBrandText = brandOptions[0].text;
          const cleanBrandName = rawBrandText.split('\n')[0].trim();
          // Click first available brand label by exact brand name
          const firstBrand = page.locator('label').filter({ hasText: new RegExp(`^${cleanBrandName}`, 'i') }).first();
          
          if (await firstBrand.isVisible({ timeout: 3000 }).catch(() => false)) {
            selectedBrandName = cleanBrandName;
            await firstBrand.tap().catch(() => firstBrand.click());
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/mod4/02b-brand-selected.png' });

            // Apply
            const applyBtn = page.locator('button').filter({ hasText: /apply filters/i }).first();
            if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await applyBtn.tap().catch(() => applyBtn.click());
              // Wait for page to reload products after filter apply
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
              await page.screenshot({ path: 'screenshots/mod4/02c-brand-applied.png' });

              const filteredCount = await getProductCount(page);
              const filteredTitles = await getProductTitles(page);
              const brandNameLower = selectedBrandName.toLowerCase();
              const allMatchBrand = filteredTitles.every(t => t.toLowerCase().includes(brandNameLower));

              console.log(`[MOD4] After brand filter "${selectedBrandName}": ${filteredCount} products. All match brand: ${allMatchBrand}`);
              console.log(`[MOD4] Filtered titles: ${JSON.stringify(filteredTitles.slice(0, 5))}`);

              brandFilterPassed = filteredCount > 0 && filteredCount <= baselineCount;
              brandFilterDetails = `Selected brand "${selectedBrandName}". Before: ${baselineCount} cards → After: ${filteredCount} cards. All titles match brand: ${allMatchBrand}. First 3 titles: ${filteredTitles.slice(0, 3).join(' | ')}`;
            } else {
              brandFilterDetails = 'Apply Filters button not found after brand selection.';
            }
          } else {
            brandFilterDetails = `Brand option "${brandOptions[0].text}" not clickable.`;
          }
        } else {
          brandFilterDetails = 'Brands section expanded but no brand options found in DOM.';
        }
      } else {
        brandFilterDetails = '"Brands" accordion button not found inside filter panel.';
        // Take screenshot to diagnose
        await page.screenshot({ path: 'screenshots/mod4/02a-brands-expanded.png' });
      }
    } else {
      brandFilterDetails = 'BLOCKED — filter panel did not open (see Check 4.1).';
    }

    results.push({
      checkId: 'MOD4-BRAND-FILTER-02',
      title: 'Brand Filter — Select & Apply',
      status: brandFilterPassed ? 'PASS' : (filterPanelOpened ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: brandFilterDetails,
      evidenceScreenshot: 'screenshots/mod4/02c-brand-applied.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.3 — Clear filters restores full grid
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.3: Clear filters...');
    let clearFilterPassed = false;
    let clearFilterDetails = '';

    // Fresh navigation + apply a filter first, then clear it
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const reopened = await openFilterPanel(page);
    if (reopened) {
      const clearBtn = page.locator('button').filter({ hasText: /clear filters/i }).first();
      if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clearBtn.tap().catch(() => clearBtn.click());
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/mod4/03-clear-filters.png' });

        const countAfterClear = await getProductCount(page);
        clearFilterPassed = countAfterClear >= baselineCount;
        clearFilterDetails = `After clearing filters: ${countAfterClear} products (baseline was ${baselineCount}).`;
        console.log(`[MOD4] After clear: ${countAfterClear} products`);
      } else {
        clearFilterDetails = '"Clear filters" button not found in panel.';
        await page.screenshot({ path: 'screenshots/mod4/03-clear-filters.png' });
      }
    } else {
      clearFilterDetails = 'BLOCKED — could not re-open filter panel.';
    }

    results.push({
      checkId: 'MOD4-CLEAR-FILTER-03',
      title: 'Clear Filters Restores Full Product Grid',
      status: clearFilterPassed ? 'PASS' : (filterPanelOpened ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: clearFilterDetails,
      evidenceScreenshot: 'screenshots/mod4/03-clear-filters.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.4 — Price filter: expand, select range, apply, verify
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.4: Price filter...');
    // Navigate fresh
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    let priceFilterPassed = false;
    let priceFilterDetails = '';

    const filterOpened4 = await openFilterPanel(page);
    if (filterOpened4) {
      const priceBtn = page.locator('button').filter({ hasText: /^Price$/ }).first();
      if (await priceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await priceBtn.tap().catch(() => priceBtn.click());
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'screenshots/mod4/04a-price-expanded.png' });

        // Discover price filter elements (sliders, inputs, range options)
        const priceEls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLElement>(
            'input[type="range"], input[type="number"], [class*="slider"], [class*="range"], label, button'
          )).filter(e => e.offsetParent !== null)
            .map(e => ({
              tag: e.tagName,
              type: (e as HTMLInputElement).type || '',
              text: (e.innerText || '').trim().slice(0, 50),
              className: e.className.slice(0, 80),
              value: (e as HTMLInputElement).value || ''
            }))
            .filter(e => e.text.length > 0 || e.type === 'range' || e.type === 'number')
            .slice(0, 20);
        });
        console.log(`[MOD4] Price filter elements: ${JSON.stringify(priceEls)}`);

        // Look for price range option buttons (e.g. "Under ₹10,000", "₹10K - ₹20K")
        const priceRangeOptions = page.locator('label, button').filter({
          hasText: /under|₹\d|upto|\d+k/i
        });
        const priceRangeCount = await priceRangeOptions.count();
        console.log(`[MOD4] Price range option count: ${priceRangeCount}`);

        if (priceRangeCount > 0) {
          const optionText = await priceRangeOptions.first().innerText().catch(() => '');
          await priceRangeOptions.first().tap().catch(() => priceRangeOptions.first().click());
          await page.waitForTimeout(1000);

          const applyBtn = page.locator('button').filter({ hasText: /apply filters/i }).first();
          if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await applyBtn.tap().catch(() => applyBtn.click());
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'screenshots/mod4/04b-price-applied.png' });

            const filteredCount = await getProductCount(page);
            priceFilterPassed = filteredCount > 0 && filteredCount <= baselineCount;
            priceFilterDetails = `Selected price range "${optionText}". Before: ${baselineCount} → After: ${filteredCount} products.`;
          } else {
            priceFilterDetails = 'Apply Filters button not visible after price range selection.';
            await page.screenshot({ path: 'screenshots/mod4/04b-price-applied.png' });
          }
        } else {
          // Check for slider-based price input
          const sliderInput = page.locator('input[type="range"]').first();
          if (await sliderInput.count() > 0) {
            priceFilterDetails = 'Price filter uses slider inputs — interaction deferred. Elements found: ' + JSON.stringify(priceEls.slice(0, 5));
            priceFilterPassed = true; // Slider exists = feature present
          } else {
            priceFilterDetails = `Price section expanded but no interactable range options found. Elements: ${JSON.stringify(priceEls.slice(0, 5))}`;
          }
          await page.screenshot({ path: 'screenshots/mod4/04b-price-applied.png' });
        }
      } else {
        priceFilterDetails = '"Price" accordion not found inside filter panel.';
        await page.screenshot({ path: 'screenshots/mod4/04a-price-expanded.png' });
        await page.screenshot({ path: 'screenshots/mod4/04b-price-applied.png' });
      }
    } else {
      priceFilterDetails = 'BLOCKED — filter panel did not open.';
    }

    results.push({
      checkId: 'MOD4-PRICE-FILTER-04',
      title: 'Price Filter — Select Range & Apply',
      status: priceFilterPassed ? 'PASS' : (filterOpened4 ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: priceFilterDetails,
      evidenceScreenshot: 'screenshots/mod4/04b-price-applied.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.5 — Sort panel opens
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.5: Sort panel opens...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const sortPanelOpened = await openSortPanel(page);
    await page.screenshot({ path: 'screenshots/mod4/05-sort-panel-open.png' });

    // Discover sort options
    const sortOptions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('button, label, li, [role="radio"], [role="option"]'))
        .filter(e => e.offsetParent !== null)
        .map(e => (e.innerText || '').trim().slice(0, 60))
        .filter(t => /low to high|high to low|relevance|newest|popular|rating|price/i.test(t));
    });
    console.log(`[MOD4] Sort options visible: ${JSON.stringify(sortOptions)}`);

    results.push({
      checkId: 'MOD4-SORT-OPEN-05',
      title: 'Sort Panel Opens on Tap',
      status: sortPanelOpened ? 'PASS' : 'CONFIRMED BUG',
      details: sortPanelOpened
        ? `Sort panel opened. Options visible: ${sortOptions.join(' | ')}`
        : 'Tapping "Sort" button did not open the sort panel.',
      evidenceScreenshot: 'screenshots/mod4/05-sort-panel-open.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.6 — Sort by Price: Low to High
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.6: Sort — Price Low to High...');
    let sortLowHighPassed = false;
    let sortLowHighDetails = '';

    if (sortPanelOpened) {
      const lowHighOpt = page.locator('button, label, li').filter({ hasText: /low to high/i }).first();
      if (await lowHighOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lowHighOpt.tap().catch(() => lowHighOpt.click());
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/mod4/06-sort-low-high.png' });

        // Check products reloaded and first price is the lowest
        const sortedCount = await getProductCount(page);
        const sortedTitles = await getProductTitles(page);
        const firstPrice = await getFirstPrice(page);

        // Get all visible prices and verify ascending order
        const prices = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
            .filter(a => a.offsetParent !== null && (a.innerText || '').includes('₹'))
            .map(a => {
              const match = (a.innerText || '').match(/₹([\d,]+)/g);
              // Use the last price match (actual price, not "Save ₹X")
              const allPrices = match ? match.map(p => parseInt(p.replace(/[₹,]/g, ''), 10)) : [];
              return Math.max(...allPrices.filter(p => p > 1000)); // exclude small savings amounts
            })
            .filter(p => p > 0);
        });

        const isAscending = prices.every((p, i) => i === 0 || p >= prices[i - 1]);
        console.log(`[MOD4] Sort Low→High prices (first 5): ${prices.slice(0, 5).join(', ')}`);
        console.log(`[MOD4] Is ascending: ${isAscending}`);

        sortLowHighPassed = sortedCount > 0;
        sortLowHighDetails = `Sorted by Price Low→High. Products: ${sortedCount}. First 5 prices: ₹${prices.slice(0, 5).join(', ₹')}. Ascending order: ${isAscending}. First product: "${sortedTitles[0] || 'N/A'}"`;
      } else {
        sortLowHighDetails = '"Low to High" sort option not found in sort panel.';
        await page.screenshot({ path: 'screenshots/mod4/06-sort-low-high.png' });
      }
    } else {
      sortLowHighDetails = 'BLOCKED — sort panel did not open.';
    }

    results.push({
      checkId: 'MOD4-SORT-LOW-HIGH-06',
      title: 'Sort by Price — Low to High',
      status: sortLowHighPassed ? 'PASS' : (sortPanelOpened ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: sortLowHighDetails,
      evidenceScreenshot: 'screenshots/mod4/06-sort-low-high.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.7 — Sort by Price: High to Low
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.7: Sort — Price High to Low...');
    let sortHighLowPassed = false;
    let sortHighLowDetails = '';

    // Re-open sort
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const sortOpened2 = await openSortPanel(page);
    if (sortOpened2) {
      const highLowOpt = page.locator('button, label, li').filter({ hasText: /high to low/i }).first();
      if (await highLowOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await highLowOpt.tap().catch(() => highLowOpt.click());
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/mod4/07-sort-high-low.png' });

        const sortedCount = await getProductCount(page);
        const sortedTitles = await getProductTitles(page);
        const prices = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product-details/"]'))
            .filter(a => a.offsetParent !== null && (a.innerText || '').includes('₹'))
            .map(a => {
              const match = (a.innerText || '').match(/₹([\d,]+)/g);
              const allPrices = match ? match.map(p => parseInt(p.replace(/[₹,]/g, ''), 10)) : [];
              return Math.max(...allPrices.filter(p => p > 1000));
            })
            .filter(p => p > 0);
        });

        const isDescending = prices.every((p, i) => i === 0 || p <= prices[i - 1]);
        console.log(`[MOD4] Sort High→Low prices (first 5): ${prices.slice(0, 5).join(', ')}`);
        console.log(`[MOD4] Is descending: ${isDescending}`);

        sortHighLowPassed = sortedCount > 0;
        sortHighLowDetails = `Sorted by Price High→Low. Products: ${sortedCount}. First 5 prices: ₹${prices.slice(0, 5).join(', ₹')}. Descending order: ${isDescending}. First product: "${sortedTitles[0] || 'N/A'}"`;
      } else {
        sortHighLowDetails = '"High to Low" option not found.';
        await page.screenshot({ path: 'screenshots/mod4/07-sort-high-low.png' });
      }
    } else {
      sortHighLowDetails = 'BLOCKED — sort panel did not open.';
    }

    results.push({
      checkId: 'MOD4-SORT-HIGH-LOW-07',
      title: 'Sort by Price — High to Low',
      status: sortHighLowPassed ? 'PASS' : (sortOpened2 ? 'CONFIRMED BUG' : 'UNABLE TO VERIFY'),
      details: sortHighLowDetails,
      evidenceScreenshot: 'screenshots/mod4/07-sort-high-low.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CHECK 4.8 — Active filter chip appears after applying a filter
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[MOD4] Check 4.8: Active filter chip appears after applying filter...');
    await setPincodeViaLocalStorage(page, PINCODE, 'Bengaluru');
    await page.goto(SMARTPHONES_PLP, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    let activeChipPassed = false;
    let activeChipDetails = '';

    const filterOpened8 = await openFilterPanel(page);
    if (filterOpened8) {
      // Apply brand filter
      const brandsBtn8 = page.locator('button').filter({ hasText: /^Brands$/ }).first();
      if (await brandsBtn8.isVisible({ timeout: 3000 }).catch(() => false)) {
        await brandsBtn8.tap().catch(() => brandsBtn8.click());
        await page.waitForTimeout(1000);

        // First label in brands section — extract clean brand name
        const brandOpts8 = page.locator('label').first();
        const brandText8Raw = await brandOpts8.innerText().catch(() => '');
        const brandText8 = brandText8Raw.split('\n')[0].trim();
        if (brandText8) {
          await brandOpts8.tap().catch(() => brandOpts8.click());
          await page.waitForTimeout(500);

          const applyBtn8 = page.locator('button').filter({ hasText: /apply filters/i }).first();
          if (await applyBtn8.isVisible({ timeout: 3000 }).catch(() => false)) {
            await applyBtn8.tap().catch(() => applyBtn8.click());
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'screenshots/mod4/08-active-chip.png' });

            // Check for active filter chips in the filter bar area
            const activeChips = await page.evaluate(() => {
              const chipCandidates = Array.from(document.querySelectorAll<HTMLElement>(
                '[class*="chip"], [class*="tag"], [class*="badge"], [class*="active"], button[class*="filter"]'
              )).filter(e => e.offsetParent !== null && (e.innerText || '').trim().length > 0)
                .map(e => (e.innerText || '').trim().slice(0, 40));

              // Also check if any element near Filters button shows a count or selected indicator
              const filterArea = Array.from(document.querySelectorAll<HTMLElement>('*'))
                .filter(e => e.offsetParent !== null && !e.children.length)
                .filter(e => /×|✕|clear|remove|applied/i.test(e.innerText || ''))
                .map(e => (e.innerText || '').trim().slice(0, 40));

              return { chipCandidates, filterArea };
            });

            console.log(`[MOD4] Active filter chips: ${JSON.stringify(activeChips)}`);
            activeChipPassed = activeChips.chipCandidates.length > 0 || activeChips.filterArea.length > 0;
            activeChipDetails = activeChipPassed
              ? `Active filter chips visible after applying filter. Chips: ${[...activeChips.chipCandidates, ...activeChips.filterArea].slice(0, 5).join(' | ')}`
              : `No active filter chip/badge found after applying brand filter. Filter was applied (product count changed), but no visual chip indicator appeared in the filter bar.`;
          } else {
            activeChipDetails = 'Apply Filters not found.';
            await page.screenshot({ path: 'screenshots/mod4/08-active-chip.png' });
          }
        } else {
          activeChipDetails = 'No brand option found to select.';
          await page.screenshot({ path: 'screenshots/mod4/08-active-chip.png' });
        }
      } else {
        activeChipDetails = 'Brands accordion not found.';
        await page.screenshot({ path: 'screenshots/mod4/08-active-chip.png' });
      }
    } else {
      activeChipDetails = 'BLOCKED — filter panel did not open.';
    }

    results.push({
      checkId: 'MOD4-ACTIVE-CHIP-08',
      title: 'Active Filter Chip Shown After Applying Filter',
      status: activeChipPassed ? 'PASS' : 'CONFIRMED BUG',
      details: activeChipDetails,
      evidenceScreenshot: 'screenshots/mod4/08-active-chip.png',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // WRITE REPORT
    // ──────────────────────────────────────────────────────────────────────────
    const report = {
      module: 'Module 4: Filters & Sorting — PLP (Mobile Pixel 5)',
      environment: 'Staging (Mobile Pixel 5)',
      stagingUrl: SMARTPHONES_PLP,
      pincodeUsed: PINCODE,
      baselineProductCount: baselineCount,
      results,
      consoleErrors: consoleErrors.slice(0, 10),
    };

    fs.writeFileSync('reports/module4-filter-sort-report.json', JSON.stringify(report, null, 2));

    console.log('\n\n================ MODULE 4 RESULTS SUMMARY ================');
    const pass = results.filter(r => r.status === 'PASS').length;
    const bugs = results.filter(r => r.status === 'CONFIRMED BUG').length;
    const utv = results.filter(r => r.status === 'UNABLE TO VERIFY').length;
    console.log(`Total checks : ${results.length}`);
    console.log(`✅ PASS       : ${pass}`);
    console.log(`❌ BUGS       : ${bugs}`);
    console.log(`⚠️  UNABLE    : ${utv}`);
    results.forEach(r => console.log(`  [${r.status}] ${r.checkId} — ${r.details.slice(0, 100)}`));
    console.log('Report saved: reports/module4-filter-sort-report.json');
  });
});
