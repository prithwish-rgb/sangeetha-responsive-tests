import { test, devices } from '@playwright/test';
import { setPincodeViaLocalStorage } from './pincode-injection.helper';

test.use({
  ...devices['Pixel 5'],
  storageState: 'auth-staging-fresh.json',
});

test('Confirm Header Cart Icon Navigation', async ({ page }) => {
  await setPincodeViaLocalStorage(page, '560078', 'Bengaluru');
  await page.goto('https://smpl-new.bangalore2.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Homepage loaded. URL:', page.url());

  // Locate the cart icon button by aria-label or svg
  const cartBtn = page.locator('button[aria-label="Open cart"], button:has(svg.lucide-shopping-cart), button:has(svg)').last();
  console.log('Cart button visible:', await cartBtn.isVisible());

  await cartBtn.click();
  await page.waitForTimeout(3000);

  console.log('URL after clicking cart button:', page.url());
});
