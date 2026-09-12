import { Page, Locator } from '@playwright/test';
import {
  parseEtaToMinutes,
  parseEtaFromDeliveryImage,
  isUndeliverableText,
  isInvalidPincodeText,
} from './eta-parser.helper';
import { dismissBlockingPopups } from './popup.helper';

/** Set to true (or wire up an env var) to bring back the verbose [diagnostic]/[debug]
 *  console output used while tracking down the selector/badge-race issues. Off by
 *  default so normal runs only show the per-cycle summary the spec file prints. */
const DEBUG = false;

/** Ways to open the pincode modal — site uses different markup per layout (desktop vs mobile .delivery_link). */
const CHANGE_PINCODE_SELECTORS = [
  '.delivery_link :has-text(/change/i)',
  '.delivery_link',
  '.delivery_web__input span:has-text(/change/i)',
  '.delivery_web__inputBox',
  'button:has-text(/change/i)',
  'span:has-text(/change/i)',
  'text=/change pincode/i',
];

/** Where ETA renders after a pincode is applied (desktop and mobile .delivery_link). */
const ETA_READ_SELECTORS = [
  '.delivery_link ~ div',
  '.delivery_link',
  '.delivery_web__inputBox',
  '.pincode_details',
  '.delivery-lists__flx',
  '.pincode_delivery_status',
  'text=/unavailable for delivery/i',
  'text=/currently unavailable/i',
  'text=/Delivery in/i',
  'text=/Get delivery in/i',
];

const DYNAMIC_ETA_PATTERNS = [
  /delivery in\s*\d+/i,
  /delivery by\s*\d+/i,
  /get delivery in/i,
  /express delivery in/i,
  /deliver(?:y|ed)? within/i,
  /not deliverable/i,
  /unavailable for delivery/i,
  /currently unavailable/i,
  /out of (?:delivery )?range/i,
  /\d+\s*(?:hrs?|hours?|mins?|minutes?)/i,
];

const EXCLUDE_WORDS = ['review', 'system', 'cancellation', 'option', 'question', 'brand', 'policy', 'packaging', 'return'];

export interface PincodeApplyResult {
  success: boolean;
  rawEtaText: string | null;
  invalidPincode: boolean;
  undeliverable?: boolean;
  errorMessage?: string;
}

export type EtaStatus = 'OUT_OF_STOCK' | 'WITHIN_SLA' | 'BEYOND_SLA' | 'UNKNOWN' | 'INVALID_PINCODE' | 'ERROR';

/** Anything at or under this counts as within SLA — includes the 30-min badge case. */
const SLA_THRESHOLD_MINUTES = 120;

export interface EtaCheckOutcome {
  etaMinutes: number | null;
  rawEtaText: string | null;
  undeliverable: boolean;
  invalidPincode: boolean;
  /** Single field to log/branch on: OUT_OF_STOCK stays OUT_OF_STOCK, never gets an SLA verdict. */
  status: EtaStatus;
  /** true only when etaMinutes is known AND <= 120. Always false for OUT_OF_STOCK/ERROR/INVALID_PINCODE/UNKNOWN. */
  withinSla: boolean;
  errorMessage?: string;
}

const COMMON_PINCODE_INPUT_SELECTOR = [
  '.modal.show input.form-control-cart',
  '.modal.show input[type="number"]',
  '.modal.show input',
  '.offcanvas.show input',
  'input.form-control-cart',
  '.modal input',
  '.offcanvas input',
].join(', ');

async function clickChangePincode(page: Page, timeoutMs: number): Promise<void> {
  const pincodeInput = page.locator(COMMON_PINCODE_INPUT_SELECTOR).first();
  if (await pincodeInput.isVisible().catch(() => false)) {
    return;
  }

  // Primary Desktop trigger: Header location dropdown button
  const locHeaderBtn = page.locator('#dropdown-mega-menu, .mega_menu_location').first();
  if (await locHeaderBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await locHeaderBtn.click({ force: true }).catch(() => { });
    await page.waitForTimeout(500);

    // If "Type manually" button appears in dropdown, click it to open the pincode modal
    const typeManually = page.locator('.dropdown-menu.show button:has-text("Type manually"), button:has-text("Type manually")').first();
    if (await typeManually.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await typeManually.click({ force: true }).catch(() => { });
      const inputOpened = await pincodeInput.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false);
      if (inputOpened) return;
    }
  }

  // Secondary triggers (PDP inline "Change" span / mobile .delivery_link)
  const changeTriggers = [
    '.delivery_web__input span:has-text(/change/i)',
    '.delivery_web__input span',
    '.delivery_web__input',
    '.delivery_web__inputBox',
    '.delivery_link :has-text(/change/i)',
    '.delivery_link button',
    '.delivery_link a',
    '.delivery_link span',
    '.delivery_link',
    'button:has-text(/change/i)',
    'span:has-text(/change/i)',
  ];

  for (const selector of changeTriggers) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await el.scrollIntoViewIfNeeded().catch(() => { });
      await el.click({ timeout: 3_000 }).catch(() => { });

      const typeManually = page.locator('button:has-text("Type manually")').first();
      if (await typeManually.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await typeManually.click({ force: true }).catch(() => { });
      }

      const inputOpened = await pincodeInput.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false);
      if (inputOpened) return;
    }
  }
}

export function looksLikeRealEtaText(text: string): boolean {
  const t = text.trim();
  if (!t || ['change', 'check', 'enter pincode'].includes(t.toLowerCase())) return false;
  if (EXCLUDE_WORDS.some((word) => t.toLowerCase().includes(word))) return false;
  return DYNAMIC_ETA_PATTERNS.some((p) => p.test(t));
}

/**
 * PROOF OF FRESHNESS. Both .delivery_web__inputBox and .addr_header_desc are
 * ALREADY present on the page before pincode submission — their content
 * updates in place, they don't newly appear. So a single
 * waitFor({state:'visible'}) check resolves immediately and proves nothing
 * about whether the value has actually updated for the pincode just
 * submitted. This polls the actual value/text every 300ms until it matches
 * or the timeout runs out, instead of checking once too early.
 */
async function waitForPincodeConfirmed(page: Page, pincode: string, timeoutMs: number): Promise<boolean> {
  const pollStart = Date.now();
  const pollIntervalMs = 300;

  const targetPincode = pincode.trim();

  while (Date.now() - pollStart < timeoutMs) {
    // Ensure we are still on the PDP and haven't accidentally navigated to search or an error page
    if (!page.url().includes('/product-details/')) {
      return false;
    }

    // 1. Check all candidate inputs (inputValue)
    const inputs = page.locator('.delivery_web__inputBox input, .delivery_web__input input, input[placeholder*="Pincode" i], input[placeholder*="pin" i]');
    const inputCount = await inputs.count().catch(() => 0);
    for (let i = 0; i < inputCount; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => '');
      if (val.trim() === targetPincode) return true;
    }

    // 2. Check desktop & mobile pincode container elements (innerText)
    const containers = page.locator('.delivery_web__inputBox, .delivery_web__input, .addr_header_desc, .pincode_details, .delivery_block__sticky, .delivery_link');
    const containerCount = await containers.count().catch(() => 0);
    for (let i = 0; i < containerCount; i++) {
      const text = await containers.nth(i).innerText().catch(() => '');
      if (text.includes(targetPincode)) return true;
    }

    // 3. Fallback: page-wide search for "Deliver to <pincode>" in PDP delivery text
    const deliverToVisible = await page
      .getByText(`Deliver to ${targetPincode}`, { exact: false })
      .isVisible()
      .catch(() => false);
    if (deliverToVisible) return true;

    await page.waitForTimeout(pollIntervalMs);
  }

  return false;
}

/**
 * Reads delivery ETA, now in two stages:
 *   1. Text patterns (unchanged from before — these are reliable on their own).
 *   2. Image badge (e.g. the "30-minute delivery" icon) — RESTORED here,
 *      but only ever checked AFTER waitForPincodeConfirmed() has already
 *      proven the page is showing fresh content for this pincode. This is
 *      the fix: the image itself was never the problem, reading it before
 *      the page updated was.
 */
/**
 * Reads delivery ETA. Text patterns are checked FIRST on every poll — including
 * "unavailable" — because that message is authoritative and time-sensitive
 * (it can render after the promotional badge is already in the DOM).
 * The image badge is only trusted if it lives inside the delivery-status
 * container itself, never as a page-wide fallback — a page-wide img[alt*="minute"]
 * match will happily find a static "30-min delivery" promo icon that has
 * nothing to do with the pincode just submitted.
 */
async function readDeliveryEta(
  page: Page,
  timeoutMs: number
): Promise<{ text: string | null; confidence: 'confirmed' | 'unconfirmed'; source: 'text' | 'image' | 'none' }> {
  const pollStart = Date.now();

  const detailsText = page.locator('.details-text, .delivery_web__block .details-text, .delivery_block__sticky .details-text').first();

  // stage 1: TEXT ONLY, for the entire timeout window. No image check in here.
  while (Date.now() - pollStart < timeoutMs) {
    if (await detailsText.isVisible({ timeout: 500 }).catch(() => false)) {
      const text = (await detailsText.innerText().catch(() => '')).trim();
      if (looksLikeRealEtaText(text)) {
        return { text, confidence: 'confirmed', source: 'text' };
      }
    }

    for (const selector of ETA_READ_SELECTORS) {
      const block = page.locator(selector).first();
      if (!(await block.isVisible({ timeout: 500 }).catch(() => false))) continue;
      const text = (await block.innerText().catch(() => '')).trim();
      if (looksLikeRealEtaText(text)) {
        return { text, confidence: 'confirmed', source: 'text' };
      }
    }

    await page.waitForTimeout(500);
  }

  // stage 2: image badge — ONLY checked here, after the full text-polling
  // window is exhausted with nothing found. Never inside the loop above —
  // see the historical note: checking it inside the loop lets a static
  // promo badge win a race against genuinely async "unavailable" text.
  const deliveryImg = page
    .locator([
      '.delivery_block__sticky .delivery-lists__flx img',
      '.delivery_web__block .details-text img',
      '.details-text img',
      '.delivery_web__block img',
      'img[alt*="delivery-image" i]',
      'img[alt*="30-min" i]',
    ].join(', '))
    .first();
  if ((await deliveryImg.count().catch(() => 0)) > 0) {
    const alt = await deliveryImg.getAttribute('alt').catch(() => null);
    const src = await deliveryImg.getAttribute('src').catch(() => null);
    let etaFromImg = parseEtaFromDeliveryImage(alt, src);
    if (etaFromImg === null && alt) {
      const m = alt.match(/(\d+)\s*-?\s*min/i);
      if (m) etaFromImg = parseInt(m[1], 10);
    }
    if (etaFromImg !== null) {
      return { text: `${etaFromImg} mins (badge: ${alt ?? 'image'})`, confidence: 'confirmed', source: 'image' };
    }
  }

  return { text: null, confidence: 'unconfirmed', source: 'none' };
}
export async function applyPincodeAndReadEta(
  page: Page,
  pincode: string,
  timeoutMs = 15_000
): Promise<PincodeApplyResult> {
  try {
    const preSubmitText = (
      await page.locator('.delivery_link, .details-text, .delivery_web__inputBox').first().innerText().catch(() => 'N/A')
    ).replace(/\s+/g, ' ');
    if (DEBUG) console.log(`  [diagnostic] delivery text BEFORE submitting pincode ${pincode}: "${preSubmitText}"`);

    if (DEBUG) {
      const deliverySectionHtml = await page.locator('.delivery_web__input, .delivery_web__inputBox, .pincode_details, .delivery_block__sticky, .delivery_link').first().evaluate(el => el.outerHTML).catch(() => 'NOT FOUND');
      console.log(`  [diagnostic] delivery section outerHTML BEFORE clickChangePincode:\n${deliverySectionHtml}`);
    }

    await dismissBlockingPopups(page).catch(() => { });
    await clickChangePincode(page, timeoutMs);

    const pincodeInput = page.locator(COMMON_PINCODE_INPUT_SELECTOR).first();

    let inputVisible = await pincodeInput
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!inputVisible) {
      await page.locator('.delivery_link, .delivery_web__inputBox, button:has-text("Change")').first().click({ force: true }).catch(() => { });
      inputVisible = await pincodeInput
        .waitFor({ state: 'visible', timeout: timeoutMs })
        .then(() => true)
        .catch(() => false);
    }

    if (!inputVisible) {
      return {
        success: false,
        rawEtaText: null,
        invalidPincode: false,
        errorMessage: 'Pincode input field not visible after clicking change control',
      };
    }

    await pincodeInput.fill(pincode);

    const submitBtn = page
      .locator('.offcanvas.show button, .modal.show button, button.btn-check-custom, button:has-text("Submit"), button:has-text("Check"), button:has-text("Apply")')
      .filter({ hasText: /submit|check|apply/i })
      .first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click({ timeout: timeoutMs });
    } else {
      await pincodeInput.press('Enter').catch(() => { });
    }

    const modal = page.locator('.modal.show, .offcanvas.show').first();
    await Promise.race([
      page.locator('text=/invalid pincode|enter valid pincode|not valid/i').waitFor({ state: 'visible', timeout: 3_000 }),
      modal.waitFor({ state: 'hidden', timeout: 4_000 }),
      page.waitForTimeout(2_500),
    ]).catch(() => { });

    // Close modal if backdrop is still open so PDP delivery elements are fully visible & accessible
    if (await modal.isVisible().catch(() => false)) {
      await modal.locator('.close_btn__offcanva, .btn-close, button[aria-label="Close"]').first().click({ force: true }).catch(() => { });
      await page.keyboard.press('Escape').catch(() => { });
      await modal.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => { });
    }

    const pageText = (await page.innerText('body').catch(() => '')).trim();
    if (isInvalidPincodeText(pageText)) {
      await modal.locator('button.close_btn__offcanva, .btn-close').click({ timeout: 2000 }).catch(() => { });
      return {
        success: false,
        rawEtaText: pageText,
        invalidPincode: true,
        errorMessage: 'Invalid pincode',
      };
    }

    // --- THE FIX: prove the page actually updated for THIS pincode
    // before trusting anything we read next (text OR image) ---
    const confirmed = await waitForPincodeConfirmed(page, pincode, timeoutMs);
    if (DEBUG) console.log(`  [diagnostic] pincode ${pincode} confirmed: ${confirmed}`);
    if (!confirmed) {
      return {
        success: false,
        rawEtaText: null,
        invalidPincode: false,
        errorMessage: `Page never confirmed pincode ${pincode} was applied — cannot trust any delivery info read after this point`,
      };
    }

    const etaRead = await readDeliveryEta(page, timeoutMs);
    const bodyDump = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (DEBUG) {
      console.log(`\n  [diagnostic] FULL BODY TEXT DUMP AFTER submitting pincode ${pincode}:\n--- START BODY DUMP (${pincode}) ---\n${bodyDump.slice(0, 3000)}\n--- END BODY DUMP (${pincode}) ---\n`);
      console.log(`  [diagnostic] readDeliveryEta result for ${pincode}: confidence="${etaRead.confidence}", source="${etaRead.source}", text="${etaRead.text}"`);
    }

    if (etaRead.confidence === 'confirmed' && etaRead.text) {
      const undeliverable = etaRead.text
        ? isUndeliverableText(etaRead.text)
        : isUndeliverableText(bodyDump);
      return { success: true, rawEtaText: etaRead.text, undeliverable, invalidPincode: false };
    }

    return {
      success: false,
      rawEtaText: null,
      invalidPincode: false,
      errorMessage: `Delivery ETA text not confirmed matching patterns for pincode ${pincode}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, rawEtaText: null, invalidPincode: false, errorMessage: message };
  }
}

export async function checkEtaForPincode(
  page: Page,
  pincode: string,
  timeoutMs = 15_000
): Promise<EtaCheckOutcome> {
  const result = await applyPincodeAndReadEta(page, pincode, timeoutMs);

  if (result.invalidPincode) {
    return {
      etaMinutes: null,
      rawEtaText: result.rawEtaText,
      undeliverable: false,
      invalidPincode: true,
      status: 'INVALID_PINCODE',
      withinSla: false,
      errorMessage: result.errorMessage,
    };
  }

  if (!result.success) {
    return {
      etaMinutes: null,
      rawEtaText: null,
      undeliverable: false,
      invalidPincode: false,
      status: 'ERROR',
      withinSla: false,
      errorMessage: result.errorMessage,
    };
  }

  // Out of stock / undeliverable stays its own bucket — no ETA math applies here,
  // regardless of anything the (unreliable, static) delivery badge might show.
  if (result.undeliverable || isUndeliverableText(result.rawEtaText)) {
    return {
      etaMinutes: null,
      rawEtaText: result.rawEtaText,
      undeliverable: true,
      invalidPincode: false,
      status: 'OUT_OF_STOCK',
      withinSla: false,
    };
  }

  // Everything else — text ETA (e.g. "Delivery in 90 mins") or the 30-min badge,
  // which readDeliveryEta already normalizes to "30 mins (badge: ...)" — gets
  // parsed to minutes and checked against the 2hr SLA threshold.
  const etaMinutes = parseEtaToMinutes(result.rawEtaText);
  const withinSla = etaMinutes !== null && etaMinutes <= SLA_THRESHOLD_MINUTES;
  const status: EtaStatus = etaMinutes === null ? 'UNKNOWN' : withinSla ? 'WITHIN_SLA' : 'BEYOND_SLA';

  return {
    etaMinutes,
    rawEtaText: result.rawEtaText,
    undeliverable: false,
    invalidPincode: false,
    status,
    withinSla,
  };
}