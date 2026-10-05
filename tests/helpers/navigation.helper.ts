import { Page } from '@playwright/test';

export interface SafeNavigateOptions {
  label?: string;
  timeoutMs?: number;
  retries?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  retryDelayMs?: number;
}

/**
 * Bounded, idempotent navigation helper for live-site regression.
 *
 * Navigation is retried only as a read-only operation. No application state
 * is mutated by this helper.
 */
export async function safeNavigate(
  page: Page,
  url: string,
  options: SafeNavigateOptions = {}
): Promise<void> {
  const {
    label = 'navigation',
    timeoutMs = 30000,
    retries = 2,
    waitUntil = 'domcontentloaded',
    retryDelayMs = 1000,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`[NavigationHelper] ${label}: navigating (attempt ${attempt}/${retries + 1}) -> ${url}`);
      await page.goto(url, {
        waitUntil,
        timeout: timeoutMs,
      });
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[NavigationHelper] ${label}: attempt ${attempt} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      if (attempt <= retries) {
        await page.waitForTimeout(retryDelayMs * attempt);
      }
    }
  }

  throw new Error(
    `[NavigationHelper] ${label}: navigation failed after ${retries + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Retries a read-only readiness check without mutating application state.
 */
export async function retryReadUntilReady<T>(
  readFn: () => Promise<T>,
  options: { retries?: number; retryDelayMs?: number; label?: string } = {}
): Promise<T> {
  const {
    retries = 2,
    retryDelayMs = 500,
    label = 'readiness check',
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await readFn();
    } catch (error) {
      lastError = error;
      console.warn(
        `[NavigationHelper] ${label}: attempt ${attempt}/${retries + 1} failed.`
      );

      if (attempt <= retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[NavigationHelper] ${label} failed after ${retries + 1} attempts.`);
}
