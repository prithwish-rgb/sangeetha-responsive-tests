import { chromium } from '@playwright/test';
import * as fs from 'fs';

async function main() {
  const authState = JSON.parse(fs.readFileSync('auth-state.json', 'utf8'));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authState });
  const page = await context.newPage();

  await page.goto('https://www.sangeethamobiles.com/cart', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const saveLaterBtn = page.locator('button:has-text("Save For Later"), button:has-text("Save for later")').first();
  console.log('Save later button visible:', await saveLaterBtn.isVisible());
  if (await saveLaterBtn.isVisible()) {
    console.log('Clicking Save For Later...');
    await saveLaterBtn.click();
    await page.waitForTimeout(4000);
  }

  const allAddBtns = page.locator('button:has-text("Add to cart"), button:has-text("Add To Cart"), button:has-text("add to cart")');
  const count = await allAddBtns.count();
  console.log(`Total "Add to cart" buttons on /cart after Save for Later: ${count}`);

  for (let i = 0; i < count; i++) {
    const btn = allAddBtns.nth(i);
    const parentText = await btn.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "item") or contains(@class, "wrap") or contains(@class, "saved") or contains(@class, "row")][1]').innerText().catch(() => '');
    console.log(`Button #${i}: visible=${await btn.isVisible()}, text="${await btn.innerText()}", parent preview: ${parentText.split('\n').filter(Boolean).slice(0, 3).join(' | ')}`);
  }

  // Check saved for later text / headers
  const savedHeaders = page.locator('*:has-text("Saved for later")');
  console.log('Saved headers count:', await savedHeaders.count());
  for (let i = 0; i < Math.min(await savedHeaders.count(), 4); i++) {
    console.log(`Saved Header #${i} tagName=${await savedHeaders.nth(i).evaluate(el => el.tagName)}, text="${await savedHeaders.nth(i).innerText().catch(() => '')}"`);
  }

  // Now click Add to cart on the saved item
  if (count > 0) {
    console.log('Clicking Add to Cart on saved item...');
    await allAddBtns.first().click();
    await page.waitForTimeout(4000);
  }

  const activeItems = page.locator('.shopping-cart___wrap').filter({ hasText: 'Remove' });
  console.log('Active cart items count after restore:', await activeItems.count());

  await browser.close();
}

main().catch(console.error);
