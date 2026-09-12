import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import { setPincodeViaLocalStorage, verifyPincodeApplied } from './pincode-injection.helper';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';
const DEFAULT_PINCODE = process.env.PINCODE || '560078';

test.use({
  ...devices['Pixel 5'],
});

test.describe('Module 2: Category & PLP Listing Pages (Mobile Pixel 5 with LocalStorage Pincode Injection)', () => {
  test.setTimeout(240000);

  test('Module 2 Full Mobile Functional QA Pass with Injected Pincode & API Intercept', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];
    const apiInterceptLogs: Array<{ url: string; status: number; contentType: string; bodySnippet: string }> = [];

    // Inject pincode directly into localStorage BEFORE any script executes
    await setPincodeViaLocalStorage(page, DEFAULT_PINCODE, 'Bengaluru');

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Console Error] ${msg.text()}`);
    });

    page.on('requestfailed', req => {
      networkFailures.push(`[Request Failed] ${req.failure()?.errorText || 'Unknown'} - ${req.url()}`);
    });

    page.on('response', async resp => {
      const url = resp.url();
      const status = resp.status();

      if (status >= 400) networkFailures.push(`[Network ${status}] ${url}`);

      const isApiCall = (
        url.includes('/api/') ||
        url.includes('/v1/') ||
        url.includes('/v2/') ||
        url.includes('graphql') ||
        url.includes('product') ||
        url.includes('catalog') ||
        url.includes('availability') ||
        url.includes('location') ||
        url.includes('pincode')
      ) && !url.includes('_next/image') && !/\.(png|jpg|jpeg|svg|css|js|woff2)(\?.*)?$/i.test(url);

      if (isApiCall) {
        try {
          const contentType = resp.headers()['content-type'] || '';
          let bodySnippet = '[Binary / Non-text Content]';

          if (contentType.includes('application/json') || contentType.includes('text/')) {
            const rawText = await resp.text().catch(() => '');
            bodySnippet = rawText.slice(0, 300).replace(/\s+/g, ' ');
          }

          apiInterceptLogs.push({ url, status, contentType, bodySnippet });
          console.log(`[API Intercept] [${status}] ${url} => ${bodySnippet.slice(0, 150)}`);
        } catch (err) {}
      }
    });

    console.log('[Module 2] Step 1: Navigating to Staging Home with injected pincode...');
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const homePincodeStatus = await verifyPincodeApplied(page, DEFAULT_PINCODE);
    console.log(`[Home] pincode in localStorage: ${homePincodeStatus.localStorageOk}, visible in UI: ${homePincodeStatus.uiOk}`);

    const categoryLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
      const found: { text: string; href: string }[] = [];
      const seen = new Set<string>();

      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const text = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
        if ((href.includes('/product-list/') || href.includes('/category/')) && !seen.has(href)) {
          seen.add(href);
          found.push({ text: text || 'Category Link', href });
        }
      }
      return found;
    });

    console.log(`[Module 2] Found ${categoryLinks.length} category/PLP links on home.`);

    const testResults: Array<{
      checkId: string;
      categoryName: string;
      url: string;
      status: 'PASS' | 'CONFIRMED BUG' | 'BLOCKED' | 'NOT APPLICABLE' | 'UNABLE TO VERIFY';
      details: string;
      evidenceScreenshot?: string;
    }> = [];

    // Check 1: Navigating via Mobile Drawer Menu
    console.log('[Module 2] Check 1: Testing Mobile Menu/Hamburger Category Navigation...');
    const menuIcons = page.locator('header svg, header button');
    const menuCount = await menuIcons.count();
    let hamburgerOpened = false;
    let openedMenuText = '';

    for (let i = 0; i < menuCount; i++) {
      const btn = menuIcons.nth(i);
      if (await btn.isVisible()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(1000);
        const drawerVisible = await page.locator('div[class*="drawer"], div[class*="menu"], div[class*="sidebar"], nav').first().isVisible().catch(() => false);
        if (drawerVisible) {
          hamburgerOpened = true;
          openedMenuText = await page.locator('div[class*="drawer"], nav').first().innerText().catch(() => '');
          break;
        }
      }
    }

    testResults.push({
      checkId: 'MOD2-NAV-01',
      categoryName: 'Mobile Navigation Drawer',
      url: page.url(),
      status: hamburgerOpened ? 'PASS' : 'CONFIRMED BUG',
      details: hamburgerOpened ? `Mobile drawer menu opened successfully. Content preview: ${openedMenuText.slice(0, 100)}` : 'Mobile hamburger menu button did not open a category drawer or sidebar.',
    });

    const categoriesToTest = [
      { text: 'Malformed Chip Link (laout-19)', href: '/product-list/laout-19-683' },
      { text: 'Smartphones Category', href: '/product-list/category-smartphones-308' },
      { text: 'Smart Watches Category', href: '/product-list/category-smart-watches-31' },
      { text: 'Mobile Accessories Category', href: '/product-list/category-mobile-accessories-17' },
      { text: 'Laptops Category', href: '/product-list/category-laptops-19' },
    ];

    let index = 0;
    for (const cat of categoriesToTest) {
      index++;
      const fullUrl = new URL(cat.href, STAGING_URL).toString();
      console.log(`\n[Module 2] Testing Category ${index}/${categoriesToTest.length}: ${cat.text} (${fullUrl})`);

      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);

      const pincodeStatus = await verifyPincodeApplied(page, DEFAULT_PINCODE);
      console.log(`[${cat.text}] pincode in localStorage: ${pincodeStatus.localStorageOk}, visible in UI: ${pincodeStatus.uiOk}`);

      const currentUrl = page.url();
      const pageTitle = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText);

      const is404 = bodyText.includes('404') || bodyText.includes('This page could not be found') || pageTitle.includes('404');
      const isBlank = bodyText.trim().length < 50;

      if (is404) {
        const ssPath = `screenshots/mod2-api-404-cat-${index}.png`;
        await page.screenshot({ path: ssPath, fullPage: true });
        testResults.push({
          checkId: `MOD2-PLP-LOAD-0${index}`,
          categoryName: cat.text,
          url: currentUrl,
          status: 'CONFIRMED BUG',
          details: `Category link "${cat.text}" (${cat.href}) resolved to a 404 Not Found error page.`,
          evidenceScreenshot: ssPath,
        });
        continue;
      }

      if (isBlank) {
        const ssPath = `screenshots/mod2-api-blank-cat-${index}.png`;
        await page.screenshot({ path: ssPath, fullPage: true });
        testResults.push({
          checkId: `MOD2-PLP-LOAD-0${index}`,
          categoryName: cat.text,
          url: currentUrl,
          status: 'CONFIRMED BUG',
          details: `Category page "${cat.text}" loaded a blank or broken screen.`,
          evidenceScreenshot: ssPath,
        });
        continue;
      }

      const productCards = page.locator('a[href*="/product-details/"], div[class*="product-card"], div[class*="ProductCard"], div[class*="card"]');
      const cardCount = await productCards.count();

      console.log(`[${cat.text}] product cards found: ${cardCount}`);

      const ssPath = `screenshots/mod2-api-cat-${index}.png`;
      await page.screenshot({ path: ssPath });

      testResults.push({
        checkId: `MOD2-PLP-CARD-0${index}`,
        categoryName: cat.text,
        url: currentUrl,
        status: cardCount > 0 ? 'PASS' : 'CONFIRMED BUG',
        details: cardCount > 0
          ? `Category PLP loaded with injected pincode (${DEFAULT_PINCODE}). Found ${cardCount} product cards displayed.`
          : `Category PLP loaded at ${currentUrl} with injected pincode ${DEFAULT_PINCODE} (localStorageOk: ${pincodeStatus.localStorageOk}, uiOk: ${pincodeStatus.uiOk}), but displayed ZERO product cards. Body text snippet: "${bodyText.slice(0, 150).replace(/\s+/g, ' ')}".`,
        evidenceScreenshot: ssPath,
      });
    }

    const reportData = {
      module: 'Module 2: Category / Product Listing pages (PLP) with LocalStorage Pincode Injection',
      environment: 'Staging (Mobile Pixel 5)',
      stagingUrl: STAGING_URL,
      pincodeUsed: DEFAULT_PINCODE,
      results: testResults,
      apiInterceptLogs,
      consoleErrors,
      networkFailures,
    };

    fs.mkdirSync('reports', { recursive: true });
    fs.mkdirSync('screenshots', { recursive: true });
    fs.writeFileSync('reports/module2-plp-report.json', JSON.stringify(reportData, null, 2));

    console.log('\n================ MODULE 2 RESULTS SUMMARY ================');
    console.log(JSON.stringify(reportData, null, 2));
  });
});
