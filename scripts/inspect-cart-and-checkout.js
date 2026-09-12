const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SS_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/checkout-discovery');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'auth-state-sangeetha.json',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  console.log('--- 1. Navigating to Cart ---');
  await page.goto('https://www.sangeetha.com/cart', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  const cartButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => (b.innerText || '').trim()).filter(Boolean);
  });
  console.log('Cart Buttons:', cartButtons);

  // Check Address Change Modal in Cart
  const changeBtn = page.locator('button:has-text("Change"), span:has-text("Change")').first();
  if (await changeBtn.isVisible().catch(() => false)) {
    console.log('Tapping Change button...');
    await changeBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, 'cart_address_modal.png') });
    console.log('Address Modal Text:', (await page.innerText('body')).slice(0, 800));

    // Check if there is an Add Address button
    const addAddrBtn = page.locator('button:has-text("Add New"), button:has-text("Add Address"), div:has-text("Add New Address")').first();
    if (await addAddrBtn.isVisible().catch(() => false)) {
      console.log('Tapping Add Address button...');
      await addAddrBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SS_DIR, 'cart_add_new_address_form.png') });
      console.log('New Address Form Text:', (await page.innerText('body')).slice(0, 800));
    }
  }

  // Scroll down in Cart and find Proceed to Buy
  console.log('--- 2. Cart Proceed to Buy ---');
  await page.goto('https://www.sangeetha.com/cart', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  // Scroll down
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SS_DIR, 'cart_scrolled_summary.png') });

  const summaryInfo = await page.evaluate(() => {
    return {
      text: document.body.innerText.slice(0, 1500),
      buttons: Array.from(document.querySelectorAll('button')).map(b => (b.innerText || '').trim()).filter(Boolean)
    };
  });
  console.log('Cart Summary Info:', JSON.stringify(summaryInfo, null, 2));

  // Click Proceed to Buy or Checkout CTA
  const proceedBtn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Checkout"), button:has-text("Buy Now")').first();
  if (await proceedBtn.isVisible().catch(() => false)) {
    console.log('Tapping Proceed to Buy...');
    await proceedBtn.click({ force: true });
    await page.waitForTimeout(3000);
    console.log('Destination URL after Proceed to Buy:', page.url());
  }

  await browser.close();
}

run().catch(console.error);
