const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SS_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/checkout-discovery');

async function discoverProductionCheckout() {
  if (!fs.existsSync(SS_DIR)) {
    fs.mkdirSync(SS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  const networkRequests = [];
  page.on('request', req => {
    if (req.url().includes('sangeetha.com') || req.url().includes('api')) {
      networkRequests.push({
        method: req.method(),
        url: req.url(),
        postData: req.postData() ? req.postData().slice(0, 200) : null
      });
    }
  });

  console.log('--- Step 1: Navigating to Live Production PDP ---');
  await page.goto('https://www.sangeetha.com/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SS_DIR, '01_pdp.png') });

  console.log('--- Step 2: Tapping Add to Cart on PDP ---');
  const addBtn = page.locator('.fixed.bottom-0 button:has-text("Add to Cart"), button:has-text("Add to Cart")').first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS_DIR, '02_after_add_to_cart.png') });
  }

  console.log('--- Step 3: Navigating to Cart ---');
  await page.goto('https://www.sangeetha.com/cart', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SS_DIR, '03_cart_page.png') });

  const cartContent = await page.evaluate(() => {
    return {
      url: window.location.href,
      bodyText: document.body.innerText.slice(0, 1000),
      buttons: Array.from(document.querySelectorAll('button, a[role="button"], a[href*="checkout"]')).map(b => ({
        text: (b.innerText || '').trim(),
        href: b.getAttribute('href'),
        className: b.className
      }))
    };
  });
  console.log('Cart Content:', JSON.stringify(cartContent, null, 2));

  console.log('--- Step 4: Tapping Proceed to Buy / Checkout ---');
  const proceedBtn = page.locator('button:has-text("Proceed to Buy"), button:has-text("Checkout"), a[href*="checkout"], button:has-text("Buy Now")').first();
  if (await proceedBtn.isVisible().catch(() => false)) {
    await proceedBtn.click({ force: true });
    await page.waitForTimeout(4000);
  } else {
    console.log('Proceed to buy not directly clicked, navigating to /checkout...');
    await page.goto('https://www.sangeetha.com/checkout', {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: path.join(SS_DIR, '04_checkout_or_auth.png') });

  const checkoutState = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      type: i.getAttribute('type'),
      placeholder: i.getAttribute('placeholder'),
      name: i.getAttribute('name'),
      id: i.getAttribute('id'),
      value: (i.value || '').slice(0, 30)
    }));

    const buttons = Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => ({
      text: (b.innerText || '').trim(),
      className: b.className
    }));

    return {
      url: window.location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 2000),
      inputs,
      buttons,
      scrollWidth: document.body.scrollWidth,
      scrollHeight: document.body.scrollHeight
    };
  });

  console.log('Checkout / Next State:', JSON.stringify(checkoutState, null, 2));

  // Step 5: Direct probe of /checkout
  console.log('--- Step 5: Direct probe of /checkout page ---');
  await page.goto('https://www.sangeetha.com/checkout', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SS_DIR, '05_checkout_direct.png') });

  const directCheckoutState = await page.evaluate(() => {
    return {
      url: window.location.href,
      bodyText: document.body.innerText.slice(0, 2000),
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(h => h.innerText.trim()),
      forms: Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.slice(0, 300)),
      inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        type: i.getAttribute('type'),
        placeholder: i.getAttribute('placeholder'),
        name: i.getAttribute('name'),
        id: i.getAttribute('id')
      })),
      buttons: Array.from(document.querySelectorAll('button')).map(b => (b.innerText || '').trim())
    };
  });
  console.log('Direct Checkout State:', JSON.stringify(directCheckoutState, null, 2));

  console.log('--- Key Network Requests captured ---');
  console.log(JSON.stringify(networkRequests.slice(-20), null, 2));

  await browser.close();
}

discoverProductionCheckout().catch(err => {
  console.error('Error during checkout discovery:', err);
  process.exit(1);
});
