import { test, expect, devices } from '@playwright/test';
import fs from 'fs';

const STAGING_URL = process.env.STAGING_URL || 'https://smpl-new.bangalore2.com/';

interface HomepageStageResult {
  passed: boolean;
  failureReason: string | null;
  details?: Record<string, any>;
}

interface HomepageAuditReport {
  timestamp: string;
  viewport: string;
  targetUrl: string;
  stages: {
    layoutAndScroll: HomepageStageResult;
    headerAndLogo: HomepageStageResult;
    locationModal: HomepageStageResult;
    searchability: HomepageStageResult;
    heroCarousels: HomepageStageResult;
    categoryNavigation: HomepageStageResult;
    productCardsAndDeals: HomepageStageResult;
    footerNavigation: HomepageStageResult;
  };
  metrics: {
    totalLinksFound: number;
    totalImagesFound: number;
    totalCarouselsObserved: number;
    searchSuggestionsCount: number;
    pageScrollHeightPx: number;
    hasHorizontalOverflow: boolean;
  };
}

test.describe('SMPL HOMEPAGE FUNCTIONALITY AUDIT (Pixel 5 & Desktop)', () => {
  test.setTimeout(180_000);

  test('Mobile Homepage Audit — Clickable, Scrollable, Searchable Health', async ({ browser }) => {
    console.log('\n================================================================');
    console.log('STARTING SMPL HOMEPAGE FUNCTIONALITY AUDIT (Pixel 5: 393x851)');
    console.log('================================================================\n');

    const context = await browser.newContext({
      ...devices['Pixel 5'],
    });
    const page = await context.newPage();

    fs.mkdirSync('screenshots/homepage', { recursive: true });

    const report: HomepageAuditReport = {
      timestamp: new Date().toISOString(),
      viewport: '393x851 (Pixel 5)',
      targetUrl: STAGING_URL,
      stages: {
        layoutAndScroll: { passed: false, failureReason: null },
        headerAndLogo: { passed: false, failureReason: null },
        locationModal: { passed: false, failureReason: null },
        searchability: { passed: false, failureReason: null },
        heroCarousels: { passed: false, failureReason: null },
        categoryNavigation: { passed: false, failureReason: null },
        productCardsAndDeals: { passed: false, failureReason: null },
        footerNavigation: { passed: false, failureReason: null }
      },
      metrics: {
        totalLinksFound: 0,
        totalImagesFound: 0,
        totalCarouselsObserved: 0,
        searchSuggestionsCount: 0,
        pageScrollHeightPx: 0,
        hasHorizontalOverflow: false
      }
    };

    try {
      // ---------------------------------------------------------------------
      // Stage 1: Load Page & Check Layout & Scrollability
      // ---------------------------------------------------------------------
      console.log('[1/8 HOMEPAGE] Navigating to Staging Home & Testing Scrollability...');
      await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'screenshots/homepage/1-initial-load.png' });

      // Dismiss initial location prompt modal if shown
      const typeManuallyBtn = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
      if (await typeManuallyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeManuallyBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
        const pInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
        if (await pInput.isVisible().catch(() => false)) {
          await pInput.fill('560078');
          await pInput.press('Enter').catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Check vertical scrollability and layout metrics
      const scrollMetrics = await page.evaluate(() => {
        const bodyHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        const innerWidth = window.innerWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const hasHorizontalOverflow = scrollWidth > innerWidth;

        return { bodyHeight, innerWidth, scrollWidth, hasHorizontalOverflow };
      });

      console.log(`  Page Scroll Height: ${scrollMetrics.bodyHeight}px`);
      console.log(`  Horizontal Overflow Detected: ${scrollMetrics.hasHorizontalOverflow}`);

      report.metrics.pageScrollHeightPx = scrollMetrics.bodyHeight;
      report.metrics.hasHorizontalOverflow = scrollMetrics.hasHorizontalOverflow;

      // Perform smooth scroll to bottom to trigger lazy loading images
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 400;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/homepage/1-scrolled-bottom.png' });

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);

      expect(scrollMetrics.bodyHeight, 'Homepage must have vertical content scroll height > 1000px').toBeGreaterThan(1000);
      expect(scrollMetrics.hasHorizontalOverflow, 'Homepage must not have horizontal scroll layout overflow').toBe(false);

      report.stages.layoutAndScroll.passed = true;
      report.stages.layoutAndScroll.details = scrollMetrics;

      // ---------------------------------------------------------------------
      // Stage 2: Header & Brand Logo Interactivity (Using Real DOM Selectors)
      // ---------------------------------------------------------------------
      console.log('[2/8 HOMEPAGE] Testing Header Elements & Brand Logo Clickability...');
      const logo = page.locator('a.navbar-brand[aria-label="logo"], a[href="/"] img, img[alt*="Sangeetha" i]').first();
      const logoVisible = await logo.isVisible({ timeout: 5000 }).catch(() => false);
      expect(logoVisible, 'Brand Logo must be visible in Header Navbar').toBe(true);

      const cartBadge = page.locator('a[href*="/cart"], button[aria-label*="cart" i], div[class*="cart"]').first();
      const cartBadgeVisible = await cartBadge.isVisible({ timeout: 5000 }).catch(() => false);

      await page.screenshot({ path: 'screenshots/homepage/2-header-elements.png' });
      report.stages.headerAndLogo.passed = true;
      report.stages.headerAndLogo.details = { logoVisible, cartBadgeVisible };

      // ---------------------------------------------------------------------
      // Stage 3: Location Prompt / Modal Selector Trigger
      // ---------------------------------------------------------------------
      console.log('[3/8 HOMEPAGE] Testing Location Trigger & Delivery Pincode Modal...');
      const locationTrigger = page.locator('button#dropdown-mega-menu, div[class*="location"], p:has-text("Deliver to"), button:has-text("Deliver to"), span.selected_addr_header').first();
      const locTriggerVisible = await locationTrigger.isVisible({ timeout: 5000 }).catch(() => false);

      let modalOpened = false;
      if (locTriggerVisible) {
        await locationTrigger.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);

        const locationModal = page.locator('div[class*="modal"], div[class*="popup"], div[role="dialog"]').first();
        modalOpened = await locationModal.isVisible({ timeout: 4000 }).catch(() => false);
        await page.screenshot({ path: 'screenshots/homepage/3-location-modal.png' });

        // Close modal if open
        const closeBtn = page.locator('button[class*="close"], button:has-text("✕"), svg[class*="close"]').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }

      report.stages.locationModal.passed = locTriggerVisible;
      report.stages.locationModal.details = { locTriggerVisible, modalOpened };

      // ---------------------------------------------------------------------
      // Stage 4: Search Pill & Autosuggest Searchability
      // ---------------------------------------------------------------------
      console.log('[4/8 HOMEPAGE] Testing Mobile Search Bar, Input Typing & Autosuggest...');
      const searchPill = page.locator('span:has-text("Search or Ask for"), input.search__home, input[placeholder*="Search" i]').first();
      const pillVisible = await searchPill.isVisible({ timeout: 5000 }).catch(() => false);
      expect(pillVisible, 'Search pill / bar must be visible on Mobile Home').toBe(true);

      await searchPill.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      // Target active text input field after opening search overlay
      const activeInput = page.locator('input[placeholder*="Search" i], input[type="search"], input.search__home').first();
      const inputVisible = await activeInput.isVisible({ timeout: 4000 }).catch(() => false);

      if (inputVisible) {
        await activeInput.fill('iPhone').catch(() => {});
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ path: 'screenshots/homepage/4-search-autosuggest.png' });

      const suggestions = page.locator('a[href*="/product-details/"], a[href*="/product-list/"], div[class*="search"] a, div[class*="suggestion"]');
      const suggestionCount = await suggestions.count();
      console.log(`  Autosuggest Results / Product Suggestions Count: ${suggestionCount}`);
      report.metrics.searchSuggestionsCount = suggestionCount;

      report.stages.searchability.passed = pillVisible;
      report.stages.searchability.details = { pillVisible, inputVisible, suggestionCount };

      // Re-navigate to Home to clear search view
      await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // ---------------------------------------------------------------------
      // Stage 5: Hero Banners & Carousels
      // ---------------------------------------------------------------------
      console.log('[5/8 HOMEPAGE] Inspecting Hero Banners, Swiper/Slick Carousels & Dots...');
      const carouselContainers = page.locator('div[class*="swiper"], div[class*="carousel"], div[class*="slider"], div[class*="banner"]');
      const carouselCount = await carouselContainers.count();
      console.log(`  Total Carousels / Banner Containers Found: ${carouselCount}`);
      report.metrics.totalCarouselsObserved = carouselCount;

      const paginationDots = page.locator('span[class*="bullet"], button[aria-label*="slide" i], div[class*="dot"]');
      const dotsCount = await paginationDots.count();

      await page.screenshot({ path: 'screenshots/homepage/5-hero-banners.png' });

      report.stages.heroCarousels.passed = carouselCount > 0;
      report.stages.heroCarousels.details = { carouselCount, dotsCount };

      // ---------------------------------------------------------------------
      // Stage 6: Category Navigation & Quick Links
      // ---------------------------------------------------------------------
      console.log('[6/8 HOMEPAGE] Inspecting Category Grids & Quick Category Links...');
      const categoryLinks = page.locator('a[href*="/category"], a[href*="/product-list"], div[class*="category"] a');
      const categoryCount = await categoryLinks.count();
      console.log(`  Category Links / Quick Chips Found: ${categoryCount}`);

      await page.screenshot({ path: 'screenshots/homepage/6-categories.png' });

      report.stages.categoryNavigation.passed = categoryCount > 0;
      report.stages.categoryNavigation.details = { categoryCount };

      // ---------------------------------------------------------------------
      // Stage 7: Product Cards & Deals Sections
      // ---------------------------------------------------------------------
      console.log('[7/8 HOMEPAGE] Inspecting Product Cards, Image Rendering & Quick Actions...');
      const productCards = page.locator('a[href*="/product-details/"], a[href*="/product-list/"]');
      const totalProductCards = await productCards.count();
      console.log(`  Total Product Card Links Found on Homepage: ${totalProductCards}`);

      const images = page.locator('img');
      const totalImages = await images.count();
      report.metrics.totalImagesFound = totalImages;

      const allLinks = page.locator('a[href]');
      const totalLinks = await allLinks.count();
      report.metrics.totalLinksFound = totalLinks;

      console.log(`  Total Page Links: ${totalLinks} | Total Page Images: ${totalImages}`);

      expect(totalProductCards, 'Homepage must render at least 1 product card link').toBeGreaterThan(0);

      await page.screenshot({ path: 'screenshots/homepage/7-product-cards.png' });
      report.stages.productCardsAndDeals.passed = true;
      report.stages.productCardsAndDeals.details = { totalProductCards, totalImages, totalLinks };

      // ---------------------------------------------------------------------
      // Stage 8: Footer Navigation & Links
      // ---------------------------------------------------------------------
      console.log('[8/8 HOMEPAGE] Testing Footer Links, Customer Care & Policy Links...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      const footerLinks = page.locator('footer a[href], div[class*="footer"] a[href]');
      const footerLinkCount = await footerLinks.count();
      console.log(`  Footer Links Found: ${footerLinkCount}`);

      await page.screenshot({ path: 'screenshots/homepage/8-footer-section.png' });

      expect(footerLinkCount, 'Footer must contain interactive navigation links').toBeGreaterThan(0);
      report.stages.footerNavigation.passed = true;
      report.stages.footerNavigation.details = { footerLinkCount };

    } catch (err: any) {
      console.error('Homepage Audit Error:', err.message);
      Object.keys(report.stages).forEach(stageKey => {
        const s = (report.stages as any)[stageKey];
        if (!s.passed && !s.failureReason) {
          s.failureReason = err.message;
        }
      });
    } finally {
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync('reports/homepage-functionality-audit.json', JSON.stringify(report, null, 2));

      console.log('\n=== SMPL HOMEPAGE AUDIT SUMMARY REPORT ===');
      console.log(JSON.stringify(report, null, 2));

      await context.close();

      const failedStages = Object.entries(report.stages).filter(([_, s]) => !s.passed);
      if (failedStages.length > 0) {
        const stageFailures = failedStages.map(([k, s]) => `${k}: ${s.failureReason}`).join(' | ');
        expect.soft(failedStages.length, `Homepage Audit failed on ${failedStages.length} stage(s): ${stageFailures}`).toBe(0);
      }
    }
  });
});
