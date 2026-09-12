const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SS_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/checkout-discovery');

async function deepDiscovery() {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'auth-state-sangeetha.json',
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();

  const apiLogs = [];
  page.on('request', req => {
    if (req.url().includes('sangeetha.com/b/') || req.url().includes('api')) {
      apiLogs.push({ method: req.method(), url: req.url(), data: req.postData() ? req.postData().slice(0, 300) : null });
    }
  });

  console.log('--- 1. Navigating to /checkout ---');
  await page.goto('https://www.sangeetha.com/checkout', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SS_DIR, '01_checkout_main.png') });

  // 2. Test Order Summary Expand/Collapse
  console.log('--- 2. Order Summary Accordion ---');
  const summaryToggle = page.locator('button:has-text("Total Payable Amount"), div:has-text("Total Payable Amount")').first();
  if (await summaryToggle.isVisible().catch(() => false)) {
    await summaryToggle.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SS_DIR, '02_order_summary_expanded.png') });
  }

  // 3. Test Offers Drawer
  console.log('--- 3. Offers Drawer ---');
  const offersBtn = page.locator('button:has-text("View"), div:has-text("Offers") button').first();
  if (await offersBtn.isVisible().catch(() => false)) {
    await offersBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, '03_offers_drawer.png') });

    const offersContent = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 1500),
        couponInput: !!document.querySelector('input[placeholder*="coupon" i], input[placeholder*="code" i]'),
        buttons: Array.from(document.querySelectorAll('button')).map(b => (b.innerText || '').trim())
      };
    });
    console.log('Offers Drawer Content:', JSON.stringify(offersContent, null, 2));

    // Close offer drawer
    const closeOffers = page.locator('button:has-text("Apply"), svg.lucide-x, button:has-text("Close"), [aria-label="Close"]').first();
    if (await closeOffers.isVisible().catch(() => false)) {
      await closeOffers.click({ force: true });
      await page.waitForTimeout(1500);
    }
  }

  // 4. Test Address Drawer (Change Address)
  console.log('--- 4. Address Drawer ---');
  const changeAddressBtn = page.locator('button:has-text("Change"), span:has-text("Change"), div:has-text("Change")').first();
  if (await changeAddressBtn.isVisible().catch(() => false)) {
    await changeAddressBtn.click({ force: true });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SS_DIR, '04_address_drawer.png') });

    const addressDrawerContent = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 1500),
        addNewBtn: Array.from(document.querySelectorAll('button, a')).map(b => (b.innerText || '').trim()).filter(t => /add|new|address/i.test(t)),
        savedAddresses: Array.from(document.querySelectorAll('[class*="address"], [class*="card"]')).map(c => (c.innerText || '').trim().slice(0, 100))
      };
    });
    console.log('Address Drawer Content:', JSON.stringify(addressDrawerContent, null, 2));

    // Check Add New Address Form
    const addNewBtn = page.locator('button:has-text("Add New"), button:has-text("Add Address"), div:has-text("Add New")').first();
    if (await addNewBtn.isVisible().catch(() => false)) {
      await addNewBtn.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SS_DIR, '05_add_new_address_form.png') });

      const addressFormFields = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
          type: i.getAttribute('type'),
          name: i.getAttribute('name'),
          placeholder: i.getAttribute('placeholder'),
          id: i.getAttribute('id')
        }));
      });
      console.log('Address Form Fields:', JSON.stringify(addressFormFields, null, 2));
    }
  }

  // 5. Test Payment Methods (Card vs UPI)
  console.log('--- 5. Payment Methods ---');
  await page.goto('https://www.sangeetha.com/checkout', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);

  const upiOption = page.locator('button:has-text("UPI"), div:has-text("UPI")').first();
  if (await upiOption.isVisible().catch(() => false)) {
    await upiOption.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, '06_upi_method_selected.png') });

    const upiContent = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 1500),
        inputs: Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type,
          placeholder: i.placeholder,
          name: i.name
        }))
      };
    });
    console.log('UPI Method Content:', JSON.stringify(upiContent, null, 2));
  }

  // 6. Test RBI Guideline Card Consent & Pay Button
  console.log('--- 6. Card Payment Form & CTA States ---');
  const cardOption = page.locator('button:has-text("Credit/Debit Card"), div:has-text("Credit/Debit Card"), button:has-text("Pay with Card")').first();
  if (await cardOption.isVisible().catch(() => false)) {
    await cardOption.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SS_DIR, '07_card_method_selected.png') });
  }

  console.log('--- 7. Production API Endpoints Captured ---');
  console.log(JSON.stringify(apiLogs, null, 2));

  await browser.close();
}

deepDiscovery().catch(err => {
  console.error('Deep discovery failed:', err);
  process.exit(1);
});
