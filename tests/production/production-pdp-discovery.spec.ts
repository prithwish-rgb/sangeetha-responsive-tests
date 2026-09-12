import { test, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://www.sangeetha.com';
const PIXEL_5 = {
  viewport: { width: 393, height: 851 },
  userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true
};

test('Discover Production Mobile PDP Features', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(PIXEL_5);
  const page = await context.newPage();

  const apis: any[] = [];
  page.on('request', req => {
    if (req.url().includes('/b/customer/api/')) {
      apis.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData()
      });
    }
  });

  console.log('Navigating to live PDP on Pixel 5...');
  await page.goto(`${BASE_URL}/product-details/redmi-17-5g-8gb-128gb-absolute-black/21266`, {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(3000);

  const ssDir = path.join(__dirname, '../../artifacts/screenshots/pdp-discovery');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
  await page.screenshot({ path: path.join(ssDir, 'pdp_top_view.png') });

  // Extract deep structural and interactive element details
  const pdpData = await page.evaluate(() => {
    const title = document.querySelector('h1, h2, [class*="product-title"], [class*="title"]')?.textContent?.trim();
    
    // Prices & discounts
    const allElements = Array.from(document.querySelectorAll('*'));
    const prices = allElements
      .map(el => el.textContent?.trim() || '')
      .filter(t => (t.startsWith('₹') || t.includes('Save') || t.includes('OFF') || t.includes('MRP')) && t.length < 35);
    
    // Buttons & CTAs
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map(b => ({
        text: b.textContent?.trim() || '',
        className: b.className,
        tag: b.tagName
      }))
      .filter(b => b.text.length > 0 && b.text.length < 50);

    // Images / Gallery / Carousel
    const images = Array.from(document.querySelectorAll('img'))
      .map(img => ({
        src: img.src,
        alt: img.alt,
        className: img.className
      }))
      .filter(img => !img.src.includes('data:image') || img.alt.length > 0);

    // Variant selector elements
    const variantHeadings = allElements
      .map(el => el.textContent?.trim() || '')
      .filter(t => ['Color', 'Storage', 'RAM', 'Internal Memory', 'Size', 'Select Color', 'Select Storage', 'Select RAM'].includes(t));

    // Variant options / pills / chips
    const variantPills = allElements
      .map(el => el.textContent?.trim() || '')
      .filter(t => /^(4\s?GB|6\s?GB|8\s?GB|12\s?GB|64\s?GB|128\s?GB|256\s?GB|512\s?GB|Black|Blue|Green|White|Silver|Gold|Absolute Black|Starry Black|Midnight Black)$/i.test(t));

    // Headings / Accordions / Sections
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, summary, [class*="heading"], [class*="title"], [class*="accordion"]'))
      .map(h => h.textContent?.trim() || '')
      .filter(h => h.length > 0 && h.length < 60);

    // Delivery text
    const deliveryTexts = allElements
      .map(el => el.textContent?.trim() || '')
      .filter(t => (t.includes('Delivery') || t.includes('Deliver to') || t.includes('Check Pincode') || t.includes('Standard Delivery')) && t.length < 60);

    // Sticky mobile action bar at bottom
    const fixedElements = Array.from(document.querySelectorAll('.fixed, .sticky, [class*="fixed"], [class*="sticky"]'))
      .map(el => ({
        text: el.textContent?.trim() || '',
        className: el.className
      }));

    return {
      title,
      uniquePrices: Array.from(new Set(prices)),
      buttonTexts: Array.from(new Set(buttons.map(b => b.text))),
      imageCount: images.length,
      sampleImages: images.slice(0, 8),
      variantHeadings: Array.from(new Set(variantHeadings)),
      variantPills: Array.from(new Set(variantPills)),
      headings: Array.from(new Set(headings)),
      deliveryTexts: Array.from(new Set(deliveryTexts)),
      fixedElementsSummary: fixedElements.map(f => f.text.slice(0, 60))
    };
  });

  console.log('--- PDP STRUCTURAL DISCOVERY DATA ---');
  console.log(JSON.stringify(pdpData, null, 2));

  console.log('--- PDP APIS CAPTURED ---');
  console.log(JSON.stringify(apis, null, 2));

  await context.close();
  await browser.close();
});
