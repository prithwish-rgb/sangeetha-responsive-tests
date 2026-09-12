/**
 * Figma → Staging Design Validation: Home Screen (4681:131479)
 * Figma: https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-131479
 *
 * DOM discovery (24-Aug-2026) findings on https://smpl-new.bangalore2.com/:
 *   - Logo:     img[alt="Sangeetha logo"]
 *   - Search:   styled div — detected via img[alt="camera"] and img[alt="sparkle"]
 *   - Camera:   img[alt="camera"]
 *   - Mic:      img[alt="mic"]
 *   - Location: img[alt="location"]
 *   - Products: a[href*="product-details"] (85 found)
 *   - Cart btn: button with ~38px × 38px square at top of page
 *   - Fonts:    Tailwind (no BEM classes); body uses Outfit via Next.js font var
 *   - "Deal of the day": text present ✓
 *   - App download: "Sangeetha App download" text NOT present at time of discovery
 *
 * RULES:
 *   • Figma is the authoritative source of truth.
 *   • Tests NEVER modify application behaviour.
 *   • Failures: FUNCTIONAL / DESIGN / RESPONSIVE / VISUAL / RUNTIME
 *   • Content types: DESIGN_STRUCTURE_MISMATCH | DYNAMIC_CONTENT_DIFFERENCE
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import { STAGING_URL, VIEWPORT, COLORS, TYPOGRAPHY, LAYOUT } from '../helpers/figma/design-tokens';
import {
  colorsMatch,
  fontFamilyMatches,
  dimensionClose,
  isVisible,
  attachConsoleListener,
  DesignReport,
  DesignFailure,
} from '../helpers/figma/style-comparison';

// ─── Output ───────────────────────────────────────────────────────────────────
const REPORT_DIR = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

// ─── Viewport label ───────────────────────────────────────────────────────────
const VP_LABEL = `${VIEWPORT.width}x${VIEWPORT.height}`;

test.use({ viewport: VIEWPORT });

test.describe('Figma Design Validation — Home Screen (4681:131479)', () => {
  let report: DesignReport;
  let consoleErrors: ReturnType<typeof attachConsoleListener>;

  test.beforeEach(async ({ page }) => {
    report = new DesignReport();
    consoleErrors = attachConsoleListener(page);
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  });

  test.afterEach(async ({}, testInfo) => {
    const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().substring(0, 60);
    fs.writeFileSync(
      path.join(REPORT_DIR, `figma-home-${slug}-${Date.now()}.json`),
      JSON.stringify({
        test: testInfo.title,
        status: testInfo.status,
        figmaNode: '4681:131479',
        viewport: VP_LABEL,
        summary: report.summary(),
        failures: report.allFailures,
        passes: report.allPasses,
        runtimeErrors: consoleErrors,
      }, null, 2)
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1 — RUNTIME: HTTP 200, no page errors
  // ═══════════════════════════════════════════════════════════════════════════
  test('[RUNTIME] Home page loads without critical JS errors', async ({ page }) => {
    const resp = await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(resp?.status() ?? 0).toBe(200);
    report.pass('HTTP 200 OK');

    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    report.pass('Body element visible');

    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.type === 'pageerror');
    if (pageErrors.length > 0) {
      report.fail({
        element: 'Page', selector: 'window', viewport: VP_LABEL,
        category: 'RUNTIME', severity: 'CRITICAL',
        property: 'JS errors',
        figmaExpected: '0 page errors',
        stagingActual: `${pageErrors.length} error(s)`,
        difference: pageErrors.map(e => e.text).join('; '),
      });
    } else {
      report.pass('No critical JS page errors');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2 — FUNCTIONAL: Essential elements present
  // Figma nodes: logo 4681:131496, cart 4681:131512, search 4681:131527,
  //              camera 4681:131545, mic 4681:131546, location 4681:131524
  // ═══════════════════════════════════════════════════════════════════════════
  test('[FUNCTIONAL] Essential home-screen elements are present', async ({ page }) => {
    // Selectors confirmed via live DOM inspection (see file header)
    const checks: Array<[string, string, 'CRITICAL' | 'HIGH']> = [
      ['Logo (img[alt="Sangeetha logo"])',       'img[alt="Sangeetha logo"]',        'CRITICAL'],
      ['Camera icon in search bar',              'img[alt="camera"]',                'CRITICAL'],
      ['Microphone icon in search bar',          'img[alt="mic"]',                   'HIGH'    ],
      ['Location icon',                          'img[alt="location"]',              'HIGH'    ],
      ['Product detail links (product cards)',   'a[href*="product-details"]',       'HIGH'    ],
      ['SVG icons in header buttons',            'button svg',                       'HIGH'    ],
    ];

    for (const [name, selector, severity] of checks) {
      const visible = await isVisible(page, selector);
      if (visible) {
        report.pass(`${name} present`);
      } else {
        report.fail({
          element: name, selector, viewport: VP_LABEL,
          category: 'FUNCTIONAL', severity,
          property: 'visibility',
          figmaExpected: 'element visible',
          stagingActual: 'missing or hidden',
          difference: `"${name}" not found with: ${selector}`,
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3 — DESIGN: Search bar styling
  // Figma (4681:131532): bg #FFF, border-radius 12px, Outfit 14px,
  //   camera (4681:131545) + mic (4681:131546) icons on right
  // DOM: search is a styled div — detected via img[alt="camera"]
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] Search bar matches Figma specification', async ({ page }) => {
    // Confirm search bar is rendered (via its icon children)
    const cameraVisible = await isVisible(page, 'img[alt="camera"]');
    const micVisible    = await isVisible(page, 'img[alt="mic"]');
    const sparkleVisible = await isVisible(page, 'img[alt="sparkle"]');

    if (!cameraVisible && !sparkleVisible) {
      report.fail({
        element: 'Search bar', selector: 'img[alt="camera"], img[alt="sparkle"]',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'CRITICAL',
        property: 'visibility',
        figmaExpected: 'search bar with camera icon',
        stagingActual: 'search icons not found',
        difference: 'Search bar not rendered',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
      return;
    }
    report.pass('Search bar present (camera icon visible)');

    // Walk up from the camera icon to find the white container card
    const containerStyles = await page.evaluate(() => {
      const camera = document.querySelector('img[alt="camera"]');
      if (!camera) return null;
      let el = camera.parentElement;
      for (let i = 0; i < 8; i++) {
        if (!el) break;
        const s = window.getComputedStyle(el);
        const bg = s.backgroundColor;
        if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)') {
          return {
            backgroundColor: bg,
            borderRadius: s.borderRadius,
            fontFamily: s.fontFamily,
            paddingTop: s.paddingTop,
            paddingLeft: s.paddingLeft,
            boxShadow: s.boxShadow,
          };
        }
        el = el.parentElement;
      }
      return null;
    });

    if (containerStyles) {
      // Background: #FFFFFF (Figma fill_658ab2fa)
      if (!colorsMatch(containerStyles.backgroundColor, COLORS.white)) {
        report.fail({
          element: 'Search bar container', selector: 'camera icon ancestor',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'HIGH',
          property: 'backgroundColor',
          figmaExpected: COLORS.white,
          stagingActual: containerStyles.backgroundColor,
          difference: 'Search bar background not white',
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else {
        report.pass(`Search bar background: white (${containerStyles.backgroundColor})`);
      }

      // Border-radius: 12px (Figma node 4681:131532 borderRadius: 12px)
      const brNum = parseFloat(containerStyles.borderRadius);
      const brCheck = dimensionClose(brNum, LAYOUT.searchBarBorderRadius);
      if (!brCheck.pass) {
        report.fail({
          element: 'Search bar container', selector: 'camera icon ancestor',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
          property: 'borderRadius',
          figmaExpected: `${LAYOUT.searchBarBorderRadius}px`,
          stagingActual: containerStyles.borderRadius,
          difference: `Diff: ${brCheck.diff}px`,
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else {
        report.pass(`Search bar border-radius: ${containerStyles.borderRadius} (Figma: 12px)`);
      }
    } else {
      report.fail({
        element: 'Search bar container (white card)', selector: 'camera icon ancestor',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'backgroundColor + borderRadius',
        figmaExpected: '#FFFFFF bg, 12px radius',
        stagingActual: 'container with white bg not found within 8 ancestors',
        difference: 'Could not locate white search card container',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Font family on placeholder text (Figma: Outfit 14px, id 4681:131543)
    const placeholderFont = await page.evaluate(() => {
      const sparkle = document.querySelector('img[alt="sparkle"]');
      if (!sparkle) return null;
      const parent = sparkle.parentElement;
      if (!parent) return null;
      const textEl = parent.nextElementSibling || parent.parentElement?.querySelector('span');
      if (!textEl) return null;
      const s = window.getComputedStyle(textEl);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize };
    });

    if (placeholderFont?.fontFamily) {
      if (!fontFamilyMatches(placeholderFont.fontFamily, 'Outfit')) {
        report.fail({
          element: 'Search placeholder text', selector: 'near img[alt="sparkle"]',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
          property: 'fontFamily',
          figmaExpected: 'Outfit',
          stagingActual: placeholderFont.fontFamily,
          difference: 'Font family mismatch in search placeholder',
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else {
        report.pass(`Search placeholder font: ${placeholderFont.fontFamily}`);
      }
      if (placeholderFont.fontSize && placeholderFont.fontSize !== '14px') {
        report.fail({
          element: 'Search placeholder text', selector: 'near img[alt="sparkle"]',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
          property: 'fontSize',
          figmaExpected: '14px',
          stagingActual: placeholderFont.fontSize,
          difference: `Expected 14px, got ${placeholderFont.fontSize}`,
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else if (placeholderFont.fontSize) {
        report.pass(`Search placeholder font-size: ${placeholderFont.fontSize}`);
      }
    }

    // Camera icon (Figma: vuesax/broken/camera — id 4681:131545)
    if (!cameraVisible) {
      report.fail({
        element: 'Camera icon', selector: 'img[alt="camera"]',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: 'camera icon visible in search bar',
        stagingActual: 'not found',
        difference: 'Camera icon missing from search bar',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass('Camera icon present (img[alt="camera"])');
    }

    // Microphone icon (Figma: vuesax/broken/microphone — id 4681:131546)
    if (!micVisible) {
      report.fail({
        element: 'Microphone icon', selector: 'img[alt="mic"]',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: 'microphone icon visible in search bar',
        stagingActual: 'not found',
        difference: 'Microphone icon missing from search bar',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass('Microphone icon present (img[alt="mic"])');
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4 — DESIGN: Cart button dimensions
  // Figma (4681:131512): 40×40px, border-radius 12px
  // DOM: button with ~38px square at top of page
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] Cart button matches Figma specification', async ({ page }) => {
    // Find the cart icon button by looking for small square button in the header area
    const cartData = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Cart button: roughly square, small, in top 120px of the page
      const cartBtn = buttons.find(btn => {
        const r = btn.getBoundingClientRect();
        return r.top < 120 && r.width > 28 && r.width < 52 && Math.abs(r.width - r.height) < 8;
      });
      if (!cartBtn) return null;
      const r = cartBtn.getBoundingClientRect();
      const s = window.getComputedStyle(cartBtn);
      return {
        width: r.width, height: r.height,
        borderRadius: s.borderRadius,
        hasSvg: !!cartBtn.querySelector('svg'),
      };
    });

    if (!cartData) {
      report.fail({
        element: 'Cart button', selector: 'square button in top 120px',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '40×40 cart button with SVG icon',
        stagingActual: 'no matching button found',
        difference: 'Cart button not found in header area',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
      return;
    }

    report.pass(`Cart button found (${Math.round(cartData.width)}×${Math.round(cartData.height)}px, hasSvg=${cartData.hasSvg})`);

    // Width: Figma 40px (tolerance ±4px)
    const wCheck = dimensionClose(cartData.width, LAYOUT.cartButtonSize);
    if (!wCheck.pass) {
      report.fail({
        element: 'Cart button', selector: 'header square button',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'width',
        figmaExpected: `${LAYOUT.cartButtonSize}px`,
        stagingActual: `${Math.round(cartData.width)}px`,
        difference: `Diff: ${wCheck.diff}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`Cart button width: ~${Math.round(cartData.width)}px (Figma: 40px)`);
    }

    // Height: Figma 40px
    const hCheck = dimensionClose(cartData.height, LAYOUT.cartButtonSize);
    if (!hCheck.pass) {
      report.fail({
        element: 'Cart button', selector: 'header square button',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'height',
        figmaExpected: `${LAYOUT.cartButtonSize}px`,
        stagingActual: `${Math.round(cartData.height)}px`,
        difference: `Diff: ${hCheck.diff}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`Cart button height: ~${Math.round(cartData.height)}px (Figma: 40px)`);
    }

    // Border-radius: Figma 12px
    const brNum = parseFloat(cartData.borderRadius);
    const brCheck = dimensionClose(brNum, LAYOUT.cartButtonRadius);
    if (!brCheck.pass) {
      report.fail({
        element: 'Cart button', selector: 'header square button',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'borderRadius',
        figmaExpected: `${LAYOUT.cartButtonRadius}px`,
        stagingActual: cartData.borderRadius,
        difference: `Diff: ${brCheck.diff}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`Cart button border-radius: ${cartData.borderRadius} (Figma: 12px)`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5 — DESIGN: Product cards typography
  // Figma (4681:131568–1586): title Outfit 500, price Outfit 600
  // DOM: 85 a[href*="product-details"] links on homepage
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] Product cards match Figma layout and typography', async ({ page }) => {
    const cardSel = 'a[href*="product-details"]';
    const hasCards = await isVisible(page, cardSel);

    if (!hasCards) {
      report.fail({
        element: 'Product cards', selector: cardSel,
        viewport: VP_LABEL, category: 'DESIGN', severity: 'HIGH',
        property: 'visibility',
        figmaExpected: 'product card links (a[href*="product-details"])',
        stagingActual: 'none found',
        difference: 'No product card links on page',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
      return;
    }

    const cardCount = await page.locator(cardSel).count();
    report.pass(`${cardCount} product detail links found`);

    if (cardCount < 2) {
      report.fail({
        element: 'Product cards', selector: cardSel,
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'count',
        figmaExpected: '>=2 product cards',
        stagingActual: String(cardCount),
        difference: `Only ${cardCount} card(s)`,
        contentType: 'DYNAMIC_CONTENT_DIFFERENCE',
      });
    }

    // Typography of title inside a card (Figma: Outfit Medium 500 ~10px)
    const cardTypo = await page.evaluate(() => {
      const card = document.querySelector('a[href*="product-details"]');
      if (!card) return null;
      // Find the product name text — usually a p or span
      const textEl = card.querySelector('p, span, h2, h3, [class*="name"]');
      if (!textEl) return null;
      const s = window.getComputedStyle(textEl);
      return { fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontSize: s.fontSize };
    });

    if (cardTypo) {
      if (!fontFamilyMatches(cardTypo.fontFamily || '', 'Outfit')) {
        report.fail({
          element: 'Product card title', selector: 'a[href*="product-details"] p',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
          property: 'fontFamily',
          figmaExpected: 'Outfit',
          stagingActual: cardTypo.fontFamily,
          difference: 'Title not using Outfit font',
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else {
        report.pass(`Product card title font: ${cardTypo.fontFamily}`);
      }

      // Figma: font-weight 500 (Medium)
      if (cardTypo.fontWeight && cardTypo.fontWeight !== '500') {
        report.fail({
          element: 'Product card title', selector: 'a[href*="product-details"] p',
          viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
          property: 'fontWeight',
          figmaExpected: '500 (Medium)',
          stagingActual: cardTypo.fontWeight,
          difference: `Got fontWeight: ${cardTypo.fontWeight}`,
          contentType: 'DESIGN_STRUCTURE_MISMATCH',
        });
      } else if (cardTypo.fontWeight) {
        report.pass(`Product card title font-weight: ${cardTypo.fontWeight}`);
      }
    }

    // Check "Save ₹..." badge presence (Figma: Save badge in dark green bg)
    const hasSaveBadge = await page.evaluate(() =>
      document.body.innerText.toLowerCase().includes('save ₹') ||
      document.body.innerText.toLowerCase().includes('save rs')
    );
    if (hasSaveBadge) {
      report.pass('Price-drop "Save ₹..." badge present on cards');
    } else {
      report.fail({
        element: 'Price-drop badge', selector: ':text-matches("save ₹", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'visibility',
        figmaExpected: '"Save ₹X,XXX" badge on product cards',
        stagingActual: 'not found',
        difference: 'Save badge text not found in page',
        contentType: 'DYNAMIC_CONTENT_DIFFERENCE',
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6 — DESIGN: "Deal of the day" section
  // Figma (EL-562144ed): Outfit 500, 32px, lineHeight 38px, gradient text
  // DOM: text present (verified in DOM discovery)
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] Deal of the day section matches Figma', async ({ page }) => {
    const dealLocator = page.locator(':text-matches("deal of the day", "i")').first();
    const isDealVisible = await dealLocator.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isDealVisible) {
      report.fail({
        element: '"Deal of the day" heading', selector: ':text-matches("deal of the day", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'HIGH',
        property: 'visibility',
        figmaExpected: '"Deal of the day" heading (Figma EL-562144ed)',
        stagingActual: 'not found',
        difference: '"Deal of the day" section missing',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
      return;
    }

    report.pass('"Deal of the day" heading visible');

    const styles = await dealLocator.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight };
    });

    // Figma: Outfit Medium 500
    if (!fontFamilyMatches(styles.fontFamily || '', 'Outfit')) {
      report.fail({
        element: '"Deal of the day"', selector: ':text-matches("deal of the day", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'fontFamily',
        figmaExpected: 'Outfit',
        stagingActual: styles.fontFamily,
        difference: 'Wrong font family',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`"Deal of the day" font: ${styles.fontFamily}`);
    }

    // Figma: 32px
    const fsNum = parseFloat(styles.fontSize || '0');
    const fsCheck = dimensionClose(fsNum, TYPOGRAPHY.dealOfDay.fontSize, 4);
    if (!fsCheck.pass) {
      report.fail({
        element: '"Deal of the day"', selector: ':text-matches("deal of the day", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'fontSize',
        figmaExpected: `${TYPOGRAPHY.dealOfDay.fontSize}px`,
        stagingActual: styles.fontSize,
        difference: `Diff: ${fsCheck.diff}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`"Deal of the day" font-size: ${styles.fontSize} (Figma: 32px)`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7 — DESIGN: App download banner
  // Figma (EL-e40cac0b): "Download the Sangeetha App", Outfit 500 16px
  // DOM note: text NOT found at time of DOM discovery — flagged MEDIUM
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] App download banner matches Figma', async ({ page }) => {
    // Try both exact and partial text
    const dlLocator = page.locator(':text-matches("download the sangeetha app", "i")').first();
    const isVisible2 = await dlLocator.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible2) {
      report.fail({
        element: 'App download banner', selector: ':text-matches("download the sangeetha app", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'visibility',
        figmaExpected: '"Download the Sangeetha App" text (Figma EL-e40cac0b, Outfit 500 16px)',
        stagingActual: 'text not found on page',
        difference: 'App download banner missing or uses different text',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
      // Don't stop — check alternate text
      const altLocator = page.locator(':text-matches("sangeetha app", "i")').first();
      const altVisible = await altLocator.isVisible({ timeout: 3000 }).catch(() => false);
      if (altVisible) {
        report.pass('Found alternate "Sangeetha App" text (partial match)');
        const altStyles = await altLocator.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return { fontFamily: s.fontFamily, fontSize: s.fontSize };
        });
        report.pass(`Alternate text font: ${altStyles.fontFamily} ${altStyles.fontSize}`);
      }
      return;
    }

    report.pass('App download banner visible');

    const styles = await dlLocator.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { fontFamily: s.fontFamily, fontSize: s.fontSize };
    });

    if (!fontFamilyMatches(styles.fontFamily || '', 'Outfit')) {
      report.fail({
        element: 'App download title', selector: ':text-matches("download the sangeetha app", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'fontFamily',
        figmaExpected: 'Outfit',
        stagingActual: styles.fontFamily,
        difference: 'Wrong font family',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`App download title font: ${styles.fontFamily}`);
    }

    const fsNum = parseFloat(styles.fontSize || '0');
    const fsCheck = dimensionClose(fsNum, TYPOGRAPHY.appDownloadTitle.fontSize, 4);
    if (!fsCheck.pass) {
      report.fail({
        element: 'App download title', selector: ':text-matches("download the sangeetha app", "i")',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'LOW',
        property: 'fontSize',
        figmaExpected: `${TYPOGRAPHY.appDownloadTitle.fontSize}px`,
        stagingActual: styles.fontSize,
        difference: `Diff: ${fsCheck.diff}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`App download title font-size: ${styles.fontSize} (Figma: 16px)`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8 — RESPONSIVE: 390px viewport, no overflow
  // ═══════════════════════════════════════════════════════════════════════════
  test('[RESPONSIVE] Page renders correctly at 390px mobile viewport', async ({ page }) => {
    const vw = await page.evaluate(() => window.innerWidth);
    expect(vw, 'Viewport width must be 390').toBe(VIEWPORT.width);
    report.pass(`Viewport width: ${vw}px`);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));

    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      report.fail({
        element: 'Body', selector: 'body',
        viewport: VP_LABEL, category: 'RESPONSIVE', severity: 'HIGH',
        property: 'horizontal overflow',
        figmaExpected: 'no horizontal scroll at 390px',
        stagingActual: `scrollWidth=${overflow.scrollWidth}px vs clientWidth=${overflow.clientWidth}px`,
        difference: `Overflow: ${overflow.scrollWidth - overflow.clientWidth}px`,
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`No horizontal overflow (scrollWidth=${overflow.scrollWidth}px)`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 9 — DESIGN: Outfit font globally loaded
  // Figma: Outfit is the primary font across entire Home Screen
  // DOM: Next.js uses a CSS variable class "outfit_..." on html element
  // ═══════════════════════════════════════════════════════════════════════════
  test('[DESIGN] Outfit font is loaded and applied globally', async ({ page }) => {
    // Method 1: document.fonts API
    const outfitInFonts = await page.evaluate(() =>
      Array.from(document.fonts).some(f => f.family.toLowerCase().includes('outfit'))
    );
    if (outfitInFonts) {
      report.pass('Outfit font in document.fonts API');
    } else {
      report.fail({
        element: 'Document fonts', selector: 'document.fonts',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'HIGH',
        property: 'font-loading',
        figmaExpected: 'Outfit font in document.fonts',
        stagingActual: 'Outfit not found in document.fonts',
        difference: 'Primary Figma font not loaded via font API',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Method 2: HTML class contains outfit variable name
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    if (htmlClass.toLowerCase().includes('outfit')) {
      report.pass(`HTML class contains Outfit reference: ${htmlClass.substring(0, 80)}`);
    } else {
      report.fail({
        element: 'HTML element className', selector: 'html',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'fontFamily class',
        figmaExpected: 'html className includes "outfit" variable',
        stagingActual: htmlClass.substring(0, 100),
        difference: 'Outfit CSS variable class not on html element',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    }

    // Method 3: Body computed font-family
    const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    if (!fontFamilyMatches(bodyFont, 'Outfit')) {
      report.fail({
        element: 'Body', selector: 'body',
        viewport: VP_LABEL, category: 'DESIGN', severity: 'MEDIUM',
        property: 'fontFamily',
        figmaExpected: 'Outfit',
        stagingActual: bodyFont,
        difference: 'Body computed font-family does not start with Outfit',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`Body font-family: ${bodyFont}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 10 — VISUAL: Screenshot + above-fold content density
  // ═══════════════════════════════════════════════════════════════════════════
  test('[VISUAL] Capture home screen screenshot for manual review', async ({ page }) => {
    await page.waitForTimeout(1500);

    const screenshotPath = path.join(REPORT_DIR, `figma-home-screenshot-${Date.now()}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      clip: { x: 0, y: 0, width: 390, height: 844 },
    });
    report.pass(`Screenshot: ${screenshotPath}`);
    console.log('📸 Screenshot saved:', screenshotPath);

    // Verify above-fold has content (not blank)
    const aboveFold = await page.evaluate(() =>
      document.elementsFromPoint(195, 200)
        .filter(el => el.tagName !== 'HTML' && el.tagName !== 'BODY').length
    );

    if (aboveFold < 2) {
      report.fail({
        element: 'Above-fold content', selector: 'document.elementsFromPoint(195, 200)',
        viewport: VP_LABEL, category: 'VISUAL', severity: 'CRITICAL',
        property: 'content density',
        figmaExpected: '>=2 elements at viewport center',
        stagingActual: String(aboveFold),
        difference: 'Page appears blank above fold',
        contentType: 'DESIGN_STRUCTURE_MISMATCH',
      });
    } else {
      report.pass(`Above-fold has ${aboveFold} elements at center`);
    }
  });
});
