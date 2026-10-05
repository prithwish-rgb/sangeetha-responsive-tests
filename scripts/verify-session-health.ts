import { chromium, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function verifySessionHealth(): Promise<void> {
  const sangeethaAuthPath = path.resolve('auth-state-sangeetha.json');
  const defaultAuthPath = path.resolve('auth-state.json');
  const authStatePath = fs.existsSync(sangeethaAuthPath) 
    ? sangeethaAuthPath 
    : (fs.existsSync(defaultAuthPath) ? defaultAuthPath : null);

  if (!authStatePath) {
    console.error('❌ [AUTH HEALTH CHECK FAILED] No auth state file found (auth-state-sangeetha.json or auth-state.json).');
    console.error('Precondition Failure: Authenticated test execution requires a valid saved session state.');
    console.error('💡 GitHub Actions repository secret AUTH_STATE_BASE64/AUTH_STATE_JSON is missing.');
    process.exit(1);
  }

  let authData: any;
  try {
    authData = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
  } catch (err: any) {
    console.error('❌ [AUTH HEALTH CHECK FAILED] Failed to parse auth state file as JSON:', err.message);
    process.exit(1);
  }

  // Check if localStorage entries exist
  const lsEntries = authData?.origins?.[0]?.localStorage || [];
  const jwtEntry = lsEntries.find((e: any) => e.name === 'jwtoken');

  if (!jwtEntry || !jwtEntry.value) {
    console.error('❌ [AUTH HEALTH CHECK FAILED] Missing "jwtoken" in stored auth state.');
    console.error('Precondition Failure: The stored session does not contain a valid JWT authorization token.');
    process.exit(1);
  }

  console.log('[AUTH HEALTH CHECK] Stored auth file detected. Verifying session against live production...');

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      storageState: authStatePath,
    });

    const page = await context.newPage();

    // Inject localStorage entries directly
    await page.addInitScript((entries) => {
      entries.forEach((item: any) => {
        try { localStorage.setItem(item.name, item.value); } catch (e) {}
      });
    }, lsEntries);

    const baseUrl = process.env.BASE_URL || 'https://www.sangeetha.com';
    const response = await page.goto(`${baseUrl}/cart`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    const isLoginRedirect = currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl.includes('/signin');

    if (isLoginRedirect) {
      console.error('❌ [AUTH HEALTH CHECK FAILED] Session is EXPIRED or INVALID.');
      console.error(`Precondition Failure: Navigating to /cart was redirected to login: ${currentUrl}`);
      console.error('Please refresh the authentication session state before scheduled execution.');
      await browser.close();
      process.exit(1);
    }

    // Check if token remains in localStorage on active page
    const liveToken = await page.evaluate(() => {
      return localStorage.getItem('jwtoken');
    }).catch(() => null);

    if (!liveToken) {
      console.error('❌ [AUTH HEALTH CHECK FAILED] "jwtoken" was cleared by the application on load.');
      console.error('Precondition Failure: Token rejected by frontend authentication layer.');
      await browser.close();
      process.exit(1);
    }

    console.log('✅ [AUTH HEALTH CHECK PASSED] Session is ACTIVE and authenticated on live production.');
    console.log(`   - Verified Route: /cart (Status: ${response?.status() || 200})`);
    console.log(`   - Target Viewport: Pixel 5 (393x851)`);
    console.log(`   - Authentication State: Validated`);

    await browser.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ [AUTH HEALTH CHECK ERROR] Unexpected network or browser error during verification:', error.message);
    await browser.close().catch(() => {});
    process.exit(1);
  }
}

verifySessionHealth();
