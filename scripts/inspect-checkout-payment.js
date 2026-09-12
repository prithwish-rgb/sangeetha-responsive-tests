const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SS_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/checkout-discovery');

async function inspectCheckoutPayment() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'auth-state-sangeetha.json',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  console.log('--- Navigating to /checkout-payment ---');
  await page.goto('https://www.sangeetha.com/checkout-payment', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SS_DIR, 'checkout_payment_top.png') });

  const pageDetails = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      text: document.body.innerText,
      allButtons: Array.from(document.querySelectorAll('button, [role="button"], a')).map(b => ({
        text: (b.innerText || '').trim(),
        tag: b.tagName,
        class: b.className
      })).filter(b => b.text.length > 0),
      allInputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name,
        value: i.value
      }))
    };
  });

  console.log('Page Details:', JSON.stringify(pageDetails, null, 2));

  // Scroll down to inspect bottom CTA and footer
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SS_DIR, 'checkout_payment_bottom.png') });

  // Test UPI click
  const upiBtn = page.locator('button:has-text("UPI"), div:has-text("UPI")').first();
  if (await upiBtn.isVisible().catch(() => false)) {
    console.log('Clicking UPI button...');
    await upiBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, 'checkout_payment_upi_expanded.png') });
  }

  await browser.close();
}

inspectCheckoutPayment().catch(console.error);
