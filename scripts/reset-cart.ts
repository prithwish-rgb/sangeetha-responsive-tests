import { chromium, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { resetCartState } from '../tests/helpers/cart-flow.helper';

async function runCartReset(): Promise<void> {
  const sangeethaAuthPath = path.resolve('auth-state-sangeetha.json');
  const defaultAuthPath = path.resolve('auth-state.json');
  const authStatePath = fs.existsSync(sangeethaAuthPath) 
    ? sangeethaAuthPath 
    : (fs.existsSync(defaultAuthPath) ? defaultAuthPath : undefined);

  console.log('[Cart Reset Script] Starting deterministic cart reset...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    storageState: authStatePath,
  });

  const page = await context.newPage();

  if (authStatePath && fs.existsSync(authStatePath)) {
    try {
      const authData = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
      if (authData?.origins?.[0]?.localStorage) {
        await page.addInitScript((entries) => {
          entries.forEach((item: any) => {
            try { localStorage.setItem(item.name, item.value); } catch (e) {}
          });
        }, authData.origins[0].localStorage);
      }
    } catch (e) {}
  }

  try {
    await resetCartState(page);
    console.log('✅ [Cart Reset Script] Deterministic cart baseline established.');
    await browser.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ [Cart Reset Script] Error resetting cart state:', error.message);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

runCartReset();
