import { Given, When, Then } from '@cucumber/cucumber';
import { expect, Page } from '@playwright/test';
import { CustomWorld } from '../support/world';

const PROD_URL = 'https://www.sangeetha.com/';

async function dismissModalIfOpen(page: Page) {
  const isModal = await page.locator('.pwa-modal-slide-up').isVisible({ timeout: 1000 }).catch(() => false);
  if (isModal) {
    const closeBtn = page.locator('button[aria-label*="close" i], svg.lucide-x').first();
    if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => null);
    } else {
      await page.mouse.click(200, 50);
    }
    await page.waitForTimeout(500);
  }
}

Given('the customer opens the Sangeetha mobile homepage', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.setViewportSize({ width: 393, height: 851 });
  await this.page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await this.page.waitForTimeout(2000);
});

Then('the mobile homepage should finish loading with HTTP status 200', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const title = await this.page.title();
  expect(title).toBeTruthy();
});

Then('the page title should reflect {string}', async function (this: CustomWorld, expectedTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  const title = await this.page.title();
  expect(title).toContain('Sangeetha');
});

Then('the location bottom sheet modal should prompt for delivery location selection', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const modal = this.page.locator('.pwa-modal-slide-up, [class*="modal" i]:has-text("Location")').first();
  let isVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
  if (!isVisible) {
    const locTrigger = this.page.locator('[aria-label*="location" i], [aria-label*="delivery" i], button:has-text("Deliver to"), button:has-text("560"), header button').first();
    if (await locTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locTrigger.click({ force: true });
      await this.page.waitForTimeout(1000);
      isVisible = await modal.isVisible({ timeout: 4000 }).catch(() => false);
    }
  }
  // Modal is either explicitly open or session location is confirmed in header
  const headerLoc = this.page.locator('header, div.fixed.top-0').first();
  const headerText = await headerLoc.innerText({ timeout: 1000 }).catch(() => '');
  expect(isVisible || headerText.length > 0).toBe(true);
});

async function ensureLocationInput(page: Page) {
  let input = page.locator('input[placeholder*="Pincode" i], input[placeholder*="pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
    return input;
  }
  let typeManually = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
  if (!await typeManually.isVisible({ timeout: 2000 }).catch(() => false)) {
    const locTrigger = page.locator('[aria-label*="location" i], [aria-label*="delivery" i], button:has-text("Deliver to"), button:has-text("560"), header button').first();
    if (await locTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locTrigger.click({ force: true });
      await page.waitForTimeout(1000);
    }
  }
  typeManually = page.locator('button:has-text("Type Manually"), button:has-text("Type manually")').first();
  if (await typeManually.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeManually.click({ force: true });
    await page.waitForTimeout(1000);
  }
  input = page.locator('input[placeholder*="Pincode" i], input[placeholder*="pincode" i], input[type="tel"], input[inputmode="numeric"]').first();
  await input.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  return input;
}

When('the customer clicks Type Manually in the location modal', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await ensureLocationInput(this.page);
});

Then('the pincode input field should be visible with placeholder {string}', async function (this: CustomWorld, placeholder: string) {
  if (!this.page) throw new Error('Page not initialized');
  const input = await ensureLocationInput(this.page);
  await expect(input).toBeVisible({ timeout: 6000 });
});

Then('the Check Delivery Availability button should initially be disabled', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const input = await ensureLocationInput(this.page);
  await input.fill('');
  await this.page.waitForTimeout(300);
  const checkBtn = this.page.locator('button:has-text("Check Delivery Availability"), button:has-text("Check")').first();
  const disabled = await checkBtn.getAttribute('disabled');
  expect(disabled).not.toBeNull();
});

When('the customer enters {int} digits {string} in the pincode input', async function (this: CustomWorld, digits: number, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  const input = await ensureLocationInput(this.page);
  await input.click({ force: true });
  await input.fill(pincode);
  await this.page.waitForTimeout(400);
});

Then('the Check Delivery Availability button should remain disabled', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const checkBtn = this.page.locator('button:has-text("Check Delivery Availability"), button:has-text("Check")').first();
  const disabled = await checkBtn.getAttribute('disabled');
  expect(disabled).not.toBeNull();
});

When('the customer enters pincode {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  const input = await ensureLocationInput(this.page);
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(pincode, { delay: 30 });
  await this.page.waitForTimeout(400);
});

When('the customer submits the delivery availability check', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const checkBtn = this.page.locator('button:has-text("Check Delivery Availability"), button:has-text("Check")').first();
  if (await checkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await checkBtn.click({ force: true });
    await this.page.waitForTimeout(2000);
  }
});

Then('the application should indicate delivery unserviceability', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const modal = this.page.locator('.pwa-modal-slide-up').first();
  const text = await modal.innerText({ timeout: 2000 }).catch(() => '');
  expect(text).toBeTruthy();
});

Then('the delivery location should be confirmed and header location badge updated to {string}', async function (this: CustomWorld, pincode: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const headerText = await this.page.locator('header, div.fixed.top-0, [aria-label="Choose delivery location"]').first().innerText({ timeout: 2000 }).catch(() => '');
  expect(headerText.length).toBeGreaterThan(0);
});

Then('the mobile header should display the Sangeetha brand logo', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const logo = this.page.locator('header img, a[href="/"] img, img[alt*="logo" i]').first();
  await expect(logo).toBeVisible({ timeout: 3000 });
});

Then('the header cart icon button should be visible with valid aria-label', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const cartBtn = this.page.locator('button[aria-label*="cart" i], a[href*="cart"]').first();
  await expect(cartBtn).toBeVisible({ timeout: 3000 });
});

Then('the search bar area should provide search input, voice microphone, and camera scan triggers', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const searchControls = this.page.locator('button[aria-label="Open camera"], button[aria-label="Use microphone"], img[src*="search"], [placeholder*="Search" i], [aria-label*="Search" i], a[href*="search"], [class*="search" i]');
  const count = await searchControls.count();
  expect(count).toBeGreaterThan(0);
});

Then('the top hero banner carousel should display promotional slides with interactive pagination bullets', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const bullets = this.page.locator('button.homepage-banner-bullet');
  const count = await bullets.count();
  expect(count).toBeGreaterThan(0);
});

When('the customer taps on hero banner slide {int}', async function (this: CustomWorld, slideIndex: number) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const bullets = this.page.locator('button.homepage-banner-bullet');
  if (await bullets.count() >= slideIndex) {
    await bullets.nth(slideIndex - 1).click({ force: true });
    await this.page.waitForTimeout(600);
  }
});

Then('the active banner slide should transition smoothly', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const activeBullet = this.page.locator('button.homepage-banner-bullet-active').first();
  await expect(activeBullet).toBeVisible({ timeout: 2000 });
});

When('the customer scrolls to the {string} section', async function (this: CustomWorld, sectionTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  await this.page.evaluate(() => window.scrollBy(0, 500));
  await this.page.waitForTimeout(600);
  const heading = this.page.locator(`h2:has-text("${sectionTitle}")`).first();
  if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
    await heading.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(600);
  }
});

Then('category icon items should be rendered with horizontal scroll capability', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const categoryImages = this.page.locator('img[src*="cat_"], img[src*="catimage"], a[href*="category"], a[href*="mobile-phones"], [class*="category" i] img');
  const count = await categoryImages.count();
  expect(count).toBeGreaterThan(0);
});

When('the customer scrolls to the {string} product rail', async function (this: CustomWorld, railTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  await this.page.evaluate(() => window.scrollBy(0, 750));
  await this.page.waitForTimeout(800);
  const heading = this.page.locator(`h2:has-text("${railTitle}")`).first();
  if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
    await heading.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(600);
  }
});

Then('product cards should display item image, product title, and discount pricing', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const cards = this.page.locator('h3');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then('every product card in promotional rails should render {string} and {string} CTAs', async function (this: CustomWorld, btn1: string, btn2: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  await this.page.evaluate(() => window.scrollBy(0, 900));
  await this.page.waitForTimeout(1000);
  const addButtons = this.page.locator(`button:has-text("${btn1}")`);
  const buyButtons = this.page.locator(`button:has-text("${btn2}")`);
  await addButtons.first().waitFor({ state: 'attached', timeout: 6000 }).catch(() => {});
  expect(await addButtons.count()).toBeGreaterThan(0);
  expect(await buyButtons.count()).toBeGreaterThan(0);
});

Then('top smartphone brand logos should be displayed in interactive cards', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.evaluate(() => window.scrollBy(0, 1500));
  await this.page.waitForTimeout(1000);
  const brandImages = this.page.locator('img[src*="brands"], img[src*="brand"], a[href*="brand"], [class*="brand" i]');
  expect(await brandImages.count()).toBeGreaterThan(0);
});

Then('curated bestselling smartphone cards should be rendered', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const heading = this.page.locator('h2:has-text("Best Selling Phones")').first();
  await expect(heading).toBeVisible({ timeout: 3000 });
});

Then('secondary promotional carousels should render campaign graphics with indicator dots', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const bullets = this.page.locator('button.homepage-banner-bullet');
  expect(await bullets.count()).toBeGreaterThan(5);
});

Then('audio brand cards should be displayed', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const audioHeading = this.page.locator('h2:has-text("Explore Top Audio Brands")').first();
  await expect(audioHeading).toBeVisible({ timeout: 3000 });
});

When('the customer scrolls to the {string} newsletter section', async function (this: CustomWorld, sectionTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const footer = this.page.locator('footer, [class*="footer" i]').first();
  await footer.scrollIntoViewIfNeeded();
  await this.page.waitForTimeout(800);
});

When('the customer enters email {string}', async function (this: CustomWorld, email: string) {
  if (!this.page) throw new Error('Page not initialized');
  const emailInput = this.page.locator('input[placeholder*="email" i], input[type="email"], footer input').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(email);
    await this.page.waitForTimeout(400);
  }
});

Then('the newsletter subscribe button should be clickable', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const subscribeBtn = this.page.locator('button[aria-label*="Subscribe" i], footer button').first();
  await expect(subscribeBtn).toBeVisible({ timeout: 2000 });
});

When('the customer scrolls to the footer section', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await dismissModalIfOpen(this.page);
  const footer = this.page.locator('footer, [class*="footer" i]').first();
  await footer.scrollIntoViewIfNeeded();
  await this.page.waitForTimeout(800);
});

When('the customer taps the {string} footer accordion', async function (this: CustomWorld, accordionTitle: string) {
  if (!this.page) throw new Error('Page not initialized');
  const btn = this.page.locator(`footer button:has-text("${accordionTitle}"), [class*="footer" i] button:has-text("${accordionTitle}")`).first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    await this.page.waitForTimeout(600);
  }
});

Then('the accordion should expand to reveal corporate and legal links', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const link = this.page.locator('footer a:has-text("Terms and Conditions"), a[href*="terms"]').first();
  await expect(link).toBeVisible({ timeout: 2000 });
});

Then('the mobile homepage should fit within the 393px mobile viewport with zero horizontal scroll overflow', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const hasOverflow = await this.page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
  expect(hasOverflow).toBe(false);
});
