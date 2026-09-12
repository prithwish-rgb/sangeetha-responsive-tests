import { test, devices } from '@playwright/test';
import appleVariantsData from './data/apple-variants.json';
import pincodesData from './data/pincodes.json';
import { runEtaSweep } from './orchestrator/eta-sweep.orchestrator';
import { writeSweepSummary } from './helpers/logger.helper';
import { ProductVariant, Pincode } from './types/hyperlocal.types';
import { writeEtaExcelReport } from './helpers/excel-logger.helper';

// Delivery/pincode markup was captured on mobile — desktop serves a different layout.
test.use({ viewport: { width: 1440, height: 900 } });

const variants = appleVariantsData as ProductVariant[]; // 10 variants (iPhone 15/16/17)
const pincodes = pincodesData as Pincode[]; // pincode pool

const TOTAL_CYCLES = parseInt(process.env.CYCLES || '5', 10);
const WAIT_BETWEEN_CYCLES_MS = 20_000;

// 100 cycles x 10 variants = 1,000 checks total, plus 100 x 20s wait between
// cycles (~33 min just in waits). At the per-check times seen in earlier runs
// (roughly 20-90s each depending on page load), this is realistically several
// hours end-to-end — this is meant to run unattended (overnight / CI), not as
// a quick interactive `--headed` run. Consider running headless for this one.
test('Hyperlocal ETA sweep — 100 cycles x 10 variants, per-cycle pincode reset', async ({ page }) => {
  const estimatedMs = TOTAL_CYCLES * (variants.length * 90_000 + WAIT_BETWEEN_CYCLES_MS);
  test.setTimeout(estimatedMs);

  console.log('\n==================================================');
  console.log('RUNNING ETA SWEEP');
  console.log(`Variants: ${variants.length} | Pincode pool: ${pincodes.length} | Cycles: ${TOTAL_CYCLES}`);
  console.log(`Estimated worst-case duration: ~${Math.round(estimatedMs / 60_000)} min`);
  console.log('==================================================\n');

  const summary = await runEtaSweep(page, variants, pincodes, {
    totalCycles: TOTAL_CYCLES,
    etaFailureThresholdMinutes: 120, // 2hrs — only logs to console when at/above this
    waitBetweenCyclesMs: WAIT_BETWEEN_CYCLES_MS,
    searchTimeoutMs: 10_000,
    pincodeApplyTimeoutMs: 15_000,
  });

  writeSweepSummary(summary);
  await writeEtaExcelReport();
});