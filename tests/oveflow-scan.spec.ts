import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.sangeethamobiles.com';

async function freezePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-duration: 0s !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

async function getOverflow(page: Page, width: number): Promise<number> {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(60);
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

test('find every width where the site actually breaks (overflows)', async ({ page }) => {
  test.setTimeout(180000);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await freezePage(page);
  await page.waitForTimeout(500);

  const MIN_WIDTH = 320;
  const MAX_WIDTH = 1920;
  const STEP = 8; // cheap measurement (2 numbers), so a fine step is affordable

  const readings: { width: number; overflow: number }[] = [];
  for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += STEP) {
    readings.push({ width: w, overflow: await getOverflow(page, w) });
  }

  // find every width where overflow status changed (0 -> positive, or vice versa)
  const transitions: { fromWidth: number; toWidth: number; fromOverflow: number; toOverflow: number }[] = [];
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const prevBroken = prev.overflow > 5; // small tolerance for rounding
    const currBroken = curr.overflow > 5;
    if (prevBroken !== currBroken) {
      transitions.push({
        fromWidth: prev.width,
        toWidth: curr.width,
        fromOverflow: prev.overflow,
        toOverflow: curr.overflow,
      });
    }
  }

  console.log(`\n=== Overflow scan: ${MIN_WIDTH}px to ${MAX_WIDTH}px, step ${STEP}px ===`);
  console.log(`${transitions.length} transition zone(s) found where the page starts/stops overflowing:\n`);

  for (const t of transitions) {
    // pinpoint the exact pixel within this small zone
    let low = t.fromWidth;
    let high = t.toWidth;
    const lowBroken = t.fromOverflow > 5;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const midOverflow = await getOverflow(page, mid);
      const midBroken = midOverflow > 5;
      if (midBroken === lowBroken) low = mid; else high = mid;
    }
    const before = await getOverflow(page, low);
    const after = await getOverflow(page, high);
    console.log(`Exact break point: ${low}px (overflow=${before}px) -> ${high}px (overflow=${after}px)`);

    await page.setViewportSize({ width: low, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/break-${low}-before.png`, fullPage: true });

    await page.setViewportSize({ width: high, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `screenshots/break-${high}-after.png`, fullPage: true });
  }

  // also report the widest overflow found anywhere, and where
  const worst = readings.reduce((a, b) => (b.overflow > a.overflow ? b : a));
  console.log(`\nWorst overflow: ${worst.overflow}px at ${worst.width}px viewport width`);

  await test.info().attach('overflow-scan', {
    body: JSON.stringify({ readings, transitions, worst }, null, 2),
    contentType: 'application/json',
  });

  expect(true).toBe(true); // discovery test — always passes, the findings are the point
});