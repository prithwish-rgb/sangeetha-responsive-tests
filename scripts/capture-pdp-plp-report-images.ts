import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.resolve('c:/sangeetha-responsive-tests/screenshots/report-assets');

async function captureReportAssets() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

  // Set default pincode
  await page.addInitScript(() => {
    localStorage.setItem('user_pincode', '560078');
    localStorage.setItem('pincode', '560078');
    localStorage.setItem('selected_pincode', '560078');
  });

  console.log('--- CAPTURING PLP ASSETS ---');
  // 1. PLP Main Grid
  await page.goto('https://www.sangeetha.com/category/smartphones/2', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PLP_01_Product_Grid_Mobile.png') });
  console.log('Captured: PLP_01_Product_Grid_Mobile.png');

  // 2. PLP Filter Drawer
  const filterBtn = page.locator('button:has-text("Filter"), div:has-text("Filter"), [class*="filter"]').first();
  if (await filterBtn.isVisible().catch(() => false)) {
    await filterBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'PLP_02_Filter_Drawer_Open.png') });
    console.log('Captured: PLP_02_Filter_Drawer_Open.png');

    // Close filter drawer if open
    const closeBtn = page.locator('button:has-text("Apply"), svg.lucide-x, button:has-text("Close")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  }

  // 3. PLP Sort Drawer / Modal
  const sortBtn = page.locator('button:has-text("Sort"), div:has-text("Sort"), [class*="sort"]').first();
  if (await sortBtn.isVisible().catch(() => false)) {
    await sortBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'PLP_03_Sort_Options_Drawer.png') });
    console.log('Captured: PLP_03_Sort_Options_Drawer.png');
  }

  console.log('--- CAPTURING PDP ASSETS ---');
  // 4. PDP Hero & Gallery
  await page.goto('https://www.sangeetha.com/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_01_Hero_Gallery_Overview.png') });
  console.log('Captured: PDP_01_Hero_Gallery_Overview.png');

  // 5. PDP Pricing, Savings & Offers
  await page.evaluate(() => window.scrollBy(0, 350));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_02_Pricing_Offers_Section.png') });
  console.log('Captured: PDP_02_Pricing_Offers_Section.png');

  // 6. PDP Variant Switcher (Color & Storage)
  await page.evaluate(() => window.scrollBy(0, 350));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_03_Color_and_Storage_Variants.png') });
  console.log('Captured: PDP_03_Color_and_Storage_Variants.png');

  // 7. PDP Sticky Action Bar during deep scroll
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_04_Sticky_Action_Bar_Scroll.png') });
  console.log('Captured: PDP_04_Sticky_Action_Bar_Scroll.png');

  // 8. PDP Specifications & Highlights
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_05_Specifications_Highlights.png') });
  console.log('Captured: PDP_05_Specifications_Highlights.png');

  // 9. PDP Ratings, Reviews & FAQs
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'PDP_06_Customer_Reviews_FAQs.png') });
  console.log('Captured: PDP_06_Customer_Reviews_FAQs.png');

  await browser.close();
  console.log('All report assets captured successfully!');
}

captureReportAssets().catch(err => {
  console.error('Error capturing assets:', err);
  process.exit(1);
});
