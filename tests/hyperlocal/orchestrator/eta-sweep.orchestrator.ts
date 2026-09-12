import { Page } from '@playwright/test';
import {
  ProductVariant,
  Pincode,
  EtaCheckResult,
  EtaSweepSummary,
  EtaSweepConfig,
  DEFAULT_CONFIG,
} from '../types/hyperlocal.types';
import { gotoAndDismissPopups } from '../helpers/popup.helper';
import { searchFor, openResult } from '../helpers/search.helper';
import { checkEtaForPincode } from '../helpers/pincode.helper';
import { PincodeTracker } from '../helpers/pincode-tracker.helper';
import { logCheck, logCycleStart, logCycleEnd, logError } from '../helpers/logger.helper';

const BASE_URL = 'https://www.sangeethamobiles.com';

function logStep(message: string): void {
  console.log(`  → ${message}`);
}

async function runSingleCheck(
  page: Page,
  cycle: number,
  variant: ProductVariant,
  pincode: Pincode,
  config: EtaSweepConfig
): Promise<EtaCheckResult> {
  const timestamp = new Date().toISOString();
  const base = { cycle, variant: variant.label, pincode: pincode.code, timestamp };

  page.setDefaultTimeout(config.pincodeApplyTimeoutMs);
  page.setDefaultNavigationTimeout(60_000);

  try {
    logStep(`[cycle ${cycle}] ${variant.label} @ ${pincode.code} — loading homepage`);
    await gotoAndDismissPopups(page, BASE_URL);

    logStep(`searching "${variant.searchTerm}"`);
    const { gotResults } = await searchFor(page, variant.searchTerm, config.searchTimeoutMs);
    if (!gotResults) {
      return {
        ...base,
        rawEtaText: null,
        etaMinutes: null,
        undeliverable: false,
        status: 'ERROR',
        errorMessage: 'Search returned no results',
      };
    }

    logStep('opening first search result');
    // Pass variant.searchTerm through so openResult can verify the clicked result
    // actually matches what we searched for, instead of blindly trusting index 0 —
    // that's what let a search for "iPhone 15" open an "iPhone 17 Pro" PDP on one run.
    const openState = await openResult(page, 0, config.pincodeApplyTimeoutMs, variant.searchTerm);
    if (!openState.navigated) {
      const status = openState.notFound ? 'NOT_FOUND' : 'ERROR';
      return {
        ...base,
        rawEtaText: null,
        etaMinutes: null,
        undeliverable: false,
        status,
        errorMessage: openState.errorMessage ?? 'Failed to reach a ready product page (navigation or PDP load failed)',
        pageUrl: openState.pageUrl ?? page.url(),
        pageTitle: openState.pageTitle,
      };
    }

    logStep(`applying pincode ${pincode.code}`);
    const etaResult = await checkEtaForPincode(page, pincode.code, config.pincodeApplyTimeoutMs);

    if (etaResult.invalidPincode) {
      return {
        ...base,
        rawEtaText: etaResult.rawEtaText,
        etaMinutes: null,
        undeliverable: false,
        status: 'INVALID_PINCODE',
        errorMessage: etaResult.errorMessage ?? 'Invalid pincode',
      };
    }

    if (etaResult.errorMessage) {
      return {
        ...base,
        rawEtaText: etaResult.rawEtaText,
        etaMinutes: null,
        undeliverable: false,
        status: 'ERROR',
        errorMessage: etaResult.errorMessage,
      };
    }

    if (etaResult.undeliverable) {
      return {
        ...base,
        rawEtaText: etaResult.rawEtaText,
        etaMinutes: null,
        undeliverable: true,
        status: 'UNDELIVERABLE',
      };
    }

    if (etaResult.etaMinutes === null) {
      return {
        ...base,
        rawEtaText: etaResult.rawEtaText,
        etaMinutes: null,
        undeliverable: false,
        status: 'ERROR',
        errorMessage: `Could not parse ETA from: "${etaResult.rawEtaText}"`,
      };
    }

    const status = etaResult.etaMinutes > config.etaFailureThresholdMinutes ? 'FAIL' : 'PASS';

    return {
      ...base,
      rawEtaText: etaResult.rawEtaText,
      etaMinutes: etaResult.etaMinutes,
      undeliverable: false,
      status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return {
      ...base,
      rawEtaText: null,
      etaMinutes: null,
      undeliverable: false,
      status: 'ERROR',
      errorMessage: stack ? `${message}\n${stack}` : message,
      pageUrl: page.url(),
      pageTitle: await page.title().catch(() => undefined),
    };
  }
}

export async function runEtaSweep(
  page: Page,
  variants: ProductVariant[],
  pincodes: Pincode[],
  config: EtaSweepConfig = DEFAULT_CONFIG
): Promise<EtaSweepSummary> {
  page.setDefaultTimeout(config.pincodeApplyTimeoutMs);
  page.setDefaultNavigationTimeout(60_000);

  const tracker = new PincodeTracker(pincodes);
  const startedAt = new Date().toISOString();

  const summary: EtaSweepSummary = {
    startedAt,
    finishedAt: '',
    totalCycles: config.totalCycles,
    totalChecks: 0,
    totalPass: 0,
    totalFail: 0,
    totalUndeliverable: 0,
    totalInvalidPincodes: 0,
    totalNotFound: 0,
    totalErrors: 0,
    failuresByVariant: {},
    failuresByPincode: {},
  };

  for (let cycle = 1; cycle <= config.totalCycles; cycle++) {
    logCycleStart(cycle, config.totalCycles);
    tracker.resetForNewCycle();

    let failuresThisCycle = 0;

    for (const variant of variants) {
      let pincode: Pincode;
      try {
        pincode = tracker.getNextUnusedPincode();
      } catch (err) {
        logError(`Cycle ${cycle}, variant "${variant.label}"`, err);
        continue;
      }

      const result = await runSingleCheck(page, cycle, variant, pincode, config);
      logCheck(result);

      summary.totalChecks++;
      if (result.status === 'PASS') summary.totalPass++;
      if (result.status === 'FAIL') {
        summary.totalFail++;
        failuresThisCycle++;
        summary.failuresByVariant[variant.label] = (summary.failuresByVariant[variant.label] ?? 0) + 1;
        summary.failuresByPincode[pincode.code] = (summary.failuresByPincode[pincode.code] ?? 0) + 1;
      }
      if (result.status === 'UNDELIVERABLE') summary.totalUndeliverable++;
      if (result.status === 'INVALID_PINCODE') summary.totalInvalidPincodes++;
      if (result.status === 'NOT_FOUND') summary.totalNotFound++;
      if (result.status === 'ERROR') summary.totalErrors++;
    }

    logCycleEnd(cycle, failuresThisCycle);

    if (cycle < config.totalCycles) {
      await page.waitForTimeout(config.waitBetweenCyclesMs);
    }
  }

  summary.finishedAt = new Date().toISOString();
  return summary;
}