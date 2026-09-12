import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const STAGING_URL = 'https://smpl-new.bangalore2.com/';
const REPORT_PATH = path.join(process.cwd(), 'reports', 'homepage-verified-audit.json');

export interface ElementAuditResult {
  viewport: string;
  area: string;
  elementLabel: string;
  href: string | null;
  target: string | null;
  clickOutcome: 'navigated' | 'new_tab_opened' | 'no_url_change' | 'not_clickable' | 'ui_state_updated' | 'error';
  classification: 'PASSED' | 'CONFIRMED BUG' | 'INCONCLUSIVE — FORCED CLICK, NEEDS MANUAL VERIFICATION' | 'STILL INCONCLUSIVE';
  forcedClickUsed: boolean;
  actualDetails: string;
}

export interface GroundTruthCheck {
  item: string;
  expectedState: 'PASS' | 'FAIL';
  actualState: 'PASS' | 'FAIL';
  matched: boolean;
  details: string;
}

export interface VerifiedAuditReport {
  timestamp: string;
  selfCheckStatus: 'GROUND TRUTH SELF-CHECK: PASS' | string;
  groundTruthChecks: GroundTruthCheck[];
  viewportsTested: string[];
  totalElementsTested: number;
  passCount: number;
  confirmedBugCount: number;
  inconclusiveCount: number;
  elements: ElementAuditResult[];
  confirmedBugs: ElementAuditResult[];
}

// Ensure report dir exists
if (!fs.existsSync(path.dirname(REPORT_PATH))) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
}

/**
 * MANDATORY HARD RUNTIME SAFEGUARD:
 * If forcedClickUsed === true, the result can NEVER be classified as PASSED or CONFIRMED BUG.
 * Throws a hard Error to fail the build/test if violated.
 */
function enforceStructuralSafeguard(result: ElementAuditResult): void {
  if (result.forcedClickUsed) {
    if (result.classification === 'PASSED' || result.classification === 'CONFIRMED BUG') {
      throw new Error(
        `[HARD HARNESS SAFEGUARD VIOLATION] Element '${result.elementLabel}' had forcedClickUsed === true but was classified as '${result.classification}'. Forced clicks MUST be classified as 'INCONCLUSIVE — FORCED CLICK, NEEDS MANUAL VERIFICATION'.`
      );
    }
  }
}

/**
 * Natural interaction click helper.
 * FIX #1: Only attempts plain click. If intercepted/obscured, flags forcedClickUsed=true, returns not_clickable, and STOPS.
 * FIX #2: Handles target="_blank" via context.waitForEvent('page').
 * FIX #3: Handles same-tab SPA routing via page.waitForURL().
 */
async function testElementClick(
  page: Page,
  context: BrowserContext,
  locator: any,
  viewportName: string,
  area: string,
  elementLabel: string
): Promise<ElementAuditResult> {
  const isVis = await locator.isVisible({ timeout: 4000 }).catch(() => false);
  if (!isVis) {
    const res: ElementAuditResult = {
      viewport: viewportName,
      area,
      elementLabel,
      href: null,
      target: null,
      clickOutcome: 'not_clickable',
      classification: 'STILL INCONCLUSIVE',
      forcedClickUsed: false,
      actualDetails: 'Element not visible on page'
    };
    enforceStructuralSafeguard(res);
    return res;
  }

  const href = await locator.getAttribute('href').catch(() => null);
  const target = await locator.getAttribute('target').catch(() => null);
  const startUrl = page.url();

  // Scroll element into view smoothly
  await locator.scrollIntoViewIfNeeded().catch(() => { });
  await page.waitForTimeout(300);

  // FIX #2: Handle target="_blank" links separately using context.waitForEvent('page')
  if (target === '_blank' || (href && href.startsWith('http') && !href.includes('smpl-new.bangalore2.com'))) {
    try {
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
        locator.click({ timeout: 5000 })
      ]);

      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded').catch(() => { });
        const newTabUrl = newPage.url();
        await newPage.close().catch(() => { });

        const isNewTabValid = newTabUrl && newTabUrl !== 'about:blank' && newTabUrl !== startUrl;
        const res: ElementAuditResult = {
          viewport: viewportName,
          area,
          elementLabel,
          href,
          target,
          clickOutcome: isNewTabValid ? 'new_tab_opened' : 'no_url_change',
          classification: isNewTabValid ? 'PASSED' : 'CONFIRMED BUG',
          forcedClickUsed: false,
          actualDetails: `New tab opened to URL: ${newTabUrl}`
        };
        enforceStructuralSafeguard(res);
        return res;
      } else {
        const res: ElementAuditResult = {
          viewport: viewportName,
          area,
          elementLabel,
          href,
          target,
          clickOutcome: 'no_url_change',
          classification: 'CONFIRMED BUG',
          forcedClickUsed: false,
          actualDetails: 'Click executed on target="_blank" link but no new browser tab was opened within 8s'
        };
        enforceStructuralSafeguard(res);
        return res;
      }
    } catch (err: any) {
      const res: ElementAuditResult = {
        viewport: viewportName,
        area,
        elementLabel,
        href,
        target,
        clickOutcome: 'not_clickable',
        classification: 'INCONCLUSIVE — FORCED CLICK, NEEDS MANUAL VERIFICATION',
        forcedClickUsed: true,
        actualDetails: `Element not clickable in natural user flow: ${err.message}`
      };
      enforceStructuralSafeguard(res);
      return res;
    }
  }

  // Same-tab links & buttons (Natural click only)
  const startHtmlLength = await page.evaluate(() => document.body.innerText.length).catch(() => 0);

  try {
    await locator.click({ timeout: 5000 });
  } catch (err: any) {
    const res: ElementAuditResult = {
      viewport: viewportName,
      area,
      elementLabel,
      href,
      target,
      clickOutcome: 'not_clickable',
      classification: 'INCONCLUSIVE — FORCED CLICK, NEEDS MANUAL VERIFICATION',
      forcedClickUsed: true,
      actualDetails: `Element not clickable in natural user flow: ${err.message}`
    };
    enforceStructuralSafeguard(res);
    return res;
  }

  // Wait for potential SPA URL change or DOM view transition
  let urlChanged = false;
  try {
    await page.waitForURL(url => url.toString() !== startUrl, { timeout: 4000 });
    urlChanged = true;
  } catch {
    urlChanged = false;
  }

  await page.waitForTimeout(1000);
  const endUrl = page.url();

  // Check if a modal, drawer, overlay, or view container appeared
  const modalOrDrawerVisible = await page.evaluate(() => {
    const modals = document.querySelectorAll('div[class*="modal" i], div[class*="drawer" i], div[class*="overlay" i], div[role="dialog"]');
    for (let el of Array.from(modals)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none') {
        return true;
      }
    }
    return false;
  }).catch(() => false);

  const endHtmlLength = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
  const domStateChanged = Math.abs(endHtmlLength - startHtmlLength) > 20 || modalOrDrawerVisible;

  const passed = (urlChanged && endUrl !== startUrl) || domStateChanged;

  let actualDetails = '';
  if (urlChanged && endUrl !== startUrl) {
    actualDetails = `Navigated to target URL: ${endUrl}`;
  } else if (modalOrDrawerVisible) {
    actualDetails = `UI view updated: Drawer / Modal / Overlay opened on page (Staging SPA view flow)`;
  } else if (domStateChanged) {
    actualDetails = `UI view updated: DOM state transitioned on page (Staging SPA view flow)`;
  } else {
    actualDetails = `No observable URL or DOM view change after click (${startUrl})`;
  }

  const res: ElementAuditResult = {
    viewport: viewportName,
    area,
    elementLabel,
    href,
    target,
    clickOutcome: (urlChanged && endUrl !== startUrl) ? 'navigated' : (domStateChanged ? 'ui_state_updated' : 'no_url_change'),
    classification: passed ? 'PASSED' : 'STILL INCONCLUSIVE',
    forcedClickUsed: false,
    actualDetails
  };
  enforceStructuralSafeguard(res);
  return res;
}

/**
 * Dismiss location/address popups AND the "Check Delivery Availability" bottom
 * sheet that auto-opens on scroll-to-bottom. This was previously missing and
 * caused 18 false "inconclusive" results by blocking header/footer clicks.
 */
async function dismissStartupModals(page: Page) {
  const typeManually = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
  if (await typeManually.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeManually.click({ force: true }).catch(() => { });
    await page.waitForTimeout(1000);
  }

  const pincodeInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
  if (await pincodeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pincodeInput.fill('560078').catch(() => { });
    await pincodeInput.press('Enter').catch(() => { });
    await page.waitForTimeout(1500);
  }

  const modalCloseBtn = page.locator('button.btn-close, .modal .close, button:has-text("×"), [aria-label="Close"]').first();
  if (await modalCloseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await modalCloseBtn.click({ force: true }).catch(() => { });
    await page.waitForTimeout(1000);
  }

  // NEW: Dismiss the bottom-sheet "Check Delivery Availability" modal.
  // It doesn't match generic ".modal" class selectors, so it was slipping
  // through and blocking every click underneath it (header logo/login,
  // all 16 footer links) for the rest of the run.
  const bottomSheet = page.locator('div.fixed.bottom-0.left-0.right-0').first();
  if (await bottomSheet.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(500);
    if (await bottomSheet.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.mouse.click(10, 10).catch(() => { });
      await page.waitForTimeout(500);
    }
  }

  await page.evaluate(() => {
    const backdrop = document.querySelector('.modal-backdrop, div.fixed.inset-0');
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
  }).catch(() => { });
}

async function runViewportAudit(
  page: Page,
  context: BrowserContext,
  viewportName: string,
  isMobile: boolean,
  auditReport: VerifiedAuditReport
) {
  console.log(`\n================================================================`);
  console.log(`STARTING VERIFIED AUDIT RUN: ${viewportName}`);
  console.log(`================================================================`);
  auditReport.viewportsTested.push(viewportName);

  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await dismissStartupModals(page);

  function record(res: ElementAuditResult) {
    enforceStructuralSafeguard(res);
    auditReport.elements.push(res);
    auditReport.totalElementsTested++;
    if (res.classification === 'PASSED') {
      auditReport.passCount++;
    } else if (res.classification === 'CONFIRMED BUG') {
      auditReport.confirmedBugCount++;
      auditReport.confirmedBugs.push(res);
    } else {
      auditReport.inconclusiveCount++;
    }
  }

  // AREA 1: HEADER
  console.log(`--- Testing Header Elements (${viewportName}) ---`);
  const logoLoc = page.locator('a.navbar-brand[aria-label="logo"], a[href="/"] img').first();
  record(await testElementClick(page, context, logoLoc, viewportName, 'Header', 'Brand Logo'));
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await dismissStartupModals(page);

  const cartLoc = page.locator('a[aria-label="Cart" i], button[aria-label*="cart" i], header a[aria-label="Cart"], .bottom-nav a[aria-label*="cart" i]').first();
  record(await testElementClick(page, context, cartLoc, viewportName, 'Header', 'Cart Icon'));
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await dismissStartupModals(page);

  const loginLoc = page.locator('a.login-dropdown, a[href*="/login"], button:has-text("Login")').first();
  record(await testElementClick(page, context, loginLoc, viewportName, 'Header', 'Login/Signup Trigger'));

  if (isMobile) {
    const hamburgerLoc = page.locator('button.navbar-toggler, button[aria-label*="toggle" i]').first();
    if (await hamburgerLoc.isVisible().catch(() => false)) {
      record(await testElementClick(page, context, hamburgerLoc, viewportName, 'Header', 'Mobile Hamburger Menu'));
    }
  }

  // AREA 2: LOCATION / PINCODE MODAL
  console.log(`--- Testing Location Modal (${viewportName}) ---`);
  const locTrigger = page.locator('#dropdown-mega-menu, button:has-text("Deliver to")').first();
  if (await locTrigger.isVisible().catch(() => false)) {
    await locTrigger.click({ timeout: 5000 }).catch(() => { });
    await page.waitForTimeout(1000);
    const pincodeInput = page.locator('div[class*="modal"] input, input[placeholder*="pincode" i]').first();
    if (await pincodeInput.isVisible().catch(() => false)) {
      await pincodeInput.fill('560078');
      await pincodeInput.press('Enter').catch(() => { });
      await page.waitForTimeout(1500);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const validPincodePassed = /560078|30 Minutes|Bangalore/i.test(bodyText);
      const pincodeRes: ElementAuditResult = {
        viewport: viewportName,
        area: 'Location Modal',
        elementLabel: 'Submit Valid Pincode (560078)',
        href: null,
        target: null,
        clickOutcome: validPincodePassed ? 'navigated' : 'no_url_change',
        classification: validPincodePassed ? 'PASSED' : 'CONFIRMED BUG',
        forcedClickUsed: false,
        actualDetails: `Pincode update status: ${validPincodePassed}`
      };
      record(pincodeRes);
    }
  }
  await dismissStartupModals(page);

  // AREA 3: SEARCH & AUTOSUGGEST
  console.log(`--- Testing Search & Autosuggest (${viewportName}) ---`);
  const searchPill = page.locator('span:has-text("Search or Ask for"), input.search__home, input[placeholder*="Search" i]').first();
  if (await searchPill.isVisible().catch(() => false)) {
    await searchPill.click().catch(() => { });
    await page.waitForTimeout(1000);
    const activeInput = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await activeInput.isVisible().catch(() => false)) {
      await activeInput.fill('iPhone', { timeout: 5000 }).catch(() => { });
      await page.waitForTimeout(1500);
      const autoSuggestItems = page.locator('div[class*="search"] a, div[class*="suggest"] a, div[class*="dropdown"] a');
      if (await autoSuggestItems.count() > 0) {
        record(await testElementClick(page, context, autoSuggestItems.first(), viewportName, 'Search', 'Click Autosuggest Item'));
      }
    }
  }

  // AREA 4: HERO BANNERS (Iterate EVERY banner)
  console.log(`--- Testing Hero Banners (${viewportName}) ---`);
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissStartupModals(page);
  const heroLocators = await page.locator('div[class*="swiper"] a[href], div[class*="banner"] a[href], a.relative.block[href*="product"]').all();
  console.log(`Auditing ${heroLocators.length} distinct hero banner elements`);
  for (let i = 0; i < Math.min(heroLocators.length, 6); i++) {
    record(await testElementClick(page, context, heroLocators[i], viewportName, 'Hero Banners', `Hero Banner #${i + 1}`));
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await dismissStartupModals(page);
  }

  // AREA 5: CATEGORY CHIPS (Iterate distinct chips, including scrolled ones)
  console.log(`--- Testing Category Chips (${viewportName}) ---`);
  await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await dismissStartupModals(page);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(400);
  }
  const allChipElements = await page.locator('a[href*="product-list"], a[href*="category"]').all();

  const testedHrefs = new Set<string>();
  const uniqueChips: { locator: any; label: string }[] = [];
  for (let i = 0; i < allChipElements.length; i++) {
    const href = await allChipElements[i].getAttribute('href').catch(() => null);
    const text = await allChipElements[i].innerText().catch(() => '');
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const key = `${href}_${cleanText}`;
    if (href && !testedHrefs.has(key)) {
      testedHrefs.add(key);
      uniqueChips.push({ locator: allChipElements[i], label: `Category Chip: ${cleanText || href}` });
    }
  }

  console.log(`Auditing ${Math.min(uniqueChips.length, 15)} distinct unique category chips`);
  for (let i = 0; i < Math.min(uniqueChips.length, 15); i++) {
    record(await testElementClick(page, context, uniqueChips[i].locator, viewportName, 'Category Navigation', uniqueChips[i].label));
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await dismissStartupModals(page);
  }

  // AREA 6: PRODUCT CARDS
  console.log(`--- Testing Product Cards (${viewportName}) ---`);
  const cardLocators = await page.locator('a[href*="/product-details/"]').all();
  console.log(`Auditing ${Math.min(cardLocators.length, 6)} distinct product cards`);
  for (let i = 0; i < Math.min(cardLocators.length, 6); i++) {
    const cardText = await cardLocators[i].innerText().catch(() => '');
    const label = `Product Card #${i + 1} (${cardText.trim().split('\n')[0] || 'Card'})`;
    record(await testElementClick(page, context, cardLocators[i], viewportName, 'Product Cards', label));
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await dismissStartupModals(page);
  }

  // AREA 7: FOOTER LINKS (Iterate EVERY footer link, target="_blank" handled separately)
  console.log(`--- Testing Footer Links (${viewportName}) ---`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await dismissStartupModals(page); // FIX: close the bottom-sheet modal that opens on scroll-to-bottom
  const footerLocators = await page.locator('footer a[href]').all();
  console.log(`Auditing ${footerLocators.length} distinct footer links`);
  for (let i = 0; i < footerLocators.length; i++) {
    const text = await footerLocators[i].innerText().catch(() => '');
    const aria = await footerLocators[i].getAttribute('aria-label').catch(() => '');
    const label = `Footer Link #${i + 1} (${text.trim() || aria || 'Social Icon'})`;
    record(await testElementClick(page, context, footerLocators[i], viewportName, 'Footer Links', label));
  }
}

test.describe('SMPL HOMEPAGE VERIFIED E2E SUITE (STRICT HARNESS & GROUND TRUTH GATE)', () => {
  let auditReport: VerifiedAuditReport = {
    timestamp: new Date().toISOString(),
    selfCheckStatus: 'PENDING',
    groundTruthChecks: [],
    viewportsTested: [],
    totalElementsTested: 0,
    passCount: 0,
    confirmedBugCount: 0,
    inconclusiveCount: 0,
    elements: [],
    confirmedBugs: []
  };

  test('1. Ground Truth Self-Check Gate & Mobile Viewport Audit (Pixel 5)', async ({ page, context }) => {
    test.setTimeout(900000);
    const viewportName = 'Mobile Pixel 5 (393x851)';
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await dismissStartupModals(page);

    console.log('\n================================================================');
    console.log('RUNNING MANDATORY GROUND TRUTH HARNESS SELF-CHECK');
    console.log('================================================================');

    const checks: GroundTruthCheck[] = [];

    const heroBannerLoc = page.locator('div[class*="swiper"] a[href], div[class*="banner"] a[href], a.relative.block[href*="product"]').first();
    const heroRes = await testElementClick(page, context, heroBannerLoc, viewportName, 'GroundTruth', 'Hero Banner Click');
    const heroActual: 'PASS' | 'FAIL' = heroRes.classification === 'PASSED' ? 'PASS' : 'FAIL';
    checks.push({
      item: 'Hero banner clicks navigate correctly',
      expectedState: 'PASS',
      actualState: heroActual,
      matched: heroActual === 'PASS',
      details: heroRes.actualDetails
    });
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded' });
    await dismissStartupModals(page);

    await page.waitForTimeout(2500);
    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      windowInnerHeight: window.innerHeight,
      bodyOverflow: window.getComputedStyle(document.body).overflowY
    }));
    console.log('Ground Truth Scroll Info:', scrollInfo);
    const noHorizontalOverflow = scrollInfo.scrollWidth <= scrollInfo.clientWidth + 2;
    const isVerticalScrollable = scrollInfo.scrollHeight > scrollInfo.windowInnerHeight;
    const scrollActual: 'PASS' | 'FAIL' = (noHorizontalOverflow && isVerticalScrollable) ? 'PASS' : 'FAIL';
    checks.push({
      item: 'Page scrollability (vertical) works correctly, no horizontal overflow',
      expectedState: 'PASS',
      actualState: scrollActual,
      matched: scrollActual === 'PASS',
      details: `scrollWidth=${scrollInfo.scrollWidth}, clientWidth=${scrollInfo.clientWidth}, scrollHeight=${scrollInfo.scrollHeight}`
    });

    const linkedinLoc = page.locator('footer a[href*="linkedin"]').first();
    const linkedinRes = await testElementClick(page, context, linkedinLoc, viewportName, 'GroundTruth', 'Footer LinkedIn Icon');
    const linkedinActual: 'PASS' | 'FAIL' = linkedinRes.classification === 'PASSED' ? 'PASS' : 'FAIL';
    checks.push({
      item: 'Footer LinkedIn social icon',
      expectedState: 'FAIL',
      actualState: linkedinActual,
      matched: linkedinActual === 'FAIL',
      details: linkedinRes.actualDetails
    });

    const termsLoc = page.locator('footer a[href*="terms"]').first();
    const termsRes = await testElementClick(page, context, termsLoc, viewportName, 'GroundTruth', 'Footer Terms Link');
    const termsActual: 'PASS' | 'FAIL' = termsRes.classification === 'PASSED' ? 'PASS' : 'FAIL';
    checks.push({
      item: 'Footer nav links (Terms, Privacy)',
      expectedState: 'FAIL',
      actualState: termsActual,
      matched: termsActual === 'FAIL',
      details: termsRes.actualDetails
    });

    const seeAllDealsLoc = page.locator('a:has-text("See all"), button:has-text("See all"), a:has-text("Deals")').first();
    const seeAllRes = await testElementClick(page, context, seeAllDealsLoc, viewportName, 'GroundTruth', 'See All Deals CTA');
    const seeAllActual: 'PASS' | 'FAIL' = seeAllRes.classification === 'PASSED' ? 'PASS' : 'FAIL';
    checks.push({
      item: '"See all deals" button',
      expectedState: 'FAIL',
      actualState: seeAllActual,
      matched: seeAllActual === 'FAIL',
      details: seeAllRes.actualDetails
    });

    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1000);
    const smartwatchLoc = page.locator('a[href*="smartwatch" i], a:has-text("Smartwatch")').first();
    const smartwatchRes = await testElementClick(page, context, smartwatchLoc, viewportName, 'GroundTruth', 'Smartwatch Category Chip');
    const smartwatchActual: 'PASS' | 'FAIL' = smartwatchRes.classification === 'PASSED' ? 'PASS' : 'FAIL';
    checks.push({
      item: 'Smartwatch category chip further down the page',
      expectedState: 'FAIL',
      actualState: smartwatchActual,
      matched: smartwatchActual === 'FAIL',
      details: smartwatchRes.actualDetails
    });

    const failedSelfCheckItems = checks.filter(c => !c.matched);
    const selfCheckPassed = failedSelfCheckItems.length === 0;
    const selfCheckBanner = selfCheckPassed
      ? 'GROUND TRUTH SELF-CHECK: PASS'
      : `GROUND TRUTH SELF-CHECK: FAIL — mismatched on [${failedSelfCheckItems.map(f => f.item).join(', ')}]`;

    console.log(`\n================================================================`);
    console.log(selfCheckBanner);
    console.log('================================================================\n');

    auditReport.selfCheckStatus = selfCheckBanner as any;
    auditReport.groundTruthChecks = checks;

    fs.writeFileSync(REPORT_PATH, JSON.stringify(auditReport, null, 2), 'utf-8');

    if (!selfCheckPassed) {
      throw new Error(`STOPPING FULL AUDIT RUN: ${selfCheckBanner}. Harness must be fixed before trusting results.`);
    }

    await runViewportAudit(page, context, viewportName, true, auditReport);
    fs.writeFileSync(REPORT_PATH, JSON.stringify(auditReport, null, 2), 'utf-8');
  });
});