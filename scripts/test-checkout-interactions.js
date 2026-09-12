const { chromium } = require('playwright');
const path = require('path');

async function testInteractions() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'auth-state-sangeetha.json',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto('https://www.sangeetha.com/checkout-payment', { waitUntil: 'networkidle' });

  console.log('--- 1. Testing Total Payable Amount Dropdown ---');
  const summaryBtn = page.locator('button:has-text("Total Payable Amount")').first();
  if (await summaryBtn.isVisible()) {
    await summaryBtn.click();
    await page.waitForTimeout(1500);
    const text = await page.innerText('body');
    console.log('Summary Content:\n', text.slice(0, 800));
  }

  console.log('--- 2. Testing UPI Selection ---');
  const upiBtn = page.locator('button:has-text("UPI")').first();
  if (await upiBtn.isVisible()) {
    await upiBtn.click();
    await page.waitForTimeout(1500);
    const text = await page.innerText('body');
    console.log('UPI Expanded Content:\n', text.slice(0, 1000));
  }

  console.log('--- 3. Testing Offers View ---');
  const viewOffers = page.locator('button:has-text("View")').first();
  if (await viewOffers.isVisible()) {
    await viewOffers.click();
    await page.waitForTimeout(1500);
    const text = await page.innerText('body');
    console.log('Offers Drawer Content:\n', text.slice(0, 1000));
  }

  await browser.close();
}

testInteractions().catch(console.error);
