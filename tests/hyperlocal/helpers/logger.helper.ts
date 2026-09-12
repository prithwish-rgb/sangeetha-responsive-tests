import * as fs from 'fs';
import * as path from 'path';
import { EtaCheckResult, EtaSweepSummary } from '../types/hyperlocal.types';
import { formatMinutesAsHrsMins } from './eta-parser.helper';
import { recordEtaCheckToExcel } from './excel-logger.helper';
const REPORTS_DIR = path.join(__dirname, '..', '..', '..', 'reports');
const FAILURES_JSONL_PATH = path.join(REPORTS_DIR, 'eta-failures.jsonl');
const ALL_RESULTS_JSONL_PATH = path.join(REPORTS_DIR, 'eta-all-results.jsonl');

function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function appendJsonLine(filePath: string, obj: unknown): void {
  ensureReportsDir();
  fs.appendFileSync(filePath, JSON.stringify(obj) + '\n', 'utf-8');
}

export function logCheck(result: EtaCheckResult): void {
  const etaDisplay =
    result.etaMinutes !== null ? formatMinutesAsHrsMins(result.etaMinutes) : (result.rawEtaText ?? 'N/A');

  // Every check still goes to the JSONL files regardless of console noise —
  // that's the full record for later analysis. Console output below is what's
  // filtered.
  appendJsonLine(ALL_RESULTS_JSONL_PATH, result);
  if (result.status === 'FAIL') {
    appendJsonLine(FAILURES_JSONL_PATH, result);
  }
  recordEtaCheckToExcel(result);

  // Console: only print when the ETA itself is the problem — i.e. status is
  // 'FAIL' (etaMinutes > config.etaFailureThresholdMinutes, which the
  // orchestrator sets to 120 = 2hrs). Everything under that threshold (PASS,
  // including the 30-min badge cases) stays out of the terminal entirely.
  //
  // ERROR / INVALID_PINCODE are NOT ETA problems — they're test-infra issues
  // (search failed, PDP never loaded, bad pincode format, etc.) and silencing
  // those would hide real breakage in the run itself. They're still printed,
  // just tagged clearly so they're not confused with an ETA failure.
  if (result.status === 'FAIL') {
    const lines = [
      `\nCycle ${result.cycle}`,
      `Variant:  ${result.variant}`,
      `Pincode:  ${result.pincode}`,
      `ETA:      ${etaDisplay}`,
      `Status:   ${result.status}`,
    ];
    console.log(lines.join('\n'));
    return;
  }

  if (result.status === 'ERROR' || result.status === 'INVALID_PINCODE' || result.status === 'NOT_FOUND') {
    const statusNote = result.status === 'NOT_FOUND' ? 'catalog/search mismatch' : 'not an ETA failure — test/site issue';
    const lines = [
      `\nCycle ${result.cycle}`,
      `Variant:  ${result.variant}`,
      `Pincode:  ${result.pincode}`,
      `Status:   ${result.status} (${statusNote})`,
    ];
    if (result.errorMessage) lines.push(`Error:    ${result.errorMessage}`);
    if (result.pageUrl) lines.push(`URL:      ${result.pageUrl}`);
    if (result.pageTitle) lines.push(`Title:    ${result.pageTitle}`);
    console.log(lines.join('\n'));
  }

  // PASS and UNDELIVERABLE: recorded to JSONL above, nothing printed to console.
}

export function logCycleStart(cycle: number, totalCycles: number): void {
  console.log(`\n${'='.repeat(50)}\nCYCLE ${cycle} / ${totalCycles}\n${'='.repeat(50)}`);
}

export function logCycleEnd(cycle: number, failuresThisCycle: number): void {
  console.log(`\nCycle ${cycle} complete — ${failuresThisCycle} failure(s) this cycle.`);
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n⚠ ERROR — ${context}: ${message}`);
}

export function writeSweepSummary(summary: EtaSweepSummary): string {
  ensureReportsDir();
  const filePath = path.join(REPORTS_DIR, `eta-summary-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(
    [
      `\n${'#'.repeat(50)}`,
      `SWEEP COMPLETE`,
      `Total checks:           ${summary.totalChecks}`,
      `Pass:                   ${summary.totalPass}`,
      `Fail (ETA > threshold): ${summary.totalFail}`,
      `Undeliverable:          ${summary.totalUndeliverable}`,
      `Invalid pincodes:       ${summary.totalInvalidPincodes}`,
      `Not found / Mismatch:   ${summary.totalNotFound}`,
      `Errors:                 ${summary.totalErrors}`,
      `Summary written to:     ${filePath}`,
      '#'.repeat(50),
    ].join('\n')
  );

  return filePath;
}

export { FAILURES_JSONL_PATH, ALL_RESULTS_JSONL_PATH };