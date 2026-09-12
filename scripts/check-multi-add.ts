import { chromium } from '@playwright/test';
import * as fs from 'fs';

async function main() {
  const authState = JSON.parse(fs.readFileSync('auth-state.json', 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authState });
  const page = await context.newPage();

  console.log('Navigating to homepage...');
  await page.goto('https://www.sangeethamobiles.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  // Check what modals exist
  const modals = page.locator('.modal.show, [role="dialog"]');
  const modalCount = await modals.count();
  console.log(`Found ${modalCount} open modals.`);
  for (let i = 0; i < modalCount; i++) {
    const text = await modals.nth(i).innerText().catch(() => '');
    const html = await modals.nth(i).evaluate(el => el.outerHTML.substring(0, 300)).catch(() => '');
    console.log(`Modal ${i} text: ${text.replace(/\n/g, ' ')}`);
    console.log(`Modal ${i} snippet: ${html}`);
  }

  // Dismiss any open modal
  const closeButtons = page.locator('.modal.show button.btn-close, .modal.show button:has-text("Close"), .modal.show button:has-text("Accept"), .modal.show button:has-text("✕")');
  if (await closeButtons.count() > 0) {
    console.log('Dismissing modal...');
    await closeButtons.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  const atcButtons = page.locator('button:has-text("add to cart"), button:has-text("Add to Cart"), button:has-text("Add To Cart")');
  const count = await atcButtons.count();
  console.log(`Found ${count} Add to Cart buttons on homepage.`);

  // Click second button (index 1 - e.g. OPPO)
  console.log('Clicking button 1...');
  await atcButtons.nth(1).scrollIntoViewIfNeeded();
  await atcButtons.nth(1).click();
  await page.waitForTimeout(4000);

  // Check if a modal or toast opened after clicking ATC
  const postAtcModals = page.locator('.modal.show');
  if (await postAtcModals.count() > 0) {
    console.log('Post ATC Modal:', (await postAtcModals.first().innerText()).replace(/\n/g, ' '));
    // Click close or continue shopping
    const closeBtn = postAtcModals.locator('button.btn-close, button:has-text("Continue"), button:has-text("Close")').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
  }

  console.log('Navigating to /cart...');
  await page.goto('https://www.sangeethamobiles.com/cart', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const cartCards = page.locator('.shopping-cart___wrap').filter({ hasText: 'Remove' });
  const cartCount = await cartCards.count();
  console.log(`Cart now has ${cartCount} items.`);

  for (let i = 0; i < cartCount; i++) {
    const text = await cartCards.nth(i).innerText();
    console.log(`Item #${i}: ${text.split('\n').filter(Boolean).slice(0, 3).join(' | ')}`);
  }

  await browser.close();
}

main().catch(console.error);
