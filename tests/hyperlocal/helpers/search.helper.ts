import { Page, Locator } from '@playwright/test';
import { dismissBlockingPopups } from './popup.helper';

/** Homepage inline search (desktop + some mobile layouts). */
export const SEARCH_INPUT_HOME = 'input.search__home';
/** Dedicated /search page input (common on mobile). */
export const SEARCH_INPUT_PAGE = 'input#search';
/** Combined — callers that only need a locator string. */
export const SEARCH_INPUT = `${SEARCH_INPUT_HOME}, ${SEARCH_INPUT_PAGE}`;

export const CLEAR_BUTTON = '.remove-searched';
export const RESULTS_DROPDOWN = '.header-filtered__result';
/** Homepage dropdown result items. */
export const RESULT_ITEMS = '.searched-list a[href*="/product-details/"], .header-filtered__result a[href*="/product-details/"], .searched-list li';
/** Fallback on dedicated /search page — scoped to main product links to avoid header/footer links. */
export const SEARCH_PAGE_RESULTS = [
  'main a[href*="/product-details/"]',
  '.searched-list a[href*="/product-details/"]',
  '.header-filtered__result a[href*="/product-details/"]',
  '.search-results-list a[href*="/product-details/"]',
  '.search_product_list a[href*="/product-details/"]',
  '.searched-product-list a[href*="/product-details/"]',
  'a[href*="/product-details/"]',
].join(', ');

const PDP_READY_LOCATORS = [
  { name: 'h3 "Check Delivery"', selector: 'h3:has-text("Check Delivery")' },
  { name: 'any "Check Delivery" text', selector: 'text=Check Delivery' },
  { name: '.delivery_web__input', selector: '.delivery_web__input' },
  { name: '.delivery_web__inputBox', selector: '.delivery_web__inputBox' },
  { name: '.delivery_link (mobile change)', selector: '.delivery_link' },
  { name: '"Deliver to" text (desktop/sticky)', selector: 'text=/Deliver to/i' },
] as const;

const PDP_HYDRATION_LOCATORS = [
  { name: 'Add to Cart button', selector: 'button:has-text("Add to Cart")' },
  { name: 'Buy Now button', selector: 'button:has-text("Buy Now")' },
  { name: 'product price (₹)', selector: 'text=/₹[\\d,]+/' },
] as const;

export interface ResultSummary {
  text: string;
  href: string | null;
  imgStillLoading: boolean;
}

export interface SearchResultState {
  gotResults: boolean;
  responseMs: number;
}

export interface OpenResultState {
  navigated: boolean;
  navigationMs: number | null;
  notFound?: boolean;
  errorMessage?: string;
  pageUrl?: string;
  pageTitle?: string;
}

export interface PdpReadyState {
  ready: boolean;
  matchedLocator?: string;
  failureReason?: string;
}

function logOpenResult(message: string): void {
  console.log(`    [openResult] ${message}`);
}

function logSearch(message: string): void {
  console.log(`    [search] ${message}`);
}

/**
 * Reads a locator's innerText, waiting for it to stop changing before
 * returning. Search result cards can still be hydrating (image/price/title
 * loading in) at the exact moment we read them — a single innerText() call
 * can catch a result mid-render (empty or partial text), which makes a
 * genuinely matching product look like a mismatch. This polls until two
 * consecutive reads agree (or a small budget runs out), so token matching
 * runs against settled text instead of a race-prone snapshot.
 */
async function getStableInnerText(
  locator: Locator,
  maxWaitMs = 1500,
  intervalMs = 150
): Promise<string> {
  let previous = (await locator.innerText().catch(() => '')).trim();
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const current = (await locator.innerText().catch(() => '')).trim();
    if (current === previous && current.length > 0) {
      return current;
    }
    previous = current;
  }

  return previous;
}

/** Finds a visible search input, navigating to /search on mobile layouts if needed. */
async function resolveSearchInput(page: Page, timeoutMs: number): Promise<Locator> {
  const homeInput = page.locator(SEARCH_INPUT_HOME).first();
  const pageInput = page.locator(SEARCH_INPUT_PAGE).first();

  if (await pageInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    logSearch(`found search page input: ${SEARCH_INPUT_PAGE}`);
    return pageInput;
  }

  if (await homeInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    logSearch(`found homepage input: ${SEARCH_INPUT_HOME}`);
    await homeInput.click({ timeout: timeoutMs }).catch(() => { });
    await page.waitForURL(/\/search/, { timeout: 3_000 }).catch(() => { });
    await page.waitForLoadState('domcontentloaded').catch(() => { });
    await page.waitForTimeout(500);
  }

  const input = page.locator(SEARCH_INPUT).first();
  await input.waitFor({ state: 'visible', timeout: timeoutMs });
  return input;
}

export async function searchFor(page: Page, query: string, timeoutMs = 15_000): Promise<SearchResultState> {
  const start = Date.now();
  const base = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL : `${process.env.BASE_URL}/`) : 'https://www.sangeetha.com/';
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: timeoutMs }).catch(() => { });
  await dismissBlockingPopups(page).catch(() => { });

  logSearch(`typing query into live search box: "${query}"`);
  const input = page.locator(SEARCH_INPUT_HOME).first();
  const inputReady = await input.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);

  if (!inputReady) {
    logSearch('homepage search input not visible');
    return { gotResults: false, responseMs: Date.now() - start };
  }

  await input.click({ timeout: timeoutMs }).catch(() => { });
  await input.fill('', { timeout: timeoutMs }).catch(() => { });
  // Type only — never press Enter. Enter navigates to /search, a separate,
  // broken backend that returns false negatives even for confirmed-existing
  // products. Clicking the dropdown suggestion directly works correctly.
  await input.pressSequentially(query, { delay: 40, timeout: timeoutMs }).catch(() => { });

  const visible = await page.locator(RESULT_ITEMS).first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);

  const dropdownCount = await page.locator(RESULT_ITEMS).count().catch(() => 0);
  logSearch(`live dropdown visible: ${visible} (items: ${dropdownCount})`);

  return { gotResults: visible, responseMs: Date.now() - start };
}

export async function waitForSearchResults(
  page: Page,
  timeoutMs = 15_000
): Promise<{ visible: boolean; dropdownCount: number; searchPageLinkCount: number }> {
  const firstDropdown = page.locator(RESULT_ITEMS).first();
  const firstPageLink = page.locator(SEARCH_PAGE_RESULTS).first();

  let visible = await firstDropdown
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    await page.waitForURL(/\/search/, { timeout: timeoutMs }).catch(() => { });
    await page.waitForLoadState('domcontentloaded').catch(() => { });
    visible = await firstPageLink
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
  }

  const dropdownCount = await page.locator(RESULT_ITEMS).count().catch(() => 0);
  const searchPageLinkCount = await page.locator(SEARCH_PAGE_RESULTS).count().catch(() => 0);

  return { visible, dropdownCount, searchPageLinkCount };
}

export function getResultItems(page: Page) {
  const dropdown = page.locator(RESULT_ITEMS);
  return dropdown;
}

/** Returns the best locator for clickable search results on the current page. */
export function getClickableResults(page: Page) {
  return page.locator(`${RESULT_ITEMS}, ${SEARCH_PAGE_RESULTS}`);
}

export async function getResultSummaries(page: Page): Promise<ResultSummary[]> {
  const items = getResultItems(page);
  const count = await items.count();

  const summaries: ResultSummary[] = [];
  for (let index = 0; index < count; index++) {
    const item = items.nth(index);
    const text = (await item.innerText().catch(() => '')).trim();
    const href = await item.getAttribute('href').catch(() => null);
    const img = item.locator('img').first();
    const imgClass = await img.getAttribute('class').catch(() => null);
    const imgStillLoading = (imgClass ?? '').includes('imgloading');

    summaries.push({ text, href, imgStillLoading });
  }

  return summaries;
}

const COMBINED_PDP_READY_SELECTOR = [
  'h1',
  '.product-details',
  '.product_details',
  'h3:has-text("Check Delivery")',
  'text=/Check Delivery/i',
  '.delivery_web__input',
  '.delivery_web__inputBox',
  '.delivery_link',
  'text=/Deliver to/i',
  'button:has-text("Add to Cart")',
  'button:has-text("Buy Now")',
  'text=/Get delivery in/i',
  'text=/delivery by/i',
  'input[placeholder*="Pincode" i]',
  '.details-text',
].join(', ');

export async function isApplicationErrorPage(page: Page): Promise<boolean> {
  return page.getByText(/application error/i).isVisible().catch(() => false);
}

export async function checkPdpReady(page: Page, timeoutMs = 15_000): Promise<PdpReadyState> {
  if (await isApplicationErrorPage(page)) {
    return { ready: false, failureReason: 'Application error page detected (client-side exception)' };
  }

  if (!page.url().includes('/product-details/')) {
    return { ready: false, failureReason: `URL is not a product details page: ${page.url()}` };
  }

  await page.waitForLoadState('domcontentloaded').catch(() => { });

  const pdpSelectors = [
    '.delivery_link',
    '.delivery_web__input',
    '.delivery_web__inputBox',
    'h3:has-text("Check Delivery")',
    'text=/Check Delivery/i',
    'button:has-text("Add to Cart")',
    'button:has-text("Buy Now")',
    '.details-text',
    'h1',
  ];

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    for (const selector of pdpSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        logOpenResult(`PDP ready matched locator: ${selector}`);
        return { ready: true, matchedLocator: selector };
      }
    }
    await page.waitForTimeout(500);
  }

  const pageTitle = await page.title().catch(() => '(unknown)');
  return {
    ready: false,
    failureReason: `None of the PDP delivery locators became visible within ${timeoutMs}ms (title: ${pageTitle}).`,
  };
}

export async function isPdpReady(page: Page, timeoutMs = 10_000): Promise<boolean> {
  return (await checkPdpReady(page, timeoutMs)).ready;
}

export async function openResult(page: Page, index = 0, timeoutMs = 15_000, query?: string): Promise<OpenResultState> {
  const start = Date.now();
  const clickableResults = getClickableResults(page);
  const count = await clickableResults.count();

  if (count === 0) {
    const pageUrl = page.url();
    const pageTitle = await page.title().catch(() => '(unknown)');
    return {
      navigated: false,
      navigationMs: null,
      errorMessage: 'No search results available to open',
      pageUrl,
      pageTitle,
    };
  }

  let targetIndex = index;
  if (targetIndex === 0 && count >= 1 && query && query.trim().length > 0) {
    // Token matching runs regardless of result count (previously skipped
    // when count === 1, letting a lone mismatched result through unchecked).
    // Each candidate's text is read via getStableInnerText so a result still
    // mid-hydration doesn't get judged on partial/empty text and wrongly
    // flagged as NOT_FOUND.
    const queryTokens = (query ?? '').trim().split(/\s+/).filter(Boolean);
    let matchedIndex: number | null = null;

    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await getStableInnerText(clickableResults.nth(i));
      if (text.length <= 5) continue;

      if (queryTokens.length > 0) {
        const lowerText = text.toLowerCase();
        const allTokensMatch = queryTokens.every((token) => {
          const lowerToken = token.toLowerCase();
          if (/^\d+$/.test(token)) {
            // whole-word numeric match only — "15" must not match inside "17", "150",
            // or "16e" (the previous regex only blocked digit neighbors, so "16"
            // matched inside "16e" and clicked the wrong product on desktop)
            return new RegExp(`(?<![\\d.])${lowerToken}(?![\\d.a-z])`).test(lowerText);
          }
          return lowerText.includes(lowerToken);
        });
        if (allTokensMatch) {
          matchedIndex = i;
          break;
        }
      }
    }

    if (matchedIndex !== null) {
      targetIndex = matchedIndex;
    } else {
      const pageUrl = page.url();
      const pageTitle = await page.title().catch(() => '(unknown)');
      logOpenResult(`NOT_FOUND: No search result matched query "${query ?? ''}" among top 10 results.`);
      return {
        navigated: false,
        navigationMs: null,
        notFound: true,
        errorMessage: `Product search mismatch / unindexed SKU: No search result matched query "${query ?? ''}" (found ${count} results)`,
        pageUrl,
        pageTitle,
      };
    }
  }

  const result = clickableResults.nth(targetIndex);
  const text = (await result.innerText().catch(() => '')).trim();
  const targetHref = await result.getAttribute('href').catch(() => null);
  logOpenResult(`clicking search result [${targetIndex}] — text: "${text.replace(/\s+/g, ' ')}"`);
  logOpenResult(`target href: ${targetHref}`);

  try {
    const link = result.locator('a[href*="/product-details/"]').first();
    const hasNestedLink = (await link.count()) > 0;
    const clickTarget = hasNestedLink ? link : result;

    logOpenResult(hasNestedLink ? 'using nested product-details link' : `using result row (${RESULT_ITEMS})`);
    const base = process.env.BASE_URL ? (process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL.slice(0, -1) : process.env.BASE_URL) : 'https://www.sangeetha.com';
    await clickTarget.click({ timeout: 5000, force: true }).catch(async () => {
      if (targetHref) await page.goto(targetHref.startsWith('http') ? targetHref : `${base}${targetHref}`);
    });
    logOpenResult('click dispatched — waiting for /product-details/ navigation');

    const urlChanged = await page
      .waitForURL(/\/product-details\//, { timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);

    const pageUrl = page.url();
    const pageTitle = await page.title().catch(() => '(unknown)');
    logOpenResult(`urlChanged: ${urlChanged} | URL: ${pageUrl} | title: ${pageTitle}`);

    if (!urlChanged) {
      return {
        navigated: false,
        navigationMs: null,
        errorMessage: `Navigation timeout: URL did not change to /product-details/ within ${timeoutMs}ms (current: ${pageUrl})`,
        pageUrl,
        pageTitle,
      };
    }

    await page.waitForLoadState('domcontentloaded').catch(() => { });

    const pdpState = await checkPdpReady(page, timeoutMs);
    if (!pdpState.ready) {
      return {
        navigated: false,
        navigationMs: Date.now() - start,
        errorMessage: pdpState.failureReason ?? 'PDP readiness check failed',
        pageUrl,
        pageTitle,
      };
    }

    logOpenResult(`PDP ready — matched: ${pdpState.matchedLocator}`);
    return { navigated: true, navigationMs: Date.now() - start, pageUrl, pageTitle };
  } catch (err) {
    const pageUrl = page.url();
    const pageTitle = await page.title().catch(() => '(unknown)');
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    logOpenResult(`exception: ${message}`);
    if (stack) logOpenResult(stack);

    return {
      navigated: false,
      navigationMs: null,
      errorMessage: stack ? `${message}\n${stack}` : message,
      pageUrl,
      pageTitle,
    };
  }
}