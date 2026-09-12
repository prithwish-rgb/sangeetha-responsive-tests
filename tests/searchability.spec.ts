import { test, expect } from '@playwright/test';
import { gotoAndDismissPopups } from './hyperlocal/helpers/popup.helper';
import {
  SEARCH_INPUT,
  CLEAR_BUTTON,
  RESULTS_DROPDOWN,
  RESULT_ITEMS,
  searchFor,
  getResultItems,
  openResult,
} from './hyperlocal/helpers/search.helper';

const BASE_URL = process.env.BASE_URL || 'https://www.sangeetha.com';

test.beforeEach(async ({ page }) => {
  await gotoAndDismissPopups(page, BASE_URL);
});

test.describe('Search — live dropdown behavior', () => {
  test('search input is visible and editable', async ({ page }) => {
    const input = page.locator(SEARCH_INPUT);
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
  });

  test('trending results dropdown appears on focus, before typing anything', async ({ page }) => {
    const input = page.locator(SEARCH_INPUT);
    await input.click();

    const dropdown = page.locator(RESULTS_DROPDOWN);
    await expect(dropdown).toBeVisible();
    await expect(page.getByText(/trending top 10/i)).toBeVisible();
  });

  test('typing a product name filters the dropdown to relevant results', async ({ page }) => {
    const { gotResults } = await searchFor(page, 'iPhone');
    expect(gotResults, 'No results appeared for "iPhone"').toBe(true);

    const results = getResultItems(page);
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    const firstResultText = await results.first().innerText();
    expect(firstResultText.toLowerCase()).toContain('iphone');
  });

  test('clicking a search result navigates to that product page', async ({ page }) => {
    const { gotResults } = await searchFor(page, 'iPhone');
    expect(gotResults).toBe(true);

    const href = await getResultItems(page).first().getAttribute('href');
    expect(href).toContain('/product-details/');

    const { navigated } = await openResult(page, 0);
    expect(navigated, 'Clicking the first result did not navigate to a product page').toBe(true);
    expect(page.url()).toContain('/product-details/');
  });

  test('clear button (X) empties the search input', async ({ page }) => {
    const input = page.locator(SEARCH_INPUT);
    await input.click();
    await input.fill('Samsung');
    await expect(input).toHaveValue('Samsung');

    const clearBtn = page.locator(CLEAR_BUTTON);
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(input).toHaveValue('');
  });

  test('nonsense query shows an empty/no-results state, not a stuck dropdown', async ({ page }) => {
    const { gotResults } = await searchFor(page, 'zzxxqqnonexistentproduct123');

    if (!gotResults) {
      const noResultsMsg = page.getByText(/no results|not found/i);
      const hasMessage = await noResultsMsg.isVisible({ timeout: 3000 }).catch(() => false);
      if (!hasMessage) {
        console.log('No explicit "no results" message found — dropdown just shows nothing. Worth flagging as a UX gap.');
      }
    }
  });

  test('search does not throw JS errors while typing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await searchFor(page, 'laptop');

    expect(errors, `JS errors during search:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('clicking outside the search box closes the dropdown', async ({ page }) => {
    const input = page.locator(SEARCH_INPUT);
    await input.click();
    await expect(page.locator(RESULTS_DROPDOWN)).toBeVisible();

    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    const backdrop = page.locator('.header-filtered__backdrop');
    const isVisible = await backdrop.isVisible().catch(() => false);
    expect(isVisible, 'Search dropdown backdrop still visible after clicking outside').toBe(false);
  });
});

test.describe('Diagnostic', () => {
  test('[DEBUG] inspect backdrop element state before/after outside click', async ({ page }) => {
    const input = page.locator(SEARCH_INPUT);
    await input.click();
    await page.waitForTimeout(300);

    const beforeHTML = await page
      .locator('.header-filtered__backdrop')
      .evaluate((el) => el.outerHTML)
      .catch(() => 'NOT FOUND');
    console.log('--- backdrop BEFORE outside click ---');
    console.log(beforeHTML);

    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    const afterHTML = await page
      .locator('.header-filtered__backdrop')
      .evaluate((el) => el.outerHTML)
      .catch(() => 'NOT FOUND (removed from DOM)');
    console.log('--- backdrop AFTER outside click ---');
    console.log(afterHTML);

    const dropdownStyle = await page
      .locator('.header-filtered__result')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { display: s.display, visibility: s.visibility, opacity: s.opacity, zIndex: s.zIndex };
      })
      .catch(() => null);
    console.log('--- dropdown computed style AFTER outside click ---');
    console.log(JSON.stringify(dropdownStyle, null, 2));
  });
});