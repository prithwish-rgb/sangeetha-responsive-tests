import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';

async function freezePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-duration: 0s !important;
        transition: none !important;
      }
    `,
  });
}

// "Health" of the page at a given width: how much visible text/content
// exists, and how many elements are actually rendered and visible.
async function getPageHealth(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(100);

  const visibleTextLength = await page.evaluate(() => document.body.innerText.trim().length);
  const visibleElementCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('body *')).filter(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).length;
  });

  return { width, visibleTextLength, visibleElementCount };
}

test('find every width where the page goes blank', async ({ page }) => {
  test.setTimeout(180000);

  // capture any JS errors the page throws, tagged with a rough width guess
  const jsErrors: { message: string; approxWidth: number }[] = [];
  let currentWidth = 0;
  page.on('pageerror', (err) => {
    jsErrors.push({ message: err.message, approxWidth: currentWidth });
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await freezePage(page);
  await page.waitForTimeout(500);

  const MIN_WIDTH = 320;
  const MAX_WIDTH = 1920;
  const STEP = 8;

  const readings: { width: number; visibleTextLength: number; visibleElementCount: number }[] = [];
  for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += STEP) {
    currentWidth = w;
    readings.push(await getPageHealth(page, w));
  }

  // establish a "normal" baseline from the median reading, then flag any
  // width where content collapses to a small fraction of that baseline
  const sortedText = [...readings].sort((a, b) => a.visibleTextLength - b.visibleTextLength);
  const medianText = sortedText[Math.floor(sortedText.length / 2)].visibleTextLength;
  const BLANK_THRESHOLD = medianText * 0.15; // less than 15% of normal content = effectively blank

  console.log(`\nBaseline (median) visible text length: ${medianText} chars`);
  console.log(`Flagging anything under ${Math.round(BLANK_THRESHOLD)} chars as "blank"\n`);

  const blankZones: { fromWidth: number; toWidth: number }[] = [];
  for (let i = 1; i < readings.length; i++) {
    const prevBlank = readings[i - 1].visibleTextLength < BLANK_THRESHOLD;
    const currBlank = readings[i].visibleTextLength < BLANK_THRESHOLD;
    if (prevBlank !== currBlank) {
      blankZones.push({ fromWidth: readings[i - 1].width, toWidth: readings[i].width });
    }
  }

  console.log(`=== ${blankZones.length} blank-page transition(s) found ===\n`);

  for (const zone of blankZones) {
    let low = zone.fromWidth;
    let high = zone.toWidth;
    const lowBlank = readings.find(r => r.width === low)!.visibleTextLength < BLANK_THRESHOLD;

    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      currentWidth = mid;
      const midHealth = await getPageHealth(page, mid);
      const midBlank = midHealth.visibleTextLength < BLANK_THRESHOLD;
      if (midBlank === lowBlank) low = mid; else high = mid;
    }

    const before = await getPageHealth(page, low);
    const after = await getPageHealth(page, high);
    console.log(
      `Exact transition: ${low}px (${before.visibleTextLength} chars, ${before.visibleElementCount} elements) -> ` +
      `${high}px (${after.visibleTextLength} chars, ${after.visibleElementCount} elements)`
    );

    await page.setViewportSize({ width: low, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/blank-${low}.png`, fullPage: true });

    await page.setViewportSize({ width: high, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/blank-${high}.png`, fullPage: true });
  }

  console.log(`\n=== JS errors captured during scan: ${jsErrors.length} ===`);
  for (const e of jsErrors) {
    console.log(`~${e.approxWidth}px: ${e.message}`);
  }

  await test.info().attach('blank-page-scan', {
    body: JSON.stringify({ readings, blankZones, jsErrors, medianText }, null, 2),
    contentType: 'application/json',
  });

  expect(true).toBe(true);
});