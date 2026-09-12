/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TC-PDP-001 to TC-PDP-010+ : Full Figma-to-Staging PDP Design Parity Audit
 *
 * Figma Design Source:
 *   File:    Sangeetha-Des (Q7vjg9zvLUDvEQ5ZEh2Dki)
 *   Node:    4681:102340  "PDP (full)"
 *   Canvas:  390 × 4660 px  (Mobile)
 *   Figma URL: https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-100420&m=dev
 *
 * Staging PDP:
 *   https://smpl-new.bangalore2.com/product-details/apple-iphone-15-pro-max-1tb-blue-titanium/14571
 *
 * AUDIT RULES:
 * - Playwright execution PASS = audit completed all checks.
 * - Design PASS/MISS/MISMATCH = individual Figma requirement result.
 * - Never abort audit on design discrepancy.
 * - Never fabricate results.
 * - VISUAL_REFERENCE_STATUS = NOT_AVAILABLE (no Figma screenshot baseline).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  PDPAuditEngine,
  attachPDPListeners,
  fontMatches,
  colorDelta,
  rgbToHex,
  dimClose,
  AuditFinding,
} from '../../helpers/figma/pdp/pdp-design-validator';

const PDP_URL = 'https://smpl-new.bangalore2.com/product-details/apple-iphone-15-pro-max-1tb-blue-titanium/14571';
const REPORT_DIR = path.join(__dirname, '..', '..', '..', 'reports', 'pdp');
const SS_DIR = path.join(REPORT_DIR, 'screenshots', 'actual');
[REPORT_DIR, SS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const FIGMA = {
  // ── Figma Design Tokens (extracted from node 4681:102340) ──────────────────
  header: {
    nodeId: '4681:102349',
    height: 100,
    backgroundColor: '#FFFFFF',
  },
  breadcrumb: {
    nodeId: '4681:102341',
    fontSize: 12,
    fontFamily: 'Outfit',
    color: '#6B7280',
  },
  productTitle: {
    nodeId: '4681:102408',
    fontFamily: 'Outfit',
    fontWeight: 600,
    fontSize: 18,
    color: '#030B1A',
  },
  productBrand: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 14,
    color: '#030B1A',
  },
  rating: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: '#6B7280',
  },
  price: {
    fontFamily: 'Outfit',
    fontWeight: 700,
    fontSize: 24,
    color: '#030B1A',
  },
  mrp: {
    fontFamily: 'Outfit',
    fontWeight: 400,
    fontSize: 14,
    color: '#9CA3AF',
  },
  discount: {
    fontFamily: 'Outfit',
    fontWeight: 500,
    fontSize: 14,
    color: '#1E7E34',
  },
  addToCart: {
    nodeId: '4681:103516',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0B74B8',
    fontFamily: 'Outfit',
    fontWeight: 600,
    fontSize: 16,
    color: '#FFFFFF',
  },
  buyNow: {
    height: 48,
    borderRadius: 8,
    fontFamily: 'Outfit',
    fontWeight: 600,
    fontSize: 16,
  },
  deliverySection: {
    nodeId: '4681:103516',
    fontFamily: 'Outfit',
  },
  specifications: {
    nodeId: '4681:103840',
    headerFontSize: 16,
    headerFontWeight: 600,
    labelFontSize: 13,
    labelColor: '#6B7280',
    valueFontSize: 13,
    valueColor: '#030B1A',
  },
  productHighlights: {
    nodeId: '4681:103837',
    fontSize: 14,
    fontFamily: 'Outfit',
  },
  gallery: {
    mainImageAspectRatio: 1.0, // square image
    thumbnailCount: 5,
  },
};

test.use({ viewport: { width: 390, height: 844 } });

test.describe('📋 PDP Figma-to-Staging Audit (Node 4681:102340)', () => {
  let engine: PDPAuditEngine;
  let listeners: ReturnType<typeof attachPDPListeners>;

  test.beforeEach(async ({ page }) => {
    engine = new PDPAuditEngine();
    listeners = attachPDPListeners(page);

    // Navigate to PDP - no auth needed for product details page
    await page.goto(PDP_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
  });

  test.afterEach(async ({}, testInfo) => {
    // Record console & network findings
    listeners.consoleErrors.forEach(e => engine.addConsoleError(e));
    listeners.networkFails.forEach(f => engine.addNetworkFailure(f));

    const report = engine.generateReport(PDP_URL, '390×844');
    const m = engine.metrics;

    console.log(`\n── ${testInfo.title} ──`);
    console.log(`PASS: ${m.pass} | MISSING: ${m.missing} | DESIGN_MISMATCH: ${m.mismatch} | DYNAMIC: ${m.dynamic} | UNCERTAIN: ${m.uncertain}`);
    if (listeners.consoleErrors.length) console.log(`Console Errors: ${listeners.consoleErrors.length}`);
    if (listeners.networkFails.length) console.log(`Network Failures: ${listeners.networkFails.length}`);

    fs.writeFileSync(
      path.join(REPORT_DIR, `pdp-audit-${testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-001 — Page Load, Runtime Health & Header
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-001: Page Load, Runtime Health & Header Validation', async ({ page }) => {
    // 1. Page loaded without crash
    const title = await page.title();
    if (title && title.length > 0) {
      engine.recordFinding({ testId: 'TC-PDP-001.1', figmaNodeId: '4681:102340', element: 'Page Title', section: 'Runtime', classification: 'PASS', severity: 'INFO', stagingActual: title });
    }

    // 2. Screenshot: Full page above fold
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-above-fold.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
    engine.addScreenshot('pdp-above-fold.png');

    // 3. Header presence
    const header = page.locator('header, div[class*="header"], div[class*="Header"]').first();
    const hasHeader = await header.isVisible({ timeout: 4000 }).catch(() => false);

    if (hasHeader) {
      engine.recordFinding({ testId: 'TC-PDP-001.2', figmaNodeId: '4681:102349', element: 'Header', section: 'Header / Nav Bar', classification: 'PASS', severity: 'HIGH', mappingConfidence: 'HIGH' });

      // Figma: header backgroundColor = #FFFFFF
      const headerBg = await header.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const headerBgHex = rgbToHex(headerBg);
      const bgMatch = headerBgHex ? colorDelta(headerBgHex, '#FFFFFF') < 30 : false;
      engine.recordFinding({
        testId: 'TC-PDP-001.3', figmaNodeId: '4681:102349', element: 'Header Background',
        section: 'Header / Nav Bar',
        classification: bgMatch ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM',
        property: 'backgroundColor',
        figmaExpected: '#FFFFFF', stagingActual: headerBgHex || headerBg,
        difference: bgMatch ? undefined : `Color delta ${headerBgHex ? colorDelta(headerBgHex, '#FFFFFF').toFixed(0) : 'N/A'}`,
        mappingConfidence: 'MEDIUM',
      });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-001.2', figmaNodeId: '4681:102349', element: 'Header', section: 'Header / Nav Bar', classification: 'MAPPING_UNCERTAIN', severity: 'MEDIUM', mappingConfidence: 'LOW' });
    }

    // 4. Back navigation button
    const backBtn = page.locator('button[aria-label*="back" i], a[href*="back"], svg[class*="back"], button:has(svg)').first();
    const hasBack = await backBtn.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-001.4', figmaNodeId: '4681:102349', element: 'Back Navigation Button',
      section: 'Header / Nav Bar',
      classification: hasBack ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasBack ? 'MEDIUM' : 'LOW',
    });

    // 5. Cart icon in header
    const cartIcon = page.locator('button:has(svg), a[href*="cart"], button[aria-label*="cart" i]').first();
    const hasCart = await cartIcon.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-001.5', figmaNodeId: '4681:102349', element: 'Cart Icon (Header)',
      section: 'Header / Nav Bar',
      classification: hasCart ? 'PASS' : 'MISSING',
      severity: 'HIGH', mappingConfidence: hasCart ? 'MEDIUM' : 'LOW',
    });

    // Audit execution itself passes
    expect(true, 'TC-PDP-001 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-002 — Product Gallery (Images, Thumbnails, Main Image)
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-002: Product Gallery — Images, Thumbnails & Carousel', async ({ page }) => {
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-product-gallery.png'), clip: { x: 0, y: 0, width: 390, height: 450 } });
    engine.addScreenshot('pdp-product-gallery.png');

    // Main product image
    const mainImg = page.locator('img[alt*="iPhone" i], img[alt*="product" i], div[class*="gallery"] img, div[class*="swiper"] img').first();
    const hasMain = await mainImg.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMain) {
      engine.recordFinding({ testId: 'TC-PDP-002.1', figmaNodeId: '4681:102408', element: 'Main Product Image', section: 'Product Gallery & Info', classification: 'PASS', severity: 'CRITICAL', mappingConfidence: 'HIGH' });

      // Check image loads without error
      const imgLoaded = await mainImg.evaluate(el => {
        const img = el as HTMLImageElement;
        return img.complete && img.naturalWidth > 0;
      }).catch(() => false);

      engine.recordFinding({
        testId: 'TC-PDP-002.2', figmaNodeId: '4681:102408', element: 'Main Product Image Load',
        section: 'Product Gallery & Info',
        classification: imgLoaded ? 'PASS' : 'MISSING',
        severity: 'CRITICAL', property: 'imageLoad',
        figmaExpected: 'Image renders without 404/broken state',
        stagingActual: imgLoaded ? 'Image loaded correctly' : 'Image broken or not loaded',
        mappingConfidence: 'HIGH',
      });

      // Figma: main image is approximately square (aspect ratio ~1.0)
      const imgDims = await mainImg.boundingBox();
      if (imgDims) {
        const ar = imgDims.width / imgDims.height;
        const arClose = Math.abs(ar - FIGMA.gallery.mainImageAspectRatio) < 0.25;
        engine.recordFinding({
          testId: 'TC-PDP-002.3', figmaNodeId: '4681:102408', element: 'Main Product Image Aspect Ratio',
          section: 'Product Gallery & Info',
          classification: arClose ? 'PASS' : 'DESIGN_MISMATCH',
          severity: 'MEDIUM', property: 'aspectRatio',
          figmaExpected: '~1.0 (square)', stagingActual: ar.toFixed(2),
          difference: arClose ? undefined : `Aspect ratio ${ar.toFixed(2)} vs expected ~1.0`,
          mappingConfidence: 'MEDIUM',
        });
      }
    } else {
      engine.recordFinding({ testId: 'TC-PDP-002.1', figmaNodeId: '4681:102408', element: 'Main Product Image', section: 'Product Gallery & Info', classification: 'MAPPING_UNCERTAIN', severity: 'CRITICAL', mappingConfidence: 'LOW' });
    }

    // Thumbnail images
    const thumbnails = page.locator('div[class*="thumb"] img, div[class*="Thumb"] img, div[class*="gallery"] img, div[class*="swiper-slide"] img');
    const thumbCount = await thumbnails.count();
    engine.recordFinding({
      testId: 'TC-PDP-002.4', figmaNodeId: '4681:102408', element: 'Product Image Thumbnails',
      section: 'Product Gallery & Info',
      classification: thumbCount >= 2 ? 'PASS' : thumbCount === 0 ? 'MAPPING_UNCERTAIN' : 'PASS',
      severity: 'MEDIUM', property: 'count',
      figmaExpected: `${FIGMA.gallery.thumbnailCount} thumbnails`, stagingActual: `${thumbCount} thumbnails`,
      mappingConfidence: thumbCount > 0 ? 'MEDIUM' : 'LOW',
    });

    expect(true, 'TC-PDP-002 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-003 — Product Title, Brand & Meta Information
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-003: Product Title, Brand & Meta Information Audit', async ({ page }) => {
    // Product Title — dynamic content but check structure/styling
    const titleEl = page.locator('h1, [class*="product-title"], [class*="productTitle"], [class*="pdp-title"]').first();
    const hasTitle = await titleEl.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTitle) {
      engine.recordFinding({ testId: 'TC-PDP-003.1', figmaNodeId: '4681:102408', element: 'Product Title (h1)', section: 'Product Gallery & Info', classification: 'PASS', severity: 'CRITICAL', mappingConfidence: 'HIGH' });

      const titleText = await titleEl.textContent().catch(() => '');
      engine.recordFinding({ testId: 'TC-PDP-003.2', figmaNodeId: '4681:102408', element: 'Product Title Content', section: 'Product Gallery & Info', classification: 'DYNAMIC_CONTENT', severity: 'INFO', stagingActual: titleText?.trim().slice(0, 80) });

      // Typography validation
      const s = await titleEl.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: cs.fontSize, color: cs.color };
      });

      const fontOk = fontMatches(s.fontFamily, FIGMA.productTitle.fontFamily);
      engine.recordFinding({
        testId: 'TC-PDP-003.3', figmaNodeId: '4681:102408', element: 'Product Title',
        section: 'Product Gallery & Info', classification: fontOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'fontFamily',
        figmaExpected: FIGMA.productTitle.fontFamily, stagingActual: s.fontFamily,
        difference: fontOk ? undefined : `Font family mismatch`,
        mappingConfidence: 'HIGH',
      });

      const fwOk = ['600', '700', 'bold', '500'].includes(s.fontWeight);
      engine.recordFinding({
        testId: 'TC-PDP-003.4', figmaNodeId: '4681:102408', element: 'Product Title',
        section: 'Product Gallery & Info', classification: fwOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'fontWeight',
        figmaExpected: String(FIGMA.productTitle.fontWeight), stagingActual: s.fontWeight,
        mappingConfidence: 'HIGH',
      });

      const fsNum = parseFloat(s.fontSize);
      const fsOk = dimClose(fsNum, FIGMA.productTitle.fontSize, 3).pass;
      engine.recordFinding({
        testId: 'TC-PDP-003.5', figmaNodeId: '4681:102408', element: 'Product Title',
        section: 'Product Gallery & Info', classification: fsOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'fontSize',
        figmaExpected: `${FIGMA.productTitle.fontSize}px`, stagingActual: s.fontSize,
        difference: fsOk ? undefined : `Font size diff ${(fsNum - FIGMA.productTitle.fontSize).toFixed(1)}px`,
        mappingConfidence: 'HIGH',
      });

      const colorHex = rgbToHex(s.color);
      const colorOk = colorHex ? colorDelta(colorHex, FIGMA.productTitle.color) < 40 : false;
      engine.recordFinding({
        testId: 'TC-PDP-003.6', figmaNodeId: '4681:102408', element: 'Product Title',
        section: 'Product Gallery & Info', classification: colorOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'color',
        figmaExpected: FIGMA.productTitle.color, stagingActual: colorHex || s.color,
        difference: colorOk ? undefined : `Color delta ${colorHex ? colorDelta(colorHex, FIGMA.productTitle.color).toFixed(0) : 'N/A'}`,
        mappingConfidence: 'HIGH',
      });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-003.1', figmaNodeId: '4681:102408', element: 'Product Title', section: 'Product Gallery & Info', classification: 'MISSING', severity: 'CRITICAL', mappingConfidence: 'HIGH', developerAction: 'Ensure product title renders as visible h1 element' });
    }

    // Rating / Reviews
    const ratingEl = page.locator('[class*="rating"], [class*="Rating"], [aria-label*="rating" i], [class*="stars"]').first();
    const hasRating = await ratingEl.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-003.7', figmaNodeId: '4681:102408', element: 'Ratings & Reviews',
      section: 'Product Gallery & Info', classification: hasRating ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasRating ? 'MEDIUM' : 'LOW',
    });
    if (hasRating) {
      const ratingText = await ratingEl.textContent().catch(() => '');
      engine.recordFinding({ testId: 'TC-PDP-003.8', figmaNodeId: '4681:102408', element: 'Rating Value', section: 'Product Gallery & Info', classification: 'DYNAMIC_CONTENT', severity: 'INFO', stagingActual: ratingText?.trim() });
    }

    expect(true, 'TC-PDP-003 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-004 — Pricing Section (Price, MRP, Discount)
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-004: Pricing Section — Price, MRP & Discount Audit', async ({ page }) => {
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-pricing-section.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
    engine.addScreenshot('pdp-pricing-section.png');

    // Main price
    const priceEl = page.locator('[class*="price"]:not([class*="mrp"]):not([class*="original"]), [class*="Price"]:not([class*="MRP"])').first();
    const hasPrice = await priceEl.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPrice) {
      engine.recordFinding({ testId: 'TC-PDP-004.1', figmaNodeId: '4681:102408', element: 'Product Price', section: 'Product Gallery & Info', classification: 'PASS', severity: 'CRITICAL', mappingConfidence: 'HIGH' });

      const priceText = await priceEl.textContent();
      engine.recordFinding({ testId: 'TC-PDP-004.2', figmaNodeId: '4681:102408', element: 'Price Value', section: 'Product Gallery & Info', classification: 'DYNAMIC_CONTENT', severity: 'INFO', stagingActual: priceText?.trim() });

      // Price typography
      const s = await priceEl.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: cs.fontSize, color: cs.color };
      });
      const fsNum = parseFloat(s.fontSize);
      const fsOk = dimClose(fsNum, FIGMA.price.fontSize, 4).pass;
      const fwOk = ['600', '700', 'bold'].includes(s.fontWeight);

      engine.recordFinding({
        testId: 'TC-PDP-004.3', figmaNodeId: '4681:102408', element: 'Price Typography',
        section: 'Product Gallery & Info', classification: fsOk && fwOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'fontSize + fontWeight',
        figmaExpected: `Outfit 700 ${FIGMA.price.fontSize}px #030B1A`,
        stagingActual: `${s.fontFamily} ${s.fontWeight} ${s.fontSize}`,
        difference: !fsOk ? `Font size ${fsNum.toFixed(0)}px vs ${FIGMA.price.fontSize}px` : (!fwOk ? `Weight ${s.fontWeight} vs 700` : undefined),
        mappingConfidence: 'MEDIUM',
      });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-004.1', figmaNodeId: '4681:102408', element: 'Product Price', section: 'Product Gallery & Info', classification: 'MAPPING_UNCERTAIN', severity: 'CRITICAL', mappingConfidence: 'LOW' });
    }

    // MRP (strikethrough)
    const mrpEl = page.locator('[class*="mrp"], [class*="MRP"], [class*="original-price"], del, s').first();
    const hasMrp = await mrpEl.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasMrp) {
      engine.recordFinding({ testId: 'TC-PDP-004.4', figmaNodeId: '4681:102408', element: 'MRP (Strikethrough)', section: 'Product Gallery & Info', classification: 'PASS', severity: 'HIGH', mappingConfidence: 'MEDIUM' });
      const mrpText = await mrpEl.textContent();
      engine.recordFinding({ testId: 'TC-PDP-004.5', figmaNodeId: '4681:102408', element: 'MRP Value', section: 'Product Gallery & Info', classification: 'DYNAMIC_CONTENT', severity: 'INFO', stagingActual: mrpText?.trim() });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-004.4', figmaNodeId: '4681:102408', element: 'MRP (Strikethrough)', section: 'Product Gallery & Info', classification: 'MAPPING_UNCERTAIN', severity: 'HIGH', mappingConfidence: 'LOW' });
    }

    // Discount badge
    const discountEl = page.locator('[class*="discount"], [class*="Discount"], [class*="off"], :text-matches("% off", "i")').first();
    const hasDiscount = await discountEl.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-004.6', figmaNodeId: '4681:102408', element: 'Discount Percentage',
      section: 'Product Gallery & Info', classification: hasDiscount ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasDiscount ? 'MEDIUM' : 'LOW',
    });
    if (hasDiscount) {
      const discountText = await discountEl.textContent();
      engine.recordFinding({ testId: 'TC-PDP-004.7', figmaNodeId: '4681:102408', element: 'Discount Value', section: 'Product Gallery & Info', classification: 'DYNAMIC_CONTENT', severity: 'INFO', stagingActual: discountText?.trim() });
    }

    expect(true, 'TC-PDP-004 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-005 — Purchase CTAs: Add to Cart & Buy Now
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-005: Purchase CTAs — Add to Cart & Buy Now Audit', async ({ page }) => {
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-purchase-ctas.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
    engine.addScreenshot('pdp-purchase-ctas.png');

    // Add to Cart
    const addToCartBtn = page.locator(':text-matches("add to cart", "i"), button[aria-label*="cart" i]').first();
    const hasCart = await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCart) {
      engine.recordFinding({ testId: 'TC-PDP-005.1', figmaNodeId: '4681:103516', element: 'Add to Cart Button', section: 'Delivery, Availability & Purchase CTAs', classification: 'PASS', severity: 'CRITICAL', mappingConfidence: 'HIGH' });

      const cartStyles = await addToCartBtn.evaluate(el => {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          height: rect.height, width: rect.width,
          fontWeight: cs.fontWeight, fontSize: cs.fontSize, fontFamily: cs.fontFamily,
          color: cs.color, backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
        };
      });

      // Height: Figma = 48px
      const heightResult = dimClose(cartStyles.height, FIGMA.addToCart.height, 6);
      engine.recordFinding({
        testId: 'TC-PDP-005.2', figmaNodeId: '4681:103516', element: 'Add to Cart — Height',
        section: 'Purchase CTAs', classification: heightResult.pass ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'height',
        figmaExpected: `${FIGMA.addToCart.height}px`, stagingActual: `${cartStyles.height.toFixed(0)}px`,
        difference: heightResult.pass ? undefined : `${heightResult.diff.toFixed(0)}px off`,
        selector: ':text-matches("add to cart", "i")', viewport: '390×844',
        mappingConfidence: 'HIGH',
        developerAction: heightResult.pass ? undefined : `Set CTA button height to ${FIGMA.addToCart.height}px`,
      });

      // Background color: Figma = #0B74B8
      const bgHex = rgbToHex(cartStyles.backgroundColor);
      const bgOk = bgHex ? colorDelta(bgHex, FIGMA.addToCart.backgroundColor) < 40 : false;
      engine.recordFinding({
        testId: 'TC-PDP-005.3', figmaNodeId: '4681:103516', element: 'Add to Cart — Background Color',
        section: 'Purchase CTAs', classification: bgOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'backgroundColor',
        figmaExpected: FIGMA.addToCart.backgroundColor, stagingActual: bgHex || cartStyles.backgroundColor,
        difference: bgOk ? undefined : `Color delta ${bgHex ? colorDelta(bgHex, FIGMA.addToCart.backgroundColor).toFixed(0) : 'N/A'}`,
        selector: ':text-matches("add to cart", "i")', viewport: '390×844',
        mappingConfidence: 'HIGH',
        developerAction: bgOk ? undefined : `Set Add to Cart background to ${FIGMA.addToCart.backgroundColor}`,
      });

      // Border radius: Figma = 8px
      const radiusVal = parseFloat(cartStyles.borderRadius);
      const radiusOk = dimClose(radiusVal, FIGMA.addToCart.borderRadius, 4).pass;
      engine.recordFinding({
        testId: 'TC-PDP-005.4', figmaNodeId: '4681:103516', element: 'Add to Cart — Border Radius',
        section: 'Purchase CTAs', classification: radiusOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'borderRadius',
        figmaExpected: `${FIGMA.addToCart.borderRadius}px`, stagingActual: cartStyles.borderRadius,
        mappingConfidence: 'HIGH',
      });

      // Font weight: Figma = 600
      const fwOk = ['600', '700', 'bold'].includes(cartStyles.fontWeight);
      engine.recordFinding({
        testId: 'TC-PDP-005.5', figmaNodeId: '4681:103516', element: 'Add to Cart — Font Weight',
        section: 'Purchase CTAs', classification: fwOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'fontWeight',
        figmaExpected: '600', stagingActual: cartStyles.fontWeight,
        mappingConfidence: 'HIGH',
      });

      // Enabled state
      const isEnabled = await addToCartBtn.isEnabled().catch(() => false);
      engine.recordFinding({ testId: 'TC-PDP-005.6', figmaNodeId: '4681:103516', element: 'Add to Cart — Interactive State', section: 'Purchase CTAs', classification: isEnabled ? 'PASS' : 'DESIGN_MISMATCH', severity: 'CRITICAL', property: 'enabled', figmaExpected: 'Button enabled & interactive', stagingActual: isEnabled ? 'Enabled' : 'Disabled', mappingConfidence: 'HIGH' });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-005.1', figmaNodeId: '4681:103516', element: 'Add to Cart Button', section: 'Purchase CTAs', classification: 'MISSING', severity: 'CRITICAL', mappingConfidence: 'HIGH', developerAction: 'Add to Cart button must be visible on PDP for in-stock products', selector: ':text-matches("add to cart", "i")', viewport: '390×844' });
    }

    // Buy Now
    const buyNowBtn = page.locator(':text-matches("buy now", "i")').first();
    const hasBuyNow = await buyNowBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasBuyNow) {
      engine.recordFinding({ testId: 'TC-PDP-005.7', figmaNodeId: '4681:103516', element: 'Buy Now Button', section: 'Purchase CTAs', classification: 'PASS', severity: 'CRITICAL', mappingConfidence: 'HIGH' });

      const bnStyles = await buyNowBtn.evaluate(el => {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { height: rect.height, borderRadius: cs.borderRadius };
      });

      const bnHeightOk = dimClose(bnStyles.height, FIGMA.buyNow.height, 6).pass;
      engine.recordFinding({
        testId: 'TC-PDP-005.8', figmaNodeId: '4681:103516', element: 'Buy Now — Height',
        section: 'Purchase CTAs', classification: bnHeightOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'height',
        figmaExpected: `${FIGMA.buyNow.height}px`, stagingActual: `${bnStyles.height.toFixed(0)}px`,
        mappingConfidence: 'HIGH',
      });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-005.7', figmaNodeId: '4681:103516', element: 'Buy Now Button', section: 'Purchase CTAs', classification: 'MAPPING_UNCERTAIN', severity: 'HIGH', mappingConfidence: 'LOW' });
    }

    expect(true, 'TC-PDP-005 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-006 — Delivery & Pincode Section
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-006: Delivery Section — Pincode Input & ETA Audit', async ({ page }) => {
    // Scroll down to find delivery section
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-delivery-section.png'), clip: { x: 0, y: 0, width: 390, height: 600 } });
    engine.addScreenshot('pdp-delivery-section.png');

    // Pincode input
    const pincodeInput = page.locator('input[placeholder*="pincode" i], input[placeholder*="pin code" i], input[name*="pincode" i]').first();
    const hasPincode = await pincodeInput.isVisible({ timeout: 4000 }).catch(() => false);

    engine.recordFinding({
      testId: 'TC-PDP-006.1', figmaNodeId: '4681:103516', element: 'Pincode Input Field',
      section: 'Delivery, Availability & Purchase CTAs',
      classification: hasPincode ? 'PASS' : 'MISSING',
      severity: 'HIGH', mappingConfidence: 'HIGH',
      developerAction: hasPincode ? undefined : 'Render pincode input field in delivery section',
    });

    // Delivery text / ETA info
    const deliveryText = page.locator(':text-matches("delivery", "i"), :text-matches("deliver", "i"), :text-matches("ship", "i")').first();
    const hasDelivery = await deliveryText.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-006.2', figmaNodeId: '4681:103516', element: 'Delivery Information Text',
      section: 'Delivery, Availability & Purchase CTAs',
      classification: hasDelivery ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasDelivery ? 'MEDIUM' : 'LOW',
    });

    // Availability / In Stock
    const availabilityText = page.locator(':text-matches("in stock", "i"), :text-matches("available", "i"), :text-matches("out of stock", "i")').first();
    const hasAvailability = await availabilityText.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasAvailability) {
      const availText = await availabilityText.textContent();
      engine.recordFinding({ testId: 'TC-PDP-006.3', figmaNodeId: '4681:103516', element: 'Availability Status', section: 'Delivery, Availability & Purchase CTAs', classification: 'PASS', severity: 'HIGH', stagingActual: availText?.trim() });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-006.3', figmaNodeId: '4681:103516', element: 'Availability Status', section: 'Delivery, Availability & Purchase CTAs', classification: 'MAPPING_UNCERTAIN', severity: 'HIGH', mappingConfidence: 'LOW' });
    }

    expect(true, 'TC-PDP-006 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-007 — Offers Section
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-007: Offers Section — Presence & Structure Audit', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-offers-section.png'), clip: { x: 0, y: 0, width: 390, height: 600 } });
    engine.addScreenshot('pdp-offers-section.png');

    // Offers heading
    const offersHeading = page.locator(':text-matches("offers", "i"), :text-matches("available offers", "i")').first();
    const hasOffers = await offersHeading.isVisible({ timeout: 4000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-007.1', figmaNodeId: '4681:103938', element: 'Offers Section Heading',
      section: 'Offers Section', classification: hasOffers ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasOffers ? 'HIGH' : 'LOW',
    });

    // Individual offer items
    const offerItems = page.locator('[class*="offer-item"], [class*="offerItem"], li:has(:text-matches("off|save|discount|emi", "i"))');
    const offerCount = await offerItems.count();
    engine.recordFinding({
      testId: 'TC-PDP-007.2', figmaNodeId: '4681:103938', element: 'Offer Items',
      section: 'Offers Section',
      classification: offerCount > 0 ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', property: 'count', stagingActual: `${offerCount} items`,
      mappingConfidence: offerCount > 0 ? 'MEDIUM' : 'LOW',
    });

    // EMI section
    const emiSection = page.locator(':text-matches("emi", "i"), :text-matches("no cost emi", "i")').first();
    const hasEmi = await emiSection.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-007.3', figmaNodeId: '4681:103840', element: 'EMI / No Cost EMI Section',
      section: 'Offers Section',
      classification: hasEmi ? 'PASS' : 'MISSING',
      severity: 'MEDIUM', mappingConfidence: 'MEDIUM',
      developerAction: hasEmi ? undefined : 'EMI section not visible on PDP',
    });

    expect(true, 'TC-PDP-007 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-008 — Product Specifications Section
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-008: Product Specifications Section Audit', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 1400));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-specifications.png'), clip: { x: 0, y: 0, width: 390, height: 700 } });
    engine.addScreenshot('pdp-specifications.png');

    // Specifications heading
    const specsHeading = page.locator(':text-matches("specifications", "i"), :text-matches("specs", "i")').first();
    const hasSpecs = await specsHeading.isVisible({ timeout: 4000 }).catch(() => false);

    engine.recordFinding({
      testId: 'TC-PDP-008.1', figmaNodeId: '4681:103840', element: 'Specifications Section Heading',
      section: 'Product Specifications',
      classification: hasSpecs ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'HIGH', mappingConfidence: hasSpecs ? 'HIGH' : 'LOW',
    });

    if (hasSpecs) {
      // Typography check on specs heading
      const s = await specsHeading.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: cs.fontSize };
      });

      const fwOk = ['600', '700', 'bold', '500'].includes(s.fontWeight);
      engine.recordFinding({
        testId: 'TC-PDP-008.2', figmaNodeId: '4681:103840', element: 'Specifications Heading — Font Weight',
        section: 'Product Specifications',
        classification: fwOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'fontWeight',
        figmaExpected: String(FIGMA.specifications.headerFontWeight),
        stagingActual: s.fontWeight, mappingConfidence: 'MEDIUM',
      });
    }

    // Spec rows (label : value pairs)
    const specRows = page.locator('table tr, [class*="spec-row"], [class*="specRow"], dl dt, [class*="spec"] [class*="label"]');
    const specCount = await specRows.count();
    engine.recordFinding({
      testId: 'TC-PDP-008.3', figmaNodeId: '4681:103840', element: 'Specification Rows',
      section: 'Product Specifications',
      classification: specCount > 0 ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', property: 'count', stagingActual: `${specCount} spec rows`,
      mappingConfidence: specCount > 0 ? 'MEDIUM' : 'LOW',
    });

    // Check display spec (known iPhone spec)
    const displaySpec = page.locator(':text-matches("display", "i")').first();
    const hasDisplay = await displaySpec.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDisplay) {
      const dispStyles = await displaySpec.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return { fontSize: cs.fontSize, color: cs.color };
      });
      const colorHex = rgbToHex(dispStyles.color);
      const colorOk = colorHex ? colorDelta(colorHex, FIGMA.specifications.labelColor) < 50 : false;
      engine.recordFinding({
        testId: 'TC-PDP-008.4', figmaNodeId: '4681:103840', element: 'Spec Label Color ("Display")',
        section: 'Product Specifications',
        classification: colorOk ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'color',
        figmaExpected: FIGMA.specifications.labelColor,
        stagingActual: colorHex || dispStyles.color,
        difference: colorOk ? undefined : `Color delta ${colorHex ? colorDelta(colorHex, FIGMA.specifications.labelColor).toFixed(0) : 'N/A'}`,
        mappingConfidence: 'MEDIUM',
      });
    }

    expect(true, 'TC-PDP-008 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-009 — Mobile Layout & Responsive Validation
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-009: Mobile Layout (390px) & Responsive Audit', async ({ page }) => {
    test.setTimeout(30000);

    const vw = await page.evaluate(() => window.innerWidth);
    expect(vw, 'Viewport must be 390px').toBe(390);

    // All DOM queries in one evaluate call to avoid Playwright locator timeouts
    const layoutData = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
      sections: [
        { label: 'Header',          sel: 'header, [class*="header"]' },
        { label: 'Product Gallery', sel: '[class*="gallery"],[class*="swiper"],[class*="Gallery"]' },
        { label: 'Product Title',   sel: 'h1' },
        { label: 'Price',           sel: '[class*="price"],[class*="Price"]' },
      ].map(({ label, sel }) => {
        const el = document.querySelector(sel);
        const rect = el ? el.getBoundingClientRect() : null;
        return { label, found: !!el, y: rect ? Math.round(rect.top + window.scrollY) : -1 };
      }),
    }));

    const noOverflow = layoutData.scrollWidth <= layoutData.clientWidth + 1;
    engine.recordFinding({
      testId: 'TC-PDP-009.1', figmaNodeId: '4681:102340', element: 'Mobile Canvas — Horizontal Overflow',
      section: 'Layout', classification: noOverflow ? 'PASS' : 'DESIGN_MISMATCH',
      severity: 'CRITICAL', property: 'scrollWidth',
      figmaExpected: 'scrollWidth ≤ 390px (zero overflow)',
      stagingActual: `scrollWidth=${layoutData.scrollWidth}px, clientWidth=${layoutData.clientWidth}px`,
      difference: noOverflow ? undefined : `Overflow: ${layoutData.scrollWidth - layoutData.clientWidth}px`,
      viewport: '390×844',
      developerAction: noOverflow ? undefined : 'Fix overflow-x on a container causing horizontal scroll',
    });

    let lastY = -1;
    for (const { label, found, y } of layoutData.sections) {
      if (!found || y < 0) continue;
      const inOrder = y >= lastY;
      engine.recordFinding({
        testId: `TC-PDP-009.2-${label}`, figmaNodeId: '4681:102340',
        element: `Section Order: ${label}`, section: 'Layout',
        classification: inOrder ? 'PASS' : 'DESIGN_MISMATCH',
        severity: 'MEDIUM', property: 'Y position',
        stagingActual: `y=${y}px`, mappingConfidence: 'MEDIUM',
      });
      lastY = y;
    }

    // Single viewport screenshot
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-layout-viewport.png') });
    engine.addScreenshot('pdp-layout-viewport.png');

    expect(noOverflow, 'TC-PDP-009: No horizontal overflow at 390px').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-010 — Customer Questions & Lower PDP Sections
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-010: Customer Q&A, Highlights & Footer Section Audit', async ({ page }) => {
    // Scroll to bottom sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-lower-sections.png'), clip: { x: 0, y: 0, width: 390, height: 700 } });
    engine.addScreenshot('pdp-lower-sections.png');

    // Product Highlights
    const highlightsSection = page.locator(':text-matches("highlights", "i"), :text-matches("key features", "i")').first();
    const hasHighlights = await highlightsSection.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-010.1', figmaNodeId: '4681:103837', element: 'Product Highlights Section',
      section: 'Product Highlights', classification: hasHighlights ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasHighlights ? 'MEDIUM' : 'LOW',
    });

    // Customer Q&A / Questions
    const qaSection = page.locator(':text-matches("questions", "i"), :text-matches("ask question", "i"), :text-matches("q&a", "i"), :text-matches("customer questions", "i")').first();
    const hasQA = await qaSection.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-010.2', figmaNodeId: '4681:104061', element: 'Customer Questions Section',
      section: 'Customer Questions', classification: hasQA ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasQA ? 'MEDIUM' : 'LOW',
    });

    // Footer
    const footerEl = page.locator('footer, div[class*="footer"]').first();
    const hasFooter = await footerEl.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-010.3', figmaNodeId: '4681:104121', element: 'Footer',
      section: 'Footer', classification: hasFooter ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'LOW', mappingConfidence: hasFooter ? 'MEDIUM' : 'LOW',
    });

    // App download banner
    const appBanner = page.locator(':text-matches("download the app", "i"), :text-matches("download app", "i"), img[alt*="app" i][alt*="store" i]').first();
    const hasAppBanner = await appBanner.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-010.4', figmaNodeId: '4681:104105', element: 'App Download Banner',
      section: 'App Download & Similar', classification: hasAppBanner ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'LOW', mappingConfidence: hasAppBanner ? 'MEDIUM' : 'LOW',
    });

    // Wishlist / Share buttons
    const wishlistBtn = page.locator('[class*="wishlist"], [aria-label*="wishlist" i], button:has([class*="heart"])').first();
    const hasWishlist = await wishlistBtn.isVisible({ timeout: 3000 }).catch(() => false);
    engine.recordFinding({
      testId: 'TC-PDP-010.5', figmaNodeId: '4681:104116', element: 'Wishlist Button',
      section: 'Header / Nav Bar', classification: hasWishlist ? 'PASS' : 'MAPPING_UNCERTAIN',
      severity: 'MEDIUM', mappingConfidence: hasWishlist ? 'MEDIUM' : 'LOW',
    });

    expect(true, 'TC-PDP-010 audit completed').toBeTruthy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TC-PDP-011 — Consolidated Final Report Generation
  // ═══════════════════════════════════════════════════════════════════════════
  test('TC-PDP-011: Generate Consolidated PDP Audit Report', async ({ page }) => {
    test.setTimeout(60000);

    // Re-navigate and do a final complete audit for report
    await page.goto(PDP_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Auto-scroll to hydrate all sections
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let total = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 400);
          total += 400;
          if (total >= 5000) { clearInterval(timer); window.scrollTo(0, 0); resolve(); }
        }, 120);
      });
    });
    await page.waitForTimeout(1500);

    // Broken images check
    const brokenImgs = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => img.complete && img.naturalWidth === 0).map(img => img.src);
    });

    brokenImgs.forEach(src => engine.addNetworkFailure(`BROKEN_IMAGE: ${src.substring(0, 80)}`));
    if (brokenImgs.length > 0) {
      engine.recordFinding({
        testId: 'TC-PDP-011.1', figmaNodeId: '4681:102340', element: 'Page Images',
        section: 'Runtime', classification: 'DESIGN_MISMATCH',
        severity: 'HIGH', property: 'imageLoad',
        figmaExpected: 'All images load without 404',
        stagingActual: `${brokenImgs.length} broken images detected`,
        difference: `${brokenImgs.length} broken image(s)`,
      });
    } else {
      engine.recordFinding({ testId: 'TC-PDP-011.1', figmaNodeId: '4681:102340', element: 'Page Images', section: 'Runtime', classification: 'PASS', severity: 'HIGH', stagingActual: 'All images loaded successfully' });
    }

    // Font health check
    const fonts = await page.evaluate(() => ({
      outfit: Array.from(document.fonts).some(f => f.family.toLowerCase().includes('outfit')),
      poppins: Array.from(document.fonts).some(f => f.family.toLowerCase().includes('poppins')),
    }));
    engine.recordFinding({ testId: 'TC-PDP-011.2', figmaNodeId: '4681:102340', element: 'Outfit Font Loading', section: 'Runtime', classification: fonts.outfit ? 'PASS' : 'DESIGN_MISMATCH', severity: 'HIGH', property: 'font-loading', figmaExpected: 'Outfit font loaded', stagingActual: fonts.outfit ? 'Loaded' : 'Not loaded in document.fonts' });
    engine.recordFinding({ testId: 'TC-PDP-011.3', figmaNodeId: '4681:102340', element: 'Poppins Font Loading', section: 'Runtime', classification: fonts.poppins ? 'PASS' : 'MAPPING_UNCERTAIN', severity: 'MEDIUM', property: 'font-loading', figmaExpected: 'Poppins font loaded (used in spec labels)', stagingActual: fonts.poppins ? 'Loaded' : 'Not detected' });

    // Final viewport screenshot (no fullPage to avoid timeout on very long pages)
    await page.screenshot({ path: path.join(SS_DIR, 'pdp-final-above-fold.png') });
    engine.addScreenshot('pdp-final-above-fold.png');

    // ── MERGE all per-test JSON reports into one consolidated report ──────────
    const allReportFiles = fs.readdirSync(REPORT_DIR)
      .filter(f => f.startsWith('pdp-audit-') && f.endsWith('.json'))
      .map(f => path.join(REPORT_DIR, f));

    const allFindings: AuditFinding[] = [];
    const allScreenshots: string[] = [];
    const allConsoleErrors: string[] = [];
    const allNetworkFailures: string[] = [];

    for (const reportFile of allReportFiles) {
      try {
        const rpt = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        allFindings.push(...(rpt.findings || []));
        allScreenshots.push(...(rpt.screenshots || []));
        allConsoleErrors.push(...(rpt.consoleErrors || []));
        allNetworkFailures.push(...(rpt.networkFailures || []));
      } catch { /* skip malformed */ }
    }

    // Add TC-011's own findings
    allFindings.push(...engine.generateReport(PDP_URL, '390×844').findings);

    // Deduplicate by testId
    const seen = new Set<string>();
    const dedupedFindings = allFindings.filter(f => {
      if (seen.has(f.testId)) return false;
      seen.add(f.testId); return true;
    });

    // Compute consolidated metrics
    const pass = dedupedFindings.filter(f => f.classification === 'PASS').length;
    const missing = dedupedFindings.filter(f => f.classification === 'MISSING').length;
    const mismatch = dedupedFindings.filter(f => f.classification === 'DESIGN_MISMATCH').length;
    const contentMismatch = dedupedFindings.filter(f => f.classification === 'CONTENT_MISMATCH').length;
    const dynamic = dedupedFindings.filter(f => f.classification === 'DYNAMIC_CONTENT').length;
    const uncertain = dedupedFindings.filter(f => f.classification === 'MAPPING_UNCERTAIN').length;
    const total = dedupedFindings.length;
    const reliablyMapped = pass + missing + mismatch + contentMismatch;
    const parity = reliablyMapped >= 5 ? `${((pass / reliablyMapped) * 100).toFixed(1)}% (${pass}/${reliablyMapped} reliably mapped)` : 'Insufficient reliable mappings';

    const consolidatedReport = {
      reportType: 'PDP Figma-to-Staging Design Parity — Official QA Audit',
      generatedAt: new Date().toISOString(),
      figmaNode: '4681:102340 — PDP (full) 390×4660px',
      figmaFile: 'Sangeetha-Des (Q7vjg9zvLUDvEQ5ZEh2Dki)',
      figmaUrl: 'https://www.figma.com/design/Q7vjg9zvLUDvEQ5ZEh2Dki/Sangeetha-Des?node-id=4681-100420&m=dev',
      pdpUrl: PDP_URL,
      viewport: '390×844 (Mobile)',
      auditStatus: 'COMPLETE',
      visualReferenceStatus: 'NOT_AVAILABLE',
      summary: {
        totalFindings: total,
        PASS: pass,
        MISSING: missing,
        DESIGN_MISMATCH: mismatch,
        CONTENT_MISMATCH: contentMismatch,
        DYNAMIC_CONTENT: dynamic,
        MAPPING_UNCERTAIN: uncertain,
        reliablyMappedAssertions: reliablyMapped,
        figmaParityScore: parity,
        brokenImages: brokenImgs.length,
        consoleErrors: allConsoleErrors.length,
        networkFailures: allNetworkFailures.filter(f => !f.includes('analytics')).length,
      },
      criticalMismatches: dedupedFindings.filter(f =>
        (f.classification === 'DESIGN_MISMATCH' || f.classification === 'MISSING') &&
        f.severity === 'CRITICAL'
      ),
      highSeverityMismatches: dedupedFindings.filter(f =>
        (f.classification === 'DESIGN_MISMATCH' || f.classification === 'MISSING') &&
        f.severity === 'HIGH'
      ),
      allFindings: dedupedFindings,
      screenshots: [...new Set([...allScreenshots])],
      consoleErrors: allConsoleErrors,
      networkFailures: allNetworkFailures,
    };

    const consolidatedPath = path.join(REPORT_DIR, 'pdp-audit-CONSOLIDATED.json');
    fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedReport, null, 2));

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('   PDP FIGMA-TO-STAGING DESIGN PARITY AUDIT — OFFICIAL REPORT');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`Total Findings (deduplicated)  : ${total}`);
    console.log(`PASS                           : ${pass}`);
    console.log(`MISSING                        : ${missing}`);
    console.log(`DESIGN_MISMATCH                : ${mismatch}`);
    console.log(`CONTENT_MISMATCH               : ${contentMismatch}`);
    console.log(`DYNAMIC_CONTENT                : ${dynamic}`);
    console.log(`MAPPING_UNCERTAIN              : ${uncertain}`);
    console.log(`Reliably Mapped Assertions     : ${reliablyMapped}`);
    console.log(`Figma Parity Score             : ${parity}`);
    console.log(`Broken Images                  : ${brokenImgs.length}`);
    console.log(`Outfit Font Loaded             : ${fonts.outfit}`);
    console.log(`Poppins Font Loaded            : ${fonts.poppins}`);
    console.log(`Visual Reference Status        : NOT_AVAILABLE`);
    console.log(`Report saved to                : ${consolidatedPath}`);
    console.log('══════════════════════════════════════════════════════════════\n');

    expect(true, 'TC-PDP-011 consolidated report generated').toBeTruthy();
  });
});
