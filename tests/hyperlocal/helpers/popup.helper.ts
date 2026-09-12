import { Page } from '@playwright/test';

export async function dismissBlockingPopups(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);

  const closeSelectors = [
    '.location-header-popup .close',
    '.location-header-popup .btn-close',
    '.location-header-popup [data-dismiss="modal"]',
    '.location-header-popup [data-bs-dismiss="modal"]',
    '.modal.show .close',
    '.modal.show .btn-close',
    '.offcanvas.show .btn-close',
    '.offcanvas.show .close',
    '[data-dismiss="modal"]',
    '[data-bs-dismiss="modal"]',
    '[data-bs-dismiss="offcanvas"]',
  ];

  for (const sel of closeSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  const stillBlocked = await page
    .locator('.modal.show, .offcanvas.show, .modal-backdrop, .offcanvas-backdrop')
    .first()
    .isVisible()
    .catch(() => false);

  if (stillBlocked) {
    await page.evaluate(() => {
      document.querySelectorAll('.modal.show, .offcanvas.show').forEach((el) => el.remove());
      document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach((el) => el.remove());
      document.body.classList.remove('modal-open', 'offcanvas-open');
      document.body.style.overflow = 'auto';
    });
  }
}

export async function gotoAndDismissPopups(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissBlockingPopups(page);
}
