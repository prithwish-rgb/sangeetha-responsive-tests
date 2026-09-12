import { defineConfig, devices } from '@playwright/test';
import { withPostman } from 'postman-playwright';

export default withPostman(
  defineConfig({
    testDir: './tests',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 90000,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
      baseURL: process.env.BASE_URL || 'https://www.sangeetha.com',
      screenshot: 'on',
      trace: 'on',
      video: 'on',              // records a video of every test, pass or fail
      navigationTimeout: 60000,
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      // Logged-in project — reuses the session saved by setup-auth.spec.ts.
      // Any test file meant to run authenticated should use this project
      // instead of plain 'chromium', e.g.:
      //   npx playwright test tests/cart.spec.ts --project=chromium-logged-in
      // This avoids needing to automate OTP entry for every test run.
      {
        name: 'chromium-logged-in',
        use: { ...devices['Desktop Chrome'], storageState: 'auth-state.json' },
      },
    ],
  })
);